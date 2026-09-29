// encounter.opening.lumberjack (2026-09-28): battle 2 of the opening (DECISIONS.md 2026-09-28
// "battle 2's final schedule"): three Zombies on the east edge; the Lumberjack and his Wife, two
// civilian units, on the road in column 13; Skeletal Archers at the end of Turn 1's Enemy Phase
// (bottom edge) and on Turn 3 (top, and behind the heroes); the Undead Soldier (unit.soldier) on
// Turn 5 behind the heroes. Seven enemies. Clear the map.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyDamage } from '../src/core/mutate.js'
import { settle } from '../src/core/settle.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { arrivals, arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-lumberjack'
describe('encounter.opening.lumberjack', () => {
  it('runs deterministically on its map', () => deterministic(S))
  it('seven enemies arrive on their Turns', () => {
    const ctx = openingBattle(S, 0, true)
    arrivedAt(ctx, 2, 'unit.skeletal-archer', 10, 13)
    arrivedAt(ctx, 3, 'unit.skeletal-archer', 13, 0)
    arrivedAt(ctx, 3, 'unit.skeletal-archer', 0, 5)
    arrivedAt(ctx, 5, 'unit.soldier', 0, 9)
    const enemies = ctx.state.units.filter((u) => u.side === 'enemy' && !u.summoned)
    expect(enemies).toHaveLength(7)
    expect(arrivals(ctx)).toHaveLength(4)
  })
  it('the Lumberjack and the Wife are two units, and either may die without ending the battle', () => {
    for (const dies of ['hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife']) {
      const ctx = createBattle(scenarioOptions(scenarioDef(S)))
      const lj = ctx.state.units.filter((u) => u.typeId === 'hero.fixed.lumberjack-and-wife' || u.typeId === 'hero.fixed.lumberjacks-wife')
      expect(lj.map((u) => u.typeId).sort()).toEqual(['hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife'])
      const u = lj.find((x) => x.typeId === dies)!
      applyDamage(ctx, u.id, 99, 'test.kill', { actor: null }); settle(ctx, 'test.kill')
      expect(ctx.state.outcome).toBeNull()
      expect(lj.find((x) => x !== u)!.lifeState).toBe('standing')
    }
    expect(encounterDef('encounter.opening.lumberjack').setup.filter((p) => p.civilian).every((p) => !p.objective)).toBe(true)
  })
  it('is won when the last enemy dies', () => {
    // Law 10, fix.opening-party (2026-09-29): the battle now fields the party drafted by this point, not four Alpha heroes, so which replicate is a win changed — on the party replicate 0 is lost (36 of 50 won) and replicate 1 is a win. Same assertion.
    const ctx = openingBattle(S, 1)
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.units.filter((u) => u.side === 'enemy').every((u) => u.lifeState !== 'standing')).toBe(true)
  })
})
