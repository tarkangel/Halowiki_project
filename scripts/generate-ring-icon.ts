import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { writeFileSync } from 'fs';

const PROJECT_ID  = process.env.GCP_PROJECT_ID ?? 'halowiki';
const BUCKET_NAME = `${PROJECT_ID}-generated-images`;
const LOCATION    = 'us-central1';
const MODEL       = 'imagen-3.0-generate-002';

const PROMPT = `A Halo ring megastructure (Forerunner installation) seen from outside at a dramatic angle showing the full ring as a tilted ellipse. The outer ring structure is dark metallic gray with glowing cyan-blue LED light strips along the edges. The inner concave surface of the ring — the habitable face — is clearly visible and shows a lush living biome: green continents, blue oceans, white cloud formations, like the inside of a terraformed world curving around the ring interior. High detail. Isolated on a pure white background with no other elements, no stars, no space background. Product render style, clean cutout, crisp edges. Square composition 1:1.`;

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
  writeFileSync('/tmp/halo-ring-v3-whitebg.png', buf);
  console.log('Saved to /tmp/halo-ring-v3-whitebg.png');
}

main().catch(e => { console.error(e); process.exit(1); });
