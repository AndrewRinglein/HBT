// kingdom.opening-deploy-choice — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run, audited', question 3:
// "Should the player choose which four heroes go into each battle?" — "3 yes"; his post: "Hero selection.").
//
// Expect: "At http://127.0.0.1:4230/play with five living heroes the run asks which four go before the battle, the four
// chosen are the four on the Equip screen and on the board, and the fifth stays home unharmed and earns nothing; with four
// or fewer alive no choice is asked; the page test reaches five alive and asserts the choice."
//
// The mechanism is the kingdom's own Deploy — Combat Prep's third step (core/prep.ts performDeploy, performUndeploy,
// performAdvancePrep), never a second one. Until this item the run walked past it: the page sent the first four living
// heroes by id (ui/sandbox.ts fieldBattle; kingdom SWITCHES openingDeployAll, openingPoolWhoDeploys). Now core/opening.ts
// decides whether the choice is owed (performOpeningDeploy): with more heroes free to fight than the deploy limit the
// cursor STAYS at Deploy with nobody sent, and the player sends up to the limit; with the limit or fewer, all go and
// Equip opens at once. The choice is the Engagement's `deployed`, in the Campaign — so it is saved with the run — and a
// lost battle fielded again is a new Engagement, so the choice is asked again.
//
// The page half is tools/opening-run-six.verify.mjs (test/opening-run-six.test.ts), on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, draftsOwedOf, draftedCountOf, listOpeningParty, isDeployChoiceOwed, performOpeningDeploy } from '../src/core/opening.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { performAdvancePrep, performDeploy, performUndeploy, canDeploy, canAdvancePrep, deployLimitOf, viewCombatPrep } from '../src/core/prep.js'
import { createSandbox, sandboxResult } from '../src/core/sandbox.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { performLeaveLevelUp } from '../src/core/rewards.js'
import { withUnitFate } from '../src/core/result.js'
import type { EngagementResult } from '../src/core/seam.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { RESCUABLE_CIVILIANS } from '../src/content/heroes.js'
import { WOUND_UNAVAILABLE } from '../src/content/wounds.js'
import { groupOf } from '../src/content/classes.js'
import { deployPage } from '../src/ui/deploy.js'
import { equipPage } from '../src/ui/equip.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { runBattle, encounterDef } from '../src/engine.js'

const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
/** the opening battle before which the cadence has drafted `heroes` (1 · +2 · +1 a battle, to six) */
const BATTLE_OF: Record<number, number> = { 1: 1, 3: 2, 4: 3, 5: 4, 6: 5 }

/** A run with `heroes` drafted (the first offer each time), standing on the map before the battle the cadence brings them to. */
function partyOf(seed: number, heroes: number): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed))
  ctx.campaign.cursor.prologue = BATTLE_OF[heroes]!
  const step = (): string => ctx.campaign.cursor.step
  for (let guard = 0; draftsOwedOf(ctx.campaign) > 0 && guard < 8; guard++) {
    performAdvanceOpening(ctx, 'test')
    expect(step()).toBe('draft')
    performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  }
  expect(draftedCountOf(ctx.campaign)).toBe(heroes)
  expect(step()).toBe('open')
  return ctx
}
/** The battle the cursor stands at, fielded as its encounter — Combat Prep begun, nothing walked. */
function field(ctx: Ctx): void {
  const id = SECTIONS[ctx.campaign.cursor.prologue! - 1]!
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
}
const deployed = (ctx: Ctx) => [...ctx.campaign.cursor.engagement!.deployed]
const heroIds = (ctx: Ctx) => Object.values(ctx.campaign.roster).filter((h) => groupOf(h.classes) === 'hero').map((h) => h.id).sort()
/** Each hero card on the Deploy page: its id, what a click on it does, and whether it is marked as going. */
function cardsOn(html: string): { id: string; act: string | undefined; going: boolean; off: boolean }[] {
  return [...html.matchAll(/<div class="deploycard([^"]*)"([^>]*)>/g)].map((m) => {
    const attrs = Object.fromEntries([...m[2]!.matchAll(/data-([\w-]+)="([^"]*)"/g)].map((a) => [a[1]!, a[2]!]))
    return { id: attrs['hero']!, act: attrs['act'], going: / on\b/.test(m[1]!), off: / off\b/.test(m[1]!) }
  })
}

describe('kingdom.opening-deploy-choice — the player chooses which four go', () => {
  it('with the deploy limit or fewer free to fight, all go and no choice is asked: Equip opens at once', () => {
    for (const heroes of [1, 3, 4]) {
      const ctx = partyOf(11, heroes)
      field(ctx)
      expect(performOpeningDeploy(ctx, 'test'), `${heroes} heroes: no choice is asked`).toBe(false)
      expect(ctx.campaign.cursor.prepStep, `${heroes} heroes: at Equip`).toBe('equip')
      expect(deployed(ctx).sort(), `${heroes} heroes: all go`).toEqual(heroIds(ctx))
      expect(isDeployChoiceOwed(ctx.campaign)).toBe(false)
    }
  })

  it('with five or six free to fight the run stops at Deploy with nobody sent: the player chooses, up to the limit, and those are the heroes Equip shows', () => {
    for (const heroes of [5, 6]) {
      const ctx = partyOf(11, heroes), c = ctx.campaign
      field(ctx)
      expect(performOpeningDeploy(ctx, 'test'), `${heroes} heroes: the choice is asked`).toBe(true)
      expect([c.cursor.step, c.cursor.prepStep]).toEqual(['prep', 'deploy'])
      expect(isDeployChoiceOwed(c)).toBe(true)
      expect(deployed(ctx), 'nobody is sent before the player chooses').toEqual([])
      expect(listOpeningParty(c)).toEqual(heroIds(ctx))
      expect(deployLimitOf(c)).toBe(4)
      // nobody chosen: the step cannot be left (the one step that fields units)
      expect(canAdvancePrep(c)).toBe(false)
      expect(() => performAdvancePrep(ctx, 'test')).toThrow(/nothing chosen/)
      // NOT the first four by id: the last four — the hero the old rule always left home goes, the first by id stays
      const party = listOpeningParty(c), chosen = party.slice(-4), home = party.slice(0, -4)
      for (const h of chosen) performDeploy(ctx, h, 'test')
      expect(deployed(ctx)).toEqual(chosen)
      for (const h of home) {
        expect(canDeploy(c, h), `${h}: a fifth is refused`).toBe(false)
        expect(() => performDeploy(ctx, h, 'test')).toThrow(/4\/4 deployed/)
      }
      // a change of mind: one comes home, the slot reopens, another goes
      performUndeploy(ctx, chosen[0]!, 'test')
      expect(canDeploy(c, home[0]!)).toBe(true)
      performDeploy(ctx, home[0]!, 'test')
      const sent = [...chosen.slice(1), home[0]!]
      expect(deployed(ctx)).toEqual(sent)
      expect(listOpeningParty(c), 'the party on the screen is the same whoever is chosen').toEqual(party)
      performAdvancePrep(ctx, 'test')
      expect(c.cursor.prepStep).toBe('equip')
      expect(viewCombatPrep(c).deployed).toEqual(sent)
      // the Equip screen shows the chosen heroes, and only them
      const equip = equipPage(c, viewCombatPrep(c).deployed, { where: 'prep', picked: null })
      expect((equip.match(/class="herocard"/g) ?? []).length).toBe(sent.length)
      for (const h of party) expect(equip.includes(`data-hero="${h}"`), `${h} on Equip`).toBe(sent.includes(h))
    }
  })

  it('fewer than the limit may be sent — but never nobody', () => {
    const ctx = partyOf(11, 5)
    field(ctx); performOpeningDeploy(ctx, 'test')
    performDeploy(ctx, listOpeningParty(ctx.campaign)[2]!, 'test')
    expect(canAdvancePrep(ctx.campaign)).toBe(true)
    performAdvancePrep(ctx, 'test')
    expect(deployed(ctx)).toEqual([listOpeningParty(ctx.campaign)[2]])
  })

  it('the four chosen are the four on the board; the fifth stays home unharmed and earns nothing', () => {
    // five heroes held at the Orphanage — the battle that pays every hero who fought and lived its 20 XP
    const ctx = partyOf(11, 5), c = ctx.campaign
    c.cursor.prologue = 1
    field(ctx)
    expect(performOpeningDeploy(ctx, 'test')).toBe(true)
    const party = listOpeningParty(c), chosen = party.slice(-4), home = party[0]!
    for (const h of chosen) performDeploy(ctx, h, 'test')
    performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
    expect(c.cursor.step).toBe('battle')
    const e = c.cursor.engagement!, before = structuredClone(c.roster[home]!)
    const fight = (seed: number) => { const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(c.roster[id]!)), enemies: [], seed, encounterId: e.id }); runBattle(s.ctx); return { s, r: sandboxResult(s) } }
    let f = fight(1)
    for (let seed = 2; seed <= 40 && f.r.outcome !== 'heroClear'; seed++) f = fight(seed)
    expect(f.r.outcome).toBe('heroClear')
    // on the board: the chosen four as the campaign's own rows, in the order chosen — and nobody else of the party
    expect(f.s.config.heroes).toEqual(chosen)
    const fielded = f.r.units.filter((u) => u.side === 'hero' && u.role === undefined).map((u) => u.typeId).sort()
    expect(fielded).toEqual(chosen.map((id) => c.roster[id]!.unitType).sort())
    expect(fielded).not.toContain(before.unitType)
    const k = resolveReckoning(c, e, f.r)
    setBattleOutcome(ctx, f.r, k, 'test')
    applyBattleResult(ctx, e, f.r, k)
    // the fifth: the same row as before the battle — no XP, no wound, alive, nothing moved
    expect(c.roster[home]).toEqual(before)
    expect([c.roster[home]!.xp, c.roster[home]!.wound, c.roster[home]!.lifeState]).toEqual([0, 0, 'alive'])
    const lived = chosen.filter((h) => c.roster[h]!.lifeState === 'alive')
    expect(lived.length).toBeGreaterThan(0)
    for (const h of lived) expect(c.roster[h]!.xp, `${h} fought and is paid`).toBe(20)
  }, 120000)

  it('who is counted: heroes free to fight — a civilian, the dead and the Severely wounded stay home and are never offered', () => {
    // five held, one dead: four free — all go, no choice
    const dead = partyOf(11, 5)
    dead.campaign.roster[heroIds(dead)[1]!]!.lifeState = 'dead'
    field(dead)
    expect(performOpeningDeploy(dead, 'test')).toBe(false)
    expect(deployed(dead).sort()).toEqual(heroIds(dead).filter((h) => dead.campaign.roster[h]!.lifeState === 'alive'))
    // six held, one Severely wounded: five free — the choice is asked, of those five
    const hurt = partyOf(11, 6), wounded = heroIds(hurt)[0]!
    hurt.campaign.roster[wounded]!.wound = WOUND_UNAVAILABLE
    field(hurt)
    expect(performOpeningDeploy(hurt, 'test')).toBe(true)
    expect(listOpeningParty(hurt.campaign)).toEqual(heroIds(hurt).filter((h) => h !== wounded))
    expect(cardsOn(deployPage(hurt.campaign)).map((x) => x.id)).not.toContain(wounded)
    expect(deployPage(hurt.campaign)).toContain(hurt.campaign.roster[wounded]!.name)   // named as staying home, and why
    // four heroes and two rescued civilians: the civilians are not counted — all four go, no choice
    const folk = partyOf(11, 4)
    for (const row of RESCUABLE_CIVILIANS.slice(0, 2)) folk.campaign.roster[row.id] = { ...structuredClone(row) }
    field(folk)
    expect(performOpeningDeploy(folk, 'test')).toBe(false)
    expect(deployed(folk).sort()).toEqual(heroIds(folk))
    // …and with five heroes beside them, the civilians are not on the screen
    const both = partyOf(11, 5)
    for (const row of RESCUABLE_CIVILIANS.slice(0, 2)) both.campaign.roster[row.id] = { ...structuredClone(row) }
    field(both)
    expect(performOpeningDeploy(both, 'test')).toBe(true)
    expect(listOpeningParty(both.campaign)).toEqual(heroIds(both))
    expect(cardsOn(deployPage(both.campaign)).map((x) => x.id)).toEqual(heroIds(both))
  })

  it('the choice is saved with the run: closed at Deploy with two chosen, or at Equip with four, it reads back the same', () => {
    const ctx = partyOf(11, 5), c = ctx.campaign
    field(ctx); performOpeningDeploy(ctx, 'test')
    const party = listOpeningParty(c)
    performDeploy(ctx, party[4]!, 'test'); performDeploy(ctx, party[1]!, 'test')
    const atDeploy = runOf(runSaveOf(c, null)).campaign
    expect([atDeploy.cursor.step, atDeploy.cursor.prepStep]).toEqual(['prep', 'deploy'])
    expect(atDeploy.cursor.engagement!.deployed).toEqual([party[4], party[1]])
    expect(isDeployChoiceOwed(atDeploy)).toBe(true)
    expect(deployPage(atDeploy)).toBe(deployPage(c))
    performDeploy(ctx, party[3]!, 'test'); performDeploy(ctx, party[2]!, 'test')
    performAdvancePrep(ctx, 'test')
    const atEquip = runOf(runSaveOf(c, null)).campaign
    expect(atEquip.cursor.prepStep).toBe('equip')
    expect(atEquip.cursor.engagement!.deployed).toEqual([party[4], party[1], party[3], party[2]])
  })

  it('a lost battle fielded again offers the choice again, with nobody sent — and another four may go', () => {
    const ctx = partyOf(11, 5), c = ctx.campaign
    field(ctx); performOpeningDeploy(ctx, 'test')
    const party = listOpeningParty(c), chosen = party.slice(0, 4)
    for (const h of chosen) performDeploy(ctx, h, 'test')
    performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
    const e = c.cursor.engagement!
    // the battle played, then written as lost: every hero-side unit down, nobody dead
    const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(c.roster[id]!)), enemies: [], seed: 1, encounterId: e.id })
    runBattle(s.ctx)
    let r: EngagementResult = { ...sandboxResult(s), outcome: 'wipe' }
    for (const u of r.units) if (u.side === 'hero') r = withUnitFate(r, 'hero', u.index, { lifeState: 'downed' })
    const k = resolveReckoning(c, e, r)
    setBattleOutcome(ctx, r, k, 'test')
    applyBattleResult(ctx, e, r, k)
    performExitBattle(ctx, 'test')
    if (c.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
    expect(c.cursor.step).toBe('open')
    expect(c.cursor.prologue, 'the same battle is owed').toBe(4)
    expect(draftsOwedOf(c)).toBe(0)
    // fielded again: the five are all still free (Wounded, not Severe), so the choice is asked again — nobody carried over
    field(ctx)
    expect(performOpeningDeploy(ctx, 'test')).toBe(true)
    expect(deployed(ctx)).toEqual([])
    expect(listOpeningParty(c)).toEqual(party)
    const again = party.slice(1)
    for (const h of again) performDeploy(ctx, h, 'test')
    performAdvancePrep(ctx, 'test')
    expect(viewCombatPrep(c).deployed).toEqual(again)
  }, 120000)

  it('the Deploy page: one card per hero who may go, a click sends or brings home, the count and the way on', () => {
    const ctx = partyOf(11, 5), c = ctx.campaign
    field(ctx); performOpeningDeploy(ctx, 'test')
    const party = listOpeningParty(c)
    let html = deployPage(c, { engagementId: 'the Cavern Trail' })
    expect(html).toContain('Who goes')
    expect(html).toMatch(/0 of 4 chosen/)
    expect(html).toContain('the Cavern Trail')
    expect(cardsOn(html)).toEqual(party.map((id) => ({ id, act: 'deploy', going: false, off: false })))
    for (const h of party) expect(html, `${h} is named`).toContain(c.roster[h]!.name)
    expect(html).toMatch(/<button class="primary" data-act="advance" disabled>/)
    for (const h of party.slice(0, 4)) performDeploy(ctx, h, 'test')
    html = deployPage(c)
    expect(html).toMatch(/4 of 4 chosen/)
    expect(cardsOn(html)).toEqual(party.map((id, i) => i < 4 ? { id, act: 'undeploy', going: true, off: false } : { id, act: undefined, going: false, off: true }))
    expect(html).toMatch(/<button class="primary" data-act="advance">/)
  })
})
