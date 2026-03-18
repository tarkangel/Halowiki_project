/**
 * Shared prompt builder for Halo Wiki image generation.
 * Used by both generate-missing-images.ts and regenerate-bucket-images.ts.
 */

import { getLorePrompt } from './lore-prompts.js';

export function buildPrompt(type: string, name: string, description: string): string {
  const lore = getLorePrompt(name);
  if (lore) return lore;

  const desc = description.split(' ').slice(0, 50).join(' ');

  // Shared art-direction suffix targeting the established Halo game visual identity:
  // painterly concept art in the Bungie / 343 Industries tradition — desaturated mid-tones,
  // saturated accent colours (blue plasma, orange hardlight, gold visor), cinematic rim lighting.
  const baseStyle = 'Painterly sci-fi concept art in the style of official Halo game artwork (Halo 3 / Halo: Reach / Halo 4 / Halo Infinite). Dramatic cinematic rim lighting, dark atmospheric background, highly detailed, 4k.';

  // ── Faction detection ────────────────────────────────────────────────────
  // Two-pass approach:
  //   Pass 1 — name-based structural patterns (fire even with no Halopedia description)
  //   Pass 2 — keyword scan of combined name + description text
  // Priority order: Forerunner > Banished > Covenant > UNSC > Flood
  // Covenant is checked BEFORE Forerunner in name-patterns to prevent false positives
  // (e.g. Unggoy whose descriptions mention "installation" or "monitoring").

  // ── Pass 1: name-only structural patterns ────────────────────────────────

  // Sangheili: "Firstname 'Clanname" or "'Clanname" — apostrophe before capital letter
  const isSangheiliName = /'\s*[A-Z]/.test(name);

  // Forerunner characters with multi-segment hyphenated descriptive names
  // (Birth-to-Light, Chant-to-Green, Clearance-of-Old-Forests, …)
  // Requires 3+ hyphenated segments — avoids collision with Banished workshop names.
  // Segments may start with a capital (e.g. "-Light", "-Fields", "-Vanquished").
  const isForerunnerHyphenName = /^[A-Z][a-z]+(-[A-Za-z]+){2,}$/.test(name);

  // Known Forerunner role-title characters without hyphens (no Halopedia page)
  const isForerunnerRoleName = /^(auditor|confirmer|boundless|capital-enforcer|carrier-of-immunity|celebrator-of-birth|chief judicate|catalog triad|bornstellar's (sister|son)|catalog)$/i.test(name);

  // SPARTAN designation formats:
  //   "Name-A123" (Spartan-III/IV)  |  "Name-123" (Spartan-II)  |  "SPARTAN-X000"
  const isSpartanName = /^[A-Za-z]+-[A-Z]\d{2,3}$/.test(name)
    || /^[A-Za-z]+-\d{3}$/.test(name)
    || /^SPARTAN-[A-Z0-9]+$/.test(name);

  // Numeric AI/monitor designations: "NNN Word Word" (e.g. 049 Abject Testament)
  // Excludes pure numeric strings like "4096"
  const isForerunnerMonitorName = /^\d{2,6}\s+[A-Z][a-z]/.test(name);

  // Covenant "-pattern" vehicles/weapons (all manufacturer-pattern items are Covenant)
  const isCovenantPatternItem = /-pattern\b/i.test(name);

  // Known Forerunner-specific weapon names that have no "forerunner" in their description.
  // Uses prefix match (no $) so "Class-1 directed energy cannon" still matches "class-[12] directed energy".
  const isForerunnerWeaponName = type === 'weapon' && /^(class-[12] directed energy|destructor beam|focus beam|gravity wrench|halo array|hard light stave|lightblade|focus cannon|forerunner automated turret|forerunner turret)/i.test(name);

  // ── Pass 2: keyword scan of name + description ───────────────────────────
  const nameLower = (name + ' ' + desc).toLowerCase();

  // "monitor" and "installation" removed — too common in English prose, caused false positives.
  // Forerunner entities almost always have "forerunner" in their Halopedia description.
  const isForerunnerKw = /forerunner|promethean|hardlight|hard light|sentinel beam|lithos|composer|forerunner-built/.test(nameLower);

  // Banished: faction keywords + all known Banished workshop/manufacturer names
  const isBanishedKw = /banished|atriox|escharum|[- ]banish|barukaza|barug.qel|eklon.dal|bolroci|dovotaa|kaelum|ahtulai|catulus|ironclad wraith|marauder warchief|\bcrav\b/.test(nameLower);

  // Covenant: species + role names. Jiralhanae included — Banished check runs first so
  // Banished-affiliated Jiralhanae get the correct palette from isBanishedKw.
  const isCovenantKw = isCovenantPatternItem || isSangheiliName
    || /covenant|sangheili|elite|unggoy|grunt|kig-yar|jackal|jiralhanae|brute|huragok|engineer|yanme|drone|lekgolo|hunter|san.shyuum|prophet|methane rebreather/.test(nameLower);

  // UNSC: service branches, vehicle names, M-series weapon/vehicle prefix
  const isUNSCKw = isSpartanName
    || /unsc|spartan|marine|oni|odst|warthog|scorpion|hornet|longsword|mongoose|elephant|pelican|grizzly|jackrabbit/.test(nameLower)
    || ((type === 'weapon' || type === 'vehicle') && /^m\d+\b/i.test(name));  // M392 DMR, M850 Grizzly, etc.

  // Flood faction (Gravemind, infection forms)
  const isFloodKw = /gravemind|flood form|infection form|the flood/.test(nameLower)
    || /^gravemind$/i.test(name);

  // ── Resolve priority ─────────────────────────────────────────────────────
  // Forerunner name-patterns beat keyword Forerunner (reliable), but Covenant
  // name-pattern (Sangheili apostrophe) beats keyword-Forerunner to prevent
  // Covenant characters from being falsely tagged as Forerunner.
  const isForerunner = !isSangheiliName && !isCovenantPatternItem
    && (isForerunnerHyphenName || isForerunnerRoleName || isForerunnerMonitorName || isForerunnerWeaponName || isForerunnerKw);
  const isBanished   = isBanishedKw;
  const isCovenant   = !isBanished && isCovenantKw;
  const isUNSC       = !isBanished && !isCovenant && isUNSCKw;
  const isFlood      = !isForerunner && !isBanished && !isCovenant && !isUNSC && isFloodKw;

  // Forerunner monitors / constructs are NON-humanoid floating orb machines.
  // Distinguished from biological Forerunners (IsoDidact, Librarian, ancillas)
  // who ARE humanoid and are handled by the regular character template or lore-prompts.
  //   - Numbered designation: "343 Guilty Spark", "049 Abject Testament", "2401 Penitent Tangent"
  //   - Standalone 4-digit Forerunner number: "4096"
  //   - Role construct names: Adjutant, Catalog (but not Catalog Triad which is a group)
  const isMonitorConstruct = type === 'character' && isForerunner && (
    isForerunnerMonitorName                             // "343 Guilty Spark", "031 Exuberant Witness"
    || /^\d{4,}$/.test(name)                            // "4096"
    || /^(adjutant|catalog(?!\s+triad)|auditor|confirmer|boundless)/i.test(name)
  );

  let factionPalette = '';
  if (isForerunner) {
    factionPalette = 'Forerunner aesthetic: pale cream-ivory angular alloy panels with beveled geometric edges, glowing orange hardlight energy conduits, precise Forerunner glyph engravings.';
  } else if (isBanished) {
    factionPalette = 'Banished aesthetic: repurposed dark Covenant purple alloy jury-rigged with crude iron banding, red war-paint markings, visible jury-rigged welds and battle damage.';
  } else if (isCovenant) {
    factionPalette = 'Covenant aesthetic: deep purple-violet alloy with burnished gold inlays, smooth organic flowing forms, bioluminescent blue-purple plasma glow, ornate ceremonial detailing.';
  } else if (isUNSC) {
    factionPalette = 'UNSC aesthetic: matte olive-drab and gunmetal grey military hardware, stamped steel plate construction, rubber grip surfaces, stenciled unit markings.';
  } else if (isFlood) {
    factionPalette = 'Flood aesthetic: grotesque writhing biomass, corrupted organic matter, pulsating purple-grey flesh, bioluminescent yellow infection pustules, biological horror.';
  }

  const templates: Record<string, string> = {

    weapon: [
      `Halo game concept art of the weapon "${name}".`,
      desc ? `${desc}.` : '',
      factionPalette,
      'Isolated on a pure dark background. Dramatic directional rim lighting reveals every surface detail — metallic sheen, energy emitters, worn edges.',
      baseStyle,
    ].filter(Boolean).join(' '),

    vehicle: [
      `Halo game concept art of the vehicle "${name}".`,
      desc ? `${desc}.` : '',
      factionPalette,
      'Dramatic hero-shot at a low angle, vehicle fills the frame. Atmospheric alien terrain or sky in the background, motion or power implied in the pose.',
      baseStyle,
    ].filter(Boolean).join(' '),

    character: isMonitorConstruct
      // ── Forerunner monitor / construct — floating orb machine, NOT humanoid ──
      ? [
          `Halo game concept art of the Forerunner monitor "${name}".`,
          desc ? `${desc}.` : '',
          'A small ancient floating spherical robot in the style of 343 Guilty Spark: polished dark chrome alloy sphere with faint Forerunner geometric engravings on the surface, a single large glowing blue optical sensor eye at the front, hovering with a soft blue-white repulsor glow beneath.',
          'Centuries of wear and tarnish on the chrome surface. Forerunner ring-installation corridor background with luminescent wall panels. Eerie atmospheric lighting, the orb\'s eye casting a blue glow.',
          baseStyle,
        ].filter(Boolean).join(' ')
      // ── Standard biological character — humanoid portrait ────────────────────
      : [
          `Halo game concept art portrait of the character "${name}".`,
          desc ? `${desc}.` : '',
          factionPalette,
          'Three-quarter bust portrait. Helmet on or distinctive facial features clearly visible. Cinematic three-point lighting — strong key light, cool fill, warm rim separating the figure from a dark atmospheric background.',
          baseStyle,
        ].filter(Boolean).join(' '),

    race: [
      `Halo game concept art of the alien species "${name}".`,
      desc ? `${desc}.` : '',
      factionPalette,
      'Full-body creature design showcasing silhouette, scale, and distinctive biological features. Natural or combat pose. Dramatic rim lighting against a dark background.',
      baseStyle,
    ].filter(Boolean).join(' '),

    planet: [
      `Halo game concept art of the planet or installation "${name}".`,
      desc ? `${desc}.` : '',
      factionPalette,
      'View from low orbit or high atmosphere showing the curvature of the world. Distinctive terrain, atmosphere colour, or orbital features immediately readable.',
      'Space backdrop with stars and distant nebula. Cinematic planetary lighting — terminator line casting dramatic shadow across the surface.',
      baseStyle,
    ].filter(Boolean).join(' '),

    location: [
      `Halo game environmental concept art of the location "${name}".`,
      desc ? `${desc}.` : '',
      factionPalette,
      'Wide establishing shot capturing scale and atmosphere. Foreground detail leading the eye to a dramatic mid-ground structure. Moody cinematic lighting — god rays, atmospheric haze, or dramatic shadows.',
      baseStyle,
    ].filter(Boolean).join(' '),

    lore: [
      `Halo game concept art depicting "${name}".`,
      desc ? `${desc}.` : '',
      factionPalette,
      'Cinematic composition, dramatic lighting.',
      baseStyle,
    ].filter(Boolean).join(' '),

  };

  return templates[type] ?? [
    `Halo game concept art, "${name}".`,
    desc ? `${desc}.` : '',
    factionPalette,
    baseStyle,
  ].filter(Boolean).join(' ');
}
