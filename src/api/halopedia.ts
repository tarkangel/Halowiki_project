/**
 * Halopedia MediaWiki API client
 * Docs: https://www.mediawiki.org/wiki/API:Main_page
 */

const BASE_URL =
  (import.meta.env.VITE_HALOPEDIA_API_URL as string) ??
  'https://www.halopedia.org/api.php';

// Add origin=* for CORS
function buildUrl(params: Record<string, string>): string {
  const url = new URL(BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return url.toString();
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface CategoryMember {
  pageid: number;
  title: string;
  ns: number;
}

export interface PageSummary {
  pageid: number;
  title: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  fullurl?: string;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

/** List all pages in a MediaWiki category */
export async function fetchCategoryMembers(
  category: string,
  limit = 20,
): Promise<CategoryMember[]> {
  const url = buildUrl({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmlimit: String(limit),
    cmtype: 'page',
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch category ${category}: ${res.status}`);
  const json = await res.json();
  return (json.query?.categorymembers ?? []) as CategoryMember[];
}

/** Fetch page summary (extract + thumbnail) for one or more titles — max 50 per call */
export async function fetchPageSummaries(titles: string[]): Promise<PageSummary[]> {
  if (titles.length === 0) return [];
  const url = buildUrl({
    action: 'query',
    titles: titles.slice(0, 50).join('|'),
    prop: 'extracts|pageimages|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '6',
    piprop: 'thumbnail',
    pithumbsize: '500',
    inprop: 'url',
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pages: ${res.status}`);
  const json = await res.json();
  const pages = json.query?.pages ?? {};
  return Object.values(pages).filter((p: unknown) => (p as { pageid?: number }).pageid !== -1) as PageSummary[];
}

/** Fetch summaries for a large list of titles, batching in groups of 50 */
async function fetchPageSummariesBatched(titles: string[]): Promise<PageSummary[]> {
  const batches: string[][] = [];
  for (let i = 0; i < titles.length; i += 50) batches.push(titles.slice(i, i + 50));
  const results = await Promise.all(batches.map(fetchPageSummaries));
  return results.flat();
}

/** Fetch a single page */
export async function fetchPage(title: string): Promise<PageSummary | null> {
  const results = await fetchPageSummaries([title]);
  return results[0] ?? null;
}

/** Cross-category search */
export async function searchPages(query: string, limit = 10): Promise<PageSummary[]> {
  const url = buildUrl({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
    srprop: 'snippet|titlesnippet',
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  const hits = (json.query?.search ?? []) as Array<{ pageid: number; title: string; snippet: string }>;
  return hits.map(h => ({
    pageid: h.pageid,
    title: h.title,
    extract: h.snippet.replace(/<[^>]+>/g, ''), // strip HTML tags from snippet
  }));
}

// ── Domain mappers ────────────────────────────────────────────────────────────
// These transform raw wiki pages into typed domain objects.

import type { Weapon, Vehicle, Character, Race, Planet, Game } from '../types';

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function wikiUrl(title: string) {
  return `https://www.halopedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

export function pageToWeapon(page: PageSummary): Weapon {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
    faction: inferFaction(page.title, page.extract ?? ''),
    type: inferWeaponType(page.title, page.extract ?? ''),
    appearances: [],
    wikiUrl: wikiUrl(page.title),
  };
}

export function pageToVehicle(page: PageSummary): Vehicle {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
    faction: inferFaction(page.title, page.extract ?? ''),
    type: inferVehicleType(page.title, page.extract ?? ''),
    appearances: [],
    wikiUrl: wikiUrl(page.title),
  };
}

export function pageToCharacter(page: PageSummary): Character {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
    species: inferSpecies(page.title, page.extract ?? ''),
    affiliation: inferFaction(page.title, page.extract ?? ''),
    appearances: [],
    wikiUrl: wikiUrl(page.title),
  };
}

export function pageToRace(page: PageSummary): Race {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
    affiliation: inferFaction(page.title, page.extract ?? ''),
    appearances: [],
    wikiUrl: wikiUrl(page.title),
  };
}

export function pageToPlanet(page: PageSummary): Planet {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
    appearances: [],
    wikiUrl: wikiUrl(page.title),
  };
}

export function pageToGame(page: PageSummary): Game {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
    wikiUrl: wikiUrl(page.title),
  };
}

// ── Inference helpers ─────────────────────────────────────────────────────────

function inferFaction(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('unsc') || combined.includes('human') || combined.includes('marine') ||
      combined.includes('oni') || combined.includes('spartan') || combined.includes('odst') ||
      combined.includes('vtol') || combined.includes('warthog') || combined.includes('scorpion') ||
      combined.includes('pelican') || combined.includes('hornet') || combined.includes('falcon') ||
      combined.includes('mongoose') || combined.includes('elephant') || combined.includes('mammoth')) return 'UNSC';
  if (combined.includes('covenant') || combined.includes('elite') || combined.includes('sangheili') ||
      combined.includes('brute') || combined.includes('jiralhanae') || combined.includes('grunt') ||
      combined.includes('unggoy') || combined.includes('hunter') || combined.includes('mgalekgolo') ||
      combined.includes('banshee') || combined.includes('ghost') || combined.includes('wraith') ||
      combined.includes('phantom') || combined.includes('spirit')) return 'Covenant';
  if (combined.includes('forerunner') || combined.includes('promethean') || combined.includes('sentinel')) return 'Forerunner';
  if (combined.includes('banished') || combined.includes('atriox') || combined.includes('escharum')) return 'Banished';
  return '';
}

function inferWeaponType(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('rifle')) return 'Rifle';
  if (combined.includes('pistol') || combined.includes('handgun')) return 'Pistol';
  if (combined.includes('sniper')) return 'Sniper Rifle';
  if (combined.includes('shotgun')) return 'Shotgun';
  if (combined.includes('launcher') || combined.includes('rocket')) return 'Launcher';
  if (combined.includes('sword') || combined.includes('blade') || combined.includes('hammer')) return 'Melee';
  if (combined.includes('grenade')) return 'Explosive';
  if (combined.includes('cannon') || combined.includes('turret')) return 'Heavy';
  return '';
}

function inferVehicleType(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('vtol') || combined.includes('fighter') || combined.includes('banshee') ||
      combined.includes('hornet') || combined.includes('pelican') || combined.includes('falcon') ||
      combined.includes('wasp') || combined.includes('broadsword') || combined.includes('longsword')) return 'Air';
  if (combined.includes('cruiser') || combined.includes('frigate') || combined.includes('destroyer') ||
      combined.includes(' ship') || combined.includes('carrier') || combined.includes('corvette') ||
      combined.includes('prowler')) return 'Space';
  if (combined.includes('boat') || combined.includes('naval') || combined.includes('submarine')) return 'Naval';
  return 'Ground';
}

function inferSpecies(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('spartan') || combined.includes('human') || combined.includes('marine') ||
      combined.includes('odst') || combined.includes('oni') || combined.includes('john-117') ||
      combined.includes('master chief')) return 'Human';
  if (combined.includes('sangheili') || combined.includes('elite')) return 'Sangheili';
  if (combined.includes('jiralhanae') || combined.includes('brute')) return 'Jiralhanae';
  if (combined.includes('unggoy') || combined.includes('grunt')) return 'Unggoy';
  if (combined.includes('mgalekgolo') || combined.includes('hunter')) return 'Mgalekgolo';
  if (combined.includes('kig-yar') || combined.includes('jackal') || combined.includes('skirmisher')) return 'Kig-Yar';
  if (combined.includes('yanme\'e') || combined.includes('drone')) return 'Yanme\'e';
  if (combined.includes('lekgolo')) return 'Lekgolo';
  if (combined.includes('forerunner') || combined.includes('didact') || combined.includes('librarian')) return 'Forerunner';
  if (combined.includes('flood') || combined.includes('gravemind')) return 'Flood';
  if (combined.includes('monitor') || combined.includes('343 guilty') || combined.includes('343 spark') || combined.includes('cortana') || combined.includes('a.i.') || combined.includes(' ai ')) return 'AI';
  return '';
}

// ── High-level category fetchers ──────────────────────────────────────────────

async function fetchCategoryAsSummaries(category: string, limit = 20): Promise<PageSummary[]> {
  const members = await fetchCategoryMembers(category, limit);
  const titles = members.map(m => m.title);
  return fetchPageSummaries(titles);
}

export async function fetchWeapons(limitPerCat = 15): Promise<Weapon[]> {
  const [unsc, covenant, forerunner] = await Promise.all([
    fetchCategoryMembers('UNSC_infantry_weapons', limitPerCat).catch(() => []),
    fetchCategoryMembers('Covenant_weapons', limitPerCat).catch(() => []),
    fetchCategoryMembers('Forerunner_weapons', limitPerCat).catch(() => []),
  ]);
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const m of [...unsc, ...covenant, ...forerunner]) {
    if (!seen.has(m.title)) { seen.add(m.title); titles.push(m.title); }
  }
  const summaries = await fetchPageSummariesBatched(titles);
  return summaries.map(pageToWeapon);
}

export async function fetchVehicles(limitPerCat = 20): Promise<Vehicle[]> {
  const [unsc, covenant, banished] = await Promise.all([
    fetchCategoryMembers('UNSC_vehicles', limitPerCat).catch(() => []),
    fetchCategoryMembers('Covenant_vehicles', limitPerCat).catch(() => []),
    fetchCategoryMembers('Banished_vehicles', limitPerCat).catch(() => []),
  ]);
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const m of [...unsc, ...covenant, ...banished]) {
    if (!seen.has(m.title)) { seen.add(m.title); titles.push(m.title); }
  }
  const summaries = await fetchPageSummariesBatched(titles);
  return summaries.map(pageToVehicle);
}

const CHARACTER_CATEGORIES: Array<{ category: string; species: string }> = [
  { category: 'Human_characters',      species: 'Human'      },
  { category: 'Sangheili_characters',  species: 'Sangheili'  },
  { category: 'AI_characters',         species: 'AI'         },
  { category: 'Jiralhanae_characters', species: 'Jiralhanae' },
  { category: 'Forerunner_characters', species: 'Forerunner' },
  { category: 'Unggoy_characters',     species: 'Unggoy'     },
  { category: 'Kig-Yar_characters',    species: 'Kig-Yar'   },
  { category: 'Flood_characters',      species: 'Flood'      },
];

export async function fetchCharacters(limitPerSpecies = 15): Promise<Character[]> {
  // Fetch member lists from all species categories in parallel
  const membersByCat = await Promise.all(
    CHARACTER_CATEGORIES.map(({ category, species }) =>
      fetchCategoryMembers(category, limitPerSpecies)
        .then(members => ({ members, species }))
        .catch(() => ({ members: [], species }))
    )
  );

  // Merge all titles, deduplicate, track species per title
  const seen = new Set<string>();
  const allTitles: string[] = [];
  const speciesMap: Record<string, string> = {};

  for (const { members, species } of membersByCat) {
    for (const m of members) {
      if (!seen.has(m.title)) {
        seen.add(m.title);
        allTitles.push(m.title);
        speciesMap[m.title] = species;
      }
    }
  }

  // Fetch all summaries in batches of 50
  const summaries = await fetchPageSummariesBatched(allTitles);

  return summaries
    .map(page => ({
      ...pageToCharacter(page),
      species: speciesMap[page.title] ?? inferSpecies(page.title, page.extract ?? ''),
    }))
    .filter(isUsableCharacter);
}

/** Returns false for stub/junk character entries not worth showing */
function isUsableCharacter(c: Character): boolean {
  // Must have a meaningful description
  if (!c.description || c.description.trim().length < 80) return false;
  // Must have either an image OR a real name (not a pure callsign/designation)
  // Callsign pattern: "4 Charlie 27", "2 Lima 4", "'D'", "'S'", "1 Alpha 3"
  const callsign = /^[\d\s'"`]+$|^\d[\w\s'-]{0,12}\d$|^'[A-Z]'$/;
  if (callsign.test(c.name.trim())) return false;
  return true;
}

export async function fetchRaces(limit = 30): Promise<Race[]> {
  const pages = await fetchCategoryAsSummaries('Sapient_species', limit);
  return pages.map(pageToRace);
}

export async function fetchPlanets(limitPerCat = 30): Promise<Planet[]> {
  const [planets, installations] = await Promise.all([
    fetchCategoryMembers('Planets', limitPerCat).catch(() => []),
    fetchCategoryMembers('Forerunner_installations', limitPerCat).catch(() => []),
  ]);

  const seen = new Set<string>();
  const titles: string[] = [];
  for (const m of [...planets, ...installations]) {
    if (!seen.has(m.title)) { seen.add(m.title); titles.push(m.title); }
  }

  const summaries = await fetchPageSummariesBatched(titles);
  const result = summaries.map(pageToPlanet).filter(isUsablePlanet);

  // Fill in images for planets that the page-image prop missed
  const needsImage = result.filter(p => !p.imageUrl).map(p => p.name);
  if (needsImage.length > 0) {
    const fallbacks = await fetchFallbackImages(needsImage);
    for (const p of result) {
      if (!p.imageUrl) p.imageUrl = fallbacks.get(p.name);
    }
  }

  return result;
}

/**
 * For pages with no page-image set, walk the list of images embedded on the
 * page and resolve the URL of the first non-icon image.
 */
async function fetchFallbackImages(pageNames: string[]): Promise<Map<string, string>> {
  if (pageNames.length === 0) return new Map();

  // Step 1: get image lists for each page (batch, max 50 titles)
  const batches: string[][] = [];
  for (let i = 0; i < pageNames.length; i += 50) batches.push(pageNames.slice(i, i + 50));

  const titleToFile = new Map<string, string>();
  await Promise.all(batches.map(async batch => {
    const url = buildUrl({
      action: 'query',
      titles: batch.join('|'),
      prop: 'images',
      imlimit: '15',
    });
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) return;
    const json = await res.json();
    for (const page of Object.values(json.query?.pages ?? {}) as Array<{ title: string; images?: Array<{ title: string }> }>) {
      if (!page.images?.length) continue;
      // Skip wiki badges/decorations — prefer landscape/planet/installation art
      const candidate = page.images.find(i =>
        !/(icon|logo|flag|emblem|symbol|sigil|banner|seal|insignia|wikia|nav|stub|edit|canon|featured|article|disambig|delete|merge|cleanup|spoiler|ambox|tmbox|ombox|fmbox|cmbox|portal|award|rating|quality|tier|status|badge|tag|notice|warning|protected|locked)/i.test(i.title)
      );
      if (candidate) titleToFile.set(page.title, candidate.title);
    }
  }));

  if (titleToFile.size === 0) return new Map();

  // Step 2: resolve File: titles → actual CDN URLs
  const fileNames = [...new Set(titleToFile.values())];
  const fileToUrl = new Map<string, string>();
  const fileBatches: string[][] = [];
  for (let i = 0; i < fileNames.length; i += 50) fileBatches.push(fileNames.slice(i, i + 50));

  await Promise.all(fileBatches.map(async batch => {
    const url = buildUrl({
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '500',
    });
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) return;
    const json = await res.json();
    for (const page of Object.values(json.query?.pages ?? {}) as Array<{ title: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }>) {
      const imgUrl = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url;
      if (imgUrl) fileToUrl.set(page.title, imgUrl);
    }
  }));

  // Combine
  const result = new Map<string, string>();
  for (const [pageName, file] of titleToFile) {
    const imgUrl = fileToUrl.get(file);
    if (imgUrl) result.set(pageName, imgUrl);
  }
  return result;
}

const GENERIC_PLANET_NAMES = new Set([
  'penal colony', 'agriculture world', 'human colonies',
  'outer colonies', 'inner colonies',
]);

function isUsablePlanet(p: Planet): boolean {
  if (GENERIC_PLANET_NAMES.has(p.name.toLowerCase())) return false;
  if (!p.description || p.description.trim().length < 100) {
    return !!p.imageUrl;
  }
  return true;
}

const JUNK_GAME_PATTERNS = /^User(Wiki)?:|cancelled|canceled|rejected|sequel|GURPS|Saga|game jam|pitch$/i;

export async function fetchGames(): Promise<Game[]> {
  const members = await fetchCategoryMembers('Halo_games', 50).catch(() => []);
  const titles = members
    .map(m => m.title)
    .filter(t => !JUNK_GAME_PATTERNS.test(t));
  const summaries = await fetchPageSummariesBatched(titles);
  return summaries.map(pageToGame);
}
