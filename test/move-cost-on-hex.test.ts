// viewer.move-cost-on-hex (engine DECISIONS.md 2026-10-05 'playtest post: ...', 'the playtest post answered' and 'seven answers:
// ... an X on a hex that cannot be walked ...'). Andrew: "When you are in the movement phase, if there are squares in your
// movement area that cost 2 or can't be walked through, that number needs to be on the square." - an X: "6, yes".
// The play input's `reachBorder` fact (src/ui/play-input.ts): for the armed walk, every hex BORDERING the movement area (next
// to the unit's hex or a hex of its reach, outside the area, nobody standing on it) with the engine's answer for this unit -
// what the step onto it would cost (stepCost, the least from a hex of the area it may be entered from), or null when the
// engine lets it be entered from none (passableFor: impassable ground, a blocking prop). Held here against the engine
// itself, over the six opening battles as they open. A move that walks no path (a leap, a flight) names none.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT, SANDBOX_ENCOUNTERS } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { stepCost, passableFor } from '../src/engine.js'

function start(encounterId: string) {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), { save: () => saveSandbox(box.s), restore: (saved) => { box.s = restoreSandbox(saved as string); return true } })
  P.next()
  return { box, P }
}
const me = (s: Sandbox) => s.ctx.state.units[s.ctx.battleCursor!.actor!]!
/** the engine's own answer for every hex bordering an area, for this unit */
function engineBorder(s: Sandbox, reach: readonly number[]) {
  const u = me(s), ctx = s.ctx, area = new Set([u.hex, ...reach]), taken = new Set(ctx.state.units.filter((x) => x.lifeState !== 'dead').map((x) => x.hex))
  const passable = passableFor(ctx, u), out: { hex: number; cost: number | null }[] = []
  const border = new Set<number>(); for (const a of area) for (const n of ctx.geo.neighbours(a)) if (!area.has(n) && !taken.has(n)) border.add(n)
  for (const hex of [...border].sort((a, b) => a - b)) {
    const from = ctx.geo.neighbours(hex).filter((a) => area.has(a) && passable(hex, a))
    out.push({ hex, cost: from.length ? Math.min(...from.map((a) => stepCost(ctx, hex, a))) : null })
  }
  return out
}

describe('the host says what each hex bordering the movement area costs, and which cannot be entered', () => {
  it('for every hero of the six opening battles as they open: the border is the engine\'s - a cost, or null where the engine lets nobody in', () => {
    const opening = SANDBOX_ENCOUNTERS.map((e) => e.id).filter((id) => id.startsWith('encounter.opening.'))
    expect(opening.length).toBeGreaterThanOrEqual(6)
    let heroes = 0, blocked = 0, dear = 0, plain = 0
    for (const id of opening) {
      const { box, P } = start(id)
      for (let i = 0; i < 8; i++) {
        if (box.s.ctx.battleCursor?.at !== 'acting') break
        const f = P.facts(), u = me(box.s)
        if (f.reach.length && (f.reachCost ?? []).length) {
          expect(f.reachBorder, `${id} ${u.name}: the border is said`).toBeDefined()
          expect(f.reachBorder).toEqual(engineBorder(box.s, f.reach))
          for (const c of f.reachBorder!) { expect(f.reach).not.toContain(c.hex); if (c.cost === null) blocked++; else if (c.cost > 1) dear++; else plain++ }
          heroes++
        }
        const before = box.s.ctx.battleCursor!.actor
        P.input({ kind: 'end-activation' }); P.next()
        if (box.s.ctx.battleCursor?.actor === before) break
      }
    }
    expect(heroes).toBeGreaterThan(8)
    expect(blocked, 'somewhere a hero stands beside ground it cannot enter').toBeGreaterThan(0)
    expect(dear, 'and beside ground that costs more than one').toBeGreaterThan(0); expect(plain).toBeGreaterThan(0)
    console.log(`${heroes} heroes' movement areas read: ${blocked} bordering hexes cannot be entered, ${dear} cost more than one, ${plain} cost one`)
  }, 120000)
  it('a hex another unit stands on is not named; a move that walks no path names no border', () => {
    const { box, P } = start('encounter.opening.orphanage'), s = box.s, f = P.facts()
    const taken = new Set(s.ctx.state.units.filter((x) => x.lifeState !== 'dead').map((x) => x.hex))
    for (const c of f.reachBorder ?? []) expect(taken.has(c.hex), `hex ${c.hex}`).toBe(false)
    // a power that moves without a walk (the first of this hero's that the engine plans with no path), armed: no costs, no border
    const u = me(s), pathless = u.actions.find((a) => { const row = s.ctx.actions[a] as { move?: { shape?: string } } | undefined; return !!row?.move && row.move.shape !== 'path' })
    if (pathless) { P.input({ kind: 'slot', actionId: pathless, unit: u.id }); const g = P.facts()
      if (g.slot === pathless) { expect(g.reachCost ?? []).toEqual([]); expect(g.reachBorder ?? []).toEqual([]) } }
    expect(true).toBe(true)
  })
})
