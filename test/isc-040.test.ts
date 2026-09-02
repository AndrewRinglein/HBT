// ISC-040 — at stage.build, performBuild spends the node's Salvage price and
// marks the node built; a node whose parents are unbuilt, or whose price the
// purse cannot meet, is refused; the tree's nodes and prices are rows.
// 7-KINGDOM-SETTLED.md — Buildings (Forge 190, fan/chain) · THE-KINGDOM.html trees
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginStage } from '../src/core/week.js'
import { listBuildings, canBuild, whyNotBuild, performBuild, costOfBuild } from '../src/core/build.js'
import { BUILDINGS, buildingRowOf } from '../src/content/buildings.js'

const RIDGE = 'territory.ruined-kingdom.ridge', FORGE = 'building.forge'

function atBuild(salvage: number, own = true) {
  const ctx = loadFixture((c) => { c.purse['currency.salvage'] = salvage; if (own) { c.territories[RIDGE]!.owned = true; c.territories[RIDGE]!.claimedOnce = true } })
  setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
  beginStage(ctx, 'stage.build', 'test')
  return ctx
}

describe('ISC-040 — Salvage buys a Forge node from the settled tree', () => {
  it('the Forge is rows: ten nodes totalling 190 Salvage, repair the root, the chain at the end', () => {
    const forge = buildingRowOf(FORGE)
    expect(forge.nodes.reduce((s, n) => s + n.salvage, 0)).toBe(190)
    expect(forge.nodes.map((n) => n.key)).toEqual(['repair', 'blades', 'bows', 'shields', 'light', 'mail', 'exotic-arms', 'plate', 'masterworks', 'enchanted'])
    expect(BUILDINGS.length).toBeGreaterThanOrEqual(2)
  })
  it('repair first (10), then any of the fan; a child before its parents is refused; the purse is spent to the number', () => {
    const ctx = atBuild(30)
    const before = listBuildings(ctx.campaign).find((b) => b.building.id === FORGE)!
    expect(before.held).toBe(true); expect(before.building.nodes).toEqual([]); expect(before.building.damaged).toBe(true)
    expect(whyNotBuild(ctx.campaign, RIDGE, FORGE, 'blades')).toMatch(/needs 1 of repair/)
    expect(canBuild(ctx.campaign, RIDGE, FORGE, 'repair')).toBe(true)
    expect(costOfBuild(buildingRowOf(FORGE), 'repair')).toEqual({ 'currency.salvage': 10 })
    performBuild(ctx, RIDGE, FORGE, 'repair', 'test')
    expect(ctx.campaign.purse['currency.salvage']).toBe(20)
    const after = listBuildings(ctx.campaign).find((b) => b.building.id === FORGE)!.building
    expect(after.nodes).toEqual(['repair']); expect(after.level).toBe(1); expect(after.damaged).toBe(false)
    expect(() => performBuild(ctx, RIDGE, FORGE, 'repair', 'test')).toThrow(/already built/)
    performBuild(ctx, RIDGE, FORGE, 'shields', 'test')                         // the fan: any order
    expect(ctx.campaign.purse['currency.salvage']).toBe(12)
    expect(whyNotBuild(ctx.campaign, RIDGE, FORGE, 'exotic-arms')).toMatch(/needs 2 of blades, bows, shields/)
    performBuild(ctx, RIDGE, FORGE, 'bows', 'test')
    expect(ctx.campaign.purse['currency.salvage']).toBe(4)
    expect(whyNotBuild(ctx.campaign, RIDGE, FORGE, 'exotic-arms')).toMatch(/short of 18 Salvage/)   // parents met, purse not
    expect(whyNotBuild(ctx.campaign, RIDGE, FORGE, 'masterworks')).toMatch(/needs 2 of exotic-arms, plate/)
    expect(ctx.events.filter((e) => e.type === 'building.built').map((e) => e['node'])).toEqual(['repair', 'shields', 'bows'])
    expect(ctx.events.filter((e) => e.type === 'resource.spent').map((e) => e['amount'])).toEqual([10, 8, 8])
  })
  it('a building on ground you do not hold, or outside the Build Stage, is refused', () => {
    const unheld = atBuild(100, false)
    expect(whyNotBuild(unheld.campaign, RIDGE, FORGE, 'repair')).toBe('the Territory is not held')
    const ctx = atBuild(100)
    beginStage(ctx, 'stage.buy', 'test')
    expect(whyNotBuild(ctx.campaign, RIDGE, FORGE, 'repair')).toBe('not the Build Stage')
  })
  it('the Chapel stands at Sanctuary with its free root built — the second building costs the machine nothing', () => {
    const ctx = atBuild(0)
    const chapel = listBuildings(ctx.campaign).find((b) => b.building.id === 'building.chapel')!
    expect(chapel.held).toBe(true)
    expect(chapel.building.nodes).toEqual(['standing'])
    expect(whyNotBuild(ctx.campaign, chapel.territoryId, 'building.chapel', 'standing')).toBe('already built')
  })
})
