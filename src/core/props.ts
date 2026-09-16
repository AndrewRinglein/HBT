import { centerPoint, segmentNearPolygon, orientation, GEOMETRY_LIMITS } from './geometry.js'
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
  let references = 0, vertices = 0
  for (const p of value) {
    plain(p, ['id', 'height', 'material', 'footprint'])
    if (typeof p.id !== 'string' || !/^prop\.[a-z0-9.-]+$/.test(p.id) || ids.has(p.id)) throw new Error('props: IDs must be unique prop.* strings')
    ids.add(p.id)
    if (p.height !== 'high' || ![1, 2, 3].includes(p.material)) throw new Error('props: unsupported height or material')
    plain(p.footprint, ['kind', 'hexes', 'vertices', 'movementPadding'])
    if (p.footprint.kind === 'polygon') {
      plain(p.footprint, ['kind', 'vertices', 'movementPadding'])
      const points = p.footprint.vertices, padding = p.footprint.movementPadding
      dense(points, GEOMETRY_LIMITS.vertices)
      if (points.length < 3 || (vertices += points.length) > GEOMETRY_LIMITS.totalVertices) throw new Error('props: polygon vertex limit')
      if (!Number.isSafeInteger(padding) || padding < 0 || padding > GEOMETRY_LIMITS.movementPadding) throw new Error('props: polygon movement padding')
      for (const point of points) { dense(point, 2); if(point.length !== 2 || point.some(n => !Number.isSafeInteger(n) || Math.abs(n) > GEOMETRY_LIMITS.coordinate)) throw new Error('props: polygon coordinates') }
      const turn = orientation(points[0], points[1], points[2])
      if (!turn) throw new Error('props: degenerate polygon')
      // Every other vertex strictly inside every oriented edge: rejects self-
      // crossing/star, repeated/collinear vertices and nonconvex polygons.
      for(let i=0;i<points.length;i++)for(let j=0;j<points.length;j++) {
        if(j===i || j===(i+1)%points.length)continue
        if(orientation(points[i],points[(i+1)%points.length],points[j])!==turn)throw new Error('props: polygon must be strictly convex')
      }
      out.push({id:p.id,height:'high',material:p.material,footprint:{kind:'polygon',vertices:points.map(v=>[v[0],v[1]]),movementPadding:padding}})
      continue
    }
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
function blockage(state: State, props=state.props): Blockage {
  if (state.terrain.includes(TERRAIN.OBSTACLE)) throw new Error('props: obstacle shorthand is not canonical runtime ground')
  const cells = state.board.width * state.board.height, found = new Set<number>()
  // One scan at the owning operation's boundary, never inside its neighbor loop.
  for (const p of props) {
    if (p.height !== 'high') throw new Error('props: unsupported live geometry')
    if (p.footprint.kind === 'polygon') continue
    if (p.footprint.kind !== 'hex') throw new Error('props: unsupported live geometry')
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
/** Absence means complete floor; an explicitly supplied mask is strict data. */
export function decodeFloor(value: unknown, cells: number): boolean[] {
  try { dense(value, cells) } catch { throw new Error('floor: expected dense bounded boolean array') }
  if(value.length!==cells || value.some(x=>typeof x!=='boolean'))throw new Error('floor: expected one boolean per board cell')
  return [...value]
}
export type Passable = (hex: number, from?: number) => boolean
/** Capture once per synchronous operation. Physical polygons are detached so
 * later edits cannot change a prepared movement enumeration halfway through. */
export function passableHexes(ctx: Pick<Ctx, 'state'>): Passable {
  const state=ctx.state, props=state.props
  // Preserve the existing one-read operation contract (important for large maps).
  const blocked = blockage(state,props)
  const polygons=props.filter(p=>p.footprint.kind==='polygon')
  const detached=polygons.length?decodeProps(polygons,state.terrain.length):[]
  const floor=Object.hasOwn(state,'floor')?decodeFloor(state.floor,state.terrain.length):null
  return (hex,from) => {
    if(!Number.isSafeInteger(hex)||hex<0||hex>=state.terrain.length||blocked.contains(hex)||floor?.[hex]===false)return false
    if(from!==undefined&&(!Number.isSafeInteger(from)||from<0||from>=state.terrain.length||floor?.[from]===false))return false
    const b=centerPoint(state.board,hex),a=from===undefined?b:centerPoint(state.board,from)
    return !detached.some(p=>p.footprint.kind==='polygon'&&segmentNearPolygon(a,b,p.footprint.vertices,p.footprint.movementPadding))
  }
}
