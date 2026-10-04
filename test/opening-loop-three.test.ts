// kingdom.opening-loop-three, part 4 of 4 (PLAYABLE-OPENING-PLAN.md item 12; engine DECISIONS.md 2026-09-29 "the playable
// opening"; 2026-09-28 'answers to the 22 questions': "Any of these six battles, you replay it if you lose it. We're going
// to have wounds, but not fatigue. We're going to pick up civilians."). Expect: "Andrew plays from the Orphanage through
// the Bridge in one sitting; losing a battle offers it again with the same party; the rewards arrive when ruled."
//
// The mechanism (src/core/opening.ts): an opening battle is fielded as its engine encounter once the draft cadence is
// met; a lost one whose rewards row says `replayed` ends nothing and advances nothing; a won one rescues the civilians
// who lived. The page half (tools/opening-loop-three.verify.mjs) plays the COMMITTED sandbox opened with ?map: map ->
// draft -> equip -> battle -> reckoning, rewards, level-ups -> map, three times.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep, performDeploy } from '../src/core/prep.js'
import { createSandbox, sandboxResult } from '../src/core/sandbox.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { performLeaveLevelUp } from '../src/core/rewards.js'
import { withUnitFate } from '../src/core/result.js'
import type { EngagementResult } from '../src/core/seam.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { runBattle, encounterDef } from '../src/engine.js'

const ORPHANAGE = 'encounter.opening.orphanage'
const LUMBERJACK = 'encounter.opening.lumberjack'
const battleOf = (id: string) => ({ id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind })

/** A new Campaign with its first hero drafted, the Orphanage fielded and walked to the battle step. */
function atOrphanage(seed = 5): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed))
  performAdvanceOpening(ctx, 'test')
  performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  return fielded(ctx, ORPHANAGE)
}
function fielded(ctx: Ctx, id: string): Ctx {
  performFieldOpeningBattle(ctx, battleOf(id), 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  for (const h of Object.keys(ctx.campaign.roster).filter((h) => !ctx.campaign.roster[h]!.classes.includes('class.civilian'))) performDeploy(ctx, h, 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('battle')
  return ctx
}
/** The battle on the cursor played out by the engine's AI with the campaign's rows, folded. */
function played(ctx: Ctx, seed = 1): EngagementResult {
  const e = ctx.campaign.cursor.engagement!
  const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(ctx.campaign.roster[id]!)), enemies: [], seed, encounterId: e.id })
  runBattle(s.ctx)
  return sandboxResult(s)
}
/**
 * The battle on the cursor WON: the first seed the engine's AI wins it on.
 * Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
 * Rogues and Mages included'): the won battles below (and the one `lost` turns into a loss) were `played(ctx)` — seed 1, which the five-hero pool's first
 * offer on Campaign seed 5 won. The pool is the 24 base heroes now and that first offer is the Forest Elf, who alone loses
 * the Orphanage on seed 1 (a wipe) and wins it on seed 5. What the tests hold is unchanged — `expect(r.outcome)
 * .toBe('heroClear')` still stands — the won battle is found, not assumed on seed 1.
 */
function playedWon(ctx: Ctx): EngagementResult {
  for (let seed = 1; seed <= 40; seed++) { const r = played(ctx, seed); if (r.outcome === 'heroClear') return r }
  throw new Error(`no seed from 1 to 40 wins ${ctx.campaign.cursor.engagement!.id} for ${ctx.campaign.cursor.engagement!.deployed.join(', ')}`)
}
function write(ctx: Ctx, r: EngagementResult): void {
  const e = ctx.campaign.cursor.engagement!
  const k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'test')
  applyBattleResult(ctx, e, r, k)
}
/** Out of the reckoning, past the level-ups left waiting (a level waits; XP is never lost), to the open step. */
function toOpen(ctx: Ctx): void {
  performExitBattle(ctx, 'test')
  if (ctx.campaign.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('open')
}
/** The same battle, lost: every hero-side unit down (the party and the civilians), a wipe. */
const lost = (r: EngagementResult): EngagementResult => {
  let out: EngagementResult = { ...r, outcome: 'wipe' }
  for (const u of r.units) if (u.side === 'hero' && u.lifeState !== 'dead') out = withUnitFate(out, 'hero', u.index, { lifeState: 'downed' })
  return out
}

describe('kingdom.opening-loop-three — the opening fielded as its encounters', () => {
  it('an opening battle is its engine encounter, numbered by the opening; refused while a draft is owed', () => {
    const ctx = makeCtx(makeNewCampaign(5))
    expect(draftsOwedOf(ctx.campaign)).toBe(1)
    expect(() => performFieldOpeningBattle(ctx, battleOf(ORPHANAGE), 'test')).toThrow(/refused: 1 to draft/)
    performAdvanceOpening(ctx, 'test')
    performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
    const e = performFieldOpeningBattle(ctx, battleOf(ORPHANAGE), 'test')
    expect([e.id, e.prologue, e.territoryId, e.enemies, e.mapId]).toEqual([ORPHANAGE, 1, null, [], encounterDef(ORPHANAGE).mapId])
    expect([ctx.campaign.cursor.step, ctx.campaign.cursor.prepStep]).toEqual(['prep', 'reveal'])
  })

  it('a won battle advances the opening, pays its row and rescues the civilians who lived — never the dead', () => {
    const ctx = atOrphanage()
    const r = playedWon(ctx)
    expect(r.outcome).toBe('heroClear')
    const civ = r.units.filter((u) => u.side === 'hero' && u.role === 'encounter')
    expect(civ.map((u) => u.typeId).sort()).toEqual(['hero.fixed.orphans', 'hero.fixed.school-teacher'])
    // one lives, one dies: only the living one joins
    // (2026-10-03, kingdom.opening-draft-pool: the one made dead is also marked downed — 'no hero dies standing', core/result.ts;
    // on the old seed-1 battle that civilian happened to have gone down already, on the battle found now it had not)
    const i = r.units.indexOf(civ[0]!), j = r.units.indexOf(civ[1]!)
    const fates = (x: EngagementResult) => ({ ...x, units: x.units.map((u, k) => k === i ? { ...u, lifeState: 'standing' as const, dead: false } : k === j ? { ...u, lifeState: 'dead' as const, dead: true, downed: true } : u) })
    write(ctx, fates(r))
    expect(ctx.campaign.cursor.prologue).toBe(2)
    const civilians = Object.values(ctx.campaign.roster).filter((h) => h.classes.includes('class.civilian'))
    expect(civilians.map((h) => h.unitType)).toEqual([civ[0]!.typeId])
    expect(civilians[0]!.name).toBe(civ[0]!.typeId === 'hero.fixed.orphans' ? 'Orphan Child' : 'School Teacher')
    expect(Object.values(ctx.campaign.roster).filter((h) => !h.classes.includes('class.civilian')).every((h) => h.xp === 20)).toBe(true)
    // Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." · "One, yes."): was toBe(2) — the 2026-08-23 cadence, two drafts after battle 1. One is owed now.
    expect(draftsOwedOf(ctx.campaign)).toBe(1)
  })

  it('a lost opening battle is replayed: the Campaign goes on, nothing advances, nobody is rescued, the wounds stay', () => {
    const ctx = atOrphanage()
    write(ctx, lost(playedWon(ctx)))
    expect(ctx.campaign.ended).toBeNull()
    expect(ctx.campaign.cursor.prologue).toBe(1)
    expect(Object.values(ctx.campaign.roster).filter((h) => h.classes.includes('class.civilian'))).toEqual([])
    expect(draftsOwedOf(ctx.campaign)).toBe(0)
    const party = ctx.campaign.cursor.engagement!.deployed
    expect(party.every((id) => ctx.campaign.roster[id]!.wound === 1)).toBe(true)
    // out through the level-ups (the Orphanage pays its 20 on a loss too) to the open step, and the same battle again
    toOpen(ctx)
    fielded(ctx, ORPHANAGE)
    expect(ctx.campaign.cursor.engagement!.deployed).toEqual(party)
    expect(ctx.campaign.cursor.engagement!.seed).toBe(1)
  })

  // Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." · "One, yes."): this test was titled 'the next battle is refused until its drafts are taken; the cadence
  // is 1, then 2 after battle 1' and expected /refused: 2 to draft before battle 2/ — the 2026-08-23 cadence the ruling
  // replaces. The refusal stands; what is owed is one draft.
  it('the next battle is refused until its draft is taken; the cadence is one before battle 1, then one after each battle', () => {
    const ctx = atOrphanage()
    write(ctx, playedWon(ctx))
    toOpen(ctx)
    expect(() => performFieldOpeningBattle(ctx, battleOf(LUMBERJACK), 'test')).toThrow(/refused: 1 to draft before battle 2/)
  })

  it('the page: map -> draft -> equip -> battle -> reckoning, rewards, level-ups -> map, three times; a loss offered again with the same party', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/opening loop three: .*passed/)
  }, 600000)
})
