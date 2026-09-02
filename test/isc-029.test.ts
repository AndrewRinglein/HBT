// ISC-029 — with the base size limit of 4, canDeploy is true for the fourth
// unit and false for the fifth, and performDeploy refuses what canDeploy refuses.
// GAME-ARCHITECTURE.md §2.3 axis 1 — "A base unit limit per Engagement — 4 at the start"

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, canDeploy, performDeploy, performUndeploy, listDeployable, viewCombatPrep } from '../src/core/prep.js'

const load = () => makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))
const toDeploy = (ctx: ReturnType<typeof load>) => { beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test') }

describe('ISC-029 — Deploy refuses the fifth unit at the base limit', () => {
  it('four go, the fifth is refused by canDeploy and by performDeploy alike', () => {
    const ctx = load()
    toDeploy(ctx)
    const pool = listDeployable(ctx.campaign)
    expect(pool.length).toBeGreaterThanOrEqual(5)
    expect(viewCombatPrep(ctx.campaign).deployLimit).toBe(4)
    for (const h of pool.slice(0, 4)) {
      expect(canDeploy(ctx.campaign, h), h).toBe(true)
      performDeploy(ctx, h, 'test')
    }
    expect(viewCombatPrep(ctx.campaign).deployed.length).toBe(4)
    const fifth = pool[4]!
    expect(canDeploy(ctx.campaign, fifth)).toBe(false)
    expect(() => performDeploy(ctx, fifth, 'test')).toThrow(/4\/4/)
    expect(ctx.events.filter((e) => e.type === 'hero.committed').length).toBe(4)
  })

  it('undeploying one reopens the slot; deploying twice or outside the deploy step is refused', () => {
    const ctx = load()
    toDeploy(ctx)
    const pool = listDeployable(ctx.campaign)
    for (const h of pool.slice(0, 4)) performDeploy(ctx, h, 'test')
    expect(canDeploy(ctx.campaign, pool[0]!)).toBe(false)         // already there
    performUndeploy(ctx, pool[0]!, 'test')
    expect(canDeploy(ctx.campaign, pool[4]!)).toBe(true)
    performDeploy(ctx, pool[4]!, 'test')
    performAdvancePrep(ctx, 'test')                                  // → equip
    expect(canDeploy(ctx.campaign, pool[0]!)).toBe(false)
    expect(() => performDeploy(ctx, pool[0]!, 'test')).toThrow(/refused/)
  })
})
