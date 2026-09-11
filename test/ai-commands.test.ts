import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_MODES, runActivation } from '../src/ai/modes.js'
import * as commands from '../src/core/commands.js'
import { advanceBattle } from '../src/core/battle.js'
import { createCustomBattle } from '../src/core/setup.js'
import { forkBattle } from '../src/core/fork.js'
import { applyStatus } from '../src/core/status.js'
import { beginActivation } from '../src/core/mutate.js'
import { attacksOf } from '../src/core/action.js'
import { TERRAIN } from '../src/core/types.js'

afterEach(() => vi.restoreAllMocks())

describe('AI uses the player action contract', () => {
  it.each(AI_MODES)('%s resolves the same legal command with identical state, events and RNG', mode => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    ctx.state.units[0]!.ai = mode
    advanceBattle(ctx)
    const execute = commands.executeAction
    const spy = vi.spyOn(commands, 'executeAction').mockImplementation((live, request) => {
      expect(commands.validateAction(live, request)).toEqual({ ok: true })
      const human = forkBattle(live)
      human.events = structuredClone(live.events)
      const actor = (request as commands.ActionRequest).actor
      const policy = { humanUnitUids: [human.state.units[actor]!.uid] }
      const expected = commands.executeBattleCommand(human, policy, { ...(request as commands.ActionRequest), kind: 'action', expectedSeq: human.state.seq })
      const actual = execute(live, request)
      expect(actual).toEqual(expected)
      expect(live.state).toEqual(human.state)
      expect(live.events).toEqual(human.events)
      expect(live.rng.log).toEqual(human.rng.log)
      return actual
    })
    runActivation(ctx, 0)
    expect(spy).toHaveBeenCalled()
  })

  it('a starved kiter takes a zero-range recovery even when no neighbouring square scores better', () => {
    const ctx = createCustomBattle([{ type: 'test-air-mage', hex: 85 }], [{ type: 'test-zombie', hex: 150 }])
    const u = ctx.state.units[0]!
    u.actions = [attacksOf(ctx, u)[0]!.id, 'power.focus']
    ctx.state.terrain.fill(TERRAIN.OBSTACLE)
    ctx.state.terrain[85] = TERRAIN.OPEN
    ctx.state.terrain[150] = TERRAIN.OPEN
    u.stamina = 0
    beginActivation(ctx, 0, 'test')
    const spy = vi.spyOn(commands, 'executeAction')
    runActivation(ctx, 0)
    expect(spy).toHaveBeenCalledWith(ctx, { actor: 0, actionId: 'power.focus', destination: 85 })
    expect(u.hex).toBe(85)
    expect(ctx.events.some(e => e.causeId === 'power.focus' && e.type === 'stamina.gained')).toBe(true)
  })

  it('a kiter with only a two-hex sidestep selects an actual two-hex landing', () => {
    const ctx = createCustomBattle([{ type: 'test-air-mage', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    const u = ctx.state.units[0]!
    u.actions = [attacksOf(ctx, u)[0]!.id, 'power.leap']
    beginActivation(ctx, 0, 'test')
    runActivation(ctx, 0)
    const moved = ctx.events.find(e => e.type === 'moved' && e.causeId === 'power.leap')
    expect(moved).toBeDefined()
    expect(ctx.geo.distance(85, u.hex)).toBe(2)
  })

  it.each(['power.move', 'power.flight', 'power.leap'])('Root blocks AI displacement through %s', id => {
    const ctx = createCustomBattle([{ type: 'test-air-mage', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    const u = ctx.state.units[0]!
    u.actions = [attacksOf(ctx, u)[0]!.id, id]
    const root = Object.values(ctx.statuses).find(s => s.blocksMovement)!
    beginActivation(ctx, 0, 'test')
    applyStatus(ctx, 0, root.id, 1, 'test')
    runActivation(ctx, 0)
    expect(u.hex).toBe(85)
    expect(ctx.events.some(e => e.type === 'move.begin' && e.actor === 0)).toBe(false)
  })

  it('a hunter replaces a cached target when Taunt requires another standing enemy', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, { type: 'test-zombie', hex: 87 }])
    const u = ctx.state.units[0]!
    u.ai = 'hunter'; u.huntTarget = 1
    const taunt = Object.values(ctx.statuses).find(s => s.forcesTarget)!
    applyStatus(ctx, 0, taunt.id, 1, 'test', 2)
    beginActivation(ctx, 0, 'test')
    runActivation(ctx, 0)
    expect(u.huntTarget).toBe(2)
    expect(ctx.events.filter(e => e.type === 'attack.declared' && e.actor === 0).every(e => e.target === 2)).toBe(true)
  })

  it('an already completed primary prevents another movement or primary action', () => {
    const ctx = createCustomBattle([{ type: 'test-air-mage', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    beginActivation(ctx, 0, 'test')
    ctx.state.units[0]!.primaryUsed = true
    const before = structuredClone(ctx.state.units)
    runActivation(ctx, 0)
    expect(ctx.state.units).toEqual(before)
    expect(ctx.events.some(e => e.type === 'move.begin' || e.type === 'attack.declared' || e.type === 'power.used')).toBe(false)
  })

  it('a stun from an opportunity hit prevents the following AI primary', () => {
    const ctx = createCustomBattle([{ type: 'test-air-mage', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, { type: 'test-zombie', hex: 90 }])
    const u = ctx.state.units[0]!, enemy = ctx.state.units[1]!
    u.hp = 99; u.maxHp = 99
    u.actions = [attacksOf(ctx, u)[0]!.id, 'power.move']
    const stun = Object.values(ctx.statuses).find(s => s.blocksAction)!
    enemy.accuracy = 200
    enemy.triggers = [{ id: 'trigger.test-interrupt', source: enemy.typeId, hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: stun.id, value: 1 } }]
    beginActivation(ctx, 0, 'test')
    runActivation(ctx, 0)
    expect(ctx.events.some(e => e.type === 'aoo.provoked' && e.target === 0)).toBe(true)
    expect(u.statuses.some(s => s.id === stun.id && s.value > 0)).toBe(true)
    expect(ctx.events.some(e => e.type === 'attack.declared' && e.actor === 0)).toBe(false)
  })

  it('resuming after a spent movement slot cannot repeat a zero-range recovery', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 150 }])
    const u = ctx.state.units[0]!
    u.actions = [attacksOf(ctx, u)[0]!.id, 'power.focus']
    u.stamina = 0
    beginActivation(ctx, 0, 'test')
    u.moveUsed = true
    runActivation(ctx, 0)
    expect(u.stamina).toBe(0)
    expect(ctx.events.some(e => e.type === 'move.begin')).toBe(false)
  })
})
