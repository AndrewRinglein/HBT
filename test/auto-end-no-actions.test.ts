// viewer.auto-end-no-actions (engine DECISIONS.md 2026-10-03 'a player unit with nothing left it can do ends its Activation by
// itself: "No remaining actions possible."'). Andrew: "If a player unit completes its move and it has a remaining primary
// action and there is no attack target in range, and no other powers it can use. You should just auto-end its turn and put a
// notification on the screen: 'No remaining actions possible.'" The play input (src/ui/play-input.ts `rest()`, which the host
// calls whenever the board is still) on the Orphanage: after a player unit has done something, when the engine would accept
// nothing more from it but ending its Activation — no validated action (sandboxChoices: a move, an attack with a target, a
// power, a bonus move) and nothing stowed it may draw — the input sends the engine's own end-cycle and says so. A unit that
// has not acted, or that can still do anything, is left alone. Every legality is the engine's (validateBattleCommand).
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, sandboxSwapChoices, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput, NO_ACTIONS_LEFT } from '../src/ui/play-input.js'
import { isAttack } from '../src/engine.js'

function start() {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), {
    save: () => saveSandbox(box.s),
    restore: (saved) => { box.s = restoreSandbox(saved as string); return true },
  })
  return { box, P }
}
type Play = ReturnType<typeof start>
const actor = (b: Play['box']) => b.s.ctx.battleCursor?.at === 'acting' ? b.s.ctx.battleCursor.actor! : null
const unit = (b: Play['box'], id: number) => b.s.ctx.state.units[id]!
const isCivilian = (b: Play['box'], id: number) => /orphan|teacher/.test(unit(b, id).typeId)
const ended = (b: Play['box'], id: number) => b.s.ctx.events.filter((e) => e.type === 'activation.end' && (e as { actor?: number }).actor === id).length
/** a hex at the end of the armed move's longest walk (the engine's own paths): its FULL movement — a walk short of it leaves
    the rest to be walked as the primary, and then the unit has something left */
function farthest({ box, P }: Play) { const me = actor(box)!, reach = new Set(P.facts().reach)
  const walks = sandboxChoices(box.s).filter((c) => 'destination' in c.command && c.command.actor === me && c.command.slot === 'movement' && reach.has(c.command.destination))
  return (walks.sort((a, b) => b.path.length - a.path.length)[0]!.command as { destination: number }).destination }
function walkTo({ P }: Play, hex: number) { P.input({ kind: 'hex', hex }); expect(P.input({ kind: 'hex', hex })).toBe(true) }
/** begin units in turn, ending each with the button, until `want` is the one acting */
function until(p: Play, want: (id: number) => boolean) {
  for (let n = 0; n < 12; n++) { if (actor(p.box) === null) p.P.next(); const a = actor(p.box); if (a === null) throw Error('nobody is acting'); if (want(a)) return a; p.P.input({ kind: 'end-activation' }) }
  throw Error('no such unit came up')
}

describe('a player unit with nothing left it can do ends its Activation by itself', () => {
  it('the ruled words', () => { expect(NO_ACTIONS_LEFT).toBe('No remaining actions possible.') })
  it('a civilian that walks its full movement to a hex with no enemy in reach: the engine would take nothing more, and its Activation is ended', () => {
    const p = start(), { box, P } = p
    const me = until(p, (id) => isCivilian(box, id))
    expect(P.rest(), 'a unit that has not acted is never ended').toBe(false)
    walkTo(p, farthest(p))
    expect(actor(box)).toBe(me); expect(unit(box, me).primaryUsed, 'its primary action is still its own').toBe(false)
    expect(sandboxChoices(box.s), 'the engine lists no action it would accept').toEqual([])
    const before = box.s.ctx.events.length
    expect(P.rest()).toBe(true)
    expect(box.s.ctx.events.slice(before).map((e) => [e.type, (e as { actor?: number }).actor])).toEqual([['activation.end', me]])
    expect(actor(box), 'the engine waits for the next unit').toBeNull(); expect(box.s.ctx.battleCursor?.at).toBe('selecting')
    expect(P.rest(), 'nothing more to end').toBe(false)
    expect(P.next()).toBe(true); expect(actor(box)).not.toBe(me)
    expect(P.rest(), 'the next unit has not acted').toBe(false)
  })
  it('a hero with a usable shield power or a bonus move after moving is left alone', () => {
    const p = start(), { box, P } = p; P.next()
    const seen: string[] = []
    for (let n = 0; n < 3; n++) {
      const me = actor(box)!; expect(isCivilian(box, me)).toBe(false)
      walkTo(p, farthest(p))
      const left = sandboxChoices(box.s).map((c) => c.command.actionId)
      expect(left.length, `${unit(box, me).name} can still do something`).toBeGreaterThan(0)
      seen.push(...left)
      expect(P.rest()).toBe(false); expect(actor(box)).toBe(me); expect(ended(box, me)).toBe(0)
      P.input({ kind: 'end-activation' }); P.next()
    }
    expect(seen.some((id) => /shield/.test(id)), 'a shield power was among them').toBe(true)
    expect(seen.some((id) => box.s.ctx.actions[id]?.move), 'and a movement power in the primary slot').toBe(true)
  })
  it('the same walk ending beside an enemy leaves the unit acting, its attack offered', () => {
    const p = start(), { box, P } = p
    let found: { me: number; hex: number } | null = null
    for (let turn = 0; turn < 10 && !found && !box.s.ctx.state.outcome; turn++) {
      for (let n = 0; n < 8 && !found; n++) {
        if (actor(box) === null && !P.next()) break
        const me = actor(box)!
        if (isCivilian(box, me)) for (const h of P.facts().reach) { P.input({ kind: 'hex', hex: h }); if (P.facts().targets.length) { found = { me, hex: h }; break } P.input({ kind: 'back' }) }
        if (!found) P.input({ kind: 'end-activation' })
      }
      if (!found) { P.input({ kind: 'end-turn' }); P.next() }
    }
    expect(found, 'a civilian can walk to a hex from which the engine lists an attack').not.toBeNull()
    expect(P.input({ kind: 'hex', hex: found!.hex })).toBe(true)   // the second click: it walks
    expect(unit(box, found!.me).hex).toBe(found!.hex); expect(actor(box)).toBe(found!.me)
    const attacks = sandboxChoices(box.s).filter((c) => isAttack(box.s.ctx.actions[c.command.actionId]!) && 'target' in c.command)
    expect(attacks.length, 'the engine offers its attack').toBeGreaterThan(0)
    expect(P.rest()).toBe(false)
    expect(actor(box), 'still acting').toBe(found!.me)
  })
  it('a swap: putting away what is held is not a thing left to do; drawing what is stowed is', () => {
    const p = start(), { box, P } = p
    const enemies = () => box.s.ctx.state.units.filter((u) => u.side === 'enemy' && u.lifeState === 'standing')
    const near = (h: number) => Math.min(...enemies().map((e) => box.s.ctx.geo.distance(h, e.hex)))
    /** the unit's full walks, the engine's own, those ending farthest from every enemy first */
    const walks = () => { const all = sandboxChoices(box.s).filter((c) => 'destination' in c.command && c.command.slot === 'movement'), longest = Math.max(...all.map((c) => c.path.length))
      return all.filter((c) => c.path.length === longest).sort((x, y) => near((y.command as { destination: number }).destination) - near((x.command as { destination: number }).destination)) }
    // Turn 1: each civilian stows its dagger (the engine's swap), walks its full movement away, and has nothing left — the
    // swap is spent for this Activation, so nothing stowed can be drawn: ended
    const stowed: number[] = []
    for (let n = 0; n < 8 && box.s.ctx.state.turn === 1; n++) {
      if (actor(box) === null && !P.next()) break
      const me = actor(box)!
      if (!isCivilian(box, me)) { P.input({ kind: 'end-activation' }); continue }
      const empty = sandboxSwapChoices(box.s).choices.findIndex((c) => c.hands.length === 0)
      expect(empty, 'the engine lets it put its weapon away').toBeGreaterThanOrEqual(0)
      expect(P.input({ kind: 'swap', index: empty, unit: me })).toBe(true)
      expect(unit(box, me).loadout!.stowed.length).toBeGreaterThan(0)
      expect(P.rest(), 'it can still walk').toBe(false)
      walkTo(p, (walks()[0]!.command as { destination: number }).destination)
      expect(sandboxChoices(box.s)).toEqual([])
      expect(sandboxSwapChoices(box.s).choices, 'its one swap is spent').toEqual([])
      expect(P.rest()).toBe(true); expect(ended(box, me)).toBe(1)
      stowed.push(me)
    }
    expect(stowed.length).toBeGreaterThan(0)
    if (box.s.ctx.state.turn === 1) P.input({ kind: 'end-turn' })
    expect(box.s.ctx.state.turn).toBe(2)
    // Turn 2: one of them walks its full movement to where there is nothing to strike — but the engine would let it draw
    // the dagger it stowed, so it is left alone. The walk is the engine's; one that still leaves an action is taken back.
    let settled: number | null = null
    for (let n = 0; n < 8 && settled === null && box.s.ctx.state.turn === 2; n++) {
      if (actor(box) === null && !P.next()) break
      const me = actor(box)!
      if (stowed.includes(me) && unit(box, me).lifeState === 'standing') {
        const kept = saveSandbox(box.s)
        for (const c of walks()) {
          expect(commandSandbox(box.s, { ...c.command, expectedSeq: box.s.ctx.state.seq }).ok).toBe(true)
          if (actor(box) === me && sandboxChoices(box.s).length === 0) { settled = me; break }
          box.s = restoreSandbox(kept)
        }
      }
      if (settled === null) P.input({ kind: 'end-activation' })
    }
    expect(settled, 'a civilian with its dagger stowed walks to where it has nothing to strike').not.toBeNull()
    expect(sandboxSwapChoices(box.s).choices.some((c) => c.hands.length > 0), 'the engine would let it draw').toBe(true)
    expect(P.rest(), 'something stowed may still be drawn').toBe(false)
    expect(actor(box)).toBe(settled)
  })
  it('never while a question stands, and never anyone but the unit acting', () => {
    const p = start(), { box, P } = p; P.next()
    const me = actor(box)!
    walkTo(p, farthest(p))
    const other = box.s.ctx.state.units.find((u) => u.side === 'hero' && u.id !== me)!
    expect(P.input({ kind: 'choose', id: other.id })).toBe(true); expect(P.facts().ask).toBeTruthy()
    expect(P.rest()).toBe(false); expect(actor(box)).toBe(me)
  })
})
