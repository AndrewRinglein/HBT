// v2.ground-table — the ground a unit ENTERS, in one place (COMBAT-V2-DESIGN-2026-09-07 §3.2).
//
// Before this file the entry beat was written out twice (a step in executeMove, a
// sidestep in executeSidestep) and a push had none. Now every way into a hex goes
// through enterGround, and the only difference between them is which beats run:
//
//   step / sidestep — the v1 ground beats (strips, applies, the painted layer) and
//                     the V2 hazard
//   push            — the V2 hazard only. §3.2: "Being knocked into lava is
//                     *entering* it, not a collision". No document says a push
//                     wades through water or catches on burning ground, so the v1
//                     beats stay step-only (SWITCHES.md pushEntersGround).
//
// Flight lands with zero Steps and so never reaches here — the End of Activation
// rung (battle.ts) is where a flier meets the ground it chose.
import type { Ctx } from './types.js'
import { appliesOnEnterOf, hazardOf, layerAppliesOnEnter, layerIdOf, stripsOnEnterOf, terrainIdOf } from '../content/maps.js'
import { applyDamage, layerAt, unit } from './mutate.js'
import { flatDamage } from './mitigation.js'
import { applyStatus, incomingAbsorb, reduceStatus, spendAbsorb } from './status.js'

/**
 * The hazard of the ground at `hex`, dealt to the unit standing there. Direct typed
 * damage first — through Protection, then the type's own resist (§8.2: "the 3 is
 * direct fire vs Fire Resist") — then the hazard's statuses (SWITCHES.md
 * hazardDamageFirst). Emits damage.applied with the terrain as its cause even when
 * the resist takes all of it, so the log says why nothing happened (Law 12).
 * Returns true when HP damage landed, so the caller knows to settle.
 */
export function applyGroundHazard(ctx: Ctx, unitId: number, hex: number): boolean {
  const u = unit(ctx, unitId)
  if (u.lifeState !== 'standing' || ctx.state.outcome) return false
  const t = ctx.state.terrain[hex] ?? 0
  const h = hazardOf(t)
  if (!h) return false
  const cause = terrainIdOf(t)
  let landed = false
  if (h.damage > 0) {
    const r = flatDamage(ctx, u, h.damage, h.damageType, incomingAbsorb(ctx, u))
    if (r.absorbed > 0) spendAbsorb(ctx, unitId, r.absorbed, cause)
    applyDamage(ctx, unitId, r.value, cause, {
      actor: null, damageType: h.damageType, hazard: true, hex,
      ...(r.resisted ? { resisted: r.resisted } : {}),
      ...(r.absorbed ? { absorbed: r.absorbed } : {}),
    })
    landed = r.value > 0
  }
  for (const [sid, n] of h.applies) applyStatus(ctx, unitId, sid, n, cause)
  return landed
}

/** Every entry into a hex. Returns true when a hazard's HP damage landed. */
export function enterGround(ctx: Ctx, unitId: number, hex: number, how: 'step' | 'push'): boolean {
  if (how === 'step') {
    const t = ctx.state.terrain[hex] ?? 0
    const id = terrainIdOf(t)
    // water strips 1 Burn as you splash through (GAME-DESIGN §4)
    for (const sid of stripsOnEnterOf(t)) reduceStatus(ctx, unitId, sid, 1, id)
    // and burning ground sears as you cross — the inverse, same beat
    for (const [sid, n] of appliesOnEnterOf(t)) applyStatus(ctx, unitId, sid, n, id)
    // the painted layer's entry beat, same funnel (capability.ground-layers)
    const layer = layerAt(ctx, hex)
    for (const [sid, n] of layerAppliesOnEnter(layer)) applyStatus(ctx, unitId, sid, n, layerIdOf(layer))
  }
  return applyGroundHazard(ctx, unitId, hex)
}
