import { MAX_BOARD_CELLS } from './hex.js'
import { TERRAIN, type Ctx, type HighProp, type State } from './types.js'

function plain(value: unknown, keys: string[]): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('props: expected plain record')
  for (const key of Reflect.ownKeys(value)) if (typeof key !== 'string' || !keys.includes(key) || !('value' in Object.getOwnPropertyDescriptor(value, key)!)) throw new Error('props: unsupported field or accessor')
}
function dense(value: unknown, limit: number): asserts value is any[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > limit) throw new Error('props: expected bounded plain array')
  if (Reflect.ownKeys(value).length !== value.length + 1) throw new Error('props: array has extra or missing fields')
  for (let i = 0; i < value.length; i++) if (!Object.getOwnPropertyDescriptor(value, String(i))?.hasOwnProperty('value')) throw new Error('props: expected dense data indices')
}

/** Validated detached canonical props. No unsupported future mechanic is ignored. */
export function decodeProps(value: unknown, cells: number): HighProp[] {
  dense(value, MAX_BOARD_CELLS)
  const ids = new Set<string>(), out: HighProp[] = []
  let references = 0
  for (const p of value) {
    plain(p, ['id', 'height', 'material', 'footprint'])
    if (typeof p.id !== 'string' || !/^prop\.[a-z0-9.-]+$/.test(p.id) || ids.has(p.id)) throw new Error('props: IDs must be unique prop.* strings')
    ids.add(p.id)
    if (p.height !== 'high' || ![1, 2, 3].includes(p.material)) throw new Error('props: unsupported height or material')
    plain(p.footprint, ['kind', 'hexes'])
    if (p.footprint.kind !== 'hex') throw new Error('props: only full hex footprints are built')
    dense(p.footprint.hexes, cells)
    if (!p.footprint.hexes.length || (references += p.footprint.hexes.length) > MAX_BOARD_CELLS) throw new Error('props: empty or excessive footprint')
    const seen = new Set<number>()
    for (const h of p.footprint.hexes) {
      if (!Number.isSafeInteger(h) || h < 0 || h >= cells || seen.has(h)) throw new Error('props: invalid or repeated footprint hex')
      seen.add(h)
    }
    out.push({ id: p.id, height: 'high', material: p.material, footprint: { kind: 'hex', hexes: [...p.footprint.hexes] } })
  }
  return out
}

type Blockage = { key: string; cells: readonly number[]; contains: (hex: number) => boolean }
const tables = new WeakMap<State, Blockage>()
function blockage(state: State): Blockage {
  if (state.terrain.includes(TERRAIN.OBSTACLE)) throw new Error('props: obstacle shorthand is not canonical runtime ground')
  const cells = state.board.width * state.board.height, found = new Set<number>()
  // One scan at the owning operation's boundary, never inside its neighbor loop.
  for (const p of state.props) {
    if (p.height !== 'high' || p.footprint.kind !== 'hex') throw new Error('props: unsupported live geometry')
    for (const h of p.footprint.hexes) {
      if (!Number.isSafeInteger(h) || h < 0 || h >= cells) throw new Error('props: invalid live hex')
      found.add(h)
    }
  }
  const ordered = [...found].sort((a, b) => a - b), key = `${state.board.width}x${state.board.height}|${ordered.join(',')}`
  const prior = tables.get(state)
  if (prior?.key === key) return prior
  const bits = new Uint8Array(cells)
  for (const h of ordered) bits[h] = 1
  const table = { key, cells: Object.freeze(ordered), contains: (h: number) => bits[h] === 1 }
  tables.set(state, table)
  return table
}
export function highCells(ctx: Pick<Ctx, 'state'>): readonly number[] { return blockage(ctx.state).cells }
/** Capture once per synchronous operation. Underlying mutable buffers never escape. */
export function passableHexes(ctx: Pick<Ctx, 'state'>): (hex: number) => boolean {
  const blocked = blockage(ctx.state)
  return hex => Number.isSafeInteger(hex) && hex >= 0 && hex < ctx.state.terrain.length && !blocked.contains(hex)
}
