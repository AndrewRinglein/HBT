// kingdom.opening-recap-civilians — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the civilians show on the victory screen;
// the specialty three are random; …': "The battle should show in this victory screen too. If they were wounded, if they
// died, they're in there too." — asked whether he meant the civilians: "2, yes.").
//
// Expect: "At http://127.0.0.1:4230/play the victory screen after the Orphanage shows the first hero and, set apart, the
// Orphan Child and the School Teacher, each marked unhurt, wounded or dead as the battle left them; after the Lumberjack
// House it shows the Lumberjack and his Wife the same way; the page test asserts a card for every player-side unit of
// the battle and the mark of a civilian who died."
//
// The civilians are read from the battle's own result — the hero-side rows that are not the roster's (view/civilians.ts
// listBattleCivilians) — never from a list of names; the screen (ui/after.ts recapScreen) draws them in their own row
// under the heroes'. The page half is tools/opening-run-six.verify.mjs and tools/opening-loop-three.verify.mjs, on the
// built BATTLE-SANDBOX.html.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'

// the page's art is a build-time constant (__ART__, tools/build-sandbox.mjs); here it is a stand-in filled in below
vi.hoisted(() => { (globalThis as unknown as { __ART__: unknown }).__ART__ = { heroes: {}, items: {}, data: {} } })

import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy, draftsOwedOf } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { performLeaveLevelUp, performTakeReward, listRewardTakers } from '../src/core/rewards.js'
import type { EngagementResult } from '../src/core/seam.js'
import type { SandboxConfig } from '../src/core/sandbox.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { HERO_POOL, CIVILIANS, RESCUABLE_CIVILIANS } from '../src/content/heroes.js'
import { ART } from '../src/ui/art.js'
import { recapScreen, type LastBattle } from '../src/ui/after.js'
import { encounterDef } from '../src/engine.js'

type Civilian = { typeId: string; name: string; fate: 'unhurt' | 'wounded' | 'dead'; heroId: string | null; joins: boolean }
// the read-model's module is the item's own: absent before it, and the probe is red test by test, not at its import
const CIVILIANS_VIEW: unknown = await import('../src/view/civilians.js' as string).catch(() => ({}))
const listBattleCivilians = (CIVILIANS_VIEW as unknown as { listBattleCivilians?: (c: Ctx['campaign'], r: EngagementResult) => Civilian[] }).listBattleCivilians
const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const [ORPHANAGE, LUMBERJACK] = SECTIONS as [string, string]
const CHILD = 'hero.fixed.orphans', TEACHER = 'hero.fixed.school-teacher', LUMBERJACK_UNIT = 'hero.fixed.lumberjack-and-wife', WIFE = 'hero.fixed.lumberjacks-wife'

// a stand-in portrait per hero and civilian the kingdom can show (the Lumberjack's Wife has none, as on disk)
const fileOf = (id: string) => `hero-${id.split('.').pop()}.jpg`
const uriOf = (id: string) => `data:image/jpeg;base64,${Buffer.from('portrait of ' + id).toString('base64')}`
const art = ART as unknown as { heroes: Record<string, string>; data: Record<string, string> }
for (const h of [...HERO_POOL, ...CIVILIANS, ...RESCUABLE_CIVILIANS]) if (h.id !== WIFE) { art.heroes[h.id] = fileOf(h.id); art.data[fileOf(h.id)] = uriOf(h.id) }

const driver = () => import('../tools/opening-page.mjs' as string) as Promise<{ playedOut: (config: SandboxConfig, won: boolean) => { result: EngagementResult } }>
const imagesIn = (html: string) => [...html.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1])
function blocks(html: string, open: RegExp): string[] {
  const at = [...html.matchAll(open)].map((m) => m.index!)
  return at.map((from, i) => html.slice(from, at[i + 1] ?? html.length))
}
const attr = (block: string, name: string) => block.match(new RegExp(`${name}="([^"]*)"`))?.[1]

/** The opening battle on the cursor fielded with the whole party, walked to the battle step: the config the page fields. */
function field(ctx: Ctx): SandboxConfig {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 4; guard++) { performAdvanceOpening(ctx, 'test'); performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test') }
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  return { mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((h) => structuredClone(ctx.campaign.roster[h]!)), enemies: [], seed: e.seed, encounterId: e.id }
}
/** The battle's result with each named civilian left as told: unhurt (standing, never down), wounded (went down, lives), dead. */
function withFates(r: EngagementResult, fates: Record<string, 'unhurt' | 'wounded' | 'dead'>): EngagementResult {
  return { ...r, units: r.units.map((u) => {
    const f = u.side === 'hero' && u.role !== undefined ? fates[u.typeId] : undefined
    if (!f) return u
    // Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the
    // hero forward to the end of the bridge and bring the zombie left, maybe 3 squares"): the last branch read
    //   : { ...u, lifeState: 'standing' as const, dead: false, downed: false }
    // — "unhurt (standing, never down)", written when no civilian of the played battle had ever gone down. On the closer
    // start the Zombie reaches the civilians, and one may go down and be stood up again (`stood`), which the screen reads
    // as wounded. "Unhurt" is said whole now: standing, never down, never stood back up. The tests are unchanged.
    // (a result row writes `stood` only when true: the key is left out, not set false)
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
/** Out of the reckoning to the map: the reward taken (to its first taker), the levels left waiting. */
function toOpen(ctx: Ctx): void {
  const c = ctx.campaign
  performExitBattle(ctx, 'test')
  if (c.cursor.step === 'rewards') { const item = c.cursor.rewardOffer![0]!, takers = listRewardTakers(c, item); performTakeReward(ctx, item, 'test', takers[0]) }
  if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
  expect(c.cursor.step).toBe('open')
}
const civiliansOn = (html: string) => html.includes('id="rc-civilians"') ? blocks(html.slice(html.indexOf('id="rc-civilians"'), html.indexOf('id="rc-spot"')), /<div class="civilian-member"/g) : []

describe('kingdom.opening-recap-civilians — the victory screen shows the civilians who fought', () => {
  // the page driver bundles the kingdom's sources when it is first imported — seconds on a loaded machine; done once, here
  beforeAll(async () => { await driver() }, 120000)

  it('the civilians are read from the battle\'s own result — the hero-side units that are not roster heroes — each unhurt, wounded or dead', async () => {
    expect(typeof listBattleCivilians, 'view/civilians.ts listBattleCivilians').toBe('function')
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), won = playedOut(field(ctx), true).result
    const encounter = won.units.filter((u) => u.side === 'hero' && u.role !== undefined)
    expect(encounter.map((u) => u.typeId).sort()).toEqual([CHILD, TEACHER])
    for (const [child, teacher] of [['unhurt', 'unhurt'], ['wounded', 'dead'], ['dead', 'wounded'], ['dead', 'dead']] as const) {
      const r = withFates(won, { [CHILD]: child, [TEACHER]: teacher })
      const civilians = listBattleCivilians!(ctx.campaign, r)
      expect(civilians.map((x) => x.typeId)).toEqual(encounter.map((u) => u.typeId))
      expect(Object.fromEntries(civilians.map((x) => [x.typeId, x.fate]))).toEqual({ [CHILD]: child, [TEACHER]: teacher })
      // named as the kingdom names them — the row each joins the roster as — not the engine's numbered unit name
      expect(Object.fromEntries(civilians.map((x) => [x.typeId, x.name]))).toEqual({ [CHILD]: 'Orphan Child', [TEACHER]: 'School Teacher' })
      expect(encounter.map((u) => u.name).sort()).toEqual(['Orphan Child 1', 'School Teacher 1'])
      // never a roster hero: the party's rows are not among them
      expect(civilians.length).toBe(r.units.filter((u) => u.side === 'hero').length - ctx.campaign.cursor.engagement!.deployed.length)
    }
    // a civilian still down when the battle ends is wounded, not unhurt
    const down = { ...won, units: won.units.map((u) => u.typeId === CHILD ? { ...u, lifeState: 'downed' as const, downed: true } : u) }
    expect(listBattleCivilians!(ctx.campaign, down).find((x) => x.typeId === CHILD)!.fate).toBe('wounded')
  })

  it('after the Orphanage the victory screen shows the first hero and, set apart, the Orphan Child and the School Teacher, each marked as the battle left them', async () => {
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const r = withFates(playedOut(field(ctx), true).result, { [CHILD]: 'wounded', [TEACHER]: 'dead' })
    const last = write(ctx, r), hero = c.cursor.engagement!.deployed[0]!
    const html = recapScreen(c, ctx.events, last)
    // the heroes' row is the heroes' alone, as it was
    const faces = blocks(html, /<div class="party-member"/g)
    expect(faces.length).toBe(1)
    expect(imagesIn(faces[0]!.slice(0, faces[0]!.indexOf('party-name')))).toEqual([uriOf(hero)])
    // set apart: a row of its own, after the heroes', under its own heading
    expect(html.indexOf('id="rc-civilians"'), 'the civilians have a row of their own').toBeGreaterThan(html.indexOf('id="rc-party"'))
    expect(html.slice(html.indexOf('id="rc-party"'), html.indexOf('id="rc-civilians"')), 'no civilian among the heroes').not.toContain('civilian-member')
    expect(html.slice(html.indexOf('id="rc-civilians"'))).toMatch(/Civilians/)
    const cards = civiliansOn(html)
    expect(cards.map((x) => attr(x, 'data-unit')).sort()).toEqual([CHILD, TEACHER])
    const child = cards.find((x) => attr(x, 'data-unit') === CHILD)!, teacher = cards.find((x) => attr(x, 'data-unit') === TEACHER)!
    expect([attr(child, 'data-fate'), attr(teacher, 'data-fate')]).toEqual(['wounded', 'dead'])
    expect(child).toContain('Orphan Child'); expect(teacher).toContain('School Teacher')
    expect(child, 'the mark is said in words').toMatch(/>Wounded/); expect(teacher).toMatch(/>Dead/)
    expect(child).toContain('civilian-portrait wounded'); expect(teacher).toContain('civilian-portrait dead')
    // each with its own portrait
    expect(imagesIn(child)).toEqual([uriOf(CHILD)]); expect(imagesIn(teacher)).toEqual([uriOf(TEACHER)])
    // a card for every player-side unit of the battle
    expect(faces.length + cards.length).toBe(r.units.filter((u) => u.side === 'hero').length)
    // the one who lived joins the pool, and is marked so; the dead one does not
    expect(Object.keys(c.roster).sort()).toEqual([hero, CHILD].sort())
    expect([attr(child, 'data-joins'), attr(teacher, 'data-joins')]).toEqual(['1', '0'])
    expect(child).toContain('class="civilian-joins">joins you<'); expect(teacher).not.toContain('civilian-joins')
    // … and the report names them as a hero is named
    const report = html.slice(html.indexOf('id="rc-report"'), html.indexOf('id="rc-btn"'))
    expect(report).toContain('Orphan Child — Wounded'); expect(report).toContain('School Teacher — fell in battle')
    expect(report, 'a civilian was hurt: not "no wounds sustained"').not.toContain('No wounds sustained')
  })

  it('"Decisive Victory — No wounds sustained" is said only when no hero and no civilian was wounded or killed', async () => {
    const { playedOut } = await driver()
    const say = (fates: Record<string, 'unhurt' | 'wounded' | 'dead'>) => {
      const ctx = makeCtx(makeNewCampaign(11)), last = write(ctx, withFates(playedOut(field(ctx), true).result, fates))
      const html = recapScreen(ctx.campaign, ctx.events, last)
      return { report: html.slice(html.indexOf('id="rc-report"'), html.indexOf('id="rc-btn"')), cards: civiliansOn(html) }
    }
    const clean = say({ [CHILD]: 'unhurt', [TEACHER]: 'unhurt' })
    expect(clean.report).toContain('Decisive Victory — No wounds sustained')
    expect(clean.cards.map((x) => attr(x, 'data-fate'))).toEqual(['unhurt', 'unhurt'])
    for (const x of clean.cards) { expect(x).toMatch(/>Unhurt/); expect(attr(x, 'data-joins')).toBe('1') }
    for (const fates of [{ [CHILD]: 'wounded', [TEACHER]: 'unhurt' }, { [CHILD]: 'unhurt', [TEACHER]: 'dead' }] as const) {
      const hurt = say(fates)
      expect(hurt.report).not.toContain('No wounds sustained')
      expect(hurt.report).toMatch(/Orphan Child — Wounded|School Teacher — fell in battle/)
    }
  })

  it('after the Lumberjack House it shows the Lumberjack and his Wife the same way; a civilian with no portrait is shown by name, never with another\'s face', async () => {
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    write(ctx, playedOut(field(ctx), true).result); toOpen(ctx)
    const r = withFates(playedOut(field(ctx), true).result, { [LUMBERJACK_UNIT]: 'dead', [WIFE]: 'unhurt' })
    expect(c.cursor.engagement!.id).toBe(LUMBERJACK)
    const last = write(ctx, r), html = recapScreen(c, ctx.events, last)
    expect(blocks(html, /<div class="party-member"/g).length, 'the two heroes who fought').toBe(2)
    const cards = civiliansOn(html)
    expect(cards.map((x) => attr(x, 'data-unit')).sort()).toEqual([LUMBERJACK_UNIT, WIFE].sort())
    const man = cards.find((x) => attr(x, 'data-unit') === LUMBERJACK_UNIT)!, wife = cards.find((x) => attr(x, 'data-unit') === WIFE)!
    expect([attr(man, 'data-fate'), attr(wife, 'data-fate')]).toEqual(['dead', 'unhurt'])
    for (const [card, unit] of [[man, LUMBERJACK_UNIT], [wife, WIFE]] as const) expect(card).toContain('>' + RESCUABLE_CIVILIANS.find((h) => h.unitType === unit)!.name.replace(/'/g, "'") + '<')
    expect(RESCUABLE_CIVILIANS.find((h) => h.unitType === LUMBERJACK_UNIT)!.name).toBe('Lumberjack')
    expect(imagesIn(man)).toEqual([uriOf(LUMBERJACK_UNIT)])
    expect(imagesIn(wife), 'no portrait on disk: no image').toEqual([])
  })

  it('a lost battle\'s screen has no party row and no civilians\' row — it is the victory screen that shows them', async () => {
    const { playedOut } = await driver()
    const ctx = makeCtx(makeNewCampaign(11)), last = write(ctx, playedOut(field(ctx), false).result)
    const html = recapScreen(ctx.campaign, ctx.events, last)
    expect(html).toContain('data-won="false"')
    expect(html).not.toContain('id="rc-party"'); expect(html).not.toContain('civilian-member')
  })

  it('the pages: a card for every player-side unit on every victory screen, the civilians set apart and marked, and the mark of a civilian who died', () => {
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toMatch(/the victory screens showed the civilians who fought, set apart from the heroes and marked unhurt, wounded or dead \(the Orphanage: [^;)]+; the Lumberjack House: [^;)]+\); a civilian who died \([^)]+\) was marked dead and did not join/)
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(three).toMatch(/the victory screens showed the civilians who fought \(the Orphanage: [^;)]+; the Lumberjack House: [^;)]+\)/)
  }, 1800000)
})
