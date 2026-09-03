// ISC-055 — equip is a swap; unequip is real: equipping into a full slot moves
// the displaced item to the shared stash (item.unequipped then item.equipped);
// performUnequip returns any item to the stash; a starting item can be removed;
// the stash is one list any hero may draw from.
// 7-KINGDOM-SETTLED.md 2026-09-02 "the other thing bounces back out"
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { loadoutOf, canEquip, performEquip, performUnequip, canUnequip } from '../src/core/shop.js'

const HUNTER = 'hero.base.ranger-aggressive', DWARF = 'hero.base.warrior-iron'

describe('ISC-055 — swap and unequip', () => {
  it('a bow onto a hero whose hands are full swaps: the longbow bounces to the stash', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = ['item.shortbow'] }), [HUNTER, DWARF])
    expect(canEquip(ctx.campaign, HUNTER, 'item.shortbow')).toBe(false)                 // no room without a swap
    expect(canEquip(ctx.campaign, HUNTER, 'item.shortbow', 'item.longbow')).toBe(true)  // displacing the longbow
    const before = ctx.events.length
    performEquip(ctx, HUNTER, 'item.shortbow', 'test', 'item.longbow')
    expect(loadoutOf(ctx.campaign, HUNTER).hands).toEqual(['item.shortbow'])
    expect(ctx.campaign.stash).toEqual(['item.longbow'])
    expect(ctx.events.slice(before).map((e) => e.type)).toEqual(['item.unequipped', 'item.equipped'])
  })
  it('a starting item can be taken off; it goes to the shared stash; another hero may take it', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [] }), [HUNTER, DWARF])
    expect(canUnequip(ctx.campaign, HUNTER, 'item.thick-hide')).toBe(true)
    performUnequip(ctx, HUNTER, 'item.thick-hide', 'test')
    expect(loadoutOf(ctx.campaign, HUNTER).armor).toBeNull()
    expect(ctx.campaign.stash).toEqual(['item.thick-hide'])
    expect(ctx.events.filter((e) => e.type === 'item.unequipped').map((e) => [e['heroId'], e['itemId']])).toEqual([[HUNTER, 'item.thick-hide']])
    // the Dwarf swaps his mail for the hide
    performEquip(ctx, DWARF, 'item.thick-hide', 'test', 'item.destroyed-mail')
    expect(loadoutOf(ctx.campaign, DWARF).armor).toBe('item.thick-hide')
    expect(ctx.campaign.stash).toEqual(['item.destroyed-mail'])
    expect(() => performUnequip(ctx, HUNTER, 'item.thick-hide', 'test')).toThrow(/refused/)   // not his any more
  })
})
