// ISC-033 — after the Reckoning is applied, the cursor is past the battle step,
// the save round-trips through JSON to an equal Campaign, and a second apply of
// the same result is refused.
// ruling 2026-09-01 — "load state, decide what happened in combat, and exit" · GAME-ARCHITECTURE.md §2.2
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { saveOf, campaignOf } from '../src/core/campaign.js'

describe('ISC-033 — exit: past the battle, saved, and never applied twice', () => {
  it('applies once, saves, reloads equal, refuses a second apply, and exits to the Week', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
    applyBattleResult(ctx, e, result, reckoning)
    expect(ctx.campaign.cursor.step).toBe('reckoning')
    expect(ctx.campaign.cursor.battle).toBeNull()
    expect(ctx.campaign.territories[e.territoryId]!.owned).toBe(true)

    const reloaded = campaignOf(saveOf(ctx.campaign))
    expect(reloaded).toEqual(ctx.campaign)

    const renown = ctx.campaign.renown
    expect(() => applyBattleResult(ctx, e, result, reckoning)).toThrow(/applied once/)
    expect(ctx.campaign.renown).toBe(renown)

    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor).toMatchObject({ step: 'open', prepStep: null, engagement: null, battle: null })
    expect(campaignOf(saveOf(ctx.campaign))).toEqual(ctx.campaign)
    expect(() => performExitBattle(ctx, 'test')).toThrow(/refused/)
  })
})
