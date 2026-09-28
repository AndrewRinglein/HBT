// THE CHARGE — capability.charge (2026-09-27).
//
// An action carrying BOTH a move profile and an attack profile (isCharge,
// action.ts) — the one-action-type ruling's own example, "Move 3, do damage"
// (DECISIONS.md 2026-09-04; types.ts). The Codex's Charge rows (Fast Zombie:
// move 3 hexes and attack; Iron Colossus: 2 hexes, cd 4) are approved content
// (DECISIONS.md 2026-09-02, "The enemy special moves"): "moves N hexes and
// attacks as ONE action".
//
// It is aimed at a UNIT, like any attack. The planner picks where the walk
// ends (SWITCHES.md chargeLanding); the walk is THE step loop every path walk
// takes (movement.ts walkSteps — attacks of opportunity, ground, points), the
// blow is performAttack — the one damage function, the one spend (Law 1). One
// action, one spend: the walk pays nothing, the attack pays the slot and the
// cooldown; a charge that falls short pays them itself, so it is never free.
//
// Pure planning (planCharge) never spends and never rolls; executeCharge
// resolves a plan made immediately before it (commands.ts executeAction).

import type { HexId } from './hex.js'
import type { ActionSlot, AttackDef, Ctx, MoveDef, Unit } from './types.js'
import { isCharge, spendAction } from './action.js'
import { canAttack, performAttack, reachOf } from './pipeline.js'
import { canSee } from './vision.js'
import { attackLineClear } from './los.js'
import { isBlocked, isRooted } from './status.js'
import { pathTo, reachable, walkSteps } from './movement.js'
import { emit, unit } from './mutate.js'
import { settle } from './settle.js'

export type ChargePlan = { kind: 'charge'; actor: number; actionId: string; target: number; destination: HexId; path: HexId[]; slot: ActionSlot }
type Refusal = { ok: false; reason: string }
const refused = (reason: string): Refusal => ({ ok: false, reason })

/** Movement points this charge may walk: the row's `hexes`, never more than the unit has left (SWITCHES.md chargeHexesArePoints). */
export function chargeBudget(u: Unit, a: MoveDef): number {
  const own = Math.max(0, u.movePointsLeft + a.move.budgetMod)
  return a.move.hexes === undefined ? own : Math.min(a.move.hexes, own)
}

/** Could this attack strike `target` from `hex`? Reach and line, read as if the attacker stood there — a view copy, nothing written (Law 5b). */
function strikesFrom(ctx: Ctx, at: Unit, tg: Unit, a: AttackDef, hex: HexId): boolean {
  const d = ctx.geo.distance(hex, tg.hex)
  if (a.attack.kind === 'ranged' && d <= 1) return false
  return d <= reachOf(ctx, { ...at, hex }, a) && attackLineClear(ctx, hex, tg.hex)
}

/**
 * THE CHARGE PLANNER — legality for a charge aimed at `target`. The caller
 * (planAction) has already asked the one limits check, the slot, standing and
 * not blocked, and a Taunt's forced target. What is the charge's own:
 *   - a path-shaped move (a charge walks; nothing else is built)
 *   - a living enemy it can see (the same gates canAttack keeps)
 *   - not rooted
 *   - the target OUT of reach where the charger stands (SWITCHES.md chargeNeedsDistance)
 *   - a hex within the charge's budget from which the attack would strike
 * The walk ends on the cheapest such hex, ties to the lower hex id (Law 6).
 */
export function planCharge(ctx: Ctx, actor: number, target: number, actionId: string, slot: ActionSlot): ChargePlan | Refusal {
  const u = ctx.state.units[actor], tg = ctx.state.units[target], a = ctx.actions[actionId]
  if (!u || !tg || !a || !isCharge(a)) return refused('illegal-target-or-action')
  if (a.move.shape !== 'path') return refused('illegal-target-or-action')
  if (tg.lifeState === 'dead' || tg.side === u.side) return refused('illegal-target-or-action')
  if (!ctx.cfg.switches.targetUnseen && !canSee(ctx, u, tg)) return refused('illegal-target-or-action')
  if (isRooted(ctx, u)) return refused('actor-rooted')
  if (strikesFrom(ctx, u, tg, a, u.hex)) return refused('target-already-in-reach')
  const budget = chargeBudget(u, a)
  if (budget <= 0) return refused('charge-out-of-reach')
  const reach = reachable(ctx, u, budget - u.movePointsLeft)
  let best: HexId | null = null
  for (const [hex, node] of reach) {
    if (!strikesFrom(ctx, u, tg, a, hex)) continue
    const b = best === null ? null : reach.get(best)!
    if (b === null || node.cost < b.cost || (node.cost === b.cost && hex < best!)) best = hex
  }
  if (best === null) return refused('charge-out-of-reach')
  return { kind: 'charge', actor, actionId, target, destination: best, path: pathTo(reach, u.hex, best), slot }
}

/**
 * Resolve a charge: walk the planned path (THE step loop, the charge named as
 * cause on every step), then — if the charger still stands, can act, and the
 * blow is legal where it stopped — the attack, through performAttack. If the
 * walk was cut short out of reach (a hit from an attack of opportunity ends
 * movement), the charge is still spent and the log says it fell short
 * (SWITCHES.md chargeShortWalk).
 */
export function executeCharge(ctx: Ctx, plan: ChargePlan): void {
  const a = ctx.actions[plan.actionId]
  if (!a || !isCharge(a)) throw new Error(`executeCharge: '${plan.actionId}' is not a charge`)
  const u = unit(ctx, plan.actor)
  emit(ctx, 'move.begin', a.id, { actor: plan.actor, from: u.hex, to: plan.destination, hexes: plan.path.length, target: plan.target })
  walkSteps(ctx, plan.actor, plan.path, a.id, chargeBudget(u, a), 0)
  if (ctx.state.outcome) return
  if (u.lifeState === 'standing' && !isBlocked(ctx, u) && canAttack(ctx, plan.actor, plan.target, a.id, plan.slot)) {
    performAttack(ctx, plan.actor, plan.target, a.id, plan.slot)
    settle(ctx, a.id)
    return
  }
  spendAction(ctx, plan.actor, a, plan.slot)
  emit(ctx, 'attack.cancelled', a.id, { actor: plan.actor, target: plan.target, hit: 1, of: Math.max(1, a.attack.hits ?? 1), reason: 'charge fell short' })
}
