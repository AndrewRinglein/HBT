import { WIDTH, hexId } from './hex.js'
import { makeRng, rootSeedOf, sample } from './rng.js'
import type { Ctx, EncounterDef, HeroProgress, Side, State, Unit, UnitDef, Config } from './types.js'
import { DEFAULT_CONFIG } from './types.js'
import { ATTACKS, ABILITIES, CRIT_CHART, ITEMS, LEVELS, SPECIALTIES, UNITS, FIRST_BATTLE } from '../content/index.js'
import { applyItems, applyProgress, type Applied } from './items.js'
import { terrainOf, terrainIdOf, isPassable } from '../content/maps.js'
import { STATUSES } from '../content/statuses.js'
import { MOVES } from '../content/moves.js'
import { triggersFrom } from './trigger.js'
import { emit, gainPower } from './mutate.js'
import { heroDeployHexes, placeSetup } from './encounter.js'

export function makeUnit(id: number, uid: number, name: string, def: UnitDef, hex: number): Unit {
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
    woundLevel: 0, toughness: def.toughness ?? 0,
    ai: def.ai,
    attacks: [...def.attacks],
    abilities: [...def.abilities],
    moves: [...def.moves],
    // warmup (hero assembly, 2026-09-03): a power with warmup W is first
    // usable on Turn W+1 — isReady is `turn >= cooldowns[id]`.
    cooldowns: Object.fromEntries([
      ...def.abilities.flatMap((a) => { const w = ABILITIES[a]?.warmup; return w ? [[a, w + 1]] : [] }),
      // capability.enemy-action-cooldown: an attack's warmup, the same way
      ...def.attacks.flatMap((a) => { const w = ATTACKS[a]?.warmup; return w ? [[a, w + 1]] : [] }),
    ]),
    statuses: [],
    mods: [],
    triggers: triggersFrom(def.triggers ?? []),
    tags: def.tags ?? [],
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
  /**
   * seam.items-per-unit (2026-09-02, ITEMS-PLAN.md §2): the items each fielded
   * hero carries, in `heroes` order, parallel to heroHexes. An entry that is
   * absent (or the whole field) means the hero's Codex default kit — so every
   * fielding that says nothing is unchanged. Checked like hexes: the length
   * must match, every id must be an item, and the physical facts must hold.
   * Enemies carry no items; their rows are authored whole.
   */
  heroItems?: readonly (readonly string[] | undefined)[]
  /**
   * Hero assembly (2026-09-03): each fielded hero's level, specialty, pick and
   * drafted powers, in `heroes` order, parallel to heroItems. Absent = the
   * bare row. Folded by the one function, fieldedDef().
   */
  heroProgress?: readonly (HeroProgress | undefined)[]
  /**
   * encounter.runner (2026-09-03): the encounter to run. Its setup units are
   * fielded after the heroes; its schedule fires at Start of Turn. `enemies`
   * defaults to NONE when an encounter is named — the encounter owns the
   * enemy side. Heroes still come from `heroes` (an encounter never carries a
   * hero count, ruled 2026-09-03) and deploy on the player edge unless
   * `heroHexes` says otherwise.
   */
  encounter?: EncounterDef
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

/**
 * The unit AS FIELDED: the bare row with its items applied — the Codex
 * default kit, or the list handed in. seam.items-per-unit (2026-09-02). This
 * is the one function a preview (the kingdom's Equip screen, a tooltip) and
 * the battle both read, so they cannot disagree about what a hero carries.
 */
export function fieldedDef(typeId: string, items?: readonly string[], progress?: HeroProgress): UnitDef {
  const bare = UNITS[typeId]
  if (!bare) throw new Error(`fieldedDef: unknown unit '${typeId}'`)
  // Hero assembly (2026-09-03): level, specialty and drafted powers fold on
  // BEFORE the items, so the kit sees the grown hero. No progress = the bare
  // row, so every fielding that says nothing is unchanged.
  const grown = progress ? applyProgress(bare, progress, classOf(bare), LEVELS, SPECIALTIES, ABILITIES, `fieldedDef(${typeId})`) : bare
  return applyItems(grown, items ?? bare.defaultItems ?? [], ITEMS, ATTACKS, `fieldedDef(${typeId})`).def
}

/** The class a hero row belongs to, read off its tags (`class.<x>`) — hero assembly. */
export function classOf(def: UnitDef): string {
  const tag = (def.tags ?? []).find((t) => t.startsWith('class.'))
  if (!tag) throw new Error(`${def.typeId} carries no class.* tag, so its level table cannot be found`)
  return tag
}

export function createBattle(opts: BattleOptions): Ctx {
  const cfg: Config = {
    ...DEFAULT_CONFIG,
    ...opts.cfg,
    switches: { ...DEFAULT_CONFIG.switches, ...(opts.cfg?.switches ?? {}) },
  }
  const rootSeed = rootSeedOf(FIRST_BATTLE.scenarioId, opts.variantId ?? 0, opts.replicate)
  const rng = makeRng(rootSeed, opts.strict ? { strict: true } : undefined)

  const mapId = opts.mapId ?? opts.encounter?.mapId ?? 'map.open'
  const state: State = { turn: 0, phase: 'hero', mapId, terrain: terrainOf(mapId), units: [], outcome: null, seq: 0 }
  const ctx: Ctx = { state, events: [], rng, cfg, attacks: ATTACKS, abilities: ABILITIES, statuses: STATUSES, moves: MOVES, critChart: CRIT_CHART, items: ITEMS,
    ...(opts.encounter ? { encounter: opts.encounter, units: UNITS } : {}) }

  const def = (t: string): UnitDef => ({ ...UNITS[t]!, ...(opts.overrides?.[t] ?? {}) })
  const heroes = opts.heroes ?? FIRST_BATTLE.heroes
  if (opts.heroProgress && opts.heroProgress.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroProgress.length} progress records — they must correspond`)
  }
  if (opts.heroItems && opts.heroItems.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroItems.length} item lists — they must correspond`)
  }
  // The default battle size is pinned by content, not by the cycle's length —
  // the roster array is a repeating PATTERN (2026-08-20, the Beast pen), and
  // growing the pattern must not silently grow the canonical battle.
  const enemyCount = opts.enemyCount ?? FIRST_BATTLE.defaultEnemyCount ?? FIRST_BATTLE.enemies.length
  // Cycle the DECLARED roster — before 2026-08-20 this line hardcoded 'zombie',
  // a content name in core that ignored FIRST_BATTLE.enemies entirely. The mix
  // (one burning zombie per four) comes from the data, where it belongs.
  const enemies = opts.enemies
    ? [...opts.enemies]
    : opts.encounter ? []
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
  const equipped: { unitId: number; worn: Applied['worn'] }[] = []
  // Names come from the DEF (the pack carries Codex names like "Oathblade
  // (TEST)"); a def without one falls back to its title-cased typeId. The old
  // hand-typed NAMES map died with the hand-typed party (2026-08-20).
  const label = (t: string) => t.split('-').map((w) => (w[0] ?? '').toUpperCase() + w.slice(1)).join(' ')
  const LETTERS = 'ABCDEFGH'
  const seen: Record<string, number> = {}
  // encounter.runner: an encounter may name where the heroes deploy
  const zoneHexes = opts.encounter && !opts.heroHexes ? heroDeployHexes(ctx, opts.encounter, heroes.length) : null
  heroes.forEach((t, i) => {
    const hex = opts.heroHexes?.[i] ?? zoneHexes?.[i] ?? hexId(heroCols[i]!, FIRST_BATTLE.heroRow)
    const bare = def(t)
    // Items at fielding (seam.items-per-unit): what the options hand this
    // hero, else the row's Codex default kit, else nothing — applied by the
    // one function before the unit is made. Enemies never take this path.
    const itemIds = opts.heroItems?.[i] ?? bare.defaultItems ?? []
    const progress = opts.heroProgress?.[i]
    const grown = progress ? applyProgress(bare, progress, classOf(bare), LEVELS, SPECIALTIES, ABILITIES, where) : bare
    const { def: d, worn } = applyItems(grown, itemIds, ITEMS, ATTACKS, where)
    seen[t] = (seen[t] ?? 0)
    const nm = `${d.name ?? label(t)} ${LETTERS[seen[t]!] ?? seen[t]! + 1}`
    seen[t]!++
    state.units.push(makeUnit(id, 100 + i, nm, d, hex))
    equipped.push({ unitId: id, worn })
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
    // seam.items-per-unit: one unit.equipped per (unit, item), after the
    // unit's own enter line — the log says why the Hunter shoots and why his
    // Health is 9 (Law 12). Cause = the item.
    for (const w of equipped.find((e) => e.unitId === u.id)?.worn ?? []) {
      emit(ctx, 'unit.equipped', w.itemId, { actor: u.id, itemId: w.itemId, grants: w.grants, abilities: w.abilities, mods: w.mods, ...(w.gaps ? { gaps: w.gaps } : {}) })
    }
    // capability.power-pool (2026-09-03): a unit fielded at setup arrives too
    const arrival = UNITS[u.typeId]?.powerOnArrival
    if (arrival && u.side === 'enemy') gainPower(ctx, arrival, u.typeId, { kind: 'arrival', actor: u.id })
  }
  // The encounter's own units — after the heroes, so a hero already standing
  // where an authored unit wants to be is the one that stays and the arrival
  // is shunted (encounter.runner, 2026-09-03).
  if (opts.encounter) {
    emit(ctx, 'encounter.begin', opts.encounter.id, { name: opts.encounter.name, ...(opts.encounter.gaps?.length ? { gaps: opts.encounter.gaps } : {}) })
    placeSetup(ctx, opts.encounter, {})
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
  // Custom battles field the row's default kit too (seam.items-per-unit) —
  // a fixture hero is the same hero as a scenario hero.
  heroes.forEach((h, i) => { state.units.push(makeUnit(id, 100 + i, `H${i}`, applyItems(UNITS[h.type]!, UNITS[h.type]!.defaultItems ?? [], ITEMS, ATTACKS, 'custom battle').def, h.hex)); id++ })
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
