import { centerPoint, segmentNearPolygon, orientation, GEOMETRY_LIMITS } from './geometry.js'
import { MAX_BOARD_CELLS } from './hex.js'
import { TERRAIN, type Ctx, type Prop, type State } from './types.js'

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
export function decodeProps(value: unknown, cells: number): Prop[] {
  dense(value, MAX_BOARD_CELLS)
  const ids = new Set<string>(), out: Prop[] = []
  let references = 0, vertices = 0
  for (const p of value) {
    plain(p, ['id', 'height', 'material', 'footprint', 'crossingCost', 'collisionValue', 'consumes'])
    if (typeof p.id !== 'string' || !/^prop\.[a-z0-9.-]+$/.test(p.id) || ids.has(p.id)) throw new Error('props: IDs must be unique prop.* strings')
    ids.add(p.id)
    if (!['high','low'].includes(p.height) || ![1, 2, 3].includes(p.material)) throw new Error('props: unsupported height or material')
    plain(p.footprint, ['kind', 'hexes', 'vertices', 'movementPadding'])
    if(Object.hasOwn(p,'crossingCost') && (p.height!=='low'||p.footprint.kind!=='polygon'||p.crossingCost!==1))throw new Error('props: crossingCost 1 requires a low polygon edge')
    // v2.knockback-collisions (COMBAT-V2 §9.3): only a HIGH prop stops a push,
    // so only a high prop may carry what a push into it costs.
    if (Object.hasOwn(p, 'collisionValue') && (p.height !== 'high' || !Number.isSafeInteger(p.collisionValue) || p.collisionValue < 0 || p.collisionValue > 100)) throw new Error('props: collisionValue requires a high prop and an integer 0..100')
    if (Object.hasOwn(p, 'consumes') && (p.height !== 'high' || p.consumes !== true)) throw new Error('props: consumes is true on a high prop, or absent')
    const collision = { ...(Object.hasOwn(p, 'collisionValue') ? { collisionValue: p.collisionValue as number } : {}), ...(p.consumes === true ? { consumes: true as const } : {}) }
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
      out.push({id:p.id,height:p.height,material:p.material,...(Object.hasOwn(p,'crossingCost')?{crossingCost:1 as const}:{}),...collision,footprint:{kind:'polygon',vertices:points.map(v=>[v[0],v[1]]),movementPadding:padding}})
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
    out.push({ id: p.id, height: p.height, material: p.material, ...collision, footprint: { kind: 'hex', hexes: [...p.footprint.hexes] } })
  }
  return out
}

type Blockage = { key: string; cells: readonly number[]; contains: (hex: number) => boolean }
const tables = new WeakMap<State, Blockage>()
function blockage(state: State, props=state.props): Blockage {
  if (state.terrain.includes(TERRAIN.IMPASSABLE)) throw new Error('props: obstacle shorthand is not canonical runtime ground')
  const cells = state.board.width * state.board.height, found = new Set<number>()
  // One scan at the owning operation's boundary, never inside its neighbor loop.
  for (const p of props) {
    if (p.height === 'low') continue
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
export function passableHexes(ctx: Pick<Ctx, 'state'>, props=ctx.state.props): Passable {
  const state=ctx.state
  // Preserve the existing one-read operation contract (important for large maps).
  const blocked = blockage(state,props)
  const polygons=props.filter(p=>p.height==='high'&&p.footprint.kind==='polygon')
  const detached=polygons.length?decodeProps(polygons,state.terrain.length):[]
  const floor=Object.hasOwn(state,'floor')?decodeFloor(state.floor,state.terrain.length):null
  return (hex,from) => {
    if(!Number.isSafeInteger(hex)||hex<0||hex>=state.terrain.length||blocked.contains(hex)||floor?.[hex]===false)return false
    if(from!==undefined&&(!Number.isSafeInteger(from)||from<0||from>=state.terrain.length||floor?.[from]===false))return false
    const b=centerPoint(state.board,hex),a=from===undefined?b:centerPoint(state.board,from)
    return !detached.some(p=>p.footprint.kind==='polygon'&&segmentNearPolygon(a,b,p.footprint.vertices,p.footprint.movementPadding))
  }
}

/**
 * v2.knockback-collisions (COMBAT-V2 §9.3): the prop that stops a step from
 * `from` into `hex`, or null when no prop does (a missing floor, say). A high
 * hex footprint on `hex` first, then a high polygon the step's centre segment
 * touches — each group in prop-id order (Law 6), the same geometry
 * passableHexes refuses the step by.
 */
export function blockingPropAt(ctx: Pick<Ctx, 'state'>, hex: number, from: number): Prop | null {
  const state = ctx.state
  const high = [...state.props].filter(p => p.height === 'high').sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const p of high) if (p.footprint.kind === 'hex' && p.footprint.hexes.includes(hex)) return p
  const a = centerPoint(state.board, from), b = centerPoint(state.board, hex)
  for (const p of high) if (p.footprint.kind === 'polygon' && segmentNearPolygon(a, b, p.footprint.vertices, p.footprint.movementPadding)) return p
  return null
}
