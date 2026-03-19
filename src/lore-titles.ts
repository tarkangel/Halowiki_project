/**
 * Curated lore entity titles guaranteed to be fetched and shown on the wiki,
 * even if they fall outside the category pagination limit.
 *
 * Shared between src/api/halopedia.ts (runtime fetch) and
 * scripts/generate-missing-images.ts (image generation).
 */

export const LORE_CHARACTERS = [
  // ── Iconic protagonists & deuteragonists ─────────────────────────────────
  'John-117',           // Master Chief — confirmed Halopedia image
  "Thel 'Vadam",        // The Arbiter — confirmed Halopedia image
  'Cortana',            // UNSC AI — confirmed Halopedia image
  'Catherine Halsey',   // Creator of the Spartans — confirmed Halopedia image
  // ── UNSC officers & allies ──────────────────────────────────────────────
  'Avery Johnson',
  'Miranda Keyes',
  'Jacob Keyes',        // Captain Keyes, CE — confirmed Halopedia image
  'Thomas Lasky',       // Halo 4/5 Commander — confirmed Halopedia image
  'Edward Buck',        // ODST → Spartan-IV — confirmed Halopedia image
  'Serin Osman',
  'Margaret Parangosky',
  // ── Covenant / Swords of Sanghelios ─────────────────────────────────────
  "Jul 'Mdama",
  "Rtas 'Vadum",
  "Usze 'Taham",
  // ── Banished ────────────────────────────────────────────────────────────
  'Escharum',           // Halo Infinite main antagonist — confirmed Halopedia image
  // ── Reach Spartan-IIIs ──────────────────────────────────────────────────
  'Kat-B320',
  'Jorge-052',
  'Emile-A239',
  // ── Forerunner / AI ─────────────────────────────────────────────────────
  'The Librarian',
  '343 Guilty Spark',         // Monitor of Installation 04
  '2401 Penitent Tangent',    // Monitor of Installation 05 — Halo 2
  '031 Exuberant Witness',    // Monitor of Genesis — Halo 5
  // ── Unggoy ──────────────────────────────────────────────────────────────
  'Dadab',
  'Lighter Than Some',
];

export const LORE_WEAPONS = [
  // ── UNSC rifles & sidearms ────────────────────────────────────────────────
  'MA5B assault rifle',         // Halo CE iconic assault rifle
  'MA5C assault rifle',         // Halo 2/3 assault rifle
  'BR55 battle rifle',          // Halo 2/3 precision battle rifle
  'SRS99-S5 AM sniper rifle',   // UNSC long-range anti-materiel rifle
  'M6D magnum',                 // Halo CE iconic sidearm
  'M90 shotgun',                // CE/2 close-assault shotgun
  'M41 SPNKr',                  // Classic UNSC rocket launcher
  'CQS48 Bulldog',              // Halo Infinite shotgun
  // ── Covenant ─────────────────────────────────────────────────────────────
  'Type-1 Energy Sword',
  'Needler',                    // Iconic homing crystal sidearm
  'Plasma Pistol',              // Standard Covenant sidearm
  'Plasma Rifle',               // Standard Covenant automatic rifle
  'Carbine',                    // Covenant precision semi-auto (Type-51)
  'Fuel Rod Gun',
  'Gravity Hammer',
  'Concussion Rifle',
  'Focus Rifle',
  'Plasma Caster',
  // ── Forerunner ───────────────────────────────────────────────────────────
  'Incineration Cannon',
  'Suppressor',
  'Lightrifle',
  'Boltshot',
  'Cindershot',                 // Halo Infinite bouncing grenade launcher
  'Heatwave',                   // Halo Infinite dual-mode shotgun
  // ── Banished ─────────────────────────────────────────────────────────────
  'Ravager',                    // Banished plasma area-denial launcher
  'Mangler',                    // Banished high-calibre revolver pistol
  'Skewer',                     // Banished anti-vehicle spike launcher
];

export const LORE_VEHICLES = [
  // ── UNSC ─────────────────────────────────────────────────────────────────
  'Warthog',
  'Scorpion',
  'Pelican',
  'Falcon',
  'Mongoose',
  'Elephant',
  'Mantis',
  // ── Covenant ─────────────────────────────────────────────────────────────
  'Banshee',
  'Ghost',
  'Wraith',
  'Phantom',
  'Spirit',
  'Scarab',
  'Lich',
  'Locust',
  'Harvester',
  // ── Banished ─────────────────────────────────────────────────────────────
  'Chopper',
  // ── Forerunner ───────────────────────────────────────────────────────────
  'Phaeton',
  'Guntower',
];

export const LORE_RACES = [
  // ── Covenant / Banished species ───────────────────────────────────────────
  'Sangheili',          // Elites — Covenant military backbone
  'Jiralhanae',         // Brutes — primate warriors
  'Unggoy',             // Grunts — methane-breathing infantry
  'Kig-Yar',            // Jackals — mercenary privateers
  'Lekgolo',            // colonial worm organisms
  'Mgalekgolo',         // Hunter bonded-pair combat form
  "Yanme'e",            // Drones — insectoid aerial infantry
  'Huragok',            // Engineers — Forerunner maintenance AI
  "San'Shyuum",         // Prophets — Covenant leadership caste
  // ── Human ─────────────────────────────────────────────────────────────────
  'Human',
  // ── Ancient / Parasitic ───────────────────────────────────────────────────
  'Forerunner',
  'Precursor',
  'Flood',
];

export const LORE_GAMES = [
  'Halo: Combat Evolved',
  'Halo 2',
  'Halo 3',
  'Halo Wars',
  'Halo 3: ODST',
  'Halo: Reach',
  'Halo: Combat Evolved Anniversary',
  'Halo 4',
  'Halo: Spartan Assault',
  'Halo: The Master Chief Collection',
  'Halo: Spartan Strike',
  'Halo 5: Guardians',
  'Halo Wars 2',
  'Halo Infinite',
];

export const LORE_PLANETS = [
  // ── Iconic UNSC / human worlds ────────────────────────────────────────────
  'Reach',
  'Earth',
  'Harvest',
  'Meridian',
  'Gao',
  'Circumstance',
  'Venezia',
  'Kholo',
  'Concord',
  // ── Covenant / alien worlds ───────────────────────────────────────────────
  'Sanghelios',
  'High Charity',
  // ── Forerunner installations ──────────────────────────────────────────────
  'Installation 04',
  'Installation 05',
  'Installation 07',
  'The Ark',
  // ── Other notable worlds ──────────────────────────────────────────────────
  'Bhedalon',
  'Anvarl',
];
