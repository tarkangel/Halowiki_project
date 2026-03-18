/**
 * Per-type image generator. Run one instance per entity type in parallel.
 *
 * Required env vars:
 *   GCP_PROJECT_ID  — GCP project
 *   GEN_TYPE        — weapon | vehicle | character | race | planet
 *
 * Optional env vars:
 *   GCS_BUCKET      — defaults to {PROJECT_ID}-generated-images
 *   GCP_REGION      — Vertex AI region (default us-central1). Use different
 *                     regions per parallel instance to multiply quota.
 *   FORCE_ALL       — set to "true" to generate even for entities that already
 *                     have a Halopedia thumbnail (full replacement mode)
 *   CAT_LIMIT       — max members to fetch per category (default 100)
 *   CAT_OVERRIDE    — comma-separated category names to use instead of defaults
 *   OUT_SUFFIX      — suffix for output JSON file, e.g. "2" → generated-character2-images.json
 */
import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getLorePrompt } from './lore-prompts.js';

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const TYPE       = process.env.GEN_TYPE!;
const BUCKET     = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const LOCATION   = process.env.GCP_REGION ?? 'us-central1';
const FORCE_ALL   = process.env.FORCE_ALL === 'true';
const CAT_LIMIT   = parseInt(process.env.CAT_LIMIT ?? '100', 10);
const CAT_OVERRIDE = process.env.CAT_OVERRIDE?.split(',').map(s => s.trim()).filter(Boolean);
const OUT_SUFFIX  = process.env.OUT_SUFFIX ?? '';
const MODEL      = 'imagen-3.0-generate-002';
const BASE_URL   = 'https://www.halopedia.org/api.php';

const VALID_TYPES = ['weapon', 'vehicle', 'character', 'race', 'planet'];
if (!PROJECT_ID) { console.error('GCP_PROJECT_ID required'); process.exit(1); }
if (!VALID_TYPES.includes(TYPE)) {
  console.error(`GEN_TYPE must be one of: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

// Each instance writes to its own isolated JSON to avoid parallel write conflicts
const OUT_JSON = join(process.cwd(), 'src', `generated-${TYPE}${OUT_SUFFIX}-images.json`);
const imageMap: Record<string, string> = existsSync(OUT_JSON)
  ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : {};

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET);

const CATEGORIES: Record<string, string[]> = {
  weapon:    ['UNSC_infantry_weapons', 'Covenant_weapons', 'Forerunner_weapons'],
  vehicle:   ['UNSC_vehicles', 'Covenant_vehicles', 'Banished_vehicles'],
  character: [
    'Human_characters', 'Sangheili_characters', 'AI_characters',
    'Jiralhanae_characters', 'Forerunner_characters', 'Unggoy_characters',
    'Kig-Yar_characters', 'Flood_characters', 'Spartan-IIs', 'Spartan-IIIs',
  ],
  race:      ['Sapient_species'],
  planet:    ['Planets', 'Forerunner_installations'],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
function gcsUrl(path: string) {
  return `https://storage.googleapis.com/${BUCKET}/${path}`;
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function halopediaFetch(params: Record<string, string>) {
  const url = new URL(BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

async function getCategoryTitles(cat: string): Promise<string[]> {
  const json = await halopediaFetch({
    action: 'query', list: 'categorymembers',
    cmtitle: `Category:${cat}`, cmlimit: String(CAT_LIMIT), cmtype: 'page',
  });
  return (json.query?.categorymembers ?? []).map((m: { title: string }) => m.title);
}

async function getPageSummaries(titles: string[]) {
  if (!titles.length) return [];
  const json = await halopediaFetch({
    action: 'query', titles: titles.join('|'),
    prop: 'extracts|pageimages', exintro: '1', explaintext: '1',
    exsentences: '5', piprop: 'thumbnail', pithumbsize: '500',
  });
  return Object.values(json.query?.pages ?? {}) as Array<{
    title: string; extract?: string; thumbnail?: { source: string };
  }>;
}

async function vertexGenerate(prompt: string, retries = 4): Promise<Buffer> {
  const auth   = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    });
    const json = await res.json();
    if (res.status === 429) {
      const wait = attempt * 20000;
      console.warn(`    quota hit — waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(JSON.stringify(json));
    return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
  }
  throw new Error('Quota retries exhausted');
}

function buildPrompt(name: string, description: string): string {
  const lore = getLorePrompt(name);
  if (lore) return lore;

  const desc  = description.split(' ').slice(0, 50).join(' ');
  const style = 'Halo sci-fi concept art, painterly, dramatic cinematic rim lighting, dark atmospheric background, highly detailed, 4k.';
  const templates: Record<string, string> = {
    weapon:    `Halo sci-fi weapon "${name}". ${desc}. Isolated, dramatic lighting revealing metallic and energy surfaces. ${style}`,
    vehicle:   `Halo sci-fi vehicle "${name}". ${desc}. Dramatic hero shot, low angle, atmospheric background. ${style}`,
    character: `Halo character portrait "${name}". ${desc}. Cinematic lighting, sci-fi armor or uniform. ${style}`,
    race:      `Halo alien species "${name}". ${desc}. Full creature design, dramatic lighting. ${style}`,
    planet:    `Halo planet or world "${name}". ${desc}. Orbital or surface dramatic landscape. ${style}`,
  };
  return templates[TYPE] ?? `Halo universe concept art, "${name}". ${desc}. ${style}`;
}

function save() {
  writeFileSync(OUT_JSON, JSON.stringify(imageMap, null, 2));
}

async function generate(items: Array<{ title: string; extract?: string }>) {
  for (const item of items) {
    const gcsPath = `${TYPE}/${slugify(item.title)}.jpg`;

    // Already in our map → skip (even in FORCE_ALL mode — don't regenerate)
    if (imageMap[item.title]?.startsWith('https://storage.googleapis.com/')) {
      console.log(`  → skip (done): ${item.title}`);
      continue;
    }

    // Already in GCS from a previous partial run
    try {
      const [exists] = await bucket.file(gcsPath).exists();
      if (exists) {
        imageMap[item.title] = gcsUrl(gcsPath);
        save();
        console.log(`  → cached (GCS): ${item.title}`);
        continue;
      }
    } catch { /* proceed */ }

    try {
      console.log(`  Generating: ${item.title}`);
      const prompt = buildPrompt(item.title, item.extract ?? '');
      const buf    = await vertexGenerate(prompt);
      const file   = bucket.file(gcsPath);
      await file.save(buf, { contentType: 'image/jpeg', resumable: false });
      await file.makePublic();
      imageMap[item.title] = gcsUrl(gcsPath);
      save();
      console.log(`  ✓ ${item.title}`);
    } catch (err) {
      console.warn(`  ✗ Failed ${item.title}:`, (err as Error).message);
    }

    await sleep(12000); // ~5 req/min per instance
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[${TYPE}] FORCE_ALL=${FORCE_ALL} region=${LOCATION} limit=${CAT_LIMIT}`);

  // Collect all titles from categories (deduplicated)
  const seen   = new Set<string>();
  const titles: string[] = [];
  for (const cat of (CAT_OVERRIDE ?? CATEGORIES[TYPE])) {
    for (const t of await getCategoryTitles(cat)) {
      if (!seen.has(t)) { seen.add(t); titles.push(t); }
    }
  }
  console.log(`[${TYPE}] ${titles.length} total titles from categories`);

  // Fetch summaries in batches of 50
  const pages: Array<{ title: string; extract?: string; thumbnail?: { source: string } }> = [];
  for (let i = 0; i < titles.length; i += 50) {
    pages.push(...await getPageSummaries(titles.slice(i, i + 50)));
  }

  // Filter: FORCE_ALL = generate everything; otherwise only those without thumbnails
  const targets = FORCE_ALL
    ? pages.filter(p => p.extract && p.extract.length > 30)
    : pages.filter(p => !p.thumbnail?.source && p.extract && p.extract.length > 30);

  console.log(`[${TYPE}] ${targets.length} items to generate`);
  await generate(targets);

  console.log(`\n[${TYPE}] Done — ${Object.keys(imageMap).length} images mapped.`);
}

main().catch(err => { console.error(err); process.exit(1); });
