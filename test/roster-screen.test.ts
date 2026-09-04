// The roster screen (ISC-049 is H — a person opens SLICE.html). Ruled 2026-09-03 (Angela):
// "It shows the card art. It should show all of the stats and all of the things that are
// equipped." What text can hold: one card per hero with the portrait, the viewer's ten stat
// rows, every worn item named, the level and XP bar, the wound, the two slots and the
// Week's absence; a dead hero says so; Level up when the hero can.
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { rosterScreen, heroRosterCard } from '../src/ui/roster.js'
import { itemOf } from '../src/content/items.js'

const DWARF = 'hero.base.warrior-iron', HUNTER = 'hero.base.ranger-aggressive'

describe('the roster screen', () => {
  it('one card per hero: portrait, the ten stat rows, everything equipped by name, level and XP, the slots', () => {
    const ctx = loadFixture((c) => { c.cursor.step = 'open' })
    const c = ctx.campaign
    const html = rosterScreen(c, '')
    expect(html.match(/class="herocard rostercard/g)?.length).toBe(Object.keys(c.roster).length)
    const card = heroRosterCard(c, DWARF)
    for (const label of ['Move', 'Armor', 'Resist', 'Dodge', 'Max HP', 'Accuracy', 'Crit', 'Strength', 'Precision', 'Stam Regen']) expect(card).toContain(`<span class="stN">${label}</span>`)
    expect(card).toContain('<div class="plate"><b>Iron Dwarf</b>')
    expect(card.indexOf('class="stats"')).toBeLessThan(card.indexOf('class="art"'))
    for (const id of c.roster[DWARF]!.equipped) expect(card).toContain(itemOf(id).name)
    expect(card).toContain('/ 20 XP')
    expect(card).toContain('<span class="k">field</span>'); expect(card).toContain('<span class="k">city</span>')
    expect(card).not.toContain('data-act="level-hero"')                  // 0 XP: nothing to take
  })
  it('a wound, an absence, a dead hero and a level owed all show on the card', () => {
    const ctx = loadFixture((c) => {
      c.cursor.step = 'open'
      c.roster[DWARF]!.wound = 2
      c.roster[HUNTER]!.xp = 20
      c.unavailable = [{ heroId: HUNTER, story: 'went hunting alone' }]
      c.roster['hero.fixed.orphans']!.lifeState = 'dead'
    })
    const c = ctx.campaign
    expect(heroRosterCard(c, DWARF)).toContain('class="woundtag w2">Badly Wounded')
    expect(heroRosterCard(c, HUNTER)).toContain('went hunting alone')
    expect(heroRosterCard(c, HUNTER)).toContain('data-act="level-hero"')
    expect(heroRosterCard(c, 'hero.fixed.orphans')).toContain('class="fallen">FALLEN')
    expect(heroRosterCard(c, 'hero.fixed.orphans')).not.toContain('data-act="level-hero"')
  })
  it('Fit gear is offered between battles, and the equip panel is folded in while a session is open', () => {
    const ctx = loadFixture((c) => { c.cursor.step = 'open' })
    expect(rosterScreen(ctx.campaign, '')).toContain('data-act="open-equip"')
    ctx.campaign.cursor.equipSession = { where: 'roster', paid: [] }
    const html = rosterScreen(ctx.campaign, '<div id="panel-here"></div>')
    expect(html).toContain('id="panel-here"'); expect(html).toContain('data-act="close-equip"'); expect(html).not.toContain('data-act="open-equip"')
  })
})
