// content.sets-count-holy-texts-and-heavy-chain (2026-10-06). Ruled 2026-10-05 (DECISIONS.md 'a prone unit only stands; … a
// set counts everything carried; …'): asked whether Holy Texts should count as a book and Heavy Chain as a chain for set
// bonuses - "8, yes." capability.set-bonus had left both uncounted because the `book` and `chain` TAGS are also what the Forge
// reads to say which enchantments a tier-1 row may take (SWITCHES setBonusTagsAdded). So the two rows say their set
// membership in a field the Forge does not read (`setMember`, content/mkenginepack.mjs setFieldsOf), and it reaches the
// engine's row as the same `setTags` every other member bears. What the Forge makes of both rows is exactly what it was.
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedPreview } from '../src/core/setup.js'
import { setLinesOf } from '../src/core/items.js'
import { effective } from '../src/core/stats.js'
import { ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const KARMA = 'item.book-of-karma', TEXTS = 'item.holy-texts', CHAINS = 'item.chains-of-the-wrathful', HEAVY = 'item.heavy-chain'
const PRIEST = 'hero.base.priest-armored'
const rows = (...ids: string[]) => ids.map((id) => ITEMS[id]!)

// The Forge's rows for the two items as they stood BEFORE this item was built (read from the pack at engine c3bbddb,
// content a5a0c28, 2026-10-06, before any row was touched): id | enchantment | tier. Nine book enchantments and nine chain
// enchantments are NOT among them, and the Holy Texts is still a melee weapon by the Forge's rule.
const FORGE_BEFORE: Record<string, string[]> = {
  [TEXTS]: ['item.holy-texts.cruel|enchant.cruel|t2', 'item.holy-texts.demon-slayer|enchant.demon-slayer|t3', 'item.holy-texts.heavens-edge|enchant.heavens-edge|t3', 'item.holy-texts.heavy|enchant.heavy|t2', 'item.holy-texts.holy-water|enchant.holy-water|t3', 'item.holy-texts.keen|enchant.keen|t2', 'item.holy-texts.masterwork||t2', 'item.holy-texts.undead-slayer|enchant.undead-slayer|t3'],
  [HEAVY]: ['item.heavy-chain.durable|enchant.durable|t3', 'item.heavy-chain.enduring|enchant.enduring|t3', 'item.heavy-chain.fleet|enchant.fleet|t2', 'item.heavy-chain.hale|enchant.hale|t2', 'item.heavy-chain.lucky|enchant.lucky|t2', 'item.heavy-chain.masterwork||t2', 'item.heavy-chain.might|enchant.might|t3', 'item.heavy-chain.nimble|enchant.nimble|t2', 'item.heavy-chain.runed|enchant.runed|t3', 'item.heavy-chain.warded|enchant.warded|t3'],
}
const forgeRowsOf = (base: string) => Object.values(ITEMS as Record<string, { id: string; base?: string; enchant?: string; tier: number }>)
  .filter((r) => r.base === base).map((r) => `${r.id}|${r.enchant ?? ''}|t${r.tier}`).sort()

describe('the two rows are members of the sets their names say', () => {
  it('Holy Texts is counted as a book and Heavy Chain as a chain item', () => {
    expect(ITEMS[TEXTS]!.setTags).toEqual(['book'])
    expect(ITEMS[HEAVY]!.setTags).toEqual(['chain'])
  })
  it('the Book of Karma with Holy Texts is two books: +2 Resist; the Chains of the Wrathful with Heavy Chain is two chain items: +2 Precision', () => {
    expect(setLinesOf(rows(KARMA, TEXTS))).toEqual([{ itemId: KARMA, tag: 'book', shape: 'for-every', count: 2, stats: { resist: 2 }, attackDamage: 0 }])
    expect(setLinesOf(rows(CHAINS, HEAVY))).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'for-every', count: 2, stats: { precision: 2 }, attackDamage: 0 }])
    // the two rows pay nothing themselves: they are counted, they do not count
    expect(setLinesOf(rows(TEXTS))).toEqual([])
    expect(setLinesOf(rows(HEAVY))).toEqual([])
  })
  it('fielded: a priest carrying the Book of Karma and Holy Texts has 2 more Resist than its items alone give, one carrying the Chains and Heavy Chain 2 more Precision', () => {
    // each side of a difference wears the same items but for the set's payer, so only the set's share is read
    const karma = fieldedPreview(PRIEST, { items: [KARMA] }), both = fieldedPreview(PRIEST, { items: [KARMA], stowed: [TEXTS] })
    expect(both.resist - karma.resist).toBe(1)                       // the Book alone is one book; with the Texts it is two
    const none = fieldedPreview(PRIEST, { items: [TEXTS] })
    expect(both.resist - none.resist).toBe(2)
    const chains = fieldedPreview(PRIEST, { items: [CHAINS] }), worn = fieldedPreview(PRIEST, { items: [CHAINS, HEAVY] })
    expect(worn.precision - chains.precision).toBe(1)
    const armorOnly = fieldedPreview(PRIEST, { items: [TEXTS, HEAVY] })
    expect(worn.precision - armorOnly.precision).toBe(2)
  })
  it('in a real battle the line is drawn for the item that pays, at the count of two', () => {
    // the set-bonus fielding (map.open, two zombies) with two priests in it: one holds the Book with the Texts stowed, one the Chains over Heavy Chain
    const base = { ...scenarioOptions(SCENARIOS['test.set-bonus']!), heroes: [PRIEST, PRIEST], heroHexes: [85, 101] }
    const ctx = createBattle({ ...base, heroItems: [[KARMA], [CHAINS, HEAVY]], heroStowed: [[TEXTS], []] })
    const [first, second] = ctx.state.units
    const lines = ctx.events.filter((e) => e.type === 'unit.modified').map((e) => [e.actor, e.causeId, e['stats'] ?? null])
    expect(lines).toContainEqual([first!.id, KARMA, { resist: 2 }])
    expect(lines).toContainEqual([second!.id, CHAINS, { precision: 2 }])
    const alone = createBattle({ ...base, heroItems: [[KARMA], [CHAINS]], heroStowed: [[], []] })
    expect(effective(ctx, first!, 'resist').value - effective(alone, alone.state.units[0]!, 'resist').value).toBe(1)
    expect(effective(ctx, second!, 'precision').value - effective(alone, alone.state.units[1]!, 'precision').value).toBe(1)
  })
})

describe('the Forge is as it was', () => {
  it('the Forge makes of Holy Texts and of Heavy Chain exactly the rows it made before - no book enchantment, no chain enchantment', () => {
    expect(forgeRowsOf(TEXTS)).toEqual(FORGE_BEFORE[TEXTS])
    expect(forgeRowsOf(HEAVY)).toEqual(FORGE_BEFORE[HEAVY])
  })
  it('and what the Forge makes of them is a member too, as every Forge row of a member is', () => {
    expect(ITEMS['item.holy-texts.keen']!.setTags).toEqual(['book'])
    expect(ITEMS['item.heavy-chain.warded']!.setTags).toEqual(['chain'])
    expect(setLinesOf(rows(KARMA, 'item.holy-texts.masterwork'))[0]).toMatchObject({ count: 2, stats: { resist: 2 } })
  })
  it('no other row gained or lost a set tag: the members of each set are these', () => {
    const bearing = (tag: string) => Object.values(ITEMS).filter((i) => i.setTags?.includes(tag) && i.id.split('.').length === 2).map((i) => i.id).sort()
    expect(bearing('book')).toEqual(['item.ancient-tome', 'item.book-of-exorcisms', 'item.book-of-karma', 'item.holy-texts', 'item.tome-of-forgotten-whispers'])
    expect(bearing('chain')).toEqual(['item.boarding-hook', 'item.chains-of-the-damned', 'item.chains-of-the-faithful', 'item.chains-of-the-wrathful', 'item.demon-whip', 'item.heavy-chain', 'item.priest-chain'])
    expect(bearing('ring')).toEqual(['item.blink-ring', 'item.ring-of-divine-protection'])
    expect(bearing('destroyer')).toEqual(['item.staff-of-the-destroyer', 'item.staff-of-the-ultimate-destroyer'])
  })
})
