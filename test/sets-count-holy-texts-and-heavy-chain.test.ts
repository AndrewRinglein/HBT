// content.sets-count-holy-texts-and-heavy-chain (engine item, 2026-10-06). Ruled 2026-10-05 (engine/DECISIONS.md 'a prone unit
// only stands; … a set counts everything carried; …'): asked whether Holy Texts should count as a book and Heavy Chain as a
// chain for set bonuses - "8, yes." Both rows say the set they are counted in by a field the Forge does not read (the codex
// row's `setMember`), so their TAGS - which say what the Forge may enchant - are as they were. Here: the row's `sets` are its
// set tags and its set memberships; the Equip screen's count (the engine's, core/sets.ts) and the item card's line follow.
import { describe, it, expect } from 'vitest'
import { itemCardOf } from '../src/content/item-card.js'
import { itemOf } from '../src/content/items.js'
import { resolveSetsOf } from '../src/core/sets.js'
import { setLinesOf, ITEMS } from '../src/engine.js'

const KARMA = 'item.book-of-karma', TEXTS = 'item.holy-texts', CHAINS = 'item.chains-of-the-wrathful', HEAVY = 'item.heavy-chain'

describe('Holy Texts is a book and Heavy Chain a chain item, for sets and for nothing else', () => {
  it('the rows say the set and keep their tags', () => {
    expect(itemOf(TEXTS).sets).toEqual(['book'])
    expect(itemOf(TEXTS).tags).toEqual(['holy'])
    expect(itemOf(HEAVY).sets).toEqual(['chain'])
    expect(itemOf(HEAVY).tags).toEqual(['armor', 'medium'])
    // what the Forge makes of either is a member too, and keeps the base's tags
    expect(itemOf('item.holy-texts.keen').sets).toEqual(['book'])
    expect(itemOf('item.heavy-chain.masterwork').sets).toEqual(['chain'])
  })
  it('the count the Equip screen shows: the Book of Karma with Holy Texts is two books, +2 Resist; the Chains of the Wrathful over Heavy Chain two chain items, +2 Precision', () => {
    expect(resolveSetsOf([KARMA, TEXTS].map(itemOf))).toEqual([{ itemId: KARMA, tag: 'book', shape: 'for-every', count: 2, stats: { resist: 2 }, attackDamage: 0 }])
    expect(resolveSetsOf([CHAINS, HEAVY].map(itemOf))).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'for-every', count: 2, stats: { precision: 2 }, attackDamage: 0 }])
    // and it is the engine's own count over the same items - one rule, one home
    expect(resolveSetsOf([KARMA, TEXTS, CHAINS, HEAVY].map(itemOf))).toEqual(setLinesOf([KARMA, TEXTS, CHAINS, HEAVY].map((id) => ITEMS[id]!)))
  })
  it('the item card names the set each is counted in', () => {
    expect(itemCardOf(TEXTS).facts).toContain('book set')
    expect(itemCardOf(HEAVY).facts).toContain('chain set')
  })
})
