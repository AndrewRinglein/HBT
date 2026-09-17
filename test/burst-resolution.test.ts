import { describe, expect, it } from 'vitest'
import { ACTIONS } from '../src/content/index.js'
import { createBattle, createCustomBattle, fieldedDef } from '../src/core/setup.js'
import { beginActivation, createCorpse, paintLayer } from '../src/core/mutate.js'
import { burstCentres, burstCrossings, canUseBurst, previewBurst, useBurst } from '../src/core/burst.js'
import { executeAction } from '../src/core/commands.js'
import { triggersFrom, type Trigger } from '../src/core/trigger.js'
import { applyStatus, incomingAbsorb } from '../src/core/status.js'
import { centerPoint } from '../src/core/geometry.js'
import type { BurstDef, BurstProfile, Prop } from '../src/core/types.js'
import { attackOfOpportunity, zocHoldersAt } from '../src/core/movement.js'
import { canSeeHex } from '../src/core/vision.js'
import { LAYER } from '../src/content/maps.js'
import { resolveTargets } from '../src/core/target.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { burstProfile, validateBurstAction } from '../src/core/burst-profile.js'

const id = 'test.burst.probe'
function rig(patch: Partial<BurstProfile> = {}, side = 0) {
  const ctx = createCustomBattle([{type: 'test-warrior', hex: 85}], [{type: 'test-zombie', hex: 86}], {strict: true})
  const actor = ctx.state.units[side]!, target = ctx.state.units[1 - side]!
  const action: BurstDef = {id, name: 'Probe', staminaCost: 0, cooldown: 0, range: 8,
    burst: {shape: {kind: 'radius', radius: 3}, side: 'enemy', packets: [{id: 'base', amount: 8, damageType: 'true'}], ...patch}}
  ctx.actions = {...ctx.actions, [id]: action}; actor.actions.push(id)
  for (const u of ctx.state.units) {
    u.hp = u.maxHp = 100; u.armor = u.resist = 0
    u.fireResist = u.poisonResist = u.shadowResist = 0
    u.statuses = []; u.triggers = []
  }
  beginActivation(ctx, actor.id, 'test')
  return {ctx, actor, target, action}
}
const low = (name: string, hexes: number[]): Prop => ({id: name, height: 'low', material: 1, footprint: {kind: 'hex', hexes}})
function hook(effect: Trigger['effect'], n = 'save', chance = 100): Trigger {
  return {id: `test.${n}`, source: 'test.defender', hook: 'onBurst', select: 'self', chance, effect}
}

describe('burst geometry, packets and defender lifecycle', () => {
  for (const side of [0, 1]) for (const [type, defense] of [
    ['physical', 'armor'], ['magic', 'resist'], ['fire', 'fireResist'],
    ['poison', 'poisonResist'], ['shadow', 'shadowResist'], ['true', null],
  ] as const) it(`${type} uses Protection then its typed defense on side ${side}`, () => {
    const {ctx, actor, target} = rig({packets: [{id: 'base', amount: 8, damageType: type}]}, side)
    if (defense) Object.assign(target, {[defense]: 2})
    applyStatus(ctx, target.id, 'status.protection', 3, 'test')
    const before = structuredClone({state: ctx.state, events: ctx.events, rng: ctx.rng})
    const preview = previewBurst(ctx, actor.id, target.hex, id)
    expect(preview.damage).toBe(defense ? 3 : 5)
    expect({state: ctx.state, events: ctx.events, rng: ctx.rng}).toEqual(before)
    useBurst(ctx, actor.id, target.hex, id)
    expect(100 - target.hp).toBe(preview.damage); expect(incomingAbsorb(ctx, target)).toBe(0)
    expect(ctx.events.find(e => e.type === 'damage.applied' && e.causeId === id)).toMatchObject({actor: actor.id, target: target.id})
  })

  it('counts whole-ray low props once, including endpoints and overlapping distinct props, but not a zero ray', () => {
    const {ctx} = rig()
    ctx.state.props = [low('first', [85, 86]), low('overlap', [86]), low('last', [88])]
    expect(burstCrossings(ctx, 85, 88, 'low')).toEqual(['first', 'last', 'overlap'])
    expect(burstCrossings(ctx, 86, 86, 'low')).toEqual([])
    const [x, y] = centerPoint(ctx.state.board, 87)
    ctx.state.props.push({id: 'polygon', height: 'low', material: 1,
      footprint: {kind: 'polygon', movementPadding: 0, vertices: [[x - .1, y - .1], [x + .1, y - .1], [x + .1, y + .1], [x - .1, y + .1]]}})
    expect(burstCrossings(ctx, 85, 88, 'low')).toContain('polygon')
  })

  it('spends one cover budget and one Protection pool across the declared packet order', () => {
    const {ctx, actor, target} = rig({packets: [{id: 'first', amount: 1, damageType: 'true'}, {id: 'second', amount: 7, damageType: 'fire'}]})
    ctx.state.props = [low('low', [target.hex])]
    applyStatus(ctx, target.id, 'status.protection', 2, 'test'); target.fireResist = 1
    const forecast = previewBurst(ctx, actor.id, actor.hex, id)
    expect(forecast.targets[0]!.packets.map(p => [p.id, p.raw, p.absorbed, p.resolved])).toEqual([['first', 0, 0, 0], ['second', 6, 2, 3]])
    useBurst(ctx, actor.id, actor.hex, id)
    expect(target.hp).toBe(97); expect(incomingAbsorb(ctx, target)).toBe(0)
  })

  it('high shielding blocks damage and healing while low props reduce damage only', () => {
    for (const height of ['low', 'high'] as const) {
      const {ctx, actor, target} = rig({heal: 7})
      target.hp = 50; ctx.state.props = [{...low('cover', [target.hex]), height}]
      useBurst(ctx, actor.id, actor.hex, id)
      expect(target.hp).toBe(height === 'high' ? 50 : 51)
      expect(ctx.events.some(e => e.type === 'burst.shielded')).toBe(height === 'high')
    }
  })

  it('public preview does not roll a save, and actual saves precede pools with floor rounding', () => {
    const {ctx, actor, target} = rig({packets: [{id: 'base', amount: 9, damageType: 'true'}]})
    target.triggers = triggersFrom([hook({kind: 'burstScale', percent: 50})])
    applyStatus(ctx, target.id, 'status.protection', 3, 'test')
    const before = structuredClone({state: ctx.state, events: ctx.events, rng: ctx.rng})
    expect(previewBurst(ctx, actor.id, target.hex, id).targets[0]).toMatchObject({damage: 6, conditional: true})
    expect({state: ctx.state, events: ctx.events, rng: ctx.rng}).toEqual(before)
    useBurst(ctx, actor.id, target.hex, id)
    expect(target.hp).toBe(99); expect(incomingAbsorb(ctx, target)).toBe(0)
    expect(ctx.events.filter(e => e.type === 'trigger.fired' && e.causeId === 'test.save')).toHaveLength(1)
  })

  for (const amount of [-1, 0, 1]) it(`preserves signed vulnerability while onBurst exposure remains positive-payload only (${amount})`, () => {
    const {ctx, actor, target} = rig({packets: [{id: 'base', amount, damageType: 'fire'}]})
    target.fireResist = -3; target.triggers = triggersFrom([hook({kind: 'burstScale', percent: 100})])
    useBurst(ctx, actor.id, target.hex, id)
    expect(target.hp).toBe(100 - amount - 3)
    expect(ctx.events.filter(e => e.type === 'trigger.fired' && e.causeId === 'test.save')).toHaveLength(amount > 0 ? 1 : 0)
  })

  it('reactive shields are spent once before actual HP damage; healing-only never fires onBurst', () => {
    const {ctx, actor, target} = rig()
    target.triggers = triggersFrom([hook({kind: 'status.apply', statusId: 'status.protection', value: 5})])
    useBurst(ctx, actor.id, target.hex, id)
    expect(target.hp).toBe(97); expect(incomingAbsorb(ctx, target)).toBe(0)
    const heal = rig({packets: [], heal: 5}); heal.target.hp = 50
    heal.target.triggers = triggersFrom([hook({kind: 'damage', amount: 20, damageType: 'true'})])
    useBurst(heal.ctx, heal.actor.id, heal.target.hex, id)
    expect(heal.target.hp).toBe(55)
    expect(heal.ctx.events.some(e => e.type === 'trigger.fired')).toBe(false)
  })

  it('enumeration is pure and unit-target/mixed/out-of-range requests reject atomically', () => {
    const {ctx, actor} = rig()
    const before = structuredClone({state: ctx.state, events: ctx.events, rng: ctx.rng})
    expect(burstCentres(ctx, actor.id, id)).toContain(actor.hex)
    for (const req of [{target: 1}, {centre: actor.hex, target: 1}, {centre: -1}, {centre: 9999}]) {
      expect(executeAction(ctx, {actor: actor.id, actionId: id, ...req}).ok).toBe(false)
      expect({state: ctx.state, events: ctx.events, rng: ctx.rng}).toEqual(before)
    }
  })

  it('arc self-centre rejects; visible empty hexes need no unit and high placement LOS stays separate', () => {
    const {ctx, actor, action} = rig()
    const far = 90
    actor.vision = -5
    paintLayer(ctx, far, LAYER.DARKNESS, 'test')
    expect(canSeeHex(ctx, actor, far)).toBe(false)
    expect(canUseBurst(ctx, actor.id, far, id)).toBe(false)
    paintLayer(ctx, far, LAYER.NONE, 'test')
    expect(canSeeHex(ctx, actor, far)).toBe(true)
    expect(canUseBurst(ctx, actor.id, far, id)).toBe(true)
    ctx.state.props = [{...low('wall', [87]), height: 'high'}]
    expect(canSeeHex(ctx, actor, far)).toBe(true)
    expect(canUseBurst(ctx, actor.id, far, id)).toBe(false)
    ctx.actions = {...ctx.actions, [id]: {...action, range: 1, burst: {...action.burst, shape: {kind: 'arc'}}}}
    const before = saveBattle(ctx)
    expect(executeAction(ctx, {actor: actor.id, actionId: id, centre: actor.hex}).ok).toBe(false)
    expect(saveBattle(ctx)).toBe(before)
  })

  for (const side of [0, 1]) it(`side/tag filters use allegiance, including caster, with mirrored rules on side ${side}`, () => {
    const {ctx, actor, target, action} = rig({side: 'any', requireTags: ['probe']}, side)
    ctx.cfg.switches.mirrorSideRules = 'row'
    actor.tags = [...actor.tags, 'probe']; target.tags = [...target.tags, 'probe']
    expect(previewBurst(ctx, actor.id, actor.hex, id).targets.map(t => t.id)).toEqual([0, 1])
    ctx.actions = {...ctx.actions, [id]: {...action, burst: {...action.burst, side: 'ally'}}}
    expect(previewBurst(ctx, actor.id, actor.hex, id).targets.map(t => t.id)).toEqual([actor.id])
    target.tags = target.tags.filter(t => t !== 'probe')
    ctx.actions = {...ctx.actions, [id]: {...action, burst: {...action.burst, side: 'enemy'}}}
    expect(previewBurst(ctx, actor.id, actor.hex, id).targets).toEqual([])
  })

  it('burst-only actions cannot deliver a ZoC reaction, while ordinary attacks still can', () => {
    const {ctx, actor, target} = rig()
    expect(zocHoldersAt(ctx, target, target.hex).map(u => u.id)).toContain(actor.id)
    actor.actions = [id]
    expect(attackOfOpportunity(ctx, actor.id, target.id)).toBe(false)
    expect(ctx.events.some(e => e.type === 'aoo.provoked' || e.type.startsWith('attack.'))).toBe(false)
    actor.actions.push('attack.test-warrior.axe'); actor.stamina = 100
    attackOfOpportunity(ctx, actor.id, target.id)
    expect(ctx.events.some(e => e.type === 'aoo.provoked')).toBe(true)
  })

  it('Taunt constrains unit targets only; Silence consistently locks burst powers, including arcs', () => {
    const {ctx, actor, target} = rig()
    applyStatus(ctx, actor.id, 'status.taunt', 2, 'test', target.id)
    expect(canUseBurst(ctx, actor.id, actor.hex, id)).toBe(true)
    applyStatus(ctx, actor.id, 'status.powers-locked', 2, 'test')
    expect(canUseBurst(ctx, actor.id, actor.hex, id)).toBe(false)
  })

  it('ordinary radius targeting remains wall-penetrating', () => {
    const {ctx, actor, target} = rig()
    ctx.state.props = [{...low('wall', [target.hex]), height: 'high'}]
    expect(previewBurst(ctx, actor.id, actor.hex, id).targets[0]!.damage).toBe(0)
    expect(resolveTargets(ctx, actor, {select: 'area', origin: 'self', radius: 3, side: 'enemy'}, actor.id)).toContain(target.id)
  })

  it('damage then healing settles after the full target payload, and emits actual healing', () => {
    const {ctx, actor, target} = rig({heal: 5}); target.hp = 2
    const forecast = previewBurst(ctx, actor.id, target.hex, id)
    expect(forecast.targets[0]).toMatchObject({damage: 8, applied: 2, heal: 5})
    useBurst(ctx, actor.id, target.hex, id)
    expect(target.hp).toBe(5); expect(target.lifeState).toBe('standing')
    expect(ctx.events.find(e => e.type === 'burst.struck')).toMatchObject({damage: 8, applied: 2, heal: 5})
  })

  it('save eligibility is before Frost; its once-per-target vulnerability honors the shared pool-order switch', () => {
    for (const beforeProtection of [true, false]) {
      const {ctx, actor, target} = rig({packets: [{id: 'first', amount: 0, damageType: 'physical'}, {id: 'second', amount: 0, damageType: 'physical'}]})
      ctx.cfg.switches.frostBeforeProtection = beforeProtection
      applyStatus(ctx, target.id, 'status.frost', 3, 'test'); applyStatus(ctx, target.id, 'status.protection', 2, 'test')
      target.triggers = triggersFrom([hook({kind: 'burstScale', percent: 0})])
      useBurst(ctx, actor.id, target.hex, id)
      expect(target.hp).toBe(beforeProtection ? 99 : 97)
      expect(incomingAbsorb(ctx, target)).toBe(beforeProtection ? 0 : 2)
      expect(ctx.events.some(e => e.type === 'trigger.fired')).toBe(false)
    }
  })

  it('snapshots preserve burst ordinals and strict action transport exactly', () => {
    const {ctx, actor, target} = rig()
    const restored = restoreBattle(saveBattle(ctx), ctx)
    useBurst(ctx, actor.id, target.hex, id); useBurst(restored, actor.id, target.hex, id)
    expect(restored.state).toEqual(ctx.state); expect(restored.events).toEqual(ctx.events); expect(restored.rng).toEqual(ctx.rng)
    expect(ctx.state.units[actor.id]!.burstOrdinal).toBe(1)
    expect(restoreBattle(saveBattle(ctx), ctx).state).toEqual(ctx.state)
  })

  it('rejects legacy/mixed profiles and malformed packet/type/filter/save transport', () => {
    const {action} = rig()
    for (const patch of [{area: 'arc'}, {attack: {}}, {effects: []}, {range: 101}]) expect(() => validateBurstAction({...action, ...patch} as any)).toThrow(/burst/)
    for (const patch of [{side: 'foe'}, {shape: {kind: 'radius', radius: 1.5}}, {packets: [{id: 'a', amount: 3, damageType: 'holy'}]}, {packets: [{id: 'a', amount: 1, damageType: 'fire'}, {id: 'a', amount: 2, damageType: 'fire'}]}, {heal: -1}]) expect(() => burstProfile({...action.burst, ...patch})).toThrow(/burst/)
    for (const percent of [-1, 101, .5]) expect(() => triggersFrom([hook({kind: 'burstScale', percent})])).toThrow()
  })

  it('source payload stays frozen when an early defender weakens the caster', () => {
    const {ctx, actor, target} = rig({packets: [{id: 'base', stat: 'magic', amount: 1, damageType: 'true'}]})
    const later = ctx.arrive!(ctx, ctx.units!['test-zombie']!, 87, 'test')
    actor.magic = 9; target.hp = target.maxHp = later.hp = later.maxHp = 100
    target.triggers = triggersFrom([{...hook({kind: 'statMod', stat: 'magic', value: -50, until: 'battle'}), select: 'target'}])
    later.triggers = []
    useBurst(ctx, actor.id, target.hex, id)
    expect(target.hp).toBe(90); expect(later.hp).toBe(90)
    expect(actor.mods.some(m => m.stat === 'magic' && m.value === -50)).toBe(true)
  })

  it('continues a declared burst after the caster reaches zero, and settles every death once', () => {
    const {ctx, actor, target} = rig()
    const later = ctx.arrive!(ctx, ctx.units!['test-zombie']!, 87, 'test')
    actor.hp = 1; target.hp = later.hp = 4; later.triggers = []
    target.triggers = triggersFrom([
      {...hook({kind: 'damage', amount: 20, damageType: 'true'}), select: 'target'},
      {...hook({kind: 'heal', amount: 1}, 'death'), hook: 'onDeath'},
    ])
    useBurst(ctx, actor.id, target.hex, id)
    expect(target.lifeState).toBe('dead'); expect(later.lifeState).toBe('dead')
    expect(ctx.events.filter(e => e.type === 'burst.struck').map(e => e.target)).toEqual([target.id, later.id])
    expect(ctx.events.filter(e => e.type === 'life.dead' && e.target === target.id)).toHaveLength(1)
    expect(ctx.events.filter(e => e.type === 'trigger.rolled' && e['hook'] === 'onDeath' && e.actor === target.id)).toHaveLength(1)
  })

  it('new arrivals are excluded from the frozen roster even when raised inside the burst', () => {
    const {ctx, actor, target} = rig()
    createCorpse(ctx, {...target, hex: 87}, 'test')
    target.triggers = triggersFrom([hook({kind: 'corpse.raise', unit: 'test-zombie', radius: 3})])
    useBurst(ctx, actor.id, target.hex, id)
    const raised = ctx.state.units.at(-1)!
    expect(raised.id).not.toBe(target.id); expect(raised.summoned).toBe(true)
    expect(raised.hp).toBe(raised.maxHp)
    expect(ctx.events.filter(e => e.type === 'burst.struck').map(e => e.target)).toEqual([target.id])
  })

  it('moved recipients keep declaration geometry rather than escaping or gaining new cover', () => {
    const {ctx, actor, target} = rig({shape: {kind: 'radius', radius: 1}})
    const later = ctx.arrive!(ctx, ctx.units!['test-zombie']!, 87, 'test')
    later.hp = later.maxHp = 100; later.triggers = []
    target.triggers = triggersFrom([{...hook({kind: 'knockback', value: 2}),
      select: {select: 'area', origin: 'self', radius: 1, side: 'ally'}}])
    useBurst(ctx, actor.id, target.hex, id)
    expect(later.hex).not.toBe(87); expect(later.hp).toBe(92)
    expect(ctx.events.find(e => e.type === 'burst.struck' && e.target === later.id)).toMatchObject({hex: 87})
  })

  it('two casters and repeated activations keep independent hook RNG ordinals through resume', () => {
    const {ctx, actor, target, action} = rig()
    const other = ctx.arrive!(ctx, ctx.units!['test-warrior']!, 84, 'test')
    other.actions.push(id); target.triggers = triggersFrom([hook({kind: 'burstScale', percent: 50}, 'save', 50)])
    for (const caster of [actor, other, actor]) {
      beginActivation(ctx, caster.id, 'test')
      const fork = restoreBattle(saveBattle(ctx), ctx)
      useBurst(ctx, caster.id, target.hex, action.id); useBurst(fork, caster.id, target.hex, action.id)
      expect(fork.state).toEqual(ctx.state); expect(fork.events).toEqual(ctx.events); expect(fork.rng).toEqual(ctx.rng)
    }
    expect(actor.burstOrdinal).toBe(2); expect(other.burstOrdinal).toBe(1)
    expect(ctx.events.filter(e => e.type === 'trigger.rolled' && e.causeId === 'test.save')).toHaveLength(3)
  })

  it('rejects absent, malformed and rewound saved burst ordinals rather than reusing hook keys', () => {
    const {ctx, actor, target} = rig()
    useBurst(ctx, actor.id, target.hex, id)
    for (const value of [undefined, 0, -1, 1.5, '1', 2]) {
      const saved = JSON.parse(saveBattle(ctx))
      if (value === undefined) delete saved.state.units[actor.id].burstOrdinal
      else saved.state.units[actor.id].burstOrdinal = value
      expect(() => restoreBattle(JSON.stringify(saved), ctx)).toThrow(/burst ordinal/)
    }
    const saved = JSON.parse(saveBattle(ctx))
    saved.events.find((e: any) => e.type === 'burst.declared').ordinal = 0
    expect(() => restoreBattle(JSON.stringify(saved), ctx)).toThrow(/burst event ordinal/)
  })

  it('actual TEST rows transport two payloads and reactive save/shield hooks into equipped battle state', () => {
    const ctx = createCustomBattle([{type: 'test-burst-flame', hex: 85}, {type: 'test-warrior', hex: 84}], [{type: 'test-burst-ward', hex: 86}])
    const caster = ctx.state.units[0]!, friend = ctx.state.units[1]!, ward = ctx.state.units[2]!
    const flame = 'power.test-burst-flame', mercy = 'power.test-burst-mercy'
    expect(caster.actions).toEqual(expect.arrayContaining([flame, mercy]))
    expect(ward.triggers.filter(t => t.hook === 'onBurst').map(t => [t.source, t.effect.kind])).toEqual([
      ['unit.test-burst-ward', 'burstScale'], ['unit.test-burst-ward', 'status.apply'],
    ])
    beginActivation(ctx, caster.id, 'test')
    expect(previewBurst(ctx, caster.id, ward.hex, flame).targets[0]).toMatchObject({damage: 4, conditional: true})
    useBurst(ctx, caster.id, ward.hex, flame)
    expect(ward.hp).toBe(ward.maxHp); expect(incomingAbsorb(ctx, ward)).toBe(0)
    expect(ctx.events.find(e => e.type === 'burst.struck')).toMatchObject({damage: 0, packets: [
      {id: 'ember', raw: 2, absorbed: 2, defense: 1, resolved: 0},
      {id: 'shade', raw: 1, absorbed: 0, defense: 2, resolved: 0},
    ]})
    beginActivation(ctx, caster.id, 'test'); friend.hp = 1; caster.stamina = 10
    useBurst(ctx, caster.id, friend.hex, mercy)
    expect(friend.hp).toBe(Math.min(friend.maxHp, 8))
    expect(ctx.events.filter(e => e.type === 'burst.declared').map(e => e.causeId)).toEqual([flame, mercy])
  })

  it('positive exposure reacts even when later fully absorbed or resisted, while complete cover does not', () => {
    for (const layer of ['shield', 'resist', 'cover'] as const) {
      const {ctx, actor, target} = rig({packets: [{id: 'base', amount: 2, damageType: 'fire'}]})
      target.triggers = triggersFrom([hook({kind: 'burstScale', percent: 100})])
      if (layer === 'shield') applyStatus(ctx, target.id, 'status.protection', 2, 'test')
      if (layer === 'resist') target.fireResist = 2
      if (layer === 'cover') ctx.state.props = [low('cover', [target.hex])]
      useBurst(ctx, actor.id, actor.hex, id)
      expect(target.hp).toBe(100)
      expect(ctx.events.filter(e => e.type === 'trigger.rolled' && e.causeId === 'test.save')).toHaveLength(layer === 'cover' ? 0 : 1)
    }
  })
})

// V2 hex bursts supersede the compiler's admitted unit-centred fallback for
// these authored travelling blasts. Existing aura/heal pulses stay separate.
for (const id of ['power.bowmaster.rain-of-arrows', 'power.fire-master.fireball', 'power.wyrmling.scorch']) {
  function authoredRig() {
    const ctx = createCustomBattle([{type: 'test-mage', hex: 85}], [{type: 'test-zombie', hex: 86}], {strict: true})
    ctx.state.turn = 2
    const actor = ctx.state.units[0]!, target = ctx.state.units[1]!
    actor.actions.push(id); actor.stamina = actor.maxStamina = 10
    actor.magic = actor.precision = 6
    target.hp = target.maxHp = 100; target.armor = target.resist = 0
    actor.triggers = []; target.triggers = []
    beginActivation(ctx, actor.id, 'test')
    return {ctx, actor, target}
  }
  it(`${id} accepts a visible empty centre, preserving authored cost and typed payload`, () => {
    const {ctx, actor} = authoredRig()
    const centre = ctx.geo.neighboursOf(actor.hex).find(h => !ctx.state.units.some(u => u.hex === h))!
    const before = actor.stamina
    expect(executeAction(ctx, {actor: actor.id, actionId: id, centre})).toEqual({ok: true})
    expect(before - actor.stamina).toBe(ctx.actions[id]!.staminaCost)
    expect(ctx.events.find(e => e.type === 'burst.declared' && e.causeId === id)).toMatchObject({centre})
  })
  it(`${id} cannot damage a recipient shielded from its centre by a high prop`, () => {
    const {ctx, actor, target} = authoredRig()
    ctx.state.props = [{id: 'high', height: 'high', material: 1, footprint: {kind: 'hex', hexes: [target.hex]}}]
    const aim = ctx.actions[id]!.burst ? {centre: actor.hex} : {target: actor.id}
    expect(executeAction(ctx, {actor: actor.id, actionId: id, ...aim})).toEqual({ok: true})
    expect(target.hp).toBe(100)
    expect(ctx.events.some(e => e.type === 'burst.shielded' && e.target === target.id)).toBe(true)
  })
}

it('published travelling area damage cannot bypass the burst registry', () => {
  for (const a of Object.values(ACTIONS)) {
    expect(a.target?.select === 'area' && a.target.origin === 'target' && a.effects?.some(e => e.kind === 'damage'), a.id).not.toBe(true)
  }
})

for (const [id, range, cooldown] of [
  ['power.bowmaster.rain-of-arrows', 4, 4],
  ['power.fire-master.fireball', 6, 3],
  ['power.wyrmling.scorch', 3, 3],
] as const) it(`${id} preserves fielded warmup, range, stamina and cooldown`, () => {
  const ctx = createBattle({replicate: 0, heroes: ['test-mage'], enemies: ['test-zombie'], heroHexes: [85], enemyHexes: [100],
    overrides: {'test-mage': {abilities: [id], maxStamina: 10, maxHp: 100}}, strict: true})
  const actor = ctx.state.units[0]!
  expect(ctx.actions[id]).toMatchObject({source: 'class', range, warmup: 1, staminaCost: 2, cooldown})
  expect(actor.cooldowns[id]).toBe(2)
  ctx.state.turn = 1; beginActivation(ctx, actor.id, 'test')
  const before = JSON.stringify({state: ctx.state, events: ctx.events, rng: ctx.rng})
  expect(executeAction(ctx, {actor: actor.id, actionId: id, centre: actor.hex}).ok).toBe(false)
  expect(JSON.stringify({state: ctx.state, events: ctx.events, rng: ctx.rng})).toBe(before)
  ctx.state.turn = 2; beginActivation(ctx, actor.id, 'test')
  const stamina = actor.stamina
  expect(executeAction(ctx, {actor: actor.id, actionId: id, centre: actor.hex})).toEqual({ok: true})
  expect(stamina - actor.stamina).toBe(2)
  expect(actor.cooldowns[id]).toBe(2 + cooldown + 1)
})

it('progression grants class bursts without admitting ordinary attacks or movement as drafted powers', () => {
  const hero = 'hero.base.ranger-aggressive'
  const progress = {level: 2, specialtyId: 'specialty.bowmaster'}
  expect(fieldedDef(hero, undefined, {...progress, powers: ['power.bowmaster.rain-of-arrows']}).abilities).toContain('power.bowmaster.rain-of-arrows')
  for (const a of [Object.values(ACTIONS).find(a => a.attack)!, Object.values(ACTIONS).find(a => a.move)!]) {
    expect(() => fieldedDef(hero, undefined, {...progress, powers: [a.id]})).toThrow(/not a power/)
  }
})
