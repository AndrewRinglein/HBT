// v2.prop-attack — V2 R7 part 2 (COMBAT-V2-DESIGN-2026-09-07 §12.2, ruled 2026-09-07):
// "Props can be targeted directly. A hex is a legal target for a destroy-carrying
// effect, with no unit in it." Bursts already take any hex as their centre; this is
// the attack half — an attack with Destroy aimed at a hex that holds a prop.
//
// The blow is not an attack on a unit: no accuracy, Block, crit, damage or hooks, and
// no dice (SWITCHES.md 'V2 attacking a prop'). It pays exactly as the attack does and
// applies the attack's Destroy to every prop in or touching the hex, through the same
// mutator the attack pipeline uses (Law 3), then settles nothing it did not change.
import type { AttackDef, Ctx } from './types.js'
import { actionReady, isAttack, resolveActionSlot, spendAction } from './action.js'
import { attackPacketFields } from './attack-profile.js'
import { reachOf } from './pipeline.js'
import { propsTouching } from './props.js'
import { segmentCrossesCell } from './los.js'
import { centerPoint, segmentCrossesPolygon } from './geometry.js'
import { canSeeHex } from './vision.js'
import { forcedTargetOf, isBlocked } from './status.js'
import { breakStatuses, damageProp, emit, unit } from './mutate.js'

/**
 * The attack line to a prop's hex. A high prop blocks it as it blocks any attack
 * line (§4) — except the props being struck, which the line reaches rather than
 * crosses. The same cell and polygon tests the burst's shielding uses.
 */
function lineToProp(ctx: Ctx, from: number, hex: number): boolean {
  const board = ctx.state.board, struck = new Set(propsTouching(ctx, [hex]).map(p => p.id))
  const a = centerPoint(board, from), b = centerPoint(board, hex)
  return !ctx.state.props.some(p => p.height === 'high' && !struck.has(p.id) && (p.footprint.kind === 'hex'
    ? p.footprint.hexes.some(c => segmentCrossesCell(board, from, hex, c))
    : segmentCrossesPolygon(a, b, p.footprint.vertices)))
}

/**
 * THE legality of an attack aimed at a hex (Law 2's one door for this target kind):
 * an attack row with Destroy, a hex holding or touched by a prop, no living unit
 * standing or lying in it, in reach and in sight, a clear line, and the same actor
 * gates canAttack applies (standing, not blocked, slot, limits, not forced elsewhere).
 */
export function canAttackHex(ctx: Ctx, attackerId: number, hex: number, attackId: string, slot?: import('./types.js').ActionSlot): boolean {
  const at = ctx.state.units[attackerId], a = ctx.actions[attackId]
  if (!at || !a || !isAttack(a)) return false
  if ((attackPacketFields(a.attack).destroy ?? 0) < 1) return false
  if (!Number.isSafeInteger(hex) || hex < 0 || hex >= ctx.geo.hexCount) return false
  if (at.lifeState !== 'standing' || isBlocked(ctx, at)) return false
  if (forcedTargetOf(ctx, at) !== null) return false
  if (resolveActionSlot(ctx, at, a, slot) === null || !actionReady(ctx, at, a)) return false
  if (ctx.state.units.some(u => u.hex === hex && u.lifeState !== 'dead')) return false
  if (!propsTouching(ctx, [hex]).length) return false
  if (!ctx.cfg.switches.targetUnseen && !canSeeHex(ctx, at, hex)) return false
  const d = ctx.geo.distance(at.hex, hex)
  if (a.attack.kind === 'ranged' && d <= 1) return false
  return d >= 1 && d <= reachOf(ctx, at, a as AttackDef) && lineToProp(ctx, at.hex, hex)
}

/** Every hex this attack may be aimed at now — a cheap enumeration for a picker. */
export function propAttackHexes(ctx: Ctx, attackerId: number, attackId: string, slot?: import('./types.js').ActionSlot): number[] {
  const hexes = new Set<number>()
  for (const p of ctx.state.props) if (p.footprint.kind === 'hex') for (const h of p.footprint.hexes) hexes.add(h)
  const polygons = ctx.state.props.some(p => p.footprint.kind === 'polygon')
  const candidates = polygons ? Array.from({ length: ctx.geo.hexCount }, (_, h) => h) : [...hexes].sort((x, y) => x - y)
  return candidates.filter(h => canAttackHex(ctx, attackerId, h, attackId, slot))
}

/**
 * Resolve an attack aimed at a hex: pay, emit prop.struck, apply Destroy to every
 * prop in or touching the hex in prop-id order. Always connects (a prop does not
 * dodge or Block — SWITCHES.md propAttackConnects).
 */
export function attackProp(ctx: Ctx, attackerId: number, hex: number, attackId: string, slot?: import('./types.js').ActionSlot): void {
  if (!canAttackHex(ctx, attackerId, hex, attackId, slot)) throw new Error(`illegal prop attack: ${attackerId} -> hex ${hex} with ${attackId}`)
  const at = unit(ctx, attackerId), a = ctx.actions[attackId] as AttackDef
  const destroy = attackPacketFields(a.attack).destroy!
  spendAction(ctx, attackerId, a, resolveActionSlot(ctx, at, a, slot)!)
  breakStatuses(ctx, attackerId, 'attack', a.id)   // capability.stealth: a blow at a prop is an attack
  const props = propsTouching(ctx, [hex])
  emit(ctx, 'prop.struck', a.id, { actor: attackerId, hex, attackId: a.id, kind: a.attack.kind, destroy, props: props.map(p => p.id), distance: ctx.geo.distance(at.hex, hex) })
  for (const p of props) damageProp(ctx, p.id, destroy, a.id, attackerId)
}
