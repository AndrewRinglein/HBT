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

import type { ScenarioDef } from '../core/types.js'
import { omitDisabled } from './disable.js'

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
    note: 'Battle 1 in miniature: the Hunter against two authored zombies — '
      + 'the content.hero-pack verify battle. Iron Dwarf and Battle Chaplain '
      + 'join when their kits get dictated overrides (named gaps until then).',
    mapId: 'map.open',
    heroes: ['hero.base.ranger-aggressive'],
    heroHexes: [247],
    enemies: ['unit.zombie', 'unit.zombie'],
    enemyHexes: [118, 122],
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
    heroHexes: [...s.heroHexes],
    enemies: s.enemies,
    enemyHexes: [...s.enemyHexes],
    enemyCount: s.enemies.length,
  }
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
