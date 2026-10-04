// kingdom.opening-recap-decisive — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'a victory in which a civilian was hurt is
// not a decisive victory'): "if a civilian was hurt it was not a decisive victory."
//
// Expect: "At http://127.0.0.1:4230/play a won Orphanage in which the Orphan Child was wounded or killed and no hero was
// hurt does not show 'Decisive' in its title; a won battle in which nobody on the player's side was hurt does; the page
// test asserts both titles, and a test holds the title and the report line to one reading of hurt."
//
// kingdom.opening-recap-civilians put the civilians on the victory screen and made the report line count them, but left
// the title's grade the heroes' alone (kingdom SWITCHES.md recapCiviliansTitle) — DECISIVE VICTORY could stand above a
// dead civilian. The title's grade reads the whole player side now (ui/after.ts outcomeOf: the heroes and the civilians
// who fought), and the title and the report line ask ONE function whether anybody was hurt (ui/after.ts isUnhurt). The
// page half is tools/opening-recap-decisive.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// the page's art is a build-time constant (__ART__, tools/build-sandbox.mjs); here it is a stand-in
vi.hoisted(() => { (globalThis as unknown as { __ART__: unknown }).__ART__ = { heroes: {}, items: {}, data: {} } })

import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { resolveReckoning, applyBattleResult } from '../src/core/reckoning.js'
import type { EngagementResult } from '../src/core/seam.js'
import type { SandboxConfig } from '../src/core/sandbox.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import * as AFTER from '../src/ui/after.js'
import { recapScreen, outcomeOf, type LastBattle, type Outcome } from '../src/ui/after.js'
import { listBattleCivilians } from '../src/view/civilians.js'
import { encounterDef } from '../src/engine.js'

type Fate = 'unhurt' | 'wounded' | 'dead'
type Mark = { wound: number; dead: boolean }
// the one reading of "hurt" is the item's own: absent before it, and the probe is red test by test, not at its import
const isUnhurt = (AFTER as unknown as { isUnhurt?: (side: readonly Mark[]) => boolean }).isUnhurt
const sideOf = (AFTER as unknown as { sideOf?: (heroes: readonly Mark[], civilians: readonly { fate: Fate }[]) => Mark[] }).sideOf
// outcomeOf's fifth argument is the item's: the civilians who fought, as the battle left them
const gradeOf = outcomeOf as unknown as (won: boolean, heroes: Mark[], turns: number, maxTurns?: number, civilians?: Mark[]) => Outcome

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const ORPHANAGE = SECTIONS[0]!
const CHILD = 'hero.fixed.orphans', TEACHER = 'hero.fixed.school-teacher'
const driver = () => import('../tools/opening-page.mjs' as string) as Promise<{ playedOut: (config: SandboxConfig, won: boolean) => { result: EngagementResult } }>

/** The opening battle on the cursor fielded with the whole party, walked to the battle step: the config the page fields. */
function field(ctx: Ctx): SandboxConfig {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 4; guard++) { performAdvanceOpening(ctx, 'test'); performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test') }
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  return { mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((h) => structuredClone(ctx.campaign.roster[h]!)), enemies: [], seed: e.seed, encounterId: e.id }
}
/** The battle's result with each named civilian left as told (as test/opening-recap-civilians.test.ts leaves them), in `turns` Turns. */
function withFates(r: EngagementResult, fates: Record<string, Fate>, turns?: number): EngagementResult {
  return { ...r, ...(turns === undefined ? {} : { turns }), units: r.units.map((u) => {
    const f = u.side === 'hero' && u.role !== undefined ? fates[u.typeId] : undefined
    if (!f) return u
    const { stood: _stood, ...row } = u as typeof u & { stood?: boolean }
    return f === 'dead' ? { ...u, lifeState: 'dead' as const, dead: true, downed: true } : f === 'wounded' ? { ...row, lifeState: 'standing' as const, dead: false, downed: true } : { ...row, lifeState: 'standing' as const, dead: false, downed: false }
  }) }
}
/** The result written by the one writer; the screen's own last battle. */
function write(ctx: Ctx, r: EngagementResult): LastBattle {
  const e = ctx.campaign.cursor.engagement!, k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'test'); applyBattleResult(ctx, e, r, k)
  return { engagementId: e.id, result: r, reckoning: k }
}
/** The victory screen of a won Orphanage: the civilians left as told, the hero's wound as told, fought in `turns` Turns. */
async function screen(fates: Record<string, Fate>, o: { heroWound?: number; turns?: number } = {}) {
  const { playedOut } = await driver()
  const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
  const last = write(ctx, withFates(playedOut(field(ctx), true).result, fates, o.turns ?? 6))
  expect(c.cursor.engagement!.id).toBe(ORPHANAGE)
  const hero = c.cursor.engagement!.deployed[0]!
  // the party was not hurt by the battle (the driver's strong party); a hero's wound is the roster's, set as the test means it
  expect(c.roster[hero]!.wound).toBe(0); expect(c.roster[hero]!.lifeState).not.toBe('dead')
  if (o.heroWound) c.roster[hero]!.wound = o.heroWound
  const html = recapScreen(c, ctx.events, last)
  const title = html.match(/id="rc-title">([^<]*)</)![1]!, outcome = html.match(/data-outcome="([^"]*)"/)![1]! as Outcome
  const report = html.slice(html.indexOf('id="rc-report"'), html.indexOf('id="rc-btn"'))
  return { html, title, outcome, report, civilians: listBattleCivilians(c, last.result), heroMark: { wound: c.roster[hero]!.wound, dead: false } }
}

describe('kingdom.opening-recap-decisive — a victory in which a civilian was hurt is not a decisive victory', () => {
  // the page driver bundles the kingdom's sources when it is first imported — seconds on a loaded machine; done once, here
  beforeAll(async () => { await driver() }, 120000)

  it('a won Orphanage in which the Orphan Child was wounded or killed and no hero was hurt does not show "Decisive" in its title; one in which nobody was hurt does', async () => {
    const clean = await screen({ [CHILD]: 'unhurt', [TEACHER]: 'unhurt' })
    expect(clean.title).toBe('DECISIVE VICTORY'); expect(clean.outcome).toBe('decisive')
    expect(clean.html).toContain('class="result-title victory-decisive"'); expect(clean.html).toContain('decisive-glow')
    for (const child of ['wounded', 'dead'] as const) {
      const hurt = await screen({ [CHILD]: child, [TEACHER]: 'unhurt' })
      expect(hurt.title, `the Orphan Child ${child}, no hero hurt`).not.toMatch(/decisive/i)
      expect(hurt.outcome).not.toBe('decisive')
      expect(hurt.html, 'nor the decisive title\'s look').not.toContain('victory-decisive'); expect(hurt.html).not.toContain('decisive-glow')
      expect(hurt.html, 'still a victory').toContain('data-won="true"'); expect(hurt.title).toMatch(/VICTORY/)
      expect(hurt.heroMark.wound, 'no hero was hurt').toBe(0)
    }
    // … and the School Teacher's wound or death takes it away just the same: any civilian who fought
    for (const teacher of ['wounded', 'dead'] as const) expect((await screen({ [CHILD]: 'unhurt', [TEACHER]: teacher })).title).not.toMatch(/decisive/i)
  })

  it('a hurt civilian gives the grade a hurt hero gives: wounded as a wounded hero, dead as a dead one', async () => {
    const wounded = await screen({ [CHILD]: 'wounded', [TEACHER]: 'unhurt' }), dead = await screen({ [CHILD]: 'dead', [TEACHER]: 'unhurt' })
    // the grade of the same battle had the hero been the one wounded (one level), or dead
    expect(wounded.outcome).toBe(outcomeOf(true, [{ wound: 1, dead: false }], 6)); expect(wounded.outcome).toBe('costly'); expect(wounded.title).toBe('COSTLY VICTORY')
    expect(dead.outcome).toBe(outcomeOf(true, [{ wound: 0, dead: true }], 6)); expect(dead.outcome).toBe('devastating'); expect(dead.title).toBe('VICTORY')
    // the function itself: the civilians' marks beside the heroes', in a won battle
    const ok: Mark = { wound: 0, dead: false }
    expect(gradeOf(true, [ok], 6, 25, [ok, ok])).toBe('decisive')
    expect(gradeOf(true, [ok], 6, 25, [{ wound: 1, dead: false }, ok])).toBe('costly')
    expect(gradeOf(true, [ok], 6, 25, [ok, { wound: 0, dead: true }])).toBe('devastating')
    expect(gradeOf(true, [{ wound: 2, dead: false }], 6, 25, [{ wound: 1, dead: false }]), 'the worst of the side').toBe('pyrrhic')
    // a slow battle with nobody hurt is a plain VICTORY, as it was; a hurt civilian does not make it better or worse than a hurt hero would
    expect(gradeOf(true, [ok], 20, 25, [ok])).toBe('standard'); expect(gradeOf(true, [ok], 20, 25, [{ wound: 1, dead: false }])).toBe('costly')
    // a lost battle's grade is the heroes', as it was: the ruling is of a victory
    expect(gradeOf(false, [ok], 6, 25, [{ wound: 0, dead: true }])).toBe('overwhelmed'); expect(gradeOf(false, [{ wound: 0, dead: true }], 6, 25, [ok])).toBe('total_wipe')
  })

  it('one reading of hurt for the title and the report line — the same function: "No wounds sustained" is said exactly when the title\'s grade found nobody hurt', async () => {
    expect(typeof isUnhurt, 'ui/after.ts isUnhurt').toBe('function'); expect(typeof sideOf, 'ui/after.ts sideOf').toBe('function')
    const FATES: Fate[] = ['unhurt', 'wounded', 'dead']
    let seen = 0, decisive = 0
    for (const heroWound of [0, 1, 2]) for (const child of FATES) for (const teacher of FATES) for (const turns of [6, 20]) {
      const s = await screen({ [CHILD]: child, [TEACHER]: teacher }, { heroWound, turns })
      const side = sideOf!([s.heroMark], s.civilians), nobodyHurt = isUnhurt!(side), label = `hero wound ${heroWound}, child ${child}, teacher ${teacher}, ${turns} Turns`
      expect(side.length, 'the whole player side: the hero and the two civilians').toBe(3)
      expect(nobodyHurt, label).toBe(heroWound === 0 && child === 'unhurt' && teacher === 'unhurt')
      // the report line …
      expect(s.report.includes('No wounds sustained'), label + ': the report line').toBe(nobodyHurt)
      // … and the title's grade: a grade that found nobody hurt is 'decisive' or (a slow battle) 'standard', and no other
      expect(s.outcome === 'decisive' || s.outcome === 'standard', label + `: the title's grade (${s.outcome})`).toBe(nobodyHurt)
      expect(/DECISIVE/.test(s.title), label + ': the title').toBe(nobodyHurt && turns === 6)
      // never the one above the other: a DECISIVE title is never over a report that names a wound, nor "No wounds" under a COSTLY one
      if (/DECISIVE/.test(s.title)) { expect(s.report).toContain('No wounds sustained'); decisive++ }
      if (s.report.includes('No wounds sustained')) expect(s.title).toMatch(/^(DECISIVE )?VICTORY$/)
      seen++
    }
    expect(seen).toBe(54); expect(decisive).toBe(1)
    // the same function, not two: the screen's source asks isUnhurt for both and holds no second test of who was hurt
    const src = readFileSync('src/ui/after.ts', 'utf8').replace(/\/\/.*$/gm, '')
    const recap = src.slice(src.indexOf('export function recapScreen'), src.indexOf('export function', src.indexOf('export function recapScreen') + 10))
    expect(recap.match(/isUnhurt\(/g)?.length, 'the report line asks isUnhurt, once').toBe(1)
    expect(recap, 'no second reading of hurt in the screen').not.toMatch(/civilianLines\.length === 0|fates\.every\(/)
    const grade = src.slice(src.indexOf('export function outcomeOf'), src.indexOf('const TITLE'))
    expect(grade.match(/isUnhurt\(/g)?.length, 'the title\'s grade asks isUnhurt, once').toBe(1)
  })

  it('the page: on the built BATTLE-SANDBOX.html a won Orphanage with nobody hurt reads DECISIVE VICTORY, and one won with a civilian dead does not', () => {
    const out = execFileSync(process.execPath, ['tools/opening-recap-decisive.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/opening-recap-decisive: .*passed/)
  }, 240000)
})
