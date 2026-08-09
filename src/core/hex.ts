// Hex board. Odd-r offset for storage and display, axial/cube for all maths.
// HexId is a dense integer in [0, W*H) so it can index typed arrays and sort deterministically.

export type HexId = number

export const WIDTH = 12
export const HEIGHT = 12
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
