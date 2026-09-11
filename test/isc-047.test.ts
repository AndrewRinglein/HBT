// V2 quests: staffing, due Field outcomes, exact party, and rewards paid once.
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { tickWeek, beginWeek, beginStage, performAdvance, canAdvance } from '../src/core/week.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { commitmentOf } from '../src/core/assignments.js'
import * as Q from '../src/core/quests.js'
import { QUESTS, questRowOf } from '../src/content/quests.js'
import { HERO_POOL, CIVILIANS } from '../src/content/heroes.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import { CUP_IDS } from '../src/content/cups.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { listDeployable, canDeploy, canUndeploy, performAdvancePrep } from '../src/core/prep.js'
import { performLeaveLevelUp } from '../src/core/rewards.js'
import { playEngagement, DEFAULTS, playWeeks } from '../src/sim/autoplay.js'
import { viewBattle } from '../src/view/battle.js'
import { portraitIdOf } from '../src/ui/art.js'
import { recapScreen, rewardsScreen } from '../src/ui/after.js'
import { questCards, questReportScreen } from '../src/ui/quests.js'
import { withUnitFate } from '../src/core/result.js'
import { xpForLevel } from '../src/content/levels.js'
const R = 'quest.rescue-civilian', S = 'quest.recover-supplies', E = 'quest.escort'
const H = HERO_POOL[0]!.id, H2 = HERO_POOL[1]!.id, C = CIVILIANS[0]!.id, party = [H, H2, C]
function city() {
  const ctx = loadFixture(c => {
    for (const h of [...HERO_POOL, ...CIVILIANS]) c.roster[h.id] = structuredClone(h)
    for (const h of Object.values(c.roster)) h.badges = ['badge.responsible']
    c.assignments = {}; c.unavailable = []; c.foughtThisWeek = []
  })
  beginStage(ctx, 'stage.city', 'test'); return ctx
}
const copy = (ctx: Ctx) => makeCtx(campaignOf(saveOf(ctx.campaign)))
function due(ctx: Ctx) {
  tickWeek(ctx, 'test'); beginWeek(ctx, 'test'); performAdvance(ctx, 'test')
  setCursor(ctx, { attack: null }, 'test'); performAdvance(ctx, 'test')
}
function supplies(escorts = 0, combat = false) {
  const ctx = city(); Q.performSendQuest(ctx, S, [H, ...[C, H2].slice(0, escorts)], 'test', H)
  for (let seed = 0; seed < 10000; seed++) {
    ctx.campaign.cups[CUP_IDS.quest] = seed
    if ((Q.resolveQuestOutcome(ctx.campaign, ctx.campaign.quests[S]!).kind === 'battle') === combat) return ctx
  }
  throw new Error('no seeded quest outcome')
}
function report(ctx: Ctx) {
  Q.performAcknowledgeQuest(ctx, 'test')
  if (ctx.campaign.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
}
function battle(ctx: Ctx, won = true) {
  while (ctx.campaign.cursor.step === 'prep') performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!, { result, reckoning } = decide(ctx, panelResult(ctx, won))
  return { e, result, reckoning }
}
function unchanged(ctx: Ctx, f: () => void, reason: RegExp) {
  const before = saveOf(ctx.campaign), n = ctx.events.length
  expect(f).toThrow(reason); expect(saveOf(ctx.campaign)).toBe(before); expect(ctx.events).toHaveLength(n)
}
describe('ISC047 — V2 opening quests', () => {
  it('offers both opening quests first and retains Escort, only in City', () => {
    const ctx = city()
    expect(QUESTS.map(q => q.id)).toEqual([R, S, E]); expect(Q.listQuestOffers(ctx.campaign)).toEqual([R, S, E])
    beginWeek(ctx, 'test'); expect(Q.listQuestOffers(ctx.campaign)).toEqual([])
  })
  it('Rescue requires exactly three distinct people; civilians qualify', () => {
    const c = city().campaign
    for (const ids of [[], [H], [H, C], [...party, HERO_POOL[2]!.id], [H, H, C]]) expect(Q.canSendQuest(c, R, ids)).toBe(false)
    expect(Q.canSendQuest(c, R, party)).toBe(true)
    expect(Q.canSendQuest(c, R, CIVILIANS.map(h => h.id))).toBe(true)
  })
  it.each(['absent', 'busy', 'exhausted', 'fought', 'dead'] as const)('refuses a %s participant without writes', state => {
    const ctx = city(), c = ctx.campaign
    if (state === 'absent') c.unavailable = [{ heroId: H, story: 'Away' }]
    if (state === 'busy') c.assignments[H] = { kind: 'rest', target: 'rest', weeks: 1 }
    if (state === 'exhausted') c.roster[H]!.badges.push('badge.exhausted')
    if (state === 'fought') c.foughtThisWeek = [H]
    if (state === 'dead') c.roster[H]!.lifeState = 'dead'
    expect(Q.canSendQuest(c, R, party)).toBe(false)
    unchanged(ctx, () => Q.performSendQuest(ctx, R, party, 'test'), /refused/)
  })
  it('Supplies requires an explicit hero lead and no more than two distinct escorts', () => {
    const c = city().campaign
    expect(Q.canSendQuest(c, S, [H])).toBe(false)
    expect(Q.canSendQuest(c, S, [C], C)).toBe(false); expect(Q.canSendQuest(c, S, [C], H)).toBe(false)
    expect(Q.canSendQuest(c, S, [H, H], H)).toBe(false)
    expect(Q.canSendQuest(c, S, [...party, HERO_POOL[2]!.id], H)).toBe(false)
    for (const ids of [[H], [H, C], party]) expect(Q.canSendQuest(c, S, ids, H)).toBe(true)
  })
  it('holds the sorted party through due battles and pays the designated lead, not the first hero', () => {
    const ctx = city(); Q.performSendQuest(ctx, S, [C, H, H2], 'test', H2)
    const q = ctx.campaign.quests[S]!, purse = { ...ctx.campaign.purse }
    expect(q.leadHeroId).toBe(H2); expect(q.heroes).toEqual([...party].sort())
    tickWeek(ctx, 'test'); beginWeek(ctx, 'test')
    for (const id of party) expect(commitmentOf(ctx.campaign, id, 'field')).toBe('onQuest')
    performAdvance(ctx, 'test')
    for (const id of party) expect(commitmentOf(ctx.campaign, id, 'field')).toBe('onQuest')
    expect(ctx.campaign.purse).toEqual(purse)
    setCursor(ctx, { attack: null }, 'test'); performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('questReport'); expect(canAdvance(ctx.campaign)).toBe(false)
    const xp = party.map(id => ctx.campaign.roster[id]!.xp); report(ctx)
    party.forEach((id, i) => expect(ctx.campaign.roster[id]!.xp - xp[i]!).toBe(id === H2 ? 5 : 0))
    expect(ctx.campaign.purse['currency.supplies']).toBe(purse['currency.supplies']! + 10)
    expect(ctx.campaign.quests[S]).toBeUndefined()
  })
  it('uses the exact 5-percent boundary and two escorts make all rolls safe', () => {
    for (const escorts of [0, 1]) {
      expect(Q.questCombatAt(questRowOf(S), escorts, 4)).toBe(true)
      expect(Q.questCombatAt(questRowOf(S), escorts, 5)).toBe(false)
      expect(Q.questCombatAt(questRowOf(S), escorts, 99)).toBe(false)
    }
    for (let roll = 0; roll < 100; roll++) expect(Q.questCombatAt(questRowOf(S), 2, roll)).toBe(false)
    expect(Q.questCombatAt(questRowOf(R), 0, 0)).toBe(false)
  })
  it('reaches both risky branches with real named seeds; reload and party order cannot reroll', () => {
    for (const escorts of [0, 1]) for (const combat of [true, false]) {
      const ctx = supplies(escorts, combat), q = ctx.campaign.quests[S]!, a = Q.resolveQuestOutcome(ctx.campaign, q)
      expect(a.kind).toBe(combat ? 'battle' : 'report')
      expect(Q.resolveQuestOutcome(copy(ctx).campaign, { ...q, heroes: [...q.heroes].reverse() })).toEqual(a)
      due(ctx); expect(ctx.campaign.quests[S]!.outcome).toEqual(a)
    }
  })
  it('rescues unique independently equipped instances even when every template is owned and the recruit cap is exceeded', () => {
    const ctx = city(), original = new Set(Object.keys(ctx.campaign.roster))
    Q.performSendQuest(ctx, R, party, 'test'); due(ctx)
    const xp = party.map(id => ctx.campaign.roster[id]!.xp), restored = copy(ctx)
    report(ctx); report(restored); expect(restored.campaign).toEqual(ctx.campaign)
    party.forEach((id, i) => expect(ctx.campaign.roster[id]!.xp - xp[i]!).toBe(3))
    const rescued = Object.values(ctx.campaign.roster).find(h => !original.has(h.id))!
    expect(rescued).toBeDefined(); expect(CIVILIANS.map(h => h.id)).toContain(rescued.templateId)
    expect(portraitIdOf(rescued)).toBe(rescued.templateId); expect(rescued.id).not.toBe(rescued.templateId)
    expect(rescued.equipped).not.toBe(ctx.campaign.roster[rescued.templateId!]!.equipped)
    beginStage(ctx, 'stage.city', 'test'); Q.performSendQuest(ctx, R, party, 'test'); due(ctx); report(ctx)
    const additions = Object.values(ctx.campaign.roster).filter(h => !original.has(h.id))
    expect(additions).toHaveLength(2); expect(new Set(additions.map(h => h.id)).size).toBe(2)
    beginWeek(ctx, 'test'); const e = loadFixture().campaign.cursor.engagement!
    e.deployed = additions.map(h => h.id); setCursor(ctx, { engagement: e }, 'test')
    expect(viewBattle(ctx.campaign).units.filter(u => u.side === 'hero')).toHaveLength(2)
  })
  it('saved report acknowledgment pays once and cannot be skipped by advancing', () => {
    const ctx = supplies(2), purse = { ...ctx.campaign.purse }; due(ctx)
    const restored = copy(ctx)
    unchanged(restored, () => performAdvance(restored, 'test'), /finish|refused/)
    expect(restored.campaign.purse).toEqual(purse); report(restored)
    unchanged(restored, () => Q.performAcknowledgeQuest(restored, 'test'), /refused/)
    const after = copy(restored); performAdvance(after, 'test')
    expect(after.campaign.cursor.stage).toBe('stage.city'); expect(after.campaign.purse).toEqual(restored.campaign.purse)
    expect(after.events.filter(e => e.type === 'quest.resolved')).toEqual([])
  })
  it('two due reports process serially across reload without skipping or repeating either', () => {
    const ctx = city()
    Q.performSendQuest(ctx, R, CIVILIANS.map(h => h.id), 'test')
    Q.performSendQuest(ctx, S, HERO_POOL.slice(0, 3).map(h => h.id), 'test', H)
    due(ctx); expect(ctx.campaign.cursor.questReport).toBe(ctx.campaign.quests[R]!.runId)
    report(ctx); const restored = copy(ctx); performAdvance(restored, 'test')
    expect(restored.campaign.cursor.step).toBe('questReport')
    expect(restored.campaign.cursor.questReport).toBe(restored.campaign.quests[S]!.runId)
    report(restored); performAdvance(restored, 'test')
    expect(restored.campaign.cursor.stage).toBe('stage.city'); expect(restored.campaign.quests).toEqual({})
  })
  it('risky battle fixes its dispatched party, retains assignment and works through autoplay', () => {
    const ctx = supplies(1, true), q = structuredClone(ctx.campaign.quests[S]!); due(ctx)
    expect(ctx.campaign.cursor.engagement!.deployed).toEqual(q.heroes)
    expect(ctx.campaign.cursor.engagement!.questRunId).toBe(q.runId); expect(listDeployable(ctx.campaign)).toEqual([])
    setCursor(ctx, { prepStep: 'deploy' }, 'test')
    expect(canDeploy(ctx.campaign, H2)).toBe(false); expect(canUndeploy(ctx.campaign, H)).toBe(false)
    for (const id of q.heroes) expect(ctx.campaign.assignments[id]?.kind).toBe('quest')
    playEngagement(ctx, DEFAULTS, 'test')
    expect(ctx.campaign.quests[S]).toBeUndefined(); expect(ctx.campaign.cursor.rewardOffer).toBeNull()
  })
  it.each([true, false])('battle won=%s preserves combat XP, pays quest reward only on victory, and never pays twice', won => {
    const ctx = supplies(1, true), start = structuredClone(ctx.campaign); due(ctx)
    const { e, result, reckoning } = battle(ctx, won); expect(reckoning.grants).toEqual([])
    const restored = copy(ctx); applyBattleResult(ctx, e, result, reckoning)
    const b = restored.campaign.cursor.battle!
    applyBattleResult(restored, restored.campaign.cursor.engagement!, b.result!, b.reckoning!)
    expect(restored.campaign).toEqual(ctx.campaign)
    expect(ctx.campaign.purse['currency.supplies']).toBe(start.purse['currency.supplies']! + (won ? 10 : 0))
    for (const cur of ['currency.faith', 'currency.mana', 'currency.salvage']) expect(ctx.campaign.purse[cur]).toBe(start.purse[cur])
    for (const h of reckoning.heroes) expect(ctx.campaign.roster[h.heroId]!.xp - start.roster[h.heroId]!.xp).toBe(h.xp + (won && h.heroId === H ? 5 : 0))
    expect(ctx.campaign.cursor.rewardOffer).toBeNull(); expect(ctx.campaign.quests[S]).toBeUndefined()
    expect(ctx.campaign.foughtThisWeek).toEqual([...e.deployed].sort())
    const after = copy(ctx)
    unchanged(after, () => applyBattleResult(after, e, result, reckoning), /once|refused/)
    performExitBattle(after, 'test'); if (after.campaign.cursor.step === 'levelUp') performLeaveLevelUp(after, 'test')
    performAdvance(after, 'test'); expect(after.campaign.cursor.stage).toBe('stage.city')
  })
  it('rejects duplicate Reckoning heroes before writes in ordinary combat too', () => {
    const ctx = toBattle(loadFixture(), 2), e = ctx.campaign.cursor.engagement!
    const { result, reckoning } = decide(ctx, panelResult(ctx, true)); reckoning.heroes.push({ ...reckoning.heroes[0]! })
    unchanged(ctx, () => applyBattleResult(ctx, e, result, reckoning), /duplicate|twice|exactly/)
  })
  it.each(['missing', 'party', 'completed'] as const)('rejects %s quest linkage before battle writes', bad => {
    const ctx = supplies(1, true); due(ctx); const { e, result, reckoning } = battle(ctx)
    if (bad === 'missing') delete e.questRunId
    if (bad === 'party') e.deployed.reverse()
    if (bad === 'completed') delete ctx.campaign.quests[S]
    unchanged(ctx, () => applyBattleResult(ctx, e, result, reckoning), /quest|party/i)
  })
  it('retains Escort duration, exclusivity, Faith and repeat offer with visible acknowledgment', () => {
    const ctx = city(), faith = ctx.campaign.purse['currency.faith']!
    Q.performSendQuest(ctx, E, [H], 'test'); expect(Q.listQuestOffers(ctx.campaign)).not.toContain(E)
    expect(() => Q.performSendQuest(ctx, E, [H2], 'test')).toThrow(/flight/)
    tickWeek(ctx, 'test'); expect(ctx.campaign.quests[E]!.weeksLeft).toBe(1)
    due(ctx); expect(ctx.campaign.purse['currency.faith']).toBe(faith); report(ctx)
    expect(ctx.campaign.purse['currency.faith']).toBe(faith + questRowOf(E).reward['currency.faith']!)
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
    performAdvance(ctx, 'test'); expect(Q.listQuestOffers(ctx.campaign)).toContain(E)
  })
  it('whole Weeks continue through reports and battles using the same rules', () => {
    const ctx = supplies(1, true)
    playWeeks(ctx, 2, { target: () => null, labours: () => [], quest: () => null }, 'test')
    expect(ctx.campaign.quests).toEqual({}); expect(ctx.events.filter(e => e.type === 'quest.resolved')).toHaveLength(1)
  })
  it.each(['run', 'lead', 'party', 'outcome', 'pointer', 'stage'] as const)('refuses a corrupted %s in a saved quest report', bad => {
    const ctx = supplies(2); due(ctx); const c = ctx.campaign, q = c.quests[S]!
    if (bad === 'run') q.runId = 'forged'
    if (bad === 'lead') q.leadHeroId = C
    if (bad === 'party') q.heroes.push(q.heroes[0]!)
    if (bad === 'outcome') q.outcome = null
    if (bad === 'pointer') c.cursor.questReport = 'unknown'
    if (bad === 'stage') { c.cursor.stage = 'stage.city'; c.cursor.fieldStep = null }
    expect(() => campaignOf(saveOf(c))).toThrow(/quest/i)
  })
  it('retreat completes without success rewards and dead leads receive no fixed XP on victory', () => {
    for (const retreat of [true, false]) {
      const ctx = supplies(1, true), before = structuredClone(ctx.campaign); due(ctx)
      while (ctx.campaign.cursor.step === 'prep') performAdvancePrep(ctx, 'test')
      let r = panelResult(ctx, true)
      if (retreat) r = { ...r, outcome: 'capped' }
      else r = withUnitFate(r, 'hero', ctx.campaign.cursor.engagement!.deployed.indexOf(H), { lifeState: 'dead' })
      const { result, reckoning } = decide(ctx, r)
      applyBattleResult(ctx, ctx.campaign.cursor.engagement!, result, reckoning)
      expect(ctx.campaign.purse['currency.supplies']).toBe(before.purse['currency.supplies']! + (retreat ? 0 : 10))
      if (!retreat) expect(ctx.campaign.roster[H]!.xp).toBe(before.roster[H]!.xp)
      expect(ctx.campaign.quests[S]).toBeUndefined()
    }
  })
  it('saved battle recap preserves combat XP and displays the separate fixed quest reward', () => {
    const ctx = supplies(1, true); due(ctx); const { e, result, reckoning } = battle(ctx)
    applyBattleResult(ctx, e, result, reckoning)
    const rendered = recapScreen(ctx.campaign, ctx.events, null)
    expect(recapScreen(copy(ctx).campaign, [], null)).toBe(rendered)
    expect(rendered).toContain('Quest reward'); expect(rendered).toContain('5 quest XP'); expect(rendered).toContain('10 supplies')
  })
  it('the UI requires lead selection and renders the saved report result', () => {
    const ctx = city(), free = Object.keys(ctx.campaign.roster)
    expect(questCards(ctx.campaign, [S], free, [H], null)).toContain('needs a designated hero lead')
    expect(questCards(ctx.campaign, [S], free, [H], H)).toContain('data-act="quest-lead"')
    Q.performSendQuest(ctx, R, party, 'test'); due(ctx)
    const rendered = questReportScreen(ctx.campaign)
    expect(rendered).toContain('Complete quest'); expect(rendered).toContain('joins the roster')
    expect(questReportScreen(copy(ctx).campaign)).toBe(rendered)
  })
  it('cannot relabel a pending quest battle as ordinary combat to bypass reward ownership', () => {
    const ctx = supplies(1, true); due(ctx); const { e, result, reckoning } = battle(ctx)
    const forged = { ...e, kind: 'engagement.conquer' }; delete forged.questRunId
    unchanged(ctx, () => applyBattleResult(ctx, forged, result, reckoning), /quest|Engagement|engagement/)
  })
  it('report XP exposes the earned level without presenting a defeat or an empty battle party', () => {
    const ctx = supplies(2); ctx.campaign.roster[H]!.xp = xpForLevel(2)! - 1; due(ctx)
    Q.performAcknowledgeQuest(ctx, 'test'); expect(ctx.campaign.cursor.step).toBe('levelUp')
    const html = rewardsScreen(copy(ctx).campaign, [], null)
    expect(html).toContain(ctx.campaign.roster[H]!.name); expect(html).toContain('LEVEL UP')
    expect(html).not.toContain('Defeat'); expect(html).not.toContain('nobody was deployed')
  })
  it('a report followed by a battle survives both pauses and returns to City only after both outcomes', () => {
    const ctx = supplies(0, true); Q.performSendQuest(ctx, R, CIVILIANS.map(h => h.id), 'test'); due(ctx)
    report(ctx); const resumed = copy(ctx); performAdvance(resumed, 'test')
    expect(resumed.campaign.cursor.step).toBe('prep')
    const fighting = copy(resumed); playEngagement(fighting, DEFAULTS, 'test')
    expect(fighting.campaign.quests).toEqual({}); const after = copy(fighting); performAdvance(after, 'test')
    expect(after.campaign.cursor.stage).toBe('stage.city')
  })
  it.each(['classes', 'badges', 'equipped', 'unitType'] as const)('rejects malformed saved rescue %s before any fixed XP or recruitment', field => {
    const ctx = city(); Q.performSendQuest(ctx, R, party, 'test'); due(ctx)
    const out = ctx.campaign.quests[R]!.outcome!
    if (out.kind !== 'report' || !out.rescued) throw new Error('expected rescue report')
    const payload = out.rescued as unknown as Record<string, unknown>
    payload[field] = field === 'unitType' ? 'unit.does-not-exist' : null
    const saved = saveOf(ctx.campaign)
    unchanged(ctx, () => Q.performAcknowledgeQuest(ctx, 'test'), /./)
    expect(() => campaignOf(saved)).toThrow(/quest|rescue/i)
  })
})
