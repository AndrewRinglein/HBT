// Equip as its own screen — ruled 2026-09-04 (Angela): "we need an equip screen. It's
// reachable from the main kingdom map, and it automatically pops up before a battle,
// after war council" · "Deploy is before equip. Because deploy tells you what heroes
// you're equipping so it goes: council, deploy, equip."
//
// What text can hold: the prep order is unchanged and Equip is its last step, so leaving
// Deploy lands on it with the deployed heroes and nowhere else; the page carries its own
// head and its own way out (To the battle at prep, Done from the map) and no step bar;
// from the map it is opened by the equip session over every living hero.
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip } from './walk.js'
import { PREP_STEP_ROWS } from '../src/content/prep.js'
import { viewCombatPrep, performAdvancePrep, beginCombatPrep, performDeploy, listDeployable } from '../src/core/prep.js'
import { performOpenEquip, performCloseEquip } from '../src/core/shop.js'
import { isEquipOpen, equipWhere } from '../src/core/equip-session.js'
import { equipPage } from '../src/ui/equip.js'

const HUNTER = 'hero.base.ranger-aggressive', DWARF = 'hero.base.warrior-iron'

describe('the Equip screen', () => {
  it('the prep order is council, deploy, equip — and leaving Deploy opens Equip', () => {
    expect(PREP_STEP_ROWS.map((r) => r.step)).toEqual(['reveal', 'council', 'deploy', 'equip'])
    expect(PREP_STEP_ROWS.find((r) => r.equips)!.step).toBe('equip')
    const ctx = loadFixture()
    beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
    expect(viewCombatPrep(ctx.campaign).step).toBe('deploy')
    for (const h of listDeployable(ctx.campaign).slice(0, 2)) performDeploy(ctx, h, 'test')
    performAdvancePrep(ctx, 'test')
    const v = viewCombatPrep(ctx.campaign)
    expect(v.step).toBe('equip')
    expect(isEquipOpen(ctx.campaign)).toBe(true)                     // the session opens with the screen
    expect(equipWhere(ctx.campaign)).toBe('prep')
    expect(v.deployed.length).toBe(2)                                // deploy said who is being equipped
  })
  it('at prep the page carries its own head and leads to the battle — no step bar', () => {
    const ctx = toEquip(loadFixture((c) => { c.stash = ['item.shortbow'] }), [HUNTER, DWARF])
    const v = viewCombatPrep(ctx.campaign)
    const html = equipPage(ctx.campaign, v.deployed, { where: 'prep', picked: null, engagementId: v.engagementId, canAdvance: v.canAdvance })
    expect(html).toContain('class="equip-page"')
    expect(html).toContain('Equip — the heroes you are sending')
    expect(html).toContain(v.engagementId)
    expect(html).toContain('data-act="advance"')
    expect(html).toContain('To the battle')
    expect(html).not.toContain('class="steps"')                      // its own screen, not a step under the bar
    expect(html.match(/class="herocard"/g)?.length).toBe(2)          // only the deployed
    expect(html).toContain('Set bonuses when you leave')
  })
  it('from the map: the session opens over every living hero, and Done closes it', () => {
    const ctx = loadFixture((c) => { c.cursor.step = 'open'; c.stash = ['item.shortbow'] })
    expect(isEquipOpen(ctx.campaign)).toBe(false)
    performOpenEquip(ctx, 'test')
    expect(equipWhere(ctx.campaign)).toBe('roster')
    const alive = Object.values(ctx.campaign.roster).filter((h) => h.lifeState === 'alive').map((h) => h.id).sort()
    const html = equipPage(ctx.campaign, alive, { where: 'roster', picked: null })
    expect(html).toContain('Equip — fitting gear')
    expect(html).toContain('idols are fitted at prep only')
    expect(html).toContain('data-act="close-equip"')
    expect(html).not.toContain('data-act="advance"')
    expect(html.match(/class="herocard"/g)?.length).toBe(alive.length)
    performCloseEquip(ctx, 'test')
    expect(isEquipOpen(ctx.campaign)).toBe(false)
  })
  it('with nobody deployed the page says so rather than showing an empty rack', () => {
    const ctx = loadFixture()
    expect(equipPage(ctx.campaign, [], { where: 'prep', picked: null, canAdvance: false })).toContain('deploy someone first')
  })
})
