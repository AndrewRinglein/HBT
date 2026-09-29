// plumbing.vocabulary-export (engine, 2026-09-28; engine DECISIONS.md "the duplication review,
// ruled", findings K6 K13): the kingdom keeps no copy of the engine's words. What it READS of the
// engine's events (ENGINE_EVENTS, the door's declared list) must be words the engine emits, and
// every engine event the seam's fold switches on must be declared there; the result validator's
// outcomes and life states are the engine's own lists.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENGINE_EVENTS, engineVocabulary, OUTCOMES, LIFE_STATES } from '../src/engine.js'
import { makeBlankResult, validateResult } from '../src/core/result.js'

const V = engineVocabulary()

describe('plumbing.vocabulary-export — the kingdom reads the engine vocabulary', () => {
  it('every event the door declares is one the engine emits', () => {
    expect(ENGINE_EVENTS.filter((e) => !V.events.includes(e))).toEqual([])
  })

  it('every engine event the seam folds is declared at the door', () => {
    const seam = readFileSync(new URL('../src/core/seam.ts', import.meta.url), 'utf8')
    const folded = [...seam.matchAll(/case '([a-z]+\.[a-zA-Z.]+)'/g)].map((m) => m[1]!)
    expect(folded.length).toBeGreaterThan(5)
    expect(folded.filter((e) => !(ENGINE_EVENTS as readonly string[]).includes(e))).toEqual([])
  })

  it('the result validator takes the engine\'s six outcomes and three life states', () => {
    expect([...OUTCOMES]).toEqual(V.outcomes)
    expect([...LIFE_STATES]).toEqual(V.lifeStates)
    // membership only: each outcome passes the outcome check (other rules — e.g. heroClear with an
    // enemy standing — are the validator's own and may still refuse a blank row)
    const outcomeRefusal = (outcome: string) => {
      try { validateResult(makeBlankResult('test.vocabulary', outcome as never, [], [])); return '' } catch (e) { return String(e) }
    }
    for (const outcome of OUTCOMES) expect(outcomeRefusal(outcome)).not.toMatch(/outcome .* is not one of/)
    expect(outcomeRefusal('victory')).toMatch(/outcome 'victory' is not one of/)
  })
})
