// ISC-011 — the slice map is four Territories — the Kingdom Territory plus
// three — and the first conquest holds a critical building.
// THIN-SLICE-REVIEW.md §G2
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { listTerritories, listConquerable } from '../src/core/map.js'
import { TERRITORIES, REALM } from '../src/content/territories.js'

describe('ISC-011 — four Territories, one Kingdom, one critical building', () => {
  it('the realm registry and the fixture agree: four rows, one kingdom, the first conquest carries the Forge', () => {
    expect(TERRITORIES.length).toBe(4)
    expect(TERRITORIES.filter((t) => t.kingdom).length).toBe(1)
    expect(TERRITORIES.every((t) => t.id.startsWith(REALM.replace('realm.', 'territory.') + '.'))).toBe(true)
    const ctx = loadFixture()
    const all = listTerritories(ctx.campaign)
    expect(all.map((t) => t.id)).toEqual(TERRITORIES.map((t) => t.id).sort())
    const kingdom = all.find((t) => t.kingdom)!
    expect(kingdom.owned).toBe(true)
    // every non-kingdom Territory is reachable from the Kingdom Territory by adjacency
    const seen = new Set([kingdom.id]); const queue = [kingdom.id]
    while (queue.length) for (const a of ctx.campaign.territories[queue.shift()!]!.adjacent) if (!seen.has(a)) { seen.add(a); queue.push(a) }
    expect([...seen].sort()).toEqual(all.map((t) => t.id))
    // the first conquest — adjacent to the Kingdom Territory — holds a building
    const first = listConquerable(ctx.campaign)
    expect(first.length).toBeGreaterThan(0)
    expect(first.some((id) => ctx.campaign.territories[id]!.buildings.length > 0)).toBe(true)
    expect(all.every((t) => t.enemies.length > 0)).toBe(true)
  })
})
