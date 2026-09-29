// VISION, DARKNESS AND LIGHT — capability.vision (2026-09-03).
//
// COMBAT-DESIGN §4, re-ruled 2026-09-03 (Andrew, verbatim in that file):
//   effective Vision = 6 (the battlefield's modifier) + the unit's Vision stat
//   (0 by default) + badges, gear, effects, floored at 1 — always.
// Angela, 2026-09-03: "The base visibility that should be revealed from
// darkness is 6, so it's basically everyone has a vision of 6, even though
// the stat is 0. So versus fog, it would be a 3." (fog: not built — no row).
// Vision is a radius, shortened toward a hex by the thin obstructions between
// (v2.thin-obstruction, withinSight). V2 attack-line blockers are separate (los.ts).
//
// Darkness is two things (rule.ground-layers): the battlefield CONDITION,
// which paints every hex dark at phase 1, and the LAYER, which a unit paints
// in a radius. "On the hero phase each hero lights everything within its
// Vision radius" — lighting is unpainting darkness. "Any hex with the burning
// status and any unit with the burning status is revealed regardless of
// range" — burning is a flare. Targeting what you cannot see: NOT allowed
// (COMBAT-DESIGN §4's assumption, kept as SWITCHES.md targetUnseen).

import type { Ctx, Unit } from './types.js'
import { effective } from './stats.js'
import { LAYER } from '../content/maps.js'
import { emit, layerAt, paintLayer } from './mutate.js'
import { paintGround } from './ground.js'
import { thinObstructionsOnLine } from './obstruction.js'
import { THIN_OBSTRUCTION } from '../content/maps.js'

export const BATTLEFIELD_VISION = 6

/** Effective Vision — the battlefield's 6, the stat, the mods; floored at 1. */
export function visionOf(ctx: Ctx, u: Unit): number {
  return Math.max(1, BATTLEFIELD_VISION + effective(ctx, u, 'vision').value)
}

/**
 * Is `hex` inside `u`'s sight? v2.thin-obstruction (Andrew 2026-09-24): thin obstructions
 * "are also going to reduce vision by one" — each one strictly BETWEEN the viewer and the
 * hex cuts Vision toward it by 1 (SWITCHES.md thinVisionEnds). Floored at 1, as Vision is.
 */
export function withinSight(ctx: Ctx, u: Unit, hex: number): boolean {
  const d = ctx.geo.distance(u.hex, hex), r = visionOf(ctx, u)
  if (d > r) return false
  const cut = thinObstructionsOnLine(ctx, u.hex, hex, false).length * -THIN_OBSTRUCTION.vision
  return d <= Math.max(1, r - cut)
}

/** Is a hex dark? Only a painted darkness layer makes it so (the condition paints at setup). */
export function isDark(ctx: Ctx, hex: number): boolean {
  return layerAt(ctx, hex) === LAYER.DARKNESS
}

function isBurning(ctx: Ctx, target: Unit): boolean {
  return target.statuses.some((s) => s.id === 'status.burn' && s.value > 0) || layerAt(ctx, target.hex) === LAYER.BURNING
}

/** Can `viewer` see `target`? Lit hexes always; dark hexes within Vision; burning reveals regardless of range. */
export function canSee(ctx: Ctx, viewer: Unit, target: Unit): boolean {
  if (!isDark(ctx, target.hex)) return true
  if (isBurning(ctx, target)) return true
  return withinSight(ctx, viewer, target.hex)
}

/** Hex visibility never invents a Unit or changes high-prop placement blockage. */
export function canSeeHex(ctx: Ctx, viewer: Unit, hex: number): boolean {
  if (!Number.isSafeInteger(hex) || hex < 0 || hex >= ctx.geo.hexCount) return false
  return !isDark(ctx, hex) || withinSight(ctx, viewer, hex)
}

/**
 * The condition: every hex dark at phase 1 — except burning ground, which is its own light
 * (COMBAT-DESIGN.md 261: "any hex with the burning status … is revealed regardless of range").
 * fix.ground-one-funnel (2026-09-28): burning ground is a layer now, so the night would otherwise
 * paint over a map's 'b' hexes (SWITCHES nightSparesBurning).
 */
export function fallNight(ctx: Ctx, causeId: string): void {
  let n = 0
  for (let h = 0; h < ctx.geo.hexCount; h++) if (layerAt(ctx, h) !== LAYER.BURNING) { paintLayer(ctx, h, LAYER.DARKNESS, causeId); n++ }
  emit(ctx, 'night.fell', causeId, { hexes: n })
}

/** The hero phase: each standing hero lights what is inside its Vision — darkness unpainted. */
export function heroesLight(ctx: Ctx, causeId: string): void {
  if (!ctx.state.layers?.some((l) => l === LAYER.DARKNESS)) return
  let lit = 0
  for (const u of ctx.state.units) {
    if (u.side !== 'hero' || u.lifeState !== 'standing') continue
    for (let h = 0; h < ctx.geo.hexCount; h++) {
      if (layerAt(ctx, h) === LAYER.DARKNESS && withinSight(ctx, u, h)) { paintLayer(ctx, h, LAYER.NONE, causeId); lit++ }
    }
  }
  if (lit) emit(ctx, 'light.cast', causeId, { hexes: lit })
}

/**
 * Paint a layer in a radius from a hex — the night family's repaint, the Eyeblight's dying rush —
 * through the one paint-with-occupants function (fix.ground-one-funnel, review E3): a unit the
 * ground is painted under takes its entry beat, as the band's do.
 */
export function paintRadius(ctx: Ctx, centre: number, radius: number, layer: number, causeId: string): number {
  const hexes: number[] = []
  for (let h = 0; h < ctx.geo.hexCount; h++) if (ctx.geo.distance(centre, h) <= radius) hexes.push(h)
  paintGround(ctx, hexes, layer, causeId)
  return hexes.length
}
