import { prepareCover } from './cover.js'
import { geometryOf, validBoard } from './hex.js'
import { makeRng, rootSeedOf, sample } from './rng.js'
import type { AuthoredMap, Ctx, EncounterDef, HeroProgress, Side, State, Unit, UnitDef, UnitMods, Config } from './types.js'
import { DEFAULT_CONFIG } from './types.js'
import { ACTIONS, BADGES, CRIT_CHART, ITEMS, LEVELS, RULE_BADGES, SPECIALTIES, UNITS, FIRST_BATTLE } from '../content/index.js'
import { applyItems, applyProgress, type Applied, FOLDABLE, applyBadges, type Badged, loadoutOf, itemUsesOf, instanceUsesLeft } from './items.js'
import { boardOf, decodeMap, deployOf, mapDef, terrainIdOf } from '../content/maps.js'
import { paintGround } from './ground.js'
import { STATUSES } from '../content/statuses.js'
import { AI_MODE_ROWS } from '../content/ai-modes.js'
import { triggersFrom } from './trigger.js'
import { applyUnitMods, emit, gainPower } from './mutate.js'
import { isStatName } from './stats.js'
import { arrive, heroDeployHexes, placeSetup } from './encounter.js'
import { rulesSideOf } from './side.js'
import { rosterUids, type UnitIdentityOptions } from './identity.js'
import { prepareAttackLines } from './los.js'
import { passableHexes } from './props.js'

export function makeUnit(id: number, uid: number, name: string, def: UnitDef, hex: number): Unit {
  for (const key of ['block','rangedBlock'] as const) if (def[key] !== undefined && !Number.isSafeInteger(def[key])) throw Error(`unit ${def.typeId}: invalid ${key}`)
  const actions = [...def.attacks, ...def.abilities, ...def.moves]
  return {
    id, uid, name, typeId: def.typeId, side: def.side, rowSide: def.rowSide ?? def.side, hex,
    hp: def.maxHp, maxHp: def.maxHp,
    armor: def.armor, resist: def.resist,
    ...(def.block !== undefined ? {block: def.block} : {}),
    ...(def.rangedBlock !== undefined ? {rangedBlock: def.rangedBlock} : {}),
    ...(def.fireResist !== undefined ? {fireResist: def.fireResist} : {}),
    ...(def.poisonResist !== undefined ? {poisonResist: def.poisonResist} : {}),
    ...(def.shadowResist !== undefined ? {shadowResist: def.shadowResist} : {}),
    ...(def.coldResist !== undefined ? {coldResist: def.coldResist} : {}),
    accuracy: def.accuracy, dodge: def.dodge, strength: def.strength, precision: def.precision, magic: def.magic, spirit: def.spirit,
    crit: def.crit ?? 0, luck: def.luck ?? 0, // station.crit 2026-08-27
    role: def.role,
    movement: def.movement, reach: def.reach,
    stamina: def.maxStamina, maxStamina: def.maxStamina, staminaRegen: def.staminaRegen,
    lifeState: 'standing', bleedOut: 0,
    toughness: def.toughness ?? 0,
    surge: def.surge ?? 0, surgeChance: 0,
    vision: def.vision ?? 0,
    ...(def.thorns ? { thorns: def.thorns } : {}),   // v2.thorns: absent on a bare body (snapshots unchanged)
    ...(def.swapCost !== undefined && def.swapCost !== 1 ? { swapCost: def.swapCost } : {}),   // v2.swap: absent = 1
    ...(def.bleedOutTurns ? { bleedOutTurns: def.bleedOutTurns } : {}), ...(def.deathbedFighting ? { deathbedFighting: def.deathbedFighting } : {}),   // fix.codex-numbers: absent = 0 (snapshots unchanged)
    auras: (def.auras ?? []).map((a) => ({ ...a })),
    summoned: false,
    // refactor.one-action-type (2026-09-04): ONE list — attacks, powers,
    // movements in the row's order — and the limits seeded from the ONE
    // registry for every kind alike: uses, and warmup (a warmup W is first
    // usable on Turn W+1 — isReady is `turn >= cooldowns[id]`).
    usesLeft: Object.fromEntries(actions.flatMap((a) => { const n = ACTIONS[a]?.uses; return n ? [[a, n]] : [] })),
    ai: def.ai,
    ...(def.aiChanges?.length ? { aiChanges: def.aiChanges.map((c) => ({ ...c, when: { ...c.when } })) } : {}),   // ai.mode-change: absent when none
    ...(def.noPrimaryAction ? { noPrimaryAction: true as const } : {}),   // capability.charge: absent when false (snapshots unchanged)
    actions,
    cooldowns: Object.fromEntries(actions.flatMap((a) => { const w = ACTIONS[a]?.warmup; return w ? [[a, w + 1]] : [] })),
    statuses: [],
    mods: [],
    triggers: triggersFrom(def.triggers ?? []),
    tags: def.tags ?? [],
    badges: [...(def.badges ?? [])],
    moveUsed: false, primaryUsed: false, movePointsLeft: 0,
    activationOrdinal: 0, attackOrdinal: 0, deathbedOrdinal: 0,
  }
}

export type BattleOptions = UnitIdentityOptions & {
  replicate: number
  variantId?: number
  cfg?: Partial<Config>
  strict?: boolean
  /** Force positions instead of rolling them — used by verification scenarios. */
  heroHexes?: number[]
  enemyHexes?: number[]
  /**
   * proving.plan-shape (2026-09-04, session 9's E6): the two deployment lines
   * a chosen distance apart, symmetric about the board's middle — the lines
   * move INWARD from their edges by depths that sum to (extent − 1 − gap), the
   * hero side taking the floor. Same edges, same sampling, same rolls; only the
   * depth changes. 1 ≤ gap ≤ extent − 1 along the deploy axis, or the fielding
   * is refused. Absent = the edges themselves (depth 0).
   */
  deployGap?: number
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
  /** Authored map data is authoritative, validated and detached; never inserted into a registry. */
  map?: AuthoredMap
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
   * v2.loadout (COMBAT-V2 §11.1, ruled 2026-09-07): the weapons and shields each
   * hero stows in its item slots, parallel to heroes. They grant nothing — swap
   * fodder for v2.swap. Anything not weapon or shield class is refused.
   */
  heroStowed?: readonly (readonly string[] | undefined)[]
  /**
   * v2.item-uses (V2 R6; DUNGEON-MODE-2026-09-07 §4 "the re-field skips it"): per hero,
   * per carried item instance — the handed list, then the stowed, the order that numbers
   * instanceIds — how many uses were already spent before this battle. An instance with
   * none left is carried spent: it folds nothing and grants nothing. Absent = all whole.
   */
  heroItemsUsed?: readonly (readonly number[] | undefined)[]
  /**
   * Hero assembly (2026-09-03): each fielded hero's level, specialty, pick and
   * drafted powers, in `heroes` order, parallel to heroItems. Absent = the
   * bare row. Folded by the one function, fieldedDef().
   */
  heroProgress?: readonly (HeroProgress | undefined)[]
  /** badge.mechanism (2026-09-04): the badges each hero carries in — the kingdom's list, parallel to heroes. Added to the row's own. */
  heroBadges?: readonly (readonly string[] | undefined)[]
  /**
   * seam.unit-mods (2026-09-25, GEAR-IMPLEMENTATION.md §1): per fielded hero, parallel to
   * heroes / heroHexes / heroItems — the numbers the caller resolved for THIS hero (the
   * kingdom's set bonuses, GEAR-DESIGN.md §5): stat mods naming their source, and +damage
   * on one carried weapon's attacks. Applied after the items (and badges), one
   * `unit.modified` per source. `overrides` is by unit TYPE; this is by fielded unit.
   * Absent, or an entry absent or empty = nothing changes. Checked loudly (Law 9).
   */
  heroMods?: readonly (UnitMods | undefined)[]
  /**
   * proving.side-override (2026-09-04). Ruled 2026-09-03 (the Proving): "I also
   * want to be able to do enemies against enemies and heroes against heroes ...
   * four zombies against four zombies." `byRow` (default): a row fielded on the
   * other side is refused, as always. `byList`: every unit in `heroes` fights
   * as a hero and every unit in `enemies` as an enemy, whatever its row says —
   * and follows the fielded side's rules (SWITCHES.md mirrorSideRules). The
   * unit.enter line names the row's own side as `rowSide` when they differ.
   */
  sides?: 'byRow' | 'byList'
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
  const grown = progress ? applyProgress(bare, progress, classOf(bare), LEVELS, SPECIALTIES, ACTIONS, `fieldedDef(${typeId})`, levelTableOf(bare)) : bare
  return applyItems(grown, items ?? bare.defaultItems ?? [], ITEMS, ACTIONS, `fieldedDef(${typeId})`).def
}

/** The class a hero row belongs to, read off its tags (`class.<x>`) — hero assembly. */
export function classOf(def: UnitDef): string {
  const tag = (def.tags ?? []).find((t) => t.startsWith('class.'))
  if (!tag) throw new Error(`${def.typeId} carries no class.* tag, so its level table cannot be found`)
  return tag
}

/**
 * The level table a hero levels on — progression.level-table-by-type
 * (2026-09-03): the row's own `levelTable` when it names one (a civilian TYPE,
 * civilian.farmer), else the class's. The class tag stays what it was; only
 * the curve moves.
 */
export function levelTableOf(def: UnitDef): string {
  return def.levelTable ?? classOf(def)
}

export function createBattle(opts: BattleOptions): Ctx {
  const cfg: Config = {
    ...DEFAULT_CONFIG,
    ...opts.cfg,
    switches: { ...DEFAULT_CONFIG.switches, ...(opts.cfg?.switches ?? {}) },
  }
  const rootSeed = rootSeedOf(FIRST_BATTLE.scenarioId, opts.variantId ?? 0, opts.replicate)
  const rng = makeRng(rootSeed, opts.strict ? { strict: true } : undefined)

  const direct = opts.map !== undefined
  const decoded = decodeMap(direct ? opts.map! : mapDef(opts.mapId ?? opts.encounter?.mapId ?? 'map.open'))
  const { id: mapId, board, deploy } = decoded
  if (direct && opts.mapId !== undefined && opts.mapId !== mapId) throw new Error(`map '${mapId}' differs from supplied mapId '${opts.mapId}'`)
  if (direct && opts.encounter?.mapId !== undefined && opts.encounter.mapId !== mapId) throw new Error(`encounter '${opts.encounter.id}' map '${opts.encounter.mapId}' differs from direct map '${mapId}'`)
  if (opts.encounter && 'board' in opts.encounter && (!validBoard(opts.encounter.board) || opts.encounter.board.width !== board.width || opts.encounter.board.height !== board.height)) throw new Error(`encounter '${opts.encounter.id}' board differs from map '${mapId}'`)
  const state: State = { turn: 0, phase: 'hero', mapId, board, terrain: decoded.terrain, props: decoded.props, ...(decoded.floor?{floor:decoded.floor}:{}), ...(decoded.entries?{entries:decoded.entries}:{}), units: [], outcome: null, seq: 0 }
  const initialMap = { ...(direct ? { terrain: [...state.terrain] } : {}), props: structuredClone(state.props), ...(state.floor?{floor:[...state.floor]}:{}), ...(state.entries?{entries:structuredClone(state.entries)}:{}) }
  const ctx: Ctx = { state, geo: geometryOf(board), events: [], rng, cfg, actions: ACTIONS, statuses: STATUSES, critChart: CRIT_CHART, items: ITEMS, badges: BADGES, ruleBadges: RULE_BADGES, aiModes: AI_MODE_ROWS, aiLog: [],
    units: UNITS, arrive: (c, d, hex, cause) => arrive(c, d, hex, cause, {}),
    ...(opts.encounter ? { encounter: direct ? structuredClone(opts.encounter) : opts.encounter } : {}) }
  prepareAttackLines(ctx)
  prepareCover(ctx)
  // the map's own painted ground ('b' burning, 'p' poisoned) — layers, painted before anyone stands
  // (fix.ground-one-funnel, review E2), named for the map
  for (const p of decoded.paint ?? []) paintGround(ctx, p.hexes, p.layer, mapId)
  const passable = passableHexes(ctx)

  const def = (t: string): UnitDef => ({ ...UNITS[t]!, ...(opts.overrides?.[t] ?? {}) })
  // proving.side-override: under byList the fielded side is the list's, not the row's
  // proving.side-override: the def copy carries the fielded side; the row's own side rides along as `rowSide` (proving.mirror-row-rules)
  const onSide = (d: UnitDef, side: Side): UnitDef => (opts.sides === 'byList' && d.side !== side ? { ...d, side, rowSide: d.side } : d)
  const heroes = opts.heroes ?? FIRST_BATTLE.heroes
  if (opts.heroProgress && opts.heroProgress.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroProgress.length} progress records — they must correspond`)
  }
  if (opts.heroBadges && opts.heroBadges.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroBadges.length} badge lists — they must correspond`)
  }
  if (opts.heroItems && opts.heroItems.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroItems.length} item lists — they must correspond`)
  }
  if (opts.heroItemsUsed && opts.heroItemsUsed.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroItemsUsed.length} item uses lists — they must correspond`)
  }
  if (opts.heroMods && opts.heroMods.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroMods.length} mod lists — they must correspond`)
  }
  if (opts.heroStowed && opts.heroStowed.length !== heroes.length) {
    throw new Error(`${opts.scenarioId ? `scenario '${opts.scenarioId}'` : 'battle options'}: ${heroes.length} heroes but ${opts.heroStowed.length} stowed lists — they must correspond`)
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
  const identities = rosterUids(heroes.length, enemies.length, opts)

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
      if (!passable(hex)) {
        throw new Error(`${where}: ${who} is placed on hex ${hex}, blocked by a high prop — impassable`)
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
  const byList = opts.sides === 'byList'
  const checkSides = (types: readonly string[], side: Side) => {
    for (const t of types) {
      const d = UNITS[t]
      if (!d) throw new Error(`${where}: unknown unit typeId '${t}' — units are an explicit registry, check content/index.ts`)
      if (byList) continue   // proving.side-override: the list decides the side
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
  //
  // board.deploy-edges (2026-09-04): each side deploys along the EDGE its map
  // names (heroes west, enemies east by default — ruled 2026-09-03; the older
  // maps say south/north). The edge line's passable hexes are sampled in
  // ascending order, exactly as the deployment ROW's columns were, so the
  // rolls are the same rolls.
  const passableLine = (edge: import('./hex.js').Edge, depth: number) =>
    ctx.geo.edgeLine(edge, depth).filter(passable)
  const availableLine = (edge: import('./hex.js').Edge, depth: number) => passableLine(edge, depth).filter(h => !taken.has(h))
  // proving.plan-shape: a named gap moves both lines inward, symmetric about the middle
  let heroDepth = 0, enemyDepth = 0
  if (opts.deployGap !== undefined) {
    const extent = deploy.hero === 'west' || deploy.hero === 'east' ? board.width : board.height
    if (!Number.isInteger(opts.deployGap) || opts.deployGap < 1 || opts.deployGap > extent - 1) throw new Error(`map '${mapId}' (${board.width}×${board.height}, ${deploy.hero}/${deploy.enemy}) cannot hold a deployment gap of ${opts.deployGap} — 1..${extent - 1}`)
    const inward = extent - 1 - opts.deployGap
    heroDepth = Math.floor(inward / 2)
    enemyDepth = inward - heroDepth
  }
  const heroLine = availableLine(deploy.hero, heroDepth)
  const zoneHexes = opts.encounter && !opts.heroHexes ? heroDeployHexes(ctx, opts.encounter, heroes.length, new Set(taken.keys())) : null
  // Only the ROLLED path needs a deployment edge wide enough. A scenario names
  // its own hexes (already validated above), so a map with a narrow edge is not
  // its problem — before this guard, an authored fielding could be refused for a
  // line it never used.
  if (!opts.heroHexes && !zoneHexes && heroLine.length < heroes.length) {
    throw new Error(`map '${mapId}' has only ${heroLine.length} passable hexes on its ${deploy.hero} edge, need ${heroes.length}`)
  }
  const heroDeploy = opts.heroHexes ?? zoneHexes ?? sample(rng, heroLine, heroes.length, 'hero-deployment')
  for (const hex of heroDeploy) taken.set(hex, 'hero deployment')
  // Preserve the physical entry-edge rule. Occupants can exhaust an otherwise
  // usable line, in which case deployment spills inward without overlapping.
  if (!opts.enemyHexes && passableLine(deploy.enemy, enemyDepth).length === 0) throw new Error(`map '${mapId}' has no passable hex on its ${deploy.enemy} edge`)
  const enemyLine = availableLine(deploy.enemy, enemyDepth)
  // More enemies than the edge holds spill one line inward, then the next —
  // each line rolled only when it is needed, so a battle that fits on the
  // edge draws exactly what it always drew.
  const enemyDeploy: number[] = opts.enemyHexes ? [] : sample(rng, enemyLine, enemyLine.length, 'enemy-placement')
  if (!opts.enemyHexes) {
    const extent = deploy.enemy === 'west' || deploy.enemy === 'east' ? board.width : board.height
    for (let depth = enemyDepth + 1; enemyDeploy.length < enemies.length && depth < extent; depth++) {
      if (passableLine(deploy.enemy, depth).length === 0) throw new Error(`map '${mapId}' cannot hold ${enemies.length} enemies inward from its ${deploy.enemy} edge`)
      const line = availableLine(deploy.enemy, depth)
      enemyDeploy.push(...sample(rng, line, line.length, 'enemy-placement', depth))   // keyed by the line — Law 4
    }
    if (enemyDeploy.length < enemies.length) throw new Error(`map '${mapId}' cannot hold ${enemies.length} enemies inward from its ${deploy.enemy} edge`)
  }

  let id = 0
  const equipped: { unitId: number; worn: (Applied['worn'][number] & { instanceId: string })[] }[] = []
  const grownLog: { unitId: number; table: string; level: number; specialtyId?: string; mods: Record<string, number> }[] = []
  const badgedLog: { unitId: number; worn: Badged['worn'] }[] = []
  const modsLog: { unitId: number; mods: UnitMods }[] = []
  // Names come from the DEF (the pack carries Codex names like "Oathblade
  // (TEST)"); a def without one falls back to its title-cased typeId. The old
  // hand-typed NAMES map died with the hand-typed party (2026-08-20).
  const label = (t: string) => t.split('-').map((w) => (w[0] ?? '').toUpperCase() + w.slice(1)).join(' ')
  const LETTERS = 'ABCDEFGH'
  const seen: Record<string, number> = {}
  // encounter.runner: an encounter may name where the heroes deploy
  heroes.forEach((t, i) => {
    const hex = heroDeploy[i]!
    const bare = onSide(def(t), 'hero')
    // Items at fielding (seam.items-per-unit): what the options hand this
    // hero, else the row's Codex default kit, else nothing — applied by the
    // one function before the unit is made. Enemies never take this path.
    const itemIds = opts.heroItems?.[i] ?? bare.defaultItems ?? []
    const progress = opts.heroProgress?.[i]
    const grown = progress ? applyProgress(bare, progress, classOf(bare), LEVELS, SPECIALTIES, ACTIONS, where, levelTableOf(bare)) : bare
    // v2.item-uses: the uses each carried instance has left; one handed in with none left
    // is carried spent — it folds nothing and grants nothing ("the re-field skips it",
    // DUNGEON-MODE-2026-09-07 §4). Instance ordinals count every item, spent or not.
    const uid = identities.heroes[i]!
    const stowedIds = opts.heroStowed?.[i] ?? []
    const uses = itemUsesOf(grown, uid, [...itemIds, ...stowedIds], opts.heroItemsUsed?.[i], ITEMS, ACTIONS, where)
    const kept = itemIds.flatMap((_, n) => (uses.spent.has(n) ? [] : [n]))
    const kitted = applyItems(grown, kept.map((n) => itemIds[n]!), ITEMS, ACTIONS, where)
    // badge.mechanism (2026-09-04): the row's own badges plus the list handed
    // over for this hero, folded after the kit so a badge sees the kitted hero
    const badgeIds = [...(kitted.def.badges ?? []), ...(opts.heroBadges?.[i] ?? [])]
    const badged = applyBadges(kitted.def, badgeIds, BADGES, where)
    const d = badged.def, worn = kitted.worn
    badgedLog.push({ unitId: id, worn: badged.worn })
    seen[t] = (seen[t] ?? 0)
    const nm = `${d.name ?? label(t)} ${LETTERS[seen[t]!] ?? seen[t]! + 1}`
    seen[t]!++
    // v2.loadout: the hands and the stowed, as instances. Only a hero that
    // carries something has a loadout (a bare row's snapshot is unchanged).
    const { loadout, instanceIds } = loadoutOf(grown, uid, itemIds, stowedIds, ITEMS, where, uses.spent)
    const made = makeUnit(id, uid, nm, d, hex)
    if (itemIds.length || loadout.stowed.length) made.loadout = loadout
    if (uses.entries.length) {
      // usesLeft of an item-granted power = the row's own uses (a power the bare row or a
      // badge already grants) + what the instances in reach can pay (SWITCHES.md itemUsesPool)
      made.itemUses = uses.entries
      const own = new Set([...grown.attacks, ...grown.abilities, ...grown.moves, ...badged.worn.flatMap((w) => w.grants)])
      for (const a of [...new Set(uses.entries.map((e) => e.actionId))]) {
        const n = (own.has(a) ? ACTIONS[a]!.uses! : 0) + instanceUsesLeft(ITEMS, made, a)
        if (n > 0) made.usesLeft[a] = n; else delete made.usesLeft[a]
      }
    }
    state.units.push(made)
    // seam.unit-mods: checked here, where the hero's kit is known; applied after its log lines
    const unitMods = opts.heroMods?.[i]
    if (unitMods) { checkUnitMods(unitMods, d, [...itemIds, ...stowedIds], `${where}: hero ${i} (${t})`); modsLog.push({ unitId: id, mods: unitMods }) }
    equipped.push({ unitId: id, worn: worn.map((w, j) => ({ ...w, instanceId: instanceIds[kept[j]!]! })) })
    if (progress) {
      // progression.level-table-by-type (2026-09-03), Law 12: the log says
      // which TABLE grew this hero and by how much — a farmer on
      // civilian.farmer and an orphan on class.civilian are told apart here.
      const mods: Record<string, number> = {}
      for (const k of FOLDABLE) {
        const delta = ((grown as unknown as Record<string, number | undefined>)[k] ?? 0) - ((bare as unknown as Record<string, number | undefined>)[k] ?? 0)
        if (delta !== 0) mods[k] = delta
      }
      grownLog.push({ unitId: id, table: levelTableOf(bare), level: progress.level, ...(progress.specialtyId ? { specialtyId: progress.specialtyId } : {}), mods })
    }
    id++
  })
  const seenEnemy: Record<string, number> = {}
  enemies.forEach((t, i) => {
    const hex = opts.enemyHexes?.[i] ?? enemyDeploy[i]!
    // Named from the def (Codex name) or the typeId, counted per type — Law 12:
    // the log names what a thing IS.
    // badge.mechanism: an enemy row's own badges fold at fielding too (an innate affliction, a named one)
    const row = onSide(def(t), 'enemy')
    const d = (row.badges?.length ? applyBadges(row, row.badges, BADGES, where).def : row)
    seenEnemy[t] = (seenEnemy[t] ?? 0) + 1
    state.units.push(makeUnit(id, identities.enemies[i]!, `${d.name ?? label(t)} ${seenEnemy[t]}`, d, hex))
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
      // proving.side-override: a unit fielded against its row's side says so (Law 12)
      ...(u.rowSide !== u.side ? { rowSide: u.rowSide } : {}),
      // v2.loadout: unit.equipped means in hand (V2 §15.2); the stowed are named here
      ...(u.loadout?.stowed.length ? { stowed: u.loadout.stowed.map((x) => ({ ...x })) } : {}),
      // v2.item-uses: the instances carried in already spent, named once here (Law 12)
      ...(u.itemUses?.some((e) => e.left === 0) ? { spent: [...new Set(u.itemUses.filter((e) => u.itemUses!.filter((x) => x.instanceId === e.instanceId).every((x) => x.left === 0)).map((e) => e.instanceId))] } : {}),
    })
    // seam.items-per-unit: one unit.equipped per (unit, item), after the
    // unit's own enter line — the log says why the Hunter shoots and why his
    // Health is 9 (Law 12). Cause = the item.
    for (const w of equipped.find((e) => e.unitId === u.id)?.worn ?? []) {
      emit(ctx, 'unit.equipped', w.itemId, { actor: u.id, itemId: w.itemId, instanceId: w.instanceId, grants: w.grants, abilities: w.abilities, mods: w.mods, ...(w.gaps ? { gaps: w.gaps } : {}) })
    }
    // progression.level-table-by-type: one unit.grown per grown hero, cause = the table
    const g = grownLog.find((e) => e.unitId === u.id)
    if (g) emit(ctx, 'unit.grown', g.table, { actor: u.id, table: g.table, level: g.level, ...(g.specialtyId ? { specialtyId: g.specialtyId } : {}), mods: g.mods })
    // badge.mechanism: one unit.badged per (unit, badge), cause = the badge (Law 12)
    for (const w of badgedLog.find((e) => e.unitId === u.id)?.worn ?? []) {
      emit(ctx, 'unit.badged', w.badgeId, { actor: u.id, badgeId: w.badgeId, grants: w.grants, mods: w.mods, flags: BADGES[w.badgeId]?.flags ?? {}, ...(w.gaps ? { gaps: w.gaps } : {}) })
    }
    // seam.unit-mods: one unit.modified per (unit, source), after the kit and badge lines
    const um = modsLog.find((e) => e.unitId === u.id)
    if (um) applyUnitMods(ctx, u.id, um.mods)
    // capability.power-pool (2026-09-03): a unit fielded at setup arrives too
    const arrival = UNITS[u.typeId]?.powerOnArrival
    if (arrival && rulesSideOf(ctx, u) === 'enemy') gainPower(ctx, arrival, u.typeId, { kind: 'arrival', actor: u.id })
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
  // board.variable-size: the log names the board — the viewer lays out from these two numbers, never a constant
  // proving.plan-shape: a named deployment gap is on the line (Law 12) — absent otherwise, so every standard battle stays byte-identical
  const gap = opts.deployGap !== undefined ? { gap: opts.deployGap } : {}
  emit(ctx, 'map.loaded', mapId, opts.scenarioId
    ? { mapId, scenarioId: opts.scenarioId, width: board.width, height: board.height, deploy, ...gap, ...terrainCensus(state.terrain), ...initialMap }
    : { mapId, width: board.width, height: board.height, deploy, ...gap, ...terrainCensus(state.terrain), ...initialMap })
  return ctx
}

/**
 * seam.unit-mods: a hero's per-unit numbers, refused loudly when they could not mean
 * anything (Law 9) — an unknown stat, a non-integer (Law 7), an unnamed source (Law 12),
 * a weapon bonus on an item the hero does not carry or one that grants no attack, a
 * pool driven below its floor.
 */
function checkUnitMods(m: UnitMods, d: UnitDef, carried: readonly string[], where: string): void {
  const pools: Record<string, number> = { maxHp: d.maxHp, maxStamina: d.maxStamina, staminaRegen: d.staminaRegen }
  for (const s of m.stats ?? []) {
    if (!isStatName(s.stat)) throw new Error(`${where}: mod stat '${s.stat}' is not a stat the engine knows`)
    if (!Number.isSafeInteger(s.add)) throw new Error(`${where}: mod ${s.stat} ${s.add} is not an integer`)
    if (typeof s.source !== 'string' || !s.source) throw new Error(`${where}: mod ${s.stat} ${s.add} names no source`)
    if (s.stat in pools) pools[s.stat]! += s.add
  }
  if (pools['maxHp']! < 1 || pools['maxStamina']! < 0 || pools['staminaRegen']! < 0) throw new Error(`${where}: mods drive a pool below its floor (${JSON.stringify(pools)})`)
  for (const a of m.attacks ?? []) {
    if (!Number.isSafeInteger(a.damage)) throw new Error(`${where}: weapon bonus ${a.damage} on '${a.itemId}' is not an integer`)
    if (typeof a.source !== 'string' || !a.source) throw new Error(`${where}: weapon bonus on '${a.itemId}' names no source`)
    if (!carried.includes(a.itemId)) throw new Error(`${where}: weapon bonus from '${a.source}' — the hero does not carry '${a.itemId}'`)
    if (!(ITEMS[a.itemId]?.grants ?? []).some((g) => ACTIONS[g]?.attack)) throw new Error(`${where}: weapon bonus from '${a.source}' — '${a.itemId}' grants no attack`)
  }
}

/** Custom rosters, for verification scenarios. */
export function createCustomBattle(
  heroes: { type: string; hex: number }[],
  enemies: { type: string; hex: number }[],
  opts: UnitIdentityOptions & { replicate?: number; cfg?: Partial<Config>; strict?: boolean; mapId?: string } = {},
): Ctx {
  const identities = rosterUids(heroes.length, enemies.length, opts)
  const cfg: Config = {
    ...DEFAULT_CONFIG, ...opts.cfg,
    switches: { ...DEFAULT_CONFIG.switches, ...(opts.cfg?.switches ?? {}) },
  }
  const rng = makeRng(rootSeedOf(99, 0, opts.replicate ?? 0), opts.strict ? { strict: true } : undefined)
  const mapId = opts.mapId ?? 'map.open'
  const board = boardOf(mapId)
  const decoded = decodeMap(mapDef(mapId))
  const state: State = { turn: 0, phase: 'hero', mapId, board, terrain: decoded.terrain, props: decoded.props, ...(decoded.floor?{floor:decoded.floor}:{}), ...(decoded.entries?{entries:decoded.entries}:{}), units: [], outcome: null, seq: 0 }
  const ctx: Ctx = { state, geo: geometryOf(board), events: [], rng, cfg, actions: ACTIONS, statuses: STATUSES, critChart: CRIT_CHART, items: ITEMS, badges: BADGES, ruleBadges: RULE_BADGES, aiModes: AI_MODE_ROWS, aiLog: [],
    units: UNITS, arrive: (c, d, hex, cause) => arrive(c, d, hex, cause, {}) }
  prepareAttackLines(ctx)
  prepareCover(ctx)
  for (const p of decoded.paint ?? []) paintGround(ctx, p.hexes, p.layer, mapId)   // the map's painted ground, as createBattle
  let id = 0
  // Custom battles field the row's default kit too (seam.items-per-unit) —
  // a fixture hero is the same hero as a scenario hero.
  heroes.forEach((h, i) => { state.units.push(makeUnit(id, identities.heroes[i]!, `H${i}`, applyItems(UNITS[h.type]!, UNITS[h.type]!.defaultItems ?? [], ITEMS, ACTIONS, 'custom battle').def, h.hex)); id++ })
  enemies.forEach((e, i) => { const d = UNITS[e.type]!; state.units.push(makeUnit(id, identities.enemies[i]!, `E${i}`, d.badges?.length ? applyBadges(d, d.badges, BADGES, 'custom battle').def : d, e.hex)); id++ })
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
  emit(ctx, 'map.loaded', mapId, { mapId, width: board.width, height: board.height, deploy: deployOf(mapId), ...terrainCensus(state.terrain), props: structuredClone(state.props), ...(state.floor?{floor:[...state.floor]}:{}), ...(state.entries?{entries:structuredClone(state.entries)}:{}) })
  return ctx
}
