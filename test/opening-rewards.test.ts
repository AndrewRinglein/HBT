// kingdom.opening-rewards (kingdom.opening-loop-three part 3 of 4). The opening's rewards as ruled — engine DECISIONS.md
// 2026-09-28 'the Orphanage pays 20 XP no matter what' ("Make it so they get 20 XP no matter what, so they get a level"),
// 'levels by XP at 20, 50, 100, 170, 270, 400', 'the opening's party levels up; the Flaming Longsword is a Warrior's or
// a Paladin's; the Bridge gives a reward', 'answers to the 22 questions' ("wounds apply, fatigue does not"); and
// KINGDOM-V2-2026-09-07.md "Sword after battle 2; item choice starts after battle 3".
// Expect: "After a won Orphanage every hero who fought is level 2 with a level-up to take; after a won Lumberjack House
// the Flaming Longsword is offered to a Warrior or Paladin; after a won Bridge three items are offered and one is kept;
// a hero wounded in battle 1 enters battle 2 wounded; nobody is fatigued."
// The rules are content rows keyed by encounter id (src/content/encounter-rewards.ts); src/core names no encounter.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { loadFixture, toEquip, decide, panelResult } from './walk.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { createSandbox, sandboxResult } from '../src/core/sandbox.js'
import { makeBattleState } from '../src/core/seam.js'
import { withUnitFate } from '../src/core/result.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { listLevelUps, viewLevelUp, performLevelUp, performLeaveLevelUp, listRewardOffers, canTakeReward, performTakeReward } from '../src/core/rewards.js'
import { setCursor, type Ctx } from '../src/core/mutate.js'
import type { CampaignState, Engagement } from '../src/core/campaign.js'
import { LEVEL_THRESHOLDS } from '../src/content/levels.js'
import { REWARDS } from '../src/content/rewards.js'
import { ENCOUNTER_REWARDS } from '../src/content/encounter-rewards.js'
import { RECOVERY_BADGES } from '../src/content/recovery.js'
import { runBattle, encounterDef, ENCOUNTERS } from '../src/engine.js'

const ORPHANAGE = 'encounter.opening.orphanage'
const LUMBERJACK = 'encounter.opening.lumberjack'
const BRIDGE = 'encounter.opening.bridge'
const SWORD = 'item.longsword.flaming'
const WARRIOR = 'hero.base.warrior-iron', PRIEST = 'hero.base.priest-armored', RANGER = 'hero.base.ranger-aggressive', PALADIN = 'hero.base.paladin-shiney'
const DEPLOY = [WARRIOR, PRIEST, RANGER]

/** The opening's battle as an Engagement on no Territory (as the prologue's first battles), its id the encounter's. */
const engagementAt = (base: Engagement, id: string): Engagement => ({ ...base, id, territoryId: null, mapId: encounterDef(id).mapId!, enemies: [], deployed: [], seed: 1 })

/** The fixture at the first battle's prep, re-pointed at the Orphanage, `deploy` sent. */
function atOrphanage(deploy: readonly string[] = DEPLOY, edit?: (c: CampaignState) => void): Ctx {
  const ctx = loadFixture((c) => { c.cursor.engagement = engagementAt(c.cursor.engagement!, ORPHANAGE); edit?.(c) })
  toEquip(ctx, deploy)
  performAdvancePrep(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('battle')
  return ctx
}

/** From the Week's open step to the next battle of the opening, `deploy` sent (the page chain is part 4's). */
function toNext(ctx: Ctx, id: string, deploy: readonly string[]): Engagement {
  expect(ctx.campaign.cursor.step).toBe('open')
  setCursor(ctx, { engagement: engagementAt(ctx.campaign.cursor.engagement ?? loadFixture().campaign.cursor.engagement!, id), fought: 0 }, 'test')
  toEquip(ctx, deploy)
  performAdvancePrep(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('battle')
  return ctx.campaign.cursor.engagement!
}

/** Play the battle on the cursor in the sandbox with the campaign's own Hero rows, and fold it. */
function playIt(ctx: Ctx, seed: number) {
  const e = ctx.campaign.cursor.engagement!
  const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(ctx.campaign.roster[id]!)), enemies: [], seed, encounterId: e.id })
  runBattle(s.ctx)
  return { s, result: sandboxResult(s) }
}

/** Nobody is fatigued: no absences, no recovery badge, the Week's fought list untouched. */
function noFatigue(ctx: Ctx) {
  expect(ctx.campaign.unavailable).toEqual([])
  expect(ctx.campaign.foughtThisWeek).toEqual([])
  for (const h of Object.values(ctx.campaign.roster)) for (const b of RECOVERY_BADGES) expect(h.badges).not.toContain(b)
}

describe('kingdom.opening-rewards — the opening pays as ruled', () => {
  it('the XP curve is the ruled one: level 2 at 20, then 50, 100, 170, 270, 400', () => {
    expect(LEVEL_THRESHOLDS.slice(2)).toEqual([20, 50, 100, 170, 270, 400])
  })

  it('after a won Orphanage every hero who fought is level 2 with a level-up to take — the specialty chosen there; nobody is fatigued', () => {
    const ctx = atOrphanage()
    const { result } = playIt(ctx, 1)
    expect(result.outcome).toBe('heroClear')
    const e = ctx.campaign.cursor.engagement!
    const { reckoning } = decide(ctx, result)
    // 20 each, whatever the kills or the length: the formula and the MVP's +10 do not apply
    expect(reckoning.heroes.map((h) => [h.heroId, h.xp, h.mvp])).toEqual(DEPLOY.map((id) => [id, 20, false]))
    applyBattleResult(ctx, e, result, reckoning)
    noFatigue(ctx)
    // battle 1 has no item reward: the Reckoning goes straight to the level-ups
    expect(ctx.campaign.cursor.rewardOffer).toBeNull()
    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('levelUp')
    expect(listLevelUps(ctx.campaign)).toEqual([...DEPLOY].sort())
    for (const id of DEPLOY) {
      const v = viewLevelUp(ctx.campaign, id)
      expect([v.from, v.to, v.needsSpecialty]).toEqual([1, 2, true])
      expect(v.specialtyOffers.length).toBeGreaterThan(0)
      performLevelUp(ctx, id, 'test', { specialtyId: v.specialtyOffers[0]!.id })
      const h = ctx.campaign.roster[id]!
      expect([h.level, h.specialty]).toEqual([2, v.specialtyOffers[0]!.id])
    }
    expect(listLevelUps(ctx.campaign)).toEqual([])
    // and the level is fielded: battle 2 sees level 2 and the specialty
    const spec = makeBattleState(ctx.campaign.roster, { id: LUMBERJACK, mapId: encounterDef(LUMBERJACK).mapId!, enemies: [], deployed: DEPLOY, seed: 1 })
    expect(spec.heroProgress!.map((p) => p?.level)).toEqual([2, 2, 2])
  })

  // Law 10, 2026-10-04 (kingdom.opening-replay-rules; engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword waits for its taker; a lost battle pays no XP; a replay rolls new dice': asked "Should a lost battle pay any XP? (Today a lost Orphanage pays its 20 XP every
  // time you replay it.)" — "Now a lost battle offers a replay." — No). This test was titled 'the Orphanage pays 20 no
  // matter what — a lost one too; the dead get nothing' and held of the lost Orphanage
  //   expect(reckoning.heroes.map((h) => [h.xp, h.wound])).toEqual(DEPLOY.map(() => [20, 1]))
  // — kingdom SWITCHES openingFixedXp's "on a loss too", which the ruling settles the other way. The rule now: a lost
  // Orphanage pays nobody (the wounds it left stand); a WON one pays its 20 whatever its kills or length, and the dead
  // still get nothing.
  it('the Orphanage pays 20 when it is won, whatever its kills or length — a lost one pays nobody; the dead get nothing', () => {
    const ctx = atOrphanage()
    const lost = panelResult(ctx, false)
    const { reckoning } = decide(ctx, lost)
    expect(reckoning.heroes.map((h) => [h.xp, h.wound])).toEqual(DEPLOY.map(() => [0, 1]))
    expect(reckoning.heroes.some((h) => h.mvp)).toBe(false)
    const ctx2 = atOrphanage()
    const { result } = playIt(ctx2, 1)
    expect(result.outcome, 'the battle the dead hero is set in is a won one').toBe('heroClear')
    const oneDead = withUnitFate(result, 'hero', 1, { lifeState: 'dead' })
    const { reckoning: k2 } = decide(ctx2, oneDead)
    expect(k2.heroes.map((h) => h.xp)).toEqual([20, 0, 20])
  })

  it('a hero wounded in battle 1 enters battle 2 wounded — the level is fielded as the engine\'s Wounded', () => {
    const ctx = atOrphanage()
    const { result } = playIt(ctx, 1)
    // the warrior went down in battle 1 and was got back up: the Reckoning's plain wound
    const downed = withUnitFate(result, 'hero', 0, { lifeState: 'downed' })
    const { reckoning } = decide(ctx, downed)
    expect(reckoning.heroes[0]).toMatchObject({ heroId: WARRIOR, wound: 1 })
    applyBattleResult(ctx, ctx.campaign.cursor.engagement!, downed, reckoning)
    performExitBattle(ctx, 'test')
    performLeaveLevelUp(ctx, 'test')
    const w = ctx.campaign.roster[WARRIOR]!
    expect(w.wound).toBe(1)
    // the wound is a level, never a badge on the Hero (GAME-ARCHITECTURE.md §4.2)
    expect(w.badges).not.toContain('badge.wounded')
    toNext(ctx, LUMBERJACK, DEPLOY)
    const { s } = playIt(ctx, 1)
    const unitOf = (sb: typeof s, typeId: string) => sb.ctx.state.units.find((u) => u.side === 'hero' && u.typeId === typeId)!
    expect(unitOf(s, WARRIOR).badges).toContain('badge.wounded')
    expect(unitOf(s, PRIEST).badges).not.toContain('badge.wounded')
    // the same hero whole fields without it, and with more Health
    const whole = createSandbox({ mapId: s.config.mapId, heroes: [...DEPLOY], heroRows: DEPLOY.map((id) => ({ ...structuredClone(ctx.campaign.roster[id]!), wound: 0 })), enemies: [], seed: 1, encounterId: LUMBERJACK })
    expect(unitOf(whole, WARRIOR).badges).not.toContain('badge.wounded')
    expect(unitOf(s, WARRIOR).maxHp).toBeLessThan(unitOf(whole, WARRIOR).maxHp)
  })

  it('after a won Lumberjack House the Flaming Longsword is offered, and only a Warrior or a Paladin takes it', () => {
    const ctx = atOrphanage()
    const r1 = playIt(ctx, 1)
    const k1 = decide(ctx, r1.result)
    applyBattleResult(ctx, ctx.campaign.cursor.engagement!, r1.result, k1.reckoning)
    performExitBattle(ctx, 'test')
    performLeaveLevelUp(ctx, 'test')
    toNext(ctx, LUMBERJACK, DEPLOY)
    const won = panelResult(ctx, true)
    const k2 = decide(ctx, won)
    applyBattleResult(ctx, ctx.campaign.cursor.engagement!, won, k2.reckoning)
    noFatigue(ctx)
    expect(ctx.campaign.cursor.rewardOffer).toEqual([SWORD])
    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('rewards')
    expect(listRewardOffers(ctx.campaign).map((r) => r.id)).toEqual([SWORD])
    // it names its taker: nobody, or a Priest or a Ranger, is refused
    expect(canTakeReward(ctx.campaign, SWORD)).toBe(false)
    expect(canTakeReward(ctx.campaign, SWORD, RANGER)).toBe(false)
    expect(() => performTakeReward(ctx, SWORD, 'test', PRIEST)).toThrow(/refused/)
    expect(() => performTakeReward(ctx, SWORD, 'test')).toThrow(/refused/)
    expect(canTakeReward(ctx.campaign, SWORD, WARRIOR)).toBe(true)
    performTakeReward(ctx, SWORD, 'test', WARRIOR)
    expect(ctx.campaign.roster[WARRIOR]!.equipped).toContain(SWORD)
    expect(ctx.campaign.stash).not.toContain(SWORD)
    expect(ctx.campaign.cursor.rewardOffer).toBeNull()
  })

  it('a Paladin may take it; with neither a Warrior nor a Paladin, nobody is offered it', () => {
    const lumberjackWon = (deploy: readonly string[], edit?: (c: CampaignState) => void) => {
      const ctx = atOrphanage(deploy, edit)
      const r1 = playIt(ctx, 1)
      applyBattleResult(ctx, ctx.campaign.cursor.engagement!, r1.result, decide(ctx, r1.result).reckoning)
      performExitBattle(ctx, 'test')
      if (ctx.campaign.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
      toNext(ctx, LUMBERJACK, deploy)
      const won = panelResult(ctx, true)
      applyBattleResult(ctx, ctx.campaign.cursor.engagement!, won, decide(ctx, won).reckoning)
      return ctx
    }
    const withPaladin = lumberjackWon([PALADIN, PRIEST, RANGER], (c) => { delete c.roster[WARRIOR] })
    expect(withPaladin.campaign.cursor.rewardOffer).toEqual([SWORD])
    performExitBattle(withPaladin, 'test')
    performTakeReward(withPaladin, SWORD, 'test', PALADIN)
    expect(withPaladin.campaign.roster[PALADIN]!.equipped).toContain(SWORD)
    const neither = lumberjackWon([PRIEST, RANGER], (c) => { delete c.roster[WARRIOR]; delete c.roster[PALADIN] })
    expect(neither.campaign.cursor.rewardOffer).toBeNull()
  })

  it('after a won Bridge three items are offered and one is kept', () => {
    const ctx = atOrphanage()
    const r1 = playIt(ctx, 1)
    applyBattleResult(ctx, ctx.campaign.cursor.engagement!, r1.result, decide(ctx, r1.result).reckoning)
    performExitBattle(ctx, 'test')
    performLeaveLevelUp(ctx, 'test')
    toNext(ctx, BRIDGE, DEPLOY)
    const won = panelResult(ctx, true)
    applyBattleResult(ctx, ctx.campaign.cursor.engagement!, won, decide(ctx, won).reckoning)
    noFatigue(ctx)
    const offer = ctx.campaign.cursor.rewardOffer!
    expect(offer).toHaveLength(3)
    expect(new Set(offer).size).toBe(3)
    for (const id of offer) expect(REWARDS.some((r) => r.id === id)).toBe(true)
    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('rewards')
    performTakeReward(ctx, offer[1]!, 'test')
    expect(ctx.campaign.stash).toEqual([offer[1]])
  })

  it('the rows are content keyed by the engine\'s encounter ids; src/core names none', () => {
    for (const row of ENCOUNTER_REWARDS) expect(Object.keys(ENCOUNTERS)).toContain(row.encounterId)
    for (const id of [ORPHANAGE, LUMBERJACK, BRIDGE]) expect(ENCOUNTER_REWARDS.some((r) => r.encounterId === id)).toBe(true)
    for (const f of readdirSync('src/core')) {
      const text = readFileSync(`src/core/${f}`, 'utf8')
      for (const row of ENCOUNTER_REWARDS) expect(text.includes(row.encounterId), `src/core/${f} names ${row.encounterId}`).toBe(false)
      expect(text.includes(SWORD), `src/core/${f} names ${SWORD}`).toBe(false)
    }
  })
})
