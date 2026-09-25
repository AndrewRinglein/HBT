// STRUCTURES — v2.structures (Andrew, 2026-09-24; engine/DECISIONS.md, the three answers on
// walls, towers and houses, verbatim there).
//
// A structure is a kind of ground (SWITCHES.md structureAsGround) whose row in
// content/terrain.ts STRUCTURE says four things, and core reads only those fields — it
// never names a structure:
//
//   • how a unit gets in and out — across any side, or only across the ONE authored entry
//     side (a wall's stairs, a house's door: `state.entries`), and who may stand there;
//   • what it does to lines — an attack line passing THROUGH a structure hex is blocked,
//     its own two ends never are; standing up on one sees over nothing (Andrew 2026-09-25);
//   • the reach its occupant gains, for every attack;
//   • its GUARD — what it gives its occupant against an enemy attacker who is not standing
//     in the same kind of structure: accuracy against, Block, Ranged Block, Dodge, Armor.
//
// Every reader is here, so movement, the line, the accuracy ladder, Block and Armor cannot
// disagree about who is "in" what.
import type { Ctx, Unit } from './types.js'
import { STRUCTURE_GROUND, structureOf, type Structure } from '../content/maps.js'
import { rulesSideOf } from './side.js'
import { passableHexes, type Passable } from './props.js'
import { geometryOf } from './hex.js'

/** The structure at a hex, or null. */
export function structureAt(ctx: Pick<Ctx, 'state'>, hex: number): Structure | null {
  return structureOf(ctx.state.terrain[hex] ?? 0)
}

/** Is [hex, from] an authored entry — the stairs or the door of `hex`, entered from `from`? */
function isEntry(ctx: Pick<Ctx, 'state'>, hex: number, from: number): boolean {
  return (ctx.state.entries ?? []).some(([h, f]) => h === hex && f === from)
}

/** Two hexes on the same structure — along a wall top, room to room in a house, wall to tower. */
function inside(a: Structure, b: Structure): boolean {
  return a.id === b.id || (a.elevated && b.elevated)
}

/**
 * May `mover` stand in `to`, arriving from `from`? `from` undefined asks only whether it may
 * stand there at all (a flight landing, a placement). No mover: a structure that admits only
 * one side's units admits nobody (SWITCHES.md structureNoMover).
 */
export function structureAllows(ctx: Ctx, mover: Unit | undefined, to: number, from?: number): boolean {
  const s = structureAt(ctx, to)
  const out = from === undefined ? null : structureAt(ctx, from)
  if (s?.onlySide && (!mover || rulesSideOf(ctx, mover) !== s.onlySide)) return false
  if (from === undefined) return true
  // stepping OUT of a structure to a hex that is not the same structure
  if (out && out.leave === 'entry' && !(s && inside(out, s)) && !isEntry(ctx, from, to)) return false
  if (!s) return true
  if (out && inside(out, s)) return true
  return s.enter === 'any' || isEntry(ctx, to, from)
}

/**
 * THE passability every mover reads: the board's own (props, floor) and then the structures'.
 * `mover` is the unit stepping, pushed or placed; placement passes none.
 */
export function passableFor(ctx: Ctx, mover: Unit | undefined, props = ctx.state.props): Passable {
  const board = passableHexes(ctx, props)
  if (!anyStructure(ctx)) return board
  return (hex, from) => board(hex, from) && structureAllows(ctx, mover, hex, from)
}

/**
 * Does this board hold any structure? Read once per movement question, never stored, so a
 * board with none — every control map — pays no per-step structure reads (Law 0, measured:
 * the AI-heavy hill battles ran 3–4% slower with a structure read on every neighbour).
 */
export function anyStructure(ctx: Pick<Ctx, 'state'>): boolean {
  const terrain = ctx.state.terrain
  for (let h = 0; h < terrain.length; h++) if (STRUCTURE_GROUND[terrain[h]!] === 1) return true
  return false
}

/** The extra move a step from `from` into `to` costs beyond the ground's own — a wall's stairs. */
export function structureStepCost(ctx: Pick<Ctx, 'state'>, from: number, to: number): number {
  const s = structureAt(ctx, to)
  if (!s || s.enter !== 'entry') return 0
  const out = structureAt(ctx, from)
  if (out && inside(out, s)) return 0
  return isEntry(ctx, to, from) ? s.entryCost : 0
}

/** Reach the ground a unit stands on adds to every attack it makes. */
export function structureReachOf(ctx: Pick<Ctx, 'state'>, u: Unit): number {
  return structureAt(ctx, u.hex)?.reach ?? 0
}

/**
 * Does a structure hex block the attack line from `a` to `b`? Its own ends never do. Nobody sees
 * over one — Andrew 2026-09-25 (DECISIONS.md): "Walls and towers cannot shoot past other obstructions."
 * But the rest of the wall an end stands on does not block ("You should be able to shoot on the same
 * wall"): a structure whose row says `clearAlongOwnRun`, connected to that end through hexes of
 * the same structure, is clear (SWITCHES.md sameWallBothEnds).
 */
export function structureBlocksLine(ctx: Pick<Ctx, 'state'>, a: number, b: number, crosses: (cell: number) => boolean): boolean {
  if (a === b) return false
  // Only a hex within one row and one column of the two ends' box can touch the segment — a
  // superset (checked exhaustively on 7×5, 9×8 and 16×16), then the exact test. One array read
  // per hex: the AI asks this for every hex it weighs (Law 0, measured: a whole-board scan with a
  // function call per hex made the hill battles 4% slower; this makes them no slower).
  const { width, height } = ctx.state.board, terrain = ctx.state.terrain
  const ra = Math.trunc(a / width), rb = Math.trunc(b / width), ca = a % width, cb = b % width
  const r0 = Math.max(0, Math.min(ra, rb) - 1), r1 = Math.min(height - 1, Math.max(ra, rb) + 1)
  const c0 = Math.max(0, Math.min(ca, cb) - 1), c1 = Math.min(width - 1, Math.max(ca, cb) + 1)
  let candidates: number[] | null = null
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const h = r * width + c
    if (h !== a && h !== b && STRUCTURE_GROUND[terrain[h]!] === 1) (candidates ??= []).push(h)
  }
  if (candidates === null) return false
  let own: Set<number> | null = null
  for (const c of candidates) {
    if (!crosses(c)) continue
    if (structureAt(ctx, c)?.clearAlongOwnRun) {
      own ??= ownRuns(ctx, a, b)
      if (own.has(c)) continue
    }
    return true
  }
  return false
}

/** Every hex of the runs `a` and `b` stand on — connected hexes of the same `clearAlongOwnRun` structure. */
function ownRuns(ctx: Pick<Ctx, 'state'>, a: number, b: number): Set<number> {
  const out = new Set<number>(), geo = geometryOf(ctx.state.board)
  for (const end of [a, b]) {
    const s = structureAt(ctx, end)
    if (!s?.clearAlongOwnRun || out.has(end)) continue
    const stack = [end]
    out.add(end)
    while (stack.length) {
      for (const n of geo.neighboursOf(stack.pop()!)) {
        if (out.has(n) || structureAt(ctx, n)?.id !== s.id) continue
        out.add(n); stack.push(n)
      }
    }
  }
  return out
}

/**
 * The guard `target`'s structure gives it against this `attacker`, or null: the attacker is an
 * enemy and does not stand in one of the structures the guard is shared with. `id` names the
 * structure on every ledger row it writes (Law 12).
 */
export function structureGuard(ctx: Ctx, attacker: Unit, target: Unit): (Structure['guard'] & { id: string }) | null {
  if (attacker.side === target.side) return null
  const s = structureAt(ctx, target.hex)
  if (!s) return null
  const theirs = structureAt(ctx, attacker.hex)
  if (theirs && s.sharedWith.includes(theirs.id)) return null
  return { ...s.guard, id: s.id }
}
