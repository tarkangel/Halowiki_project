/**
 * Merges all per-type generated image JSONs into the single
 * src/generated-images.json consumed by the app.
 */
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TYPES   = ['lore', 'weapon', 'vehicle', 'character', 'character2', 'race', 'planet'];
const OUT     = join(process.cwd(), 'src', 'generated-images.json');

const merged: Record<string, string> = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

let added = 0;
for (const type of TYPES) {
  const path = join(process.cwd(), 'src', `generated-${type}-images.json`);
  if (!existsSync(path)) continue;
  const data: Record<string, string> = JSON.parse(readFileSync(path, 'utf8'));
  for (const [k, v] of Object.entries(data)) {
    if (!merged[k]) added++;
    merged[k] = v;
  }
}

writeFileSync(OUT, JSON.stringify(merged, null, 2));
console.log(`Merged ${Object.keys(merged).length} total images (+${added} new) → generated-images.json`);
