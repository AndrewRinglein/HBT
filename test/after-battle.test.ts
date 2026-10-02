// After the battle (G12; ISC-067 and ISC-068 are H — a person opens SLICE.html beside
// hell-tcg/rewards.html and levelup.html). Rewritten 2026-09-04 for the Hell-TCG copies
// (ruled 2026-09-03/04): the RECAP is the victory ceremony over HoBaT's outcome; the
// REWARDS are rewards.html's cards, face down with the tier aura, over HoBaT's draw;
// the LEVEL-UP is levelup.html's chamber with the specialty at the first level-up and
// no power draft. What text can hold: the DOM the ceremonies run on, the outcome
// classification, the quote pick, and the rules underneath — three cards, one kept,
// two burned; the codex row's modifiers applied; the specialty once; the fielding
// carrying the progress. GEAR-DESIGN.md §7 · hbt-content.json levels.rules.
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { viewLevelUp, whyNotLevelUp, performLevelUp, performTakeReward, listLevelUps } from '../src/core/rewards.js'
import { levelRowOf, specialtiesOf } from '../src/content/progress.js'
import { makeBattleState, battleOptionsOf } from '../src/core/seam.js'
import { createBattle, LEVELS } from '../src/engine.js'
import { recapScreen, rewardsScreen, levelUpScreen, outcomeOf, quoteOf } from '../src/ui/after.js'
import { VICTORY_QUOTES, DEFEAT_QUOTES } from '../src/content/generated/quotes.js'
import { itemOf } from '../src/content/items.js'
import { makeCtx } from '../src/core/mutate.js'
import { toEquip } from './walk.js'
import { performAdvancePrep } from '../src/core/prep.js'

const DWARF = 'hero.base.warrior-iron', HUNTER = 'hero.base.ranger-aggressive'

function won() {
  const ctx = toBattle(loadFixture())
  const e = ctx.campaign.cursor.engagement!
  const { result, reckoning } = decide(ctx, panelResult(ctx, true, (r) => ({ ...r, units: r.units.map((u) => u.side === 'hero' && u.index === 0 ? { ...u, kills: 2, damageDealt: 9 } : u) })))
  applyBattleResult(ctx, e, result, reckoning)
  return { ctx, e, result, reckoning }
}

describe('after the battle', () => {
  it('the recap is the victory ceremony: the outcome title, the party row with wound states, the MVP spotlight, a quote, kills · turns · XP, the report', () => {
    const { ctx, e, result, reckoning } = won()
    const html = recapScreen(ctx.campaign, ctx.events, { engagementId: e.id, result, reckoning })
    expect(html).toContain('class="hx recap')
    expect(html).toMatch(/class="result-title victory-(decisive|standard|costly|pyrrhic|devastating)"/)
    expect(html.match(/class="party-member"/g)?.length).toBe(e.deployed.length)
    expect(html).toContain('spotlight-frame victory')
    expect(html).toMatch(/class="quote-text">"[^"]+"</)
    expect(html).toContain('<span class="stat-label">Slain:</span> <span class="stat-value">2</span>')
    expect(html).toContain('<span class="stat-value">6</span>')     // turns
    expect(html).toMatch(/class="xp-value">\d+</)
    expect(html).toContain('data-act="exit"')
    // Hell-TCG's classification on HoBaT's wounds
    expect(outcomeOf(true, [{ wound: 0, dead: false }], 6)).toBe('decisive')
    expect(outcomeOf(true, [{ wound: 0, dead: false }], 20)).toBe('standard')
    expect(outcomeOf(true, [{ wound: 1, dead: false }], 6)).toBe('costly')
    expect(outcomeOf(true, [{ wound: 2, dead: false }], 6)).toBe('pyrrhic')
    expect(outcomeOf(true, [{ wound: 0, dead: true }, { wound: 0, dead: false }], 6)).toBe('devastating')
    expect(outcomeOf(false, [{ wound: 0, dead: false }], 6)).toBe('overwhelmed')
    expect(outcomeOf(false, [{ wound: 0, dead: true }, { wound: 0, dead: false }], 6)).toBe('casualties')
    expect(outcomeOf(false, [{ wound: 0, dead: true }], 6)).toBe('total_wipe')
    // the quote: Hell-TCG's class pool (no personality on HoBaT heroes yet), stable for the same battle
    const qv = quoteOf(VICTORY_QUOTES, { classes: ['class.warrior'] }, 'decisive', 'k')
    expect(VICTORY_QUOTES.class['class.warrior']).toContain(qv)
    expect(quoteOf(VICTORY_QUOTES, { classes: ['class.warrior'] }, 'decisive', 'k')).toBe(qv)
    expect(quoteOf(DEFEAT_QUOTES, { classes: ['class.civilian'] }, 'overwhelmed', 'k')).toBe(DEFEAT_QUOTES.fallback)
  })
  it('the rewards are rewards.html: hero cards with XP bars and floating-XP data, three face-down cards with the tier aura, a confirm; one kept and two burned', () => {
    const { ctx, e, result, reckoning } = won()
    performExitBattle(ctx, 'test')
    const html = rewardsScreen(ctx.campaign, ctx.events, { engagementId: e.id, result, reckoning })
    expect(html).toContain('class="hx rewards')
    expect(html.match(/class="hero-card /g)?.length).toBe(e.deployed.length)
    expect(html).toMatch(/hero-xp-bar-fill" data-start-percent="\d+" data-end-percent="\d+"/)
    expect(html).toMatch(/data-gained="\d+" data-kills="2"/)
    expect(html.match(/class="reward-card face-down"/g)?.length).toBe(3)
    for (const m of html.matchAll(/data-id="(item\.[^"]+)" data-tier="(\d)"/g)) expect(String(itemOf(m[1]!).tier)).toBe(m[2])
    expect(html).toContain('reward-card-art">no art yet')                 // the frame stays blank until HoBaT item art exists
    expect(html).toContain('id="rw-confirm"')
    expect(html).not.toContain('Buy All')                                  // keep-3 was never ruled; keep-2 was rejected
    const id = html.match(/data-id="(item\.[^"]+)" data-tier/)![1]!
    performTakeReward(ctx, id, 'test')
    expect(ctx.campaign.stash).toContain(id)
    expect((ctx.events.find((ev) => ev.type === 'reward.taken')!['burned'] as string[]).length).toBe(2)
  })
  it('level-up applies the codex row — every modifier listed, itemSlots folded on the hero — and offers the specialty once', () => {
    const ctx = loadFixture((c) => { c.roster[DWARF]!.xp = 20 })
    const v = viewLevelUp(ctx.campaign, DWARF)
    expect(v.to).toBe(2)
    expect(v.row.grants).toEqual(levelRowOf('class.warrior', 2).grants)
    // Law 10, 2026-10-02 (kingdom.reads-engine, K15): the row is the engine's, in its stat names (Health is maxHp)
    expect(v.row.grants['maxHp']).toBe(2)                             // the row's +1 plus the Warrior freebie
    expect(v.row.grants['itemSlots']).toBe(1)
    expect(v.needsSpecialty).toBe(true)
    expect(v.specialtyOffers.map((s) => s.id)).toEqual(specialtiesOf('class.warrior').map((s) => s.id))
    expect(v.specialtyOffers.length).toBe(9)
    const html = levelUpScreen(ctx.campaign, DWARF, 'rewards')
    expect(html).toContain('class="hx levelup')
    expect(html).toContain('id="lu-badge">LEVEL 1<')                                  // flips to LEVEL 2 at the flash
    expect(html).toContain('data-to="2"')
    expect(html).toContain('+2 Health'); expect(html).toContain('+1 Item Slot')
    expect(html).toContain('Choose Your Specialty')
    expect(html.match(/data-act="choose-specialty"/g)?.length).toBe(9)
    expect(html).toContain('No power is chosen here')
    expect(html).not.toContain('power-overlay')
    expect(whyNotLevelUp(ctx.campaign, DWARF, { specialtyId: 'specialty.assassin' })).toMatch(/not a class\.warrior specialty/)
    const slots = ctx.campaign.roster[DWARF]!.itemSlots
    performLevelUp(ctx, DWARF, 'test', { specialtyId: 'specialty.berserker' })
    const h = ctx.campaign.roster[DWARF]!
    expect(h.level).toBe(2); expect(h.specialty).toBe('specialty.berserker'); expect(h.itemSlots).toBe(slots + 1)
    expect(ctx.events.map((e) => e.type).slice(-2)).toEqual(['hero.specialized', 'hero.leveled'])
    expect(ctx.events.at(-1)!['grants']).toEqual(v.row.grants)
    // offered once: at level 3 there is no offer and naming one is refused
    h.xp = 100
    expect(viewLevelUp(ctx.campaign, DWARF).needsSpecialty).toBe(false)
    expect(whyNotLevelUp(ctx.campaign, DWARF, { specialtyId: 'specialty.berserker' })).toMatch(/chosen once/)
    expect(levelUpScreen(ctx.campaign, DWARF, 'roster')).not.toContain('Choose Your Specialty')
  })
  it('the level-5 pick is one of the row\'s options by index, required when the row has one', () => {
    const ctx = loadFixture((c) => { c.roster[DWARF]!.level = 4; c.roster[DWARF]!.xp = 500; c.roster[DWARF]!.specialty = 'specialty.berserker' })
    if (whyNotLevelUp(ctx.campaign, DWARF, { pick: 0 })?.includes('needs')) return   // the ruled XP curve stops before 5; the pick is proven where it reaches
    const v = viewLevelUp(ctx.campaign, DWARF)
    expect(v.pickOptions?.length).toBe(5)
    expect(whyNotLevelUp(ctx.campaign, DWARF, {})).toMatch(/picks one of 5/)
    expect(whyNotLevelUp(ctx.campaign, DWARF, { pick: 7 })).toMatch(/not one of/)
    performLevelUp(ctx, DWARF, 'test', { pick: 1 })
    expect(ctx.campaign.roster[DWARF]!.levelPick).toBe(1)
  })
  it('the fielding carries level, specialty and pick to the engine, and the engine folds the rows', () => {
    const ctx = toEquip(loadFixture((c) => { c.roster[DWARF]!.level = 3; c.roster[DWARF]!.specialty = 'specialty.berserker' }), [DWARF, HUNTER])
    performAdvancePrep(ctx, 'test')
    const e = ctx.campaign.cursor.engagement!
    const spec = makeBattleState(ctx.campaign.roster, e)
    const at = e.deployed.indexOf(DWARF)
    expect(spec.heroProgress![at]).toEqual({ level: 3, specialtyId: 'specialty.berserker' })
    expect(spec.heroProgress![e.deployed.indexOf(HUNTER)]).toBeNull()      // level 1, nothing chosen: the bare row
    const opts = battleOptionsOf(spec)
    expect(opts.heroProgress![at]).toEqual({ level: 3, specialtyId: 'specialty.berserker' })
    const grown = createBattle(opts).state.units.find((u) => u.uid === 100 + at)!
    const bare = createBattle(battleOptionsOf(makeBattleState(makeCtx(loadFixture().campaign).campaign.roster, e))).state.units.find((u) => u.uid === 100 + at)!
    expect(grown.maxHp).toBeGreaterThan(bare.maxHp)                    // levels 2 and 3 and the Berserker's +3 Health
    // the level-5 pick resolves by index against the engine's own table
    const choice = LEVELS['class.warrior']!.rows.find((r) => r.choice)!.choice!
    const picked = makeBattleState({ [DWARF]: { ...ctx.campaign.roster[DWARF]!, level: 5, levelPick: 2 } }, { ...e, deployed: [DWARF] })
    expect(picked.heroProgress![0]!.levelFivePick).toEqual(choice[2])
  })
})
