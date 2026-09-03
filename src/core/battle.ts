// The turn loop.
//   Turn = Hero Phase then Enemy Phase. Turn is the numbered one.
//   Each unit gets one Activation: movement, then a primary action.

import { runActivation } from '../ai/modes.js'
import { beginActivation, beginTurn, emit, endActivation, gainStamina, layerAt, regenStamina, setOutcome, setPhase } from './mutate.js'
import { roll100 } from './rng.js'
import { appliesOnActivationEndOf, layerAppliesOnActivationEnd, layerIdOf, stripsOnActivationEndOf, terrainIdOf } from '../content/maps.js'
import { advanceBleedOuts, checkVictory, settle } from './settle.js'
import { advanceBand, fireSchedule, startOfTurn } from './encounter.js'
import { applyStatus, isBlocked, reduceStatus, tickUnitStatuses } from './status.js'
import { HOOKS, fireTriggers } from './trigger.js'
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
    // THE SURGE CHECK — capability.surge (2026-09-03), COMBAT-SEQUENCE: heroes
    // only; `Surge Chance += Surge`, roll; a hit grants 1 + Stamina Regen,
    // zeroes the chance and loops back to movement INSIDE this Activation;
    // a miss keeps the chance. Before End of Activation, which runs once
    // (ruled 2026-08-21). A surged Activation can surge again, from zero.
    surgeLoop(ctx, id)
    endActivation(ctx, id, 'engine')
    endOfActivation(ctx, id)
  }

  endOfPhase(ctx, side)
}

function surgeLoop(ctx: Ctx, id: number): void {
  const u = ctx.state.units[id]!
  if (u.side !== 'hero' || u.surge <= 0) return
  for (let link = 0; link < 8; link++) {   // a hard ceiling — Law 9 over an infinite loop
    if (u.lifeState !== 'standing' || ctx.state.outcome) return
    u.surgeChance += u.surge
    const roll = roll100(ctx.rng, 'surge', u.uid, u.activationOrdinal, link)
    const hit = roll <= u.surgeChance
    emit(ctx, 'surge.checked', 'engine', { actor: id, roll, chance: u.surgeChance, surge: u.surge, hit, link })
    if (!hit) return
    u.surgeChance = 0
    gainStamina(ctx, id, 1 + u.staminaRegen, 'surge')
    // a fresh movement and primary action in the same Activation
    u.moveUsed = false
    u.primaryUsed = false
    u.movePointsLeft = u.movement
    emit(ctx, 'surge.hit', 'engine', { actor: id, link: link + 1 })
    runActivation(ctx, id)
  }
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
  // the painted layer, through the same funnel (capability.ground-layers, 2026-09-03)
  const layer = layerAt(ctx, u.hex)
  for (const [sid, n] of layerAppliesOnActivationEnd(layer)) applyStatus(ctx, unitId, sid, n, layerIdOf(layer))
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
  outcome: import('./types.js').Outcome
  turns: number
}

export function runBattle(ctx: Ctx): BattleResult {
  emit(ctx, 'battle.begin', 'engine', {})
  // startOfBattle (hook.on-enter, 2026-09-03; COMBAT-SEQUENCE: "a spawn's
  // battle starts when it arrives; onEnter is retired"): every unit on the
  // board at the start fires it once, then settle.
  for (const u of ctx.state.units) fireTriggers(ctx, 'startOfBattle', { ownerId: u.id, targetId: null, causeId: 'battle.begin', ordinal: 0, keyTag: HOOKS.indexOf('startOfBattle') })
  settle(ctx, 'engine') // in case a scenario starts in a decided position

  while (!ctx.state.outcome) {
    if (ctx.state.turn >= ctx.cfg.turnCap) {
      setOutcome(ctx, 'capped', 'engine')
      break
    }
    beginTurn(ctx, 'engine')

    // Start of Turn (encounter.runner, 2026-09-03):
    //   1. the wave schedule fires — this Turn's spawns arrive, their
    //      startOfBattle fires, settle ("Enemies spawn first")
    //   2. the victory check — objectives: survive-to and the loss timers
    //      (fix.start-of-turn-victory: a battle decided between phases ends
    //      here, not mid-activation)
    // Bleed-out used to advance here and no longer does — see rung 4b of endOfPhase.
    startOfTurn(ctx)
    if (ctx.state.outcome) break

    runPhase(ctx, 'hero')
    if (ctx.state.outcome) break

    // enemyPhase: N spawns arrive as the enemy phase of Turn N begins
    fireSchedule(ctx, 'enemyPhase')
    if (ctx.state.outcome) break
    runPhase(ctx, 'enemy')
    if (ctx.state.outcome) break
    // the band paints one more row as the enemy phase ends (capability.ground-layers)
    advanceBand(ctx)

    emit(ctx, 'turn.end', 'engine', { turn: ctx.state.turn })
  }

  return { outcome: ctx.state.outcome ?? 'capped', turns: ctx.state.turn }
}
