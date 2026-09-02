// ISC-027 — at the reveal step, viewCombatPrep lists every enemy unit of the
// Engagement and its battle condition if it has one, and no council, deploy or
// equip choice has been recorded yet.
// GAME-ARCHITECTURE.md §4 step 1 · KINGDOM-DESIGN.md §11 (the Reveal)

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx, setCursor } from '../src/core/mutate.js'
import { beginCombatPrep, viewCombatPrep } from '../src/core/prep.js'

const load = () => makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))

describe('ISC-027 — the Reveal shows the enemy before any decision', () => {
  it('lists every enemy of the Engagement, in its order, and nothing is chosen', () => {
    const ctx = load()
    beginCombatPrep(ctx, 'test')
    const v = viewCombatPrep(ctx.campaign)
    expect(v.step).toBe('reveal')
    expect(v.enemies).toEqual(ctx.campaign.cursor.engagement!.enemies)
    expect(v.enemies.length).toBeGreaterThan(0)
    expect(v.condition).toBeNull()
    expect(v.councilOffer).toEqual([])
    expect(v.tactic).toBeNull()
    expect(v.deployed).toEqual([])
    expect(v.canAdvance).toBe(true)
  })

  it('shows the condition when the Engagement carries one', () => {
    const ctx = load()
    setCursor(ctx, { engagement: { ...ctx.campaign.cursor.engagement!, condition: 'condition.snowing' } }, 'test')
    beginCombatPrep(ctx, 'test')
    expect(viewCombatPrep(ctx.campaign).condition).toBe('condition.snowing')
  })
})
