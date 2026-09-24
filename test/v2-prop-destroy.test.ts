// v2.prop-destroy — V2 R7 part 1: destructible props (COMBAT-V2-DESIGN-2026-09-07.md
// §12, ruled 2026-09-07; events §15.1).
//
//   The tier is the number of destroy steps a prop takes: intact → damaged → destroyed.
//   Destroy N rides on attacks and bursts; an attack strikes the hex it hits, a burst
//   every hex and every edge touching its shape. Misses do not destroy. The state
//   changes at the end of the attack's resolution. Destroyed high cover leaves low
//   cover; a destroyed low prop leaves nothing. Battle-scoped.
//
// Content (TEST lane): attack.test-destroy.chop (Destroy 1), attack.test-destroy.wreck
// (Destroy 2); units test-destroy-chopper / -wrecker; scenario test.prop-destroy.
// Defaults the documents do not answer are SWITCHES.md "V2 prop destruction".
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { runBattle } from '../src/core/battle.js'
import { useBurst } from '../src/core/burst.js'
import { attackLineClear } from '../src/core/los.js'
import { hasLowCover } from '../src/core/cover.js'
import { decodeProps, passableHexes } from '../src/core/props.js'
import { attackPacketFields } from '../src/core/attack-profile.js'
import { burstProfile } from '../src/core/burst-profile.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import type { BurstDef, Ctx, Event } from '../src/core/types.js'

const CHOP = 'attack.test-destroy.chop'
const WRECK = 'attack.test-destroy.wreck'
const AXE = 'attack.test-warrior.axe'
const damaged = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'prop.damaged')
const destroyed = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'prop.destroyed')
const low = (id: string, hex: number, material: 1 | 2 | 3) => ({ id, height: 'low', material, footprint: { kind: 'hex', hexes: [hex] } })
const high = (id: string, hex: number, material: 1 | 2 | 3, extra = {}) => ({ id, height: 'high', material, footprint: { kind: 'hex', hexes: [hex] }, ...extra })
// Seven wide, five tall; hex = row * 7 + col, and the same row's col ± 1 are adjacent.
const board = (props: unknown[]) => ({ id: 'test.map.destroy', name: 'Destroy TEST', rows: Array(5).fill('.......'), props })

/** Hero 0 adjacent to a zombie (1); triggers and Block off, a sure hit, plenty of HP. */
function rig(hero: string, props: unknown[], heroHex = 9, enemyHex = 10): Ctx {
  const ctx = createBattle({ replicate: 0, map: board(props) as never, heroes: [hero], enemies: ['test-zombie'], heroHexes: [heroHex], enemyHexes: [enemyHex],
    cfg: { switches: { critEnabled: false } as never } })
  for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 100 }
  ctx.state.units[0]!.accuracy = 500
  beginActivation(ctx, 0, 'test')
  return ctx
}
/** Another swing this activation — the test drives the attacks, not the turn. */
function swing(ctx: Ctx, attackId: string) {
  const u = ctx.state.units[0]!
  u.primaryUsed = false; u.moveUsed = false
  return performAttack(ctx, 0, 1, attackId)
}

describe('steps and tiers — the tier is the number of steps it takes', () => {
  it('Destroy 1 against an old stone wall (tier 2): damaged, then destroyed, and a low prop leaves nothing', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.wall', 10, 2)])
    const r = swing(ctx, CHOP)
    expect(r.hit).toBe(true)
    expect(ctx.state.props).toEqual([{ ...low('prop.test.wall', 10, 2), steps: 1 }])
    expect(damaged(ctx)).toHaveLength(1)
    expect(damaged(ctx)[0]).toMatchObject({ prop: 'prop.test.wall', footprint: 'hex', height: 'low', tier: 2, stepsBefore: 0, stepsAfter: 1, actor: 0, causeId: CHOP })
    expect(destroyed(ctx)).toHaveLength(0)
    swing(ctx, CHOP)
    expect(ctx.state.props).toEqual([])
    expect(damaged(ctx)[1]).toMatchObject({ stepsBefore: 1, stepsAfter: 2 })
    expect(destroyed(ctx)).toHaveLength(1)
    expect(destroyed(ctx)[0]).toMatchObject({ prop: 'prop.test.wall', leaves: 'nothing', actor: 0, causeId: CHOP })
  })
  it('Destroy 2 against barrels (tier 1): destroyed at once; the step past the tier is lost', () => {
    const ctx = rig('test-destroy-wrecker', [low('prop.test.barrels', 10, 1)])
    swing(ctx, WRECK)
    expect(damaged(ctx)[0]).toMatchObject({ tier: 1, stepsBefore: 0, stepsAfter: 1, causeId: WRECK })
    expect(destroyed(ctx)[0]).toMatchObject({ prop: 'prop.test.barrels', leaves: 'nothing' })
    expect(ctx.state.props).toEqual([])
  })
  it('the same Destroy 2 takes an old stone wall (tier 2) in one swing — the second variant is pure data', () => {
    const ctx = rig('test-destroy-wrecker', [low('prop.test.wall', 10, 2)])
    swing(ctx, WRECK)
    expect(damaged(ctx)[0]).toMatchObject({ tier: 2, stepsBefore: 0, stepsAfter: 2 })
    expect(destroyed(ctx)).toHaveLength(1)
  })
  it('only the struck hex: a prop in the attacker\'s hex, or beside the target, is untouched', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.mine', 9, 3), low('prop.test.beside', 11, 3), low('prop.test.struck', 10, 3)])
    swing(ctx, CHOP)
    expect(damaged(ctx).map((e) => e['prop'])).toEqual(['prop.test.struck'])
  })
  it('two props in the struck hex each take the steps, in prop-id order', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.z', 10, 3), low('prop.test.a', 10, 3)])
    swing(ctx, CHOP)
    expect(damaged(ctx).map((e) => e['prop'])).toEqual(['prop.test.a', 'prop.test.z'])
  })
})

describe('misses do not destroy', () => {
  it('a miss strikes nothing', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)])
    ctx.state.units[0]!.accuracy = -1000
    expect(preview(ctx, 0, 1, CHOP).hitChance).toBe(0)
    const r = swing(ctx, CHOP)
    expect(r.hit).toBe(false)
    expect(damaged(ctx)).toHaveLength(0)
    expect(ctx.state.props).toHaveLength(1)
  })
  it('a Block strikes nothing', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)])
    ctx.state.units[1]!.block = 1000
    const r = swing(ctx, CHOP)
    expect(r.blocked).toBe(true)
    expect(damaged(ctx)).toHaveLength(0)
  })
  it('an attack without Destroy strikes nothing', () => {
    const ctx = rig('test-warrior', [low('prop.test.barrels', 10, 1)])
    const r = swing(ctx, AXE)
    expect(r.hit).toBe(true)
    expect(damaged(ctx)).toHaveLength(0)
    expect(ctx.state.props).toHaveLength(1)
  })
})

describe('timing — at the end of the attack\'s resolution, once per attack', () => {
  it('a two-hit Destroy 1 swing applies one step, after both hits', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.stone', 10, 3)])
    const twice = structuredClone(ctx.actions[CHOP]!) as { attack: { hits?: number } }
    twice.attack.hits = 2
    ctx.actions = { ...ctx.actions, [CHOP]: twice as never }
    swing(ctx, CHOP)
    const declared = ctx.events.filter((e) => e.type === 'attack.declared')
    expect(declared).toHaveLength(2)
    expect(damaged(ctx)).toHaveLength(1)
    expect(damaged(ctx)[0]).toMatchObject({ stepsBefore: 0, stepsAfter: 1 })
    expect(damaged(ctx)[0]!.seq).toBeGreaterThan(Math.max(...declared.map((e) => e.seq)))
  })
  it('the prop array is replaced, never edited in place (a shallow fork never sees it)', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.wall', 10, 2)])
    const before = ctx.state.props, snapshot = structuredClone(before)
    swing(ctx, CHOP)
    expect(ctx.state.props).not.toBe(before)
    expect(before).toEqual(snapshot)
  })
})

describe('destroyed high cover leaves low cover — bursts reach every prop touching the shape', () => {
  const id = 'test.burst.destroy'
  function blast(props: unknown[], destroy: number, radius: number, centre: number) {
    const ctx = rig('test-warrior', props, 7, 34)
    const action: BurstDef = { id, name: 'Probe', staminaCost: 0, cooldown: 0, range: 8,
      burst: { shape: { kind: 'radius', radius }, side: 'enemy', packets: [{ id: 'base', amount: 1, damageType: 'fire' }], destroy } }
    ctx.actions = { ...ctx.actions, [id]: action }; ctx.state.units[0]!.actions.push(id)
    const fire = () => { const u = ctx.state.units[0]!; u.primaryUsed = false; u.moveUsed = false; useBurst(ctx, 0, centre, id) }
    return { ctx, fire }
  }
  it('a high prop no unit stands in falls to low cover under the same id, and the board opens', () => {
    // A boulder (high, tier 1, collision 4) at hex 12, on the line from 11 to 13.
    const { ctx, fire } = blast([high('prop.test.boulder', 12, 1, { collisionValue: 4 })], 1, 1, 11)
    expect(passableHexes(ctx)(12)).toBe(false)
    expect(attackLineClear(ctx, 11, 13)).toBe(false)
    fire()
    expect(ctx.events.find((e) => e.type === 'burst.declared')).toMatchObject({ destroy: 1 })
    expect(damaged(ctx)[0]).toMatchObject({ prop: 'prop.test.boulder', height: 'high', tier: 1, stepsBefore: 0, stepsAfter: 1, causeId: id })
    expect(destroyed(ctx)[0]).toMatchObject({ prop: 'prop.test.boulder', leaves: 'low' })
    expect(ctx.state.props).toEqual([low('prop.test.boulder', 12, 1)])
    expect(passableHexes(ctx)(12)).toBe(true)
    expect(attackLineClear(ctx, 11, 13)).toBe(true)
    // and the low remnant is itself a prop to destroy: it leaves nothing
    fire()
    expect(destroyed(ctx)[1]).toMatchObject({ prop: 'prop.test.boulder', leaves: 'nothing' })
    expect(ctx.state.props).toEqual([])
  })
  it('an edge touching the shape\'s boundary is struck; a prop outside the shape is not', () => {
    // A fence on the side between hexes 10 and 11; a radius-0 burst on 10 touches it.
    const fence = { id: 'prop.test.fence', height: 'low', material: 2, footprint: { kind: 'polygon', vertices: [[7800, 2100], [8200, 2100], [8200, 3900], [7800, 3900]], movementPadding: 0 } }
    const { ctx, fire } = blast([fence, low('prop.test.far', 12, 1)], 1, 0, 10)
    fire()
    expect(damaged(ctx).map((e) => [e['prop'], e['footprint']])).toEqual([['prop.test.fence', 'polygon']])
    expect(ctx.state.props.find((p) => p.id === 'prop.test.far')).toBeDefined()
  })
  it('a burst without Destroy strikes nothing and declares no destroy', () => {
    const { ctx, fire } = blast([low('prop.test.barrels', 10, 1)], 0, 1, 10)
    fire()
    expect(damaged(ctx)).toHaveLength(0)
    expect(ctx.events.find((e) => e.type === 'burst.declared')!['destroy']).toBeUndefined()
  })
})

describe('the board follows the prop', () => {
  it('low cover holds until the crates fall, then it is gone', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.crates', 10, 1)])
    expect(hasLowCover(ctx, 7, 10)).toBe(true)
    swing(ctx, CHOP)
    expect(hasLowCover(ctx, 7, 10)).toBe(false)
  })
})

describe('transport — plain data, strict and saved', () => {
  it('steps survive a save and restore', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.wall', 10, 2)])
    swing(ctx, CHOP)
    const restored = restoreBattle(saveBattle(ctx), ctx)
    expect(restored.state.props).toEqual([{ ...low('prop.test.wall', 10, 2), steps: 1 }])
  })
  it('decode refuses steps at or past the tier, zero steps, and fractions', () => {
    for (const steps of [2, 3, 0, 1.5, -1]) expect(() => decodeProps([{ ...low('prop.test.wall', 10, 2), steps }], 35)).toThrow(/steps/)
    expect(decodeProps([{ ...low('prop.test.wall', 10, 2), steps: 1 }], 35)[0]).toMatchObject({ steps: 1 })
  })
  it('Destroy is a bounded integer on attacks and bursts', () => {
    expect(attackPacketFields({ destroy: 3 })).toEqual({ destroy: 3 })
    for (const destroy of [-1, 1.5, 1001, '1']) expect(() => attackPacketFields({ destroy })).toThrow(/destroy/)
    const burst = { shape: { kind: 'radius', radius: 1 }, side: 'enemy', packets: [{ id: 'base', amount: 1, damageType: 'fire' }] }
    expect(burstProfile({ ...burst, destroy: 2 }).destroy).toBe(2)
    expect(() => burstProfile({ ...burst, destroy: -1 })).toThrow(/Destroy/)
  })
})

describe('a real battle, replayed', () => {
  it('test.prop-destroy: both Destroy attacks strike live, and the battle replays byte for byte', () => {
    const run = () => { const ctx = createBattle(scenarioOptions(SCENARIOS['test.prop-destroy']!)); runBattle(ctx); return ctx }
    const a = run(), b = run()
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
    const struckBy = new Set(damaged(a).map((e: Event) => e.causeId))
    expect([...struckBy].sort()).toEqual([CHOP, WRECK])
    expect(destroyed(a).map((e) => e['prop']).sort()).toEqual(['prop.test.barrels', 'prop.test.stone-wall'])
  })
})
