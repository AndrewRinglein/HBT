// encounter.opening.gates (2026-10-01): battle 5 of the opening, the Curse (DECISIONS.md 2026-09-28
// "Gates is the Curse" and "Gates' curse strikes fall like the meteors; no Gates turn limit"): two
// Bruiser Demons, two Poison Imps, a Powerful Imp and the Lieutenant Demon in position at the gate; the
// curse strike on Turn 4 (encounter.area-fall's shape: 7 areas marked at the end of Turn 4's Enemy
// Phase, landing after Turn 5's Player Phase — 3 Weak, cursed ground); an Imp from each end on Turn 7.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { setLifeState } from '../src/core/mutate.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { layerOfId } from '../src/content/maps.js'
import { arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-gates', ENC = 'encounter.opening.gates', FALL = 'trigger.gates.curse-strike'
// Replicate 7: the curse lands on a hero and the battle runs past Turn 7, so both Imps arrive.
// No replicate is won untouched on the party drafted by battle 5 (0 of 200, 2026-10-01 — the 2026-09-29
// count "Gates 0" before the upgrades, DECISIONS.md "the battles might be too hard").
const SEEN = 7
describe('encounter.opening.gates', () => {
  it('fields the six defenders at the Ground Check\'s markers and carries the curse strike with the ruled numbers', () => {
    const e = encounterDef(ENC)
    expect(e.setup.map((p) => [p.unit, p.count ?? 1])).toEqual([
      ['unit.bruiser-demon', 2], ['unit.poison-imp', 2], ['unit.powerful-imp', 1], ['unit.lieutenant-demon', 1]])
    expect(e.falls!.map((f) => [f.id, f.turn, f.areas, f.layer, f.damage ?? null, f.applies]))
      .toEqual([[FALL, 4, 7, 'layer.weak', null, [['status.weak', 3]]]])
  })
  it('has no turn limit', () => expect(encounterDef(ENC).loseAfter).toBeUndefined())
  it('runs deterministically on its map', () => deterministic(S))
  it('one Imp arrives on Turn 7 from the top (the abbey end) and one from the bottom (behind the heroes)', () => {
    const ctx = openingBattle(S, SEEN, true)
    arrivedAt(ctx, 7, 'unit.imp', 10, 0)
    arrivedAt(ctx, 7, 'unit.imp', 10, 49)
  })
  it('the curse areas mark on Turn 4 and land at the end of Turn 5\'s Player Phase, cursing every hex and giving 3 Weak to every unit in them', () => {
    const ctx = openingBattle(S, SEEN, true)
    const marked = ctx.events.find((e) => e.type === 'area.marked')!, landed = ctx.events.find((e) => e.type === 'area.landed')!
    expect([marked.causeId, marked['turn'], landed['turn']]).toEqual([FALL, 4, 5])
    const hexes = [...new Set((landed['areas'] as number[][]).flat())]
    for (const h of hexes) expect(ctx.events.some((e) => e.type === 'layer.painted' && e.causeId === FALL && e['hex'] === h && e['layer'] === layerOfId('layer.weak'))).toBe(true)
    const hit = landed['hit'] as number[]
    expect(hit.length).toBeGreaterThan(0)
    for (const id of hit) expect(ctx.events.some((e) => e.type === 'status.applied' && e.causeId === FALL && e['target'] === id && e['statusId'] === 'status.weak' && e['amount'] === 3)).toBe(true)
  })
  it('is won when the last enemy dies, Turn 7\'s Imps included', () => {
    // Five of the six defenders are struck down at setup so the drafted party can finish the fight;
    // what is under test is the encounter's victory (clear the map, no limit), not its difficulty.
    const ctx = createBattle({ ...scenarioOptions(scenarioDef(S), 1), replicate: 1, cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0])
    const enemies = ctx.state.units.filter((u) => u.side === 'enemy')
    for (const u of enemies.filter((u) => u !== enemies.find((x) => x.typeId === 'unit.poison-imp'))) { u.hp = 0; setLifeState(ctx, u.id, 'dead', 'test', { reason: 'hp0' }) }
    runBattle(ctx)
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.turn).toBeGreaterThanOrEqual(7)
    const all = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(all.filter((u) => u.typeId === 'unit.imp')).toHaveLength(2)
    expect(all.every((u) => u.lifeState !== 'standing')).toBe(true)
  })
})
