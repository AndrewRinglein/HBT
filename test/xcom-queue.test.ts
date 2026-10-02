// viewer.xcom-camera (engine backlog; DECISIONS.md 2026-10-01 'the XCOM-style camera'). Andrew: "One character is
// auto-selected at the start, the map centered on them; when its activation ends, the next in the character bar, left to
// right, civilians included. Double-click a character in the top bar or on the map to change it." The play input
// (src/ui/play-input.ts) proposes who acts next while the engine waits for a choice; the proposal is never begun on its own
// (an activation once begun cannot be taken back, and runs its start) — the player's first order to it begins it. Every
// "may this hero begin" is the engine's (sandboxActivationChoices).
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
  it('at the start the first in the bar is proposed — civilians included — and nothing has begun', () => {
    const { s, P } = start()
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    const q = eligible(s)
    expect(q.length).toBeGreaterThan(1)
    expect(s.ctx.state.units.some((u) => q.includes(u.id) && u.typeId.startsWith('hero.fixed.')), 'a civilian may act and is in the queue').toBe(true)
    expect(P.proposal()).toBe(q[0])
    expect(s.ctx.events.filter((e) => e.type === 'activation.begin').length, 'proposing begins nothing').toBe(0)
  })
  it('a click on another hero only looks at it; a double-click makes it the next; a click on the proposed one begins it', () => {
    const { s, P } = start(), q = eligible(s), other = q[1]!
    expect(P.input({ kind: 'unit', id: other, hex: s.ctx.state.units[other]!.hex })).toBe(false)
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    expect(P.input({ kind: 'choose', id: other })).toBe(true)
    expect(P.proposal()).toBe(other)
    const enemy = s.ctx.state.units.find((u) => u.side === 'enemy')
    if (enemy) expect(P.input({ kind: 'choose', id: enemy.id }), 'an enemy cannot be chosen').toBe(false)
    expect(P.input({ kind: 'unit', id: other, hex: s.ctx.state.units[other]!.hex })).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', other])
    expect(P.proposal(), 'no proposal while a hero acts').toBeNull()
  })
  it('an action chosen on the proposed hero\'s bar begins its activation and is chosen', () => {
    const { s, P } = start(), first = P.proposal()!
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
    expect(other).not.toBe(P.proposal())
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
  it('when an activation ends, the next to its right in the bar is proposed, round to the left end', () => {
    const { s, P } = start(), q = eligible(s)
    const mid = q[1]!
    P.input({ kind: 'choose', id: mid }); P.input({ kind: 'unit', id: mid, hex: s.ctx.state.units[mid]!.hex })
    expect(P.input({ kind: 'end-activation' })).toBe(true)
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    const left = eligible(s)
    expect(P.proposal()).toBe(left.find((id) => id > mid) ?? left[0])
  })
})
