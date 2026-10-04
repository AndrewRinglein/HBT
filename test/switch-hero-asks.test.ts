// viewer.switch-hero-asks (engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes asks first
// ...', 'switching from a hero that has not acted is free ...', 'the opening draft pool is all 24 heroes ...; the switch
// pop-up is for any player unit'). Andrew: "when you double-click on a hero but you still have a hero primary activation left,
// it should pop up and say, 'End activation of X hero and start activation of Y hero.' ... there needs to be some kind of
// check to make sure that I'm willing to end the activation of that other hero." · "by hero, I just mean any player unit ...
// And you can click yes or no." The play input (src/ui/play-input.ts) on the Orphanage: a double-click (`choose`) on another
// un-acted player unit while the one acting has done something is no longer refused — the input holds the question (its
// facts' `ask`) and changes nothing; the answer no drops it; the answer yes sends the engine's own end-cycle for the one
// acting and select-activation for the one asked for. A unit that has done nothing is switched away from freely, as before.
// Every legality is the engine's (validateBattleCommand, heroesYetToAct, the unit's own facts).
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { heroesYetToAct } from '../src/engine.js'

const RAW = /\b[a-z]+(-[a-z]+)+\b/   // an engine refusal code
function start() {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), {
    save: () => saveSandbox(box.s),
    restore: (saved) => { box.s = restoreSandbox(saved as string); return true },
  })
  return { box, P }
}
const acting = (s: Sandbox) => [s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]
const yet = (s: Sandbox) => heroesYetToAct(s.ctx, s.policy).map((uid) => s.ctx.state.units.find((u) => u.uid === uid)!.id)
/** the one acting walks to the first hex in reach: a click to plan, the same click again to move */
function walk(P: ReturnType<typeof start>['P']) { const h = P.facts().reach[0]!; P.input({ kind: 'hex', hex: h }); expect(P.input({ kind: 'hex', hex: h })).toBe(true) }

describe('switching heroes asks first', () => {
  it('a unit that has moved and still has its primary action: a double-click on another un-acted unit asks, and changes nothing', () => {
    const { box, P } = start(); P.next()
    const x = box.s.ctx.battleCursor!.actor!, y = yet(box.s).filter((id) => id !== x)[0]!
    walk(P)
    expect(box.s.ctx.state.units[x]!.moveUsed).toBe(true); expect(box.s.ctx.state.units[x]!.primaryUsed).toBe(false)
    const seq = box.s.ctx.state.seq, events = box.s.ctx.events.length
    expect(P.input({ kind: 'choose', id: y })).toBe(true)
    const f = P.facts()
    expect(f.ask).toEqual({ kind: 'switch', from: x, to: y })
    expect(f.note, 'a question, not a refusal').toBeNull()
    expect(acting(box.s)).toEqual(['acting', x]); expect(box.s.ctx.state.seq).toBe(seq); expect(box.s.ctx.events.length).toBe(events)
  })
  it('the answer no leaves the one acting exactly as it was', () => {
    const { box, P } = start(); P.next()
    const x = box.s.ctx.battleCursor!.actor!, y = yet(box.s).filter((id) => id !== x)[0]!
    walk(P); P.input({ kind: 'choose', id: y })
    const seq = box.s.ctx.state.seq
    expect(P.input({ kind: 'answer', yes: false })).toBe(true)
    expect(P.facts().ask ?? null).toBeNull()
    expect(acting(box.s)).toEqual(['acting', x]); expect(box.s.ctx.state.seq).toBe(seq)
    expect(box.s.ctx.events.some((e) => e.type === 'activation.end' && (e as { actor?: number }).actor === x), 'its Activation has not ended').toBe(false)
    expect(yet(box.s), 'the one asked for has still not acted').toContain(y)
    expect(P.ending().endActivation, 'it may still act or be ended').toBe(true)
  })
  it('the answer yes ends the one acting by the engine\'s end-cycle and begins the one asked for; the first does not come back', () => {
    const { box, P } = start(); P.next()
    const x = box.s.ctx.battleCursor!.actor!, others = yet(box.s).filter((id) => id !== x), y = others.at(-1)!
    expect(others.length).toBeGreaterThan(1)   // the one asked for is NOT simply the next in line
    walk(P); P.input({ kind: 'choose', id: y })
    const before = box.s.ctx.events.length
    expect(P.input({ kind: 'answer', yes: true })).toBe(true)
    expect(box.s.ctx.events.slice(before).map((e) => [e.type, (e as { actor?: number }).actor])).toEqual([['activation.end', x], ['activation.selected', y], ['activation.begin', y]])
    expect(acting(box.s)).toEqual(['acting', y])
    expect(yet(box.s), 'the one left has acted').not.toContain(x)
    const f = P.facts()
    expect(f.actor).toBe(y); expect(f.ask ?? null).toBeNull(); expect(f.reach.length, 'its basic move is armed').toBeGreaterThan(0)
    // no partial Activations: a double-click back on the first is refused in one plain line, and nothing is asked
    expect(P.input({ kind: 'choose', id: x })).toBe(false)
    expect(P.facts().ask ?? null).toBeNull()
    expect(P.facts().note).toBe(`${box.s.ctx.state.units[x]!.name} has already acted this Phase.`); expect(P.facts().note!).not.toMatch(RAW)
  })
  it('a unit that has done nothing is switched away from freely, with no question (turn-taking point 4)', () => {
    const { box, P } = start(); P.next()
    const x = box.s.ctx.battleCursor!.actor!, y = yet(box.s).filter((id) => id !== x)[0]!
    expect(P.input({ kind: 'choose', id: y })).toBe(true)
    expect(P.facts().ask ?? null).toBeNull()
    expect(acting(box.s)).toEqual(['acting', y]); expect(yet(box.s), 'the one switched away from has not acted').toContain(x)
  })
  it('any player unit: a civilian left, a civilian asked for', () => {
    const { box, P } = start(); P.next()
    const civ = (s: Sandbox) => s.ctx.state.units.filter((u) => u.side === 'hero' && /orphan|teacher/.test(u.typeId)).map((u) => u.id)
    const first = box.s.ctx.battleCursor!.actor!, c = civ(box.s)
    expect(c.length).toBeGreaterThanOrEqual(2); expect(c).not.toContain(first)
    // a hero moved, a civilian double-clicked
    walk(P); expect(P.input({ kind: 'choose', id: c[0]! })).toBe(true)
    expect(P.facts().ask).toEqual({ kind: 'switch', from: first, to: c[0] })
    expect(P.input({ kind: 'answer', yes: true })).toBe(true); expect(acting(box.s)).toEqual(['acting', c[0]])
    // that civilian moved, another civilian double-clicked
    walk(P); expect(P.input({ kind: 'choose', id: c[1]! })).toBe(true)
    expect(P.facts().ask).toEqual({ kind: 'switch', from: c[0], to: c[1] })
    expect(P.input({ kind: 'answer', yes: true })).toBe(true); expect(acting(box.s)).toEqual(['acting', c[1]])
    // and from a civilian back to a hero that has not acted
    const hero = yet(box.s).find((id) => !c.includes(id))!
    walk(P); expect(P.input({ kind: 'choose', id: hero })).toBe(true)
    expect(P.facts().ask).toEqual({ kind: 'switch', from: c[1], to: hero })
  })
  it('no question for a unit that may not act: one that has acted, an enemy — the plain refusal stays', () => {
    const { box, P } = start(); P.next()
    const first = box.s.ctx.battleCursor!.actor!
    P.input({ kind: 'end-activation' }); P.next()
    const x = box.s.ctx.battleCursor!.actor!
    walk(P)
    expect(P.input({ kind: 'choose', id: first })).toBe(false)
    expect(P.facts().ask ?? null).toBeNull(); expect(P.facts().note).toBe(`${box.s.ctx.state.units[first]!.name} has already acted this Phase.`)
    const enemy = box.s.ctx.state.units.find((u) => u.side === 'enemy')!
    expect(P.input({ kind: 'choose', id: enemy.id })).toBe(false)
    expect(P.facts().ask ?? null).toBeNull(); expect(P.facts().note).toBe(`${enemy.name} is not yours to command.`)
    expect(acting(box.s)).toEqual(['acting', x])
  })
  it('the question does not outlive what it was asked about: any other order drops it; a stale answer does nothing', () => {
    const { box, P } = start(); P.next()
    const x = box.s.ctx.battleCursor!.actor!, y = yet(box.s).filter((id) => id !== x)[0]!
    walk(P); P.input({ kind: 'choose', id: y }); expect(P.facts().ask).toBeTruthy()
    P.input({ kind: 'point', hex: 0 }); expect(P.facts().ask, 'pointing is not an order').toBeTruthy()
    P.input({ kind: 'back' }); expect(P.facts().ask ?? null).toBeNull()
    const seq = box.s.ctx.state.seq
    expect(P.input({ kind: 'answer', yes: true })).toBe(false)
    expect(box.s.ctx.state.seq).toBe(seq); expect(acting(box.s)).toEqual(['acting', x])
  })
})
