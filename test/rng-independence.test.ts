import { describe, it, expect } from 'vitest'
import { makeRng, draw, roll100, STREAMS } from '../src/core/rng.js'

// Slay the Spire shipped correlated streams TWICE:
//   StS1  — all 12 streams constructed with the same seed, so identical bit sequences.
//   StS2  — `runSeed + hash(name)`, still correlated, because System.Random's first
//           output is nearly linear in its seed.
// Named streams are necessary but NOT sufficient; how each stream's seed is derived
// is a separate correctness problem. These tests check ours.

describe('rng stream independence', () => {
  it('two streams never produce the same value for the same keys', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (let a = 0; a < STREAMS.length; a++) {
        for (let b = a + 1; b < STREAMS.length; b++) {
          const x = draw(makeRng(seed), STREAMS[a]!, 1, 2)
          const y = draw(makeRng(seed), STREAMS[b]!, 1, 2)
          expect(x, `${STREAMS[a]} vs ${STREAMS[b]} @seed ${seed}`).not.toBe(y)
        }
      }
    }
  })

  it('the StS bug: conditioning one stream on another must not skew it', () => {
    // If stream A being high implied stream B being high, this would fail.
    const N = 20000
    for (const [a, b] of [['to-hit', 'crit'], ['deathbed', 'wave'], ['to-hit', 'deathbed']] as const) {
      let both = 0, aHigh = 0
      for (let i = 0; i < N; i++) {
        const rng = makeRng(7)
        const x = roll100(rng, a, i)
        const y = roll100(rng, b, i)
        if (x > 50) { aHigh++; if (y > 50) both++ }
      }
      const conditional = both / aHigh
      // Independent streams: P(B high | A high) should sit at ~0.5.
      expect(Math.abs(conditional - 0.5), `${a} -> ${b} conditional ${conditional.toFixed(3)}`).toBeLessThan(0.03)
    }
  })

  it('neighbouring seeds do not produce neighbouring first draws', () => {
    // System.Random's failure: seed+1 gives a near-identical first value.
    const firsts = Array.from({ length: 200 }, (_, s) => draw(makeRng(1000 + s), 'to-hit', 1))
    let monotoneRun = 1, worst = 1
    for (let i = 1; i < firsts.length; i++) {
      monotoneRun = firsts[i]! > firsts[i - 1]! ? monotoneRun + 1 : 1
      worst = Math.max(worst, monotoneRun)
    }
    expect(worst, 'consecutive seeds should not march in order').toBeLessThan(6)
  })

  it('keys avalanche: adjacent keys are uncorrelated', () => {
    const vals = Array.from({ length: 5000 }, (_, i) => roll100(makeRng(3), 'to-hit', 42, i))
    let sameHalf = 0
    for (let i = 1; i < vals.length; i++) if ((vals[i]! > 50) === (vals[i - 1]! > 50)) sameHalf++
    expect(Math.abs(sameHalf / (vals.length - 1) - 0.5)).toBeLessThan(0.03)
  })

  it('CRN survives: no draw anywhere consumes a variable number of values', () => {
    // Acceptance-rejection sampling would desynchronise paired runs. Our sample()
    // scores every candidate once and sorts — a fixed number of draws, always.
    const rng = makeRng(11)
    const before = rng.log.length
    roll100(rng, 'to-hit', 1, 1)
    expect(rng.log.length - before).toBe(1)
  })
})
