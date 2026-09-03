// ISC-010 — commitmentOf returns 'unavailable' as a third value, not a second
// question — no other function in the kingdom has an opinion about availability.
// SKELETON-SETTLED.md:122 · GAME-ARCHITECTURE.md §2.3
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { loadFixture } from './walk.js'
import { commitmentOf, listAvailable, canCommit } from '../src/core/assignments.js'
import { beginCombatPrep, performAdvancePrep, canDeploy, listDeployable } from '../src/core/prep.js'

const H = 'hero.base.priest-armored'

describe('ISC-010 — unavailable is a third value, answered in one place', () => {
  it("a hero the Week's roll kept home answers 'unavailable' in both slots and is offered nowhere", () => {
    const ctx = loadFixture((c) => { c.unavailable = [{ heroId: H, story: 'Went missing' }] })
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('unavailable')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('unavailable')
    expect(listAvailable(ctx.campaign, 'stage.conquer')).not.toContain(H)
    expect(listAvailable(ctx.campaign, 'stage.mend')).not.toContain(H)
    expect(canCommit(ctx.campaign, H, { kind: 'labour', target: 'farm', weeks: 1 })).toBe(false)
    beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
    expect(listDeployable(ctx.campaign)).not.toContain(H)
    expect(canDeploy(ctx.campaign, H)).toBe(false)
  })
  it('the answers are ordered: dead beats captured beats wounded beats unavailable beats a quest', () => {
    const ctx = loadFixture((c) => { c.unavailable = [{ heroId: H, story: 'Went missing' }]; c.captured = [H] })
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('captured')
    ctx.campaign.roster[H]!.lifeState = 'dead'
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('dead')
  })
  it('no other file in src/core has an opinion about availability (a static scan)', () => {
    const out = execSync('node tools/scan.mjs one-availability', { encoding: 'utf8' })
    expect(out).toMatch(/^one-availability: PASS/)
  })
})
