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

import { createBattle, runBattle } from '../engine.js'
import type { BattleOptions, Event, Outcome, Side } from '../engine.js'

/** A campaign-free fielding: everything a battle needs, nothing about a Campaign. */
export type EngagementSpec = {
  /** Names the fielding in errors and in the log's map.loaded. Never read by the rules. */
  readonly id: string
  readonly mapId: string
  /** Unit typeIds, hero side, in roster order — row i of the result is heroes[i]. */
  readonly heroes: readonly string[]
  readonly heroHexes?: readonly number[]
  readonly enemies: readonly string[]
  readonly enemyHexes?: readonly number[]
  /** The battle's named seed. The caller derives it from what the engagement is. */
  readonly seed: number
}

/** One unit's tally, folded from the log. Order: heroes in spec order, then enemies. */
export type UnitTally = {
  readonly side: Side
  /** Position in spec.heroes or spec.enemies. */
  readonly index: number
  /** The engine's unit id, for cross-reference into the log. */
  readonly unitId: number
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
}

export type EngagementResult = {
  readonly id: string
  readonly outcome: Outcome
  readonly turns: number
  readonly heroPhases: number
  readonly enemyPhases: number
  readonly units: readonly UnitTally[]
  /** How many events were folded — a check number for the log that produced this. */
  readonly events: number
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
  roster: Readonly<Record<string, { unitType: string }>>,
  engagement: { id: string; mapId: string; enemies: readonly string[]; deployed: readonly string[]; seed: number },
): EngagementSpec {
  const heroes = engagement.deployed.map((heroId) => {
    const h = roster[heroId]
    if (!h) throw new Error(`${engagement.id}: deployed hero '${heroId}' is not on the roster`)
    return h.unitType
  })
  return { id: engagement.id, mapId: engagement.mapId, heroes, enemies: [...engagement.enemies], seed: engagement.seed }
}

/** The joint §4.1 names: a spec becomes the engine's own options, nothing more. */
export function battleOptionsOf(spec: EngagementSpec): BattleOptions {
  return {
    scenarioId: spec.id,
    replicate: spec.seed,
    mapId: spec.mapId,
    heroes: spec.heroes,
    enemies: spec.enemies,
    enemyCount: spec.enemies.length,
    ...(spec.heroHexes ? { heroHexes: [...spec.heroHexes] } : {}),
    ...(spec.enemyHexes ? { enemyHexes: [...spec.enemyHexes] } : {}),
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
    side: Side; index: number; unitId: number; typeId: string; name: string
    downed: boolean; dead: boolean; lifeState: 'standing' | 'downed' | 'dead'
    damageTaken: number; damageDealt: number; kills: number
  }
  const rows: Row[] = []
  const byUnit = new Map<number, Row>()
  const entered: Record<Side, number> = { hero: 0, enemy: 0 }
  /** Who last reduced each unit to zero — the damage event that mattered. */
  const lastToZero = new Map<number, number | null>()
  let outcome: Outcome | null = null
  let turns = 0
  let heroPhases = 0
  let enemyPhases = 0

  for (const e of events) {
    switch (e.type) {
      case 'unit.enter': {
        const side = e['side'] as Side
        const index = entered[side]++
        const expected = (side === 'hero' ? spec.heroes : spec.enemies)[index]
        const typeId = e['typeId'] as string
        if (typeId !== expected) {
          throw new Error(`${spec.id}: the engine fielded '${typeId}' as ${side} ${index} but the spec names '${expected ?? '(nothing)'}' — the fold cannot key rows to the roster`)
        }
        const row: Row = {
          side, index, unitId: e.actor!, typeId, name: e['name'] as string,
          downed: false, dead: false, lifeState: 'standing', damageTaken: 0, damageDealt: 0, kills: 0,
        }
        rows.push(row)
        byUnit.set(row.unitId, row)
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
        if (e['reason'] === 'hp0') {
          const killer = lastToZero.get(row.unitId)
          const by = killer === null || killer === undefined ? null : byUnit.get(killer)
          if (by && by.side !== row.side) by.kills++
        }
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
  // Explicit order (Law 6): heroes first, then enemies, each in spec order.
  rows.sort((a, b) => (a.side === b.side ? a.index - b.index : a.side === 'hero' ? -1 : 1))
  return { id: spec.id, outcome, turns, heroPhases, enemyPhases, units: rows, events: events.length }
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
  return { result, events: ctx.events }
}
