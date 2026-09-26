// The mutator facade. Nothing outside this file writes to State (Constitution Law 3).
// Every mutator emits an event, which is what makes the log complete by construction —
// and therefore what makes replay, the text renderer, and every test possible.

import type { Ctx, Event, LifeState, Prop, Unit, UnitMods } from './types.js'
import type { HexId } from './hex.js'
import { effective } from './stats.js'

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

/** Accepted human selection moves only the unspent queue; activation begins later. */
export function selectActivation(ctx:Ctx, actor:number, causeId:string):void {
  const c=ctx.battleCursor
  if(c?.at!=='selecting') throw new Error('selectActivation requires a pending selection')
  const at=c.order.indexOf(actor,c.next)
  if(at<0) throw new Error('selected actor is not in the remaining phase queue')
  c.order.splice(at,1);c.order.splice(c.next,0,actor);c.at='activation-start'
  emit(ctx,'activation.selected',causeId,{actor,unitUid:ctx.state.units[actor]!.uid})
}

export function unit(ctx: Ctx, id: number): Unit {
  const u = ctx.state.units[id]
  if (!u) throw new Error(`no unit ${id}`)
  return u
}

export function moveUnit(ctx: Ctx, id: number, to: HexId, cost: number, causeId: string, terrainId: string, bonusPaid = 0): void {
  const u = unit(ctx, id)
  const from = u.hex
  u.hex = to
  u.movePointsLeft -= cost - bonusPaid
  emit(ctx, 'moved', causeId, {
    actor: id, from, to, cost,
    ...(bonusPaid > 0 ? { bonusPaid } : {}),
    // What was paid for, not just how much. `cost: 2` with no terrain is a number
    // nobody can check against the board (Law 12). Passed in rather than looked up:
    // mutate.ts is the one file that imports nothing (Law 5).
    terrain: terrainId,
    movePointsLeft: u.movePointsLeft,
  })
}

/**
 * Forced displacement — capability.knockback (2026-08-27). NOT a `moved`
 * event: `moved` is audited against the causing MOVEMENT POWER's own range,
 * and a knockback's cause is a trigger. Its own event keeps both audits exact.
 */
export function knockUnit(ctx: Ctx, id: number, to: HexId, by: number, causeId: string, travel?: { asked: number; taken: number; stoppedBy?: string }, collision?: Record<string, unknown>): void {
  const u = unit(ctx, id)
  const from = u.hex
  u.hex = to
  // fix.knockback-beyond-one (2026-09-04): a push of N names N and how far it
  // got, so a push cut short by a wall or a body is read off the line (Law 12).
  // v2.knockback-collisions (2026-09-23): a stopped push also names what it
  // struck (collidedWith, blocker, collisionValue, remaining) — the damage it
  // costs the mover is its own damage.applied event, the next line.
  emit(ctx, 'knocked', causeId, { actor: by, target: id, from, to, ...(travel ? { asked: travel.asked, hexes: travel.taken, ...(travel.stoppedBy ? { stoppedBy: travel.stoppedBy } : {}) } : {}), ...(collision ?? {}) })
}

/**
 * v2.knockback-collisions (COMBAT-V2 §9.3): the TRUE damage a stopped push
 * costs its mover, already through Protection (the caller spends the pool).
 * One HP mutation, one damage.applied event. When the blocker is a prop that
 * `consumes` and this damage takes the mover to 0 Health, the same event
 * carries `consumedBy` and the unit is marked — settle reads the mark where
 * death is decided (no corpse, no Deathbed). Law 3: one event, both changes.
 */
export function applyCollisionDamage(ctx: Ctx, id: number, amount: number, causeId: string, extra: Record<string, unknown>, consumesPropId: string | null): void {
  const u = unit(ctx, id)
  const consumed = consumesPropId !== null && u.hp - Math.min(amount, u.hp) <= 0
  if (consumed) u.consumedBy = consumesPropId
  applyDamage(ctx, id, amount, causeId, { ...extra, ...(consumed ? { consumedBy: consumesPropId } : {}) })
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
/**
 * A badge granted MID-BATTLE — badge.mechanism (2026-09-04): Wounded on a
 * stood deathbed roll, an affliction from a vampire's bite. The registry row's
 * modifiers arrive as stored stat mods (source = the badge, battle-long), its
 * riders attach as the unit's own frozen copies, its granted actions join the
 * one list, and the flag set is read off the registry from here on. Max HP and
 * Max Stamina move by their own mutators, as they do for every other source.
 * A badge the unit already carries is not granted twice. Loud on an unknown id.
 */
export function grantBadge(ctx: Ctx, id: number, badgeId: string, causeId: string): boolean {
  const u = unit(ctx, id)
  const b = ctx.badges[badgeId]
  if (!b) throw new Error(`grantBadge: '${badgeId}' is not a badge in the registry`)
  if (u.badges.includes(badgeId)) { emit(ctx, 'badge.held', causeId, { actor: id, badgeId }); return false }
  u.badges.push(badgeId)
  emit(ctx, 'badge.gained', causeId, { actor: id, badgeId, name: b.name, mods: b.statModifiers, flags: b.flags, ...(b.gaps ? { gaps: b.gaps } : {}) })
  for (const [stat, value] of Object.entries(b.statModifiers)) {
    if (!value) continue
    if (stat === 'maxHp') { if (value > 0) gainMaxHp(ctx, id, value, badgeId); else loseMaxHp(ctx, id, -value, badgeId); continue }
    if (stat === 'maxStamina') { if (value < 0) loseMaxStamina(ctx, id, -value, badgeId); else { u.maxStamina += value; emit(ctx, 'maxstamina.gained', badgeId, { target: id, amount: value, maxStamina: u.maxStamina }) }; continue }
    addStatMod(ctx, id, { stat: stat as import('./stats.js').StatName, op: 'add', value, source: badgeId, scope: 'unit' }, badgeId)
  }
  for (const t of b.triggers ?? []) u.triggers.push({ ...t })
  for (const g of b.grants) if (!u.actions.includes(g) && ctx.actions[g]) u.actions.push(g)
  return true
}

/**
 * seam.unit-mods (2026-09-25, GEAR-IMPLEMENTATION.md §1): a fielded hero's per-unit
 * numbers — the set bonuses the kingdom resolved when it built the hero for battle.
 * FIELDING ONLY: runs once, after the unit's enter and equipped lines, on a unit at full
 * Health and Stamina. Grouped by source in the order first handed (Law 6), one
 * `unit.modified` per source naming it (Law 12). A stat the rules read through the
 * pipeline becomes a stored StatMod (scope 'unit', source = the set), so the ledger
 * names it; the three the rules read raw — Max Health, Max Stamina, Stamina Regen — fold
 * onto the unit's own field, current Health and Stamina rising with their maxima, as
 * every other source's do (grantBadge). A weapon's +damage is stored as data on the
 * unit and read at DMG.DECLARE. Zero values are dropped. Inputs are validated by the
 * fielding (setup.ts) before this runs.
 */
export function applyUnitMods(ctx: Ctx, id: number, mods: UnitMods): void {
  const u = unit(ctx, id)
  const sources: string[] = []
  for (const m of [...(mods.stats ?? []), ...(mods.attacks ?? [])]) if (!sources.includes(m.source)) sources.push(m.source)
  for (const source of sources) {
    const stats: Record<string, number> = {}
    for (const m of mods.stats ?? []) if (m.source === source && m.add !== 0) stats[m.stat] = (stats[m.stat] ?? 0) + m.add
    for (const k of Object.keys(stats)) if (stats[k] === 0) delete stats[k]
    const attacks = (mods.attacks ?? []).filter((a) => a.source === source && a.damage !== 0).map((a) => ({ itemId: a.itemId, damage: a.damage }))
    if (!Object.keys(stats).length && !attacks.length) continue
    const pools: Record<string, number> = {}
    for (const stat of Object.keys(stats).sort()) {
      const value = stats[stat]!
      if (stat === 'maxHp') { u.maxHp += value; u.hp += value; pools['maxHp'] = u.maxHp; pools['hp'] = u.hp; continue }
      if (stat === 'maxStamina') { u.maxStamina += value; u.stamina += value; pools['maxStamina'] = u.maxStamina; pools['stamina'] = u.stamina; continue }
      if (stat === 'staminaRegen') { u.staminaRegen += value; pools['staminaRegen'] = u.staminaRegen; continue }
      u.mods.push({ stat: stat as import('./stats.js').StatName, op: 'add', value, source, scope: 'unit' })
    }
    if (attacks.length) u.weaponBonuses = [...(u.weaponBonuses ?? []), ...attacks.map((a) => ({ ...a, source }))]
    emit(ctx, 'unit.modified', source, {
      actor: id, source,
      ...(Object.keys(stats).length ? { stats } : {}),
      ...(attacks.length ? { attacks } : {}),
      ...pools,
    })
  }
}

/** The flags of every badge a unit carries, read off the registry — the rules ask this, never the unit. */
export function badgeFlags(ctx: Ctx, u: Unit): { bleedsOut: boolean; wounded: boolean } {
  let bleedsOut = false, wounded = false
  for (const id of u.badges) { const f = ctx.badges[id]?.flags; if (f?.bleedsOut) bleedsOut = true; if (f?.wounded) wounded = true }
  return { bleedsOut, wounded }
}

export function addStatMod(ctx: Ctx, id: number, mod: import('./stats.js').StatMod, causeId: string): void {
  const u = unit(ctx, id)
  u.mods.push(mod)
  emit(ctx, 'statmod.added', causeId, {
    actor: id, stat: mod.stat, op: mod.op, value: mod.value, source: mod.source,
    ...(mod.expiresAtTurn !== undefined ? { expiresAtTurn: mod.expiresAtTurn } : {}),
    ...(mod.expiresAfterActivation !== undefined ? { expiresAfterActivation: mod.expiresAfterActivation } : {}),
  })
}

/**
 * End of Activation: remove the holder's mods that last "until the end of your
 * next Activation" and whose Activation this was (V2 shields, 2026-09-23). One
 * `statmod.expired` event per mod removed (Law 3).
 */
export function expireActivationMods(ctx: Ctx, id: number, causeId: string): void {
  const u = unit(ctx, id)
  const gone = u.mods.filter((m) => m.expiresAfterActivation !== undefined && m.expiresAfterActivation <= u.activationOrdinal)
  if (!gone.length) return
  u.mods = u.mods.filter((m) => !gone.includes(m))
  for (const m of gone) emit(ctx, 'statmod.expired', causeId, { actor: id, stat: m.stat, op: m.op, value: m.value, source: m.source })
}

/**
 * Stamina DRAIN — station.crit (2026-08-27), the chart's Winded row: "lose 4
 * Stamina, to a minimum of 0." Not spendStamina, which throws on shortfall —
 * a drain takes what is there and floors at zero, as dictated.
 */
export function drainStamina(ctx: Ctx, id: number, amount: number, causeId: string): void {
  const u = unit(ctx, id)
  const before = u.stamina
  u.stamina = Math.max(0, u.stamina - amount)
  emit(ctx, 'stamina.drained', causeId, { target: id, asked: amount, amount: before - u.stamina, stamina: u.stamina })
}

/**
 * Max Health loss — station.crit (2026-08-27), the chart's Nerve Struck row:
 * "−2 Max Health", and "nothing else floors" read literally — a unit whose
 * Max Health reaches 0 dies of the strike. The merciful floor-at-1 path is
 * the critMaxHealthFloorsAtOne switch. HP clamps to the new maximum; the
 * caller's settle turns an hp of 0 into a death with this causeId.
 */
/**
 * Max Health GAINED — ability.effects (2026-09-03), Fortify's "+3 Health" for
 * the rest of the Battle. The mirror of loseMaxHp: the cap rises and the bar
 * rises with it, so the gain is felt now. u.maxHp is the field the healing
 * cap and the crit chart read; it is not resolved through the stat pipeline.
 */
export function gainMaxHp(ctx: Ctx, id: number, amount: number, causeId: string): void {
  const u = unit(ctx, id)
  if (amount <= 0) return
  u.maxHp += amount
  u.hp += amount
  emit(ctx, 'maxHp.gained', causeId, { target: id, amount, maxHp: u.maxHp, hp: u.hp })
}

export function loseMaxHp(ctx: Ctx, id: number, amount: number, causeId: string): void {
  const u = unit(ctx, id)
  const before = u.maxHp
  const floor = ctx.cfg.switches.critMaxHealthFloorsAtOne ? 1 : 0
  u.maxHp = Math.max(floor, u.maxHp - amount)
  if (u.hp > u.maxHp) u.hp = u.maxHp
  emit(ctx, 'maxHp.lost', causeId, { target: id, amount: before - u.maxHp, maxHp: u.maxHp, hp: u.hp })
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

/** Ordered hit packet HP attribution; one HP mutation/event, no settlement inside a hit. */
export function applyAttackPackets<T extends {readonly resolved:number;readonly damageType:string}>(ctx:Ctx,id:number,plan:readonly T[],causeId:string,extra:Record<string,unknown>){
  let hp=unit(ctx,id).hp
  const packets=plan.map(packet=>{
    const applied=Math.min(packet.resolved,hp);hp-=applied
    return {...packet,applied,overkill:packet.resolved-applied}
  })
  const amount=plan.reduce((n,p)=>n+p.resolved,0),applied=packets.reduce((n,p)=>n+p.applied,0)
  const physicalApplied=packets.reduce((n,p)=>n+(p.damageType==='physical'?p.applied:0),0)
  applyDamage(ctx,id,amount,causeId,{...extra,packets,physicalApplied})
  return {packets,applied,physicalApplied}
}

/**
 * Healing. Clamped at maxHp; the event carries what was asked vs what landed,
 * because "asked 3, landed 1" is the number Burn-halving and overheal analysis
 * will need (GAME-DESIGN §5: Burn halves healing — not yet implemented, and when
 * it is, it belongs on the ASKED amount before this mutator, one code path).
 */
export function reduceStatus(ctx: Ctx, unitId: number, id: string, by: number, causeId: string): number {
  const u = unit(ctx, unitId)
  const s = u.statuses.find((x) => x.id === id)
  if (!s) return 0
  const before = s.value
  s.value = Math.max(0, s.value - by)
  const spent = before - s.value
  emit(ctx, 'status.reduced', causeId, { target: unitId, statusId: id, by: spent, before, after: s.value })
  if (s.value === 0) removeStatus(ctx, unitId, id, causeId)
  return spent
}

/**
 * v2.prone (COMBAT-V2-DESIGN §10): stand up. Every prone status the unit holds
 * is removed (status.expired each, in id order), then one `unit.stood` line
 * names them — the standing is its own event for the viewer (Law 3). The
 * registry is read inline off ctx (status.ts imports this file).
 */
export function standUp(ctx: Ctx, unitId: number, causeId: string): void {
  const u = unit(ctx, unitId)
  const ids = u.statuses.filter((s) => s.value > 0 && ctx.statuses[s.id]?.prone !== undefined).map((s) => s.id).sort()
  for (const id of ids) removeStatus(ctx, unitId, id, causeId)
  emit(ctx, 'unit.stood', causeId, { actor: unitId, hex: u.hex, statusIds: ids })
}

export function removeStatus(ctx: Ctx, unitId: number, id: string, causeId: string): void {
  const u = unit(ctx, unitId)
  const i = u.statuses.findIndex((s) => s.id === id)
  if (i < 0) return
  u.statuses.splice(i, 1)
  emit(ctx, 'status.expired', causeId, { target: unitId, statusId: id })
}

export function applyHealing(ctx: Ctx, id: number, amount: number, causeId: string): void {
  const u = unit(ctx, id)
  if (u.lifeState !== 'standing' || amount <= 0) return
  // capability.karma (2026-09-03): "Increases every heal the unit receives by
  // its value" — before Burn's halving, which the row calls the only reducer.
  for (const s of u.statuses) if (ctx.statuses[s.id]?.boostsHealingReceived && s.value > 0) { amount += s.value; emit(ctx, 'heal.boosted', causeId, { target: id, statusId: s.id, by: s.value }) }
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
  if (applied <= 0) {
    emit(ctx, 'heal.applied', causeId, { target: id, asked, amount: 0, hpBefore, hpAfter: hpBefore, ...tail })
    shedByHealing(ctx, id, 0, amount, causeId)   // nothing landed; the asked-after-Burn path may still shed
    return
  }
  u.hp = hpBefore + applied
  emit(ctx, 'heal.applied', causeId, { target: id, asked, amount: applied, hpBefore, hpAfter: u.hp, ...tail })
  shedByHealing(ctx, id, applied, amount, causeId)
}

/**
 * fix.bleed-magnitude (2026-09-02) — Codex S41 "healing should cure bleed",
 * S43 "half the applied amount comes off Bleed": every status whose row says
 * shedByHealing loses HALF the healing, rounded nearest with 0.5 up (Codex:
 * "rounded nearest, 0.5 up"). Which "healing" — what landed on the bar, or
 * what was asked after Burn — is the bleedShedFromLanded switch. Runs after
 * the heal event so the log reads heal, then shed, with the heal as cause.
 */
function shedByHealing(ctx: Ctx, id: number, landed: number, askedAfterBurn: number, causeId: string): void {
  const u = unit(ctx, id)
  const base = ctx.cfg.switches.bleedShedFromLanded ? landed : askedAfterBurn
  const shed = Math.floor((base + 1) / 2)   // nearest, 0.5 up — integers only (Law 7)
  if (shed <= 0) return
  for (const s of [...u.statuses]) {
    if (ctx.statuses[s.id]?.shedByHealing === 'half' && s.value > 0) reduceStatus(ctx, id, s.id, shed, causeId)
  }
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

/**
 * A hit on the downed pushes the counter — fix.downed-targetable (2026-09-03),
 * GAME-DESIGN §9: "a hit only accelerates the bleed-out counter. It never
 * kills." Its own mutator and its own event, NOT tickBleedOut: the tick is the
 * End-of-Hero-Phase rung's line and the rulings test holds it to that ladder.
 * Never below 1 — the kill belongs to the rung alone.
 */
export function accelerateBleedOut(ctx: Ctx, id: number, steps: number, causeId: string, actor: number): void {
  const u = unit(ctx, id)
  const before = u.bleedOut
  u.bleedOut = Math.max(1, u.bleedOut - Math.max(0, steps))
  emit(ctx, 'bleedout.accelerated', causeId, { actor, target: id, steps: before - u.bleedOut, bleedOut: u.bleedOut })
}

export function beginActivation(ctx: Ctx, id: number, causeId: string): void {
  const u = unit(ctx, id)
  u.activationOrdinal += 1
  u.moveUsed = false
  u.primaryUsed = false
  delete u.swapUsed   // v2.swap: one swap per activation
  // Slow — and any status declaring reducesMovement: this Activation's points
  // are Movement minus the summed stack values, floored at 0 (the unit still
  // acts from where it stands; that is what separates Slow from Stun). Read
  // ONCE, here — a slow applied mid-activation bites the NEXT activation
  // (SWITCHES.md slowReadAtActivationStart). The registry is read inline off
  // ctx rather than via status.ts, which imports this file (cycle).
  // Movement through the stat pipeline (capability.auras, 2026-09-03): the
  // Balrog's Imprisoning Aura is −5 Movement LENT while inside — a derived
  // mod, so it must be read here, not off the raw field.
  const mv = effective(ctx, u, 'movement')
  let mp = mv.value
  for (const s of u.statuses) if (ctx.statuses[s.id]?.reducesMovement && s.value > 0) mp -= s.value
  // capability.root (2026-09-03): "Stops the unit moving at all" — not a reduction, a stop
  if (u.statuses.some((s) => ctx.statuses[s.id]?.blocksMovement && s.value > 0)) mp = 0
  u.movePointsLeft = Math.max(0, mp)
  emit(ctx, 'activation.begin', causeId, {
    actor: id, ordinal: u.activationOrdinal, hex: u.hex, hp: u.hp, stamina: u.stamina,
    // Named only when reduced (Law 12: the log says why the unit moved less) —
    // an unslowed activation's event is byte-identical to before this landed.
    ...(u.movePointsLeft !== u.movement ? { movePoints: u.movePointsLeft } : {}),
    // capability.auras (2026-09-03): what LENT or took movement, by source — the
    // Balrog's Imprisoning Aura names itself here (Law 12). Absent when nothing did.
    ...(mv.ledger.length ? { movementMods: mv.ledger.map((r) => ({ source: r.source, delta: r.delta })) } : {}),
  })
}

export function endActivation(ctx: Ctx, id: number, causeId: string): void {
  emit(ctx, 'activation.end', causeId, { actor: id, hex: unit(ctx, id).hex })
}

/** A second action cycle inside the same activation, with its original allowance. */
export function reopenSurgeCycle(ctx: Ctx, id: number, allowance: number, link: number): void {
  const u = unit(ctx, id)
  u.moveUsed = false
  u.primaryUsed = false
  delete u.swapUsed   // v2.swap (COMBAT-V2 §11.2): "A Surge reopens everything, the swap included"
  const rooted = u.statuses.some(s => s.value > 0 && ctx.statuses[s.id]?.blocksMovement)
  u.movePointsLeft = rooted ? 0 : allowance
  emit(ctx, 'surge.hit', 'engine', { actor: id, link, movePoints: u.movePointsLeft })
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

/**
 * THE POWER POOL — capability.power-pool (2026-09-03). The enemy side's one
 * global integer (ENEMY-REVIEW.md P1): gained, never spent, and it stays
 * when the unit that brought it dies. Every gain is a line naming its cause.
 */
export function gainPower(ctx: Ctx, amount: number, causeId: string, extra: Record<string, unknown> = {}): void {
  if (amount <= 0) return
  const before = ctx.state.power ?? 0
  ctx.state.power = before + amount
  emit(ctx, 'power.gained', causeId, { amount, before, after: ctx.state.power, ...extra })
}

// ── CORPSES — capability.corpses (2026-09-03) ────────────────────────────────
// ENEMY-REVIEW P4: created when any enemy dies and when a hero actually dies;
// summons leave none. Board objects on the state, plain data, ids by count.
export function createCorpse(ctx: Ctx, u: Unit, causeId: string): void {
  const list = ctx.state.corpses ?? (ctx.state.corpses = [])
  const id = list.length ? Math.max(...list.map((c) => c.id)) + 1 : 1
  list.push({ id, hex: u.hex, typeId: u.typeId, side: u.side, uid: u.uid })
  emit(ctx, 'corpse.created', causeId, { corpse: id, hex: u.hex, of: u.id, typeId: u.typeId, side: u.side })
}
export function removeCorpse(ctx: Ctx, corpseId: number, causeId: string, how: 'raised' | 'eaten' | 'consumed' | 'destroyed', actor: number): void {
  const list = ctx.state.corpses ?? []
  const i = list.findIndex((c) => c.id === corpseId)
  if (i < 0) throw new Error(`corpse ${corpseId} is not on the board`)
  const [c] = list.splice(i, 1)
  emit(ctx, 'corpse.removed', causeId, { corpse: corpseId, hex: c!.hex, how, actor, typeId: c!.typeId })
}
/** Corpses within `radius` of a hex, nearest first, lowest id first (Law 6). */
export function corpsesNear(ctx: Ctx, hex: HexId, radius: number): { id: number; hex: number; typeId: string; side: 'hero' | 'enemy'; uid: number }[] {
  return (ctx.state.corpses ?? []).filter((c) => ctx.geo.distance(c.hex, hex) <= radius)
    .sort((a, b) => ctx.geo.distance(a.hex, hex) - ctx.geo.distance(b.hex, hex) || a.id - b.id)
}

// ── GROUND LAYERS — capability.ground-layers (2026-09-03) ────────────────────
/**
 * Paint a layer onto a hex. rule.ground-layers: at most one per hex, a new one
 * replaces the old — except Burn and Frost, which cancel one for one
 * (rule.burn-frost-cancel): painting burning onto frost (or the reverse)
 * leaves the hex bare. Every stroke is a line naming its cause.
 */
export function paintLayer(ctx: Ctx, hex: HexId, layer: number, causeId: string): void {
  const layers = ctx.state.layers ?? (ctx.state.layers = new Array<number>(ctx.state.terrain.length).fill(0))
  const before = layers[hex] ?? 0
  const cancel = (before === 1 && layer === 2) || (before === 2 && layer === 1)   // burning ⟷ frost
  const after = cancel ? 0 : layer
  layers[hex] = after
  emit(ctx, cancel ? 'layer.cancelled' : 'layer.painted', causeId, { hex, before, after, layer })
}
export function layerAt(ctx: Ctx, hex: HexId): number { return ctx.state.layers?.[hex] ?? 0 }

/** A persistent caster-local burst ordinal, separate from attack cups. */
export function beginBurst(ctx: Ctx, actor: number, causeId: string, facts: Record<string, unknown>): number {
  const u = unit(ctx, actor)
  u.burstOrdinal = (u.burstOrdinal ?? 0) + 1
  emit(ctx, 'burst.declared', causeId, { ...facts, actor, ordinal: u.burstOrdinal })
  return u.burstOrdinal
}

/** One defender-local incoming hit ordinal; no accuracy or trigger stream reuse. */
export function recordBlock(ctx: Ctx, defender: number, causeId: string, facts: Record<string, unknown>): number {
  const u = unit(ctx, defender)
  u.incomingAttackOrdinal = (u.incomingAttackOrdinal ?? 0) + 1
  emit(ctx, 'block.rolled', causeId, { ...facts, defender, ordinal: u.incomingAttackOrdinal })
  return u.incomingAttackOrdinal
}

/**
 * v2.prop-destroy (COMBAT-V2 §12.1–12.3, ruled 2026-09-07): apply `by` destroy
 * steps to one prop. The tier (material) is the number of steps it takes; below
 * it the prop is damaged (prop.damaged), at it the prop is destroyed
 * (prop.damaged, then prop.destroyed). "Destroyed high cover leaves low cover":
 * a high prop becomes a low prop under the same id and footprint, intact, with
 * nothing that belongs only to a high prop (collision, consumes); a low prop
 * leaves nothing. Steps past the tier are lost (SWITCHES.md propDestroyOverflow).
 * Copy-on-write: `state.props` is replaced, never edited in place, so a shallow
 * fork sharing the array never sees the change.
 */
export function damageProp(ctx: Ctx, propId: string, by: number, causeId: string, actor: number | null): void {
  if (!Number.isSafeInteger(by) || by < 1) throw new Error('damageProp: steps must be a positive integer')
  const at = ctx.state.props.findIndex(p => p.id === propId)
  if (at < 0) throw new Error(`damageProp: no prop ${propId}`)
  const prop = ctx.state.props[at]!
  const before = prop.steps ?? 0, after = Math.min(prop.material, before + by)
  const props = [...ctx.state.props]
  let leaves: 'low' | 'nothing' | null = null
  if (after < prop.material) props[at] = { ...prop, steps: after }
  else if (prop.height === 'high') {
    const { collisionValue: _c, consumes: _k, steps: _s, crossingCost: _x, ...rest } = prop
    props[at] = { ...rest, height: 'low' } as Prop
    leaves = 'low'
  } else { props.splice(at, 1); leaves = 'nothing' }
  ctx.state.props = props
  emit(ctx, 'prop.damaged', causeId, { actor, prop: propId, footprint: prop.footprint.kind, height: prop.height, tier: prop.material, stepsBefore: before, stepsAfter: after })
  // fix.prop-destroyed-remnant: the low cover left behind is stated, not re-derived by a reader.
  if (leaves) emit(ctx, 'prop.destroyed', causeId, { actor, prop: propId, leaves, ...(leaves === 'low' ? { remnant: structuredClone(props[at]) } : {}) })
}
