// capability.set-bonus (engine item, 2026-10-05; engine/DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: …
// set bonus"). The item's words: "The kingdom's Equip screen and the item card show the line and the count it is at." The
// card says the set line in the Codex's own words (a card is the item's, whoever holds it); the count it is at is the hero's
// and stands on the Equip screen (test/equip-screen.test.ts, test/isc-063.test.ts) - read from the ENGINE's count, which the
// battle fights.
import { describe, it, expect } from 'vitest'
import { itemCardOf } from '../src/content/item-card.js'
import { itemOf } from '../src/content/items.js'
import { resolveSetsOf } from '../src/core/sets.js'
import { setLinesOf, ITEMS } from '../src/engine.js'

const LINES: Record<string, string> = {
  'item.staff-of-the-magi': '+1 Magic for every RING you are wearing.',
  'item.staff-of-the-destroyer': '+1 damage for every DESTROYER item you carry.',
  'item.staff-of-the-ultimate-destroyer': '+1 damage for every DESTROYER item you carry.',
  'item.chains-of-the-wrathful': '+1 Precision for every CHAIN item you carry.',
  'item.book-of-karma': '+1 Resist for every BOOK you carry.',
}

describe('the set line is on the item\'s card, and the count is the engine\'s', () => {
  it('each of the five set rows says its set line on its card, in the Codex\'s words; an item with none says none', () => {
    for (const [id, line] of Object.entries(LINES)) expect(itemCardOf(id).lines, id).toContain(`Set bonus: ${line}`)
    expect(itemCardOf('item.longsword').lines.some((l) => l.startsWith('Set bonus'))).toBe(false)
  })
  it('the kingdom\'s lines are the engine\'s own count over the same items - one rule, one home', () => {
    const carried = ['item.chains-of-the-wrathful', 'item.chains-of-the-faithful', 'item.book-of-karma', 'item.ancient-tome', 'item.blink-ring']
    expect(resolveSetsOf(carried.map(itemOf))).toEqual(setLinesOf(carried.map((id) => ITEMS[id]!)))
    // the rings bear the tag the Staff of the Magi counts
    expect(itemOf('item.blink-ring').sets).toEqual(['ring'])
    expect(itemOf('item.ring-of-divine-protection').sets).toEqual(['ring'])
    expect(resolveSetsOf(['item.staff-of-the-magi', 'item.blink-ring', 'item.ring-of-divine-protection'].map(itemOf))).toEqual([{ itemId: 'item.staff-of-the-magi', tag: 'ring', shape: 'for-every', count: 2, stats: { magic: 2 }, attackDamage: 0 }])
  })
})
