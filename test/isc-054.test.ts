// ISC-054 — the slot model is the ruled one: two hands take weapons only (a
// two-hander both); one armor; N item slots from the hero row plus the Backpack's;
// one idol, one Bloodrune, one relic; canEquip refuses a third hand with no slot
// left, a second armor, a second idol, an over-slot item and a class-restricted
// item on the wrong class.
// GEAR-DESIGN.md §1 · 2-ACTIONS-SETTLED.md 2026-09-02 (hands, slots)
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { loadoutOf, canEquip, whyNotEquip, performEquip } from '../src/core/shop.js'
import { fieldedItemsOf, slotCostOf } from '../src/core/loadout.js'
import { itemOf } from '../src/content/items.js'

const HUNTER = 'hero.base.ranger-aggressive', DWARF = 'hero.base.warrior-iron', OSRIC = 'hero.base.paladin-shiney'
const STASH = ['item.basic-armor', 'item.dagger', 'item.dagger', 'item.elfbow', 'item.shortbow', 'item.pilgrims-warding-stone', 'item.finger-of-saint-aldwyn', 'item.backpack', 'item.greatsword']

describe('ISC-054 — the slot model', () => {
  it('a hero enters with hands, armor and item slots read from the kit and the row', () => {
    const ctx = loadFixture((c) => { c.stash = [...STASH] })
    const hunter = loadoutOf(ctx.campaign, HUNTER)
    expect(hunter.hands).toEqual(['item.longbow']); expect(hunter.handsUsed).toBe(2)
    expect(hunter.armor).toBe('item.thick-hide')
    expect(hunter.items).toEqual([]); expect(hunter.itemSlots).toEqual({ used: 0, max: 1 })
    const dwarf = loadoutOf(ctx.campaign, DWARF)
    expect(dwarf.hands).toEqual(['item.tower-shield', 'item.war-axe']); expect(dwarf.armor).toBe('item.destroyed-mail')
    expect(dwarf.itemSlots.max).toBe(2)
  })
  it('refuses a second armor, a wrong-class weapon, a second idol and an over-slot item — and says why', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [...STASH] }), [HUNTER, DWARF, OSRIC])
    expect(canEquip(ctx.campaign, HUNTER, 'item.basic-armor')).toBe(false)
    expect(whyNotEquip(ctx.campaign, HUNTER, 'item.basic-armor')).toMatch(/armor/)
    expect(canEquip(ctx.campaign, DWARF, 'item.elfbow')).toBe(false)
    expect(whyNotEquip(ctx.campaign, DWARF, 'item.elfbow')).toMatch(/class\.ranger/)
    performEquip(ctx, DWARF, 'item.pilgrims-warding-stone', 'test')
    expect(canEquip(ctx.campaign, DWARF, 'item.finger-of-saint-aldwyn')).toBe(false)
    expect(whyNotEquip(ctx.campaign, DWARF, 'item.finger-of-saint-aldwyn')).toMatch(/idol/)
    // the Hunter: longbow in both hands, one item slot — a dagger takes it, a second dagger is over-slot
    performEquip(ctx, HUNTER, 'item.dagger', 'test')
    expect(loadoutOf(ctx.campaign, HUNTER).items).toEqual(['item.dagger'])
    expect(canEquip(ctx.campaign, HUNTER, 'item.dagger')).toBe(false)
    expect(whyNotEquip(ctx.campaign, HUNTER, 'item.dagger')).toMatch(/slot/)
  })
  it('hands are two weapon slots: a third weapon spills into an item slot, a two-hander needs two of something, and the Backpack widens the slots', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [...STASH] }), [HUNTER, DWARF, OSRIC])
    // Osric: longsword + kite shield in hand, two item slots — a dagger spills into a slot
    // Law 10, 2026-09-23 (v2.shields): the Knight Shield retired with V2 R1; this hero's kit carries the Kite Shield now. The claim is unchanged.
    performEquip(ctx, OSRIC, 'item.dagger', 'test')
    expect(loadoutOf(ctx.campaign, OSRIC)).toMatchObject({ hands: ['item.longsword', 'item.kite-shield'], items: ['item.dagger'], itemSlots: { used: 1, max: 2 } })
    // a greatsword (2 hands) with one slot left: refused; after the Backpack (+2 slots for 1), it fits as two slots
    expect(canEquip(ctx.campaign, OSRIC, 'item.greatsword')).toBe(false)
    performEquip(ctx, OSRIC, 'item.backpack', 'test')
    expect(loadoutOf(ctx.campaign, OSRIC).itemSlots).toEqual({ used: 2, max: 4 })
    performEquip(ctx, OSRIC, 'item.greatsword', 'test')
    expect(loadoutOf(ctx.campaign, OSRIC).itemSlots).toEqual({ used: 4, max: 4 })
  })
  // v2.shields (2026-09-23): the shield CLASS counts toward the two hands exactly as the
  // engine's applyItems counts it — beside a two-hander it is carried, never fielded,
  // so no backpack shield grants its Block or powers.
  // Law 10, 2026-09-24 (v2.loadout): 'left behind' became 'stowed' — COMBAT-V2 §11.1, the item
  // past the hands is carried as swap fodder and grants nothing. Same lists, same claim.
  it('a shield-class item takes a hand; past the hands it is stowed at fielding', () => {
    expect(itemOf('item.kite-shield').itemClass).toBe('shield')
    expect(slotCostOf(itemOf('item.kite-shield'))).toBe(1)
    expect(fieldedItemsOf(['item.longsword', 'item.kite-shield'])).toEqual({ fielded: ['item.longsword', 'item.kite-shield'], stowed: [] })
    expect(fieldedItemsOf(['item.greatsword', 'item.kite-shield'])).toEqual({ fielded: ['item.greatsword'], stowed: ['item.kite-shield'] })
    expect(fieldedItemsOf(['item.longsword', 'item.round-shield', 'item.tower-shield']).stowed).toEqual(['item.tower-shield'])
  })
})
