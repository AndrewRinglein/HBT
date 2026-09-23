// plumbing.shield-class — V2 R1 part 1 (2026-09-23; Andrew: "V2 R1 goes to the top").
// A shield is its own item class. It is held: it shares the two hands with weapons,
// its Block and powers fold only when it is handed to the unit, and a shield in an
// item slot is stowed like a slot weapon. No content carries the class yet
// (content.v2-shields does), so the fixture shield below is the knight shield's own
// row with the class and a Block value set — every other field is authored.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyItems } from '../src/core/items.js'
import { itemsOf, stowedWeapons, type ScheduleHero } from '../src/sim/progression.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import type { ItemDef } from '../src/core/types.js'

// Law 10, 2026-09-23 (v2.shields): item.knight-shield retired with V2 R1, so the fixture's
// authored base is now the Kite Shield — the fixture's own class and Block values are unchanged.
const knight = ITEMS['item.kite-shield']!
const shield: ItemDef = { ...knight, id: 'item.test-shield', itemClass: 'shield', statModifiers: { ...knight.statModifiers, block: 20, rangedBlock: 5 } }
const second: ItemDef = { ...shield, id: 'item.test-shield-2' }
const items: Record<string, ItemDef> = { ...ITEMS, [shield.id]: shield, [second.id]: second }
const warrior = UNITS['hero.base.warrior-iron']!

describe('the shield item class', () => {
  it('a held shield folds its Block and Ranged Block and grants its powers', () => {
    const bare = applyItems(warrior, ['item.longsword'], items, ACTIONS, 'test').def
    const held = applyItems(warrior, ['item.longsword', shield.id], items, ACTIONS, 'test').def
    expect((held.block ?? 0) - (bare.block ?? 0)).toBe(20)
    expect((held.rangedBlock ?? 0) - (bare.rangedBlock ?? 0)).toBe(5)
    for (const p of shield.abilities) expect(held.abilities, p).toContain(p)
  })

  it('a shield and a one-handed weapon fit in two hands', () => {
    expect(ITEMS['item.longsword']!.hands).toBe(1)
    expect(() => applyItems(warrior, ['item.longsword', shield.id], items, ACTIONS, 'test')).not.toThrow()
  })

  it('a shield with a two-handed weapon, or two shields with a weapon, is refused and names the unit', () => {
    const twoHander = Object.values(ITEMS).find((i) => i.itemClass === 'weapon' && i.hands === 2 && (!i.classRestriction || i.classRestriction === 'class.warrior'))!
    expect(() => applyItems(warrior, [twoHander.id], items, ACTIONS, 'test')).not.toThrow()
    expect(() => applyItems(warrior, [twoHander.id, shield.id], items, ACTIONS, 'test'))
      .toThrow(/hero\.base\.warrior-iron would hold more than two hands of weapons and shields/)
    expect(() => applyItems(warrior, ['item.longsword', shield.id, second.id], items, ACTIONS, 'test'))
      .toThrow(/hero\.base\.warrior-iron would hold more than two hands/)
  })

  it('a shield in an item slot is stowed, not fielded — no backpack Block', () => {
    const hero = {
      equipment: { hands: [{ id: 'item.longsword' }], armor: null, slots: [{ id: shield.id }] },
    } as unknown as ScheduleHero
    expect(itemsOf(hero, items)).not.toContain(shield.id)
    expect(stowedWeapons(hero, items)).toEqual([shield.id])
    const fielded = applyItems(warrior, itemsOf(hero, items), items, ACTIONS, 'test').def
    const bare = applyItems(warrior, ['item.longsword'], items, ACTIONS, 'test').def
    expect(fielded.block ?? 0).toBe(bare.block ?? 0)
  })
})

describe('the pack validator', () => {
  afterEach(() => { vi.doUnmock('../src/content/generated/pack.js'); vi.resetModules() })
  const row = (itemClass: string) => ({ ...knight, id: 'item.test-shield', itemClass, grants: [], abilities: [], triggers: [], statModifiers: { block: 10 } })

  it('accepts itemClass shield', async () => {
    vi.resetModules()
    vi.doMock('../src/content/generated/pack.js', async (orig) => { const m = await orig<{ UNIT_PACK: object }>(); return { UNIT_PACK: { ...m.UNIT_PACK, items: { 'item.test-shield': row('shield') } } } })
    const { packItems } = await import('../src/content/pack.js')
    expect(packItems({}, {})['item.test-shield']!.itemClass).toBe('shield')
  })

  it('still refuses an unknown class', async () => {
    vi.resetModules()
    vi.doMock('../src/content/generated/pack.js', async (orig) => { const m = await orig<{ UNIT_PACK: object }>(); return { UNIT_PACK: { ...m.UNIT_PACK, items: { 'item.test-shield': row('buckler') } } } })
    const { packItems } = await import('../src/content/pack.js')
    expect(() => packItems({}, {})).toThrow(/item pack: 'item\.test-shield' has itemClass 'buckler'/)
  })
})
