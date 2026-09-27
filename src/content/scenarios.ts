// Scenarios — named fieldings. Content rows, not code.
//
// PLAYBACK-DESIGN §6.2 / §11.3: "the one engine change the rebuild needs."
// `createBattle` already accepted heroes, mapId, enemyCount, heroHexes,
// enemyHexes — every ingredient existed. What was missing was a way to NAME a
// fielding from outside and get it into an export.
//
// WHY THIS EXISTS, measured rather than argued (2026-08-21): across 640 battles
// on all 8 maps at two army sizes, `power.flight`, `power.flight-swift`,
// `power.flight-labored` and all four beast attacks fired ZERO times. The beasts
// are player units, BENCHED until party assembly exists, so no standard battle
// can field them — and `movement.flight` landed having never once run in a real
// fight. Its gate's green check could not have gone red.
//
// STORAGE NOTE. §6.2 sketches these as `src/content/scenarios/<id>.json`. They
// are a TS registry here instead, because every other row in `src/content/` is
// (moves.ts, statuses.ts, index.ts) and because content is imported statically —
// a JSON-per-file directory would need a reader, and `src/content` has never had
// one. The CONTRACT of §6.2 is unchanged: id, note, mapId, heroes, heroHexes,
// enemies, enemyHexes, replicate. Only the file format differs, and this is
// flagged to the playback thread rather than assumed.
//
// **No `overrides`, ever.** Ruled: a scenario names units and positions;
// statistics belong to sweeps. Enforced by `ScenarioDef` having no such field.

import type { EncounterDef, ScenarioDef } from '../core/types.js'
import { omitDisabled } from './disable.js'
import { ENCOUNTERS, UNITS } from './index.js'
import { MAPS } from './maps.js'

// Published TEST rows, not duplicated authored terrain. A disabled source map
// removes only its dependent direct scenario; unrelated imports remain usable.
const DIRECT_MAP_SCENARIOS: Record<string, ScenarioDef> = {}
for (const [id, mapId] of [
  ['test.direct-map-journey', 'test.map.journey-20x10'],
  ['test.direct-map-authored', 'test.map.authored-40x40'],
] as const) {
  const map = MAPS.find(row => row.id === mapId)
  if (!map) continue
  DIRECT_MAP_SCENARIOS[id] = {
    id, note: 'Published TEST map through direct production input and exact replay terrain.',
    mapId, map, heroes: ['test-warrior'], heroHexes: [0], enemies: ['test-zombie'],
    enemyHexes: [map.rows.length * map.rows[0]!.length - 1], replicate: 0,
  }
}

const RAW_SCENARIOS: Readonly<Record<string, ScenarioDef>> = {
  ...DIRECT_MAP_SCENARIOS,
  'test.block-a': {
    id:'test.block-a',note:'TEST Block75/RangedBlock25 with reciprocal stripping; no campaign balance claim.',
    mapId:'map.open',heroes:['test-block-a'],heroHexes:[85],enemies:['test-block-b'],enemyHexes:[86],replicate:0,
  },
  'test.block-b': {
    id:'test.block-b',note:'TEST Block30/RangedBlock90 with reactive Protection against a ranged attacker.',
    mapId:'map.open',heroes:['test-ranger'],heroHexes:[85],enemies:['test-block-b'],enemyHexes:[88],replicate:1,
  },
  // v2.prone (2026-09-23): a real battle that knocks a unit down before KDB (V2 R4)
  // exists — test riders apply the prone statuses through the generic status.apply.
  'test.prone-a': {
    id: 'test.prone-a', note: 'TEST: Tripper A knocks the zombie down on a hit (status.prone); the zombie stands (power.stand-up) and bites. No campaign claim.',
    mapId: 'map.open', heroes: ['test-trip-a'], heroHexes: [85], enemies: ['test-zombie'], enemyHexes: [86], replicate: 0,
  },
  // station.vs-target (2026-09-25): the two instances of damage-vs-target, each live in a
  // real battle — by what the target IS (a tag) and by what it CARRIES (a status). TEST data.
  'test.vs-target-a': {
    id: 'test.vs-target-a', note: 'TEST: a warrior wearing test.badge.bane-undead (+2 vs undead) against two zombies. No campaign claim.',
    mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], heroBadges: [['test.badge.bane-undead']], enemies: ['test-zombie', 'test-zombie'], enemyHexes: [86, 101], replicate: 0,
  },
  'test.vs-target-b': {
    id: 'test.vs-target-b', note: 'TEST: a warrior wearing test.badge.bane-venom (poisons on a hit; +3 vs poisoned) against the 40-HP ward body, which lives past the first hit. No campaign claim.',
    mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], heroBadges: [['test.badge.bane-venom']], enemies: ['test-burst-ward'], enemyHexes: [86], replicate: 0,
  },
  // fix.vs-target-worn-and-flat (2026-09-25): a WORN item's slayer, live — "Bloodrune Slayer
  // bonus happens" (Andrew, DECISIONS.md). Two bloodrunes, the mechanism's two instances, on
  // warriors whose attacks the runes do not grant. Codex rows; the fielding is TEST.
  'test.vs-target-c': {
    id: 'test.vs-target-c', note: 'TEST: two warriors, one wearing item.rune-kairin (+3 vs undead), one item.rune-vampire-hunter (+1 vs undead), against three zombies. No campaign claim.',
    mapId: 'map.open', heroes: ['test-warrior', 'test-warrior'], heroHexes: [85, 100], heroItems: [['item.rune-kairin'], ['item.rune-vampire-hunter']],
    enemies: ['test-zombie', 'test-zombie', 'test-zombie'], enemyHexes: [86, 101, 87], replicate: 0,
  },
  'test.prone-b': {
    id: 'test.prone-b', note: 'TEST: Tripper B floors Osric on a hit (test.status.floored, the second prone instance); Osric stands and swings. No campaign claim.',
    mapId: 'map.open', heroes: ['test-osric'], heroHexes: [85], enemies: ['test-trip-b'], enemyHexes: [86], replicate: 0,
  },
  // ai.mode-change (2026-09-26; AI-DESIGN.md §3E): the two instances of a mode that
  // changes mid-battle, each live in a real battle — by Health (the Rout Zombie runs
  // below half) and by the Turn (the Late Zombie hangs back, then charges from Turn 3).
  // The changes are data on the TEST rows (content/test/units.json). No campaign claim.
  'test.mode-change-a': {
    id: 'test.mode-change-a', note: 'TEST: a warrior against the Rout Zombie (30 Health), which changes from dumb-melee to flee once below half Health. No campaign claim.',
    mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], enemies: ['test-rout-zombie'], enemyHexes: [92], replicate: 0,
  },
  'test.mode-change-b': {
    id: 'test.mode-change-b', note: 'TEST: a warrior against the Late Zombie (30 Health), which flees until Turn 3 and then charges (dumb-melee). No campaign claim.',
    mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], enemies: ['test-late-zombie'], enemyHexes: [89], replicate: 0,
  },
  // ai.encounter-rules (2026-09-26; AI-DESIGN.md §4): the two instances of an
  // encounter's overarching AI rules, each live in a real battle — an anchor (the
  // Strong Skeleton holds within 1 of its hex while the Zombie beside it advances)
  // and coordination (two Strong Skeletons share the side's focus, the enemy with
  // the least Health). The rules are data on TEST encounter rows (content/test/encounters.json).
  'test.encounter-rules-a': {
    id: 'test.encounter-rules-a', note: 'TEST: a warrior against test.encounter.anchor-hold — its Strong Skeleton is anchored to (14,4), radius 1; its Zombie is not. No campaign claim.',
    mapId: 'test.map.journey-20x10', encounterId: 'test.encounter.anchor-hold',
    heroes: ['test-warrior'], heroHexes: [], enemies: [], enemyHexes: [], replicate: 0,
  },
  'test.encounter-rules-b': {
    id: 'test.encounter-rules-b', note: 'TEST: a warrior and a ranger against test.encounter.coordinated-pack — two Strong Skeletons coordinated on one focus a Phase. No campaign claim.',
    mapId: 'test.map.journey-20x10', encounterId: 'test.encounter.coordinated-pack',
    heroes: ['test-warrior', 'test-ranger'], heroHexes: [], enemies: [], enemyHexes: [], replicate: 0,
  },
  // ai.sight (2026-09-27; ruled 2026-09-26, "the AI knows everything except
  // stealthed units"): the two instances of a status that hides its unit from the
  // opposing AI, each live in a real battle — the Veil on a hero (it falls away, and
  // the hero becomes a target) and the Shroud on an enemy (no clock: the hero AI
  // never sees it). Both statuses are data on TEST rows (content/test/). No campaign claim.
  'test.sight-a': {
    id: 'test.sight-a', note: 'TEST: Veiled Osric (hidden from the enemy AI through the first Enemy Phase) beside a zombie, plain Osric five hexes off. The zombie passes the one it cannot see. No campaign claim.',
    mapId: 'map.open', heroes: ['test-veiled-osric', 'test-osric'], heroHexes: [86, 82], enemies: ['test-zombie'], enemyHexes: [87], replicate: 0,
  },
  'test.sight-b': {
    id: 'test.sight-b', note: 'TEST: Osric beside the Shrouded Zombie (hidden from the hero AI all Battle), a plain zombie four hexes off. Osric goes for the one he can see. No campaign claim.',
    mapId: 'map.open', heroes: ['test-osric'], heroHexes: [85], enemies: ['test-shrouded-zombie', 'test-zombie'], enemyHexes: [86, 89], replicate: 0,
  },
  // v2.knockback-collisions (2026-09-23): a real battle whose pushes are stopped by
  // authored props (content test.map.well-shove, 9x7). The golem stands between two
  // zombies on the middle row; every push it lands drives one into prop.test.boulder (collision 4)
  // or prop.test.well (collision 3, consumes). TEST data, no campaign claim.
  'test.knockback-well': {
    id: 'test.knockback-well', note: 'TEST: the Arc Golem, between two zombies on the middle row, shoves them into a boulder (collision 4) and a well (collision 3, consumes). No campaign claim.',
    mapId: 'test.map.well-shove', heroes: ['test-arc-golem'], heroHexes: [31], enemies: ['test-zombie', 'test-zombie'], enemyHexes: [30, 32], replicate: 8,
  },
  // v2.kdb (2026-09-23): a real battle in which KDB rolls. Two Impact attacks
  // (attack.test-kdb.maul Impact 3, attack.test-kdb.bash Impact 7 and no damage)
  // against the three knock badges: badge.stand-firm, badge.agile, badge.giant.
  // The badge wearers field on the HERO side (sides: byList, the mirror rule):
  // fielding logs unit.badged for a hero, not for an enemy row, and that line
  // is what names the badge.
  'test.kdb': {
    id: 'test.kdb', note: 'TEST: zombies wearing Stand Firm, Agile and Giant (fielded as the heroes) against a Mauler (Impact 3) and a Basher (Impact 7, no damage). No campaign claim.',
    mapId: 'map.open', heroes: ['test-kdb-firm', 'test-kdb-agile', 'test-kdb-giant'], heroHexes: [86, 102, 70], enemies: ['test-kdb-mauler', 'test-kdb-basher'], enemyHexes: [85, 101], replicate: 0, sides: 'byList',
  },
  // v2.thorns (2026-09-24, COMBAT-V2 §9.4): two thorned zombies (test.badge.bramble
  // Thorns 1, test.badge.briar Thorns 3), fielded as the heroes so unit.badged names
  // the badges, against Osric (melee — pays Thorns on every connecting hit) and a
  // ranger (ranged — never does).
  'test.thorns': {
    id: 'test.thorns', note: 'TEST: zombies wearing Thorns 1 and Thorns 3 (fielded as the heroes) against Osric (melee) and a ranger (ranged). No campaign claim.',
    mapId: 'map.open', heroes: ['test-thorns-bramble', 'test-thorns-briar'], heroHexes: [86, 102], enemies: ['test-osric', 'test-ranger'], enemyHexes: [85, 81], replicate: 0, sides: 'byList',
  },
  // v2.swap (2026-09-24, COMBAT-V2 §11.2): two warriors, a longsword in hand and a kite
  // shield stowed, wearing Fast Hands (swapCost 0) and Slow Hands (swapCost 2). The AI
  // does not swap (SWITCHES.md swapAi); the scenario fields the loadout and the badges
  // so the log names them. A swap is a command (commands.ts) — test/v2-swap.test.ts drives it.
  'test.swap': {
    id: 'test.swap', note: 'TEST: two warriors carrying a longsword in hand and a kite shield stowed, one with Fast Hands, one with Slow Hands, against two zombies. No campaign claim.',
    mapId: 'map.open', heroes: ['hero.base.warrior-iron', 'hero.base.warrior-iron'], heroHexes: [86, 102],
    heroItems: [['item.longsword'], ['item.longsword']], heroStowed: [['item.kite-shield'], ['item.kite-shield']],
    heroBadges: [['test.badge.fast-hands'], ['test.badge.slow-hands']],
    enemies: ['test-zombie', 'test-zombie'], enemyHexes: [85, 101], replicate: 0,
  },
  // v2.item-uses (V2 R6 part 3): uses belong to the item instance. The warrior carries two
  // Healing Potions (two drinks) and a Cure Poison spent before the battle; the priest a
  // live Cure Poison and a spent Healing Potion. heroItemsUsed is parallel to the carried
  // instances (handed, then stowed). test/v2-item-uses.test.ts drives it.
  'test.item-uses': {
    id: 'test.item-uses', note: 'TEST: a warrior with two Healing Potions and a spent Cure Poison, a priest with a live Cure Poison and a spent Healing Potion, against three zombies. No campaign claim.',
    mapId: 'map.open', heroes: ['hero.base.warrior-iron', 'hero.base.priest-armored'], heroHexes: [86, 102],
    heroItems: [
      [...(UNITS['hero.base.warrior-iron']?.defaultItems ?? []), 'item.healing-potion', 'item.healing-potion', 'item.cure-poison'],
      [...(UNITS['hero.base.priest-armored']?.defaultItems ?? []), 'item.cure-poison', 'item.healing-potion'],
    ],
    heroItemsUsed: [
      [...(UNITS['hero.base.warrior-iron']?.defaultItems ?? []).map(() => 0), 0, 0, 1],
      [...(UNITS['hero.base.priest-armored']?.defaultItems ?? []).map(() => 0), 0, 1],
    ],
    enemies: ['test-zombie', 'test-zombie', 'test-zombie'], enemyHexes: [150, 166, 182], replicate: 0,
  },
  'test.props-viewer-ranged-zoc': {
    id: 'test.props-viewer-ranged-zoc', note: 'Current production replay coverage: a ranged-only Fire Imp cannot make a melee reaction when Lucius walks away. Both units have existing viewer art.',
    mapId: 'map.open', heroes: ['alpha-lucius'], heroHexes: [85],
    enemies: ['unit.fire-imp'], enemyHexes: [86], replicate: 0,
  },
  'test.board-journey': {
    id: 'test.board-journey', note: 'Published 20×10 TEST map and encounter through the normal export and battle drivers.',
    mapId: 'test.map.journey-20x10', encounterId: 'test.encounter.journey-20x10',
    heroes: ['test-warrior'], heroHexes: [], enemies: [], enemyHexes: [], replicate: 0,
  },
  'test.board-authored': {
    id: 'test.board-authored', note: 'Published 40×40 TEST map and encounter through the normal export and battle drivers.',
    mapId: 'test.map.authored-40x40', encounterId: 'test.encounter.authored-40x40',
    heroes: ['test-warrior'], heroHexes: [], enemies: [], enemyHexes: [], replicate: 0,
  },
  'test.authored-slots': {
    id: 'test.authored-slots', note: 'A movement-slot attack then an either-slot attack through normal AI combat.',
    mapId: 'map.open', heroes: ['test-slot-striker'], heroHexes: [85],
    enemies: ['test-zombie', 'test-zombie'], enemyHexes: [86, 102], replicate: 0,
  },
  'showcase.flight-bonuses': {
    id: 'showcase.flight-bonuses',
    note: 'Two authored flight allowances exercise the same payment mechanism through automatic combat.',
    mapId: 'map.open', heroes: ['test-flight-plus-three', 'test-flight-plus-five'], heroHexes: [80, 112],
    enemies: ['test-zombie', 'test-zombie'], enemyHexes: [95, 127], replicate: 0,
  },
  'showcase.surge-flight-ladder': {
    id: 'showcase.surge-flight-ladder',
    note: 'Two authored flight ranges and Surge values, fielded beyond initial attack range.',
    mapId: 'map.open', heroes: ['test-surge-labored', 'test-surge-swift'], heroHexes: [80, 112],
    enemies: ['test-zombie', 'test-zombie'], enemyHexes: [95, 127], replicate: 0,
  },
  'showcase.movement-bonuses': {
    id: 'showcase.movement-bonuses',
    note: 'Two content-authored positive movement allowances, executed through normal automatic battles.',
    mapId: 'map.open', heroes: ['test-move-plus-one', 'test-move-plus-three'], heroHexes: [85, 117],
    enemies: ['test-zombie', 'test-zombie'], enemyHexes: [90, 122], replicate: 0,
  },
  'showcase.ordered-power-preview': {
    id: 'showcase.ordered-power-preview',
    note: 'Ordered-effect preview probes: two packets and status removal before damage, from the test content receptacle.',
    mapId: 'map.open',
    heroes: ['test-ordered-double', 'test-ordered-strip'], heroHexes: [85, 101],
    enemies: ['test-zombie', 'test-zombie'], enemyHexes: [86, 102], replicate: 0,
  },
  'showcase.beasts': {
    id: 'showcase.beasts',
    note: 'Fields the benched beasts so they can be shown at all — and with the '
      + 'Green Drake comes the only grantor of the flight ladder, which no '
      + 'standard battle can exercise.',
    mapId: 'map.thicket',
    // All three beasts are HEROES — ruled 2026-08-21: "All of those initial
    // beasts, of which there were only a couple, were meant to be heroes."
    // PLAYBACK-DESIGN §6.2's example scenario had this right and the DATA had it
    // wrong: the puppy's row still said side 'enemy', so the side check added
    // with this item threw. The check did its job — it turned a silent
    // side-swap into a ruling.
    //
    // The puppy can move and cannot attack (maxStamina 0 against a 1-Stamina
    // bite) until her dictated block lands. It is fielded anyway: a showcase
    // shows what the game currently IS, and hiding the unit would hide the gap.
    heroes: ['spirit-snake', 'green-drake', 'shadow-hound-puppy'],
    heroHexes: [79, 80, 91],
    enemies: ['test-zombie', 'test-zombie-burning'],
    enemyHexes: [40, 41],
    replicate: 0,
  },
  'showcase.prologue-enemies': {
    id: 'showcase.prologue-enemies',
    note: 'Fields every authored enemy the five prologue battles use — the '
      + 'content.enemy-pack verify battle. No standard battle can produce these '
      + 'ids; this is what keeps them under gate 1 instead of exempt from it.',
    mapId: 'map.open',
    heroes: ['test-oathblade', 'test-sky-pirate', 'test-dusk-hawk',
      'test-air-mage', 'test-lucius', 'test-osric'],
    heroHexes: [244, 245, 246, 247, 248, 249],
    enemies: ['unit.zombie', 'unit.fast-zombie', 'unit.skeletal-archer',
      'unit.necromancer', 'unit.imp', 'unit.powerful-imp', 'unit.fire-imp',
      'unit.poison-imp', 'unit.bruiser-demon', 'unit.lieutenant-demon',
      'unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound', 'unit.werewolf'],
    enemyHexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    replicate: 0,
  },
  'showcase.prologue-party': {
    id: 'showcase.prologue-party',
    note: 'The battle-2 party, whole — the content.hero-pack verify battle. '
      + 'The Hunter with her dictated longbow; the Iron Dwarf armed by S36\'s '
      + 'full-kit dictation (war axe, Destroyed Mail); the Battle Chaplain '
      + 'confirmed 2026-08-27 ("Battle Chaplain should be in there now") with '
      + 'knight shield and holy texts. All three carry the re-ruled Punch.',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive', 'hero.base.warrior-iron',
      'hero.base.priest-armored'],
    heroHexes: [247, 246, 248],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.fast-zombie'],
    enemyHexes: [118, 122, 120],
    replicate: 0,
  },
  'showcase.alpha-team': {
    id: 'showcase.alpha-team',
    note: 'The six Alpha Team heroes (S31, delivered 2026-08-27) against a '
      + 'rider-heavy spread of authored enemies — the content.alpha-team '
      + 'verify battle. Every alpha kit, rider, and the universal Punch is '
      + 'reachable here; the nine named gaps (push, cleave arc, crit, item '
      + 'powers) stand in the gaps file, not in these rows.',
    mapId: 'map.open',
    heroes: ['alpha-oathblade', 'alpha-sky-pirate', 'alpha-dusk-hawk',
      'alpha-air-mage', 'alpha-lucius', 'alpha-osric'],
    heroHexes: [244, 245, 246, 247, 248, 249],
    enemies: ['unit.zombie', 'unit.fast-zombie', 'unit.skeletal-archer',
      'unit.imp', 'unit.hellhound', 'unit.bruiser-demon'],
    enemyHexes: [3, 5, 7, 9, 11, 13],
    replicate: 0,
  },
  'showcase.arc-variant': {
    id: 'showcase.arc-variant',
    note: 'capability.area-attack, second variant live: the test Arc Golem '
      + 'opens standing adjacent to two adjacent zombies, so the first hero '
      + 'activation is a sweep through both — the arc as pure data on a body '
      + 'no control battle fields.',
    mapId: 'map.open',
    heroes: ['test-arc-golem'],
    heroHexes: [135],
    // The pair at 118/119 feeds the opening sweep; the third zombie starts
    // five hexes out and arrives after the rams have scattered the pair, so
    // the battle also has SINGLE-target turns — where the overhead and slam
    // (station.crit-count) get their live firings.
    enemies: ['test-zombie', 'test-zombie', 'test-zombie'],
    enemyHexes: [118, 119, 55],
    replicate: 0,
  },
  'showcase.item-powers': {
    id: 'showcase.item-powers',
    note: 'capability.item-powers verify fielding: the Air Mage stands boxed '
      + 'by his own line with a zombie clump two hexes out — inside Storm\'s '
      + 'range 4, outside the blast himself — so the opening activation is a '
      + 'Storm through both. A kiting mage otherwise holds at bolt range, '
      + 'beyond 4, and the power would probe as dead content however real.',
    mapId: 'map.open',
    // The mage activates FIRST and every neighbour (118 119 134 136 150 151)
    // holds an ally, so he cannot kite away before his power block runs. The
    // zombie pair at 85/86 is distance 3 — inside range 4, adjacent to each
    // other, and their blasts contain no ally hex.
    heroes: ['alpha-air-mage', 'alpha-oathblade', 'alpha-osric',
      'alpha-sky-pirate', 'alpha-lucius', 'alpha-dusk-hawk',
      'hero.base.ranger-aggressive'],
    heroHexes: [135, 118, 119, 134, 136, 150, 151],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.fast-zombie'],
    enemyHexes: [85, 86, 87],
    replicate: 0,
  },
  'showcase.civilians': {
    id: 'showcase.civilians',
    note: 'The three prologue civilians beside the Hunter against zombies — '
      + 'the content.civilians verify battle. Civilians ACT (ruled 2026-08-26): '
      + 'the orphan pelts rocks, the farmer jabs, and the weaponless Lumberjack '
      + 'is a named gap standing in plain sight.',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive', 'hero.fixed.orphans',
      'hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer'],
    heroHexes: [247, 245, 246, 248],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.fast-zombie'],
    enemyHexes: [118, 122, 120],
    replicate: 0,
  },
  // content.field-eve-24 (2026-09-02): the twenty-four Eve heroes field in
  // two halves of twelve, each against a zombie line — the verify fieldings.
  // Twelve on row 15 (hexes 242–253), six zombies on row 7. Not design; a
  // roll-call. Order follows gen/kits.json heroKits.
  'showcase.eve-24-a': {
    id: 'showcase.eve-24-a',
    note: 'content.field-eve-24: the first twelve of the Eve 24 — paladins, rangers, warriors — kitted as dictated 2026-08-27b, against six zombies.',
    mapId: 'map.open',
    heroes: ['hero.base.paladin-dark', 'hero.base.paladin-shiney', 'hero.base.paladin-hunk', 'hero.base.paladin-smug',
      'hero.base.ranger-ranger', 'hero.base.ranger-scantily', 'hero.base.ranger-nature', 'hero.base.ranger-aggressive',
      'hero.base.warrior-iron', 'hero.base.warrior-brawler', 'hero.base.warrior-barbarian', 'hero.base.warrior-fearsome'],
    heroHexes: [242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.fast-zombie', 'unit.zombie', 'unit.zombie'],
    enemyHexes: [115, 117, 119, 121, 123, 125],
    replicate: 0,
  },
  'showcase.eve-24-b': {
    id: 'showcase.eve-24-b',
    note: 'content.field-eve-24: the second twelve — mages, priests, rogues — kitted as dictated 2026-08-27b, against six zombies.',
    mapId: 'map.open',
    heroes: ['hero.base.mage-thinking', 'hero.base.mage-sexy', 'hero.base.mage-fire', 'hero.base.mage-fireaura',
      'hero.base.priest-pauper', 'hero.base.priest-armored', 'hero.base.priest-robes', 'hero.base.priest-scantily',
      'hero.base.rogue-raven', 'hero.base.rogue-rose', 'hero.base.rogue-snake', 'hero.base.rogue-skull'],
    heroHexes: [242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.fast-zombie', 'unit.zombie', 'unit.zombie'],
    enemyHexes: [115, 117, 119, 121, 123, 125],
    replicate: 0,
  },
  'showcase.gash-variant': {
    id: 'showcase.gash-variant',
    note: 'fix.bleed-magnitude verify fielding (2026-09-02): the FIXTURE zombies '
      + 'carry test.zombie.gash, a second shedByHealing status beside Bleed, and '
      + 'Lucius stands behind two melee heroes to heal them — so a gashed hero is '
      + 'healed and the log shows the shed. Six fixture zombies so the line is '
      + 'actually wounded enough for the priest\'s heal rule to fire.',
    mapId: 'map.open',
    heroes: ['alpha-oathblade', 'alpha-osric', 'alpha-lucius', 'alpha-sky-pirate'],
    heroHexes: [246, 248, 231, 247],
    enemies: ['test-gash-zombie', 'test-gash-zombie', 'test-gash-zombie', 'test-gash-zombie', 'test-gash-zombie', 'test-gash-zombie'],
    enemyHexes: [117, 119, 121, 123, 118, 122],
    replicate: 0,
  },
  'showcase.surrounded': {
    id: 'showcase.surrounded',
    note: 'encounter.runner (2026-09-03): encounter.prologue-2, Surrounded, run as '
      + 'an ENCOUNTER — four zombies and two civilian objectives at setup, the '
      + 'skeletal archers at enemy phase 1 and 3, the fast zombies at 4, the '
      + 'necromancer at 5. The battle-2 party on its Codex kits. This is the '
      + 'fielding the probe reads the schedule, the shunt and the objectives in.',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive', 'hero.base.warrior-iron', 'hero.base.mage-fire', 'hero.base.priest-armored'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'encounter.prologue-2',
    replicate: 0,
  },
  'showcase.two-zombies-and-a-child': {
    id: 'showcase.two-zombies-and-a-child',
    note: 'encounter.runner (2026-09-03): encounter.prologue-1 as an encounter — '
      + 'the Orphans as the objective, two zombies, a third rolled onto one of two '
      + 'edges at Turn 4 (the wave cup), the loss timer at ten. One hero, as the '
      + 'row asks (heroes: 1, deployed near the player edge). The second encounter '
      + 'variant: the same runner, different data.',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'encounter.prologue-1',
    replicate: 0,
  },
  'showcase.supper': {
    id: 'showcase.supper',
    note: 'encounter.supper, the encounter session\'s E1 (shipped 2026-09-03): ten '
      + 'villagers in a square, eight zombies already on them, four ghouls '
      + 'running in, two more at Turn 3, the necromancer at 5, four zombies '
      + 'behind the party at 7. The four opening heroes on Codex kits. The '
      + 'fielding the probe reads the Ghoul (Rake ×2, Devour on cooldown) and '
      + 'the rescue civilians in.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'encounter.supper',
    replicate: 0,
  },
  'showcase.kiln': {
    id: 'showcase.kiln',
    note: 'encounter.kiln, the encounter session\'s E2 (shipped 2026-09-03): fire '
      + 'imps, hellhounds and the Imp Master at setup, imps and poison imps on the '
      + 'flanks, the Balrog at Turn 6 — its Imprisoning Aura (−5 Movement within 2) '
      + 'is the second aura the probe reads. The burning band is a named gap. The '
      + 'five-hero party of battle 9 on Codex kits.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored', 'hero.base.paladin-hunk'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'encounter.kiln',
    replicate: 0,
  },
  'showcase.rime': {
    id: 'showcase.rime',
    note: 'encounter.rime, the encounter session\'s E5 (shipped 2026-09-03): the frost '
      + 'band at rows 6–8 from setup, strong skeletons and archers, the spider at 4, '
      + 'zombies behind the party at 6, the Bone Dragon at 9. The frozen skeletons '
      + 'and the wights are owed rows (named gaps). The six-hero party of battle 20 '
      + 'on Codex kits. The fielding the probe reads the frost layer in.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored', 'hero.base.paladin-hunk', 'hero.base.rogue-raven'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'encounter.rime',
    replicate: 0,
  },
  'showcase.horrors': {
    id: 'showcase.horrors',
    note: 'encounter.horrors-of-the-night as an encounter (capability.vision, 2026-09-03): '
      + 'the board starts dark, the four eyeblights, the dark snipers at Turn 1, the '
      + 'nightstalkers at 3, the shadow sorcerer at 4 — the light is a tug of war. '
      + 'Six heroes on Codex kits. The fielding the probe reads Nightfall and The '
      + 'Dark Rushes In in.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored', 'hero.base.paladin-hunk', 'hero.base.rogue-raven'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'encounter.horrors-of-the-night',
    replicate: 0,
  },
  'showcase.waystation': {
    id: 'showcase.waystation',
    note: 'capability.charges (2026-09-03): the four opening heroes on their Codex '
      + 'kits plus the Waystation\'s consumables — a Healing Potion and Rations '
      + 'each, a Poison Flask on the ranger, a Strength Potion on the warrior. '
      + 'Twelve zombies so the potions get drunk. The fielding the probe reads a '
      + 'charge being spent in.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored'],
    heroHexes: [244, 245, 246, 247],
    heroItems: [
      [...(UNITS['hero.base.warrior-iron']?.defaultItems ?? []), 'item.healing-potion', 'item.rations', 'item.strength-potion'],
      [...(UNITS['hero.base.ranger-aggressive']?.defaultItems ?? []), 'item.healing-potion', 'item.rations', 'item.poison-flask'],
      [...(UNITS['hero.base.mage-fire']?.defaultItems ?? []), 'item.healing-potion', 'item.rations'],
      [...(UNITS['hero.base.priest-armored']?.defaultItems ?? []), 'item.healing-potion', 'item.rations'],
    ],
    enemies: Array.from({ length: 12 }, () => 'unit.zombie'),
    enemyHexes: [64, 66, 68, 70, 72, 74, 80, 82, 84, 86, 88, 90],
    replicate: 0,
  },
  // progression.level-table-by-type (2026-09-03): the three farmer rows at
  // level 3 on civilian.farmer beside the orphans at level 3 on
  // civilian.child — the same level, two curves, told apart in the log's
  // unit.grown lines. Militia is the civilian specialty they all hold.
  'showcase.farmers-grown': {
    id: 'showcase.farmers-grown',
    note: 'progression.level-table-by-type: three farmers level 3 on civilian.farmer, the orphans level 3 on their own type table, against four zombies.',
    mapId: 'map.open',
    heroes: ['hero.fixed.farmer', 'hero.fixed.farming-family', 'hero.fixed.group-of-farmers', 'hero.fixed.orphans'],
    heroHexes: [245, 246, 247, 248],
    heroProgress: [
      { level: 3, specialtyId: 'specialty.militia' },
      { level: 3, specialtyId: 'specialty.militia' },
      { level: 3, specialtyId: 'specialty.militia' },
      { level: 3, specialtyId: 'specialty.trickster' },
    ],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.fast-zombie'],
    enemyHexes: [116, 118, 120, 122],
    replicate: 0,
  },
  // fix.knockback-beyond-one (2026-09-04): the golem's Overhead carries a push
  // of TWO (trigger.test-ram.shove). The same fielding as the arc variant on a
  // replicate where the Overhead lands on Turn 2, so the two-hex shove is on
  // the log of the battle the probe reads.
  // badge.mechanism (2026-09-04): two test badges on a fielded hero — Iron Skin
  // (stat modifiers) and the Brand (a rider and a flag) — so the probe reads a
  // badge's rider firing and its modifiers on the sheet.
  'showcase.badged': {
    id: 'showcase.badged',
    note: 'badge.mechanism: a test warrior wearing test.badge.iron-skin and test.badge.brand against three zombies — the badge fold at fielding and a badge rider live.',
    mapId: 'map.open',
    heroes: ['test-warrior'],
    heroHexes: [135],
    heroBadges: [['test.badge.iron-skin', 'test.badge.brand']],
    enemies: ['test-zombie', 'test-zombie', 'test-zombie'],
    enemyHexes: [118, 119, 120],
    replicate: 0,
  },
  // fix.deathbed-no-stands (2026-09-04): a hero fielded already Wounded (the
  // test row with the ruled shape) against four zombies — at 0 it dies with
  // no roll and no bleed-out, on the log the probe reads.
  // proving.side-override (2026-09-04): the mirror match Angela named — "four
  // zombies against four zombies, and what we're testing is: what does
  // initiative matter?" The hero-side four act first every Turn; that is the
  // whole difference between the sides here.
  'showcase.mirror-zombies': {
    id: 'showcase.mirror-zombies',
    note: 'proving.side-override: four Codex zombies fielded as heroes against four as enemies — the mirror match; the hero side has the initiative and nothing else.',
    mapId: 'map.open',
    heroes: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.zombie'],
    heroHexes: [80, 96, 112, 128],
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.zombie'],
    enemyHexes: [95, 111, 127, 143],
    sides: 'byList',
    replicate: 0,
  },
  'showcase.wounded-entry': {
    id: 'showcase.wounded-entry',
    note: 'fix.deathbed-no-stands: a test warrior fielded wearing test.badge.deaths-door — "if they are wounded, then they just die" — against four zombies.',
    mapId: 'map.open',
    heroes: ['test-warrior'],
    heroHexes: [135],
    heroBadges: [['test.badge.deaths-door']],
    enemies: ['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie'],
    enemyHexes: [118, 119, 120, 151],
    replicate: 0,
  },
  'showcase.knockback-two': {
    id: 'showcase.knockback-two',
    note: 'fix.knockback-beyond-one: the test Arc Golem shoves a zombie two hexes with its Overhead — knockback greater than one, live.',
    mapId: 'map.open',
    heroes: ['test-arc-golem'],
    heroHexes: [135],
    enemies: ['test-zombie', 'test-zombie', 'test-zombie'],
    enemyHexes: [118, 119, 55],
    replicate: 3,
  },
  'showcase.assembled-party': {
    id: 'showcase.assembled-party',
    note: 'Hero assembly (2026-09-03): the progression party at its battle-20 '
      + 'state — levels, specialties, the level-5 picks and the drafted class '
      + 'powers — on the Codex default kits. Every class power here reaches the '
      + 'engine through ability.effects; this is the fielding the probe reads '
      + 'them in. Twelve zombies so the powers have something to answer.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire',
      'hero.base.priest-armored', 'hero.base.paladin-hunk', 'hero.base.rogue-raven'],
    heroHexes: [244, 245, 246, 247, 248, 249],
    heroProgress: [
      { level: 5, specialtyId: 'specialty.bloodrage', levelFivePick: { maxHp: 5 }, powers: ['power.bloodrage.frenzy', 'power.bloodrage.bloodlust', 'power.bloodrage.unstoppable'] },
      { level: 5, specialtyId: 'specialty.bowmaster', levelFivePick: { crit: 8 }, powers: ['power.bowmaster.careful-aim', 'power.bowmaster.sniper', 'power.bowmaster.rain-of-arrows'] },
      { level: 5, specialtyId: 'specialty.fire-master', levelFivePick: { magic: 2 }, powers: ['power.fire-master.fireball', 'power.fire-master.fire-shield', 'power.fire-master.eldritch-might'] },
      { level: 5, specialtyId: 'specialty.shepherd', levelFivePick: { maxHp: 5 }, powers: ['power.shepherd.circle-of-healing', 'power.shepherd.close-wounds', 'power.shepherd.prayer'] },
      { level: 5, specialtyId: 'specialty.sacred-shield', levelFivePick: { maxHp: 5 }, powers: ['power.sacred-shield.aegis', 'power.sacred-shield.fortify', 'power.sacred-shield.guardian-angel'] },
      { level: 4, specialtyId: 'specialty.assassin', powers: ['power.assassin.knife-in-the-back', 'power.assassin.deep-cut'] },
    ],
    enemies: Array.from({ length: 12 }, () => 'unit.zombie'),
    enemyHexes: [64, 66, 68, 70, 72, 74, 80, 82, 84, 86, 88, 90],
    replicate: 0,
  },
  'test.damage-packets': {
    id:'test.damage-packets',note:'Two pure-data ordered packet variants, different types/amounts and physical penetration.',mapId:'map.open',
    heroes:['test-packet-flame'],heroHexes:[85],enemies:['test-packet-shadow'],enemyHexes:[86],replicate:2,
  },
  // v2.prop-destroy (2026-09-24, COMBAT-V2 §12): two Destroy swings against zombies
  // standing in low props — barrels (tier 1) and an old stone wall section (tier 2).
  // The Chopper (Destroy 1) and the Wrecker (Destroy 2) start adjacent, so a
  // connecting swing strikes the prop in the zombie's hex. TEST data, no campaign claim.
  'test.prop-destroy': {
    id:'test.prop-destroy',note:'TEST: a Chopper (Destroy 1) and a Wrecker (Destroy 2) against zombies standing in barrels (tier 1) and an old stone wall (tier 2). No campaign claim.',mapId:'test.map.prop-destroy',
    map:{id:'test.map.prop-destroy',name:'Prop destroy TEST',rows:['.......','.......','.......','.......','.......'],props:[{id:'prop.test.barrels',height:'low',material:1,footprint:{kind:'hex',hexes:[10]}},{id:'prop.test.stone-wall',height:'low',material:2,footprint:{kind:'hex',hexes:[24]}}]},
    heroes:['test-destroy-chopper','test-destroy-wrecker'],heroHexes:[9,23],enemies:['test-zombie','test-zombie'],enemyHexes:[10,24],replicate:0,
  },
  // v2.ground-table, re-ruled v2.ground-retable (Andrew, 2026-09-24, DECISIONS.md): the
  // V2 grounds in columns between the lines — undergrowth, desert, marsh, ruins,
  // woodland, lava — two zombies wading west from the lava toward a Ranger and a
  // Warrior. TEST data, no campaign claim.
  'test.ground-table': {
    id:'test.ground-table',note:'TEST: V2 ground — columns of undergrowth, desert, marsh, ruins, woodland and lava between a Ranger and Warrior and two zombies. No campaign claim.',mapId:'test.map.ground-table',
    map:{id:'test.map.ground-table',name:'Ground table TEST',rows:['.udmnfl..','.udmnfl..','.udmnfl..','.udmnfl..','.udmnfl..']},
    heroes:['test-ranger','test-warrior'],heroHexes:[9,27],enemies:['test-zombie','test-zombie'],enemyHexes:[17,35],replicate:0,
  },
  // v2.thin-obstruction (Andrew, 2026-09-24, DECISIONS.md "thin obstructions are a third kind
  // of prop"): a one-row corridor with a sign — a high thin prop — in the middle, between a
  // Ranger and a zombie. Every shot across it pays −5, and the only way to the Ranger is
  // through the sign's hex (a high prop there would wall the zombie off). TEST data, no
  // campaign claim.
  'test.thin-sign': {
    id:'test.thin-sign',note:'TEST: a thin prop (a sign) between a Ranger and a zombie — shots across it pay −5, and it does not block the walk. No campaign claim.',mapId:'test.map.thin-sign',
    map:{id:'test.map.thin-sign',name:'Thin sign TEST',rows:['.........'],props:[{id:'prop.test.sign',height:'thin',material:1,footprint:{kind:'hex',hexes:[4]}}]},
    heroes:['test-ranger'],heroHexes:[0],enemies:['test-zombie'],enemyHexes:[8],replicate:0,
  },
  // trigger.mage.kindle (Andrew, 2026-09-25, DECISIONS.md: "Build Kindle is described."): the TEST
  // Mage and a Warrior against three zombies on open ground — every swing the Mage makes, hit or
  // miss, sets Burn on its target (test.mage.kindle). TEST data, no campaign claim.
  'test.mage-kindle': {
    id:'test.mage-kindle',note:'TEST: the test Mage swings at zombies; every swing, hit or miss, Burns its target (test.mage.kindle). No campaign claim.',mapId:'test.map.mage-kindle',
    map:{id:'test.map.mage-kindle',name:'Mage Kindle TEST',rows:['.........','.........','.........','.........','.........']},
    heroes:['test-mage','test-warrior'],heroHexes:[18,27],enemies:['test-zombie','test-zombie','test-zombie'],enemyHexes:[24,25,34],replicate:0,
  },
  // v2.structures (Andrew, 2026-09-24, DECISIONS.md — walls, towers and houses): a Ranger in
  // a tower, a Warrior up on a wall run (stairs on its north end, from the west), a zombie in
  // a house (its door on the east) and two more coming. Every attack the heroes make from up
  // there, and every one made at them, carries a structure's row. TEST data, no campaign claim.
  'test.structures': {
    id:'test.structures',note:'TEST: a tower, a wall run with stairs and a house with a door — heroes up top, zombies below and one indoors. No campaign claim.',mapId:'test.map.structures',
    map:{id:'test.map.structures',name:'Structures TEST',rows:['.........','.W.......','TW....H..','.W.......','.........'],entries:[[10,9],[24,25]]},
    heroes:['test-ranger','test-warrior'],heroHexes:[18,19],enemies:['test-zombie','test-zombie','test-zombie'],enemyHexes:[24,8,44],replicate:0,
  },
  'test.cover-crates': {
    id:'test.cover-crates',note:'TEST target-end low hex cover, passable crates.',mapId:'test.map.cover-crates',
    map:{id:'test.map.cover-crates',name:'Cover crates TEST',rows:['.......','.......','.......'],props:[{id:'prop.crates',height:'low',material:1,footprint:{kind:'hex',hexes:[10]}}]},
    heroes:['test-ranger'],heroHexes:[7],enemies:['test-zombie'],enemyHexes:[11],replicate:0,
  },
  'test.cover-fence': {
    id:'test.cover-fence',note:'TEST finite low fence cover and explicit crossing cost.',mapId:'test.map.cover-fence',
    map:{id:'test.map.cover-fence',name:'Cover fence TEST',rows:['.......','.......','.......'],props:[{id:'prop.fence',height:'low',material:2,crossingCost:1,footprint:{kind:'polygon',vertices:[[7800,2100],[8200,2100],[8200,3900],[7800,3900]],movementPadding:0}}]},
    heroes:['test-ranger'],heroHexes:[7],enemies:['test-zombie'],enemyHexes:[11],replicate:3,
  },
  'test.geometry-corridor': {
    id:'test.geometry-corridor',note:'TEST finite straight wall and independent missing floor.',mapId:'test.map.geometry-corridor',
    map:{id:'test.map.geometry-corridor',name:'Geometry corridor TEST',rows:['.....','.....','.....'],floor:[false,true,true,true,true,true,true,true,true,true,true,true,true,true,true],props:[{id:'prop.corridor-wall',height:'high',material:3,footprint:{kind:'polygon',vertices:[[3900,1800],[4100,1800],[4100,4200],[3900,4200]],movementPadding:100}}]},
    heroes:['test-ranger'],heroHexes:[5],enemies:['test-zombie'],enemyHexes:[9],replicate:0,
  },
  'test.geometry-diagonal': {
    id:'test.geometry-diagonal',note:'TEST finite diagonal wall and a different floor gap.',mapId:'test.map.geometry-diagonal',
    map:{id:'test.map.geometry-diagonal',name:'Geometry diagonal TEST',rows:['......','......','......','......'],floor:[true,true,false,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true],props:[{id:'prop.diagonal-wall',height:'high',material:2,footprint:{kind:'polygon',vertices:[[4600,1200],[5100,1400],[3500,5400],[3000,5200]],movementPadding:320}}]},
    heroes:['test-ranger'],heroHexes:[6],enemies:['test-zombie'],enemyHexes:[11],replicate:3,
  },
}

// The kill-switch seam (disable.ts): byte-identical object when nothing is
// disabled, so the control baselines cannot see the seam exists.
export const SCENARIOS = omitDisabled(RAW_SCENARIOS)

/**
 * A scenario as `createBattle` options. One place does this mapping, so the
 * tool, the tests and any future caller field the scenario identically —
 * `enemyCount` comes from the roster's own length rather than being a second
 * number that can disagree with it.
 */
export function scenarioOptions(s: ScenarioDef) {
  return {
    scenarioId: s.id,
    replicate: s.replicate,
    mapId: s.mapId,
    ...(s.map ? { map: s.map } : {}),
    heroes: s.heroes,
    // an encounter scenario leaves the hero hexes to the encounter (its zone
    // or the player edge) — an empty list means "not named", not "zero"
    ...(s.heroHexes.length ? { heroHexes: [...s.heroHexes] } : {}),
    enemies: s.enemies,
    enemyHexes: [...s.enemyHexes],
    enemyCount: s.enemies.length,
    ...(s.heroItems ? { heroItems: s.heroItems } : {}),
    ...(s.heroStowed ? { heroStowed: s.heroStowed } : {}),
    ...(s.heroItemsUsed ? { heroItemsUsed: s.heroItemsUsed } : {}),
    ...(s.heroProgress ? { heroProgress: s.heroProgress } : {}),
    ...(s.heroBadges ? { heroBadges: s.heroBadges } : {}),
    ...(s.sides ? { sides: s.sides } : {}),
    ...(s.encounterId ? { encounter: encounterDef(s.encounterId) } : {}),
  }
}

/** An encounter by id, loudly (encounter.runner, 2026-09-03). */
export function encounterDef(id: string): EncounterDef {
  const e = ENCOUNTERS[id]
  if (!e) throw new Error(`unknown encounter '${id}' — known: ${Object.keys(ENCOUNTERS).join(', ') || '(none)'}`)
  return e
}

export function scenarioDef(id: string): ScenarioDef {
  const s = SCENARIOS[id]
  if (!s) {
    throw new Error(
      `unknown scenario '${id}' — scenarios are an explicit registry, `
      + `known ids: ${Object.keys(SCENARIOS).join(', ') || '(none)'}`,
    )
  }
  return s
}
