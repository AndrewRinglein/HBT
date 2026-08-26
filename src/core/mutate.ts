// The mutator facade. Nothing outside this file writes to State (Constitution Law 3).
// Every mutator emits an event, which is what makes the log complete by construction —
// and therefore what makes replay, the text renderer, and every test possible.

import type { Ctx, Event, LifeState, Unit } from './types.js'
import type { HexId } from './hex.js'

export function emit(ctx: Ctx, type: string, causeId: string, fields: Record<string, unknown> = {}): Event {
  const e: Event = {
    seq: ctx.state.seq++,
    turn: ctx.state.turn,
    phase: ctx.state.phase,
    type,
    causeId,
    actor: (fields['actor'] as number | undefined) ?? null,
    target: (fields['target'] as number | undefined) ?? null,
    ...fields,
  }
  ctx.events.push(e)
  return e
}

export function unit(ctx: Ctx, id: number): Unit {
  const u = ctx.state.units[id]
  if (!u) throw new Error(`no unit ${id}`)
  return u
}

export function moveUnit(ctx: Ctx, id: number, to: HexId, cost: number, causeId: string, terrainId: string): void {
  const u = unit(ctx, id)
  const from = u.hex
  u.hex = to
  u.movePointsLeft -= cost
  emit(ctx, 'moved', causeId, {
    actor: id, from, to, cost,
    // What was paid for, not just how much. `cost: 2` with no terrain is a number
    // nobody can check against the board (Law 12). Passed in rather than looked up:
    // mutate.ts is the one file that imports nothing (Law 5).
    terrain: terrainId,
    movePointsLeft: u.movePointsLeft,
  })
}

export function spendStamina(ctx: Ctx, id: number, amount: number, causeId: string): void {
  if (amount === 0) return
  const u = unit(ctx, id)
  if (u.stamina < amount) throw new Error(`unit ${id} cannot afford ${amount} stamina (has ${u.stamina})`)
  u.stamina -= amount
  emit(ctx, 'stamina.spent', causeId, { actor: id, amount, stamina: u.stamina })
}

/**
 * Gain stamina from an effect (a bonus move's rider, later a potion). Caps at
 * max — the same cap regenStamina applies, so a gain can never overfill. Its
 * own event type: a rider gain and end-of-phase regen are different facts, and
 * folding them together would make Focus indistinguishable from the clock.
 */
export function gainStamina(ctx: Ctx, id: number, amount: number, causeId: string): void {
  if (amount === 0) return
  const u = unit(ctx, id)
  const before = u.stamina
  u.stamina = Math.min(u.maxStamina, u.stamina + amount)
  if (u.stamina !== before) {
    emit(ctx, 'stamina.gained', causeId, { actor: id, amount: u.stamina - before, stamina: u.stamina })
  }
}

/**
 * Dock max stamina for the rest of the battle (Devotion's price). Floor 1 —
 * the wounds precedent, 3-UNITS-NOTES: "Wounds dock Max Stamina, never Regen
 * (floor 1)". Current stamina is clamped to the new ceiling.
 */
export function loseMaxStamina(ctx: Ctx, id: number, amount: number, causeId: string): void {
  if (amount === 0) return
  const u = unit(ctx, id)
  const before = u.maxStamina
  u.maxStamina = Math.max(1, u.maxStamina - amount)
  if (u.maxStamina === before) return
  if (u.stamina > u.maxStamina) u.stamina = u.maxStamina
  emit(ctx, 'staminaMax.lost', causeId, { actor: id, amount: before - u.maxStamina, maxStamina: u.maxStamina, stamina: u.stamina })
}

/** Add a stored stat modifier. The one write path to u.mods (Law 3). */
export function addStatMod(ctx: Ctx, id: number, mod: import('./stats.js').StatMod, causeId: string): void {
  const u = unit(ctx, id)
  u.mods.push(mod)
  emit(ctx, 'statmod.added', causeId, {
    actor: id, stat: mod.stat, op: mod.op, value: mod.value, source: mod.source,
    ...(mod.expiresAtTurn !== undefined ? { expiresAtTurn: mod.expiresAtTurn } : {}),
  })
}

export function regenStamina(ctx: Ctx, id: number, causeId: string): void {
  const u = unit(ctx, id)
  const before = u.stamina
  u.stamina = Math.min(u.maxStamina, u.stamina + u.staminaRegen)
  if (u.stamina !== before) {
    emit(ctx, 'stamina.regen', causeId, { actor: id, amount: u.stamina - before, stamina: u.stamina })
  }
}

export function applyDamage(ctx: Ctx, id: number, amount: number, causeId: string, extra: Record<string, unknown>): void {
  const u = unit(ctx, id)
  const hpBefore = u.hp
  const applied = Math.min(amount, hpBefore)
  const overkill = amount - applied
  u.hp = hpBefore - applied
  emit(ctx, 'damage.applied', causeId, {
    ...extra,
    target: id,
    amount: applied,
    overkill,
    hpBefore,
    hpAfter: u.hp,
  })
}

/**
 * Healing. Clamped at maxHp; the event carries what was asked vs what landed,
 * because "asked 3, landed 1" is the number Burn-halving and overheal analysis
 * will need (GAME-DESIGN §5: Burn halves healing — not yet implemented, and when
 * it is, it belongs on the ASKED amount before this mutator, one code path).
 */
export function applyHealing(ctx: Ctx, id: number, amount: number, causeId: string): void {
  const u = unit(ctx, id)
  if (u.lifeState !== 'standing' || amount <= 0) return
  const asked = amount
  // GAME-DESIGN §5: "Burn is the only thing that reduces healing, and it halves
  // rather than blocks." The gate lives INSIDE the one heal mutator, so no future
  // heal source can forget it — statuses declare `halvesHealing`, this reads it.
  // Truncating division, the one rounding rule (Law 7).
  let halvedBy
  for (const s of u.statuses) {
    if (ctx.statuses[s.id]?.halvesHealing) { amount = Math.trunc(amount / 2); halvedBy = s.id; break }
  }
  const hpBefore = u.hp
  const applied = Math.min(amount, u.maxHp - hpBefore)
  const tail = halvedBy ? { halvedBy } : {}
  if (applied <= 0) { emit(ctx, 'heal.applied', causeId, { target: id, asked, amount: 0, hpBefore, hpAfter: hpBefore, ...tail }); return }
  u.hp = hpBefore + applied
  emit(ctx, 'heal.applied', causeId, { target: id, asked, amount: applied, hpBefore, hpAfter: u.hp, ...tail })
}

export function setLifeState(ctx: Ctx, id: number, to: LifeState, causeId: string, extra: Record<string, unknown> = {}): void {
  const u = unit(ctx, id)
  const from = u.lifeState
  if (from === to) return
  u.lifeState = to
  emit(ctx, `life.${to}`, causeId, { ...extra, target: id, from, to })
}

export function setBleedOut(ctx: Ctx, id: number, value: number, causeId: string): void {
  const u = unit(ctx, id)
  u.bleedOut = value
  emit(ctx, 'bleedout.set', causeId, { target: id, bleedOut: value })
}

export function tickBleedOut(ctx: Ctx, id: number, causeId: string): void {
  const u = unit(ctx, id)
  u.bleedOut -= 1
  emit(ctx, 'bleedout.tick', causeId, { target: id, bleedOut: u.bleedOut })
}

export function beginActivation(ctx: Ctx, id: number, causeId: string): void {
  const u = unit(ctx, id)
  u.activationOrdinal += 1
  u.moveUsed = false
  u.primaryUsed = false
  // Slow — and any status declaring reducesMovement: this Activation's points
  // are Movement minus the summed stack values, floored at 0 (the unit still
  // acts from where it stands; that is what separates Slow from Stun). Read
  // ONCE, here — a slow applied mid-activation bites the NEXT activation
  // (SWITCHES.md slowReadAtActivationStart). The registry is read inline off
  // ctx rather than via status.ts, which imports this file (cycle).
  let mp = u.movement
  for (const s of u.statuses) if (ctx.statuses[s.id]?.reducesMovement && s.value > 0) mp -= s.value
  u.movePointsLeft = Math.max(0, mp)
  emit(ctx, 'activation.begin', causeId, {
    actor: id, ordinal: u.activationOrdinal, hex: u.hex, hp: u.hp, stamina: u.stamina,
    // Named only when reduced (Law 12: the log says why the unit moved less) —
    // an unslowed activation's event is byte-identical to before this landed.
    ...(u.movePointsLeft !== u.movement ? { movePoints: u.movePointsLeft } : {}),
  })
}

export function endActivation(ctx: Ctx, id: number, causeId: string): void {
  emit(ctx, 'activation.end', causeId, { actor: id, hex: unit(ctx, id).hex })
}

export function markMoveUsed(ctx: Ctx, id: number): void { unit(ctx, id).moveUsed = true }
export function markPrimaryUsed(ctx: Ctx, id: number): void { unit(ctx, id).primaryUsed = true }

export function setOutcome(ctx: Ctx, outcome: Ctx['state']['outcome'], causeId: string): void {
  if (ctx.state.outcome) return
  ctx.state.outcome = outcome
  emit(ctx, 'battle.end', causeId, { outcome, turn: ctx.state.turn })
}

export function setPhase(ctx: Ctx, phase: Ctx['state']['phase'], causeId: string): void {
  ctx.state.phase = phase
  emit(ctx, 'phase.begin', causeId, { phase, turn: ctx.state.turn })
}

export function beginTurn(ctx: Ctx, causeId: string): void {
  ctx.state.turn += 1
  emit(ctx, 'turn.begin', causeId, { turn: ctx.state.turn })
}
