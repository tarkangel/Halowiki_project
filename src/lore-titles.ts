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
  'Guilty Spark',
  // ── Unggoy ──────────────────────────────────────────────────────────────
  'Dadab',
  'Lighter Than Some',
];

export const LORE_WEAPONS = [
  'Type-1 Energy Sword',
  'Fuel Rod Gun',
  'Concussion Rifle',
  'Focus Rifle',
  'Gravity Hammer',
  'Incineration Cannon',
  'Suppressor',
  'Lightrifle',
  'Boltshot',
  'Plasma Caster',
];

export const LORE_VEHICLES = [
  'Lich',
  'Mantis',
  'Wraith',
  'Phantom',
  'Locust',
  'Harvester',
  'Phaeton',
  'Guntower',
];

export const LORE_RACES = [
  'Lekgolo',
  "Yanme'e",
  'Huragok',
  "San'Shyuum",
  'Precursor',
];

export const LORE_PLANETS = [
  'Harvest',
  'Meridian',
  'Gao',
  'Circumstance',
  'Venezia',
  'Kholo',
  'Site 17',
  'Bhedalon',
  'Anvarl',
  'Concord',
];
