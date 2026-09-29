// fix.ground-one-funnel (2026-09-28; DECISIONS.md "the duplication review, ruled", findings E1 E2 E3
// E4). Andrew: "The ground table is an engine rule." · "A push does apply ground statuses." One owner
// for every way a unit meets the ground — core/ground.ts: enterGround (a step, a sidestep, a push),
// groundAtActivationEnd, and paintGround (the ground coming to a unit). The two variants are the two
// cursed/burning ground layers the opening battles use: layer.weak and layer.burning.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { beginActivation, layerAt, paintLayer } from '../src/core/mutate.js'
import { executeKnockback, executeSidestep, movePowerOf } from '../src/core/movement.js'
import { valueOf } from '../src/core/status.js'
import { canSee, fallNight, isDark } from '../src/core/vision.js'
import { HOOKS, fireTriggers } from '../src/core/trigger.js'
import { paintGround } from '../src/core/ground.js'
import { LAYER, appliesOnActivationEndOf, appliesOnEnterOf, hazardOf, layerAppliesOnActivationEnd, layerAppliesOnEnter } from '../src/content/maps.js'
import { TERRAIN, type Ctx } from '../src/core/types.js'
import type { Trigger } from '../src/core/trigger.js'
import { hexId } from './board16.js'

const applied = (ctx: Ctx, cause: string) => ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === cause)
const duel = () => createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(12, 12) }])

describe('E1 — a sidestep is a step: the painted layer\'s entry beat runs', () => {
  it.each([['layer.weak', LAYER.WEAK, 'status.weak'], ['layer.burning', LAYER.BURNING, 'status.burn']] as const)(
    'a sidestep onto %s gives +1 of its status on entry, named for the layer', (id, layer, status) => {
      const ctx = duel(); const w = ctx.state.units[0]!
      paintLayer(ctx, hexId(5, 4), layer, 'test')
      beginActivation(ctx, w.id, 'test')
      expect(executeSidestep(ctx, w.id, hexId(5, 4), movePowerOf(ctx, w, 'sidestep')!)).toBe(true)
      expect(w.hex).toBe(hexId(5, 4))
      expect(valueOf(w, status)).toBe(1)
      expect(applied(ctx, id)).toHaveLength(1)
    })
  it('a sidestep onto bare ground applies nothing', () => {
    const ctx = duel(); const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    executeSidestep(ctx, w.id, hexId(5, 4), movePowerOf(ctx, w, 'sidestep')!)
    expect(ctx.events.filter((e) => e.type === 'status.applied')).toHaveLength(0)
  })
})

describe('E4 — a push meets the ground: every beat, not the hazard only', () => {
  const rows = (s: string) => Array(5).fill(s) as string[]
  const rig = (row: string) => {
    const ctx = createBattle({ replicate: 0, map: { id: 'test.map.push-ground', name: 'Push TEST', rows: rows(row), props: [] } as never, heroes: ['test-warrior'], enemies: ['test-zombie'], heroHexes: [8], enemyHexes: [9],
      cfg: { switches: { critEnabled: false } as never } })
    for (const u of ctx.state.units) { u.triggers = []; u.hp = u.maxHp = 50 }
    return ctx
  }
  it('a unit knocked onto burning ground gains Burn', () => {
    const ctx = rig('...b...'); const z = ctx.state.units[1]!
    expect(layerAt(ctx, 10)).toBe(LAYER.BURNING)
    expect(executeKnockback(ctx, 0, 1, 1, 'test')).toBe(1)
    expect(z.hex).toBe(10)
    expect(valueOf(z, 'status.burn')).toBe(1)
    expect(applied(ctx, 'layer.burning')).toHaveLength(1)
  })
  it('a unit knocked onto cursed ground gains Weak', () => {
    const ctx = rig('.......'); const z = ctx.state.units[1]!
    paintLayer(ctx, 10, LAYER.WEAK, 'test')
    executeKnockback(ctx, 0, 1, 1, 'test')
    expect(valueOf(z, 'status.weak')).toBe(1)
  })
  it('a unit knocked into water sheds 1 Burn', () => {
    const ctx = rig('...w...'); const z = ctx.state.units[1]!
    z.statuses.push({ id: 'status.burn', value: 2 } as never)
    executeKnockback(ctx, 0, 1, 1, 'test')
    expect(valueOf(z, 'status.burn')).toBe(1)
  })
})

describe('E4 — lava\'s Burn is the one ground shape; the hazard is its damage only', () => {
  it('lava applies 1 Burn on entry and at End of Activation through the same fields as burning ground, and 3 fire as its hazard', () => {
    expect(appliesOnEnterOf(TERRAIN.LAVA)).toEqual(layerAppliesOnEnter(LAYER.BURNING))
    expect(appliesOnActivationEndOf(TERRAIN.LAVA)).toEqual(layerAppliesOnActivationEnd(LAYER.BURNING))
    expect(hazardOf(TERRAIN.LAVA)).toEqual({ damageType: 'fire', damage: 3 })
  })
})

describe('E2 — burning and poisoned ground are layers only', () => {
  it('a map\'s \'b\' and \'p\' field painted layers on open ground, named for the map', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(3, 12) }], [{ type: 'test-zombie', hex: hexId(12, 14) }], { mapId: 'test.map.embers' })
    expect(ctx.state.terrain[hexId(3, 4)]).toBe(TERRAIN.OPEN)
    expect(layerAt(ctx, hexId(3, 4))).toBe(LAYER.BURNING)
    expect(layerAt(ctx, hexId(3, 7))).toBe(LAYER.POISONED)
    expect(ctx.events.filter((e) => e.type === 'layer.painted' && e.causeId === 'test.map.embers')).toHaveLength(64)
  })
  it('a hero on a \'b\' hex in darkness is revealed regardless of range; one on plain ground far off is not', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(3, 4) }, { type: 'test-warrior', hex: hexId(3, 12) }], [{ type: 'test-zombie', hex: hexId(12, 14) }], { mapId: 'test.map.embers' })
    const [lit, dark, z] = ctx.state.units as [never, never, never]
    fallNight(ctx, 'test')
    expect(isDark(ctx, hexId(3, 4))).toBe(false)
    expect(isDark(ctx, hexId(3, 12))).toBe(true)
    expect(canSee(ctx, z, lit)).toBe(true)
    expect(canSee(ctx, z, dark)).toBe(false)
  })
})

describe('E3 — the ground comes to you: one paint-with-occupants rule', () => {
  it('a trigger painting layer.weak under standing units gives each +1 Weak', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const [w, z] = ctx.state.units as [NonNullable<typeof ctx.state.units[0]>, NonNullable<typeof ctx.state.units[0]>]
    z.triggers = [{ id: 'test.trigger.paint-weak', hook: 'onActivationEnd', chance: 100, select: 'self', source: 'test',
      effect: { kind: 'layer.paint', layer: 'layer.weak', radius: 1, origin: 'self' } } as Trigger]
    fireTriggers(ctx, 'onActivationEnd', { ownerId: z.id, targetId: null, causeId: 'test', ordinal: 0, keyTag: HOOKS.indexOf('onActivationEnd') })
    expect(valueOf(w, 'status.weak')).toBe(1)
    expect(valueOf(z, 'status.weak')).toBe(1)
    expect(applied(ctx, 'layer.weak')).toHaveLength(2)
  })
  it('paintGround gives the entry beat of the ground the unit now stands on — a Burn/Frost cancel leaves bare ground and applies nothing', () => {
    const ctx = duel(); const w = ctx.state.units[0]!
    paintGround(ctx, [w.hex], LAYER.FROST, 'test')
    expect(valueOf(w, 'status.frost')).toBe(1)
    paintGround(ctx, [w.hex], LAYER.BURNING, 'test')   // cancels the frost: bare
    expect(layerAt(ctx, w.hex)).toBe(0)
    expect(valueOf(w, 'status.burn')).toBe(0)
  })
})
