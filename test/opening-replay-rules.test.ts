// kingdom.opening-replay-rules — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run: the Flaming Longsword waits
// for its taker; a lost battle pays no XP; a replay rolls new dice'): asked "Should a lost battle pay any XP? (Today a
// lost Orphanage pays its 20 XP every time you replay it.)" — "Now a lost battle offers a replay." (No); asked "Should a
// replayed battle roll new dice? (Today it replays on the same dice.)" — "New dice."
//
// Expect: "At http://127.0.0.1:4230/play a lost Orphanage leaves the hero's XP where it was and offers the replay; a won
// Orphanage pays 20; a replayed battle's dice differ from the first attempt's (a test fields both and compares the logs)
// and a replay reopened from the save is byte-identical to itself; the page test asserts each."
//
// (1) core/reckoning.ts: a lost battle whose row says it is replayed (content/encounter-rewards.ts) pays no XP to anyone —
// not its fixed XP, not the formula's, no MVP. (2) core/opening.ts: the Campaign counts the replays of the battle on its
// cursor (cursor.replays), and an opening battle's seed takes that count with the battle's number — the first attempt
// the battle's own, each replay a roll on the run's battle cup — so a replay is new dice and a saved replay reopens as
// itself. The page half is tools/opening-run-six.verify.mjs and tools/opening-loop-three.verify.mjs.
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import * as OPENING from '../src/core/opening.js'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { performLeaveLevelUp, performTakeReward, listRewardTakers } from '../src/core/rewards.js'
import { createSandbox, saveSandbox, type SandboxConfig } from '../src/core/sandbox.js'
import type { EngagementResult } from '../src/core/seam.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { encounterRewardOf } from '../src/content/encounter-rewards.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { runBattle, encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const [ORPHANAGE, LUMBERJACK] = SECTIONS as [string, string]
const seedOf = (OPENING as unknown as { openingBattleSeedOf?: (c: Ctx['campaign']) => number }).openingBattleSeedOf
const driver = () => import('../tools/opening-page.mjs' as string) as Promise<{ playedOut: (config: SandboxConfig, won: boolean) => { result: EngagementResult } }>
const replaysOf = (ctx: Ctx) => (ctx.campaign.cursor as unknown as { replays?: number }).replays ?? 0

/** The opening battle on the cursor fielded with the whole party, walked to the battle step: the config the page fields. */
function field(ctx: Ctx): SandboxConfig {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 4; guard++) { performAdvanceOpening(ctx, 'test'); performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test') }
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  return { mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((h) => structuredClone(ctx.campaign.roster[h]!)), enemies: [], seed: e.seed, encounterId: e.id }
}
function write(ctx: Ctx, r: EngagementResult) {
  const e = ctx.campaign.cursor.engagement!, k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'test'); applyBattleResult(ctx, e, r, k)
  return k
}
function toOpen(ctx: Ctx): void {
  const c = ctx.campaign
  performExitBattle(ctx, 'test')
  if (c.cursor.step === 'rewards') { const item = c.cursor.rewardOffer![0]!, takers = listRewardTakers(c, item); performTakeReward(ctx, item, 'test', takers[0]) }
  if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
  expect(c.cursor.step).toBe('open')
}
const xpOf = (ctx: Ctx) => Object.fromEntries(Object.values(ctx.campaign.roster).map((h) => [h.id, h.xp]))
/** The battle `config` fields, played out by the engine's AI on both sides: its whole log, as the save holds it. */
function logOf(config: SandboxConfig): string { const s = createSandbox(structuredClone(config)); runBattle(s.ctx); return saveSandbox(s) }

describe('kingdom.opening-replay-rules — a lost opening battle pays no XP; a replay rolls new dice', () => {
  beforeAll(async () => { await driver() }, 120000)

  it('a lost Orphanage leaves the hero\'s XP where it was and offers the replay; a won Orphanage pays 20', async () => {
    const { playedOut } = await driver()
    expect(encounterRewardOf(ORPHANAGE)).toMatchObject({ xp: 20, replayed: true })
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const lost = playedOut(field(ctx), false).result, hero = c.cursor.engagement!.deployed[0]!
    const k = write(ctx, lost)
    expect(k.won).toBe(false)
    expect(k.heroes.map((h) => [h.xp, h.mvp]), 'a lost battle proposes no XP and no MVP').toEqual([[0, false]])
    expect(c.roster[hero]!.xp, 'the hero\'s XP is where it was').toBe(0)
    expect(ctx.events.filter((e) => e.type === 'xp.gained')).toEqual([])
    // it only offers the replay: the Campaign goes on, the same battle is owed, nothing to level, no draft
    expect(c.ended).toBeNull(); expect(c.cursor.prologue).toBe(1)
    performExitBattle(ctx, 'test')
    expect(c.cursor.step, 'no level-up waits after a loss: straight back to the map').toBe('open')
    expect(draftsOwedOf(c)).toBe(0)
    // lost again: still nothing
    write(ctx, playedOut(field(ctx), false).result); performExitBattle(ctx, 'test')
    expect(c.roster[hero]!.xp).toBe(0)
    // … and won: its 20, whatever its kills or length
    const won = write(ctx, playedOut(field(ctx), true).result)
    expect(won.heroes.map((h) => h.xp)).toEqual([20])
    expect(c.roster[hero]!.xp).toBe(20)
    expect(c.cursor.prologue).toBe(2)
  })

  it('a lost battle with no fixed XP pays none either — not the formula\'s, no MVP — and the wounds it left are kept', async () => {
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    write(ctx, playedOut(field(ctx), true).result); toOpen(ctx)
    const r = playedOut(field(ctx), false).result
    const before = xpOf(ctx)
    expect(c.cursor.engagement!.id).toBe(LUMBERJACK)
    expect(encounterRewardOf(LUMBERJACK)!.xp, 'the Lumberjack House has no fixed XP').toBeUndefined()
    // a hero taken down in the lost battle: a kill to his name, a wound to carry
    const party = c.cursor.engagement!.deployed
    const hurt: EngagementResult = { ...r, units: r.units.map((u) => u.side === 'hero' && u.role === undefined && u.index === 0 ? { ...u, downed: true, kills: 3 } : u) }
    const k = write(ctx, hurt)
    expect(k.heroes.map((h) => h.xp)).toEqual(party.map(() => 0))
    expect(k.heroes.some((h) => h.mvp)).toBe(false)
    expect(xpOf(ctx), 'nobody\'s XP moved').toEqual(before)
    expect(c.roster[party[0]!]!.wound, 'the wound is kept').toBeGreaterThanOrEqual(1)
    expect(c.cursor.prologue).toBe(2)
  })

  it('a replayed battle is fielded on new dice: its seed takes the replay\'s count with the battle\'s number, and the two battles\' logs differ', async () => {
    expect(typeof seedOf, 'core/opening.ts openingBattleSeedOf').toBe('function')
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const first = field(ctx)
    expect([first.seed, replaysOf(ctx)], 'the first attempt: the battle\'s own number, no replay yet').toEqual([1, 0])
    write(ctx, playedOut(first, false).result); performExitBattle(ctx, 'test')
    expect(replaysOf(ctx), 'one replay is owed').toBe(1)
    expect(seedOf!(c)).not.toBe(first.seed)
    const second = field(ctx)
    expect(second.seed, 'the replay is fielded on the seed the Campaign gives it').toBe(seedOf!({ ...c, cursor: { ...c.cursor, step: 'open' } } as Ctx['campaign']))
    expect(second.seed).not.toBe(first.seed)
    expect({ ...second, seed: 0 }, 'the same battle, the same party — only the dice').toEqual({ ...first, seed: 0 })
    // the test fields both and compares the logs
    const a = logOf(first), b = logOf(second)
    expect(a).not.toBe(b)
    expect(JSON.parse(a).snapshot, 'the dice differ').not.toEqual(JSON.parse(b).snapshot)
    // the next replay differs again
    write(ctx, playedOut(second, false).result); performExitBattle(ctx, 'test')
    expect(replaysOf(ctx)).toBe(2)
    const third = field(ctx)
    expect(new Set([first.seed, second.seed, third.seed]).size, 'three attempts, three seeds').toBe(3)
    for (const s of [second.seed, third.seed]) expect(Number.isSafeInteger(s) && s >= 1 && s <= 2147483647, `seed ${s} is one the engine takes`).toBe(true)
    // won: the count is spent, and the next battle's first attempt is its own number again
    write(ctx, playedOut(third, true).result); toOpen(ctx)
    expect([c.cursor.prologue, replaysOf(ctx)]).toEqual([2, 0])
    expect(field(ctx).seed).toBe(2)
  })

  it('a replay reopened from the save is byte-identical to itself — named streams, no clock; and another run\'s replay is another battle', async () => {
    const { playedOut } = await driver()
    const replayOf = (seed: number) => {
      const ctx = makeCtx(makeNewCampaign(seed))
      write(ctx, playedOut(field(ctx), false).result); performExitBattle(ctx, 'test')
      return ctx
    }
    const ctx = replayOf(11), saved = runSaveOf(ctx.campaign, null)
    const here = field(ctx)
    // the run closed on the map after the loss and opened again, twice: the replay fielded from the save
    const again = field(makeCtx(runOf(saved).campaign)), andAgain = field(makeCtx(runOf(saved).campaign))
    expect(again).toEqual(here); expect(andAgain).toEqual(here)
    expect(logOf(again), 'the replay, reopened, is the same battle to the byte').toBe(logOf(here))
    expect(logOf(andAgain)).toBe(logOf(here))
    // the run saved ON the replay's battle holds its seed
    const onBattle = runOf(runSaveOf(ctx.campaign, null)).campaign
    expect(onBattle.cursor.engagement!.seed).toBe(here.seed)
    // the dice are the run's own: another run's first replay of the same battle is on another seed
    expect(field(replayOf(12)).seed).not.toBe(here.seed)
    // no clock, no Math.random in the mechanism
    const { readFileSync } = await import('node:fs')
    expect(readFileSync('src/core/opening.ts', 'utf8')).not.toMatch(/Math\.random|Date\.now|new Date/)
  })

  it('the pages: a lost battle left every hero\'s XP where it was and was offered again; the replay was on new dice and reopened as itself; a won Orphanage paid 20', () => {
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toMatch(/a lost battle paid no XP \(the Orphanage, the Lumberjack House and the Cathedral, each lost first: every hero's XP where it was\) and was offered again on new dice \([^)]+\); a replay left mid-battle reopened as the same battle to the byte; the Orphanage won paid its 20/)
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(three).toMatch(/battle 2 lost: no XP, offered again on new dice \(seed 2, then \d+\)/)
  }, 1800000)
})
