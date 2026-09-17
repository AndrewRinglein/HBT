import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { executeAction, executeBattleCommand } from '../src/core/commands.js'
import * as commands from '../src/core/commands.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { runActivation, AI_MODES } from '../src/ai/modes.js'
import { performAttack } from '../src/core/pipeline.js'
import { type ActionDef, type Ctx } from '../src/core/types.js'
afterEach(() => vi.restoreAllMocks())

function fixture(mode: 'any' | 'byProfile' = 'any', extraEnemy = false) {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, ...(extraEnemy ? [{ type: 'test-zombie', hex: 102 }] : [])], { strict: true })
  ctx.cfg.switches.actionSlots = mode
  const u = ctx.state.units[0]!, enemy = ctx.state.units[1]!
  enemy.hp = enemy.maxHp = 1000
  u.maxStamina = u.stamina = 100
  u.surge = 0
  expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
  return ctx
}
function grant(ctx: Ctx, patch: Partial<ActionDef>, base = 'attack.test-warrior.axe') {
  // Existing published profiles isolate rule failures before new transport fixtures land.
  const source = ctx.actions[base]!
  expect(source).toBeDefined()
  const id = source.id
  ctx.actions = { ...ctx.actions, [id]: { ...source, ...patch } }
  const u = ctx.state.units[0]!
  if (!u.actions.includes(id)) u.actions.push(id)
  if (patch.uses) u.usesLeft[id] = patch.uses
  return id
}
function rejectUnchanged(ctx: Ctx, request: object) {
  const before = saveBattle(ctx)
  expect(executeAction(ctx, request).ok).toBe(false)
  expect(saveBattle(ctx)).toBe(before)
}

describe('authored action slots', () => {
  it.each(['movement', 'primary', 'either', undefined] as const)('an attack honors slot %s', slot => {
    const ctx = fixture(), id = grant(ctx, slot === undefined ? {} : { slot })
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 })).toEqual({ ok: true })
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual(slot === 'primary' ? [false, true] : [true, false])
  })
  it('either permits exactly two attacks and distinct strict RNG rolls', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either', staminaCost: 2 })
    const req = { actor: 0, actionId: id, target: 1 }
    expect(executeAction(ctx, req).ok).toBe(true)
    expect(executeAction(ctx, req).ok).toBe(true)
    expect(ctx.state.units[0]!.stamina).toBe(96)
    expect(ctx.state.units[0]!.attackOrdinal).toBe(2)
    rejectUnchanged(ctx, req)
  })
  it('explicit primary spends primary first and closes movement', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either' })
    const policy = { humanUnitUids: [ctx.state.units[0]!.uid] }
    expect(executeBattleCommand(ctx, policy, { kind: 'action', actor: 0, actionId: id, target: 1, slot: 'primary', expectedSeq: ctx.state.seq }).ok).toBe(true)
    expect(ctx.state.units[0]!.moveUsed).toBe(false)
    expect(ctx.battleCursor!.at).not.toBe('acting')
    rejectUnchanged(ctx, { actor: 0, actionId: id, target: 1, slot: 'movement' })
  })
  it.each(['either', 'reaction', 'bad', null])('rejects invalid requested slot %s atomically', slot => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either' })
    rejectUnchanged(ctx, { actor: 0, actionId: id, target: 1, slot })
  })
  it('rejects a requested slot incompatible with its authored restriction', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'movement' })
    rejectUnchanged(ctx, { actor: 0, actionId: id, target: 1, slot: 'primary' })
  })
  it.each(['power.flight', 'power.sidestep', 'power.move'])('movement profile %s can spend primary', base => {
    const ctx = fixture(), id = grant(ctx, { slot: 'primary' }, base)
    ctx.state.units[1]!.hex = 255
    const points = ctx.state.units[0]!.movePointsLeft
    expect(ctx.actions[id]!.move).toBeDefined()
    expect(executeAction(ctx, { actor: 0, actionId: id, destination: 84 }).ok).toBe(true)
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([false, true])
    expect(ctx.state.units[0]!.hex).toBe(84)
    expect(ctx.state.units[0]!.movePointsLeft).toBe(points - (base === 'power.sidestep' ? 0 : 1))
    expect(ctx.state.units[0]!.stamina).toBe(base === 'power.sidestep' ? 100 : 99)
  })
  it('effect powers use movement then leave primary available', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'movement', effects: [{ kind: 'stamina.gain', value: 1 }], range: 0, target: { select: 'self', side: 'any' } })
    const { attack: _attack, ...power } = ctx.actions[id]!
    ctx.actions = { ...ctx.actions, [id]: power }
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 0 }).ok).toBe(true)
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([true, false])
  })
  it('free attacks consume resources but no slot, and primary closes them', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'primary', free: true, staminaCost: 3 })
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed, ctx.state.units[0]!.stamina]).toEqual([false, false, 97])
    ctx.state.units[0]!.primaryUsed = true
    rejectUnchanged(ctx, { actor: 0, actionId: id, target: 1 })
  })
  it('a free power is legal after movement, then rejected after primary', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'movement' })
    const free = 'power.test-slot-free'
    ctx.state.units[0]!.actions.push(free)
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    ctx.state.units[0]!.stamina = 90
    expect(executeAction(ctx, { actor: 0, actionId: free, target: 0 }).ok).toBe(true)
    expect(ctx.state.units[0]!.stamina).toBe(91)
    const primary = grant(ctx, { slot: 'primary' }, 'attack.punch')
    expect(executeAction(ctx, { actor: 0, actionId: primary, target: 1 }).ok).toBe(true)
    rejectUnchanged(ctx, { actor: 0, actionId: free, target: 0 })
  })
  it('reactions ignore authored slots and the closed cycle, but pay resources', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'movement', staminaCost: 3, uses: 2, cooldown: 1 })
    ctx.state.units[0]!.moveUsed = ctx.state.units[0]!.primaryUsed = true
    performAttack(ctx, 0, 1, id, 'reaction')
    expect(ctx.state.units[0]!.stamina).toBe(97)
    expect(ctx.state.units[0]!.usesLeft[id]).toBe(1)
    expect(ctx.state.units[0]!.cooldowns[id]).toBe(ctx.state.turn + 2)
    const after = saveBattle(ctx)
    expect(() => performAttack(ctx, 0, 1, id, 'reaction')).toThrow(/illegal/)
    expect(saveBattle(ctx)).toBe(after)
  })
  it.each([{ cooldown: 1 }, { uses: 1 }, { staminaCost: 100 }])('resource limit %j prevents the second slot use', patch => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either', ...patch })
    const req = { actor: 0, actionId: id, target: 1 }
    expect(executeAction(ctx, req).ok).toBe(true)
    rejectUnchanged(ctx, req)
  })
  it('multi-hit pays once and spends one authored slot', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'movement', staminaCost: 3, uses: 2 })
    ctx.actions = { ...ctx.actions, [id]: { ...ctx.actions[id]!, attack: { ...ctx.actions[id]!.attack!, hits: 3 } } }
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    expect([ctx.state.units[0]!.stamina, ctx.state.units[0]!.usesLeft[id], ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([97, 1, true, false])
  })
  it('a V2 burst spends one slot and one charge for all targets', () => {
    const ctx = fixture('any', true), id = grant(ctx, { slot: 'movement', staminaCost: 3, uses: 2 })
    ctx.actions = {...ctx.actions, [id]: {id, name: 'Burst', slot: 'movement', staminaCost: 3, cooldown: 0, uses: 2, range: 1, burst: {shape: {kind: 'radius', radius: 1}, side: 'enemy', packets: [{id: 'base', amount: 3, damageType: 'true'}]}}}
    expect(executeAction(ctx, { actor: 0, actionId: id, centre: ctx.state.units[1]!.hex }).ok).toBe(true)
    expect(ctx.events.filter(e => e.type === 'burst.struck' && e.causeId === id).map(e => e.target)).toContain(1)
    expect(ctx.events.filter(e => e.type === 'burst.struck' && e.causeId === id).map(e => e.target)).toContain(2)
    expect([ctx.state.units[0]!.stamina, ctx.state.units[0]!.usesLeft[id], ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([97, 1, true, false])
  })
  it('reload after movement preserves second action and Surge continuation exactly', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either' })
    ctx.state.units[0]!.surge = 100
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    const restored = restoreBattle(saveBattle(ctx), ctx)
    for (const c of [ctx, restored]) {
      expect(executeAction(c, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
      completeActionCycle(c)
      expect(advanceBattle(c)).toEqual({ kind: 'acting', actor: 0 })
      expect([c.state.units[0]!.moveUsed, c.state.units[0]!.primaryUsed]).toEqual([false, false])
    }
    expect(saveBattle(restored)).toBe(saveBattle(ctx))
  })
  it('AI continues to the second compatible attack', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either' })
    ctx.state.units[0]!.actions = [id]
    ctx.state.units[0]!.ai = 'dumb-melee'
    runActivation(ctx, 0)
    expect(ctx.state.units[0]!.attackOrdinal).toBe(2)
  })
  it('AI uses a free power once and still spends both paid opportunities', () => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either', staminaCost: 0 })
    const u = ctx.state.units[0]!
    u.actions = [id, 'power.test-slot-free']; u.ai = 'melee-aggressive'; u.stamina = 0
    runActivation(ctx, 0)
    expect(u.attackOrdinal).toBe(2)
    expect(u.stamina).toBe(1)
    expect(ctx.events.filter(e => e.type === 'power.used' && e.causeId === 'power.test-slot-free')).toHaveLength(1)
  })
  it.each(AI_MODES)('any-mode %s actions match the human command resolver', ai => {
    const ctx = fixture(); ctx.state.units[0]!.ai = ai
    const execute = commands.executeAction
    const spy = vi.spyOn(commands, 'executeAction').mockImplementation((live, request) => {
      const human = restoreBattle(saveBattle(live), live)
      const actor = (request as commands.ActionRequest).actor
      expect(commands.executeBattleCommand(human, { humanUnitUids: [human.state.units[actor]!.uid] }, { ...(request as commands.ActionRequest), kind: 'action', expectedSeq: human.state.seq })).toEqual({ ok: true })
      const result = execute(live, request)
      expect(result).toEqual({ ok: true })
      expect(live.state).toEqual(human.state)
      expect(live.events).toEqual(human.events)
      expect(live.rng.log).toEqual(human.rng.log)
      return result
    })
    runActivation(ctx, 0)
    expect(spy).toHaveBeenCalled()
  })
  it.each(AI_MODES)('AI mode %s terminates with free choices and respects primary closure', ai => {
    const ctx = fixture(), id = grant(ctx, { slot: 'either', free: true })
    ctx.state.units[0]!.actions = [id]
    ctx.state.units[0]!.ai = ai
    runActivation(ctx, 0)
    expect(ctx.state.units[0]!.attackOrdinal).toBeLessThanOrEqual(1)
  })
  it('byProfile honors authored movement rather than overriding it', () => {
    const ctx = fixture('byProfile'), id = grant(ctx, { slot: 'movement' })
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([true, false])
  })
  it('byProfile AI continues after an authored movement attack', () => {
    const ctx = fixture('byProfile'), first = grant(ctx, { slot: 'movement' })
    const second = grant(ctx, { slot: 'primary' }, 'attack.punch')
    ctx.state.units[0]!.actions = [first, second]
    ctx.state.units[0]!.ai = 'dumb-melee'
    runActivation(ctx, 0)
    expect(ctx.state.units[0]!.attackOrdinal).toBe(2)
  })
})

