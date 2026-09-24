// Read-only presentation of canonical initial map facts. No filesystem, RNG or
// combat execution; both the field CLI and browser use this single projection.
import { decodeProps,decodeFloor,passableHexes } from '../core/props.js'
import { geometryOf, validBoard } from '../core/hex.js'
import { TERRAIN,type State } from '../core/types.js'
import { terrainIdOf, moveCostOf, isPassable, IMPASSABLE,
  accuracyBonusOf, reachBonusOf, dodgeBonusOf, armorBonusOf,
  stripsOnEnterOf, stripsOnActivationEndOf, appliesOnEnterOf, appliesOnActivationEndOf,
} from '../content/terrain.js'

const HEXW = 128, HEXH = 132, COL = 128, ROW = 96, ODD = 64, TILT = 49.3
const groundValues = Object.values(TERRAIN).filter(t => t !== TERRAIN.IMPASSABLE)
const terrainNumbers = new Map(groundValues.map(t => [terrainIdOf(t), t]))
function record(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${label}: expected plain data`)
  if (Object.values(Object.getOwnPropertyDescriptors(value)).some(d => !('value' in d))) throw new Error(`${label}: accessors are not data`)
  return value as Record<string, any>
}
function dense(value: unknown, size: number, label: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== size || Object.hasOwn(value, Symbol.iterator)) throw new Error(`${label}: wrong dense array size`)
  const out: unknown[] = []
  for (let i = 0; i < size; i++) {
    const d = Object.getOwnPropertyDescriptor(value, String(i))
    if (!d || !('value' in d)) throw new Error(`${label}: missing data index ${i}`)
    out.push(d.value)
  }
  return out
}
const short = (id: string) => id.replace('status.', '')
const groundNote = (t: number): string => {
  const bits: string[] = []
  const se = stripsOnEnterOf(t), sa = stripsOnActivationEndOf(t)
  const ae = appliesOnEnterOf(t), aa = appliesOnActivationEndOf(t)
  if (se.length || sa.length) bits.push(`washes ${[...new Set([...se, ...sa])].map(short).join('/')}`)
  if (ae.length) bits.push(`+${ae.map(([id, n]) => `${n} ${short(id)}`).join(', ')} on entry`)
  if (aa.length) bits.push(`+${aa.map(([id, n]) => `${n} ${short(id)}`).join(', ')} end of activation`)
  return bits.join(' · ')
}

export function presentationField(input: unknown, rawRows?: readonly string[]) {
  const f = record(input, 'initial field'), b = { width: f.width, height: f.height }
  if (!validBoard(b)) throw new Error('initial field: invalid board dimensions')
  const { width, height } = b, n = width * height
  const terrain = dense(f.terrain, n, 'initial terrain').map(t => {
    if (!groundValues.includes(t as any)) throw new Error('initial terrain: unknown or noncanonical ground')
    return t as number
  })
  const props = decodeProps(f.props, n)
  const floor=Object.hasOwn(f,'floor')?decodeFloor(f.floor,n):undefined
  const passable=passableHexes({state:{board:b,terrain,props,...(floor?{floor}:{})} as State})
  const hexes = [] as { c: number; r: number; px: number; py: number }[]
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) hexes.push({ c, r, px: COL / 2 + c * COL + (r % 2) * ODD, py: HEXH / 2 + r * ROW })
  let rows: string[] | undefined
  if (rawRows !== undefined) rows = dense(rawRows, height, 'authored rows').map(r => {
    if (typeof r !== 'string' || r.length !== width) throw new Error('authored rows: wrong width')
    return r
  })
  const table = [...new Set(terrain)].sort((a,b) => a-b).map(t => ({
    id: terrainIdOf(t), moveCost: moveCostOf(t) >= IMPASSABLE ? 99 : moveCostOf(t),
    passable: isPassable(t), accuracy: accuracyBonusOf(t), reach: reachBonusOf(t),
    dodge: dodgeBonusOf(t), armor: armorBonusOf(t), ground: groundNote(t),
  }))
  return { width, height, w: width * COL + ODD, h: (height - 1) * ROW + HEXH,
    hexW: HEXW, hexH: HEXH, colStep: COL, rowStep: ROW, oddOffset: ODD, tilt: TILT,
    hexes, ...(rows === undefined ? {} : { rows }), terrainIds: terrain.map(terrainIdOf), props, ...(floor?{floor}:{}),
    passable: terrain.map((_,h) => passable(h)),
    moveCost: terrain.map(t => moveCostOf(t) >= IMPASSABLE ? 99 : moveCostOf(t)), table }
}

function deployment(value: unknown): { hero: string; enemy: string } {
  const d = record(value, 'initial deploy')
  if (Object.keys(d).some(k => k !== 'hero' && k !== 'enemy') || !['north','south','east','west'].includes(d.hero) || !['north','south','east','west'].includes(d.enemy) || d.hero === d.enemy) throw new Error('initial deploy: invalid distinct edges')
  return { hero: d.hero, enemy: d.enemy }
}

/** Initial facts are inspected, never consumed: callers still fold every event. */
export function prepareBattleField(events: unknown, seedValue: unknown, fallback?: unknown) {
  const seed = record(seedValue, 'seed')
  const mapId = initialMapId(seed)
  if (!Array.isArray(events)) throw new Error('initial events must be an array')
  let initial: Record<string, any> | undefined, began = false
  for (const value of dense(events, events.length, 'initial events')) {
    const e = record(value, 'event')
    if (e.type === 'battle.begin') began = true
    if (e.type !== 'map.loaded') continue
    if (initial || began) throw new Error('duplicate or late initial map facts')
    initial = e
  }
  if (!initial) throw new Error('missing initial map facts')
  const e = initial
  if (e.mapId !== mapId) throw new Error('initial map identity differs from seed')
  if ('causeId' in e && e.causeId !== mapId) throw new Error('initial map cause differs from identity')
  const board = { width: e.width, height: e.height }
  if (!validBoard(board)) throw new Error('initial map dimensions invalid')
  const deploy = deployment(e.deploy)
  if ('deploy' in seed && JSON.stringify(deployment(seed.deploy)) !== JSON.stringify(deploy)) throw new Error('initial deploy differs from seed')
  if ('board' in seed && (!validBoard(seed.board) || seed.board.width !== board.width || seed.board.height !== board.height)) throw new Error('initial board differs from seed')
  // Presence is significant: undefined/null/malformed explicit terrain never falls back.
  let terrain = e.terrain, rows: readonly string[] | undefined
  if (!Object.hasOwn(e, 'terrain')) {
    const binding = record(fallback, 'missing exact terrain and registry field')
    if (binding.mapId !== mapId) throw new Error('registry field identity differs from seed')
    const f = record(binding.field, 'missing registry field')
    if (f.width !== board.width || f.height !== board.height) throw new Error('missing exact terrain for resized field')
    terrain = dense(f.terrainIds, board.width * board.height, 'registry terrain').map(id => terrainNumbers.get(id as string))
    rows = f.rows
  }
  const field = presentationField({ ...board, terrain, props: e.props, ...(Object.hasOwn(e,'floor')?{floor:e.floor}:{}) }, rows)
  const geo = geometryOf(board)
  // O(cells) preparation, exact integer distance on demand; never an N² byte table.
  return { field, distance: geo.distance }
}

/**
 * The three exporter envelopes: ordinary mapId, proving-plan map (an id), and a
 * scenario whose seed carries its direct authored map row (fix.view-direct-map-seed,
 * 2026-09-24): that row names itself by `id`, and its exact initial facts are the
 * map.loaded event's own terrain and props, never a registry field.
 */
export function initialMapId(value: unknown): string {
  const seed = record(value, 'seed')
  const valid = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
  const map = Object.hasOwn(seed, 'map') && seed.map !== null && typeof seed.map === 'object' ? record(seed.map, 'seed map').id : seed.map
  if (Object.hasOwn(seed, 'mapId') && !valid(seed.mapId)) throw new Error('seed: invalid mapId')
  if (Object.hasOwn(seed, 'map') && !valid(map)) throw new Error('seed: invalid map')
  if ('mapId' in seed && 'map' in seed && seed.mapId !== map) throw new Error('seed: conflicting map identities')
  const id = seed.mapId ?? map
  if (!valid(id)) throw new Error('seed: missing map identity')
  return id
}
