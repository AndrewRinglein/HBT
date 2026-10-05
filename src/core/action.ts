// THE ONE ACTION TYPE — refactor.one-action-type (2026-09-04).
//
// Ruled three times on 2026-09-04 (DECISIONS.md "ONE ACTION TYPE"): an
// attack, a power and a movement are one kind of thing. Where it came from is
// a property, which slot spends it is a property, and what limits it —
// stamina, cooldown, warmup, uses — is ONE set of fields checked by ONE
// function and spent by ONE function. This file is that function pair plus
// the three views over the unit's one action list.
//
// The accuracy/damage pipeline (pipeline.ts), the effects path (ability.ts)
// and the movement path (movement.ts) each still resolve what an action DOES;
// what they no longer do is each keep their own copy of what an action MAY.

import { emit, markMoveUsed, markPrimaryUsed, spendStamina } from './mutate.js'
import { canPayFrom } from './items.js'
import type { ActionDef, ActionSlot, AttackDef, BurstDef, Ctx, MoveDef, Unit } from './types.js'

/** The row for an action id, or null — a granted id whose row is absent is indistinguishable from content never authored (the kill-switch seam relies on this). */
export function actionOf(ctx: Ctx, id: string): ActionDef | null {
  return ctx.actions[id] ?? null
}

/** The row, or a loud failure — for callers that were handed an id and must not go quiet (Law 9). */
export function actionDef(ctx: Ctx, id: string): ActionDef {
  const a = ctx.actions[id]
  if (!a) throw new Error(`unknown action '${id}' — actions are an explicit registry, check content/index.ts`)
  return a
}

export const isBurst = (a: ActionDef): a is BurstDef => a.burst !== undefined
export const isAttack = (a: ActionDef): a is AttackDef => a.attack !== undefined
export const isMove = (a: ActionDef): a is MoveDef => a.move !== undefined
/**
 * capability.charge (2026-09-27): an action carrying BOTH a move profile and an
 * attack profile — "Move 3, do damage" (the one-action-type ruling, types.ts).
 * It is aimed at a UNIT, walks to it and attacks it as ONE action (core/charge.ts);
 * it is never a destination walk, so it is not among the unit's movements.
 */
export const isCharge = (a: ActionDef): a is AttackDef & MoveDef => a.attack !== undefined && a.move !== undefined
/** A power: an action that is neither an attack nor a movement — the effects path resolves it. */
export const isPower = (a: ActionDef): boolean => a.attack === undefined && a.move === undefined && a.burst === undefined

// ── the three views over the one list. Row order is the unit's data (Law 6). ──

/**
 * v2.prone: the ids a unit may use right now — its own list, then any action a
 * status it holds grants while held (the stand action "only appears while
 * prone", §10), in status-id order. DERIVED, never stored: standing removes
 * the status and the grant goes with it, with nothing to remember to undo.
 */
export function grantedActionIds(ctx: Ctx, u: Unit): string[] {
  // u.statuses is kept sorted by id (applyStatus), so this walk is already in status-id order (Law 6)
  let extra: string[] | null = null
  for (const s of u.statuses) {
    const g = s.value > 0 ? ctx.statuses[s.id]?.prone?.standAction : undefined
    if (g && !u.actions.includes(g) && !extra?.includes(g)) (extra ??= []).push(g)
  }
  return extra ? [...u.actions, ...extra] : u.actions
}
/** v2.prone: is this unit holding a prone status? Read inline — status.ts imports this module's neighbours. */
function holdsProne(ctx: Ctx, u: Unit): boolean {
  return u.statuses.some((s) => s.value > 0 && ctx.statuses[s.id]?.prone !== undefined)
}
/** v2.prone: a stand action — a movement whose effects include `stand`. */
export const standsUp = (a: ActionDef): boolean => a.move !== undefined && (a.effects ?? []).some((e) => e.kind === 'stand')

/** The unit's attacks, in its order — every granted id whose row is present and carries an attack profile. */
export function attacksOf(ctx: Ctx, u: Unit): AttackDef[] {
  const out: AttackDef[] = []
  for (const id of grantedActionIds(ctx, u)) { const a = ctx.actions[id]; if (a && isAttack(a)) out.push(a) }
  return out
}
/** The unit's powers, in its order. */
export function powersOf(ctx: Ctx, u: Unit): ActionDef[] {
  const out: ActionDef[] = []
  for (const id of grantedActionIds(ctx, u)) { const a = ctx.actions[id]; if (a && isPower(a)) out.push(a) }
  return out
}
/** The unit's movements, in its order. A charge (isCharge) walks, but is aimed at a unit and resolved as its attack — never a destination walk. */
export function movesOf(ctx: Ctx, u: Unit): MoveDef[] {
  const out: MoveDef[] = []
  for (const id of grantedActionIds(ctx, u)) { const a = ctx.actions[id]; if (a && isMove(a) && !isCharge(a)) out.push(a) }
  return out
}
/**
 * WHAT "CARRIES THE TAG" MEANS — capability.unit-trigger-with-tag (ruled 2026-10-04, DECISIONS.md 'after the backlog run: … a
 * trigger on the hero with a tag requirement …': "it only triggers when you're using something that has the tag melee").
 * One meaning, here: an action carries a tag when the tag is in its row's `tags`; a row that states no tags and is an attack
 * carries its kind — the bestiary's claw is a melee attack. Where the row states tags they are the whole answer (the Codex's
 * words, not the engine's reach arithmetic). No row, no tag. Pure.
 */
export function carriesTag(a: ActionDef | undefined, tag: string): boolean {
  if (!a) return false
  if (a.tags !== undefined) return a.tags.includes(tag)
  return a.attack !== undefined && a.attack.kind === tag
}
/**
 * THE UNIT'S WALK — its first path-shaped movement, in its own order (rule.walked-unit-has-moved, 2026-10-04): the basic
 * move of a unit that has one. A unit granted no path-shaped movement (a flier) has no walk. Whether it can pay for it
 * now is not asked here.
 */
export function walkOf(ctx: Ctx, u: Unit): MoveDef | null {
  for (const m of movesOf(ctx, u)) if (m.move.shape === 'path') return m
  return null
}
/**
 * rule.walked-unit-has-moved (ruled 2026-10-04, DECISIONS.md 'after the backlog run: … moves are refused once a unit has
 * walked …'): once a unit has walked in its Activation — entered any hex with its walk — no OTHER movement is accepted
 * from it for the rest of that action cycle. The walk itself is not closed: the rest of a walk cut short may still be
 * walked. A movement used before any walk closes nothing here. Pure; read by the one movement legality (movement.ts).
 */
export function closedByWalk(ctx: Ctx, u: Unit, a: ActionDef): boolean {
  return u.walked === true && isMove(a) && !isCharge(a) && a.id !== walkOf(ctx, u)?.id
}
/** The ids of the unit's attacks / powers / movements — for the code that indexes by id. */
export const burstsOf = (ctx: Ctx, u: Unit): BurstDef[] => grantedActionIds(ctx, u).map(id => ctx.actions[id]).filter((a): a is BurstDef => !!a && isBurst(a))
export const attackIdsOf = (ctx: Ctx, u: Unit): string[] => attacksOf(ctx, u).map((a) => a.id)
export const powerIdsOf = (ctx: Ctx, u: Unit): string[] => powersOf(ctx, u).map((a) => a.id)

// ── the limits: one check, one spend ──

/** The stamina an action costs THIS unit — a unit that does not run stamina (enemies) pays none. */
export function staminaCostOf(u: Unit, a: ActionDef): number {
  return u.maxStamina > 0 ? a.staminaCost : 0
}

/** Turn on which this action becomes usable again. Absent = ready. */
export function readyOn(u: Unit, id: string): number {
  return u.cooldowns[id] ?? 0
}

/**
 * Is the action off cooldown (and past its warmup — a warmup is written into
 * the same map at fielding as warmup + 1)?
 */
export function isReady(ctx: Ctx, u: Unit, id: string): boolean {
  return ctx.state.turn >= readyOn(u, id)
}

/**
 * THE ONE LIMITS CHECK. Granted, affordable, off cooldown / past warmup, and
 * with a use left. Every legality function — canAttack, canUsePower,
 * usableMoves — asks this first; none keeps its own copy. What the action
 * may DO to its target is that path's question, not this one's.
 */
export function actionReady(ctx: Ctx, u: Unit, a: ActionDef, free = false): boolean {
  if (!grantedActionIds(ctx, u).includes(a.id)) return false
  // v2.prone (§10): standing is legal only while prone, and while prone it is
  // the only movement (SWITCHES.md proneNoCrawl). Primary actions stay.
  if (a.move !== undefined && standsUp(a) !== holdsProne(ctx, u)) return false
  // `free`: a special free attack asks for no Stamina (rule.free-attack-is-basic-attack) — every other limit stands
  if (!free && u.stamina < staminaCostOf(u, a)) return false
  if (!isReady(ctx, u, a.id)) return false
  if (a.uses && (u.usesLeft[a.id] ?? 0) <= 0) return false
  return true
}

/** Authored restrictions are rules; actionSlots only chooses a default preference.
 * Free actions have no slot cost, but still precede primary. Reactions never
 * consult this activation-only planner. No state or RNG is touched here. */
export function resolveActionSlot(ctx: Ctx, u: Unit, a: ActionDef, requested?: ActionSlot): ActionSlot | null {
  if (a.slot !== undefined && !['movement', 'primary', 'either'].includes(a.slot)) throw new Error(`invalid action slot on '${a.id}'`)
  if (u.primaryUsed) return null
  const authored = a.slot ?? 'either'
  // capability.charge: a unit with noPrimaryAction (the Iron Colossus) has no primary slot to spend
  const compatible = (slot: ActionSlot) => (authored === 'either' || authored === slot) && (a.free || slot === 'primary' || !u.moveUsed)
    && !(slot === 'primary' && u.noPrimaryAction)
  if (requested !== undefined) return compatible(requested) ? requested : null
  const preferred: ActionSlot = ctx.cfg.switches.actionSlots === 'byProfile' && !isMove(a) ? 'primary' : 'movement'
  const other = preferred === 'movement' ? 'primary' : 'movement'
  return compatible(preferred) ? preferred : compatible(other) ? other : null
}

/**
 * THE ONE SPEND. Stamina, the slot (unless `free`), the cooldown and a use —
 * for every action kind, in that order.
 *
 * Cooldown semantics are the Codex's, 2-ACTIONS-SETTLED.md: "`cooldown` N =
 * skip N Turns. CD 0 is usable again next Turn." Under the `turn >= readyOn`
 * gate that is ready on turn + N + 1 — what the movement path always wrote.
 * FINDING (2026-09-04, this refactor): the power path and the attack path
 * wrote turn + N, one Turn short — a cooldown-1 power was usable the very
 * next Turn. One function now, one meaning.
 */
export function spendAction(ctx: Ctx, unitId: number, a: ActionDef, slot: 'movement' | 'primary' | 'reaction'): void {
  const u = ctx.state.units[unitId]!
  // A REACTION — a special free attack: the attack of opportunity — happens outside the
  // actor's Activation, so no slot is marked; and it spends no Stamina: nothing is asked for,
  // nothing is written back, and no stamina.spent line is logged for it
  // (rule.free-attack-is-basic-attack, 2026-10-04: "that stamina cost is not triggered by
  // special free attacks" — replacing the 2026-08-20 "They do pay stamina for it" that
  // fix.aoo-pays-stamina built). The cooldown and a use are spent as for any other use.
  if (slot !== 'reaction') spendStamina(ctx, unitId, staminaCostOf(u, a), a.id)
  if (!a.free && slot !== 'reaction') { if (slot === 'movement') markMoveUsed(ctx, unitId); else markPrimaryUsed(ctx, unitId) }
  if (a.cooldown) {
    const readyAgain = ctx.state.turn + a.cooldown + 1
    u.cooldowns[a.id] = readyAgain
    emit(ctx, 'cooldown.set', a.id, { actor: unitId, actionId: a.id, abilityId: a.id, readyOnTurn: readyAgain })   // abilityId kept for the viewer's reader; actionId is the name
  }
  if (a.uses) spendUse(ctx, unitId, a.id)
  // Universal payment receipt, including zero-cost, free and reaction actions.
  // Resulting flags are authoritative; readers never infer a slot from profile.
  emit(ctx, 'action.spent', a.id, { actor: unitId, actionId: a.id, slot, free: a.free === true, moveUsed: u.moveUsed, primaryUsed: u.primaryUsed })
}

/**
 * capability.charges (2026-09-03): a use is spent; at zero the action leaves
 * the unit's list for the rest of the Battle — "they should vanish from the
 * list of things available to a hero in the powers list, because there's no
 * cooldown" (Andrew 2026-09-02). The spend is remembered for the BattleResult.
 */
function spendUse(ctx: Ctx, userId: number, id: string): void {
  const u = ctx.state.units[userId]!
  const left = (u.usesLeft[id] ?? 0) - 1
  u.usesLeft[id] = left
  u.usesSpentThisBattle = { ...(u.usesSpentThisBattle ?? {}), [id]: (u.usesSpentThisBattle?.[id] ?? 0) + 1 }
  // v2.item-uses (V2 R6): the use is paid by an item instance when one in reach has one —
  // the first in instance order (Law 6) — and the line names it; instanceLeft 0 = that
  // instance is spent. Otherwise the row's own uses pay (SWITCHES.md itemUsesPayOrder).
  const e = u.itemUses?.find((x) => x.actionId === id && x.left > 0 && canPayFrom(ctx.items, u, x))
  if (e) { e.left -= 1; e.used += 1 }
  emit(ctx, 'charge.spent', id, { actor: userId, abilityId: id, left, ...(e ? { instanceId: e.instanceId, itemId: e.itemId, instanceLeft: e.left } : {}) })
  if (left <= 0) {
    u.actions = u.actions.filter((x) => x !== id)
    emit(ctx, 'power.exhausted', id, { actor: userId, abilityId: id })
  }
}
