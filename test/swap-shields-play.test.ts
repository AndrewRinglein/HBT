// movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions are part of
// what's needed now"). The play input's half (src/ui/play-input.ts): the swap is in the plan facts for the hero acting —
// the sandbox's own engine-valid hand lists, the engine's swapCostOf, the engine's reason when there is none — and a
// click on one runs the engine's swap command; a power aimed at the hero alone is used from the bar, chosen then chosen
// again (kingdom SWITCHES playInputSwap, playInputSwapActing, playInputSelfPower). The built page, played through its
// DOM, is engine test/movement-swap-and-shields.test.ts over tools/swap-shields.verify.mjs.
import { describe, expect, it } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxSwapChoices, sandboxSwapRefusals } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'

function battle(hero: string) {
  const s = createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [hero], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c) => commandSandbox(s, c))
  const id = s.ctx.state.units.find((u) => u.uid === s.policy.humanUnitUids[0])!.id
  return { s, P, id, me: () => s.ctx.state.units[id]! }
}

describe('the swap on the board, through the play input', () => {
  /* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed';
     kingdom SWITCHES playQueueProposal overturned): no hero is "only proposed" any more — a double-click (choose) begins it.
     was: P.input(choose) first, then no swap "while the hero is only proposed", then a click on it began it. Now: no swap
     before any hero is begun; begun by the choice, the engine's offer and cost at once */
  it('no swap before the hero is begun; once it acts, the engine\'s offer and cost', () => {
    const { s, P, id, me } = battle('hero.base.paladin-hunk')
    expect(P.facts().swap).toBeUndefined()
    expect(P.input({ kind: 'swap', index: 0, unit: id })).toBe(false)
    expect(P.input({ kind: 'choose', id })).toBe(true)
    expect(P.input({ kind: 'unit', id, hex: me().hex })).toBe(true)
    const offer = sandboxSwapChoices(s)
    /* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'): the fact as the gear panel needs it — each hand list with its instances, what the
       unit carries, and the arrangements the engine refuses. was: toEqual({ cost: offer.cost, choices:
       offer.choices.map((c) => ({ label: c.label })), why: null }) */
    const carried = [...me().loadout!.hands.map((i) => ({ instance: i.instanceId, item: i.itemId, name: s.ctx.items[i.itemId]!.name, held: true })),
      ...me().loadout!.stowed.map((i) => ({ instance: i.instanceId, item: i.itemId, name: s.ctx.items[i.itemId]!.name, held: false }))]
    expect(P.facts().swap).toEqual({ cost: offer.cost, choices: offer.choices.map((c) => ({ label: c.label, hands: c.hands })), why: null, carried, refused: sandboxSwapRefusals(s) })
  })
  it('a click on a hand list swaps through the engine; a second is refused with the engine\'s reason', () => {
    const { s, P, id, me } = battle('hero.base.paladin-hunk')
    P.input({ kind: 'choose', id }); P.input({ kind: 'unit', id, hex: me().hex })
    const stamina = me().stamina, cost = P.facts().swap!.cost, i = P.facts().swap!.choices.findIndex((c) => c.label === 'Longsword')
    const n = s.ctx.events.length
    expect(P.input({ kind: 'swap', index: i, unit: id })).toBe(true)
    expect(s.ctx.events.slice(n).filter((e) => e.type === 'loadout.swapped')).toHaveLength(1)
    expect(me().stamina).toBe(stamina - cost)
    expect(me().loadout!.hands.map((h) => h.itemId)).toEqual(['item.longsword'])
    /* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'): the same fact with what is carried now and every arrangement refused for the same
       reason. was: toEqual({ cost, choices: [], why: 'the swap of this activation is spent' }) */
    expect(P.facts().swap).toEqual({ cost, choices: [], why: 'the swap of this activation is spent',
      carried: [{ instance: me().loadout!.hands[0]!.instanceId, item: 'item.longsword', name: 'Longsword', held: true }, { instance: me().loadout!.stowed[0]!.instanceId, item: 'item.kite-shield', name: 'Kite Shield', held: false }],
      refused: sandboxSwapRefusals(s) })
    expect(sandboxSwapRefusals(s).every((r) => r.why === 'the swap of this activation is spent')).toBe(true)
    const m = s.ctx.events.length
    expect(P.input({ kind: 'swap', index: 0, unit: id })).toBe(false)
    expect(P.facts().note).toBe('Swap: the swap of this activation is spent.')
    expect(s.ctx.events.length).toBe(m)
    // another unit's swap is never taken for the one acting
    expect(P.input({ kind: 'swap', index: 0, unit: id + 100 })).toBe(false)
  })
})

describe('a shield power from the bar: chosen, then chosen again', () => {
  // Law 10, 2026-10-04 — content.shields-reauthored (engine item; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the three powers were typed by id
  // ('power.kite-shield.shield-wall', 'power.round-shield.brace', 'power.tower-shield.stand-tall') and the Ledger replaced them. The claim
  // is of a shield power that goes nowhere but its holder's own hex - aimed at the holder, or centred on it (the Round's Lock Shields:
  // kingdom SWITCHES playInputSelfCentredPower) - so each hero's is its shield's first such power, read from the engine's rows.
  for (const [hero, shield] of [['hero.base.paladin-hunk', 'item.kite-shield'], ['hero.base.priest-armored', 'item.round-shield'], ['hero.base.warrior-iron', 'item.tower-shield']] as const) {
    it(`${shield}: its power that goes nowhere but its holder's hex`, () => {
      const { s, P, id, me } = battle(hero)
      const power = s.ctx.items[shield]!.abilities.find((p) => { const t = s.ctx.actions[p]!.target as { select?: string; origin?: string } | undefined; return t?.select === 'self' || (t?.select === 'area' && (t.origin ?? 'self') === 'self') })!
      expect(power, shield).toBeDefined()
      P.input({ kind: 'choose', id }); P.input({ kind: 'unit', id, hex: me().hex })
      const n = s.ctx.events.length
      expect(P.input({ kind: 'slot', actionId: power, unit: id })).toBe(true)
      expect(P.facts().targets).toEqual([me().hex])
      expect(P.facts().note).toBe(`${s.ctx.actions[power]!.name}: click it again, or the hero, to use it.`)
      expect(s.ctx.events.length).toBe(n)
      expect(P.input({ kind: 'slot', actionId: power, unit: id })).toBe(true)
      const used = s.ctx.events.slice(n).find((e) => e.type === 'power.used')
      expect(used).toMatchObject({ actor: id, causeId: power, name: s.ctx.actions[power]!.name })
    })
  }
})

/* fix.shield-power-double-click (engine DECISIONS.md 2026-10-01 'a self power fires on a double-click on its bar button'):
   Andrew looked at the Battle Chaplain while the Iron Dwarf was proposed, and nothing on its bar did anything. A shield power
   on the bar of a hero only looked at begins it and is aimed at it; chosen again (the double-click's second offer), it is
   used (kingdom SWITCHES playQueueBarOrder). The real mouse on the built page is engine test/fix-shield-power-double-click.test.ts. */
describe('a shield power on the bar of a hero only looked at', () => {
  it('begins that hero, is aimed at it, and the second offer uses it', () => {
    const s = createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' })
    advanceSandbox(s)
    const P = createPlayInput(() => s, (c) => commandSandbox(s, c))
    // Law 10, 2026-10-04 (the note above): the Round Shield's first power, read from the engine's row (was 'power.round-shield.turn-aside')
    const chaplain = s.ctx.state.units.find((u) => u.typeId === 'hero.base.priest-armored')!, power = s.ctx.items['item.round-shield']!.abilities[0]!
    /* Law 10, viewer.turn-taking: proposal() is retired with playQueueProposal; upcoming() names who next() would begin */
    expect(P.upcoming()).not.toBe(chaplain.id)
    const stamina = chaplain.stamina, n = s.ctx.events.length
    expect(P.input({ kind: 'slot', actionId: power, unit: chaplain.id })).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', chaplain.id])
    expect(P.facts().note).toBe(`${s.ctx.actions[power]!.name}: click it again, or the hero, to use it.`)
    expect(P.input({ kind: 'slot', actionId: power, unit: chaplain.id })).toBe(true)
    expect(s.ctx.events.slice(n).find((e) => e.type === 'power.used')).toMatchObject({ actor: chaplain.id, causeId: power })
    expect(s.ctx.state.units[chaplain.id]!.stamina).toBe(stamina - s.ctx.actions[power]!.staminaCost!)
  })
})
