import { GoogleAuth } from 'google-auth-library';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = 'us-central1';
const MODEL = 'imagegeneration@006';
const BASE_URL = 'https://www.halopedia.org/api.php';
const OUT_DIR = join(process.cwd(), 'public', 'generated');
const MAP_PATH = join(process.cwd(), 'src', 'generated-images.json');

// Load existing map (to skip already-generated items)
const imageMap: Record<string, string> = existsSync(MAP_PATH)
  ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : {};

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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
    exsentences: '3', piprop: 'thumbnail', pithumbsize: '500',
  });
  return Object.values(json.query?.pages ?? {}) as Array<{
    title: string; extract?: string; thumbnail?: { source: string };
  }>;
}

async function vertexImagenGenerate(prompt: string): Promise<Buffer> {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1' },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
}

function buildPrompt(type: string, name: string, description: string): string {
  const desc = description.split(' ').slice(0, 40).join(' ');
  const prompts: Record<string, string> = {
    weapon:    `Halo sci-fi weapon called "${name}". ${desc}. Concept art, dramatic lighting, detailed metallic surfaces, dark background, high detail.`,
    vehicle:   `Halo sci-fi vehicle called "${name}". ${desc}. Concept art, dramatic lighting, futuristic metallic hull, dark atmospheric background.`,
    character: `Halo character "${name}". ${desc}. Sci-fi armor portrait, dramatic cinematic lighting, highly detailed.`,
    race:      `Halo alien species "${name}". ${desc}. Sci-fi concept art, dramatic lighting, highly detailed creature design.`,
    planet:    `Halo planet or world "${name}". ${desc}. Space landscape, dramatic atmospheric lighting, sci-fi environment.`,
  };
  return prompts[type] ?? `Halo universe, "${name}". ${desc}. Sci-fi concept art, dramatic lighting.`;
}

async function processCategory(type: string, categories: string[]) {
  const allTitles: string[] = [];
  for (const cat of categories) {
    const titles = await getCategoryTitles(cat, 30);
    for (const t of titles) if (!allTitles.includes(t)) allTitles.push(t);
  }

  // Batch summaries (50 at a time)
  const pages: Array<{ title: string; extract?: string; thumbnail?: { source: string } }> = [];
  for (let i = 0; i < allTitles.length; i += 50) {
    const batch = await getPageSummaries(allTitles.slice(i, i + 50));
    pages.push(...batch);
  }

  const missing = pages.filter(p => !p.thumbnail?.source && p.extract && p.extract.length > 50);
  console.log(`[${type}] ${missing.length} items need generated images`);

  const typeDir = join(OUT_DIR, type);
  mkdirSync(typeDir, { recursive: true });

  for (const page of missing) {
    const slug = slugify(page.title);
    const outPath = join(typeDir, `${slug}.jpg`);
    const webPath = `/generated/${type}/${slug}.jpg`;

    if (existsSync(outPath)) {
      imageMap[page.title] = webPath; // already generated
      continue;
    }

    try {
      console.log(`  Generating: ${page.title}`);
      const prompt = buildPrompt(type, page.title, page.extract ?? '');
      const buf = await vertexImagenGenerate(prompt);
      writeFileSync(outPath, buf);
      imageMap[page.title] = webPath;
      console.log(`  ✓ ${page.title}`);
    } catch (err) {
      console.warn(`  ✗ Failed ${page.title}:`, err);
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  await processCategory('weapon',    ['UNSC_infantry_weapons', 'Covenant_weapons', 'Forerunner_weapons']);
  await processCategory('vehicle',   ['UNSC_vehicles', 'Covenant_vehicles', 'Banished_vehicles']);
  await processCategory('character', ['Spartan-IIs', 'Spartan-IIIs', 'Sangheili_characters', 'Unggoy_characters']);
  await processCategory('race',      ['Sapient_species']);
  await processCategory('planet',    ['Planets', 'Forerunner_installations']);

  writeFileSync(MAP_PATH, JSON.stringify(imageMap, null, 2));
  console.log(`\nDone. ${Object.keys(imageMap).length} images mapped.`);
}

main().catch(err => { console.error(err); process.exit(1); });
