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
import { ENCOUNTERS } from './index.js'

const RAW_SCENARIOS: Readonly<Record<string, ScenarioDef>> = {
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
    note: 'encounter.runner (2026-09-03): battle.prologue-2, Surrounded, run as '
      + 'an ENCOUNTER — four zombies and two civilian objectives at setup, the '
      + 'skeletal archers at enemy phase 1 and 3, the fast zombies at 4, the '
      + 'necromancer at 5. The battle-2 party on its Codex kits. This is the '
      + 'fielding the probe reads the schedule, the shunt and the objectives in.',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive', 'hero.base.warrior-iron', 'hero.base.mage-fire', 'hero.base.priest-armored'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'battle.prologue-2',
    replicate: 0,
  },
  'showcase.two-zombies-and-a-child': {
    id: 'showcase.two-zombies-and-a-child',
    note: 'encounter.runner (2026-09-03): battle.prologue-1 as an encounter — '
      + 'the Orphans as the objective, two zombies, a third rolled onto one of two '
      + 'edges at Turn 4 (the wave cup), the loss timer at ten. One hero, as the '
      + 'row asks (heroes: 1, deployed near the player edge). The second encounter '
      + 'variant: the same runner, different data.',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'battle.prologue-1',
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
    note: 'battle.horrors-of-the-night as an encounter (capability.vision, 2026-09-03): '
      + 'the board starts dark, the four eyeblights, the dark snipers at Turn 1, the '
      + 'nightstalkers at 3, the shadow sorcerer at 4 — the light is a tug of war. '
      + 'Six heroes on Codex kits. The fielding the probe reads Nightfall and The '
      + 'Dark Rushes In in.',
    mapId: 'map.open',
    heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored', 'hero.base.paladin-hunk', 'hero.base.rogue-raven'],
    heroHexes: [],
    enemies: [],
    enemyHexes: [],
    encounterId: 'battle.horrors-of-the-night',
    replicate: 0,
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
    heroes: s.heroes,
    // an encounter scenario leaves the hero hexes to the encounter (its zone
    // or the player edge) — an empty list means "not named", not "zero"
    ...(s.heroHexes.length ? { heroHexes: [...s.heroHexes] } : {}),
    enemies: s.enemies,
    enemyHexes: [...s.enemyHexes],
    enemyCount: s.enemies.length,
    ...(s.heroItems ? { heroItems: s.heroItems } : {}),
    ...(s.heroProgress ? { heroProgress: s.heroProgress } : {}),
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
