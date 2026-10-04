// kingdom.opening-starts-in-battle — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's
// class line, no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a
// closer start'): "We don't start by showing you going to the orphanage on the map. There's no reason to have that map
// step in the beginning. We're just going straight into the battle after you get your hero."
//
// Expect: "At http://127.0.0.1:4230/play a new run shows the first draft first; picking a hero shows the Orphanage battle
// with that hero on the board, with no map and no equip screen in between; after the battle's rewards the map shows the
// Orphanage taken and points at the Lumberjack House. A page test walks new run -> pick -> battle and asserts neither the
// map nor the equip page was drawn before battle 1, and that battle 2 is still reached through the map, the draft and
// Equip."
//
// Which battles are entered so is a content row (content/prologue.ts OPENING_STRAIGHT_IN: the first one); the mechanism
// (core/opening.ts isOpeningStraightIn, performOpeningStraightIn) reads it and names no number of its own: the battle is
// fielded, everyone free to fight is sent, Equip is passed, the cursor is at the battle. The page half is
// tools/opening-starts-in-battle.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import * as OPENING from '../src/core/opening.js'
import * as PROLOGUE from '../src/content/prologue.js'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, performOpeningDeploy, performResolvePrologue, listDraftOffers, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx, setCursor, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import type { SandboxConfig } from '../src/core/sandbox.js'
import type { EngagementResult } from '../src/core/seam.js'
import type { CampaignState, Engagement } from '../src/core/campaign.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const battleOf = (id: string) => ({ id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind })
type Battle = ReturnType<typeof battleOf>
const O = OPENING as unknown as {
  isOpeningStraightIn?: (c: CampaignState) => boolean
  performOpeningStraightIn?: (ctx: Ctx, battle: Battle, causeId: string) => Engagement
}
const driver = () => import('../tools/opening-page.mjs' as string) as Promise<{ playedOut: (config: SandboxConfig, won: boolean) => { result: EngagementResult } }>
const ROW = (PROLOGUE as unknown as { OPENING_STRAIGHT_IN?: { readonly battles: number } }).OPENING_STRAIGHT_IN

/** the draft owed before the battle on the cursor, taken (the first offer) */
function draftOne(ctx: Ctx): string {
  expect(draftsOwedOf(ctx.campaign)).toBe(1)
  performAdvanceOpening(ctx, 'test')
  const id = listDraftOffers(ctx.campaign)[0]!.id
  performDraft(ctx, id, 'test')
  return id
}
/** the battle on the cursor written as the writer leaves it: won (the cursor moves on) or lost and replayed */
function resolved(ctx: Ctx, won: boolean): void {
  setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'test')
  performResolvePrologue(ctx, won, 'test', true)
}

describe('kingdom.opening-starts-in-battle — a new run goes from the first hero straight into battle 1', () => {
  it('which battles are entered straight from the draft is a content row — the first — and core names no number of its own', () => {
    expect(ROW, 'content/prologue.ts OPENING_STRAIGHT_IN').toEqual({ battles: 1 })
    expect(typeof O.isOpeningStraightIn, 'core/opening.ts isOpeningStraightIn').toBe('function')
    expect(typeof O.performOpeningStraightIn, 'core/opening.ts performOpeningStraightIn').toBe('function')
    const core = readFileSync('src/core/opening.ts', 'utf8')
    const body = core.slice(core.indexOf('export function isOpeningStraightIn'), core.indexOf('export function performOpeningStraightIn'))
    expect(body).toContain('OPENING_STRAIGHT_IN.battles')
    expect(body, 'no battle number typed into the mechanism').not.toMatch(/prologue\s*[=<>!]+\s*\d/)
  })

  it('the pick goes straight into the Orphanage: the battle fielded, the hero sent, Equip passed — the cursor is at the battle', () => {
    for (const seed of [5, 11, 21]) {
      const ctx = makeCtx(makeNewCampaign(seed)), c = ctx.campaign
      expect(O.isOpeningStraightIn!(c), `seed ${seed}: a new run is before its first battle`).toBe(true)
      // refused while the first hero is still owed: the first screen is the draft
      expect(() => O.performOpeningStraightIn!(ctx, battleOf(SECTIONS[0]!), 'test')).toThrow(/refused: 1 to draft before battle 1/)
      const hero = draftOne(ctx)
      expect(c.cursor.step).toBe('open')
      const e = O.performOpeningStraightIn!(ctx, battleOf(SECTIONS[0]!), 'test')
      expect(c.cursor.step, `seed ${seed}: at the battle — never left at Equip`).toBe('battle')
      expect(c.cursor.prepStep ?? null).toBeNull()
      expect(c.cursor.battle).toEqual({ resultSet: false })
      expect(c.cursor.equipSession ?? null, 'the Equip step it passed is closed').toBeNull()
      expect(e).toBe(c.cursor.engagement)
      expect([e.id, e.prologue, e.seed]).toEqual([SECTIONS[0], 1, 1])
      expect(e.deployed, 'the one hero is sent').toEqual([hero])
      expect(e.tactic, 'no tactic').toBeNull()
    }
  })

  it('a lost battle 1, replayed, goes straight back into the battle — on new dice, no draft', async () => {
    // the battle is lost as the page test loses it (the party held idle, cut at Turn 1) and written by the one writer
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const hero = draftOne(ctx)
    const e1 = O.performOpeningStraightIn!(ctx, battleOf(SECTIONS[0]!), 'test')
    const r = playedOut({ mapId: e1.mapId, heroes: [...e1.deployed], heroRows: e1.deployed.map((h) => structuredClone(c.roster[h]!)), enemies: [], seed: e1.seed, encounterId: e1.id }, false).result
    const k = resolveReckoning(c, e1, r)
    setBattleOutcome(ctx, r, k, 'test'); applyBattleResult(ctx, e1, r, k); performExitBattle(ctx, 'test')
    expect([c.cursor.prologue, c.cursor.replays, c.cursor.step]).toEqual([1, 1, 'open'])
    expect(O.isOpeningStraightIn!(c), 'battle 1 is not won yet').toBe(true)
    expect(draftsOwedOf(c)).toBe(0)
    const e = O.performOpeningStraightIn!(ctx, battleOf(SECTIONS[0]!), 'test')
    expect(c.cursor.step).toBe('battle')
    expect(e.deployed).toEqual([hero])
    expect(e.seed, 'the replay is on new dice').not.toBe(1)
  }, 120000)

  it('battles 2 to 6 keep the map, the draft, who goes and Equip: the rule is the first battle\'s alone', () => {
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    draftOne(ctx)
    O.performOpeningStraightIn!(ctx, battleOf(SECTIONS[0]!), 'test')
    resolved(ctx, true)
    for (let n = 2; n <= SECTIONS.length; n++) {
      expect(c.cursor.prologue).toBe(n)
      expect(O.isOpeningStraightIn!(c), `battle ${n} is not entered straight`).toBe(false)
      draftOne(ctx)
      expect(() => O.performOpeningStraightIn!(ctx, battleOf(SECTIONS[n - 1]!), 'test'), `battle ${n}`).toThrow(/performOpeningStraightIn refused/)
      expect(c.cursor.step, 'a refusal changes nothing').toBe('open')
      // … and it is fielded as before: Combat Prep walked to who goes, resting at Deploy (a choice owed) or at Equip
      performFieldOpeningBattle(ctx, battleOf(SECTIONS[n - 1]!), 'test')
      const asked = performOpeningDeploy(ctx, 'test')
      expect([c.cursor.step, c.cursor.prepStep]).toEqual(['prep', asked ? 'deploy' : 'equip'])
      resolved(ctx, true)
    }
    expect(() => O.isOpeningStraightIn!({ ...c, cursor: { ...c.cursor, prologue: null } })).not.toThrow()
    expect(O.isOpeningStraightIn!({ ...c, cursor: { ...c.cursor, prologue: null } }), 'after the opening').toBe(false)
  })

  it('a run saved before battle 1 was fought opens the same way: from the open step, and from the Equip stop an older page left it at', () => {
    // saved with the hero drafted and nothing fielded (a lost battle 1, or the older page's map)
    const a = makeCtx(makeNewCampaign(11)); const hero = draftOne(a)
    const kept = makeCtx(runOf(runSaveOf(a.campaign, null)).campaign)
    expect(O.isOpeningStraightIn!(kept.campaign)).toBe(true)
    expect(O.performOpeningStraightIn!(kept, battleOf(SECTIONS[0]!), 'test').deployed).toEqual([hero])
    expect(kept.campaign.cursor.step).toBe('battle')
    // saved by the older page at Equip, before To the battle was pressed
    performFieldOpeningBattle(a, battleOf(SECTIONS[0]!), 'test'); performOpeningDeploy(a, 'test')
    expect([a.campaign.cursor.step, a.campaign.cursor.prepStep]).toEqual(['prep', 'equip'])
    const atEquip = makeCtx(runOf(runSaveOf(a.campaign, null)).campaign)
    const e = O.performOpeningStraightIn!(atEquip, battleOf(SECTIONS[0]!), 'test')
    expect(atEquip.campaign.cursor.step).toBe('battle')
    expect([e.id, e.deployed]).toEqual([SECTIONS[0], [hero]])
    // … but never another battle than the one the cursor holds
    const other = makeCtx(runOf(runSaveOf(a.campaign, null)).campaign)
    expect(() => O.performOpeningStraightIn!(other, battleOf(SECTIONS[1]!), 'test')).toThrow(/performOpeningStraightIn refused/)
  })

  it('the page: a new run shows the first draft, the pick shows the Orphanage with that hero on the board — no map and no Equip drawn before battle 1; battle 2 comes through the map, the draft and Equip', () => {
    const out = execFileSync(process.execPath, ['tools/opening-starts-in-battle.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/opening starts in battle: .*no map and no Equip drawn before battle 1.*passed/)
  }, 600000)
})
