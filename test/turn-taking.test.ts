// viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed', 'the action
// bar and its card stay with the activated unit', 'the battle screen's turn-taking, ruled'). Andrew: "This whole system is
// really glitchy and confusing ... This is a horrific experience right now." The play input (src/ui/play-input.ts) on the
// Orphanage: the next un-acted hero is BEGUN (not proposed) with its basic move armed; a single click on a hex shows the path
// and the attacks planned from its end; a second click (a double-click) moves; a double-click on another hero switches to it
// only while the current one has done nothing; every refusal is one plain line, never a raw code; when an Activation ends the
// next un-acted hero, left to right, begins. Every legality is the engine's (validateBattleCommand, its choices, previewFrom).
import { describe, it, expect } from 'vitest'
import { shownName } from '../../viewer/src/names.js'
import { createSandbox, advanceSandbox, commandSandbox, sandboxActivationChoices, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { isAttack, isMove } from '../src/engine.js'

const RAW = /\b[a-z]+(-[a-z]+)+\b/   // an engine refusal code (activation-not-selectable, unreachable-destination …)
function start() {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), {
    save: () => saveSandbox(box.s),
    restore: (saved) => { box.s = restoreSandbox(saved as string); return true },
  })
  return { box, P }
}
const eligible = (s: Sandbox) => { const uids = new Set(sandboxActivationChoices(s).map((c) => c.uid)); return s.ctx.state.units.filter((u) => uids.has(u.uid)).map((u) => u.id).sort((a, b) => a - b) }
const basicMove = (s: Sandbox, id: number) => s.ctx.state.units[id]!.actions.find((a) => isMove(s.ctx.actions[a]!))!
const begins = (s: Sandbox) => s.ctx.events.filter((e) => e.type === 'activation.begin').map((e) => e.actor)

describe('the battle screen\'s turn-taking', () => {
  it('the Hero Phase begins the first un-acted hero, with its basic move armed: no click on the bar', () => {
    const { box, P } = start(), q = eligible(box.s)
    expect(box.s.ctx.battleCursor?.at).toBe('selecting')
    expect(P.next()).toBe(true)
    expect([box.s.ctx.battleCursor?.at, box.s.ctx.battleCursor?.actor]).toEqual(['acting', q[0]])
    const f = P.facts()
    expect(f.actor).toBe(q[0]); expect(f.slot).toBe(basicMove(box.s, q[0]!)); expect(f.reach.length).toBeGreaterThan(0)
    expect(P.next(), 'nothing more begins while a hero acts').toBe(false)
  })
  it('a single click on a hex shows the path there and plans the attacks from its end; a second click moves', () => {
    const { box, P } = start(); P.next()
    const s = () => box.s
    /* the first hex in reach from which the engine lists an attack on someone — on Turn 1 the zombies stand too far off, so the
       Turns are ended until one comes near */
    let dest: number | null = null, me = -1
    for (let turn = 0; turn < 6 && dest === null && !s().ctx.state.outcome; turn++) {
      me = s().ctx.battleCursor!.actor!
      for (const h of P.facts().reach) {
        expect(P.input({ kind: 'hex', hex: h })).toBe(true)
        const f = P.facts()
        expect(f.ghost).toEqual({ unit: me, hex: h }); expect(f.path.at(-1)).toBe(h); expect(f.path[0]).toBe(s().ctx.state.units[me]!.hex)
        if (f.targets.length) { dest = h; break }
        P.input({ kind: 'back' })
      }
      if (dest === null) { P.input({ kind: 'end-turn' }); P.next() }
    }
    expect(dest, 'some hex in reach puts an enemy within an attack').not.toBeNull()
    const target = P.facts().targets[0]!
    P.input({ kind: 'point', hex: target })
    const aim = P.facts().aim!
    expect(aim.from).toBe(dest); expect(aim.to).toBe(target); expect(typeof aim.hit).toBe('number')
    expect(isAttack(s().ctx.actions[s().ctx.state.units[me]!.actions.find((a) => isAttack(s().ctx.actions[a]!))!]!)).toBe(true)
    expect(s().ctx.state.units[me]!.hex, 'a single click moves nothing').not.toBe(dest)
    expect(P.input({ kind: 'hex', hex: dest! })).toBe(true)
    /* the walk set out for it (a free swing on the way may stop it short — the engine's move.stopped) */
    const walk = s().ctx.events.filter((e) => e.type === 'move.begin' && e.actor === me).at(-1)
    expect(walk && (walk as { to?: number }).to, 'the second click on it moves').toBe(dest)
  })
  it('a click on an enemy only looks: the hero acting and its plan stay', () => {
    const { box, P } = start(); P.next()
    const me = box.s.ctx.battleCursor!.actor!, zombie = box.s.ctx.state.units.find((u) => u.side === 'enemy' && u.lifeState === 'standing')!
    const before = JSON.stringify(P.facts())
    P.input({ kind: 'unit', id: zombie.id, hex: zombie.hex })
    expect(box.s.ctx.battleCursor?.actor).toBe(me); expect(JSON.stringify(P.facts())).toBe(before)
  })
  it('a double-click on another hero switches to it while the current one has done nothing; nothing of the first is kept', () => {
    const { box, P } = start(), q = eligible(box.s); P.next()
    const other = q.find((id) => id !== box.s.ctx.battleCursor!.actor)!
    const n = box.s.ctx.events.length
    expect(P.input({ kind: 'choose', id: other })).toBe(true)
    expect([box.s.ctx.battleCursor?.at, box.s.ctx.battleCursor?.actor]).toEqual(['acting', other])
    expect(begins(box.s), 'the first hero\'s begun Activation is taken back').toEqual([other])
    expect(box.s.ctx.events.length).toBeLessThanOrEqual(n)
    expect(P.facts().slot).toBe(basicMove(box.s, other))
  })
  /* 2026-10-04 (viewer.switch-hero-asks; engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes
     asks first ...', Andrew: "it should pop up and say, 'End activation of X hero and start activation of Y hero.'"): rewritten
     as the rule. Was 'once the hero has moved it must finish: a switch is refused in one plain line' — the double-click
     returned false and the note read `${name} has already moved - End Activation first.`. The double-click still switches
     nothing by itself (no partial Activations: the engine still lets no other hero begin, and the hero is still the one
     acting); the screen now asks instead of refusing, and nothing changes until the answer (test/switch-hero-asks.test.ts). */
  it('once the hero has moved, a double-click on another hero switches nothing by itself: the screen asks first', () => {
    const { box, P } = start(); P.next()
    const me = box.s.ctx.battleCursor!.actor!, name = box.s.ctx.state.units[me]!.name
    const step = P.facts().reach[0]!; P.input({ kind: 'hex', hex: step }); P.input({ kind: 'hex', hex: step })
    expect(box.s.ctx.state.units[me]!.hex).toBe(step)
    const other = eligible(box.s).find((id) => id !== me), q = sandboxActivationChoices(box.s)
    expect(q.length, 'the engine lets no other hero begin mid-Activation').toBe(0)
    const third = box.s.ctx.state.units.find((u) => u.side === 'hero' && u.id !== me)!
    const seq = box.s.ctx.state.seq
    expect(P.input({ kind: 'choose', id: other ?? third.id })).toBe(true)
    expect(box.s.ctx.battleCursor?.actor).toBe(me)
    expect(box.s.ctx.state.seq, 'nothing was ended or begun').toBe(seq)
    expect(P.facts().ask, `the question: end ${name}, begin the other`).toEqual({ kind: 'switch', from: me, to: other ?? third.id })
    expect(P.facts().note, 'a question, not a refusal').toBeNull()
  })
  it('every refusal is a plain line, never a raw code', () => {
    const { box, P } = start(); P.next()
    const me = box.s.ctx.battleCursor!.actor!, reach = new Set(P.facts().reach)
    const g = box.s.ctx.geo, far = [...Array(g.hexCount).keys()].find((h) => !reach.has(h) && !box.s.ctx.state.units.some((u) => u.hex === h) && g.distance(h, box.s.ctx.state.units[me]!.hex) > 8)!
    expect(P.input({ kind: 'hex', hex: far })).toBe(false)
    const note = P.facts().note!
    expect(note).toMatch(/cannot reach that hex/); expect(note).not.toMatch(RAW)
    const zombie = box.s.ctx.state.units.find((u) => u.side === 'enemy')!
    expect(P.input({ kind: 'choose', id: zombie.id })).toBe(false)
    /* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
       letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): the note was held to the engine's marked name (`unit.name`). The
       claim is unchanged - the plain line names the unit - and the name is the engine's less its mark (viewer src/names.js shownName). */
    expect(P.facts().note).toBe(`${shownName(zombie.name)} is not yours to command.`)
  })
  it('when an Activation ends the next un-acted hero, left to right, begins; the acted one cannot be chosen again', () => {
    const { box, P } = start(); P.next()
    const first = box.s.ctx.battleCursor!.actor!
    expect(P.input({ kind: 'end-activation' })).toBe(true)
    expect(box.s.ctx.battleCursor?.at).toBe('selecting')
    const q = eligible(box.s)
    expect(q).not.toContain(first)
    expect(P.next()).toBe(true)
    expect(box.s.ctx.battleCursor?.actor, 'the leftmost hero yet to act').toBe(q[0])
    expect(P.input({ kind: 'choose', id: first })).toBe(false)
    /* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
       letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): the note was held to the engine's marked name (`unit.name`). The
       claim is unchanged - the plain line names the unit - and the name is the engine's less its mark (viewer src/names.js shownName). */
    expect(P.facts().note).toBe(`${shownName(box.s.ctx.state.units[first]!.name)} has already acted this Phase.`)
  })
  it('after the Enemy Phase the Hero Phase begins its first un-acted hero again', () => {
    const { box, P } = start(); P.next()
    expect(P.input({ kind: 'end-turn' })).toBe(true)
    if (box.s.ctx.state.outcome) return
    expect(box.s.ctx.state.turn).toBe(2); expect(box.s.ctx.battleCursor?.at).toBe('selecting')
    const q = eligible(box.s)
    expect(P.next()).toBe(true)
    expect(box.s.ctx.battleCursor?.actor, 'the leftmost hero, not the one after the last to act').toBe(q[0])
    expect(P.facts().slot).toBe(basicMove(box.s, box.s.ctx.battleCursor!.actor!))
  })
})
