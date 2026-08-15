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
//   4. Preview and resolution disagree  -> triggers never alter the damage number, so
//      there is no second path to disagree with. Damage-changing effects are STATIONS.

import type { Ctx, Unit, DamageType } from './types.js'
import { distance } from './hex.js'
import type { Targeting } from './target.js'
import { resolveTargets, validateTargeting } from './target.js'
import { roll100 } from './rng.js'
import { applyDamage, emit } from './mutate.js'
import { applyStatus, removeStatus } from './status.js'

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
  | 'onKill'
  /** The VICTIM's hook, not the attacker's — its owner is the unit that was hit. */
  | 'onTakingDamage'
  | 'onActivationEnd'

export const HOOKS: readonly Hook[] = [
  'onAttack', 'onMiss', 'onHit', 'onDamage', 'onKill', 'onTakingDamage', 'onActivationEnd',
] as const

/** Hooks that have a natural target. Authoring `target` on any other is a load error. */
const HAS_TARGET: ReadonlySet<Hook> = new Set<Hook>([
  'onAttack', 'onMiss', 'onHit', 'onDamage', 'onKill', 'onTakingDamage',
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
      readonly scale: 'partyMagic' | 'partySpirit'
      /** value = base + mult x sum / div, rounded as stated. Law 7: integers only. */
      readonly div?: number
      readonly mult?: number
      readonly base?: number
      readonly round?: 'up' | 'down'
    }

/** WHAT it does. */
export type TriggerEffect =
  | { readonly kind: 'status.apply'; readonly statusId: string; readonly value: ValueSpec }
  | { readonly kind: 'status.remove'; readonly statusId: string }
  | { readonly kind: 'damage'; readonly amount: ValueSpec; readonly damageType: DamageType }

export type Trigger = {
  readonly id: string
  readonly hook: Hook
  /** Integer percent, 0..100 (Law 7). */
  readonly chance: number
  readonly select: TriggerTarget
  readonly effect: TriggerEffect
  /** Which class / item / badge granted it. §5: no dedup, so two sources both fire. */
  readonly source: string
}

// ── validation, at load ─────────────────────────────────────────────────────

/**
 * §5: "The new engine errors loudly on unknown targets." Loudly, and at load —
 * a content typo should never survive to become a runtime shrug.
 */
export function validateTrigger(t: Trigger): void {
  const where = `trigger '${t.id}'`
  if (!HOOKS.includes(t.hook)) throw new Error(`${where}: unknown hook '${t.hook}'`)
  if (typeof t.select === 'string') {
    if (!SELECTORS.includes(t.select)) throw new Error(`${where}: unknown selector '${t.select}'`)
  } else {
    validateTargeting(t.select, where)
  }
  if (!Number.isInteger(t.chance) || t.chance < 0 || t.chance > 100) {
    throw new Error(`${where}: chance must be an integer 0..100, got ${t.chance}`)
  }
  const needsTarget = t.select === 'target' || (typeof t.select !== 'string' && t.select.select !== 'self')
  if (needsTarget && !HAS_TARGET.has(t.hook)) {
    throw new Error(`${where}: hook '${t.hook}' has no target, so select:'target' can never resolve`)
  }
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
  if (spec.scale === 'partyMagic' || spec.scale === 'partySpirit') {
    const total = partySum(ctx, owner.side, spec.scale === 'partyMagic' ? 'magic' : 'spirit')
    const div = spec.div ?? 1
    const scaled = (total * (spec.mult ?? 1)) / div
    // Integers only, one stated rounding rule (Law 7).
    const rounded = spec.round === 'up' ? Math.ceil(scaled) : Math.trunc(scaled)
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
}

export function selectOf(ctx: Ctx, t: Trigger, fc: FireContext): number[] {
  if (typeof t.select !== 'string') {
    const owner = ctx.state.units[fc.ownerId]!
    const aim = t.select.select === 'self' ? fc.ownerId : (fc.targetId ?? -1)
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
    if (distance(from.hex, u.hex) <= n) out.push(u.id)
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
export function fireTriggers(ctx: Ctx, hook: Hook, fc: FireContext): void {
  const owner = ctx.state.units[fc.ownerId]
  if (!owner || owner.lifeState === 'dead') return

  const slots = owner.triggers
    .map((t, slot) => ({ t, slot }))
    .filter((x) => x.t.hook === hook)
    .sort((a, b) => (a.t.source < b.t.source ? -1 : a.t.source > b.t.source ? 1
                     : a.t.id < b.t.id ? -1 : a.t.id > b.t.id ? 1 : a.slot - b.slot))

  for (const { t, slot } of slots) {
    const chance = resolveTriggerChance(ctx, owner, t)
    // The key is structural and includes the SLOT. Without it, two 20% triggers on
    // the same hit draw the same key, get a bit-identical value, and always fire
    // together — the correlated-stream bug this RNG exists to prevent.
    const roll = roll100(ctx.rng, 'trigger', owner.uid, fc.targetId ?? 0, fc.ordinal, slot)
    const fired = roll <= chance.value

    emit(ctx, 'trigger.rolled', t.id, {
      actor: owner.id, target: fc.targetId,
      hook, chance: chance.value, roll, fired, source: t.source,
    })
    if (!fired) continue

    for (const id of selectOf(ctx, t, fc)) applyEffect(ctx, t, owner, id)
  }
}

function applyEffect(ctx: Ctx, t: Trigger, owner: Unit, targetId: number): void {
  const tg = ctx.state.units[targetId]
  if (!tg || tg.lifeState === 'dead') return
  const e = t.effect

  switch (e.kind) {
    case 'status.apply': {
      const v = valueOf(ctx, owner, e.value)
      emit(ctx, 'trigger.fired', t.id, {
        actor: owner.id, target: targetId, effect: e.kind, statusId: e.statusId, value: v,
      })
      if (v > 0) applyStatus(ctx, targetId, e.statusId, v, t.id)
      break
    }
    case 'status.remove': {
      emit(ctx, 'trigger.fired', t.id, {
        actor: owner.id, target: targetId, effect: e.kind, statusId: e.statusId,
      })
      removeStatus(ctx, targetId, e.statusId, t.id)
      break
    }
    case 'damage': {
      const v = valueOf(ctx, owner, e.amount)
      emit(ctx, 'trigger.fired', t.id, {
        actor: owner.id, target: targetId, effect: e.kind, amount: v, damageType: e.damageType,
      })
      if (v > 0) applyDamage(ctx, targetId, v, t.id, { actor: owner.id, damageType: e.damageType })
      break
    }
  }
}
