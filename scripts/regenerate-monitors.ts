/**
 * Targeted regeneration of Forerunner monitor / construct character images.
 * These were incorrectly generated as humanoid figures — they should be
 * floating orb machines in the style of 343 Guilty Spark.
 *
 * Usage:
 *   GCP_PROJECT_ID=<project> npx tsx scripts/regenerate-monitors.ts
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
const PROGRESS_PATH = join(process.cwd(), 'src', 'regeneration-progress-monitors.json');

// All confirmed Forerunner monitors / constructs in the bucket.
// Excludes UNSC callsigns (4 Charlie 27) and Spartan tags (64539-56252-RK).
// Also excludes 343 Guilty Spark which is already curated in lore-prompts.ts
// but IS included here to re-upload with the lore prompt (it was under character/ path).
const MONITOR_TITLES = [
  '343 Guilty Spark',
  '343 Guilty Spark/Silver',
  '2401 Penitent Tangent',
  'Adjutant Reflex',
  '686 Ebullient Prism',
  '48452-556-EPN644',
  '049 Abject Testament',
  '000 Tragic Solitude',
  '117649 Despondent Pyre',
  '001 Shamed Instrument',
  '007 Contrite Witness',
  '16807 Abashed Eulogy',
  '859 Static Carillon',
  '295 Enduring Bias',
  '031 Exuberant Witness',
  '295 Harken Watch',
  '091 Adjutant Veridity',
  'Auditor',
  'Confirmer',
  'Catalog',
  'Boundless',
  'Catalog Triad 879',
  '4096',
];

const MAP_FILES = [
  'src/generated-images.json',
  'src/generated-character-images.json',
  'src/generated-character2-images.json',
].map(f => join(process.cwd(), f));

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);
const sleep   = (ms: number) => new Promise(r => setTimeout(r, ms));

function loadGCSPath(title: string): string | null {
  for (const f of MAP_FILES) {
    if (!existsSync(f)) continue;
    const data: Record<string, string> = JSON.parse(readFileSync(f, 'utf8'));
    if (data[title]?.startsWith(GCS_BASE)) {
      return data[title].slice(GCS_BASE.length);
    }
  }
  return null;
}

function loadProgress(): Set<string> {
  if (!existsSync(PROGRESS_PATH)) return new Set();
  return new Set(JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')));
}

function saveProgress(done: Set<string>) {
  writeFileSync(PROGRESS_PATH, JSON.stringify([...done], null, 2));
}

async function fetchDescriptions(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = new URL(BASE_URL);
    url.searchParams.set('format', 'json'); url.searchParams.set('origin', '*');
    url.searchParams.set('action', 'query'); url.searchParams.set('titles', batch.join('|'));
    url.searchParams.set('prop', 'extracts'); url.searchParams.set('exintro', '1');
    url.searchParams.set('explaintext', '1'); url.searchParams.set('exsentences', '5');
    const json = await fetch(url.toString()).then(r => r.json());
    for (const page of Object.values(json.query?.pages ?? {}) as any[]) {
      if (page.extract) result.set(page.title, page.extract);
    }
  }
  return result;
}

async function vertexImagenGenerate(prompt: string, retries = 3): Promise<Buffer> {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } }),
    });
    const json = await res.json();
    if (res.status === 429) {
      const wait = attempt * 15000;
      console.warn(`    quota hit — waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(JSON.stringify(json));
    return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
  }
  throw new Error('Exceeded retries');
}

async function main() {
  if (!PROJECT_ID) { console.error('ERROR: GCP_PROJECT_ID not set'); process.exit(1); }

  const done = loadProgress();
  const descriptions = await fetchDescriptions(MONITOR_TITLES);

  const remaining = MONITOR_TITLES.filter(t => !done.has(t));
  console.log(`\n=== Forerunner monitor regeneration ===`);
  console.log(`Total monitors : ${MONITOR_TITLES.length}`);
  console.log(`Already done   : ${done.size}`);
  console.log(`To regenerate  : ${remaining.length}\n`);

  let succeeded = 0, skipped = 0, failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const title = remaining[i];
    const gcsPath = loadGCSPath(title);

    if (!gcsPath) {
      console.log(`[${i + 1}/${remaining.length}] SKIP (not in bucket): ${title}`);
      done.add(title); saveProgress(done); skipped++;
      continue;
    }

    const desc   = descriptions.get(title) ?? '';
    const prompt = buildPrompt('character', title, desc);

    console.log(`[${i + 1}/${remaining.length}] ${title}`);
    console.log(`  prompt: ${prompt.slice(0, 160)}...`);

    try {
      const buf = await vertexImagenGenerate(prompt);
      await bucket.file(gcsPath).save(buf, { contentType: 'image/jpeg', resumable: false });
      await bucket.file(gcsPath).makePublic();
      done.add(title); saveProgress(done); succeeded++;
      console.log(`  ✓ → gs://${BUCKET_NAME}/${gcsPath}`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ failed: ${(err as Error).message}`);
    }

    if (i < remaining.length - 1) await sleep(15000);
  }

  console.log(`\n=== Done === Succeeded: ${succeeded}, Skipped: ${skipped}, Failed: ${failed}`);
  if (failed === 0) console.log('All monitors regenerated. You can delete regeneration-progress-monitors.json.');
}

main().catch(err => { console.error(err); process.exit(1); });
