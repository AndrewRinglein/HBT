// kingdom.opening-sword-waits — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run: the Flaming Longsword waits
// for its taker; a lost battle pays no XP; a replay rolls new dice'): asked "If the party has no Warrior or Paladin after
// battle 2, should the Flaming Longsword wait in the stash until one is drafted? (Today it's never offered again.)" —
// "One, yes."
//
// Expect: "At http://127.0.0.1:4230/play a run whose party has no Warrior or Paladin after the Lumberjack House shows the
// Flaming Longsword kept in the stash, and the draft that brings a Warrior or Paladin is followed by the offer to take
// it; a run that has one after battle 2 is offered it then, as today; the page test covers both."
//
// core/rewards.ts: a won battle whose row names an item for classes nobody of which can take it keeps the item in the
// stash (resolveBattleWaiting; the one writer puts it there); listWaitingOffers says when a living hero of those classes
// has room for it, and performTakeWaiting gives it to the hero the player names. It stays those classes' only
// (core/shop.ts whyNotEquip reads the same row). The page half is tools/opening-run-six.verify.mjs, on a run seed whose
// party of two holds no taker (14) and on the suite's own (11), which holds one.
import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import * as REWARDS from '../src/core/rewards.js'
import * as ROWS from '../src/content/encounter-rewards.js'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { performLeaveLevelUp, performTakeReward, listRewardTakers } from '../src/core/rewards.js'
import { whyNotEquip, performEquip } from '../src/core/shop.js'
import type { SandboxConfig } from '../src/core/sandbox.js'
import type { EngagementResult } from '../src/core/seam.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { recapScreen, carrierChoice, type LastBattle } from '../src/ui/after.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const SWORD = 'item.longsword.flaming', TAKERS = ['class.warrior', 'class.paladin']
type Waiting = { itemId: string; takers: string[] }
const R = REWARDS as unknown as {
  listWaitingOffers?: (c: Ctx['campaign']) => Waiting[]; listWaitingItems?: (c: Ctx['campaign']) => string[]
  whyNotTakeWaiting?: (c: Ctx['campaign'], itemId: string, heroId: string) => string | null
  performTakeWaiting?: (ctx: Ctx, itemId: string, heroId: string, causeId: string) => void
}
const takersRowOf = (ROWS as unknown as { rewardTakersOf?: (itemId: string) => readonly string[] | null }).rewardTakersOf
const driver = () => import('../tools/opening-page.mjs' as string) as Promise<{ playedOut: (config: SandboxConfig, won: boolean) => { result: EngagementResult } }>
const isTaker = (c: Ctx['campaign'], id: string) => c.roster[id]!.classes.some((x) => TAKERS.includes(x))
const heroIds = (c: Ctx['campaign']) => Object.values(c.roster).filter((h) => !h.classes.includes('class.civilian')).map((h) => h.id).sort()

/** The drafts owed, taken: a hero of the takers' classes when `want`, one of no such class otherwise — null when the offers hold none. */
function draft(ctx: Ctx, want: boolean): boolean {
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 4; guard++) {
    performAdvanceOpening(ctx, 'test')
    const pick = listDraftOffers(ctx.campaign).find((h) => h.classes.some((x) => TAKERS.includes(x)) === want)
    if (!pick) return false
    performDraft(ctx, pick.id, 'test')
  }
  return true
}
function field(ctx: Ctx): SandboxConfig {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  return { mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((h) => structuredClone(ctx.campaign.roster[h]!)), enemies: [], seed: e.seed, encounterId: e.id }
}
function write(ctx: Ctx, r: EngagementResult): LastBattle {
  const e = ctx.campaign.cursor.engagement!, k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'test'); applyBattleResult(ctx, e, r, k)
  return { engagementId: e.id, result: r, reckoning: k }
}
function toOpen(ctx: Ctx): void {
  const c = ctx.campaign
  performExitBattle(ctx, 'test')
  if (c.cursor.step === 'rewards') { const item = c.cursor.rewardOffer![0]!, takers = listRewardTakers(c, item); performTakeReward(ctx, item, 'test', takers[0]) }
  if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
  expect(c.cursor.step).toBe('open')
}
/** A run through a won Lumberjack House with a party of two that holds a taker (`taker`) or none; the first run seed that drafts so. */
async function afterLumberjack(taker: boolean): Promise<{ ctx: Ctx; last: LastBattle }> {
  const { playedOut } = await driver()
  for (let seed = 1; seed <= 60; seed++) {
    const ctx = makeCtx(makeNewCampaign(seed))
    if (!draft(ctx, taker)) continue
    write(ctx, playedOut(field(ctx), true).result); toOpen(ctx)
    if (!draft(ctx, false)) continue
    expect(heroIds(ctx.campaign).some((id) => isTaker(ctx.campaign, id))).toBe(taker)
    const last = write(ctx, playedOut(field(ctx), true).result)
    expect(ctx.campaign.cursor.prologue).toBe(3)
    return { ctx, last }
  }
  throw new Error(`no run seed from 1 to 60 drafts a party of two ${taker ? 'with' : 'without'} a Warrior or a Paladin`)
}

describe('kingdom.opening-sword-waits — the Flaming Longsword waits for its taker', () => {
  beforeAll(async () => { await driver() }, 120000)

  it('the row says whose it is: the Flaming Longsword is a Warrior\'s or a Paladin\'s', () => {
    expect(typeof takersRowOf, 'content/encounter-rewards.ts rewardTakersOf').toBe('function')
    expect(takersRowOf!(SWORD)).toEqual(TAKERS)
    expect(takersRowOf!('item.longsword')).toBeNull()
  })

  it('with no Warrior or Paladin after the Lumberjack House the sword is kept in the stash, and the player is told it waits', async () => {
    const { ctx, last } = await afterLumberjack(false), c = ctx.campaign
    expect(c.cursor.rewardOffer, 'nothing to take now: nobody may carry it').toBeNull()
    expect(c.stash, 'the Flaming Longsword is kept in the stash').toEqual([SWORD])
    expect(Object.values(c.roster).some((h) => h.equipped.includes(SWORD))).toBe(false)
    expect(R.listWaitingItems!(c)).toEqual([SWORD])
    expect(R.listWaitingOffers!(c), 'no offer yet: nobody can take it').toEqual([])
    const html = recapScreen(c, ctx.events, last)
    expect(html, 'the victory screen says it waits').toMatch(/Flaming Longsword waits in the stash[^<]*Warrior or a Paladin/)
    // it stays a Warrior's or a Paladin's only: nobody else may put it on at Equip, though it lies in the stash
    toOpen(ctx)
    if (!draft(ctx, false)) return   // (the next draft offered only takers: nothing more to hold here)
    const id = SECTIONS[c.cursor.prologue! - 1]!
    performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
    performOpeningDeploy(ctx, 'test')
    expect(c.cursor.prepStep).toBe('equip')
    for (const id of c.cursor.engagement!.deployed) {
      expect(whyNotEquip(c, id, SWORD), `${id} is no Warrior or Paladin`).toMatch(/Warrior or a Paladin/)
      expect(() => performEquip(ctx, id, SWORD, 'test')).toThrow(/Warrior or a Paladin/)
    }
    expect(c.stash).toContain(SWORD)
  })

  it('the draft that brings a Warrior or a Paladin is followed by the offer to take it: the player names the carrier, and it is carried', async () => {
    const { ctx } = await afterLumberjack(false), c = ctx.campaign
    toOpen(ctx)
    // later drafts, until one brings a taker (by the sixth draft every class is drafted)
    let brought = false
    for (let battle = 3; battle <= 6 && !brought; battle++) {
      c.cursor.prologue = battle
      brought = draft(ctx, true) && heroIds(c).some((id) => isTaker(c, id))
      if (!brought) { draft(ctx, false); expect(R.listWaitingOffers!(c)).toEqual([]) }
    }
    expect(brought, 'a Warrior or a Paladin is drafted').toBe(true)
    const may = heroIds(c).filter((id) => isTaker(c, id))
    expect(R.listWaitingOffers!(c), 'the sword is offered as soon as a taker with room is in the party').toEqual([{ itemId: SWORD, takers: may }])
    // the same when the run is closed here and opened again: nothing is stored for the offer
    expect(R.listWaitingOffers!(runOf(runSaveOf(c, null)).campaign)).toEqual([{ itemId: SWORD, takers: may }])
    // who carries it: the heroes offered are the takers, each by name
    expect(listRewardTakers(c, SWORD)).toEqual(may)
    const choice = carrierChoice(c, SWORD)
    expect([...choice.matchAll(/data-act="give" data-id="([^"]+)"/g)].map((m) => m[1])).toEqual(may)
    // a hero who is neither is refused; the one named gets it
    const other = heroIds(c).find((id) => !isTaker(c, id))!
    expect(R.whyNotTakeWaiting!(c, SWORD, other)).toMatch(/Warrior or a Paladin|class\.warrior or class\.paladin/)
    expect(() => R.performTakeWaiting!(ctx, SWORD, other, 'test')).toThrow(/refused/)
    R.performTakeWaiting!(ctx, SWORD, may[0]!, 'test')
    expect(c.roster[may[0]!]!.equipped).toContain(SWORD)
    expect(c.stash).not.toContain(SWORD)
    expect([R.listWaitingItems!(c), R.listWaitingOffers!(c)]).toEqual([[], []])
    expect(() => R.performTakeWaiting!(ctx, SWORD, may[0]!, 'test'), 'it is given once').toThrow(/refused/)
  })

  it('a run that has a Warrior or a Paladin after battle 2 is offered it then, as today: it never goes to the stash', async () => {
    const { ctx, last } = await afterLumberjack(true), c = ctx.campaign
    expect(c.cursor.rewardOffer).toEqual([SWORD])
    expect(c.stash).toEqual([])
    expect(R.listWaitingItems!(c)).toEqual([])
    expect(recapScreen(c, ctx.events, last)).not.toMatch(/waits in the stash/)
    const taker = listRewardTakers(c, SWORD)
    expect(taker.length).toBeGreaterThan(0)
    performExitBattle(ctx, 'test')
    performTakeReward(ctx, SWORD, 'test', taker[0])
    expect(c.roster[taker[0]!]!.equipped).toContain(SWORD)
  })

  it('the page covers both: a run with no Warrior or Paladin after battle 2 keeps the sword in the stash and offers it after the draft that brings one; a run with one is offered it at once', () => {
    const run = (seed: string) => spawnSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, RUN_SIX_SEED: seed } })
    const none = run('14')
    expect(none.status, none.stderr.split('\n').filter((l) => /Error/.test(l)).slice(0, 2).join(' | ')).toBe(0)
    expect(none.stdout).toMatch(/the Flaming Longsword waited in the stash \(no Warrior or Paladin in the party of two; the map said so\) and was offered after the draft that brought [^,]+, who carries it/)
    const one = run('11')
    expect(one.status, one.stderr.split('\n').filter((l) => /Error/.test(l)).slice(0, 2).join(' | ')).toBe(0)
    expect(one.stdout).toMatch(/the Flaming Longsword was offered after the Lumberjack House, as before, and is carried by /)
  }, 1800000)
})
