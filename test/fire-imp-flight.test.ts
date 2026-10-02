// content.fire-imp-flight (2026-10-01): ruled 2026-09-30 (Andrew, DECISIONS.md "the Fire Imp flies"):
// "The Fire Imp does fly, yes. That was an oversight if it does not." The Codex row
// (content/gen/enemies-authored.json unit.fire-imp) gains the Imp's own "movePower": "flight"; the
// engine pack is regenerated from it. No new mechanism — the flight power is power.flight, the Imp's.
//
// What this proves: the Fire Imp moves with the flight power, and in battle 3 (encounter.opening.bridge)
// a Fire Imp flies over the deep river — a straight flight from one dry hex to another whose line crosses
// a hex no unit may stand on. Battle 3 still ending on every seed is test/opening-bridge.test.ts's
// assertion, re-run by this item unchanged.
import { describe, expect, it } from 'vitest'
import { UNITS } from '../src/content/index.js'
import { centerPoint, cellPolygon, segmentCrossesPolygon } from '../src/core/geometry.js'
import { openingBattle } from './opening-helpers.js'

const S = 'test.opening-bridge', SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

describe('content.fire-imp-flight', () => {
  it('the Fire Imp carries the Imp\'s own move: flight, and no walking move', () => {
    expect(UNITS['unit.imp']!.moves).toEqual(['power.flight'])
    expect(UNITS['unit.fire-imp']!.moves).toEqual(UNITS['unit.imp']!.moves)
  })
  it('in battle 3 a Fire Imp flies, and on some seed flies over the deep river', () => {
    let flights = 0, overWater = 0
    for (const r of SEEDS) {
      const ctx = openingBattle(S, r)
      const board = ctx.geo.board, floor = ctx.state.floor!
      const deep = floor.flatMap((f, h) => (f ? [] : [cellPolygon(board, h)]))
      const fireImps = new Set(ctx.state.units.filter((u) => u.typeId === 'unit.fire-imp').map((u) => u.id))
      for (const e of ctx.events) {
        if (e.type !== 'move.begin' || !fireImps.has(e.actor!)) continue
        // Law 10, content.bridge-deck-pack (2026-10-01): with the deck walkable, a hero reaches a Fire Imp on replicate 1 and
        // its greatsword knocks it prone, so it rises with power.stand-up — the universal rise, in place (0 hexes). The claim
        // is unchanged: every move BETWEEN hexes is the flight power; the rise is checked to go nowhere.
        // was: // a Fire Imp's every move is the flight power — it has no other
        // was: expect(e.causeId, `replicate ${r}: Fire Imp moved by ${e.causeId}`).toBe('power.flight')
        if (e.causeId === 'power.stand-up') { expect(e['to'], `replicate ${r}: a Fire Imp's rise moved it`).toBe(e['from']); continue }
        expect(e.causeId, `replicate ${r}: Fire Imp moved by ${e.causeId}`).toBe('power.flight')
        flights++
        const a = centerPoint(board, e['from'] as number), b = centerPoint(board, e['to'] as number)
        expect(floor[e['to'] as number], `replicate ${r}: Fire Imp landed in deep water`).toBe(true)
        if (deep.some((p) => segmentCrossesPolygon(a, b, p))) overWater++
      }
    }
    expect(flights).toBeGreaterThan(0)
    expect(overWater, 'no Fire Imp flight crossed the river on any seed').toBeGreaterThan(0)
  })
})
