/**
 * Cloudflare Analytics — halo-wiki.com
 *
 * Muestra tráfico de los últimos N días: requests, visitantes únicos, bandwidth.
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

// ── Calcular rango de fechas ──────────────────────────────────────────────────

function toDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const today = new Date();
const from = new Date(today);
from.setDate(today.getDate() - (DAYS - 1));

const dateFrom = toDate(from);
const dateTo = toDate(today);

// ── Query GraphQL ─────────────────────────────────────────────────────────────

const query = `{
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
}`;

const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const json = await res.json() as {
  data?: { viewer: { zones: { httpRequests1dGroups: {
    dimensions: { date: string };
    sum: { requests: number; pageViews: number; bytes: number };
    uniq: { uniques: number };
  }[] }[] } };
  errors?: { message: string }[];
};

if (json.errors) {
  console.error('Error de API:', json.errors.map(e => e.message).join(', '));
  process.exit(1);
}

const groups = json.data!.viewer.zones[0]?.httpRequests1dGroups ?? [];

if (groups.length === 0) {
  console.log('Sin datos para el período seleccionado.');
  process.exit(0);
}

// ── Mostrar resultados ────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const sorted = [...groups].sort((a, b) => a.dimensions.date.localeCompare(b.dimensions.date));

const totalRequests = sorted.reduce((s, g) => s + g.sum.requests, 0);
const totalUniques = sorted.reduce((s, g) => s + g.uniq.uniques, 0);
const totalBytes = sorted.reduce((s, g) => s + g.sum.bytes, 0);

console.log(`\n── halo-wiki.com — últimos ${DAYS} días (${dateFrom} → ${dateTo}) ──\n`);
console.log('  Fecha          Requests   Visitantes   Bandwidth');
console.log('  ─────────────────────────────────────────────────');

for (const g of sorted) {
  const date = g.dimensions.date;
  const req = String(g.sum.requests).padStart(8);
  const uniq = String(g.uniq.uniques).padStart(10);
  const bw = formatBytes(g.sum.bytes).padStart(12);
  console.log(`  ${date}  ${req}   ${uniq}   ${bw}`);
}

console.log('  ─────────────────────────────────────────────────');
console.log(`  TOTAL          ${String(totalRequests).padStart(8)}   ${String(totalUniques).padStart(10)}   ${formatBytes(totalBytes).padStart(12)}`);
console.log();
