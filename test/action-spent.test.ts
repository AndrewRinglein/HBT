import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { executeAction, executeBattleCommand, validateAction } from '../src/core/commands.js'
import * as commands from '../src/core/commands.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { previewPower } from '../src/core/ability.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { runActivation, AI_MODES } from '../src/ai/modes.js'
import { type ActionDef, type Ctx } from '../src/core/types.js'
afterEach(() => vi.restoreAllMocks())
const spent = (ctx: Ctx) => ctx.events.filter(e => e.type === 'action.spent')
function fixture(policy: 'any' | 'byProfile' = 'any', extra = false) {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, ...(extra ? [{ type: 'test-zombie', hex: 102 }] : [])], { strict: true })
  ctx.cfg.switches.actionSlots = policy
  for (const u of ctx.state.units) { u.hp = u.maxHp = 1000; u.surge = 0 }
  ctx.state.units[0]!.stamina = ctx.state.units[0]!.maxStamina = 100
  expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
  return ctx
}
function grant(ctx: Ctx, id = 'attack.test-slot-either', patch: Partial<ActionDef> = {}) {
  expect(ctx.actions[id]).toBeDefined()
  ctx.actions = { ...ctx.actions, [id]: { ...ctx.actions[id]!, ...patch } }
  const u = ctx.state.units[0]!
  if (!u.actions.includes(id)) u.actions.push(id)
  if (patch.uses) u.usesLeft[id] = patch.uses
  return id
}
function event(ctx: Ctx, id: string, slot: string, free: boolean, moveUsed: boolean, primaryUsed: boolean) {
  expect(spent(ctx)).toHaveLength(1)
  expect(spent(ctx)[0]).toEqual({ seq: expect.any(Number), turn: ctx.state.turn, phase: ctx.state.phase, type: 'action.spent', causeId: id, actor: 0, target: null, actionId: id, slot, free, moveUsed, primaryUsed })
}
describe('universal action expenditure', () => {
  for (const policy of ['any', 'byProfile'] as const) {
    it(`${policy} emits even for a zero-cost attack with its resolved slot`, () => {
      const ctx = fixture(policy), id = grant(ctx)
      expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
      event(ctx, id, policy === 'any' ? 'movement' : 'primary', false, policy === 'any', policy === 'byProfile')
      expect(spent(ctx)[0]!.seq).toBeLessThan(ctx.events.find(e => e.type === 'attack.declared' && e.causeId === id)!.seq)
      expect(ctx.events.some(e => e.type === 'stamina.spent' && e.causeId === id)).toBe(false)
    })
    it(`${policy} records an explicit primary choice`, () => {
      const ctx = fixture(policy), id = grant(ctx)
      expect(executeAction(ctx, { actor: 0, actionId: id, target: 1, slot: 'primary' }).ok).toBe(true)
      event(ctx, id, 'primary', false, false, true)
    })
  }
  it.each(['power.move', 'power.flight', 'power.sidestep'])('%s emits for real displacement exactly once', id => {
    const ctx = fixture(); grant(ctx, id); ctx.state.units[1]!.hex = 255
    expect(executeAction(ctx, { actor: 0, actionId: id, destination: 84 }).ok).toBe(true)
    expect(ctx.state.units[0]!.hex).toBe(84)
    event(ctx, id, 'movement', false, true, false)
    expect(spent(ctx)[0]!.seq).toBeLessThan(ctx.events.find(e => e.type === 'moved' && e.causeId === id)!.seq)
  })
  it('a paid power records after all payment events and before its effect', () => {
    const ctx = fixture(), id = grant(ctx, 'power.test-slot-guard', { cooldown: 1, uses: 2 })
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 0 }).ok).toBe(true)
    event(ctx, id, 'movement', false, true, false)
    for (const type of ['stamina.spent', 'cooldown.set', 'charge.spent']) expect(ctx.events.find(e => e.type === type && e.causeId === id)!.seq).toBeLessThan(spent(ctx)[0]!.seq)
    expect(spent(ctx)[0]!.seq).toBeLessThan(ctx.events.find(e => e.type === 'power.used' && e.causeId === id)!.seq)
    expect(ctx.state.units[0]!.stamina).toBe(99)
    expect(ctx.state.units[0]!.usesLeft[id]).toBe(1)
  })
  it('free power records no slot cost after movement', () => {
    const ctx = fixture(), move = grant(ctx, 'attack.test-slot-movement')
    expect(executeAction(ctx, { actor: 0, actionId: move, target: 1 }).ok).toBe(true)
    ctx.events = []; ctx.state.units[0]!.stamina = 90
    const id = grant(ctx, 'power.test-slot-free')
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 0 }).ok).toBe(true)
    event(ctx, id, 'primary', true, true, false)
    expect(ctx.state.units[0]!.stamina).toBe(91)
  })
  it.each([false, true])('reaction free=%s preserves both closed flags but pays resources', free => {
    const ctx = fixture(), id = grant(ctx, 'attack.test-slot-movement', { staminaCost: 3, cooldown: 1, uses: 2, free })
    ctx.state.units[0]!.moveUsed = ctx.state.units[0]!.primaryUsed = true
    performAttack(ctx, 0, 1, id, 'reaction')
    event(ctx, id, 'reaction', free, true, true)
    expect(ctx.state.units[0]!.stamina).toBe(97)
    expect(ctx.state.units[0]!.usesLeft[id]).toBe(1)
    const after = saveBattle(ctx)
    expect(() => performAttack(ctx, 0, 1, id, 'reaction')).toThrow(/illegal/)
    expect(saveBattle(ctx)).toBe(after)
  })
  it.each(['attack.test-slot-either', 'power.move'])('free %s records its opportunity without spending it', id => {
    const ctx = fixture(); grant(ctx, id, { free: true, staminaCost: 2 })
    if (id === 'power.move') ctx.state.units[1]!.hex = 255
    expect(executeAction(ctx, { actor: 0, actionId: id, ...(id === 'power.move' ? { destination: 84 } : { target: 1 }) }).ok).toBe(true)
    event(ctx, id, 'movement', true, false, false)
    expect(ctx.state.units[0]!.stamina).toBe(98)
  })
  it('an actual opportunity attack reports the reactor separately from the moving actor', () => {
    const ctx = fixture(); grant(ctx, 'power.move')
    expect(executeAction(ctx, { actor: 0, actionId: 'power.move', destination: 84 }).ok).toBe(true)
    expect(ctx.events.some(e => e.type === 'aoo.provoked')).toBe(true)
    expect(spent(ctx).map(e => [e.actor, e.slot, e.free, e.moveUsed, e.primaryUsed])).toEqual([[0, 'movement', false, true, false], [1, 'reaction', false, false, false]])
  })
  it('an event-only fold recovers slot flags across ordinary activations and Surge', () => {
    const ctx = fixture(); ctx.state.units[0]!.surge = 50
    runBattle(ctx)
    const flags = ctx.state.units.map(() => ({ moveUsed: false, primaryUsed: false }))
    for (const e of ctx.events) {
      if (e.type === 'activation.begin' || e.type === 'surge.hit') flags[e.actor!] = { moveUsed: false, primaryUsed: false }
      if (e.type === 'action.spent') flags[e.actor!] = { moveUsed: e.moveUsed as boolean, primaryUsed: e.primaryUsed as boolean }
    }
    expect(ctx.events.filter(e => e.type === 'activation.begin').length).toBeGreaterThan(2)
    expect(ctx.events.some(e => e.type === 'surge.hit')).toBe(true)
    expect(spent(ctx).length).toBeGreaterThan(0)
    expect(flags).toEqual(ctx.state.units.map(u => ({ moveUsed: u.moveUsed, primaryUsed: u.primaryUsed })))
  })
  it.each(['multi-hit', 'area'])('%s spends and emits once across all hits/targets', kind => {
    const ctx = fixture('any', true), id = grant(ctx, 'attack.test-slot-movement', { uses: 2, staminaCost: 3 })
    const a = ctx.actions[id]!
    ctx.actions = { ...ctx.actions, [id]: kind === 'area' ? { ...a, area: 'arc' } : { ...a, attack: { ...a.attack!, hits: 3 } } }
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    event(ctx, id, 'movement', false, true, false)
    if (kind === 'area') expect(ctx.events.find(e => e.type === 'attack.declared')!.struck).toEqual(expect.arrayContaining([1, 2]))
    else expect(ctx.state.units[0]!.attackOrdinal).toBe(3)
    expect(ctx.state.units[0]!.usesLeft[id]).toBe(1)
  })
  it('previews and denied actions emit nothing and mutate nothing', () => {
    const ctx = fixture(), id = grant(ctx), power = grant(ctx, 'power.test-slot-guard'), before = saveBattle(ctx)
    expect(preview(ctx, 0, 1, id).hitChance).toBeGreaterThan(0)
    expect(previewPower(ctx, 0, 0, power).hitChance).toBe(100)
    expect(validateAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 99 }).ok).toBe(false)
    expect(spent(ctx)).toHaveLength(0)
    expect(saveBattle(ctx)).toBe(before)
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    expect(spent(ctx)).toHaveLength(1)
  })
  it('reload preserves prior expenditure and Surge resets at the real cycle boundary', () => {
    const ctx = fixture(), id = grant(ctx); ctx.state.units[0]!.surge = 100
    expect(executeAction(ctx, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
    const loaded = restoreBattle(saveBattle(ctx), ctx)
    for (const live of [ctx, loaded]) {
      expect(executeAction(live, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
      completeActionCycle(live); expect(advanceBattle(live)).toEqual({ kind: 'acting', actor: 0 })
      expect(executeAction(live, { actor: 0, actionId: id, target: 1 }).ok).toBe(true)
      expect(spent(live).map(e => [e.moveUsed, e.primaryUsed])).toEqual([[true, false], [true, true], [true, false]])
      const reset = live.events.find(e => e.type === 'surge.hit')!
      expect(reset.seq).toBeGreaterThan(spent(live)[1]!.seq)
      expect(reset.seq).toBeLessThan(spent(live)[2]!.seq)
    }
    expect(saveBattle(loaded)).toBe(saveBattle(ctx))
  })
  it.each(AI_MODES)('AI %s and public commands emit the identical action records', ai => {
    const ctx = fixture(); ctx.state.units[0]!.ai = ai
    const original = commands.executeAction
    const spy = vi.spyOn(commands, 'executeAction').mockImplementation((live, request) => {
      const human = restoreBattle(saveBattle(live), live), actor = (request as commands.ActionRequest).actor
      expect(executeBattleCommand(human, { humanUnitUids: [human.state.units[actor]!.uid] }, { ...(request as commands.ActionRequest), kind: 'action', expectedSeq: human.state.seq }).ok).toBe(true)
      const result = original(live, request)
      expect(result.ok).toBe(true)
      expect(live.events).toEqual(human.events); expect(live.state).toEqual(human.state); expect(live.rng.log).toEqual(human.rng.log)
      return result
    })
    runActivation(ctx, 0)
    expect(spy).toHaveBeenCalled(); expect(spent(ctx).length).toBeGreaterThan(0)
  })
})
