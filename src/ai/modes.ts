// Three AI modes, written as rules rather than scores.
// Utility scoring comes later; these need to be inspectable by eye so that when a
// battle looks wrong we can tell the engine from the AI.

import type { HexId } from './../core/hex.js'
import { livingEnemies, movementOptions, moveStaminaCost, nearestEnemy, stepRangeOf, usableMoves as readyMoves } from './../core/movement.js'
import { executeAction, validateAction, type ActionRequest } from './../core/commands.js'
import type { AttackDef, MoveDef } from './../core/types.js'
import { actionReady, attackIdsOf, attacksOf, burstsOf, isBurst, powerIdsOf, powersOf, resolveActionSlot } from './../core/action.js'
import { attackDef, preview, reachOf } from './../core/pipeline.js'
import { isReady, powerTargetsOf, previewPower } from './../core/ability.js'
import { burstCentres, previewBurst } from './../core/burst.js'
import { isBlocked, isConfused } from './../core/status.js'
import { TERRAIN } from './../core/types.js'
import { emit, unit } from './../core/mutate.js'
import type { Ctx, Unit } from './../core/types.js'


/** Transient AI deliberation, never stored in battle state. Core legality stays
 * authoritative; this context only limits repeated free choices by the AI. */
type Decision = { ctx: Ctx; freeUsed: Set<string>; actionsTaken: number; limit: number; idled: boolean }
function usableMoves(decision: Decision, u: Unit): MoveDef[] {
  return readyMoves(decision.ctx, u).filter(a => !decision.freeUsed.has(a.id) && resolveActionSlot(decision.ctx, u, a) !== null)
}
function movePowerOf(decision: Decision, u: Unit, shape: MoveDef['move']['shape']): MoveDef | null {
  return usableMoves(decision, u).find(a => a.move.shape === shape) ?? null
}

/** Candidate legality and actual resolution share the public command mechanism. */
function legalTarget(decision: Decision, actor: number, target: number, actionId: string): boolean {
  const ctx = decision.ctx
  return !decision.freeUsed.has(actionId) && validateAction(ctx, { actor, target, actionId }).ok
}
function act(decision: Decision, request: ActionRequest): true {
  const ctx = decision.ctx
  if (decision.freeUsed.has(request.actionId)) throw new Error('AI repeated a free action in one cycle')
  if (decision.actionsTaken >= decision.limit) throw new Error('AI action cycle exceeded its finite choice budget')
  const free = ctx.actions[request.actionId]!.free
  const result = executeAction(ctx, request)
  if (!result.ok) throw new Error(`AI selected an illegal action: ${request.actionId}: ${result.reason}`)
  decision.actionsTaken++
  if (free) decision.freeUsed.add(request.actionId)
  return true
}
function moveTargets(decision: Decision, u: Unit, power: MoveDef): HexId[] {
  const ctx = decision.ctx
  if (decision.freeUsed.has(power.id)) return []
  return movementOptions(ctx, u.id, power.id).map(plan => plan.destination)
}

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
function meleeThreatens(decision: Decision, u: Unit, hex: HexId): boolean {
  const ctx = decision.ctx
  return livingEnemies(ctx, u).some(
    (e) => e.role === 'melee' && ctx.geo.distance(hex, e.hex) <= e.movement + 1,
  )
}

function adjacentEnemies(decision: Decision, u: Unit): Unit[] {
  const ctx = decision.ctx
  return withDowned(decision, u, livingEnemies(ctx, u).filter((e) => ctx.geo.distance(u.hex, e.hex) === 1))
}

/**
 * Enemies this unit can legally attack RIGHT NOW, by THE legality function
 * (Law 2 — canAttack, never a reimplemented distance check). For every reach-1
 * unit this is exactly adjacentEnemies; it exists because the Green Drake
 * (2026-08-20) hisses at reach 5, and an adjacency-only swing check meant a
 * reach unit closed politely and then never attacked at all.
 */
function enemiesInAttackReach(decision: Decision, u: Unit): Unit[] {
  const ctx = decision.ctx
  return withDowned(decision, u, livingEnemies(ctx, u).filter((e) => attackIdsOf(ctx, u).some((id) => legalTarget(decision, u.id, e.id, id))))
}

/**
 * fix.downed-targetable (2026-09-03): the DOWNED are legal targets now
 * (canAttack), and whether the AI takes them is the `aiAttacksDowned` switch —
 * never · only when no standing enemy is in reach (default) · always. Downed
 * candidates are appended AFTER the standing ones, so `lowestHealth` (hp 0)
 * would otherwise always pick the corpse-to-be first: with 'always' that is
 * the intent (a finisher); with 'whenNoStanding' the standing list wins.
 */
function withDowned(decision: Decision, u: Unit, standing: Unit[]): Unit[] {
  const ctx = decision.ctx
  const mode = ctx.cfg.switches.aiAttacksDowned
  if (mode === 'never') return standing
  if (mode === 'whenNoStanding' && standing.length) return standing
  const downed = ctx.state.units.filter((o) => o.side !== u.side && o.lifeState === 'downed'
    && attackIdsOf(ctx, u).some((id) => legalTarget(decision, u.id, o.id, id)))
  return mode === 'always' ? [...downed, ...standing] : downed
}

/** The farthest this unit can strike with any of its attacks, for honest idle text. */
function maxAttackReach(decision: Decision, u: Unit): number {
  const ctx = decision.ctx
  let r = 1
  for (const a of attacksOf(ctx, u)) r = Math.max(r, reachOf(ctx, u, a))
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
function bestAttack(decision: Decision, attackerId: number, targetId: number): string | null {
  const ctx = decision.ctx
  const u = unit(ctx, attackerId)
  if (ctx.cfg.switches.aiAttackChoice === 'bestDamage') {
    let best: string | null = null, bestDmg = -1
    for (const id of attackIdsOf(ctx, u)) {
      if (!legalTarget(decision, attackerId, targetId, id)) continue
      const d = preview(ctx, attackerId, targetId, id).damageOnHit
      if (d > bestDmg) { best = id; bestDmg = d }
    }
    return best
  }
  for (const id of attackIdsOf(ctx, u)) {
    if (legalTarget(decision, attackerId, targetId, id)) return id
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
function sidestepToward(decision: Decision, u: Unit, dest: HexId): boolean {
  const ctx = decision.ctx
  const power = movePowerOf(decision, u, 'sidestep')
  if (!power) return false
  const range = stepRangeOf(power)
  const destinations = moveTargets(decision, u, power)
  // A zero-range bonus move (Focus, Devotion — 2026-08-25) cannot step toward
  // anything; its "progress" is the rider. Using it while starved is exactly
  // its design intent ("the cheap way to refill"), so a stamina-starved unit
  // takes it rather than standing refused.
  if (range === 0) return destinations.includes(u.hex) && act(decision, { actor: u.id, destination: u.hex, actionId: power.id })
  const d0 = ctx.geo.distance(u.hex, dest)
  let best: HexId | null = null
  let bestD = d0
  for (const n of destinations) {
    const d = ctx.geo.distance(n, dest)
    if (d < bestD) { bestD = d; best = n }
  }
  if (best === null) return false
  return act(decision, { actor: u.id, destination: best, actionId: power.id })
}

function idle(decision: Decision, u: Unit, reason: string): void {
  const ctx = decision.ctx
  if (ctx.state.outcome) return
  decision.idled = true
  emit(ctx, 'activation.idle', `ai.${u.ai}`, { actor: u.id, reason })
}

/** Uses exact engine forecasts; ties are action order then centre hex. No friendly harm by default. */
function burstIfUseful(decision: Decision, u: Unit): boolean {
  const ctx = decision.ctx
  const bursts = u.actions.filter(id => { const a = ctx.actions[id]; return a && isBurst(a) && actionReady(ctx, u, a) && !decision.freeUsed.has(id) })
  if (!bursts.length) return false
  let best: { actionId: string; centre: number; value: number } | null = null
  let ordinary = 0
  for (const attack of attacksOf(ctx, u)) for (const enemy of livingEnemies(ctx, u)) {
    if (legalTarget(decision, u.id, enemy.id, attack.id)) ordinary = Math.max(ordinary, preview(ctx, u.id, enemy.id, attack.id).damageOnHit)
  }
  for (const id of bursts) {
    for (const centre of burstCentres(ctx, u.id, id)) {
      const p = previewBurst(ctx, u.id, centre, id)
      const harm = p.targets.filter(t => unit(ctx, t.id).side === u.side).reduce((n, t) => n + t.applied, 0)
      if (harm && !ctx.cfg.switches.aiBurstThroughAllies) continue
      const value = p.targets.reduce((n, t) => n + (unit(ctx, t.id).side === u.side ? t.heal - t.applied : t.applied - t.heal), 0)
      if (value > 0 && value >= ordinary && (!best || value > best.value)) best = { actionId: id, centre, value }
    }
  }
  return best ? act(decision, { actor: u.id, actionId: best.actionId, centre: best.centre }) : false
}

function attackIfPossible(decision: Decision, u: Unit, candidates: Unit[]): boolean {
  if (burstIfUseful(decision, u)) return true
  const ctx = decision.ctx
  const target = lowestHealth(candidates.filter(t => attackIdsOf(ctx, u).some(id => legalTarget(decision, u.id, t.id, id))))
  if (!target) return false
  const attackId = bestAttack(decision, u.id, target.id)
  if (!attackId) return false
  // Did stamina force a worse attack than the unit would have preferred?
  const want = attacksOf(ctx, u)[0]
  const preferred = want?.id
  if (want && preferred !== attackId) {
    if (u.stamina < want.staminaCost) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: preferred, took: attackId, reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  act(decision, { actor: u.id, target: target.id, actionId: attackId })
  return true
}

// ── dumb-melee ───────────────────────────────────────────────────────────────
// Steps toward the nearest hero with no regard for anything, then hits whatever
// is adjacent. No self-preservation, no target switching.
function dumbMelee(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const target = nearestEnemy(ctx, u)
  if (!target) return

  if (ctx.geo.distance(u.hex, target.hex) > 1) {
    // The movement CHOICE (2026-08-21): first affordable path-shaped power in
    // the unit's declared order; a stamina-starved unit falls back to its free
    // sidestep rather than standing refused.
    const walk = movePowerOf(decision, u, 'path')
    if (walk) {
      // Equal closeness does not justify walking farther around the target.
      // Cost comes from the authoritative movement planner, including low edges;
      // no opportunity-risk scoring is introduced here.
      const distance = ctx.geo.distance(u.hex, target.hex)
      const best = movementOptions(ctx, u.id, walk.id)
        .filter(plan => ctx.geo.distance(plan.destination, target.hex) < distance)
        .sort((a, b) => ctx.geo.distance(a.destination, target.hex) - ctx.geo.distance(b.destination, target.hex)
          || a.pathCost - b.pathCost || a.path.length - b.path.length || a.destination - b.destination)[0]
      if (best) act(decision, { actor: u.id, destination: best.destination, actionId: walk.id })
    } else {
      sidestepToward(decision, u, target.hex)
    }
  }
  if (u.lifeState !== 'standing') return
  if (effectsPower(decision, u, 'feast')) return
  // Swing at whatever is IN REACH, not merely adjacent (found landing
  // unit.green-drake, 2026-08-20). For reach-1 units — every zombie — the
  // candidate set and the idle text are both byte-identical to the old
  // adjacency check, which is what keeps this landing proven-neutral on the
  // control battles.
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) {
    idle(decision, u, maxAttackReach(decision, u) > 1 ? 'no enemy in reach' : 'nothing adjacent')
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
function supportPower(decision: Decision, u: Unit): boolean {
  const ctx = decision.ctx
  for (const a of powersOf(ctx, u)) {
    const id = a.id
    if (a.effect === 'heal') {
      let best: Unit | null = null
      for (const o of ctx.state.units) {
        if (o.side !== u.side || o.lifeState !== 'standing') continue
        if (!legalTarget(decision, u.id, o.id, id)) continue
        if (o.maxHp - o.hp <= 0) continue
        if (!best || (o.maxHp - o.hp) > (best.maxHp - best.hp)
          || ((o.maxHp - o.hp) === (best.maxHp - best.hp) && o.id < best.id)) best = o
      }
      if (best) {
        const amount = previewPower(ctx, u.id, best.id, id).heal ?? 0
        if (amount > 0 && (best.maxHp - best.hp) * 2 >= amount) {
          act(decision, { actor: u.id, target: best.id, actionId: id })
          return true
        }
      }
    }
    if (a.effect === 'selfGuard' && legalTarget(decision, u.id, u.id, id)) {
      if (adjacentEnemies(decision, u).length >= 2) {
        act(decision, { actor: u.id, target: u.id, actionId: id })
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
function effectsPower(decision: Decision, u: Unit, when: 'free' | 'primary' | 'opening' | 'feast'): boolean {
  const ctx = decision.ctx
  for (const a of powersOf(ctx, u)) {
    const id = a.id
    if (!a.effects || a.effects.length === 0) continue
    if (when === 'feast') {
      // capability.corpses (2026-09-03): a body in reach is eaten BEFORE the
      // swing — the Ghoul economy runs on it (SWITCHES.md aiEatsBeforeBiting).
      if (!ctx.cfg.switches.aiEatsBeforeBiting || !a.effects.some((e) => e.kind === 'corpse.eat')) continue
      if (!legalTarget(decision, u.id, u.id, id)) continue
      act(decision, { actor: u.id, target: u.id, actionId: id }); return true
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
    const legal = (o: Unit) => legalTarget(decision, u.id, o.id, id)
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
        if (!lasting && !livingEnemies(ctx, u).some((e) => ctx.geo.distance(u.hex, e.hex) <= u.movement + 1)) continue
      }
      act(decision, { actor: u.id, target: u.id, actionId: id }); return true
    }
    if (t.select === 'unit' && t.side === 'ally') {
      const allies = ctx.state.units.filter((o) => o.side === u.side && o.lifeState === 'standing' && legal(o))
      if (!allies.length) continue
      if (kinds.has('heal')) {
        const best = allies.filter((o) => o.maxHp - o.hp > 0).sort((x, y) => (y.maxHp - y.hp) - (x.maxHp - x.hp) || x.id - y.id)[0]
        if (!best) continue
        const amount = previewPower(ctx, u.id, best.id, id).heal ?? 0
        if (!(amount > 0 && (best.maxHp - best.hp) * 2 >= amount)) continue
        act(decision, { actor: u.id, target: best.id, actionId: id }); return true
      }
      const best = lowestHealth(allies)!
      act(decision, { actor: u.id, target: best.id, actionId: id }); return true
    }
  }
  return false
}

// ── melee-aggressive ─────────────────────────────────────────────────────────
// Closes on the reachable enemy with the lowest health; falls back to closing on
// the nearest. Hits with the biggest attack it can afford.
function meleeAggressive(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  // Leap into the fray — SWITCHES.md aiLeapToAdjacent (2026-08-25). A leaping
  // power carries its rider into the swing (+2 Strength on the very attack it
  // enables), so when a leap lands adjacent to the weakest reachable enemy AND
  // the unit can still afford its preferred attack afterwards, it beats the
  // walk. Whether that trade is actually worth 2 Stamina is the sweep's
  // question, which is why it is a switch and not a conviction.
  if (ctx.cfg.switches.aiLeapToAdjacent && adjacentEnemies(decision, u).length === 0) {
    const step = movePowerOf(decision, u, 'sidestep')
    const range = step ? stepRangeOf(step) : 0
    if (step && range > 1) {
      const preferred = attacksOf(ctx, u)[0]
      const afterLeap = u.stamina - moveStaminaCost(u, step)
      if (preferred && afterLeap >= preferred.staminaCost) {
        const targets = enemies.slice().sort((a, b) => a.hp - b.hp || a.id - b.id)
        for (const t of targets) {
          const hex = moveTargets(decision, u, step).find((h) => ctx.geo.distance(h, t.hex) === 1)
          if (hex !== undefined) {
            act(decision, { actor: u.id, destination: hex, actionId: step.id })
            if (u.lifeState !== 'standing') return
            if (!attackIfPossible(decision, u, adjacentEnemies(decision, u))) idle(decision, u, 'leapt but could not strike')
            return
          }
        }
      }
    }
  }

  if (adjacentEnemies(decision, u).length === 0) {
    const walk = movePowerOf(decision, u, 'path')
    if (!walk) {
      // No affordable walk — the free sidestep (if granted) closes one hex.
      const nearest = nearestEnemy(ctx, u)
      if (nearest) sidestepToward(decision, u, nearest.hex)
      if (u.lifeState !== 'standing') return
      if (!attackIfPossible(decision, u, adjacentEnemies(decision, u))) idle(decision, u, 'could not reach an enemy')
      return
    }
    const hexes = moveTargets(decision, u, walk)

    // Prefer ending adjacent to the weakest enemy we can actually reach.
    const reachableTargets = enemies
      .filter((e) => hexes.some((h) => ctx.geo.distance(h, e.hex) === 1))
      .sort((a, b) => a.hp - b.hp || a.id - b.id)

    let bestHex: HexId | null = null
    if (reachableTargets[0]) {
      const t = reachableTargets[0]
      for (const h of hexes) {
        if (ctx.geo.distance(h, t.hex) === 1) { bestHex = h; break }
      }
    } else {
      const nearest = nearestEnemy(ctx, u)!
      let bestD = ctx.geo.distance(u.hex, nearest.hex)
      for (const h of hexes) {
        const d = ctx.geo.distance(h, nearest.hex)
        if (d < bestD) { bestD = d; bestHex = h }
      }
    }
    if (bestHex !== null) act(decision, { actor: u.id, destination: bestHex, actionId: walk.id })
  }
  if (u.lifeState !== 'standing') return
  effectsPower(decision, u, 'free')
  if (effectsPower(decision, u, 'feast')) return
  if (effectsPower(decision, u, 'opening')) return
  if (supportPower(decision, u)) return
  if (burstIfUseful(decision, u)) return
  if (!attackIfPossible(decision, u, adjacentEnemies(decision, u))) {
    if (!effectsPower(decision, u, 'primary')) idle(decision, u, 'could not reach an enemy')
  }
}

// ── ranged-kite ──────────────────────────────────────────────────────────────
// Holds at maximum reach and shoots the weakest thing it can see.
// Reserves the stamina for the shot, because the shot is the point.
function rangedKite(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const enemies = livingEnemies(ctx, u)
  if (enemies.length === 0) return

  // The BOW is the longest-reaching attack the unit carries, not the first
  // listed (fix.enemy-ai-role, 2026-09-03): a Ghoul lists Rake before Shriek,
  // and a kiter whose "bow" reaches 1 wants to stand adjacent and safe at
  // once — it stood six hexes off for twenty-five Turns. Ties to the earlier
  // listing (Law 6).
  const bow = attacksOf(ctx, u)
    .reduce<AttackDef | undefined>((best, a) => (!best || reachOf(ctx, u, a) > reachOf(ctx, u, best) ? a : best), undefined)
  if (!bow) {
    // UNARMED (encounter.runner, 2026-09-03): the Orphans field with a kit
    // whose attack rows are unauthored — a named gap — and a kiter with no
    // weapon used to crash the battle. It keeps its distance instead: the
    // reachable hex farthest from the nearest enemy, ties to the lower id,
    // then idles saying so. "A civilian flees the nearest enemy" proper is
    // still a needs (8-ENCOUNTERS: attach mode); this is the unarmed floor.
    const walk = movePowerOf(decision, u, 'path')
    if (walk) {
      const destinations = moveTargets(decision, u, walk)
      let best: HexId | null = null, bestD = Math.min(...enemies.map((e) => ctx.geo.distance(u.hex, e.hex)))
      for (const hex of destinations) {
        const d = Math.min(...enemies.map((e) => ctx.geo.distance(hex, e.hex)))
        if (d > bestD) { bestD = d; best = hex }
      }
      if (best !== null) act(decision, { actor: u.id, destination: best, actionId: walk.id })
    }
    idle(decision, u, 'unarmed')
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
    ? [...powersOf(ctx, u), ...burstsOf(ctx, u)].filter((a) =>
        (a.burst ? a.burst.side !== 'ally' && a.burst.packets.length > 0 : a.effects ? (a.target?.side !== 'ally' && a.target?.select !== 'self') : (a.effect ?? 'damage') === 'damage')
        && actionReady(ctx, u, a) && u.stamina >= a.staminaCost)
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
    const nearestD = Math.min(...enemies.map((e) => ctx.geo.distance(hex, e.hex)))
    const canShoot = enemies.some((e) => ctx.geo.distance(hex, e.hex) <= reachHere) ? 1 : 0
    const safe = meleeThreatens(decision, u, hex) ? 0 : 1
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
  const movers = usableMoves(decision, u).filter(
    (m) => (m.move.shape === 'path' || m.move.shape === 'flight') && u.stamina >= moveStaminaCost(u, m) + RESERVE,
  )
  if (movers.length > 0) {
    let plan: { power: MoveDef; hex: HexId } | null = null
    let best = here
    for (const m of movers) {
      for (const h of moveTargets(decision, u, m)) {
        const sc = scoreOf(h)
        if (better(sc, best)) { best = sc; plan = { power: m, hex: h } }
      }
    }
    if (plan) {
      const terr = ctx.state.terrain[plan.hex] ?? 0
      if (terr === TERRAIN.HILLS) emit(ctx, 'ai.tookHighGround', `ai.${u.ai}`, { actor: u.id, hex: plan.hex })
      act(decision, { actor: u.id, destination: plan.hex, actionId: plan.power.id })
    }
  } else {
    const power = movePowerOf(decision, u, 'sidestep')
    let stepped = false
    if (power) {
      let bestHex: HexId | null = null
      let best = here
      for (const n of moveTargets(decision, u, power)) {
        const sc = scoreOf(n)
        if (better(sc, best) || (n === u.hex && stepRangeOf(power) === 0 && u.stamina < u.maxStamina)) { best = sc; bestHex = n }
      }
      if (bestHex !== null) stepped = act(decision, { actor: u.id, destination: bestHex, actionId: power.id })
    }
    if (!stepped && (here[0] === 0 || here[1] === 0)) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: 'reposition', reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  if (u.lifeState !== 'standing') return
  effectsPower(decision, u, 'free')
  if (effectsPower(decision, u, 'opening')) return
  if (supportPower(decision, u)) return
  if (burstIfUseful(decision, u)) return

  // A power beats a staff shot whenever it is available and hits harder.
  const power = powerIdsOf(ctx, u).find((id) => enemies.some((e) => legalTarget(decision, u.id, e.id, id)))
  if (power) {
    const targets = enemies.filter((e) => legalTarget(decision, u.id, e.id, power))
    // An AREA power aims where it counts double — capability.item-powers
    // (2026-08-27), the same rule as areaSwing: among legal targets, prefer
    // the first (lowest health, then id) whose blast catches two or more
    // enemies and no ally; otherwise the plain lowest-health pick.
    const pa = ctx.actions[power]
    // ability.effects (2026-09-03): an effect-list power with area targeting
    // is an area power too — its blast is what the one targeting vocabulary
    // resolves, not the legacy `area` field.
    const isArea = !!pa?.effects && pa.target?.select === 'area'
    const blastOf = (e: Unit) => pa?.effects ? powerTargetsOf(ctx, u.id, e.id, pa) : [e.id]
    const areaPick = isArea
      ? targets.slice().sort((a, b) => a.hp - b.hp || a.id - b.id).find((e) => {
          const struck = blastOf(e)
          const foes = struck.filter((s) => unit(ctx, s).side !== u.side).length
          const allies = struck.length - foes
          return foes >= 2 && (allies === 0 || ctx.cfg.switches.aiBurstThroughAllies)
        })
      : undefined
    const t = areaPick ?? lowestHealth(targets)
    if (t) {
      const staff = bestAttack(decision, u.id, t.id)
      const staffRow = staff ? attackDef(ctx, staff).attack : null
      const staffDmg = staffRow ? staffRow.bonus +
        (staffRow.stat === 'magic' ? u.magic : staffRow.stat === 'strength' ? u.strength : u.precision) : 0
      // An area power is worth its SUM over the enemies struck (the areaPick
      // rule already refused shapes with a friend inside) — a Storm that does
      // one less per head beats the staff the moment it catches two.
      const powerDmg = isArea
        ? blastOf(t)
            .filter((s) => unit(ctx, s).side !== u.side)
            .reduce((sum, s) => sum + previewPower(ctx, u.id, s, power).damage, 0)
        : previewPower(ctx, u.id, t.id, power).damage
      if (powerDmg >= staffDmg) {
        act(decision, { actor: u.id, target: t.id, actionId: power })
        return
      }
    }
  }

  const reachNow = reachAt(u.hex)
  const inRange = enemies.filter((e) => ctx.geo.distance(u.hex, e.hex) <= reachNow)
  if (!attackIfPossible(decision, u, inRange)) {
    if (!attackIfPossible(decision, u, adjacentEnemies(decision, u))) {
      if (!effectsPower(decision, u, 'primary')) idle(decision, u, u.stamina < 1 ? 'out of stamina' : 'no target in range')
    }
  }
}

// ── the six modes of 2026-09-03 (ai.mode.defender, ai.mode.support, and the
// four the encounter session wanted — ENCOUNTERS-ENGINE-HANDOFF §4.10). Rules,
// not scores, inspectable by eye; every quantity from canAttack/preview.

/** Walk toward `dest` with the first affordable path power, stopping as close as reach allows. */
function closeOn(decision: Decision, u: Unit, dest: HexId, stopAt = 1): void {
  const ctx = decision.ctx
  if (ctx.geo.distance(u.hex, dest) <= stopAt) return
  const walk = movePowerOf(decision, u, 'path')
  if (!walk) { sidestepToward(decision, u, dest); return }
  const destinations = moveTargets(decision, u, walk)
  let bestHex: HexId | null = null, bestD = ctx.geo.distance(u.hex, dest)
  for (const hex of destinations) {
    const d = ctx.geo.distance(hex, dest)
    if (d < bestD && d >= stopAt) { bestD = d; bestHex = hex }
  }
  if (bestHex !== null) act(decision, { actor: u.id, destination: bestHex, actionId: walk.id })
}
const allies = (ctx: Ctx, u: Unit) => ctx.state.units.filter((o) => o.side === u.side && o.id !== u.id && o.lifeState === 'standing')

/** defender — stays within 2 of the nearest ally under half health (else the nearest ally), attacks anything in reach, never advances alone. */
function defender(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const hurt = allies(ctx, u).filter((o) => o.hp * 2 < o.maxHp)
  const ward = (hurt.length ? hurt : allies(ctx, u)).sort((a, b) => ctx.geo.distance(u.hex, a.hex) - ctx.geo.distance(u.hex, b.hex) || a.id - b.id)[0]
  if (ward && ctx.geo.distance(u.hex, ward.hex) > 2) closeOn(decision, u, ward.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, ward ? 'holding by ' + ward.name : 'nobody to defend')
}

/** support — holds at range like a kiter, but allies come first: a free power, a support power, an effect power; the weapon last. */
function support(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  effectsPower(decision, u, 'free')
  if (supportPower(decision, u)) return
  if (burstIfUseful(decision, u)) return
  if (effectsPower(decision, u, 'primary')) return
  rangedKite(decision, u)
}

/** focused fire — the whole side picks one target: the standing enemy with the least health, ties to the lower id. */
function focusedFire(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const target = lowestHealth(livingEnemies(ctx, u))
  if (!target) return
  closeOn(decision, u, target.hex, 1)
  if (u.lifeState !== 'standing') return
  const id = bestAttack(decision, u.id, target.id)
  if (id) { act(decision, { actor: u.id, target: target.id, actionId: id }); return }
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, 'the focus is out of reach')
}

/** value hunter — damage or healing, whichever is worth more this activation. */
function valueHunter(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  effectsPower(decision, u, 'free')
  let bestHeal = 0, healId: string | null = null, healTo: number | null = null
  for (const a of powersOf(ctx, u)) {
    const id = a.id
    if (!(a.effect === 'heal' || a.effects?.some((e) => e.kind === 'heal'))) continue
    for (const o of allies(ctx, u).concat([u])) {
      if (!legalTarget(decision, u.id, o.id, id)) continue
      const worth = Math.min(previewPower(ctx, u.id, o.id, id).heal ?? 0, o.maxHp - o.hp)
      if (worth > bestHeal || (worth === bestHeal && healTo !== null && o.id < healTo)) { bestHeal = worth; healId = id; healTo = o.id }
    }
  }
  let bestDmg = 0, dmgTarget: Unit | null = null, dmgId: string | null = null
  for (const e of livingEnemies(ctx, u)) {
    const id = bestAttack(decision, u.id, e.id)
    if (!id) continue
    const d = preview(ctx, u.id, e.id, id).damageOnHit
    if (d > bestDmg || (d === bestDmg && dmgTarget && e.id < dmgTarget.id)) { bestDmg = d; dmgTarget = e; dmgId = id }
  }
  if (healId && healTo !== null && bestHeal >= bestDmg && bestHeal > 0) { act(decision, { actor: u.id, target: healTo, actionId: healId }); return }
  if (dmgTarget && dmgId) { act(decision, { actor: u.id, target: dmgTarget.id, actionId: dmgId }); return }
  // nothing worth doing from here: close on the nearest enemy, then try again
  const near = nearestEnemy(ctx, u)
  if (near) closeOn(decision, u, near.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, 'nothing worth doing')
}

/** follow — stays adjacent to the nearest ally that is not itself a follower, and attacks what it can from there. */
function follow(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const lead = allies(ctx, u).filter((o) => o.ai !== 'follow').sort((a, b) => ctx.geo.distance(u.hex, a.hex) - ctx.geo.distance(u.hex, b.hex) || a.id - b.id)[0]
    ?? allies(ctx, u).sort((a, b) => a.id - b.id)[0]
  if (lead && ctx.geo.distance(u.hex, lead.hex) > 1) closeOn(decision, u, lead.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, lead ? 'following ' + lead.name : 'nobody to follow')
}

/** hunter — has a target and goes for it: the weakest enemy when it first acts, pursued until it falls. */
function hunter(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  let t = u.huntTarget !== undefined ? ctx.state.units[u.huntTarget] : undefined
  if (!t || !livingEnemies(ctx, u).some(e => e.id === t!.id)) {
    const pick = lowestHealth(livingEnemies(ctx, u))
    if (!pick) return
    u.huntTarget = pick.id
    emit(ctx, 'ai.hunts', `ai.${u.ai}`, { actor: u.id, target: pick.id })
    t = pick
  }
  closeOn(decision, u, t.hex, 1)
  if (u.lifeState !== 'standing') return
  const id = bestAttack(decision, u.id, t.id)
  if (id) { act(decision, { actor: u.id, target: t.id, actionId: id }); return }
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, 'the quarry is out of reach')
}

/** flee — the reachable hex farthest from the nearest enemy; never attacks. The civilians' flight (ruled 2026-09-03). */
function flee(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const enemies = livingEnemies(ctx, u)
  if (!enemies.length) { idle(decision, u, 'nothing to flee'); return }
  const walk = movePowerOf(decision, u, 'path')
  if (walk) {
    const destinations = moveTargets(decision, u, walk)
    let best: HexId | null = null, bestD = Math.min(...enemies.map((e) => ctx.geo.distance(u.hex, e.hex)))
    for (const hex of destinations) {
      const d = Math.min(...enemies.map((e) => ctx.geo.distance(hex, e.hex)))
      if (d > bestD) { bestD = d; best = hex }
    }
    if (best !== null) act(decision, { actor: u.id, destination: best, actionId: walk.id })
  } else {
    const near = nearestEnemy(ctx, u)
    const step = movePowerOf(decision, u, 'sidestep')
    if (near && step) {
      const away = moveTargets(decision, u, step).sort((a, b) => ctx.geo.distance(b, near.hex) - ctx.geo.distance(a, near.hex) || a - b)[0]
      if (away !== undefined && ctx.geo.distance(away, near.hex) > ctx.geo.distance(u.hex, near.hex)) act(decision, { actor: u.id, destination: away, actionId: step.id })
    }
  }
  if (u.lifeState === 'standing') idle(decision, u, 'fleeing')
}

const MODES: Record<string, (decision: Decision, u: Unit) => void> = {
  'flee': flee,
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
  if (ctx.state.outcome || u.lifeState !== 'standing' || isBlocked(ctx, u) || u.primaryUsed) return
  if (!MODES[u.ai]) throw new Error(`unknown AI mode '${u.ai}'`)
  // capability.confusion (2026-09-03): "Swaps the affected unit's AI strategy
  // for a different one" — the next mode in registry order stands in, and the
  // log names both. Deterministic: no cup, no choice.
  const names = Object.keys(MODES)
  // an override (the civilians' flight, ruled 2026-09-03) stands in until its Turn ends
  const base = u.aiOverride && ctx.state.turn <= u.aiOverride.untilTurn ? u.aiOverride.mode : u.ai
  const ai = isConfused(ctx, u) ? names[(names.indexOf(base) + 1) % names.length]! : base
  const mode = MODES[ai]!
  emit(ctx, 'ai.mode', `ai.${ai}`, { actor: unitId, mode: ai, ...(isConfused(ctx, u) ? { confusedFrom: base } : {}), ...(base !== u.ai ? { overriding: u.ai } : {}) })
  const decision: Decision = {
    ctx, freeUsed: new Set(), actionsTaken: 0, idled: false,
    limit: 2 + Object.values(ctx.actions).filter(a => a.free).length,
  }
  while (!ctx.state.outcome && u.lifeState === 'standing' && !isBlocked(ctx, u) && !u.primaryUsed) {
    const before = decision.actionsTaken
    mode(decision, u)
    // An explicit idle choice ends the cycle. Successful free or movement-slot
    // choices can leave another useful opportunity; let the same mode choose.
    if (decision.idled || decision.actionsTaken === before) break
  }
}

export const AI_MODES = Object.keys(MODES)
