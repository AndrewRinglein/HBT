// ISC-054 — the slot model is the ruled one: two hands take weapons only (a
// two-hander both); one armor; N item slots from the hero row plus the Backpack's;
// one idol, one Bloodrune, one relic; canEquip refuses a third hand with no slot
// left, a second armor, a second idol, an over-slot item and a class-restricted
// item on the wrong class.
// GEAR-DESIGN.md §1 · 2-ACTIONS-SETTLED.md 2026-09-02 (hands, slots)
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { loadoutOf, canEquip, whyNotEquip, performEquip } from '../src/core/shop.js'

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
    // Osric: longsword + knight shield in hand, two item slots — a dagger spills into a slot
    performEquip(ctx, OSRIC, 'item.dagger', 'test')
    expect(loadoutOf(ctx.campaign, OSRIC)).toMatchObject({ hands: ['item.longsword', 'item.knight-shield'], items: ['item.dagger'], itemSlots: { used: 1, max: 2 } })
    // a greatsword (2 hands) with one slot left: refused; after the Backpack (+2 slots for 1), it fits as two slots
    expect(canEquip(ctx.campaign, OSRIC, 'item.greatsword')).toBe(false)
    performEquip(ctx, OSRIC, 'item.backpack', 'test')
    expect(loadoutOf(ctx.campaign, OSRIC).itemSlots).toEqual({ used: 2, max: 4 })
    performEquip(ctx, OSRIC, 'item.greatsword', 'test')
    expect(loadoutOf(ctx.campaign, OSRIC).itemSlots).toEqual({ used: 4, max: 4 })
  })
})
