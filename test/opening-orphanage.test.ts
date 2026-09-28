// encounter.opening.orphanage (2026-09-28): battle 1 of the opening (DECISIONS.md 2026-09-28
// "Battle 1 (Orphanage) redefined"): two Zombies on the east edge, the Orphan Child and the School
// Teacher beside the orphanage as civilians (not objectives), a Zombie on Turn 4 from the bottom edge
// left of the water and one on Turn 5 from the left edge, centre. Clear the map; no turn limit.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyDamage } from '../src/core/mutate.js'
import { settle } from '../src/core/settle.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

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
    arrivedAt(ctx, 4, 'unit.zombie', 9, 13)
    arrivedAt(ctx, 5, 'unit.zombie', 0, 6)
  })
  it('a civilian\'s death does not end the battle, and it ends won when the last enemy dies — no loss', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef(S)))
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
