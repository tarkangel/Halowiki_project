/**
 * Generate images for specific named characters using Vertex AI Imagen.
 * Skips characters that already have a halo.wiki.gallery or GCS URL set.
 *
 * Usage:
 *   GCP_PROJECT_ID=halowiki npx tsx scripts/generate-targeted-characters.ts
 */

import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildPrompt } from './prompt-builder.js';

const PROJECT_ID  = process.env.GCP_PROJECT_ID ?? 'halowiki';
const BUCKET_NAME = `${PROJECT_ID}-generated-images`;
const LOCATION    = 'us-central1';
const MODEL       = 'imagen-3.0-generate-002';

const IMG_MAP_PATH  = join(process.cwd(), 'src', 'generated-character-images.json');
const CHARS_PATH    = join(process.cwd(), 'src', 'data', 'characters.json');
const CHARS_ES_PATH = join(process.cwd(), 'src', 'data', 'es', 'characters.json');

// ── Canonical overrides (skip generation for these) ───────────────────────
const CANONICAL: Record<string, string> = {
  'Gravemind': 'https://halo.wiki.gallery/images/2/26/HTMCC-H2A_Gravemind.png',
  'Dahks':     'https://halo.wiki.gallery/images/5/53/HINF_Dahks.png',
};

// ── Characters to process ─────────────────────────────────────────────────
const TARGETS = [
  'Abovian', 'Abalan', 'Araqiel', 'Archie', 'Andarta', 'Amitābha', 'Argie',
  "Ke'jah", 'Itka', 'Jec', 'Isk', 'Huz Mor-Kha', 'Krith', 'Jak',
  'Gravemind', 'Dahks',
];

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function gcsUrl(path: string) {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${path}`;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function generateImage(prompt: string): Promise<Buffer> {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    });
    const json = await res.json() as { predictions?: Array<{ bytesBase64Encoded: string }> };
    if (res.status === 429) { await sleep(attempt * 20000); continue; }
    if (!res.ok) throw new Error(JSON.stringify(json));
    return Buffer.from(json.predictions![0].bytesBase64Encoded, 'base64');
  }
  throw new Error('Exceeded retries');
}

function updateJsonFile(filePath: string, name: string, url: string) {
  const data: Array<Record<string, unknown>> = JSON.parse(readFileSync(filePath, 'utf8'));
  for (const item of data) {
    if (item['name'] === name) { item['imageUrl'] = url; break; }
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  const imageMap: Record<string, string> = JSON.parse(readFileSync(IMG_MAP_PATH, 'utf8'));
  const chars: Array<Record<string, string>> = JSON.parse(readFileSync(CHARS_PATH, 'utf8'));
  const charMap = Object.fromEntries(chars.map(c => [c['name'], c]));

  for (const name of TARGETS) {
    const char = charMap[name];
    if (!char) { console.warn(`  ⚠ Not found in characters.json: ${name}`); continue; }

    // ── Canonical image — no generation needed ──────────────────────────
    if (CANONICAL[name]) {
      const url = CANONICAL[name];
      imageMap[name] = url;
      updateJsonFile(CHARS_PATH, name, url);
      updateJsonFile(CHARS_ES_PATH, name, url);
      console.log(`  ✓ canonical: ${name} → ${url}`);
      continue;
    }

    const gcsPath = `character/${slugify(name)}.jpg`;
    const existing = imageMap[name];

    // ── Already a GCS-generated image — regenerate (force fresh) ────────
    console.log(`\n  Generating: ${name}`);
    const desc = char['description'] ?? '';
    const prompt = buildPrompt('character', name, desc);
    console.log(`    prompt: ${prompt.slice(0, 100)}...`);

    try {
      const buf = await generateImage(prompt);
      await bucket.file(gcsPath).save(buf, { contentType: 'image/jpeg', resumable: false });
      const url = gcsUrl(gcsPath);
      imageMap[name] = url;
      updateJsonFile(CHARS_PATH, name, url);
      updateJsonFile(CHARS_ES_PATH, name, url);
      console.log(`  ✓ ${name} → ${url}`);
    } catch (err) {
      console.warn(`  ✗ Failed ${name}:`, (err as Error).message);
    }

    writeFileSync(IMG_MAP_PATH, JSON.stringify(imageMap, null, 2) + '\n');
    await sleep(16000); // ~4 req/min quota
  }

  writeFileSync(IMG_MAP_PATH, JSON.stringify(imageMap, null, 2) + '\n');
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
