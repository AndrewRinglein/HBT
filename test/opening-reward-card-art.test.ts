// kingdom.opening-reward-card-art — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'card art on the level-up and reward
// screens; the specialty choice offers three, not nine': "Card art not showing in the reward screen for the flinging sword."
// — the Flaming Longsword).
//
// Expect: "At http://127.0.0.1:4230/play the reward screen after the Lumberjack House shows the Flaming Longsword's card
// art; every reward card whose item has art shows it, and every item without art is named in itemsMissing; the page test
// asserts an image on the Flaming Longsword's reward card and that each reward card either shows art or is listed as
// missing."
//
// Two halves. (1) The art: tools/prep-items.py — beside tools/prep-heroes.py — reads the project's weapon card
// manifests and writes generated/art/item-<card>.jpg, listing every kingdom item in index.json under `items` (by item id)
// or `itemsMissing` (by id, with its name). Held here against what it wrote. (2) The screens: a reward card and an item
// on Equip show the item's OWN card art, and an item with none shows its plain face, never another's. Held here on the
// screens' own HTML with a stand-in picture per item; the page half is tools/opening-run-six.verify.mjs and
// tools/opening-loop-three.verify.mjs, on the built BATTLE-SANDBOX.html with the real ones.
import { describe, it, expect, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

// the page's art is a build-time constant (__ART__, tools/build-sandbox.mjs); here it is a stand-in filled in below
vi.hoisted(() => { (globalThis as unknown as { __ART__: unknown }).__ART__ = { heroes: {}, items: {}, data: {} } })

import { makeNewCampaign } from '../src/core/opening.js'
import { makeCtx, type Ctx } from '../src/core/mutate.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import { REWARDS } from '../src/content/rewards.js'
import { ENCOUNTER_REWARDS } from '../src/content/encounter-rewards.js'
import { HERO_POOL, CIVILIANS, RESCUABLE_CIVILIANS } from '../src/content/heroes.js'
import * as ARTMOD from '../src/ui/art.js'
import { ART } from '../src/ui/art.js'
import { equipPage } from '../src/ui/equip.js'
import { rewardsScreen } from '../src/ui/after.js'

const SWORD = 'item.longsword.flaming'
type Index = { files: Record<string, { w: number; h: number; bytes: number }>; items?: Record<string, string>; itemsMissing?: Record<string, string> }
const INDEX = JSON.parse(readFileSync('generated/art/index.json', 'utf8')) as Index
const itemArtOf = (ARTMOD as unknown as { itemArtOf?: (id: string) => string | null }).itemArtOf

// a stand-in picture per item that has art in this test: its own file, its own bytes
const fileOf = (id: string) => `item-${id.replace(/^item\./, '')}.jpg`
const uriOf = (id: string) => `data:image/jpeg;base64,${Buffer.from('card art of ' + id).toString('base64')}`
const art = ART as unknown as { items: Record<string, string>; data: Record<string, string> }
const WITH_ART = [SWORD, 'item.longsword', 'item.kite-shield', 'item.daggers']
for (const id of WITH_ART) { art.items[id] = fileOf(id); art.data[fileOf(id)] = uriOf(id) }
const imagesIn = (html: string) => [...html.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1])
function blocks(html: string, open: RegExp): string[] {
  const at = [...html.matchAll(open)].map((m) => m.index!)
  return at.map((from, i) => html.slice(from, at[i + 1] ?? html.length))
}

/** A run with one Paladin holding its kit (a longsword, a kite shield, armor), standing on a rewards step that offers `offer`. */
function atRewards(offer: string[]): Ctx {
  const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
  const row = HERO_POOL.find((h) => h.classes.includes('class.paladin') && h.equipped.includes('item.longsword'))!
  c.roster[row.id] = structuredClone(row)
  c.cursor.step = 'rewards'; c.cursor.rewardOffer = [...offer]
  return ctx
}

describe('kingdom.opening-reward-card-art — item card art on the reward cards and on Equip\'s items', () => {
  it('the prep tool is beside prep-heroes.py and wrote the items into the index: every kingdom item has art or is named as missing', () => {
    expect(existsSync('tools/prep-items.py'), 'tools/prep-items.py').toBe(true)
    expect(INDEX.items, 'index.json items').toBeTypeOf('object'); expect(INDEX.itemsMissing, 'index.json itemsMissing').toBeTypeOf('object')
    const have = INDEX.items!, missing = INDEX.itemsMissing!
    for (const r of ITEMS) {
      expect(r.id in have !== r.id in missing, `${r.id} is in exactly one of items and itemsMissing`).toBe(true)
      if (r.id in missing) expect(missing[r.id], `${r.id} is named`).toBe(r.name)
    }
    expect(Object.keys(have).length + Object.keys(missing).length, 'and nothing else is listed').toBe(ITEMS.length)
    // every picture is a file on disk, a JPEG, listed in the index's files
    for (const file of new Set(Object.values(have))) {
      expect(file).toMatch(/^item-[a-z0-9-]+\.jpg$/)
      expect(INDEX.files[file], `${file} is in the index's files`).toBeTruthy()
      const bytes = readFileSync('generated/art/' + file)
      expect([bytes[0], bytes[1], bytes[2]], `${file} is a JPEG`).toEqual([0xff, 0xd8, 0xff])
      expect(bytes.length).toBe(INDEX.files[file]!.bytes)
    }
  })

  it('the Flaming Longsword first: it has card art — its weapon\'s card, as every enchanted or masterwork row shows its base\'s', () => {
    const have = INDEX.items ?? {}
    expect(have[SWORD], 'the Flaming Longsword has card art').toBeTruthy()
    expect(itemOf(SWORD).base).toBe('item.longsword')
    expect(have[SWORD]).toBe(have['item.longsword'])
    for (const r of ITEMS) if (r.base && !(r.id in have)) expect(r.base in have, `${r.id} has none, so its base ${r.base} has none`).toBe(false)
    for (const r of ITEMS) if (r.base && r.base in have) expect(have[r.id], `${r.id} shows its base's card`).toBeTruthy()
  })

  it('every item the opening\'s rewards can offer and every item a base hero\'s kit holds is covered — art, or named in itemsMissing', () => {
    const have = INDEX.items ?? {}, missing = INDEX.itemsMissing ?? {}
    const named = ENCOUNTER_REWARDS.flatMap((r) => r.offer.kind === 'item' ? [r.offer.itemId] : [])
    const kits = [...HERO_POOL, ...CIVILIANS, ...RESCUABLE_CIVILIANS].flatMap((h) => h.equipped)
    expect(named).toContain(SWORD)
    for (const id of new Set([...named, ...REWARDS.map((r) => r.id), ...kits])) expect(id in have || id in missing, `${id} has art or is listed as missing`).toBe(true)
  })

  it('a reward card shows its item\'s own card art; an item with none shows the plain card — never another item\'s picture', () => {
    expect(typeof itemArtOf, 'ui/art.ts itemArtOf').toBe('function')
    expect(itemArtOf!(SWORD)).toBe(uriOf(SWORD))
    const bare = REWARDS.find((r) => !(r.id in art.items))!.id
    expect(itemArtOf!(bare)).toBeNull()
    const ctx = atRewards([SWORD, 'item.daggers', bare])
    const cards = blocks(rewardsScreen(ctx.campaign, [], null), /<div class="reward-card-wrapper"/g)
    expect(cards.length).toBe(3)
    const cardOf = (id: string) => cards.find((x) => x.includes(`data-id="${id}"`))!
    expect(imagesIn(cardOf(SWORD)), 'the Flaming Longsword\'s reward card shows its card art').toEqual([uriOf(SWORD)])
    expect(cardOf(SWORD)).toContain('data-art="1"')
    expect(imagesIn(cardOf('item.daggers'))).toEqual([uriOf('item.daggers')])
    expect(imagesIn(cardOf(bare)), `${bare} has no art: no image`).toEqual([])
    expect(cardOf(bare)).toContain('data-art="0"')
    expect(cardOf(bare), 'the plain card').toContain('reward-card-art">no art yet')
    // the card still says what it said: the item's class, tier and name
    expect(cardOf(SWORD)).toContain('Flaming Longsword')
  })

  it('Equip shows the art of the items it shows: the ones a hero wears and the ones in the stash; one with no art is plain', () => {
    const ctx = atRewards([]), c = ctx.campaign, hero = Object.keys(c.roster)[0]!
    const bare = REWARDS.find((r) => !(r.id in art.items) && itemOf(r.id).itemClass === 'trinket')!.id
    c.stash = [SWORD, bare]
    const html = equipPage(c, [hero], { where: 'prep', picked: null })
    // the stash: one tile per item
    const tiles = blocks(html, /<div class="item[ "]/g)
    const tileOf = (id: string) => tiles.find((x) => x.includes(`data-id="${id}"`))!
    expect(imagesIn(tileOf(SWORD)), 'the Flaming Longsword in the stash shows its card art').toEqual([uriOf(SWORD)])
    expect(imagesIn(tileOf(bare)), `${bare} in the stash is plain`).toEqual([])
    expect(tileOf(bare)).toContain(itemOf(bare).name)
    // worn: each slot that holds an item with art shows it
    const slots = blocks(html, /<div class="slot[ "]/g).filter((x) => x.includes('class="v"'))
    const worn = c.roster[hero]!.equipped
    expect(worn).toContain('item.longsword')
    for (const id of worn) {
      const slot = slots.find((x) => x.includes(`data-holds="${id}"`))
      expect(slot, `${id} is in a slot`).toBeTruthy()
      expect(imagesIn(slot!), `${id} on the hero ${id in art.items ? 'shows its card art' : 'is plain'}`).toEqual(id in art.items ? [uriOf(id)] : [])
    }
  })

  it('the pages carry the items\' art: BATTLE-SANDBOX.html and SLICE.html hold the Flaming Longsword\'s picture', () => {
    const file = (INDEX.items ?? {})[SWORD]
    expect(file).toBeTruthy()
    const uri = 'data:image/jpeg;base64,' + readFileSync('generated/art/' + file).toString('base64')
    for (const page of ['BATTLE-SANDBOX.html', 'SLICE.html']) expect(readFileSync(page, 'utf8').includes(uri), `${page} holds ${file}`).toBe(true)
  })

  it('the page: the Flaming Longsword\'s reward card shows its card art; every reward card shows art or its item is named in itemsMissing; Equip\'s items the same', () => {
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(three).toMatch(/the Flaming Longsword's reward card showed its card art/)
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toMatch(/item card art: \d+ reward cards — [1-9]\d* showed their item's card art, \d+ plain and named in itemsMissing; \d+ items on Equip — [1-9]\d* with art, \d+ plain and named in itemsMissing/)
  }, 1800000)
})
