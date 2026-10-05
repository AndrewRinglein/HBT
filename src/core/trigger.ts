// Triggers — the effect layer's firing mechanism.
//
// SPEC: `GAME-DESIGN.md` §5. Quoted rather than paraphrased where it decides
// something, because paraphrasing the design is how the terrain values got invented.
//
//   "An attack now has four distinct moments, because attacks can miss."
//   "The rule: onAttack always. Then onMiss or onHit. Then onDamage only if damage
//    landed."
//   "Sources ... stack additively. No dedup, no priority; two sources of the same
//    trigger both fire."
//
// A trigger is a RUNG, not a station: it makes something happen rather than changing
// a number. Its CHANCE is a number, so that gets its own resolve function with
// stations (see resolveTriggerChance) — the same resolveX/performX split as damage.
//
// Four behaviours §5 lists as "do not port" from Hell TCG, and how each is prevented:
//
//   1. Silent target fallback on a typo'd keyword  -> Selector is a closed union and
//      selectOf() throws on anything outside it.
//   2. Badge removal leaves the badge's triggers attached (an empty loop)
//      -> triggersFrom() rebuilds the list from sources; nothing is removed in place.
//   3. Triggers pushed by reference, so two units share mutable entries
//      -> defs are frozen and every unit gets its own copy at assembly.
//   4. Damage resolves through shared stations at its declared lifecycle rung.
//      Hooks can change that state; public forecasts never peek at future rolls.

import { isDamageType, STAT_MOD_UNTIL } from './types.js'
import type { Ctx, Effect, StatModUntil, Unit } from './types.js'
import type { Targeting } from './target.js'
import { resolveTargets, validateTargeting } from './target.js'
import { roll100 } from './rng.js'
import { carriesTag } from './action.js'
import { addStatMod, applyDamage, applyHealing, breakStatuses, corpsesNear, drainStamina, emit, gainMaxHp, gainPower, gainStamina, grantBadge, loseMaxHp, loseMaxStamina, reduceStatus, removeCorpse, standUp, unit } from './mutate.js'
import { paintRadius } from './vision.js'
import { layerOfId } from '../content/maps.js'
import { applyStatus, dealDirectDamage, incomingAbsorb, outgoingPenalty, removeStatus, spendAbsorb, lentTriggers } from './status.js'
import { resolveDamage } from './pipeline.js'
import { effective } from './stats.js'
import type { StatName } from './stats.js'
import { executeKnockback } from './movement.js'
import { rulesSideOf } from './side.js'

/**
 * WHEN a trigger fires.
 *
 * `onActivationEnd`, NOT `turnEnd` — §5 says turnEnd, which is the banned collision.
 * A Turn is one Hero Phase plus one Enemy Phase; a unit finishing its go is an
 * Activation. On an eight-zombie board the difference is 16 firings a turn versus 1.
 */
export type Hook =
  | 'onAttack'          // every swing, hit or miss
  | 'onMiss'            // only when it missed
  | 'onHit'             // connected, even if armor absorbed all of it
  | 'onDamage'          // at least 1 damage got through mitigation
  /** The attacker's, the instant a crit is confirmed — before damage is computed. */
  | 'onCrit'
  /** The KILLER's hook. */
  | 'onKill'
  /** The VICTIM's hook, not the attacker's — its owner is the unit that was hit. */
  | 'onTakingDamage'
  /**
   * The VICTIM's hook, on dying. Fires from `settle`, not from the attack —
   * because death also arrives from a poison tick and from bleeding out, and a
   * hook wired only into `performAttack` would miss both.
   */
  | 'onBlock'          // defender first, then attacker; distinct role-keyed contexts
  | 'onBurst'          // defender reaction before burst mitigation, never an attack hook
  | 'onDeath'
  | 'onActivationEnd'
  /**
   * The unit's battle begins — at battle.begin for everyone fielded, and at
   * ARRIVAL for a spawn (hook.on-enter, 2026-09-03; COMBAT-SEQUENCE Start of
   * Turn rung 1: "a spawn's battle starts when it arrives; onEnter is retired").
   * The Ghoul's Regeneration 6 is the first content on it.
   */
  | 'startOfBattle'

export const HOOKS: readonly Hook[] = [
  'onAttack', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill', 'onTakingDamage',
  'onDeath', 'onActivationEnd', 'startOfBattle', 'onBurst', 'onBlock',
] as const

/**
 * plumbing.vocabulary-export (2026-09-28): the hooks that fire on the ATTACKER's own triggers
 * inside its attack (pipeline.ts performAttack: onAttack, then onBlock's attacker role, onMiss,
 * onHit, onCrit, onDamage, onKill). What the viewer's action bar shows under an attack is this
 * list, read, never copied (review finding V12: its copy had lost onBlock).
 */
export const ATTACKER_HOOKS: readonly Hook[] = ['onAttack', 'onBlock', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill'] as const

/** Hooks that have a natural target. Authoring `target` on any other is a load error. */
const HAS_TARGET: ReadonlySet<Hook> = new Set<Hook>([
  'onBurst', 'onBlock',
  'onAttack', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill', 'onTakingDamage',
])

/**
 * WHO it lands on. Only `self` and `target` today — the range set waits on the
 * selector questions in TRIGGER-NOTES.md (measured from whom, does it include the
 * owner, do downed units count). Guessing those is how a word ends up meaning two
 * things in two places.
 */
export type Selector = 'self' | 'target'
export const SELECTORS: readonly Selector[] = ['self', 'target'] as const

/**
 * The richer form, shared with abilities (`target.ts`). A trigger may state EITHER
 * the shorthand — `self` / `target`, the two shapes that cover most riders — or a
 * full Targeting for area and type-filtered effects. One vocabulary either way:
 * two target languages in two files is how "target" comes to mean two things.
 */
export type TriggerTarget = Selector | Targeting

/**
 * HOW MUCH. A plain integer, or a scaling rule.
 *
 * §5, stated as a law: "effects that scale off Magic or Spirit use the party-wide
 * sum; every other stat scales off the acting unit alone." So `partyMagic` is a
 * SIDE-wide total, not the caster's own Magic. With one Mage the two agree, which is
 * exactly why this needs to be data and not a `u.magic` read someone writes inline.
 */
export type ValueSpec =
  | number
  | {
      /** capability.power-pool (2026-09-03): 'power' scales off the enemy side's pool, base + share. */
      readonly scale: 'partyMagic' | 'partySpirit' | 'power'
      /** value = base + mult x sum / div, rounded as stated. Law 7: integers only. 'nearest' is 0.5 up (the half-stat ruling: "rounded nearest, 0.5 up"). */
      readonly div?: number
      readonly mult?: number
      readonly base?: number
      readonly round?: 'up' | 'down' | 'nearest'
    }
  /**
   * fix.one-effect-vocabulary (2026-10-01): base + mult x the ACTING unit's own effective `stat` / div
   * (§5: "every other stat scales off the acting unit alone") — Block's "Protection equal to 4 + your
   * Armor", which the retired selfGuard shape carried as protectionBase/protectionPerArmor.
   */
  | {
      readonly scale: 'stat'
      readonly stat: StatName
      readonly div?: number
      readonly mult?: number
      readonly base?: number
      readonly round?: 'up' | 'down'
    }

/** WHAT it does — the one Effect union (types.ts, fix.one-effect-vocabulary). */
export type Trigger = {
  readonly id: string
  readonly hook: Hook
  /** Integer percent, 0..100 (Law 7). */
  readonly chance: number
  readonly select: TriggerTarget
  readonly effect: Effect
  /** Which class / item / badge granted it. §5: no dedup, so two sources both fire. */
  readonly source: string
  /**
   * ATTACK-SCOPED trigger (2026-08-20, forced by Angela's Green Drake — its
   * breath applies 3 Poison on hit and its bite applies 1, so "onHit" alone
   * cannot say WHICH). When set, the trigger fires only when the firing
   * context's cause IS this attack — the Codex's "your fang attacks" made
   * data. Absent = unit-scoped, exactly the old behaviour.
   */
  readonly onlyWithAttack?: string
  /**
   * A TAG REQUIREMENT — capability.unit-trigger-with-tag (2026-10-04; DECISIONS.md 'after the backlog run: … a trigger on the
   * hero with a tag requirement …': "you can add burn to melee attacks on a hero, and then it only triggers when you're using
   * something that has the tag melee"). When set, the trigger fires only when the firing context's cause is an action that
   * carries this tag (action.ts carriesTag) — read beside `onlyWithAttack`, and joined with it when both are set. For a
   * trigger that belongs to the unit (a badge's, a worn item's, the row's own). Absent = every attack, exactly as before.
   */
  readonly onlyWithTag?: string
  /**
   * onBlock only (V2 shields, 2026-09-23): which side of the block the owner must
   * be on. The hook fires once for the defender and once for the attacker; an
   * axe's "on block" is the ATTACKER's (V2-SHIELDS-AND-WEAPONS-2026-09-20.md).
   * Absent = both roles, exactly the old behaviour.
   */
  readonly role?: 'defender' | 'attacker'
}

// ── validation, at load ─────────────────────────────────────────────────────

/**
 * fix.one-effect-vocabulary (2026-10-01): what one effect may say, whoever carries it — a trigger, a
 * power, a move, a chart row. Loudly, at load (§5).
 */
export function validateEffect(e: Effect, where: string): void {
  if ((e.kind === 'damage' || e.kind === 'statDamage') && !isDamageType(e.damageType)) throw new Error(`${where}: unknown damage type`)
  if (e.kind === 'statMod' && !(STAT_MOD_UNTIL as readonly string[]).includes(e.until)) throw new Error(`${where}: a stat modifier lasts ${STAT_MOD_UNTIL.join(' | ')}, got '${e.until}'`)
  // fix.raise-two (2026-09-28): how many a raise takes is a whole number, one or more — never zero, never a fraction
  if (e.kind === 'corpse.raise' && e.count !== undefined && (!Number.isSafeInteger(e.count) || e.count < 1)) throw Error(`${where}: a raise's count is an integer, 1 or more`)
  if (e.kind === 'burstScale' && (!Number.isSafeInteger(e.percent) || e.percent < 0 || e.percent > 100)) throw Error(`${where}: burst scaling requires onBurst/self and percent 0..100`)
}

/**
 * §5: "The new engine errors loudly on unknown targets." Loudly, and at load —
 * a content typo should never survive to become a runtime shrug.
 */
export function validateTrigger(t: Trigger): void {
  const where = `trigger '${t.id}'`
  if (!HOOKS.includes(t.hook)) throw new Error(`${where}: unknown hook '${t.hook}'`)
  // pack.enemy-actions (2026-09-26): an enemy's special move (the approved `move`
  // kind, KINDS.md) that carries an attack IS an attack under the one action
  // type (DECISIONS.md 2026-09-04) — Close Bite's burn rides it like Bite's.
  if (t.onlyWithAttack !== undefined && !/^(attack|move)\.[a-z0-9][a-z0-9.-]*$/.test(t.onlyWithAttack)) {
    throw new Error(`${where}: onlyWithAttack must name an attack id, got '${t.onlyWithAttack}'`)
  }
  // capability.unit-trigger-with-tag: a tag is one plain word of the vocabulary's shape; WHICH words exist is content's,
  // and the pack build refuses one its vocabulary does not hold
  if (t.onlyWithTag !== undefined && (typeof t.onlyWithTag !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(t.onlyWithTag))) {
    throw new Error(`${where}: onlyWithTag must name a tag, got '${String(t.onlyWithTag)}'`)
  }
  if (typeof t.select === 'string') {
    if (!SELECTORS.includes(t.select)) throw new Error(`${where}: unknown selector '${t.select}'`)
  } else {
    validateTargeting(t.select, where)
  }
  if (!Number.isInteger(t.chance) || t.chance < 0 || t.chance > 100) {
    throw new Error(`${where}: chance must be an integer 0..100, got ${t.chance}`)
  }
  const needsTarget = t.select === 'target' ||
    (typeof t.select !== 'string' &&
      (t.select.select === 'unit' || (t.select.select === 'area' && t.select.origin === 'target')))
  if (needsTarget && !HAS_TARGET.has(t.hook)) {
    throw new Error(`${where}: hook '${t.hook}' has no target, so select:'target' can never resolve`)
  }
  if (t.effect.kind === 'burstScale' && t.select !== 'self') throw Error(`${where}: burst scaling requires onBurst/self and percent 0..100`)
  if (t.hook === 'onBurst' && (t.onlyWithAttack !== undefined || t.onlyWithTag !== undefined)) throw Error(`${where}: onBurst cannot be attack-scoped`)
  if (t.role !== undefined && (t.hook !== 'onBlock' || !['defender', 'attacker'].includes(t.role))) throw Error(`${where}: role is 'defender' or 'attacker', on onBlock only`)
  validateEffect(t.effect, where)
  if (t.effect.kind === 'burstScale' && t.hook !== 'onBurst') throw Error(`${where}: burst scaling requires onBurst/self and percent 0..100`)
  if (!t.source) throw new Error(`${where}: every trigger names the source that granted it`)
}

/**
 * Assemble a unit's triggers from its sources.
 * Each unit gets its OWN frozen copies — anti-pattern 3 is two units sharing one
 * mutable entry, which only shows up as a bug once something writes to a trigger.
 */
export function triggersFrom(defs: readonly Trigger[]): Trigger[] {
  return defs.map((t) => {
    validateTrigger(t)
    return Object.freeze({ ...t })
  })
}

// ── the chance, as a resolvable number ──────────────────────────────────────

export const TRG = {
  BASE: 100,
  SOURCE: 200,
  SITUATIONAL: 400,
  FINAL: 900,
} as const

export type ChanceRow = { station: number; name: string; effectId: string; delta: number; after: number }
export type ResolvedChance = { value: number; ledger: ChanceRow[] }

/**
 * PURE. The chance a trigger fires, with its ledger.
 *
 * Nothing rolls here. Rolling in a resolve would consume an RNG key during
 * `preview()` — which runs the real pipeline by Law 1 — and the real roll would then
 * hit the key-collision assert and throw. Triggers roll in perform, only.
 */
export function resolveTriggerChance(_ctx: Ctx, _owner: Unit, t: Trigger): ResolvedChance {
  const ledger: ChanceRow[] = []
  let v = t.chance
  ledger.push({ station: TRG.BASE, name: 'BASE', effectId: t.id, delta: v, after: v })
  // TRG.SOURCE / TRG.SITUATIONAL are reserved: badges and items will grant
  // "+10% trigger chance" and this is where they land.
  const clamped = Math.max(0, Math.min(100, v))
  if (clamped !== v) {
    ledger.push({ station: TRG.FINAL, name: 'CLAMP', effectId: t.id, delta: clamped - v, after: clamped })
    v = clamped
  }
  return { value: v, ledger }
}

// ── value resolution ────────────────────────────────────────────────────────

/**
 * §5: "effects that scale off Magic or Spirit use the party-wide sum; every other
 * stat scales off the acting unit alone." Two stats, one rule — so one function.
 */
export function partySum(ctx: Ctx, side: Unit['side'], stat: 'magic' | 'spirit'): number {
  let n = 0
  for (const u of ctx.state.units) {
    if (u.side === side && u.lifeState !== 'dead') n += u[stat]
  }
  return n
}

export const partyMagicSum = (ctx: Ctx, side: Unit['side']) => partySum(ctx, side, 'magic')
export const partySpiritSum = (ctx: Ctx, side: Unit['side']) => partySum(ctx, side, 'spirit')

export function valueOf(ctx: Ctx, owner: Unit, spec: ValueSpec): number {
  if (typeof spec === 'number') return spec
  if (spec.scale === 'stat') {
    const scaled = (effective(ctx, owner, spec.stat).value * (spec.mult ?? 1)) / (spec.div ?? 1)
    return (spec.base ?? 0) + (spec.round === 'up' ? Math.ceil(scaled) : Math.trunc(scaled))   // Law 7, one stated rounding
  }
  if (spec.scale === 'power') {
    // the pool is the ENEMY side's; a hero-side owner reads 0 (nearest, 0.5 up — ENEMY-REVIEW P1)
    const pool = rulesSideOf(ctx, owner) === 'enemy' ? (ctx.state.power ?? 0) : 0   // proving.mirror-row-rules
    return (spec.base ?? 0) + Math.floor((pool * (spec.mult ?? 1)) / (spec.div ?? 1) + 0.5)
  }
  if (spec.scale === 'partyMagic' || spec.scale === 'partySpirit') {
    const total = partySum(ctx, owner.side, spec.scale === 'partyMagic' ? 'magic' : 'spirit')
    const div = spec.div ?? 1
    const scaled = (total * (spec.mult ?? 1)) / div
    // Integers only, one stated rounding rule (Law 7).
    const rounded = spec.round === 'up' ? Math.ceil(scaled) : spec.round === 'nearest' ? Math.floor(scaled + 0.5) : Math.trunc(scaled)
    // `base` survives a zero stat: the Priest's heal is 6 + 2 x Spirit, and at
    // Spirit 0 it is still 6. Angela, 2026-08-15.
    return (spec.base ?? 0) + rounded
  }
  throw new Error(`unknown value scale '${(spec as { scale: string }).scale}'`)
}

// ── selection ───────────────────────────────────────────────────────────────

export type FireContext = {
  readonly ownerId: number
  readonly targetId: number | null
  readonly causeId: string
  /** Per-unit ordinal for this attack, so the RNG key is structural (Law 4). */
  readonly ordinal: number
  /**
   * An extra key for hooks whose ordinal is NOT the attack ordinal
   * (fix.activation-end-fires, 2026-09-03). `onActivationEnd` rolls under the
   * ACTIVATION ordinal, and without this an activation-end roll on a unit
   * could draw the same key as one of its attack rolls (targetId null reads
   * as 0, which is a real unit id) — the strict RNG would throw on the
   * collision. Appended only when present, so every existing key is
   * unchanged and the control battles stay byte-identical.
   */
  readonly keyTag?: number
  /** Reciprocal hooks have distinct semantic roles even with equal UIDs/ordinals. */
  readonly keyRole?: number
}

export function selectOf(ctx: Ctx, t: Trigger, fc: FireContext): number[] {
  if (typeof t.select !== 'string') {
    const owner = ctx.state.units[fc.ownerId]!
    // An area measures from its stated origin — default self. `unit` aims at the
    // hook's target. TRIGGER-NOTES.md Q2, answered explicitly.
    const wantsTarget = t.select.select === 'unit' ||
      (t.select.select === 'area' && t.select.origin === 'target')
    const aim = wantsTarget ? (fc.targetId ?? -1) : fc.ownerId
    return resolveTargets(ctx, owner, t.select, aim)
  }
  switch (t.select) {
    case 'self': return [fc.ownerId]
    case 'target': return fc.targetId === null ? [] : [fc.targetId]
    default:
      // Unreachable through the type, reachable through hand-written content.
      throw new Error(`trigger '${t.id}': unknown selector '${String(t.select)}'`)
  }
}

/** Distance helper for the range selectors that land once Q1–Q4 are answered. */
export function within(ctx: Ctx, from: Unit, n: number, side: 'ally' | 'enemy' | 'any'): number[] {
  const out: number[] = []
  for (const u of ctx.state.units) {
    if (u.id === from.id || u.lifeState === 'dead') continue
    const isAlly = u.side === from.side
    if (side === 'ally' && !isAlly) continue
    if (side === 'enemy' && isAlly) continue
    if (ctx.geo.distance(from.hex, u.hex) <= n) out.push(u.id)
  }
  return out.sort((a, b) => a - b)   // Law 6
}

// ── firing ──────────────────────────────────────────────────────────────────

/**
 * Fire every trigger a unit holds for one hook. MUTATES — this is the perform half.
 *
 * Ordering: §5 says "no dedup, no priority; two sources of the same trigger both
 * fire", which governs the EFFECTS. It does not excuse a nondeterministic roll
 * order, which Law 6 does govern — so the list is sorted, and the RNG key carries
 * each trigger's slot rather than its position, so adding a trigger to a unit cannot
 * perturb another trigger's roll.
 *
 * Every roll is logged, including the ones that fail. A 20% trigger that does not
 * fire must leave a trace or "is this wired in?" has no answer and gate 1 is blind —
 * the `activation.idle` lesson, which cost days the first time.
 */
export type BurstAdjustment = { readonly id: string; readonly percent: number }
export function fireTriggers(ctx: Ctx, hook: Hook, fc: FireContext): BurstAdjustment[] {
  const adjustments: BurstAdjustment[] = []
  const owner = ctx.state.units[fc.ownerId]
  if (!owner) return adjustments
  // A dead unit takes no further actions — EXCEPT onDeath, whose owner is dead by
  // definition. Without this exception the hook would be wired, logged as absent,
  // and silently never fire: the worst failure shape in this project.
  if (owner.lifeState === 'dead' && hook !== 'onDeath') return adjustments

  // capability.effect-lasts-activations (2026-10-05): the triggers the statuses it holds lend it fire as its own. They take
  // the slots after the unit's own, so no existing trigger's roll key moves.
  const slots = [...owner.triggers, ...lentTriggers(ctx, owner)]
    .map((t, slot) => ({ t, slot }))
    .filter((x) => x.t.hook === hook)
    // Attack scope: on attack-anchored hooks the FireContext's causeId is the
    // attack's id; a scoped trigger fires only for its own attack. A scoped
    // trigger on a cause that is not an attack (a status tick, a terrain
    // event) never fires — the scope is a claim about attacks.
    .filter((x) => !x.t.onlyWithAttack || x.t.onlyWithAttack === fc.causeId)
    // The tag requirement (capability.unit-trigger-with-tag), read in the same place: the cause must be an action that
    // carries the tag. Like the scope above it is a claim about attacks — on a cause that is no action it never fires.
    .filter((x) => x.t.onlyWithTag === undefined || carriesTag(ctx.actions[fc.causeId], x.t.onlyWithTag))
    // onBlock's two contexts carry keyRole 0 (defender) and 1 (attacker).
    .filter((x) => x.t.role === undefined || fc.keyRole === (x.t.role === 'attacker' ? 1 : 0))
    .sort((a, b) => (a.t.source < b.t.source ? -1 : a.t.source > b.t.source ? 1
                     : a.t.id < b.t.id ? -1 : a.t.id > b.t.id ? 1 : a.slot - b.slot))

  for (const { t, slot } of slots) {
    const chance = resolveTriggerChance(ctx, owner, t)
    // The key is structural and includes the SLOT. Without it, two 20% triggers on
    // the same hit draw the same key, get a bit-identical value, and always fire
    // together — the correlated-stream bug this RNG exists to prevent.
    // Array positions are not identities. The presence field distinguishes
    // no target from UID zero without stealing any unsigned 32-bit identity.
    const targetUid = fc.targetId == null ? 0 : unit(ctx, fc.targetId).uid
    const keys = [owner.uid, targetUid, fc.targetId == null ? 0 : 1, fc.ordinal, slot]
    if (fc.keyTag !== undefined) keys.push(fc.keyTag)
    if (fc.keyRole !== undefined) keys.push(fc.keyRole)
    const roll = roll100(ctx.rng, 'trigger', ...keys)
    const fired = roll <= chance.value

    emit(ctx, 'trigger.rolled', t.id, {
      actor: owner.id, target: fc.targetId,
      hook, chance: chance.value, roll, fired, source: t.source,
    })
    if (!fired) continue

    if (t.effect.kind === 'burstScale') {
      adjustments.push({ id: t.id, percent: t.effect.percent })
      emit(ctx, 'trigger.fired', t.id, { actor: owner.id, target: owner.id, effect: t.effect.kind, percent: t.effect.percent })
    } else for (const id of selectOf(ctx, t, fc)) fireOn(ctx, t, owner, id)
  }
  return adjustments
}

/**
 * One trigger landing on one unit. Nothing lands on the dead except a painted layer (the Eyeblight's
 * "The Dark Rushes In", onDeath); every firing logs trigger.fired naming its effect and the resolved
 * numbers; THE one applyEffect does the rest.
 */
function fireOn(ctx: Ctx, t: Trigger, owner: Unit, targetId: number): void {
  const tg = ctx.state.units[targetId]
  if (!tg) return
  if (tg.lifeState === 'dead' && t.effect.kind !== 'layer.paint') return
  applyEffect(ctx, t.effect, { causeId: t.id, actor: owner.id, by: owner.id }, targetId,
    (fields) => emit(ctx, 'trigger.fired', t.id, { actor: owner.id, target: targetId, effect: t.effect.kind, ...fields }))
}

/** On whose behalf, and under which cause, an effect is applied. */
export type EffectSource = {
  /** The cause every event names — the trigger, the power, the move, the attack. */
  readonly causeId: string
  /** The one acting: values scale off it, knockback is directly away from it, corpses are measured from it. */
  readonly actor: number
  /** Whose status this is (status.applied `by`); absent = nobody's (a chart row's). */
  readonly by?: number
  /** A power's id, named on the damage it deals. */
  readonly abilityId?: string
  /** A stat modifier's source when it is not the cause (a chart row's key). */
  readonly modSource?: string
}

/** When a stat modifier with this lifetime goes (StatModUntil, types.ts). */
function expiryOf(ctx: Ctx, holder: Unit, until: StatModUntil): { expiresAtTurn?: number; expiresAfterActivation?: number } {
  switch (until) {
    // `endOfTurn` = expiresAtTurn turn+1, matching modsFor's `turn < expiresAtTurn` (movement.ts, 2026-08-25)
    case 'endOfTurn': return { expiresAtTurn: ctx.state.turn + 1 }
    case 'endOfNextTurn': return { expiresAtTurn: ctx.state.turn + 2 }
    // C20, "until the end of your Activation": the holder's current ordinal. Mid-Activation it goes when this one
    // ends; a holder not acting has already ended that one, so it goes when its next one ends (expiry reads <=).
    case 'endOfActivation': return { expiresAfterActivation: holder.activationOrdinal }
    case 'endOfNextActivation': return { expiresAfterActivation: holder.activationOrdinal + 1 }
    case 'battle': return {}
  }
}

/**
 * THE ONE EFFECT INTERPRETER — fix.one-effect-vocabulary (2026-10-01). Prior art: this function, which was
 * the trigger's; the power's applyOne (ability.ts), the move's applyMoveEffects (movement.ts) and the
 * chart's row loop (crit.ts) are folded into it. Applies one effect to one unit, every number through the
 * mutators. The caller guards life (a trigger lands on the downed, a power on the standing only) and routes
 * `who`; `announce`, when given, receives the effect's resolved numbers at the moment the trigger log has
 * always named them. Returns the damage a `statDamage` dealt (a power totals it), otherwise 0.
 */
export function applyEffect(ctx: Ctx, e: Effect, src: EffectSource, targetId: number, announce?: (fields: Record<string, unknown>) => void): number {
  const actor = unit(ctx, src.actor)
  const tg = unit(ctx, targetId)
  const say = announce ?? (() => {})
  const cause = src.causeId
  const named = src.abilityId ? { abilityId: src.abilityId } : {}
  switch (e.kind) {
    case 'statDamage': {
      if (tg.side === actor.side && (e.allies ?? 'always') === 'never') return 0
      // Law 1: THE pipeline, crit forced false (Design Law 23: what does not roll cannot crit)
      const dmg = resolveDamage(ctx, actor, tg, { id: cause, stat: e.stat, bonus: e.bonus, damageType: e.damageType }, false, outgoingPenalty(ctx, actor), incomingAbsorb(ctx, tg))
      const summed = dmg.ledger.reduce((s, r) => s + r.delta, 0)
      if (summed !== dmg.value) throw new Error(`power ledger does not reconcile: ${summed} vs ${dmg.value}`)
      emit(ctx, 'power.hit', cause, { actor: src.actor, target: targetId, ledger: dmg.ledger.map((r) => ({ station: r.name, effectId: r.effectId, delta: r.delta })) })
      if (dmg.absorbed > 0) spendAbsorb(ctx, targetId, dmg.absorbed, cause)
      applyDamage(ctx, targetId, dmg.value, cause, { actor: src.actor, ...named, damageType: e.damageType, ...(dmg.absorbed > 0 ? { absorbed: dmg.absorbed } : {}) })
      return dmg.value
    }
    case 'damage': {
      const v = valueOf(ctx, actor, e.amount)
      say({ amount: v, damageType: e.damageType })
      if (v > 0) dealDirectDamage(ctx, targetId, v, e.damageType, cause, { actor: src.actor, ...named, damageType: e.damageType })
      return 0
    }
    case 'heal': {
      const v = valueOf(ctx, actor, e.amount)
      say({ amount: v })
      if (v > 0) applyHealing(ctx, targetId, v, cause)
      return 0
    }
    case 'status.apply': {
      const v = valueOf(ctx, actor, e.value)
      say({ statusId: e.statusId, value: v })
      if (v > 0) applyStatus(ctx, targetId, e.statusId, v, cause, src.by)
      return 0
    }
    case 'status.remove': {
      say({ statusId: e.statusId, ...(e.value !== undefined ? { value: e.value } : {}) })
      if (e.value === undefined) removeStatus(ctx, targetId, e.statusId, cause)
      else reduceStatus(ctx, targetId, e.statusId, e.value, cause)
      return 0
    }
    case 'statMod': {
      say({ stat: e.stat, value: e.value, until: e.until })
      // Max Health is the one stat the pipeline does not resolve (u.maxHp is read raw by the healing cap and
      // the crit chart) — it moves by mutator, battle-long, like its loss does.
      if (e.stat === 'maxHp') { if (e.value > 0) gainMaxHp(ctx, targetId, e.value, cause); else loseMaxHp(ctx, targetId, -e.value, cause); return 0 }
      let value = e.value
      // "Stat losses floor where the row says 'minimum 0'; nothing else floors." Clamped AT APPLICATION
      // against the current effective value — Guard Broken cannot push Armor below 0, and a later bonus
      // still adds on top of what remains.
      if (e.floor !== undefined && value < 0) {
        value = Math.min(0, -Math.min(effective(ctx, tg, e.stat).value - e.floor, -value))
        if (value === 0) return 0
      }
      addStatMod(ctx, targetId, { stat: e.stat, op: 'add', value, source: src.modSource ?? cause, scope: 'unit', ...expiryOf(ctx, tg, e.until) }, cause)
      return 0
    }
    case 'stamina.gain': gainStamina(ctx, targetId, e.value, cause); return 0
    case 'stamina.drain': {
      const v = valueOf(ctx, actor, e.value)
      say({ value: v })
      if (v > 0) drainStamina(ctx, targetId, v, cause)
      return 0
    }
    case 'loseMaxStamina': loseMaxStamina(ctx, targetId, e.value, cause); return 0
    case 'loseMaxHp': loseMaxHp(ctx, targetId, e.value, cause); return 0
    case 'stand': standUp(ctx, targetId, cause); return 0
    case 'knockback': {
      const v = valueOf(ctx, actor, e.value)
      say({ value: v })
      if (v > 0) executeKnockback(ctx, src.actor, targetId, v, cause)
      return 0
    }
    case 'badge.grant': {
      // badge.afflictions: only a standing unit can be afflicted; a badge already carried is not granted twice (grantBadge says so)
      say({ badgeId: e.badgeId, ...(e.withBadgeIds?.length ? { withBadgeIds: [...e.withBadgeIds] } : {}) })
      if (tg.lifeState === 'standing' && grantBadge(ctx, targetId, e.badgeId, cause)) {
        for (const w of e.withBadgeIds ?? []) grantBadge(ctx, targetId, w, cause)
      }
      return 0
    }
    case 'power.gain': {
      const v = valueOf(ctx, actor, e.value)
      say({ value: v })
      if (rulesSideOf(ctx, actor) === 'enemy' && v > 0) gainPower(ctx, v, cause, { actor: src.actor })   // proving.mirror-row-rules
      return 0
    }
    case 'corpse.raise': {
      const near = corpsesNear(ctx, actor.hex, e.radius)
      say({ corpsesInReach: near.length })
      if (!near.length) return 0
      const def = ctx.units?.[e.unit]
      if (!def) throw new Error(`'${cause}' raises '${e.unit}', which is not a unit in the registry`)
      if (!ctx.arrive) throw new Error(`'${cause}' raises a corpse but this battle cannot field arrivals (no ctx.arrive)`)
      // fix.raise-two: the `count` nearest, in corpsesNear's order (nearest, then lower id — Law 6)
      for (const c of near.slice(0, e.count ?? 1)) {
        removeCorpse(ctx, c.id, cause, 'raised', src.actor)
        const raised = ctx.arrive(ctx, def, c.hex, cause)
        raised.summoned = true
        emit(ctx, 'unit.raised', cause, { actor: src.actor, raised: raised.id, from: c.typeId, hex: raised.hex })
      }
      return 0
    }
    case 'corpse.consume': {
      const near = corpsesNear(ctx, actor.hex, e.radius)
      say({ corpses: near.length })
      for (const c of near) removeCorpse(ctx, c.id, cause, 'consumed', src.actor)
      if (near.length) applyHealing(ctx, src.actor, near.length * e.healPer, cause)
      return 0
    }
    case 'corpse.eat': {
      // capability.corpses: the Ghoul's Eat Corpse — one body within reach, nearest first
      const c = corpsesNear(ctx, actor.hex, e.radius)[0]
      if (!c) return 0
      removeCorpse(ctx, c.id, cause, 'eaten', src.actor)
      emit(ctx, 'corpse.eaten', cause, { actor: src.actor, corpse: c.id, of: c.typeId })
      applyHealing(ctx, src.actor, e.heal, cause)
      for (const [stat, value] of Object.entries(e.mods)) if (value) addStatMod(ctx, src.actor, { stat: stat as StatName, op: 'add', value, source: cause, scope: 'unit' }, cause)
      if (e.maxHp) gainMaxHp(ctx, src.actor, e.maxHp, cause)
      return 0
    }
    case 'layer.paint': {
      const n = paintRadius(ctx, e.origin === 'target' ? tg.hex : actor.hex, e.radius, layerOfId(e.layer), cause)
      say({ layer: e.layer, radius: e.radius, hexes: n })
      return 0
    }
    case 'reveal': {
      // capability.stealth: a reveal finds units of the other side only — its own side's stealth is not what it hunts (SWITCHES.md stealthRevealSide)
      if (tg.side !== actor.side) breakStatuses(ctx, targetId, 'reveal', cause)
      return 0
    }
    case 'burstScale':
      throw new Error(`'${cause}': burst scaling is read by fireTriggers on onBurst, never applied to a unit`)
  }
}
