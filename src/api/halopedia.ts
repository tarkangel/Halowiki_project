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

/** Fetch page summary (extract + thumbnail) for one or more titles */
export async function fetchPageSummaries(titles: string[]): Promise<PageSummary[]> {
  if (titles.length === 0) return [];
  const url = buildUrl({
    action: 'query',
    titles: titles.slice(0, 20).join('|'), // MediaWiki max 50, we use 20
    prop: 'extracts|pageimages|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '3',
    piprop: 'thumbnail',
    pithumbsize: '400',
    inprop: 'url',
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pages: ${res.status}`);
  const json = await res.json();
  const pages = json.query?.pages ?? {};
  return Object.values(pages).filter((p: unknown) => (p as { pageid?: number }).pageid !== -1) as PageSummary[];
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
    species: inferSpecies(page.extract ?? ''),
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
  if (combined.includes('unsc') || combined.includes('human') || combined.includes('marine')) return 'UNSC';
  if (combined.includes('covenant') || combined.includes('elite') || combined.includes('brute')) return 'Covenant';
  if (combined.includes('forerunner') || combined.includes('promethean')) return 'Forerunner';
  if (combined.includes('banished')) return 'Banished';
  return 'Unknown';
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
  return 'Unknown';
}

function inferVehicleType(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('fighter') || combined.includes('banshee') || combined.includes('hornet') || combined.includes('pelican') || combined.includes('falcon')) return 'Air';
  if (combined.includes('cruiser') || combined.includes('frigate') || combined.includes('destroyer') || combined.includes('ship') || combined.includes('carrier')) return 'Space';
  if (combined.includes('boat') || combined.includes('naval') || combined.includes('submarine')) return 'Naval';
  return 'Ground';
}

function inferSpecies(_text: string): string {
  return 'Unknown';
}

// ── High-level category fetchers ──────────────────────────────────────────────

async function fetchCategoryAsSummaries(category: string, limit = 20): Promise<PageSummary[]> {
  const members = await fetchCategoryMembers(category, limit);
  const titles = members.map(m => m.title);
  return fetchPageSummaries(titles);
}

export async function fetchWeapons(limit = 20): Promise<Weapon[]> {
  const pages = await fetchCategoryAsSummaries('Weapons', limit);
  return pages.map(pageToWeapon);
}

export async function fetchVehicles(limit = 20): Promise<Vehicle[]> {
  const pages = await fetchCategoryAsSummaries('Vehicles', limit);
  return pages.map(pageToVehicle);
}

export async function fetchCharacters(limit = 20): Promise<Character[]> {
  const pages = await fetchCategoryAsSummaries('Characters', limit);
  return pages.map(pageToCharacter);
}

export async function fetchRaces(limit = 20): Promise<Race[]> {
  const pages = await fetchCategoryAsSummaries('Sentient species', limit);
  return pages.map(pageToRace);
}

export async function fetchPlanets(limit = 20): Promise<Planet[]> {
  const pages = await fetchCategoryAsSummaries('Locations', limit);
  return pages.map(pageToPlanet);
}

export async function fetchGames(limit = 20): Promise<Game[]> {
  const pages = await fetchCategoryAsSummaries('Halo games', limit);
  return pages.map(pageToGame);
}
