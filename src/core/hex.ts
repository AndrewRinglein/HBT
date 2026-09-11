// Hex board. Odd-r offset for storage and display, axial/cube for all maths.
// HexId is a dense integer in [0, width*height) so it can index typed arrays
// and sort deterministically.
//
// board.variable-size (2026-09-04). Ruled 2026-09-03 (DECISIONS.md, "board
// formats"): four formats — 8×8 duel, 16×8 dungeon segment, 16×16 standard,
// 24×24 horde — and the board is the MAP's, not a constant. Hex ids are
// `row × width + col` PER BOARD ("We can do a per-width formula"): a hex's
// number is meaningful only on its own board, so every function here takes the
// board's geometry. There is no default board; `WIDTH`, `HEIGHT` and
// `HEX_COUNT` are gone, and a caller that wants 16×16 says so.
//
// History: 12×12 in the first commit; 16×16 ruled 2026-08-25 ("we are settling
// on 16 by 16") — that format survives as `standard`.
// V2: bounded authored sizes are also legal; these four names remain presets.

export type HexId = number

/** A board's dimensions — plain data, on State (Law 5b). */
export type Board = { readonly width: number; readonly height: number }

/**
 * An edge of the board — where a side deploys (board.deploy-edges, 2026-09-04;
 * ruled 2026-09-03: "Heroes start on the left, and enemies start on the right.
 * That is the default configuration"). West is column 0, east the last
 * column, north row 0, south the last row.
 */
export type Edge = 'north' | 'south' | 'east' | 'west'

/**
 * Historical convenience labels; authored boards may use other bounded sizes.
 */
export const FORMATS: Readonly<Record<'duel' | 'dungeon' | 'standard' | 'horde', Board>> = {
  duel: { width: 8, height: 8 },
  dungeon: { width: 16, height: 8 },
  standard: { width: 16, height: 16 },
  horde: { width: 24, height: 24 },
}

/** Provisional V2 resource bound, aligned with the atlas's cell ceiling. */
export const MAX_BOARD_CELLS = 10_000
export function validBoard(board: unknown): board is Board {
  if (!board || typeof board !== 'object' || Array.isArray(board)) return false
  const b = board as Board
  return Number.isSafeInteger(b.width) && b.width > 0 && b.width <= MAX_BOARD_CELLS
    && Number.isSafeInteger(b.height) && b.height > 0 && b.height <= MAX_BOARD_CELLS
    && b.width * b.height <= MAX_BOARD_CELLS
}

/** The format name of a board, or null when it is none of the four. */
export function formatOf(board: Board): keyof typeof FORMATS | null {
  for (const [name, b] of Object.entries(FORMATS)) if (b.width === board.width && b.height === board.height) return name as keyof typeof FORMATS
  return null
}

/**
 * Everything the rules ask of the board, bound to one board. Built by
 * `geometryOf` and carried on Ctx as `ctx.geo`; pure functions of the board
 * and their arguments, no state. Law 6: every list is in ascending HexId order.
 */
export type Geometry = {
  readonly board: Board
  readonly hexCount: number
  hexId(col: number, row: number): HexId
  colOf(h: HexId): number
  rowOf(h: HexId): number
  inBounds(col: number, row: number): boolean
  /** Neighbours on the board, always in ascending HexId order (Law 6). */
  neighbours(h: HexId): HexId[]
  /** Precomputed adjacency — board geometry, fixed per board, never mutated. */
  neighboursOf(h: HexId): readonly HexId[]
  /** Hex distance. Exact integer, no floats. */
  distance(a: HexId, b: HexId): number
  /**
   * The hex one step beyond `through`, continuing the straight line from `from`
   * (capability.knockback, 2026-08-27 — "push the target 1 hex directly away
   * from you"). Defined ONLY when `from` and `through` are adjacent: a knockback
   * line from further away is ambiguous on a hex grid, and guessing a direction
   * is inventing a rule. Returns null off the board or when undefined.
   */
  stepAwayFrom(from: HexId, through: HexId): HexId | null
  isAdjacent(a: HexId, b: HexId): boolean
  /**
   * The hexes along an edge, `depth` lines in from it (0 = the edge itself),
   * ascending HexId (Law 6). Empty once depth runs past the board.
   */
  edgeLine(edge: Edge, depth: number): HexId[]
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

function build(board: Board): Geometry {
  const { width, height } = board
  const hexCount = width * height
  const hexId = (col: number, row: number): HexId => row * width + col
  const colOf = (h: HexId): number => h % width
  const rowOf = (h: HexId): number => Math.trunc(h / width)
  const inBounds = (col: number, row: number): boolean => col >= 0 && col < width && row >= 0 && row < height
  const neighbours = (h: HexId): HexId[] => {
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
  // Precomputed adjacency. Board geometry, fixed at build and never mutated, so
  // it is not a cache in the sense Law 8 forbids — there is no state it could
  // go stale against. (The per-board memo in geometryOf is the same argument:
  // keyed by the board's own dimensions, which are the whole input.)
  const NBR: HexId[][] = []
  for (let h = 0; h < hexCount; h++) NBR.push(neighbours(h))
  const neighboursOf = (h: HexId): readonly HexId[] => NBR[h] ?? []
  const distance = (a: HexId, b: HexId): number => {
    const ra = rowOf(a)
    const rb = rowOf(b)
    const qa = axialQ(colOf(a), ra)
    const qb = axialQ(colOf(b), rb)
    const dq = qa - qb
    const dr = ra - rb
    const ds = -dq - dr
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2
  }
  const stepAwayFrom = (from: HexId, through: HexId): HexId | null => {
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
  const isAdjacent = (a: HexId, b: HexId): boolean => distance(a, b) === 1
  const edgeLine = (edge: Edge, depth: number): HexId[] => {
    const out: HexId[] = []
    if (edge === 'north' || edge === 'south') {
      const row = edge === 'north' ? depth : height - 1 - depth
      if (row < 0 || row >= height) return out
      for (let c = 0; c < width; c++) out.push(hexId(c, row))
    } else {
      const col = edge === 'west' ? depth : width - 1 - depth
      if (col < 0 || col >= width) return out
      for (let r = 0; r < height; r++) out.push(hexId(col, r))
    }
    return out   // already ascending: one row, or one column with rows ascending
  }
  return { board: { width, height }, hexCount, hexId, colOf, rowOf, inBounds, neighbours, neighboursOf, distance, stepAwayFrom, isAdjacent, edgeLine }
}

// One Geometry per board size, built on first use. Keyed by the dimensions —
// the complete input — so two boards of the same size share one and two of
// different sizes never do (test/hex.test.ts proves the second half).
const BUILT = new Map<string, Geometry>()

/** The geometry of a board. Same board → the same object. */
export function geometryOf(board: Board): Geometry {
  // Validate even cache hits: string dimensions must not alias numeric keys.
  if (!validBoard(board)) throw new Error(`geometryOf: board requires positive safe dimensions and at most ${MAX_BOARD_CELLS} cells`)
  const key = `${board.width}x${board.height}`
  let g = BUILT.get(key)
  if (!g) { g = build(board); BUILT.set(key, g) }
  return g
}
