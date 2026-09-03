// The Equip screen (G11, ISC-066 is H — a person opens SLICE.html). What text can
// hold: the screen renders from the read-models alone; heroes across the top with
// their deltas; hands, armor and item slots per hero; the six sections in the ruled
// order; a picked item marks the slots it can go to and names the swap; the set
// line is on the page. GEAR-DESIGN.md §6 · 7-KINGDOM-SETTLED.md 2026-09-02.
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { performEquip, performUnequip } from '../src/core/shop.js'
import { equipScreen, displaceFor, SECTIONS } from '../src/ui/equip.js'

const HUNTER = 'hero.base.ranger-aggressive', CHAPLAIN = 'hero.base.priest-armored'
const STASH = ['item.shortbow', 'item.basic-armor', 'item.pilgrims-warding-stone', 'item.rune-bashing', 'item.meditation-beads', 'item.backpack', 'item.chains-of-the-wrathful', 'item.chains-of-the-faithful', 'item.priest-chain']

describe('the Equip screen', () => {
  it('heroes across the top with slots; the six sections in the ruled order', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [...STASH] }), [HUNTER, CHAPLAIN])
    const html = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
    expect(html.match(/class="herocard"/g)?.length).toBe(2)
    // stats above the art, the viewer's ten rows; the art carries the name
    for (const label of ['Move', 'Armor', 'Resist', 'Dodge', 'Max HP', 'Accuracy', 'Crit', 'Strength', 'Precision', 'Stam Regen']) expect(html).toContain(`<span class="stN">${label}</span>`)
    expect(html.indexOf('class="stats"')).toBeLessThan(html.indexOf('class="art"'))
    expect(html).toContain('<div class="plate"><b>Hunter</b>')
    expect(html).toMatch(/Accuracy<\/span><span class="stV[^"]*">(<em>[^<]*<\/em>)?\d+%/)
    expect(html).toContain('both hands')                     // the Hunter's longbow fills both
    expect(html).toContain('right hand'); expect(html).toContain('left hand')   // the Chaplain's shield and texts
    expect(html).toContain('data-slot="armor"'); expect(html).toContain('data-slot="item-0"')
    expect(SECTIONS.map((s) => s.title)).toEqual(['Idols', 'Bloodrunes', 'Relics', 'Weapons', 'Armor', 'Trinkets'])
    let at = 0
    for (const s of SECTIONS) { const n = html.indexOf(`<h3>${s.title}</h3>`, at); expect(n).toBeGreaterThan(at); at = n }
    expect(html).toContain('Set bonuses when you leave')
    expect(html).toContain('1 faith to equip')                // the idol's cost shows
    expect(html).toContain('3 mana to equip')                 // the Bloodrune's
  })
  it('a picked item marks where it can go, names the swap, and the swap bounces the old item to the stash', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [...STASH] }), [HUNTER, CHAPLAIN])
    const html = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: 'item.shortbow' })
    expect(html).toContain('in hand')
    // the Hunter's hands are full: the shortbow can go on only by swapping out the longbow
    expect(displaceFor(ctx.campaign, HUNTER, 'item.shortbow', 'hand-r')).toBe('item.longbow')
    expect(html).toMatch(/data-slot="hand-r" data-hero="hero\.base\.ranger-aggressive" data-displace="item\.longbow" data-act="drop"/)
    expect(html).toContain('swap out Longbow')
    // the Chaplain cannot draw a bow at all — not his class
    expect(displaceFor(ctx.campaign, CHAPLAIN, 'item.shortbow', 'hand-r')).toBe('item.knight-shield')
    expect(html).toMatch(/data-hero="hero\.base\.priest-armored"[^>]*class="[^"]*cant|class="slot[^"]*cant"[^>]*data-hero="hero\.base\.priest-armored"/)
    performEquip(ctx, HUNTER, 'item.shortbow', 'test', displaceFor(ctx.campaign, HUNTER, 'item.shortbow', 'hand-r'))
    expect(ctx.campaign.stash).toContain('item.longbow')
    expect(ctx.campaign.roster[HUNTER]!.equipped).toContain('item.shortbow')
  })
  it('deltas go red and green with the gear; the set line names the bonus when it triggers', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = [...STASH] }), [HUNTER, CHAPLAIN])
    performUnequip(ctx, CHAPLAIN, 'item.knight-shield', 'test'); performUnequip(ctx, CHAPLAIN, 'item.holy-texts', 'test')
    performEquip(ctx, CHAPLAIN, 'item.chains-of-the-wrathful', 'test')
    performEquip(ctx, CHAPLAIN, 'item.chains-of-the-faithful', 'test', 'item.pilgrims-habit')
    performEquip(ctx, CHAPLAIN, 'item.priest-chain', 'test')
    const html = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
    expect(html).toContain('chain set bonus from Chains of the Wrathful: +2 precision (2 other chain items)')
    // the card's stat block is the viewer's: the Precision row carries the set's +2 in front of the engine's fielded number
    expect(html).toMatch(/<span class="stN">Precision<\/span><span class="stV up"><em>\+\d+<\/em>\d+<\/span>/)
    expect(html).toContain('<i>spare</i>')                    // the priest chain rides in the item slot as a spare
    // the Bloodrune's cost is paid on the way on and listed as refundable
    performEquip(ctx, HUNTER, 'item.rune-bashing', 'test')
    const paid = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
    expect(paid).toContain('Paid this session')
    expect(paid).toContain('Bashing on Hunter (3 mana)')
  })
})
