// refactor.one-action-type (2026-09-04). Ruled three times on 2026-09-04
// (DECISIONS.md "ONE ACTION TYPE"): an attack, a power and a movement are one
// kind of thing — where it came from, which slot spends it and what limits it
// are properties, and "all of them should be capable of doing all of the same
// things. Move 3, do damage, give a buff, have a cooldown, like any of these
// things. Or one use."
//
// The proofs: one registry; one limits check and one spend, so an ATTACK with
// `uses` is spent like a charged power and a POWER carries a movement rider;
// and cooldown means one thing on every action (skip N Turns).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { ACTIONS, ATTACKS, ABILITIES } from '../src/content/index.js'
import { MOVES } from '../src/content/moves.js'
import { actionReady, attacksOf, isAttack, isMove, isPower, movesOf, powersOf, spendAction } from '../src/core/action.js'
import { canAttack, performAttack } from '../src/core/pipeline.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { usableMoves } from '../src/core/movement.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const ONCE = 'attack.test-ram.once'
const WIND = 'power.test-second-wind'

describe('one registry, three views', () => {
  it('every attack, power and movement is in ACTIONS, and the three views partition it', () => {
    const all = Object.values(ACTIONS)
    expect(all.length).toBe(Object.keys(ATTACKS).length + Object.keys(ABILITIES).length + Object.keys(MOVES).length)
    for (const a of all) {
      const kinds = [isAttack(a), isMove(a), isPower(a)].filter(Boolean).length
      expect(kinds, `${a.id} is exactly one of attack / move / power`).toBe(1)
      // the limits are one set of fields on every action
      expect(typeof a.staminaCost, a.id).toBe('number')
      expect(typeof a.cooldown, a.id).toBe('number')
      expect(typeof a.range, a.id).toBe('number')
    }
    for (const id of Object.keys(ATTACKS)) expect(ACTIONS[id]?.attack, id).toBeDefined()
    for (const id of Object.keys(MOVES)) expect(ACTIONS[id]?.move, id).toBeDefined()
    for (const id of Object.keys(ABILITIES)) { expect(ACTIONS[id]?.attack, id).toBeUndefined(); expect(ACTIONS[id]?.move, id).toBeUndefined() }
  })

  it("a unit's one list is its attacks, then its powers, then its movements — and the views read it back in order", () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.arc-variant']!))
    const g = ctx.state.units.find((u) => u.typeId === 'test-arc-golem')!
    expect(g.actions).toEqual([...attacksOf(ctx, g).map((a) => a.id), ...powersOf(ctx, g).map((a) => a.id), ...movesOf(ctx, g).map((a) => a.id)])
    expect(attacksOf(ctx, g).map((a) => a.id)).toContain(ONCE)
    expect(powersOf(ctx, g).map((a) => a.id)).toContain(WIND)
    expect(movesOf(ctx, g).length).toBeGreaterThan(0)
  })
})

describe('the limits are one rule on every action', () => {
  it('an ATTACK with `uses: 1` swings once, is spent like a charged power, and leaves the list', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const g = ctx.state.units[0]!, z = ctx.state.units[1]!
    z.hp = 99; z.maxHp = 99
    expect(ACTIONS[ONCE]!.uses).toBe(1)
    expect(g.usesLeft[ONCE]).toBe(1)
    beginActivation(ctx, g.id, 'test')
    expect(canAttack(ctx, g.id, z.id, ONCE)).toBe(true)
    performAttack(ctx, g.id, z.id, ONCE)
    expect(g.usesLeft[ONCE]).toBe(0)
    expect(g.actions).not.toContain(ONCE)
    expect(ctx.events.some((e) => e.type === 'charge.spent' && e.causeId === ONCE)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'power.exhausted' && e.causeId === ONCE)).toBe(true)
    // a fresh activation: gone for the Battle
    ctx.state.turn++
    beginActivation(ctx, g.id, 'test')
    expect(canAttack(ctx, g.id, z.id, ONCE)).toBe(false)
    expect(actionReady(ctx, g, ACTIONS[ONCE]!)).toBe(false)
  })

  it('a POWER carries a movement rider (gainStamina) and resolves it through the effects path', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    const g = ctx.state.units[0]!
    g.stamina = 1
    beginActivation(ctx, g.id, 'test')
    expect(canUsePower(ctx, g.id, g.id, WIND)).toBe(true)
    usePower(ctx, g.id, g.id, WIND)
    expect(g.stamina).toBe(Math.min(g.maxStamina, 1 + 2))
    expect(ctx.events.some((e) => e.type === 'stamina.gained' && e.causeId === WIND)).toBe(true)
    // free: the primary is still there
    expect(g.primaryUsed).toBe(false)
  })

  it('cooldown means one thing — skip N Turns — on an attack, a power and a movement', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const g = ctx.state.units[0]!
    ctx.state.turn = 1
    const cases: [string, number][] = [[ONCE, 2], [WIND, 1], ['power.sidestep', 1]]
    for (const [id, cd] of cases) {
      const a = { ...ACTIONS[id]!, cooldown: cd }
      g.cooldowns = {}; g.stamina = g.maxStamina; g.moveUsed = false; g.primaryUsed = false
      spendAction(ctx, g.id, a, isMove(a) ? 'movement' : 'primary')
      expect(g.cooldowns[id], `${id} ready on turn + ${cd} + 1`).toBe(1 + cd + 1)
      const set = ctx.events.filter((e) => e.type === 'cooldown.set' && e.causeId === id).pop() as unknown as { readyOnTurn: number; actionId: string }
      expect(set.readyOnTurn).toBe(1 + cd + 1)
      expect(set.actionId).toBe(id)
    }
  })

  it('the movement path asks the same question: a movement on cooldown is not usable, off cooldown it is', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    const w = ctx.state.units[0]!
    ctx.state.turn = 1
    beginActivation(ctx, w.id, 'test')
    const before = usableMoves(ctx, w).map((m) => m.id)
    expect(before.length).toBeGreaterThan(0)
    const first = usableMoves(ctx, w)[0]!
    w.cooldowns[first.id] = 5
    expect(usableMoves(ctx, w).map((m) => m.id)).not.toContain(first.id)
    ctx.state.turn = 5
    expect(usableMoves(ctx, w).map((m) => m.id)).toContain(first.id)
  })
})

describe('live — the arc golem swings its one-use slam and takes a second wind in the verify scenario', () => {
  it('both fire in a real battle, and the slam fires at most once per battle', () => {
    let sawOnce = 0, sawWind = 0
    for (let r = 0; r < 12; r++) {
      const ctx = createBattle({ ...scenarioOptions(SCENARIOS['showcase.arc-variant']!), replicate: r })
      runBattle(ctx)
      const once = ctx.events.filter((e) => e.type === 'attack.declared' && e.causeId === ONCE)
      expect(once.length, `replicate ${r}: one use`).toBeLessThanOrEqual(1)
      sawOnce += once.length
      sawWind += ctx.events.filter((e) => e.type === 'power.used' && e.causeId === WIND).length
    }
    expect(sawOnce).toBeGreaterThan(0)
    expect(sawWind).toBeGreaterThan(0)
  })
})
