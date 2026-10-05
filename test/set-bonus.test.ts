// capability.set-bonus (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'his 28 reward weapons read back: … the mechanics his own
// items need are wanted'): "We need: … set bonus". GEAR-DESIGN.md §5 (resolved 2026-09-03) is the standing shape: a set is a TAG
// and the bonus a `setBonus` block on the item that cares, counted over what the hero has equipped - "per-other — for each
// *other* equipped member … (three → +2 each)" and "at-count — reached with N *including itself*". Five of his rows say
// "for every <TAG> item you carry / RING you are wearing": every member carried, the carrier too when it bears the tag.
//
// The engine holds the rule now (it was the kingdom's alone): an item row carries its set block and its set tags, the count is
// taken over everything the unit carries - in hand, stowed, worn - when it is fielded, and what the set pays reaches the unit
// as its unit mods (a stat, or damage on that weapon's own attacks), each naming the item that pays.
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef, fieldedPreview } from '../src/core/setup.js'
import { setLinesOf } from '../src/core/items.js'
import { effective } from '../src/core/stats.js'
import { partySum } from '../src/core/trigger.js'
import { preview } from '../src/core/pipeline.js'
import { ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { ItemDef } from '../src/core/types.js'

const CHAINS = 'item.chains-of-the-wrathful', FAITHFUL = 'item.chains-of-the-faithful', KARMA = 'item.book-of-karma', TOME = 'item.ancient-tome'
const MAGI = 'item.staff-of-the-magi', DESTROYER = 'item.staff-of-the-destroyer', ULTIMATE = 'item.staff-of-the-ultimate-destroyer'
const RINGS = ['item.blink-ring', 'item.ring-of-divine-protection']
const rows = (...ids: string[]) => ids.map((id) => ITEMS[id]!)
const row = (id: string, setTags: string[], setBonus?: ItemDef['setBonus']): Pick<ItemDef, 'id' | 'setTags' | 'setBonus'> => ({ id, setTags, ...(setBonus ? { setBonus } : {}) })

describe('the rows', () => {
  it('his five rows carry their set line as written - every member carried - and the members carry the tag it counts', () => {
    expect(ITEMS[MAGI]!.setBonus).toEqual({ tag: 'ring', each: { magic: 1 }, withItself: true })
    expect(ITEMS[DESTROYER]!.setBonus).toEqual({ tag: 'destroyer', each: { attackDamage: 1 }, withItself: true })
    expect(ITEMS[ULTIMATE]!.setBonus).toEqual({ tag: 'destroyer', each: { attackDamage: 1 }, withItself: true })
    expect(ITEMS[CHAINS]!.setBonus).toEqual({ tag: 'chain', each: { precision: 1 }, withItself: true })
    expect(ITEMS[KARMA]!.setBonus).toEqual({ tag: 'book', each: { resist: 1 }, withItself: true })
    const bearing = (tag: string) => Object.values(ITEMS).filter((i) => i.setTags?.includes(tag) && i.id.split('.').length === 2).map((i) => i.id).sort()
    expect(bearing('ring')).toEqual([...RINGS].sort())
    expect(bearing('destroyer')).toEqual([DESTROYER, ULTIMATE])
    for (const id of [CHAINS, FAITHFUL, 'item.chains-of-the-damned', 'item.priest-chain']) expect(ITEMS[id]!.setTags, id).toContain('chain')
    for (const id of [KARMA, TOME, 'item.book-of-exorcisms', 'item.tome-of-forgotten-whispers']) expect(ITEMS[id]!.setTags, id).toContain('book')
    // an item with no set line and no set tag carries neither field
    expect(ITEMS['item.longsword']!.setBonus).toBeUndefined()
    expect(ITEMS['item.longsword']!.setTags ?? []).toEqual([])
  })
})

describe('the count: one rule, three wordings', () => {
  it('"for every … you carry": every member carried, the carrier among them when it bears the tag', () => {
    expect(setLinesOf(rows(CHAINS))).toEqual([{ itemId: CHAINS, tag: 'chain', shape: 'for-every', count: 1, stats: { precision: 1 }, attackDamage: 0 }])
    expect(setLinesOf(rows(CHAINS, FAITHFUL))[0]).toMatchObject({ count: 2, stats: { precision: 2 } })
    expect(setLinesOf(rows(KARMA, TOME))).toEqual([{ itemId: KARMA, tag: 'book', shape: 'for-every', count: 2, stats: { resist: 2 }, attackDamage: 0 }])
    // the Staff of the Magi is not a ring: with no ring it pays nothing, with two it pays two
    expect(setLinesOf(rows(MAGI))).toEqual([])
    expect(setLinesOf(rows(MAGI, ...RINGS))).toEqual([{ itemId: MAGI, tag: 'ring', shape: 'for-every', count: 2, stats: { magic: 2 }, attackDamage: 0 }])
    // a Destroyer staff is a destroyer item: +1 on its own attacks alone, +2 each when both are carried
    expect(setLinesOf(rows(DESTROYER))).toEqual([{ itemId: DESTROYER, tag: 'destroyer', shape: 'for-every', count: 1, stats: {}, attackDamage: 1 }])
    expect(setLinesOf(rows(DESTROYER, ULTIMATE)).map((l) => [l.itemId, l.attackDamage])).toEqual([[DESTROYER, 2], [ULTIMATE, 2]])
  })
  it('"per other" (GEAR-DESIGN §5: three slaying weapons, +2 each) and "at count" (three shadows items, +20 Crit, once) are the same function', () => {
    const slaying = { tag: 'slaying', each: { attackDamage: 1 } }
    const three = [row('item.a', ['slaying'], slaying), row('item.b', ['slaying'], slaying), row('item.c', ['slaying'], slaying)]
    expect(setLinesOf(three).map((l) => [l.shape, l.count, l.attackDamage])).toEqual([['per-other', 2, 2], ['per-other', 2, 2], ['per-other', 2, 2]])
    expect(setLinesOf([three[0]!])).toEqual([])   // alone it pays nothing: there is no other
    const shadows = { tag: 'shadows', at: 3, once: { crit: 20 } }
    const cloak = row('item.cloak', ['shadows'], shadows)
    expect(setLinesOf([cloak, row('item.x', ['shadows']), row('item.y', [])])).toEqual([])
    expect(setLinesOf([cloak, row('item.x', ['shadows']), row('item.y', ['shadows'])])).toEqual([{ itemId: 'item.cloak', tag: 'shadows', shape: 'at-count', count: 3, stats: { crit: 20 }, attackDamage: 0 }])
    // order is placement (Law 6): the lines come in carried order
    expect(setLinesOf(rows(KARMA, CHAINS)).map((l) => l.itemId)).toEqual([KARMA, CHAINS])
  })
})

describe('fielded', () => {
  const PRIEST = 'hero.base.priest-armored', MAGE = 'hero.base.mage-fire'
  it('the set pays the unit when it is fielded: the Chains alone +1 Precision, with another chain item +2; an item with no set line changes nothing', () => {
    const bare = fieldedPreview(PRIEST, { items: ['item.holy-texts'] })
    const alone = fieldedPreview(PRIEST, { items: [CHAINS] }), two = fieldedPreview(PRIEST, { items: [CHAINS, FAITHFUL] })
    const faithful = fieldedPreview(PRIEST, { items: ['item.holy-texts', FAITHFUL] })
    expect(alone.precision - bare.precision).toBe(1)
    expect(two.precision - faithful.precision).toBe(2)
    // the def the battle makes carries no set number: the set is the unit's mod, as every unit mod is (SWITCHES heroModsInPreview)
    expect(fieldedDef(PRIEST, { items: [CHAINS] }).precision).toBe(fieldedDef(PRIEST, { items: ['item.holy-texts'] }).precision)
  })
  it('a member that is stowed is still carried: the count is over everything the unit brings, and a swap in the battle changes none of it', () => {
    const held = fieldedPreview(MAGE, { items: [DESTROYER] }), both = fieldedPreview(MAGE, { items: [DESTROYER], stowed: [ULTIMATE] })
    expect(held.precision).toBe(both.precision)
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.set-bonus']!))
    const mage = ctx.state.units.find((u) => u.typeId === MAGE)!
    expect(mage.weaponBonuses).toEqual([{ itemId: DESTROYER, damage: 2, source: DESTROYER }, { itemId: ULTIMATE, damage: 2, source: ULTIMATE }])
  })
  it('in a real battle: one line per item that pays, the party\'s Magic takes the Staff of the Magi\'s share, and the Destroyer\'s attacks deal the set\'s damage', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.set-bonus']!))
    const [priest, magi, mage] = ctx.state.units
    const lines = ctx.events.filter((e) => e.type === 'unit.modified')
    expect(lines.map((e) => [e.actor, e.causeId, e['stats'] ?? null, e['attacks'] ?? null])).toEqual([
      [priest!.id, CHAINS, { precision: 2 }, null],
      [magi!.id, MAGI, { magic: 2 }, null],
      [mage!.id, DESTROYER, null, [{ itemId: DESTROYER, damage: 2 }]],
      [mage!.id, ULTIMATE, null, [{ itemId: ULTIMATE, damage: 2 }]],
    ])
    expect(effective(ctx, priest!, 'precision').value).toBe(fieldedDef(priest!.typeId, { items: [CHAINS, FAITHFUL] }).precision + 2)
    // party Magic: every hero's own, the Staff of the Magi's two rings among the wearer's
    const without = createBattle({ ...scenarioOptions(SCENARIOS['test.set-bonus']!), heroItems: [[CHAINS, FAITHFUL], [MAGI], [DESTROYER]], heroStowed: [[], [], []] })
    expect(partySum(ctx, 'hero', 'magic') - partySum(without, 'hero', 'magic')).toBe(2)
    // the Destroyer's Ruin: +2 from the set (both staffs carried) against the same hero carrying one (+1)
    // (the same party, rings and all, so the party's Magic is the same; only the stowed staff is left behind)
    const oneStaff = createBattle({ ...scenarioOptions(SCENARIOS['test.set-bonus']!), heroStowed: [[], [], []] })
    const foe = ctx.state.units.find((u) => u.side === 'enemy')!, foe1 = oneStaff.state.units.find((u) => u.side === 'enemy')!
    const two = preview(ctx, mage!.id, foe.id, 'attack.staff-of-the-destroyer.ruin'), one = preview(oneStaff, oneStaff.state.units[2]!.id, foe1.id, 'attack.staff-of-the-destroyer.ruin')
    expect((two as { damageOnHit: number }).damageOnHit - (one as { damageOnHit: number }).damageOnHit).toBe(1)
    // and the party's Magic is in the Ruin: with the rings' two Magic it deals 4 more (Precision plus twice the party's Magic)
    const noRings = preview(without, without.state.units[2]!.id, without.state.units.find((u) => u.side === 'enemy')!.id, 'attack.staff-of-the-destroyer.ruin')
    expect((one as { damageOnHit: number }).damageOnHit - (noRings as { damageOnHit: number }).damageOnHit).toBe(4)
  })
  it('unit mods handed in by the fielding (seam.unit-mods) still add, beside the set\'s', () => {
    const p = fieldedPreview(PRIEST, { items: [CHAINS], heroMods: { stats: [{ stat: 'precision', add: 3, source: 'test.source' }] } })
    expect(p.precision - fieldedPreview(PRIEST, { items: [CHAINS] }).precision).toBe(3)
  })
  it("FOUND: a unit mod of Magic or Spirit is the unit's own share of the party's - a set's +Magic, a drafted gift of Magic - and reaches the party's sum in the battle", () => {
    const base = scenarioOptions(SCENARIOS['test.force-blast']!)
    const plain = createBattle(base), gifted = createBattle({ ...base, heroMods: [{ stats: [{ stat: 'magic', add: 3, source: 'test.gift' }, { stat: 'spirit', add: 2, source: 'test.gift' }] }, undefined] })
    expect(partySum(gifted, 'hero', 'magic') - partySum(plain, 'hero', 'magic')).toBe(3)
    expect(partySum(gifted, 'hero', 'spirit') - partySum(plain, 'hero', 'spirit')).toBe(2)
    expect(effective(gifted, gifted.state.units[0]!, 'magic').value - effective(plain, plain.state.units[0]!, 'magic').value).toBe(3)   // once, not twice
    const line = gifted.events.find((e) => e.type === 'unit.modified' && e.causeId === 'test.gift')!
    expect(line['stats']).toEqual({ magic: 3, spirit: 2 })
    // the Force Blast (Precision plus half the party's Magic): three more Magic is two more damage (1.5, the half rounded up)
    const foeOf = (c: typeof plain) => c.state.units.find((u) => u.side === 'enemy')!.id
    const was = preview(plain, plain.state.units[0]!.id, foeOf(plain), 'attack.force-staff.force-blast') as { damageOnHit: number }
    const now = preview(gifted, gifted.state.units[0]!.id, foeOf(gifted), 'attack.force-staff.force-blast') as { damageOnHit: number }
    expect(now.damageOnHit - was.damageOnHit).toBeGreaterThanOrEqual(1)
  })
})
