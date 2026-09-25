// Derived attack-line geometry. State remains plain data; all shared tables are
// private and immutable after publication. Terrain changes create a new table.
import { validBoard, type Board } from './hex.js'
import type { Ctx } from './types.js'
import { highCells, decodeProps } from './props.js'
import { centerPoint,segmentCrossesPolygon,type Point } from './geometry.js'
import { structureBlocksLine } from './structure.js'

export const LOS_LIMITS = Object.freeze({ pairCellTests: 1_024_000_000, reverseEntries: 16_000_000, cacheBytes: 64 * 1024 * 1024 } as const)
type Table = { key: string; board: Board; cells: number; blockers: readonly string[]; bits: Uint8Array | null; reverse: ReadonlyMap<string, Uint32Array>; entries: number; bytes: number }
type Stats = { pairCellTests: number; changedPairs: number; reverseEntries: number; bytes: number; cacheHit: boolean }
type View = { table: Table; stats: Stats }
const views = new WeakMap<Ctx, View>()
const shared = new Map<string, Table>()
let sharedBytes = 0

// Exact SAT: the three hex face normals plus the line's normal. Coordinates
// are the integer affine image of pointy odd-r hexes; closed contact blocks.
function intersects(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const x1 = ax - cx, y1 = ay - cy, x2 = bx - cx, y2 = by - cy
  if (Math.min(x1, x2) > 1 || Math.max(x1, x2) < -1) return false
  if (Math.min(x1 + y1, x2 + y2) > 2 || Math.max(x1 + y1, x2 + y2) < -2) return false
  if (Math.min(x1 - y1, x2 - y2) > 2 || Math.max(x1 - y1, x2 - y2) < -2) return false
  const dx = bx - ax, dy = by - ay
  return Math.abs(dx * (cy - ay) - dy * (cx - ax)) <= Math.max(2 * Math.abs(dx), Math.abs(dx) + Math.abs(dy))
}
const xy = (board: Board, h: number): [number, number] => [2 * (h % board.width) + (Math.floor(h / board.width) % 2), 3 * Math.floor(h / board.width)]
export function segmentCrossesCell(board: Board, a: number, b: number, cell: number): boolean {
  if (!validBoard(board) || [a, b, cell].some(h => !Number.isSafeInteger(h) || h < 0 || h >= board.width * board.height)) throw new Error('LOS: invalid board or hex')
  return intersects(...xy(board, a), ...xy(board, b), ...xy(board, cell))
}
const pairIndex = (n: number, a: number, b: number) => a * (2 * n - a - 1) / 2 + b - a - 1
const bit = (bits: Uint8Array, i: number) => (bits[i >>> 3]! & (1 << (i & 7))) !== 0
function contains(sorted: Uint32Array, encoded: number): boolean {
  let lo = 0, hi = sorted.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1, value = sorted[mid]!
    if (value === encoded) return true
    if (value < encoded) lo = mid + 1
    else hi = mid - 1
  }
  return false
}
function setBit(bits: Uint8Array, i: number, blocked: boolean): void {
  const mask = 1 << (i & 7)
  bits[i >>> 3] = blocked ? bits[i >>> 3]! | mask : bits[i >>> 3]! & ~mask
}

function remember(table: Table): void {
  if (table.bytes > LOS_LIMITS.cacheBytes) return
  while (sharedBytes + table.bytes > LOS_LIMITS.cacheBytes && shared.size) {
    const key = shared.keys().next().value!
    sharedBytes -= shared.get(key)!.bytes; shared.delete(key)
  }
  shared.set(table.key, table); sharedBytes += table.bytes
}

type Blocker={key:string;cell?:number;vertices?:readonly Point[]}
function derive(board: Board, shapes: Blocker[], previous?: Table): View {
  const blockers=shapes.map(p=>p.key), byKey=new Map(shapes.map(p=>[p.key,p]))
  const work=shapes.reduce((n,p)=>n+(p.vertices?.length??1),0)
  const n = board.width * board.height, pairs = n * (n - 1) / 2
  const key = `${board.width}x${board.height}|${blockers.join(',')}`
  const hit = shared.get(key)
  if (hit) {
    shared.delete(key); shared.set(key, hit)
    return { table: hit, stats: { pairCellTests: 0, changedPairs: 0, reverseEntries: hit.entries, bytes: hit.bytes, cacheHit: true } }
  }
  // A bounded board is not a promise of arbitrary dense all-pairs LOS. Refuse
  // unsupported work before allocating, loudly, rather than dropping blockers.
  if (pairs * work > LOS_LIMITS.pairCellTests) throw new Error(`LOS: ${n} cells × ${blockers.length} blockers exceeds the ${LOS_LIMITS.pairCellTests} pair-cell work limit`)
  const stats: Stats = { pairCellTests: 0, changedPairs: 0, reverseEntries: 0, bytes: 0, cacheHit: false }
  if (!blockers.length) {
    const table: Table = { key, board: { ...board }, cells: n, blockers: [], bits: null, reverse: new Map(), entries: 0, bytes: key.length * 2 + 64 }
    stats.bytes = table.bytes; remember(table)
    return { table, stats }
  }
  const compatible = previous?.board.width === board.width && previous.board.height === board.height ? previous : undefined
  const reverse = new Map<string, Uint32Array>()
  let entries = 0
  const xs = new Int32Array(n), ys = new Int32Array(n)
  for (let h = 0; h < n; h++) { xs[h] = 2 * (h % board.width) + (Math.floor(h / board.width) % 2); ys[h] = 3 * Math.floor(h / board.width) }
  const crosses = (a: number, b: number, key: string) => {
    const shape=byKey.get(key)!
    stats.pairCellTests+=shape.vertices?.length??1
    if (stats.pairCellTests > LOS_LIMITS.pairCellTests) throw new Error('LOS: incremental pair-cell work limit exceeded')
    if(shape.vertices)return segmentCrossesPolygon([xs[a]!*1000,ys[a]!*1000],[xs[b]!*1000,ys[b]!*1000],shape.vertices)
    return intersects(xs[a]!, ys[a]!, xs[b]!, ys[b]!, xs[shape.cell!]!, ys[shape.cell!]!)
  }
  const bits = compatible?.bits ? compatible.bits.slice() : new Uint8Array(Math.ceil(pairs / 8))
  for (const cell of blockers) {
    const prior = compatible?.reverse.get(cell)
    if (prior) { reverse.set(cell, prior); entries += prior.length; continue }
    const list: number[] = []
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if (!crosses(a, b, cell)) continue
      if (entries + list.length >= LOS_LIMITS.reverseEntries) throw new Error('LOS: reverse-entry limit exceeded')
      list.push(a * n + b)
      setBit(bits, pairIndex(n, a, b), true)
    }
    const packed = Uint32Array.from(list)
    entries += packed.length; reverse.set(cell, packed)
  }
  if (entries > LOS_LIMITS.reverseEntries) throw new Error('LOS: reverse-entry limit exceeded')
  if (compatible) {
    const current = new Set(blockers)
    // Additions already OR their exact hits above. Only removed blockers can
    // clear a bit; re-evaluate those rays against the final blocker set.
    const affected = compatible.blockers.filter(c => !current.has(c)).map(c => compatible.reverse.get(c)!)
    const visited = new Uint8Array(affected.length ? bits.length : 0)
    for (const list of affected) for (const encoded of list) {
      const a = Math.floor(encoded / n), b = encoded % n, index = pairIndex(n, a, b)
      if (bit(visited, index)) continue
      setBit(visited, index, true); stats.changedPairs++
      // Reverse lists already encode exact intersections. Reusing them keeps
      // cold and incrementally reached identical geometry under the same bound.
      setBit(bits, index, blockers.some(cell => contains(reverse.get(cell)!, encoded)))
    }
  }
  const bytes = bits.byteLength + entries * 4 + blockers.length * 64 + key.length * 2 + 64
  const table: Table = { key, board: { ...board }, cells: n, blockers: [...blockers], bits, reverse, entries, bytes }
  stats.reverseEntries = entries; stats.bytes = bytes; remember(table)
  return { table, stats }
}

/** Eager setup/restore preparation; queries also detect plain-array terrain edits. */
export function prepareAttackLines(ctx: Ctx): void {
  const board = ctx.state.board
  if (!validBoard(board) || ctx.state.terrain.length !== board.width * board.height) throw new Error('LOS: invalid board terrain')
  const shapes:Blocker[] = highCells(ctx).map(cell=>({key:String(cell),cell}))
  const polygons=ctx.state.props.filter(p=>p.height==='high'&&p.footprint.kind==='polygon')
  // Decode before keying: malformed live edits must never alias valid cached data.
  for(const p of decodeProps(polygons,ctx.state.terrain.length))if(p.footprint.kind==='polygon')shapes.push({key:'p'+JSON.stringify(p.footprint),vertices:p.footprint.vertices})
  const unique=[...new Map(shapes.map(p=>[p.key,p])).values()]
  const blockers=unique.map(p=>p.key)
  const prior = views.get(ctx)
  if (prior && prior.table.board.width === board.width && prior.table.board.height === board.height && blockers.length === prior.table.blockers.length && blockers.every((h, i) => h === prior.table.blockers[i])) return
  views.set(ctx, derive(board, unique, prior?.table))
}
export function attackLineClear(ctx: Ctx, a: number, b: number): boolean {
  prepareAttackLines(ctx)
  const table = views.get(ctx)!.table
  if (![a, b].every(h => Number.isSafeInteger(h) && h >= 0 && h < table.cells)) throw new Error('LOS: invalid attack hex')
  if (a === b) return !table.blockers.includes(String(a)) && !ctx.state.props.some(p=>p.height==='high'&&p.footprint.kind==='polygon'&&segmentCrossesPolygon(centerPoint(table.board,a),centerPoint(table.board,a),p.footprint.vertices))
  if (table.bits && bit(table.bits, pairIndex(table.cells, Math.min(a, b), Math.max(a, b)))) return false
  // v2.structures: a wall, tower or house hex blocks a line PASSING it — never its own ends,
  // and never a line with an end up on a wall or in a tower (structure.ts structureBlocksLine).
  // The same exact "passes through" test the thin obstructions read (SWITCHES.md structureLines).
  return !structureBlocksLine(ctx, a, b, (cell) => segmentCrossesCell(table.board, a, b, cell))
}
export function forkAttackLines(source: Ctx, fork: Ctx): void {
  prepareAttackLines(source)
  const view = views.get(source)!
  views.set(fork, { table: view.table, stats: { ...view.stats } })
}
/** Detached diagnostics for measurements/tests; no writable cache escapes. */
export function attackLineStats(ctx: Ctx): Stats & { sharedBytes: number } {
  prepareAttackLines(ctx)
  return { ...views.get(ctx)!.stats, sharedBytes }
}
