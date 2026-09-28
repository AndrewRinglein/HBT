// fix.surge-spend (2026-09-28) — ruled 2026-09-27 (Andrew, DECISIONS.md "Surge: a
// pool that pays 100 per Surge"): "If it's used, it should take away 100. If you have
// 150 surge, automatically you're going to have a surge activation, and you're going to
// lose 100 and still have 50." The amount (surgeChance) gains Surge at each check and
// the check rolls against it; a Surge takes away 100 instead of emptying it.
// Switches (SWITCHES.md "Surge spend"): surgeSpendFloorsAtZero (a Surge below 100 stops
// at 0, default) and surgeRelinkReadsLeftover (a further check in the same Activation
// reads the leftover, default).
//
// The variants are two TEST hero rows with different Surge (content/test/units.json:
// test-surge-labored 10, test-surge-swift 20); every Surge below is read from the row.
import { describe, expect, it } from 'vitest'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { createCustomBattle } from '../src/core/setup.js'
import { UNITS } from '../src/content/index.js'
import { DEFAULT_CONFIG, SURGE_COST, type Ctx, type Event } from '../src/core/types.js'

const VARIANTS = ['test-surge-labored', 'test-surge-swift'] as const
const surgeOf = (v: string) => UNITS[v]?.surge ?? 0
type Switches = Partial<typeof DEFAULT_CONFIG.switches>
const field = (v: string, switches: Switches = {}, replicate = 0) =>
  createCustomBattle([{ type: v, hex: 85 }], [{ type: 'test-zombie', hex: 181 }], { strict: true, replicate, cfg: { switches: { ...DEFAULT_CONFIG.switches, ...switches } } })
const checks = (ctx: Ctx, actor = 0) => ctx.events.filter((e) => e.type === 'surge.checked' && e.actor === actor)
const f = (e: Event, k: string) => (e as unknown as Record<string, unknown>)[k]

describe('fix.surge-spend — the variants are two hero rows with different Surge', () => {
  it('both rows are heroes with a Surge of their own, and the two differ', () => {
    for (const v of VARIANTS) expect(surgeOf(v), v).toBeGreaterThan(0)
    expect(surgeOf(VARIANTS[0])).not.toBe(surgeOf(VARIANTS[1]))
  })
})

describe.each(VARIANTS)('fix.surge-spend — %s', (v) => {
  it('a hero standing at 150 surges without a roll and keeps 50', () => {
    const S = surgeOf(v)
    const ctx = field(v)
    const u = ctx.state.units[0]!
    u.surgeChance = 150 - S          // the check adds the row's Surge: it rolls against 150
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    completeActionCycle(ctx)
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })   // surged: the same Activation acts again
    const [c] = checks(ctx)
    expect(c, 'surge.checked').toBeDefined()
    expect(f(c!, 'chance')).toBe(150)
    expect(f(c!, 'automatic')).toBe(true)
    expect(f(c!, 'roll')).toBeNull()
    expect(f(c!, 'hit')).toBe(true)
    expect(f(c!, 'before')).toBe(150 - S)
    expect(f(c!, 'after')).toBe(50)
    expect(u.surgeChance).toBe(50)
    const hit = ctx.events.find((e) => e.type === 'surge.hit' && e.actor === 0)!
    expect(f(hit, 'before')).toBe(150 - S); expect(f(hit, 'after')).toBe(50)
    // no draw on the surge stream for that check
    expect(ctx.rng.log.some((d) => d.stream === 'surge' && d.keys[0] === u.uid && d.keys[2] === 0)).toBe(false)
  })

  it('the next check in the same Activation reads the leftover: 50 + Surge, rolled', () => {
    const S = surgeOf(v)
    const ctx = field(v)
    const u = ctx.state.units[0]!
    u.surgeChance = 150 - S
    advanceBattle(ctx); completeActionCycle(ctx); advanceBattle(ctx); completeActionCycle(ctx); advanceBattle(ctx)
    const second = checks(ctx)[1]!
    expect(f(second, 'link')).toBe(1)
    expect(f(second, 'before')).toBe(50)
    expect(f(second, 'chance')).toBe(50 + S)
    expect(typeof f(second, 'roll')).toBe('number')
    const expectedAfter = f(second, 'hit') ? Math.max(0, 50 + S - SURGE_COST) : 50 + S
    expect(f(second, 'after')).toBe(expectedAfter)
  })

  it('across a whole battle the amount carries from check to check, Activation to Activation and Turn to Turn', () => {
    const S = surgeOf(v)
    let turnsCrossed = 0, hits = 0, misses = 0
    for (let r = 0; r < 4; r++) {
      const ctx = field(v, {}, r)
      ctx.state.units[0]!.surgeChance = 150 - S
      runBattle(ctx)
      const cs = checks(ctx)
      expect(cs.length).toBeGreaterThan(1)
      expect(f(cs[0]!, 'before')).toBe(150 - S)
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i]!, chance = f(c, 'chance') as number, before = f(c, 'before') as number
        expect(chance).toBe(before + S)
        expect(f(c, 'after')).toBe(f(c, 'hit') ? Math.max(0, chance - SURGE_COST) : chance)
        if (chance >= SURGE_COST) { expect(f(c, 'hit')).toBe(true); expect(f(c, 'roll')).toBeNull() }
        else expect(f(c, 'hit')).toBe((f(c, 'roll') as number) <= chance)
        if (f(c, 'hit')) hits++; else misses++
        if (i > 0) {
          expect(before, `check ${i} starts where check ${i - 1} left the amount`).toBe(f(cs[i - 1]!, 'after'))
          if (c.turn !== cs[i - 1]!.turn) turnsCrossed++
        }
      }
    }
    expect(turnsCrossed).toBeGreaterThan(0)
    expect(hits).toBeGreaterThan(0); expect(misses).toBeGreaterThan(0)
  })

  it('surgeSpendFloorsAtZero off: a Surge below 100 leaves the amount below zero', () => {
    const S = surgeOf(v)
    let below = 0
    for (let r = 0; r < 6; r++) {
      const ctx = field(v, { surgeSpendFloorsAtZero: false }, r)
      runBattle(ctx)
      const cs = checks(ctx)
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i]!, chance = f(c, 'chance') as number
        expect(chance).toBe((f(c, 'before') as number) + S)
        if (f(c, 'hit')) {
          expect(f(c, 'after')).toBe(chance - SURGE_COST)
          if (chance < SURGE_COST) below++
        } else expect(f(c, 'after')).toBe(chance)
        if (i > 0) expect(f(c, 'before')).toBe(f(cs[i - 1]!, 'after'))
      }
    }
    expect(below, 'a Surge that happened below 100').toBeGreaterThan(0)
  })

  it('surgeRelinkReadsLeftover off: a further check in the same Activation rolls against Surge alone and leaves the amount', () => {
    const S = surgeOf(v)
    const ctx = field(v, { surgeRelinkReadsLeftover: false })
    const u = ctx.state.units[0]!
    u.surgeChance = 150 - S
    advanceBattle(ctx); completeActionCycle(ctx); advanceBattle(ctx); completeActionCycle(ctx); advanceBattle(ctx)
    const [first, second] = checks(ctx)
    expect(f(first!, 'after')).toBe(50)
    expect(f(second!, 'link')).toBe(1)
    expect(f(second!, 'before')).toBe(50)
    expect(f(second!, 'chance')).toBe(S)
    expect(f(second!, 'after')).toBe(50)   // hit or miss, the leftover waits for the next Activation
  })
})
