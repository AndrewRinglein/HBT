// ISC-032 — resolveReckoning proposes XP per unit and a wound per hero from the
// result; any proposed value may be overridden before it is applied; and
// applyBattleResult writes exactly the Reckoning it is given — an overridden XP
// of N raises that hero's XP by exactly N.
// ruling 2026-09-01 — "Xp gain by unit. Wounded by hero unit. Just set everything that could happen"
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult } from '../src/core/reckoning.js'

describe('ISC-032 — written exactly as given', () => {
  it('overridden XP, wound, death and grants land to the number', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const [h0, h1, h2, h3] = e.deployed as [string, string, string, string]
    const xpBefore = Object.fromEntries(e.deployed.map((id) => [id, ctx.campaign.roster[id]!.xp]))
    const salvageBefore = ctx.campaign.purse['currency.salvage']!
    const { result, reckoning } = decide(ctx, panelResult(ctx, true), (k) => ({
      ...k,
      heroes: k.heroes.map((h) => {
        if (h.heroId === h0) return { ...h, xp: 42, wound: 2, mvp: false }
        if (h.heroId === h1) return { ...h, xp: 0, wound: 0 }
        if (h.heroId === h2) return { ...h, dead: true }
        if (h.heroId === h3) return { ...h, xp: 7, wound: 3 }
        return h
      }),
      renown: 3,
      grants: [{ currency: 'currency.salvage', amount: 11 }],
    }))
    applyBattleResult(ctx, e, result, reckoning)
    const r = ctx.campaign.roster
    expect(r[h0]!.xp - xpBefore[h0]!).toBe(42); expect(r[h0]!.wound).toBe(2)
    expect(r[h1]!.xp - xpBefore[h1]!).toBe(0); expect(r[h1]!.wound).toBe(0)
    expect(r[h2]!.lifeState).toBe('dead'); expect(r[h2]!.xp).toBe(xpBefore[h2])
    expect(r[h3]!.xp - xpBefore[h3]!).toBe(7); expect(r[h3]!.wound).toBe(3)
    expect(ctx.campaign.renown).toBe(2 + 3)
    expect(ctx.campaign.purse['currency.salvage']! - salvageBefore).toBe(11)
    // nobody else moved
    for (const id of Object.keys(r)) if (!e.deployed.includes(id)) expect(r[id]!.xp).toBe(0)
  })

  it('the proposal itself is what the writer writes when nothing is overridden', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const { result, reckoning } = decide(ctx, panelResult(ctx, true, (r) => ({ ...r, enemyPhases: 9 })))
    applyBattleResult(ctx, e, result, reckoning)
    for (const h of reckoning.heroes) {
      expect(ctx.campaign.roster[h.heroId]!.xp).toBe(h.xp)
      expect(ctx.campaign.roster[h.heroId]!.wound).toBe(h.wound)
    }
    expect(ctx.campaign.renown).toBe(2 + reckoning.renown)
  })
})
