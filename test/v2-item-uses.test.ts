// v2.item-uses — V2 R6 part 3 (V2-ROADMAP.md R6: "Duplicate item instances remain
// distinct … save/result/replay preserve instances and uses"; V2-IMPACT-MAP-2026-09-07
// §12.2 "applyItems — skip items marked spent", "Battle output … items spent";
// DUNGEON-MODE-2026-09-07.md §4 "The layer marks each one-time-use (or limited-use)
// item as spent; the re-field skips it"). A use belongs to the ITEM INSTANCE that
// granted the power, not to the power: two Healing Potions are two drinks, the log
// names which one was drunk, the result reports every instance's uses, and a
// fielding may hand in uses already spent (SWITCHES.md 'V2 item uses').
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canUsePower, usePower } from '../src/core/ability.js'
import { beginActivation } from '../src/core/mutate.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { performSwap } from '../src/core/swap.js'
import { ITEMS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const POTION = 'power.healing-potion.use'
const CURE = 'power.cure-poison.use'
const opts = scenarioOptions(scenarioDef('test.item-uses'))
const kit = (t: string) => [...(UNITS[t]!.defaultItems ?? [])]

describe('v2.item-uses — uses belong to the item instance', () => {
  it('two Healing Potions are two instances and two drinks; the log names the instance drunk', () => {
    const ctx = createBattle(opts)
    const w = ctx.state.units[0]!
    const k = kit('hero.base.warrior-iron').length
    const ids = [`${w.uid}/${k}`, `${w.uid}/${k + 1}`]
    expect(w.itemUses?.filter((e) => e.actionId === POTION).map((e) => [e.instanceId, e.itemId, e.left, e.used])).toEqual([
      [ids[0], 'item.healing-potion', 1, 0], [ids[1], 'item.healing-potion', 1, 0],
    ])
    expect(w.usesLeft[POTION]).toBe(2)
    w.hp = 1
    beginActivation(ctx, w.id, 'test')
    usePower(ctx, w.id, w.id, POTION)
    const first = ctx.events.filter((e) => e.type === 'charge.spent')
    expect(first.map((e) => [e['instanceId'], e['itemId'], e['instanceLeft'], e['left']])).toEqual([[ids[0], 'item.healing-potion', 0, 1]])
    expect(w.actions).toContain(POTION)                     // the second potion is still there
    expect(canUsePower(ctx, w.id, w.id, POTION)).toBe(true)
    usePower(ctx, w.id, w.id, POTION)
    const both = ctx.events.filter((e) => e.type === 'charge.spent')
    expect(both.map((e) => e['instanceId'])).toEqual(ids)
    expect(w.actions).not.toContain(POTION)
    expect(ctx.events.filter((e) => e.type === 'power.exhausted' && e.actor === w.id)).toHaveLength(1)
    const r = runBattle(ctx)
    expect(r.itemUses?.filter((x) => x.unit === w.id && x.power === POTION)).toEqual([
      { unit: w.id, instanceId: ids[0], itemId: 'item.healing-potion', power: POTION, used: 1, left: 0 },
      { unit: w.id, instanceId: ids[1], itemId: 'item.healing-potion', power: POTION, used: 1, left: 0 },
    ])
    expect(r.usesSpent.filter((x) => x.unit === w.id)).toEqual([{ unit: w.id, power: POTION, spent: 2 }])   // per power, as before
  })

  it('an instance handed in already spent is skipped at fielding and reported spent', () => {
    const ctx = createBattle(opts)
    const w = ctx.state.units[0]!, p = ctx.state.units[1]!
    const kw = kit('hero.base.warrior-iron').length, kp = kit('hero.base.priest-armored').length
    // the warrior's Cure Poison was spent before this battle: no power, no unit.equipped, named on unit.enter
    expect(w.actions).not.toContain(CURE)
    expect(w.itemUses?.find((e) => e.itemId === 'item.cure-poison')).toEqual({ instanceId: `${w.uid}/${kw + 2}`, itemId: 'item.cure-poison', actionId: CURE, left: 0, used: 0 })
    expect(ctx.events.some((e) => e.type === 'unit.equipped' && e.actor === w.id && e['itemId'] === 'item.cure-poison')).toBe(false)
    expect(ctx.events.find((e) => e.type === 'unit.enter' && e.actor === w.id)!['spent']).toEqual([`${w.uid}/${kw + 2}`])
    // the priest's is live; its Healing Potion was the spent one
    expect(p.actions).toContain(CURE)
    expect(p.usesLeft[POTION]).toBeUndefined()
    expect(p.actions).not.toContain(POTION)
    expect(ctx.events.find((e) => e.type === 'unit.enter' && e.actor === p.id)!['spent']).toEqual([`${p.uid}/${kp + 1}`])
    const r = runBattle(ctx)
    expect(r.itemUses?.find((x) => x.instanceId === `${w.uid}/${kw + 2}`)).toEqual({ unit: w.id, instanceId: `${w.uid}/${kw + 2}`, itemId: 'item.cure-poison', power: CURE, used: 0, left: 0 })
    expect(r.itemUses?.find((x) => x.instanceId === `${p.uid}/${kp + 1}`)).toMatchObject({ itemId: 'item.healing-potion', used: 0, left: 0 })
  })

  it('refuses a malformed incoming state loudly (Law 9)', () => {
    const withUsed = (used: (number[] | undefined)[]) => () => createBattle({ ...opts, heroItemsUsed: used })
    const kw = kit('hero.base.warrior-iron').length, kp = kit('hero.base.priest-armored').length
    expect(withUsed([[0]])).toThrow(/uses lists/)                                                    // one list per hero
    expect(withUsed([[0], new Array(kp + 2).fill(0)])).toThrow(/instances/)                         // one count per instance
    expect(withUsed([[1, ...new Array(kw + 2).fill(0)], undefined])).toThrow(/has no uses/)          // a permanent item has none to spend
    expect(withUsed([[...new Array(kw).fill(0), 2, 0, 0], undefined])).toThrow(/only 1/)             // more than it had
  })

  it('a swap leaves every instance its own count (swapLimits)', () => {
    const kw = kit('hero.base.warrior-iron').length, kp = kit('hero.base.priest-armored').length
    const ctx = createBattle({ ...opts, heroStowed: [['item.longsword'], undefined], heroItemsUsed: [[...new Array(kw).fill(0), 0, 0, 1, 0], [...new Array(kp).fill(0), 0, 1]] })
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    usePower(ctx, w.id, w.id, POTION)
    const before = structuredClone(w.itemUses)
    const sword = w.loadout!.stowed[0]!.instanceId
    performSwap(ctx, w.id, [sword])
    expect(w.itemUses).toEqual(before)
    expect(w.usesLeft[POTION]).toBe(1)
    expect(w.actions).toContain(POTION)
  })

  it('the instances and their uses survive a save and restore', () => {
    const ctx = createBattle(opts)
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    usePower(ctx, w.id, w.id, POTION)
    const back = restoreBattle(saveBattle(ctx), ctx)
    expect(back.state.units[0]!.itemUses).toEqual(w.itemUses)
    expect(runBattle(back)).toEqual(runBattle(ctx))
  })

  it('the rows the uses are seeded from are the Codex items and their powers', () => {
    expect(ITEMS['item.healing-potion']!.abilities).toContain(POTION)
    expect(ITEMS['item.cure-poison']!.abilities).toContain(CURE)
  })
})
