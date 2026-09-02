// ISC-018 — a hero above a wound threshold cannot be deployed: commitmentOf
// answers 'wounded' and canDeploy refuses.
// THIN-SLICE-REVIEW.md §D (IN) — "wounds gate deployment" · KINGDOM-DESIGN.md §9 (Severe)
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { beginCombatPrep, performAdvancePrep, canDeploy, performDeploy, listDeployable } from '../src/core/prep.js'
import { commitmentOf } from '../src/core/assignments.js'
import { WOUND_UNAVAILABLE } from '../src/content/wounds.js'

describe('ISC-018 — wounds gate deployment', () => {
  it('a Severe hero is wounded to commitmentOf, absent from listDeployable, and refused by canDeploy; a Wounded one still goes', () => {
    const severe = 'hero.base.paladin-shiney', lightly = 'hero.fixed.air-mage'
    const ctx = loadFixture((c) => { c.roster[severe]!.wound = WOUND_UNAVAILABLE; c.roster[lightly]!.wound = WOUND_UNAVAILABLE - 1 })
    beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
    expect(commitmentOf(ctx.campaign, severe, 'field')).toBe('wounded')
    expect(commitmentOf(ctx.campaign, lightly, 'field')).toBe('free')
    expect(listDeployable(ctx.campaign)).not.toContain(severe)
    expect(listDeployable(ctx.campaign)).toContain(lightly)
    expect(canDeploy(ctx.campaign, severe)).toBe(false)
    expect(() => performDeploy(ctx, severe, 'test')).toThrow(/refused/)
    performDeploy(ctx, lightly, 'test')
    expect(commitmentOf(ctx.campaign, lightly, 'field')).toBe('committed')
  })
  it('dead is dead, whatever the wound', () => {
    const id = 'hero.base.paladin-shiney'
    const ctx = loadFixture((c) => { c.roster[id]!.lifeState = 'dead' })
    expect(commitmentOf(ctx.campaign, id, 'field')).toBe('dead')
    expect(commitmentOf(ctx.campaign, id, 'city')).toBe('dead')
  })
})
