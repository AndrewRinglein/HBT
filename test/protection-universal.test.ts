import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { applyStatus, incomingAbsorb, statusDamage, tickUnitStatuses, valueOf } from '../src/core/status.js'
import { fireTriggers, triggersFrom } from '../src/core/trigger.js'
import { previewPower, usePower } from '../src/core/ability.js'
import { resolveDamage } from '../src/core/pipeline.js'
import { beginActivation, loseMaxHp, paintLayer } from '../src/core/mutate.js'
import { endOfActivation } from '../src/core/battle.js'
import { LAYER } from '../src/content/maps.js'

const rows = [['physical', 'armor'], ['magic', 'resist'], ['fire', 'fireResist'],
  ['poison', 'poisonResist'], ['shadow', 'shadowResist'], ['true', null]] as const
const rig = () => createCustomBattle([{type: 'test-warrior', hex: 85}], [{type: 'test-zombie', hex: 86}])

describe('rule.protection-universal', () => {
  for (const targetId of [0, 1]) for (const [type, defense] of rows) for (const path of ['tick', 'trigger']) {
    it(`${path} ${type} damage consumes both pools before defense on side ${targetId}`, () => {
      const ctx = rig(), target = ctx.state.units[targetId]!, source = ctx.state.units[1 - targetId]!
      target.hp = target.maxHp = 100
      Object.assign(target, {armor: 0, resist: 0, fireResist: 0, poisonResist: 0, shadowResist: 0})
      if (defense) Object.assign(target, {[defense]: 2})
      applyStatus(ctx, target.id, 'status.protection', 2, 'test')
      applyStatus(ctx, target.id, 'test.status.ward', 3, 'test')
      const at = ctx.events.length
      const cause = path === 'tick' ? 'test.typed-tick' : 'test.typed-trigger'
      if (path === 'tick') {
        ctx.statuses = {...ctx.statuses, [cause]: {id: cause, name: 'Typed tick', shape: 'counter', stacking: 'add', tickDamageType: type}}
        statusDamage(ctx, target.id, 8, cause)
      } else {
        source.triggers = triggersFrom([{id: cause, hook: 'onHit', chance: 100, select: 'target', source: cause,
          effect: {kind: 'damage', amount: 8, damageType: type}}])
        fireTriggers(ctx, 'onHit', {ownerId: source.id, targetId: target.id, causeId: 'test', ordinal: 1})
      }
      const events = ctx.events.slice(at)
      expect(100 - target.hp).toBe(defense ? 1 : 3)
      expect(incomingAbsorb(ctx, target)).toBe(0)
      expect(events.filter(e => e.type === 'status.reduced').map(e => [e.causeId, e.target, e['statusId'], e['by']]))
        .toEqual([[cause, target.id, 'status.protection', 2], [cause, target.id, 'test.status.ward', 3]])
      expect(events.find(e => e.type === 'damage.applied')).toMatchObject({causeId: cause, target: target.id,
        actor: path === 'tick' ? null : source.id, damageType: type, absorbed: 5, amount: defense ? 1 : 3})
    })
  }

  for (const targetId of [0, 1]) for (const [type, defense] of rows) {
    it(`explicit self damage ${type} spends pools on side ${targetId}`, () => {
      const ctx = rig(), u = ctx.state.units[targetId]!, id = 'power.test-self-typed'
      u.hp = u.maxHp = 100
      Object.assign(u, {armor: 0, resist: 0, fireResist: 0, poisonResist: 0, shadowResist: 0})
      if (defense) Object.assign(u, {[defense]: 2})
      ctx.actions = {...ctx.actions, [id]: {...ctx.actions['power.test-second-wind']!, id,
        effects: [{kind: 'selfDamage', amount: 8, damageType: type}]}}
      u.actions.push(id); beginActivation(ctx, u.id, 'test')
      applyStatus(ctx, u.id, 'status.protection', 5, 'test')
      const before = structuredClone({state: ctx.state, events: ctx.events, rng: ctx.rng})
      expect(previewPower(ctx, u.id, u.id, id)).toMatchObject({selfDamage: defense ? 1 : 3, selfDamageApplied: defense ? 1 : 3})
      expect({state: ctx.state, events: ctx.events, rng: ctx.rng}).toEqual(before)
      usePower(ctx, u.id, u.id, id)
      expect(100 - u.hp).toBe(defense ? 1 : 3)
      expect(incomingAbsorb(ctx, u)).toBe(0)
    })
  }

  it('the authored Eldritch Might self damage is absorbed and its stat grant still happens', () => {
    const ctx = rig(), u = ctx.state.units[0]!, id = 'power.fire-master.eldritch-might'
    u.actions.push(id); u.stamina = 99; beginActivation(ctx, u.id, 'test')
    applyStatus(ctx, u.id, 'status.protection', 100, 'test')
    const amount = ctx.actions[id]!.effects!.find(e => e.kind === 'selfDamage')!.amount as number
    const hp = u.hp
    expect(previewPower(ctx, u.id, u.id, id)).toMatchObject({selfDamage: 0, selfDamageApplied: 0})
    usePower(ctx, u.id, u.id, id)
    expect(u.hp).toBe(hp); expect(incomingAbsorb(ctx, u)).toBe(100 - amount)
    expect(ctx.events.some(e => e.type === 'statmod.added' && e.causeId === id)).toBe(true)
  })

  it('successive self damage effects preview the remaining shared pool', () => {
    const ctx = rig(), u = ctx.state.units[0]!, id = 'power.test-double-self'
    ctx.actions = {...ctx.actions, [id]: {...ctx.actions['power.test-second-wind']!, id, effects: [
      {kind: 'selfDamage', amount: 4, damageType: 'true'},
      {kind: 'selfDamage', amount: 4, damageType: 'true'},
    ]}}
    u.actions.push(id); beginActivation(ctx, u.id, 'test')
    applyStatus(ctx, u.id, 'status.protection', 5, 'test')
    const before = structuredClone({state: ctx.state, events: ctx.events, rng: ctx.rng})
    expect(previewPower(ctx, u.id, u.id, id)).toMatchObject({selfDamage: 3, selfDamageApplied: 3})
    expect({state: ctx.state, events: ctx.events, rng: ctx.rng}).toEqual(before)
    const hp = u.hp; usePower(ctx, u.id, u.id, id)
    expect(hp - u.hp).toBe(3); expect(incomingAbsorb(ctx, u)).toBe(0)
    expect(ctx.events.filter(e => e.type === 'damage.applied' && e.causeId === id).map(e => [e['amount'], e['absorbed']]))
      .toEqual([[0, 4], [3, 1]])
  })

  it('signed defense keeps the existing attack order, including damage after full raw absorption', () => {
    for (const [type, defense] of rows) {
      if (!defense) continue
      const ctx = rig(), u = ctx.state.units[0]!, source = ctx.state.units[1]!
      Object.assign(u, {[defense]: -2}); source.strength = 0
      applyStatus(ctx, u.id, 'status.protection', 4, 'test')
      const pure = resolveDamage(ctx, source, u, {id: 'test.hit', stat: 'strength', bonus: 4, damageType: type}, false, 0, 4)
      expect(pure.value).toBe(2); expect(pure.absorbed).toBe(4)
      ctx.statuses = {...ctx.statuses, 'test.tick': {id: 'test.tick', name: 'Tick', shape: 'counter', stacking: 'add', tickDamageType: type}}
      const hp = u.hp; statusDamage(ctx, u.id, 4, 'test.tick')
      expect(hp - u.hp).toBe(pure.value); expect(incomingAbsorb(ctx, u)).toBe(0)
    }
  })

  it('ordered self damage preview reports resolved damage and actual HP loss separately without spending', () => {
    const ctx = rig(), u = ctx.state.units[0]!, id = 'power.test-self-damage'
    u.hp = 1; u.fireResist = 1
    ctx.actions = {...ctx.actions, [id]: {...ctx.actions['power.test-second-wind']!, id, effects: [
      {kind: 'status.apply', statusId: 'status.protection', value: 2},
      {kind: 'selfDamage', amount: 5, damageType: 'fire'},
    ]}}
    u.actions.push(id); beginActivation(ctx, u.id, 'test')
    const before = structuredClone({state: ctx.state, events: ctx.events, rng: ctx.rng})
    const shown = previewPower(ctx, u.id, u.id, id) as {selfDamage?: number; selfDamageApplied?: number}
    expect(shown.selfDamage).toBe(2); expect(shown.selfDamageApplied).toBe(1)
    expect({state: ctx.state, events: ctx.events, rng: ctx.rng}).toEqual(before)
    usePower(ctx, u.id, u.id, id)
    expect(ctx.events.find(e => e.type === 'damage.applied' && e.causeId === id))
      .toMatchObject({actor: u.id, target: u.id, abilityId: id, damageType: 'fire', absorbed: 2, resisted: 1, amount: 1, overkill: 1})
    expect(ctx.events.find(e => e.type === 'status.reduced' && e.causeId === id))
      .toMatchObject({target: u.id, statusId: 'status.protection', by: 2})
  })

  it('authored true Bleed and burning terrain use the same absorption path and full clock', () => {
    const ctx = rig(), u = ctx.state.units[0]!
    applyStatus(ctx, u.id, 'status.protection', 5, 'test')
    applyStatus(ctx, u.id, 'status.bleed', 3, 'test')
    const hp = u.hp; tickUnitStatuses(ctx, u.id)
    expect(u.hp).toBe(hp); expect(valueOf(u, 'status.bleed')).toBe(2)
    expect(valueOf(u, 'status.protection')).toBe(1) // three spent, one ordinary decay
    const hazard = rig(), v = hazard.state.units[0]!
    applyStatus(hazard, v.id, 'status.protection', 5, 'test')
    paintLayer(hazard, v.hex, LAYER.BURNING, 'test'); beginActivation(hazard, v.id, 'test')
    const hpBefore = v.hp; endOfActivation(hazard, v.id)
    expect(v.hp).toBe(hpBefore); expect(valueOf(v, 'status.protection')).toBe(3)
    expect(hazard.events.find(e => e.type === 'damage.applied' && e['statusId'] === 'status.burn'))
      .toMatchObject({damageType: 'fire', absorbed: 1, amount: 0})
  })

  it('max HP clamping and Shadow obliteration remain non-damage state changes', () => {
    const ctx = rig(), u = ctx.state.units[0]!
    applyStatus(ctx, u.id, 'status.protection', 5, 'test')
    const hp = u.hp; loseMaxHp(ctx, u.id, 2, 'test.cap')
    expect(u.hp).toBe(hp - 2); expect(incomingAbsorb(ctx, u)).toBe(5)
    applyStatus(ctx, u.id, 'status.shadow', u.maxHp - 1, 'test'); tickUnitStatuses(ctx, u.id)
    expect(u.lifeState).toBe('dead'); expect(valueOf(u, 'status.protection')).toBe(4)
    expect(ctx.events.some(e => e.type === 'damage.applied')).toBe(false)
  })
})
