// fix.structures-line-speed — the structure attack-line check (v2.structures) scans only the
// hexes within one row and one column of the line's two ends, reading one flat per-ground table.
// Law 0's measurement is in the item; this is the proof the shortcut changes no answer: on
// several board sizes and layouts, for EVERY pair of hexes, it agrees with the plain reading of
// the rule — any structure hex other than the two ends that the line touches blocks it, except
// the rest of a wall an end stands on (added 2026-09-25, Andrew: "You should be able to shoot on the
// same wall" — a brute-force flood below, independent of the engine's).
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
  const own = new Set<number>()
  for (const end of [a, b]) {
    if (t[end] !== TERRAIN.WALL) continue
    // grow the run by whole-board passes until it stops growing
    const run = new Set([end])
    for (let grew = true; grew;) {
      grew = false
      for (let h = 0; h < t.length; h++) if (!run.has(h) && t[h] === TERRAIN.WALL && [...run].some((r) => segmentAdjacent(board, r, h))) { run.add(h); grew = true }
    }
    for (const h of run) own.add(h)
  }
  for (let h = 0; h < t.length; h++) if (h !== a && h !== b && !own.has(h) && structureOf(t[h]!) && segmentCrossesCell(board, a, b, h)) return true
  return false
}
/** Adjacent by the offset-row rule written out (odd rows shifted right), not by the engine's table. */
function segmentAdjacent(board: { width: number }, x: number, y: number): boolean {
  const [rx, cx, ry, cy] = [Math.trunc(x / board.width), x % board.width, Math.trunc(y / board.width), y % board.width]
  if (rx === ry) return Math.abs(cx - cy) === 1
  if (Math.abs(rx - ry) !== 1) return false
  return rx % 2 === 1 ? cy === cx || cy === cx + 1 : cy === cx || cy === cx - 1
}

/** Wall RUNS (added 2026-09-25): two long walls, one broken by a tower, a diagonal run, houses between. */
function runs(width: number, height: number): Pick<Ctx, 'state'> {
  const terrain: number[] = Array(width * height).fill(TERRAIN.OPEN)
  for (let c = 1; c < width - 1; c++) terrain[1 * width + c] = TERRAIN.WALL
  for (let c = 0; c < width; c++) terrain[4 * width + c] = c === Math.trunc(width / 2) ? TERRAIN.TOWER : TERRAIN.WALL
  for (let r = 2; r < height; r++) terrain[r * width + Math.min(width - 1, r)] = TERRAIN.WALL
  for (let c = 2; c < width; c += 4) terrain[2 * width + c] = TERRAIN.HOUSE
  return { state: { board: { width, height }, terrain } as Ctx['state'] }
}

describe('the same-wall rule, on boards with real wall runs, answers exactly as the whole-board reading', () => {
  for (const [w, h] of [[9, 7], [12, 9]] as const) {
    it(`${w}×${h} wall runs`, () => {
      const ctx = runs(w, h), n = w * h
      let disagreements = 0, clearedByOwnWall = 0
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        const want = plainReading(ctx, a, b)
        if (structureBlocksLine(ctx, a, b, (c) => segmentCrossesCell(ctx.state.board, a, b, c)) !== want) disagreements++
        // a line the same-wall rule clears: it touches a structure hex other than its ends, yet is clear
        if (!want && [...Array(n).keys()].some((c) => c !== a && c !== b && structureOf(ctx.state.terrain[c]!) && segmentCrossesCell(ctx.state.board, a, b, c))) clearedByOwnWall++
      }
      expect(disagreements).toBe(0)
      expect(clearedByOwnWall).toBeGreaterThan(0)   // the rule genuinely acts on these boards
    })
  }
})

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
