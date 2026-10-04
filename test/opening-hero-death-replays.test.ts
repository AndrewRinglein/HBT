// kingdom.opening-hero-death-replays — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run: a battle in which a
// hero dies is replayed', and 'the opening run, audited' question 6): "If a hero dies, it should be replayed." · asked
// replaced or replayed: "Battle: they died as a replayed" · "When the whole party is dead …" — "6 offer replay".
//
// Expect: "At http://127.0.0.1:4230/play a battle that ends with a hero dead - even a won one - is followed by a screen
// naming who fell and offering the battle again; the replay fields the whole party as it stood before the battle, the
// fallen hero alive; a battle that kills every hero does the same and the run is never left with nothing to click; a
// battle no hero died in goes on to its XP and reward; a dead civilian changes none of this; the page test asserts each."
//
// One path with the lost-battle replay (core/reckoning.ts resolveReckoning, core/opening.ts performResolvePrologue): an
// opening battle a drafted hero died in is NOT KEPT — the Reckoning proposes no change to anybody and names who fell
// (`fallen`); the one writer writes nothing of the attempt (no death, no wound, no XP, no reward, no rescue, no loss),
// counts the replay, and the same battle is owed again on new dice. The screen (ui/after.ts recapScreen) says who fell
// and why the battle is offered again. The page half is tools/opening-run-six.verify.mjs.
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy, draftsOwedOf, listOpeningParty } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { resolveReckoning, applyBattleResult, performExitBattle, type Reckoning } from '../src/core/reckoning.js'
import { performLeaveLevelUp, performTakeReward, listRewardTakers } from '../src/core/rewards.js'
import type { SandboxConfig } from '../src/core/sandbox.js'
import type { EngagementResult } from '../src/core/seam.js'
import { saveOf } from '../src/core/campaign.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { recapScreen, type LastBattle } from '../src/ui/after.js'
import { encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const driver = () => import('../tools/opening-page.mjs' as string) as Promise<{ playedOut: (config: SandboxConfig, won: boolean) => { result: EngagementResult } }>
const fallenOf = (k: Reckoning) => (k as unknown as { fallen?: string[] }).fallen
const replaysOf = (ctx: Ctx) => ctx.campaign.cursor.replays ?? 0

function field(ctx: Ctx): SandboxConfig {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 4; guard++) { performAdvanceOpening(ctx, 'test'); performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test') }
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  return { mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((h) => structuredClone(ctx.campaign.roster[h]!)), enemies: [], seed: e.seed, encounterId: e.id }
}
function write(ctx: Ctx, r: EngagementResult): { k: Reckoning; last: LastBattle } {
  const e = ctx.campaign.cursor.engagement!, k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'test'); applyBattleResult(ctx, e, r, k)
  return { k, last: { engagementId: e.id, result: r, reckoning: k } }
}
function toOpen(ctx: Ctx): void {
  const c = ctx.campaign
  performExitBattle(ctx, 'test')
  if (c.cursor.step === 'rewards') { const item = c.cursor.rewardOffer![0]!, takers = listRewardTakers(c, item); performTakeReward(ctx, item, 'test', takers[0]) }
  if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
  expect(c.cursor.step).toBe('open')
}
/** The result with these party rows dead (and everything else as it was); `lost`: the battle a wipe. */
function withDead(r: EngagementResult, indexes: readonly number[], lost = false): EngagementResult {
  return { ...r, ...(lost ? { outcome: 'wipe' as const } : {}), units: r.units.map((u) => u.side === 'hero' && u.role === undefined && indexes.includes(u.index) ? { ...u, lifeState: 'dead' as const, dead: true, downed: true, kills: 2 } : u) }
}
/** What a run holds of its party and its purse: the whole roster, the stash, the purse, what was rescued. */
const held = (ctx: Ctx) => JSON.stringify({ roster: ctx.campaign.roster, stash: ctx.campaign.stash, purse: ctx.campaign.purse, renown: ctx.campaign.renown, losses: ctx.campaign.losses })

/** A run brought to the Bridge (battle 3, a party of three), the battle fielded: the Orphanage and the Lumberjack House won. */
async function atBridge(): Promise<{ ctx: Ctx; config: SandboxConfig; played: (c: SandboxConfig, won: boolean) => EngagementResult }> {
  const { playedOut } = await driver()
  const ctx = makeCtx(makeNewCampaign(11))
  write(ctx, playedOut(field(ctx), true).result); toOpen(ctx)
  write(ctx, playedOut(field(ctx), true).result); toOpen(ctx)
  const config = field(ctx)
  expect([ctx.campaign.cursor.prologue, config.heroes.length]).toEqual([3, 3])
  return { ctx, config, played: (c, won) => playedOut(c, won).result }
}

describe('kingdom.opening-hero-death-replays — a battle in which a hero dies is replayed', () => {
  beforeAll(async () => { await driver() }, 120000)

  it('a WON battle that ends with a hero dead is not kept: nothing of it is written, who fell is named, and the same battle is owed again on new dice', async () => {
    const { ctx, config, played } = await atBridge(), c = ctx.campaign
    const before = held(ctx), party = [...c.cursor.engagement!.deployed], firstSeed = config.seed
    const r = withDead(played(config, true), [1])
    expect(r.outcome).toBe('heroClear')
    const { k } = write(ctx, r)
    expect(fallenOf(k), 'the Reckoning names who fell').toEqual([party[1]])
    expect(k.won, 'the attempt is not kept: it is not a battle won').toBe(false)
    expect(k.heroes.map((h) => [h.xp, h.dead, h.mvp]), 'no XP, no death, no MVP is proposed').toEqual(party.map(() => [0, false, false]))
    expect(k.heroes.map((h) => h.wound)).toEqual(party.map((id) => c.roster[id]!.wound))
    expect([k.renown, k.grants, k.claim]).toEqual([0, [], null])
    // nothing of that attempt is kept: the party as it stood before it — heroes, wounds, items, XP, levels — no reward, no rescue, no loss counted
    expect(held(ctx), 'the roster, the stash and the purse are what they were').toBe(before)
    expect(c.roster[party[1]!]!.lifeState, 'the fallen hero is alive').toBe('alive')
    expect(c.cursor.rewardOffer, 'no reward is offered').toBeNull()
    expect(ctx.events.filter((e) => e.causeId === c.cursor.engagement!.id && ['xp.gained', 'hero.died', 'hero.wounded', 'hero.rescued', 'reward.offered'].includes(e.type))).toEqual([])
    // the same battle is owed again, counted as a replay
    expect([c.cursor.prologue, replaysOf(ctx), c.ended]).toEqual([3, 1, null])
    // out of the screen: no reward to take — back to the map (past a level left waiting from an earlier battle, as always)
    performExitBattle(ctx, 'test')
    expect(c.cursor.step, 'no reward is offered').not.toBe('rewards')
    if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
    expect(c.cursor.step).toBe('open')
    expect(draftsOwedOf(c)).toBe(0)
    const again = field(ctx)
    expect(again.seed, 'the replay is on new dice').not.toBe(firstSeed)
    expect({ ...again, seed: 0 }, 'the replay fields the whole party as it stood before the battle').toEqual({ ...config, seed: 0 })
    // an attempt no hero died in is kept: its XP and its reward, and the run goes on
    const { k: kept } = write(ctx, played(again, true))
    expect(fallenOf(kept) ?? []).toEqual([]); expect(kept.won).toBe(true)
    expect(kept.heroes.some((h) => h.xp > 0)).toBe(true)
    expect([c.cursor.prologue, replaysOf(ctx)]).toEqual([4, 0])
    expect(c.cursor.rewardOffer, 'the Bridge offers its reward').toHaveLength(3)
  })

  it('a battle that kills every hero does the same: nobody is written dead, the battle is offered again, and the whole party may go', async () => {
    const { ctx, config, played } = await atBridge(), c = ctx.campaign
    const before = held(ctx), party = [...c.cursor.engagement!.deployed]
    const { k } = write(ctx, withDead(played(config, false), [0, 1, 2], true))
    expect(fallenOf(k)).toEqual(party)
    expect(held(ctx)).toBe(before)
    expect(party.every((id) => c.roster[id]!.lifeState === 'alive'), 'nobody is written dead').toBe(true)
    expect([c.cursor.prologue, replaysOf(ctx), c.ended]).toEqual([3, 1, null])
    performExitBattle(ctx, 'test')
    if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
    expect(c.cursor.step).toBe('open')
    // never left with nothing to click: the battle is fielded again with everyone free to fight
    const again = field(ctx)
    expect(again.heroes).toEqual(config.heroes)
    expect(listOpeningParty(c)).toEqual([...party].sort())
  })

  it('a lost battle with one hero dead is the same replay — and is not the lost-battle replay that keeps its wounds', async () => {
    const { ctx, config, played } = await atBridge(), c = ctx.campaign
    const before = held(ctx)
    // one dead, another taken down: neither the death nor the wound is written
    const base = withDead(played(config, false), [2])
    const r = { ...base, units: base.units.map((u) => u.side === 'hero' && u.role === undefined && u.index === 0 ? { ...u, downed: true } : u) }
    const { k } = write(ctx, r)
    expect(fallenOf(k)).toEqual([c.cursor.engagement!.deployed[2]])
    expect(held(ctx), 'nothing of the attempt is kept — not the wound either').toBe(before)
    expect(replaysOf(ctx)).toBe(1)
  })

  it('a dead civilian changes none of this: a won battle a civilian died in is kept — XP, the next battle — and the dead civilian does not join', async () => {
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const won = playedOut(field(ctx), true).result
    // Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the
    // hero forward to the end of the bridge and bring the zombie left, maybe 3 squares"): this read
    //   const r = { ...won, units: won.units.map((u) => … u.typeId === 'hero.fixed.orphans' ? { ...u, lifeState: 'dead' as const, dead: true, downed: true } : u) }
    // — the Orphan Child made dead and the School Teacher left as the played battle left her, which on the old start was
    // always unhurt. On the closer start the Zombie begins three hexes nearer the house and reaches the civilians: in the
    // battle played here the Teacher falls too. The rule the test holds is unchanged — the dead civilian does not join,
    // the one who lived does — so BOTH fates are said: the Child dead, the Teacher standing and never down.
    const r = { ...won, units: won.units.map((u) => u.side !== 'hero' || u.role === undefined ? u
      : u.typeId === 'hero.fixed.orphans' ? { ...u, lifeState: 'dead' as const, dead: true, downed: true }
      : u.typeId === 'hero.fixed.school-teacher' ? (({ stood: _stood, ...row }: typeof u & { stood?: boolean }) => ({ ...row, lifeState: 'standing' as const, dead: false, downed: false }))(u) : u) }
    const { k } = write(ctx, r)
    expect(fallenOf(k) ?? [], 'a civilian is not a drafted hero').toEqual([])
    expect(k.won).toBe(true)
    expect([c.cursor.prologue, replaysOf(ctx)]).toEqual([2, 0])
    expect(Object.values(c.roster).filter((h) => h.classes.includes('class.civilian')).map((h) => h.id)).toEqual(['hero.fixed.school-teacher'])
    expect(Object.values(c.roster).find((h) => !h.classes.includes('class.civilian'))!.xp).toBe(20)
  })

  it('the screen says plainly why the battle is offered again and who fell — and a saved run reopened on it says the same', async () => {
    const { ctx, config, played } = await atBridge(), c = ctx.campaign
    const party = [...c.cursor.engagement!.deployed], fell = c.roster[party[1]!]!.name
    const { last } = write(ctx, withDead(played(config, true), [1]))
    const html = recapScreen(c, ctx.events, last)
    expect(html).toContain('data-voided="1"')
    expect(html).toContain(`data-fallen="${party[1]}"`)
    expect(html, 'who fell').toContain(`${fell} fell`)
    expect(html, 'why it is offered again').toMatch(/not kept|is fought again/i)
    expect(html, 'the way on offers the battle again').toMatch(/data-act="exit">[^<]*again/i)
    expect(html, 'no XP is said to be earned, no reward claimed').not.toMatch(/Claim Rewards|XP Earned/)
    // a battle nobody died in has no such screen
    const fine = await atBridge(), kept = write(fine.ctx, fine.played(fine.config, true))
    expect(recapScreen(fine.ctx.campaign, fine.ctx.events, kept.last)).not.toContain('data-voided="1"')
    // the save holds the run as it stood: reopened, the party is whole and the battle is owed
    const back = JSON.parse(saveOf(c)) as Ctx['campaign']
    expect(back.roster[party[1]!]!.lifeState).toBe('alive'); expect([back.cursor.prologue, back.cursor.replays]).toEqual([3, 1])
  })

  it('the page: a won battle a hero died in and a battle that took down everyone sent were each followed by the screen naming who fell, and replayed with the party whole', () => {
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toMatch(/a battle a hero died in was not kept and was offered again with the party as it stood: the Bridge, won with [^;(]+ dead \(the screen named who fell; nothing written; replayed on new dice with [^;)]+ alive\); the Cavern Trail, every hero sent dead or down \([^)]+\)/)
  }, 1800000)
})
