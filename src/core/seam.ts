// The seam — where a strategic fact becomes a combat fact and a combat result
// becomes a strategic one. THIN-SLICE-IMPLEMENTATION.md §4, milestone M0.
//
//   EngagementSpec ─▶ battleOptionsOf ─▶ createBattle ─▶ runBattle ─▶ events
//                                                                        │
//   EngagementResult ◀──────────────────── makeBattleResult (a fold) ◀───┘
//
// Three facts this file is built on, all of them read from the engine rather
// than from the architecture document (§4.1–4.4):
//   · the engine takes OPTIONS, never a pre-built state, and seeds itself from
//     them — so the kingdom hands it a spec and a seed, and the seed is keyed by
//     what the battle IS (Law 4), never by a turn or a clock;
//   · the engine's BattleResult is two fields, so everything the Reckoning needs
//     is folded out of the event log, and the fold never reaches into Ctx;
//   · the two event vocabularies stay two. This fold is the translator.
//
// No campaign code. `makeBattleState(campaign, engagement, seed) → BattleOptions`
// is M1's; it will produce an EngagementSpec and call battleOptionsOf.

import { createBattle, runBattle, LEVELS, BADGES, rosterUids, isUnitUid } from '../engine.js'
import type { BattleOptions, Event, Outcome, Side, HeroProgress } from '../engine.js'
import { atlasFieldingOf } from '../content/atlas.js'
import { itemOf } from '../content/items.js'
import { fieldedModsOfRows, type FieldedMods } from './sets.js'
import { fieldedItemsOf, instanceSlotsOf } from './loadout.js'

const combatBadges = (badges: readonly string[] = []) => badges.filter(id => Object.hasOwn(BADGES, id))

/** A campaign-free fielding: everything a battle needs, nothing about a Campaign. */
export type EngagementSpec = {
  /** Names the fielding in errors and in the log's map.loaded. Never read by the rules. */
  readonly id: string
  readonly mapId: string
  /** Unit typeIds, hero side, in roster order — row i of the result is heroes[i]. */
  readonly heroes: readonly string[]
  /**
   * kingdom.encounter-result-fold (V2-ROADMAP R8): the engine uid each hero fields as, parallel to `heroes` — handed
   * to the engine as BattleOptions.heroUids, and the key the fold reads a hero's row back by (unit.enter uid), so the
   * row is heroes[i] whatever order the engine enters units in. Distinct unsigned 32-bit integers. Absent (a spec
   * built by hand), the fold keys the hero side's non-arriving units in entry order, as before.
   */
  readonly heroUids?: readonly number[]
  readonly heroHexes?: readonly number[]
  readonly enemies: readonly string[]
  readonly enemyHexes?: readonly number[]
  /** The battle's named seed. The caller derives it from what the engagement is. */
  readonly seed: number
  /**
   * sets.resolve (G8, 2026-09-03): what each hero's sets resolved to — unit-stat
   * mods and per-weapon damage, plain numbers, parallel to `heroes`. Resolved when
   * the hero is built for battle and WRITTEN here, never recomputed in battle
   * (2-ACTIONS-SETTLED.md 2026-09-02). Absent for a fielding named without a roster.
   * The engine's seam.unit-mods is unlanded, so battleOptionsOf cannot pass these yet.
   */
  readonly heroMods?: readonly FieldedMods[]
  /**
   * seam.loadout (G9, 2026-09-03): what each hero carries — the hero's `equipped` list, in
   * placement order, parallel to `heroes`. The engine applies the rows at
   * fielding (seam.items-per-unit): attacks granted, statModifiers folded. Absent
   * = every hero's Codex default kit, so a fielding named without a roster is
   * unchanged. "The items should go into battle" (7-KINGDOM-SETTLED.md 2026-09-02).
   */
  readonly heroItems?: readonly (readonly string[])[]
  /** v2.loadout (COMBAT-V2 §11.1): weapons and shields past the hands, stowed in item slots — they grant nothing until swapped in. Parallel to `heroes`; handed to the engine as heroStowed. */
  readonly heroStowed?: readonly (readonly string[])[]
  /**
   * v2.item-uses (engine cdb2233): uses each carried instance spent before this battle,
   * parallel to `heroes`, one count per engine instance (heroItems, then heroStowed) —
   * handed to the engine as heroItemsUsed. Absent when nothing is spent.
   */
  readonly heroItemsUsed?: readonly (readonly number[])[]
  /** Persistent campaign badges, in deployment order; the engine owns their effects. */
  readonly heroBadges?: readonly (readonly string[])[]
  /**
   * screens.after-battle (G12, 2026-09-03): how far each hero has come — level, specialty,
   * the level-5 pick — parallel to `heroes`; the engine folds the codex's level rows onto the
   * unit at fielding (hero assembly 2026-09-03). An entry is null for a hero at level 1 with
   * nothing chosen: the bare row, unchanged.
   */
  readonly heroProgress?: readonly (HeroProgress | null)[]
}

/**
 * kingdom.encounter-result-fold: why a row is not a roster row — `encounter`, one of the encounter's own units fielded
 * at setup (its enemies, the hero-side civilians); `arrival`, a unit that entered after the battle began (a schedule
 * row, a raised corpse). Read from unit.enter's `arrived` and whether a phase had begun. SWITCHES.md resultRowRole.
 */
export type TallyRole = 'encounter' | 'arrival'
export const TALLY_ROLES: readonly TallyRole[] = ['encounter', 'arrival']

/**
 * One unit's tally, folded from the log. Order: heroes, then enemies; on each side the roster rows in spec order,
 * then the rows that are not the roster's (`role`), in the order they entered.
 */
export type UnitTally = {
  readonly side: Side
  /** Position in spec.heroes or spec.enemies; for a row with a `role`, its place after the roster rows on its side. */
  readonly index: number
  /** The engine's unit id, for cross-reference into the log. */
  readonly unitId: number
  /** The engine's unit uid (unit.enter uid) — the fold's key. Absent on a row the outcome panel set. */
  readonly uid?: number
  /** Absent: a roster row (spec.heroes / spec.enemies). Present: not the roster's, never keyed to a deployed hero. */
  readonly role?: TallyRole
  readonly typeId: string
  readonly name: string
  /** Was ever downed. A hero can be downed and stand again; this remembers. */
  readonly downed: boolean
  readonly dead: boolean
  readonly lifeState: 'standing' | 'downed' | 'dead'
  readonly damageTaken: number
  readonly damageDealt: number
  /**
   * Opposing units this unit's damage reduced to zero — an enemy dying, a hero
   * going down. Bleeding out is credited to nobody: the clock did that.
   */
  readonly kills: number
  /**
   * kingdom.encounter-result-fold: went to zero and stood again at the Deathbed (deathbed.stood) — never downed, but
   * Wounded in the battle. Present only when true; a hero-side row's. SWITCHES.md foldDeathbedStood.
   */
  readonly stood?: true
}

/**
 * v2.item-uses: one item instance's spend in this battle — hero row `index`, engine
 * instance ordinal `instance` (heroItems then heroStowed; instanceSlotsOf maps it to the
 * equipped slot), the row, and the uses it paid. Only instances that paid appear.
 */
export type ItemUseRow = { readonly index: number; readonly instance: number; readonly itemId: string; readonly used: number }

export type EngagementResult = {
  readonly id: string
  readonly outcome: Outcome
  readonly turns: number
  readonly heroPhases: number
  readonly enemyPhases: number
  readonly units: readonly UnitTally[]
  /** How many events were folded — a check number for the log that produced this. */
  readonly events: number
  /** v2.item-uses: what each hero's item instances spent, folded from charge.spent. Absent = nothing spent (the panel's result). */
  readonly itemUses?: readonly ItemUseRow[]
}

/**
 * GAME-ARCHITECTURE.md §4 — "where every strategic fact becomes a combat fact."
 * The name is kept (the project cites it everywhere); what it produces is the
 * campaign-free fielding, which battleOptionsOf turns into the engine's own
 * options (§4.1 — the engine takes options, never a state). Roster → units by
 * each deployed hero's unitType, in deployment order, so row i of the result is
 * deployed[i]. Buildings → map features, threat → encounter, conditions →
 * battle condition arrive here when those systems exist.
 */
export function makeBattleState(
  roster: Readonly<Record<string, { unitType: string; badges?: readonly string[]; equipped?: readonly string[]; used?: readonly number[]; classes?: readonly string[]; level?: number; specialty?: string | null; levelPick?: number | null }>>,
  engagement: { id: string; mapId: string; enemies: readonly string[]; deployed: readonly string[]; seed: number; heroUids?: readonly number[] },
): EngagementSpec {
  const rows = engagement.deployed.map((heroId) => {
    const h = roster[heroId]
    if (!h) throw new Error(`${engagement.id}: deployed hero '${heroId}' is not on the roster`)
    return h
  })
  const heroes = rows.map((h) => h.unitType)
  // kingdom.encounter-result-fold: each deployed hero's engine uid, handed over explicitly — the caller's own, or the
  // engine's own numbering of a fielding that names none (rosterUids), so an unnamed fielding is the battle it was
  const heroUids = engagement.heroUids ? [...engagement.heroUids] : rosterUids(heroes.length, 0, {}).heroes
  if (heroUids.length !== heroes.length || heroUids.some((u) => !isUnitUid(u)) || new Set(heroUids).size !== heroUids.length) throw new Error(`${engagement.id}: hero uids [${heroUids.join(', ')}] are not ${heroes.length} distinct unsigned 32-bit integers`)
  const heroBadges = rows.map(h => combatBadges(h.badges))
  // the sets, resolved here — "looked up when the players are being built and shipped to combat"
  const heroMods = rows.map((h) => fieldedModsOfRows((h.equipped ?? []).map(itemOf)))
  // what is equipped is what is fielded — a hero row without `equipped` (a bare fielding) keeps its kit
  const carried = rows.every((h) => h.equipped) ? rows.map((h) => fieldedItemsOf(h.equipped!)) : null
  const heroProgress = rows.map((h) => progressOf(h))
  // v2.item-uses: the uses already spent, per engine instance — only when something is spent
  for (const h of rows) if (h.used && h.used.length !== (h.equipped?.length ?? -1)) throw new Error(`${engagement.id}: a hero's item uses (${h.used.length}) do not match its equipped items (${h.equipped?.length ?? 'none'})`)
  const heroItemsUsed = carried && rows.some((h) => h.used?.some((n) => n > 0)) ? rows.map((h) => instanceSlotsOf(h.equipped!).map((k) => h.used?.[k] ?? 0)) : null
  return {
    id: engagement.id, mapId: engagement.mapId, heroes, heroUids, enemies: [...engagement.enemies], seed: engagement.seed, heroMods,
    ...(carried ? { heroItems: carried.map((c) => c.fielded), heroStowed: carried.map((c) => c.stowed) } : {}),
    ...(heroProgress.some((p) => p) ? { heroProgress } : {}),
    ...(heroItemsUsed ? { heroItemsUsed } : {}),
    ...(heroBadges.some(b=>b.length) ? { heroBadges } : {}),
  }
}

/**
 * A hero's progress as the engine takes it: level, specialty, and the level-5 pick — the
 * pick is recorded on the hero as an INDEX and resolved here against the engine's own
 * level table, so the option's stat names have one owner (the pack). Null at level 1
 * with nothing chosen.
 */
export function progressOf(h: { classes?: readonly string[]; level?: number; specialty?: string | null; levelPick?: number | null }): HeroProgress | null {
  const level = h.level ?? 1
  if (level <= 1 && !h.specialty) return null
  const out: { level: number; specialtyId?: string; levelFivePick?: Readonly<Record<string, number>> } = { level }
  if (h.specialty) out.specialtyId = h.specialty
  if (h.levelPick !== null && h.levelPick !== undefined) {
    const cls = h.classes?.[0]
    const choice = cls ? LEVELS[cls]?.rows.find((r) => r.choice)?.choice : undefined
    const opt = choice?.[h.levelPick]
    if (!opt) throw new Error(`progress: pick ${h.levelPick} names no option on ${cls ?? 'no class'}'s choice row in the engine's level table`)
    out.levelFivePick = opt
  }
  return out
}

/** The joint §4.1 names: a spec becomes the engine's own options, nothing more. */
export function battleOptionsOf(spec: EngagementSpec): BattleOptions {
  const authored = atlasFieldingOf(spec.mapId)
  if (authored && ((!spec.heroHexes && spec.heroes.length > authored.deploymentSlots.heroes.length) || (!spec.enemyHexes && spec.enemies.length > authored.deploymentSlots.enemies.length))) throw new Error(`${spec.id}: authored deployment capacity exceeded`)
  return {
    scenarioId: spec.id,
    replicate: spec.seed,
    ...(authored ? { map: authored.setup.map, heroHexes: authored.deploymentSlots.heroes.slice(0,spec.heroes.length), enemyHexes: authored.deploymentSlots.enemies.slice(0,spec.enemies.length) } : { mapId: spec.mapId }),
    heroes: spec.heroes,
    // kingdom.encounter-result-fold: the heroes' identities, so the fold reads each hero's row back by uid
    ...(spec.heroUids ? { heroUids: [...spec.heroUids] } : {}),
    enemies: spec.enemies,
    enemyCount: spec.enemies.length,
    ...(spec.heroHexes ? { heroHexes: [...spec.heroHexes] } : {}),
    ...(spec.enemyHexes ? { enemyHexes: [...spec.enemyHexes] } : {}),
    // seam.loadout: the equipped lists go through as item ids; the engine reads its own rows for them
    ...(spec.heroItems ? { heroItems: spec.heroItems.map((l) => [...l]) } : {}),
    // v2.loadout: the stowed ride along as swap fodder; the engine grants nothing from them
    ...(spec.heroStowed ? { heroStowed: spec.heroStowed.map((l) => [...l]) } : {}),
    // v2.item-uses: the uses already spent ride along; the engine carries a spent instance spent
    ...(spec.heroItemsUsed ? { heroItemsUsed: spec.heroItemsUsed.map((l) => [...l]) } : {}),
    ...(spec.heroBadges?.some(l=>combatBadges(l).length) ? { heroBadges: spec.heroBadges.map(combatBadges) } : {}),
    // heroMods wait on the engine's seam.unit-mods — resolved and recorded on the spec, not fought
    ...(spec.heroProgress ? { heroProgress: spec.heroProgress.map((p) => p ?? undefined) } : {}),
  }
}

/**
 * The fold. Reads the event log and nothing else — not the Ctx, not the final
 * State. If a number cannot be derived from the log, the log is incomplete
 * (the same rule engine/src/sim/score.ts runs on), and a missing battle.end is
 * refused rather than defaulted (Law 9).
 */
export function makeBattleResult(spec: EngagementSpec, events: readonly Event[]): EngagementResult {
  type Row = {
    side: Side; index: number; unitId: number; uid: number; role?: TallyRole; typeId: string; name: string; stood?: true
    downed: boolean; dead: boolean; lifeState: 'standing' | 'downed' | 'dead'
    damageTaken: number; damageDealt: number; kills: number
  }
  const rows: Row[] = []
  const byUnit = new Map<number, Row>()
  const uids = new Set<number>()
  /** kingdom.encounter-result-fold: the roster rows entered, by side — the key is the uid (heroes) or the entry order (spec.enemies). */
  const entered: Record<Side, number> = { hero: 0, enemy: 0 }
  const heroSlot = spec.heroUids ? new Map(spec.heroUids.map((uid, i) => [uid, i] as const)) : null
  if (spec.heroUids && (spec.heroUids.length !== spec.heroes.length || heroSlot!.size !== spec.heroes.length)) throw new Error(`${spec.id}: the spec's hero uids [${spec.heroUids.join(', ')}] are not ${spec.heroes.length} distinct identities, one per hero`)
  const heroSeen = new Set<number>()
  /** Has the battle begun (battle.begin)? A unit that arrives before it is the encounter's own; after it, an arrival. */
  let begun = false
  /** Who last reduced each unit to zero — the damage event that mattered. */
  const lastToZero = new Map<number, number | null>()
  let outcome: Outcome | null = null
  let turns = 0
  let heroPhases = 0
  let enemyPhases = 0
  /** v2.item-uses: the spend per `index/instance`. */
  const spends = new Map<string, { index: number; instance: number; itemId: string; used: number }>()

  for (const e of events) {
    switch (e.type) {
      case 'battle.begin':
        begun = true
        break
      case 'unit.enter': {
        const side = e['side'] as Side
        const typeId = e['typeId'] as string
        const uid = e['uid']
        if (!isUnitUid(uid)) throw new Error(`${spec.id}: the engine fielded '${typeId}' with no uid — the fold keys every row by its uid`)
        if (uids.has(uid)) throw new Error(`${spec.id}: uid ${uid} entered twice`)
        uids.add(uid)
        let index = -1
        let role: TallyRole | undefined
        if (e['arrived'] !== undefined) {
          // the encounter's own units (setup) and the arrivals (a schedule row, a raised corpse): their own rows, never the roster's
          role = begun ? 'arrival' : 'encounter'
        } else if (side === 'hero') {
          index = heroSlot ? heroSlot.get(uid) ?? -1 : entered.hero
          if (index < 0) throw new Error(`${spec.id}: the engine fielded '${typeId}' (uid ${uid}) on the heroes' side, but the spec hands no hero that uid and it did not arrive — the fold cannot key it to the roster`)
          if (heroSeen.has(index)) throw new Error(`${spec.id}: hero ${index} entered twice`)
          heroSeen.add(index)
          entered.hero++
        } else {
          index = entered.enemy++
        }
        if (role === undefined) {
          const expected = (side === 'hero' ? spec.heroes : spec.enemies)[index]
          if (typeId !== expected) {
            throw new Error(`${spec.id}: the engine fielded '${typeId}' as ${side} ${index} but the spec names '${expected ?? '(nothing)'}' — the fold cannot key rows to the roster`)
          }
        }
        const row: Row = {
          side, index, unitId: e.actor!, uid, ...(role ? { role } : {}), typeId, name: e['name'] as string,
          downed: false, dead: false, lifeState: 'standing', damageTaken: 0, damageDealt: 0, kills: 0,
        }
        rows.push(row)
        byUnit.set(row.unitId, row)
        break
      }
      case 'charge.spent': {
        // v2.item-uses: the instance that paid. Its id is the engine's `<uid>/<n>` (engine
        // SWITCHES loadoutInstanceId); n is the instance ordinal the spec handed in.
        const id = e['instanceId']
        if (id === undefined) break
        const row = byUnit.get(e.actor!)
        // a unit that is not the roster's spends what the encounter gave it — nothing of the campaign's (SWITCHES.md resultRowRole)
        if (row?.role !== undefined) break
        const m = typeof id === 'string' ? /^(\d+)\/(\d+)$/.exec(id) : null
        if (!row || row.side !== 'hero' || !m || Number(m[1]) !== row.uid) throw new Error(`${spec.id}: charge.spent names item instance '${String(id)}', which is not one of hero unit ${e.actor}'s`)
        const key = `${row.index}/${m[2]}`
        const s = spends.get(key) ?? { index: row.index, instance: Number(m[2]), itemId: e['itemId'] as string, used: 0 }
        if (s.itemId !== e['itemId']) throw new Error(`${spec.id}: item instance '${id}' is named as both '${s.itemId}' and '${String(e['itemId'])}'`)
        s.used++
        spends.set(key, s)
        break
      }
      case 'phase.begin':
        if (e['phase'] === 'hero') heroPhases++; else enemyPhases++
        break
      case 'damage.applied': {
        const amount = e['amount'] as number
        const target = byUnit.get(e.target!)
        if (target) target.damageTaken += amount
        const actor = e.actor === null ? null : byUnit.get(e.actor) ?? null
        if (actor) actor.damageDealt += amount
        if ((e['hpAfter'] as number) <= 0) lastToZero.set(e.target!, e.actor)
        break
      }
      case 'life.downed':
      case 'life.dead': {
        const row = byUnit.get(e.target!)
        if (!row) break
        row.lifeState = e.type === 'life.dead' ? 'dead' : 'downed'
        if (e.type === 'life.dead') row.dead = true; else row.downed = true
        // kingdom.encounter-result-fold: a hero-side unit that dies went down first — at the Deathbed it may die without
        // bleeding (already Wounded, or no Hero badge: engine settle.ts 'dies'), with no life.downed (SWITCHES.md foldDeathbedDowned; withUnitFate's own rule)
        if (e.type === 'life.dead' && row.side === 'hero') row.downed = true
        if (e['reason'] === 'hp0') {
          const killer = lastToZero.get(row.unitId)
          const by = killer === null || killer === undefined ? null : byUnit.get(killer)
          if (by && by.side !== row.side) by.kills++
        }
        break
      }
      case 'deathbed.stood': {
        // kingdom.encounter-result-fold: down to zero and stood again at the Deathbed — never downed, but Wounded in the
        // battle (engine settle.ts), so the Reckoning's wound rule reaches it (SWITCHES.md foldDeathbedStood)
        const row = byUnit.get(e.target!)
        if (row && row.side === 'hero') row.stood = true
        break
      }
      case 'life.standing': {
        const row = byUnit.get(e.target!)
        if (row) row.lifeState = 'standing'
        break
      }
      case 'battle.end':
        outcome = e['outcome'] as Outcome
        turns = e['turn'] as number
        break
    }
  }
  if (outcome === null) throw new Error(`${spec.id}: the log has no battle.end — the battle did not finish, and a result cannot be folded from an unfinished log`)
  if (entered.hero !== spec.heroes.length || entered.enemy !== spec.enemies.length) {
    throw new Error(`${spec.id}: the spec names ${spec.heroes.length} heroes and ${spec.enemies.length} enemies; the log entered ${entered.hero} and ${entered.enemy}`)
  }
  // the rows that are not the roster's take the places after the roster rows on their side, in the order they entered
  const next: Record<Side, number> = { hero: spec.heroes.length, enemy: spec.enemies.length }
  for (const r of rows) if (r.role !== undefined) r.index = next[r.side]++
  // Explicit order (Law 6): heroes first, then enemies, each by index (indices are unique on a side).
  rows.sort((a, b) => (a.side === b.side ? a.index - b.index : a.side === 'hero' ? -1 : 1))
  const itemUses = [...spends.values()].sort((a, b) => a.index - b.index || a.instance - b.instance)
  return { id: spec.id, outcome, turns, heroPhases, enemyPhases, units: rows, events: events.length, ...(itemUses.length ? { itemUses } : {}) }
}

/**
 * The whole seam in one call: options → the engine → the fold. Pure in the
 * sense that matters — the same spec always resolves to the same result and
 * the same ledger — which is why the prefix is `resolve` and not `perform`.
 * The events come back beside the result for whoever wants the ledger: the
 * combat-state viewer, an export, a test.
 */
export function resolveEngagement(spec: EngagementSpec): { result: EngagementResult; events: Event[] } {
  const ctx = createBattle(battleOptionsOf(spec))
  const engine = runBattle(ctx)
  const result = makeBattleResult(spec, ctx.events)
  // The engine's own two fields and the fold's must agree, or the log is lying
  // about the battle it recorded — Law 3's replay property, checked at the seam.
  if (engine.outcome !== result.outcome || engine.turns !== result.turns) {
    throw new Error(`${spec.id}: the engine reports ${engine.outcome} in ${engine.turns} turns; the log folds to ${result.outcome} in ${result.turns}`)
  }
  // v2.item-uses: the engine's per-instance report and the fold's must agree too
  // kingdom.encounter-result-fold: a roster hero's instances, read by the row's own uid; what a unit that is not the
  // roster's spent is the encounter's, not the campaign's, and the fold leaves it out (SWITCHES.md resultRowRole)
  const uidOfHero = new Map(result.units.filter((u) => u.side === 'hero' && u.role === undefined).map((u) => [u.index, u.uid!] as const))
  const notRoster = new Set(result.units.filter((u) => u.role !== undefined).map((u) => u.uid!))
  const engineSpent = (engine.itemUses ?? []).filter((x) => x.used > 0 && !notRoster.has(Number(String(x.instanceId).split('/')[0]))).map((x) => `${x.instanceId}:${x.itemId}:${x.used}`).sort()
  const foldSpent = (result.itemUses ?? []).map((x) => `${uidOfHero.get(x.index)}/${x.instance}:${x.itemId}:${x.used}`).sort()
  if (engineSpent.join() !== foldSpent.join()) throw new Error(`${spec.id}: the engine reports item uses [${engineSpent.join(', ')}]; the log folds to [${foldSpent.join(', ')}]`)
  return { result, events: ctx.events }
}
