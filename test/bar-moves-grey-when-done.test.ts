// viewer.bar-moves-grey-when-done (engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once the move is
// done, nothing else greys'). Andrew: "There should be a slight graying out of the move actions after move actions are
// completed." / "Just gray the moves out after a move is done." The play input's `moveDone` fact (src/ui/play-input.ts): the
// acting unit's move actions that are done for this Activation, read from the engine and never guessed — its unit has moved
// (the engine's moveUsed) and the engine lists no further use of that action (sandboxChoices: what validateBattleCommand
// takes). Before the unit moves nothing is done; a move the engine still takes is not done; a new Activation starts clean.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { isAttack, isMove } from '../src/engine.js'

function start() {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), { save: () => saveSandbox(box.s), restore: (saved) => { box.s = restoreSandbox(saved as string); return true } })
  P.next()
  return { box, P }
}
const me = (s: Sandbox) => s.ctx.state.units[s.ctx.battleCursor!.actor!]!
const movesOf = (s: Sandbox) => me(s).actions.filter((id) => { const a = s.ctx.actions[id]!; return isMove(a) && !isAttack(a) })
/** the move actions the engine would still take a use of, in either slot */
const offered = (s: Sandbox) => new Set(sandboxChoices(s).filter((c) => 'destination' in c.command).map((c) => c.command.actionId))
/** walk the acting unit to a hex of its reach: the hex clicked plans the walk, clicked again it walks */
function walk(P: ReturnType<typeof createPlayInput>, hex: number) { P.input({ kind: 'hex', hex }); P.input({ kind: 'hex', hex }) }

describe('the host says which move actions are done', () => {
  it('a hero beginning its Activation: nothing is done, whatever it has not yet used', () => {
    const { box, P } = start()
    expect(me(box.s)).toMatchObject({ moveUsed: false, primaryUsed: false })
    expect(P.facts().moveDone).toEqual([])
    expect(movesOf(box.s).length).toBeGreaterThan(1)
  })
  it('after a walk of one hex the engine still takes the rest of the basic move: it is not done', () => {
    const { box, P } = start(), u = me(box.s), [basic] = movesOf(box.s), g = box.s.ctx.geo
    const near = P.facts().reach.find((x) => g.distance(u.hex, x) === 1)!
    walk(P, near)
    expect(u).toMatchObject({ hex: near, moveUsed: true }); expect(u.movePointsLeft).toBeGreaterThan(0)
    expect(offered(box.s).has(basic!)).toBe(true)
    expect(P.facts().moveDone).toEqual([])
  })
  it('after its whole movement the basic move is done; a movement power the engine still takes is not; attacks and powers are never named', () => {
    const { box, P } = start(), u = me(box.s), moves = movesOf(box.s), [basic] = moves, g = box.s.ctx.geo
    const far = [...P.facts().reach].sort((x, y) => g.distance(u.hex, y) - g.distance(u.hex, x) || x - y)[0]!
    walk(P, far)
    expect(u).toMatchObject({ hex: far, moveUsed: true, movePointsLeft: 0 })
    const done = P.facts().moveDone!, still = offered(box.s)
    expect(done).toContain(basic)
    expect([...done].sort()).toEqual(moves.filter((id) => !still.has(id)).sort())      // exactly the moves the engine takes no use of
    expect(moves.some((id) => still.has(id)), 'another movement power is still taken (as the primary action)').toBe(true)
    for (const id of done) expect(isMove(box.s.ctx.actions[id]!) && !isAttack(box.s.ctx.actions[id]!)).toBe(true)
    // the next unit begins with nothing done
    P.input({ kind: 'end-activation' }); P.next()
    expect(me(box.s).id).not.toBe(u.id); expect(P.facts().moveDone).toEqual([])
  })
})
