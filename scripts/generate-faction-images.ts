import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync } from 'fs';

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? 'halowiki';
const BUCKET = `${PROJECT_ID}-generated-images`;
const LOC = 'us-central1';
const MODEL = 'imagen-3.0-generate-002';

const PROMPTS: Record<string, string> = {
  forerunner: `Epic cinematic concept art of the Forerunner civilization from Halo. A vast ancient alien megastructure — monolithic golden-white geometric towers and platforms floating in space, glowing with blue-white energy lines. A majestic Forerunner Dreadnought ship hovers in the foreground. The architecture is impossibly large, precise, and alien — symmetrical, angular, and luminous. Deep space background with a nebula. Photorealistic, high detail, dramatic lighting, widescreen 16:9.`,
};

async function generateImage(prompt: string): Promise<Buffer> {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOC}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOC}/publishers/google/models/${MODEL}:predict`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '16:9' } }),
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(JSON.stringify(json));
  return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
}

async function main() {
  const storage = new Storage({ projectId: PROJECT_ID });
  const bucket = storage.bucket(BUCKET);

  for (const [key, prompt] of Object.entries(PROMPTS)) {
    console.log(`Generating: ${key}`);
    const buf = await generateImage(prompt);
    writeFileSync(`/tmp/faction_${key}.jpg`, buf);
    await bucket.file(`faction/${key}.jpg`).save(buf, { contentType: 'image/jpeg', resumable: false });
    const url = `https://storage.googleapis.com/${BUCKET}/faction/${key}.jpg`;
    console.log(`  ✓ ${url}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
