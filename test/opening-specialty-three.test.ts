// kingdom.opening-specialty-three — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'card art on the level-up and reward
// screens; the specialty choice offers three, not nine': "you're supposed to only get a choice of three different specialty
// classes, not nine." · 'the civilians show on the victory screen; the specialty three are random; …': asked "Is a random
// three of the nine right for the specialty choice?" — "It's random: 3 of the 9.").
//
// Expect: "At http://127.0.0.1:4230/play a hero reaching level 2 is offered exactly three different specialties of its own
// class, must take one, and has it afterwards; closing and reopening the page on the choice shows the same three; two
// heroes of one class on one run need not be offered the same three; the page test asserts three offered at every
// specialty choice."
//
// The offer is the mechanism's (core/rewards.ts specialtyOfferOf, read by viewLevelUp): a plain draw without repeats from
// the class's specialties — content's nine — on the run's own named stream, keyed by the hero, so nothing is stored and a
// run reopened shows the same three. How many is a content row (content/progress.ts SPECIALTY_OFFER). The page half is
// tools/opening-run-six.verify.mjs and tools/opening-loop-three.verify.mjs, on the built BATTLE-SANDBOX.html.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import * as REWARDS from '../src/core/rewards.js'
import * as PROGRESS from '../src/content/progress.js'
import { viewLevelUp, whyNotLevelUp, performLevelUp, levelTableOfHero } from '../src/core/rewards.js'
import { specialtiesOf } from '../src/content/progress.js'
import { makeNewCampaign, performAdvanceOpening, performDraft, listDraftOffers } from '../src/core/opening.js'
import { makeCtx, type Ctx } from '../src/core/mutate.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { xpForLevel } from '../src/content/levels.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { levelUpScreen } from '../src/ui/after.js'
import { playOpening } from '../src/sim/autoplay.js'

const HERO_CLASSES = ['class.mage', 'class.paladin', 'class.priest', 'class.ranger', 'class.rogue', 'class.warrior']
const OFFER = (PROGRESS as unknown as { SPECIALTY_OFFER?: number }).SPECIALTY_OFFER
const specialtyOfferOf = (REWARDS as unknown as { specialtyOfferOf?: (c: Ctx['campaign'], heroId: string) => { id: string }[] }).specialtyOfferOf

/** A run on `seed` holding these pool heroes, each with the XP of level 2 — the specialty choice owed. */
function owed(seed: number, ids: readonly string[]): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed))
  for (const id of ids) ctx.campaign.roster[id] = { ...structuredClone(HERO_POOL.find((h) => h.id === id)!), xp: xpForLevel(2)! }
  return ctx
}
const offered = (ctx: Ctx, id: string) => viewLevelUp(ctx.campaign, id).specialtyOffers.map((s) => s.id)
const firstOf = (cls: string, n = 1) => HERO_POOL.filter((h) => h.classes.includes(cls)).slice(0, n).map((h) => h.id)

describe('kingdom.opening-specialty-three — the specialty choice offers three of the class\'s nine', () => {
  it('how many are offered is a content row (three); the nine are content\'s; the draw is core\'s, on a named stream — no Math.random, no clock', () => {
    expect(OFFER).toBe(3)
    for (const c of HERO_CLASSES) expect(specialtiesOf(c), `${c} has nine specialties`).toHaveLength(9)
    expect(typeof specialtyOfferOf, 'core/rewards.ts specialtyOfferOf').toBe('function')
    const core = readFileSync('src/core/rewards.ts', 'utf8')
    expect(core).toContain('SPECIALTY_OFFER')
    expect(core).not.toMatch(/Math\.random|Date\.now|new Date/)
  })

  it('a hero reaching level 2 is offered exactly three different specialties of its own class', () => {
    for (const seed of [3, 11, 15]) for (const cls of HERO_CLASSES) {
      const [id] = firstOf(cls), ctx = owed(seed, [id!])
      const v = viewLevelUp(ctx.campaign, id!)
      expect(v.needsSpecialty).toBe(true)
      const three = v.specialtyOffers.map((s) => s.id), nine = specialtiesOf(levelTableOfHero(ctx.campaign, id!).classId).map((s) => s.id)
      expect(three, `seed ${seed}, ${id}: three offered`).toHaveLength(3)
      expect(new Set(three).size, `seed ${seed}, ${id}: three different`).toBe(3)
      for (const s of three) expect(nine, `seed ${seed}, ${id}: ${s} is of its own class`).toContain(s)
      // the screen shows those three, and only those
      const html = levelUpScreen(ctx.campaign, id!, 'rewards', { specialtyOwed: true })
      expect([...html.matchAll(/data-act="choose-specialty" data-id="([^"]+)"/g)].map((m) => m[1])).toEqual(three)
    }
  })

  it('it must take one of the three, and has it afterwards; a specialty of its class that was not offered is refused', () => {
    const [id] = firstOf('class.warrior'), ctx = owed(11, [id!]), c = ctx.campaign
    const three = offered(ctx, id!), nine = specialtiesOf('class.warrior').map((s) => s.id), other = nine.find((s) => !three.includes(s))!
    expect(whyNotLevelUp(c, id!, { specialtyId: other }), 'one of the nine, not of the three').toMatch(/not one of the 3 offered/)
    expect(() => performLevelUp(ctx, id!, 'test', { specialtyId: other })).toThrow(/not one of the 3 offered/)
    expect(whyNotLevelUp(c, id!, { specialtyId: 'specialty.assassin' }), 'another class\'s').toMatch(/not a class\.warrior specialty/)
    // the pick cannot be skipped where it is owed: the opening's sheet offers no level without a specialty
    const sheet = levelUpScreen(c, id!, 'rewards', { specialtyOwed: true })
    expect(sheet).not.toContain('lu-decline-specialty')
    expect(sheet).toContain('id="lu-specialty-confirm" disabled')
    performLevelUp(ctx, id!, 'test', { specialtyId: three[1]! })
    expect([c.roster[id!]!.level, c.roster[id!]!.specialty]).toEqual([2, three[1]])
  })

  it('the three are the run\'s own: the same when the run is saved and reopened, whatever else has happened — and nothing is stored for them', () => {
    const [a, b] = [firstOf('class.warrior')[0]!, firstOf('class.mage')[0]!]
    const ctx = owed(11, [a, b]), before = offered(ctx, a)
    expect(offered(ctx, a), 'asked twice').toEqual(before)
    const back = makeCtx(runOf(runSaveOf(ctx.campaign, null)).campaign)
    expect(offered(back, a), 'saved and reopened').toEqual(before)
    expect(JSON.stringify(ctx.campaign), 'nothing is written by asking').toBe(JSON.stringify(runOf(runSaveOf(ctx.campaign, null)).campaign))
    // another hero takes its level, XP moves: this hero's three do not
    performLevelUp(ctx, b, 'test', { specialtyId: offered(ctx, b)[0]! })
    ctx.campaign.roster[a]!.xp += 7
    expect(offered(ctx, a), 'after another hero levelled').toEqual(before)
    // another run offers another three (over a handful of seeds the three are not always the same)
    const seen = new Set([3, 5, 7, 11, 15, 21].map((seed) => offered(owed(seed, [a]), a).join()))
    expect(seen.size, 'the three differ from run to run').toBeGreaterThan(1)
  })

  it('it is random, three of the nine: over many runs every one of a class\'s nine is offered, and two heroes of one class on one run need not be offered the same three', () => {
    const [a, b] = firstOf('class.warrior', 2) as [string, string]
    const all = new Set<string>()
    let differ = 0
    for (let seed = 1; seed <= 60; seed++) {
      const ctx = owed(seed, [a, b]), x = offered(ctx, a), y = offered(ctx, b)
      for (const s of [...x, ...y]) all.add(s)
      if ([...x].sort().join() !== [...y].sort().join()) differ++
    }
    expect([...all].sort()).toEqual(specialtiesOf('class.warrior').map((s) => s.id).sort())
    expect(differ, 'two Warriors on one run are offered different threes on most runs').toBeGreaterThan(30)
  })

  it('every Campaign\'s specialty choice follows it — the slice too: its heroes take a specialty from their three', () => {
    const ctx = playOpening(makeCtx(makeNewCampaign(21)))
    const taken = ctx.events.filter((e) => e.type === 'hero.specialized')
    for (const e of taken) expect(specialtiesOf(levelTableOfHero(ctx.campaign, e['heroId'] as string).classId).map((s) => s.id)).toContain(e['specialtyId'])
    // a first hero drafted on the run and brought to level 2 is offered three
    const run = makeCtx(makeNewCampaign(21))
    performAdvanceOpening(run, 'test'); performDraft(run, listDraftOffers(run.campaign)[0]!.id, 'test')
    const id = Object.keys(run.campaign.roster)[0]!
    run.campaign.roster[id]!.xp = xpForLevel(2)!
    expect(offered(run, id)).toHaveLength(3)
  })

  it('the pages: three offered at every specialty choice, one taken; the page closed on the choice and opened again shows the same three', () => {
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toMatch(/three specialties of its own class offered at every specialty choice \([1-9]\d* choices\), one taken each time; the page closed on the choice and opened again showed the same three/)
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(three).toMatch(/three specialties offered at every specialty choice \([1-9]\d* choices\)/)
  }, 1800000)
})
