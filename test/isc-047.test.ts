// V2: dispatch in City, retain party through due Field battles, release and reward together.
// ISC-047 — stage.city offers one authored quest; sending heroes takes both
// their slots for N Weeks; tickWeek brings it back and resolves its reward.
// GAME-ARCHITECTURE.md §2.6 QUESTS · THIN-SLICE-REVIEW.md §D
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { tickWeek, beginWeek, performAdvance } from '../src/core/week.js'
import { setCursor } from '../src/core/mutate.js'
import { commitmentOf } from '../src/core/assignments.js'
import { listQuestOffers, canSendQuest, performSendQuest, whyNotSendQuest } from '../src/core/quests.js'
import { QUESTS, questRowOf } from '../src/content/quests.js'
import type { CampaignState } from '../src/core/campaign.js'

const atQuest = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
const QUEST = 'quest.escort'

describe('ISC-047 — one quest goes out and comes back', () => {
  it('the Quest Stage offers the one authored quest and nothing else; another Stage offers none', () => {
    const ctx = loadFixture(atQuest)
    expect(QUESTS.map((q) => q.id)).toEqual([QUEST])
    expect(listQuestOffers(ctx.campaign)).toEqual([QUEST])
    const elsewhere = loadFixture((c) => { atQuest(c); c.cursor.stage = 'stage.field' })
    expect(listQuestOffers(elsewhere.campaign)).toEqual([])
  })
  it('sending a hero takes both slots for the row\'s Weeks, is refused for a busy or absent hero, and the quest is in flight', () => {
    const ctx = loadFixture(atQuest)
    const row = questRowOf(QUEST)
    const [h1, h2] = Object.keys(ctx.campaign.roster).sort() as [string, string]
    expect(canSendQuest(ctx.campaign, QUEST, [h1])).toBe(true)
    expect(whyNotSendQuest(ctx.campaign, QUEST, [])).toMatch(/needs/)
    performSendQuest(ctx, QUEST, [h1], 'test')
    expect(ctx.campaign.assignments[h1]).toEqual({ kind: 'quest', target: QUEST, weeks: row.weeks })
    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
    expect(commitmentOf(ctx.campaign, h1, 'city')).toBe('onQuest')
    expect(ctx.campaign.quests[QUEST]).toEqual({ id: QUEST, heroes: [h1], weeksLeft: row.weeks, sentWeek: ctx.campaign.week, dueWeek: ctx.campaign.week + row.weeks })
    expect(listQuestOffers(ctx.campaign)).toEqual([])                                   // in flight: not offered twice
    expect(ctx.events.filter((e) => e.type === 'quest.sent').length).toBe(1)
    expect(whyNotSendQuest(ctx.campaign, QUEST, [h2])).toMatch(/in flight/)
    const busy = loadFixture((c) => { atQuest(c); c.unavailable = [{ heroId: h1, story: 'Went missing' }] })
    expect(canSendQuest(busy.campaign, QUEST, [h1])).toBe(false)
    expect(() => performSendQuest(busy, QUEST, [h1], 'test')).toThrow(/refused/)
  })
  it('tickWeek counts it down; after the due Field battles it comes home, pays its reward, frees the hero, and is offered again', () => {
    const ctx = loadFixture(atQuest)
    const row = questRowOf(QUEST)
    const [h1] = Object.keys(ctx.campaign.roster).sort() as [string]
    const faith = ctx.campaign.purse['currency.faith']!
    performSendQuest(ctx, QUEST, [h1], 'test')
    for (let w = row.weeks; w > 1; w--) {
      tickWeek(ctx, 'test')
      expect(ctx.campaign.quests[QUEST]!.weeksLeft).toBe(w - 1)
      expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
    }
    tickWeek(ctx, 'test')
    expect(ctx.campaign.quests[QUEST]!.weeksLeft).toBe(0)
    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
    expect(ctx.campaign.purse['currency.faith']).toBe(faith)
    beginWeek(ctx, 'test')
    performAdvance(ctx, 'test')
    setCursor(ctx, { attack: null }, 'test')
    performAdvance(ctx, 'test')
    expect(ctx.campaign.quests[QUEST]).toBeUndefined()
    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('free')
    expect(commitmentOf(ctx.campaign, h1, 'city')).toBe('free')
    expect(ctx.campaign.purse['currency.faith']).toBe(faith + row.reward['currency.faith']!)
    const resolved = ctx.events.filter((e) => e.type === 'quest.resolved')
    expect(resolved.length).toBe(1)
    expect(resolved[0]!['won']).toBe(true)
    expect(ctx.campaign.purse['currency.salvage']).toBe(loadFixture().campaign.purse['currency.salvage'])   // quests never pay Salvage
    atQuest(ctx.campaign)
    expect(listQuestOffers(ctx.campaign)).toEqual([QUEST])
  })
})
