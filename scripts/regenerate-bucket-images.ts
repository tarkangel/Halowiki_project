/**
 * Regenerates all GCS images that were produced with the old generic buildPrompt.
 * Images stored under the `lore/` GCS path are curated and skipped.
 * All other GCS images (weapon/, vehicle/, character/, race/, planet/) are
 * regenerated in-place using the new faction-aware buildPrompt.
 *
 * Safe to stop and re-run — progress is saved after each image to a
 * regeneration-progress.json sidecar file. Already-regenerated entries are skipped.
 *
 * Usage:
 *   GCP_PROJECT_ID=<project> npx tsx scripts/regenerate-bucket-images.ts
 *
 * Optional env vars:
 *   GCS_BUCKET   — defaults to <GCP_PROJECT_ID>-generated-images
 *   REGEN_TYPES  — comma-separated list of types to process (default: all)
 *                  e.g. REGEN_TYPES=weapon,vehicle
 */

import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildPrompt } from './prompt-builder.js';

const PROJECT_ID  = process.env.GCP_PROJECT_ID!;
const BUCKET_NAME = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const LOCATION    = 'us-central1';
const MODEL       = 'imagen-3.0-generate-002';
const BASE_URL    = 'https://www.halopedia.org/api.php';
const GCS_BASE    = `https://storage.googleapis.com/${BUCKET_NAME}/`;

// Types to regenerate — default all, or filter via REGEN_TYPES env var
const REGEN_TYPES_LIST = process.env.REGEN_TYPES
  ? process.env.REGEN_TYPES.split(',').map(s => s.trim()).sort()
  : ['weapon', 'vehicle', 'character', 'race', 'planet'];
const REGEN_TYPES = new Set(REGEN_TYPES_LIST);

// Source image-map JSONs (all merged into one deduped set)
const MAP_FILES = [
  'src/generated-images.json',
  'src/generated-weapon-images.json',
  'src/generated-vehicle-images.json',
  'src/generated-character-images.json',
  'src/generated-character2-images.json',
  'src/generated-race-images.json',
  'src/generated-planet-images.json',
  'src/generated-lore-images.json',
].map(f => join(process.cwd(), f));

// Progress file — one file per type-set so parallel runs don't collide
const PROGRESS_PATH = join(process.cwd(), 'src', `regeneration-progress-${REGEN_TYPES_LIST.join('-')}.json`);

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadAllMaps(): Map<string, { url: string; type: string }> {
  const result = new Map<string, { url: string; type: string }>();
  for (const f of MAP_FILES) {
    if (!existsSync(f)) continue;
    const data: Record<string, string> = JSON.parse(readFileSync(f, 'utf8'));
    for (const [title, url] of Object.entries(data)) {
      if (!result.has(title)) {
        const gcsPath = url.startsWith(GCS_BASE) ? url.slice(GCS_BASE.length) : '';
        const type    = gcsPath.split('/')[0] ?? '';
        result.set(title, { url, type });
      }
    }
  }
  return result;
}

function loadProgress(): Set<string> {
  if (!existsSync(PROGRESS_PATH)) return new Set();
  const data: string[] = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
  return new Set(data);
}

function saveProgress(done: Set<string>) {
  writeFileSync(PROGRESS_PATH, JSON.stringify([...done], null, 2));
}

async function halopediaFetch(params: Record<string, string>) {
  const url = new URL(BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

async function fetchDescriptions(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const json  = await halopediaFetch({
      action: 'query', titles: batch.join('|'),
      prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '5',
    });
    for (const page of Object.values(json.query?.pages ?? {}) as any[]) {
      if (page.extract) result.set(page.title, page.extract);
    }
  }
  return result;
}

async function vertexImagenGenerate(prompt: string, retries = 3): Promise<Buffer> {
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
      const wait = attempt * 15000;
      console.warn(`    quota hit — waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`);
      await sleep(wait);
      continue;
    }

    if (!res.ok) throw new Error(JSON.stringify(json));
    return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
  }

  throw new Error('Exceeded retries due to quota limits');
}

async function uploadToGCS(gcsPath: string, buf: Buffer): Promise<void> {
  const file = bucket.file(gcsPath);
  await file.save(buf, { contentType: 'image/jpeg', resumable: false });
  await file.makePublic();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PROJECT_ID) {
    console.error('ERROR: GCP_PROJECT_ID environment variable is not set.');
    process.exit(1);
  }

  // 1. Load all maps and identify candidates
  const allEntries = loadAllMaps();
  const candidates: Array<{ title: string; type: string; gcsPath: string }> = [];

  for (const [title, { url, type }] of allEntries) {
    if (!url.startsWith(GCS_BASE)) continue;       // not a GCS image — skip
    if (type === 'lore') continue;                  // curated prompt — skip
    if (!REGEN_TYPES.has(type)) continue;           // filtered out by REGEN_TYPES
    const gcsPath = url.slice(GCS_BASE.length);
    candidates.push({ title, type, gcsPath });
  }

  const done = loadProgress();
  const remaining = candidates.filter(c => !done.has(c.title));

  console.log(`\n=== Halo Wiki bucket regeneration ===`);
  console.log(`Total candidates : ${candidates.length}`);
  console.log(`Already done     : ${done.size}`);
  console.log(`To regenerate    : ${remaining.length}`);
  console.log(`Types targeted   : ${[...REGEN_TYPES].join(', ')}`);
  if (remaining.length === 0) {
    console.log('\nAll images already regenerated. Done.');
    return;
  }
  console.log('');

  // 2. Batch-fetch Halopedia descriptions for all remaining titles
  console.log('Fetching Halopedia descriptions...');
  const descriptions = await fetchDescriptions(remaining.map(c => c.title));
  console.log(`  Got descriptions for ${descriptions.size}/${remaining.length} titles\n`);

  // 3. Regenerate each image
  let succeeded = 0, failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const { title, type, gcsPath } = remaining[i];
    const desc    = descriptions.get(title) ?? '';
    const prompt  = buildPrompt(type, title, desc);
    const pct     = (((done.size + i + 1) / candidates.length) * 100).toFixed(1);

    console.log(`[${i + 1}/${remaining.length}] (${pct}% total) ${type}/${title}`);
    console.log(`  prompt: ${prompt.slice(0, 140)}...`);

    try {
      const buf = await vertexImagenGenerate(prompt);
      await uploadToGCS(gcsPath, buf);
      done.add(title);
      saveProgress(done);
      succeeded++;
      console.log(`  ✓ uploaded → gs://${BUCKET_NAME}/${gcsPath}`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ failed: ${(err as Error).message}`);
    }

    // Pace to ~4 req/min (Imagen quota)
    if (i < remaining.length - 1) await sleep(15000);
  }

  console.log(`\n=== Done ===`);
  console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
  console.log(`Progress saved to: ${PROGRESS_PATH}`);
  if (failed > 0) {
    console.log('Re-run the script to retry failed items (progress is preserved).');
  } else {
    console.log('All items regenerated. You can delete regeneration-progress.json.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
