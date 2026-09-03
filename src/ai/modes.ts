// Three AI modes, written as rules rather than scores.
// Utility scoring comes later; these need to be inspectable by eye so that when a
// battle looks wrong we can tell the engine from the AI.

import { distance } from './../core/hex.js'
import type { HexId } from './../core/hex.js'
import { executeFlight, executeMove, executeSidestep, flightLandings, livingEnemies, movePowerOf, moveStaminaCost, nearestEnemy, occupancy, pathTo, reachable, stepRangeOf, usableMoves } from './../core/movement.js'
import type { Reach } from './../core/movement.js'
import type { MoveDef } from './../core/types.js'
import { isPassable } from './../content/maps.js'
import { neighboursOf } from './../core/hex.js'
import { areaUnitIdsOf, canAttack, performAttack, preview, reachOf } from './../core/pipeline.js'
import { canUsePower, isReady, powerBlastIdsOf, powerTargetsOf, previewPower, usePower } from './../core/ability.js'
import { isConfused } from './../core/status.js'
import { reachBonusOf } from './../content/maps.js'
import { TERRAIN } from './../core/types.js'
import { emit, unit } from './../core/mutate.js'
import { settle } from './../core/settle.js'
import type { Ctx, Unit } from './../core/types.js'

/** Lowest current health, ties on lower unit id (Law 6). */
function lowestHealth(us: Unit[]): Unit | null {
  let best: Unit | null = null
  for (const u of us) {
    if (!best || u.hp < best.hp || (u.hp === best.hp && u.id < best.id)) best = u
  }
  return best
}

/**
 * Hexes a melee enemy could reach and strike from, next turn.
 * Every AI can read every unit's role, so "melee enemy" is a data question.
 */
function meleeThreatens(ctx: Ctx, u: Unit, hex: HexId): boolean {
  return livingEnemies(ctx, u).some(
    (e) => e.role === 'melee' && distance(hex, e.hex) <= e.movement + 1,
  )
}

function adjacentEnemies(ctx: Ctx, u: Unit): Unit[] {
  return withDowned(ctx, u, livingEnemies(ctx, u).filter((e) => distance(u.hex, e.hex) === 1))
}

/**
 * Enemies this unit can legally attack RIGHT NOW, by THE legality function
 * (Law 2 — canAttack, never a reimplemented distance check). For every reach-1
 * unit this is exactly adjacentEnemies; it exists because the Green Drake
 * (2026-08-20) hisses at reach 5, and an adjacency-only swing check meant a
 * reach unit closed politely and then never attacked at all.
 */
function enemiesInAttackReach(ctx: Ctx, u: Unit): Unit[] {
  return withDowned(ctx, u, livingEnemies(ctx, u).filter((e) => u.attacks.some((id) => canAttack(ctx, u.id, e.id, id))))
}

/**
 * fix.downed-targetable (2026-09-03): the DOWNED are legal targets now
 * (canAttack), and whether the AI takes them is the `aiAttacksDowned` switch —
 * never · only when no standing enemy is in reach (default) · always. Downed
 * candidates are appended AFTER the standing ones, so `lowestHealth` (hp 0)
 * would otherwise always pick the corpse-to-be first: with 'always' that is
 * the intent (a finisher); with 'whenNoStanding' the standing list wins.
 */
function withDowned(ctx: Ctx, u: Unit, standing: Unit[]): Unit[] {
  const mode = ctx.cfg.switches.aiAttacksDowned
  if (mode === 'never') return standing
  if (mode === 'whenNoStanding' && standing.length) return standing
  const downed = ctx.state.units.filter((o) => o.side !== u.side && o.lifeState === 'downed'
    && u.attacks.some((id) => canAttack(ctx, u.id, o.id, id)))
  return mode === 'always' ? [...downed, ...standing] : downed
}

/** The farthest this unit can strike with any of its attacks, for honest idle text. */
function maxAttackReach(ctx: Ctx, u: Unit): number {
  let r = 1
  for (const id of u.attacks) { const a = ctx.attacks[id]; if (a) r = Math.max(r, reachOf(ctx, u, a)) }
  return r
}

/**
 * Which attack to swing — ai.attack-choice (2026-09-03), a SWITCH, not a
 * ruling (SWITCHES.md aiAttackChoice):
 *   declared     the first affordable attack in the unit's declared order —
 *                the rule it has always been, and the default
 *   bestDamage   the legal attack whose preview damageOnHit is highest;
 *                ties to the earlier listing (Law 6). Riders are not priced.
 * Every quantity from canAttack/preview (Law 2).
 */
function bestAttack(ctx: Ctx, attackerId: number, targetId: number): string | null {
  const u = unit(ctx, attackerId)
  if (ctx.cfg.switches.aiAttackChoice === 'bestDamage') {
    let best: string | null = null, bestDmg = -1
    for (const id of u.attacks) {
      if (!canAttack(ctx, attackerId, targetId, id)) continue
      const d = preview(ctx, attackerId, targetId, id).damageOnHit
      if (d > bestDmg) { best = id; bestDmg = d }
    }
    return best
  }
  for (const id of u.attacks) {
    if (canAttack(ctx, attackerId, targetId, id)) return id
  }
  return null
}

/**
 * The fallback when the walk power is unaffordable: a granted sidestep-shaped
 * power moves one hex toward `dest` — Angela 2026-08-21, movement is a CHOICE
 * among granted powers, and the free one is what a stamina-starved unit still
 * has. Only steps if it strictly shortens the distance (a sideways shuffle is
 * noise, not progress). Ties break on lower HexId (Law 6).
 */
function sidestepToward(ctx: Ctx, u: Unit, dest: HexId): boolean {
  const power = movePowerOf(ctx, u, 'sidestep')
  if (!power) return false
  const range = stepRangeOf(power)
  // A zero-range bonus move (Focus, Devotion — 2026-08-25) cannot step toward
  // anything; its "progress" is the rider. Using it while starved is exactly
  // its design intent ("the cheap way to refill"), so a stamina-starved unit
  // takes it rather than standing refused.
  if (range === 0) return executeSidestep(ctx, u.id, u.hex, power)
  const occ = occupancy(ctx)
  const d0 = distance(u.hex, dest)
  let best: HexId | null = null
  let bestD = d0
  for (const n of stepCandidates(ctx, u, range, occ)) {
    const d = distance(n, dest)
    if (d < bestD) { bestD = d; best = n }
  }
  if (best === null) return false
  return executeSidestep(ctx, u.id, best, power)
}

/**
 * Every hex a sidestep-shaped power of this range could land on: exactly
 * `range` away, passable, free. Ascending HexId (Law 6). Board scan — 256
 * hexes is microseconds, and Law 0 forbids being clever about it.
 */
function stepCandidates(ctx: Ctx, u: Unit, range: number, occ = occupancy(ctx)): HexId[] {
  if (range === 1) return [...neighboursOf(u.hex)].sort((a, b) => a - b)
    .filter((n) => !occ.has(n) && isPassable(ctx.state.terrain[n] ?? 0))
  const out: HexId[] = []
  for (let h = 0; h < ctx.state.terrain.length; h++) {
    if (distance(u.hex, h) !== range) continue
    if (occ.has(h) || !isPassable(ctx.state.terrain[h] ?? 0)) continue
    out.push(h)
  }
  return out
}

function idle(ctx: Ctx, u: Unit, reason: string): void {
  emit(ctx, 'activation.idle', `ai.${u.ai}`, { actor: u.id, reason })
}

/**
 * Swing wide when it is plainly better — capability.area-attack (2026-08-27).
 * A RULE, not a score: if an affordable, legal AREA attack from where the unit
 * stands would strike at least two enemies — and no ally, unless the
 * aiAreaThroughAllies switch says friends are acceptable losses — take it over
 * the preference-order pick. Everything it reads comes from areaUnitIdsOf and
 * canAttack (Law 2 — no second calculator). First qualifying attack in the
 * unit's declared order wins (Law 6).
 */
function areaSwing(ctx: Ctx, u: Unit, targetId: number): string | null {
  for (const id of u.attacks) {
    const a = ctx.attacks[id]
    if (!a?.area) continue
    if (!canAttack(ctx, u.id, targetId, id)) continue
    const struck = areaUnitIdsOf(ctx, u.id, targetId, id)
    const enemies = struck.filter((s) => unit(ctx, s).side !== u.side).length
    const allies = struck.length - enemies
    if (enemies >= 2 && (allies === 0 || ctx.cfg.switches.aiAreaThroughAllies)) return id
  }
  return null
}

function attackIfPossible(ctx: Ctx, u: Unit, candidates: Unit[]): boolean {
  const target = lowestHealth(candidates)
  if (!target) return false
  const attackId = areaSwing(ctx, u, target.id) ?? bestAttack(ctx, u.id, target.id)
  if (!attackId) return false
  // Did stamina force a worse attack than the unit would have preferred?
  const preferred = u.attacks[0]
  if (preferred && preferred !== attackId) {
    const want = ctx.attacks[preferred]
    if (want && u.stamina < want.staminaCost) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: preferred, took: attackId, reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  performAttack(ctx, u.id, target.id, attackId)
  settle(ctx, attackId)
  return true
}

// ── dumb-melee ───────────────────────────────────────────────────────────────
// Steps toward the nearest hero with no regard for anything, then hits whatever
// is adjacent. No self-preservation, no target switching.
function dumbMelee(ctx: Ctx, u: Unit): void {
  const target = nearestEnemy(ctx, u)
  if (!target) return

  if (distance(u.hex, target.hex) > 1) {
    // The movement CHOICE (2026-08-21): first affordable path-shaped power in
    // the unit's declared order; a stamina-starved unit falls back to its free
    // sidestep rather than standing refused.
    const walk = movePowerOf(ctx, u, 'path')
    if (walk) {
      const reach = reachable(ctx, u, walk.budgetMod)
      let bestHex: HexId | null = null
      let bestD = distance(u.hex, target.hex)
      for (const [hex] of [...reach].sort((a, b) => a[0] - b[0])) {
        const d = distance(hex, target.hex)
        if (d < bestD) { bestD = d; bestHex = hex }
      }
      if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex), walk)
    } else {
      sidestepToward(ctx, u, target.hex)
    }
  }
  if (u.lifeState !== 'standing') return
  if (effectsPower(ctx, u, 'feast')) return
  // Swing at whatever is IN REACH, not merely adjacent (found landing
  // unit.green-drake, 2026-08-20). For reach-1 units — every zombie — the
  // candidate set and the idle text are both byte-identical to the old
  // adjacency check, which is what keeps this landing proven-neutral on the
  // control battles.
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) {
    idle(ctx, u, maxAttackReach(ctx, u) > 1 ? 'no enemy in reach' : 'nothing adjacent')
  }
}

/**
 * Support powers — capability.item-powers (2026-08-27). RULES, not scores,
 * every quantity from preview()/canUsePower (Law 2):
 *
 *   heal       when the most-wounded legal ally is missing at least HALF the
 *              heal (at most half wasted) — most missing first, ties to the
 *              lower id (Law 6). "One ally within 6 hexes."
 *   selfGuard  when two or more enemies stand adjacent — the shield answers
 *              real pressure, and its permanent Dodge price is not paid for
 *              one zombie.
 *
 * Both spend the primary action, so a used support power IS the activation's
 * action. Damage powers are not handled here — the kite's own power block
 * already weighs those against the staff.
 */
function supportPower(ctx: Ctx, u: Unit): boolean {
  for (const id of u.abilities) {
    const a = ctx.abilities[id]
    if (!a) continue
    if (a.effect === 'heal') {
      let best: Unit | null = null
      for (const o of ctx.state.units) {
        if (o.side !== u.side || o.lifeState !== 'standing') continue
        if (!canUsePower(ctx, u.id, o.id, id)) continue
        if (o.maxHp - o.hp <= 0) continue
        if (!best || (o.maxHp - o.hp) > (best.maxHp - best.hp)
          || ((o.maxHp - o.hp) === (best.maxHp - best.hp) && o.id < best.id)) best = o
      }
      if (best) {
        const amount = previewPower(ctx, u.id, best.id, id).heal ?? 0
        if (amount > 0 && (best.maxHp - best.hp) * 2 >= amount) {
          usePower(ctx, u.id, best.id, id)
          settle(ctx, id)
          return true
        }
      }
    }
    if (a.effect === 'selfGuard' && canUsePower(ctx, u.id, u.id, id)) {
      if (adjacentEnemies(ctx, u).length >= 2) {
        usePower(ctx, u.id, u.id, id)
        settle(ctx, id)
        return true
      }
    }
  }
  return false
}

/**
 * Effect-list powers — ability.effects (2026-09-03). RULES, not scores, every
 * quantity from canUsePower/previewPower (Law 2), inspectable by eye:
 *
 *   heal (any effect list with a heal)   as supportPower's heal: the ally
 *                                        missing the most, when at most half
 *                                        is wasted
 *   ally status/statMod (on a unit or     the lowest-health legal ally, or the
 *   unit or an area of allies)           caster's own area — whenever ready
 *   self (statMod / status on self)      whenever ready, IF an enemy is within
 *                                        movement + 1 (it is a fight) and any
 *                                        self-damage is below half of hp
 *   enemy damage                         the kite's own power block already
 *                                        weighs those against the weapon
 *
 * `when` is 'free' (powers that do not spend the primary — used first, always)
 * or 'primary' (used only when the unit is not about to attack: called after
 * the attack step fails, so a stance never displaces a swing). Cheapest honest
 * policy; the AI modes backlog is where a better one goes.
 */
function effectsPower(ctx: Ctx, u: Unit, when: 'free' | 'primary' | 'opening' | 'feast'): boolean {
  for (const id of u.abilities) {
    const a = ctx.abilities[id]
    if (!a?.effects || a.effects.length === 0) continue
    if (when === 'feast') {
      // capability.corpses (2026-09-03): a body in reach is eaten BEFORE the
      // swing — the Ghoul economy runs on it (SWITCHES.md aiEatsBeforeBiting).
      if (!ctx.cfg.switches.aiEatsBeforeBiting || !a.effects.some((e) => e.kind === 'corpse.eat')) continue
      if (!canUsePower(ctx, u.id, u.id, id)) continue
      usePower(ctx, u.id, u.id, id); settle(ctx, id); return true
    }
    if (when === 'opening') {
      // the OPENING stance: on a unit's first activation a battle-long self
      // power (Bloodlust, Eldritch Might) is worth the primary even when a
      // swing is available — it pays for the whole battle
      if (u.activationOrdinal !== 1 || a.free) continue
      const t0 = a.target ?? { select: 'self' as const }
      if (t0.select !== 'self' || !a.effects.some((e) => e.kind === 'statMod' && e.until === 'battle')) continue
      if (!a.effects.every((e) => e.kind !== 'statMod' || e.until === 'battle')) continue
    } else if ((when === 'free') !== !!a.free) continue
    const kinds = new Set(a.effects.map((e) => e.kind))
    const t = a.target ?? { select: 'self' as const, side: 'any' as const }
    const selfDamage = a.effects.reduce((n, e) => n + (e.kind === 'selfDamage' ? e.amount : 0), 0)
    if (selfDamage > 0 && u.hp <= selfDamage * 2) continue
    if (kinds.has('damage') && t.side === 'enemy') continue   // the damage block's job
    if (kinds.has('damage') && t.select === 'area' && (t.origin ?? 'self') === 'target') continue
    const legal = (o: Unit) => canUsePower(ctx, u.id, o.id, id)
    if (t.select === 'self' || (t.select === 'area' && (t.origin ?? 'self') === 'self' && t.side !== 'enemy')) {
      if (!legal(u)) continue
      if (kinds.has('heal')) {
        // the caster's circle: cast when someone in it is missing at least half the heal
        const amount = previewPower(ctx, u.id, u.id, id).heal ?? 0
        const inCircle = powerTargetsOf(ctx, u.id, u.id, a).map((i) => unit(ctx, i))
        if (!inCircle.some((o) => (o.maxHp - o.hp) * 2 >= amount && o.maxHp - o.hp > 0)) continue
      } else if (t.select === 'self') {
        // a battle-long stance is worth taking on the first idle activation;
        // a "until the end of your next Turn" edge wants a fight within reach
        const lasting = a.effects.every((e) => e.kind !== 'statMod' || e.until === 'battle')
        if (!lasting && !livingEnemies(ctx, u).some((e) => distance(u.hex, e.hex) <= u.movement + 1)) continue
      }
      usePower(ctx, u.id, u.id, id); settle(ctx, id); return true
    }
    if (t.select === 'unit' && t.side === 'ally') {
      const allies = ctx.state.units.filter((o) => o.side === u.side && o.lifeState === 'standing' && legal(o))
      if (!allies.length) continue
      if (kinds.has('heal')) {
        const best = allies.filter((o) => o.maxHp - o.hp > 0).sort((x, y) => (y.maxHp - y.hp) - (x.maxHp - x.hp) || x.id - y.id)[0]
        if (!best) continue
        const amount = previewPower(ctx, u.id, best.id, id).heal ?? 0
        if (!(amount > 0 && (best.maxHp - best.hp) * 2 >= amount)) continue
        usePower(ctx, u.id, best.id, id); settle(ctx, id); return true
      }
      const best = lowestHealth(allies)!
      usePower(ctx, u.id, best.id, id); settle(ctx, id); return true
    }
  }
  return false
}

// ── melee-aggressive ─────────────────────────────────────────────────────────
// Closes on the reachable enemy with the lowest health; falls back to closing on
// the nearest. Hits with the biggest attack it can afford.
function meleeAggressive(ctx: Ctx, u: Unit): void {
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  // Leap into the fray — SWITCHES.md aiLeapToAdjacent (2026-08-25). A leaping
  // power carries its rider into the swing (+2 Strength on the very attack it
  // enables), so when a leap lands adjacent to the weakest reachable enemy AND
  // the unit can still afford its preferred attack afterwards, it beats the
  // walk. Whether that trade is actually worth 2 Stamina is the sweep's
  // question, which is why it is a switch and not a conviction.
  if (ctx.cfg.switches.aiLeapToAdjacent && adjacentEnemies(ctx, u).length === 0) {
    const step = movePowerOf(ctx, u, 'sidestep')
    const range = step ? stepRangeOf(step) : 0
    if (step && range > 1) {
      const preferred = ctx.attacks[u.attacks[0] ?? '']
      const afterLeap = u.stamina - moveStaminaCost(u, step)
      if (preferred && afterLeap >= preferred.staminaCost) {
        const targets = enemies.slice().sort((a, b) => a.hp - b.hp || a.id - b.id)
        for (const t of targets) {
          const hex = stepCandidates(ctx, u, range).find((h) => distance(h, t.hex) === 1)
          if (hex !== undefined) {
            executeSidestep(ctx, u.id, hex, step)
            if (u.lifeState !== 'standing') return
            if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) idle(ctx, u, 'leapt but could not strike')
            return
          }
        }
      }
    }
  }

  if (adjacentEnemies(ctx, u).length === 0) {
    const walk = movePowerOf(ctx, u, 'path')
    if (!walk) {
      // No affordable walk — the free sidestep (if granted) closes one hex.
      const nearest = nearestEnemy(ctx, u)
      if (nearest) sidestepToward(ctx, u, nearest.hex)
      if (u.lifeState !== 'standing') return
      if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) idle(ctx, u, 'could not reach an enemy')
      return
    }
    const reach = reachable(ctx, u, walk.budgetMod)
    const hexes = [...reach.keys()].sort((a, b) => a - b)

    // Prefer ending adjacent to the weakest enemy we can actually reach.
    const reachableTargets = enemies
      .filter((e) => hexes.some((h) => distance(h, e.hex) === 1))
      .sort((a, b) => a.hp - b.hp || a.id - b.id)

    let bestHex: HexId | null = null
    if (reachableTargets[0]) {
      const t = reachableTargets[0]
      for (const h of hexes) {
        if (distance(h, t.hex) === 1) { bestHex = h; break }
      }
    } else {
      const nearest = nearestEnemy(ctx, u)!
      let bestD = distance(u.hex, nearest.hex)
      for (const h of hexes) {
        const d = distance(h, nearest.hex)
        if (d < bestD) { bestD = d; bestHex = h }
      }
    }
    if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex), walk)
  }
  if (u.lifeState !== 'standing') return
  effectsPower(ctx, u, 'free')
  if (effectsPower(ctx, u, 'feast')) return
  if (effectsPower(ctx, u, 'opening')) return
  if (supportPower(ctx, u)) return
  if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) {
    if (!effectsPower(ctx, u, 'primary')) idle(ctx, u, 'could not reach an enemy')
  }
}

// ── ranged-kite ──────────────────────────────────────────────────────────────
// Holds at maximum reach and shoots the weakest thing it can see.
// Reserves the stamina for the shot, because the shot is the point.
function rangedKite(ctx: Ctx, u: Unit): void {
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  // The BOW is the longest-reaching attack the unit carries, not the first
  // listed (fix.enemy-ai-role, 2026-09-03): a Ghoul lists Rake before Shriek,
  // and a kiter whose "bow" reaches 1 wants to stand adjacent and safe at
  // once — it stood six hexes off for twenty-five Turns. Ties to the earlier
  // listing (Law 6).
  const bow = u.attacks.map((id) => ctx.attacks[id]).filter((a): a is NonNullable<typeof a> => !!a)
    .reduce<typeof ctx.attacks[string] | undefined>((best, a) => (!best || reachOf(ctx, u, a) > reachOf(ctx, u, best) ? a : best), undefined)
  if (!bow) {
    // UNARMED (encounter.runner, 2026-09-03): the Orphans field with a kit
    // whose attack rows are unauthored — a named gap — and a kiter with no
    // weapon used to crash the battle. It keeps its distance instead: the
    // reachable hex farthest from the nearest enemy, ties to the lower id,
    // then idles saying so. "A civilian flees the nearest enemy" proper is
    // still a needs (8-ENCOUNTERS: attach mode); this is the unarmed floor.
    const walk = movePowerOf(ctx, u, 'path')
    if (walk) {
      const reach = reachable(ctx, u, walk.budgetMod)
      let best: HexId | null = null, bestD = Math.min(...enemies.map((e) => distance(u.hex, e.hex)))
      for (const [hex] of [...reach].sort((a, b) => a[0] - b[0])) {
        const d = Math.min(...enemies.map((e) => distance(hex, e.hex)))
        if (d > bestD) { bestD = d; best = hex }
      }
      if (best !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, best), walk)
    }
    idle(ctx, u, 'unarmed')
    return
  }
  // Keep one stamina for the shot — the shot is the point. But ONLY for units
  // that run stamina at all: enemies carry maxStamina 0 (the hero throttle,
  // 2026-08-21), and reserving 1 from a pool of 0 froze every ranged enemy on
  // its deploy hex forever. Found 2026-08-26 by the first ranged enemies ever
  // fielded (the imps and the necromancer stood on row 0 doing nothing).
  const RESERVE = u.maxStamina > 0 ? 1 : 0

  // Reach if this unit were standing there. A shadow copy runs the real reachOf()
  // rather than the AI re-deriving terrain itself — Law 1, and it means a new
  // Reach modifier is visible to the AI the day it exists.
  const weaponReachAt = (hex: HexId) => reachOf(ctx, { ...u, hex }, bow)
  // Hold at the POWER's range when a ready enemy-aimed power outranges nothing
  // — ability.effects (2026-09-03), found on the progression roster: the
  // Emberwright's Reach put her staff at 7 and Fireball (range 6) was never
  // legal, because the kite held at weapon reach. SWITCHES.md
  // aiKiteHoldsAtPowerRange: the hold distance is the shorter of the two while
  // such a power is ready and affordable; off = weapon reach, as before.
  const powerRange = ctx.cfg.switches.aiKiteHoldsAtPowerRange
    ? u.abilities.map((id) => ctx.abilities[id]).filter((a): a is NonNullable<typeof a> => !!a
        && (a.effects ? (a.target?.side !== 'ally' && a.target?.select !== 'self') : (a.effect ?? 'damage') === 'damage')
        && isReady(ctx, u, a.id) && u.stamina >= a.staminaCost)
      .reduce((m, a) => Math.min(m, a.range), Infinity)
    : Infinity
  // The SHOT is always the weapon's reach; only the ideal SPACING moves in to
  // the power's range — a kiter that refused to shoot at 6 while walking to 4
  // idled through the whole standard battle (found landing this).
  const reachAt = weaponReachAt
  const holdAt = (hex: HexId) => Math.min(weaponReachAt(hex), powerRange)

  // What a hex is worth, in strict priority order. Lexicographic so the rules
  // stay readable: safety first, then a shot, then height, then ideal spacing.
  const scoreOf = (hex: HexId): number[] => {
    const terr = ctx.state.terrain[hex] ?? 0
    const reachHere = reachAt(hex)
    const nearestD = Math.min(...enemies.map((e) => distance(hex, e.hex)))
    const canShoot = enemies.some((e) => distance(hex, e.hex) <= reachHere) ? 1 : 0
    const safe = meleeThreatens(ctx, u, hex) ? 0 : 1
    const onHill = terr === TERRAIN.HILLS ? 1 : 0
    // Hills are only worth taking if they buy a shot; never worth walking into reach.
    return [safe, canShoot, safe && canShoot ? onHill : 0, -Math.abs(nearestD - holdAt(hex))]
  }
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i]! !== b[i]!) return a[i]! > b[i]!
    return false
  }

  const here = scoreOf(u.hex)
  // The movement CHOICE (2026-08-21): a kiter walks when it can afford the
  // walk AND the shot (the shot is the point); when it cannot, the free
  // sidestep still buys one hex of safety or line — which is exactly what the
  // old `ai.denied reason: stamina` line was wishing it had.
  // Every affordable full-move power competes on the same score — path powers
  // offer their walk-reach, flight powers their landing set (the drake's
  // wings, 2026-08-21). Powers are tried in the unit's DECLARED order and a
  // later candidate must strictly beat the standing best (Law 6: ties go to
  // the earlier grant), so a unit granted only the walk behaves exactly as
  // before this existed.
  const movers = usableMoves(ctx, u).filter(
    (m) => (m.shape === 'path' || m.shape === 'flight') && u.stamina >= moveStaminaCost(u, m) + RESERVE,
  )
  if (movers.length > 0) {
    let plan: { power: MoveDef; hex: HexId; reach?: Reach } | null = null
    let best = here
    for (const m of movers) {
      if (m.shape === 'path') {
        const reach = reachable(ctx, u, m.budgetMod)
        for (const h of [...reach.keys()].sort((a, b) => a - b)) {
          const sc = scoreOf(h)
          if (better(sc, best)) { best = sc; plan = { power: m, hex: h, reach } }
        }
      } else {
        for (const h of flightLandings(ctx, u, m)) {
          const sc = scoreOf(h)
          if (better(sc, best)) { best = sc; plan = { power: m, hex: h } }
        }
      }
    }
    if (plan) {
      const terr = ctx.state.terrain[plan.hex] ?? 0
      if (terr === TERRAIN.HILLS) emit(ctx, 'ai.tookHighGround', `ai.${u.ai}`, { actor: u.id, hex: plan.hex })
      if (plan.reach) executeMove(ctx, u.id, pathTo(plan.reach, u.hex, plan.hex), plan.power)
      else executeFlight(ctx, u.id, plan.hex, plan.power)
    }
  } else {
    const power = movePowerOf(ctx, u, 'sidestep')
    let stepped = false
    if (power) {
      const occ = occupancy(ctx)
      let bestHex: HexId | null = null
      let best = here
      for (const n of [...neighboursOf(u.hex)].sort((a, b) => a - b)) {
        if (occ.has(n) || !isPassable(ctx.state.terrain[n] ?? 0)) continue
        const sc = scoreOf(n)
        if (better(sc, best)) { best = sc; bestHex = n }
      }
      if (bestHex !== null) stepped = executeSidestep(ctx, u.id, bestHex, power)
    }
    if (!stepped && (here[0] === 0 || here[1] === 0)) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: 'reposition', reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  if (u.lifeState !== 'standing') return
  effectsPower(ctx, u, 'free')
  if (effectsPower(ctx, u, 'opening')) return
  if (supportPower(ctx, u)) return

  // A power beats a staff shot whenever it is available and hits harder.
  const power = u.abilities.find((id) => enemies.some((e) => canUsePower(ctx, u.id, e.id, id)))
  if (power) {
    const targets = enemies.filter((e) => canUsePower(ctx, u.id, e.id, power))
    // An AREA power aims where it counts double — capability.item-powers
    // (2026-08-27), the same rule as areaSwing: among legal targets, prefer
    // the first (lowest health, then id) whose blast catches two or more
    // enemies and no ally; otherwise the plain lowest-health pick.
    const pa = ctx.abilities[power]
    // ability.effects (2026-09-03): an effect-list power with area targeting
    // is an area power too — its blast is what the one targeting vocabulary
    // resolves, not the legacy `area` field.
    const isArea = !!pa?.area || (!!pa?.effects && pa.target?.select === 'area')
    const blastOf = (e: Unit) => pa?.area ? powerBlastIdsOf(ctx, u.id, e.id, power) : pa?.effects ? powerTargetsOf(ctx, u.id, e.id, pa) : [e.id]
    const areaPick = isArea
      ? targets.slice().sort((a, b) => a.hp - b.hp || a.id - b.id).find((e) => {
          const struck = blastOf(e)
          const foes = struck.filter((s) => unit(ctx, s).side !== u.side).length
          const allies = struck.length - foes
          return foes >= 2 && (allies === 0 || ctx.cfg.switches.aiAreaThroughAllies)
        })
      : undefined
    const t = areaPick ?? lowestHealth(targets)
    if (t) {
      const staff = bestAttack(ctx, u.id, t.id)
      const staffDmg = staff ? ctx.attacks[staff]!.bonus +
        (ctx.attacks[staff]!.stat === 'magic' ? u.magic : ctx.attacks[staff]!.stat === 'strength' ? u.strength : u.precision) : 0
      // An area power is worth its SUM over the enemies struck (the areaPick
      // rule already refused shapes with a friend inside) — a Storm that does
      // one less per head beats the staff the moment it catches two.
      const powerDmg = isArea
        ? blastOf(t)
            .filter((s) => unit(ctx, s).side !== u.side)
            .reduce((sum, s) => sum + previewPower(ctx, u.id, s, power).damage, 0)
        : previewPower(ctx, u.id, t.id, power).damage
      if (powerDmg >= staffDmg) {
        usePower(ctx, u.id, t.id, power)
        settle(ctx, power)
        return
      }
    }
  }

  const reachNow = reachAt(u.hex)
  const inRange = enemies.filter((e) => distance(u.hex, e.hex) <= reachNow)
  if (!attackIfPossible(ctx, u, inRange)) {
    if (!attackIfPossible(ctx, u, adjacentEnemies(ctx, u))) {
      if (!effectsPower(ctx, u, 'primary')) idle(ctx, u, u.stamina < 1 ? 'out of stamina' : 'no target in range')
    }
  }
}

// ── the six modes of 2026-09-03 (ai.mode.defender, ai.mode.support, and the
// four the encounter session wanted — ENCOUNTERS-ENGINE-HANDOFF §4.10). Rules,
// not scores, inspectable by eye; every quantity from canAttack/preview.

/** Walk toward `dest` with the first affordable path power, stopping as close as reach allows. */
function closeOn(ctx: Ctx, u: Unit, dest: HexId, stopAt = 1): void {
  if (distance(u.hex, dest) <= stopAt) return
  const walk = movePowerOf(ctx, u, 'path')
  if (!walk) { sidestepToward(ctx, u, dest); return }
  const reach = reachable(ctx, u, walk.budgetMod)
  let bestHex: HexId | null = null, bestD = distance(u.hex, dest)
  for (const [hex] of [...reach].sort((a, b) => a[0] - b[0])) {
    const d = distance(hex, dest)
    if (d < bestD && d >= stopAt) { bestD = d; bestHex = hex }
  }
  if (bestHex !== null) executeMove(ctx, u.id, pathTo(reach, u.hex, bestHex), walk)
}
const allies = (ctx: Ctx, u: Unit) => ctx.state.units.filter((o) => o.side === u.side && o.id !== u.id && o.lifeState === 'standing')

/** defender — stays within 2 of the nearest ally under half health (else the nearest ally), attacks anything in reach, never advances alone. */
function defender(ctx: Ctx, u: Unit): void {
  const hurt = allies(ctx, u).filter((o) => o.hp * 2 < o.maxHp)
  const ward = (hurt.length ? hurt : allies(ctx, u)).sort((a, b) => distance(u.hex, a.hex) - distance(u.hex, b.hex) || a.id - b.id)[0]
  if (ward && distance(u.hex, ward.hex) > 2) closeOn(ctx, u, ward.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) idle(ctx, u, ward ? 'holding by ' + ward.name : 'nobody to defend')
}

/** support — holds at range like a kiter, but allies come first: a free power, a support power, an effect power; the weapon last. */
function support(ctx: Ctx, u: Unit): void {
  effectsPower(ctx, u, 'free')
  if (supportPower(ctx, u)) return
  if (effectsPower(ctx, u, 'primary')) return
  rangedKite(ctx, u)
}

/** focused fire — the whole side picks one target: the standing enemy with the least health, ties to the lower id. */
function focusedFire(ctx: Ctx, u: Unit): void {
  const target = lowestHealth(livingEnemies(ctx, u))
  if (!target) return
  closeOn(ctx, u, target.hex, 1)
  if (u.lifeState !== 'standing') return
  const id = bestAttack(ctx, u.id, target.id)
  if (id) { performAttack(ctx, u.id, target.id, id); settle(ctx, id); return }
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) idle(ctx, u, 'the focus is out of reach')
}

/** value hunter — damage or healing, whichever is worth more this activation. */
function valueHunter(ctx: Ctx, u: Unit): void {
  effectsPower(ctx, u, 'free')
  let bestHeal = 0, healId: string | null = null, healTo: number | null = null
  for (const id of u.abilities) {
    const a = ctx.abilities[id]
    if (!a || !(a.effect === 'heal' || a.effects?.some((e) => e.kind === 'heal'))) continue
    for (const o of allies(ctx, u).concat([u])) {
      if (!canUsePower(ctx, u.id, o.id, id)) continue
      const worth = Math.min(previewPower(ctx, u.id, o.id, id).heal ?? 0, o.maxHp - o.hp)
      if (worth > bestHeal || (worth === bestHeal && healTo !== null && o.id < healTo)) { bestHeal = worth; healId = id; healTo = o.id }
    }
  }
  let bestDmg = 0, dmgTarget: Unit | null = null, dmgId: string | null = null
  for (const e of livingEnemies(ctx, u)) {
    const id = bestAttack(ctx, u.id, e.id)
    if (!id) continue
    const d = preview(ctx, u.id, e.id, id).damageOnHit
    if (d > bestDmg || (d === bestDmg && dmgTarget && e.id < dmgTarget.id)) { bestDmg = d; dmgTarget = e; dmgId = id }
  }
  if (healId && healTo !== null && bestHeal >= bestDmg && bestHeal > 0) { usePower(ctx, u.id, healTo, healId); settle(ctx, healId); return }
  if (dmgTarget && dmgId) { performAttack(ctx, u.id, dmgTarget.id, dmgId); settle(ctx, dmgId); return }
  // nothing worth doing from here: close on the nearest enemy, then try again
  const near = nearestEnemy(ctx, u)
  if (near) closeOn(ctx, u, near.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) idle(ctx, u, 'nothing worth doing')
}

/** follow — stays adjacent to the nearest ally that is not itself a follower, and attacks what it can from there. */
function follow(ctx: Ctx, u: Unit): void {
  const lead = allies(ctx, u).filter((o) => o.ai !== 'follow').sort((a, b) => distance(u.hex, a.hex) - distance(u.hex, b.hex) || a.id - b.id)[0]
    ?? allies(ctx, u).sort((a, b) => a.id - b.id)[0]
  if (lead && distance(u.hex, lead.hex) > 1) closeOn(ctx, u, lead.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) idle(ctx, u, lead ? 'following ' + lead.name : 'nobody to follow')
}

/** hunter — has a target and goes for it: the weakest enemy when it first acts, pursued until it falls. */
function hunter(ctx: Ctx, u: Unit): void {
  let t = u.huntTarget !== undefined ? ctx.state.units[u.huntTarget] : undefined
  if (!t || t.lifeState !== 'standing' || t.side === u.side) {
    const pick = lowestHealth(livingEnemies(ctx, u))
    if (!pick) return
    u.huntTarget = pick.id
    emit(ctx, 'ai.hunts', `ai.${u.ai}`, { actor: u.id, target: pick.id })
    t = pick
  }
  closeOn(ctx, u, t.hex, 1)
  if (u.lifeState !== 'standing') return
  const id = bestAttack(ctx, u.id, t.id)
  if (id) { performAttack(ctx, u.id, t.id, id); settle(ctx, id); return }
  if (!attackIfPossible(ctx, u, enemiesInAttackReach(ctx, u))) idle(ctx, u, 'the quarry is out of reach')
}

const MODES: Record<string, (ctx: Ctx, u: Unit) => void> = {
  'dumb-melee': dumbMelee,
  'melee-aggressive': meleeAggressive,
  'ranged-kite': rangedKite,
  // 2026-09-03
  'defender': defender,
  'support': support,
  'focused-fire': focusedFire,
  'value-hunter': valueHunter,
  'follow': follow,
  'hunter': hunter,
}

export function runActivation(ctx: Ctx, unitId: number): void {
  const u = unit(ctx, unitId)
  if (!MODES[u.ai]) throw new Error(`unknown AI mode '${u.ai}'`)
  // capability.confusion (2026-09-03): "Swaps the affected unit's AI strategy
  // for a different one" — the next mode in registry order stands in, and the
  // log names both. Deterministic: no cup, no choice.
  const names = Object.keys(MODES)
  const ai = isConfused(ctx, u) ? names[(names.indexOf(u.ai) + 1) % names.length]! : u.ai
  const mode = MODES[ai]!
  emit(ctx, 'ai.mode', `ai.${ai}`, { actor: unitId, mode: ai, ...(ai !== u.ai ? { confusedFrom: u.ai } : {}) })
  mode(ctx, u)
}

export const AI_MODES = Object.keys(MODES)
