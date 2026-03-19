/**
 * Mirror Halopedia thumbnail images to GCS.
 *
 * For every lore entity (characters, weapons, vehicles, planets, races)
 * that has a Halopedia thumbnail, this script downloads the image and
 * re-uploads it to the GCS bucket so the app never has to call the
 * Halopedia API at runtime for images.
 *
 * Updates the corresponding src/generated-*-images.json files.
 * Run: GCP_PROJECT_ID=... GCS_BUCKET=... npx tsx scripts/mirror-halopedia-images.ts
 */

import { Storage } from '@google-cloud/storage';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  LORE_CHARACTERS, LORE_WEAPONS, LORE_VEHICLES, LORE_PLANETS, LORE_RACES,
} from '../src/lore-titles.js';

const PROJECT_ID  = process.env.GCP_PROJECT_ID!;
const BUCKET_NAME = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const HALOPEDIA   = 'https://www.halopedia.org/api.php';

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function gcsUrl(path: string) {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${path}`;
}

function jsonPath(type: string): string {
  const fileMap: Record<string, string> = {
    character: 'generated-character-images.json',
    weapon:    'generated-weapon-images.json',
    vehicle:   'generated-vehicle-images.json',
    planet:    'generated-planet-images.json',
    race:      'generated-race-images.json',
  };
  return join(process.cwd(), 'src', fileMap[type]);
}

function loadImageMap(type: string): Record<string, string> {
  const path = jsonPath(type);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

function saveImageMap(type: string, map: Record<string, string>): void {
  writeFileSync(jsonPath(type), JSON.stringify(map, null, 2));
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
    url.searchParams.set('redirects', '1');
    url.searchParams.set('prop', 'pageimages');
    url.searchParams.set('piprop', 'thumbnail');
    url.searchParams.set('pithumbsize', '600');
    const res = await fetch(url.toString());
    const json = await res.json();

    // Build redirect map: normalised/redirect-target title → original title
    const redirectMap = new Map<string, string>();
    for (const r of (json.query?.redirects ?? []) as Array<{ from: string; to: string }>) {
      redirectMap.set(r.to, r.from);
    }

    for (const page of Object.values(json.query?.pages ?? {}) as Array<{
      title: string; pageid: number; thumbnail?: { source: string };
    }>) {
      if (page.pageid > 0 && page.thumbnail?.source) {
        // Use original title if this page was a redirect target
        const originalTitle = redirectMap.get(page.title) ?? page.title;
        result.set(originalTitle, page.thumbnail.source);
        // Also set under resolved title so either lookup works
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
}

function contentTypeFromUrl(url: string): string {
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function canWriteToGCS(): Promise<boolean> {
  const testPath = '_ci_write_test.txt';
  try {
    await bucket.file(testPath).save(Buffer.from('ok'), { resumable: false });
    await bucket.file(testPath).delete().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function mirrorType(type: string, titles: string[]): Promise<void> {
  console.log(`\n[${type}] Checking ${titles.length} titles for Halopedia thumbnails...`);

  const imageMap = loadImageMap(type);

  // Only fetch thumbnails for titles not already mirrored to GCS
  const needed = titles.filter(t => !imageMap[t]?.startsWith('https://storage.googleapis.com/'));
  if (needed.length === 0) {
    console.log(`[${type}] All entries already mirrored — skipping.`);
    return;
  }

  console.log(`[${type}] Fetching thumbnails for: ${needed.join(', ')}`);
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
    const gcsPath = `${type}/${slug}.${ext}`;

    // Check if already in GCS (resume-safe)
    try {
      const [exists] = await bucket.file(gcsPath).exists();
      if (exists) {
        imageMap[title] = gcsUrl(gcsPath);
        console.log(`  → already in GCS: ${title}`);
        saveImageMap(type, imageMap);
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
      saveImageMap(type, imageMap);
      mirrored++;
    } catch (err) {
      console.warn(`  ✗  failed: ${title} —`, (err as Error).message);
    }
  }

  saveImageMap(type, imageMap);
  console.log(`[${type}] Done. ${mirrored} mirrored, ${skipped} had no thumbnail.`);
}

async function main() {
  if (!PROJECT_ID) {
    console.error('ERROR: GCP_PROJECT_ID is not set.');
    process.exit(1);
  }

  console.log(`Bucket: gs://${BUCKET_NAME}`);

  const writable = await canWriteToGCS();
  if (!writable) {
    console.warn('⚠  GCS bucket is not writable — skipping mirror step.');
    console.warn('   Run `terraform apply` in /terraform to grant the SA write access.');
    process.exit(0);
  }

  await mirrorType('character', LORE_CHARACTERS);
  await mirrorType('weapon',    LORE_WEAPONS);
  await mirrorType('vehicle',   LORE_VEHICLES);
  await mirrorType('planet',    LORE_PLANETS);
  await mirrorType('race',      LORE_RACES);
}

main().catch(err => { console.error(err); process.exit(1); });
