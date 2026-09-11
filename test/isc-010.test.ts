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
    expect(listAvailable(ctx.campaign, 'stage.field')).not.toContain(H)
    expect(listAvailable(ctx.campaign, 'stage.city')).not.toContain(H)
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
  it('Exhausted permits recovery only; fighting, quest, absence and capture remain independent restrictions', () => {
    const c = loadFixture().campaign
    const rest = { kind: 'rest' as const, target: 'rest', weeks: 1 }
    c.roster[H]!.badges = ['badge.exhausted']
    expect(commitmentOf(c, H, 'field')).toBe('exhausted')
    expect(canCommit(c, H, rest)).toBe(true)
    expect(canCommit(c, H, { kind: 'labour', target: 'pray', weeks: 1 })).toBe(false)
    c.foughtThisWeek = [H]
    expect(canCommit(c, H, rest)).toBe(false)
    c.foughtThisWeek = []
    c.assignments[H] = { kind: 'quest', target: 'quest.escort', weeks: 1 }
    expect(canCommit(c, H, rest)).toBe(false)
    delete c.assignments[H]
    c.unavailable = [{ heroId: H, story: 'Went missing', returnWeek: c.week + 1 }]
    expect(canCommit(c, H, rest)).toBe(false)
    c.unavailable = []; c.captured = [H]
    expect(canCommit(c, H, rest)).toBe(false)
    c.captured = []; c.roster[H]!.wound = 3
    expect(canCommit(c, H, { kind: 'heal', target: 'heal', weeks: 1 })).toBe(true)
  })
  it('no other file in src/core has an opinion about availability (a static scan)', () => {
    const out = execSync('node tools/scan.mjs one-availability', { encoding: 'utf8' })
    expect(out).toMatch(/^one-availability: PASS/)
  })
})
