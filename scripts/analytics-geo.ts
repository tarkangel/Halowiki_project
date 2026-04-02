/**
 * Geo Analytics — halo-wiki.com
 *
 * Extrae IPs reales de los logs de Cloud Run (capturadas por nginx vía CF-Connecting-IP)
 * y las geolocalizaa con ip-api.com (gratis, 1000 req/día).
 *
 * Uso:
 *   npx tsx scripts/analytics-geo.ts          # últimas 24 horas
 *   npx tsx scripts/analytics-geo.ts 48       # últimas 48 horas
 *
 * Requiere: gcloud CLI autenticado con acceso al proyecto.
 */

import { execSync } from 'child_process';

const HOURS = parseInt(process.argv[2] ?? '24', 10);
const SERVICE = 'halowiki';

// ── Obtener project ID desde gcloud ──────────────────────────────────────────

let project: string;
try {
  project = execSync('gcloud config get-value project 2>/dev/null').toString().trim();
  if (!project || project === '(unset)') throw new Error();
} catch {
  console.error('Error: no hay proyecto configurado en gcloud.');
  console.error('  gcloud config set project TU_PROJECT_ID');
  process.exit(1);
}

// ── Calcular timestamp de inicio ─────────────────────────────────────────────

const since = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

console.log(`\nConsultando logs de Cloud Run (últimas ${HOURS}h)...`);

// ── Query Cloud Logging ───────────────────────────────────────────────────────

const filter = [
  `resource.type="cloud_run_revision"`,
  `resource.labels.service_name="${SERVICE}"`,
  `timestamp>="${since}"`,
  `httpRequest.remoteIp!=""`,
].join(' AND ');

let rawLogs: string;
try {
  rawLogs = execSync(
    `gcloud logging read '${filter}' --project=${project} --limit=500 --format=json 2>/dev/null`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString().trim();
} catch {
  console.error('Error al consultar Cloud Logging. Verifica que gcloud esté autenticado.');
  process.exit(1);
}

if (!rawLogs || rawLogs === '[]') {
  console.log('Sin logs en el período. El domain mapping puede estar aún provisionando.');
  process.exit(0);
}

// ── Extraer IPs ───────────────────────────────────────────────────────────────

type LogEntry = {
  httpRequest?: { remoteIp?: string; requestUrl?: string; status?: number; userAgent?: string };
  timestamp?: string;
};

const logs: LogEntry[] = JSON.parse(rawLogs);

// Contar requests por IP
const ipCount: Record<string, number> = {};
const ipMeta: Record<string, { url: string; status: number; ua: string; time: string }> = {};

for (const log of logs) {
  const ip = log.httpRequest?.remoteIp;
  if (!ip) continue;
  // Ignorar IPs privadas/internas
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') continue;

  ipCount[ip] = (ipCount[ip] ?? 0) + 1;
  if (!ipMeta[ip]) {
    ipMeta[ip] = {
      url: log.httpRequest?.requestUrl ?? '',
      status: log.httpRequest?.status ?? 0,
      ua: log.httpRequest?.userAgent ?? '',
      time: log.timestamp ?? '',
    };
  }
}

const uniqueIps = Object.keys(ipCount);
if (uniqueIps.length === 0) {
  console.log('Sin IPs externas en los logs. ¿El nginx.conf ya fue desplegado?');
  process.exit(0);
}

console.log(`${uniqueIps.length} IPs únicas encontradas. Geolocalizando...\n`);

// ── Geolocalizar con ip-api.com (batch, gratis) ───────────────────────────────

type GeoResult = {
  query: string;
  status: string;
  country: string;
  regionName: string;
  city: string;
  isp: string;
  org: string;
};

const batchSize = 100;
const geoMap: Record<string, GeoResult> = {};

for (let i = 0; i < uniqueIps.length; i += batchSize) {
  const batch = uniqueIps.slice(i, i + batchSize);
  const res = await fetch('http://ip-api.com/batch?fields=status,country,regionName,city,isp,org,query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch.map(ip => ({ query: ip }))),
  });
  const data = await res.json() as GeoResult[];
  for (const g of data) geoMap[g.query] = g;
}

// ── Mostrar resultados ────────────────────────────────────────────────────────

const sorted = uniqueIps.sort((a, b) => ipCount[b] - ipCount[a]);
const totalReqs = Object.values(ipCount).reduce((s, n) => s + n, 0);

console.log(`── halo-wiki.com — últimas ${HOURS}h — ${totalReqs} requests de ${uniqueIps.length} IPs únicas ──\n`);
console.log('  Reqs  IP               Ciudad                 Región           País       ISP');
console.log('  ' + '─'.repeat(90));

for (const ip of sorted) {
  const geo = geoMap[ip];
  const reqs = String(ipCount[ip]).padStart(4);
  const ipPad = ip.padEnd(15);

  if (!geo || geo.status !== 'success') {
    console.log(`  ${reqs}  ${ipPad}  (sin datos de geolocalización)`);
    continue;
  }

  const city = (geo.city || '?').padEnd(22).slice(0, 22);
  const region = (geo.regionName || '?').padEnd(16).slice(0, 16);
  const country = (geo.country || '?').padEnd(10).slice(0, 10);
  const isp = geo.isp || geo.org || '?';

  console.log(`  ${reqs}  ${ipPad}  ${city}  ${region}  ${country}  ${isp}`);
}

console.log();
