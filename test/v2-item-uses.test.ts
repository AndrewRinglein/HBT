// v2.item-uses, kingdom half (engine cdb2233, 2026-09-24). V2-ROADMAP.md R6: "Duplicate item
// instances remain distinct … save/result/replay preserve instances and uses".
// V2-IMPACT-MAP-2026-09-07 §12.4: per-hero spent items in the campaign record.
// DUNGEON-MODE-2026-09-07.md 2026-09-10: "Persist … spent item instances"; §4 "the re-field
// skips it". An instance, in the kingdom, is a hero's equipped slot; its uses spent are
// `hero.used`, parallel to `equipped`. The seam hands them to the engine (heroItemsUsed),
// folds what the battle spent back out of the log (result.itemUses), the one writer records
// it, the save keeps it, and leaving the battle restocks it (ISC-061).
import { describe, it, expect } from 'vitest'
import { battleOptionsOf, makeBattleState, makeBattleResult, resolveEngagement, type EngagementSpec } from '../src/core/seam.js'
import { fieldedItemsOf, instanceSlotsOf } from '../src/core/loadout.js'
import { loadFixture, toBattle, panelResult } from './walk.js'
import { setBattleOutcome } from '../src/core/mutate.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { saveOf, campaignOf } from '../src/core/campaign.js'
import { createBattle, runBattle } from '../src/engine.js'

const DWARF = 'hero.base.warrior-iron'
const POTION = 'item.healing-potion', CURE = 'item.cure-poison'
const KIT = ['item.war-axe', 'item.tower-shield', 'item.destroyed-mail']

describe('v2.item-uses — the kingdom carries each instance\'s uses in and out', () => {
  it('instanceSlotsOf names each engine instance\'s equipped slot, handed then stowed', () => {
    const eq = ['item.greatsword', POTION, 'item.kite-shield', POTION]
    const f = fieldedItemsOf(eq)
    expect(f.fielded).toEqual(['item.greatsword', POTION, POTION])
    expect(f.stowed).toEqual(['item.kite-shield'])
    expect(instanceSlotsOf(eq)).toEqual([0, 1, 3, 2])
    expect(instanceSlotsOf(eq).map((k) => eq[k])).toEqual([...f.fielded, ...f.stowed])
  })

  it('makeBattleState hands the engine the uses already spent, in instance order', () => {
    const roster = { h: { unitType: DWARF, equipped: [...KIT, POTION, POTION, CURE], used: [0, 0, 0, 0, 1, 1] } }
    const spec = makeBattleState(roster, { id: 'test.item-uses', mapId: 'map.open', enemies: ['unit.zombie'], deployed: ['h'], seed: 3 })
    expect(spec.heroItemsUsed).toEqual([[0, 0, 0, 0, 1, 1]])
    const u = createBattle(battleOptionsOf(spec)).state.units.find((x) => x.side === 'hero')!
    expect(u.usesLeft['power.healing-potion.use']).toBe(1)          // one potion left of two
    expect(u.actions).not.toContain('power.cure-poison.use')         // the spent Cure Poison is skipped
    // nothing used: no list at all, so every older fielding is unchanged
    const bare = makeBattleState({ h: { unitType: DWARF, equipped: [...KIT, POTION] } }, { id: 'x', mapId: 'map.open', enemies: ['unit.zombie'], deployed: ['h'], seed: 3 })
    expect(bare.heroItemsUsed).toBeUndefined()
  })

  it('the fold reads each instance\'s spend from the log, and agrees with the engine', () => {
    const f = fieldedItemsOf([...KIT, POTION, POTION])
    const spec: EngagementSpec = { id: 'test.item-uses', mapId: 'map.open', seed: 0, heroes: [DWARF], enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.zombie'], heroItems: [f.fielded], heroStowed: [f.stowed] }
    let found = null as null | ReturnType<typeof resolveEngagement>
    for (let seed = 0; seed < 12 && !found; seed++) { const r = resolveEngagement({ ...spec, seed }); if ((r.result.itemUses ?? []).length === 2) found = r }
    expect(found, 'a seed where the dwarf drinks both potions').not.toBeNull()
    const rows = found!.result.itemUses!
    expect(rows.map((r) => [r.index, r.instance, r.itemId, r.used])).toEqual([[0, 3, POTION, 1], [0, 4, POTION, 1]])
    // the fold reads only the log
    expect(makeBattleResult(spec, found!.events).itemUses).toEqual(rows)
  })

  it('the one writer records the spend per instance; the save keeps it; the next fielding skips it; leaving restocks', () => {
    const ctx = toBattle(loadFixture(), 1)
    const e = ctx.campaign.cursor.engagement!
    const heroId = e.deployed[0]!
    const h = ctx.campaign.roster[heroId]!
    h.equipped = [...h.equipped, POTION, POTION]
    const slot = h.equipped.length - 1                         // the second potion
    const n = instanceSlotsOf(h.equipped).indexOf(slot)
    const r = { ...panelResult(ctx, true), itemUses: [{ index: 0, instance: n, itemId: POTION, used: 1 }] }
    const k = resolveReckoning(ctx.campaign, e, r)
    setBattleOutcome(ctx, r, k, 'test')
    applyBattleResult(ctx, e, r, k)
    expect(h.used?.[slot]).toBe(1)
    expect(h.used?.filter((x) => x > 0)).toEqual([1])          // only that instance
    expect(ctx.campaign.cursor.spent).toEqual([POTION])        // ISC-061's record, unchanged in shape
    const ev = ctx.events.filter((x) => x.type === 'item.spent').at(-1)!
    expect([ev['heroId'], ev['slot'], ev['itemId'], ev['used']]).toEqual([heroId, slot, POTION, 1])
    // the save keeps it
    const back = campaignOf(saveOf(ctx.campaign))
    expect(back.roster[heroId]!.used).toEqual(h.used)
    // the next fielding hands it in: the engine skips that potion and keeps the other
    const spec = makeBattleState(back.roster, { ...e, id: 'test.next' })
    const u = createBattle(battleOptionsOf(spec)).state.units.find((x) => x.side === 'hero')!
    expect(u.itemUses?.filter((x) => x.itemId === POTION).map((x) => x.left)).toEqual([1, 0])   // the first potion whole, the second spent
    // leaving the battle restocks every instance
    performExitBattle(ctx, 'test')
    expect(h.used).toBeUndefined()
  })

  it('the writer refuses a spend that names the wrong item or more than it had (Law 9)', () => {
    const ctx = toBattle(loadFixture(), 1)
    const e = ctx.campaign.cursor.engagement!
    const h = ctx.campaign.roster[e.deployed[0]!]!
    h.equipped = [...h.equipped, POTION]
    const n = instanceSlotsOf(h.equipped).indexOf(h.equipped.length - 1)
    for (const bad of [{ index: 0, instance: n, itemId: CURE, used: 1 }, { index: 0, instance: n, itemId: POTION, used: 2 }]) {
      const c2 = toBattle(loadFixture(), 1)
      c2.campaign.roster[e.deployed[0]!]!.equipped = [...h.equipped]
      const r = { ...panelResult(c2, true), itemUses: [bad] }
      const k = resolveReckoning(c2.campaign, c2.campaign.cursor.engagement!, r)
      setBattleOutcome(c2, r, k, 'test')
      expect(() => applyBattleResult(c2, c2.campaign.cursor.engagement!, r, k)).toThrow(/item uses/)
    }
  })

  it('the engine\'s own result reports per-instance uses through the door', () => {
    const f = fieldedItemsOf([...KIT, POTION])
    const ctx = createBattle(battleOptionsOf({ id: 't', mapId: 'map.open', seed: 1, heroes: [DWARF], enemies: ['unit.zombie'], heroItems: [f.fielded], heroStowed: [f.stowed] }))
    const r = runBattle(ctx)
    expect(r.itemUses?.map((x) => x.itemId)).toEqual([POTION])
  })
})
