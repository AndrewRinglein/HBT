// Hex board. Odd-r offset for storage and display, axial/cube for all maths.
// HexId is a dense integer in [0, W*H) so it can index typed arrays and sort deterministically.

export type HexId = number

// 16 × 16 = 256 hexes. Ruled 2026-08-25 ("we are settling on 16 by 16"), and the
// content led — `content/gen/encounters.json` format.placement already places the
// prologue battles by hex on a 16×16 board and notes that the engine constant was
// the thing lagging.
//
// Was 12 × 12 = 144, written in the first commit (2a6516a) and never revisited.
// `BASE-MAP-SPEC.md` calls HoMM3's 165 hexes "far too small for 8 heroes + 3
// civilians + a 40-body tide" — so the board was smaller than the size the spec
// had already rejected, and smaller than its own tutorial 14×10 preset.
//
// Row 0 is the enemy edge, row 15 the player edge (same ruling).
export const WIDTH = 16
export const HEIGHT = 16
export const HEX_COUNT = WIDTH * HEIGHT

export function hexId(col: number, row: number): HexId {
  return row * WIDTH + col
}
export function colOf(h: HexId): number {
  return h % WIDTH
}
export function rowOf(h: HexId): number {
  return Math.trunc(h / WIDTH)
}
export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < WIDTH && row >= 0 && row < HEIGHT
}

// odd-r offset -> axial
function axialQ(col: number, row: number): number {
  return col - (row - (row & 1)) / 2
}

// The six axial directions, in a fixed order. Order here never decides anything —
// neighbours() sorts by HexId — but it is fixed so the geometry is reproducible.
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
]

// axial -> odd-r offset
function offsetOf(q: number, r: number): [number, number] {
  const col = q + (r - (r & 1)) / 2
  return [col, r]
}

/** Neighbours on the board, always in ascending HexId order (Law 6). */
export function neighbours(h: HexId): HexId[] {
  const row = rowOf(h)
  const q = axialQ(colOf(h), row)
  const out: HexId[] = []
  for (const d of DIRS) {
    const [col2, row2] = offsetOf(q + d[0], row + d[1])
    if (inBounds(col2, row2)) out.push(hexId(col2, row2))
  }
  out.sort((a, b) => a - b)
  return out
}

/**
 * The hex one step beyond `through`, continuing the straight line from `from`
 * (capability.knockback, 2026-08-27 — "push the target 1 hex directly away
 * from you"). Defined ONLY when `from` and `through` are adjacent: a knockback
 * line from further away is ambiguous on a hex grid, and guessing a direction
 * is inventing a rule. Returns null off the board or when undefined.
 */
export function stepAwayFrom(from: HexId, through: HexId): HexId | null {
  if (from === through) return null
  const rf = rowOf(from)
  const rt = rowOf(through)
  const qf = axialQ(colOf(from), rf)
  const qt = axialQ(colOf(through), rt)
  const dq = qt - qf
  const dr = rt - rf
  if ((Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr)) / 2 !== 1) return null
  const [col2, row2] = offsetOf(qt + dq, rt + dr)
  return inBounds(col2, row2) ? hexId(col2, row2) : null
}

/** Hex distance. Exact integer, no floats. */
export function distance(a: HexId, b: HexId): number {
  const ra = rowOf(a)
  const rb = rowOf(b)
  const qa = axialQ(colOf(a), ra)
  const qb = axialQ(colOf(b), rb)
  const dq = qa - qb
  const dr = ra - rb
  const ds = -dq - dr
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2
}

const NBR_CACHE: HexId[][] = []
for (let h = 0; h < HEX_COUNT; h++) NBR_CACHE.push(neighbours(h))

/**
 * Precomputed adjacency. This is board geometry, fixed at module load and never
 * mutated, so it is not a cache in the sense Law 8 forbids — there is no state
 * it could go stale against.
 */
export function neighboursOf(h: HexId): readonly HexId[] {
  return NBR_CACHE[h] ?? []
}

export function isAdjacent(a: HexId, b: HexId): boolean {
  return distance(a, b) === 1
}
