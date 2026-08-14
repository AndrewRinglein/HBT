import { WIDTH, hexId } from './hex.js'
import { makeRng, rootSeedOf, sample } from './rng.js'
import type { Ctx, State, Unit, UnitDef, Config } from './types.js'
import { DEFAULT_CONFIG } from './types.js'
import { ATTACKS, ABILITIES, UNITS, FIRST_BATTLE } from '../content/index.js'
import { terrainOf, terrainIdOf } from '../content/maps.js'
import { STATUSES } from '../content/statuses.js'
import { emit } from './mutate.js'

function makeUnit(id: number, uid: number, name: string, def: UnitDef, hex: number): Unit {
  return {
    id, uid, name, typeId: def.typeId, side: def.side, hex,
    hp: def.maxHp, maxHp: def.maxHp,
    armor: def.armor, resist: def.resist,
    accuracy: def.accuracy, dodge: def.dodge, strength: def.strength, precision: def.precision, magic: def.magic,
    role: def.role,
    movement: def.movement, reach: def.reach,
    stamina: def.maxStamina, maxStamina: def.maxStamina, staminaRegen: def.staminaRegen,
    lifeState: 'standing', bleedOut: 0,
    ai: def.ai,
    attacks: [...def.attacks],
    abilities: [...def.abilities],
    cooldowns: {},
    statuses: [],
    mods: [],
    attributes: [...def.attributes],
    moveUsed: false, primaryUsed: false, movePointsLeft: 0,
    activationOrdinal: 0, attackOrdinal: 0, deathbedOrdinal: 0,
  }
}

export type BattleOptions = {
  replicate: number
  variantId?: number
  cfg?: Partial<Config>
  strict?: boolean
  /** Force positions instead of rolling them — used by verification scenarios. */
  heroHexes?: number[]
  enemyHexes?: number[]
  /** Sweep axes. */
  enemyCount?: number
  heroes?: readonly string[]
  mapId?: string
  /** Stat overrides by unit type. Does NOT change the seed, so arms stay paired. */
  overrides?: Readonly<Record<string, Partial<UnitDef>>>
}

/**
 * What the board is MADE OF, by terrain id. Goes on map.loaded.
 *
 * Before this, map.loaded carried `hills: 14` and nothing else, so a log could not
 * tell forest from rocky from water — the terrain array holds bare integers and a
 * reader has no enum. A census by id makes the board self-describing, and makes
 * "is this terrain wired in?" answerable from the log (Law 12).
 */
export function terrainCensus(terrain: readonly number[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of terrain) { const k = terrainIdOf(t); out[k] = (out[k] ?? 0) + 1 }
  return out
}

export function createBattle(opts: BattleOptions): Ctx {
  const cfg: Config = {
    ...DEFAULT_CONFIG,
    ...opts.cfg,
    switches: { ...DEFAULT_CONFIG.switches, ...(opts.cfg?.switches ?? {}) },
  }
  const rootSeed = rootSeedOf(FIRST_BATTLE.scenarioId, opts.variantId ?? 0, opts.replicate)
  const rng = makeRng(rootSeed, opts.strict ? { strict: true } : undefined)

  const mapId = opts.mapId ?? 'map.open'
  const state: State = { turn: 0, phase: 'hero', mapId, terrain: terrainOf(mapId), units: [], outcome: null, seq: 0 }
  const ctx: Ctx = { state, events: [], rng, cfg, attacks: ATTACKS, abilities: ABILITIES, statuses: STATUSES }

  const def = (t: string): UnitDef => ({ ...UNITS[t]!, ...(opts.overrides?.[t] ?? {}) })
  const heroes = opts.heroes ?? FIRST_BATTLE.heroes
  const enemyCount = opts.enemyCount ?? FIRST_BATTLE.enemies.length
  const enemies = Array.from({ length: enemyCount }, () => 'zombie')

  const cols = Array.from({ length: WIDTH }, (_, i) => i)
  const enemyCols = opts.enemyHexes ? [] : sample(rng, cols, WIDTH, 'enemy-placement')
  const heroCols = opts.heroHexes ? [] : sample(rng, cols, heroes.length, 'hero-deployment')

  let id = 0
  const NAMES: Record<string, string[]> = {
    warrior: ['Warrior A', 'Warrior B'], ranger: ['Ranger A', 'Ranger B'],
    mage: ['Mage A', 'Mage B'],
  }
  const seen: Record<string, number> = {}
  heroes.forEach((t, i) => {
    const hex = opts.heroHexes?.[i] ?? hexId(heroCols[i]!, FIRST_BATTLE.heroRow)
    seen[t] = (seen[t] ?? 0)
    const nm = NAMES[t]?.[seen[t]!] ?? `${t} ${seen[t]! + 1}`
    seen[t]!++
    state.units.push(makeUnit(id, 100 + i, nm, def(t), hex))
    id++
  })
  enemies.forEach((t, i) => {
    // More enemies than columns spill onto the next row back.
    const hex = opts.enemyHexes?.[i] ?? hexId(enemyCols[i % WIDTH]!, FIRST_BATTLE.enemyRow + Math.floor(i / WIDTH))
    state.units.push(makeUnit(id, 200 + i, `Zombie ${i + 1}`, def(t), hex))
    id++
  })

  for (const u of state.units) {
    emit(ctx, 'unit.enter', `unit.${u.typeId}`, {
      actor: u.id, uid: u.uid, name: u.name, side: u.side, typeId: u.typeId,
      role: u.role, hex: u.hex, hp: u.hp, maxHp: u.maxHp,
      stamina: u.stamina, maxStamina: u.maxStamina, terrain: state.terrain[u.hex],
    })
  }
  emit(ctx, 'map.loaded', mapId, { mapId, ...terrainCensus(state.terrain) })
  return ctx
}

/** Custom rosters, for verification scenarios. */
export function createCustomBattle(
  heroes: { type: string; hex: number }[],
  enemies: { type: string; hex: number }[],
  opts: { replicate?: number; cfg?: Partial<Config>; strict?: boolean; mapId?: string } = {},
): Ctx {
  const cfg: Config = {
    ...DEFAULT_CONFIG, ...opts.cfg,
    switches: { ...DEFAULT_CONFIG.switches, ...(opts.cfg?.switches ?? {}) },
  }
  const rng = makeRng(rootSeedOf(99, 0, opts.replicate ?? 0), opts.strict ? { strict: true } : undefined)
  const mapId = opts.mapId ?? 'map.open'
  const state: State = { turn: 0, phase: 'hero', mapId, terrain: terrainOf(mapId), units: [], outcome: null, seq: 0 }
  const ctx: Ctx = { state, events: [], rng, cfg, attacks: ATTACKS, abilities: ABILITIES, statuses: STATUSES }
  let id = 0
  heroes.forEach((h, i) => { state.units.push(makeUnit(id, 100 + i, `H${i}`, UNITS[h.type]!, h.hex)); id++ })
  enemies.forEach((e, i) => { state.units.push(makeUnit(id, 200 + i, `E${i}`, UNITS[e.type]!, e.hex)); id++ })
  for (const u of state.units) {
    emit(ctx, 'unit.enter', `unit.${u.typeId}`, {
      actor: u.id, uid: u.uid, name: u.name, side: u.side, typeId: u.typeId,
      role: u.role, hex: u.hex, hp: u.hp, maxHp: u.maxHp,
      stamina: u.stamina, maxStamina: u.maxStamina, terrain: state.terrain[u.hex],
    })
  }
  emit(ctx, 'map.loaded', mapId, { mapId, ...terrainCensus(state.terrain) })
  return ctx
}
