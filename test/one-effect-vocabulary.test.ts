// fix.one-effect-vocabulary (2026-10-01; the duplication review ruled 2026-09-28, findings E5–E8, C7, C13,
// C14, C20: "fix as proposed"). One effect union (types.ts Effect) and one interpreter (trigger.ts
// applyEffect) for triggers, powers, move riders and chart rows; one name per mutator; one duration set
// for statMod with end of Activation (C20); one direct-damage function; one packet planner; the legacy
// power fields retired; Creeping Blight paints layer.poisoned.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createCustomBattle } from '../src/core/setup.js'
import { beginActivation, expireActivationMods, layerAt } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { fireTriggers, triggersFrom, valueOf, HOOKS, type Trigger } from '../src/core/trigger.js'
import { usePower } from '../src/core/ability.js'
import { effective } from '../src/core/stats.js'
import { DMG, LOW_COVER_ACCURACY } from '../src/core/pipeline.js'
import { BURST_LOW_COVER_ABSORB } from '../src/core/burst.js'
import { EFFECT_KINDS } from '../src/core/types.js'
import { engineVocabulary } from '../src/core/vocabulary.js'
import { layerOfId } from '../src/content/maps.js'
import { ACTIONS } from '../src/content/index.js'
import type { Ctx } from '../src/core/types.js'

const core = (f: string) => readFileSync(new URL(`../src/core/${f}`, import.meta.url), 'utf8')
const coreFiles = readdirSync(new URL('../src/core/', import.meta.url)).filter((f) => f.endsWith('.ts'))
const field = () => {
  const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: 5 * 12 + 5 }], [{ type: 'test-zombie', hex: 9 * 12 + 9 }])
  return { ctx, g: ctx.state.units[0]!, z: ctx.state.units[1]! }
}
const fire = (ctx: Ctx, ownerId: number, t: Omit<Trigger, 'id' | 'source' | 'chance' | 'hook' | 'select'>) => {
  ctx.state.units[ownerId]!.triggers = triggersFrom([{ id: 'test.trigger.one-effect', source: 'test.one-effect', chance: 100, hook: 'onActivationEnd', select: 'self', ...t }])
  fireTriggers(ctx, 'onActivationEnd', { ownerId, targetId: null, causeId: 'test', ordinal: 1, keyTag: HOOKS.indexOf('onActivationEnd') })
}

describe('fix.one-effect-vocabulary — one union, one interpreter', () => {
  it('one effect list, exported once: the vocabulary carries effectKinds, and the old per-carrier lists are gone', () => {
    const v = engineVocabulary() as unknown as Record<string, unknown>
    expect(v['effectKinds']).toEqual([...EFFECT_KINDS])
    for (const gone of ['triggerEffectKinds', 'abilityEffectKinds', 'moveEffectKinds']) expect(v[gone]).toBeUndefined()
    // one name per mutator: the second names are not in the union
    for (const gone of ['gainStamina', 'loseStamina', 'push', 'status', 'selfDamage']) expect(EFFECT_KINDS as readonly string[]).not.toContain(gone)
  })
  it('grep finds one effect interpreter and one direct-damage function', () => {
    // the only file dispatching on effect kinds is trigger.ts (applyEffect)
    expect(coreFiles.filter((f) => core(f).includes("case 'status.apply'"))).toEqual(['trigger.ts'])
    // absorb -> flatDamage -> spend -> applyDamage lives in dealDirectDamage alone; the pipeline and the collision variant are the only other flatDamage callers
    expect(coreFiles.filter((f) => f !== 'mitigation.ts' && core(f).includes('flatDamage(')).sort()).toEqual(['movement.ts', 'pipeline.ts', 'status.ts'])
    // the six copies' homes (a power's cost in HP reaches it through applyEffect, in trigger.ts)
    for (const f of ['trigger.ts', 'status.ts', 'ground.ts', 'encounter.ts', 'thorns.ts']) expect(core(f), f).toContain('dealDirectDamage(')
    // one packet planner: the attack's and the burst's plans both run planPackets
    expect(core('pipeline.ts')).toContain('return planPackets(ctx,tg,a.id,rows)')
    expect(core('burst.ts')).toContain('planPackets(ctx, target, a.id, rows)')
    // core names no status id where Block's guard once applied Protection
    expect(core('ability.ts')).not.toContain("'status.protection'")
  })
  it('the cited numbers are named: the cover accuracy, the burst save station and the burst cover', () => {
    expect([LOW_COVER_ACCURACY, DMG.BURST_SAVE, BURST_LOW_COVER_ABSORB]).toEqual([20, 545, 2])
    expect(core('burst.ts')).not.toMatch(/, 545,|low\.length \* 2/)
  })
})

describe('fix.one-effect-vocabulary — what the one interpreter makes true', () => {
  it("'remove N of a status' works from a trigger", () => {
    const { ctx, g } = field()
    applyStatus(ctx, g.id, 'status.poison', 3, 'test')
    fire(ctx, g.id, { effect: { kind: 'status.remove', statusId: 'status.poison', value: 1 } })
    expect(g.statuses.find((s) => s.id === 'status.poison')?.value).toBe(2)
    expect(ctx.events.find((e) => e.type === 'trigger.fired')).toMatchObject({ effect: 'status.remove', statusId: 'status.poison', value: 1 })
  })
  it("a trigger's Max Health modifier moves Max Health (the Lieutenant Demon's aura did nothing while it was a stored mod nothing reads)", () => {
    const { ctx, g } = field()
    const [max, hp] = [g.maxHp, g.hp]
    fire(ctx, g.id, { effect: { kind: 'statMod', stat: 'maxHp', value: 1, until: 'battle' } })
    expect([g.maxHp, g.hp]).toEqual([max + 1, hp + 1])
    expect(ctx.events.some((e) => e.type === 'maxHp.gained' && e.causeId === 'test.trigger.one-effect')).toBe(true)
  })
  it('power.holy-symbol.heal resolves through effects', () => {
    expect(ACTIONS['power.holy-symbol.heal']).toMatchObject({ target: { select: 'unit', side: 'ally' }, effects: [{ kind: 'heal' }] })
    for (const f of ['effect', 'heal', 'stat', 'bonus', 'guard']) expect((ACTIONS['power.holy-symbol.heal'] as Record<string, unknown>)[f]).toBeUndefined()
    const { ctx, g } = field()
    g.actions.push('power.holy-symbol.heal'); g.hp = 1
    beginActivation(ctx, g.id, 'test')
    usePower(ctx, g.id, g.id, 'power.holy-symbol.heal')
    expect(ctx.events.find((e) => e.type === 'power.used')).toMatchObject({ abilityId: 'power.holy-symbol.heal', targets: [g.id] })
    expect(ctx.events.find((e) => e.type === 'heal.applied' && e.causeId === 'power.holy-symbol.heal')!['asked']).toBeGreaterThan(0)
    expect(g.hp).toBeGreaterThan(1)
  })
  it('C20: "until the end of your Activation" ends with the Activation, not the Turn — the Frenzy Potion and Charging Run', () => {
    expect(ACTIONS['power.charging-run']!.effects).toContainEqual({ kind: 'statMod', stat: 'strength', value: 3, until: 'endOfActivation' })
    const frenzy = ACTIONS['power.frenzy-potion.use']!
    expect(frenzy.effects!.filter((e) => e.kind === 'statMod').every((e) => e.kind === 'statMod' && e.until === 'endOfActivation')).toBe(true)
    expect(frenzy.gaps ?? []).not.toContain('"until the end of your Activation" is read as until the end of the Turn')
    const { ctx, g } = field()
    g.actions.push(frenzy.id); g.usesLeft[frenzy.id] = 1
    beginActivation(ctx, g.id, 'test')
    const strength = effective(ctx, g, 'strength').value
    usePower(ctx, g.id, g.id, frenzy.id)
    expect(effective(ctx, g, 'strength').value).toBe(strength + 2)
    expireActivationMods(ctx, g.id, 'activation.end')   // the same Turn: the Activation is what ends
    expect(effective(ctx, g, 'strength').value).toBe(strength)
  })
  it("a value may read the acting unit's own stat — Block's 'Protection equal to 4 + your Armor'", () => {
    const { ctx, g } = field()
    expect(valueOf(ctx, g, { scale: 'stat', stat: 'armor', base: 4, mult: 1 })).toBe(4 + effective(ctx, g, 'armor').value)
  })
  it('Creeping Blight paints layer.poisoned over the seven hexes', () => {
    const blight = ACTIONS['power.blightcaller.creeping-blight']!
    expect(blight.effects).toEqual([{ kind: 'layer.paint', layer: 'layer.poisoned', radius: 1, origin: 'target' }])
    const { ctx, g, z } = field()
    g.actions.push(blight.id); g.stamina = g.maxStamina; ctx.state.turn = 3
    const hexes = Array.from({ length: ctx.geo.hexCount }, (_, h) => h)
    z.hex = hexes.find((h) => ctx.geo.distance(h, g.hex) === 3 && hexes.filter((x) => ctx.geo.distance(x, h) <= 1).length === 7)!   // a whole ring, off the board's edge
    beginActivation(ctx, g.id, 'test')
    usePower(ctx, g.id, z.id, blight.id)
    const ring = hexes.filter((h) => ctx.geo.distance(h, z.hex) <= 1)
    expect(ring).toHaveLength(7)
    for (const h of ring) expect(layerAt(ctx, h)).toBe(layerOfId('layer.poisoned'))
  })
})
