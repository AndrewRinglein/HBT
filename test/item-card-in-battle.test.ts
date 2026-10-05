// viewer.item-card-in-battle — the host's half. Ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post: notices, target
// lines, item cards, …': "When you're focusing on a character, you need to be able to look at their items when you're in
// battle.").
//
// "One card, shared with the kingdom's Equip screen (kingdom.equip-item-card builds the card's content from the same item data
// — use that card, do not write a second one)." The battle screen is handed ONE function, battleItemCard (src/ui/
// battle-item-card.ts), and it is the Equip screen's own card: itemCardHtml over itemCardOf, with the item's own card art. Held
// here: for every item the engine knows, the battle's card is that markup, character for character; an id that is no item
// has no card; and both screens that mount a battle hand the function over. The page's half is tools/
// item-card-in-battle.verify.mjs on the built sandbox.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { battleItemCard } from '../src/ui/battle-item-card.js'
import { itemCardOf } from '../src/content/item-card.js'
import { itemCardHtml } from '../src/ui/item-card.js'
import { itemArtOf } from '../src/ui/art.js'
import { ITEMS } from '../src/engine.js'

describe('viewer.item-card-in-battle — the battle screen\'s item card is the Equip screen\'s', () => {
  it('for every item the engine knows the battle\'s card is the one card — itemCardHtml over itemCardOf, with the item\'s own art — character for character', () => {
    const ids = Object.keys(ITEMS as object)
    expect(ids.length).toBeGreaterThan(100)
    for (const id of ids) expect(battleItemCard(id), id).toBe(itemCardHtml(itemCardOf(id), itemArtOf(id)))
  })
  it('the Holy Symbol\'s card says Wrath and Heal, each with its lines', () => {
    const html = battleItemCard('item.holy-symbol')!, card = itemCardOf('item.holy-symbol')
    expect(card.grants.map((g) => g.name).sort()).toEqual(['Heal', 'Wrath'])
    for (const g of card.grants) { expect(g.lines.length).toBeGreaterThanOrEqual(2); expect(html).toContain(`<b>${g.name}</b>`); for (const l of g.lines) expect(html).toContain(l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')) }
    expect(html).toContain('data-item-card="item.holy-symbol"')
  })
  it('an id that is no item has no card: null, never a card of something else', () => {
    expect(battleItemCard('item.no-such-thing')).toBeNull(); expect(battleItemCard('')).toBeNull()
  })
  it('every battle the kingdom mounts hands the card over: the one place both screens mount through passes it to the component', () => {
    const src = readFileSync('src/ui/battle-surface.ts', 'utf8')
    expect(src).toMatch(/\{itemCard:battleItemCard,\.\.\.options,autoplay:false\}/)
    // and no screen writes a second card: the card's markup is made in one file
    for (const f of ['src/ui/battle-surface.ts', 'src/ui/battle-item-card.ts', 'src/ui/sandbox.ts', 'src/ui/slice.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/class="itemcard"/)
  })
  it('the page: on the built battle screen, clicking \'Holy Symbol\' in the Priest\'s panel stands its card beside the panel; clicking away closes it', () => {
    const out = execFileSync(process.execPath, ['tools/item-card-in-battle.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/item-card-in-battle: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
