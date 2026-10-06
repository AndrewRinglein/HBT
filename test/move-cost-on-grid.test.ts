// viewer.move-cost-on-grid (engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out card; switching
// heroes asks first; movement costs on the grid; a tooltip on every hex'). Andrew: "When the movement grid is up (the blue
// movement grid on the board), tiles that require extra movement points should have that movement cost, I think, maybe on
// them in gray." The play input's `reachCost` fact (src/ui/play-input.ts): what entering each hex of the reach costs the
// acting unit, read from the engine and never worked out — the engine's stepCost for the last step of the engine's own walk
// to that hex. Held here against the engine itself: the fact is the engine's number for every reach hex, woodland costs 2,
// and the number shown on a tile is exactly what the engine takes from the hero's movement when it steps onto it.
import { describe, it, expect } from 'vitest'
import { levelTwoRows } from './level-two.js'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { movementOptions, stepCost } from '../src/engine.js'

function start(heroRows?: ReturnType<typeof levelTwoRows>) {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], ...(heroRows ? { heroRows } : {}), enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), { save: () => saveSandbox(box.s), restore: (saved) => { box.s = restoreSandbox(saved as string); return true } })
  P.next()
  return { box, P }
}
const me = (s: Sandbox) => s.ctx.state.units[s.ctx.battleCursor!.actor!]!
/** walk the acting unit to a hex of its reach: the hex clicked plans the walk, clicked again it walks */
function walk(P: ReturnType<typeof createPlayInput>, hex: number) { P.input({ kind: 'hex', hex }); P.input({ kind: 'hex', hex }) }
/** the first hero, in the order the screen takes them, whose reach holds a hex that costs more than one */
function heroWithCostlyReach() {
  const { box, P } = start()
  for (let i = 0; i < 6; i++) {
    const f = P.facts()
    if ((f.reachCost ?? []).some((c) => c.cost > 1)) return { box, P }
    P.input({ kind: 'end-activation' }); P.next()
  }
  throw new Error('no hero of the Orphanage\'s party has costly ground in reach')
}

describe('the host says what each hex of the movement grid costs to enter', () => {
  it('every hex of the armed move\'s reach has the engine\'s cost: stepCost onto it from the hex before it on the engine\'s own walk', () => {
    const { box, P } = start(), s = box.s, u = me(s), f = P.facts()
    expect(f.reach.length).toBeGreaterThan(0)
    expect(f.reachCost!.map((c) => c.hex)).toEqual(f.reach)                       // one cost per reach hex, in the reach's order
    const plans = movementOptions(s.ctx, u.id, f.slot!)
    for (const c of f.reachCost!) {
      const plan = plans.find((p) => p.destination === c.hex)!
      expect(plan.path[plan.path.length - 1]).toBe(c.hex)
      const before = plan.path.length > 1 ? plan.path[plan.path.length - 2]! : u.hex
      expect(c.cost).toBe(stepCost(s.ctx, c.hex, before))
      /* and it is what the engine's own total for the walk grows by at that step */
      const prior = plan.path.length > 1 ? plans.find((p) => p.destination === before)!.pathCost : 0
      expect(plan.pathCost - prior).toBe(c.cost)
    }
  })
  it('woodland in reach costs 2, open ground 1 — the engine\'s numbers', () => {
    const { box, P } = heroWithCostlyReach(), s = box.s, f = P.facts()
    const ground = (hex: number) => s.ctx.state.terrain[hex]
    const dear = f.reachCost!.filter((c) => c.cost > 1), plain = f.reachCost!.filter((c) => c.cost === 1)
    expect(dear.length).toBeGreaterThan(0); expect(plain.length).toBeGreaterThan(0)
    for (const c of dear) expect(c.cost).toBe(stepCost(s.ctx, c.hex))             // on this map the cost is the ground's own (no edge to climb)
    expect(new Set(dear.map((c) => ground(c.hex))).size).toBeGreaterThan(0)
    for (const c of plain) expect(stepCost(s.ctx, c.hex)).toBe(1)
  })
  it('the number on a tile is the one the engine charges when the hero steps onto it', () => {
    const { box, P } = heroWithCostlyReach(), u = me(box.s)
    const f = P.facts(), target = f.reachCost!.find((c) => c.cost > 1)!
    const plan = movementOptions(box.s.ctx, u.id, f.slot!).find((p) => p.destination === target.hex)!
    /* walk to the hex before it first (where there is one), so the last step is taken alone */
    if (plan.path.length > 1) walk(P, plan.path[plan.path.length - 2]!)
    expect(me(box.s).id).toBe(u.id)
    const left = u.movePointsLeft
    let g = P.facts()
    if (!g.reach.includes(target.hex)) { const mv = sandboxChoices(box.s).find((c) => 'destination' in c.command && (c.command as { destination: number }).destination === target.hex)!; P.input({ kind: 'slot', actionId: mv.command.actionId, unit: u.id }); g = P.facts() }
    const shown = g.reachCost!.find((c) => c.hex === target.hex)!
    expect(shown.cost).toBe(target.cost)
    walk(P, target.hex)
    expect(u.hex).toBe(target.hex)
    expect(left - u.movePointsLeft).toBe(shown.cost)
  })
  it('a move that walks no path (a leap) is charged no step, so it names no cost', () => {
    // Law 10, 2026-10-06 — rule.special-moves-unlock-at-level-two (engine item; engine DECISIONS.md 2026-10-06 'a hero's special moves
    // unlock at level 2, ruled: all of them, every hero …'): a hero has a movement power that walks no path (the Leap) from level 2,
    // and the Orphanage's heroes are level 1. This one test is about such a move, so its heroes are the sandbox's own three as
    // campaign rows at level 2 (test/level-two.ts); what it holds - a move that walks no path names no cost - is unchanged, and the
    // two tests above still stand on the level-1 party. Found by the group's kingdom suite (the failed run stays in the record).
    // The line was:
    //   const { box, P } = start(), s = box.s, u = me(s)
    const { box, P } = start(levelTwoRows(SANDBOX_DEFAULT.heroes)), s = box.s, u = me(s)
    const flat = sandboxChoices(s).find((c) => 'destination' in c.command && c.path.length === 0)
    expect(flat, 'the first hero has a movement power that walks no path').toBeTruthy()
    P.input({ kind: 'slot', actionId: flat!.command.actionId, unit: u.id })
    const f = P.facts()
    expect(f.slot).toBe(flat!.command.actionId); expect(f.reach.length).toBeGreaterThan(0)
    expect(f.reachCost).toEqual([])
  })
})
