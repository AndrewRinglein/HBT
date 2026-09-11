// ISC046: V2 participant-only, per-battle pulls replace the whole-roster weekly roll.
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { resolveAbsences, absenceWeightOf, performRollAbsences } from '../src/core/absence.js'
import { applyBattleResult } from '../src/core/reckoning.js'
import { commitmentOf, canCommit } from '../src/core/assignments.js'
import { beginWeek, performAdvance, tickWeek } from '../src/core/week.js'
import { setCursor } from '../src/core/mutate.js'
import { ABSENCES } from '../src/content/absences.js'

const H = 'hero.base.warrior-iron'
describe('ISC046 — after each ordinary battle', () => {
  it('independent 20% participant pulls use existing badge multipliers, named streams and stories', () => {
    const c = loadFixture().campaign
    expect(absenceWeightOf(['badge.responsible'])).toBe(0)
    expect(absenceWeightOf(['badge.dedicated'])).toBe(50)
    expect(absenceWeightOf(['badge.lazy'])).toBe(200)
    expect(absenceWeightOf(['badge.withdrawn'])).toBe(300)
    const counts = [0, 0, 0, 0, 0]
    for (let n = 0; n < 1000; n++) {
      for (const [i, badges] of [[], ['badge.dedicated'], ['badge.lazy'], ['badge.withdrawn'], ['badge.responsible']].entries()) {
        c.roster[H]!.badges = badges
        const a = resolveAbsences(c, [H], `battle-${n}`)
        expect(a).toEqual(resolveAbsences(c, [H], `battle-${n}`))
        expect(a.every((x) => x.heroId === H && ABSENCES.some((r) => r.story === x.story))).toBe(true)
        counts[i]! += a.length
      }
    }
    expect(counts[0]).toBeGreaterThan(140); expect(counts[0]).toBeLessThan(260)
    expect(counts[1]).toBeGreaterThan(60); expect(counts[1]).toBeLessThan(140)
    expect(counts[2]).toBeGreaterThan(330); expect(counts[2]).toBeLessThan(470)
    expect(counts[3]).toBeGreaterThan(530); expect(counts[3]).toBeLessThan(670)
    expect(counts[4]).toBe(0)
    expect(resolveAbsences(c, [], 'empty')).toEqual([])
    c.roster[H]!.badges = ['badge.withdrawn']; c.roster[H]!.lifeState = 'dead'
    expect(resolveAbsences(c, [H], 'dead')).toEqual([])
  })
  it('the result writer pulls only survivors who fought, including a party smaller than six', () => {
    const ctx = toBattle(loadFixture(), 2)
    const e = ctx.campaign.cursor.engagement!
    // Deterministically select a battle identity whose participants draw an absence.
    for (let n = 0; n < 1000; n++) { e.id = `engagement.test-${n}`; if (resolveAbsences(ctx.campaign, e.deployed, e.id).length) break }
    const expected = resolveAbsences(ctx.campaign, e.deployed, e.id)
    expect(expected.length).toBeGreaterThan(0)
    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
    applyBattleResult(ctx, e, result, reckoning)
    expect(ctx.campaign.unavailable).toEqual(expected)
    for (const a of expected) {
      expect(e.deployed).toContain(a.heroId)
      expect(commitmentOf(ctx.campaign, a.heroId, 'field')).toBe('unavailable')
      expect(canCommit(ctx.campaign, a.heroId, { kind: 'rest', target: 'rest', weeks: 1 })).toBe(false)
    }
    expect(ctx.events.filter((e) => e.type === 'absence.rolled')).toHaveLength(1)
    expect(() => applyBattleResult(ctx, e, result, reckoning)).toThrow(/refused/)
    expect(ctx.events.filter((e) => e.type === 'absence.rolled')).toHaveLength(1)
  })
  it('prologue fights defer campaign absence pulls because the opening has no recovery City', () => {
    const ctx = toBattle(loadFixture(), 2)
    const e = ctx.campaign.cursor.engagement!
    for (let n = 0; n < 1000; n++) { e.id = `engagement.opening-test-${n}`; if (resolveAbsences(ctx.campaign, e.deployed, e.id).length) break }
    expect(resolveAbsences(ctx.campaign, e.deployed, e.id).length).toBeGreaterThan(0)
    e.prologue = 1; ctx.campaign.cursor.prologue = 1
    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
    applyBattleResult(ctx, e, result, reckoning)
    expect(ctx.campaign.unavailable).toEqual([])
    expect(ctx.events.filter((e) => e.type === 'absence.rolled')).toEqual([])
  })
  it('a pull blocks the next Field and every assignment, expires at due City, and empty pulls keep existing absences', () => {
    const ctx = loadFixture()
    let cause = ''
    for (let n = 0; n < 1000; n++) { cause = `battle-${n}`; if (resolveAbsences(ctx.campaign, [H], cause).length) break }
    performRollAbsences(ctx, [H], cause)
    const held = structuredClone(ctx.campaign.unavailable)
    performRollAbsences(ctx, [], 'other battle')
    expect(ctx.campaign.unavailable).toEqual(held)
    tickWeek(ctx, 'test'); beginWeek(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('unavailable')
    performAdvance(ctx, 'test'); setCursor(ctx, { attack: null }, 'test'); performAdvance(ctx, 'test')
    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('unavailable')
    performAdvance(ctx, 'test')
    expect(ctx.campaign.cursor.stage).toBe('stage.city')
    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
    expect(ctx.events.some((e) => e.type === 'absence.cleared')).toBe(true)
  })
})
