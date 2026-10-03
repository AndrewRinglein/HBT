// viewer.xcom-camera (engine backlog; DECISIONS.md 2026-10-01 'the XCOM-style camera'). Andrew: "One character is
// auto-selected at the start, the map centered on them; when its activation ends, the next in the character bar, left to
// right, civilians included. Double-click a character in the top bar or on the map to change it." The play input
// (src/ui/play-input.ts) proposes who acts next while the engine waits for a choice; the proposal is never begun on its own
// (an activation once begun cannot be taken back, and runs its start) — the player's first order to it begins it. Every
// "may this hero begin" is the engine's (sandboxActivationChoices).
// Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed' and 'the
// battle screen's turn-taking, ruled'; kingdom SWITCHES playQueueProposal, playQueueClick, playQueueOrder overturned): the next
// hero is no longer PROPOSED but BEGUN — next(), which the host calls whenever the engine waits — with its basic move armed; a
// double-click (choose) begins the hero asked for; the next to begin is the leftmost yet to act. The tests below that held the
// proposal are rewritten to the ruling, each saying what it was; the turn-taking itself is test/turn-taking.test.ts.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxActivationChoices } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { isMove } from '../src/engine.js'

const start = (encounterId = 'encounter.opening.orphanage') => {
  const s = createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId }); advanceSandbox(s)
  return { s, P: createPlayInput(() => s, (c) => { const r = commandSandbox(s, c); if (r.ok) advanceSandbox(s); return r }) }
}
const eligible = (s: ReturnType<typeof start>['s']) => { const uids = new Set(sandboxActivationChoices(s).map((c) => c.uid)); return s.ctx.state.units.filter((u) => uids.has(u.uid)).map((u) => u.id).sort((a, b) => a - b) }

describe('the next to act, proposed in the character bar\'s order', () => {
  /* was: 'at the start the first in the bar is proposed — civilians included — and nothing has begun' (P.proposal() === q[0],
     no activation.begin). Now: the first in the bar is the one next() begins */
  it('at the start the first in the bar is the one to begin — civilians included in the queue — and next() begins it', () => {
    const { s, P } = start()
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    const q = eligible(s)
    expect(q.length).toBeGreaterThan(1)
    expect(s.ctx.state.units.some((u) => q.includes(u.id) && u.typeId.startsWith('hero.fixed.')), 'a civilian may act and is in the queue').toBe(true)
    expect(P.upcoming()).toBe(q[0])
    expect(s.ctx.events.filter((e) => e.type === 'activation.begin').length, 'nothing has begun before next()').toBe(0)
    expect(P.next()).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', q[0]])
  })
  /* was: 'a click on another hero only looks at it; a double-click makes it the next; a click on the proposed one begins it'.
     Now: the click still only looks; the double-click begins that hero */
  it('a click on another hero only looks at it; a double-click begins it', () => {
    const { s, P } = start(), q = eligible(s), other = q[1]!
    expect(P.input({ kind: 'unit', id: other, hex: s.ctx.state.units[other]!.hex })).toBe(false)
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    const enemy = s.ctx.state.units.find((u) => u.side === 'enemy')
    if (enemy) expect(P.input({ kind: 'choose', id: enemy.id }), 'an enemy cannot be chosen').toBe(false)
    expect(P.input({ kind: 'choose', id: other })).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', other])
    expect(P.upcoming(), 'nobody waits to begin while a hero acts').toBeNull()
  })
  it('an action chosen on the first hero\'s bar, while the engine waits, begins its activation and is chosen', () => {
    const { s, P } = start(), first = P.upcoming()!
    const move = s.ctx.state.units[first]!.actions.find((id) => isMove(s.ctx.actions[id]!))!
    expect(P.input({ kind: 'slot', actionId: move, unit: first })).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', first])
    expect(P.facts().slot).toBe(move)
    expect(P.facts().reach.length, 'its walk is drawn at once').toBeGreaterThan(0)
  })
  /* fix.shield-power-double-click (engine DECISIONS.md 2026-10-01 'a self power fires on a double-click on its bar button'):
     the bar shows the hero last looked at; an action chosen there begins that hero when the engine lets it begin (kingdom
     SWITCHES playQueueBarOrder) — an enemy's bar, or a hero who may not begin, is refused */
  it('an action chosen on the bar of a hero only looked at begins that hero and is chosen', () => {
    const { s, P } = start(), q = eligible(s), other = q[1]!
    expect(other).not.toBe(P.upcoming())
    const act = s.ctx.state.units[other]!.actions.find((id) => isMove(s.ctx.actions[id]!))!
    expect(P.input({ kind: 'unit', id: other, hex: s.ctx.state.units[other]!.hex }), 'a click only looks').toBe(false)
    expect(P.input({ kind: 'slot', actionId: act, unit: other })).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', other])
    expect(P.facts().slot).toBe(act)
  })
  it('an action on the bar of a unit the engine would not let begin is refused and begins nothing', () => {
    const { s, P } = start(), enemy = s.ctx.state.units.find((u) => u.side === 'enemy')
    if (!enemy) return
    const n = s.ctx.events.length
    expect(P.input({ kind: 'slot', actionId: enemy.actions[0]!, unit: enemy.id })).toBe(false)
    expect(s.ctx.events.length).toBe(n)
    expect(s.ctx.battleCursor?.at).toBe('selecting')
  })
  /* was: 'when an activation ends, the next to its right in the bar is proposed, round to the left end'
     (left.find((id) => id > mid) ?? left[0]). Now (kingdom SWITCHES turnNextLeftmost): the leftmost yet to act begins */
  it('when an activation ends, the leftmost hero yet to act in the bar is the next begun', () => {
    const { s, P } = start(), q = eligible(s)
    const mid = q[1]!
    P.input({ kind: 'choose', id: mid })
    expect(P.input({ kind: 'end-activation' })).toBe(true)
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    const left = eligible(s)
    expect(P.upcoming()).toBe(left[0])
    expect(P.next()).toBe(true); expect(s.ctx.battleCursor?.actor).toBe(left[0])
  })
})
