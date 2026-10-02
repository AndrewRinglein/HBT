// movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions are part of
// what's needed now"). The play input's half (src/ui/play-input.ts): the swap is in the plan facts for the hero acting —
// the sandbox's own engine-valid hand lists, the engine's swapCostOf, the engine's reason when there is none — and a
// click on one runs the engine's swap command; a power aimed at the hero alone is used from the bar, chosen then chosen
// again (kingdom SWITCHES playInputSwap, playInputSwapActing, playInputSelfPower). The built page, played through its
// DOM, is engine test/movement-swap-and-shields.test.ts over tools/swap-shields.verify.mjs.
import { describe, expect, it } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxSwapChoices } from '../src/core/sandbox.js'
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
  it('no swap while the hero is only proposed; once it acts, the engine\'s offer and cost', () => {
    const { s, P, id, me } = battle('hero.base.paladin-hunk')
    P.input({ kind: 'choose', id })
    expect(P.facts().swap).toBeUndefined()
    expect(P.input({ kind: 'swap', index: 0, unit: id })).toBe(false)
    expect(P.input({ kind: 'unit', id, hex: me().hex })).toBe(true)
    const offer = sandboxSwapChoices(s)
    expect(P.facts().swap).toEqual({ cost: offer.cost, choices: offer.choices.map((c) => ({ label: c.label })), why: null })
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
    expect(P.facts().swap).toEqual({ cost, choices: [], why: 'the swap of this activation is spent' })
    const m = s.ctx.events.length
    expect(P.input({ kind: 'swap', index: 0, unit: id })).toBe(false)
    expect(P.facts().note).toBe('Swap: the swap of this activation is spent.')
    expect(s.ctx.events.length).toBe(m)
    // another unit's swap is never taken for the one acting
    expect(P.input({ kind: 'swap', index: 0, unit: id + 100 })).toBe(false)
  })
})

describe('a shield power from the bar: chosen, then chosen again', () => {
  for (const [hero, power] of [['hero.base.paladin-hunk', 'power.kite-shield.shield-wall'], ['hero.base.priest-armored', 'power.round-shield.brace'], ['hero.base.warrior-iron', 'power.tower-shield.stand-tall']] as const) {
    it(power, () => {
      const { s, P, id, me } = battle(hero)
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
    const chaplain = s.ctx.state.units.find((u) => u.typeId === 'hero.base.priest-armored')!, power = 'power.round-shield.turn-aside'
    expect(P.proposal()).not.toBe(chaplain.id)
    const stamina = chaplain.stamina, n = s.ctx.events.length
    expect(P.input({ kind: 'slot', actionId: power, unit: chaplain.id })).toBe(true)
    expect([s.ctx.battleCursor?.at, s.ctx.battleCursor?.actor]).toEqual(['acting', chaplain.id])
    expect(P.facts().note).toBe(`${s.ctx.actions[power]!.name}: click it again, or the hero, to use it.`)
    expect(P.input({ kind: 'slot', actionId: power, unit: chaplain.id })).toBe(true)
    expect(s.ctx.events.slice(n).find((e) => e.type === 'power.used')).toMatchObject({ actor: chaplain.id, causeId: power })
    expect(s.ctx.state.units[chaplain.id]!.stamina).toBe(stamina - s.ctx.actions[power]!.staminaCost!)
  })
})
