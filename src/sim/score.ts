// The scoreboard. Computed from the EVENT LOG ONLY — never from final state.
// If a number can't be derived from the log, the log is incomplete, and the future
// renderer and the dashboard would both be missing it too.

import type { Event } from '../core/types.js'

export type Scoreboard = {
  outcome: string
  turns: number
  heroesDowned: number
  heroesDead: number
  enemiesKilled: number
  damageDealtByType: Record<string, number>
  damageTakenByType: Record<string, number>
  attacksByAttack: Record<string, { swings: number; hits: number; damage: number }>
  heroStaminaOutTurn: number | null
  idleActivations: number
  totalActivations: number
}

export function score(events: Event[]): Scoreboard {
  const side = new Map<number, 'hero' | 'enemy'>()
  const type = new Map<number, string>()
  const dealt: Record<string, number> = {}
  const taken: Record<string, number> = {}
  const byAttack: Record<string, { swings: number; hits: number; damage: number }> = {}

  let outcome = 'unknown'
  let turns = 0
  let heroesDowned = 0
  let heroesDead = 0
  let enemiesKilled = 0
  let staminaOut: number | null = null
  let idle = 0
  let activations = 0

  for (const e of events) {
    switch (e.type) {
      case 'unit.enter':
        side.set(e.actor!, e['side'] as 'hero' | 'enemy')
        type.set(e.actor!, e['typeId'] as string)
        break
      case 'turn.begin':
        turns = e['turn'] as number
        break
      case 'activation.begin':
        activations++
        if (side.get(e.actor!) === 'hero' && (e['stamina'] as number) === 0 && staminaOut === null) {
          staminaOut = e.turn
        }
        break
      case 'activation.idle':
        idle++
        break
      case 'attack.declared': {
        const a = e['attackId'] as string
        byAttack[a] ??= { swings: 0, hits: 0, damage: 0 }
        byAttack[a]!.swings++
        break
      }
      case 'attack.hit': {
        const a = e.causeId
        byAttack[a] ??= { swings: 0, hits: 0, damage: 0 }
        byAttack[a]!.hits++
        break
      }
      case 'damage.applied': {
        const amt = e['amount'] as number
        const src = type.get(e.actor as number) ?? 'unknown'
        const tgt = type.get(e.target as number) ?? 'unknown'
        dealt[src] = (dealt[src] ?? 0) + amt
        taken[tgt] = (taken[tgt] ?? 0) + amt
        const a = e['attackId'] as string | undefined
        if (a) {
          byAttack[a] ??= { swings: 0, hits: 0, damage: 0 }
          byAttack[a]!.damage += amt
        }
        break
      }
      case 'life.downed':
        if (side.get(e.target!) === 'hero') heroesDowned++
        break
      case 'life.dead':
        if (side.get(e.target!) === 'hero') heroesDead++
        else enemiesKilled++
        break
      case 'battle.end':
        outcome = e['outcome'] as string
        turns = e['turn'] as number
        break
    }
  }

  return {
    outcome, turns, heroesDowned, heroesDead, enemiesKilled,
    damageDealtByType: dealt, damageTakenByType: taken,
    attacksByAttack: byAttack,
    heroStaminaOutTurn: staminaOut,
    idleActivations: idle, totalActivations: activations,
  }
}
