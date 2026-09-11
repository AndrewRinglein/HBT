// ISC-052 — a hero enters the roster wearing its content kit: every drafted or
// recruited hero's `equipped` equals its heroKits row at entry, with one
// item.equipped event per item naming the draft or the Beacon as cause; the
// civilians carry their dictated tool.
// 7-KINGDOM-SETTLED.md 2026-09-02 "starting weapons and starting armor" · hbt-content.json kits
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeCtx } from '../src/core/mutate.js'
import { makeNewCampaign, listDraftOffers, performDraft, performAdvanceOpening } from '../src/core/opening.js'
import { playOpening } from '../src/sim/autoplay.js'
import { listRecruitOffers, performRecruit } from '../src/core/market.js'
import { loadFixture } from './walk.js'
import { HERO_POOL, CIVILIANS, heroKitOf } from '../src/content/heroes.js'
import { itemOf } from '../src/content/items.js'
import type { CampaignState } from '../src/core/campaign.js'

const codex = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8'))
const codexKit = (id: string): string[] => (codex.heroes.heroes as { id: string; kit: string[] | null }[]).find((h) => h.id === id)!.kit!
const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0, recruited: 0 } }

describe('ISC-052 — a hero enters wearing its kit', () => {
  it('every pool hero and civilian row carries the codex kit, and every item in it is a row', () => {
    for (const h of [...HERO_POOL, ...CIVILIANS]) {
      expect(heroKitOf(h.id), h.id).toEqual(codexKit(h.id))
      expect(h.equipped).toEqual(codexKit(h.id))
      for (const id of h.equipped) expect(() => itemOf(id)).not.toThrow()
    }
  })
  it('a drafted hero arrives equipped, with one item.equipped per item caused by the draft', () => {
    const ctx = makeCtx(makeNewCampaign(5))
    performAdvanceOpening(ctx, 'test')
    const pick = listDraftOffers(ctx.campaign)[0]!
    performDraft(ctx, pick.id, 'test')
    expect(ctx.campaign.roster[pick.id]!.equipped).toEqual(codexKit(pick.id))
    const worn = ctx.events.filter((e) => e.type === 'item.equipped' && e['heroId'] === pick.id)
    expect(worn.map((e) => e['itemId'])).toEqual(codexKit(pick.id))
    for (const e of worn) expect(e['from']).toBe('draft')
  })
  it('a recruit from the Beacon arrives equipped; a rescued civilian carries its tool', () => {
    const ctx = loadFixture((c) => { atBuy(c); c.purse['currency.faith'] = 100 })
    const pick = listRecruitOffers(ctx.campaign)[0]!
    performRecruit(ctx, pick.id, 'test')
    expect(ctx.campaign.roster[pick.id]!.equipped).toEqual(codexKit(pick.id))
    expect(ctx.events.filter((e) => e.type === 'item.equipped' && e['heroId'] === pick.id).map((e) => e['from'])).toEqual(codexKit(pick.id).map(() => 'beacon'))
    const opened = playOpening(makeCtx(makeNewCampaign(3)))
    expect(opened.campaign.roster['hero.fixed.orphans']!.equipped).toEqual(['item.pile-of-rocks'])
    expect(opened.events.some((e) => e.type === 'item.equipped' && e['heroId'] === 'hero.fixed.orphans' && e['from'] === 'rescue')).toBe(true)
  })
})
