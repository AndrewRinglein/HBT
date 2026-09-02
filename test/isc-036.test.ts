// ISC-036 — a hero assigned to Farm yields 5 + 2×Fields Supplies, to Pray 4 +
// 1×Abbeys Faith, to Delve 4 + 1×Wellsprings Mana, each at stage.mend and each
// consuming the city slot; Heal and Rest yield nothing.
// 7-KINGDOM-SETTLED.md — The Mend labours · Law 17 amended
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginStage, performAdvance } from '../src/core/week.js'
import { yieldOf, performAssignLabour, canAssignLabour, nodeCountOf } from '../src/core/mend.js'
import { commitmentOf } from '../src/core/assignments.js'

const H = ['hero.shadows.oathblade.v1', 'hero.skyship.sky-pirate.v1', 'hero.shadows.dusk-hawk.v1', 'hero.fixed.air-mage', 'hero.base.priest-scantily'] as const

function atMend(edit?: Parameters<typeof loadFixture>[0]) {
  const ctx = loadFixture(edit)
  setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
  beginStage(ctx, 'stage.mend', 'test')
  return ctx
}

describe('ISC-036 — the four labours yield what the settled table says', () => {
  it('one Field held: Farm 7, Pray 4, Delve 4; two Fields: Farm 9; the city slot is taken; Heal and Rest pay nothing', () => {
    const ctx = atMend()
    expect(nodeCountOf(ctx.campaign, 'field')).toBe(1)
    expect(yieldOf(ctx.campaign, 'farm')).toEqual({ currency: 'currency.supplies', amount: 5 + 2 * 1 })
    expect(yieldOf(ctx.campaign, 'pray')).toEqual({ currency: 'currency.faith', amount: 4 + 1 * 0 })
    expect(yieldOf(ctx.campaign, 'delve')).toEqual({ currency: 'currency.mana', amount: 4 + 1 * 0 })
    expect(yieldOf(ctx.campaign, 'rest')).toBeNull()
    expect(yieldOf(ctx.campaign, 'heal')).toBeNull()
    const purse = { ...ctx.campaign.purse }
    performAssignLabour(ctx, H[0], 'farm', 'test')
    performAssignLabour(ctx, H[1], 'pray', 'test')
    performAssignLabour(ctx, H[2], 'delve', 'test')
    performAssignLabour(ctx, H[3], 'rest', 'test')
    expect(commitmentOf(ctx.campaign, H[0], 'city')).toBe('committed')
    expect(commitmentOf(ctx.campaign, H[0], 'field')).toBe('free')             // fight AND one city action
    expect(canAssignLabour(ctx.campaign, H[0], 'pray')).toBe(false)             // one city slot
    expect(canAssignLabour(ctx.campaign, H[4], 'heal')).toBe(false)             // whole — nothing to heal
    expect(ctx.campaign.purse).toEqual(purse)                                   // nothing paid until the Stage ends
    performAdvance(ctx, 'test')                                                 // Mend closes → the Week ends
    expect(ctx.campaign.purse['currency.supplies']).toBe(purse['currency.supplies']! + 7)
    expect(ctx.campaign.purse['currency.faith']).toBe(purse['currency.faith']! + 4)
    expect(ctx.campaign.purse['currency.mana']).toBe(purse['currency.mana']! + 4)
    expect(ctx.campaign.purse['currency.salvage']).toBe(purse['currency.salvage'])
    const gains = ctx.events.filter((e) => e.type === 'resource.gained')
    // heroes resolve in id order (Law 6), not assignment order
    expect(gains.map((e) => e.causeId)).toEqual([`stage.mend.week-3:delve:${H[2]}`, `stage.mend.week-3:farm:${H[0]}`, `stage.mend.week-3:pray:${H[1]}`])
    expect(commitmentOf(ctx.campaign, H[0], 'city')).toBe('free')             // released at the Week boundary
  })
  it('a second Field and an Abbey held raise the yields by the node', () => {
    const ctx = atMend((c) => { for (const t of Object.values(c.territories)) { t.owned = true } ; c.territories['territory.ruined-kingdom.thicket']!.node = 'field' })
    expect(yieldOf(ctx.campaign, 'farm')!.amount).toBe(5 + 2 * 2)
    expect(yieldOf(ctx.campaign, 'pray')!.amount).toBe(4 + 1 * 1)
    expect(yieldOf(ctx.campaign, 'delve')!.amount).toBe(4 + 1 * 0)
  })
  it('Heal at Mend lowers a wound one level and pays nothing', () => {
    const ctx = atMend((c) => { c.roster[H[0]]!.wound = 2 })
    performAssignLabour(ctx, H[0], 'heal', 'test')
    const purse = { ...ctx.campaign.purse }
    performAdvance(ctx, 'test')
    expect(ctx.campaign.roster[H[0]]!.wound).toBe(1)
    expect(ctx.campaign.purse).toEqual(purse)
  })
})
