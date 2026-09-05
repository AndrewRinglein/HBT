// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// capability.ground-layers (2026-09-03) — rule.ground-layers: burning · frost ·
// poisoned · darkness painted onto arbitrary hexes at runtime; a hex carries
// at most one; a new layer replaces the old, except Burn and Frost which
// cancel one for one (rule.burn-frost-cancel). 5-GROUND-SETTLED: "the layer
// must feed the same composed() trait funnel" — a painted burning hex sears as
// authored burning terrain does. The Kiln's band and Rime's frost band are data.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle, endOfActivation } from '../src/core/battle.js'
import { paintLayer, layerAt, beginActivation, endActivation } from '../src/core/mutate.js'
import { LAYER, layerOfId } from '../src/content/maps.js'
import { valueOf } from '../src/core/status.js'
import { executeMove, reachable, pathTo, movePowerOf } from '../src/core/movement.js'
import { ENCOUNTERS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId, colOf } from './board16.js'

describe('painting', () => {
  it('one layer per hex; a new one replaces; burning onto frost cancels to bare', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(0, 0) }], [{ type: 'test-zombie', hex: hexId(15, 15) }])
    const h = hexId(5, 5)
    paintLayer(ctx, h, LAYER.POISONED, 'test'); expect(layerAt(ctx, h)).toBe(LAYER.POISONED)
    paintLayer(ctx, h, LAYER.FROST, 'test'); expect(layerAt(ctx, h)).toBe(LAYER.FROST)
    paintLayer(ctx, h, LAYER.BURNING, 'test'); expect(layerAt(ctx, h)).toBe(LAYER.NONE)
    expect(ctx.events.some((e) => e.type === 'layer.cancelled')).toBe(true)
    expect(layerOfId('layer.darkness')).toBe(LAYER.DARKNESS)
  })

  it('a painted burning hex sears on entry and at End of Activation, exactly as burning terrain — the same funnel', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(15, 15) }])
    const w = ctx.state.units[0]!
    paintLayer(ctx, hexId(5, 4), LAYER.BURNING, 'test')
    beginActivation(ctx, w.id, 'test')
    const walk = movePowerOf(ctx, w, 'path')!
    executeMove(ctx, w.id, pathTo(reachable(ctx, w, walk.move.budgetMod), w.hex, hexId(5, 4)), walk)
    expect(valueOf(w, 'status.burn')).toBe(1)   // the entry beat
    endActivation(ctx, w.id, 'test'); endOfActivation(ctx, w.id)
    // +1 at End of Activation, then the tick burns and decays one: 1 + 1 - 1
    expect(valueOf(w, 'status.burn')).toBe(1)
    expect(ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'layer.burning').length).toBe(2)
  })

  it('a frost layer puts Frost on the occupant at End of Activation', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(15, 15) }])
    const w = ctx.state.units[0]!
    paintLayer(ctx, w.hex, LAYER.FROST, 'test')
    beginActivation(ctx, w.id, 'test'); endActivation(ctx, w.id, 'test'); endOfActivation(ctx, w.id)
    expect(ctx.events.some((e) => e.type === 'status.applied' && e.causeId === 'layer.frost' && e['statusId'] === 'status.frost')).toBe(true)
  })
})

describe('the encounter shapes', () => {
  it('The Kiln: row 0 lights as enemy phase 2 ends, one further row each Turn, and the fire reaches units standing there', () => {
    expect(ENCOUNTERS['encounter.kiln']!.band?.layer).toBe('layer.burning')
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.kiln')))
    runBattle(ctx)
    // LAW 10 — 2026-09-04 (encounter.band-axis, content c24b1ac): heroes deploy
    // WEST now, so the Kiln's fire walks COLUMNS from the east edge (col 15) toward
    // them, one column a Turn. The claim — one line per Turn from enemy phase 2,
    // and the fire reaches units standing there — is unchanged.
    const lines = ctx.events.filter((e) => e.type === 'band.advanced').map((e) => [e.turn, e['axis'], e['col']] as [number, string, number])
    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0]).toEqual([2, 'col', 15])
    for (let i = 1; i < lines.length; i++) expect(lines[i]![2] - lines[i - 1]![2]).toBe(-1)
    expect(ctx.events.some((e) => e.type === 'status.applied' && e.causeId === 'layer.burning')).toBe(true)
  })

  it('Rime: a three-column frost belt (columns 7–9) is painted from setup', () => {
    // LAW 10 — 2026-09-04 (content c24b1ac): the board turned a quarter — the old
    // rows 6–8 are columns 7–9 now, across the heroes' path from the west.
    const rime = ENCOUNTERS['encounter.rime']!
    expect(rime.paint?.[0]?.layer).toBe('layer.frost')
    const ctx = createBattle({ replicate: 0, heroes: ['test-warrior'], encounter: rime })
    for (const h of rime.paint![0]!.hexes) { expect(layerAt(ctx, h)).toBe(LAYER.FROST); expect([7, 8, 9]).toContain(colOf(h)) }
  })
})
