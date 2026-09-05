// proving.rig (2026-09-04) — PROVING-PLAN.md §3. Ruled 2026-09-03 (Angela,
// DECISIONS.md "the Proving"): flip rate first; five pairs — one seed, five
// maps — is a ranking; baselines are plural and content-owned; items only on
// classes that can wield them, hero-side only; mirror matches in scope. The
// rig fields, runs, measures and writes; it decides nothing.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { fielding, measure, pairsOf, permilleOf, runMatchup, runSubject, summarize, validatePlan, withSubject, type Plan } from '../src/sim/proving.js'
import { attackIdsOf } from '../src/core/action.js'

const plan = JSON.parse(readFileSync(join(__dirname, 'proving', 'smoke.json'), 'utf8')) as Plan

describe('the plan', () => {
  it('the smoke plan validates: five maps, one seed, squads, fixtures, subjects of every rotation, matchups', () => {
    expect(() => validatePlan(plan)).not.toThrow()
    expect(plan.maps.length).toBe(5)
    expect(new Set(plan.subjects.map((s) => s.rotation))).toEqual(new Set(['replace', 'add', 'equip', 'grow']))
  })
  it('a bad plan is loud: an unknown squad, an unknown fixture, an equip on the enemy side, a grow with no progress', () => {
    const base = { id: 'proving.bad', maps: ['map.open'], seed: 0, squads: { a: ['test-warrior'], z: ['unit.zombie'] }, fixtures: [{ id: 'f', hero: 'a', enemy: 'z' }], subjects: [] } as Plan
    expect(() => validatePlan({ ...base, fixtures: [{ id: 'f', hero: 'a', enemy: 'nope' }] })).toThrow(/squad 'nope'/)
    expect(() => validatePlan({ ...base, subjects: [{ id: 'x', fixture: 'g', rotation: 'add', side: 'hero' }] })).toThrow(/fixture 'g'/)
    expect(() => validatePlan({ ...base, subjects: [{ id: 'item.halberd', fixture: 'f', rotation: 'equip', side: 'enemy', slot: 0 }] })).toThrow(/enemies are not equippable/)
    expect(() => validatePlan({ ...base, subjects: [{ id: 'x', fixture: 'f', rotation: 'grow', side: 'hero', slot: 0 }] })).toThrow(/no progress/)
    expect(() => validatePlan({ ...base, id: 'smoke' })).toThrow(/proving\./)
  })
  it('five pairs are one seed across the five maps; more pairs cycle the maps at the next seed', () => {
    expect(pairsOf(plan, 5).map((p) => p.seed)).toEqual([1, 1, 1, 1, 1])
    expect(pairsOf(plan, 5).map((p) => p.map)).toEqual([...plan.maps])
    expect(pairsOf(plan, 7).slice(5)).toEqual([{ map: plan.maps[0], seed: 2 }, { map: plan.maps[1], seed: 2 }])
  })
})

describe('the arms', () => {
  it('the WITHOUT arm is the fixture as named; the rotations build the WITH arm from it', () => {
    const fx = plan.fixtures.find((f) => f.id === 'f.three-v-six')!
    const base = fielding(plan, fx, 'map.open', 1)
    expect(base.heroes).toEqual(['test-warrior', 'test-ranger', 'test-mage'])
    expect(base.enemies!.length).toBe(6)
    expect(base.heroItems).toEqual([[], [], []])   // items are ASSIGNED, never a default kit (ruled 2026-09-04) — these seats carry none
    const rep = withSubject(plan, { id: 'test-arc-golem', fixture: fx.id, rotation: 'replace', side: 'hero', slot: 1 }, base)
    expect(rep.heroes).toEqual(['test-warrior', 'test-arc-golem', 'test-mage'])
    const add = withSubject(plan, { id: 'test-arc-golem', fixture: fx.id, rotation: 'add', side: 'hero' }, base)
    expect(add.heroes!.length).toBe(4)
    expect(add.heroItems!.length).toBe(4)
    const eq = withSubject(plan, { id: 'item.halberd', fixture: fx.id, rotation: 'equip', side: 'hero', slot: 0 }, base)
    expect(eq.heroItems![0]).toEqual(['item.halberd'])
    expect(eq.heroes).toEqual(base.heroes)
    const grow = withSubject(plan, { id: 'x', fixture: fx.id, rotation: 'grow', side: 'hero', slot: 2, progress: { level: 2, specialtyId: 'specialty.fire-master' } }, base)
    expect(grow.heroProgress![2]).toEqual({ level: 2, specialtyId: 'specialty.fire-master' })
    const foe = withSubject(plan, { id: 'unit.ghoul', fixture: fx.id, rotation: 'add', side: 'enemy' }, base)
    expect(foe.enemies!.length).toBe(7)
    expect(foe.enemyCount).toBe(7)
  })
  it('a seat with assigned items fields them, and the equipped hero really wields the halberd', () => {
    const fx = plan.fixtures.find((f) => f.id === 'f.codex-v-six')!
    const base = fielding(plan, fx, 'map.open', 1)
    expect(base.heroItems![0]).toEqual(['item.longsword', 'item.basic-armor'])
    const eq = withSubject(plan, { id: 'item.halberd', fixture: 'f.three-v-six', rotation: 'equip', side: 'hero', slot: 0 }, fielding(plan, plan.fixtures[1]!, 'map.open', 1))
    const ctx = createBattle(eq)
    expect(attackIdsOf(ctx, ctx.state.units[0]!)).toContain('attack.halberd.hack')
  })
})

describe('measure', () => {
  it('a battle is measured into outcome, turns and the two sides\' surviving strength in permille (integers, Law 7)', () => {
    const { arm, ctx } = measure(fielding(plan, plan.fixtures[0]!, 'map.open', 1))
    expect(arm.outcome).not.toBe('invalid')
    expect(Number.isInteger(arm.heroPermille) && Number.isInteger(arm.enemyPermille) && Number.isInteger(arm.margin)).toBe(true)
    expect(arm.heroPermille).toBeGreaterThanOrEqual(0)
    expect(arm.heroPermille).toBeLessThanOrEqual(1000)
    expect(arm.margin).toBe(arm.heroPermille - arm.enemyPermille)
    expect(permilleOf(ctx!, 'hero')).toBe(arm.heroPermille)
    if (arm.outcome === 'heroClear') expect(arm.enemyPermille).toBe(0)
  })
  it('an impossible fielding is INVALID with its reason — recorded, never zero', () => {
    const base = fielding(plan, plan.fixtures[0]!, 'map.open', 1)
    const { arm } = measure({ ...base, heroes: ['unit.nobody', ...base.heroes!.slice(1)] })
    expect(arm.outcome).toBe('invalid')
    expect(arm.error).toMatch(/unknown unit typeId 'unit.nobody'/)
  })
  it('the two arms of a pair share their dice: WITHOUT is byte-identical to the fixture run on its own', () => {
    const base = fielding(plan, plan.fixtures[1]!, 'map.open', 1)
    const a = createBattle(base); runBattle(a)
    const b = createBattle(base); runBattle(b)
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
  })
})

describe('a subject, five pairs', () => {
  it('replace: five pairs, one per map at the plan seed; each pair records both arms, flipped, the shifts and presence; the summary is flip rate first', () => {
    const r = runSubject(plan, plan.subjects.find((s) => s.id === 'test-arc-golem' && s.rotation === 'replace' && s.fixture === 'f.three-v-six')!, 'test-stamp')
    expect(r.pairs.length).toBe(5)
    expect(r.pairs.map((p) => p.map)).toEqual([...plan.maps])
    for (const p of r.pairs) {
      expect(p.seed).toBe(1)
      expect(p.flipped).toBe(p.with.outcome !== p.without.outcome)
      expect(p.marginShift).toBe(p.with.margin - p.without.margin)
      expect(p.presence).toBeGreaterThan(0)   // the golem did things
    }
    expect(r.summary.valid).toBe(5)
    expect(r.summary.flipRatePermille).toBe(Math.floor((1000 * r.summary.flips) / 5))
    expect(r.summary.swing).toBe(r.summary.marginShiftMean)   // a hero-side subject
    expect(r.stamp).toBe('test-stamp')
  })
  it('an enemy-side subject swings the other way: its swing is minus the heroes\' margin shift', () => {
    const r = runSubject(plan, plan.subjects.find((s) => s.id === 'unit.ghoul')!, 'test-stamp')
    expect(r.summary.swing).toBe(-r.summary.marginShiftMean)
  })
  it('a subject that cannot be fielded has five INVALID pairs, a summary of zero valid, and its reason on every pair', () => {
    const r = runSubject(plan, plan.subjects.find((s) => s.id === 'unit.nobody')!, 'test-stamp')
    expect(r.summary.invalid).toBe(5)
    expect(r.summary.valid).toBe(0)
    expect(r.summary.flipRatePermille).toBe(0)
    for (const p of r.pairs) expect(p.with.error).toMatch(/unit.nobody/)
  })
  it('summarize: flips over valid pairs only', () => {
    const arm = (o: 'heroClear' | 'wipe' | 'invalid', margin = 0) => ({ outcome: o, turns: 3, heroPermille: 0, enemyPermille: 0, margin } as const)
    const s = summarize([
      { map: 'a', seed: 1, with: arm('wipe'), without: arm('heroClear'), flipped: true, marginShift: -400, tempoShift: 1, presence: 3 },
      { map: 'b', seed: 1, with: arm('heroClear'), without: arm('heroClear'), flipped: false, marginShift: 100, tempoShift: 0, presence: 2 },
      { map: 'c', seed: 1, with: arm('invalid'), without: arm('heroClear'), flipped: false, marginShift: 0, tempoShift: 0, presence: 0 },
    ], 'enemy')
    expect(s).toEqual({ pairs: 3, valid: 2, invalid: 1, flips: 1, flipRatePermille: 500, marginShiftMean: -150, swing: 150, tempoShiftMean: 1, presence: 5 })
  })
})

describe('matchups and mirrors', () => {
  it('a matchup runs the two squads five times and counts the wins; a mirror matchup fields enemy rows on the hero side', () => {
    const m = runMatchup(plan, plan.matchups!.find((x) => x.id === 'm.mirror')!, 'test-stamp')
    expect(m.battles.length).toBe(5)
    expect(m.heroWins + m.enemyWins + m.other).toBe(5)
    const ctx = createBattle(fielding(plan, plan.matchups!.find((x) => x.id === 'm.mirror')!, 'map.open', 1))
    expect(ctx.state.units.filter((u) => u.side === 'hero').every((u) => u.typeId === 'unit.zombie')).toBe(true)
  })
})
