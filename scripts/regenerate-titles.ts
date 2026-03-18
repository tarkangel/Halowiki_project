/**
 * Targeted regeneration of specific images by title.
 * Pass titles as command-line arguments.
 *
 * Usage:
 *   GCP_PROJECT_ID=<project> npx tsx scripts/regenerate-titles.ts "Jiralhanae" "Kig-Yar" "Gravemind"
 *
 * The script looks up each title in the committed image-map JSONs to find
 * its existing GCS path, then regenerates the image in-place using the
 * current buildPrompt logic (including any lore-prompts overrides).
 */

import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildPrompt } from './prompt-builder.js';

const PROJECT_ID  = process.env.GCP_PROJECT_ID!;
const BUCKET_NAME = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const LOCATION    = 'us-central1';
const MODEL       = 'imagen-3.0-generate-002';
const BASE_URL    = 'https://www.halopedia.org/api.php';
const GCS_BASE    = `https://storage.googleapis.com/${BUCKET_NAME}/`;

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

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);
const sleep   = (ms: number) => new Promise(r => setTimeout(r, ms));

function lookupEntry(title: string): { gcsPath: string; type: string } | null {
  for (const f of MAP_FILES) {
    if (!existsSync(f)) continue;
    const data: Record<string, string> = JSON.parse(readFileSync(f, 'utf8'));
    const url = data[title];
    if (url?.startsWith(GCS_BASE)) {
      const gcsPath = url.slice(GCS_BASE.length);
      const type    = gcsPath.split('/')[0] ?? 'character';
      return { gcsPath, type };
    }
  }
  return null;
}

async function fetchDescription(title: string): Promise<string> {
  const url = new URL(BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', title);
  url.searchParams.set('prop', 'extracts');
  url.searchParams.set('exintro', '1');
  url.searchParams.set('explaintext', '1');
  url.searchParams.set('exsentences', '5');
  const json = await fetch(url.toString()).then(r => r.json());
  const pages = Object.values(json.query?.pages ?? {}) as any[];
  return pages[0]?.extract ?? '';
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

  const titles = process.argv.slice(2);
  if (titles.length === 0) {
    console.error('Usage: npx tsx scripts/regenerate-titles.ts "Title 1" "Title 2" ...');
    process.exit(1);
  }

  console.log(`\n=== Targeted regeneration: ${titles.length} title(s) ===\n`);

  let succeeded = 0, failed = 0;

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const entry = lookupEntry(title);

    if (!entry) {
      console.warn(`[${i + 1}/${titles.length}] SKIP — not found in any image map: "${title}"`);
      failed++;
      continue;
    }

    const { gcsPath, type } = entry;
    const desc   = await fetchDescription(title);
    const prompt = buildPrompt(type, title, desc);

    console.log(`[${i + 1}/${titles.length}] ${title}  (${type})`);
    console.log(`  gcs  : gs://${BUCKET_NAME}/${gcsPath}`);
    console.log(`  prompt: ${prompt.slice(0, 160)}...`);

    try {
      const buf = await vertexImagenGenerate(prompt);
      await bucket.file(gcsPath).save(buf, { contentType: 'image/jpeg', resumable: false });
      await bucket.file(gcsPath).makePublic();
      succeeded++;
      console.log(`  ✓ uploaded`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ failed: ${(err as Error).message}`);
    }

    if (i < titles.length - 1) await sleep(15000);
  }

  console.log(`\n=== Done === Succeeded: ${succeeded}, Failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
