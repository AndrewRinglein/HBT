// ISC-031 — a result built by the outcome panel and a result folded from an
// engine log are the same EngagementResult type, both pass the same validator,
// and applyBattleResult accepts either without knowing which it was given.
// ruling 2026-09-01 — "built in a way we can invoke the engine later"
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { makeBattleState, resolveEngagement } from '../src/core/seam.js'
import { validateResult } from '../src/core/result.js'
import { applyBattleResult, resolveReckoning } from '../src/core/reckoning.js'
import { saveOf } from '../src/core/campaign.js'

describe('ISC-031 — one result shape, two producers, one writer', () => {
  it('the engine\'s fold and the panel both validate against the Engagement, and the writer takes either', () => {
    // the engine's path: field the Engagement on the cursor and fold the log
    const a = toBattle(loadFixture())
    const e = a.campaign.cursor.engagement!
    const folded = resolveEngagement(makeBattleState(a.campaign.roster, e)).result
    validateResult(folded, { heroes: e.deployed.length, enemies: e.enemies.length, id: e.id })
    const da = decide(a, folded)
    expect(() => applyBattleResult(a, e, da.result, da.reckoning)).not.toThrow()
    expect(a.campaign.cursor.step).toBe('reckoning')

    // the panel's path: the same Engagement, a hand-set result
    const b = toBattle(loadFixture())
    const db = decide(b, panelResult(b, true))
    expect(() => applyBattleResult(b, b.campaign.cursor.engagement!, db.result, db.reckoning)).not.toThrow()
    expect(b.campaign.cursor.step).toBe('reckoning')
    expect(Object.keys(db.result).sort()).toEqual(Object.keys(folded).sort())
  })

  it('a malformed result is refused before anything is written', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const good = panelResult(ctx, true)
    const { reckoning } = decide(ctx, good)
    const snapshot = saveOf(ctx.campaign)
    const wrongRoster = { ...good, units: good.units.slice(1) }
    expect(() => applyBattleResult(ctx, e, wrongRoster, reckoning)).toThrow(/fielded/)
    const wrongId = { ...good, id: 'engagement.conquer.elsewhere' }
    expect(() => applyBattleResult(ctx, e, wrongId, reckoning)).toThrow(/not the Engagement/)
    const lying = { ...good, outcome: 'wipe' as const }
    expect(() => applyBattleResult(ctx, e, lying, reckoning)).toThrow(/wipe with a hero still standing/)
    const foreignReckoning = { ...resolveReckoning(ctx.campaign, e, good), engagementId: 'engagement.conquer.elsewhere' }
    expect(() => applyBattleResult(ctx, e, good, foreignReckoning)).toThrow(/Reckoning is for/)
    expect(saveOf(ctx.campaign)).toBe(snapshot)
  })
})
