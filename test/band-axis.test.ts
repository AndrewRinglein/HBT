// encounter.band-axis (2026-09-04) — FINDING 43 of the log-invariant audit.
//
// Heroes deploy WEST (board.heroes-west), so a band that advances on them
// walks COLUMNS. Content re-authored the Kiln's band with `axis: 'col'` and
// `startCol`; the engine read `startRow` only, got NaN, compared NaN against
// the board and painted nothing — in silence, for 220 audited battles. Now a
// band names its axis (row is the default), its start must be a number on that
// axis, and the walk uses the same edge lines deployment does.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { advanceBand } from '../src/core/encounter.js'
import { layerAt } from '../src/core/mutate.js'
import { LAYER } from '../src/content/maps.js'
import { packEncounters } from '../src/content/pack.js'
import { UNITS } from '../src/content/index.js'
import type { Ctx, EncounterDef } from '../src/core/types.js'
import { hexId } from './board16.js'

const base: EncounterDef = {
  id: 'test.encounter.band', name: 'band test', mapId: 'map.open', setup: [], schedule: [], objective: { kind: 'clear' },
} as unknown as EncounterDef

function rig(band: NonNullable<EncounterDef['band']>, turn: number): Ctx {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 2) }], [{ type: 'test-zombie', hex: hexId(13, 13) }])
  ctx.encounter = { ...base, band }
  ctx.state.turn = turn
  return ctx
}
const painted = (ctx: Ctx) => { const out: number[] = []; for (let h = 0; h < ctx.geo.hexCount; h++) if (layerAt(ctx, h) === LAYER.BURNING) out.push(h); return out }

describe('the band walks the axis it names', () => {
  it('axis absent = rows, the old shape: startRow + (turn − fromPhase) × direction is one full row', () => {
    const ctx = rig({ layer: 'layer.burning', fromPhase: 2, startRow: 0, direction: 1 }, 3)
    advanceBand(ctx)
    expect(painted(ctx)).toEqual(Array.from({ length: 16 }, (_, c) => hexId(c, 1)))
    const e = ctx.events.find((x) => x.type === 'band.advanced')!
    expect(e).toMatchObject({ turn: 3, axis: 'row', line: 1, row: 1, layer: 'layer.burning' })
    expect(e['col']).toBeUndefined()
  })

  it("axis 'col': startCol + (turn − fromPhase) × direction is one full column — the Kiln's fire from the east", () => {
    const ctx = rig({ layer: 'layer.burning', fromPhase: 2, axis: 'col', startCol: 15, direction: -1 }, 4)
    advanceBand(ctx)
    expect(painted(ctx)).toEqual(Array.from({ length: 16 }, (_, r) => hexId(13, r)))
    const e = ctx.events.find((x) => x.type === 'band.advanced')!
    expect(e).toMatchObject({ turn: 4, axis: 'col', line: 13, col: 13, layer: 'layer.burning' })
    expect(e['row']).toBeUndefined()
  })

  it('spare hexes are skipped on either axis; a line off the board paints nothing and says nothing', () => {
    const ctx = rig({ layer: 'layer.burning', fromPhase: 1, axis: 'col', startCol: 5, direction: 1, spare: [hexId(5, 3), hexId(5, 9)] }, 1)
    advanceBand(ctx)
    expect(painted(ctx)).toHaveLength(14)
    expect(layerAt(ctx, hexId(5, 3))).toBe(LAYER.NONE)
    const off = rig({ layer: 'layer.burning', fromPhase: 1, axis: 'col', startCol: 15, direction: 1 }, 2)
    advanceBand(off)
    expect(painted(off)).toEqual([])
    expect(off.events.some((x) => x.type === 'band.advanced')).toBe(false)
  })

  it('a unit standing on the painted line takes the entry beat — the ground came to it', () => {
    const ctx = rig({ layer: 'layer.burning', fromPhase: 1, axis: 'col', startCol: 2, direction: 1 }, 1)
    advanceBand(ctx)
    expect(ctx.events.some((x) => x.type === 'status.applied' && x.causeId === 'layer.burning' && x['statusId'] === 'status.burn')).toBe(true)
  })

  it('a start that does not match the axis is a content error — Law 9, never NaN: the engine throws and the pack refuses the row', () => {
    const ctx = rig({ layer: 'layer.burning', fromPhase: 1, axis: 'col', startRow: 0, direction: 1 } as never, 1)
    expect(() => advanceBand(ctx)).toThrow(/walks cols but names no startCol/)
    const bad = { 'test.encounter.bad': { ...base, id: 'test.encounter.bad', band: { layer: 'layer.burning', fromPhase: 1, axis: 'col', startRow: 0, direction: 1 } } }
    expect(() => packEncounters(UNITS, bad as never)).toThrow(/walks cols but has no numeric startCol/)
  })
})
