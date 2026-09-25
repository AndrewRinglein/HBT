// THIN OBSTRUCTIONS — v2.thin-obstruction (Andrew, 2026-09-24; engine/DECISIONS.md
// "the ground table, re-ruled" and "thin obstructions are a third kind of prop", verbatim there).
//
// A thin upright obstruction (a tree, a sign, an upright body; every woodland hex) is free
// to move onto and a unit may stand in its hex. It does two things, both read here:
//   • a ranged shot takes −5 for each thin-obstruction hex it ENTERS — every hex it passes
//     through AND the target's own hex, never the shooter's own hex;
//   • each thin obstruction between a unit and a hex cuts its Vision toward that hex by 1.
// Two sources make a hex thin: its ground (content/terrain.ts isThinGround — woodland) and a
// prop of height `thin` standing in it. Core knows only the mechanism. A hex counts ONCE,
// however many sources it holds (SWITCHES.md thinPerHex). "Passes through" is the attack-line
// geometry's own exact test (los.ts segmentCrossesCell) — the rule high props block by.
import type { Ctx } from './types.js'
import { segmentCrossesCell } from './los.js'
import { isThinGround, terrainIdOf } from '../content/maps.js'

/** One thin-obstruction hex a line enters, and what makes it thin (the ground first, else the lowest prop id). */
export type ThinHit = { readonly hex: number; readonly id: string }

/** Hex → the id that makes it thin, for this state. Ground first; else the lowest thin prop id (Law 6). */
function thinSources(ctx: Ctx): Map<number, string> {
  const out = new Map<number, string>(), terrain = ctx.state.terrain
  for (let h = 0; h < terrain.length; h++) if (isThinGround(terrain[h] ?? 0)) out.set(h, terrainIdOf(terrain[h] ?? 0))
  const props = ctx.state.props.filter((p) => p.height === 'thin').sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const p of props) if (p.footprint.kind === 'hex') for (const h of p.footprint.hexes) if (!out.has(h)) out.set(h, p.id)
  return out
}

/**
 * The thin obstructions a line from `from` to `to` enters, in ascending hex order (Law 6).
 * `from` never counts. `to` counts only when `countEnd` — a shot's target hex does, a
 * vision line's far hex does not (SWITCHES.md thinVisionEnds).
 */
export function thinObstructionsOnLine(ctx: Ctx, from: number, to: number, countEnd: boolean): ThinHit[] {
  const out: ThinHit[] = []
  if (from === to) return out
  const sources = thinSources(ctx), board = ctx.state.board
  for (const h of [...sources.keys()].sort((a, b) => a - b)) {
    if (h === from || (h === to && !countEnd)) continue
    if (h !== to && !segmentCrossesCell(board, from, to, h)) continue
    out.push({ hex: h, id: sources.get(h)! })
  }
  return out
}
