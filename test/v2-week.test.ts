import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { performTakeReward, listRewardOffers, performLeaveLevelUp } from '../src/core/rewards.js'
import { resolveThreat } from '../src/core/map.js'
import { canUseActivity } from '../src/core/activity.js'
import { canDeploy } from '../src/core/prep.js'
// KINGDOM-V2-2026-09-07: two halves, one weekly commitment, quest returns
// after the due Week's field battles. These replace V1's independent slots.
import { describe, expect, it } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { STAGES } from '../src/content/stages.js'
import { beginStage, beginWeek, performAdvance, tickWeek, canAdvance, listStageOffers, performChooseEngagement } from '../src/core/week.js'
import { canCommit, commitmentOf, performCommit, performRelease } from '../src/core/assignments.js'
import { canAssignLabour, performAssignLabour } from '../src/core/mend.js'
import { listQuestOffers, performSendQuest } from '../src/core/quests.js'
import { makeCtx, setCursor } from '../src/core/mutate.js'
import { saveOf, campaignOf } from '../src/core/campaign.js'

const H = 'hero.base.warrior-iron'
describe('V2 Week spine', () => {
  it('defines Field then City, with Conquest before Defense and quest returns', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['stage.field', 'stage.city'])
    const ctx = loadFixture()
    beginWeek(ctx, 'test')
    expect(ctx.campaign.cursor.stage).toBe('stage.field')
    expect(ctx.campaign.cursor).toMatchObject({ fieldStep: 'conquest' })
    performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor).toMatchObject({ stage: 'stage.field', fieldStep: 'defense' })
    setCursor(ctx, { attack: null }, 'test')
    performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor).toMatchObject({ stage: 'stage.field', fieldStep: 'quests' })
    performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor.stage).toBe('stage.city')
    expect(campaignOf(saveOf(ctx.campaign))).toEqual(ctx.campaign)
  })

  it('a committed field hero cannot also take city work', () => {
    const ctx = loadFixture()
    performCommit(ctx, H, { kind: 'engagement', target: 'test.battle', weeks: 1 }, 'test')
    expect(canCommit(ctx.campaign, H, { kind: 'rest', target: 'rest', weeks: 1 })).toBe(false)
  })

  it('City offers quests and recovery together; Exhausted permits recovery but no quest', () => {
    const ctx = loadFixture((c) => { c.roster[H]!.badges = ['badge.exhausted', 'badge.fatigued'] })
    beginStage(ctx, 'stage.city', 'test')
    expect(listQuestOffers(ctx.campaign)).toContain('quest.escort')
    expect(canAssignLabour(ctx.campaign, H, 'rest')).toBe(true)
    expect(canCommit(ctx.campaign, H, { kind: 'quest', target: 'quest.escort', weeks: 2 })).toBe(false)
    expect(canAssignLabour(ctx.campaign, H, 'pray')).toBe(false)
    performAssignLabour(ctx, H, 'rest', 'test')
    performAdvance(ctx, 'test')
    expect(ctx.campaign.roster[H]!.badges).not.toContain('badge.exhausted')
    expect(ctx.campaign.roster[H]!.badges).not.toContain('badge.fatigued')
  })

  it('quest participants remain away during the due Field battles and return at quest resolution', () => {
    const ctx = loadFixture()
    beginStage(ctx, 'stage.city', 'test')
    const faith = ctx.campaign.purse['currency.faith']!
    performSendQuest(ctx, 'quest.escort', [H], 'test')
    tickWeek(ctx, 'test'); tickWeek(ctx, 'test')
    beginWeek(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('onQuest')
    expect(ctx.campaign.purse['currency.faith']).toBe(faith)
    performAdvance(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('onQuest')
    setCursor(ctx, { attack: null }, 'test')
    performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor).toMatchObject({ fieldStep: 'quests' })
    expect(ctx.campaign.quests['quest.escort']).toBeUndefined()
    expect(ctx.campaign.purse['currency.faith']).toBeGreaterThan(faith)
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('free')
  })
})


describe('V2 continuation and activity boundaries', () => {
  it('a saved result, recap, reward and level screen all resume the same Field activity exactly once', () => {
    const ctx = toBattle(loadFixture((c) => { for (const h of Object.values(c.roster)) h.badges = ['badge.responsible'] }), 2)
    const e = ctx.campaign.cursor.engagement!
    decide(ctx, panelResult(ctx, true))
    let copy = makeCtx(campaignOf(saveOf(ctx.campaign)))
    const apply = (x: typeof ctx) => { const b = x.campaign.cursor.battle!; applyBattleResult(x, x.campaign.cursor.engagement!, b.result!, b.reckoning!) }
    apply(ctx); apply(copy)
    expect(copy.campaign).toEqual(ctx.campaign)
    expect(ctx.campaign.foughtThisWeek).toEqual([...e.deployed].sort())
    expect(canCommit(ctx.campaign, e.deployed[0]!, { kind: 'rest', target: 'rest', weeks: 1 })).toBe(false)
    copy = makeCtx(campaignOf(saveOf(copy.campaign)))
    expect(copy.campaign.cursor.step).toBe('reckoning')
    performExitBattle(ctx, 'test'); performExitBattle(copy, 'test')
    copy = makeCtx(campaignOf(saveOf(copy.campaign)))
    expect(copy.campaign.cursor.step).toBe('rewards')
    const reward = listRewardOffers(ctx.campaign)[0]!.id
    performTakeReward(ctx, reward, 'test'); performTakeReward(copy, reward, 'test')
    copy = makeCtx(campaignOf(saveOf(copy.campaign)))
    expect(copy.campaign.cursor.step).toBe('levelUp')
    performLeaveLevelUp(ctx, 'test'); performLeaveLevelUp(copy, 'test')
    expect(copy.campaign).toEqual(ctx.campaign)
    expect(copy.campaign.cursor).toMatchObject({ stage: 'stage.field', fieldStep: 'conquest', step: 'open', fought: 1 })
    expect(listStageOffers(copy.campaign)).toEqual([])
    performAdvance(ctx, 'test'); performAdvance(copy, 'test')
    expect(copy.campaign).toEqual(ctx.campaign)
    expect(copy.campaign.cursor.fieldStep).toBe('defense')
    // Same party can fight again this Week; the City restriction does not consume a Field battle.
    setCursor(copy, { attack: Object.values(copy.campaign.territories).find((t) => t.kingdom)!.id }, 'test')
    performChooseEngagement(copy, listStageOffers(copy.campaign)[0]!, 'test')
    setCursor(copy, { prepStep: 'deploy' }, 'test')
    expect(canDeploy(copy.campaign, e.deployed[0]!)).toBe(true)
  })

  it('reload immediately before and after due reports neither skips nor repeats reward or release', () => {
    const ctx = loadFixture()
    beginStage(ctx, 'stage.city', 'test')
    performSendQuest(ctx, 'quest.escort', [H], 'test')
    expect(() => performRelease(ctx, H, 'city', 'test')).toThrow(/quest returns/)
    tickWeek(ctx, 'test'); tickWeek(ctx, 'test'); beginWeek(ctx, 'test'); performAdvance(ctx, 'test')
    setCursor(ctx, { attack: null }, 'test')
    const copy = makeCtx(campaignOf(saveOf(ctx.campaign)))
    performAdvance(ctx, 'test'); performAdvance(copy, 'test')
    expect(copy.campaign).toEqual(ctx.campaign)
    const paid = { ...copy.campaign.purse }
    const after = makeCtx(campaignOf(saveOf(copy.campaign)))
    performAdvance(after, 'test')
    expect(after.campaign.cursor.stage).toBe('stage.city')
    expect(after.campaign.purse).toEqual(paid)
    expect(after.events.filter((e) => e.type === 'quest.resolved')).toEqual([])
  })

  it('the castle cannot be declined; another Territory may be conceded without rolling another threat', () => {
    const ctx = loadFixture()
    beginWeek(ctx, 'test'); performAdvance(ctx, 'test')
    const castle = Object.values(ctx.campaign.territories).find((t) => t.kingdom)!
    setCursor(ctx, { attack: castle.id }, 'test')
    const before = saveOf(ctx.campaign)
    expect(canAdvance(ctx.campaign)).toBe(false)
    expect(() => performAdvance(ctx, 'test')).toThrow(/refused/)
    expect(saveOf(ctx.campaign)).toBe(before)
    const other = Object.values(ctx.campaign.territories).find((t) => !t.kingdom)!
    other.owned = true
    setCursor(ctx, { attack: other.id }, 'test')
    performAdvance(ctx, 'test')
    expect(other.owned).toBe(false)
    expect(ctx.campaign.cursor.fieldStep).toBe('quests')
    expect(ctx.events.filter((e) => e.type === 'territory.lost')).toHaveLength(1)
  })

  it('skipping Conquest strictly increases the deterministic weekly defense rate', () => {
    const c = loadFixture().campaign
    let normal = 0, skipped = 0
    for (let w = 1; w <= 1000; w++) {
      if (resolveThreat(c, w)) normal++
      if (resolveThreat(c, w, true)) skipped++
      if (resolveThreat(c, w)) expect(resolveThreat(c, w, true)).toBe(resolveThreat(c, w))
    }
    expect(skipped - normal).toBeGreaterThan(70)
    expect(skipped - normal).toBeLessThan(170)
  })

  it('all City services share one guard, and no obsolete weekly labour provides income', () => {
    const ctx = loadFixture()
    beginWeek(ctx, 'test')
    for (const a of ['market', 'build', 'quests', 'chapel'] as const) expect(canUseActivity(ctx.campaign, a)).toBe(false)
    beginStage(ctx, 'stage.city', 'test')
    for (const a of ['market', 'build', 'quests', 'chapel'] as const) expect(canUseActivity(ctx.campaign, a)).toBe(true)
    for (const key of ['farm', 'delve', 'gather']) expect(canAssignLabour(ctx.campaign, H, key)).toBe(false)
    const purse = { ...ctx.campaign.purse }
    performAdvance(ctx, 'test')
    expect(ctx.campaign.purse).toEqual(purse)
    ctx.campaign.ended = { week: ctx.campaign.week, reason: 'test' }
    beginStage(ctx, 'stage.city', 'test')
    for (const a of ['market', 'build', 'quests', 'chapel'] as const) expect(canUseActivity(ctx.campaign, a)).toBe(false)
  })

  it('V1 saves are explicitly refused, and the Field activity is a required V2 cursor field', () => {
    const c = JSON.parse(saveOf(loadFixture().campaign))
    delete c.version
    expect(() => campaignOf(JSON.stringify(c))).toThrow(/V2/)
    c.version = 2; delete c.cursor.fieldStep
    expect(() => campaignOf(JSON.stringify(c))).toThrow(/fieldStep/)
    c.cursor.fieldStep = 'unknown'
    expect(() => campaignOf(JSON.stringify(c))).toThrow(/fieldStep/)
    c.cursor.fieldStep = 'conquest'; c.cursor.stage = 'stage.city'
    expect(() => campaignOf(JSON.stringify(c))).toThrow(/fieldStep/)
    c.cursor.stage = 'stage.unknown'
    expect(() => campaignOf(JSON.stringify(c))).toThrow(/unknown Week half/)
  })
})
