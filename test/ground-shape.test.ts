// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// RULED 2026-09-03 (Angela, DECISIONS.md "the retroactive questions"): every
// ground status is ONE shape — "when you step on them, you gain one, and if
// you're there at the end of activation, you gain one" — weak, burning,
// frost and poison alike. And: "Battle ends when there are no enemies
// remaining, so victory can be achieved early." And: one kind, encounter.*.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle, endOfActivation } from '../src/core/battle.js'
import { paintLayer, beginActivation, endActivation } from '../src/core/mutate.js'
import { LAYER, layerAppliesOnEnter, layerAppliesOnActivationEnd, appliesOnEnterOf, appliesOnActivationEndOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import { executeMove, reachable, pathTo, movePowerOf } from '../src/core/movement.js'
import { valueOf } from '../src/core/status.js'
import { ENCOUNTERS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { hexId } from './board16.js'

describe('the one ground shape', () => {
  it('burning, frost, poisoned and weak layers each apply exactly 1 of their status on entry and 1 at End of Activation', () => {
    for (const [layer, status] of [[LAYER.BURNING, 'status.burn'], [LAYER.FROST, 'status.frost'], [LAYER.POISONED, 'status.poison'], [LAYER.WEAK, 'status.weak']] as const) {
      expect(layerAppliesOnEnter(layer), status).toEqual([[status, 1]])
      expect(layerAppliesOnActivationEnd(layer), status).toEqual([[status, 1]])
    }
    // Law 10, fix.ground-one-funnel (2026-09-28, review E2): burning and poisoned ground are layers
    // only — the terrain kinds these two lines read are retired; the loop above holds the claim.
    expect(appliesOnEnterOf(TERRAIN.OPEN)).toEqual([])
    expect(appliesOnActivationEndOf(TERRAIN.OPEN)).toEqual([])
  })

  it('walking across frost ground gives one; stopping on it gives another', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(15, 15) }])
    const w = ctx.state.units[0]!
    paintLayer(ctx, hexId(5, 4), LAYER.FROST, 'test')
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.move.budgetMod), w.hex, hexId(5, 4)), walk)
    expect(valueOf(w, 'status.frost')).toBe(1)
    endActivation(ctx, w.id, 'test'); endOfActivation(ctx, w.id)
    expect(ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'layer.frost').length).toBe(2)
  })
})

describe('victory can be achieved early', () => {
  it('the default switch is off, and an encounter with waves still owed ends the moment the board is clear', () => {
    const ctx = createBattle({ replicate: 0, heroes: ['test-warrior', 'test-warrior'], encounter: { id: 'test.encounter.early', name: 'early', gaps: ['test-only'], setup: [{ unit: 'unit.zombie', at: { col: 8, row: 14 } }], schedule: [{ phase: 9, spawn: [{ unit: 'unit.zombie', at: { col: 8, row: 0 } }] }] } })
    expect(ctx.cfg.switches.boardClearWaitsForSchedule).toBe(false)
    const o = runBattle(ctx)
    expect(o.outcome).toBe('heroClear')
    expect(o.turns).toBeLessThan(9)
  })
})

describe('one kind: encounter.*', () => {
  it('no battle.* id remains in the registry', () => {
    // V2 publishes an explicit TEST lane; it does not introduce a second shipping kind.
    const testIds = new Set(Object.keys(UNIT_PACK.test.encounters))
    for (const id of Object.keys(ENCOUNTERS)) {
      expect(id.startsWith('battle.'), id).toBe(false)
      expect(id.startsWith('encounter.') || (id.startsWith('test.encounter.') && testIds.has(id)), id).toBe(true)
    }
    expect(ENCOUNTERS['encounter.prologue-2']).toBeDefined()
    expect(ENCOUNTERS['encounter.horrors-of-the-night']).toBeDefined()
  })
})
