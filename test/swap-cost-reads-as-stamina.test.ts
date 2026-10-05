// kingdom.swap-cost-reads-as-stamina — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'seven answers: the first hero's card
// shows only what is modified; origin badges go on the heroes; Stand Up is one press; …': asked what the stat swapCost (on the
// Fast Hands and Slow Hands badges) should be called on screen — "4 cost 1 stam". Read, and said to him the same day: the line
// says what swapping costs, in Stamina, as a plain sentence — "Swap costs 1 Stamina" with the badge's own number — not a stat
// word and a signed number).
//
// Expect: "The Fast Hands and Slow Hands badges each read as a sentence giving the Stamina a swap costs with that badge; no
// screen shows 'swapcost'; the stat-label test covers swapCost without an exception."
//
// What a swap costs with nothing on the unit is the ENGINE's (core/items.ts FOLD_BASE.swapCost, read through the kingdom's
// door), and what the two badges change is their rows' — both read here, neither assumed.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import * as LABELS from '../src/content/stat-labels.js'
import * as ENGINE from '../src/engine.js'
import { BADGES } from '../src/engine.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import { itemCardOf } from '../src/content/item-card.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { equipPage, deltasOf, setLineOf } from '../src/ui/equip.js'
import { rewardsScreen } from '../src/ui/after.js'
import * as DRAFT from '../src/ui/draft.js'

const statWordsOf = (LABELS as unknown as { statWordsOf?: (k: string, n: number, o?: { lower?: boolean }) => string }).statWordsOf
const BASE = (ENGINE as unknown as { FOLD_BASE?: Record<string, number> }).FOLD_BASE?.['swapCost']
const FAST = 'test.badge.fast-hands', SLOW = 'test.badge.slow-hands'
const changeOf = (badge: string) => (BADGES[badge]!.statModifiers as Record<string, number>)['swapCost']!
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
const NO_FIELD = /swap ?cost(?!s)/i   // "swapcost", "swapCost", "swap cost" — never the sentence's own "Swap costs"

describe('kingdom.swap-cost-reads-as-stamina — the sentence', () => {
  it('what a swap costs is the engine\'s, and what the two badges change is their rows\'', () => {
    expect(typeof BASE, 'the engine\'s base swap cost, through the kingdom\'s door').toBe('number')
    expect(typeof changeOf(FAST)).toBe('number'); expect(typeof changeOf(SLOW)).toBe('number')
    expect(changeOf(FAST)).toBeLessThan(0); expect(changeOf(SLOW)).toBeGreaterThan(0)
  })

  it('a change to the swap cost reads as what a swap then costs, in Stamina — the engine\'s base and the row\'s change — never below 0', () => {
    expect(typeof statWordsOf).toBe('function')
    expect(statWordsOf!('swapCost', changeOf(FAST))).toBe(`Swap costs ${BASE! + changeOf(FAST)} Stamina`)
    expect(statWordsOf!('swapCost', changeOf(SLOW))).toBe(`Swap costs ${BASE! + changeOf(SLOW)} Stamina`)
    expect(statWordsOf!('swapCost', 0)).toBe(`Swap costs ${BASE!} Stamina`)
    expect(statWordsOf!('swapCost', -BASE! - 3), 'as the engine holds it (core/swap.ts swapCostOf)').toBe('Swap costs 0 Stamina')
    // the examples the item names, as the numbers stand today
    expect([statWordsOf!('swapCost', changeOf(FAST)), statWordsOf!('swapCost', 0), statWordsOf!('swapCost', changeOf(SLOW))]).toEqual(['Swap costs 0 Stamina', 'Swap costs 1 Stamina', 'Swap costs 2 Stamina'])
    // where a screen writes its stat words small, the sentence is left as it is
    expect(statWordsOf!('swapCost', changeOf(FAST), { lower: true })).toBe('Swap costs 0 Stamina')
  })

  it('every other stat reads as it did: its signed amount and its word', () => {
    expect(statWordsOf!('maxHp', 2)).toBe('+2 Health')
    expect(statWordsOf!('armor', -1)).toBe('-1 Armor')
    expect(statWordsOf!('rangedBlock', 5)).toBe('+5 Ranged Block')
    expect(statWordsOf!('rangedBlock', 5, { lower: true })).toBe('+5 ranged block')
    expect(statWordsOf!('itemSlots', 1)).toBe('+1 Item Slot')
  })

  it('the stat-label table has no exception left: nothing is on the no-word list, and swapCost is worded', () => {
    expect((LABELS as unknown as { STATS_WITHOUT_A_WORD: readonly string[] }).STATS_WITHOUT_A_WORD).toEqual([])
    expect((LABELS as unknown as { statHasWords?: (k: string) => boolean }).statHasWords?.('swapCost')).toBe(true)
    expect((LABELS as unknown as { statHasWords?: (k: string) => boolean }).statHasWords?.('aStatNobodyNamed')).toBe(false)
  })
})

describe('kingdom.swap-cost-reads-as-stamina — on the screens', () => {
  it('the Fast Hands and Slow Hands badges each read as the sentence, with that badge\'s own cost', () => {
    const giftsBlock = (DRAFT as unknown as { giftsBlock: (g: readonly { key: string; badge?: string }[]) => string }).giftsBlock
    const badgeWordsOf = (DRAFT as unknown as { badgeWordsOf?: (id: string) => string }).badgeWordsOf
    expect(typeof badgeWordsOf, 'the words a draft card says for a badge').toBe('function')
    for (const [badge, cost] of [[FAST, BASE! + changeOf(FAST)], [SLOW, BASE! + changeOf(SLOW)]] as const) {
      expect(badgeWordsOf!(badge), badge).toBe(`Swap costs ${cost} Stamina`)
      const line = text(giftsBlock([{ key: 'badge:' + badge, badge }]))
      expect(line, `${badge}: as a hero's gift`).toContain(`${BADGES[badge]!.name} Swap costs ${cost} Stamina`)
      expect(line).not.toMatch(NO_FIELD)
    }
  })

  /** An item row made to carry a change to the swap cost for the length of one check (no row in the game carries one today). */
  function withSwapCostOn<T>(itemId: string, change: number, run: () => T): T {
    const mods = itemOf(itemId).statModifiers as Record<string, number>, had = 'swapCost' in mods
    expect(had, `${itemId} carries no swap cost of its own`).toBe(false)
    mods['swapCost'] = change
    try { return run() } finally { delete mods['swapCost'] }
  }
  const SHIELD = 'item.tower-shield'
  function atEquip() {
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const row = HERO_POOL.find((h) => h.equipped.includes(SHIELD))!
    c.roster[row.id] = structuredClone(row); c.stash = [SHIELD]
    return { c, hero: row.id }
  }

  it('an item that changed the swap cost would read the same on its card, its Equip tile, what the hero\'s gear gives, and a reward card', () => {
    withSwapCostOn(SHIELD, 1, () => {
      const want = `Swap costs ${BASE! + 1} Stamina`
      // its card
      const gives = itemCardOf(SHIELD).gives.find((g) => g.stat === 'swapCost')!
      expect(gives.words).toBe(want)
      // Equip: the stash tile, and the line of what the hero's gear gives
      const { c, hero } = atEquip(), html = equipPage(c, [hero], { where: 'prep', picked: null })
      const tile = html.slice(html.indexOf(`data-act="pick" data-id="${SHIELD}"`)), small = text(tile.slice(0, tile.indexOf('</small>')))
      expect(small, 'the stash tile').toContain(want)
      expect(small).not.toMatch(NO_FIELD)
      const deltas = [...deltasOf(c, hero).matchAll(/<span class="delta (won|lost)">([^<]*)<\/span>/g)].map((m) => ({ side: m[1]!, words: m[2]! }))
      const mine = deltas.find((d) => /^Swap costs/.test(d.words))!
      expect(mine, `the gear's lines: ${deltas.map((d) => d.words).join(' · ')}`).toBeTruthy()
      expect(mine.words).toBe(want)
      expect(mine.side, 'a swap that costs more is a loss').toBe('lost')
      expect(deltas.map((d) => d.words).join(' ')).not.toMatch(NO_FIELD)
      // a reward card
      c.cursor.step = 'rewards'; c.cursor.rewardOffer = [SHIELD]
      const card = rewardsScreen(c, [], null), words = text(card.slice(card.indexOf('class="reward-description"')).split('</div>')[0]!)
      expect(words).toContain(want)
      expect(words).not.toMatch(NO_FIELD)
    })
    withSwapCostOn(SHIELD, -1, () => {
      const { c, hero } = atEquip()
      const mine = [...deltasOf(c, hero).matchAll(/<span class="delta (won|lost)">([^<]*)<\/span>/g)].map((m) => ({ side: m[1]!, words: m[2]! })).find((d) => /^Swap costs/.test(d.words))!
      expect([mine.words, mine.side], 'a swap that costs less is a gain').toEqual([`Swap costs ${BASE! - 1} Stamina`, 'won'])
    })
  })

  it('a set that paid in swap cost would say the sentence too', () => {
    const row = ITEMS.find((r) => r.setBonus)!
    const line = setLineOf({ itemId: row.id, tag: 'chain', shape: 'per-other', count: 2, stats: { swapCost: -1, precision: 2 }, attackDamage: 0 } as unknown as Parameters<typeof setLineOf>[0])
    expect(line).toContain(`Swap costs ${BASE! - 1} Stamina`)
    expect(line).toContain('+2 precision')
    expect(line).not.toMatch(NO_FIELD)
  })

  it('no screen words a row\'s stat change any other way: every place goes through the one function', () => {
    for (const f of ['src/ui/after.ts', 'src/ui/draft.ts', 'src/ui/equip.ts', 'src/content/item-card.ts', 'src/ui/roster.ts']) {
      const src = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
      expect(src, `${f}: a signed amount beside a stat's label, put together by hand`).not.toMatch(/sign\([^)]*\)\}\s*\$\{(?:esc\()?(?:statLabelOf|label)\(/)
    }
  })
})
