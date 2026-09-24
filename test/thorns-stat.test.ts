// v2.thorns (engine 88064ac, content 02f93ef, 2026-09-24): Thorns is a stat. The
// kingdom's item rows (tools/mk-items.mjs) fold "Thorns N" the way the engine pack
// does, so what a card says is what the battle fields; the Equip card's stat block
// carries a Thorns row; the sandbox forecast names thornsOnHit only when it bites.
import { describe, it, expect } from 'vitest'
import { ITEMS, itemOf } from '../src/content/items.js'
import { fieldedDef } from '../src/engine.js'
import { loadFixture, toEquip } from './walk.js'
import { performEquip } from '../src/core/shop.js'
import { equipScreen } from '../src/ui/equip.js'

const HUNTER = 'hero.base.ranger-aggressive', CHAPLAIN = 'hero.base.priest-armored'

describe('Thorns is a stat on the kingdom side', () => {
  it('every row carrying Thorns is the engine pack\'s own number, fielded', () => {
    const thorned = ITEMS.filter((r) => (r.statModifiers['thorns'] ?? 0) > 0)
    expect(thorned.map((r) => r.id)).toEqual(expect.arrayContaining(['item.armor-of-thorns', 'item.tomb-sentinels-blade', 'item.plated-armor.thorned']))
    const unitType = loadFixture().campaign.roster[HUNTER]!.unitType
    const bare = fieldedDef(unitType, []).thorns ?? 0
    for (const r of thorned) expect([r.id, (fieldedDef(unitType, [r.id]).thorns ?? 0) - bare]).toEqual([r.id, r.statModifiers['thorns']])
    expect(itemOf('item.armor-of-thorns').statModifiers['thorns']).toBe(3)
  })
  it('a Thorns trigger with riders stays the engine\'s named gap — no stat on the row', () => {
    expect(itemOf('item.scorpion-carapace').statModifiers['thorns']).toBeUndefined()
    expect(itemOf('item.scorpion-shield').statModifiers['thorns']).toBeUndefined()
  })
  it('the Equip card shows Thorns with the other folded stats, moved by the armor', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = ['item.armor-of-thorns'] }), [HUNTER, CHAPLAIN])
    const before = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
    expect(before).toContain('<span class="stN">Thorns</span><span class="stV">0</span>')
    performEquip(ctx, CHAPLAIN, 'item.armor-of-thorns', 'test', ctx.campaign.roster[CHAPLAIN]!.equipped.find((id) => itemOf(id).itemClass === 'armor'))
    const after = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
    expect(after).toContain('<span class="stN">Thorns</span><span class="stV up"><em>+3</em>3</span>')
  })
})
