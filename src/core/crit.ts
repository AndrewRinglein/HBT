// The Critical Injury Chart — station.crit (2026-08-27).
//
// Dictated in full (DECISIONS.md 2026-08-27): a crit resolves in two rolls,
// each from its own named stream (Law 4) — cup.crit-branch flips damage-arm
// vs chart-arm, cup.crit-effect rolls EVENLY among the chart's rows. The
// attack's normal damage always lands first; the damage arm adds +50% before
// Armor, Resist and Protection (the DMG.CRIT station); the chart arm lands
// normal damage plus one row of this file. The intent is literally a coin and
// a d10 — except the coin is weighted per victim side (critChartSplit,
// ANSWERED by Angela 2026-08-22: "crits to heroes 75% 25%, Enemies 50/50").
//
// Every chart effect is battle-only and clears when the fight ends —
// permanence belongs exclusively to the Deathbed pipeline, and the chart
// never produces an injury.* badge; that connection deliberately does not
// exist. Rows are RULED DATA from the pack (ctx.critChart): keys, not ids.
//
// The entry-point name is fixed in GLOSSARY.md: rollCritEffect.

import type { Ctx } from './types.js'
import { rollBelow } from './rng.js'
import { addStatMod, drainStamina, emit, loseMaxHp, unit } from './mutate.js'
import { applyStatus } from './status.js'
import { effective } from './stats.js'
import { executeKnockback } from './movement.js'

/**
 * Roll the d10 and apply one chart row to `targetId`. Returns the row's key.
 * `causeId` is the attack that crit (Law 12 — the log names its cause); the
 * row key rides every emitted line so a reader can name the injury too.
 */
export function rollCritEffect(ctx: Ctx, attackerId: number, targetId: number, ord: number, causeId: string, critical = 0, exclude?: ReadonlySet<string>): string {
  const chart = ctx.critChart
  if (chart.length === 0) throw new Error('rollCritEffect with an empty chart — the pack carries no critChart rows (Law 9: never roll on nothing)')
  const at = unit(ctx, attackerId)
  const tg = unit(ctx, targetId)
  // Evenly among the rows — the d10. Keyed by the crit (attacker uid + attack
  // ordinal), never by turn (Law 4).
  // Widened key (2026-08-27, fix.crit-branch-even) — see the branch flip.
  // The first critical keeps the original key (byte-identity for every
  // single-crit battle); further criticals salt it with their index
  // (station.crit-count 2026-08-27).
  let i = critical === 0
    ? rollBelow(ctx.rng, chart.length, 'crit-effect', at.uid, tg.uid, ord)
    : rollBelow(ctx.rng, chart.length, 'crit-effect', at.uid, tg.uid, ord, critical)
  // WITHOUT replacement (multiCritWithReplacement false): a repeat re-draws on
  // a salted key until a fresh row lands — bounded, and impossible to exhaust
  // while the exclusion set is smaller than the chart.
  if (exclude && exclude.size < chart.length) {
    let salt = 0
    while (exclude.has(chart[i]!.key)) {
      salt++
      i = rollBelow(ctx.rng, chart.length, 'crit-effect', at.uid, tg.uid, ord, critical, 1000 + salt)
    }
  }
  const row = chart[i]!
  emit(ctx, 'crit.effect', causeId, { actor: attackerId, target: targetId, key: row.key, name: row.name, roll: i })

  for (const e of row.effects) {
    switch (e.kind) {
      case 'statMod': {
        // "Stat losses floor where the row says 'minimum 0'; nothing else
        // floors." A floored loss is clamped AT APPLICATION against the
        // current effective value — Guard Broken cannot push Armor below 0,
        // and a later Armor buff still adds on top of what remains.
        let value = e.value
        if (e.floor !== undefined && value < 0) {
          const now = effective(ctx, tg, e.stat).value
          value = -Math.min(now - e.floor, -value)
          if (value > 0) value = 0 // already at or below the floor: nothing to take
        }
        if (value !== 0) {
          addStatMod(ctx, targetId, { stat: e.stat, op: 'add', value, source: row.key, scope: 'unit' }, causeId)
        }
        break
      }
      case 'status':
        applyStatus(ctx, targetId, e.statusId, e.value, causeId)
        break
      case 'push':
        // Knocked Sprawling — forced movement was built the same day
        // (capability.knockback), so the push LANDS: directly away from the
        // attacker, blocked pushes fizzle loudly, exactly the Hack's rules.
        executeKnockback(ctx, attackerId, targetId, e.hexes, causeId)
        break
      case 'loseStamina':
        drainStamina(ctx, targetId, e.value, causeId)
        break
      case 'loseMaxHp':
        loseMaxHp(ctx, targetId, e.value, causeId)
        break
    }
  }
  return row.key
}
