// ISC-002 — a finished battle yields per-hero casualty data — who was downed,
// who died, damage taken, kills — folded from ctx.events alone.
// THIN-SLICE-IMPLEMENTATION.md §4.2 · GAME-ARCHITECTURE.md §5
//
// The fold is checked against a SECOND, deliberately naive count over the same
// log, written here without reference to the seam's code — the only honest test
// of a fold is another fold that cannot share its mistakes.

import { describe, it, expect } from 'vitest'
import { resolveEngagement, makeBattleResult, battleOptionsOf, type EngagementSpec } from '../src/core/seam.js'
import { createBattle, runBattle } from '../src/engine.js'

const SIX_V_FOUR: EngagementSpec = {
  id: 'test.seam.six-v-four',
  mapId: 'map.open',
  heroes: ['test-oathblade', 'test-sky-pirate', 'test-dusk-hawk', 'test-air-mage', 'test-lucius', 'test-osric'],
  enemies: ['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie-burning'],
  seed: 0,
}

const ONE_V_EIGHT: EngagementSpec = {
  id: 'test.seam.one-v-eight',
  mapId: 'map.open',
  heroes: ['test-dusk-hawk'],
  enemies: Array.from({ length: 8 }, () => 'test-zombie'),
  seed: 0,
}

/** The naive second count. Unit ids come from unit.enter, in order per side. */
function naiveTally(events: readonly { type: string; actor: number | null; target: number | null; [k: string]: unknown }[]) {
  const side = new Map<number, string>()
  const order: number[] = []
  const taken = new Map<number, number>()
  const dealt = new Map<number, number>()
  const downed = new Set<number>()
  const dead = new Set<number>()
  const kills = new Map<number, number>()
  const lastHitter = new Map<number, number | null>()
  for (const e of events) {
    if (e.type === 'unit.enter') { side.set(e.actor!, e['side'] as string); order.push(e.actor!) }
    if (e.type === 'damage.applied') {
      taken.set(e.target!, (taken.get(e.target!) ?? 0) + (e['amount'] as number))
      if (e.actor !== null) dealt.set(e.actor, (dealt.get(e.actor) ?? 0) + (e['amount'] as number))
      if ((e['hpAfter'] as number) <= 0) lastHitter.set(e.target!, e.actor)
    }
    // A kill is credited to whoever's damage took an OPPOSING unit to zero —
    // an enemy dying at hp 0, a hero going down at hp 0. Bleeding out credits
    // nobody: the clock did that, not a hand.
    const credit = (target: number) => {
      const killer = lastHitter.get(target)
      if (killer !== null && killer !== undefined && side.get(killer) !== side.get(target)) kills.set(killer, (kills.get(killer) ?? 0) + 1)
    }
    if (e.type === 'life.downed') { downed.add(e.target!); if (e['reason'] === 'hp0') credit(e.target!) }
    if (e.type === 'life.dead') { dead.add(e.target!); if (e['reason'] === 'hp0') credit(e.target!) }
  }
  return { side, order, taken, dealt, downed, dead, kills }
}

describe('ISC-002 — per-unit casualty data folded from the events alone', () => {
  it('six against four: every row agrees with an independent count of the same log', () => {
    const { result, events } = resolveEngagement(SIX_V_FOUR)
    const n = naiveTally(events)
    expect(result.units.length).toBe(10)
    expect(result.units.filter((u) => u.side === 'hero').map((u) => u.typeId)).toEqual([...SIX_V_FOUR.heroes])
    expect(result.units.filter((u) => u.side === 'enemy').map((u) => u.typeId)).toEqual([...SIX_V_FOUR.enemies])
    for (const u of result.units) {
      expect(u.unitId, `${u.name} unitId`).toBe(n.order[u.side === 'hero' ? u.index : SIX_V_FOUR.heroes.length + u.index])
      expect(u.damageTaken, `${u.name} damageTaken`).toBe(n.taken.get(u.unitId) ?? 0)
      expect(u.damageDealt, `${u.name} damageDealt`).toBe(n.dealt.get(u.unitId) ?? 0)
      expect(u.downed, `${u.name} downed`).toBe(n.downed.has(u.unitId))
      expect(u.dead, `${u.name} dead`).toBe(n.dead.has(u.unitId))
      expect(u.kills, `${u.name} kills`).toBe(n.kills.get(u.unitId) ?? 0)
    }
    // Something happened — a fold over an empty fight would agree with anything.
    expect(result.units.reduce((s, u) => s + u.damageTaken, 0)).toBeGreaterThan(0)
    expect(result.turns).toBeGreaterThan(0)
    expect(result.heroPhases).toBeGreaterThan(0)
    expect(result.enemyPhases).toBeGreaterThan(0)
  })

  it('a wiped fielding reports every hero downed or dead, and a cleared one every enemy dead', () => {
    const { result } = resolveEngagement(ONE_V_EIGHT)
    expect(result.outcome).toBe('wipe')
    for (const u of result.units.filter((x) => x.side === 'hero')) expect(u.downed || u.dead, u.name).toBe(true)
    const six = resolveEngagement(SIX_V_FOUR).result
    if (six.outcome === 'heroClear') for (const u of six.units.filter((x) => x.side === 'enemy')) expect(u.dead, u.name).toBe(true)
    if (six.outcome === 'wipe') for (const u of six.units.filter((x) => x.side === 'hero')) expect(u.downed || u.dead, u.name).toBe(true)
  })

  it('the fold reads the log and nothing else: folding the engine\'s own events gives the same result', () => {
    const ctx = createBattle(battleOptionsOf(SIX_V_FOUR))
    const engineResult = runBattle(ctx)
    const folded = makeBattleResult(SIX_V_FOUR, ctx.events)
    expect(folded.outcome).toBe(engineResult.outcome)
    expect(folded.turns).toBe(engineResult.turns)
    expect(folded).toEqual(resolveEngagement(SIX_V_FOUR).result)
  })

  it('a log with no battle.end is refused, loudly (Law 9)', () => {
    const ctx = createBattle(battleOptionsOf(SIX_V_FOUR))
    expect(() => makeBattleResult(SIX_V_FOUR, ctx.events)).toThrow(/battle\.end/)
  })
})
