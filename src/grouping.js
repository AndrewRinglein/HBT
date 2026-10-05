/* ── ENEMIES OF ONE TYPE MOVE TOGETHER: THE PLAN (viewer.enemy-type-moves-together, 2026-10-04) ───────────────────────────
   Engine DECISIONS.md 2026-10-03 'posted: which motions enemies and heroes need, and enemies of one type move together', 'the
   post's twelve questions answered' (10-12) and 'Back Flip's rules; enemies only move together; the motion work comes first'
   (Andrew: "During the enemy turn I would like for all of the enemies of a type to move at the same time. What I mean by this
   is only the move actions. They can still be determined in the order they should have been determined, but we're just
   displaying it as if they're all moving at the same time." / "We'll move all of the category, then have them perform actions
   if they have any." / "functionally it should be exactly the same." / "Zombies and fast zombies would count as two groups."
   / "All the zombies move, and then attacks play." / "a free attack stops all action and just plays out, so the whole group
   freezes." / "5 enemies only.").

   PURE, and display only: this reads the engine's log and returns the ORDER in which the pump shows the events of one Enemy
   Phase's run of enemy Activations — a permutation of those log lines and nothing else. No event is changed, dropped, added
   or re-decided; the log itself is untouched; when the run has been shown the board is the engine's own state after it.

   The run: from an enemy's activation.begin (Enemy Phase) through every following enemy Activation that is whole in the log
   (its activation.end is there), each with the lines that trail it before the next begins, up to the first line that is none
   of these (the phase's end, a Turn's, the battle's).
   The groups: the run's Activations gathered by the unit's own type (its row: a Zombie and a Fast Zombie are two), each type
   whole, the groups in the order each type first acts (viewer SWITCHES togetherMixedOrder). A type with one Activation in the
   run plays as it always did.
   A group of two or more is shown in two parts:
     1 · its moves, together. An Activation that opens with a walk (nothing before its first move.begin but the Activation's
         own opening lines) gives up that walk — to its last step, a free attack on the way included. Every such walk starts at
         the same moment. A free attack on a mover (aoo.provoked naming it) is a STOP: when the mover reaches that step the
         whole group is frozen, the attack's lines play one by one as they always do, and the group goes on — that mover with
         the rest of its walk, if it has one.
     2 · then each Activation's remaining lines — its attacks and whatever else — one Activation after another in the engine's
         order. An Activation with nothing left to show (it only ended) is folded without a beat: straight on. */

/** the lines that may stand between activation.begin and the walk without making it more than "it began and walked" */
const OPENING = new Set(['activation.begin', 'activation.selected', 'ai.mode', 'ai.hunts', 'ai.override', 'ai.denied', 'ai.tookHighGround', 'action.spent', 'stamina.spent', 'surge.checked', 'trigger.rolled'])
/** an actor's own next action: the walk is over */
const OWN_ACTION = new Set(['attack.declared', 'power.used', 'burst.declared', 'move.begin', 'prop.struck', 'loadout.swapped'])
/** the lines that end the run */
const BOUNDARY = new Set(['phase.end.begin', 'phase.end.done', 'phase.begin', 'turn.end', 'turn.begin', 'battle.end', 'encounter.won', 'encounter.lost', 'encounter.wave'])
/** a remainder with none of these has nothing to show */
const SHOWN = new Set(['attack.declared', 'attack.hit', 'attack.miss', 'power.used', 'power.hit', 'burst.declared', 'burst.struck', 'damage.applied', 'heal.applied', 'move.begin', 'moved', 'move.stopped',
  'knocked', 'knockback.blocked', 'status.applied', 'life.downed', 'life.dead', 'unit.enter', 'unit.raised', 'unit.summoned', 'unit.dismissed', 'corpse.eaten', 'unit.obliterated', 'aoo.provoked', 'prop.struck', 'prop.damaged', 'prop.destroyed',
  'deathbed.stood', 'deathbed.fell', 'deathbed.none', 'surge.hit', 'badge.gained', 'thorns.reflected', 'crit.effect', 'layer.painted', 'layer.cancelled', 'unit.shunted', 'statmod.added', 'maxHp.lost', 'maxHp.gained',
  'loadout.swapped', 'hp.reset', 'bleedout.accelerated', 'corpse.removed', 'power.gained', 'side.stat.changed', 'side.stat.restored', 'unit.proned', 'unit.stood', 'stamina.drained', 'status.cancelled', 'heal.boosted', 'trigger.fired'])

/** One Activation of the run: where it lies in the log, and its opening walk cut into legs and free attacks.
    {actor, from, to, walk: null | {legs: [[from, to)…], aoos: [[from, to)…], end}} — legs[k] is followed by aoos[k] if there is one */
function activationAt(EV, n) {
  const begin = EV[n], actor = begin.actor
  let end = -1
  for (let k = n + 1; k < EV.length; k++) {
    const e = EV[k]
    if (e.type === 'activation.end' && e.actor === actor) { end = k; break }
    if (e.type === 'activation.begin' || BOUNDARY.has(e.type)) return null          // not whole in the log
  }
  if (end < 0) return null
  let to = end + 1
  while (to < EV.length && EV[to].type !== 'activation.begin' && !BOUNDARY.has(EV[to].type)) to++
  /* its opening walk */
  let mb = -1
  for (let k = n; k <= end; k++) { const e = EV[k]
    if (e.type === 'move.begin' && e.actor === actor) { mb = k; break }
    if (!OPENING.has(e.type)) break }
  if (mb < 0) return { actor, from: n, end: end + 1, to, walk: null }
  const legs = [], aoos = []
  let legFrom = n, aooFrom = -1, last = mb          // `last`: the last line of the walk so far
  for (let k = mb + 1; k <= end; k++) { const e = EV[k]
    if (e.type === 'aoo.provoked' && e.target === actor) { if (aooFrom < 0) { legs.push([legFrom, k]); aooFrom = k } last = k; continue }
    if (e.type === 'moved' && e.actor === actor) { if (aooFrom >= 0) { aoos.push([aooFrom, k]); aooFrom = -1; legFrom = k } last = k; continue }
    if (e.type === 'move.stopped' && e.actor === actor) { last = k; if (aooFrom >= 0) { aoos.push([aooFrom, k + 1]); aooFrom = -1; legFrom = k + 1 } break }
    if ((OWN_ACTION.has(e.type) && e.actor === actor) || (e.type === 'activation.end' && e.actor === actor) || (e.type === 'activation.idle' && e.actor === actor)) {
      /* the walk is over: a free attack still open runs to here (the mover did not go on) */
      if (aooFrom >= 0) { aoos.push([aooFrom, k]); aooFrom = -1; legFrom = k; last = k - 1 }
      break }
    if (aooFrom >= 0) last = k                      // the free attack's own lines
  }
  if (aooFrom >= 0) { aoos.push([aooFrom, last + 1]); legFrom = last + 1 }
  if (legFrom <= last) legs.push([legFrom, last + 1])
  return { actor, from: n, end: end + 1, to, walk: { legs, aoos, end: last + 1 } }
}

/**
 * The plan for the run of enemy Activations that begins at log index `i`, or null when there is nothing to gather (i is no
 * enemy Activation of the Enemy Phase, or no type has two Activations in the run).
 *   unitOf(actor) -> {side, typeId} | undefined      the unit as the board holds it (a unit that enters inside the run is
 *                                                    read from its own unit.enter line)
 *   legMs(moveBegin | null, hexes) -> beat ms        what the pump holds for a walk of that many steps
 * Returns {from, to, order, marks, groups}: `order` is the log indices from..to-1 in the order shown; `marks` maps a
 * place in that order (from + k) to what the pump does there before (or instead of) playing the line.
 */
export function planEnemyPhase(EV, i, unitOf, legMs) {
  const first = EV[i]
  if (!first || first.type !== 'activation.begin' || first.phase !== 'enemy') return null
  const entered = {}
  const who = id => unitOf(id) || entered[id]
  const acts = []
  let n = i
  while (n < EV.length && EV[n].type === 'activation.begin' && EV[n].phase === 'enemy') {
    const u = who(EV[n].actor)
    if (!u || u.side !== 'enemy') break
    const a = activationAt(EV, n); if (!a) break
    for (let k = a.from; k < a.to; k++) if (EV[k].type === 'unit.enter') entered[EV[k].actor] = { side: EV[k].side, typeId: EV[k].typeId }
    a.typeId = u.typeId; acts.push(a); n = a.to
  }
  if (!acts.length) return null
  const to = n
  /* the groups: each type whole, in the order each type first acts */
  const groups = []
  for (const a of acts) { let g = groups.find(x => x.typeId === a.typeId); if (!g) groups.push(g = { typeId: a.typeId, acts: [] }); g.acts.push(a) }
  if (!groups.some(g => g.acts.length > 1)) return null
  const order = [], marks = new Map()
  const mark = m => { const at = i + order.length; if (!marks.has(at)) marks.set(at, []); marks.get(at).push(m); return m }
  const push = (from, upTo) => { for (let k = from; k < upTo; k++) order.push(k) }
  const span = ([from, upTo]) => upTo - from
  const stepsIn = ([from, upTo], actor) => { let c = 0; for (let k = from; k < upTo; k++) if (EV[k].type === 'moved' && EV[k].actor === actor) c++; return c }
  const moveBeginOf = a => { for (let k = a.from; k < a.walk.end; k++) if (EV[k].type === 'move.begin' && EV[k].actor === a.actor) return EV[k]; return null }
  for (const g of groups) {
    if (g.acts.length === 1) { push(g.acts[0].from, g.acts[0].to); continue }           // alone: as it always played
    const movers = g.acts.filter(a => a.walk && a.walk.legs.length)
    if (movers.length) {
      /* 1 · the moves, together: every mover's first leg at the same moment */
      const state = movers.map(a => ({ a, k: 0, ends: legMs(moveBeginOf(a), stepsIn(a.walk.legs[0], a.actor)) }))
      let launch = mark({ kind: 'walks', typeId: g.typeId, legs: movers.map(a => ({ actor: a.actor, len: span(a.walk.legs[0]) })), wait: 0 }), at = 0
      for (const a of movers) push(a.walk.legs[0][0], a.walk.legs[0][1])
      for (;;) {
        /* the next free attack to be reached, by the walk's own clock (a tie: the engine's order) */
        const due = state.filter(s => s.k < s.a.walk.aoos.length).sort((x, y) => x.ends - y.ends || x.a.from - y.a.from)[0]
        if (!due) break
        launch.wait = Math.max(0, due.ends - at); at = Math.max(at, due.ends)
        mark({ kind: 'freeze', actor: due.a.actor })
        push(due.a.walk.aoos[due.k][0], due.a.walk.aoos[due.k][1])
        due.k++
        const leg = due.a.walk.legs[due.k]
        launch = mark({ kind: 'resume', actor: due.a.actor, len: leg ? span(leg) : 0, wait: 0 })
        if (leg) { push(leg[0], leg[1]); due.ends = at + legMs(moveBeginOf(due.a), stepsIn(leg, due.a.actor)) } else due.ends = at
      }
      /* the last walks run out, and settle */
      const done = Math.max(...state.map(s => s.ends))
      launch.wait = Math.max(0, done - at) + (done > 0 ? 60 : 0)
      launch.last = true
    }
    /* 2 · then each Activation's remaining lines, in the engine's order */
    for (const a of g.acts) {
      const from = a.walk && a.walk.legs.length ? a.walk.end : a.from
      if (from >= a.to) continue
      let quiet = true
      /* viewer.area-trigger-burst: a trigger that fired is shown though it reached nobody (an area's burst plays over its area) */
      for (let k = from; k < a.to; k++) if (SHOWN.has(EV[k].type) || (EV[k].type === 'trigger.rolled' && EV[k].fired === true)) { quiet = false; break }
      mark({ kind: 'actor', actor: a.actor })
      if (quiet) mark({ kind: 'quiet', len: a.to - from })
      push(from, a.to)
    }
  }
  return { from: i, to, order, marks, groups: groups.map(g => ({ typeId: g.typeId, actors: g.acts.map(a => a.actor), movers: g.acts.filter(a => a.walk && a.walk.legs.length).map(a => a.actor), together: g.acts.length > 1 })) }
}

/** With `shown` lines of the plan played, the longest stretch of the log from plan.from that is wholly shown: the engine's
    own state nearest behind the display (a hand step lands there). */
export function prefixShown(plan, shown) {
  const seen = new Set(plan.order.slice(0, shown))
  let k = plan.from
  while (k < plan.to && seen.has(k)) k++
  return k
}
