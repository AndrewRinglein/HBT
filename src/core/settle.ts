// Settle — the repeat-until-nothing-changes loop that runs any time damage lands.
// The victory check lives INSIDE it, so a battle can end the instant the board clears.
// Never reentrant: damage caused during a settle is absorbed by the running settle.

import type { Ctx } from './types.js'
import { emit, setBleedOut, setLifeState, setOutcome, tickBleedOut } from './mutate.js'
import { fireTriggers } from './trigger.js'

const MAX_ROUNDS = 64
export const BLEED_OUT_TURNS = 3

let settling = false

export function settle(ctx: Ctx, causeId: string): void {
  if (settling) return // reentrancy guard — the running settle will pick it up
  settling = true
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      let changed = false
      const died: number[] = []

      for (const u of ctx.state.units) {
        // Enemies have no consequence stack: zero HP is simply dead.
        if (u.lifeState === 'standing' && u.hp <= 0) {
          if (u.side === 'enemy') {
            setLifeState(ctx, u.id, 'dead', causeId, { reason: 'hp0' })
            died.push(u.id)
          } else {
            setLifeState(ctx, u.id, 'downed', causeId, { reason: 'hp0' })
            setBleedOut(ctx, u.id, BLEED_OUT_TURNS, causeId)
          }
          changed = true
        }
        // A downed hero whose counter has run out.
        if (u.lifeState === 'downed' && u.bleedOut <= 0) {
          setLifeState(ctx, u.id, 'dead', causeId, { reason: 'bledOut' })
          died.push(u.id)
          changed = true
        }
      }

      // onDeath belongs to the unit that died, and fires here rather than in
      // performAttack because death also arrives from a poison tick and from
      // bleeding out. Fired AFTER the whole sweep so every death in this round is
      // known first — a trigger that reads the board should not see it half-resolved.
      // Anything it causes is picked up by the next round of this same loop.
      for (const id of died) {
        fireTriggers(ctx, 'onDeath', { ownerId: id, targetId: null, causeId, ordinal: 0 })
      }
      if (died.length) changed = true

      if (checkVictory(ctx, causeId)) return
      if (!changed) return
    }
    emit(ctx, 'error.settleOverflow', 'engine', {})
    throw new Error('settle did not reach equilibrium in 64 rounds — this is a bug, not a result')
  } finally {
    settling = false
  }
}

export function checkVictory(ctx: Ctx, causeId: string): boolean {
  if (ctx.state.outcome) return true
  const enemiesLeft = ctx.state.units.some((u) => u.side === 'enemy' && u.lifeState === 'standing')
  const heroesLeft = ctx.state.units.some((u) => u.side === 'hero' && u.lifeState === 'standing')

  if (!enemiesLeft) { setOutcome(ctx, 'heroClear', causeId); return true }
  if (!heroesLeft) { setOutcome(ctx, 'wipe', causeId); return true }
  return false
}

/** Start of Turn: bleed-out counters advance on the downed. */
export function advanceBleedOuts(ctx: Ctx): void {
  const downed = ctx.state.units.filter((u) => u.lifeState === 'downed')
  for (const u of downed) tickBleedOut(ctx, u.id, 'bleedout')
  if (downed.length) settle(ctx, 'bleedout')
}
