import { describe, it, expect } from 'vitest';
import { inferFaction, FACTION_OVERRIDES } from '../faction';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Call inferFaction with no description (name-only classification). */
const byName = (title: string) => inferFaction(title, '');

/** Call inferFaction with both title and description text. */
const byText = (title: string, text: string) => inferFaction(title, text);

// ─────────────────────────────────────────────────────────────────────────────
// FACTION_OVERRIDES — hardcoded winners that ignore description content
// ─────────────────────────────────────────────────────────────────────────────

describe('FACTION_OVERRIDES', () => {
  it('covers all expected canonical entries', () => {
    expect(Object.keys(FACTION_OVERRIDES).length).toBeGreaterThanOrEqual(30);
  });

  it('classifies John-117 as UNSC even when description mentions Banished', () => {
    // Regression: description said "confronting the Banished" → was classified as Banished
    expect(byText('John-117', 'confronting the Banished and the threat of the Created')).toBe('UNSC');
  });

  it('classifies Cortana as UNSC even when description mentions Forerunner', () => {
    expect(byText('Cortana', 'created from Forerunner technology and human neural mapping')).toBe('UNSC');
  });

  it('classifies Atriox as Banished with no description', () => {
    expect(byName('Atriox')).toBe('Banished');
  });

  it('classifies Escharum as Banished even with Covenant keywords in description', () => {
    expect(byText('Escharum', 'veteran of the Covenant wars')).toBe('Banished');
  });

  it("classifies Thel 'Vadam as Covenant even with Banished keywords", () => {
    expect(byText("Thel 'Vadam", 'allied with UNSC against the Banished')).toBe('Covenant');
  });

  it('classifies Gravemind as Flood', () => {
    expect(byName('Gravemind')).toBe('Flood');
  });

  it('classifies 343 Guilty Spark as Forerunner', () => {
    expect(byName('343 Guilty Spark')).toBe('Forerunner');
  });

  it('classifies Didact as Forerunner', () => {
    expect(byName('Didact')).toBe('Forerunner');
  });

  it('classifies Librarian as Forerunner', () => {
    expect(byName('Librarian')).toBe('Forerunner');
  });

  it('classifies Noble Six as UNSC', () => {
    expect(byName('Noble Six')).toBe('UNSC');
  });

  // ── UNSC vehicle regressions ──────────────────────────────────────────────
  // Descriptions mention "Human-Covenant War" / "Covenant vehicles" which would
  // otherwise make isCovenantKw = true and override isUNSCKw.

  it('classifies Warthog as UNSC even though description says "Human-Covenant War"', () => {
    expect(byText('Warthog', 'deployed on every major front of the Human-Covenant War')).toBe('UNSC');
  });

  it('classifies Scorpion as UNSC even though description says "Covenant vehicles at range"', () => {
    expect(byText('Scorpion', 'capable of defeating most Covenant vehicles at range')).toBe('UNSC');
  });

  it('classifies Pelican as UNSC even though description says "Human-Covenant War"', () => {
    expect(byText('Pelican', 'delivered UNSC forces into every engagement of the Human-Covenant War')).toBe('UNSC');
  });

  it('classifies Falcon as UNSC even though description says "Human-Covenant War"', () => {
    expect(byText('Falcon', 'deployed during the Fall of Reach in the Human-Covenant War')).toBe('UNSC');
  });

  it('classifies Mongoose as UNSC', () => {
    expect(byName('Mongoose')).toBe('UNSC');
  });

  it('classifies Elephant as UNSC', () => {
    expect(byName('Elephant')).toBe('UNSC');
  });

  it('classifies Chopper as Banished', () => {
    expect(byName('Chopper')).toBe('Banished');
  });

  it('classifies Banshee as Covenant', () => {
    expect(byName('Banshee')).toBe('Covenant');
  });

  it('classifies Phaeton as Forerunner', () => {
    expect(byName('Phaeton')).toBe('Forerunner');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pass 1 — name-only structural patterns
// ─────────────────────────────────────────────────────────────────────────────

describe('Sangheili name pattern (apostrophe before capital)', () => {
  it("classifies 'Mdama clan names as Covenant", () => {
    expect(byName("Jul 'Mdama")).toBe('Covenant');
  });

  it("classifies Avu Med 'Telcam as Covenant", () => {
    expect(byName("Avu Med 'Telcam")).toBe('Covenant');
  });

  it("classifies Sangheili with Forerunner text as Covenant (guard holds)", () => {
    // Sangheili name guard should prevent Forerunner from winning even when
    // description contains "forerunner" keywords
    expect(byText("Zuka 'Zamamee", 'encountered forerunner installation on a halo ring')).toBe('Covenant');
  });
});

describe('Forerunner multi-hyphen name pattern', () => {
  it('classifies Birth-to-Light as Forerunner', () => {
    expect(byName('Birth-to-Light')).toBe('Forerunner');
  });

  it('classifies Chant-to-Green as Forerunner', () => {
    expect(byName('Chant-to-Green')).toBe('Forerunner');
  });

  it('classifies Clearance-of-Old-Forests as Forerunner', () => {
    expect(byName('Clearance-of-Old-Forests')).toBe('Forerunner');
  });

  it('does NOT match two-segment hyphenated names (not Forerunner pattern)', () => {
    // "Kig-Yar" has only one hyphen — should not trigger isForerunnerHyphenName
    expect(byName('Kig-Yar')).not.toBe('Forerunner');
  });
});

describe('Forerunner role-title name pattern', () => {
  it('classifies Auditor as Forerunner', () => {
    expect(byName('Auditor')).toBe('Forerunner');
  });

  it('classifies Confirmer as Forerunner', () => {
    expect(byName('Confirmer')).toBe('Forerunner');
  });
});

describe('Forerunner monitor numeric designation', () => {
  it('classifies 049 Abject Testament as Forerunner', () => {
    expect(byName('049 Abject Testament')).toBe('Forerunner');
  });

  it('classifies 032 Mendicant Bias as Forerunner by name alone', () => {
    // Note: Mendicant Bias also in FACTION_OVERRIDES, but this tests the pattern
    expect(byName('032 Mendicant Bias')).toBe('Forerunner');
  });
});

describe('Spartan designation name pattern', () => {
  it('classifies Linda-058 as UNSC', () => {
    expect(byName('Linda-058')).toBe('UNSC');
  });

  it('classifies Cal-141 as UNSC', () => {
    expect(byName('Cal-141')).toBe('UNSC');
  });

  it('classifies Kelly-087 as UNSC', () => {
    expect(byName('Kelly-087')).toBe('UNSC');
  });

  it('classifies SPARTAN-B312 as UNSC', () => {
    expect(byName('SPARTAN-B312')).toBe('UNSC');
  });

  it('classifies Fred-104 as UNSC', () => {
    expect(byName('Fred-104')).toBe('UNSC');
  });
});

describe('Forerunner specific weapon/item names', () => {
  it('classifies Cindershot as Forerunner', () => {
    expect(byName('Cindershot')).toBe('Forerunner');
  });

  it('classifies Heatwave as Forerunner', () => {
    expect(byName('Heatwave')).toBe('Forerunner');
  });

  it('classifies Focus Beam as Forerunner', () => {
    expect(byName('Focus Beam')).toBe('Forerunner');
  });

  it('classifies Arcane Sentinel Beam as Forerunner', () => {
    expect(byName('Arcane Sentinel Beam')).toBe('Forerunner');
  });
});

describe('Covenant -pattern item name', () => {
  it('classifies Type-25 Directed Energy Rifle as Covenant', () => {
    expect(byName('Type-25 Directed Energy Rifle/Carbine-pattern')).toBe('Covenant');
  });

  it('classifies N\'weo-pattern Gigas as Banished (Banished > Covenant pattern)', () => {
    // Regression: "-pattern" in name triggered Covenant classification.
    // isBanishedKw (n'weo + gigas) must win over isCovenantPatternItem.
    expect(byName("N'weo-pattern Gigas")).toBe('Banished');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2 — keyword scan
// ─────────────────────────────────────────────────────────────────────────────

describe('Forerunner keywords in description', () => {
  it('classifies unknown entity with "forerunner" in description', () => {
    expect(byText('Unknown Entity', 'a forerunner construct found on the Ark')).toBe('Forerunner');
  });

  it('classifies entity with "promethean" in description as Forerunner', () => {
    expect(byText('Unknown Soldier', 'a promethean knight deployed by the Didact')).toBe('Forerunner');
  });

  it('classifies entity with "hardlight" as Forerunner', () => {
    expect(byText('Hardlight Shield', 'projects a hardlight barrier')).toBe('Forerunner');
  });

  it('classifies Phaeton vehicle by name alone as Forerunner', () => {
    expect(byName('Phaeton')).toBe('Forerunner');
  });

  it('classifies Retriever Sentinel by name alone as Forerunner', () => {
    expect(byName('Retriever Sentinel')).toBe('Forerunner');
  });
});

describe('Banished keywords in description', () => {
  it('classifies unknown entity with "banished" in description', () => {
    expect(byText('Unnamed Warrior', 'a soldier fighting for the Banished warband')).toBe('Banished');
  });

  it('classifies Guntower by name alone as Banished', () => {
    expect(byName('Guntower')).toBe('Banished');
  });

  it('classifies entity with "atriox" in description as Banished', () => {
    expect(byText('Bodyguard', 'personal guard of Atriox during the siege')).toBe('Banished');
  });

  it('classifies Gigas by name alone as Banished', () => {
    expect(byName('Gigas')).toBe('Banished');
  });
});

describe('Covenant keywords in description', () => {
  it('classifies entity with "covenant" in description', () => {
    expect(byText('Unnamed Grunt', 'a member of the Covenant military')).toBe('Covenant');
  });

  it('classifies entity with "unggoy" in description as Covenant', () => {
    expect(byText('Yapyap', 'an unggoy rebel who led a breakaway force')).toBe('Covenant');
  });

  it('classifies entity with "kig-yar" in description as Covenant', () => {
    expect(byText('T\'vaoan', 'a kig-yar sniper specialist')).toBe('Covenant');
  });

  it('classifies Lich by name alone as Covenant', () => {
    expect(byName('Lich')).toBe('Covenant');
  });

  it('classifies Locust by name alone as Covenant', () => {
    expect(byName('Locust')).toBe('Covenant');
  });

  it('classifies Seraph by name alone as Covenant', () => {
    expect(byName('Seraph')).toBe('Covenant');
  });

  it('classifies Harvester by name alone as Covenant', () => {
    expect(byName('Harvester')).toBe('Covenant');
  });
});

describe('UNSC keywords in description', () => {
  it('classifies entity with "unsc" in description', () => {
    expect(byText('Sergeant', 'a UNSC Marine serving aboard the Pillar of Autumn')).toBe('UNSC');
  });

  it('classifies entity with "odst" in description', () => {
    expect(byText('Rookie', 'an ODST deployed during the Battle of Earth')).toBe('UNSC');
  });

  it('classifies entity with "warthog" in description as UNSC', () => {
    expect(byText('Driver', 'operated a warthog during the assault on the Citadel')).toBe('UNSC');
  });
});

describe('UNSC weapon prefix patterns', () => {
  it('classifies M392 DMR as UNSC by M-prefix', () => {
    expect(byName('M392 Designated Marksman Rifle')).toBe('UNSC');
  });

  it('classifies M6D Personal Defense Weapon System as UNSC by M-prefix', () => {
    expect(byName('M6D Personal Defense Weapon System')).toBe('UNSC');
  });

  it('classifies BR55 Battle Rifle as UNSC by BR-prefix', () => {
    expect(byName('BR55 Battle Rifle')).toBe('UNSC');
  });

  it('classifies BR75 Breacher as UNSC by BR-prefix', () => {
    expect(byName('BR75 Breacher')).toBe('UNSC');
  });

  it('classifies CQS48 Bulldog as UNSC by CQS-prefix', () => {
    expect(byName('CQS48 Bulldog')).toBe('UNSC');
  });

  it('classifies ARC-920 Railgun as UNSC by ARC-prefix', () => {
    expect(byName('ARC-920 Railgun')).toBe('UNSC');
  });

  it('classifies AIE-486H as UNSC by AIE-prefix', () => {
    expect(byName('AIE-486H')).toBe('UNSC');
  });
});

describe('Flood keywords in description', () => {
  it('classifies entity with "flood form" in description', () => {
    expect(byText('Infection Form', 'a flood form that infects hosts')).toBe('Flood');
  });

  it('classifies entity with "flood pure" in description', () => {
    expect(byText('Pure Form', 'a flood pure combat mutation found on the Ark')).toBe('Flood');
  });

  it('classifies entity with "flood combat" in description', () => {
    expect(byText('Combat Form', 'flood combat form created from an infected human')).toBe('Flood');
  });

  it('classifies entity with "infection form" in description as Flood', () => {
    expect(byText('Spore', 'an infection form released by the Gravemind')).toBe('Flood');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Priority ordering
// ─────────────────────────────────────────────────────────────────────────────

describe('Priority: Forerunner > Banished > Covenant > UNSC > Flood', () => {
  it('Forerunner beats Banished when no Covenant guard', () => {
    expect(byText('Unknown', 'a forerunner construct affiliated with a banished splinter group')).toBe('Forerunner');
  });

  it('Banished beats Covenant', () => {
    expect(byText('Unknown', 'a banished brute from a former covenant warband')).toBe('Banished');
  });

  it('Covenant beats UNSC', () => {
    expect(byText('Unknown', 'a covenant elite captured by a unsc fireteam')).toBe('Covenant');
  });

  it('UNSC beats Flood', () => {
    expect(byText('Unknown', 'a unsc marine infected and turned into a flood form')).toBe('UNSC');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Covenant guard — prevents Forerunner misclassification
// ─────────────────────────────────────────────────────────────────────────────

describe('Covenant species guard prevents Forerunner misclassification (regressions)', () => {
  it('Unggoy at Forerunner installation stays Covenant', () => {
    // Regression: Unggoy characters on Halo rings were classified as Forerunner
    // because description mentioned "forerunner installation".
    expect(byText('Ang\'napnap', 'an unggoy stationed on a forerunner installation')).toBe('Covenant');
  });

  it('Kig-Yar with Forerunner location text stays Covenant', () => {
    expect(byText('Scruffy', 'a kig-yar sniper hiding in a forerunner structure')).toBe('Covenant');
  });

  it('Sangheili name with Forerunner text stays Covenant', () => {
    expect(byText("Zuka 'Zamamee", 'fought through forerunner ruins on the ring')).toBe('Covenant');
  });

  it('-pattern item with Forerunner text stays Covenant (not Forerunner)', () => {
    expect(byText('Shade-pattern Turret', 'mounted on a forerunner platform')).toBe('Covenant');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No faction — genuinely unclassifiable
// ─────────────────────────────────────────────────────────────────────────────

describe('Returns empty string when no faction detected', () => {
  it('returns empty string for a generic name with no description', () => {
    expect(byName('Flim')).toBe('');
  });

  it('returns empty string for empty title and text', () => {
    expect(byText('', '')).toBe('');
  });

  it('returns empty string for a description with no faction signals', () => {
    expect(byText('Unknown', 'a figure mentioned briefly in ancient records')).toBe('');
  });
});
