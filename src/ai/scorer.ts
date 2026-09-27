// ai.scorer (AI-DESIGN.md §3B-D, ruled 2026-09-26) — THE SCORER.
//
// A mode is data (src/content/ai-modes.ts): its characteristic rules name a
// fixed procedure (modes.ts), and every choice that procedure makes — whom to
// attack, where to stand, which action — is ranked here from the row's
// weights. The things weighed are CONSIDERATIONS: engine, each one number
// read from preview()/previewPower() or the battle state, never the AI's own
// arithmetic (Laws 1-2). Weights are integers (Law 7). Tiers compare in
// order; a full tie falls to the order the plans were listed in (Law 6).
//
// Only the considerations the ten modes already weighed are here. New ones
// (expected damage, kill, danger, path risk, ground) are their own backlog
// items (AI-DESIGN.md §7).
import type { HexId } from '../core/hex.js'
import type { AiPlanLine, AiTier, Ctx, Unit } from '../core/types.js'
import { TERRAIN } from '../core/types.js'
import { preview } from '../core/pipeline.js'
import { previewPower } from '../core/ability.js'
import { unit } from '../core/mutate.js'

/** What a plan is: an action, and where it is aimed or taken to. */
export type Plan = {
  readonly actionId: string
  readonly target?: number
  readonly destination?: HexId
  readonly centre?: HexId
  /** The movement planner's cost and length for a walked destination. */
  readonly pathCost?: number
  readonly pathLength?: number
  /** Numbers the caller already read from a preview for this plan (a burst forecast). */
  readonly facts?: Readonly<Record<string, number>>
}

/** What the considerations may read besides the plan — set by the mode's procedure. */
export type Scene = {
  readonly ctx: Ctx
  readonly actor: Unit
  /** The hex the mode's anchor names (AI-DESIGN §3B #8). */
  readonly anchor?: HexId
  readonly enemies?: readonly Unit[]
  /** The unit's weapon reach were it standing on a hex (reachOf on a shadow copy). */
  readonly reachAt?: (hex: HexId) => number
  /** The distance the mode wants to hold at from a hex. */
  readonly holdAt?: (hex: HexId) => number
  /** Could a melee enemy reach and strike this hex next Turn. */
  readonly threatened?: (hex: HexId) => boolean
  /** ai.encounter-rules: the side's focus target this Phase, for a coordinated unit (AI-DESIGN §4). */
  readonly focus?: number
}

export type Consideration = (scene: Scene, plan: Plan) => number

function need<T>(v: T | undefined, what: string, plan: Plan): T {
  if (v === undefined) throw new Error(`ai.scorer: consideration needs ${what}, plan ${plan.actionId} has none`)
  return v
}
function nearestEnemyDistance(s: Scene, hex: HexId): number {
  const enemies = need(s.enemies, 'the enemies', { actionId: 'scene' })
  return Math.min(...enemies.map((e) => s.ctx.geo.distance(hex, e.hex)))
}
const destination = (p: Plan) => need(p.destination, 'a destination', p)
const target = (s: Scene, p: Plan) => unit(s.ctx, need(p.target, 'a target', p))
const safe = (s: Scene, hex: HexId) => need(s.threatened, 'threat', { actionId: 'scene' })(hex) ? 0 : 1
const canShoot = (s: Scene, hex: HexId) => {
  const reach = need(s.reachAt, 'reach', { actionId: 'scene' })(hex)
  return need(s.enemies, 'the enemies', { actionId: 'scene' }).some((e) => s.ctx.geo.distance(hex, e.hex) <= reach) ? 1 : 0
}

/** THE CONSIDERATIONS — each a number, from preview or the state, never a second formula. */
export const CONSIDERATIONS: Readonly<Record<string, Consideration>> = {
  /** The target's current Health. */
  targetHealth: (s, p) => target(s, p).hp,
  /** Health the target is missing. */
  missing: (s, p) => { const t = target(s, p); return t.maxHp - t.hp },
  /** Damage on a hit: preview() for an attack, previewPower() for a power. */
  damage: (s, p) => s.ctx.actions[p.actionId]?.attack
    ? preview(s.ctx, s.actor.id, need(p.target, 'a target', p), p.actionId).damageOnHit
    : previewPower(s.ctx, s.actor.id, need(p.target, 'a target', p), p.actionId).damage,
  /** Healing that lands: previewPower's heal, capped at what the target is missing. An attack heals nothing. */
  heal: (s, p) => {
    if (s.ctx.actions[p.actionId]?.attack) return 0
    const t = target(s, p)
    return Math.min(previewPower(s.ctx, s.actor.id, t.id, p.actionId).heal ?? 0, t.maxHp - t.hp)
  },
  /** Hexes from the plan's destination to the anchor. */
  anchorDistance: (s, p) => s.ctx.geo.distance(destination(p), need(s.anchor, 'an anchor', p)),
  /** Hexes from the plan's destination to the nearest enemy. */
  enemyDistance: (s, p) => nearestEnemyDistance(s, destination(p)),
  /** The movement planner's path cost / length (0 for a step with no path). */
  pathCost: (_s, p) => p.pathCost ?? 0,
  pathLength: (_s, p) => p.pathLength ?? 0,
  /** 1 when no melee enemy could strike the hex next Turn. */
  safe: (s, p) => safe(s, destination(p)),
  /** 1 when an enemy is within weapon reach of the hex. */
  canShoot: (s, p) => canShoot(s, destination(p)),
  /** 1 for hills — only where the hex is safe and has a shot: height is never worth walking into reach. */
  highGround: (s, p) => {
    const hex = destination(p)
    return safe(s, hex) && canShoot(s, hex) && (s.ctx.state.terrain[hex] ?? 0) === TERRAIN.HILLS ? 1 : 0
  },
  /** How close the hex is to the distance the mode holds at (0 is exact; more negative is worse). */
  spacing: (s, p) => { const hex = destination(p); return -Math.abs(nearestEnemyDistance(s, hex) - need(s.holdAt, 'a hold distance', p)(hex)) },
  /**
   * AI-DESIGN §3B #10, side plan: 1 when the plan's target is the side's focus
   * (ai.encounter-rules' side step), else 0 — also 0 when the side has no focus
   * this Phase (none was picked, or it has fallen), so the unit's own tiers decide.
   */
  sidePlan: (s, p) => (s.focus !== undefined && need(p.target, 'a target', p) === s.focus ? 1 : 0),
  /** A burst's net worth — damage dealt to foes and healing to friends, less the reverse — read from previewBurst by the caller. */
  burstValue: (_s, p) => need(p.facts?.['burstValue'], 'a burst forecast', p),
}

export type Ranked = { readonly plan: Plan; readonly score: readonly number[]; readonly terms: Readonly<Record<string, number>> }

/** One plan's score: a number per tier, and every consideration measured. */
export function scorePlan(scene: Scene, plan: Plan, tiers: readonly AiTier[]): Ranked {
  const terms: Record<string, number> = {}
  const score = tiers.map((tier) => {
    let sum = 0
    for (const key of Object.keys(tier).sort()) {
      const c = CONSIDERATIONS[key]
      if (!c) throw new Error(`ai.scorer: unknown consideration '${key}'`)
      const w = tier[key]!
      if (!Number.isSafeInteger(w)) throw new Error(`ai.scorer: weight for '${key}' is not an integer`)
      const v = terms[key] ?? (terms[key] = c(scene, plan))
      sum += w * v
    }
    return sum
  })
  return { plan, score, terms }
}

/** Positive when a outranks b. */
export function compareScores(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0)
  return 0
}

/**
 * Rank plans best first. The sort is stable, so a full tie keeps the order the
 * plans were listed in — every caller lists in an explicit order (Law 6).
 */
export function rank(scene: Scene, plans: readonly Plan[], tiers: readonly AiTier[]): Ranked[] {
  return plans.map((p, i) => ({ r: scorePlan(scene, p, tiers), i }))
    .sort((a, b) => -compareScores(a.r.score, b.r.score) || a.i - b.i)
    .map((x) => x.r)
}

/** A ranked plan as a decision-log line. */
export function lineOf(r: Ranked): AiPlanLine {
  const p = r.plan
  return {
    actionId: p.actionId,
    ...(p.target !== undefined ? { target: p.target } : {}),
    ...(p.destination !== undefined ? { destination: p.destination } : {}),
    ...(p.centre !== undefined ? { centre: p.centre } : {}),
    score: [...r.score], terms: { ...r.terms },
  }
}
