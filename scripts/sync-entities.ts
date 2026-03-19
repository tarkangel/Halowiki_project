/**
 * Pre-fetches all Halopedia entity data and writes static JSON files to src/data/.
 * Run once before deploying: npm run sync:entities
 * The app then reads exclusively from these static files — no live API calls in the browser.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  fetchCharacters,
  fetchWeapons,
  fetchVehicles,
  fetchRaces,
  fetchPlanets,
  fetchGames,
} from '../src/api/halopedia.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../src/data');

function write(filename: string, data: unknown): void {
  const path = join(DATA_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  const count = Array.isArray(data) ? data.length : Object.keys(data as object).length;
  console.log(`  ✓ ${filename} — ${count} entries`);
}

async function main(): Promise<void> {
  console.log('Creating src/data/ directory…');
  mkdirSync(DATA_DIR, { recursive: true });

  console.log('\nFetching entities from Halopedia…');

  const [characters, weapons, vehicles, races, planets, games] = await Promise.all([
    fetchCharacters(30).then(r => { console.log(`  characters: ${r.length}`); return r; }),
    fetchWeapons(15).then(r => { console.log(`  weapons: ${r.length}`); return r; }),
    fetchVehicles(20).then(r => { console.log(`  vehicles: ${r.length}`); return r; }),
    fetchRaces(30).then(r => { console.log(`  races: ${r.length}`); return r; }),
    fetchPlanets(30).then(r => { console.log(`  planets: ${r.length}`); return r; }),
    fetchGames().then(r => { console.log(`  games: ${r.length}`); return r; }),
  ]);

  console.log('\nWriting static JSON files…');
  write('characters.json', characters);
  write('weapons.json', weapons);
  write('vehicles.json', vehicles);
  write('races.json', races);
  write('planets.json', planets);
  write('games.json', games);

  console.log('\nDone! Commit src/data/*.json to include in the build.');
}

main().catch(err => {
  console.error('sync-entities failed:', err);
  process.exit(1);
});
