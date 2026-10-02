// Settle — the repeat-until-nothing-changes loop that runs any time damage lands.
// The victory check lives INSIDE it, so a battle can end the instant the board clears.
// Never reentrant: damage caused during a settle is absorbed by the running settle.

import type { Ctx } from './types.js'
import { badgeFlags, createCorpse, emit, gainStamina, grantBadge, revertUnit, setBleedOut, setLifeState, setOutcome, tickBleedOut, transformUnit } from './mutate.js'
import { roll100 } from './rng.js'
import { effective } from './stats.js'
import type { AtZeroRule, Side } from './types.js'
import { fireTriggers } from './trigger.js'
import { rulesSideOf } from './side.js'

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
        if (u.lifeState === 'standing' && u.hp <= 0 && u.consumedBy !== undefined) {
          const by = u.consumedBy
          if (u.transformed) revertUnit(ctx, u.id, 'fell', causeId)   // rule.afflictions-at-zero: it dies in its own form
          // v2.knockback-collisions (COMBAT-V2 §9.3, ruled 2026-09-07): a prop that
          // `consumes` takes the unit its collision killed — "no corpse is left,
          // and for a hero there is no Deathbed. The unit is dead." onDeath fires
          // (below, like every death); the corpse is never created. The first
          // exception to Design Law 3, amended there, not here.
          setLifeState(ctx, u.id, 'dead', causeId, { reason: 'consumed', by, corpse: false })
          died.push(u.id)
          changed = true
        } else if (u.lifeState === 'standing' && u.hp <= 0) {
          // proving.mirror-row-rules: which side's zero this is — the fielded side's or the row's (SWITCHES mirrorSideRules)
          if (u.transformed) {
            // rule.afflictions-at-zero (2026-10-02): a transformed hero at 0 again falls back into its own form. Kept by
            // its Luck roll (still on its own side): "At 0 Health again, the hero dies (no bleed-out)". Turned to the
            // other side: "Beaten to 0, it falls in the hero's original form and bleeds out (rescuable as any downed hero)."
            const kept = u.side === u.transformed.original.side
            revertUnit(ctx, u.id, 'fell', causeId)
            if (kept) {
              setLifeState(ctx, u.id, 'dead', causeId, { reason: 'transformed' })
              if (!u.summoned) createCorpse(ctx, u, causeId)
              died.push(u.id)
            } else {
              setLifeState(ctx, u.id, 'downed', causeId, { reason: 'hp0' })
              setBleedOut(ctx, u.id, bleedOutCounterOf(u), causeId)
            }
          } else if (rulesSideOf(ctx, u) === 'enemy') {
            setLifeState(ctx, u.id, 'dead', causeId, { reason: 'hp0' })
            if (!u.summoned) createCorpse(ctx, u, causeId)   // capability.corpses: summons leave none
            died.push(u.id)
          } else {
            // rule.afflictions-at-zero (2026-10-02): an affliction's 0-Health rule first — its gains, then, for
            // Vampirism, Lycanthropy and Possession, no Deathbed roll at all
            const afflicted = atZero(ctx, u.id, causeId)
            // fix.deathbed-no-stands (2026-09-04): the roll, or none if Wounded
            const verdict = afflicted ?? deathbed(ctx, u.id, causeId)
            if (verdict === 'transformed' || verdict === 'down') {
              // transformed: stands in its new form at full Health, on the side its Luck roll gave it;
              // down: already downed and bleeding out by its affliction's rule (Possession)
            } else if (verdict === 'stood') {
              // fights on — Wounded, a fresh (lower) bar, a breath of stamina
            } else if (verdict === 'bleeds') {
              setLifeState(ctx, u.id, 'downed', causeId, { reason: 'hp0' })
              setBleedOut(ctx, u.id, bleedOutCounterOf(u), causeId)
            } else {
              // 'dies': Wounded already, or no Hero badge — dead and a corpse, no bleed-out
              setLifeState(ctx, u.id, 'dead', causeId, { reason: verdict === 'dies-wounded' ? 'wounded' : 'fell' })
              if (!u.summoned) createCorpse(ctx, u, causeId)
              died.push(u.id)
            }
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
        emit(ctx, 'encounter.lost', ctx.state.encounter.id, { reason: 'objective dead', actor: id })
        setOutcome(ctx, 'objectiveFailed', causeId)
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
 * THE DEATHBED ROLL — capability.deathbed (2026-09-03), REVERSED by
 * fix.deathbed-no-stands (2026-09-04). Angela, verbatim: "there are no
 * stands ... Only those with the badge Hero bleed out. A civilian who goes
 * down and doesn't have the hero badge is just dead and a corpse. Now any
 * player unit rolls deathbed fighting. Unless they have the badge Wounded.
 * If they are wounded, then they just die. When a player succeeds at
 * deathbed fighting and they are not wounded, they immediately gain Wounded
 * ... they gain 1 stamina and 1 equal to whatever their stamina recovery is
 * ... and they get placed at maximum hit points. If they're at death's door
 * ... and they get reduced to zero, they die. They do not bleed out."
 *
 * So, at 0 HP on the player side:
 *   Wounded already → 'dies-wounded' (no roll).
 *   Roll 20 + 5 × Toughness (derived, never stored; +badges when they carry it).
 *   STOOD → the Wounded badge (ctx.ruleBadges.wounded — its penalties are the
 *           row's, ruled −10 Accuracy, −10 Dodge, −1 Strength, −1 Precision,
 *           −2 Max HP), 1 + Stamina Regen stamina (capped), HP = the new max.
 *   FELL  → 'bleeds' with the Hero badge (ctx.ruleBadges.hero, or any badge
 *           flagged bleedsOut), else 'dies'.
 * The cup is `deathbed`, keyed by the unit and its own ordinal (Law 4). A
 * wounded badge the pack lacks is a named gap on the STOOD line, never a
 * silent skip (the numbers are content's — 4-BADGES-SETTLED owes the row).
 */
export const DEATHBED_BASE = 20
export const DEATHBED_PER_TOUGHNESS = 5
/**
 * fix.codex-numbers (2026-10-01; DECISIONS.md 2026-09-28 "the duplication review, ruled",
 * finding C9): the formula stays the engine's; `deathbedFighting` is the unit's own folded
 * addition — the Codex base, a level pick ("+20 Deathbed Fighting", the Priest's level-5
 * option), an item — on top of it. A BADGE's points keep riding the badge's own field and
 * are read at the roll (rule.badge-deathbed-fighting), so one gained mid-battle counts
 * (SWITCHES.md deathbedBadgePoints).
 */
export function deathbedFighting(u: { toughness: number; deathbedFighting?: number }, fromBadges: number = 0): number {
  return DEATHBED_BASE + DEATHBED_PER_TOUGHNESS * u.toughness + (u.deathbedFighting ?? 0) + fromBadges
}
/**
 * fix.codex-numbers (C9): the counter a downed hero starts at — the ruled 5 plus the unit's
 * own `bleedOutTurns` (Death Seeker −3, Survivor +3, Thick Blooded +5, folded at fielding).
 * At least 1: a counter that starts at 0 would kill on the same settle that downed the hero,
 * which no badge says (SWITCHES.md bleedOutFloor).
 */
export function bleedOutCounterOf(u: { bleedOutTurns?: number }): number {
  return Math.max(1, BLEED_OUT_COUNTER + (u.bleedOutTurns ?? 0))
}
/**
 * rule.badge-deathbed-fighting (2026-09-29, Andrew, DECISIONS.md 'Possession's Surge loads at fielding; the
 * Ghost inflicts Possession; Deathbed Fighting ... built'): "Vampirism gives +15% to deathbed fighting.
 * Writing flesh gives +20%. Possession gives -10." Every badge the unit carries, in carry order (Law 6),
 * each named on the roll's line (Law 12).
 */
function deathbedSources(ctx: Ctx, u: { badges: readonly string[] }): { badgeId: string; value: number }[] {
  return u.badges.flatMap((b) => { const v = ctx.badges[b]?.deathbedFighting; return v ? [{ badgeId: b, value: v }] : [] })
}
export type DeathbedVerdict = 'stood' | 'bleeds' | 'dies' | 'dies-wounded'

/**
 * rule.afflictions-at-zero (2026-10-02; DECISIONS.md 2026-10-01 'the afflictions at 0 Health', Andrew: "When a vampire-
 * or werewolf-badged player unit goes to zero health, rather than making a deathbed check, they are going to transform"
 * · "if you're rotting flesh and you're taken to zero, you're going to gain a badge: Fragile" · "if a possessed
 * character is knocked unconscious, they're going to spawn a ghost"). Read off the carried badges' `atZero` rows, in
 * carry order (Law 6):
 *   every `gains` — the badge is granted, each time the hero is taken to 0 (Fragile stacks); the line names the rule
 *     (`atZeroOf`) — the gain the kingdom carries after the battle;
 *   the first rule with no Deathbed roll decides (SWITCHES.md atZeroFirstAffliction), before Wounded (the ruling
 *     replaces the Deathbed rule for these heroes — SWITCHES.md afflictionBeforeWounded):
 *     `transformsInto` — the Luck roll (the Luck stat as a percentage; Luck 0 always turns) on the `transform` cup,
 *       keyed (uid, the Deathbed ordinal); the hero becomes the row at full Health on its own side, or the other;
 *     otherwise — down and bleeding out, and `raises` arrives on `raisedSide` from the hero's hex (the arrival rule:
 *       the nearest free hex, `unit.shunted` naming it — SWITCHES.md ghostHex).
 * Returns null when no carried rule skips the roll: the Deathbed rule runs as before.
 */
function atZero(ctx: Ctx, id: number, causeId: string): 'transformed' | 'down' | null {
  const u = ctx.state.units[id]!
  const rules: { badgeId: string; z: AtZeroRule }[] = []
  for (const b of u.badges) { const z = ctx.badges[b]?.atZero; if (z && !rules.some((r) => r.badgeId === b)) rules.push({ badgeId: b, z }) }
  for (const r of rules) if (r.z.gains) grantBadge(ctx, id, r.z.gains, r.badgeId, { atZeroOf: r.badgeId })
  const decider = rules.find((r) => !r.z.deathbedFighting)
  if (!decider) return null
  const { badgeId, z } = decider
  emit(ctx, 'deathbed.none', causeId, { target: id, reason: 'affliction', badgeId })
  if (z.transformsInto) {
    const def = ctx.units?.[z.transformsInto]
    if (!def) throw new Error(`'${badgeId}' transforms into '${z.transformsInto}', which is not a unit in the registry`)
    if (!ctx.formOf) throw new Error(`'${badgeId}' transforms a hero but this battle cannot make a form (no ctx.formOf)`)
    const luck = effective(ctx, u, 'luck').value
    const chance = Math.max(0, Math.min(100, luck))
    const ordinal = ++u.deathbedOrdinal
    const roll = roll100(ctx.rng, 'transform', u.uid, ordinal)
    const kept = roll <= chance
    const side: Side = kept ? u.side : u.side === 'hero' ? 'enemy' : 'hero'
    const form = ctx.formOf(ctx, def, u.id, u.uid, u.name, u.hex, badgeId)
    transformUnit(ctx, id, form, side, badgeId, causeId, { roll, chance, ordinal, kept })
    return 'transformed'
  }
  setLifeState(ctx, id, 'downed', causeId, { reason: 'hp0' })
  setBleedOut(ctx, id, bleedOutCounterOf(u), causeId)
  if (z.raises) {
    const row = ctx.units?.[z.raises]
    if (!row) throw new Error(`'${badgeId}' raises '${z.raises}', which is not a unit in the registry`)
    if (!ctx.arrive) throw new Error(`'${badgeId}' raises a unit but this battle cannot field arrivals (no ctx.arrive)`)
    const side = z.raisedSide ?? row.side
    const raised = ctx.arrive(ctx, row.side === side ? row : { ...row, side, rowSide: row.rowSide ?? row.side }, u.hex, badgeId)
    raised.summoned = true   // capability.corpses: a summon leaves no corpse
    // "a ghost with their image" — the line names whose image it wears (SWITCHES.md ghostImage)
    emit(ctx, 'unit.raised', badgeId, { actor: id, raised: raised.id, from: u.typeId, hex: raised.hex, side: raised.side, image: u.typeId, imageOf: u.uid })
  }
  return 'down'
}
function deathbed(ctx: Ctx, id: number, causeId: string): DeathbedVerdict {
  const u = ctx.state.units[id]!
  const flags = badgeFlags(ctx, u)
  if (flags.wounded) { emit(ctx, 'deathbed.none', causeId, { target: id, reason: 'wounded' }); return 'dies-wounded' }
  const sources = deathbedSources(ctx, u)
  const chance = Math.max(0, Math.min(100, deathbedFighting(u, sources.reduce((n, s) => n + s.value, 0))))
  const ord = ++u.deathbedOrdinal
  const roll = roll100(ctx.rng, 'deathbed', u.uid, ord)
  const stood = roll <= chance
  if (!stood) {
    // Who bleeds: a unit flagged bleedsOut (the Hero badge). UNTIL content
    // authors ctx.ruleBadges.hero, no row carries the flag — so the pre-ruling
    // reading (every player unit bleeds) stands in, and the line names the gap.
    const heroRowMissing = !ctx.badges[ctx.ruleBadges.hero]?.flags.bleedsOut
    const bleeds = flags.bleedsOut || (heroRowMissing && rulesSideOf(ctx, u) === 'hero')
    emit(ctx, 'deathbed.fell', causeId, { target: id, roll, chance, ordinal: ord, bleedsOut: bleeds, ...(sources.length ? { sources } : {}),
      ...(heroRowMissing && !flags.bleedsOut ? { gaps: [`no row for ${ctx.ruleBadges.hero} in the pack — every player unit bleeds out until content authors it`] } : {}) })
    return bleeds ? 'bleeds' : 'dies'
  }
  const woundedId = ctx.ruleBadges.wounded
  const woundedRow = ctx.badges[woundedId]
  // a usable Wounded row carries the flag that makes the next zero fatal; a
  // prose-only row (the Codex's today) is the same gap as no row
  const gap = !woundedRow ? `no row for ${woundedId} in the pack — the Wounded penalties are owed to content`
    : !woundedRow.flags.wounded ? `${woundedId} carries no wounded flag and no numbers — the row is prose only; owed to content` : undefined
  emit(ctx, 'deathbed.stood', causeId, { target: id, roll, chance, ordinal: ord, badgeId: woundedId, ...(sources.length ? { sources } : {}), ...(gap ? { gaps: [gap] } : {}) })
  if (!gap) grantBadge(ctx, id, woundedId, causeId)
  // "they gain 1 stamina and 1 equal to whatever their stamina recovery is" — capped, gains never overflow
  gainStamina(ctx, id, 1 + u.staminaRegen, causeId)
  // "placed at maximum hit points. Which is too low compared to what it was a minute ago"
  u.hp = Math.max(1, u.maxHp)
  emit(ctx, 'hp.reset', causeId, { target: id, hp: u.hp, maxHp: u.maxHp })
  return 'stood'
}
