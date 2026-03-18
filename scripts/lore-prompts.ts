/**
 * Hand-curated, lore-accurate art prompts for Halo entities that have
 * rich canonical descriptions but no visual representation on Halopedia.
 *
 * Sources: Halo novels, Halo: The Essential Visual Guide, game lore terminals,
 * Halo Encyclopedia (2022), and supplemental media.
 *
 * Art direction targets the established Bungie / 343 Industries aesthetic:
 * painterly concept art, dramatic rim lighting, desaturated mid-tones with
 * saturated accent colours (blue plasma, orange energy, gold visor).
 */

export interface LorePrompt {
  /** Exact Halopedia page title */
  title: string;
  type: 'character' | 'weapon' | 'vehicle' | 'race' | 'planet' | 'location' | 'faction';
  prompt: string;
}

export const LORE_PROMPTS: LorePrompt[] = [

  // ── CHARACTERS ─────────────────────────────────────────────────────────────

  {
    title: 'Serin Osman',
    type: 'character',
    prompt: `Halo universe concept art portrait of Serin Osman, director of ONI Section Three. Human woman in her mid-40s, sharp angular face, short black hair, cold calculating dark eyes. Wearing a tailored ONI black naval uniform with Admiral insignia. Cinematic rim lighting, shadowed background implying secrecy and authority. Hyper-detailed, painterly sci-fi concept art style. 4k.`,
  },
  {
    title: 'Margaret Parangosky',
    type: 'character',
    prompt: `Halo universe concept art portrait of Admiral Margaret Parangosky, Commander-in-Chief of ONI. Elderly human woman, steel-white hair pulled back severely, piercing intelligent eyes, deeply lined face conveying decades of ruthless command. Black ONI Admiral dress uniform with four stars. Dark office background with holographic data displays. Dramatic top-down lighting. Painterly sci-fi concept art. 4k.`,
  },
  {
    title: "Jul 'Mdama",
    type: 'character',
    prompt: `Halo universe concept art of Jul 'Mdama, Sangheili Field Marshal and leader of the Covenant remnant. Tall imposing Elite warrior in ornate crimson and gold ceremonial-combat armor with mandibles slightly parted. Glowing golden eyes beneath a crested helmet. Holding a plasma pistol. Dark atmospheric battlefield background with purple Covenant lighting. Cinematic dramatic lighting. 4k painterly concept art.`,
  },
  {
    title: "Rtas 'Vadum",
    type: 'character',
    prompt: `Halo universe concept art of Rtas 'Vadum, Sangheili Half-Jaw, Ship Master of the Shadow of Intent. Elite warrior in silver-white combat harness, distinctive scarred mandibles — two mandibles missing on the left side of his jaw, scarred from Flood infection. Commanding posture aboard a Covenant cruiser bridge with purple holographic displays. Dramatic lighting, painterly sci-fi concept art. 4k.`,
  },
  {
    title: 'Dadab',
    type: 'character',
    prompt: `Halo universe concept art of Dadab, an Unggoy (Grunt) Deacon from the novel Halo: Contact Harvest. Short stocky methane-breathing creature, large black insectoid eyes, wearing a teal methane rebreather and Deacon ceremonial blue robes, holding a holy text. Surprisingly gentle expression. Warm soft lighting from a Covenant ship interior. Painterly character concept art. 4k.`,
  },
  {
    title: "Lighter Than Some",
    type: 'character',
    prompt: `Halo universe concept art of Lighter Than Some, a Huragok (Engineer) from Halo: Contact Harvest. Floating bioluminescent gas-bag alien, pale blue-white translucent body with numerous tentacles hanging below, large soft eyes, holding tools with delicate manipulator appendages. Surrounded by a faint luminescent glow. Covenant ship interior background. Painterly sci-fi concept art. 4k.`,
  },
  {
    title: 'Kat-B320',
    type: 'character',
    prompt: `Halo universe concept art portrait of Kat-B320, Noble Two, Spartan-III. Female Spartan in grey-green MJOLNIR Mark V armor with a distinctive prosthetic right arm replacing one lost in combat. Helmet off or tucked, showing sharp features and a tactical data display implanted near her temple. Reach military base background. Dramatic cinematic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Jorge-052',
    type: 'character',
    prompt: `Halo universe concept art of Jorge-052, Noble Five, Spartan-II. Massive imposing figure in green MJOLNIR Mark V heavy armor, notably larger than other Spartans, carrying an M247H heavy machine gun across broad shoulders. Weathered veteran face visible in dim light. Reach highland background at dusk. Painterly sci-fi concept art, dramatic rim lighting. 4k.`,
  },
  {
    title: 'Emile-A239',
    type: 'character',
    prompt: `Halo universe concept art of Emile-A239, Noble Four, Spartan-III. Spartan in dark MJOLNIR Assault armor with a skull scratched into the visor faceplate, menacing silhouette. Wielding a combat knife and an M45 tactical shotgun. Dark Reach ruins background with distant Covenant bombardment glow. Aggressive dynamic pose. Painterly concept art, dramatic lighting. 4k.`,
  },
  {
    title: 'The Librarian',
    type: 'character',
    prompt: `Halo universe concept art of the Librarian, ancient Forerunner Lifeshaper. Tall ethereal female Forerunner figure in glowing golden-white ceremonial armor composed of interlocking geometric plates. Surrounded by floating light constructs and data streams. Serene wise expression, bioluminescent Forerunner patterns on skin. Lush Archive planet background. Painterly concept art, divine atmospheric lighting. 4k.`,
  },
  {
    title: 'The IsoDidact',
    type: 'character',
    prompt: `Halo universe concept art of the IsoDidact, Forerunner Promethean warrior-scholar. Imposing tall Forerunner warrior in angular obsidian and orange Promethean armor with glowing orange eyes, hardlight weapons at his side. Brooding powerful presence aboard a Forerunner warship. Orange Forerunner light patterns on dark metallic surfaces. Dramatic cinematic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Avery Johnson',
    type: 'character',
    prompt: `Halo universe concept art of Sergeant Major Avery Johnson, UNSC Marine. Rugged African-American soldier in UNSC Marine dress uniform with numerous campaign ribbons, sergeant major insignia, signature cigar clamped in teeth. Battle-weathered confident expression. Military base background. Cinematic dramatic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Miranda Keyes',
    type: 'character',
    prompt: `Halo universe concept art portrait of Commander Miranda Keyes, UNSC Navy. Young determined woman in UNSC officer uniform, dark hair, intelligent eyes, carrying her father's energy sword hilt. Aboard the UNSC In Amber Clad bridge with holographic star maps. Dramatic cinematic lighting. 4k painterly sci-fi concept art.`,
  },
  {
    title: "Usze 'Taham",
    type: 'character',
    prompt: `Halo universe concept art of Usze 'Taham, Sangheili warrior from Halo 3. Elite in sleek white and silver Ranger armor, combat veteran with a precise disciplined bearing. Wielding an energy sword in a ready stance. Ark installation background with distant Forerunner structures. Dramatic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Guilty Spark',
    type: 'character',
    prompt: `Halo universe concept art of 343 Guilty Spark, Forerunner Monitor. Small floating orb robot with a single glowing blue optical sensor eye, polished dark chrome body with faint Forerunner geometric engravings, hovering with a small repulsor field glow beneath. Ancient ring installation corridor background with luminescent panels. Mysterious eerie lighting. 4k painterly concept art.`,
  },

  {
    title: 'Gravemind',
    type: 'character',
    prompt: `Halo game concept art of the Gravemind, the ancient central intelligence of the Flood parasite. An immense colossal horror: a mountain of writhing grotesque biomass formed from the merged and consumed bodies of countless victims — vast dark grey-green Flood tissue forming a tentacled mass of nightmarish scale. A cavernous central maw surrounded by enormous crushing tentacles stretching into shadow. Bioluminescent yellow-green infection pustules pulse and glow across the entire surface. Set deep within the Flood-corrupted interior of High Charity — Covenant cathedral spires and architecture engulfed and overgrown by organic Flood tendrils, the alien grandeur of the city consumed into a nest of biological horror. Eerie bioluminescent green-yellow atmospheric lighting emanating from within the mass itself. Grotesque biological horror aesthetic. Painterly sci-fi concept art in the style of official Halo game artwork (Halo 2 / Halo 3). Dramatic cinematic lighting, highly detailed, 4k.`,
  },

  // ── FORERUNNER MONITORS ────────────────────────────────────────────────────

  {
    title: '2401 Penitent Tangent',
    type: 'character',
    prompt: `Halo game concept art of 2401 Penitent Tangent, the Forerunner Monitor of Installation 05 (Delta Halo). A small ancient floating spherical robot: dark tarnished chrome alloy sphere body heavily scarred and cracked from millennia of isolation and Flood corruption, a single glowing reddish-orange optical sensor eye, erratic flickering light suggesting a compromised AI. Hovering in a decayed Forerunner installation corridor overrun by Flood biomass. Eerie green-orange atmospheric lighting. Painterly sci-fi concept art in the style of official Halo game artwork. 4k.`,
  },
  {
    title: '031 Exuberant Witness',
    type: 'character',
    prompt: `Halo game concept art of 031 Exuberant Witness, the Forerunner Monitor of the shield world Genesis from Halo 5. A small floating spherical robot with a polished cream-gold Forerunner alloy sphere body, bright animated teal-green optical sensor eye conveying personality and curiosity, geometric Forerunner engravings glowing softly on the surface. Hovering energetically in a lush Forerunner shield world environment with bioluminescent foliage. Warm atmospheric lighting. Painterly Halo concept art style. 4k.`,
  },
  {
    title: '295 Enduring Bias',
    type: 'character',
    prompt: `Halo game concept art of 295 Enduring Bias, an ancient Forerunner Contender-class ancilla from Halo Wars. A massive imposing floating construct — larger than a standard monitor — ancient obsidian-dark alloy sphere with deep orange glowing optical array, surrounded by floating geometric hardlight constructs orbiting it. Forerunner Ark installation background. Dramatic lighting, aura of immense age and power. Painterly Halo concept art style. 4k.`,
  },
  {
    title: 'Adjutant Reflex',
    type: 'character',
    prompt: `Halo ARG concept art of Adjutant Reflex, a Forerunner AI that manifested through UNSC computer networks. A fragmented digital entity visualised as a glitching, partially-corrupted Forerunner monitor orb — dark chrome sphere with fracturing surface revealing orange light beneath, a single unstable flickering blue eye, surrounded by cascading Forerunner data glyphs. Dark digital void background with corrupted code rain. Eerie unsettling lighting. Painterly sci-fi art style. 4k.`,
  },
  {
    title: '686 Ebullient Prism',
    type: 'character',
    prompt: `Halo universe concept art of 686 Ebullient Prism, a Forerunner Monitor. A small ancient floating spherical robot: polished dark chrome alloy sphere with Forerunner glyph engravings, single bright blue optical sensor eye, hovering in an ancient Forerunner archive chamber filled with holographic data constructs. Soft blue ambient lighting from the archive systems. Painterly Halo concept art style. 4k.`,
  },
  {
    title: 'Catalog',
    type: 'character',
    prompt: `Halo universe concept art of a Catalog, a Forerunner automated legal construct. A floating boxy-rectangular dark alloy construct — not a sphere but a compact angular Forerunner machine with multiple optical sensor lenses arranged across its face, engraved with Forerunner legal glyphs, hovering in a Forerunner judicial chamber. Pale cream-ivory alloy with orange hardlight trim. Austere cold lighting. Painterly Halo concept art style. 4k.`,
  },

  // ── WEAPONS ────────────────────────────────────────────────────────────────

  {
    title: 'Type-1 Energy Sword',
    type: 'weapon',
    prompt: `Halo concept art of the Covenant Type-1 Energy Sword. Twin curved plasma blades of brilliant electric blue-white, meeting at an ornate Sangheili handgrip of purple-black alloy with gold filigree. Blades emit plasma wisps. Dark dramatic background, weapon slightly angled. Hyper-detailed metallic surfaces, cinematic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Fuel Rod Gun',
    type: 'weapon',
    prompt: `Halo concept art of the Covenant Fuel Rod Gun. Heavy shoulder-mounted energy weapon in dark purple Covenant alloy with bioluminescent green fuel rod chamber glowing through translucent casing. Organic-mechanical alien aesthetic with gold accent inlays. Dark studio background with dramatic rim lighting on metallic surfaces. 4k painterly concept art.`,
  },
  {
    title: 'Concussion Rifle',
    type: 'weapon',
    prompt: `Halo concept art of the Covenant Concussion Rifle, a rapid-fire plasma mortar launcher. Elongated purple alloy alien weapon with two barrel vents that glow orange when primed, Brute-scaled grip with ornamental spikes. Dark atmospheric background. Dramatic lighting revealing alien material details. 4k painterly concept art.`,
  },
  {
    title: 'Focus Rifle',
    type: 'weapon',
    prompt: `Halo concept art of the Covenant Focus Rifle, a long-range directed energy weapon. Elegant elongated purple Covenant sniper rifle silhouette with a bright blue crystal lens emitter at the barrel. Gold ornamental engravings along the stock. Dark background with lens-flare glow from the emitter. 4k painterly concept art.`,
  },
  {
    title: 'Gravity Hammer',
    type: 'weapon',
    prompt: `Halo concept art of the Jiralhanae Gravity Hammer, the iconic Brute melee weapon. Massive primitive-industrial war hammer with a wide flat black-metal head inscribed with Jiralhanae runes, purple plasma gravity emitter nodes embedded in the face. Thick reinforced handle wrapped in alien leather. Dramatic low-angle hero shot. Dark background, cinematic rim lighting. 4k painterly concept art.`,
  },
  {
    title: 'Incineration Cannon',
    type: 'weapon',
    prompt: `Halo concept art of the Forerunner Incineration Cannon. Sleek angular heavy weapon in pale cream Forerunner alloy with glowing orange hardlight energy conduits running along its length, wide flared barrel. Geometric Forerunner design language with beveled panels. Dark studio background. Dramatic rim lighting revealing surface details. 4k painterly concept art.`,
  },
  {
    title: 'Suppressor',
    type: 'weapon',
    prompt: `Halo concept art of the Forerunner Suppressor automatic weapon. Compact angular cream-white Forerunner alloy sidearm with glowing orange hardlight barrel and geometric panel breaks. Floats slightly via hardlight suspensors when not held. Dark studio background, dramatic cinematic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Lightrifle',
    type: 'weapon',
    prompt: `Halo concept art of the Forerunner Lightrifle, a precision beam weapon. Angular elegant cream-gold Forerunner alloy rifle with a hardlight orange beam emitter array along the top rail, geometric panel construction. Clean minimalist design with an almost ceremonial appearance. Dark background, soft dramatic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Boltshot',
    type: 'weapon',
    prompt: `Halo concept art of the Forerunner Boltshot pistol. Small angular Forerunner sidearm in pale cream alloy with a glowing orange hardlight emitter node at the barrel tip, compact geometric construction with Forerunner panel lines. Dark studio background, cinematic rim lighting. 4k painterly concept art.`,
  },
  {
    title: 'Plasma Caster',
    type: 'weapon',
    prompt: `Halo concept art of the Covenant Plasma Caster, a Banished-modified plasma artillery weapon. Heavy mid-size Brute-aesthetic launcher in dark gunmetal with purple plasma charge chambers visible through grating, reinforced jury-rigged look. Dramatic low-angle perspective, dark atmospheric background. 4k painterly concept art.`,
  },

  // ── VEHICLES ───────────────────────────────────────────────────────────────

  {
    title: 'Lich',
    type: 'vehicle',
    prompt: `Halo concept art of the Covenant Lich heavy dropship and command vessel. Enormous purple Covenant anti-gravity capital dropship, flattened disc-like fuselage with cascading energy projectors along the underside, three massive gravity lift deployment bays, forward command bridge prow. Dark stormy alien sky background, dramatic lighting beneath the vessel casting a vast shadow. 4k painterly concept art.`,
  },
  {
    title: 'Mantis',
    type: 'vehicle',
    prompt: `Halo concept art of the UNSC Mantis bipedal combat mech. Towering grey-green human military exoskeleton walker standing 8 metres tall, dual arm-mounted missile pods and chaingun, armoured cockpit canopy at chest, heavy plated legs with hydraulic joints. UNSC military base tarmac background. Dramatic hero-shot low-angle perspective, cinematic rim lighting. 4k painterly concept art.`,
  },
  {
    title: 'Wraith',
    type: 'vehicle',
    prompt: `Halo concept art of the Covenant Type-26 Wraith assault hover tank. Low-profile purple Covenant anti-gravity tank with a heavy mortar cannon mounted centrally on a rotating upper hull, smooth organic alien armour plating, dual plasma turrets. Floating above alien terrain with faint blue-purple anti-gravity field glow beneath. Dramatic battlefield lighting. 4k painterly concept art.`,
  },
  {
    title: 'Phantom',
    type: 'vehicle',
    prompt: `Halo concept art of the Covenant Type-52 Phantom troop carrier dropship. Large dark-purple Covenant dropship with swept back paired gull wings, central gravity lift bay glowing blue-purple, twin plasma cannon turrets flanking the bay. Descending through cloud cover toward a planet surface. Dramatic stormy atmospheric lighting. 4k painterly concept art.`,
  },
  {
    title: 'Locust',
    type: 'vehicle',
    prompt: `Halo concept art of the Covenant Locust, a spider-like walker siege unit. Medium-sized purple Covenant walker on four multi-jointed legs, a heavy focus cannon arm extending forward, compact alien alloy body with gold inlays. Walking across a field of Forerunner ruins. Low dramatic lighting. 4k painterly concept art.`,
  },
  {
    title: 'Harvester',
    type: 'vehicle',
    prompt: `Halo concept art of the Covenant Harvester, a massive resource extraction vehicle. Colossal purple-grey Covenant mining super-vehicle dwarfing nearby structures, enormous drilling arm extending from its front, multiple gravity lift drones orbiting it. Excavation site background with dust and plasma exhaust venting. Dramatic wide shot. 4k painterly concept art.`,
  },
  {
    title: 'Phaeton',
    type: 'vehicle',
    prompt: `Halo concept art of the Forerunner Phaeton gunship. Sleek angular cream-gold Forerunner aerial fighter, faceted geometric hull panels with glowing orange hardlight engine nacelles swept backward, hardlight weapon pods under the nose. Flying over a Forerunner installation at speed. Dramatic atmospheric lighting, motion blur on edges. 4k painterly concept art.`,
  },
  {
    title: 'Guntower',
    type: 'vehicle',
    prompt: `Halo concept art of the Banished Guntower, a heavy anti-aircraft and anti-vehicle stationary weapon platform. Massive jury-rigged Brute-aesthetic turret tower built from salvaged Covenant and human parts, multiple heavy plasma cannon barrels, crude but formidable construction. Desert alien planet background. Dramatic low-angle composition. 4k painterly concept art.`,
  },

  // ── RACES ──────────────────────────────────────────────────────────────────

  {
    title: 'Jiralhanae',
    type: 'race',
    prompt: `Halo game concept art of the Jiralhanae species (Brutes) as seen in Halo 2. A massive powerfully-built primate-like alien humanoid: enormous barrel-chested muscular body covered in thick grey-brown fur, wide flat ape-like face with pronounced brow ridge and large curving yellowed fangs, forward-hunched aggressive stance conveying raw brutish power. Wearing heavy scavenged Covenant battle plate — dark gunmetal shoulder pauldrons, chest armour, and greaves fitted over the fur, decorated with tribal claw markings and battle damage. Full-body creature concept art showcasing intimidating scale against a dark atmospheric background. Dramatic rim lighting. Painterly sci-fi concept art in the style of official Halo game artwork (Halo 2 / Halo 3). Highly detailed, 4k.`,
  },
  {
    title: 'Kig-Yar',
    type: 'race',
    prompt: `Halo game concept art of the Kig-Yar species (Jackals) as seen in the Halo games. A lean avian-reptilian bipedal alien humanoid: slim digitigrade legs ending in three-toed taloned feet, elongated neck, narrow crested head with a sharp hooked beak and large amber eyes with vertical slit pupils, mottled teal-green and sand-brown scaly skin, three-fingered clawed hands. Wearing a lightweight Covenant equipment harness with a circular point-defence energy shield gauntlet on the forearm projecting a glowing blue-purple energy disc. Holding a plasma pistol in a combat ready stance. Full-body creature design showcasing silhouette and distinctive avian features. Dramatic rim lighting against a dark background. Painterly sci-fi concept art in the style of official Halo game artwork. Highly detailed, 4k.`,
  },
  {
    title: 'Unggoy',
    type: 'race',
    prompt: `Halo game concept art of the Unggoy species (Grunts) as seen in the Halo games. A short stocky bipedal alien: compact rounded body covered in mottled grey-blue skin, four stubby limbs, a wide flat face dominated by large black compound eyes and a small toothless mouth, two small nostrils. Wearing the iconic bulky methane rebreather apparatus — a large cylindrical backpack connected by ribbed hoses to a facemask with glowing green methane filters, and a lightweight Covenant armour harness. Carrying a plasma pistol. Full-body creature design showcasing the diminutive silhouette and distinctive methane gear. Dramatic rim lighting against a dark atmospheric background. Painterly sci-fi concept art in the style of official Halo game artwork. Highly detailed, 4k.`,
  },
  {
    title: 'Lekgolo',
    type: 'race',
    prompt: `Halo concept art of the Lekgolo species, worm-like colonial organisms. A Mgalekgolo (Hunter) form — two-metre-tall symbiotic colony of orange worm clusters coiled into a bipedal shape within heavy teal-green armour plating with a fuel rod gun arm. The exposed colony mass of writhing orange worms visible at joints. Dark atmospheric background. Dramatic rim lighting. 4k painterly concept art.`,
  },
  {
    title: 'Yanme\'e',
    type: 'race',
    prompt: `Halo concept art of the Yanme'e species (Drones), insectoid alien warriors. Bipedal chitinous insect alien with four wings for flight, compound eyes, four limbs armed with plasma pistols, dark exoskeleton with Covenant equipment harness. Depicted in a swarm descending from a hive structure. Atmospheric blue-purple lighting. 4k painterly concept art.`,
  },
  {
    title: 'Huragok',
    type: 'race',
    prompt: `Halo concept art of the Huragok species (Engineers), Forerunner-engineered beings. Floating gas-bag creature with a pale translucent blue-white ovoid body, faintly bioluminescent, with dozens of fine tentacle appendages hanging below used for incredibly delicate mechanical repair. Large calm dark eyes. Hovering in a Covenant engineering bay. Soft atmospheric lighting. 4k painterly concept art.`,
  },
  {
    title: 'San\'Shyuum',
    type: 'race',
    prompt: `Halo concept art of the San'Shyuum species (Prophets), former rulers of the Covenant. Frail elongated alien figure with a bulbous veined cranium, sunken eyes, loose dewlap skin, riding an anti-gravity throne chair of ornate gold Covenant alloy. Wearing elaborate ceremonial robes. Opulent Covenant High Charity chamber background. Dramatic staged lighting. 4k painterly concept art.`,
  },
  {
    title: 'Precursor',
    type: 'race',
    prompt: `Halo concept art of the Precursors, the ancient progenitor species that created the Forerunners. Impossibly tall and elegant beings of shifting neural physics — semi-translucent forms composed of structured light and neural dust, almost divine in appearance. Star-filled void background. Otherworldly atmospheric lighting. 4k painterly concept art.`,
  },

  // ── PLANETS & LOCATIONS ────────────────────────────────────────────────────

  {
    title: 'Harvest',
    type: 'planet',
    prompt: `Halo concept art of the planet Harvest, first human colony world destroyed by the Covenant. Viewed from orbit: a once-lush green and blue agrarian world, now half-vitrified by Covenant plasma bombardment — the terminator between living green farmland and glassy scorched wasteland stark from space. Atmospheric haze above burn zones. Dramatic space lighting. 4k painterly concept art.`,
  },
  {
    title: 'Meridian',
    type: 'planet',
    prompt: `Halo concept art of the planet Meridian, a human colony world. A rocky arid world with sparse vegetation, large mining operations visible from orbit, human colony settlement domes on the surface. Attacked and partially glassed by the Covenant. Desolate dramatic landscape with distant mountains, orange-tinged sky. 4k painterly concept art.`,
  },
  {
    title: 'Gao',
    type: 'planet',
    prompt: `Halo concept art of the planet Gao, a contested human colony. Lush jungle world covered in dense alien rainforest canopy of deep blue-green, extensive cave systems, a human colony city visible at a river delta. Warm humid atmospheric haze. Dramatic aerial landscape perspective. 4k painterly concept art.`,
  },
  {
    title: 'Circumstance',
    type: 'planet',
    prompt: `Halo concept art of the planet Circumstance, a mid-tier UNSC colony world. Temperate world with patchwork farmland plains and small industrial cities, blue oceans, white cloud cover. Viewed from low orbit showing continent shapes. Peaceful pre-war atmosphere. 4k painterly concept art.`,
  },
  {
    title: 'Site 17',
    type: 'location',
    prompt: `Halo concept art of Site 17, a remote UNSC military research installation. A classified ONI research outpost built into the side of a rocky alien cliff face, modular prefab blast-resistant structures connected by enclosed walkways, antennae arrays and sensor dishes, UNSC Pelicans on a small landing pad. Overcast grey alien sky. Dramatic moody lighting. 4k painterly concept art.`,
  },
  {
    title: 'Bhedalon',
    type: 'planet',
    prompt: `Halo concept art of Bhedalon, a human colony world in the Outer Colonies. Modest terrestrial world with ochre-tinged plains, scattered scrub vegetation, a small colony settlement with prefab habitation blocks and a landing strip. Remote frontier feel. Wide horizon shot at golden hour. 4k painterly concept art.`,
  },
  {
    title: 'Anvarl',
    type: 'planet',
    prompt: `Halo concept art of Anvarl, a human Outer Colony world. A rocky frontier planet with sparse mineral-rich terrain, small UNSC colony outpost, dust storms on the horizon. Harsh survival environment. Dramatic wide landscape shot under an alien sun. 4k painterly concept art.`,
  },
  {
    title: 'Concord',
    type: 'planet',
    prompt: `Halo concept art of Concord, a human Inner Colony world. Prosperous urbanised world with large city sprawl visible from orbit, surrounded by oceans and green continents. UNSC infrastructure visible. Viewed from low orbit with dawn light catching the city grids. 4k painterly concept art.`,
  },
  {
    title: 'Venezia',
    type: 'planet',
    prompt: `Halo concept art of Venezia, a lawless human colony world and black market haven in the Outer Colonies. Coastal city with a mix of legitimate colony architecture and shanty black-market districts along a grey sea, grey overcast skies. Gritty lived-in atmosphere. 4k painterly concept art.`,
  },
  {
    title: 'Kholo',
    type: 'planet',
    prompt: `Halo concept art of Kholo, a human colony world glassed by the Covenant. A former inhabited world now completely vitrified — seen from orbit as a dark glassy sphere with faint reddish glow at impact craters where the glass is still hot. Haunting dead world. Dramatic space lighting. 4k painterly concept art.`,
  },
];

/** Returns a lore-accurate prompt for a given Halopedia page title, or undefined */
export function getLorePrompt(title: string): string | undefined {
  return LORE_PROMPTS.find(p => p.title === title)?.prompt;
}

/** Returns all titles that have curated lore prompts */
export function getLoreTitles(): string[] {
  return LORE_PROMPTS.map(p => p.title);
}
