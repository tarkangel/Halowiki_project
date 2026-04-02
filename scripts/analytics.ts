/**
 * Cloudflare Analytics — halo-wiki.com
 *
 * Muestra tráfico de los últimos N días: requests, visitantes únicos, bandwidth
 * y desglose de países de origen.
 *
 * Uso:
 *   npx tsx scripts/analytics.ts          # últimos 7 días (default)
 *   npx tsx scripts/analytics.ts 30       # últimos 30 días
 *
 * Variables de entorno requeridas:
 *   CF_TOKEN    — Cloudflare API token (Read analytics)
 *   CF_ZONE_ID  — Zone ID de halo-wiki.com en Cloudflare
 */

const DAYS = parseInt(process.argv[2] ?? '7', 10);
const TOKEN = process.env.CF_TOKEN;
const ZONE_ID = process.env.CF_ZONE_ID;

if (!TOKEN || !ZONE_ID) {
  console.error('Error: define CF_TOKEN y CF_ZONE_ID como variables de entorno.');
  console.error('  export CF_TOKEN=tu_token');
  console.error('  export CF_ZONE_ID=tu_zone_id');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

async function gql(query: string): Promise<unknown> {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

// ── Rango de fechas ───────────────────────────────────────────────────────────

const today = new Date();
const dates: string[] = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  dates.push(toDate(d));
}
const dateFrom = dates[0];
const dateTo = dates[dates.length - 1];

// ── Query 1: Tráfico diario ───────────────────────────────────────────────────

type DailyGroup = {
  dimensions: { date: string };
  sum: { requests: number; pageViews: number; bytes: number };
  uniq: { uniques: number };
};

const dailyRes = await gql(`{
  viewer {
    zones(filter: {zoneTag: "${ZONE_ID}"}) {
      httpRequests1dGroups(
        limit: ${DAYS},
        filter: {date_geq: "${dateFrom}", date_leq: "${dateTo}"}
      ) {
        dimensions { date }
        sum { requests pageViews bytes }
        uniq { uniques }
      }
    }
  }
}`) as { data?: { viewer: { zones: { httpRequests1dGroups: DailyGroup[] }[] } }; errors?: { message: string }[] };

if (dailyRes.errors) {
  console.error('Error:', dailyRes.errors.map(e => e.message).join(', '));
  process.exit(1);
}

const daily = dailyRes.data!.viewer.zones[0]?.httpRequests1dGroups ?? [];
daily.sort((a, b) => a.dimensions.date.localeCompare(b.dimensions.date));

// ── Query 2: Países (una query por día, plan free) ────────────────────────────

type CountryGroup = { count: number; dimensions: { clientCountryName: string } };

const countryTotals: Record<string, number> = {};

for (const date of dates) {
  const res = await gql(`{
    viewer {
      zones(filter: {zoneTag: "${ZONE_ID}"}) {
        httpRequestsAdaptiveGroups(
          limit: 50,
          filter: {date: "${date}"},
          orderBy: [count_DESC]
        ) {
          count
          dimensions { clientCountryName }
        }
      }
    }
  }`) as { data?: { viewer: { zones: { httpRequestsAdaptiveGroups: CountryGroup[] }[] } } };

  const groups = res.data?.viewer.zones[0]?.httpRequestsAdaptiveGroups ?? [];
  for (const g of groups) {
    const country = g.dimensions.clientCountryName || 'Unknown';
    countryTotals[country] = (countryTotals[country] ?? 0) + g.count;
  }
}

const countries = Object.entries(countryTotals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);

// ── Output ────────────────────────────────────────────────────────────────────

const totalRequests = daily.reduce((s, g) => s + g.sum.requests, 0);
const totalUniques  = daily.reduce((s, g) => s + g.uniq.uniques, 0);
const totalBytes    = daily.reduce((s, g) => s + g.sum.bytes, 0);

console.log(`\n── halo-wiki.com — últimos ${DAYS} días (${dateFrom} → ${dateTo}) ──\n`);

// Tabla de tráfico diario
console.log('  Fecha          Requests   Visitantes   Bandwidth');
console.log('  ─────────────────────────────────────────────────');
for (const g of daily) {
  console.log(
    `  ${g.dimensions.date}  ${String(g.sum.requests).padStart(8)}` +
    `   ${String(g.uniq.uniques).padStart(10)}   ${formatBytes(g.sum.bytes).padStart(12)}`
  );
}
console.log('  ─────────────────────────────────────────────────');
console.log(
  `  TOTAL          ${String(totalRequests).padStart(8)}` +
  `   ${String(totalUniques).padStart(10)}   ${formatBytes(totalBytes).padStart(12)}`
);

// Tabla de países
if (countries.length > 0) {
  const totalCountryReqs = countries.reduce((s, [, n]) => s + n, 0);
  console.log('\n  Visitas por país:');
  console.log('  ─────────────────────────────────────────────────');
  for (const [country, count] of countries) {
    const pct = ((count / totalCountryReqs) * 100).toFixed(1).padStart(5);
    const bar = '█'.repeat(Math.round((count / countries[0][1]) * 20));
    console.log(`  ${country.padEnd(4)}  ${String(count).padStart(6)} req  ${pct}%  ${bar}`);
  }
}

console.log();
