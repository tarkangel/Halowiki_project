/**
 * Mirror Halopedia thumbnail images to GCS.
 *
 * For every character in LORE_CHARACTERS that has a Halopedia thumbnail,
 * this script downloads the image and re-uploads it to the GCS bucket so
 * the app never has to call the Halopedia API at runtime for images.
 *
 * Updates src/generated-character-images.json in-place.
 * Run: GCP_PROJECT_ID=... GCS_BUCKET=... npx tsx scripts/mirror-halopedia-images.ts
 */

import { Storage } from '@google-cloud/storage';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { LORE_CHARACTERS } from '../src/lore-titles.js';

const PROJECT_ID  = process.env.GCP_PROJECT_ID!;
const BUCKET_NAME = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const HALOPEDIA   = 'https://www.halopedia.org/api.php';
const MAP_PATH    = join(process.cwd(), 'src', 'generated-character-images.json');

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);

const imageMap: Record<string, string> = existsSync(MAP_PATH)
  ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : {};

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function gcsUrl(path: string) {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${path}`;
}

async function halopediaThumbnails(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = new URL(HALOPEDIA);
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    url.searchParams.set('action', 'query');
    url.searchParams.set('titles', batch.join('|'));
    url.searchParams.set('prop', 'pageimages');
    url.searchParams.set('piprop', 'thumbnail');
    url.searchParams.set('pithumbsize', '600');
    const res = await fetch(url.toString());
    const json = await res.json();
    for (const page of Object.values(json.query?.pages ?? {}) as Array<{
      title: string; pageid: number; thumbnail?: { source: string };
    }>) {
      if (page.pageid > 0 && page.thumbnail?.source) {
        result.set(page.title, page.thumbnail.source);
      }
    }
  }
  return result;
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToGCS(gcsPath: string, buf: Buffer, contentType: string): Promise<void> {
  const file = bucket.file(gcsPath);
  await file.save(buf, { contentType, resumable: false });
  await file.makePublic();
}

function contentTypeFromUrl(url: string): string {
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function main() {
  if (!PROJECT_ID) {
    console.error('ERROR: GCP_PROJECT_ID is not set.');
    process.exit(1);
  }

  console.log(`Bucket: gs://${BUCKET_NAME}`);
  console.log(`Checking ${LORE_CHARACTERS.length} lore characters for Halopedia thumbnails...\n`);

  // Only process characters that don't already have a GCS URL
  const needed = LORE_CHARACTERS.filter(t => !imageMap[t]?.startsWith('https://storage.googleapis.com/'));
  if (needed.length === 0) {
    console.log('All lore characters already mirrored — nothing to do.');
    return;
  }

  console.log(`Fetching thumbnails for: ${needed.join(', ')}\n`);
  const thumbnails = await halopediaThumbnails(needed);

  let mirrored = 0;
  let skipped  = 0;

  for (const title of needed) {
    const thumbUrl = thumbnails.get(title);
    if (!thumbUrl) {
      console.log(`  ⚠  no Halopedia thumbnail: ${title}`);
      skipped++;
      continue;
    }

    const slug    = slugify(title);
    const ext     = thumbUrl.includes('.png') ? 'png' : 'jpg';
    const gcsPath = `character/${slug}.${ext}`;

    // Check if already in GCS (resume-safe)
    try {
      const [exists] = await bucket.file(gcsPath).exists();
      if (exists) {
        imageMap[title] = gcsUrl(gcsPath);
        console.log(`  → already in GCS: ${title}`);
        writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));
        mirrored++;
        continue;
      }
    } catch { /* proceed to download */ }

    try {
      console.log(`  ↓  downloading: ${title}`);
      const buf = await downloadBuffer(thumbUrl);
      await uploadToGCS(gcsPath, buf, contentTypeFromUrl(thumbUrl));
      imageMap[title] = gcsUrl(gcsPath);
      console.log(`  ✓  mirrored: ${title} → gs://${BUCKET_NAME}/${gcsPath}`);
      writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));
      mirrored++;
    } catch (err) {
      console.warn(`  ✗  failed: ${title} —`, (err as Error).message);
    }
  }

  writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));
  console.log(`\nDone. ${mirrored} mirrored, ${skipped} had no Halopedia thumbnail.`);
}

main().catch(err => { console.error(err); process.exit(1); });
