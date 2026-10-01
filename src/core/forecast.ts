// preview.from-planned-hex — PLAYABLE-OPENING-PLAN.md item 3; VFX/UI-BUILD-NOTES-2026-09-02.md
// §5, "preview() must accept a hypothetical position". The ghost (ruled 2026-09-29, DECISIONS.md
// "the playable battle screen": "click a hex for a ghost, click again to confirm") needs every
// number from where the hero WOULD stand; pointing at an enemy "lights up where it can move and
// hit" (DECISIONS.md 2026-09-29, "the playable screen: ... pointing at an enemy").
//
// NOT a second forecast. The planned move is judged by THE legality function (validateAction),
// walked by THE step loop (executeAction → walkSteps) inside an isolated lookahead (forkBattle —
// the one previewPower already uses), and every number after it is preview() / canAttack() /
// legalActions() read on that fork (Laws 1 and 2). The live battle is never touched: no event, no
// state, no draw (Law 4). The one difference from really walking is the attack of opportunity:
// the fork records each provoke with its own preview() and walks on as if it missed, because a
// real swing would roll a named stream and show the player a future roll (SWITCHES.md
// plannedHexProvokes).

import type { HexId } from './hex.js'
import type { ActionSlot, Ctx } from './types.js'
import type { StatMod } from './stats.js'
import { auraMods, terrainMods } from './stats.js'
import { forkBattle } from './fork.js'
import { executeAction, legalActions, validateAction, type ActionRequest } from './commands.js'
import { attackReachesHex, canAttack, preview, reachOf, type AttackPreview } from './pipeline.js'
import { actionReady, attacksOf, isAttack, isCharge, isMove } from './action.js'
import { beginActivation, layerAt } from './mutate.js'
import { layerIdOf, terrainIdOf } from '../content/maps.js'

/** A planned move — the ActionRequest a confirm would send. */
export type PlannedMove = { actor: number; actionId: string; destination: HexId; slot?: ActionSlot }

/** One attack of opportunity the plan would provoke: where, from whom, with what, and its preview. */
export type Provoke = {
  at: HexId
  from: number
  attackId: string | null
  /** Why the holder would not swing (its choice rule found no legal melee attack). */
  skipped?: string
  preview: AttackPreview | null
}

export type Forecast = {
  ok: true
  /**
   * The battle as it would stand after the move — ask preview(), canAttack() and legalActions()
   * of it. An isolated copy: nothing read from it is ever written back.
   */
  ctx: Ctx
  actor: number
  /** Where the walk would end, and whether that is the planned hex (a lava step, a Root, can stop it short). */
  hex: HexId
  arrives: boolean
  /** The provoke points on the path, in walk order. */
  provokes: Provoke[]
  /** Stamina and movement points after the move. */
  stamina: number
  movePointsLeft: number
  /** The ground it would stand in and the modifiers the ground and any aura would lend there. */
  terrain: string
  layer: string
  standingIn: StatMod[]
  /** THE action list from there — every attack, power and further move it could still take. */
  actions: ActionRequest[]
} | { ok: false; reason: string }

/**
 * The forecast from a planned hex. Refused — with validateAction's own reason — when the move is
 * not legal now (an unaffordable plan is refused at planning time, UI-BUILD-NOTES §5).
 */
export function forecastFrom(ctx: Ctx, move: PlannedMove): Forecast {
  const request = { actor: move.actor, actionId: move.actionId, destination: move.destination, ...(move.slot ? { slot: move.slot } : {}) }
  const legal = validateAction(ctx, request)
  if (!legal.ok) return legal
  const fork = forkBattle(ctx)
  const provokes: Provoke[] = []
  fork.dryWalk = { provokes }
  const done = executeAction(fork, request)
  // validateAction said yes on the same state; a refusal here is the engine disagreeing with itself (Law 9)
  if (!done.ok) throw new Error(`forecastFrom: '${move.actionId}' to ${move.destination} validated but the fork refused it (${done.reason})`)
  delete fork.dryWalk
  const u = fork.state.units[move.actor]!
  return {
    ok: true, ctx: fork, actor: move.actor, hex: u.hex, arrives: u.hex === move.destination && u.lifeState === 'standing',
    provokes, stamina: u.stamina, movePointsLeft: u.movePointsLeft,
    terrain: terrainIdOf(fork.state.terrain[u.hex] ?? 0), layer: layerIdOf(layerAt(fork, u.hex)),
    standingIn: [...terrainMods(fork, u), ...auraMods(fork, u)],
    actions: legalActions(fork, move.actor),
  }
}

/**
 * preview() from a planned hex: the attack's legality and every number, as they would be after
 * the move. `null` when the move itself is refused.
 */
export function previewFrom(ctx: Ctx, move: PlannedMove, targetId: number, attackId: string): (AttackPreview & { legal: boolean }) | null {
  const f = forecastFrom(ctx, move)
  if (!f.ok) return null
  return { legal: canAttack(f.ctx, move.actor, targetId, attackId), ...preview(f.ctx, move.actor, targetId, attackId) }
}

/**
 * The enemy reach query — "pointing at an enemy lights up where it can move and hit". `move`:
 * every hex its own next Activation could walk, fly or step to (THE action list, on a fork where
 * that Activation has begun — Movement, Slow and Root read as beginActivation reads them). `hit`:
 * every hex one of its ready attacks reaches from where it stands or from any of those hexes
 * (canAttack's own geometry, attackReachesHex, on the forecast of each move). Its own hex is in
 * neither. Both ascending (Law 6). SWITCHES.md threatQuery.
 */
export function threatOf(ctx: Ctx, unitId: number): { move: HexId[]; hit: HexId[] } {
  const self = ctx.state.units[unitId]
  if (!self) throw new Error(`threatOf: no unit ${unitId}`)
  if (self.lifeState !== 'standing') return { move: [], hit: [] }
  const open = forkBattle(ctx)
  beginActivation(open, unitId, 'engine')
  const moves = legalActions(open, unitId).filter((r): r is ActionRequest & { destination: number } => 'destination' in r)
  const move = new Set<HexId>(), hit = new Set<HexId>()
  const reachFrom = (at: Ctx) => {
    const u = at.state.units[unitId]!
    if (u.lifeState !== 'standing') return
    for (const a of attacksOf(at, u)) {
      if (isCharge(a) || !actionReady(at, u, a)) continue
      const r = reachOf(at, u, a)
      for (let h = 0; h < at.state.terrain.length; h++) {
        if (h !== self.hex && at.geo.distance(u.hex, h) <= r && attackReachesHex(at, u, a, h)) hit.add(h)
      }
    }
  }
  reachFrom(open)
  for (const m of moves) {
    if (m.destination === self.hex) continue
    const f = forecastFrom(open, m)
    if (!f.ok) continue
    if (f.arrives) move.add(f.hex)
    reachFrom(f.ctx)
  }
  const asc = (s: Set<HexId>) => [...s].sort((a, b) => a - b)
  return { move: asc(move), hit: asc(hit) }
}

/**
 * fix.aim-reach (2026-10-01; DECISIONS.md 2026-10-01, Andrew: "the red arrow should only extend as far as whatever its
 * range is"): how far an action reaches for a unit standing on `fromHex` (its own hex when omitted) — an attack's is
 * reachOf() read on a shadow copy at that hex, the way threatOf and the AI read it; any other aimed action its row's
 * range; null for a move (walked, not aimed) or an action with none. Read only: the screen draws an aim arrow no longer than this.
 */
export function actionReach(ctx: Ctx, unitId: number, actionId: string, fromHex?: HexId): number | null {
  const u = ctx.state.units[unitId], a = ctx.actions[actionId]
  if (!u || !a || isMove(a)) return null   // a move is walked, not aimed
  if (isAttack(a)) return reachOf(ctx, fromHex === undefined ? u : { ...u, hex: fromHex }, a)
  const range = (a as { range?: unknown }).range
  return typeof range === 'number' ? range : null
}
