// v2.prop-attack — V2 R7 part 2 (COMBAT-V2-DESIGN-2026-09-07.md §12.2, ruled 2026-09-07):
// "Props can be targeted directly. A hex is a legal target for a destroy-carrying
// effect, with no unit in it."
//
// An attack with Destroy may be aimed at a hex holding (or touched by) a prop and no
// living unit, in reach, in sight and on a clear line — the struck props do not block
// the line to themselves. It pays as the attack does and always connects: no accuracy,
// Block, damage, hooks or dice. Content: attack.test-destroy.chop (Destroy 1) and
// attack.test-destroy.wreck (Destroy 2), from v2.prop-destroy. Defaults the documents
// do not answer are SWITCHES.md "V2 attacking a prop".
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { canAttackHex, propAttackHexes, attackProp } from '../src/core/prop-attack.js'
import { executeAction, validateAction } from '../src/core/commands.js'
import { applyStatus } from '../src/core/status.js'
import type { Ctx } from '../src/core/types.js'

const CHOP = 'attack.test-destroy.chop'
const WRECK = 'attack.test-destroy.wreck'
const AXE = 'attack.test-warrior.axe'
const ofType = (ctx: Ctx, type: string) => ctx.events.filter((e) => e.type === type)
const low = (id: string, hex: number, material: 1 | 2 | 3) => ({ id, height: 'low', material, footprint: { kind: 'hex', hexes: [hex] } })
const high = (id: string, hex: number, material: 1 | 2 | 3) => ({ id, height: 'high', material, footprint: { kind: 'hex', hexes: [hex] } })
// Seven wide, five tall; hex = row * 7 + col; the same row's col ± 1 are adjacent.
const board = (props: unknown[]) => ({ id: 'test.map.prop-attack', name: 'Prop attack TEST', rows: Array(5).fill('.......'), props })

/** The hero (0) at `heroHex`; a zombie (1) well away at 34 unless placed. */
function rig(hero: string, props: unknown[], heroHex = 9, enemyHex = 34): Ctx {
  const ctx = createBattle({ replicate: 0, strict: true, map: board(props) as never, heroes: [hero], enemies: ['test-zombie'], heroHexes: [heroHex], enemyHexes: [enemyHex] })
  for (const u of ctx.state.units) u.triggers = []
  beginActivation(ctx, 0, 'test')
  return ctx
}
const again = (ctx: Ctx) => { const u = ctx.state.units[0]!; u.primaryUsed = false; u.moveUsed = false }

describe('a hex is a legal target for a destroy-carrying attack', () => {
  it('the Chopper strikes barrels no one stands in: prop.struck, then the barrels fall — no roll, no damage, no hooks', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)])
    expect(canAttackHex(ctx, 0, 10, CHOP)).toBe(true)
    expect(propAttackHexes(ctx, 0, CHOP)).toEqual([10])
    const draws = ctx.rng.log.length
    attackProp(ctx, 0, 10, CHOP)
    expect(ctx.rng.log.length).toBe(draws)
    expect(ofType(ctx, 'prop.struck')).toHaveLength(1)
    expect(ofType(ctx, 'prop.struck')[0]).toMatchObject({ actor: 0, hex: 10, attackId: CHOP, kind: 'melee', destroy: 1, props: ['prop.test.barrels'], causeId: CHOP })
    expect(ofType(ctx, 'prop.damaged')[0]).toMatchObject({ prop: 'prop.test.barrels', stepsBefore: 0, stepsAfter: 1, causeId: CHOP })
    expect(ofType(ctx, 'prop.destroyed')[0]).toMatchObject({ leaves: 'nothing' })
    for (const t of ['attack.declared', 'block.rolled', 'damage.applied', 'trigger.rolled']) expect(ofType(ctx, t)).toHaveLength(0)
    expect(ofType(ctx, 'action.spent')[0]).toMatchObject({ actor: 0, actionId: CHOP, slot: 'primary', primaryUsed: true })
    expect(ctx.state.props).toEqual([])
  })
  it('a high boulder is struck where it stands: the line reaches it rather than crossing it', () => {
    const ctx = rig('test-destroy-chopper', [high('prop.test.boulder', 10, 2)])
    expect(canAttackHex(ctx, 0, 10, CHOP)).toBe(true)
    attackProp(ctx, 0, 10, CHOP)
    expect(ctx.state.props).toEqual([{ ...high('prop.test.boulder', 10, 2), steps: 1 }])
    again(ctx); attackProp(ctx, 0, 10, CHOP)
    expect(ctx.state.props).toEqual([low('prop.test.boulder', 10, 2)])
    expect(ofType(ctx, 'prop.destroyed')[0]).toMatchObject({ leaves: 'low' })
  })
  it('the second Destroy instance is pure data: the Wrecker takes an old stone wall in one blow', () => {
    const ctx = rig('test-destroy-wrecker', [low('prop.test.wall', 10, 2)])
    attackProp(ctx, 0, 10, WRECK)
    expect(ofType(ctx, 'prop.struck')[0]).toMatchObject({ destroy: 2 })
    expect(ctx.state.props).toEqual([])
  })
})

describe('what is not a legal hex target', () => {
  it('an attack without Destroy', () => {
    const ctx = rig('test-warrior', [low('prop.test.barrels', 10, 1)])
    expect(canAttackHex(ctx, 0, 10, AXE)).toBe(false)
    expect(propAttackHexes(ctx, 0, AXE)).toEqual([])
  })
  it('a hex with no prop, or off the board', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)])
    for (const h of [8, 16, -1, 35, 1.5]) expect(canAttackHex(ctx, 0, h, CHOP)).toBe(false)
  })
  it('a hex a living unit stands in — the unit is the target there', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)], 9, 10)
    expect(canAttackHex(ctx, 0, 10, CHOP)).toBe(false)
  })
  it('out of reach: the Chopper is melee, reach 1', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 11, 1)])
    expect(canAttackHex(ctx, 0, 11, CHOP)).toBe(false)
  })
  it('a ranged Destroy shot: legal at range, refused adjacent, and a high rock on the line blocks it', () => {
    const ranged = (props: unknown[]) => {
      const ctx = rig('test-destroy-chopper', props, 7)
      const shot = structuredClone(ctx.actions[CHOP]!) as { range: number; attack: { kind: string } }
      shot.range = 4; shot.attack.kind = 'ranged'
      ctx.actions = { ...ctx.actions, [CHOP]: shot as never }
      return ctx
    }
    expect(canAttackHex(ranged([low('prop.test.barrels', 10, 1)]), 0, 10, CHOP)).toBe(true)
    expect(canAttackHex(ranged([low('prop.test.barrels', 8, 1)]), 0, 8, CHOP)).toBe(false)
    expect(canAttackHex(ranged([low('prop.test.barrels', 10, 1), high('prop.test.rock', 9, 3)]), 0, 10, CHOP)).toBe(false)
  })
  it('the primary already spent, or a forced target elsewhere', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1), low('prop.test.crates', 8, 1)])
    attackProp(ctx, 0, 10, CHOP)
    expect(canAttackHex(ctx, 0, 8, CHOP)).toBe(false)
    expect(() => attackProp(ctx, 0, 8, CHOP)).toThrow(/illegal prop attack/)
    // A taunt (any status with forcesTarget) names a standing enemy: the blow must go there.
    const taunted = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)])
    const taunt = Object.values(taunted.statuses).find((s) => s.forcesTarget)!
    expect(taunt).toBeDefined()
    applyStatus(taunted, 0, taunt.id, 1, 'test', 1)
    expect(canAttackHex(taunted, 0, 10, CHOP)).toBe(false)
    expect(validateAction(taunted, { actor: 0, actionId: CHOP, hex: 10 })).toEqual({ ok: false, reason: 'forced-target' })
  })
})

describe('the command door', () => {
  it('an action with a hex resolves through the same legality', () => {
    const ctx = rig('test-destroy-chopper', [low('prop.test.barrels', 10, 1)])
    expect(validateAction(ctx, { actor: 0, actionId: CHOP, hex: 16 })).toEqual({ ok: false, reason: 'illegal-hex-or-action' })
    expect(validateAction(ctx, { actor: 0, actionId: CHOP, hex: 'x' })).toEqual({ ok: false, reason: 'malformed-hex' })
    expect(validateAction(ctx, { actor: 0, actionId: CHOP, hex: 10, target: 1 })).toEqual({ ok: false, reason: 'malformed-action' })
    const before = ctx.events.length
    expect(validateAction(ctx, { actor: 0, actionId: CHOP, hex: 10 })).toEqual({ ok: true })
    expect(ctx.events.length).toBe(before)
    expect(executeAction(ctx, { actor: 0, actionId: CHOP, hex: 10 })).toEqual({ ok: true })
    expect(ctx.state.props).toEqual([])
  })
})
