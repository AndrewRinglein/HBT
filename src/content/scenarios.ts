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
    // Spirit Snake and Green Drake are hero-side by Angela\'s 2026-08-20 ruling
    // ("these beasts were meant to be player beasts"). The Shadow Hound Puppy is
    // NOT — its row carries side: 'enemy', so it is fielded as one. §6.2's
    // example listed all three as heroes; setup would have placed the puppy on
    // the enemy side anyway, because makeUnit reads the def. Now that disagreement
    // throws instead of resolving silently.
    heroes: ['spirit-snake', 'green-drake'],
    heroHexes: [79, 80],
    enemies: ['shadow-hound-puppy', 'test-zombie', 'test-zombie-burning'],
    enemyHexes: [40, 41, 42],
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
