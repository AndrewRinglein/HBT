// The turn loop.
//   Turn = Hero Phase then Enemy Phase. Turn is the numbered one.
//   Each unit gets one Activation: movement, then a primary action.

import { runActivation } from '../ai/modes.js'
import { beginActivation, beginTurn, emit, endActivation, regenStamina, setOutcome, setPhase } from './mutate.js'
import { appliesOnActivationEndOf, stripsOnActivationEndOf, terrainIdOf } from '../content/maps.js'
import { advanceBleedOuts, checkVictory, settle } from './settle.js'
import { applyStatus, isBlocked, reduceStatus, tickUnitStatuses } from './status.js'
import type { Ctx, Phase, Side } from './types.js'

function activationOrder(ctx: Ctx, side: Side): number[] {
  // Switch: fixed by unit id. `random` and `best-first` are the alternatives.
  return ctx.state.units
    .filter((u) => u.side === side && u.lifeState === 'standing')
    .map((u) => u.id)
    .sort((a, b) => a - b)
}

function runPhase(ctx: Ctx, phase: Phase): void {
  const side: Side = phase === 'hero' ? 'hero' : 'enemy'
  setPhase(ctx, phase, 'engine')

  for (const id of activationOrder(ctx, side)) {
    if (ctx.state.outcome) return
    const u = ctx.state.units[id]!
    if (u.lifeState !== 'standing') continue // may have fallen since the order was taken
    beginActivation(ctx, id, 'engine')
    if (isBlocked(ctx, u)) {
      emit(ctx, 'activation.idle', 'status', { actor: id, reason: 'cannot act' })
      endActivation(ctx, id, 'engine')
      endOfActivation(ctx, id)   // a stunned unit standing in water still soaks
      continue
    }
    runActivation(ctx, id)
    endActivation(ctx, id, 'engine')
    endOfActivation(ctx, id)
  }

  endOfPhase(ctx, side)
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
  const t = ctx.state.terrain[u.hex] ?? 0
  const strips = stripsOnActivationEndOf(t)
  for (const sid of strips) reduceStatus(ctx, unitId, sid, 1, terrainIdOf(t))
  const applies = appliesOnActivationEndOf(t)
  for (const [sid, n] of applies) applyStatus(ctx, unitId, sid, n, terrainIdOf(t))
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

/** The End of Phase ladder. An ordered list of named rungs, so reordering is a sweep axis. */
function endOfPhase(ctx: Ctx, side: Side): void {
  emit(ctx, 'phase.end.begin', 'engine', { side })

  // 1. auras  2. corpses — none yet
  // 3. status ticks — MOVED to the End of Activation ladder (ruled 2026-08-26;
  //    see endOfActivation above). The phase ladder no longer touches statuses.
  if (ctx.state.outcome) return
  // 4. durations — travel with the per-activation status pass (see status.ts)
  // 4b. bleed-out. Angela 2026-08-15: the counter advances at End of Hero Phase,
  //     and only there — not at Start of Turn, and not on the enemy phase. So a
  //     downed hero's five ticks are five HERO phases, which is the window a
  //     rescue actually has.
  if (side === 'hero') {
    advanceBleedOuts(ctx)
    if (ctx.state.outcome) return
  }
  // 5. stamina regen (heroes only; enemies do not run stamina)
  for (const u of ctx.state.units) {
    if (u.side === side && u.lifeState === 'standing' && u.maxStamina > 0) {
      regenStamina(ctx, u.id, 'phase.end')
    }
  }
  // 6. victory check
  checkVictory(ctx, 'phase.end')
  emit(ctx, 'phase.end.done', 'engine', { side })
}

export type BattleResult = {
  outcome: 'heroClear' | 'wipe' | 'capped'
  turns: number
}

export function runBattle(ctx: Ctx): BattleResult {
  emit(ctx, 'battle.begin', 'engine', {})
  settle(ctx, 'engine') // in case a scenario starts in a decided position

  while (!ctx.state.outcome) {
    if (ctx.state.turn >= ctx.cfg.turnCap) {
      setOutcome(ctx, 'capped', 'engine')
      break
    }
    beginTurn(ctx, 'engine')

    // Start of Turn: the wave schedule fires here when it exists. Bleed-out used
    // to advance here and no longer does — see rung 4b of endOfPhase.

    runPhase(ctx, 'hero')
    if (ctx.state.outcome) break

    runPhase(ctx, 'enemy')
    if (ctx.state.outcome) break

    emit(ctx, 'turn.end', 'engine', { turn: ctx.state.turn })
  }

  return { outcome: ctx.state.outcome ?? 'capped', turns: ctx.state.turn }
}
