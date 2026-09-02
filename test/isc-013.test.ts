// ISC-013 — a lost Territory must be conquered again, and the Kingdom Territory
// cannot be lost — a failed defence of it costs resources and wounds instead,
// as stakes data on that Territory.
// Law 5 overturned, SKELETON-SETTLED.md:80-81
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { performLose, listConquerable, isOwned } from '../src/core/map.js'
import { SWITCHES } from '../src/content/switches.js'

describe('ISC-013 — losing ground, and the one Territory that cannot be lost', () => {
  it('a held Territory not defended is lost and conquerable again', () => {
    const ridge = 'territory.ruined-kingdom.ridge'
    const ctx = loadFixture((c) => { c.territories[ridge]!.owned = true; c.territories[ridge]!.claimedOnce = true })
    expect(listConquerable(ctx.campaign)).not.toContain(ridge)
    performLose(ctx, ridge, 'test')
    expect(isOwned(ctx.campaign, ridge)).toBe(false)
    expect(listConquerable(ctx.campaign)).toContain(ridge)
    expect(ctx.events.filter((e) => e.type === 'territory.lost').map((e) => e['territoryId'])).toEqual([ridge])
  })
  it('the Kingdom Territory stays held and pays its stakes instead', () => {
    const sanctuary = 'territory.ruined-kingdom.sanctuary'
    const ctx = loadFixture()
    const supplies = ctx.campaign.purse['currency.supplies']!
    expect(supplies).toBeGreaterThanOrEqual(SWITCHES.sanctuaryLostDefenceSupplies)
    performLose(ctx, sanctuary, 'test')
    expect(isOwned(ctx.campaign, sanctuary)).toBe(true)
    expect(ctx.campaign.purse['currency.supplies']).toBe(supplies - SWITCHES.sanctuaryLostDefenceSupplies)
    expect(ctx.events.some((e) => e.type === 'territory.lost')).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'resource.spent').length).toBe(1)
    // an empty purse is taken to zero, never below
    const broke = loadFixture((c) => { c.purse['currency.supplies'] = 2 })
    performLose(broke, sanctuary, 'test')
    expect(broke.campaign.purse['currency.supplies']).toBe(0)
  })
  it('an unheld Territory cannot be lost', () => {
    const ctx = loadFixture()
    expect(() => performLose(ctx, 'territory.ruined-kingdom.thicket', 'test')).toThrow(/not held/)
  })
})
