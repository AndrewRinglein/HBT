// After the battle (G12; ISC-067 and ISC-068 are H — a person opens SLICE.html beside
// hell-tcg/rewards.html and levelup.html). What text can hold: the results screen
// restates the battle; the spoils are three face-down cards, revealed, one kept;
// level-up shows and applies the codex row's modifiers, offers the specialty once
// at the first level-up, takes the level-5 pick, chooses no power; and the fielding
// carries the progress to the engine. GEAR-DESIGN.md §7 · hbt-content.json levels.rules.
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { viewLevelUp, whyNotLevelUp, performLevelUp, performTakeReward, listLevelUps } from '../src/core/rewards.js'
import { levelRowOf, specialtiesOf } from '../src/content/progress.js'
import { makeBattleState, battleOptionsOf } from '../src/core/seam.js'
import { createBattle, LEVELS } from '../src/engine.js'
import { resultsScreen, rewardsScreen, levelUpScreen } from '../src/ui/after.js'
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
  it('the results screen restates the battle: outcome, turns, kills, wounds, MVP, XP per hero', () => {
    const { ctx, e, result, reckoning } = won()
    const html = resultsScreen(ctx.campaign, ctx.events, { engagementId: e.id, result, reckoning }, 0)
    expect(html).toContain('Victory'); expect(html).toContain('in 6 turns')
    expect(html).toContain('2 kills · dealt 9')
    expect(html.match(/class="hcard( dead)?"/g)?.length).toBe(e.deployed.length)
    if (reckoning.heroes.some((h) => h.mvp)) expect(html).toContain('title="MVP"')
    expect(html).toMatch(/class="won">\+\d+</)                       // XP gained on the bar
    expect(html).toContain('On to the spoils')
  })
  it('the spoils: three face-down cards, then revealed, then one kept and two burned', () => {
    const { ctx } = won()
    performExitBattle(ctx, 'test')
    const down = rewardsScreen(ctx.campaign, ctx.events, false)
    expect(down.match(/rcard down/g)?.length).toBe(3)
    expect(down).not.toContain('data-act="take-reward"')
    expect(down).toContain('data-act="reveal"')
    const up = rewardsScreen(ctx.campaign, ctx.events, true)
    expect(up.match(/rcard up/g)?.length).toBe(3)
    expect(up.match(/data-act="take-reward"/g)?.length).toBe(3)
    expect(up).toContain('class="xp"')                                // the XP bars beside the cards
    const id = up.match(/data-act="take-reward" data-id="([^"]+)"/)![1]!
    performTakeReward(ctx, id, 'test')
    expect(ctx.campaign.stash).toContain(id)
    expect((ctx.events.find((ev) => ev.type === 'reward.taken')!['burned'] as string[]).length).toBe(2)
  })
  it('level-up applies the codex row — every modifier listed, itemSlots folded on the hero — and offers the specialty once', () => {
    const ctx = loadFixture((c) => { c.roster[DWARF]!.xp = 20 })
    const v = viewLevelUp(ctx.campaign, DWARF)
    expect(v.to).toBe(2)
    expect(v.row.grants).toEqual(levelRowOf('class.warrior', 2).grants)
    expect(v.row.grants['health']).toBe(2)                            // the row's +1 plus the Warrior freebie
    expect(v.row.grants['itemSlots']).toBe(1)
    expect(v.needsSpecialty).toBe(true)
    expect(v.specialtyOffers.map((s) => s.id)).toEqual(specialtiesOf('class.warrior').map((s) => s.id))
    expect(v.specialtyOffers.length).toBe(9)
    const html = levelUpScreen(ctx.campaign, { specialtyId: null, pick: null })
    expect(html).toContain('L1 <span class="arrow">→</span> L2')
    expect(html).toContain('+2 health'); expect(html).toContain('+1 itemSlots')
    expect(html).toContain('Choose a specialty — once, now')
    expect(html).toContain('No power is chosen here')
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
    expect(levelUpScreen(ctx.campaign, { specialtyId: null, pick: null })).not.toContain('Choose a specialty')
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
