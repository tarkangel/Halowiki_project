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
    redirects: '1',
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
import _weaponImages      from '../generated-weapon-images.json'      assert { type: 'json' };
import _vehicleImages     from '../generated-vehicle-images.json'     assert { type: 'json' };
import _characterImages   from '../generated-character-images.json'   assert { type: 'json' };
import _raceImages        from '../generated-race-images.json'        assert { type: 'json' };
import _planetImages      from '../generated-planet-images.json'      assert { type: 'json' };
import _descriptions      from '../generated-descriptions.json'       assert { type: 'json' };

/** Central description database — populated by scripts/sync-descriptions.ts */
const descriptionDb: Record<string, string> = _descriptions as Record<string, string>;

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

// Titles that must always use the canonical Halopedia thumbnail instead of AI art.
const LORE_CHARACTER_SET = new Set(LORE_CHARACTERS);

function generatedImage(title: string): string | undefined {
  return (generatedImages as Record<string, string>)[title];
}

/** Image URL logic:
 *  - LORE characters → Halopedia thumbnail first (canonical art), AI as fallback
 *  - All others      → AI generated first (consistent style), Halopedia as fallback
 */
function resolveCharacterImage(title: string, thumbnail: string | undefined): string | undefined {
  if (LORE_CHARACTER_SET.has(title)) {
    return thumbnail ?? generatedImage(title);
  }
  return generatedImage(title) ?? thumbnail;
}

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Resolve final description for any entity.
 * Priority: Halopedia extract (if ≥ minLen) → descriptionDb → hardcoded override → raw extract
 */
function resolveDescription(
  title: string,
  extract: string,
  hardcodedOverride?: string,
  minLen = 80,
): string {
  if (extract.trim().length >= minLen) return extract;
  return descriptionDb[title] || hardcodedOverride || extract;
}

export function pageToWeapon(page: PageSummary): Weapon {
  const extract     = page.extract ?? '';
  const description = resolveDescription(page.title, extract);
  return {
    id: slugify(page.title),
    name: page.title,
    description,
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    faction: inferFaction(page.title, description),
    type: inferWeaponType(page.title, description),
    appearances: [],
  };
}

// Curated descriptions for vehicles whose Halopedia extract is too thin (< 200 chars).
const VEHICLE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'Banshee':
    'The Banshee is the Covenant\'s primary atmospheric fighter and ground-support aircraft, deployed across every major engagement of the Human-Covenant War. A single-pilot anti-gravity flier built around a swept-wing hull of violet-purple alloy, it is armed with twin rapid-fire plasma cannons and a ventral fuel rod cannon for heavy strikes. Banshees are fast, agile, and capable of both atmospheric and brief exoatmospheric flight, making them versatile air superiority assets feared by UNSC pilots and ground forces alike.',

  'Wraith':
    'The Wraith is the Covenant\'s principal main battle tank — a heavy, mortar-firing anti-gravity vehicle that anchors Covenant armoured assaults. Its distinctive smooth hull of deep-blue Covenant alloy rides on a repulsor-lift field, giving it remarkable cross-terrain mobility despite its mass. The Wraith fires high-yield superheated plasma in a lobbing mortar arc capable of destroying fortified positions, vehicles, and groups of infantry in a single shot. It is complemented by a pintle-mounted plasma cannon for close defence.',

  'Ghost':
    'The Ghost is the Covenant\'s standard rapid-assault one-man speeder bike — a low-profile anti-gravity vehicle that combines blistering speed with twin rapid-fire plasma cannons. Ridden in a reclined forward posture with the pilot partially enclosed by curved sponsons, Ghosts are deployed as light cavalry for reconnaissance, flanking manoeuvres, and harassment of infantry. Their small profile, high speed, and ability to traverse almost any terrain make them among the most versatile vehicles in the Covenant and Banished arsenal.',

  'Phantom':
    'The Phantom is the Covenant\'s primary troop transport and fire-support dropship, serving the same battlefield role as the UNSC Pelican. Larger and more heavily armed than its predecessor the Spirit, the Phantom features a distinctive ventral gravity lift for troop deployment and three heavy plasma cannon turrets. Its distinctive hull silhouette — a broad, blunt nose with swept wings and a deep fuselage — became one of the most recognisable shapes of the Human-Covenant War. The Phantom\'s heavy armament allows it to provide covering fire during insertions and extractions.',

  'Spirit':
    'The Spirit is an early-model Covenant troop transport dropship characterised by its distinctive tuning-fork silhouette — two parallel troop bays flanking a central engine nacelle. Spirits were the primary Covenant insertion craft during the early Human-Covenant War, deploying infantry via gravity lifts from hovering altitude. Though later supplemented and largely replaced by the more capable Phantom, Spirits remained in active service with Covenant remnant and Banished forces. Their open troop bay design made them vulnerable to UNSC small-arms fire but their speed and lift capacity kept them operationally relevant.',

  'Scarab':
    'The Scarab is the Covenant\'s most fearsome ground combat platform — a massive quadrupedal walker operated by a Lekgolo colony gestalt rather than a conventional crew. Standing over ten metres tall, the Scarab mounts a devastating focus cannon capable of cutting through the armour of UNSC warships at close range, making it an existential threat to any ground position or fortification. Its four articulated legs carry the platform across any terrain, while its elevated firing position provides unobstructed line of sight. Destroying a Scarab requires boarding it directly and eliminating the Lekgolo colonies controlling its systems.',

  'Mantis':
    'The Mantis is a UNSC bipedal combat mech first deployed aboard Halo Installation 03 and seen extensively on Requiem. Operated by a single pilot seated in a central cockpit, the Mantis carries a dual rotary cannon on one arm and a missile pod on the other, giving it formidable anti-infantry and anti-vehicle capabilities. Despite its imposing silhouette it is agile enough to navigate the same terrain as infantry, allowing it to operate as heavy support in environments where conventional vehicles cannot follow. The Mantis represented a significant step forward in UNSC exo-suit combat technology.',

  'Falcon':
    'The Falcon is a UNSC light multi-role helicopter deployed prominently during the Fall of Reach. It serves as a utility aircraft for troop transport, close air support, and reconnaissance, typically operating with two door gunners on open side sponsons providing suppressive fire. The Falcon\'s twin-rotor design gives it stable hovering capability and good payload capacity for its size, making it the backbone of UNSC light aviation during engagements where heavier dropships cannot safely operate. Noble Team relied on Falcons extensively during the defence of Reach in 2552.',

  'Scorpion':
    'The Scorpion is the UNSC\'s primary main battle tank — a heavy tracked vehicle that has served as the backbone of UNSC armoured formations for decades. Armed with a 90mm high-velocity cannon capable of defeating most Covenant vehicles at range and a coaxial machine gun for anti-infantry work, the Scorpion is slow but extraordinarily durable. Its low silhouette and wide tracks give it stability on diverse terrain. During the Human-Covenant War, Scorpions formed the core of UNSC armoured counter-attacks and defensive lines, trading mobility for sheer firepower.',
};

export function pageToVehicle(page: PageSummary): Vehicle {
  const extract     = page.extract ?? '';
  const description = resolveDescription(page.title, extract, VEHICLE_DESCRIPTION_OVERRIDES[page.title], 200);
  return {
    id: slugify(page.title),
    name: page.title,
    description,
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    faction: inferFaction(page.title, description),
    type: inferVehicleType(page.title, description),
    appearances: [],
  };
}

// Curated descriptions for key lore characters whose Halopedia page may return
// empty extracts (e.g. redirect pages) or very thin intro sections.
const CHARACTER_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'John-117':
    'John-117, known as the Master Chief, is the UNSC\'s most decorated Spartan-II supersoldier and humanity\'s greatest warrior. Enhanced at age six under Dr. Catherine Halsey\'s classified Spartan-II program, he has fought on the front lines of the Human-Covenant War since 2525, surviving engagements that killed entire battalions. Bonded with the AI Cortana, he discovered the Halo rings, stopped the Flood, and prevented the firing of the Halo Array — saving all life in the galaxy more than once. He remains active decades later, confronting the Banished and the threat of the Created.',
  'Cortana':
    'Cortana is a UNSC "smart" AI constructed from a flash-cloned copy of Dr. Catherine Halsey\'s own brain, giving her extraordinary intellect, intuition, and emotional depth. Assigned to John-117 aboard the Pillar of Autumn in 2552, she proved instrumental in the discovery and destruction of Installation 04, the defeat of the Flood, and the prevention of the Great Journey. After years stored in the Forerunner installation known as Requiem, she emerged changed — eventually becoming the leader of the Created, a faction of AIs claiming to impose peace on the galaxy by force.',
  "Thel 'Vadam":
    "Thel 'Vadam, the Arbiter, was once one of the Covenant's most celebrated Fleet Masters before being held responsible for the destruction of Installation 04. Disgraced and sentenced to death, he was instead given the ancient and deadly title of Arbiter — a warrior condemned to perform suicidal missions for the Prophets. During the events of the Great Schism he joined forces with the UNSC and Master Chief to stop the firing of the Halo Array, ultimately killing the Prophet of Truth. He went on to lead the Swords of Sanghelios and forge an unprecedented alliance with humanity.",
  'Catherine Halsey':
    'Dr. Catherine Halsey is the brilliant and morally complex scientist who created the Spartan-II program, designing the augmentation procedures and MJOLNIR armour that produced humanity\'s most effective supersoldiers. A polymath who earned multiple doctorates before age twenty, she justified kidnapping children and submitting them to dangerous enhancements as a necessary sacrifice to save humanity from the Covenant. Her relationship with her Spartans — especially John-117 — is deeply maternal yet clinical. She later defected to Jul \'Mdama\'s Covenant remnant before ultimately returning to the UNSC fold.',
  'Avery Johnson':
    "Sergeant Major Avery Johnson was the UNSC Marine Corps' most battle-hardened non-commissioned officer, a veteran of the Insurrection and the entire Human-Covenant War. His seemingly impossible survival of Flood exposure on Installation 04 was later revealed to be connected to a classified ONI experiment that left him partially immune to Flood infection. Johnson fought alongside Master Chief and the Arbiter through the events of Cairo Station, Delta Halo, and finally the Ark, where he was killed by 343 Guilty Spark while attempting to fire Installation 08 and end the Flood threat.",
  'Miranda Keyes':
    "Commander Miranda Keyes was a highly capable UNSC naval officer and the daughter of Captain Jacob Keyes. Following in her father's footsteps, she commanded the UNSC In Amber Clad and led the pursuit of the Covenant to Installation 05, where she recovered the Index and narrowly averted the release of the Flood. Transferred to the Ark during the events of 2552, she was killed by the Prophet of Truth during a daring solo rescue attempt. Her courage and tactical skill under fire made her one of the most respected officers of the Human-Covenant War.",
  'Jacob Keyes':
    "Captain Jacob Keyes was a distinguished UNSC Navy officer whose tactical brilliance earned him the nickname 'Keyes Loop' for an audacious combat manoeuvre. Commanding the Pillar of Autumn, he delivered the Master Chief and Cortana to Installation 04 — setting in motion the events that would save humanity. He was captured by the Covenant and subjected to a Flood Proto-Gravemind before being put out of his misery by Master Chief. His neural implants, extracted posthumously, provided the code to destroy Installation 04. He is the father of Commander Miranda Keyes.",
  'Thomas Lasky':
    'Thomas Lasky is a UNSC officer who rose from a disillusioned cadet at Corbulo Academy to the commanding officer of the UNSC Infinity, humanity\'s most powerful warship. He first encountered the Master Chief during the Promethean attack on Requiem in 2557, forming a bond of mutual respect that defined much of his career. As captain of the Infinity and later a key commander in the fight against the Created, Lasky balanced political pressures from UNSC Command with the pragmatic lessons he learned fighting alongside the Master Chief.',
  'Edward Buck':
    "Edward Buck is a UNSC Orbital Drop Shock Trooper veteran who later became a Spartan-IV. One of the most experienced ODSTs in the Corps, he served throughout the Human-Covenant War and the post-war conflicts, most notably during the defence of New Mombasa and the events on the Ark. After the war he joined Fireteam Osiris under Spartan Locke, applying decades of frontline experience to missions requiring both brute force and finesse. His wit and irreverence mask a deeply capable soldier's instincts.",
  'Escharum':
    "Escharum was the War Chief of the Banished and the supreme commander of their forces during the assault on Installation 07 in 2560. Ancient, disease-ridden, and driven by an almost spiritual hunger for a worthy final battle against the Master Chief, he orchestrated the capture of UNSC forces on the Halo ring and the near-destruction of the UNSC Infinity. A former mentor to the Banished leader Atriox, Escharum commanded absolute loyalty through a combination of tactical genius and the force of his legendary reputation. His campaign was as much a personal crusade as a military operation.",
  'Jorge-052':
    "Jorge-052 was a Spartan-II supersoldier and the heavy weapons specialist of Noble Team during the Fall of Reach in 2552. Of Hungarian origin and the largest member of Noble Team, Jorge possessed an unusually warm and empathetic character beneath his imposing frame — a quality that made him both beloved by civilians and invaluable as the team's moral compass. He sacrificed himself to manually detonate a slipspace bomb aboard a Covenant supercarrier, destroying the vessel but at the cost of his own life, buying Reach's defenders precious hours.",
  'Emile-A239':
    "Emile-A239 was a Spartan-II supersoldier and close-quarters specialist of Noble Team during the Fall of Reach. Known for his skull-etched visor and aggressive demeanour, Emile was the team's most openly violent member — a soldier who had fully embraced the lethal purpose of his augmentation. He held Aszod's mass driver long enough to allow the Pillar of Autumn to launch, and was killed by Elite Rangers at his post. His final act ensured the ship carrying humanity's last hope — the Master Chief and Cortana — escaped the doomed planet.",
  "Jul 'Mdama":
    "Jul 'Mdama was a Sangheili zealot and the founder and leader of a Covenant remnant faction that bore the Covenant's name after the Great Schism. Captured by ONI and imprisoned on Ivanoff Station, he escaped through a Forerunner portal and discovered a means to manipulate Dr. Catherine Halsey into accessing Forerunner artefacts. Styling himself the Hand of the Didact, he commanded a resurgent Covenant force that plagued UNSC operations on and around Requiem. He was killed by Spartan Locke during a UNSC operation on Kamchatka.",
  "Rtas 'Vadum":
    "Rtas 'Vadum, known as Half-Jaw for the mandibles lost in combat with the Flood, was one of the Covenant's most capable fleet commanders and a key ally during the Great Schism. Commanding the Shadow of Intent, he fought alongside the Arbiter and the Master Chief to stop the Flood and prevent the firing of the Halo Array. After Truth's defeat, he chose to glass the Ark's portal on the Covenant side rather than risk the Flood spreading to the greater galaxy — a brutal but decisive tactical choice that saved countless lives.",
  'Serin Osman':
    "Serin Osman is the Director of the Office of Naval Intelligence and one of the most powerful figures in the post-war UNSC. A Spartan-II washout who survived the augmentation procedures but could not complete the program, she was recruited by Admiral Margaret Parangosky and groomed as her successor. Osman operates in the shadows of interstellar politics, running black ops and information campaigns that shape the galaxy's balance of power with little regard for conventional morality. Her history as a failed Spartan gives her a complex relationship with both the program and its survivors.",
  'Margaret Parangosky':
    "Admiral Margaret Parangosky was the longest-serving Director of the Office of Naval Intelligence and arguably the most powerful individual in the UNSC for decades. A master of intelligence, black operations, and political manipulation, she oversaw the Spartan-II program, the development of MJOLNIR armour, and countless classified projects that shaped human history. Ruthless and brilliant, she viewed virtually all actions as acceptable if they preserved humanity's survival — a philosophy she passed on to her chosen successor, Serin Osman.",
  "Usze 'Taham":
    "Usze 'Taham is a Sangheili warrior and member of the Swords of Sanghelios who served as part of the joint Arbiter-UNSC task force during the events following the Great Schism. A calm, methodical fighter with deep experience of both Covenant and post-war Sangheili society, he accompanied the Master Chief and the Arbiter on missions aboard the Ark and participated in the hunt for the Didact's ship. He is known for combining philosophical depth with lethal martial skill.",
  'Kat-B320':
    "Kat-B320 was a Spartan-III and the intelligence and strategy specialist of Noble Team during the Fall of Reach. Missing her right arm below the elbow and having replaced it with a cybernetic prosthetic, Kat was the team's tactical planner and its most analytically minded member. Her ability to process battlefield intelligence and devise rapid counter-strategies made her irreplaceable. She was killed by a Covenant sniper during the evacuation of New Alexandria, a sudden and unceremonious death that underscored the brutal reality of the Reach campaign.",
  'The Librarian':
    "The Librarian was the Forerunner's greatest Lifeshaper — the scientist responsible for cataloguing, preserving, and reseeding every species in the galaxy before the firing of the Halo Array. Wife of the Didact, she disagreed profoundly with his decision to convert humans into Promethean Knights, and chose instead to preserve humanity on Earth, encoding a geas into human DNA designed to guide their evolution toward reclaiming the Mantle of Responsibility. Her sacrifices and manipulations — stretching across a hundred thousand years — shaped every major event of the Halo saga.",
  'Guilty Spark':
    "343 Guilty Spark is a Forerunner Monitor — an AI construct tasked with maintaining Installation 04, the Halo ring in the Epsilon Eridani system. Driven to obsession after a hundred thousand years of isolation, he manipulated the Master Chief and the UNSC into helping him contain a Flood outbreak, treating them as Reclaimers destined to activate his ring. When the Master Chief refused to fire Installation 04 and chose to destroy it instead, Guilty Spark became increasingly erratic. He later turned violently against his allies before being destroyed — only to resurface in altered form.",
  'Dadab':
    "Dadab was a Unggoy (Grunt) Deacon — a rare religious specialist rank within the Covenant — serving aboard the Minor Transgression during the early days of Covenant contact with humanity. Unusually thoughtful for his species, Dadab formed a genuine friendship with the Huragok (Engineer) Lighter Than Some, and was caught in the early political machinations that would eventually erupt into open war. His story, told in the novel Halo: Contact Harvest, offers a rare perspective on the Covenant from its lower ranks.",
  'Lighter Than Some':
    "Lighter Than Some was a Huragok (Engineer) — one of the gas-filled, tentacled beings created by the Forerunners to maintain and repair their technology — who served aboard the Covenant vessel Minor Transgression during first contact with humanity. Intellectually curious and emotionally sensitive, he formed an unlikely bond with the Unggoy Deacon Dadab. His story, told in Halo: Contact Harvest, illustrates the Huragok's tragic position as creatures of pure knowledge and creativity conscripted into a military empire that valued them only as tools.",
};

export function pageToCharacter(page: PageSummary): Character {
  const extract     = page.extract ?? '';
  const description = resolveDescription(page.title, extract, CHARACTER_DESCRIPTION_OVERRIDES[page.title]);
  return {
    id: slugify(page.title),
    name: page.title,
    description,
    imageUrl: resolveCharacterImage(page.title, page.thumbnail?.source),
    species: inferSpecies(page.title, description),
    affiliation: inferFaction(page.title, description),
    appearances: [],
  };
}

// Curated descriptions for species whose Halopedia extract is too thin (< 200 chars).
const RACE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'Flood':
    'The Flood is an ancient parasitic species of interstellar scourge, capable of infecting and assimilating any sentient biomass with sufficient neural complexity. Originally created by the Precursors as an instrument of vengeance against the Forerunners, the Flood nearly consumed all life in the galaxy before the activation of the Halo Array halted its spread. The Flood is coordinated by a composite intelligence known as the Gravemind, which accumulates the memories and knowledge of every organism it absorbs.',

  'Forerunner':
    'The Forerunners were an ancient and extraordinarily advanced humanoid species who built a galaxy-spanning civilisation over the course of millions of years. Masters of technological manipulation at the subatomic level, they constructed the Halo Array, Shield Worlds, and the Ark — megastructures of unparalleled scale. At their height the Forerunner ecumene spanned hundreds of thousands of star systems. They were ultimately consumed by the war against the Flood, and in a final act of desperation fired the Halo Array, sacrificing themselves to starve the parasite and allow life to begin again.',

  'Human':
    'Humanity is a resilient spacefaring species native to Earth, organised under the Unified Earth Government and its military arm the United Nations Space Command. By the 26th century humans had colonised hundreds of worlds across the Orion Arm. The Human-Covenant War nearly drove the species to extinction before a fragile alliance with the Elites turned the tide. Humanity has since been revealed to carry a unique genetic legacy from the ancient Forerunner civilisation, whose Librarian encoded evolutionary potential into the human genome before the firing of the Halo Array.',

  'Mgalekgolo':
    'The Mgalekgolo, known to humans as Hunters, are a paired combat form of the Lekgolo colonial worm organism. Two colonies of Lekgolo bond together into a single symbiotic warrior unit, encased in a thick plate of interlocked orange-brown armour and wielding a devastating fuel rod assault cannon or melee arm. Hunters are among the most physically powerful infantry units in Covenant and Banished forces, their bonded-pair psychology making them extraordinarily motivated — if one is killed the survivor will fight with berserker ferocity until it is destroyed or joins a new colony.',

  'Florian':
    'The Florians, also called Robustus or the Rubble-people, are a diminutive subspecies of ancient humanity who coexisted with anatomically modern humans before the Forerunner-Human War. Small in stature, Florians were child-sized beings who lived in close proximity to larger human populations. The Forerunners devolved them along with all of humanity as collective punishment after the ancient human empire was defeated. One Florian individual, known as Chakas or Prone to Drift, became entangled in the events surrounding Installation 07 and the Didact.',

  'Denisovan':
    'The Denisovans are an ancient hominin subspecies known in the Halo universe as one of the forerunner-era human variants that existed before the Forerunner-imposed devolution of humanity. Related to but distinct from anatomically modern Homo sapiens, Denisovans coexisted with other human populations across prehistoric Earth and represent part of the genetic diversity that the Librarian sought to preserve and catalogue in her extensive life surveys.',

  "K'tamanune":
    "The K'tamanune are a form adopted by Lekgolo colonial worm organisms when multiple colonies merge into a large mobile mass for locomotion and exploration rather than combat. Unlike the armoured Mgalekgolo Hunter form, K'tamanune colonies flow together into a fluid orange mass capable of moving through tight spaces and environments inaccessible to bulkier combat forms. They represent the Lekgolo's remarkable adaptive biology — the same colonial organism can take radically different configurations depending on the number of worms and the role they need to fulfil.",

  "B'ashamanune":
    "The B'ashamanune is a resting or dormant configuration of the Lekgolo colonial worm organism, in which the colony disperses into a flat distributed mass to conserve energy and process information. Lekgolo worms in this state form a low-profile orange mat that can remain motionless for extended periods, sharing neural information across the colony before reconsolidating into an active form. The B'ashamanune state represents one of several configurations the extraordinarily adaptable Lekgolo can adopt.",

  'Dipholekgolo':
    'The Dipholekgolo are a two-colony Lekgolo configuration in which a pair of colonial worm masses bond together for mutual support and enhanced cognition. This pairing is an intermediate form between a single loose colony and the fully armoured Mgalekgolo Hunter configuration. Dipholekgolo retain greater flexibility than armoured Hunters while still benefiting from the enhanced processing power and emotional bonding that Lekgolo experience when multiple colonies are in close contact.',

  'Khantolekgolo':
    'The Khantolekgolo are a Lekgolo colonial configuration specifically adapted for integration with large Covenant vehicles and weapons platforms. Multiple Lekgolo colonies merge to form the control nervous system of Scarab walkers, Locust units, and other large Covenant war machines, with the colony acting as the vehicle\'s living brain and motivation system. This biological-mechanical integration makes Covenant super-heavy vehicles semi-autonomous and capable of sophisticated battlefield decisions.',

  'Gasgira':
    'The Gasgira are a species of alien organisms encountered in the Halo universe, notable for their unusual biology and the role they play in the broader ecosystem of the worlds they inhabit. As with many non-sapient species catalogued by Forerunner Lifeworkers during the Conservation Measure, the Gasgira represent the extraordinary biological diversity seeded and preserved across the galaxy by the Forerunner civilisation before the firing of the Halo Array.',

  'Lacerta erectus':
    'Lacerta erectus is an ancient reptilian species catalogued in the Halo universe, representing one of the many non-human sapient or near-sapient species that inhabited the galaxy during earlier epochs. The Forerunners\' extensive biological survey programme, led by the Librarian, documented and preserved many such species before the firing of the Halo Array, ensuring that the galaxy\'s biodiversity could be restored in the aftermath of the Flood war.',

  'Dazreme':
    'The Dazreme are an alien species encountered in the Halo universe, part of the broader array of non-human life forms that populated the galaxy alongside humanity and the Covenant species. Like many species peripheral to the main Covenant conflict, the Dazreme\'s biology and culture were documented as part of the scientific record maintained by UNSC and Covenant xenobiological archives.',

  'Netherop species':
    'The Netherop species is a fierce predatory alien race native to the harsh desert world of Netherop. Encountered by UNSC forces during covert operations on Netherop, these creatures are apex predators adapted to the brutal environment of their homeworld — fast, aggressive, and capable of overwhelming even armoured UNSC marines. They are referenced in the events of the novel Halo: The Rubicon Protocol as a dangerous complication for stranded UNSC survivors fighting to escape the planet.',
};

export function pageToRace(page: PageSummary): Race {
  const extract     = page.extract ?? '';
  const description = resolveDescription(page.title, extract, RACE_DESCRIPTION_OVERRIDES[page.title], 200);
  return {
    id: slugify(page.title),
    name: page.title,
    description,
    imageUrl: generatedImage(page.title) ?? page.thumbnail?.source,
    affiliation: inferFaction(page.title, description),
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

  'Harvest':
    'Harvest, also known as Epsilon Indi IV, was humanity\'s most remote Outer Colony and the first human world to be discovered and destroyed by the Covenant. Founded in 2468 as an agricultural "breadbasket" colony in the Epsilon Indi system, Harvest was a peaceful and prosperous world of rolling farmland and scattered cities. In 2525, a Covenant fleet made first contact in orbit and, deeming the planet sacred ground due to Forerunner artifacts, launched an orbital bombardment that glassed the surface. The battle for Harvest — and Sergeant Avery Johnson\'s role in it — marked the true beginning of the Human-Covenant War.',

  'Reach':
    'Reach, also known as Epsilon Eridani II, was humanity\'s most important military colony and the headquarters of the UNSC Armed Forces. Just 10.5 light-years from Earth, Reach was a heavily fortified Inner Colony world hosting SPARTAN training facilities, vast shipyards, and major fleet anchorages. In August 2552 the Covenant launched a massive invasion that overwhelmed Reach\'s formidable defences. The Fall of Reach — humanity\'s greatest military defeat — cost the lives of most of the SPARTAN-IIs and millions of civilians, and nearly opened a direct path to Earth.',

  'Circumstance':
    'Circumstance is a human Outer Colony world in UNSC space, notable for its role in the turbulent political climate of the early 26th century. The planet\'s colonial government navigated the difficult balance between loyalty to the Unified Earth Government and the growing insurrectionist sentiment that was fracturing the outer colonies in the decades before the Covenant War. Circumstance became caught up in the escalating conflict between the UNSC Office of Naval Intelligence and rebel factions, its citizens drawn into a war that was as much political as military.',

  'Concord':
    'Concord is a human colony world in UNSC space that endured significant hardship during the Human-Covenant War. The planet\'s settlements and infrastructure bore the scars of Covenant raids and orbital engagements as the war pushed ever closer to the Inner Colonies. In the post-war era Concord became a focal point for reconstruction efforts, its surviving population working to rebuild civic life amid the fragile peace between humanity and the former Covenant species.',

  'Kholo':
    'Kholo is a human Outer Colony world that was glassed by the Covenant during the Human-Covenant War, its surface rendered uninhabitable by sustained plasma bombardment. Before its destruction, Kholo was a inhabited colony with a sizeable civilian population. The planet\'s fall was one of the countless tragedies of the Covenant\'s systematic extermination campaign against humanity\'s outer colonies, each glassing eliminating worlds, populations, and centuries of human settlement in a matter of hours.',

  'Bhedalon':
    'Bhedalon is a world of significance within Covenant and former Covenant space, positioned in a region shaped by the complex politics of the post-war era. Following the collapse of the Covenant in 2552, Bhedalon\'s strategic location made it a contested prize for the various successor factions — Covenant remnants, the Swords of Sanghelios, and Banished warlords — all seeking to consolidate power over former Covenant territory. UNSC intelligence flagged the planet as a flashpoint in the years of political instability that followed the end of the Human-Covenant War.',
};

export function pageToPlanet(page: PageSummary): Planet {
  const extract     = page.extract ?? '';
  const description = resolveDescription(page.title, extract, PLANET_DESCRIPTION_OVERRIDES[page.title], 200);
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

  // Banished: faction keywords, workshop names, distinctive weapon/vehicle names.
  const isBanishedKw = /banished|atriox|escharum|[- ]banish|barukaza|barug.qel|eklon.dal|bolroci|dovotaa|kaelum|ahtulai|catulus|ironclad wraith|marauder warchief|\bcrav\b|barbed lance|berserker|fire-wand|loathsome thing|blamex|breacher exosuit|decimus/.test(combined);

  // Covenant: species keywords + structural name patterns.
  // Jiralhanae included — Banished check runs first so Banished-affiliated
  // Jiralhanae still get the correct label.
  const isCovenantKw = isCovenantPatternItem || isSangheiliName
    || /covenant|sangheili|elite|unggoy|grunt|kig-yar|jackal|jiralhanae|brute|huragok|engineer|yanme|drone|lekgolo|hunter|san.shyuum|prophet|methane rebreather|plasma (pistol|rifle|cannon|mortar|launcher|grenade)|assault cannon|anti-gravity barge|methane wagon|mudoat/.test(combined);

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

  // Sort so LORE_CHARACTERS always appear first regardless of API return order.
  const loreOrder = new Map(LORE_CHARACTERS.map((t, i) => [t, i]));
  summaries.sort((a, b) => {
    const ai = loreOrder.get(a.title) ?? Infinity;
    const bi = loreOrder.get(b.title) ?? Infinity;
    return ai - bi;
  });

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
  // Always keep hand-curated lore characters regardless of description length
  if (LORE_CHARACTER_SET.has(c.name)) return true;
  // Must have a meaningful description
  if (!c.description || c.description.trim().length < 80) return false;
  const name = c.name.trim();
  // Too short to be a real name
  if (name.length < 3) return false;
  // Pure radio callsigns: "4 Charlie 27", "2 Lima 4", "'D'", "'S'"
  const callsign = /^[\d\s'"`]+$|^\d[\w\s'-]{0,12}\d$|^'[A-Z]'$/;
  if (callsign.test(name)) return false;
  // Pure SPARTAN designations with no given name (SPARTAN-B170, SPARTAN-G059)
  // Keep names like "Carter-A259" or "Jun-A266" (real name + tag)
  if (/^SPARTAN-[A-Z0-9]+$/i.test(name)) return false;
  // Serial number patterns: "00476-97392-BB", "B-021-331", "07162-00133-DC"
  if (/^\d{4,}-\d+-[A-Z]{1,3}$/.test(name)) return false;
  if (/^[A-Z]-\d{3}-\d{3}$/.test(name)) return false;
  // ONI/AI serial codes: "48452-556-EPN644", "J-011-422"
  if (/^[A-Z0-9]+-\d{3}-[A-Z0-9]+$/.test(name)) return false;
  // Pure uppercase acronyms 2-4 chars with no spaces (e.g. "HXA", "UNK")
  if (/^[A-Z]{2,4}$/.test(name)) return false;
  // Adjunct/Field designation strings: "Adjunct Field Officer 311-112b"
  if (/\d{3,}-\d{2,}[a-z]?$/.test(name)) return false;
  return true;
}

/** Fetch only the curated LORE_CHARACTERS — fast path used for immediate display. */
export async function fetchLoreCharacters(): Promise<Character[]> {
  const summaries = await fetchPageSummariesBatched([...LORE_CHARACTERS]);
  const loreOrder = new Map(LORE_CHARACTERS.map((t, i) => [t, i]));
  summaries.sort((a, b) => (loreOrder.get(a.title) ?? 99) - (loreOrder.get(b.title) ?? 99));
  return summaries
    .map(page => ({
      ...pageToCharacter(page),
      species: inferSpecies(page.title, page.extract ?? ''),
    }))
    .filter(c => !!c.description && c.description.trim().length >= 50);
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
