/**
 * Faction Detection Audit Script
 *
 * Loads all generated image JSON files, deduplicates by title, skips lore/ entries,
 * fetches Halopedia descriptions in batches of 50, applies the current faction
 * detection logic, and outputs an audit report.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Load all JSON files ───────────────────────────────────────────────────────

const SRC = join(process.cwd(), 'src');

function loadJson(filename: string): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(SRC, filename), 'utf8'));
  } catch {
    console.warn(`Warning: could not load ${filename}`);
    return {};
  }
}

const allMaps: Record<string, string>[] = [
  loadJson('generated-images.json'),
  loadJson('generated-weapon-images.json'),
  loadJson('generated-vehicle-images.json'),
  loadJson('generated-character-images.json'),
  loadJson('generated-character2-images.json'),
  loadJson('generated-race-images.json'),
  loadJson('generated-planet-images.json'),
];

// Deduplicate by title (first occurrence wins, since generated-images.json has lore/ curated entries first)
const titleToUrl = new Map<string, string>();
for (const map of allMaps) {
  for (const [title, url] of Object.entries(map)) {
    if (!titleToUrl.has(title)) {
      titleToUrl.set(title, url);
    }
  }
}

// ── Extract type from GCS path ────────────────────────────────────────────────

// Entries under lore/ are curated — skip them
// GCS path format: .../TYPE/slug.jpg
function extractType(url: string): string | null {
  const match = url.match(/\/halowiki-generated-images\/([^/]+)\//);
  if (!match) return null;
  const segment = match[1];
  if (segment === 'lore') return null; // curated, skip
  return segment; // weapon, vehicle, character, race, planet
}

interface Entry {
  title: string;
  type: string;
  url: string;
}

const entries: Entry[] = [];
for (const [title, url] of titleToUrl) {
  const type = extractType(url);
  if (type === null) continue; // skip lore/ entries
  entries.push({ title, type, url });
}

console.log(`\nLoaded ${titleToUrl.size} total entries (deduped).`);
console.log(`Skipping lore/ entries. Processing ${entries.length} non-lore entries.\n`);

// ── Halopedia API fetch ───────────────────────────────────────────────────────

const HALOPEDIA_API = 'https://www.halopedia.org/api.php';

async function fetchDescriptions(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const batches: string[][] = [];
  for (let i = 0; i < titles.length; i += 50) {
    batches.push(titles.slice(i, i + 50));
  }

  let batchNum = 0;
  for (const batch of batches) {
    batchNum++;
    process.stdout.write(`  Fetching batch ${batchNum}/${batches.length} (${batch.length} titles)...\r`);
    try {
      const url = new URL(HALOPEDIA_API);
      url.searchParams.set('format', 'json');
      url.searchParams.set('origin', '*');
      url.searchParams.set('action', 'query');
      url.searchParams.set('titles', batch.join('|'));
      url.searchParams.set('prop', 'extracts');
      url.searchParams.set('exintro', '1');
      url.searchParams.set('explaintext', '1');
      url.searchParams.set('exsentences', '5');

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.warn(`\nBatch ${batchNum} HTTP error: ${res.status}`);
        continue;
      }
      const json = await res.json() as {
        query?: { pages?: Record<string, { title: string; extract?: string; pageid?: number }> }
      };

      const pages = json.query?.pages ?? {};
      for (const page of Object.values(pages)) {
        if (page.pageid && page.pageid > 0) {
          result.set(page.title, page.extract ?? '');
        }
      }

      // Polite delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`\nBatch ${batchNum} fetch error:`, err);
    }
  }
  process.stdout.write('\n');
  return result;
}

// ── Faction detection — mirrors inferFaction() in src/api/halopedia.ts ───────
// Keep in sync with that function so audit results reflect actual app behaviour.

function detectFaction(name: string, desc: string): string {
  const combined = (name + ' ' + desc).toLowerCase();

  // Pass 1: structural name patterns (fire on title alone, no desc needed)
  const isSangheiliName        = /'\s*[A-Z]/.test(name);
  const isForerunnerHyphenName = /^[A-Z][a-z]+(-[A-Za-z]+){2,}$/.test(name);
  const isForerunnerRoleName   = /^(auditor|confirmer|boundless|capital-enforcer|carrier-of-immunity|celebrator-of-birth|chief judicate|catalog triad|bornstellar's (sister|son)|catalog)$/i.test(name);
  const isSpartanName          = /^[A-Za-z]+-[A-Z]\d{2,3}$/.test(name) || /^[A-Za-z]+-\d{3}$/.test(name) || /^SPARTAN-[A-Z0-9]+$/i.test(name);
  const isForerunnerMonitorName= /^\d{2,6}\s+[A-Z][a-z]/.test(name);
  const isCovenantPatternItem  = /-pattern\b/i.test(name);
  const isForerunnerSpecificName = /^(class-[12] directed energy|destructor beam|focus beam|gravity wrench|halo array|hard light stave|lightblade|focus cannon|forerunner automated turret|forerunner turret|cindershot|backdraft cindershot|heatwave|didact|arcane sentinel beam|dying star)/i.test(name);

  // Pass 2: keyword scan
  const isForerunnerKw = isForerunnerHyphenName || isForerunnerRoleName
    || isForerunnerMonitorName || isForerunnerSpecificName
    || /forerunner|promethean|hardlight|hard light|sentinel beam|lithos|composer/.test(combined)
    || /\bphaeton\b|\bretriever sentinel\b|\baggressor sentinel\b/.test(combined);

  const isBanishedKw = /banished|atriox|escharum|[- ]banish|barukaza|barug.qel|eklon.dal|bolroci|dovotaa|kaelum|ahtulai|catulus|ironclad wraith|marauder warchief|\bcrav\b|barbed lance|berserker|fire-wand|loathsome thing|blamex|breacher exosuit|decimus/.test(combined)
    || /\bguntower\b/.test(combined);

  const isCovenantKw = isCovenantPatternItem || isSangheiliName
    || /covenant|sangheili|elite|unggoy|grunt|kig-yar|jackal|jiralhanae|brute|huragok|engineer|yanme|drone|lekgolo|hunter|san.shyuum|prophet|methane rebreather|plasma (pistol|rifle|cannon|mortar|launcher|grenade)|assault cannon|anti-gravity barge|methane wagon|mudoat/.test(combined)
    || /\blich\b|\blocust\b|\bharvester\b|\bseraph\b|\bvampire\b/.test(combined);

  const isCovenantSpeciesKw = /\bunggoy\b|\bkig-yar\b|\byanme'e\b|\bsan'shyuum\b|\bdrone\b|\bgrunt\b|\bjackal\b/.test(combined);

  const isUNSCKw = isSpartanName
    || /unsc|spartan|marine|oni|odst|warthog|scorpion|hornet|longsword|mongoose|elephant|pelican|grizzly|jackrabbit|mammoth|falcon|vtol/.test(combined)
    || /^m\d+/i.test(name)
    || /^br[\dx]+/i.test(name)
    || /^cqs\d+/i.test(name)
    || /^arc-\d+/i.test(name)
    || /^aie-\d+/i.test(name);

  const isFloodKw = /gravemind|flood form|infection form|the flood|flood pure|flood combat/.test(combined)
    || /^gravemind$/i.test(name);

  const isCovenantGuard = isSangheiliName || isCovenantPatternItem || isCovenantSpeciesKw;
  if (!isCovenantGuard && isForerunnerKw) return 'forerunner';
  if (isBanishedKw) return 'banished';
  if (isCovenantKw) return 'covenant';
  if (isUNSCKw) return 'unsc';
  if (isFloodKw) return 'flood';
  return 'none';
}

// ── Lore-based misidentification checker ─────────────────────────────────────
// Uses Halo lore knowledge to flag likely-wrong detections.

interface WrongEntry {
  title: string;
  type: string;
  detected: string;
  lore_faction: string;
  reason: string;
}

// Known Forerunner monitor name patterns (numbered + named)
const FORERUNNER_MONITOR_PATTERN = /^\d[\d\s]*(abject|exuberant|enduring|tragic|despondent|shamed|contrite|abashed|static|ebullient|penitent|guilty|spark|carillon|prism|tangent|bias)/i;
const FORERUNNER_MONITOR_TITLES = new Set([
  '343 Guilty Spark', 'Guilty Spark', '049 Abject Testament', '031 Exuberant Witness',
  '295 Enduring Bias', '000 Tragic Solitude', '117649 Despondent Pyre',
  '001 Shamed Instrument', '007 Contrite Witness', '16807 Abashed Eulogy',
  '859 Static Carillon', '686 Ebullient Prism', '2401 Penitent Tangent',
  'Catalog', 'Auditor', 'Catalog Triad 879',
]);
const FORERUNNER_CHARACTER_NAMES = new Set([
  'The Librarian', 'IsoDidact', 'The IsoDidact', 'The Didact', 'Bornstellar Makes Eternal Lasting',
  'Birth-to-Light', 'Chant-to-Green', 'Dawn-over-Fields', 'Clearance-of-Old-Forests',
  'Carrier-of-Immunity', 'Celebrator-of-Birth', 'Adequate-Observer', 'Capital-Enforcer',
  'Chief Judicate', 'Bitterness-of-the-Vanquished',
]);

// Kig-Yar characters (Covenant)
const KIG_YAR_CHARS = new Set([
  'Chol Von', 'Eith Mor', 'Dhak', 'Gon', 'Hiiq', 'Huz Mor-Kha', 'Isk', 'Bakz',
  'Jec', 'Itka', 'Barroth', 'Dahk\'rah', 'Dahks', 'Cao\'mar',
]);

// Banished-specific vehicles/weapons by name
const BANISHED_VEHICLES = new Set([
  'Barukaza Workshop Chopper', 'Eklon\'Dal Workshop Wasp', 'Bolroci Workshop Spectre',
  'Barug\'qel Workshop Wraith', 'Dovotaa Workshop Ghost', 'Kaelum\'ahtulai Workshop Phantom',
  'N\'weo', 'Crav', 'Breacher Exosuit', 'Bloodfuel Locust', 'Catulus Chopper',
  'Ironclad Wraith', 'Marauder Warchief',
]);
// Banished vehicle name fragments
const BANISHED_VEHICLE_FRAGS = /barukaza|eklon.?dal|bolroci|barug.?qel|dovotaa|kaelum|ahtulai|n'weo|crav|breacher exosuit|bloodfuel locust|catulus|ironclad wraith|marauder warchief/i;

// Forerunner weapons by name
const FORERUNNER_WEAPONS = new Set([
  'Sentinel Beam', 'Suppressor', 'Boltshot', 'Lightrifle', 'Binary Rifle',
  'Incineration Cannon', 'Forerunner turret', 'Gravity wrench', 'Hard light stave',
  'Lightblade', 'Destructor beam', 'Focus beam', 'Halo Array',
  "Didact's Signet", 'Z-180 Close Combat Rifle', 'Z-110 Directed Energy Pistol',
  'Z-250 Directed Energy Engagement Weapon', 'Z-130 Directed Energy Automatic Weapon',
  'Z-390 High-Explosive Munitions Rifle', 'Z-040 Attenuation Field Generator',
  'Z-750 Special Application Sniper Rifle',
]);
const FORERUNNER_WEAPON_FRAGS = /sentinel beam|suppressor|boltshot|lightrifle|binary rifle|incineration cannon|forerunner turret|gravity wrench|hard light stave|lightblade|destructor beam|focus beam|halo array|didact.s signet|directed energy/i;

// Flood-related entries
const FLOOD_FRAGS = /gravemind|flood (pure|combat|carrier|infection|juggernaut)|the flood|flood-controlled|flood biomass/i;

// Unggoy (Grunt) characters — Covenant
const UNGGOY_CHARS = new Set([
  'Cowardly Grunt', 'G-020-055', 'Final Grunt', 'Flipyap', 'Dadab', 'Bapap', 'Flim', 'Fup',
  'Dengo', 'Dimkee Hotay', 'Bibjam', 'Ang\'napnap the Enlightened', 'Gablap', 'Drab Limist',
  'Awlphhum Who Became Tolerable', 'Briglard', 'Bipbap', 'Bingflip', 'Flipflop',
  'Ang\'napnap', 'Awlphhum', 'Bok', 'Jak', 'Dibdib',
]);

function loreFactionCheck(title: string, type: string, detected: string, desc: string): WrongEntry | null {
  const combined = (title + ' ' + desc).toLowerCase();

  // ── Check for Flood entries with no faction detected ──
  if (FLOOD_FRAGS.test(combined) && detected === 'none') {
    return {
      title, type, detected, lore_faction: 'flood',
      reason: 'Matches flood pattern but no faction regex covers Flood faction.',
    };
  }

  // ── Banished vehicles incorrectly detected as Covenant ──
  // Jiralhanae/brute/ghost/wraith keywords trigger Covenant, but the vehicle name
  // may be a Banished workshop variant.
  if (type === 'vehicle' && detected === 'covenant') {
    if (BANISHED_VEHICLE_FRAGS.test(title) || BANISHED_VEHICLES.has(title)) {
      return {
        title, type, detected, lore_faction: 'banished',
        reason: 'Banished workshop vehicle name detected as Covenant due to shared species keywords.',
      };
    }
    // "Chopper" — originally Jiralhanae/Covenant, heavily used by Banished
    if (/chopper/i.test(title) && /banished|atriox|escharum/i.test(desc.toLowerCase())) {
      return {
        title, type, detected, lore_faction: 'banished',
        reason: 'Chopper described in Banished context but triggers Covenant detection from brute/jiralhanae.',
      };
    }
  }

  // ── Banished weapons incorrectly detected as Covenant ──
  if (type === 'weapon' && detected === 'covenant') {
    if (BANISHED_VEHICLE_FRAGS.test(title)) {
      return {
        title, type, detected, lore_faction: 'banished',
        reason: 'Banished weapon name detected as Covenant due to shared species keywords.',
      };
    }
  }

  // ── Forerunner weapons detected as Covenant (e.g. "Sentinel Beam" triggers sentinel→forerunner, but
  //    some Forerunner weapons appear in Covenant descriptions) ──
  if (type === 'weapon' && detected === 'covenant') {
    if (FORERUNNER_WEAPONS.has(title) || FORERUNNER_WEAPON_FRAGS.test(title)) {
      return {
        title, type, detected, lore_faction: 'forerunner',
        reason: 'Known Forerunner weapon detected as Covenant — shared keyword in desc (e.g. hunter/sentinel).',
      };
    }
  }

  // ── Forerunner weapons with no faction detected ──
  if (type === 'weapon' && detected === 'none') {
    if (FORERUNNER_WEAPONS.has(title) || FORERUNNER_WEAPON_FRAGS.test(title)) {
      return {
        title, type, detected, lore_faction: 'forerunner',
        reason: 'Known Forerunner weapon has no faction detected — name lacks Forerunner keywords in combined text.',
      };
    }
  }

  // ── Forerunner monitors detected as something else or none ──
  if (type === 'character') {
    if ((FORERUNNER_MONITOR_TITLES.has(title) || FORERUNNER_MONITOR_PATTERN.test(title) || FORERUNNER_CHARACTER_NAMES.has(title))
        && detected !== 'forerunner') {
      return {
        title, type, detected, lore_faction: 'forerunner',
        reason: 'Known Forerunner monitor or character detected as wrong faction.',
      };
    }

    // Kig-Yar characters detected as non-Covenant
    if (KIG_YAR_CHARS.has(title) && detected !== 'covenant') {
      return {
        title, type, detected, lore_faction: 'covenant',
        reason: 'Known Kig-Yar (Covenant) character not detected as Covenant.',
      };
    }

    // Unggoy characters detected as non-Covenant
    if (UNGGOY_CHARS.has(title) && detected !== 'covenant') {
      return {
        title, type, detected, lore_faction: 'covenant',
        reason: 'Known Unggoy/Grunt (Covenant) character not detected as Covenant.',
      };
    }

    // Sangheili name patterns (names ending in common Sangheili suffixes)
    const sangheiliPattern = /'(chakram|chavamee|dzoni|ayomuu|xulsam|ahcuree|etaree|dalamen|dakaj|crecka|crolunee|taham|mdama|vadum|telkam|nyon|beosah|tokai|refum|yendam)/i;
    if (sangheiliPattern.test(title) && detected !== 'covenant') {
      return {
        title, type, detected, lore_faction: 'covenant',
        reason: 'Known Sangheili name suffix indicates Covenant character, not detected as Covenant.',
      };
    }
  }

  // ── UNSC vehicles detected as Covenant due to warthog/scorpion not in desc ──
  // Already covered by UNSC regex — flag if a clearly UNSC vehicle shows no faction
  if (type === 'vehicle' && detected === 'none') {
    if (/warthog|scorpion|pelican|hornet|falcon|mongoose|mammoth|hawk|hawk|vulture|broadsword|longsword|shortsword|frigat|destroyer|prowler|marathon|paris|strident|infinity|forward unto dawn/i.test(combined)) {
      return {
        title, type, detected, lore_faction: 'unsc',
        reason: 'Clearly UNSC vehicle but no faction detected — UNSC keywords missing from combined text.',
      };
    }
  }

  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const titles = entries.map(e => e.title);
  console.log('Fetching Halopedia descriptions...');
  const descMap = await fetchDescriptions(titles);
  console.log(`Fetched descriptions for ${descMap.size}/${titles.length} entries.\n`);

  // Audit results
  const noFaction: Array<{ title: string; type: string; desc_snippet: string }> = [];
  const likelyWrong: WrongEntry[] = [];

  const summary = { total: 0, forerunner: 0, banished: 0, covenant: 0, unsc: 0, none: 0 };

  for (const entry of entries) {
    const desc = descMap.get(entry.title) ?? '';
    const detected = detectFaction(entry.title, desc);
    summary.total++;
    if (detected === 'forerunner') summary.forerunner++;
    else if (detected === 'banished') summary.banished++;
    else if (detected === 'covenant') summary.covenant++;
    else if (detected === 'unsc') summary.unsc++;
    else summary.none++;

    if (detected === 'none') {
      noFaction.push({
        title: entry.title,
        type: entry.type,
        desc_snippet: desc.slice(0, 200).replace(/\n/g, ' ').trim() || '(no halopedia page found)',
      });
    }

    // Check for likely-wrong detections
    const wrong = loreFactionCheck(entry.title, entry.type, detected, desc);
    if (wrong) {
      likelyWrong.push(wrong);
    }
  }

  // Sort for readability
  noFaction.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
  likelyWrong.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));

  // ── Write JSON output ────────────────────────────────────────────────────────

  const output = { no_faction: noFaction, likely_wrong: likelyWrong, summary };
  const outPath = join(SRC, 'faction-audit.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nAudit results written to ${outPath}\n`);

  // ── Human-readable summary ──────────────────────────────────────────────────

  console.log('═'.repeat(60));
  console.log('  FACTION DETECTION AUDIT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total non-lore entries processed : ${summary.total}`);
  console.log(`  Detected as Forerunner           : ${summary.forerunner}`);
  console.log(`  Detected as Banished             : ${summary.banished}`);
  console.log(`  Detected as Covenant             : ${summary.covenant}`);
  console.log(`  Detected as UNSC                 : ${summary.unsc}`);
  console.log(`  No faction detected (RISKY)      : ${summary.none}`);
  console.log('─'.repeat(60));
  console.log(`  Likely-wrong detections flagged  : ${likelyWrong.length}`);
  console.log('═'.repeat(60));

  // Group no-faction by type
  const byType: Record<string, typeof noFaction> = {};
  for (const e of noFaction) {
    (byType[e.type] ??= []).push(e);
  }

  console.log(`\n──  NO FACTION DETECTED (${noFaction.length} entries)  ──`);
  for (const [type, list] of Object.entries(byType).sort()) {
    console.log(`\n  [${type.toUpperCase()}] — ${list.length} entries`);
    for (const e of list) {
      const snippet = e.desc_snippet.slice(0, 100) || '(no description)';
      console.log(`    • ${e.title}`);
      console.log(`      "${snippet}"`);
    }
  }

  console.log(`\n──  LIKELY-WRONG DETECTIONS (${likelyWrong.length} entries)  ──`);
  for (const e of likelyWrong) {
    console.log(`\n  • [${e.type.toUpperCase()}] ${e.title}`);
    console.log(`    detected=${e.detected}  lore_faction=${e.lore_faction}`);
    console.log(`    reason: ${e.reason}`);
  }

  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
