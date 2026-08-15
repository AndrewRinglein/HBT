// The turn loop.
//   Turn = Hero Phase then Enemy Phase. Turn is the numbered one.
//   Each unit gets one Activation: movement, then a primary action.

import { runActivation } from '../ai/modes.js'
import { beginActivation, beginTurn, emit, endActivation, regenStamina, setOutcome, setPhase } from './mutate.js'
import { advanceBleedOuts, checkVictory, settle } from './settle.js'
import { isBlocked, tickStatuses } from './status.js'
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
      continue
    }
    runActivation(ctx, id)
    endActivation(ctx, id, 'engine')
  }

  endOfPhase(ctx, side)
}

/** The End of Phase ladder. An ordered list of named rungs, so reordering is a sweep axis. */
function endOfPhase(ctx: Ctx, side: Side): void {
  emit(ctx, 'phase.end.begin', 'engine', { side })

  // 1. auras  2. corpses — none yet
  // 3. status ticks
  tickStatuses(ctx, side)
  settle(ctx, 'status')
  if (ctx.state.outcome) return
  // 4. durations — folded into the single status pass above (see status.ts)
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
