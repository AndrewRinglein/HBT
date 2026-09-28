// The turn loop.
//   Turn = Hero Phase then Enemy Phase. Turn is the numbered one.
//   Each unit gets one Activation: movement, then a primary action.

import { runActivation } from '../ai/modes.js'
import { sideStep } from '../ai/side-brain.js'
import { beginActivation, beginTurn, emit, endActivation, expireActivationMods, gainStamina, layerAt, regenStamina, reopenSurgeCycle, setOutcome, setPhase } from './mutate.js'
import { roll100 } from './rng.js'
import { appliesOnActivationEndOf, layerAppliesOnActivationEnd, layerIdOf, stripsOnActivationEndOf, terrainIdOf } from '../content/maps.js'
import { advanceBleedOuts, checkVictory, settle } from './settle.js'
import { advanceBand, fireSchedule, landFalls, markFalls, startOfTurn } from './encounter.js'
import { heroesLight } from './vision.js'
import { applyStatus, isBlocked, reduceStatus, tickUnitStatuses } from './status.js'
import { HOOKS, fireTriggers } from './trigger.js'
import { applyGroundHazard } from './ground.js'
import type { BattleCursor, Ctx, EndOfPhaseRung, Side } from './types.js'
import { END_OF_PHASE_RUNGS, MAX_SURGE_CYCLES, SURGE_COST, isEndOfPhaseLadder } from './types.js'
import { activationChoices, controllerOf, type ControlPolicy } from './control.js'
import { rulesSideOf } from './side.js'

function activationOrder(ctx: Ctx, side: Side): number[] {
  // Switch: fixed by unit id. `random` and `best-first` are the alternatives.
  return ctx.state.units
    .filter((u) => u.side === side && u.lifeState === 'standing')
    .map((u) => u.id)
    .sort((a, b) => a - b)
}

/**
 * The End of Activation ladder — born 2026-08-20 with water (it was 0 of 2 rungs).
 *
 * | # | Rung |
 * |---|---|
 * | 1 | Terrain strips — the occupied hex reduces the statuses its terrain names |
 * | 2 | Tile effects — terrain APPLIES (born with burning ground, 2026-08-20):
 * |   | the occupied hex applies the statuses its terrain names. This is the
 * |   | rung AIRWALK will gate: an airwalking unit "is not going to trigger
 * |   | anything at the end of activation for whatever tile they're standing
 * |   | on" (ruled 2026-08-20) — it will skip rung 2, never rung 1. |
 *
 * Runs for EVERY unit that activated, including blocked ones — a stunned hero
 * standing in the river still soaks, and one standing in embers still sears.
 * GAME-DESIGN §4 relies on this preceding the status tick: reach water and you
 * shed Burn BEFORE it deals damage this turn — and catch fire and it BURNS this
 * turn. (The old early-return on empty strips is gone: it would have silently
 * eaten the applies rung on strip-free terrain.)
 */
// Exported 2026-08-21 (landing movement.flight) so tests can prove the rung
// fires on a flight LANDING — "where you LAND is a hex like any other". No
// behaviour change; the loop below calls it exactly as before.
export function endOfActivation(ctx: Ctx, unitId: number): void {
  const u = ctx.state.units[unitId]!
  if (u.lifeState !== 'standing') return
  if (ctx.state.outcome) return   // fix.post-end-ladder: nothing after battle.end
  const t = ctx.state.terrain[u.hex] ?? 0
  const strips = stripsOnActivationEndOf(t)
  for (const sid of strips) reduceStatus(ctx, unitId, sid, 1, terrainIdOf(t))
  const applies = appliesOnActivationEndOf(t)
  for (const [sid, n] of applies) applyStatus(ctx, unitId, sid, n, terrainIdOf(t))
  // the painted layer, through the same funnel (capability.ground-layers, 2026-09-03)
  const layer = layerAt(ctx, u.hex)
  for (const [sid, n] of layerAppliesOnActivationEnd(layer)) applyStatus(ctx, unitId, sid, n, layerIdOf(layer))
  // V2 hazard (v2.ground-table, §3.2): lava's second beat — "and again at end of
  // activation if still there". The ground rungs' last line, before the triggers.
  if (applyGroundHazard(ctx, unitId, u.hex)) {
    settle(ctx, terrainIdOf(t))
    if (u.lifeState !== 'standing' || ctx.state.outcome) return
  }
  // Rung 2 — `onActivationEnd` triggers fire (fix.activation-end-fires,
  // 2026-09-03). The hook was in HOOKS, validated, glossed and never called —
  // "indistinguishable from a working one until a piece of content depends on
  // it" (COMBAT-SEQUENCE, End of Activation rung 2). Fires ONCE per
  // Activation for the unit that acted, whatever it did — an idle (stunned)
  // unit reaches here too, through the isBlocked branch in runPhase. Sits
  // between the terrain rungs and the status tick, as the ladder orders it.
  // The ordinal is the activation's, so the RNG key is structural (Law 4).
  fireTriggers(ctx, 'onActivationEnd', {
    ownerId: unitId, targetId: null, causeId: 'activation.end', ordinal: u.activationOrdinal,
    keyTag: HOOKS.indexOf('onActivationEnd'),
  })
  if (u.lifeState !== 'standing') return   // a trigger may have killed its owner
  // Rung 3 — THE STATUS TICK, moved here from End of Phase (RULED 2026-08-26:
  // "statuses are supposed to resolve at the end of each unit's activation...
  // a unit can die at the end of its activation"). Runs AFTER the terrain
  // rungs, so the water promise holds per-activation: reach the river and the
  // Burn is shed before it deals this activation's damage — and stand on the
  // embers and you catch before you cook. Each unit still ticks exactly once
  // per Turn; the timing moved, not the frequency. When Surge lands, the
  // whole ladder — this rung included — waits for the surge loop to finish
  // (2026-08-21): a surged unit never ticks twice.
  tickUnitStatuses(ctx, unitId)
  settle(ctx, terrainIdOf(t))
}

/**
 * The End of Phase rungs that are built — COMBAT-SEQUENCE §End of Hero Phase.
 * fix.phase-ladder-config (2026-09-25): the ladder is `cfg.switches.endOfPhaseLadder`,
 * an ordered list of these names, so reordering it is a sweep axis rather than a diff.
 * The default is the document's order and the order this function always ran.
 *
 *   1. auras  2. corpses — not rungs yet (COMBAT-SEQUENCE: *not yet*)
 *   3. status ticks — MOVED to the End of Activation ladder (ruled 2026-08-26; see
 *      endOfActivation above). The phase ladder no longer touches statuses.
 *   4. durations — travel with the per-activation status pass (see status.ts)
 */
const END_OF_PHASE: Record<EndOfPhaseRung, { sides: readonly Side[]; run: (ctx: Ctx, side: Side) => void }> = {
  // 4b. bleed-out. Angela 2026-08-15: the counter advances at End of Hero Phase,
  //     and only there — not at Start of Turn, and not on the enemy phase. So a
  //     downed hero's five ticks are five HERO phases, which is the window a
  //     rescue actually has.
  bleedOut: { sides: ['hero'], run: (ctx) => advanceBleedOuts(ctx) },
  // 5. stamina regen (heroes only; enemies do not run stamina)
  staminaRegen: {
    sides: ['hero', 'enemy'],
    run: (ctx, side) => {
      for (const u of ctx.state.units) {
        if (u.side === side && u.lifeState === 'standing' && u.maxStamina > 0) {
          regenStamina(ctx, u.id, 'phase.end')
        }
      }
    },
  },
  // 6. victory check
  victoryCheck: { sides: ['hero', 'enemy'], run: (ctx) => { checkVictory(ctx, 'phase.end') } },
}

/** The configured ladder, refused loudly unless it is every built rung exactly once (Law 9). */
function endOfPhaseLadder(ctx: Ctx): readonly EndOfPhaseRung[] {
  const ladder: unknown = ctx.cfg.switches.endOfPhaseLadder
  if (!isEndOfPhaseLadder(ladder)) {
    throw new Error(`End of Phase ladder ${JSON.stringify(ladder)} must name every built rung exactly once: ${END_OF_PHASE_RUNGS.join(', ')}`)
  }
  return ladder
}

/** The End of Phase ladder: the configured rungs, in order, each on the sides it serves. */
function endOfPhase(ctx: Ctx, side: Side): void {
  if (ctx.state.outcome) return
  const ladder = endOfPhaseLadder(ctx)
  emit(ctx, 'phase.end.begin', 'engine', { side })
  for (const rung of ladder) {
    const r = END_OF_PHASE[rung]
    if (!r.sides.includes(side)) continue
    if (ctx.cfg.switches.phaseRungLog) emit(ctx, 'phase.rung', 'phase.end', { side, rung })
    r.run(ctx, side)
    if (ctx.state.outcome) return
  }
  emit(ctx, 'phase.end.done', 'engine', { side })
}

export type BattleResult = {
  outcome: import('./types.js').Outcome
  turns: number
  /** capability.charges: every use spent this Battle, so the kingdom can restock — unit, power, and how many. */
  usesSpent: { unit: number; power: string; spent: number }[]
  /**
   * v2.item-uses (V2 R6): every carried instance with uses — what it paid this Battle
   * and what it has left (0 = spent), including one handed in already spent. Absent
   * when no unit carries such an item. The kingdom folds it into its record.
   */
  itemUses?: { unit: number; instanceId: string; itemId: string; power: string; used: number; left: number }[]
}

function resultOf(ctx: Ctx): BattleResult {
  const usesSpent: BattleResult['usesSpent'] = []
  for (const u of ctx.state.units) for (const [power, spent] of Object.entries(u.usesSpentThisBattle ?? {})) usesSpent.push({ unit: u.id, power, spent })
  const itemUses: NonNullable<BattleResult['itemUses']> = []
  for (const u of ctx.state.units) for (const e of u.itemUses ?? []) itemUses.push({ unit: u.id, instanceId: e.instanceId, itemId: e.itemId, power: e.actionId, used: e.used, left: e.left })
  return { outcome: ctx.state.outcome ?? 'capped', turns: ctx.state.turn, usesSpent, ...(itemUses.length ? { itemUses } : {}) }
}

export type BattleAdvance = { kind: 'acting'; actor: number } | { kind: 'complete'; result: BattleResult }

export type ControlledBattleAdvance = BattleAdvance | {kind:'selecting';unitUids:number[]}

function cursorOf(ctx: Ctx): BattleCursor {
  return ctx.battleCursor ??= {
    at: 'battle-start', phase: 'hero', order: [], next: 0, actor: null, surgeLink: 0, surged: false, movementAllowance: 0,
  }
}

/**
 * Run automatic lifecycle transitions until an action cycle needs its actor,
 * or combat is complete. Calling this again while awaiting that actor is a
 * pure read. A trusted policy additionally pauses before a human activation.
 * The driver must complete the cycle explicitly after executing it.
 */
export function advanceBattle(ctx: Ctx): BattleAdvance
export function advanceBattle(ctx: Ctx, policy: ControlPolicy): ControlledBattleAdvance
export function advanceBattle(ctx: Ctx, policy?: ControlPolicy): ControlledBattleAdvance {
  const c = cursorOf(ctx)
  while (true) {
    if (ctx.state.outcome) c.at = 'complete'
    switch (c.at) {
      case 'battle-start':
        emit(ctx, 'battle.begin', 'engine', {})
        for (const u of ctx.state.units) fireTriggers(ctx, 'startOfBattle', { ownerId: u.id, targetId: null, causeId: 'battle.begin', ordinal: 0, keyTag: HOOKS.indexOf('startOfBattle') })
        settle(ctx, 'engine')
        c.at = 'turn-start'
        break
      case 'turn-start':
        if (ctx.state.outcome) { c.at = 'complete'; break }
        if (ctx.state.turn >= ctx.cfg.turnCap) {
          setOutcome(ctx, 'capped', 'engine')
          c.at = 'complete'
          break
        }
        beginTurn(ctx, 'engine')
        // Arrivals, their start hooks and settle precede objectives and heroes.
        startOfTurn(ctx)
        c.at = ctx.state.outcome ? 'complete' : 'hero-start'
        break
      case 'hero-start':
        heroesLight(ctx, 'phase.hero')
        c.phase = 'hero'
        setPhase(ctx, c.phase, 'engine')
        sideStep(ctx, c.phase)   // ai.encounter-rules: the side step, before any Activation of the Phase
        c.order = activationOrder(ctx, c.phase)
        c.next = 0
        c.at = 'next-activation'
        break
      case 'enemy-arrivals':
        fireSchedule(ctx, 'enemyPhase')
        c.at = ctx.state.outcome ? 'complete' : 'enemy-start'
        break
      case 'enemy-start':
        c.phase = 'enemy'
        setPhase(ctx, c.phase, 'engine')
        sideStep(ctx, c.phase)   // ai.encounter-rules: the side step, before any Activation of the Phase
        c.order = activationOrder(ctx, c.phase)
        c.next = 0
        c.at = 'next-activation'
        break
      case 'next-activation': {
        if (c.next >= c.order.length) { c.at = 'phase-end'; break }
        if (ctx.state.outcome) { c.at = 'complete'; break }
        const next = ctx.state.units[c.order[c.next]!]!
        if (next.lifeState !== 'standing') { c.next++; break }
        if (policy && !isBlocked(ctx,next) && controllerOf(ctx,next.id,policy)==='human') c.at='selecting'
        else c.at='activation-start'
        break
      }
      case 'selecting': {
        const next=ctx.state.units[c.order[c.next]!]!
        // An automatic driver may resume a waiting save in its fixed order.
        // A changed ownership/status likewise returns to normal lifecycle.
        if (!policy || next.lifeState!=='standing' || isBlocked(ctx,next) || controllerOf(ctx,next.id,policy)!=='human') { c.at='activation-start'; break }
        return {kind:'selecting',unitUids:activationChoices(ctx,policy)}
      }
      case 'activation-start': {
        const id = c.order[c.next++]!
        const u = ctx.state.units[id]!
        if (u.lifeState !== 'standing') { c.at='next-activation'; break }
        c.actor = id
        c.surgeLink = 0
        c.surged = false
        beginActivation(ctx, id, 'engine')
        c.movementAllowance = u.movePointsLeft
        if (isBlocked(ctx, u)) {
          emit(ctx, 'activation.idle', 'status', { actor: id, reason: 'cannot act' })
          c.at = 'activation-end'
        } else c.at = 'acting'
        break
      }
      case 'acting':
        if (c.actor === null) throw new Error('acting cursor has no actor')
        return { kind: 'acting', actor: c.actor }
      case 'surge-check': {
        const id = c.actor!
        const u = ctx.state.units[id]!
        if (u.lifeState !== 'standing' || isBlocked(ctx, u) || rulesSideOf(ctx, u) !== 'hero' || u.surge <= 0) {
          c.at = 'activation-end'
          break
        }
        if (c.surgeLink >= MAX_SURGE_CYCLES) throw new Error(`Surge cycle overflow for unit ${u.uid}: ${MAX_SURGE_CYCLES} cycles in one activation`)
        const link = c.surgeLink
        // fix.surge-spend (2026-09-28; ruled 2026-09-27, DECISIONS.md "Surge: a pool that
        // pays 100 per Surge"): the amount (surgeChance) gains Surge and the check rolls
        // against it; a Surge takes away SURGE_COST, it does not empty the amount. 150
        // surges without a roll and keeps 50. Below 100: SWITCHES.md surgeSpendFloorsAtZero.
        // A further link in the same Activation: SWITCHES.md surgeRelinkReadsLeftover.
        const before = u.surgeChance
        const relinkAlone = link > 0 && !ctx.cfg.switches.surgeRelinkReadsLeftover
        const chance = relinkAlone ? u.surge : before + u.surge
        const automatic = chance >= SURGE_COST
        const roll = automatic ? null : roll100(ctx.rng, 'surge', u.uid, u.activationOrdinal, link)
        const hit = automatic || roll! <= chance
        const spent = relinkAlone ? before : chance - SURGE_COST
        const after = !hit ? (relinkAlone ? before : chance)
          : ctx.cfg.switches.surgeSpendFloorsAtZero ? Math.max(0, spent) : spent
        u.surgeChance = after
        emit(ctx, 'surge.checked', 'engine', { actor: id, roll, chance, surge: u.surge, hit, link, before, after, ...(automatic ? { automatic } : {}) })
        if (!hit) { c.at = 'activation-end'; break }
        gainStamina(ctx, id, 1 + u.staminaRegen, 'surge')
        reopenSurgeCycle(ctx, id, c.movementAllowance, link + 1, { before, after })
        c.surgeLink++
        c.surged = true
        c.at = 'acting'
        break
      }
      case 'activation-end':
        endActivation(ctx, c.actor!, 'engine')
        endOfActivation(ctx, c.actor!)
        expireActivationMods(ctx, c.actor!, 'activation.end')
        c.actor = null
        c.at = 'next-activation'
        break
      case 'phase-end':
        endOfPhase(ctx, c.phase)
        // encounter.area-fall: a fall marked last Turn lands as this Player Phase ends (after its ladder)
        if (c.phase === 'hero') landFalls(ctx)
        c.at = ctx.state.outcome ? 'complete' : c.phase === 'hero' ? 'enemy-arrivals' : 'turn-end'
        break
      case 'turn-end':
        advanceBand(ctx)
        markFalls(ctx)   // encounter.area-fall: the end of this Turn's Enemy Phase marks its falls
        emit(ctx, 'turn.end', 'engine', { turn: ctx.state.turn })
        c.at = 'turn-start'
        break
      case 'complete':
        return { kind: 'complete', result: resultOf(ctx) }
      default:
        throw new Error(`unknown battle cursor step: ${String(c.at)}`)
    }
  }
}

/** Finish exactly one initial/Surge action cycle; lifecycle runs on advance. */
export function completeActionCycle(ctx: Ctx): void {
  const c = ctx.battleCursor
  if (!c || c.at !== 'acting' || c.actor === null) throw new Error('completeActionCycle requires an acting cursor')
  const u = ctx.state.units[c.actor]!
  if (ctx.state.outcome) { c.at = 'complete'; return }
  c.at = rulesSideOf(ctx, u) !== 'hero' || u.surge <= 0 ? 'activation-end' : 'surge-check'
}

/** The automatic simulator is a driver of the same resumable lifecycle. */
export function runBattle(ctx: Ctx): BattleResult {
  while (true) {
    const next = advanceBattle(ctx)
    if (next.kind === 'complete') return next.result
    runActivation(ctx, next.actor)
    completeActionCycle(ctx)
  }
}
