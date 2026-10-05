// kingdom.equip-item-card — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post: notices, target lines, item cards,
// arrows, move costs on hexes, knocked down, bodies, cursed ground, the first hero's positives': "When you're selecting items in
// the equipment phase, you need to be able to look at your items somehow. You need to be able to click on them, and then they
// pop up somewhere on the screen, to the right or somewhere, as a card with a description.").
//
// Expect: "On the opening run's equip step clicking the Dagger shows a card at the right with its art, '+5 Block' and 'Stab'
// with its line; clicking a Tower Shield replaces it; clicking away closes it; nothing is equipped or moved by looking; the
// reward screen's cards open the same card."
//
// Three layers, each held here: (1) the card's CONTENT is one function over the item data (src/content/item-card.ts
// itemCardOf — plain data, so the battle screen can use it too): the engine's row for what it is and gives, the Codex's own
// words (src/content/generated/item-words.ts, by tools/mk-item-words.mjs) for what it is and what each attack and power does;
// (2) the card as the screens draw it (src/ui/item-card.ts itemCardHtml) and where Equip puts it; (3) what a click looks at
// (lookingAfter — both hosts' one rule). The built page — real clicks on the opening run's equip step and on a reward card —
// is tools/equip-item-card.verify.mjs and tools/opening-page.mjs takeReward.
import { describe, it, expect, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// the page's art is a build-time constant (__ART__, tools/build-sandbox.mjs); here it is a stand-in filled in below
vi.hoisted(() => { (globalThis as unknown as { __ART__: unknown }).__ART__ = { heroes: {}, items: {}, data: {} } })

import { makeNewCampaign } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { saveOf } from '../src/core/campaign.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { STAT_LABEL } from '../src/content/stat-labels.js'
import { ACTIONS } from '../src/engine.js'
import * as CARD from '../src/content/item-card.js'
import * as CARD_UI from '../src/ui/item-card.js'
import { ART } from '../src/ui/art.js'
import { equipPage } from '../src/ui/equip.js'

type Grant = { id: string; name: string; kind: 'attack' | 'power'; lines: string[] }
type Card = { id: string; name: string; kind: string; tier: number; facts: string[]; gives: { stat: string; amount: number; words: string }[]; grants: Grant[]; attribute: { id: string; name: string; lines: string[] } | null; lines: string[]; line: string }
type Looking = { picked: string | null; look: string | null }
const itemCardOf = (CARD as unknown as { itemCardOf?: (id: string) => Card }).itemCardOf!
const HOOK_WORDS = (CARD as unknown as { HOOK_WORDS?: Record<string, string> }).HOOK_WORDS!
const itemCardHtml = (CARD_UI as unknown as { itemCardHtml?: (card: Card, art: string | null) => string }).itemCardHtml!
const lookingAfter = (CARD_UI as unknown as { lookingAfter?: (s: Looking, e: { kind: 'pick' | 'look'; id: string } | { kind: 'away' } | { kind: 'done' }) => Looking }).lookingAfter!

const CODEX = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8')) as {
  items: { id: string; intent?: string }[]; enchants: { id: string; name: string; intent?: string }[]
  attacks: { id: string; name: string; intent?: string; triggers?: { hook: string; effect: string }[] }[]
  powers: { id: string; name: string; description?: string; intent?: string }[]
}
const DAGGER = 'item.dagger', TOWER = 'item.tower-shield', SWORD = 'item.longsword.flaming'
const art = ART as unknown as { items: Record<string, string>; data: Record<string, string> }
const uriOf = (id: string) => `data:image/jpeg;base64,${Buffer.from('card art of ' + id).toString('base64')}`
art.items[DAGGER] = 'item-dagger.jpg'; art.data['item-dagger.jpg'] = uriOf(DAGGER)
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const cardsIn = (html: string) => [...html.matchAll(/<aside class="itemcard"[^>]*data-item-card="([^"]+)"/g)].map((m) => m[1]!)
const cardOf = (html: string) => { const at = html.indexOf('<aside class="itemcard"'); return at < 0 ? '' : html.slice(at, html.indexOf('</aside>', at)) }

describe('kingdom.equip-item-card — the card\'s content, one function over the item data', () => {
  it('the functions exist: the content (plain data), the card as drawn, and what a click looks at', () => {
    expect(typeof itemCardOf, 'src/content/item-card.ts itemCardOf').toBe('function')
    expect(typeof itemCardHtml, 'src/ui/item-card.ts itemCardHtml').toBe('function')
    expect(typeof lookingAfter, 'src/ui/item-card.ts lookingAfter').toBe('function')
  })

  it('the Dagger: its name, kind and tier, +5 Block, Stab with its line, and the Codex\'s line of what it is', () => {
    const c = itemCardOf(DAGGER), row = itemOf(DAGGER)
    expect([c.id, c.name, c.kind, c.tier]).toEqual([DAGGER, 'Dagger', 'Weapon', row.tier])
    expect(c.gives).toEqual([{ stat: 'block', amount: 5, words: '+5 Block' }])
    expect(c.line).toBe(CODEX.items.find((i) => i.id === DAGGER)!.intent)
    expect(c.grants.map((g) => [g.id, g.name, g.kind])).toEqual([['attack.dagger.stab', 'Stab', 'attack']])
    const stab = c.grants[0]!, codex = CODEX.attacks.find((a) => a.id === 'attack.dagger.stab')!
    // its line: the Codex's own sentence about it, and its trigger in the Codex's words
    expect(stab.lines).toContain(codex.intent)
    expect(stab.lines).toContain('On attack: gain 1 Protection')
    // and what the engine fields for it — the numbers are the battle's, not a copy
    const engine = (ACTIONS as unknown as Record<string, { staminaCost: number; attack: { bonus: number; crit?: number } }>)['attack.dagger.stab']!
    expect(stab.lines[0]).toBe(`Strength ${engine.attack.bonus} physical damage · melee · ${engine.staminaCost} Stamina · +${engine.attack.crit} Crit`)
    // plain data: it survives being handed over as JSON, whole
    expect(JSON.parse(JSON.stringify(c))).toEqual(c)
  })

  it('the Tower Shield: a Shield, what it gives while equipped in the label table\'s words, and each power in the Codex\'s words', () => {
    const c = itemCardOf(TOWER), row = itemOf(TOWER)
    expect(c.kind).toBe('Shield')
    expect(c.gives.map((g) => g.words).sort()).toEqual(Object.entries(row.statModifiers).map(([k, n]) => `${n > 0 ? '+' : ''}${n} ${STAT_LABEL[k]}`).sort())
    expect(c.gives.map((g) => g.words)).toContain('+20 Ranged Block')
    expect(c.grants.map((g) => g.id)).toEqual(row.grants)
    for (const g of c.grants) {
      const codex = CODEX.powers.find((p) => p.id === g.id)!
      expect(g.kind).toBe('power'); expect(g.name).toBe(codex.name)
      expect(g.lines, `${g.name}: the Codex's description`).toContain(codex.description)
    }
  })

  it('a Forge row: what it is is its base\'s line, its attacks carry the engine\'s numbers for THIS row, and the attribute it carries is said by name', () => {
    const c = itemCardOf(SWORD), row = itemOf(SWORD)
    expect(c.name).toBe('Flaming Longsword')
    expect(c.line).toBe(CODEX.items.find((i) => i.id === row.base)!.intent)
    const flaming = CODEX.enchants.find((e) => e.id === row.enchant)!
    expect(c.attribute && [c.attribute.id, c.attribute.name]).toEqual([flaming.id, flaming.name])
    expect(c.attribute!.lines).toContain(flaming.intent)
    expect(c.grants.map((g) => g.id)).toEqual(row.grants)
  })

  it('every item in the game has a card: a name, a kind, its tier, every stat it gives in words, every grant named — none throws, none shows a raw id', () => {
    let attacks = 0, powers = 0, attributes = 0
    for (const row of ITEMS) {
      let c!: Card
      expect(() => { c = itemCardOf(row.id) }, row.id).not.toThrow()
      expect([c.name, c.tier], row.id).toEqual([row.name, row.tier])
      expect(c.kind, row.id).toMatch(/^[A-Z][a-z]+$/)
      expect(c.gives.map((g) => g.stat).sort(), row.id).toEqual(Object.keys(row.statModifiers).sort())
      expect(c.grants.map((g) => g.id), row.id).toEqual(row.grants.filter((g) => (ACTIONS as Record<string, unknown>)[g]))
      for (const g of c.grants) {
        expect(g.name, `${row.id} ${g.id}`).toBe((ACTIONS as unknown as Record<string, { name: string }>)[g.id]!.name)
        expect(g.lines.length, `${row.id} ${g.id}: at least what the engine fields for it`).toBeGreaterThan(0)
        for (const l of g.lines) expect(l, `${row.id} ${g.id}`).not.toMatch(/\b(attack|power|item|enchant|status|badge)\.[a-z]/)
        if (g.kind === 'attack') attacks++; else powers++
      }
      expect(c.line.length, `${row.id}: a line of what it is`).toBeGreaterThan(0)
      expect(!!c.attribute, row.id).toBe(row.enchant !== null)
      if (c.attribute) attributes++
    }
    expect(attacks).toBeGreaterThan(100); expect(powers).toBeGreaterThan(20); expect(attributes).toBeGreaterThan(100)
  })

  it('the Codex\'s words are generated, never typed: regenerating them changes nothing, and a hook is worded as the battle screen words it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'item-words-'))
    try {
      execFileSync(process.execPath, ['tools/mk-item-words.mjs', '--out', join(dir, 'item-words.ts')], { encoding: 'utf8' })
      expect(readFileSync(join(dir, 'item-words.ts'), 'utf8')).toBe(readFileSync('src/content/generated/item-words.ts', 'utf8'))
    } finally { rmSync(dir, { recursive: true, force: true }) }
    // the battle screen's own table (viewer src/actions.js HOOK_WORD): every hook it words, the card words the same
    const viewer = readFileSync('../viewer/src/actions.js', 'utf8'), table = viewer.slice(viewer.indexOf('const HOOK_WORD = {'), viewer.indexOf('}', viewer.indexOf('const HOOK_WORD = {')))
    const theirs = Object.fromEntries([...table.matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1]!, m[2]!]))
    expect(Object.keys(theirs).length).toBeGreaterThan(8)
    for (const [hook, word] of Object.entries(theirs)) expect(HOOK_WORDS[hook], hook).toBe(word)
  })
})

describe('kingdom.equip-item-card — the card on the Equip screen', () => {
  /** A run with the Iron Dwarf (who carries a Tower Shield) at Equip, a Dagger and a second Tower Shield in the stash. */
  function atEquip() {
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const row = HERO_POOL.find((h) => h.equipped.includes(TOWER))!
    c.roster[row.id] = structuredClone(row); c.stash = [DAGGER, TOWER]
    return { c, hero: row.id }
  }
  const page = (c: ReturnType<typeof atEquip>['c'], hero: string, s: Looking) => equipPage(c, [hero], { where: 'prep', picked: s.picked, look: s.look } as Parameters<typeof equipPage>[2])

  it('nothing looked at: no card. The Dagger clicked: its card, once, at the right — its art, +5 Block, Stab with its line', () => {
    const { c, hero } = atEquip()
    expect(cardsIn(page(c, hero, { picked: null, look: null }))).toEqual([])
    const s = lookingAfter({ picked: null, look: null }, { kind: 'pick', id: DAGGER })
    const html = page(c, hero, s), card = cardOf(html)
    expect(cardsIn(html)).toEqual([DAGGER])
    expect(card, 'its art').toContain(`<img src="${uriOf(DAGGER)}"`)
    const said = text(card)
    expect(said).toContain('Dagger'); expect(said).toContain('Weapon · tier 0')
    expect(said).toContain('+5 Block'); expect(said).toContain('Stab')
    expect(said).toContain(CODEX.attacks.find((a) => a.id === 'attack.dagger.stab')!.intent!)
    expect(said).toContain(CODEX.items.find((i) => i.id === DAGGER)!.intent!)
    // "to the right": the card is a panel of its own beside the screen, not a line inside the stash
    expect(html.indexOf('<aside class="itemcard"')).toBeGreaterThan(html.lastIndexOf('class="stash"'))
  })

  it('clicking a Tower Shield replaces it; an item with no art shows a plain face, never another\'s picture', () => {
    const { c, hero } = atEquip()
    let s = lookingAfter({ picked: null, look: null }, { kind: 'pick', id: DAGGER })
    s = lookingAfter(s, { kind: 'pick', id: TOWER })
    const html = page(c, hero, s), card = cardOf(html)
    expect(cardsIn(html), 'one card: the Tower Shield\'s').toEqual([TOWER])
    expect(text(card)).toContain('Tower Shield'); expect(text(card)).toContain('+20 Ranged Block'); expect(text(card)).toContain('Brace')
    expect(card).not.toContain('<img'); expect(text(card)).not.toContain('Stab')
  })

  it('an item a hero wears can be looked at: its slot opens the card, and nothing is in hand', () => {
    const { c, hero } = atEquip()
    const idle = page(c, hero, { picked: null, look: null })
    // every slot that holds an item opens that item's card when nothing is in hand
    const looks = [...idle.matchAll(/<div class="slot full[^"]*"[^>]*data-act="look" data-id="([^"]+)"[^>]*data-holds="([^"]+)"/g)].map((m) => [m[1]!, m[2]!])
    expect(looks.length).toBe(c.roster[hero]!.equipped.length)
    for (const [id, holds] of looks) expect(id).toBe(holds)
    const s = lookingAfter({ picked: null, look: null }, { kind: 'look', id: TOWER })
    expect(s).toEqual({ picked: null, look: TOWER })
    const html = page(c, hero, s)
    expect(cardsIn(html)).toEqual([TOWER])
    expect(html, 'nothing is in hand: no slot is a place to put an item').not.toMatch(/data-act="drop"/)
    // with an item in hand the slots are where it goes, as they always were — a full slot swaps
    expect(page(c, hero, { picked: DAGGER, look: DAGGER })).toMatch(/data-act="drop" data-item="item\.dagger"/)
  })

  it('what a click looks at: an item again puts it down, another replaces it, away closes it, and an item put on closes it', () => {
    const none: Looking = { picked: null, look: null }
    const dagger = lookingAfter(none, { kind: 'pick', id: DAGGER })
    expect(dagger).toEqual({ picked: DAGGER, look: DAGGER })
    expect(lookingAfter(dagger, { kind: 'pick', id: DAGGER }), 'the same item again: put down, the card closed').toEqual(none)
    expect(lookingAfter(dagger, { kind: 'pick', id: TOWER })).toEqual({ picked: TOWER, look: TOWER })
    expect(lookingAfter(dagger, { kind: 'away' }), 'clicking away closes it and puts the item down').toEqual(none)
    expect(lookingAfter(dagger, { kind: 'done' }), 'an item put on a hero: nothing in hand, no card').toEqual(none)
    const worn = lookingAfter(none, { kind: 'look', id: TOWER })
    expect(lookingAfter(worn, { kind: 'look', id: TOWER })).toEqual(none)
    expect(lookingAfter(worn, { kind: 'look', id: DAGGER })).toEqual({ picked: null, look: DAGGER })
    expect(lookingAfter(worn, { kind: 'pick', id: DAGGER })).toEqual({ picked: DAGGER, look: DAGGER })
    expect(lookingAfter(worn, { kind: 'away' })).toEqual(none)
  })

  it('looking never equips or moves anything: the run is the same save before and after', () => {
    const { c, hero } = atEquip(), before = saveOf(c)
    let s: Looking = { picked: null, look: null }
    for (const e of [{ kind: 'pick', id: DAGGER }, { kind: 'pick', id: TOWER }, { kind: 'away' }, { kind: 'look', id: TOWER }, { kind: 'look', id: c.roster[hero]!.equipped[0]! }, { kind: 'away' }] as const) {
      s = lookingAfter(s, e); page(c, hero, s)
      expect(saveOf(c), JSON.stringify(e)).toBe(before)
    }
  })
})

describe('kingdom.equip-item-card — the built page', () => {
  it('the opening run\'s equip step: a worn item clicked shows its card at the right, another replaces it, clicking away closes it; an item taken off and clicked in the stash shows it too; nothing moves by looking', () => {
    const out = execFileSync(process.execPath, ['tools/equip-item-card.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/equip-item-card: .* passed/)
  }, 600000)

  it('the reward screen\'s cards open the same card: a reward card chosen shows its item\'s card', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/every reward card chosen opened its item's card beside it \(\d+ cards?: [^)]+\)/)
  }, 600000)
})
