// encounter.opening.orphanage (2026-09-28): battle 1 of the opening (DECISIONS.md 2026-09-28
// "Battle 1 (Orphanage) redefined"): a Zombie on the east edge, the Orphan Child and the School
// Teacher beside the orphanage as civilians (not objectives), a Zombie on Turn 4 from the bottom edge
// left of the water. Clear the map; no turn limit.
// was: two Zombies on the east edge ... and one on Turn 5 from the left edge, centre — fix.opening-orphanage-lighter
// (2026-09-29; DECISIONS.md 2026-09-28 'the Orphanage loses a Zombie at the start and a later one':
// "Let's remove an early zombie and a later zombie.")
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyDamage } from '../src/core/mutate.js'
import { settle } from '../src/core/settle.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { arrivals, arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-orphanage'
describe('encounter.opening.orphanage', () => {
  it('is on its own map, with the ruled setup', () => {
    const e = encounterDef('encounter.opening.orphanage')
    expect(e.mapId).toBe('map.opening.orphanage')
    expect(e.setup.map((p) => [p.unit, !!p.civilian, !!p.objective])).toEqual([
      ['hero.fixed.orphans', true, false], ['hero.fixed.school-teacher', true, false], ['unit.zombie', false, false]])
    expect(e.loseAfter).toBeUndefined()
  })
  it('runs deterministically on its map', () => deterministic(S))
  it('each arrival appears on its Turn at its hex', () => {
    const ctx = openingBattle(S, 0, true)
    // fix.opening-orphanage-arrivals (2026-09-29): "Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3."
    // (Andrew, DECISIONS.md 2026-09-29); where each arrives is SWITCHES.md openingOrphanageArrivals
    arrivedAt(ctx, 2, 'unit.zombie', 19, 5)
    arrivedAt(ctx, 3, 'unit.zombie', 0, 6)
    arrivedAt(ctx, 4, 'unit.zombie', 9, 13)
    // Law 10, fix.opening-orphanage-lighter (2026-09-29): Turn 5's Zombie from the left edge (0,6) is gone —
    // "Let's remove an early zombie and a later zombie." (DECISIONS.md 2026-09-28; which one: SWITCHES.md
    // openingOrphanageLighter). The row no longer has it, so the probe no longer asks for it.
    // was: arrivedAt(ctx, 5, 'unit.zombie', 0, 6)
  })
  // fix.opening-orphanage-lighter (2026-09-29): "Let's remove an early zombie and a later zombie."
  // (Andrew, DECISIONS.md 2026-09-28 'the Orphanage loses a Zombie at the start and a later one').
  // Which of each is SWITCHES.md openingOrphanageLighter: (19,5) and Turn 5's go; (19,3) and Turn 4's stay.
  it('the lighter start: one Zombie at the start and one later arrival, and no more', () => {
    const e = encounterDef('encounter.opening.orphanage')
    const zombies = e.setup.filter((p) => p.unit === 'unit.zombie')
    expect(zombies.map((p) => [p.count ?? 1, p.hexes ?? [p.at]])).toEqual([[1, [{ col: 19, row: 3 }]]])
    // Law 10, fix.opening-orphanage-arrivals (2026-09-29): "Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3."
    // (Andrew, DECISIONS.md 2026-09-29) — the start still has one Zombie; the arrivals are now Turns 2, 3 and 4.
    // was: .toEqual([[4, ['unit.zombie']]])
    expect((e.schedule ?? []).map((s) => [s.phase, s.spawn.map((u) => u.unit)])).toEqual([[2, ['unit.zombie']], [3, ['unit.zombie']], [4, ['unit.zombie']]])
    for (const replicate of [0, 1, 2]) {
      const ctx = openingBattle(S, replicate, true)
      const w = ctx.geo.board.width
      const atStart = ctx.events.filter((ev) => ev.type === 'unit.enter' && ev.turn === 0 && ev['typeId'] === 'unit.zombie').map((ev) => ev['hex'])
      expect(atStart, `replicate ${replicate}: the Zombies placed at the start`).toEqual([3 * w + 19])
      // Law 10, fix.opening-orphanage-arrivals (2026-09-29): Turns 2 and 3 gained a Zombie each (DECISIONS.md 2026-09-29).
      // was: .toEqual([[4, 'unit.zombie']]) and .toBe(2)
      expect(arrivals(ctx).map(([t, u]) => [t, u]), `replicate ${replicate}: the arrivals`).toEqual([[2, 'unit.zombie'], [3, 'unit.zombie'], [4, 'unit.zombie']])
      expect(ctx.state.units.filter((u) => u.side === 'enemy').length, `replicate ${replicate}: enemies in the whole battle`).toBe(4)
    }
  })
  it('a civilian\'s death does not end the battle, and it ends won when the last enemy dies — no loss', () => {
    // Law 10, fix.opening-party (2026-09-29): the battle now fields the party drafted by this point, not four Alpha heroes, so which replicate is a win changed — with the child killed at the start, one drafted hero loses replicate 0; replicate 1 is a
    // win (27 of 50 won untouched). Same assertions.
    // Law 10, fix.opening-orphanage-arrivals (2026-09-29): Turns 2 and 3 gained a Zombie each (DECISIONS.md 2026-09-29), so
    // which replicate is a win changed — replicate 1 now loses with the child killed at the start; replicate 4 wins. Same assertions.
    // was: scenarioOptions(scenarioDef(S), 1)
    const ctx = createBattle(scenarioOptions(scenarioDef(S), 4))
    const child = ctx.state.units.find((u) => u.typeId === 'hero.fixed.orphans')!
    applyDamage(ctx, child.id, 99, 'test.kill', { actor: null }); settle(ctx, 'test.kill')
    expect(child.lifeState).not.toBe('standing')
    expect(ctx.state.outcome).toBeNull()
    runBattle(ctx)
    expect(ctx.state.outcome).toBe('heroClear')
    const end = ctx.events.findIndex((e) => e.type === 'battle.end')
    expect(ctx.state.units.filter((u) => u.side === 'enemy').every((u) => u.lifeState !== 'standing')).toBe(true)
    expect(ctx.events.slice(0, end).some((e) => e.type === 'encounter.lost')).toBe(false)
  })
})
