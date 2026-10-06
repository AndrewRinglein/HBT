// The ground a unit MEETS, in one place — v2.ground-table (COMBAT-V2-DESIGN-2026-09-07 §3.2), made
// the one owner by fix.ground-one-funnel (2026-09-28; DECISIONS.md "the duplication review, ruled",
// findings E1 E3 E4). Andrew: "The ground table is an engine rule." · "A push does apply ground
// statuses."
//
// Three ways a unit meets the ground, and every one goes through here:
//   enterGround          — a step, a sidestep and a push: the ground's strips, what it applies, the
//                          painted layer's entry beat, then its hazard damage. One beat set for all
//                          three (E1: a sidestep once skipped the layer; E4: a push once met only the
//                          hazard — SWITCHES pushEntersGround, retired).
//   groundAtActivationEnd — the occupant's End of Activation rung (battle.ts calls it): the same
//                          shapes' second beat.
//   paintGround          — the ground coming to a unit: a layer painted under a standing unit gives
//                          that layer's entry beat, whoever paints it — the advancing band, a
//                          trigger's layer.paint, the encounter's setup paint, the map's own 'b'/'p'
//                          (E3: three painting paths gave three answers; the band's is the rule).
//
// Flight lands with zero Steps and so never reaches enterGround — the End of Activation rung is
// where a flier meets the ground it chose.
import type { Ctx } from './types.js'
import { appliesOnActivationEndOf, appliesOnEnterOf, hazardOf, layerAppliesOnActivationEnd, layerAppliesOnEnter, layerIdOf, stripsOnActivationEndOf, stripsOnEnterOf, terrainIdOf } from '../content/maps.js'
import { layerAt, paintLayer, removeTrap, unit } from './mutate.js'
import { layerOfId } from '../content/maps.js'
import { valueOf } from './trigger.js'
import { applyStatus, dealDirectDamage, reduceStatus } from './status.js'

/**
 * The hazard of the ground at `hex`, dealt to the unit standing there: direct typed damage through
 * Protection, then the type's own resist (§8.2: "the 3 is direct fire vs Fire Resist"). Emits
 * damage.applied with the terrain as its cause even when the resist takes all of it, so the log
 * says why nothing happened (Law 12). Returns true when HP damage landed, so the caller settles.
 */
export function applyGroundHazard(ctx: Ctx, unitId: number, hex: number): boolean {
  const u = unit(ctx, unitId)
  if (u.lifeState !== 'standing' || ctx.state.outcome) return false
  const t = ctx.state.terrain[hex] ?? 0
  const h = hazardOf(t)
  if (!h || h.damage <= 0) return false
  const r = dealDirectDamage(ctx, unitId, h.damage, h.damageType, terrainIdOf(t), { actor: null, damageType: h.damageType, hazard: true, hex })
  return r.value > 0
}

/**
 * Every entry into a hex — a step, a sidestep, a push. Water strips 1 Burn as you splash through
 * (GAME-DESIGN §4); burning ground sears as you cross, the inverse, same beat; the painted layer's
 * entry beat, same funnel (capability.ground-layers); then the hazard's damage (SWITCHES
 * hazardDamageFirst, re-read). Returns true when a hazard's HP damage landed.
 */
export function enterGround(ctx: Ctx, unitId: number, hex: number): boolean {
  // capability.placed-traps: the trap rung comes first (the walk's ladder: "4. traps", then the ground's own beat)
  const sprung = springTrap(ctx, unitId, hex)
  const t = ctx.state.terrain[hex] ?? 0
  const id = terrainIdOf(t)
  for (const sid of stripsOnEnterOf(t)) reduceStatus(ctx, unitId, sid, 1, id)
  for (const [sid, n] of appliesOnEnterOf(t)) applyStatus(ctx, unitId, sid, n, id)
  const layer = layerAt(ctx, hex)
  for (const [sid, n] of layerAppliesOnEnter(layer)) applyStatus(ctx, unitId, sid, n, layerIdOf(layer))
  return applyGroundHazard(ctx, unitId, hex) || sprung
}

/**
 * capability.placed-traps (2026-10-05): the trap on `hex`, if there is one, springs on the unit that has just entered it —
 * "the first unit to enter", friend or foe — and is gone: one line (`trap.sprung`), then its damage (direct, of its type, the
 * amount read NOW from the placer's side — on the unit that entered and, with a radius, on every unit within it of the trap's
 * hex, in unit order), its statuses on the unit that entered, and the layer its hex gains. Called from enterGround, the one
 * funnel for a step, a sidestep and a push, and from the End of Activation rung for a unit that came to the hex any other way
 * (it flew, or was placed). A FORECAST of a walk (ctx.dryWalk, on a fork) springs only a trap of the walker's own side: nobody
 * is shown a trap they do not know of. Returns true when HP damage landed, so the caller settles.
 */
export function springTrap(ctx: Ctx, unitId: number, hex: number): boolean {
  const list = ctx.state.traps
  if (!list?.length || ctx.state.outcome) return false
  const u = unit(ctx, unitId)
  if (u.lifeState === 'dead') return false
  const found = list.filter((x) => x.hex === hex).sort((a, b) => a.id - b.id)[0]
  if (!found) return false
  if (ctx.dryWalk && found.side !== u.side) return false
  const trap = removeTrap(ctx, found.id, 'sprung', unitId)
  let hurt = false
  if (trap.damage) {
    const amount = valueOf(ctx, unit(ctx, trap.by), trap.damage.amount)
    const struck = trap.radius === undefined ? [u]
      : ctx.state.units.filter((o) => o.lifeState !== 'dead' && ctx.geo.distance(o.hex, hex) <= trap.radius!).sort((a, b) => a.id - b.id)
    for (const o of struck) {
      if (amount <= 0) break
      const r = dealDirectDamage(ctx, o.id, amount, trap.damage.damageType, trap.source, { actor: trap.by, damageType: trap.damage.damageType, trap: trap.id, hex })
      if (r.value > 0) hurt = true
    }
  }
  for (const s of trap.statuses ?? []) applyStatus(ctx, unitId, s.statusId, s.value, trap.source, trap.by)
  if (trap.paints !== undefined) paintGround(ctx, [hex], layerOfId(trap.paints), trap.source)
  return hurt
}

/** The occupant's End of Activation ground rung — the same shapes' second beat. Returns true when a hazard's HP damage landed. */
export function groundAtActivationEnd(ctx: Ctx, unitId: number): boolean {
  const u = unit(ctx, unitId)
  const t = ctx.state.terrain[u.hex] ?? 0
  for (const sid of stripsOnActivationEndOf(t)) reduceStatus(ctx, unitId, sid, 1, terrainIdOf(t))
  for (const [sid, n] of appliesOnActivationEndOf(t)) applyStatus(ctx, unitId, sid, n, terrainIdOf(t))
  const layer = layerAt(ctx, u.hex)
  for (const [sid, n] of layerAppliesOnActivationEnd(layer)) applyStatus(ctx, unitId, sid, n, layerIdOf(layer))
  // capability.placed-traps: a unit that came to a trapped hex without stepping onto it (it flew, or was placed) meets the trap here
  const sprung = springTrap(ctx, unitId, u.hex)
  // V2 hazard (§3.2): lava's second beat — "and again at end of activation if still there"
  return applyGroundHazard(ctx, unitId, u.hex) || sprung
}

/**
 * Paint `layer` on `hexes`, then give every standing unit on a painted hex the entry beat of the
 * ground it now stands on — it did not step, the ground came to it (SWITCHES groundComesToYou). In
 * hex order, then unit order (Law 6). A Burn/Frost cancel leaves bare ground, which applies nothing.
 * The area fall does not come through here: its landing's own damage and statuses are the whole
 * landing (SWITCHES areaFallNoEntryBeat). The caller settles.
 */
export function paintGround(ctx: Ctx, hexes: readonly number[], layer: number, causeId: string): void {
  for (const hex of hexes) paintLayer(ctx, hex, layer, causeId)
  const painted = new Set(hexes)
  for (const u of ctx.state.units) {
    if (u.lifeState !== 'standing' || !painted.has(u.hex)) continue
    const now = layerAt(ctx, u.hex)
    for (const [sid, n] of layerAppliesOnEnter(now)) applyStatus(ctx, u.id, sid, n, layerIdOf(now))
  }
}
