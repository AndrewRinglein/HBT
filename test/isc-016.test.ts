// ISC-016 — Renown rises by exactly 1 per Engagement won, and by 0 per Engagement lost.
// KINGDOM-DESIGN.md §3A
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult } from '../src/core/reckoning.js'

describe('ISC-016 — Renown +1 per win, +0 per loss', () => {
  it('a win pays exactly one Renown', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const r0 = ctx.campaign.renown
    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
    applyBattleResult(ctx, e, result, reckoning)
    expect(ctx.campaign.renown).toBe(r0 + 1)
    expect(ctx.events.filter((ev) => ev.type === 'renown.gained').map((ev) => ev['amount'])).toEqual([1])
  })
  it('a loss pays none', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const r0 = ctx.campaign.renown
    const { result, reckoning } = decide(ctx, panelResult(ctx, false))
    applyBattleResult(ctx, e, result, reckoning)
    expect(ctx.campaign.renown).toBe(r0)
    expect(ctx.events.filter((ev) => ev.type === 'renown.gained')).toEqual([])
  })
})
