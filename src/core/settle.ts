// Settle — the repeat-until-nothing-changes loop that runs any time damage lands.
// The victory check lives INSIDE it, so a battle can end the instant the board clears.
// Never reentrant: damage caused during a settle is absorbed by the running settle.

import type { Ctx } from './types.js'
import { addStatMod, createCorpse, emit, loseMaxHp, loseMaxStamina, setBleedOut, setLifeState, setOutcome, tickBleedOut } from './mutate.js'
import { roll100 } from './rng.js'
import { fireTriggers } from './trigger.js'

const MAX_ROUNDS = 64

/**
 * How many times the counter has to advance before a downed hero dies.
 *
 * Angela, 2026-08-15: "Bleed Out counter should be five phases, but it only moves
 * forward at the end of the hero phase."
 *
 * Deliberately not named `_TURNS` or `_PHASES`: it advances on ONE rung — End of
 * Hero Phase — and naming it after either unit invites the next reader to derive
 * the other. The cadence lives at the call site, in `battle.ts`, and nowhere else.
 * Until 2026-08-15 it was 3 and advanced at Start of Turn.
 */
export const BLEED_OUT_COUNTER = 5

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
            if (!u.summoned) createCorpse(ctx, u, causeId)   // capability.corpses: summons leave none
            died.push(u.id)
          } else if (deathbed(ctx, u.id, causeId)) {
            // STOOD — capability.deathbed (2026-09-03): a fresh bar at the next wound level
          } else {
            setLifeState(ctx, u.id, 'downed', causeId, { reason: 'hp0' })
            setBleedOut(ctx, u.id, BLEED_OUT_COUNTER, causeId)
          }
          changed = true
        }
        // A downed hero whose counter has run out.
        if (u.lifeState === 'downed' && u.bleedOut <= 0) {
          setLifeState(ctx, u.id, 'dead', causeId, { reason: 'bledOut' })
          if (!u.summoned) createCorpse(ctx, u, causeId)   // "when a hero actually dies" — the clock ran out
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
  // encounter.runner (2026-09-03): a dead objective civilian loses, wherever the death happened
  if (ctx.state.encounter) {
    for (const id of ctx.state.encounter.objectives) {
      if (ctx.state.units[id]!.lifeState === 'dead') {
        setOutcome(ctx, 'objectiveFailed', causeId)
        emit(ctx, 'encounter.lost', ctx.state.encounter.id, { reason: 'objective dead', actor: id })
        return true
      }
    }
  }
  const enemiesLeft = ctx.state.units.some((u) => u.side === 'enemy' && u.lifeState === 'standing')
  const heroesLeft = ctx.state.units.some((u) => u.side === 'hero' && u.lifeState === 'standing')

  // encounter.runner (2026-09-03): a board is not CLEAR while the schedule
  // still owes arrivals — the wave that has not come yet is the fight
  // (SWITCHES.md boardClearWaitsForSchedule). The wipe check is untouched.
  const owed = ctx.cfg.switches.boardClearWaitsForSchedule && ctx.encounter
    ? ctx.encounter.schedule.some((_, i) => !(ctx.state.encounter?.fired ?? []).includes(i))
    : false
  // RULED 2026-09-03: "Battle ends when there are no enemies remaining" — a
  // board that never HAD an enemy (an encounter whose first wave is still to
  // come) is not a cleared board; the clear needs an enemy to have entered.
  const everHadEnemy = ctx.state.units.some((u) => u.side === 'enemy')
  if (!enemiesLeft && everHadEnemy && !owed) { setOutcome(ctx, 'heroClear', causeId); return true }
  if (!heroesLeft) { setOutcome(ctx, 'wipe', causeId); return true }
  return false
}

/**
 * Bleed-out counters advance on the downed.
 *
 * Called from ONE place — End of Hero Phase — so the cadence is a single fact in a
 * single file. It is not a Start-of-Turn rung and it does not advance on the enemy
 * phase. (Angela, 2026-08-15.)
 */
export function advanceBleedOuts(ctx: Ctx): void {
  const downed = ctx.state.units.filter((u) => u.lifeState === 'downed')
  for (const u of downed) tickBleedOut(ctx, u.id, 'bleedout')
  if (downed.length) settle(ctx, 'bleedout')
}

/**
 * THE DEATHBED ROLL — capability.deathbed (2026-09-03). COMBAT-DESIGN §13:
 * "Hit 0 → roll Deathbed Fighting. STAND — the hero fights on with a fresh
 * bar at the next wound level. FALL — downed." Deathbed Fighting is derived:
 * 20 + 5 × Toughness (+ the unit's `deathbed` stat mods, when badges arrive).
 * Depth by type: civilians one stand, heroes two. Ruled 2026-09-03 (Angela):
 * "We should include the deathbed roll. And then we don't need to include
 * stabilization." Marks are minted after the battle, never here: the STAND
 * line carries what the kingdom needs (the roll, the chance, the level).
 * The wound level applies in battle (COMBAT-DESIGN §13 "Wound levels"):
 * Wounded −1 to every stat except Armor, Resist, Toughness and Item Slots,
 * −2 Max Health and −2 Max Stamina; Badly Wounded doubles all of it.
 * The cup is `deathbed`, keyed by the unit and its own ordinal (Law 4).
 */
export function deathbedFighting(u: { toughness: number }): number {
  return 20 + 5 * u.toughness
}
function deathbed(ctx: Ctx, id: number, causeId: string): boolean {
  const u = ctx.state.units[id]!
  const stands = ctx.units?.[u.typeId]?.stands ?? (u.tags.includes('civilian') ? 1 : 2)
  if (u.woundLevel >= stands) { emit(ctx, 'deathbed.exhausted', causeId, { target: id, woundLevel: u.woundLevel, stands }); return false }
  const chance = Math.max(0, Math.min(100, deathbedFighting(u)))
  const ord = ++u.deathbedOrdinal
  const roll = roll100(ctx.rng, 'deathbed', u.uid, ord)
  const stood = roll <= chance
  emit(ctx, stood ? 'deathbed.stood' : 'deathbed.fell', causeId, { target: id, roll, chance, woundLevel: u.woundLevel + (stood ? 1 : 0), ordinal: ord })
  if (!stood) return false
  u.woundLevel += 1
  const depth = u.woundLevel   // Wounded ×1, Badly Wounded ×2
  const src = 'deathbed'   // the level is on the line; the source is the pipeline
  for (const stat of WOUND_STATS) addStatMod(ctx, id, { stat, op: 'add', value: -1, source: src, scope: 'unit' }, causeId)
  loseMaxHp(ctx, id, 2, src)
  loseMaxStamina(ctx, id, 2, src)
  // a fresh bar
  u.hp = Math.max(1, u.maxHp)
  emit(ctx, 'hp.reset', src, { target: id, hp: u.hp, maxHp: u.maxHp, woundLevel: u.woundLevel, depth })
  return true
}
const WOUND_STATS: readonly import('./stats.js').StatName[] = ['strength', 'precision', 'magic', 'spirit', 'accuracy', 'dodge', 'movement', 'reach', 'crit', 'luck']
