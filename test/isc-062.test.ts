// ISC-062 — set bonuses resolve in both shapes, over what is equipped: resolveSets
// counts equipped items per set on one hero: per-other pays per other member,
// at-count pays once at N including itself; an item may carry several sets;
// nothing in the stash counts; the payload is a unit stat or this-weapon damage,
// never damage-vs-tag.
// GEAR-DESIGN.md §5 (resolved 2026-09-03: a set is a TAG plus a setBonus block on the item that cares)
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { performEquip, performUnequip } from '../src/core/shop.js'
import { resolveSets, resolveSetsOf } from '../src/core/sets.js'
import { ITEMS, itemOf, type ItemRow } from '../src/content/items.js'

const CHAPLAIN = 'hero.base.priest-armored', DWARF = 'hero.base.warrior-iron'
const CHAINS = 'item.chains-of-the-wrathful', CHAIN_ARMOR = 'item.chains-of-the-faithful', PRIEST_CHAIN = 'item.priest-chain'

/** A row that exists nowhere in the codex — the reserved test kind, so the at-count shape is proven before content authors one. */
const row = (id: string, tags: string[], setBonus: ItemRow['setBonus'], itemClass: ItemRow['itemClass'] = 'trinket'): ItemRow => ({
  id, name: id, itemClass, tier: 1, hands: itemClass === 'weapon' ? 1 : 0, slots: 1, classRestriction: null, tags, sets: [], setBonus,
  uses: null, waystationBand: null, price: {}, equipCost: {}, statModifiers: {}, grants: [], base: null, enchant: null, source: 'codex',
})
/* Law 10, 2026-10-02 (kingdom.reads-engine, review finding K2): ItemRow lost attackModifiers — an enchant's attack numbers are the engine's, on its copied attack rows; the claim is unchanged. */

describe('ISC-062 — sets resolve over what is equipped', () => {
  it('per-other: the Chains of the Wrathful pay +1 Precision per OTHER chain item worn; the stash counts for nothing', () => {
    /* Law 10, 2026-10-03 (content.unfielded-tier0-weapons-cut): the Cart Chain was cut (engine DECISIONS.md 'eleven tier 0 weapons nobody fields are cut'); the chain item left in the stash is the Boarding Hook now. The claim is unchanged. */
    const ctx = toEquip(loadFixture((c) => { c.stash = [CHAINS, CHAIN_ARMOR, PRIEST_CHAIN, 'item.boarding-hook'] }), [CHAPLAIN, DWARF])
    /* Law 10, 2026-10-05 — capability.set-bonus (engine item; engine/DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … set bonus"): the four lines of this test that held the Chains as a PER-OTHER set read
         expect(itemOf(CHAINS).setBonus).toEqual({ tag: 'chain', each: { precision: 1 } })
         expect(resolveSets(ctx.campaign, CHAPLAIN)).toEqual([])                    // alone: no other chain item, nothing paid
         … toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'per-other', count: 1, stats: { precision: 1 }, attackDamage: 0 }])
         … toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'per-other', count: 2, stats: { precision: 2 }, attackDamage: 0 }])
       The row's own sentence is "+1 Precision for every CHAIN item you carry" and the Chains are a chain item: every member
       carried is counted, the carrier among them (the row's `withItself`; engine SWITCHES.md setBonusForEvery). The per-other
       wording (GEAR-DESIGN §5: "three slaying weapons → +2 each") is held on its own rows in the test added below. Counted
       over what is equipped, the spare in the item slot too, the stash never: unchanged. */
    expect(itemOf(CHAINS).setBonus).toEqual({ tag: 'chain', each: { precision: 1 }, withItself: true })
    // the Chaplain's hands and armor make way
    /* Law 10, 2026-09-23 (v2.shields): the Knight Shield retired with V2 R1; this hero's kit carries the Round Shield now. The claim is unchanged. */ performUnequip(ctx, CHAPLAIN, 'item.round-shield', 'test')
    performUnequip(ctx, CHAPLAIN, 'item.holy-texts', 'test')
    performEquip(ctx, CHAPLAIN, CHAINS, 'test')
    expect(resolveSets(ctx.campaign, CHAPLAIN)).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'for-every', count: 1, stats: { precision: 1 }, attackDamage: 0 }])   // alone: one chain item carried, itself
    performEquip(ctx, CHAPLAIN, CHAIN_ARMOR, 'test', 'item.pilgrims-habit')   // a chain armor: one other
    expect(resolveSets(ctx.campaign, CHAPLAIN)).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'for-every', count: 2, stats: { precision: 2 }, attackDamage: 0 }])
    performEquip(ctx, CHAPLAIN, PRIEST_CHAIN, 'test')                          // a spare chain weapon in the item slot: two others
    expect(resolveSets(ctx.campaign, CHAPLAIN)).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'for-every', count: 3, stats: { precision: 3 }, attackDamage: 0 }])
    expect(itemOf('item.boarding-hook').sets).toEqual(['chain'])
    expect(ctx.campaign.stash).toContain('item.boarding-hook')                 // a chain item in the stash — not counted
    expect(resolveSets(ctx.campaign, DWARF)).toEqual([])                       // another hero's gear never counts
  })
  /* Law 10, 2026-10-05 — capability.set-bonus (engine item; engine/DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … set bonus"): this test was titled "two Destroyer staffs each pay the other +1 damage on ITS attacks" and read
       { itemId: 'item.staff-of-the-destroyer', tag: 'destroyer', shape: 'per-other', count: 1, stats: {}, attackDamage: 1 }, (and the Ultimate's the same)
       expect(resolveSetsOf([itemOf('item.staff-of-the-destroyer')])).toEqual([])
     Their sentence is "+1 damage for every DESTROYER item you carry" and each is one: alone a staff pays itself +1, and with
     both carried each pays +2. On ITS attacks, not on the unit: unchanged. */
  it('this-weapon damage: a Destroyer staff pays +1 damage on ITS attacks for every destroyer item carried, itself among them - not on the unit', () => {
    const lines = resolveSetsOf([itemOf('item.staff-of-the-destroyer'), itemOf('item.staff-of-the-ultimate-destroyer')])
    expect(lines).toEqual([
      { itemId: 'item.staff-of-the-destroyer', tag: 'destroyer', shape: 'for-every', count: 2, stats: {}, attackDamage: 2 },
      { itemId: 'item.staff-of-the-ultimate-destroyer', tag: 'destroyer', shape: 'for-every', count: 2, stats: {}, attackDamage: 2 },
    ])
    expect(resolveSetsOf([itemOf('item.staff-of-the-destroyer')])).toEqual([{ itemId: 'item.staff-of-the-destroyer', tag: 'destroyer', shape: 'for-every', count: 1, stats: {}, attackDamage: 1 }])
  })
  it('per-other (GEAR-DESIGN §5: "three slaying weapons → +2 each"): a row worded for the OTHER members pays nothing alone and per other member worn', () => {
    const slaying = { tag: 'slaying', each: { attackDamage: 1 } }
    const three = [row('test.item.slaying-bow', ['slaying'], slaying, 'weapon'), row('test.item.slaying-sword', ['slaying'], slaying, 'weapon'), row('test.item.slaying-dagger', ['slaying'], slaying, 'weapon')]
    expect(resolveSetsOf([three[0]!])).toEqual([])
    expect(resolveSetsOf(three).map((l) => [l.itemId, l.shape, l.count, l.attackDamage])).toEqual(three.map((r) => [r.id, 'per-other', 2, 2]))
  })
  it('at-count: three shadows items pay +20 Crit once, including the item that carries the bonus; two pay nothing', () => {
    const cloak = row('test.item.cloak', ['shadows'], { tag: 'shadows', at: 3, once: { crit: 20 } }, 'armor')
    const mask = row('test.item.mask', ['shadows'], null)
    const boots = row('test.item.boots', ['shadows'], null)
    expect(resolveSetsOf([cloak, mask])).toEqual([])
    expect(resolveSetsOf([cloak, mask, boots])).toEqual([{ itemId: 'test.item.cloak', tag: 'shadows', shape: 'at-count', count: 3, stats: { crit: 20 }, attackDamage: 0 }])
    expect(resolveSetsOf([cloak, mask, boots, row('test.item.hood', ['shadows'], null)])).toEqual([{ itemId: 'test.item.cloak', tag: 'shadows', shape: 'at-count', count: 4, stats: { crit: 20 }, attackDamage: 0 }])
  })
  it('an item may carry several sets: a ring that is also plate counts for both', () => {
    const magi = row('test.item.magi', ['staff'], { tag: 'ring', each: { magic: 1 } }, 'weapon')
    const helm = row('test.item.helm', ['plate'], { tag: 'plate', each: { health: 2 } })
    const ringOfPlate = row('test.item.ring-of-plate', ['ring', 'plate'], null)
    const ring = row('test.item.ring', ['ring'], null)
    expect(resolveSetsOf([magi, helm, ringOfPlate, ring])).toEqual([
      { itemId: 'test.item.magi', tag: 'ring', shape: 'per-other', count: 2, stats: { magic: 2 }, attackDamage: 0 },
      { itemId: 'test.item.helm', tag: 'plate', shape: 'per-other', count: 1, stats: { health: 2 }, attackDamage: 0 },
    ])
  })
  it('the payload is a unit stat or this-weapon damage — never damage-vs-tag', () => {
    const withBonus = ITEMS.filter((r) => r.setBonus)
    expect(withBonus.length).toBeGreaterThanOrEqual(5)
    for (const r of withBonus) {
      const keys = Object.keys({ ...(r.setBonus!.each ?? {}), ...(r.setBonus!.once ?? {}) })
      expect(keys.length).toBeGreaterThan(0)
      for (const k of keys) expect(k).not.toMatch(/vs|slayer|against|tag/i)
    }
    // a set row's `sets` are the tags a codex setBonus names — the Destroyer staffs are destroyer set members
    expect(itemOf('item.staff-of-the-destroyer').sets).toEqual(['destroyer'])
    expect(itemOf('item.priest-chain').sets).toEqual(['chain'])
  })
})
