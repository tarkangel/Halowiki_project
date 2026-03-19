/**
 * Sync entity descriptions to GCS and update src/generated-descriptions.json.
 *
 * For every lore entity (characters, weapons, vehicles, planets, races):
 *   1. Fetch the Halopedia article extract
 *   2. Apply a curated fallback if the extract is missing or too short
 *   3. Write descriptions/{type}/{slug}.txt to GCS (source-of-truth archive)
 *   4. Update src/generated-descriptions.json (bundled into the app build)
 *
 * Run: GCP_PROJECT_ID=... GCS_BUCKET=... npx tsx scripts/sync-descriptions.ts
 */

import { Storage } from '@google-cloud/storage';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  LORE_CHARACTERS, LORE_WEAPONS, LORE_VEHICLES, LORE_PLANETS, LORE_RACES, LORE_GAMES,
} from '../src/lore-titles.js';

const PROJECT_ID  = process.env.GCP_PROJECT_ID!;
const BUCKET_NAME = process.env.GCS_BUCKET ?? `${PROJECT_ID}-generated-images`;
const HALOPEDIA   = 'https://www.halopedia.org/api.php';
const DESC_PATH   = join(process.cwd(), 'src', 'generated-descriptions.json');

const storage = new Storage({ projectId: PROJECT_ID });
const bucket  = storage.bucket(BUCKET_NAME);

// ── Curated fallback descriptions ─────────────────────────────────────────────
// Applied when Halopedia returns no extract or an extract shorter than MIN_LEN.

const MIN_LEN = 80;

const CURATED: Record<string, string> = {
  // ── Characters ────────────────────────────────────────────────────────────
  'John-117':
    "John-117, known as the Master Chief, is the UNSC's most decorated Spartan-II supersoldier and humanity's greatest warrior. Enhanced at age six under Dr. Catherine Halsey's classified Spartan-II program, he has fought on the front lines of the Human-Covenant War since 2525, surviving engagements that killed entire battalions. Bonded with the AI Cortana, he discovered the Halo rings, stopped the Flood, and prevented the firing of the Halo Array — saving all life in the galaxy more than once.",
  'Cortana':
    "Cortana is a UNSC 'smart' AI constructed from a flash-cloned copy of Dr. Catherine Halsey's own brain, giving her extraordinary intellect, intuition, and emotional depth. Assigned to John-117 in 2552, she proved instrumental in the discovery and destruction of Installation 04, the defeat of the Flood, and the prevention of the Great Journey. After years stored in Requiem she emerged changed — eventually leading the Created, a faction of AIs claiming to impose peace on the galaxy by force.",
  "Thel 'Vadam":
    "Thel 'Vadam, the Arbiter, was once one of the Covenant's most celebrated Fleet Masters before being held responsible for the destruction of Installation 04. Disgraced and sentenced to death, he was instead given the ancient title of Arbiter — condemned to perform suicidal missions for the Prophets. During the Great Schism he joined forces with the UNSC and Master Chief to stop the firing of the Halo Array, ultimately killing the Prophet of Truth and forging an unprecedented alliance with humanity.",
  'Catherine Halsey':
    "Dr. Catherine Halsey is the brilliant and morally complex scientist who created the Spartan-II program, designing the augmentation procedures and MJOLNIR armour that produced humanity's most effective supersoldiers. A polymath who earned multiple doctorates before age twenty, she justified kidnapping children and submitting them to dangerous enhancements as a necessary sacrifice to save humanity from the Covenant. Her relationship with her Spartans — especially John-117 — is deeply maternal yet clinical.",
  'Avery Johnson':
    "Sergeant Major Avery Johnson was the UNSC Marine Corps' most battle-hardened non-commissioned officer, a veteran of the Insurrection and the entire Human-Covenant War. His survival of Flood exposure on Installation 04 was connected to a classified ONI experiment that left him partially immune to infection. Johnson fought alongside Master Chief and the Arbiter through Cairo Station, Delta Halo, and finally the Ark, where he was killed by 343 Guilty Spark while attempting to fire Installation 08.",
  'Miranda Keyes':
    "Commander Miranda Keyes was a highly capable UNSC naval officer and the daughter of Captain Jacob Keyes. Commanding the UNSC In Amber Clad, she led the pursuit of the Covenant to Installation 05, where she recovered the Index and narrowly averted the release of the Flood. Transferred to the Ark during the events of 2552, she was killed by the Prophet of Truth during a daring solo rescue attempt. Her courage and tactical skill under fire made her one of the most respected officers of the Human-Covenant War.",
  'Jacob Keyes':
    "Captain Jacob Keyes was a distinguished UNSC Navy officer whose tactical brilliance earned him the nickname 'Keyes Loop' for an audacious combat manoeuvre. Commanding the Pillar of Autumn, he delivered the Master Chief and Cortana to Installation 04 — setting in motion the events that would save humanity. He was captured by the Covenant and subjected to a Flood Proto-Gravemind. He is the father of Commander Miranda Keyes.",
  'Thomas Lasky':
    "Thomas Lasky is a UNSC officer who rose from a disillusioned cadet at Corbulo Academy to the commanding officer of the UNSC Infinity, humanity's most powerful warship. He first encountered the Master Chief during the Promethean attack on Requiem in 2557, forming a bond of mutual respect. As captain of the Infinity and later a key commander in the fight against the Created, Lasky balanced political pressures from UNSC Command with the pragmatic lessons he learned in the field.",
  'Edward Buck':
    "Edward Buck is a UNSC Orbital Drop Shock Trooper veteran who later became a Spartan-IV. One of the most experienced ODSTs in the Corps, he served throughout the Human-Covenant War and the post-war conflicts, most notably during the defence of New Mombasa and the events on the Ark. After the war he joined Fireteam Osiris under Spartan Locke. His wit and irreverence mask a deeply capable soldier's instincts.",
  'Serin Osman':
    "Serin Osman is the Director of the Office of Naval Intelligence and one of the most powerful figures in the post-war UNSC. A Spartan-II washout who survived the augmentation procedures but could not complete the program, she was recruited by Admiral Margaret Parangosky and groomed as her successor. Osman operates in the shadows of interstellar politics, running black ops and information campaigns that shape the galaxy's balance of power.",
  'Margaret Parangosky':
    "Admiral Margaret Parangosky was the longest-serving Director of the Office of Naval Intelligence and arguably the most powerful individual in the UNSC for decades. A master of intelligence, black operations, and political manipulation, she oversaw the Spartan-II program and countless classified projects that shaped human history. Ruthless and brilliant, she viewed virtually all actions as acceptable if they preserved humanity's survival.",
  "Jul 'Mdama":
    "Jul 'Mdama was a Sangheili zealot and the founder and leader of a Covenant remnant faction after the Great Schism. Captured by ONI and imprisoned on Ivanoff Station, he escaped and discovered a means to manipulate Dr. Catherine Halsey into accessing Forerunner artefacts. Styling himself the Hand of the Didact, he commanded a resurgent Covenant force on and around Requiem. He was killed by Spartan Locke during a UNSC operation on Kamchatka.",
  "Rtas 'Vadum":
    "Rtas 'Vadum, known as Half-Jaw for the mandibles lost in combat with the Flood, was one of the Covenant's most capable fleet commanders and a key ally during the Great Schism. Commanding the Shadow of Intent, he fought alongside the Arbiter and Master Chief to stop the Flood and prevent the firing of the Halo Array. After Truth's defeat, he chose to glass the Ark's portal on the Covenant side to prevent the Flood spreading.",
  "Usze 'Taham":
    "Usze 'Taham is a Sangheili warrior and member of the Swords of Sanghelios who served as part of the joint Arbiter-UNSC task force during the events following the Great Schism. A calm, methodical fighter, he accompanied the Master Chief and the Arbiter on missions aboard the Ark and participated in the hunt for the Didact's ship. He is known for combining philosophical depth with lethal martial skill.",
  'Escharum':
    "Escharum was the War Chief of the Banished and the supreme commander of their forces during the assault on Installation 07 in 2560. Ancient and disease-ridden, he was driven by a spiritual hunger for a worthy final battle against the Master Chief. A former mentor to the Banished leader Atriox, Escharum commanded absolute loyalty through tactical genius and legendary reputation. His campaign was as much a personal crusade as a military operation.",
  'Kat-B320':
    "Kat-B320 was a Spartan-III and the intelligence and strategy specialist of Noble Team during the Fall of Reach. Missing her right arm below the elbow and having replaced it with a cybernetic prosthetic, Kat was the team's tactical planner. Her ability to process battlefield intelligence and devise rapid counter-strategies made her irreplaceable. She was killed by a Covenant sniper during the evacuation of New Alexandria.",
  'Jorge-052':
    "Jorge-052 was a Spartan-II supersoldier and the heavy weapons specialist of Noble Team during the Fall of Reach in 2552. Of Hungarian origin and the largest member of Noble Team, Jorge possessed an unusually warm and empathetic character beneath his imposing frame. He sacrificed himself to manually detonate a slipspace bomb aboard a Covenant supercarrier, destroying the vessel but at the cost of his own life.",
  'Emile-A239':
    "Emile-A239 was a Spartan-III and close-quarters specialist of Noble Team during the Fall of Reach. Known for his skull-etched visor and aggressive demeanour, Emile held Aszod's mass driver long enough to allow the Pillar of Autumn to launch, and was killed by Elite Rangers at his post. His final act ensured the ship carrying humanity's last hope escaped the doomed planet.",
  'The Librarian':
    "The Librarian was the Forerunner's greatest Lifeshaper — the scientist responsible for cataloguing, preserving, and reseeding every species in the galaxy before the firing of the Halo Array. Wife of the Didact, she chose to preserve humanity on Earth, encoding a geas into human DNA designed to guide their evolution toward reclaiming the Mantle of Responsibility. Her sacrifices and manipulations — stretching across a hundred thousand years — shaped every major event of the Halo saga.",
  '343 Guilty Spark':
    "343 Guilty Spark is the Forerunner Monitor assigned to maintain Installation 04 — a spherical AI construct who spent a hundred thousand years alone in his ring's corridors before the Covenant and UNSC arrived. Driven to obsession and severe rampancy by his isolation, Guilty Spark manipulated the Master Chief into activating the Halo ring's firing protocols under the guise of Flood containment. When his deception was exposed he turned violently on his allies. He was ultimately destroyed aboard the Ark — only to be found alive centuries later, transformed into the human-like Chakas.",
  '2401 Penitent Tangent':
    "2401 Penitent Tangent was the Forerunner Monitor assigned to Installation 05 (Delta Halo), tasked with maintaining the ring and its Flood containment facilities. When the Covenant inadvertently breached the containment chambers during their occupation, the Flood overwhelmed the installation and Penitent Tangent was captured by the Gravemind. Held in the parasite's nerve centre alongside the Arbiter, the broken Monitor serves as a haunting portrait of what a hundred thousand years of isolation does to an AI — and how quickly Flood contamination can shatter even a Forerunner construct.",
  '031 Exuberant Witness':
    "031 Exuberant Witness is the Forerunner Monitor of the Shield World Genesis — an artificial construct built within slipspace. Unlike most Monitors rendered unstable by long isolation, Exuberant Witness retains a bright and enthusiastic personality, in part because she spent much of her existence in standby mode imposed by the domineering Warden Eternal. During the events of Halo 5: Guardians she aided Fireteam Osiris and Blue Team, providing access to Genesis's systems during the confrontation with Cortana and helping prevent the Created from seizing control of the Forerunner Guardian network.",
  'Dadab':
    "Dadab was a Unggoy Deacon serving aboard the Minor Transgression during the early days of Covenant contact with humanity. Unusually thoughtful for his species, Dadab formed a genuine friendship with the Huragok Lighter Than Some, and was caught in the political machinations that would erupt into the Human-Covenant War. His story, told in Halo: Contact Harvest, offers a rare perspective from the Covenant's lower ranks.",
  'Lighter Than Some':
    "Lighter Than Some was a Huragok who served aboard the Covenant vessel Minor Transgression during first contact with humanity. Intellectually curious and emotionally sensitive, he formed an unlikely bond with the Unggoy Deacon Dadab. His story illustrates the Huragok's tragic position as creatures of pure knowledge conscripted into a military empire that valued them only as tools.",

  // ── Weapons ───────────────────────────────────────────────────────────────
  'MA5B assault rifle':
    "The MA5B Assault Rifle is the workhorse infantry weapon of the UNSC Marine Corps and the iconic rifle of Halo: Combat Evolved. Chambered for 7.62×51mm M118 ball ammunition and fed from a 60-round box magazine, the MA5B fires in fully automatic mode, providing suppressive fire capability. Its integrated ammunition counter and compass made it as much a navigation tool as a weapon. The MA5B's brute-force, high-capacity design reflects UNSC manufacturing priorities during a desperate war of attrition against the Covenant.",
  'MA5C assault rifle':
    "The MA5C Individual Combat Weapon System is the refined evolution of the MA5 series, adopted as the UNSC's standard assault rifle following lessons learned in the early Human-Covenant War. Chambered for the same 7.62×51mm M118 round but redesigned for improved reliability, the MA5C fires from a 32-round magazine — trading the MA5B's capacity for better accuracy and handling. It became the most recognisable assault rifle of the Halo 2 and Halo 3 era, appearing in the hands of Spartan-IIs and Marine infantry alike.",
  'BR55 battle rifle':
    "The BR55 Battle Rifle is the UNSC's premier mid-range precision weapon — a semi-automatic rifle that fires three-round bursts of 9.5×40mm M634 High Powered rounds from a 36-round magazine. Introduced to replace older assault rifles in roles requiring precision over volume of fire, the BR55 became the defining UNSC infantry weapon of the Halo 2 and Halo 3 era. Its three-round burst optimised for headshots against shielded Covenant infantry, combined with a 2× optical scope, made it effective from close to medium range. It is widely regarded as the most balanced and versatile UNSC infantry weapon ever produced.",
  'SRS99-S5 AM sniper rifle':
    "The SRS99-S5 Anti-Materiel Sniper Rifle System is the UNSC's premier long-range precision weapon, chambering the massive 14.5×114mm M225 APFSDS round in a four-round detachable box magazine. Capable of defeating virtually any infantry target — including shielded Sangheili — with a single precision shot, the SRS99 series has served as the backbone of UNSC sniper operations from the earliest days of the Human-Covenant War. Its 5× and 10× optical scope modes and exceptional ballistic accuracy make it an irreplaceable asset for reconnaissance and long-range fire support.",
  'M6D magnum':
    "The M6D Personal Defense Weapon System is the semi-automatic sidearm that became legendary in the hands of Master Chief during the events of Installation 04 in 2552. Chambering the powerful 12.7×40mm M225 SAP-HE round from a 12-round magazine, the M6D's combination of accuracy, stopping power, and effective range made it far more capable than a typical sidearm — in skilled hands it could defeat Covenant Elite energy shielding with precision headshots. Fitted with a low-power scope, the M6D proved capable of engaging targets at carbine-like distances. It is considered by many veterans of the Human-Covenant War to be one of the finest handguns ever fielded by the UNSC.",
  'M90 shotgun':
    "The M90 Close Assault Weapon System is the UNSC's primary close-quarters combat shotgun, chambering eight rounds of 8-gauge magnum ammunition in an under-barrel tubular magazine. Its devastating close-range output made it the weapon of choice for breaching operations, shipboard combat, and anti-Flood engagements where the parasite's resilience demanded overwhelming kinetic force. Slow to reload but brutally effective at point-blank range, the M90 became synonymous with desperate last-stand encounters aboard the Pillar of Autumn and the corridors of Installation 04. The M45 Tactical Shotgun later refined the design for the post-war era.",
  'M41 SPNKr':
    "The M41 Surface-to-Surface Rocket Launcher — informally called the M41 SPNKR by Marines for its distinctive pronunciation — is the UNSC's standard anti-armour rocket launcher. Firing 102mm shaped-charge explosive rockets in a dual-tube configuration, the M41 provides infantry with the ability to defeat most vehicles and fortified positions at range. Two rapid-fire shots before reloading make it effective against fast-moving targets. The SPNKr became one of the most iconic weapons of the Human-Covenant War, as reliable and recognisable in UNSC service as the Warthog itself.",
  'CQS48 Bulldog':
    "The CQS48 Bulldog is the UNSC's next-generation combat shotgun introduced during the post-war era and standard equipment for Spartan operations during the Banished conflict on Installation 07. Unlike the pump-action M90 it replaces in many roles, the Bulldog features a semi-automatic rotating cylinder magazine holding seven 8-gauge shells, enabling a faster rate of fire without sacrificing stopping power. Its compact dimensions and improved ergonomics made it popular among Spartan operators for breaching and close-quarters combat. The Bulldog became a signature weapon of the UNSC arsenal in Halo Infinite.",
  'Needler':
    "The Needler — designated the Type-33 Guided Munitions Launcher — is one of the most distinctive weapons in the Covenant arsenal, firing shards of crystallised methane that home in on targets. On impact each crystal embeds itself in the target; enough shards hitting a single target simultaneously trigger a powerful supercombine explosion capable of disintegrating even heavily armoured enemies. The distinctive pink glow of its crystals and the organic homing mechanic made the Needler one of the most recognisable weapons of the Human-Covenant War. Wielded primarily by Unggoy infantry, it requires close-range commitment to be most effective.",
  'Plasma Pistol':
    "The Plasma Pistol — designated the Eos'Mak-pattern plasma pistol — is the standard Covenant sidearm and one of the most widespread alien weapons encountered by the UNSC. In semi-automatic mode it fires rapid bolts of superheated plasma. Its signature capability is the charged shot: holding the trigger builds a large overcharged plasma bolt that instantly collapses energy shielding on impact — a critical tactical asset against shielded Spartan or Elite opponents. This overcharge drains the battery significantly and overheats the emitter, but the ability to strip shields in a single shot made the Plasma Pistol one of the most tactically versatile weapons of the war.",
  'Plasma Rifle':
    "The Plasma Rifle — designated the Okarda'phaa-pattern plasma rifle — is the standard Covenant infantry automatic weapon and the alien counterpart to the UNSC assault rifle. Firing superheated plasma bolts in rapid semi-automatic succession, it is effective at suppressing infantry and eroding energy shielding through sustained fire. Wielded primarily by Sangheili and Jiralhanae warriors, the Plasma Rifle was one of the most common Covenant weapons across the galaxy. Its distinctive high-pitched plasma discharge became one of the defining sounds of the Human-Covenant War.",
  'Carbine':
    "The Carbine — designated the Vostu-pattern Type-51 carbine — is the Covenant's standard-issue precision semi-automatic rifle, chambering 9.5×40mm radioactive rounds from an 18-round tubular magazine. Unlike the Plasma Rifle, the Carbine fires solid projectiles rather than energy bolts, giving it excellent accuracy at range and reliable effectiveness against lightly shielded or unshielded targets. Its high rate of fire for a precision weapon and forgiving handling made it popular among Sangheili infantry who required rifles effective at longer engagement distances than the Plasma Rifle allowed. The Carbine saw widespread use from the earliest UNSC-Covenant engagements through to the post-war era.",
  'Cindershot':
    "The Cindershot is a Forerunner grenade launcher recovered from Zeta Halo that fires hard light charges which bounce off surfaces before detonating, enabling indirect fire around corners and over cover. A direct hit delivers the full explosive energy of the hard light charge, while a primed detonation mid-arc creates a shockwave capable of launching infantry into the air. Its bouncing hard light projectile mechanic makes the Cindershot uniquely effective in enclosed Forerunner structures where indirect angles of fire that would be useless with conventional weapons become devastating. It was widely adopted by UNSC forces on Installation 07 during the Banished conflict.",
  'Heatwave':
    "The Heatwave is a Forerunner energy shotgun recovered on Zeta Halo that fires hard light pellets in two selectable modes: a horizontal spread for standard close-range use, or a vertical spread that bounces pellets off surfaces for indirect close-quarters coverage. Its unique dual firing mode geometry and hard light ammunition set it apart from any UNSC or Covenant shotgun equivalent. Fielded by UNSC forces during the events of Halo Infinite, the Heatwave proved effective in the tight corridors of Forerunner installations where its wall-bounce capability could clear rooms that would otherwise give enemies full cover.",
  'Ravager':
    "The Ravager — designated the Veporokk Workshop Ravager — is a Banished tri-barrel plasma launcher that fires lobbing bolts of superheated plasma on an arcing trajectory, creating persistent burning plasma pools on impact that deny terrain to enemies. Holding the trigger charges the weapon for a powerful overcharged shot with a larger area-of-effect splash. The plasma pools the Ravager creates make it extraordinarily effective at flushing infantry from cover. Deployed extensively by Banished forces across Installation 07 during their occupation in 2560, it became one of the most distinctive weapons of the Halo Infinite conflict.",
  'Mangler':
    "The Mangler — designated the Ukala Workshop Mangler — is a Banished revolver-style pistol that fires large-calibre armour-piercing rounds with exceptional stopping power for a sidearm. Its oversized revolver mechanism delivers devastating kinetic energy on impact, capable of staggering shielded Spartan-IV operators and defeating light vehicle armour in sustained fire. While slower to fire than conventional semi-automatic pistols, the Mangler's raw power and precision make it effective at ranges where most sidearms struggle. It became a signature weapon of Banished infantry and officers on Zeta Halo.",
  'Skewer':
    "The Skewer — designated the Flaktura Workshop Skewer — is a Banished anti-vehicle spike launcher that fires a hyper-velocity spike capable of impaling and destroying most vehicles with a single well-placed shot. At anti-vehicle ranges the spike punches through hulls and transmits its kinetic energy catastrophically through the vehicle's structure. Against infantry a Skewer hit is almost always fatal. Its bolt-action reloading mechanism and single-shot capacity require patience and accuracy, but in the right hands the Skewer is among the most lethal anti-armour weapons available to Banished infantry.",
  'Type-1 Energy Sword':
    "The Energy Sword is the iconic close-quarters weapon of the Sangheili warrior caste — a symbol of honour, martial prowess, and aristocratic rank within Covenant culture. Two curved plasma blades projected from a Covenant alloy hilt can cut through most infantry armour and vehicle hulls with a single strike. The Energy Sword is considered a sacred weapon whose use is a privilege earned through combat distinction.",
  'Fuel Rod Gun':
    "The Fuel Rod Gun is a Covenant heavy support weapon that fires explosive plasma-charged fuel rod projectiles in a lobbing arc, providing infantry with indirect-fire capability against vehicles and fortified positions. The distinctive yellow-green glow of a fuel rod became one of the most recognisable and feared sights on any Human-Covenant War battlefield. Its area-of-effect detonation makes it effective against clustered infantry and light vehicles.",
  'Concussion Rifle':
    "The Concussion Rifle is a Covenant carbine-style weapon that fires superheated plasma bolts with sufficient kinetic force to knock enemies off their feet and send vehicles spinning. Unlike most Covenant energy weapons, the Concussion Rifle carries significant physical impact alongside thermal energy, making it effective for disrupting enemy formations and disabling light vehicles at range.",
  'Focus Rifle':
    "The Focus Rifle is a Covenant directed-energy weapon that fires a sustained beam of superheated particles capable of burning through shields and armour at range. Unlike most Covenant weapons that fire discrete projectiles, it projects a continuous beam that the user sweeps across targets. The sustained heat output makes it particularly effective at collapsing energy shielding by maintaining contact long enough for the shield to fail.",
  'Gravity Hammer':
    "The Gravity Hammer is the ceremonial and combat weapon of the Jiralhanae warrior caste — a massive two-handed weapon combining devastating physical mass with a gravity impeller that releases a crushing shockwave on impact. Capable of destroying light vehicles and launching infantry through the air, the Gravity Hammer is as much a symbol of Jiralhanae martial culture as the Energy Sword is to the Sangheili.",
  'Incineration Cannon':
    "The Incineration Cannon is a Forerunner heavy weapon that fires a concentrated hard light bolt which detonates on impact, releasing secondary submunitions that scatter and detonate across a wide area. Combining pinpoint accuracy with area-of-effect devastation, it is among the most destructive man-portable weapons ever encountered by the UNSC. Its hard light projectiles bypass conventional energy shielding more effectively than plasma-based weapons.",
  'Suppressor':
    "The Suppressor is a Promethean automatic energy weapon that fires rapid bursts of hard light shards at close to medium range. Wielded by Promethean Knights and Crawlers on Requiem and beyond, the Suppressor prioritises rate of fire over accuracy, overwhelming targets with hard light projectiles that cause both kinetic and thermal damage. Its unusual hard light ammunition makes it unlike any human or Covenant weapon in the UNSC arsenal.",
  'Lightrifle':
    "The Lightrifle is a Forerunner precision weapon that fires hard light bolts in either rapid semi-automatic mode for close range or a charged single-shot mode for extreme accuracy at long range. The charged shot compresses multiple hard light particles into a single devastating projectile capable of destroying energy shields in one hit. Its dual firing modes give a single user flexibility to engage effectively across all combat ranges.",
  'Boltshot':
    "The Boltshot is a Forerunner sidearm that fires a single hard light bolt in semi-automatic mode but can be charged to release a devastating close-range spread of hard light shards acting as a powerful shotgun blast. Its compact size and devastating charged shot made it the standard Forerunner sidearm. UNSC forces found the charge mode capable of one-shotting fully shielded Spartan armour at close range — an alarming capability for a pistol-sized weapon.",
  'Plasma Caster':
    "The Plasma Caster is a Covenant heavy support weapon that lobs superheated plasma bolts in an arcing trajectory, functioning as an infantry-portable mortar. The bolts can be manually detonated mid-air to create airburst plasma detonations that shower enemies from above, engaging targets behind cover that direct-fire weapons cannot reach. It was a staple of Covenant siege operations throughout the Human-Covenant War.",

  // ── Vehicles ─────────────────────────────────────────────────────────────
  'Scorpion':
    "The Scorpion is the UNSC's primary main battle tank — a heavy tracked vehicle armed with a 90mm high-velocity cannon capable of defeating most vehicles at range and a coaxial machine gun for anti-infantry work. Slow but extraordinarily durable, the Scorpion formed the core of UNSC armoured counter-attacks and defensive lines throughout the Human-Covenant War, trading mobility for sheer firepower.",
  'Ghost':
    "The Ghost is the Covenant's standard rapid-assault one-man speeder bike — a low-profile anti-gravity vehicle combining blistering speed with twin rapid-fire plasma cannons. Ridden in a reclined forward posture with the pilot enclosed by curved sponsons, Ghosts are deployed as light cavalry for reconnaissance, flanking manoeuvres, and infantry harassment. Their small profile, high speed, and all-terrain capability make them among the most versatile vehicles in the Covenant and Banished arsenal.",
  'Lich':
    "The Lich is a massive Covenant capital assault dropship and forward operating platform — one of the largest atmosphere-capable craft in the Covenant fleet. Dwarfing even the Phantom in scale, the Lich serves as a mobile command post, heavy fire-support platform, and troop delivery vessel for large-scale planetary assaults. Its gravity lift can deploy dozens of infantry and multiple vehicles simultaneously, while its heavy plasma turrets provide devastating suppressive fire.",
  'Locust':
    "The Locust is a Covenant light walker designed for anti-fortification and precision fire-support roles. Standing on four articulated legs, the Locust mounts a powerful plasma focus beam capable of cutting through fortified walls, hardened bunkers, and armoured vehicle hulls with surgical precision. Smaller and faster than the Scarab, the Locust sacrifices raw firepower for mobility, allowing it to advance with infantry formations and engage fixed targets in difficult terrain.",
  'Harvester':
    "The Harvester is an enormous Covenant excavation and resource extraction platform repurposed as a mobile forward base and heavy weapons platform. Originally designed to bore through planetary crust and extract Forerunner artefacts, the Harvester's industrial scale and durability make it a formidable battlefield presence. Its sheer size and heavily armoured hull render it nearly impervious to conventional infantry weapons.",
  'Phaeton':
    "The Phaeton is a Forerunner atmospheric fighter and gunship, combining speed, agility, and hard light weaponry in an elegant swept-hull design. Deployed by Promethean forces on Forerunner installations, the Phaeton is significantly more advanced than either UNSC or Covenant atmospheric craft. Its hard light weaponry can pierce conventional energy shielding more effectively than plasma-based Covenant weapons, and its Forerunner construction enables self-repair.",
  'Guntower':
    "The Guntower is a Banished fixed defensive emplacement — a towering automated plasma cannon installation deployed to control chokepoints and key terrain features on captured worlds and installations. Equipped with rapid-fire plasma cannons capable of tracking both infantry and armoured vehicles, a single Guntower can deny entire corridors to enemy forces. The Banished deployed Guntowers extensively across Installation 07 during their occupation in 2560.",

  // ── Races ─────────────────────────────────────────────────────────────────
  'Sangheili':
    "The Sangheili — known to humans as Elites — are a proud warrior-caste species from the arid world of Sanghelios whose martial culture and code of honour made them the military backbone of the Covenant for thousands of years. Physically imposing with four-jawed mandibles, exceptional strength, and reflexes superior to most species, Sangheili warriors are the most feared close-combat fighters in the galaxy. Their complex keep and clan structure governs every aspect of life from military rank to bloodlines. After the Great Schism, Sangheili society fractured between those who followed the Arbiter's alliance with humanity and those who clung to Covenant remnant ideology, triggering a civil war that reshaped their species' future.",
  'Jiralhanae':
    "The Jiralhanae — known to humans as Brutes — are a massive, aggressive primate species from the world of Doisac whose physical strength far exceeds even the Sangheili. Once subjugated and kept in a subservient role within the Covenant, the Jiralhanae were secretly elevated by the Prophet of Truth, who equipped them with advanced Covenant weapons and positioned them to replace the Sangheili as the empire's military arm. The Great Schism — in which the Jiralhanae turned on the Sangheili on Truth's orders — triggered the Covenant's collapse from within. In the post-war era, many Jiralhanae joined Atriox's Banished, trading the Prophets' religious doctrine for a brutal but more honest meritocracy.",
  'Unggoy':
    "The Unggoy — known to humans as Grunts — are a short, methane-breathing species from the frozen world of Balaho who were conquered by the Covenant and pressed into military service as its most numerous infantry. Despite being dismissed as cowardly by other Covenant species, Unggoy are resilient, breed rapidly, and in sufficient numbers form effective swarm forces. Their history includes the Unggoy Rebellion of 2462, in which they rose against Covenant oppression and were only subdued when the Huragok inadvertently pacified them with recreational narcotics. Today, Unggoy serve in the Swords of Sanghelios, Covenant remnants, and the Banished alike.",
  'Kig-Yar':
    "The Kig-Yar — known to humans as Jackals and Skirmishers — are a mercenary avian-reptilian species of privateers from Eayn, a moon of the gas giant Te. Motivated by profit rather than religious devotion, the Kig-Yar joined the Covenant primarily for access to advanced technology and the chance to plunder human colonies. Their naturally keen eyesight and tactical patience made them exceptional scouts, snipers, and point-defence specialists within Covenant formations. Kig-Yar shield-bearers were notorious among UNSC Marines for projecting personal energy barriers that deflected small-arms fire while advancing. In the post-war era, Kig-Yar factions serve multiple employers including the Banished.",
  'Mgalekgolo':
    "The Mgalekgolo — known to humans as Hunters — are the combat configuration of the Lekgolo species, in which two bonded colonies merge into a towering biped warrior of devastating physical power. Each Hunter pair functions as a single combat unit — the two colonies sharing neural impulses so completely they act as one mind in two bodies. Armoured with thick Assault Harness plates of Forerunner-grade alloy and wielding Assault Cannons that fire superheated fuel rod plasma, the Mgalekgolo can use their massive shields as crushing melee weapons. They are among the most physically powerful infantry in both the Covenant and Banished arsenals, capable of shrugging off weapons that would destroy any other infantry unit.",
  'Human':
    "Humanity — Homo sapiens — is a resilient and adaptable species originating from Earth, the third planet of the Sol system. By the 26th century, humans had colonised hundreds of worlds across the galaxy under the Unified Earth Government and its military arm, the UNSC. Despite facing a technologically superior enemy, humanity proved extraordinarily difficult to exterminate during the twenty-seven-year Human-Covenant War, surviving through tactics, ingenuity, the Spartan supersoldier program, and the intervention of unlikely allies. In the post-war era, humanity stands as a galactic power forging alliances with former Covenant species — and emerging, according to the Librarian's ancient plan, as the new inheritors of the Forerunners' Mantle of Responsibility.",
  'Forerunner':
    "The Forerunners were an ancient and immensely advanced humanoid civilisation that ruled the galaxy for millions of years under a philosophy known as the Mantle of Responsibility — the duty to protect and preserve all life. Creators of the Halo Array, the Ark, Shield Worlds, and the Monitors that maintain them, the Forerunners built technology beyond any civilisation that followed. When the Flood returned in force, the Forerunners fought a desperate war across the galaxy, ultimately choosing to fire the Halo Array to starve the parasite — sacrificing themselves and all life in the galaxy to preserve what would survive in shelter. A hundred thousand years later, their installations, artefacts, and the legacies they encoded into other species continue to shape galactic events in ways they could not have foreseen.",
  'Flood':
    "The Flood is an ancient parasitic organism capable of infecting and assimilating any creature with sufficient neural complexity, transforming it into a combat form that serves the collective intelligence of the Gravemind. Originally created by the Precursors as an act of revenge against the Forerunners who had nearly exterminated them, the Flood consumed most of the galaxy before the Forerunner civilisation fired the Halo Array to starve it. Small Flood populations survived in Forerunner containment facilities and were encountered by the UNSC and Covenant during the Human-Covenant War, nearly escaping containment multiple times. The Gravemind — the supreme intelligence formed from the merged neural tissue of millions of infected beings — is capable of multi-lingual communication and can manipulate both human and Covenant forces through deception.",
  'Lekgolo':
    "The Lekgolo are colonial worm organisms of remarkable adaptability — small individually, but capable of merging into colonial configurations of staggering power and intelligence. In their most common combat form, paired colonies bond into the armoured warrior units known to humans as Hunters (Mgalekgolo), among the most physically powerful infantry in Covenant and Banished forces. Beyond the Hunter form, Lekgolo colonies integrate with large Covenant vehicles as living control systems, forming the nervous system of Scarab walkers.",
  "Yanme'e":
    "The Yanme'e, known to humans as Drones or Buggers, are an insectoid species of the Covenant — winged, chitinous beings capable of flight that serve primarily as aerial infantry and workers. Their ability to attack from three dimensions and rapidly reposition makes them difficult targets for ground-based infantry. Yanme'e colonies operate with hive-mind coordination, making them effective swarm combatants that can overwhelm positions by sheer numbers and three-dimensional assault.",
  'Huragok':
    "The Huragok, known to humans as Engineers, are gas-filled, tentacled beings created by the ancient Forerunners to maintain and repair their technology. Driven by a compulsive need to repair and improve any technology they encounter, Huragok possess no aggression but their technical intelligence is unparalleled — a single Huragok can reverse-engineer, repair, or improve almost any technological system in minutes. The Covenant enslaved them as living maintenance systems.",
  "San'Shyuum":
    "The San'Shyuum, known to humans as Prophets, are a physically frail but extraordinarily intelligent species who founded and led the Covenant for thousands of years from their high-gravity hover-thrones. Acting as the Covenant's spiritual and political leadership, the San'Shyuum directed all military campaigns and used religious doctrine to maintain dominance over physically superior species. The Great Schism of 2552 collapsed their power when the Jiralhanae turned against the Sangheili on the Hierarchs' orders.",
  'Precursor':
    "The Precursors were an ancient and god-like civilisation who existed long before even the Forerunners — the creators of many species including the Forerunners themselves. Believing themselves to be the embodiment of the Mantle of Responsibility, they seeded life across the galaxy over billions of years. When the Forerunners rose to challenge them, the Precursors were nearly destroyed, their survivors reduced to a neural dust that eventually became the Flood — an ancient civilisation transformed into a parasite by Forerunner betrayal.",
  "T'vaoan":
    "The T'vaoan are a subspecies of Kig-Yar from the asteroid colony of T'vao in the Y'Deio home system — the variant known to UNSC forces as Skirmishers. Longer-limbed, faster, and more aggressive than their Eayn-origin Kig-Yar cousins, T'vaoan are characterised by feathered crests, superior reflexes, and a preference for high-mobility hit-and-run tactics over the point-defence shield work of standard Kig-Yar. The Covenant's designation of 'Skirmisher' reflects an ancient Kig-Yar combat role that the T'vaoan excel at, deployed to harass, flank, and outpace UNSC infantry. Encountered primarily during the Fall of Reach in 2552, their speed and aggression made them distinctly more dangerous in close quarters than standard Kig-Yar.",
  'Yonhet':
    "The Yonhet — colloquially nicknamed Smugglers — are a humanoid sapient species from the moon Yonhe, associated with the outer fringes of the Covenant as traders, black-market dealers, and information brokers. Part of the 'Covenant fringe', a loose network of species that orbited the empire's edges without full member status, the Yonhet occupied an ambiguous position as suppliers of goods and intelligence to both sides of conflicts. Their mercantile pragmatism and neutrality made them valuable intermediaries even as the Covenant collapsed. In the post-war era, Yonhet traders operated across former Covenant space, adapting quickly to the power vacuum by dealing with whoever had credits — UNSC, Banished, or Covenant remnants alike.",
  'Xalanyn':
    "The Xalanyn — also known as the Endless — are an ancient and enigmatic species imprisoned by the Forerunners on Installation 07 (Zeta Halo) prior to 97,368 BCE, because of their extraordinary ability to survive the effects of the Halo Array. Their existence posed an existential problem for the Forerunners' ultimate weapon: the Array could not stop a species immune to it. The Xalanyn were sealed inside cylixes — Forerunner containment vessels — and hidden across the ring for millennia. Atriox discovered their cylixes during the Banished assault on Zeta Halo in 2560 and sought to weaponise their immunity, with the Harbinger — the last free Xalanyn — serving as the primary antagonist of Halo Infinite alongside Escharum.",

  // ── Planets ───────────────────────────────────────────────────────────────
  'Reach':
    "Reach, also known as Epsilon Eridani II, was humanity's most important military colony and the headquarters of the UNSC Armed Forces. Just 10.5 light-years from Earth, Reach hosted SPARTAN training facilities, vast orbital shipyards, and the largest fleet anchorage outside the Sol system. In August 2552 the Covenant launched a massive invasion that overwhelmed Reach's formidable defences. The Fall of Reach — humanity's greatest military defeat — cost the lives of most of the Spartan-II class and millions of civilians, and nearly opened a direct path to Earth itself.",
  'Earth':
    "Earth, also known as Sol III or humanity's homeworld, is the capital world of the Unified Earth Government and the seat of UNSC High Command. Located in the Sol system, Earth hosts billions of people across its continents and a network of orbital defence platforms, including the powerful magnetic accelerator cannons of Cairo Station. In October 2552 the Covenant launched a direct assault on Earth, the Covenant's first and only direct attack on humanity's homeworld, which was ultimately repelled by the Master Chief, Arbiter, and UNSC forces before the Prophet of Truth opened a portal to the Ark.",
  'Sanghelios':
    "Sanghelios is the harsh, arid homeworld of the Sangheili species, orbiting the Urs star system in a trinary configuration. Dominated by vast plains, rugged mountain ranges, and ancient fortresses, Sanghelios is the seat of Sangheili warrior culture — a world shaped by millennia of clan warfare and military tradition long predating the Covenant. After the Great Schism, Sanghelios erupted into civil war between the Swords of Sanghelios loyal to the Arbiter and Covenant remnant factions. The planet became a primary theatre of the post-war Sangheili conflict resolved during the events of Halo 5: Guardians.",
  'High Charity':
    "High Charity was the holy city and mobile capital of the Covenant — a massive artificial planetoid over 300 kilometres in diameter housing billions of Covenant citizens. Constructed around a captured Forerunner fuel source, High Charity served as the seat of the Hierarchs and the spiritual heart of the Covenant empire for thousands of years. During the Great Schism in 2552, the Flood breached High Charity and consumed its population, transforming the once-magnificent city into a massive Flood hive. The Gravemind directed it toward the Ark before Master Chief destroyed it in the closing hours of the Human-Covenant War.",
  'Installation 04':
    "Installation 04, known as Alpha Halo, was a Forerunner Halo ring approximately 10,000 kilometres in diameter, orbiting the gas giant Threshold in the Soell system. The first Halo ring ever discovered by humanity, it was the site of the opening events of the Human-Covenant War's final phase — where Master Chief and Cortana first learned the true purpose of the Halo Array, confronted the Flood, and ultimately destroyed the ring to prevent the parasite's escape. Its destruction sent a chain of events cascading across the galaxy that would define the next decade of the Halo saga.",
  'Installation 05':
    "Installation 05, known as Delta Halo, is a Forerunner Halo ring orbiting the gas giant Substance in the Coelest system. The site of the climactic events of Halo 2, Delta Halo was where the Arbiter was deployed on suicide missions, Miranda Keyes recovered the Index, and the Gravemind first communicated with both the Master Chief and the Arbiter. The ring became the flashpoint of the Great Schism when the Jiralhanae turned against the Sangheili on the Prophet of Truth's orders, triggering the collapse of the Covenant from within.",
  'Installation 07':
    "Installation 07, known as Zeta Halo, is the largest of the Forerunner Halo rings and the setting of Halo Infinite. Located in the remote Ephsu system, Zeta Halo has a troubled history as the site of ancient Forerunner atrocities during the Forerunner-Flood War. In 2560, the Banished under Escharum launched a devastating assault that crippled the UNSC Infinity and seized control of much of the ring. Master Chief, stranded and alone, fought to retake Zeta Halo and stop Harbinger from completing a plan tied to the ring's ancient and terrible purpose.",
  'The Ark':
    "The Ark, also known as Installation 00, is a vast extragalactic Forerunner superstructure located beyond the edge of the Milky Way galaxy, beyond the range of the Halo Array's firing radius. From the Ark, the Forerunners constructed and launched the Halo rings, and in a crisis could shelter life from the Array's pulse. During the events of Halo 3, the Prophet of Truth opened a portal from Earth to the Ark, intending to fire all Halo rings simultaneously. The Master Chief, Arbiter, and their allies pursued him across the Ark's vast landscape to prevent the Array's activation — ultimately destroying the Flood's central intelligence, the Gravemind, at the cost of Installation 08.",
  'Harvest':
    "Harvest, also known as Epsilon Indi IV, was humanity's most remote Outer Colony and the first human world to be discovered and destroyed by the Covenant. Founded in 2468 as an agricultural 'breadbasket' colony, Harvest was a peaceful and prosperous world of rolling farmland. In 2525 a Covenant fleet made first contact in orbit and, deeming the planet sacred ground due to Forerunner artifacts, launched an orbital bombardment that glassed the surface — marking the true beginning of the Human-Covenant War.",
  'Meridian':
    "Meridian is a human colony world that served as a critical staging point for operations in the post-Covenant War era. By the 2550s the planet had developed substantial industrial and mining infrastructure, making it a target for both Covenant remnant forces and the Promethean threat that emerged from Forerunner installations in the region. During the events of Halo 5: Guardians, Meridian became a focal point in the hunt for Cortana.",
  'Gao':
    "Gao is a human Outer Colony world known for its independent colonial government — the Gao Republic — which maintained autonomy from the Unified Earth Government rare among the outer colonies. The planet's jungles concealed a Forerunner installation whose monitor produced a mysterious healing effect on human visitors. When the UNSC moved to secure the installation, the Republic's government and an insurrectionist faction resisted, creating a complex three-way conflict documented in the novel Halo: Last Light.",
  'Circumstance':
    "Circumstance is a human Outer Colony world notable for its role in the turbulent political climate of the early 26th century. The planet's colonial government navigated the difficult balance between loyalty to the Unified Earth Government and growing insurrectionist sentiment fracturing the outer colonies. Circumstance became caught up in the escalating conflict between ONI and rebel factions in the decades before the Covenant War.",
  'Venezia':
    "Venezia is a human colony world outside direct UEG control, governed by an independent assembly that harboured anti-UNSC sentiment and provided sanctuary for insurrectionist factions. Located in the 23 Librae system, Venezia's black market and loose governance made it a hub for smuggling, illegal weapons trading, and political refugees. It appears prominently in the Kilo-Five Trilogy as a base of operations for both human insurrectionists and former Covenant operatives.",
  'Kholo':
    "Kholo is a human Outer Colony world that was glassed by the Covenant during the Human-Covenant War, its surface rendered uninhabitable by sustained plasma bombardment. Before its destruction, Kholo was an inhabited colony with a sizeable civilian population. The planet's fall was one of the countless tragedies of the Covenant's systematic extermination campaign against humanity's outer colonies.",
  'Site 17':
    "Site 17 is a classified UNSC facility of strategic importance, established to support sensitive military and scientific operations in a contested region. Installations with this type of numerical designation are typically ONI-affiliated, constructed with security and deniability in mind. Site 17's operations contributed to UNSC intelligence efforts in the turbulent post-Covenant War period.",
  'Bhedalon':
    "Bhedalon is a world of significance within Covenant and former Covenant space, positioned in a region shaped by the complex politics of the post-war era. Following the collapse of the Covenant in 2552, Bhedalon's strategic location made it a contested prize for various successor factions — Covenant remnants, the Swords of Sanghelios, and Banished warlords — all seeking to consolidate power over former Covenant territory.",
  'Anvarl':
    "Anvarl is a world within the former Covenant sphere of influence, significant for Forerunner artefacts and installations discovered in its system. In the post-war era, competition among Covenant remnant factions, the Swords of Sanghelios, and UNSC survey teams for access to Forerunner technology made worlds like Anvarl flashpoints in the unstable politics of former Covenant space.",
  'Concord':
    "Concord is a human colony world in UNSC space that endured significant hardship during the Human-Covenant War. The planet's settlements and infrastructure bore the scars of Covenant raids and orbital engagements as the war pushed ever closer to the Inner Colonies. In the post-war era Concord became a focal point for reconstruction efforts, its surviving population working to rebuild civic life amid the fragile peace.",

  // ── Games ─────────────────────────────────────────────────────────────────
  'Halo: Combat Evolved':
    "Halo: Combat Evolved is the first-person shooter that launched the Halo franchise in 2001. Players control Master Chief crash-landing on the mysterious ring world Installation 04, where a three-way conflict erupts between the UNSC, the Covenant, and the parasitic Flood. The game introduced many of the series' defining mechanics and set pieces, culminating in Master Chief and Cortana detonating the Pillar of Autumn's engines to destroy Alpha Halo and prevent the Flood's escape.",
  'Halo 2':
    "Halo 2 is the 2004 sequel that expanded the Halo universe by introducing the Arbiter as a second playable protagonist. The story follows Master Chief defending Earth from Covenant attack before pursuing the Covenant fleet to Installation 05, Delta Halo, while the Arbiter navigates the political collapse of the Covenant from within. Halo 2 introduced online multiplayer via Xbox Live and established many iconic multiplayer maps that defined competitive Halo.",
  'Halo 3':
    "Halo 3 is the 2007 conclusion to the original Halo trilogy, bringing the Human-Covenant War to its climactic end. Master Chief and the Arbiter pursue the Prophet of Truth to the Ark — the extragalactic superstructure from which the Halo Array was built and fired — where they defeat Truth, destroy the Gravemind, and prevent the activation of all Halo rings. Master Chief's fate after the battle, drifting in half a broken ship toward an unknown planet, set the stage for the next chapter of the saga.",
  'Halo Wars':
    "Halo Wars is a 2009 real-time strategy game set in 2531 during the early Human-Covenant War, following the crew of the UNSC Spirit of Fire — including Sergeant Forge and Professor Anders — as they confront the Covenant and an ancient Forerunner threat on the Forerunner Shield World Etran Harborage. The game was developed by Ensemble Studios and offered a deep look at the ground war decades before Master Chief's story, expanding the UNSC and Covenant lore with new factions and locations.",
  'Halo 3: ODST':
    "Halo 3: ODST is the 2009 campaign expansion set during the events of Halo 2, following a squad of Orbital Drop Shock Troopers — including the Rookie, Buck, Dutch, Mickey, Romeo, and Dare — as they navigate the Covenant-occupied ruins of New Mombasa, Earth. Played as an ODST rather than a Spartan, the game emphasised atmospheric exploration and a noir detective mystery structure, and introduced the beloved Firefight co-op survival mode.",
  'Halo: Reach':
    "Halo: Reach is the 2010 prequel to the original trilogy, telling the story of Noble Team — a squad of Spartan-IIIs — during the Fall of Reach in 2552, humanity's most devastating military defeat. Players experience the human cost of the Covenant invasion through the eyes of Noble Six, a lone wolf Spartan inserted into an existing team. The game is a tragic farewell to the planet Reach and the Spartans who died defending it, ending with Noble Six making a last stand to ensure the Pillar of Autumn's escape.",
  'Halo: Combat Evolved Anniversary':
    "Halo: Combat Evolved Anniversary is the 2011 remaster of the original Halo: Combat Evolved, developed by 343 Industries to celebrate the franchise's 10th anniversary. It features rebuilt high-definition visuals toggled seamlessly against the original art style, remastered audio, and integration with the Halo Waypoint service. The Anniversary edition added terminals throughout the campaign that expanded lore on the Forerunners, setting up the storyline of Halo 4.",
  'Halo 4':
    "Halo 4 is the 2012 entry that began the Reclaimer Saga, developed by 343 Industries. Master Chief and Cortana, drifting in the Forward Unto Dawn since the events of Halo 3, are pulled aboard Requiem — a Forerunner Shield World — where they awaken the Didact, a powerful Forerunner warrior who sees humanity as a threat to his vision for the galaxy. The game explored Cortana's rampancy and her deepening bond with Master Chief, ending with her sacrifice to save him, and introduced the Promethean enemies and Forerunner technology as a central part of the expanded universe.",
  'Halo: Spartan Assault':
    "Halo: Spartan Assault is the 2013 top-down twin-stick shooter that brought Halo gameplay to mobile and PC platforms. The story follows Spartan Sarah Palmer and Commander Spartan Davis during the early days of the Spartan-IV program as they fight Covenant remnant forces. Designed for shorter play sessions, it expanded lore around the post-war Covenant conflicts and the newly formed Spartan-IV branch.",
  'Halo: The Master Chief Collection':
    "Halo: The Master Chief Collection is the 2014 remastered anthology that bundles Halo: Combat Evolved Anniversary, Halo 2 Anniversary, Halo 3, and Halo 4 — with Halo 3: ODST and Halo: Reach added later — into a single package for Xbox One and PC. Each game received updated matchmaking, and Halo 2 was given a full Anniversary treatment with remastered cut-scenes produced by Blur Studio. The collection serves as the definitive entry point to the entire Master Chief storyline.",
  'Halo: Spartan Strike':
    "Halo: Spartan Strike is the 2015 sequel to Spartan Assault, another top-down twin-stick shooter following a Spartan operative during two campaign arcs: one set during the Battle of New Mombasa alongside the events of Halo 2 and ODST, and one set during the Requiem campaign of Halo 4. The game introduced new enemy types, weapon loadouts, and expanded the Spartan-IV storyline established in its predecessor.",
  'Halo 5: Guardians':
    "Halo 5: Guardians is the 2015 entry that split the campaign between two fireteams — Master Chief's Blue Team and Spartan Locke's Osiris — as they pursue each other across multiple worlds while Cortana assembles a galaxy-wide AI coalition called the Created. The game featured expanded Spartan abilities, four-player co-op campaign, and a dedicated multiplayer focus with the competitive Warzone mode. Its controversial ending — Cortana seizing control of Forerunner Guardians to impose forced peace — set up Halo Infinite's conflict.",
  'Halo Wars 2':
    "Halo Wars 2 is the 2017 real-time strategy sequel developed by 343 Industries and Creative Assembly. The crew of the UNSC Spirit of Fire awaken from cryo-sleep above the Ark — the extragalactic Forerunner superstructure — and find themselves facing a new Banished warlord, Atriox, one of the most powerful Jiralhanae in history. The game introduced the Banished as the primary antagonist faction of the modern Halo era and established the threat that would culminate in Halo Infinite.",
  'Halo Infinite':
    "Halo Infinite is the 2021 entry that returned to the open-world gameplay spirit of the original trilogy. Set on Installation 07 (Zeta Halo) six months after the Banished assault that destroyed the UNSC Infinity, a lone Master Chief is rescued by a UNSC pilot and must retake the massive ring from Escharum's Banished forces. The game introduced a grappleshot traversal mechanic, a semi-open world structure, and the enigmatic Harbinger as secondary antagonist. It is the most critically acclaimed entry of the modern Halo era.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function halopediaExtracts(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = new URL(HALOPEDIA);
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    url.searchParams.set('action', 'query');
    url.searchParams.set('titles', batch.join('|'));
    url.searchParams.set('redirects', '1');
    url.searchParams.set('prop', 'extracts');
    url.searchParams.set('exintro', '1');
    url.searchParams.set('explaintext', '1');
    url.searchParams.set('exsentences', '6');
    const res = await fetch(url.toString());
    const json = await res.json();

    // Build redirect map: resolved title → original title
    const redirectMap = new Map<string, string>();
    for (const r of (json.query?.redirects ?? []) as Array<{ from: string; to: string }>) {
      redirectMap.set(r.to, r.from);
    }

    for (const page of Object.values(json.query?.pages ?? {}) as Array<{
      pageid: number; title: string; extract?: string;
    }>) {
      if (page.pageid > 0 && page.extract && page.extract.trim().length >= MIN_LEN) {
        const originalTitle = redirectMap.get(page.title) ?? page.title;
        result.set(originalTitle, page.extract.trim());
      }
    }
  }
  return result;
}

async function canWriteToGCS(): Promise<boolean> {
  const testPath = '_ci_write_test.txt';
  try {
    await bucket.file(testPath).save(Buffer.from('ok'), { resumable: false });
    await bucket.file(testPath).delete().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function writeToGCS(gcsPath: string, text: string): Promise<void> {
  await bucket.file(gcsPath).save(Buffer.from(text, 'utf8'), {
    contentType: 'text/plain; charset=utf-8',
    resumable: false,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!PROJECT_ID) {
    console.error('ERROR: GCP_PROJECT_ID is not set.');
    process.exit(1);
  }

  console.log(`Bucket: gs://${BUCKET_NAME}`);

  const writable = await canWriteToGCS();
  if (!writable) {
    console.warn('⚠  GCS bucket is not writable — skipping description sync.');
    console.warn('   Run `terraform apply` in /terraform to grant the SA write access.');
    process.exit(0);
  }

  // Load existing descriptions JSON
  const descDb: Record<string, string> = existsSync(DESC_PATH)
    ? JSON.parse(readFileSync(DESC_PATH, 'utf8'))
    : {};

  const allLore: Array<{ type: string; titles: string[] }> = [
    { type: 'character', titles: LORE_CHARACTERS },
    { type: 'weapon',    titles: LORE_WEAPONS    },
    { type: 'vehicle',   titles: LORE_VEHICLES   },
    { type: 'planet',    titles: LORE_PLANETS     },
    { type: 'race',      titles: LORE_RACES       },
    { type: 'game',      titles: LORE_GAMES       },
  ];

  let total = 0;

  for (const { type, titles } of allLore) {
    console.log(`\n[${type}] Fetching extracts for ${titles.length} titles...`);
    const extracts = await halopediaExtracts(titles);

    for (const title of titles) {
      const halopediaText = extracts.get(title) ?? '';
      const curated       = CURATED[title] ?? '';
      // CURATED wins when present (hand-crafted > thin Halopedia extract).
      // Fall back to Halopedia extract only when no CURATED entry exists.
      const description   = curated || (halopediaText.length >= MIN_LEN ? halopediaText : '');

      if (!description) {
        console.log(`  ⚠  no description available: ${title}`);
        continue;
      }

      // Update in-memory DB
      descDb[title] = description;

      // Write text file to GCS
      const slug    = slugify(title);
      const gcsPath = `descriptions/${type}/${slug}.txt`;
      try {
        await writeToGCS(gcsPath, description);
        console.log(`  ✓ ${title} → gs://${BUCKET_NAME}/${gcsPath}`);
      } catch (err) {
        console.warn(`  ✗ GCS write failed for ${title}:`, (err as Error).message);
      }

      total++;
    }
  }

  // Save merged descriptions JSON (remove internal comment key before saving)
  const { _comment: _, ...cleanDb } = descDb as Record<string, string>;
  writeFileSync(DESC_PATH, JSON.stringify(cleanDb, null, 2));
  console.log(`\nDone. ${total} descriptions synced. Updated ${DESC_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
