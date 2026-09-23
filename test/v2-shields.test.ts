// v2.shields — V2 R1 end to end (2026-09-23; one item per feature, Andrew). The three
// shields, their six powers, weapon Block and the axe that cuts through shields, as
// published by the content pack. Numbers: V2-SHIELDS-AND-WEAPONS-2026-09-20.md; the
// power numbers are the provisional switch SWITCHES.md shieldPowerNumbers.
import { describe, expect, it } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation, endActivation, expireActivationMods } from '../src/core/mutate.js'
import { usePower } from '../src/core/ability.js'
import { effective } from '../src/core/stats.js'
import { applyItems } from '../src/core/items.js'
import { runBattle } from '../src/core/battle.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import type { Ctx } from '../src/core/types.js'

const KITE = 'item.kite-shield', ROUND = 'item.round-shield', TOWER = 'item.tower-shield'
const POWERS: Record<string, string[]> = {
  [KITE]: ['power.kite-shield.shield-wall', 'power.kite-shield.raise-guard'],
  [ROUND]: ['power.round-shield.turn-aside', 'power.round-shield.brace'],
  [TOWER]: ['power.tower-shield.cover', 'power.tower-shield.stand-tall'],
}
const warrior = UNITS['hero.base.warrior-iron']!

/** One Activation of unit `id`, then its end — the ladder's own order. */
function activate(ctx: Ctx, id: number, during?: () => void) {
  beginActivation(ctx, id, 'test'); during?.(); endActivation(ctx, id, 'test'); expireActivationMods(ctx, id, 'activation.end')
}

describe('the three shields, as the pack publishes them', () => {
  it('Kite +20/+5, Round +10/+10, Tower +15/+15 with -10 Dodge and -1 max Stamina — held beside a one-hander', () => {
    const bare = applyItems(warrior, ['item.longsword'], ITEMS, ACTIONS, 'test').def
    const want: Record<string, [number, number, number, number]> = { [KITE]: [20, 5, 0, 0], [ROUND]: [10, 10, 0, 0], [TOWER]: [15, 15, -10, -1] }
    for (const [id, [b, rb, dodge, stam]] of Object.entries(want)) {
      expect(ITEMS[id]!.itemClass, id).toBe('shield')
      const held = applyItems(warrior, ['item.longsword', id], ITEMS, ACTIONS, 'test').def
      expect((held.block ?? 0) - (bare.block ?? 0), id).toBe(b)
      expect((held.rangedBlock ?? 0) - (bare.rangedBlock ?? 0), id).toBe(rb)
      expect(held.dodge - bare.dodge, id).toBe(dodge)
      expect(held.maxStamina - bare.maxStamina, id).toBe(stam)
      for (const p of POWERS[id]!) expect(held.abilities, `${id} grants ${p}`).toContain(p)
    }
  })

  it('no unit kit and no item carries a retired shield', () => {
    for (const gone of ['item.knight-shield', 'item.buckler']) {
      expect(ITEMS[gone], gone).toBeUndefined()
      for (const u of Object.values(UNITS)) expect(u.defaultItems ?? [], `${u.typeId} carries ${gone}`).not.toContain(gone)
    }
    for (const gone of ['power.knight-shield.block', 'power.buckler.block-and-dodge']) expect(ACTIONS[gone], gone).toBeUndefined()
  })

  it('a Tower-carrying hero fields with its Block, -10 Dodge and -1 max Stamina in a real battle', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 120 }])
    const w = ctx.state.units[0]!
    const bare = applyItems(warrior, (warrior.defaultItems ?? []).filter((i) => i !== TOWER), ITEMS, ACTIONS, 'test').def
    expect(warrior.defaultItems).toContain(TOWER)
    expect(effective(ctx, w, 'block').value).toBeGreaterThanOrEqual(15)
    expect(w.dodge).toBe(bare.dodge - 10)
    expect(w.maxStamina).toBe(bare.maxStamina - 1)
  })
})

describe('shield powers last until the end of the holder\'s next Activation', () => {
  for (const [shield, [first, second]] of Object.entries(POWERS)) {
    it(`${first} and ${second} add their Block and are gone after the next Activation, not before`, () => {
      const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 140 }])
      const u = ctx.state.units[0]!
      u.actions.push(first!, second!); u.stamina = 99
      for (const p of [first!, second!]) {
        const effects = ACTIONS[p]!.effects!
        expect(effects.length, p).toBeGreaterThan(0)
        for (const e of effects) expect(e.kind === 'statMod' && e.until, p).toBe('endOfNextActivation')
      }
      const stat = (s: 'block' | 'rangedBlock' | 'armor') => effective(ctx, u, s).value
      const base = { block: stat('block'), rangedBlock: stat('rangedBlock'), armor: stat('armor') }
      const gain = (p: string) => { const g = { block: 0, rangedBlock: 0, armor: 0 }; for (const e of ACTIONS[p]!.effects!) if (e.kind === 'statMod') g[e.stat as keyof typeof g] += e.value; return g }
      const g = gain(first!)
      activate(ctx, u.id, () => usePower(ctx, u.id, u.id, first!))
      // the enemy's phase: still up
      expect(stat('block')).toBe(base.block + g.block); expect(stat('rangedBlock')).toBe(base.rangedBlock + g.rangedBlock); expect(stat('armor')).toBe(base.armor + g.armor)
      ctx.state.turn += 1
      activate(ctx, u.id)   // the next Activation — up through it, gone at its end
      expect([stat('block'), stat('rangedBlock'), stat('armor')]).toEqual([base.block, base.rangedBlock, base.armor])
      expect(ctx.events.filter((e) => e.type === 'statmod.expired' && e['source'] === first).length).toBe(ACTIONS[first!]!.effects!.length)
      expect(shield).toMatch(/^item\./)
    })
  }
})

describe('weapon Block and the axe', () => {
  it('swords and daggers add Block only, never Ranged Block', () => {
    for (const [id, b] of [['item.longsword', 5], ['item.greatsword', 10], ['item.dagger', 5]] as const) {
      expect(ITEMS[id]!.statModifiers.block, id).toBe(b)
      expect(ITEMS[id]!.statModifiers.rangedBlock ?? 0, id).toBe(0)
    }
  })

  function axeRig() {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
    tg.triggers = []; tg.hp = tg.maxHp = 100
    tg.mods.push({ stat: 'block', op: 'add', value: 15, source: 'test', scope: 'unit' }, { stat: 'rangedBlock', op: 'add', value: 10, source: 'test', scope: 'unit' })
    return { ctx, at, tg, axe: ACTIONS['attack.war-axe.chop'] ? 'attack.war-axe.chop' : at.actions.find((a) => a.startsWith('attack.war-axe'))! }
  }

  it('a blocked axe attack leaves the blocker 20 lower in Block and Ranged Block for the battle, never below 0', () => {
    const { ctx, tg, axe } = axeRig()
    tg.mods.push({ stat: 'block', op: 'add', value: 85, source: 'test.certain', scope: 'unit' })   // 100: the block is certain
    beginActivation(ctx, 0, 'test')
    expect(performAttack(ctx, 0, 1, axe).blocked).toBe(true)
    tg.mods = tg.mods.filter((m) => m.source !== 'test.certain')
    expect(effective(ctx, tg, 'block').value).toBe(15 - 20)
    expect(effective(ctx, tg, 'rangedBlock').value).toBe(10 - 20)
    ctx.state.turn += 10
    expect(effective(ctx, tg, 'block').value).toBe(-5)   // the whole battle
    // floored at 0 where it is read: the Block cup
    expect(preview(ctx, 0, 1, axe).blockChance).toBe(0)
    expect(ctx.events.filter((e) => e.type === 'statmod.added' && String(e.causeId).startsWith('trigger.war-axe.on-block')).length).toBe(2)
  })

  it('the axe is the attacker\'s: an axe-holder who blocks strips nothing', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    w.mods.push({ stat: 'block', op: 'add', value: 100, source: 'test.certain', scope: 'unit' })
    const before = z.mods.length
    beginActivation(ctx, 1, 'test')
    const bite = z.actions.find((a) => ctx.actions[a]?.attack)!
    expect(performAttack(ctx, 1, 0, bite).blocked).toBe(true)
    expect(z.mods.length).toBe(before)
    expect(ctx.events.some((e) => e.type === 'trigger.rolled' && String(e.causeId).startsWith('trigger.war-axe.on-block'))).toBe(false)
  })
})

describe('in real battles', () => {
  it('a shield-carrying hero blocks on the standard panel', () => {
    let blocked = 0
    for (let replicate = 0; replicate < 6 && !blocked; replicate++) {
      const ctx = createBattle({ replicate })
      runBattle(ctx)
      blocked += ctx.events.filter((e) => e.type === 'block.rolled' && e['blocked'] === true).length
    }
    expect(blocked).toBeGreaterThan(0)
  })
})
