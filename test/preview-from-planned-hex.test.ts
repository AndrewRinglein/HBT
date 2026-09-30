// preview.from-planned-hex — PLAYABLE-OPENING-PLAN.md item 3; VFX/UI-BUILD-NOTES-2026-09-02.md §5:
// "Every preview in steps 3–4 resolves from the phantom's hex ... preview() must accept a
// hypothetical position." The ghost is ruled (DECISIONS.md 2026-09-29, "click a hex for a ghost,
// click again to confirm"), and "pointing at an enemy lights up where it can move and hit".
//
// Expect: a preview asked from a planned hex equals the preview taken after actually moving
// there, number for number; asking draws no RNG and changes nothing; an enemy's move-and-hit
// hexes come from the engine. SWITCHES.md "preview.from-planned-hex" records the defaults.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { canAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeAction } from '../src/core/commands.js'
import { saveBattle } from '../src/core/snapshot.js'
import { forecastFrom, previewFrom, threatOf } from '../src/core/forecast.js'
import { TERRAIN, type Ctx } from '../src/core/types.js'
import { distance, hexId, HEX_COUNT, neighboursOf } from './board16.js'

const BOW = 'attack.test-ranger.bow', BITE = 'attack.test-zombie.bite', WALK = 'power.move'

/** Everything a question could disturb: the state, the event log, the rolls. */
function untouched(ctx: Ctx, ask: () => unknown): void {
  const state = saveBattle(ctx), events = ctx.events.length, rolls = ctx.rng.log.length, seq = ctx.state.seq
  ask()
  expect(saveBattle(ctx)).toBe(state)
  expect(ctx.events.length).toBe(events)
  expect(ctx.rng.log.length).toBe(rolls)
  expect(ctx.state.seq).toBe(seq)
}

describe('preview.from-planned-hex — the forecast from where the unit WOULD stand', () => {
  it('a ranger planning onto hills: out of reach where it stands, in reach from the ghost, and the forecast equals the preview after the real move', () => {
    const ranger = hexId(2, 8), hill = hexId(4, 8), zombie = hexId(11, 8)
    const ctx = createCustomBattle([{ type: 'test-ranger', hex: ranger }], [{ type: 'test-zombie', hex: zombie }], { strict: true })
    ctx.state.terrain[hill] = TERRAIN.HILLS
    beginActivation(ctx, 0, 'test')
    expect(distance(hill, zombie)).toBe(7)                        // reach 6 on open ground, 7 on hills (+1)
    expect(canAttack(ctx, 0, 1, BOW)).toBe(false)                 // from where it stands: 9 hexes, no shot
    const move = { actor: 0, actionId: WALK, destination: hill }
    let asked: ReturnType<typeof previewFrom> = null
    untouched(ctx, () => { asked = previewFrom(ctx, move, 1, BOW) })
    const f = forecastFrom(ctx, move)
    if (!f.ok) throw new Error(f.reason)
    expect(f).toMatchObject({ hex: hill, arrives: true, provokes: [], terrain: 'terrain.hills', layer: 'layer.none' })
    expect(f.standingIn).toContainEqual(expect.objectContaining({ stat: 'reach', value: 1, source: 'terrain.hills' }))
    expect(f.actions).toContainEqual({ actor: 0, actionId: BOW, target: 1 })   // THE action list, from the ghost
    expect(asked!.legal).toBe(true)
    expect(asked!.accLedger).toContainEqual(expect.objectContaining({ effectId: 'terrain.hills', delta: 10 }))
    // now really move, and ask again where it stands
    expect(executeAction(ctx, move)).toEqual({ ok: true })
    expect(f.stamina).toBe(ctx.state.units[0]!.stamina)
    expect(f.movePointsLeft).toBe(ctx.state.units[0]!.movePointsLeft)
    expect(asked).toEqual({ legal: canAttack(ctx, 0, 1, BOW), ...preview(ctx, 0, 1, BOW) })
  })

  it('an aura the ghost would stand in is in its numbers: a zombie planning beside the golem carries its Dread, number for number', () => {
    const w = hexId(8, 8)
    const target = neighboursOf(w)[0]!
    // the golem beside the ghost's hex; the zombie starts beside it too, but out of both zones — leaving provokes nobody
    const around = neighboursOf(target)
    const [golem, start] = around.flatMap((g) => g === w ? [] : around.filter((s) => s !== g && distance(s, w) >= 2 && distance(s, g) >= 2).map((s) => [g, s] as const))[0]!
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: w }, { type: 'test-arc-golem', hex: golem }], [{ type: 'test-zombie', hex: start }], { strict: true })
    beginActivation(ctx, 2, 'test')
    const move = { actor: 2, actionId: WALK, destination: target }
    const f = forecastFrom(ctx, move)
    if (!f.ok) throw new Error(f.reason)
    expect(f.provokes).toEqual([])
    expect(f.standingIn).toContainEqual(expect.objectContaining({ stat: 'accuracy', value: -10, source: 'aura.test-golem.dread' }))
    let asked: ReturnType<typeof previewFrom> = null
    untouched(ctx, () => { asked = previewFrom(ctx, move, 0, BITE) })
    expect(asked!.legal).toBe(true)
    expect(executeAction(ctx, move)).toEqual({ ok: true })
    expect(asked).toEqual({ legal: canAttack(ctx, 2, 0, BITE), ...preview(ctx, 2, 0, BITE) })
  })

  it('the provoke points on the path: the holder, its chosen swing and that swing\'s preview — recorded, never rolled; a sidestep provokes nothing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }], { strict: true })
    beginActivation(ctx, 0, 'test')
    const move = { actor: 0, actionId: WALK, destination: hexId(5, 2) }
    let f = { ok: false, reason: 'unasked' } as ReturnType<typeof forecastFrom>
    untouched(ctx, () => { f = forecastFrom(ctx, move) })
    if (!f.ok) throw new Error(f.reason)
    expect(f.arrives).toBe(true)   // the plan is forecast as arriving; the swing is shown, not rolled
    expect(f.provokes).toEqual([{ at: hexId(5, 5), from: 1, attackId: BITE, preview: preview(ctx, 1, 0, BITE) }])
    expect(ctx.events.some((e) => e.type === 'aoo.provoked')).toBe(false)
    const step = forecastFrom(ctx, { actor: 0, actionId: 'power.sidestep', destination: hexId(5, 4) })
    expect(step.ok && step.provokes).toEqual([])
    // the real walk swings exactly the attack the forecast named
    expect(executeAction(ctx, move)).toEqual({ ok: true })
    expect(ctx.events.filter((e) => e.type === 'aoo.provoked').map((e) => [e['actor'], e['attackId']])).toEqual([[1, BITE]])
  })

  it('a plan the legality function refuses is refused with its reason, and nothing is forecast', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }], { strict: true })
    beginActivation(ctx, 0, 'test')
    expect(forecastFrom(ctx, { actor: 0, actionId: WALK, destination: hexId(5, 6) })).toEqual({ ok: false, reason: 'unreachable-destination' })
    expect(previewFrom(ctx, { actor: 0, actionId: WALK, destination: hexId(15, 15) }, 1, 'attack.punch')).toBeNull()
  })

  it('the enemy reach query: a zombie on open ground walks 4 and bites 1 — every hex within 4, every hex within 5, from the engine and touching nothing', () => {
    const z = hexId(8, 8)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(0, 0) }], [{ type: 'test-zombie', hex: z }], { strict: true })
    expect(ctx.state.units[1]!.movePointsLeft).toBe(0)   // not its Activation — the query opens one on a fork
    let t = { move: [] as number[], hit: [] as number[] }
    untouched(ctx, () => { t = threatOf(ctx, 1) })
    const within = (n: number) => Array.from({ length: HEX_COUNT }, (_, h) => h).filter((h) => h !== z && distance(h, z) <= n)
    expect(t.move).toEqual(within(4))
    expect(t.hit).toEqual(within(5))
  })

  it('the enemy reach query reads the board: a body blocks a hex but can be bitten, hills cost 2, and walking out of a zone is forecast, not rolled', () => {
    const z = hexId(8, 8), hero = hexId(9, 8)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hero }], [{ type: 'test-zombie', hex: z }], { strict: true })
    const near = hexId(8, 5), far = hexId(8, 4)
    expect([distance(z, near), distance(z, far)]).toEqual([3, 4])
    ctx.state.terrain[near] = TERRAIN.HILLS
    ctx.state.terrain[far] = TERRAIN.HILLS
    let t = { move: [] as number[], hit: [] as number[] }
    untouched(ctx, () => { t = threatOf(ctx, 1) })
    expect(t.move).not.toContain(hero)
    expect(t.hit).toContain(hero)
    expect(t.move).toContain(near)                  // 2 open hexes and a hill: 4 points
    expect(t.move).not.toContain(far)               // 3 hexes and a hill: 5 points, one too many
    expect(t.hit).toContain(far)                    // but it bites onto it from beside it
    expect(ctx.events.some((e) => e.type === 'aoo.provoked')).toBe(false)
  })
})
