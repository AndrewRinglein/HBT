// capability.placed-traps (engine item, 2026-10-05; engine/DECISIONS.md 2026-10-04 'every dead line on his items is a feature
// that is needed; his items stay in rewards': "All of those deadlines need to be added in as features that we need."). The
// kingdom's half of the item's expect: "Bear Traps places two traps within 3 for 1 Stamina once in a Battle … a second use is
// refused."
// The played battle offers the Bear Traps once for each empty hex within 3 of the hero (the engine's own list of hexes), for
// 1 Stamina, as the move or the primary action (an item's use takes either); ordered on a hex, a trap lies there and the same use is offered again for every other
// empty hex - for nothing - until the second trap is down, also after a save between the two; then it is offered no more.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { heroRowOf } from '../src/content/heroes.js'
import { createPlayInput } from '../src/ui/play-input.js'
import type { Hero } from '../src/core/campaign.js'

const HERO = 'hero.base.warrior-iron', TRAPS = 'item.bear-trap', USE = 'power.bear-trap.use'
function start(): { box: { s: Sandbox } } {
  const own = structuredClone(heroRowOf(HERO)) as unknown as Hero
  const row = { ...own, equipped: [...own.equipped, TRAPS] } as Hero
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [HERO], heroRows: [row], enemies: ['unit.zombie', 'unit.zombie'], seed: 1 }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), { save: () => saveSandbox(box.s), restore: (saved) => { box.s = restoreSandbox(saved as string); return true } })
  P.next()
  return { box }
}
const me = (s: Sandbox) => s.ctx.state.units[s.ctx.battleCursor!.actor!]!
const offers = (s: Sandbox) => sandboxChoices(s).filter((c) => c.command.actionId === USE)
const hexOf = (c: ReturnType<typeof offers>[number]) => (c.command as { hex: number }).hex

describe('Bear Traps in a played battle', () => {
  it('the battle offers them once for each empty hex within 3 of the hero, for 1 Stamina, as the move or the primary action', () => {
    const { box } = start(), s = box.s, u = me(s)
    expect(u.typeId).toBe(HERO)
    const offered = offers(s)
    expect(offered.length).toBeGreaterThan(0)
    for (const c of offered) {
      expect('hex' in c.command, 'aimed at a hex').toBe(true)
      const d = s.ctx.geo.distance(u.hex, hexOf(c))
      expect(d >= 1 && d <= 3).toBe(true)
      expect(s.ctx.state.units.some((o) => o.lifeState !== 'dead' && o.hex === hexOf(c))).toBe(false)
      expect([c.name, c.cost, c.preview]).toEqual(['Bear Traps', 1, null])
    }
    // each hex once for each of the two slots a use may take
    for (const slot of ['movement', 'primary']) { const of = offered.filter((c) => c.command.slot === slot).map(hexOf); expect(of.length).toBeGreaterThan(0); expect(new Set(of).size).toBe(of.length) }
  })

  it('ordered on a hex: a trap lies there; the same use is offered for every other empty hex, for nothing, until the second is down - also after a save between the two', () => {
    const { box } = start(), u = me(box.s)
    const first = offers(box.s).find((c) => c.command.slot === 'primary')!, stamina = u.stamina
    expect(commandSandbox(box.s, first.command)).toEqual({ ok: true })
    expect((box.s.ctx.state.traps ?? []).map((t) => [t.hex, t.side, t.by])).toEqual([[hexOf(first), 'hero', u.id]])
    expect(me(box.s).id).toBe(u.id)   // the primary action is spent and the Activation is still open: a trap is left to place
    expect(me(box.s).stamina).toBe(stamina - 1)
    // the second trap of the one use: every other hex still offered, at no cost, and never the hex that holds the first
    const second = offers(box.s)
    expect(second.length).toBeGreaterThan(0)
    expect(second.map(hexOf)).not.toContain(hexOf(first))
    for (const c of second) expect([c.cost, c.command.slot]).toEqual([0, 'primary'])
    box.s = restoreSandbox(saveSandbox(box.s))
    const again = offers(box.s)
    expect(again.map(hexOf)).toEqual(second.map(hexOf))
    expect(commandSandbox(box.s, { ...again[0]!.command, expectedSeq: box.s.ctx.state.seq })).toEqual({ ok: true })
    expect((box.s.ctx.state.traps ?? []).map((t) => t.hex)).toEqual([hexOf(first), hexOf(again[0]!)])
    const after = box.s.ctx.state.units[u.id]!
    expect(box.s.ctx.events.filter((e) => e.type === 'stamina.spent' && e.causeId === USE).map((e) => e['amount'])).toEqual([1])   // one use, 1 Stamina
    // both are down: the use is spent for the Battle and, the primary action being spent, the hero's Activation is over
    expect(after.usesLeft[USE]).toBe(0)
    expect(after.aiming).toBeUndefined()
    expect(box.s.ctx.battleCursor?.at === 'acting' && box.s.ctx.battleCursor.actor === u.id).toBe(false)
    expect(offers(box.s)).toEqual([])
  })
})
