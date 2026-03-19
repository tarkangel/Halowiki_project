import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getLoreTitles } from './lore-prompts.js';
import { buildPrompt } from './prompt-builder.js';

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const BUCKET_NAME = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const LOCATION = 'us-central1';
const MODEL = 'imagen-3.0-generate-002';
const BASE_URL = 'https://www.halopedia.org/api.php';
const MAP_PATH = join(process.cwd(), 'src', 'generated-images.json');

// Load existing map (to skip already-generated items)
const imageMap: Record<string, string> = existsSync(MAP_PATH)
  ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : {};

const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function gcsPublicUrl(gcsPath: string): string {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`;
}

async function fileExistsInGCS(gcsPath: string): Promise<boolean> {
  const [exists] = await bucket.file(gcsPath).exists();
  return exists;
}

async function uploadToGCS(gcsPath: string, buf: Buffer): Promise<void> {
  const file = bucket.file(gcsPath);
  // uniform_bucket_level_access is enabled; allUsers objectViewer is set at
  // bucket level in Terraform — per-object makePublic() is not needed.
  await file.save(buf, { contentType: 'image/jpeg', resumable: false });
}

async function halopediaFetch(params: Record<string, string>) {
  const url = new URL(BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

async function getCategoryTitles(category: string, limit = 30): Promise<string[]> {
  const json = await halopediaFetch({
    action: 'query', list: 'categorymembers',
    cmtitle: `Category:${category}`, cmlimit: String(limit), cmtype: 'page',
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function vertexImagenGenerate(prompt: string, retries = 3): Promise<Buffer> {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
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
      console.warn(`    quota hit — waiting ${wait / 1000}s before retry ${attempt}/${retries}...`);
      await sleep(wait);
      continue;
    }

    if (!res.ok) throw new Error(JSON.stringify(json));
    return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
  }

  throw new Error('Exceeded retries due to quota limits');
}


async function generateItems(
  type: string,
  items: Array<{ title: string; extract?: string; thumbnail?: { source: string } }>,
) {
  for (const page of items) {
    const slug = slugify(page.title);
    const gcsPath = `${type}/${slug}.jpg`;

    // Skip if already mapped to a GCS URL
    if (imageMap[page.title]?.startsWith('https://storage.googleapis.com/')) {
      console.log(`  → skip (in GCS): ${page.title}`);
      continue;
    }

    // Skip if already exists in GCS bucket (e.g. from a previous partial run)
    try {
      if (await fileExistsInGCS(gcsPath)) {
        imageMap[page.title] = gcsPublicUrl(gcsPath);
        console.log(`  → cached (GCS exists): ${page.title}`);
        writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));
        continue;
      }
    } catch {
      // If bucket check fails, proceed to generate
    }

    try {
      console.log(`  Generating: ${page.title}`);
      const prompt = buildPrompt(type, page.title, page.extract ?? '');
      console.log(`    prompt: ${prompt.slice(0, 120)}...`);
      const buf = await vertexImagenGenerate(prompt);

      await uploadToGCS(gcsPath, buf);
      imageMap[page.title] = gcsPublicUrl(gcsPath);
      console.log(`  ✓ ${page.title} → gs://${BUCKET_NAME}/${gcsPath}`);
    } catch (err) {
      console.warn(`  ✗ Failed ${page.title}:`, (err as Error).message ?? err);
    }

    // Save after each image so partial runs are not lost
    writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));

    // Pace requests to ~4/min to stay under Imagen quota
    await sleep(15000);
  }
}

async function processLoreCurated() {
  const titles = getLoreTitles();
  const needed = titles.filter(t => !imageMap[t]?.startsWith('https://storage.googleapis.com/'));
  if (needed.length === 0) {
    console.log('[lore-curated] All curated entries already in GCS — skipping');
    return;
  }

  console.log(`[lore-curated] Generating ${needed.length} hand-curated lore entries...`);

  const pages: Array<{ title: string; extract?: string; thumbnail?: { source: string } }> = [];
  for (let i = 0; i < needed.length; i += 50) {
    const batch = await getPageSummaries(needed.slice(i, i + 50));
    pages.push(...batch);
  }

  const items = needed.map(title => {
    const page = pages.find(p => p.title === title);
    return { title, extract: page?.extract ?? '', thumbnail: page?.thumbnail };
  });

  await generateItems('lore', items);
}

async function processCategory(type: string, categories: string[]) {
  const allTitles: string[] = [];
  for (const cat of categories) {
    const titles = await getCategoryTitles(cat, 30);
    for (const t of titles) if (!allTitles.includes(t)) allTitles.push(t);
  }

  const pages: Array<{ title: string; extract?: string; thumbnail?: { source: string } }> = [];
  for (let i = 0; i < allTitles.length; i += 50) {
    const batch = await getPageSummaries(allTitles.slice(i, i + 50));
    pages.push(...batch);
  }

  const missing = pages.filter(p => !p.thumbnail?.source && p.extract && p.extract.length > 30);
  console.log(`[${type}] ${missing.length} items need generated images`);

  await generateItems(type, missing);
}

/** Returns true if the SA can write to the bucket, false otherwise. */
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

async function main() {
  if (!PROJECT_ID) {
    console.error('ERROR: GCP_PROJECT_ID environment variable is not set.');
    process.exit(1);
  }

  console.log(`Using bucket: gs://${BUCKET_NAME}`);

  // Early-exit if GCS is not writable — avoids burning Vertex AI quota on
  // images that cannot be stored (e.g. IAM permissions not yet applied).
  const writable = await canWriteToGCS();
  if (!writable) {
    console.warn('⚠  GCS bucket is not writable — skipping image generation.');
    console.warn('   Run `terraform apply` in /terraform to grant the SA write access.');
    process.exit(0);
  }

  await processLoreCurated();

  await processCategory('weapon',    ['UNSC_infantry_weapons', 'Covenant_weapons', 'Forerunner_weapons']);
  await processCategory('vehicle',   ['UNSC_vehicles', 'Covenant_vehicles', 'Banished_vehicles']);
  await processCategory('character', [
    'Human_characters', 'Sangheili_characters', 'AI_characters',
    'Jiralhanae_characters', 'Forerunner_characters', 'Unggoy_characters',
    'Kig-Yar_characters', 'Flood_characters',
  ]);
  await processCategory('race',      ['Sapient_species']);
  await processCategory('planet',    ['Planets', 'Forerunner_installations']);

  writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));
  console.log(`\nDone. ${Object.keys(imageMap).length} images in GCS.`);
}

main().catch(err => { console.error(err); process.exit(1); });
