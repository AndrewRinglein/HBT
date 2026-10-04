// kingdom.opening-run-six (engine DECISIONS.md 2026-10-01 'one continuous run through the first six battles, saved, never
// the kingdom map': "We need a continuous play experience that goes through the first six levels … It does have to save
// correctly … We're not ever going to the kingdom map in these first six fights." · "Yes, you can continue from the next
// battle." · "there should be battle rewards, experience points, levels, and equipping inside of our sixth loop").
// Expect: "From http://127.0.0.1:4230/play Andrew starts a run, picks the first hero, drafts, equips and plays the
// Orphanage through the Cathedral without the kingdom map; closing the page after battle 3 and reopening it continues at
// battle 4 with the same party, items, XP and levels; losing a battle offers it again with the same party."
//
// The mechanism: every section of the Retaking Abbotown map is an engine encounter the sandbox fields, paid by its rewards
// row (the Cathedral's came with its encounter); the run is the Campaign's own save kept in the browser (ui/opening-run.ts)
// and the map it reopens on is read from the Campaign (core/opening.ts openingBattlesWonOf). The page half
// (tools/opening-run-six.verify.mjs) plays the COMMITTED sandbox: six battles, the page closed after battle 3 and opened
// again in the same browser, a loss offered again; the launcher (PLAY.html) offers the run.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, openingBattlesWonOf } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome } from '../src/core/mutate.js'
import { performAdvancePrep, performDeploy } from '../src/core/prep.js'
import { createSandbox, sandboxResult } from '../src/core/sandbox.js'
import { resolveReckoning, applyBattleResult } from '../src/core/reckoning.js'
import { saveOf } from '../src/core/campaign.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { SANDBOX_ENCOUNTERS } from '../src/content/sandbox.js'
import { encounterRewardOf } from '../src/content/encounter-rewards.js'
import { RUN_SAVE_KEY, runSaveOf, runOf, readRun, writeRun } from '../src/ui/opening-run.js'
import { runBattle, encounterDef } from '../src/engine.js'

const ORPHANAGE = 'encounter.opening.orphanage'

/** A new Campaign through a won Orphanage, written by the one writer, at the reckoning. */
function afterOrphanage() {
  const ctx = makeCtx(makeNewCampaign(5))
  performAdvanceOpening(ctx, 'test')
  performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  performFieldOpeningBattle(ctx, { id: ORPHANAGE, mapId: encounterDef(ORPHANAGE).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  for (const h of Object.keys(ctx.campaign.roster)) performDeploy(ctx, h, 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  // Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
  // Rogues and Mages included'): was one battle on `seed: 1`, which the five-hero pool's first offer on Campaign seed 5 won.
  // The pool is the 24 base heroes now; that first offer is the Forest Elf, who alone loses the Orphanage on seed 1 and wins
  // it on seed 5. "A won Orphanage" is found — the first seed the engine's AI wins on — and asserted won.
  const fight = (seed: number) => { const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(ctx.campaign.roster[id]!)), enemies: [], seed, encounterId: e.id }); runBattle(s.ctx); return sandboxResult(s) }
  let r = fight(1)
  for (let seed = 2; seed <= 40 && r.outcome !== 'heroClear'; seed++) r = fight(seed)
  expect(r.outcome).toBe('heroClear')
  const k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'test')
  applyBattleResult(ctx, e, r, k)
  return { ctx, last: { engagementId: e.id, result: r, reckoning: k } }
}
const memory = () => { const m = new Map<string, string>(); return { m, store: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } } }

describe('kingdom.opening-run-six — one run through the six battles, saved', () => {
  it('every section of the Retaking Abbotown map is a battle the sandbox fields, paid by a row that is replayed and never fatigues', () => {
    expect(ABBOTOWN_MAP.sections.map((s) => s.encounterId)).toEqual(['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral'].map((x) => 'encounter.opening.' + x))
    for (const s of ABBOTOWN_MAP.sections) {
      expect(SANDBOX_ENCOUNTERS.some((e) => e.id === s.encounterId), `${s.encounterId} is playable`).toBe(true)
      const row = encounterRewardOf(s.encounterId)
      expect(row, `${s.encounterId} has a rewards row`).not.toBeNull()
      expect([row!.replayed, row!.fatigues]).toEqual([true, false])
    }
    expect(encounterRewardOf('encounter.opening.cathedral')!.offer).toEqual({ kind: 'draw' })
  })

  it('the run is the Campaign\'s own save with the last battle beside it; read back, it is the same run at the same step', () => {
    const { ctx, last } = afterOrphanage()
    const back = runOf(runSaveOf(ctx.campaign, last))
    expect(saveOf(back.campaign)).toBe(saveOf(ctx.campaign))
    expect(back.lastBattle).toEqual(JSON.parse(JSON.stringify(last)))
    expect(back.campaign.cursor.step).toBe('reckoning')
    expect(openingBattlesWonOf(back.campaign)).toBe(1)
    const { m, store } = memory()
    writeRun(store, ctx.campaign, last)
    expect([...m.keys()]).toEqual([RUN_SAVE_KEY])
    expect(saveOf(readRun(store).run!.campaign)).toBe(saveOf(ctx.campaign))
  })

  it('a run that is not one is refused, and said: another format, a broken Campaign, a Campaign past the opening', () => {
    const { ctx } = afterOrphanage()
    expect(() => runOf(JSON.stringify({ format: 'hbt-sandbox', version: 1 }))).toThrow(/not an opening run save/)
    expect(() => runOf(JSON.stringify({ format: 'hbt-opening-run', version: 1, campaign: { version: 1 } }))).toThrow(/V2/)
    const past = structuredClone(ctx.campaign); past.cursor.prologue = null
    expect(() => runOf(runSaveOf(past, null))).toThrow(/past the opening/)
    const { m, store } = memory()
    m.set(RUN_SAVE_KEY, '{')
    const kept = readRun(store)
    expect(kept.run).toBeNull(); expect(kept.why).not.toBe('')
    expect(readRun(memory().store)).toEqual({ run: null, why: '' })
  })

  it('the launcher offers the run: Start a new run, and Continue when this browser keeps one', () => {
    const html = readFileSync('PLAY.html', 'utf8')
    expect(html).toContain('<a href="../kingdom/BATTLE-SANDBOX.html?map&amp;new" data-run="new">Start a new run</a>')
    expect(html).toContain('<a href="../kingdom/BATTLE-SANDBOX.html?map" data-run="continue" hidden>')
    expect(html).toContain(`localStorage.getItem(${JSON.stringify(RUN_SAVE_KEY)})`)
  })

  it('the page: six battles from the map, never the kingdom map; closed after battle 3 and opened again, it goes on at battle 4 with the same party, items, XP and levels; a loss offered again with the same party', () => {
    const out = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/opening run six: .*passed/)
  }, 1800000)
})
