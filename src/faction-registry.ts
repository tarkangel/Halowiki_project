/**
 * Static faction registry — low-cost catalog mapping each major Halo faction
 * to the characters, weapons, vehicles, races, and planets associated with it.
 *
 * These are reference names (Halopedia article titles) that the app already
 * fetches; this file just provides the cross-category grouping for the
 * Factions page without any additional API calls.
 */

export interface FactionEntry {
  id: string;
  name: string;
  tag: string;
  color: string;
  description: string;
  characters: string[];
  weapons: string[];
  vehicles: string[];
  races: string[];
  planets: string[];
}

export const FACTIONS: FactionEntry[] = [
  {
    id: 'unsc',
    name: 'UNSC',
    tag: 'UNSC',
    color: '#4895EF',
    description:
      'The United Nations Space Command is humanity\'s military, exploratory, and scientific agency. Founded in the 22nd century to combat the Insurrection, the UNSC bore the full weight of the Human-Covenant War, fielding Spartan supersoldiers, powerful warships, and improvised ingenuity against an overwhelmingly superior enemy. Post-war, it remains humanity\'s primary defence against Covenant remnants, the Banished, and the Forerunner AI threat of the Created.',
    characters: [
      'John-117', 'Cortana', 'Catherine Halsey', 'Avery Johnson', 'Miranda Keyes',
      'Jacob Keyes', 'Thomas Lasky', 'Edward Buck', 'Serin Osman', 'Margaret Parangosky',
      'Kat-B320', 'Jorge-052', 'Emile-A239',
    ],
    weapons: [
      'MA5 Assault Rifle', 'M6D Pistol', 'M90 Shotgun', 'SRS99 Sniper Rifle',
      'M41 Rocket Launcher', 'M6 Spartan Laser', 'BR55 Battle Rifle',
      'M395 DMR', 'M7 SMG', 'M319 Grenade Launcher',
    ],
    vehicles: [
      'M12 Warthog', 'Scorpion', 'Pelican', 'Falcon', 'Mantis',
      'M274 Mongoose', 'Elephant', 'ODST Drop Pod', 'Shortsword', 'Longsword',
    ],
    races: ['Human'],
    planets: ['Earth', 'Reach', 'Harvest', 'Meridian', 'Circumstance', 'Concord', 'Venezia', 'Gao'],
  },
  {
    id: 'covenant',
    name: 'Covenant',
    tag: 'COV',
    color: '#C77DFF',
    description:
      'The Covenant was a theocratic hegemony of alien species united under the religious belief that activating the Forerunner Halo rings — the so-called "Sacred Rings" — would trigger the Great Journey and elevate them to godhood. For nearly thirty years their fleets prosecuted a genocidal war against humanity before the Great Schism tore them apart from within. Covenant remnant factions and splinter groups continue to operate long after the empire\'s collapse in 2552.',
    characters: [
      "Thel 'Vadam", "Rtas 'Vadum", "Usze 'Taham", "Jul 'Mdama",
      'Dadab', 'Lighter Than Some',
    ],
    weapons: [
      'Type-1 Energy Sword', 'Fuel Rod Gun', 'Concussion Rifle', 'Focus Rifle',
      'Plasma Pistol', 'Plasma Rifle', 'Needler', 'Carbine', 'Plasma Caster',
      'Gravity Hammer', 'Fuel Rod Cannon',
    ],
    vehicles: [
      'Banshee', 'Ghost', 'Wraith', 'Phantom', 'Spirit', 'Scarab',
      'Lich', 'Locust', 'Harvester', 'Seraph', 'Vampire',
    ],
    races: ["Sangheili", "San'Shyuum", 'Unggoy', 'Kig-Yar', 'Jiralhanae', 'Lekgolo', "Yanme'e", 'Huragok', 'Mgalekgolo'],
    planets: ['Sanghelios', 'High Charity', 'Doisac', 'Balaho', 'Te', 'Eayn', 'Kholo', 'Bhedalon'],
  },
  {
    id: 'forerunner',
    name: 'Forerunner',
    tag: 'FRN',
    color: '#FFD60A',
    description:
      'The Forerunners were an ancient and immensely advanced humanoid civilisation that ruled a galaxy-spanning empire for millions of years. Creators of the Halo Array, the Ark, Shield Worlds, and the Monitors that maintain them, they sacrificed themselves to stop the Flood — firing their weapons and perishing to save all remaining life in the galaxy. Their technology, artefacts, and installations continue to shape galactic events a hundred thousand years after their extinction.',
    characters: ['The Librarian', 'Guilty Spark', 'The Didact'],
    weapons: [
      'Incineration Cannon', 'Suppressor', 'Lightrifle', 'Boltshot',
      'Binary Rifle', 'Railgun', 'Z-110 Boltshot', 'Scattershot', 'Forerunner Sentinel Beam',
    ],
    vehicles: ['Phaeton', 'Forerunner Sentinel', 'Retriever Sentinel', 'Aggressor Sentinel'],
    races: ['Forerunner', 'Precursor'],
    planets: [
      'Installation 04', 'Installation 05', 'Installation 07', 'Installation 03',
      'The Ark', 'Requiem', 'Trevelyan', 'Ghibalb', 'Faun Hakkor',
    ],
  },
  {
    id: 'banished',
    name: 'Banished',
    tag: 'BNS',
    color: '#FF3366',
    description:
      'The Banished are a mercenary coalition founded by the Jiralhanae warlord Atriox after he broke free of the Covenant — refusing to die in a war fought for a lie. Unlike the Covenant\'s rigid theocracy, the Banished operate as a ruthless but pragmatic military force, accepting members of any species willing to fight and offering payment rather than promises of godhood. They are one of the most dangerous military powers in the post-Covenant War galaxy, and the primary antagonist force of Halo Wars 2 and Halo Infinite.',
    characters: ['Escharum'],
    weapons: [
      'Plasma Pistol', 'Mangler', 'Needler', 'Plasma Caster',
      'Fuel Rod Gun', 'Gravity Hammer', 'Banished Plasma Rifle', 'Disruptor',
    ],
    vehicles: [
      'Banshee', 'Ghost', 'Wraith', 'Phantom', 'Scarab', 'Guntower',
      'Marauder', 'Goliath', 'Brute Chopper', 'Revenent',
    ],
    races: ['Jiralhanae', 'Sangheili', 'Unggoy', 'Kig-Yar', 'Lekgolo'],
    planets: ['Installation 07', 'Reach', 'Harvest', 'Anvarl', 'Bhedalon'],
  },
  {
    id: 'flood',
    name: 'Flood',
    tag: 'FLD',
    color: '#00FF9F',
    description:
      'The Flood is an ancient parasitic species that can infect and assimilate any organism with sufficient neural complexity, transforming it into a combat form that serves the collective intelligence of the Gravemind. Originally created by the Precursors as revenge against the Forerunners, the Flood consumed most of the galaxy before the Halo Array was fired to starve it. Small outbreaks survived in Forerunner installations and were encountered by the UNSC and Covenant during the Human-Covenant War, nearly spreading beyond containment multiple times.',
    characters: ['Guilty Spark', 'Dadab', 'Lighter Than Some'],
    weapons: ['Flood Infection Form', 'Flood Combat Form', 'Gravemind Tentacle'],
    vehicles: ['Flood Juggernaut', 'Pure Form', 'Flood Proto-Gravemind'],
    races: ['Flood', 'Precursor'],
    planets: [
      'Installation 04', 'Installation 05', 'The Ark', 'High Charity', 'Kholo',
    ],
  },
  {
    id: 'swords',
    name: 'Swords of Sanghelios',
    tag: 'SOS',
    color: '#00B4D8',
    description:
      'The Swords of Sanghelios is the Sangheili faction led by Arbiter Thel \'Vadam following the Great Schism and the collapse of the Covenant. Rejecting the religious doctrine of the Prophets, the Swords embrace a new path of military honour, political sovereignty, and alliance with humanity through the UNSC. They serve as a major UNSC partner against both Covenant remnant factions and the Banished, while working to restore stability to Sangheili society after centuries of theocratic rule.',
    characters: ["Thel 'Vadam", "Rtas 'Vadum", "Usze 'Taham"],
    weapons: ['Type-1 Energy Sword', 'Carbine', 'Plasma Rifle', 'Plasma Pistol'],
    vehicles: ['Banshee', 'Ghost', 'Phantom', 'Seraph'],
    races: ['Sangheili'],
    planets: ['Sanghelios', 'Kamchatka', 'Kholo'],
  },
];

/** Quick lookup map: faction id → FactionEntry */
export const FACTION_MAP = new Map(FACTIONS.map(f => [f.id, f]));
