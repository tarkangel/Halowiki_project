import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync } from 'fs';

const PROJECT_ID  = process.env.GCP_PROJECT_ID ?? 'halowiki';
const BUCKET_NAME = `${PROJECT_ID}-generated-images`;
const LOCATION    = 'us-central1';
const MODEL       = 'imagen-3.0-generate-002';

const PROMPT = `A Halo ring megastructure (Forerunner installation) viewed from outer space, seen at a dramatic angle showing the full ring shape as a tilted ellipse arc. The ring is massive, with visible terrain, oceans, and clouds on its inner surface. Deep black space background with stars. The ring glows with a faint cyan-blue bioluminescent light along its edges. Cinematic, photorealistic, concept art style, high detail. No text, no UI, no characters. Pure space scene. Square composition 1:1.`;

async function main() {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

  console.log('Generating Halo ring image...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: PROMPT }],
      parameters: { sampleCount: 1, aspectRatio: '1:1' },
    }),
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(JSON.stringify(json));
  
  const buf = Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
  writeFileSync('/tmp/halo-ring-generated.png', buf);
  console.log('Saved to /tmp/halo-ring-generated.png');

  // Upload to GCS
  const storage = new Storage({ projectId: PROJECT_ID });
  const bucket = storage.bucket(BUCKET_NAME);
  await bucket.file('ui/halo-ring-icon.png').save(buf, { contentType: 'image/png', resumable: false });
  const gcsUrl = `https://storage.googleapis.com/${BUCKET_NAME}/ui/halo-ring-icon.png`;
  console.log('Uploaded:', gcsUrl);
}

main().catch(e => { console.error(e); process.exit(1); });
