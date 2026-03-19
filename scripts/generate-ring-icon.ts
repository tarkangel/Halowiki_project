import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync } from 'fs';

const PROJECT_ID  = process.env.GCP_PROJECT_ID ?? 'halowiki';
const BUCKET_NAME = `${PROJECT_ID}-generated-images`;
const LOCATION    = 'us-central1';
const MODEL       = 'imagen-3.0-generate-002';

const PROMPT = `A Halo ring megastructure (Forerunner installation) floating in space, seen from outside at a dramatic angle showing the full ring as a tilted ellipse. The ring has a metallic silver-gray structure with glowing cyan-blue light strips along its edges. The ring is isolated on a pure white background with no other elements. Product render style, clean cutout, crisp edges, high detail. No stars, no planets, no space background. Pure white background. Square composition 1:1.`;

async function main() {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

  console.log('Generating Halo ring (white bg)...');
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
  writeFileSync('/tmp/halo-ring-whitebg.png', buf);
  console.log('Saved to /tmp/halo-ring-whitebg.png');
}

main().catch(e => { console.error(e); process.exit(1); });
