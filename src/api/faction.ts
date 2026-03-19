/**
 * Faction inference logic — pure TypeScript, no browser/Vite deps.
 * Extracted here so it can be unit-tested in isolation from the API client.
 */

// ── Hardcoded overrides ───────────────────────────────────────────────────────
// Characters whose faction is unambiguous regardless of description content.
// Descriptions may mention enemy factions (e.g. "fought the Banished") which
// would otherwise trigger a wrong classification.
export const FACTION_OVERRIDES: Record<string, string> = {
  // ── UNSC weapons — MA5x names don't match /^m\d+/i (letter after M) ──────
  'MA5B assault rifle':         'UNSC',
  'MA5C assault rifle':         'UNSC',
  'MA5D assault rifle':         'UNSC',
  'SRS99-S5 AM sniper rifle':   'UNSC',
  // ── Covenant weapons ──────────────────────────────────────────────────────
  'Needler':                    'Covenant',
  'Carbine':                    'Covenant',
  'Plasma Pistol':              'Covenant',
  'Plasma Rifle':               'Covenant',
  // ── Banished weapons ──────────────────────────────────────────────────────
  'Ravager':                    'Banished',
  'Mangler':                    'Banished',
  'Skewer':                     'Banished',
  // ── Forerunner weapons ────────────────────────────────────────────────────
  'Cindershot':                 'Forerunner',
  'Heatwave':                   'Forerunner',
  // ── UNSC characters ───────────────────────────────────────────────────────
  'John-117':         'UNSC',
  'Cortana':          'UNSC',
  'Avery Johnson':    'UNSC',
  'Miranda Keyes':    'UNSC',
  'Jacob Keyes':      'UNSC',
  'Jorge-052':        'UNSC',
  'Kat-320':          'UNSC',
  'Emile-A239':       'UNSC',
  'Jun-A266':         'UNSC',
  'Carter-A259':      'UNSC',
  'Noble Six':        'UNSC',
  'Catherine Halsey': 'UNSC',
  'Roland':           'UNSC',
  // ── UNSC vehicles — descriptions mention "Covenant" in battle context ─────
  'Warthog':   'UNSC',
  'Scorpion':  'UNSC',
  'Pelican':   'UNSC',
  'Falcon':    'UNSC',
  'Mongoose':  'UNSC',
  'Elephant':  'UNSC',
  'Mantis':    'UNSC',
  // ── Banished ──────────────────────────────────────────────────────────────
  'Escharum':         'Banished',
  'Atriox':           'Banished',
  "Let 'Volir":       'Banished',
  'Chopper':          'Banished',
  'Marauder Warchief':'Banished',
  'Ironclad Wraith':  'Banished',
  'Guntower':         'Banished',
  'Harvester':            'Covenant',  // description mentions "Forerunner artefacts" — triggers false Forerunner
  'H9 mid-capacity hauler': 'UNSC',    // description mentions "Covenant" in comparative context
  'UNSC starship':          'UNSC',    // description mentions "Covenant ships" in comparative context
  'Liang-Dortmund mining rig': 'UNSC', // civilian/UEG vehicle — no faction keywords in description
  'Ceromax':                'UNSC',    // civilian/UEG vehicle — no faction keywords in description
  'Cargo walker':           'UNSC',    // UNSC logistics exoskeleton
  'Doozy':                  'UNSC',    // UNSC snowmobile
  'Breacher Exosuit': 'Banished',
  // ── Covenant ──────────────────────────────────────────────────────────────
  "Thel 'Vadam":      'Covenant',
  'Tartarus':         'Covenant',
  "Rtas 'Vadum":      'Covenant',
  'Banshee':          'Covenant',
  'Ghost':            'Covenant',
  'Wraith':           'Covenant',
  'Phantom':          'Covenant',
  'Spirit':           'Covenant',
  'Scarab':           'Covenant',
  // ── Flood ─────────────────────────────────────────────────────────────────
  'Gravemind':        'Flood',
  'Flood':            'Flood',   // race entry — description mentions "Forerunner" heavily
  // ── Forerunner ────────────────────────────────────────────────────────────
  'Forerunner':       'Forerunner', // race entry
  '343 Guilty Spark':       'Forerunner',
  '2401 Penitent Tangent':  'Forerunner',
  '031 Exuberant Witness':  'Forerunner',
  'Didact':           'Forerunner',
  'Librarian':        'Forerunner',
  'Mendicant Bias':   'Forerunner',
  'Phaeton':          'Forerunner',
};

// ── Main classifier ───────────────────────────────────────────────────────────

export function inferFaction(title: string, text: string): string {
  if (FACTION_OVERRIDES[title]) return FACTION_OVERRIDES[title];

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
  // Vehicle-specific Forerunner names: phaeton, retriever/aggressor sentinel.
  const isForerunnerKw = isForerunnerHyphenName || isForerunnerRoleName
    || isForerunnerMonitorName || isForerunnerSpecificName
    || /forerunner|promethean|hardlight|hard light|sentinel beam|lithos|composer/.test(combined)
    || /\bphaeton\b|\bretriever sentinel\b|\baggressor sentinel\b/.test(combined);

  // Banished: faction keywords, workshop names, distinctive vehicle/weapon names.
  // Guntower and Marauder are Banished-exclusive; Chopper is Jiralhanae/Banished.
  const isBanishedKw = /banished|atriox|escharum|[- ]banish|barukaza|barug.qel|eklon.dal|bolroci|dovotaa|kaelum|ahtulai|catulus|ironclad wraith|marauder warchief|\bcrav\b|barbed lance|berserker|fire-wand|loathsome thing|blamex|breacher exosuit|decimus/.test(combined)
    || /\bguntower\b|\bgigas\b|\bn'weo\b/.test(combined);

  // Covenant: species keywords + structural name patterns + specific vehicle names.
  // Lich, Locust, Harvester, Seraph are Covenant-origin craft (name-only fallback
  // for when no description is available).
  // Jiralhanae included — Banished check runs first so Banished-affiliated
  // Jiralhanae still get the correct label.
  const isCovenantKw = isCovenantPatternItem || isSangheiliName
    || /covenant|sangheili|elite|unggoy|grunt|kig-yar|jackal|jiralhanae|brute|huragok|engineer|yanme|drone|lekgolo|hunter|san.shyuum|prophet|methane rebreather|plasma (pistol|rifle|cannon|mortar|launcher|grenade)|assault cannon|anti-gravity barge|methane wagon|mudoat/.test(combined)
    || /\blich\b|\blocust\b|\bharvester\b|\bseraph\b|\bvampire\b/.test(combined);

  // Covenant-species indicator: Unggoy, Kig-Yar, Yanme'e, San'Shyuum by species name
  // in description. Used to prevent "Forerunner location" from overriding species identity.
  const isCovenantSpeciesKw = /\bunggoy\b|\bkig-yar\b|\byanme'e\b|\bsan'shyuum\b|\bdrone\b|\bgrunt\b|\bjackal\b/.test(combined);

  // UNSC: Spartan name formats, service branch keywords, named UNSC vehicles,
  // M-series prefix, BR battle rifles, CQS shotgun, ARC railgun, AIE machine guns.
  const isUNSCKw = isSpartanName
    || /unsc|spartan|marine|oni|odst|warthog|scorpion|hornet|longsword|mongoose|elephant|pelican|grizzly|jackrabbit|mammoth|falcon|vtol/.test(combined)
    || /^m\d+/i.test(title)      // M392 DMR, M247H, M850 Grizzly, etc.
    || /^br[\dx]+/i.test(title)  // BR55, BR75, BR85, BRXX battle rifles
    || /^cqs\d+/i.test(title)    // CQS48 Bulldog
    || /^arc-\d+/i.test(title)   // ARC-920 railgun
    || /^aie-\d+/i.test(title);  // AIE-207H, AIE-486H machine guns

  // Flood: Gravemind, Flood combat/infection/pure forms.
  const isFloodKw = /gravemind|flood form|infection form|the flood|flood pure|flood combat/.test(combined)
    || /^gravemind$/i.test(title);

  // ── Resolve priority (Forerunner > Banished > Covenant > UNSC > Flood) ───
  // Guard: Sangheili names, Covenant -pattern items, and Covenant-species keywords
  // all prevent "Forerunner location mention" from overriding the entity's true faction.
  const isCovenantGuard = isSangheiliName || isCovenantPatternItem || isCovenantSpeciesKw;
  if (!isCovenantGuard && isForerunnerKw) return 'Forerunner';
  if (isBanishedKw) return 'Banished';
  if (isCovenantKw) return 'Covenant';
  if (isUNSCKw) return 'UNSC';
  if (isFloodKw) return 'Flood';
  return '';
}
