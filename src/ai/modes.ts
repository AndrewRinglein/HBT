// The AI modes' characteristic RULES — the fixed procedures a mode row names.
// ai.scorer (AI-DESIGN.md §3B-D, ruled 2026-09-26): a mode is a DATA row
// (src/content/ai-modes.ts, on ctx.aiModes) — these rules plus its scoring.
// Every choice below — whom to attack, where to stand, which action — is ranked
// by the scorer (scorer.ts) from the row's tiers, and every action taken is
// logged with its top three plans and the numbers behind each (ctx.aiLog).
// Still inspectable by eye: when a battle looks wrong, the log says why.

import type { HexId } from './../core/hex.js'
import { livingEnemies, movementOptions, moveStaminaCost, nearestEnemy, stepRangeOf, usableMoves as readyMoves } from './../core/movement.js'
import { executeAction, legalActions, type ActionRequest } from './../core/commands.js'
import type { ActionDef, AttackDef, MoveDef } from './../core/types.js'
import { actionReady, attackIdsOf, attacksOf, burstsOf, isBurst, isCharge, movesOf, powerIdsOf, powersOf, resolveActionSlot, standsUp } from './../core/action.js'
import { attackDef, attackReachesHex, preview, reachOf } from './../core/pipeline.js'
import { isReady, powerTargetsOf, previewPower } from './../core/ability.js'
import { previewBurst } from './../core/burst.js'
import { hiddenFrom, isBlocked, isConfused, isProne } from './../core/status.js'
import { TERRAIN } from './../core/types.js'
import { changeAiMode, emit, unit } from './../core/mutate.js'
import type { AiModeChange, AiModeRow, AiTier, Ctx, Unit } from './../core/types.js'
import { AI_MODE_ROWS } from './../content/ai-modes.js'
import { compareScores, lineOf, rank, scorePlan, type Plan, type Ranked, type Scene } from './scorer.js'


/** Transient AI deliberation, never stored in battle state. Core legality stays
 * authoritative; this context only limits repeated free choices by the AI. */
type Decision = { ctx: Ctx; row: AiModeRow; freeUsed: Set<string>; actionsTaken: number; limit: number; idled: boolean; list: ReadList | null
  /** ai.encounter-rules: where the unit's encounter anchors it, and the side's focus this Phase. Empty / absent = none. */
  anchors: readonly Anchor[]; focus?: number }
/** ai.encounter-rules: an anchor rule as the AI reads it — the hex, and how far a move may end from it. */
type Anchor = { readonly id: string; readonly hex: HexId; readonly radius: number }

/**
 * ai.action-list (AI-DESIGN.md §3A, 2026-09-26): the modes choose from THE
 * action list — legalActions, the one legality function's enumeration — never
 * from candidates of their own. The list read is held for the state it was
 * read on and no longer: every state change emits an event (Law 3), every
 * event advances state.seq, so a read is reused only while seq is unchanged
 * (Law 8; test/ai-action-list.test.ts proves the AI acts on a list read at
 * the very seq it acts in).
 */
type ReadList = { actor: number; seq: number; entries: ActionRequest[]; keys: Set<string> }
function requestKey(r: ActionRequest): string {
  const aim = 'target' in r ? `t${r.target}` : 'destination' in r ? `d${r.destination}` : 'centre' in r ? `c${r.centre}` : `h${r.hex}`
  return `${r.actionId}|${aim}|${r.slot ?? ''}`
}
function options(decision: Decision, actor: number): ReadList {
  const ctx = decision.ctx
  const held = decision.list
  if (held && held.actor === actor && held.seq === ctx.state.seq) return held
  // ai.encounter-rules: an anchored unit's list holds only the moves its anchors
  // allow — every procedure chooses from this list, so no mode can walk off
  // ai.sight (2026-09-27): nor any action aimed at a unit hidden from it — the
  // AI chooses from what it can see, so a hidden foe is never a plan
  const self = unit(ctx, actor)
  const entries = legalActions(ctx, actor).filter((r) =>
    (!('target' in r) || !hiddenFrom(ctx, self, unit(ctx, r.target)))
    && (!decision.anchors.length || !('destination' in r) || anchorsAllow(decision, self, r.destination)))
  const list = { actor, seq: ctx.state.seq, entries, keys: new Set(entries.map(requestKey)) }
  decision.list = list
  return list
}
/**
 * ai.encounter-rules, the anchor (SWITCHES.md encounterAnchorReach): a move may
 * end within `radius` of every anchor — or, for a unit already outside one (it
 * arrived there, or was knocked out), no farther from it than it stands now.
 */
function anchorsAllow(decision: Decision, u: Unit, hex: HexId): boolean {
  const geo = decision.ctx.geo
  return decision.anchors.every((a) => { const d = geo.distance(hex, a.hex); return d <= a.radius || d <= geo.distance(u.hex, a.hex) })
}
const onList = (decision: Decision, request: ActionRequest): boolean => options(decision, request.actor).keys.has(requestKey(request))
function usableMoves(decision: Decision, u: Unit): MoveDef[] {
  return readyMoves(decision.ctx, u).filter(a => !decision.freeUsed.has(a.id) && resolveActionSlot(decision.ctx, u, a) !== null)
}
function movePowerOf(decision: Decision, u: Unit, shape: MoveDef['move']['shape']): MoveDef | null {
  return usableMoves(decision, u).find(a => a.move.shape === shape) ?? null
}
/**
 * The unit's ordinary movement — its walk; for a unit granted NO walk, its
 * flight. pack.enemy-actions (2026-09-26): "The two common movement types are
 * flight and walking" (DECISIONS.md 2026-09-04) and an enemy row carries ONE
 * movement power (2026-08-21), so a flier has no walk, and a mode that closed
 * only by walking left it standing on its deploy hex. A unit granted any walk
 * is untouched — the walk, or the same fallbacks as before when it cannot pay.
 */
function ordinaryMove(decision: Decision, u: Unit): MoveDef | null {
  const walk = movePowerOf(decision, u, 'path')
  if (walk || movesOf(decision.ctx, u).some(a => a.move.shape === 'path')) return walk
  return movePowerOf(decision, u, 'flight')
}

/**
 * The action row's AI hint (AI-DESIGN.md §3D; SWITCHES.md aiHintShape): a hint
 * NARROWS when an action may be chosen. Absent = no narrowing — every row today.
 */
function hintAllows(decision: Decision, actor: number, actionId: string, aim: { target?: number; centre?: number }): boolean {
  const ctx = decision.ctx
  const a = ctx.actions[actionId]
  const hint = a?.aiHint
  if (!hint) return true
  const u = unit(ctx, actor)
  if (hint.belowHalfHp && !(u.hp * 2 < u.maxHp)) return false
  if (hint.minEnemiesStruck !== undefined) {
    const struck = aim.centre !== undefined ? previewBurst(ctx, actor, aim.centre, actionId).targets.map((t) => t.id)
      : aim.target === undefined ? []
      : a!.effects && a!.target?.select === 'area' ? powerTargetsOf(ctx, actor, aim.target, a!) : [aim.target]
    if (struck.filter((id) => unit(ctx, id).side !== u.side && !hiddenFrom(ctx, u, unit(ctx, id))).length < hint.minEnemiesStruck) return false
  }
  return true
}
/** Candidate legality and actual resolution share the public command mechanism. */
function legalTarget(decision: Decision, actor: number, target: number, actionId: string): boolean {
  return !decision.freeUsed.has(actionId) && onList(decision, { actor, target, actionId }) && hintAllows(decision, actor, actionId, { target })
}
/** Why an action was taken: the choice that made it, and its ranking when it was scored. */
type Why = { choice: string; ranked?: readonly Ranked[] }
const planOf = (r: ActionRequest): Plan => ({ actionId: r.actionId,
  ...('target' in r ? { target: r.target } : 'destination' in r ? { destination: r.destination } : 'centre' in r ? { centre: r.centre } : {}) })
const planKey = (p: Plan) => `${p.actionId}|${p.target ?? ''}|${p.destination ?? ''}|${p.centre ?? ''}`
/**
 * THE DECISION LOG (ai.scorer; Law 12): every action the AI takes, with the top
 * three plans of the choice that made it — the taken one first — and the
 * numbers behind each. ctx.aiLog, not ctx.events (SWITCHES.md aiDecisionLogHome).
 */
function logDecision(decision: Decision, request: ActionRequest, why: Why): void {
  const ctx = decision.ctx
  const ranked = why.ranked?.length ? why.ranked : [{ plan: planOf(request), score: [], terms: {} }]
  if (planKey(ranked[0]!.plan) !== planKey(planOf(request))) throw new Error(`AI decision log: '${why.choice}' took ${planKey(planOf(request))} but ranked ${planKey(ranked[0]!.plan)} first`)
  ctx.aiLog.push({ at: ctx.events.length, turn: ctx.state.turn, actor: request.actor, mode: decision.row.id, choice: why.choice, plans: ranked.slice(0, 3).map(lineOf) })
}
function act(decision: Decision, request: ActionRequest, why: Why): true {
  const ctx = decision.ctx
  if (decision.freeUsed.has(request.actionId)) throw new Error('AI repeated a free action in one cycle')
  if (decision.actionsTaken >= decision.limit) throw new Error('AI action cycle exceeded its finite choice budget')
  const free = ctx.actions[request.actionId]!.free
  if (!onList(decision, request)) throw new Error(`AI chose an action not on the action list: ${request.actionId}`)
  logDecision(decision, request, why)
  const result = executeAction(ctx, request)
  if (!result.ok) throw new Error(`AI selected an illegal action: ${request.actionId}: ${result.reason}`)
  decision.actionsTaken++
  if (free) decision.freeUsed.add(request.actionId)
  return true
}
function moveTargets(decision: Decision, u: Unit, power: MoveDef): HexId[] {
  if (decision.freeUsed.has(power.id)) return []
  return options(decision, u.id).entries.flatMap(r => r.actionId === power.id && 'destination' in r ? [r.destination] : [])
}

/** Lowest current health, ties on lower unit id (Law 6). The ally rule of the status powers. */
function lowestHealth(us: Unit[]): Unit | null {
  let best: Unit | null = null
  for (const u of us) {
    if (!best || u.hp < best.hp || (u.hp === best.hp && u.id < best.id)) best = u
  }
  return best
}

/** The row's tiers for a choice. A procedure asking for a choice its row does not carry is a broken row (Law 9). */
function tiersOf(decision: Decision, choice: string): readonly AiTier[] {
  const t = decision.row.weights[choice]
  if (!t) throw new Error(`AI mode '${decision.row.id}' carries no weights for '${choice}'`)
  return t
}
const sceneOf = (decision: Decision, u: Unit, extra: Omit<Scene, 'ctx' | 'actor'> = {}): Scene =>
  ({ ctx: decision.ctx, actor: u, ...(decision.focus !== undefined ? { focus: decision.focus } : {}), ...extra })
/**
 * WHOM TO ATTACK — the row's target preference, ranked by the scorer. Listed by
 * id first, so a full tie goes to the lower id (Law 6). Each plan carries the
 * action `actionOf` names for it (the attack the unit would swing).
 */
function rankTargets(decision: Decision, u: Unit, candidates: readonly Unit[], actionOf: (t: Unit) => string = () => 'target'): Ranked[] {
  const plans = [...candidates].sort((a, b) => a.id - b.id).map((t) => ({ actionId: actionOf(t), target: t.id }))
  return rank(sceneOf(decision, u), plans, decision.row.target)
}
const ranked = (decision: Decision, rs: readonly Ranked[], i: number): Unit => unit(decision.ctx, rs[i]!.plan.target!)
/** Destinations as plans, in the order listed. */
const destinationPlans = (actionId: string, hexes: readonly HexId[]): Plan[] => hexes.map((h) => ({ actionId, destination: h }))
/**
 * The unit a mode's movement closes on — the row's `anchor` (AI-DESIGN §3B #8).
 * 'away' and 'range-band' anchor to no unit: their procedures measure the
 * enemies themselves.
 */
function anchorUnit(decision: Decision, u: Unit): Unit | null {
  const ctx = decision.ctx
  // ai.encounter-rules (SWITCHES.md encounterFocusSteers): a coordinated unit
  // whose mode closes on an enemy closes on the side's focus while it stands
  if (decision.focus !== undefined && ['nearest-enemy', 'target', 'quarry'].includes(decision.row.anchor)) return unit(ctx, decision.focus)
  switch (decision.row.anchor) {
    case 'nearest-enemy': return nearestEnemy(ctx, u) ?? null
    case 'target': { const r = rankTargets(decision, u, livingEnemies(ctx, u)); return r.length ? ranked(decision, r, 0) : null }
    case 'quarry': {
      const held = u.huntTarget !== undefined ? ctx.state.units[u.huntTarget] : undefined
      if (held && livingEnemies(ctx, u).some(e => e.id === held.id)) return held
      const r = rankTargets(decision, u, livingEnemies(ctx, u))
      if (!r.length) return null
      const pick = ranked(decision, r, 0)
      u.huntTarget = pick.id
      emit(ctx, 'ai.hunts', `ai.${u.ai}`, { actor: u.id, target: pick.id })
      return pick
    }
    case 'ward': {
      const hurt = allies(ctx, u).filter((o) => o.hp * 2 < o.maxHp)
      return (hurt.length ? hurt : allies(ctx, u)).sort((a, b) => ctx.geo.distance(u.hex, a.hex) - ctx.geo.distance(u.hex, b.hex) || a.id - b.id)[0] ?? null
    }
    case 'lead':
      return allies(ctx, u).filter((o) => ctx.aiModes[o.ai]?.rules !== 'follow').sort((a, b) => ctx.geo.distance(u.hex, a.hex) - ctx.geo.distance(u.hex, b.hex) || a.id - b.id)[0]
        ?? allies(ctx, u).sort((a, b) => a.id - b.id)[0] ?? null
    case 'away': case 'range-band': return null
  }
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
  return withDowned(decision, u, livingEnemies(ctx, u).filter((e) => strikeIdsOf(ctx, u).some((id) => legalTarget(decision, u.id, e.id, id))))
}

/**
 * capability.charge (2026-09-27): the attacks a unit swings where it stands —
 * every attack but a charge. A charge walks first and is chosen by its own
 * rule (chargeIfPossible), never as "whatever is in reach" (SWITCHES.md
 * aiChargeRule). For a unit with no charge this is attackIdsOf exactly.
 */
function strikeIdsOf(ctx: Ctx, u: Unit): string[] {
  return attackIdsOf(ctx, u).filter((id) => !isCharge(ctx.actions[id]!))
}

/**
 * capability.charge — the dumb-melee rule (SWITCHES.md aiChargeRule): when the
 * unit's target is out of reach and a charge at it is on the action list, it
 * charges instead of walking — the first such charge in the unit's declared
 * order. The walk and the blow are one action; its primary is still its own.
 */
function chargeIfPossible(decision: Decision, u: Unit, target: Unit): boolean {
  const ctx = decision.ctx
  const plans = options(decision, u.id).entries
    .filter((r) => 'target' in r && r.target === target.id && isCharge(ctx.actions[r.actionId]!) && !decision.freeUsed.has(r.actionId)
      && hintAllows(decision, u.id, r.actionId, { target: target.id }))
    .map((r) => ({ actionId: r.actionId, target: target.id }))
  if (!plans.length) return false
  const r = rank(sceneOf(decision, u), plans, [])
  return act(decision, { actor: u.id, target: target.id, actionId: r[0]!.plan.actionId }, { choice: 'charge', ranked: r })
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
  const downed = ctx.state.units.filter((o) => o.side !== u.side && o.lifeState === 'downed' && !hiddenFrom(ctx, u, o)
    && strikeIdsOf(ctx, u).some((id) => legalTarget(decision, u.id, o.id, id)))
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
  // ai.scorer: the switch picks the tiers — bestDamage weighs the preview's
  // damage on a hit; declared weighs nothing, so the declared order decides.
  const tiers: readonly AiTier[] = ctx.cfg.switches.aiAttackChoice === 'bestDamage' ? [{ damage: 1 }] : []
  const plans = strikeIdsOf(ctx, u).filter((id) => legalTarget(decision, attackerId, targetId, id)).map((id) => ({ actionId: id, target: targetId }))
  return rank(sceneOf(decision, u), plans, tiers)[0]?.plan.actionId ?? null
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
  if (range === 0) return destinations.includes(u.hex) && act(decision, { actor: u.id, destination: u.hex, actionId: power.id }, { choice: 'rule.starved-refill' })
  const d0 = ctx.geo.distance(u.hex, dest)
  const closer = destinationPlans(power.id, destinations.filter((n) => ctx.geo.distance(n, dest) < d0))
  const r = rank(sceneOf(decision, u, { anchor: dest }), closer, tiersOf(decision, 'move'))
  if (!r.length) return false
  return act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: power.id }, { choice: 'move.sidestep', ranked: r })
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
  const plans: Plan[] = []
  let ordinary = 0
  for (const attack of attacksOf(ctx, u)) for (const enemy of livingEnemies(ctx, u)) {
    if (!isCharge(attack) && legalTarget(decision, u.id, enemy.id, attack.id)) ordinary = Math.max(ordinary, preview(ctx, u.id, enemy.id, attack.id).damageOnHit)
  }
  for (const id of bursts) {
    for (const centre of options(decision, u.id).entries.flatMap(r => r.actionId === id && 'centre' in r ? [r.centre] : [])) {
      const p = previewBurst(ctx, u.id, centre, id)
      const harm = p.targets.filter(t => unit(ctx, t.id).side === u.side).reduce((n, t) => n + t.applied, 0)
      if (harm && !ctx.cfg.switches.aiBurstThroughAllies) continue
      // ai.sight: a burst still strikes a hidden foe; the AI does not count it (SWITCHES.md aiSightScoring)
      const value = p.targets.filter(t => !hiddenFrom(ctx, u, unit(ctx, t.id)))
        .reduce((n, t) => n + (unit(ctx, t.id).side === u.side ? t.heal - t.applied : t.applied - t.heal), 0)
      if (value > 0 && value >= ordinary && hintAllows(decision, u.id, id, { centre })) plans.push({ actionId: id, centre, facts: { burstValue: value } })
    }
  }
  const r = rank(sceneOf(decision, u), plans, tiersOf(decision, 'burst'))
  return r.length ? act(decision, { actor: u.id, actionId: r[0]!.plan.actionId, centre: r[0]!.plan.centre! }, { choice: 'burst', ranked: r }) : false
}

/**
 * "Use whenever available" (AI-DESIGN §3D): an action whose row hints `use:
 * 'whenever'` is taken at the first choice it can be — a movement-slot action
 * when the Activation opens, before any walk; every other at the primary,
 * before the swing (SWITCHES.md aiHintWhenever). The first such action in the
 * unit's declared order; aimed at itself when it may be, else at the row's
 * preferred target.
 */
function hintedAction(decision: Decision, u: Unit, at: 'opening' | 'primary'): boolean {
  const ctx = decision.ctx
  for (const id of u.actions) {
    const a = ctx.actions[id]
    if (a?.aiHint?.use !== 'whenever' || decision.freeUsed.has(id)) continue
    if ((a.slot === 'movement') !== (at === 'opening')) continue
    const aims = options(decision, u.id).entries.filter((r) => r.actionId === id && 'target' in r && hintAllows(decision, u.id, id, { target: r.target }))
      .map((r) => unit(ctx, (r as { target: number }).target))
    const self = aims.find((t) => t.id === u.id)
    const r = self ? [{ plan: { actionId: id, target: u.id }, score: [], terms: {} }]
      : rankTargets(decision, u, aims.filter((t) => t.side !== u.side), () => id)
    if (!r.length) continue
    return act(decision, { actor: u.id, target: r[0]!.plan.target!, actionId: id }, { choice: 'hint.whenever', ranked: r })
  }
  return false
}

function attackIfPossible(decision: Decision, u: Unit, candidates: Unit[]): boolean {
  if (hintedAction(decision, u, 'primary')) return true
  if (burstIfUseful(decision, u)) return true
  const ctx = decision.ctx
  // WHOM TO ATTACK: the row's target preference over every candidate the unit
  // can legally strike, each with the attack it would swing (bestAttack).
  const r = rankTargets(decision, u, candidates.filter(t => strikeIdsOf(ctx, u).some(id => legalTarget(decision, u.id, t.id, id))),
    (t) => bestAttack(decision, u.id, t.id)!)
  if (!r.length) return false
  const target = ranked(decision, r, 0)
  const attackId = r[0]!.plan.actionId
  // Did stamina force a worse attack than the unit would have preferred?
  const want = attacksOf(ctx, u).find((a) => !isCharge(a))   // capability.charge: a charge is never the swing it wanted
  const preferred = want?.id
  if (want && preferred !== attackId) {
    if (u.stamina < want.staminaCost) {
      emit(ctx, 'ai.denied', `ai.${u.ai}`, {
        actor: u.id, wanted: preferred, took: attackId, reason: 'stamina', stamina: u.stamina,
      })
    }
  }
  act(decision, { actor: u.id, target: target.id, actionId: attackId }, { choice: 'attack', ranked: r })
  return true
}

// ── dumb-melee ───────────────────────────────────────────────────────────────
// Steps toward the nearest hero with no regard for anything, then hits whatever
// is adjacent. No self-preservation, no target switching.
function dumbMelee(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const target = anchorUnit(decision, u)
  if (!target) return

  // capability.charge: out of reach with a charge on the list, the unit charges instead of walking
  if (ctx.geo.distance(u.hex, target.hex) > 1 && !chargeIfPossible(decision, u, target)) {
    // The movement CHOICE (2026-08-21): first affordable path-shaped power in
    // the unit's declared order; a stamina-starved unit falls back to its free
    // sidestep rather than standing refused.
    const walk = ordinaryMove(decision, u)
    if (walk) {
      // Equal closeness does not justify walking farther around the target.
      // Cost comes from the authoritative movement planner, including low edges;
      // no opportunity-risk scoring is introduced here.
      // ai.scorer: the row's move tiers rank them (listed by hex, Law 6).
      const distance = ctx.geo.distance(u.hex, target.hex)
      const plans = movementOptions(ctx, u.id, walk.id)
        .filter(plan => onList(decision, { actor: u.id, destination: plan.destination, actionId: walk.id }))
        .filter(plan => ctx.geo.distance(plan.destination, target.hex) < distance)
        .sort((a, b) => a.destination - b.destination)
        .map(plan => ({ actionId: walk.id, destination: plan.destination, pathCost: plan.pathCost, pathLength: plan.path.length }))
      const r = rank(sceneOf(decision, u, { anchor: target.hex }), plans, tiersOf(decision, 'move'))
      if (r.length) act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: walk.id }, { choice: 'move', ranked: r })
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
/**
 * fix.one-effect-vocabulary (2026-10-01): the heal this procedure plays, read off the effects list now that
 * the legacy 'heal' shape is retired — a power that spends the primary, is aimed at one ally and only
 * heals (the Holy Symbol's Heal). effectsPower leaves exactly these to it (SWITCHES.md aiSupportHealShape).
 */
export const isSupportHeal = (a: ActionDef): boolean => !a.free && a.target?.select === 'unit' && a.target.side === 'ally'
  && !!a.effects?.length && a.effects.every((e) => e.kind === 'heal')
function supportPower(decision: Decision, u: Unit): boolean {
  const ctx = decision.ctx
  for (const a of powersOf(ctx, u)) {
    const id = a.id
    if (isSupportHeal(a)) {
      // ai.scorer: the row's heal tiers rank the wounded (listed by id, Law 6)
      const wounded = ctx.state.units.filter((o) => o.side === u.side && o.lifeState === 'standing'
        && legalTarget(decision, u.id, o.id, id) && o.maxHp - o.hp > 0).sort((a, b) => a.id - b.id)
      const r = rank(sceneOf(decision, u), wounded.map((o) => ({ actionId: id, target: o.id })), tiersOf(decision, 'heal'))
      if (r.length) {
        const best = ranked(decision, r, 0)
        const amount = previewPower(ctx, u.id, best.id, id).heal ?? 0
        if (amount > 0 && (best.maxHp - best.hp) * 2 >= amount) {
          act(decision, { actor: u.id, target: best.id, actionId: id }, { choice: 'heal', ranked: r })
          return true
        }
      }
    }
    // was: if (a.effect === 'selfGuard' && ...) — rule.self-guard: no row has carried the selfGuard shape since
    // the Knight Shield retired (2026-09-23), and Block now compiles to an effects list, played by
    // effectsPower like every other self power (fix.one-effect-vocabulary, 2026-10-01).
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
  // fix.computer-reaches-class-power-past-shield-power (2026-10-05; SWITCHES.md aiPowerLongestCooldownFirst): the powers are
  // tried longest cooldown first - one it can use only now and then is worth more than one it can use every Activation - the
  // unit's own order breaking ties (a stable sort, Law 6). It took the first its kit listed, so a shield's power, which has no
  // cooldown and is listed before the class's, was raised every Activation and the class's never came up.
  const byCooldown = powersOf(ctx, u).map((a, i) => ({ a, i })).sort((x, y) => (y.a.cooldown ?? 0) - (x.a.cooldown ?? 0) || x.i - y.i).map((x) => x.a)
  for (const a of byCooldown) {
    const id = a.id
    if (!a.effects || a.effects.length === 0 || isSupportHeal(a)) continue
    if (when === 'feast') {
      // capability.corpses (2026-09-03): a body in reach is eaten BEFORE the
      // swing — the Ghoul economy runs on it (SWITCHES.md aiEatsBeforeBiting).
      if (!ctx.cfg.switches.aiEatsBeforeBiting || !a.effects.some((e) => e.kind === 'corpse.eat')) continue
      if (!legalTarget(decision, u.id, u.id, id)) continue
      act(decision, { actor: u.id, target: u.id, actionId: id }, { choice: 'rule.feast' }); return true
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
    // what the power costs its caster in HP — a flat damage said on the caster (fix.one-effect-vocabulary: was 'selfDamage')
    const selfDamage = a.effects.reduce((n, e) => n + (e.kind === 'damage' && e.who === 'self' && typeof e.amount === 'number' ? e.amount : 0), 0)
    if (selfDamage > 0 && u.hp <= selfDamage * 2) continue
    if (kinds.has('statDamage') && t.side === 'enemy') continue   // the damage block's job
    if (kinds.has('statDamage') && t.select === 'area' && (t.origin ?? 'self') === 'target') continue
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
      act(decision, { actor: u.id, target: u.id, actionId: id }, { choice: `rule.effects-${when}` }); return true
    }
    if (t.select === 'unit' && t.side === 'ally') {
      const allies = ctx.state.units.filter((o) => o.side === u.side && o.lifeState === 'standing' && legal(o))
      if (!allies.length) continue
      if (kinds.has('heal')) {
        const best = allies.filter((o) => o.maxHp - o.hp > 0).sort((x, y) => (y.maxHp - y.hp) - (x.maxHp - x.hp) || x.id - y.id)[0]
        if (!best) continue
        const amount = previewPower(ctx, u.id, best.id, id).heal ?? 0
        if (!(amount > 0 && (best.maxHp - best.hp) * 2 >= amount)) continue
        act(decision, { actor: u.id, target: best.id, actionId: id }, { choice: `rule.effects-${when}` }); return true
      }
      const best = lowestHealth(allies)!
      act(decision, { actor: u.id, target: best.id, actionId: id }, { choice: `rule.effects-${when}` }); return true
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
        const targets = rankTargets(decision, u, enemies)
        for (const r of targets) {
          const t = unit(ctx, r.plan.target!)
          const hex = moveTargets(decision, u, step).find((h) => ctx.geo.distance(h, t.hex) === 1)
          if (hex !== undefined) {
            act(decision, { actor: u.id, destination: hex, actionId: step.id }, { choice: 'rule.leap' })
            if (u.lifeState !== 'standing') return
            if (!attackIfPossible(decision, u, adjacentEnemies(decision, u))) idle(decision, u, 'leapt but could not strike')
            return
          }
        }
      }
    }
  }

  if (adjacentEnemies(decision, u).length === 0) {
    const walk = ordinaryMove(decision, u)
    if (!walk) {
      // No affordable walk — the free sidestep (if granted) closes one hex.
      const nearest = nearestEnemy(ctx, u)
      if (nearest) sidestepToward(decision, u, nearest.hex)
      if (u.lifeState !== 'standing') return
      if (!attackIfPossible(decision, u, adjacentEnemies(decision, u))) idle(decision, u, 'could not reach an enemy')
      return
    }
    const hexes = moveTargets(decision, u, walk)

    // Prefer ending adjacent to the row's preferred enemy among those we can
    // actually reach — the first hex beside it, in the order listed.
    const reachableTargets = rankTargets(decision, u, enemies.filter((e) => hexes.some((h) => ctx.geo.distance(h, e.hex) === 1)))

    if (reachableTargets[0]) {
      const t = ranked(decision, reachableTargets, 0)
      const beside = destinationPlans(walk.id, hexes.filter((h) => ctx.geo.distance(h, t.hex) === 1))
      const r = rank(sceneOf(decision, u, { anchor: t.hex }), beside, [])
      act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: walk.id }, { choice: 'move.beside-target', ranked: r })
    } else {
      const nearest = nearestEnemy(ctx, u)!
      const d0 = ctx.geo.distance(u.hex, nearest.hex)
      const closer = destinationPlans(walk.id, hexes.filter((h) => ctx.geo.distance(h, nearest.hex) < d0))
      const r = rank(sceneOf(decision, u, { anchor: nearest.hex }), closer, tiersOf(decision, 'move'))
      if (r.length) act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: walk.id }, { choice: 'move', ranked: r })
    }
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
    const walk = ordinaryMove(decision, u)
    if (walk) {
      // the unarmed floor is a RULE, not the row's: farther from the nearest enemy is better
      const r = fartherFromEnemies(decision, u, walk.id, moveTargets(decision, u, walk), enemies, [{ enemyDistance: 1 }])
      if (r.length) act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: walk.id }, { choice: 'rule.unarmed-retreat', ranked: r })
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
        (a.burst ? a.burst.side !== 'ally' && a.burst.packets.length > 0 : a.target?.side !== 'ally' && a.target?.select !== 'self')
        && actionReady(ctx, u, a) && u.stamina >= a.staminaCost)
      .reduce((m, a) => Math.min(m, a.range), Infinity)
    : Infinity
  // The SHOT is always the weapon's reach; only the ideal SPACING moves in to
  // the power's range — a kiter that refused to shoot at 6 while walking to 4
  // idled through the whole standard battle (found landing this).
  const reachAt = weaponReachAt
  const holdAt = (hex: HexId) => Math.min(weaponReachAt(hex), powerRange)

  // What a hex is worth: the row's position tiers (ai.scorer). The ten rows
  // carry the kite's own ladder — safety first, then a shot, then height,
  // then ideal spacing (src/content/ai-modes.ts POSITION).
  // encounter.opening.bridge-ai (2026-09-30; SWITCHES.md aiKiteAlone): the ladder holds its distance
  // only while a melee ally of its side stands to hold the line — with none, the row's
  // `positionAlone` ladder puts the shot ahead of safety, and reads the shot by canAttack's geometry
  // (shotFrom), so a warband of kiters facing walkers it can never safely shoot still fights.
  const shotFrom = (hex: HexId, e: Unit) => attackReachesHex(ctx, { ...u, hex }, bow, e.hex)
  const scene = sceneOf(decision, u, { enemies, reachAt, shotFrom, holdAt, threatened: (hex: HexId) => meleeThreatens(decision, u, hex) })
  const screened = ctx.state.units.some((o) => o.side === u.side && o.id !== u.id && o.lifeState === 'standing' && o.role === 'melee')
  const position = tiersOf(decision, screened ? 'position' : 'positionAlone')
  const scoreOf = (hex: HexId): readonly number[] => scorePlan(scene, { actionId: 'here', destination: hex }, position).score
  const better = (a: readonly number[], b: readonly number[]) => compareScores(a, b) > 0

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
    // every mover's every destination, movers in declared order (Law 6);
    // the best is taken only when it strictly beats standing still
    const r = rank(scene, movers.flatMap((m) => destinationPlans(m.id, moveTargets(decision, u, m))), position)
    if (r.length && better(r[0]!.score, here)) {
      const hex = r[0]!.plan.destination!
      const terr = ctx.state.terrain[hex] ?? 0
      if (terr === TERRAIN.HILLS) emit(ctx, 'ai.tookHighGround', `ai.${u.ai}`, { actor: u.id, hex })
      act(decision, { actor: u.id, destination: hex, actionId: r[0]!.plan.actionId }, { choice: 'position', ranked: r })
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
      if (bestHex !== null) stepped = act(decision, { actor: u.id, destination: bestHex, actionId: power.id }, { choice: 'rule.kite-step' })
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
      ? rankTargets(decision, u, targets).map((r) => unit(ctx, r.plan.target!)).find((e) => {
          const struck = blastOf(e)
          const foes = struck.filter((s) => unit(ctx, s).side !== u.side && !hiddenFrom(ctx, u, unit(ctx, s))).length
          const allies = struck.filter((s) => unit(ctx, s).side === u.side).length
          return foes >= 2 && (allies === 0 || ctx.cfg.switches.aiBurstThroughAllies)
        })
      : undefined
    const t = areaPick ?? (targets.length ? ranked(decision, rankTargets(decision, u, targets), 0) : null)
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
            .filter((s) => unit(ctx, s).side !== u.side && !hiddenFrom(ctx, u, unit(ctx, s)))
            .reduce((sum, s) => sum + previewPower(ctx, u.id, s, power).damage, 0)
        : previewPower(ctx, u.id, t.id, power).damage
      if (powerDmg >= staffDmg) {
        act(decision, { actor: u.id, target: t.id, actionId: power }, { choice: 'rule.kite-power' })
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

/** Walk toward `dest` with the first affordable path power, stopping as close as reach allows — the row's move tiers rank the hexes. */
function closeOn(decision: Decision, u: Unit, dest: HexId, stopAt = 1): void {
  const ctx = decision.ctx
  if (ctx.geo.distance(u.hex, dest) <= stopAt) return
  const walk = ordinaryMove(decision, u)
  if (!walk) { sidestepToward(decision, u, dest); return }
  const d0 = ctx.geo.distance(u.hex, dest)
  const closer = destinationPlans(walk.id, moveTargets(decision, u, walk).filter((hex) => { const d = ctx.geo.distance(hex, dest); return d < d0 && d >= stopAt }))
  const r = rank(sceneOf(decision, u, { anchor: dest }), closer, tiersOf(decision, 'move'))
  if (r.length) act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: walk.id }, { choice: 'move', ranked: r })
}
/** Hexes that end strictly farther from the nearest enemy than standing still, ranked by `tiers`. */
function fartherFromEnemies(decision: Decision, u: Unit, actionId: string, hexes: readonly HexId[], enemies: readonly Unit[], tiers: readonly AiTier[]): Ranked[] {
  const ctx = decision.ctx
  const nearestFrom = (hex: HexId) => Math.min(...enemies.map((e) => ctx.geo.distance(hex, e.hex)))
  const d0 = nearestFrom(u.hex)
  return rank(sceneOf(decision, u, { enemies }), destinationPlans(actionId, hexes.filter((h) => nearestFrom(h) > d0)), tiers)
}
const allies = (ctx: Ctx, u: Unit) => ctx.state.units.filter((o) => o.side === u.side && o.id !== u.id && o.lifeState === 'standing')

/** defender — stays within 2 of the nearest ally under half health (else the nearest ally), attacks anything in reach, never advances alone. */
function defender(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const ward = anchorUnit(decision, u)
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
  const target = anchorUnit(decision, u)
  if (!target) return
  closeOn(decision, u, target.hex, 1)
  if (u.lifeState !== 'standing') return
  const id = bestAttack(decision, u.id, target.id)
  if (id) { act(decision, { actor: u.id, target: target.id, actionId: id }, { choice: 'rule.focus' }); return }
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, 'the focus is out of reach')
}

/** value hunter — damage or healing, whichever is worth more this activation. */
function valueHunter(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  effectsPower(decision, u, 'free')
  // ai.scorer: every heal (each power on each legal ally, listed by target id)
  // and every swing (each enemy with the attack it would take, by id), ranked
  // by the row's value tiers — for the ten rows ONE tier, heal + damage summed,
  // so whichever is worth more wins and a tie goes to the heal (listed first).
  // Worth nothing is no plan.
  const heals: Plan[] = []
  for (const a of powersOf(ctx, u)) {
    if (!a.effects?.some((e) => e.kind === 'heal')) continue
    for (const o of allies(ctx, u).concat([u])) if (legalTarget(decision, u.id, o.id, a.id)) heals.push({ actionId: a.id, target: o.id })
  }
  heals.sort((x, y) => x.target! - y.target!)
  const swings: Plan[] = [...livingEnemies(ctx, u)].sort((x, y) => x.id - y.id)
    .flatMap((e) => { const id = bestAttack(decision, u.id, e.id); return id ? [{ actionId: id, target: e.id }] : [] })
  const r = rank(sceneOf(decision, u), [...heals, ...swings], tiersOf(decision, 'value')).filter((x) => (x.score[0] ?? 0) > 0)
  if (r.length) { act(decision, { actor: u.id, target: r[0]!.plan.target!, actionId: r[0]!.plan.actionId }, { choice: 'value', ranked: r }); return }
  // nothing worth doing from here: close on the anchor, then try again
  const near = anchorUnit(decision, u)
  if (near) closeOn(decision, u, near.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, 'nothing worth doing')
}

/** follow — stays adjacent to the nearest ally that is not itself a follower, and attacks what it can from there. */
function follow(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const lead = anchorUnit(decision, u)
  if (lead && ctx.geo.distance(u.hex, lead.hex) > 1) closeOn(decision, u, lead.hex, 1)
  if (u.lifeState !== 'standing') return
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, lead ? 'following ' + lead.name : 'nobody to follow')
}

/** hunter — has a target and goes for it: the weakest enemy when it first acts, pursued until it falls. */
function hunter(decision: Decision, u: Unit): void {
  const t = anchorUnit(decision, u)
  if (!t) return
  closeOn(decision, u, t.hex, 1)
  if (u.lifeState !== 'standing') return
  const id = bestAttack(decision, u.id, t.id)
  if (id) { act(decision, { actor: u.id, target: t.id, actionId: id }, { choice: 'rule.quarry' }); return }
  if (!attackIfPossible(decision, u, enemiesInAttackReach(decision, u))) idle(decision, u, 'the quarry is out of reach')
}

/** flee — the reachable hex farthest from the nearest enemy; never attacks. The civilians' flight (ruled 2026-09-03). */
function flee(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const enemies = livingEnemies(ctx, u)
  if (!enemies.length) { idle(decision, u, 'nothing to flee'); return }
  const walk = ordinaryMove(decision, u)
  if (walk) {
    const r = fartherFromEnemies(decision, u, walk.id, moveTargets(decision, u, walk), enemies, tiersOf(decision, 'move'))
    if (r.length) act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: walk.id }, { choice: 'move', ranked: r })
  } else {
    const near = nearestEnemy(ctx, u)
    const step = movePowerOf(decision, u, 'sidestep')
    if (near && step) {
      const away = moveTargets(decision, u, step).sort((a, b) => ctx.geo.distance(b, near.hex) - ctx.geo.distance(a, near.hex) || a - b)[0]
      if (away !== undefined && ctx.geo.distance(away, near.hex) > ctx.geo.distance(u.hex, near.hex)) act(decision, { actor: u.id, destination: away, actionId: step.id }, { choice: 'rule.flee-step' })
    }
  }
  if (u.lifeState === 'standing') idle(decision, u, 'fleeing')
}

/** The characteristic rules — the procedures a mode row's `rules` names. */
const RULES: Record<AiModeRow['rules'], (decision: Decision, u: Unit) => void> = {
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

/**
 * ai.encounter-rules (AI-DESIGN.md §4): what the unit's bound encounter rules lay
 * on this Activation — every anchor, and the focus of its first coordinate rule
 * while that focus is a standing enemy (SWITCHES.md encounterFocusFallen).
 */
function encounterRules(ctx: Ctx, u: Unit): { anchors: Anchor[]; focus?: number } {
  const anchors: Anchor[] = []
  let focus: number | undefined
  for (const id of u.aiRules ?? []) {
    const rule = ctx.encounter?.aiRules?.find((r) => r.id === id)
    if (!rule) throw new Error(`ai.encounter-rules: unit ${u.name} is bound by '${id}', which the encounter does not carry`)
    if (rule.rule === 'anchor') anchors.push({ id, hex: ctx.geo.hexId(rule.at.col, rule.at.row), radius: rule.radius })
    else if (focus === undefined) {
      const t = ctx.state.encounter?.focus?.[id]
      if (t !== undefined && livingEnemies(ctx, u).some((e) => e.id === t)) focus = t
    }
  }
  return { anchors, ...(focus !== undefined ? { focus } : {}) }
}

/**
 * ai.encounter-rules: a unit standing outside an anchor comes back first — its
 * ordinary move (else a sidestep) to the allowed hex nearest the anchor, a RULE
 * and not the row's tiers (SWITCHES.md encounterAnchorReturn). Inside every
 * anchor, nothing happens.
 */
function returnToAnchor(decision: Decision, u: Unit): void {
  const ctx = decision.ctx
  const out = decision.anchors.find((a) => ctx.geo.distance(u.hex, a.hex) > a.radius)
  if (!out) return
  const power = ordinaryMove(decision, u) ?? movePowerOf(decision, u, 'sidestep')
  if (!power) return
  const d0 = ctx.geo.distance(u.hex, out.hex)
  const closer = destinationPlans(power.id, moveTargets(decision, u, power).filter((h) => ctx.geo.distance(h, out.hex) < d0))
  const r = rank(sceneOf(decision, u, { anchor: out.hex }), closer, [{ anchorDistance: -1 }])
  if (r.length) act(decision, { actor: u.id, destination: r[0]!.plan.destination!, actionId: power.id }, { choice: 'rule.return-to-anchor', ranked: r })
}

/**
 * ai.mode-change: do a change's conditions hold now? Every condition it names
 * must (SWITCHES.md aiModeChangeConditions). Integers only (Law 7).
 */
function aiChangeHolds(ctx: Ctx, u: Unit, change: AiModeChange): boolean {
  const w = change.when
  if (w.hpBelow !== undefined && !(u.hp * 100 < u.maxHp * w.hpBelow)) return false
  if (w.fromTurn !== undefined && !(ctx.state.turn >= w.fromTurn)) return false
  return true
}

export function runActivation(ctx: Ctx, unitId: number): void {
  const u = unit(ctx, unitId)
  if (ctx.state.outcome || u.lifeState !== 'standing' || isBlocked(ctx, u) || u.primaryUsed) return
  // ai.mode-change (AI-DESIGN.md §3E): the row's changes are read as the
  // unit's own Activation opens, before it chooses — every one whose
  // conditions hold, in listed order, so the last one standing is the mode
  // it plays (SWITCHES.md aiModeChangeWhen, aiModeChangeOrder).
  for (const change of [...(u.aiChanges ?? [])]) if (aiChangeHolds(ctx, u, change)) changeAiMode(ctx, unitId, change)
  if (!ctx.aiModes[u.ai]) throw new Error(`unknown AI mode '${u.ai}'`)
  // capability.confusion (2026-09-03): "Swaps the affected unit's AI strategy
  // for a different one" — the next mode in registry order stands in, and the
  // log names both. Deterministic: no cup, no choice.
  const names = Object.keys(ctx.aiModes)
  // an override (the civilians' flight, ruled 2026-09-03) stands in until its Turn ends
  const base = u.aiOverride && ctx.state.turn <= u.aiOverride.untilTurn ? u.aiOverride.mode : u.ai
  const ai = isConfused(ctx, u) ? names[(names.indexOf(base) + 1) % names.length]! : base
  const own = ctx.aiModes[ai]
  if (!own) throw new Error(`unknown AI mode '${ai}'`)
  // ai.encounter-rules: a coordinated unit ranks whom to attack by the side's
  // plan first, then its own row's preference (SWITCHES.md encounterFocusTier)
  const rules = encounterRules(ctx, u)
  const row: AiModeRow = rules.focus !== undefined ? { ...own, target: [{ sidePlan: 1 }, ...own.target] } : own
  const mode = RULES[row.rules]
  if (!mode) throw new Error(`AI mode '${row.id}' names rules '${row.rules}', which the engine does not have`)
  emit(ctx, 'ai.mode', `ai.${ai}`, { actor: unitId, mode: ai, ...(isConfused(ctx, u) ? { confusedFrom: base } : {}), ...(base !== u.ai ? { overriding: u.ai } : {}) })
  const decision: Decision = {
    ctx, row, freeUsed: new Set(), actionsTaken: 0, idled: false, list: null,
    limit: 2 + Object.values(ctx.actions).filter(a => a.free).length,
    anchors: rules.anchors, ...(rules.focus !== undefined ? { focus: rules.focus } : {}),
  }
  // v2.prone (COMBAT-V2-DESIGN §10; SWITCHES.md proneAiStandsFirst): a prone
  // unit spends its movement action standing, then chooses its primary as usual.
  if (isProne(ctx, u)) {
    const stand = usableMoves(decision, u).find(standsUp)
    if (stand) act(decision, { actor: u.id, destination: u.hex, actionId: stand.id }, { choice: 'rule.stand-up' })
  }
  returnToAnchor(decision, u)
  hintedAction(decision, u, 'opening')
  while (!ctx.state.outcome && u.lifeState === 'standing' && !isBlocked(ctx, u) && !u.primaryUsed) {
    const before = decision.actionsTaken
    mode(decision, u)
    // An explicit idle choice ends the cycle. Successful free or movement-slot
    // choices can leave another useful opportunity; let the same mode choose.
    if (decision.idled || decision.actionsTaken === before) break
  }
}

/** The mode names the standard content fields — the rows' keys (src/content/ai-modes.ts). */
export const AI_MODES = Object.keys(AI_MODE_ROWS)
