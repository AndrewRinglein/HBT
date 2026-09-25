// fix.structures-line-speed — the structure attack-line check (v2.structures) scans only the
// hexes within one row and one column of the line's two ends, reading one flat per-ground table.
// Law 0's measurement is in the item; this is the proof the shortcut changes no answer: on
// several board sizes and layouts, for EVERY pair of hexes, it agrees with the plain reading of
// the rule — any structure hex other than the two ends that the line touches blocks it.
// LAW 10 — 2026-09-25: the "unless an end stands on a wall or in a tower" clause is gone from the
// reading below, because Andrew RULED it out (DECISIONS.md 2026-09-25): "Walls and towers cannot
// shoot past other obstructions." The check it proves changed with the ruling.
import { describe, it, expect } from 'vitest'
import { structureBlocksLine } from '../src/core/structure.js'
import { segmentCrossesCell } from '../src/core/los.js'
import { structureOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import type { Ctx } from '../src/core/types.js'

const KINDS = [TERRAIN.WALL, TERRAIN.TOWER, TERRAIN.HOUSE]
/** A fixed layout: every `step`-th hex from `offset` is a structure, the kind cycling. No dice. */
function layout(width: number, height: number, step: number, offset: number): Pick<Ctx, 'state'> {
  const terrain = Array.from({ length: width * height }, (_, h) => ((h + offset) % step === 0 ? KINDS[Math.trunc(h / step) % 3]! : TERRAIN.OPEN))
  return { state: { board: { width, height }, terrain } as Ctx['state'] }
}
function plainReading(ctx: Pick<Ctx, 'state'>, a: number, b: number): boolean {
  const t = ctx.state.terrain, board = ctx.state.board
  if (a === b) return false
  for (let h = 0; h < t.length; h++) if (h !== a && h !== b && structureOf(t[h]!) && segmentCrossesCell(board, a, b, h)) return true
  return false
}

describe('the bounded structure line check answers exactly as the whole-board reading', () => {
  for (const [w, h, step, offset] of [[7, 5, 4, 1], [9, 8, 5, 2], [12, 6, 3, 0], [16, 16, 7, 3]] as const) {
    it(`${w}×${h}, a structure every ${step} hexes`, () => {
      const ctx = layout(w, h, step, offset), n = w * h
      let blocked = 0, disagreements = 0
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        const want = plainReading(ctx, a, b)
        if (want) blocked++
        if (structureBlocksLine(ctx, a, b, (c) => segmentCrossesCell(ctx.state.board, a, b, c)) !== want) disagreements++
      }
      expect(disagreements).toBe(0)
      expect(blocked).toBeGreaterThan(0)   // the layouts genuinely block lines — not vacuous
    })
  }
})
