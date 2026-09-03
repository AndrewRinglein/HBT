import { WIDTH, hexId } from './hex.js'
import { makeRng, rootSeedOf, sample } from './rng.js'
import type { Ctx, Side, State, Unit, UnitDef, Config } from './types.js'
import { DEFAULT_CONFIG } from './types.js'
import { ATTACKS, ABILITIES, CRIT_CHART, ITEMS, UNITS, FIRST_BATTLE } from '../content/index.js'
import { terrainOf, terrainIdOf, isPassable } from '../content/maps.js'
import { STATUSES } from '../content/statuses.js'
import { MOVES } from '../content/moves.js'
import { triggersFrom } from './trigger.js'
import { emit } from './mutate.js'

function makeUnit(id: number, uid: number, name: string, def: UnitDef, hex: number): Unit {
  return {
    id, uid, name, typeId: def.typeId, side: def.side, hex,
    hp: def.maxHp, maxHp: def.maxHp,
    armor: def.armor, resist: def.resist,
    accuracy: def.accuracy, dodge: def.dodge, strength: def.strength, precision: def.precision, magic: def.magic, spirit: def.spirit,
    crit: def.crit ?? 0, luck: def.luck ?? 0, // station.crit 2026-08-27
    role: def.role,
    movement: def.movement, reach: def.reach,
    stamina: def.maxStamina, maxStamina: def.maxStamina, staminaRegen: def.staminaRegen,
    lifeState: 'standing', bleedOut: 0,
    ai: def.ai,
    attacks: [...def.attacks],
    abilities: [...def.abilities],
    moves: [...def.moves],
    cooldowns: {},
    statuses: [],
    mods: [],
    triggers: triggersFrom(def.triggers ?? []),
    tags: def.tags ?? [],
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
  /**
   * The enemy roster, unit typeIds. Absent = cycle `FIRST_BATTLE.enemies` as
   * always. Added 2026-08-21 with scenarios: `heroes` could be named from
   * outside and the enemy side could not, so a fielding could only ever be half
   * chosen.
   */
  enemies?: readonly string[]
  mapId?: string
  /** Names the fielding in errors and on the export. Never read by the rules. */
  scenarioId?: string
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
  const ctx: Ctx = { state, events: [], rng, cfg, attacks: ATTACKS, abilities: ABILITIES, statuses: STATUSES, moves: MOVES, critChart: CRIT_CHART, items: ITEMS }

  const def = (t: string): UnitDef => ({ ...UNITS[t]!, ...(opts.overrides?.[t] ?? {}) })
  const heroes = opts.heroes ?? FIRST_BATTLE.heroes
  // The default battle size is pinned by content, not by the cycle's length —
  // the roster array is a repeating PATTERN (2026-08-20, the Beast pen), and
  // growing the pattern must not silently grow the canonical battle.
  const enemyCount = opts.enemyCount ?? FIRST_BATTLE.defaultEnemyCount ?? FIRST_BATTLE.enemies.length
  // Cycle the DECLARED roster — before 2026-08-20 this line hardcoded 'zombie',
  // a content name in core that ignored FIRST_BATTLE.enemies entirely. The mix
  // (one burning zombie per four) comes from the data, where it belongs.
  const enemies = opts.enemies
    ? [...opts.enemies]
    : Array.from({ length: enemyCount }, (_, i) => FIRST_BATTLE.enemies[i % FIRST_BATTLE.enemies.length]!)

  /**
   * Positions named from outside are checked, loudly (Law 9).
   *
   * Nothing checked these before 2026-08-21 — `opts.heroHexes?.[i]` went
   * straight into `makeUnit`, so a scenario naming a hex inside a wall, off the
   * board, or already taken produced a battle that ran and looked fine. The
   * rolled deployment below has been obstacle-checked since obstacles existed;
   * the authored path had no equivalent.
   *
   * Every failure names the scenario, the unit and the hex, because "invalid
   * hex" in a 144-hex board is not a diagnosis.
   */
  const where = opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'
  const taken = new Map<number, string>()
  const checkHexes = (hexes: readonly number[] | undefined, types: readonly string[], side: Side) => {
    if (!hexes) return
    if (hexes.length !== types.length) {
      throw new Error(`${where}: ${side} side names ${types.length} units but ${hexes.length} hexes — they must correspond`)
    }
    hexes.forEach((hex, i) => {
      const who = `${types[i]} (${side} ${i})`
      if (!Number.isInteger(hex) || hex < 0 || hex >= state.terrain.length) {
        throw new Error(`${where}: ${who} is placed on hex ${hex}, which is off a ${state.terrain.length}-hex board`)
      }
      if (!isPassable(state.terrain[hex] ?? 0)) {
        throw new Error(`${where}: ${who} is placed on hex ${hex}, which is ${terrainIdOf(state.terrain[hex] ?? 0)} — impassable`)
      }
      const already = taken.get(hex)
      if (already) throw new Error(`${where}: ${who} and ${already} are both placed on hex ${hex}`)
      taken.set(hex, who)
    })
  }
  checkHexes(opts.heroHexes, heroes, 'hero')
  checkHexes(opts.enemyHexes, enemies, 'enemy')

  /**
   * A unit fielded on the side its row does not declare.
   *
   * `makeUnit` reads `def.side`, so listing an enemy-side row under `heroes`
   * silently produces an enemy — which is exactly what PLAYBACK-DESIGN §6.2's
   * example scenario would have done with the Shadow Hound Puppy. Silent is the
   * problem: the fielding you asked for and the fielding you got differ, and the
   * battle runs either way.
   */
  const checkSides = (types: readonly string[], side: Side) => {
    for (const t of types) {
      const d = UNITS[t]
      if (!d) throw new Error(`${where}: unknown unit typeId '${t}' — units are an explicit registry, check content/index.ts`)
      if (d.side !== side) {
        throw new Error(`${where}: '${t}' is fielded as a ${side} but its row declares side '${d.side}'. Field it on its own side, or rule that the row changes.`)
      }
    }
  }
  checkSides(heroes, 'hero')
  checkSides(enemies, 'enemy')

  // Deployment must not put a unit inside a wall. Nothing checked this before
  // obstacles existed; the first authored map with one on a deployment row would
  // have placed a unit in it silently. Law 9: fail loudly instead.
  const passableCols = (row: number) =>
    Array.from({ length: WIDTH }, (_, i) => i).filter((c) => isPassable(state.terrain[hexId(c, row)] ?? 0))
  const cols = passableCols(FIRST_BATTLE.heroRow)
  const eCols = passableCols(FIRST_BATTLE.enemyRow ?? 0)
  // Only the ROLLED path needs a deployment row wide enough. A scenario names
  // its own hexes (already validated above), so a map with a narrow row is not
  // its problem — before this guard, an authored fielding could be refused for a
  // row it never used.
  if (!opts.heroHexes && cols.length < heroes.length) {
    throw new Error(`map '${mapId}' has only ${cols.length} passable hexes on the hero deployment row, need ${heroes.length}`)
  }
  if (!opts.enemyHexes && eCols.length === 0) {
    throw new Error(`map '${mapId}' has no passable hex on the enemy deployment row`)
  }
  const enemyCols = opts.enemyHexes ? [] : sample(rng, eCols, eCols.length, 'enemy-placement')
  const heroCols = opts.heroHexes ? [] : sample(rng, cols, heroes.length, 'hero-deployment')

  let id = 0
  // Names come from the DEF (the pack carries Codex names like "Oathblade
  // (TEST)"); a def without one falls back to its title-cased typeId. The old
  // hand-typed NAMES map died with the hand-typed party (2026-08-20).
  const label = (t: string) => t.split('-').map((w) => (w[0] ?? '').toUpperCase() + w.slice(1)).join(' ')
  const LETTERS = 'ABCDEFGH'
  const seen: Record<string, number> = {}
  heroes.forEach((t, i) => {
    const hex = opts.heroHexes?.[i] ?? hexId(heroCols[i]!, FIRST_BATTLE.heroRow)
    const d = def(t)
    seen[t] = (seen[t] ?? 0)
    const nm = `${d.name ?? label(t)} ${LETTERS[seen[t]!] ?? seen[t]! + 1}`
    seen[t]!++
    state.units.push(makeUnit(id, 100 + i, nm, d, hex))
    id++
  })
  const seenEnemy: Record<string, number> = {}
  enemies.forEach((t, i) => {
    // More enemies than columns spill onto the next row back.
    const hex = opts.enemyHexes?.[i] ?? hexId(enemyCols[i % WIDTH]!, FIRST_BATTLE.enemyRow + Math.floor(i / WIDTH))
    // Named from the def (Codex name) or the typeId, counted per type — Law 12:
    // the log names what a thing IS.
    const d = def(t)
    seenEnemy[t] = (seenEnemy[t] ?? 0) + 1
    state.units.push(makeUnit(id, 200 + i, `${d.name ?? label(t)} ${seenEnemy[t]}`, d, hex))
    id++
  })

  for (const u of state.units) {
    // A dotted typeId is already a full Codex id and names itself; bare
    // typeIds keep the historic prefix. (2026-08-26 — keeps the prefix from
    // doubling in every log line for pack units keyed by full id.)
    emit(ctx, 'unit.enter', u.typeId.includes('.') ? u.typeId : `unit.${u.typeId}`, {
      actor: u.id, uid: u.uid, name: u.name, side: u.side, typeId: u.typeId,
      role: u.role, hex: u.hex, hp: u.hp, maxHp: u.maxHp,
      stamina: u.stamina, maxStamina: u.maxStamina, terrain: state.terrain[u.hex],
    })
  }
  // A battle fielded by a scenario says so IN THE LOG, not only in the export
  // envelope (Law 12: every line names its cause). The replay is built from the
  // event log alone, so a fielding recorded only in `seed` is invisible to it —
  // and gate 1 could not probe a scenario at all. Emitted ONLY when there is a
  // scenario, so every standard battle stays byte-identical.
  emit(ctx, 'map.loaded', mapId, opts.scenarioId
    ? { mapId, scenarioId: opts.scenarioId, ...terrainCensus(state.terrain) }
    : { mapId, ...terrainCensus(state.terrain) })
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
  const ctx: Ctx = { state, events: [], rng, cfg, attacks: ATTACKS, abilities: ABILITIES, statuses: STATUSES, moves: MOVES, critChart: CRIT_CHART, items: ITEMS }
  let id = 0
  heroes.forEach((h, i) => { state.units.push(makeUnit(id, 100 + i, `H${i}`, UNITS[h.type]!, h.hex)); id++ })
  enemies.forEach((e, i) => { state.units.push(makeUnit(id, 200 + i, `E${i}`, UNITS[e.type]!, e.hex)); id++ })
  for (const u of state.units) {
    // A dotted typeId is already a full Codex id and names itself; bare
    // typeIds keep the historic prefix. (2026-08-26 — keeps the prefix from
    // doubling in every log line for pack units keyed by full id.)
    emit(ctx, 'unit.enter', u.typeId.includes('.') ? u.typeId : `unit.${u.typeId}`, {
      actor: u.id, uid: u.uid, name: u.name, side: u.side, typeId: u.typeId,
      role: u.role, hex: u.hex, hp: u.hp, maxHp: u.maxHp,
      stamina: u.stamina, maxStamina: u.maxStamina, terrain: state.terrain[u.hex],
    })
  }
  emit(ctx, 'map.loaded', mapId, { mapId, ...terrainCensus(state.terrain) })
  return ctx
}
