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
import _generatedImages   from '../generated-images.json';
import _weaponImages      from '../generated-weapon-images.json'    assert { type: 'json' };
import _vehicleImages     from '../generated-vehicle-images.json'   assert { type: 'json' };
import _characterImages   from '../generated-character-images.json' assert { type: 'json' };
import _raceImages        from '../generated-race-images.json'      assert { type: 'json' };
import _planetImages      from '../generated-planet-images.json'    assert { type: 'json' };

const generatedImages: Record<string, string> = {
  ..._generatedImages,
  ..._weaponImages,
  ..._vehicleImages,
  ..._characterImages,
  ..._raceImages,
  ..._planetImages,
};

import {
  LORE_CHARACTERS, LORE_WEAPONS, LORE_VEHICLES, LORE_RACES, LORE_PLANETS,
} from '../lore-titles';

function generatedImage(title: string): string | undefined {
  return (generatedImages as Record<string, string>)[title];
}

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function pageToWeapon(page: PageSummary): Weapon {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    faction: inferFaction(page.title, page.extract ?? ''),
    type: inferWeaponType(page.title, page.extract ?? ''),
    appearances: [],
  };
}

export function pageToVehicle(page: PageSummary): Vehicle {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    faction: inferFaction(page.title, page.extract ?? ''),
    type: inferVehicleType(page.title, page.extract ?? ''),
    appearances: [],
  };
}

export function pageToCharacter(page: PageSummary): Character {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    species: inferSpecies(page.title, page.extract ?? ''),
    affiliation: inferFaction(page.title, page.extract ?? ''),
    appearances: [],
  };
}

export function pageToRace(page: PageSummary): Race {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    affiliation: inferFaction(page.title, page.extract ?? ''),
    appearances: [],
  };
}

// Curated descriptions for planets/installations whose Halopedia extract is
// too thin (< 200 characters) to be useful. Applied only as a fallback.
const PLANET_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'Auric':
    'Auric is a remote gas giant in the Myung system serving as the orbital anchor of Installation 01, one of the seven rings of the Forerunner Halo Array. The ring orbited Auric undisturbed for millennia under the guardianship of its ancient monitor, kept dormant far from the conflict that consumed the rest of the galaxy. Following the Human-Covenant War, the UNSC catalogued the installation as part of broader efforts to document surviving Forerunner superweapons.',

  'Falaknuma':
    'Falaknuma is a human Inner Colony world in the 18 Scorpii system, administered by the Unified Earth Government. The planet served as a strategic hub within UEG colonial space, hosting civilian settlements and military support infrastructure. In the turbulent post-war era, Falaknuma became a focal point for UNSC reconstruction efforts as the government worked to restore stability to a colonial network shattered by years of Covenant glassing and the upheaval of the Created conflict.',

  'Alpha Corvi II':
    'Alpha Corvi II is a human colony world that became a battleground during the early stages of the Human-Covenant War. UNSC forces mounted a fierce defensive action here against Covenant assault troops, engaging in brutal urban combat to protect the civilian population before an ordered withdrawal became unavoidable. The engagement at Alpha Corvi II exemplified the impossible odds faced by UNSC defenders as the Covenant systematically dismantled the outer colonies.',

  'Erebus VII':
    'Erebus VII is a human colony in the outer territories of UNSC space, valued for its mineral resources and frontier military installations. During the Human-Covenant War the planet came under Covenant assault, forcing the rapid evacuation of civilians and desperate last-stand actions by UNSC Army and Marine units. Erebus VII joined the long list of outer colony worlds lost to Covenant glassing during the relentless advance that would ultimately bring the war to the gates of Reach itself.',

  'Fumirole':
    'Fumirole is a human colony world linked to one of the most selfless sacrifices of the Human-Covenant War. In 2552, UNSC special operations forces conducted a critical mission above Fumirole to eliminate a Covenant supercarrier threatening the colony, a dangerous operation that cost the life of a SPARTAN-II supersoldier who detonated a slipspace bomb to destroy the vessel. The world stands as a monument to the extraordinary cost paid by Spartans and ordinary soldiers alike to keep humanity alive.',

  'Atlas':
    'Atlas is a human colony world in UNSC space that served as a staging ground and base of operations during key post-war operations. The planet hosted civilian settlements and ONI-affiliated research infrastructure, making it strategically significant to both UNSC command and independent colonial factions seeking leverage in the power vacuum left after the Human-Covenant War. Investigations conducted on and around Atlas would draw UNSC special operations teams into conflicts with both Covenant remnants and human insurrectionists.',

  'Line Installation 1-4':
    'Line Installation 1-4 is a Forerunner Line Installation — a colossal linear ring megastructure constructed by the ancient Forerunner ecumene. Unlike the circular Halo rings built to fire the Array, Line Installations served administrative and sensor functions: scanning vast stellar regions for Flood contamination, managing resource logistics, and relaying data across the ecumene\'s galaxy-spanning communication network. This installation is one of many such structures left dormant following the activation of the Halo Array.',

  'Line Installation 9-12':
    'Line Installation 9-12 is one of the Forerunner\'s network of Line Installations — enormous linear ring megastructures distributed across the galaxy as part of the ecumene\'s administrative and monitoring infrastructure. These installations were engineered to operate autonomously for tens of thousands of years, their onboard systems diligently recording stellar data long after the Forerunner civilization that built them had vanished. Explorers who have breached their hulls find vast interiors of pale ivory alloy lit by dormant orange hardlight conduits.',

  'Line Installation 444-447':
    'Line Installation 444-447 is a cluster of Forerunner Line Installations, massive linear ring megastructures positioned to monitor and administer a stellar region on behalf of the ancient Forerunner ecumene. The precise numerical designation reflects the exhaustive cataloguing system the Forerunners applied to every structure in their vast civilization. Like all Line Installations the cluster has remained dormant since the firing of the Halo Array, a ghostly administrative network maintaining the silence of a dead empire.',

  'Line installation':
    'A Forerunner Line Installation is a class of enormous linear ring megastructure built by the ancient Forerunner civilization. Distinct from the circular Halo rings designed to fire the Array, Line Installations fulfilled administrative, sensor, and logistical roles for the Forerunner ecumene — monitoring stellar systems for Flood contamination and coordinating the vast machinery of a galaxy-spanning civilization. Constructed of pale cream-ivory alloy with glowing orange hardlight conduits, they stand as silent monuments to an extinct empire.',

  'Covert Support Base 4276':
    'Covert Support Base 4276 is a classified UNSC installation established by the Office of Naval Intelligence to support black operations in a strategically sensitive region. Facilities of this type provide logistical resupply, communications relay, and secure extraction services for ONI operatives working in denied territory. The base\'s remote positioning and strict information blackout ensured it remained unknown to Covenant intelligence networks throughout the Human-Covenant War.',

  'Shield world':
    'A Shield World is an immense Forerunner megastructure — typically a hollow planetoid or nested Dyson sphere — designed to shelter biological life from the firing of the Halo Array. Built to sustain billions of living beings in sealed interior biomes while the rings purged the galaxy of the Flood, Shield Worlds represent the Forerunner Lifeworkers\' greatest achievement in species preservation. Etran Harborage, discovered by the UNSC Spirit of Fire in 2531, was one such world — its interior concealing an entire living ecosystem tended by automated Forerunner systems for one hundred thousand years.',

  'Flood research facility':
    'A Forerunner Flood Research Facility is a classified installation constructed to study the Flood parasite under strict quarantine conditions. Forerunner scientists used these sites to analyse Flood biology and behaviour, searching desperately for a cure or containment method as the parasite consumed the galaxy. Most such facilities were eventually compromised from within — the Gravemind\'s intelligence subverting containment protocols and turning centres of study into outposts of Flood expansion.',

  'Orbital reformer':
    'An Orbital Reformer is a class of Forerunner megastructure designed to reshape and terraform planetary bodies from orbit. Wielding directed energy emitters and mass-driver technology of staggering precision, these installations could restructure planetary crusts, alter atmospheric chemistry, and redirect cometary bodies to deliver water and biological seed material to barren worlds. They formed a critical component of the Forerunner ecumene\'s galaxy-wide terraforming and ecological management programme.',

  'Seed world':
    'A Forerunner Seed World is a mobile or stationary installation designed to preserve vast catalogues of genetic material and living ecosystems for deployment after an extinction-level event. Seed Worlds were central to the Librarian\'s conservation plan — following the firing of the Halo Array, they would reseed purged planets with flora, fauna, and eventually humanity, beginning the long cycle of Forerunner-guided galactic repopulation. Their interiors contained hermetically sealed biomes housing millions of species held in stasis.',

  'Boundary Lithos':
    'Boundary Lithos is a Forerunner Lithos installation — a type of large artificial rocky structure used to mark territorial boundaries and anchor sensor networks across the Forerunner ecumene. Lithos structures appear as ancient weathered stone formations to the untrained eye, concealing sophisticated monitoring and communication technology within their dense mineral matrices. Deployed at the edges of Forerunner-administered space, they maintained silent vigil over the boundaries of an empire that has long since ceased to exist.',

  'Absolute Record':
    'The Absolute Record is a legendary Forerunner installation of immense significance — a hidden archive containing the sum total of Forerunner knowledge and the access keys to all installations in the Forerunner grid. Accessible only by one who holds the Janus Key, the Record\'s precise location was considered one of the most closely guarded secrets of the Forerunner ecumene. In the post-war era, both the UNSC and Covenant remnant factions sought it desperately, believing its contents could grant unparalleled power over Forerunner technology scattered across the galaxy.',

  'Greater Ark':
    'The Greater Ark, also known as Installation 00-1, is the original Forerunner Ark — a colossal extragalactic superstructure that served as the construction site for the first generation of Halo rings and as a refuge beyond the reach of the original Array\'s firing radius. Located far outside the Milky Way galaxy, the Greater Ark dwarfs even the Lesser Ark discovered during the Human-Covenant War. Its existence remained unknown to the UNSC for years, revealed only through intelligence gathered from Forerunner data networks by Spartan teams operating in the post-war era.',

  'Ghibalb':
    'Ghibalb is the ancient homeworld of the Forerunner species, a once-magnificent world at the heart of what would become the Forerunner ecumene. Long before the rise of their galaxy-spanning civilization, the early Forerunners nearly destroyed Ghibalb when experiments with stellar engineering caused a series of catastrophic stellar collapses that sterilised multiple star systems. The tragedy of Ghibalb haunted Forerunner culture for millennia, instilling a cautious reverence for stellar manipulation — and a deep fear of technology that could end all life.',

  'Faun Hakkor':
    'Faun Hakkor was a world at the heart of the ancient human civilization that once rivalled the Forerunner ecumene in power and reach. The capital of the ancient human empire, it was the site of a pivotal Forerunner-human war that ended with the defeat of humanity and the deliberate genetic and cultural devolution imposed upon the human species as punishment. The Primordial — the last surviving Precursor — was imprisoned on Faun Hakkor for ten thousand years before being transported to Installation 07 by the Librarian.',

  'Clinquant':
    'Clinquant is a Forerunner installation of significant historical and strategic value, catalogued within the Forerunner administrative grid. Located in a remote stellar region, the installation maintained automated Forerunner systems long after the firing of the Halo Array, its onboard intelligence continuing to fulfil its original operational mandate in isolation. Post-war UNSC and Swords of Sanghelios expeditions to Clinquant encountered active Forerunner defences, suggesting its systems had never received the deactivation signal sent at the close of the Forerunner-Flood War.',

  'Gathved':
    'Gathved is a world of strategic significance within Covenant and post-Covenant space, positioned along key slipspace routes used by both Covenant remnant fleets and Banished supply lines in the post-war era. Its population and infrastructure made it a contested prize for rival factions seeking to consolidate control over former Covenant territory following the dissolution of the Covenant at the end of the Human-Covenant War.',

  'Jat-Krula':
    'Jat-Krula is a world within the former Covenant sphere of influence, known to UNSC intelligence as a mustering point for Jiralhanae and Sangheili forces in the turbulent years following the Covenant\'s collapse. The planet\'s geography and industrial capacity made it strategically valuable to warlords competing to fill the power vacuum left by the Prophet Hierarchs\' deaths and the Great Schism that tore the Covenant apart in its final hours.',

  'Ephsu I':
    'Ephsu I is a planet within the Forerunner ecumene\'s former sphere of influence, notable for Forerunner construction projects established in the system during the height of their civilization. The world and its stellar system were catalogued by Forerunner administrative networks and monitored by automated Forerunner systems well into the post-war era, when UNSC and Swords of Sanghelios survey teams began mapping the extent of surviving Forerunner installations across the galaxy.',

  'Eudolaan':
    'Eudolaan is a world that featured in conflicts of the post-Covenant era, positioned in a region of space contested between UNSC forces, Covenant remnants, and Banished warbands. Its strategic value stemmed from proximity to key slipspace corridors and former Covenant supply infrastructure, making it a flash-point for the numerous small-scale wars that erupted in the power vacuum following the Covenant\'s collapse at the end of 2552.',

  'Invicta':
    'Invicta is a UNSC colony world known for its resilient population and strong ties to the UNSC military establishment. The planet\'s name — Latin for "unconquered" — reflected its settlers\' determination to maintain independence and self-sufficiency in the outer colonies. During the Human-Covenant War, Invicta\'s citizens and garrison mounted fierce resistance when Covenant forces moved against the planet, embodying the stubborn defiance that characterised humanity\'s long struggle for survival.',
};

export function pageToPlanet(page: PageSummary): Planet {
  const extract = page.extract ?? '';
  const description = extract.length < 200 && PLANET_DESCRIPTION_OVERRIDES[page.title]
    ? PLANET_DESCRIPTION_OVERRIDES[page.title]
    : extract;
  return {
    id: slugify(page.title),
    name: page.title,
    description,
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    appearances: [],
  };
}

export function pageToGame(page: PageSummary): Game {
  return {
    id: slugify(page.title),
    name: page.title,
    description: page.extract ?? '',
    imageUrl: page.thumbnail?.source,
  };
}

// ── Inference helpers ─────────────────────────────────────────────────────────

function inferFaction(title: string, text: string): string {
  // ── Pass 1: name-only structural patterns ────────────────────────────────
  // Fire even when there is no description text.

  // Sangheili: "Firstname 'Clanname" — apostrophe before capital letter
  const isSangheiliName = /'\s*[A-Z]/.test(title);

  // Forerunner characters: multi-segment hyphenated descriptive names
  // (Birth-to-Light, Chant-to-Green, Clearance-of-Old-Forests…) — 3+ segments
  const isForerunnerHyphenName = /^[A-Z][a-z]+(-[A-Za-z]+){2,}$/.test(title);

  // Known Forerunner role-title characters (no Halopedia page, no description)
  const isForerunnerRoleName = /^(auditor|confirmer|boundless|capital-enforcer|carrier-of-immunity|celebrator-of-birth|chief judicate|catalog triad|bornstellar's (sister|son)|catalog)$/i.test(title);

  // Spartan designation formats: Name-A123, Name-123, SPARTAN-X000
  const isSpartanName = /^[A-Za-z]+-[A-Z]\d{2,3}$/.test(title)
    || /^[A-Za-z]+-\d{3}$/.test(title)
    || /^SPARTAN-[A-Z0-9]+$/.test(title);

  // Forerunner numeric monitor designations: "049 Abject Testament"
  const isForerunnerMonitorName = /^\d{2,6}\s+[A-Z][a-z]/.test(title);

  // Covenant manufacturer-pattern items: all "-pattern" named entries are Covenant
  const isCovenantPatternItem = /-pattern\b/i.test(title);

  // Known Forerunner weapons/installations that lack "forerunner" in description.
  // Includes Halo Infinite Forerunner weapons (Cindershot, Heatwave) and Didact weapons.
  const isForerunnerSpecificName = /^(class-[12] directed energy|destructor beam|focus beam|gravity wrench|halo array|hard light stave|lightblade|focus cannon|forerunner automated turret|forerunner turret|cindershot|backdraft cindershot|heatwave|didact|arcane sentinel beam|dying star)/i.test(title);

  // ── Pass 2: keyword scan of title + description ───────────────────────────
  const combined = (title + ' ' + text).toLowerCase();

  // "monitor" and "installation" removed — too common in English prose, caused
  // Covenant characters (Unggoy/Kig-Yar) to be falsely tagged as Forerunner.
  const isForerunnerKw = isForerunnerHyphenName || isForerunnerRoleName
    || isForerunnerMonitorName || isForerunnerSpecificName
    || /forerunner|promethean|hardlight|hard light|sentinel beam|lithos|composer/.test(combined);

  // Banished: faction keywords, workshop names, and distinctive Banished weapon names.
  const isBanishedKw = /banished|atriox|escharum|[- ]banish|barukaza|barug.qel|eklon.dal|bolroci|dovotaa|kaelum|ahtulai|catulus|ironclad wraith|marauder warchief|\bcrav\b|barbed lance|berserker|fire-wand|loathsome thing|blamex/.test(combined);

  // Covenant: species keywords + structural name patterns.
  // Jiralhanae included — Banished check runs first so Banished-affiliated
  // Jiralhanae still get the correct label.
  const isCovenantKw = isCovenantPatternItem || isSangheiliName
    || /covenant|sangheili|elite|unggoy|grunt|kig-yar|jackal|jiralhanae|brute|huragok|engineer|yanme|drone|lekgolo|hunter|san.shyuum|prophet|methane rebreather|plasma (pistol|rifle|cannon|mortar|launcher|grenade)|assault cannon/.test(combined);

  // UNSC: Spartan name formats, service branch keywords, named UNSC vehicles,
  // M-series prefix, BR battle rifles, CQS shotgun, ARC railgun, AIE machine guns.
  const isUNSCKw = isSpartanName
    || /unsc|spartan|marine|oni|odst|warthog|scorpion|hornet|longsword|mongoose|elephant|pelican|grizzly|jackrabbit|mammoth|falcon|vtol/.test(combined)
    || /^m\d+/i.test(title)      // M392 DMR, M247H, M850 Grizzly, etc.
    || /^br[\dx]+/i.test(title)  // BR55, BR75, BR85, BRXX battle rifles
    || /^cqs\d+/i.test(title)    // CQS48 Bulldog
    || /^arc-\d+/i.test(title)   // ARC-920 railgun
    || /^aie-\d+/i.test(title);  // AIE-207H, AIE-486H machine guns

  // Flood
  const isFloodKw = /gravemind|flood form|infection form|the flood/.test(combined)
    || /^gravemind$/i.test(title);

  // ── Resolve priority (Forerunner > Banished > Covenant > UNSC > Flood) ───
  // Sangheili apostrophe and Covenant patterns beat keyword-Forerunner to
  // prevent Covenant characters from being falsely tagged as Forerunner.
  if (!isSangheiliName && !isCovenantPatternItem && isForerunnerKw) return 'Forerunner';
  if (isBanishedKw) return 'Banished';
  if (isCovenantKw) return 'Covenant';
  if (isUNSCKw) return 'UNSC';
  if (isFloodKw) return 'Flood';
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
  for (const t of LORE_WEAPONS) { seen.add(t); titles.push(t); }
  for (const m of [...unsc, ...covenant, ...forerunner]) {
    if (!seen.has(m.title)) { seen.add(m.title); titles.push(m.title); }
  }
  const summaries = await fetchPageSummariesBatched(titles);
  const result = summaries.map(pageToWeapon);

  const needsImage = result.filter(w => !w.imageUrl).map(w => w.name);
  if (needsImage.length > 0) {
    const fallbacks = await fetchFallbackImages(needsImage);
    for (const w of result) {
      if (!w.imageUrl) w.imageUrl = fallbacks.get(w.name);
    }
  }

  return result;
}

export async function fetchVehicles(limitPerCat = 20): Promise<Vehicle[]> {
  const [unsc, covenant, banished] = await Promise.all([
    fetchCategoryMembers('UNSC_vehicles', limitPerCat).catch(() => []),
    fetchCategoryMembers('Covenant_vehicles', limitPerCat).catch(() => []),
    fetchCategoryMembers('Banished_vehicles', limitPerCat).catch(() => []),
  ]);
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const t of LORE_VEHICLES) { seen.add(t); titles.push(t); }
  for (const m of [...unsc, ...covenant, ...banished]) {
    if (!seen.has(m.title)) { seen.add(m.title); titles.push(m.title); }
  }
  const summaries = await fetchPageSummariesBatched(titles);
  const result = summaries.map(pageToVehicle);

  const needsImage = result.filter(v => !v.imageUrl).map(v => v.name);
  if (needsImage.length > 0) {
    const fallbacks = await fetchFallbackImages(needsImage);
    for (const v of result) {
      if (!v.imageUrl) v.imageUrl = fallbacks.get(v.name);
    }
  }

  return result;
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

  // Always include curated lore characters first
  for (const t of LORE_CHARACTERS) { seen.add(t); allTitles.push(t); }

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

  const result = summaries
    .map(page => ({
      ...pageToCharacter(page),
      species: speciesMap[page.title] ?? inferSpecies(page.title, page.extract ?? ''),
    }))
    .filter(isUsableCharacter);

  const needsImage = result.filter(c => !c.imageUrl).map(c => c.name);
  if (needsImage.length > 0) {
    const fallbacks = await fetchFallbackImages(needsImage);
    for (const c of result) {
      if (!c.imageUrl) c.imageUrl = fallbacks.get(c.name);
    }
  }

  return result;
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
  const categoryPages = await fetchCategoryAsSummaries('Sapient_species', limit);
  const seen = new Set(categoryPages.map(p => p.title));
  const loreOnly = LORE_RACES.filter(t => !seen.has(t));
  const lorePages = loreOnly.length > 0 ? await fetchPageSummariesBatched(loreOnly) : [];
  const pages = [...lorePages, ...categoryPages];
  const result = pages.map(pageToRace);

  const needsImage = result.filter(r => !r.imageUrl).map(r => r.name);
  if (needsImage.length > 0) {
    const fallbacks = await fetchFallbackImages(needsImage);
    for (const r of result) {
      if (!r.imageUrl) r.imageUrl = fallbacks.get(r.name);
    }
  }

  return result;
}

export async function fetchPlanets(limitPerCat = 30): Promise<Planet[]> {
  const [planets, installations] = await Promise.all([
    fetchCategoryMembers('Planets', limitPerCat).catch(() => []),
    fetchCategoryMembers('Forerunner_installations', limitPerCat).catch(() => []),
  ]);

  const seen = new Set<string>();
  const titles: string[] = [];
  for (const t of LORE_PLANETS) { seen.add(t); titles.push(t); }
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
