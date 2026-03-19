/**
 * Translate entity descriptions to Spanish (Latin American).
 *
 * Reads src/data/*.json, translates the `description` field of each entity
 * using Claude Haiku (fast + cheap), writes src/data/es/*.json.
 *
 * Rules:
 *  - Proper nouns: Halo character names, faction names, place names are NOT translated
 *  - Game titles stay in English
 *  - Only `description` is translated; all other fields (id, name, imageUrl, etc.) are kept as-is
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/translate-entities.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DATA_DIR    = join(process.cwd(), 'src/data');
const ES_DIR      = join(process.cwd(), 'src/data/es');
const ENTITY_FILES = ['characters', 'weapons', 'vehicles', 'races', 'planets', 'games'] as const;

const SYSTEM_PROMPT = `Eres un traductor especializado en el universo de Halo.
Traduce la descripción que te paso al español latinoamericano.

Reglas estrictas:
- Los nombres propios de personajes (John-117, Cortana, Atriox, etc.) NO se traducen
- Los nombres de facciones (UNSC, Covenant, Banished, Forerunner, Flood) NO se traducen
- Los títulos de juegos (Halo: Combat Evolved, Halo 3, etc.) NO se traducen
- Los nombres de lugares canónicos (Installation 04, High Charity, etc.) NO se traducen
- Los nombres de especies (Sangheili, Jiralhanae, Unggoy, etc.) NO se traducen
- Los acrónimos militares (ONI, ODST, MJOLNIR, etc.) NO se traducen
- Responde ÚNICAMENTE con la traducción, sin comillas, sin explicaciones`;

async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text.trim() : text;
}

async function translateFile(name: string): Promise<void> {
  const srcPath = join(DATA_DIR, `${name}.json`);
  const dstPath = join(ES_DIR,   `${name}.json`);

  const entities: Array<Record<string, unknown>> = JSON.parse(readFileSync(srcPath, 'utf8'));
  console.log(`\n[${name}] translating ${entities.length} entries...`);

  const translated: Array<Record<string, unknown>> = [];

  for (let i = 0; i < entities.length; i++) {
    const entity = { ...entities[i] };
    const desc = entity.description as string | undefined;

    if (desc && desc.trim().length > 0) {
      try {
        entity.description = await translateText(desc);
        process.stdout.write(`  ${i + 1}/${entities.length}\r`);
      } catch (err) {
        console.warn(`  ⚠ failed to translate "${entity.name}": ${(err as Error).message}`);
      }
    }

    translated.push(entity);

    // Small delay to avoid rate limits
    if (i > 0 && i % 10 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  writeFileSync(dstPath, JSON.stringify(translated, null, 2));
  console.log(`  ✓ written to ${dstPath}`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  mkdirSync(ES_DIR, { recursive: true });

  for (const name of ENTITY_FILES) {
    await translateFile(name);
  }

  console.log('\n=== Translation complete ===');
}

main().catch(err => { console.error(err); process.exit(1); });
