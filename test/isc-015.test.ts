// ISC-015 — losing a battle costs wounds and pays no Salvage.
// THIN-SLICE-REVIEW.md §D (IN) · SKELETON-SETTLED.md:109
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult } from '../src/core/reckoning.js'

describe('ISC-015 — losing costs wounds and pays no Salvage', () => {
  it('after a wipe every deployed hero is wounded or dead, and the purse gained nothing', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const before = { ...ctx.campaign.purse }
    const { result, reckoning } = decide(ctx, panelResult(ctx, false))
    applyBattleResult(ctx, e, result, reckoning)
    for (const id of e.deployed) { const h = ctx.campaign.roster[id]!; expect(h.wound > 0 || h.lifeState === 'dead', id).toBe(true) }
    expect(ctx.campaign.purse).toEqual(before)
    expect(ctx.events.filter((ev) => ev.type === 'resource.gained')).toEqual([])
    expect(ctx.events.filter((ev) => ev.type === 'hero.wounded').length).toBe(e.deployed.length)
  })
})
