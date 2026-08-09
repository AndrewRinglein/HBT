import { describe, it, expect } from 'vitest'
import { makeRng, draw, roll100, rootSeedOf, sample, STREAMS } from '../src/core/rng.js'

describe('rng streams', () => {
  it('is deterministic for the same seed and key', () => {
    const a = makeRng(1234)
    const b = makeRng(1234)
    expect(draw(a, 'to-hit', 7, 2)).toBe(draw(b, 'to-hit', 7, 2))
  })

  it('differs across seeds, streams, and keys', () => {
    expect(draw(makeRng(1), 'to-hit', 1)).not.toBe(draw(makeRng(2), 'to-hit', 1))
    expect(draw(makeRng(1), 'to-hit', 1)).not.toBe(draw(makeRng(1), 'crit', 1))
    expect(draw(makeRng(1), 'to-hit', 1)).not.toBe(draw(makeRng(1), 'to-hit', 2))
  })

  // The reason the whole design exists.
  it('inserting a new draw leaves every other stream bit-identical', () => {
    const before = makeRng(99)
    const b1 = draw(before, 'to-hit', 3, 0)
    const b2 = draw(before, 'to-hit', 3, 1)
    const b3 = draw(before, 'deathbed', 3, 0)

    const after = makeRng(99)
    draw(after, 'to-hit', 3, 0)
    draw(after, 'crit', 3, 0)          // <- a brand new mechanic inserts a roll
    draw(after, 'to-hit', 3, 1)
    draw(after, 'deathbed', 3, 0)

    const [a1, , a2, a3] = after.log.map((r) => r.value)
    expect(a1).toBe(b1)
    expect(a2).toBe(b2)
    expect(a3).toBe(b3)
  })

  it('catches a duplicate key in strict mode', () => {
    const rng = makeRng(5, { strict: true })
    draw(rng, 'deathbed', 4, 0)
    expect(() => draw(rng, 'deathbed', 4, 0)).toThrow(/collision/)
  })

  it('roll100 stays in 1..100 and is roughly flat', () => {
    const rng = makeRng(7)
    const buckets = new Array(10).fill(0)
    for (let i = 0; i < 20000; i++) {
      const v = roll100(rng, 'to-hit', i)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(100)
      buckets[Math.floor((v - 1) / 10)]!++
    }
    for (const b of buckets) expect(b).toBeGreaterThan(1600)
  })

  it('a 65% threshold actually lands near 65%', () => {
    const rng = makeRng(21)
    let hits = 0
    for (let i = 0; i < 20000; i++) if (roll100(rng, 'to-hit', i) <= 65) hits++
    expect(hits / 20000).toBeGreaterThan(0.63)
    expect(hits / 20000).toBeLessThan(0.67)
  })

  it('arms of a sweep pair: same scenario + replicate = same seed', () => {
    expect(rootSeedOf(1, 0, 5)).toBe(rootSeedOf(1, 0, 5))
    expect(rootSeedOf(1, 0, 5)).not.toBe(rootSeedOf(1, 1, 5))
    expect(rootSeedOf(1, 0, 5)).not.toBe(rootSeedOf(1, 0, 6))
  })

  it('sample picks k distinct items, deterministically', () => {
    const rng = makeRng(11)
    const pool = Array.from({ length: 12 }, (_, i) => i)
    const a = sample(rng, pool, 4, 'hero-deployment')
    const b = sample(makeRng(11), pool, 4, 'hero-deployment')
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(4)
    expect(sample(makeRng(12), pool, 4, 'hero-deployment')).not.toEqual(a)
  })

  it('every declared stream is distinct', () => {
    const vals = STREAMS.map((s) => draw(makeRng(3), s, 1, 1))
    expect(new Set(vals).size).toBe(STREAMS.length)
  })
})
