/**
 * Regenerates character images for specific species, identified by scanning
 * Halopedia descriptions for species keywords.
 *
 * Usage:
 *   GCP_PROJECT_ID=<project> npx tsx scripts/regenerate-species.ts jiralhanae kig-yar flood unggoy
 *
 * Supported species tokens:
 *   jiralhanae  — Brutes (gorilla-like primate warriors)
 *   kig-yar     — Jackals / Skirmishers (avian-reptilian)
 *   unggoy      — Grunts (short methane-breathing aliens)
 *   flood       — Flood characters (biomass horror)
 *
 * The script reads all character image-map JSONs, fetches Halopedia descriptions
 * in batches, then regenerates images only for characters matching the target species.
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

const CHAR_MAP_FILES = [
  'src/generated-character-images.json',
  'src/generated-character2-images.json',
  'src/generated-images.json',
].map(f => join(process.cwd(), f));

// Keywords per species token
const SPECIES_KEYWORDS: Record<string, RegExp> = {
  'jiralhanae': /jiralhanae|brute/i,
  'kig-yar':    /kig-yar|kig.yar|jackal|skirmisher/i,
  'unggoy':     /unggoy|grunt/i,
  'flood':      /gravemind|flood form|infection form|the flood|combat form|carrier form/i,
};

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);
const sleep   = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadCharacterEntries(): Map<string, string> {
  const result = new Map<string, string>(); // title → gcsPath
  for (const f of CHAR_MAP_FILES) {
    if (!existsSync(f)) continue;
    const data: Record<string, string> = JSON.parse(readFileSync(f, 'utf8'));
    for (const [title, url] of Object.entries(data)) {
      if (!result.has(title) && url.startsWith(GCS_BASE)) {
        const gcsPath = url.slice(GCS_BASE.length);
        if (gcsPath.startsWith('character/') || gcsPath.startsWith('lore/')) {
          result.set(title, gcsPath);
        }
      }
    }
  }
  return result;
}

async function fetchDescriptions(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = new URL(BASE_URL);
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    url.searchParams.set('action', 'query');
    url.searchParams.set('titles', batch.join('|'));
    url.searchParams.set('prop', 'extracts');
    url.searchParams.set('exintro', '1');
    url.searchParams.set('explaintext', '1');
    url.searchParams.set('exsentences', '5');
    const json = await fetch(url.toString()).then(r => r.json());
    for (const page of Object.values(json.query?.pages ?? {}) as any[]) {
      if (page.extract) result.set(page.title, page.extract);
    }
    if (i + 50 < titles.length) await sleep(500); // polite batching
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PROJECT_ID) { console.error('ERROR: GCP_PROJECT_ID not set'); process.exit(1); }

  const targetTokens = process.argv.slice(2).map(s => s.toLowerCase());
  if (targetTokens.length === 0) {
    console.error('Usage: npx tsx scripts/regenerate-species.ts jiralhanae kig-yar flood unggoy');
    console.error('Supported: ' + Object.keys(SPECIES_KEYWORDS).join(', '));
    process.exit(1);
  }

  const unknownTokens = targetTokens.filter(t => !SPECIES_KEYWORDS[t]);
  if (unknownTokens.length > 0) {
    console.error(`Unknown species tokens: ${unknownTokens.join(', ')}`);
    console.error('Supported: ' + Object.keys(SPECIES_KEYWORDS).join(', '));
    process.exit(1);
  }

  const targetPatterns = targetTokens.map(t => SPECIES_KEYWORDS[t]);

  // 1. Load all character entries from JSON maps
  const allChars = loadCharacterEntries();
  console.log(`\n=== Species-targeted character regeneration ===`);
  console.log(`Target species : ${targetTokens.join(', ')}`);
  console.log(`Total characters in maps : ${allChars.size}`);

  // 2. Fetch Halopedia descriptions for all characters
  console.log('\nFetching Halopedia descriptions...');
  const titles = [...allChars.keys()];
  const descriptions = await fetchDescriptions(titles);
  console.log(`Got descriptions for ${descriptions.size}/${titles.length} characters`);

  // 3. Filter to target species
  const candidates: Array<{ title: string; gcsPath: string; desc: string }> = [];
  for (const [title, gcsPath] of allChars) {
    const desc    = descriptions.get(title) ?? '';
    const combined = (title + ' ' + desc).toLowerCase();
    if (targetPatterns.some(pattern => pattern.test(combined))) {
      candidates.push({ title, gcsPath, desc });
    }
  }

  console.log(`\nMatching characters to regenerate: ${candidates.length}`);
  candidates.forEach(c => console.log(`  • ${c.title}`));

  if (candidates.length === 0) {
    console.log('\nNothing to regenerate.');
    return;
  }

  const PROGRESS_PATH = join(process.cwd(), 'src', `regeneration-progress-species-${targetTokens.join('-')}.json`);
  const done = existsSync(PROGRESS_PATH)
    ? new Set<string>(JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')))
    : new Set<string>();

  const remaining = candidates.filter(c => !done.has(c.title));
  console.log(`\nAlready done : ${done.size}`);
  console.log(`To regenerate: ${remaining.length}\n`);

  let succeeded = 0, failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const { title, gcsPath, desc } = remaining[i];
    const prompt = buildPrompt('character', title, desc);

    console.log(`[${i + 1}/${remaining.length}] ${title}`);
    console.log(`  prompt: ${prompt.slice(0, 160)}...`);

    try {
      const buf = await vertexImagenGenerate(prompt);
      await bucket.file(gcsPath).save(buf, { contentType: 'image/jpeg', resumable: false });
      await bucket.file(gcsPath).makePublic();
      done.add(title);
      writeFileSync(PROGRESS_PATH, JSON.stringify([...done], null, 2));
      succeeded++;
      console.log(`  ✓ → gs://${BUCKET_NAME}/${gcsPath}`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ failed: ${(err as Error).message}`);
    }

    if (i < remaining.length - 1) await sleep(15000);
  }

  console.log(`\n=== Done === Succeeded: ${succeeded}, Failed: ${failed}`);
  if (failed === 0) {
    console.log(`All done. You can delete ${PROGRESS_PATH}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
