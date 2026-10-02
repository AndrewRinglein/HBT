// kingdom.abbotown-map (PLAYABLE-OPENING-PLAN.md item 11; engine DECISIONS.md 2026-09-29 "the playable opening": "The
// Retaking Abbotown campaign map is built from Andrew's sketch (IMG_5078): six sections, taken ones marked, the next one
// pointed to"). Expect: "The map shows six sections with the taken ones marked and the next pointed to; an eyeball check
// for Andrew." The mechanism is pure (src/core/conquest.ts); the page half (tools/abbotown-map.verify.mjs) plays the
// COMMITTED sandbox opened with ?map.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { conquestProgress, takeSection, wonOutcome } from '../src/core/conquest.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { ENCOUNTERS } from '../src/engine.js'

const order = ['a', 'b', 'c']
describe('a conquest map: taken, next, locked', () => {
  it('nothing taken: the first is next, the rest locked', () => {
    expect(conquestProgress(order, [])).toEqual([{ id: 'a', state: 'next' }, { id: 'b', state: 'locked' }, { id: 'c', state: 'locked' }])
  })
  it('the next is the first section in order not yet taken', () => {
    expect(conquestProgress(order, ['a']).map(s => s.state)).toEqual(['taken', 'next', 'locked'])
    expect(conquestProgress(order, ['a', 'b', 'c']).map(s => s.state)).toEqual(['taken', 'taken', 'taken'])
  })
  it('a win takes only the next section; anything else changes nothing', () => {
    expect(takeSection(order, [], 'a')).toEqual(['a'])
    expect(takeSection(order, ['a'], 'c')).toEqual(['a'])
    expect(takeSection(order, ['a'], 'a')).toEqual(['a'])
    expect(takeSection(order, ['a'], 'zz')).toEqual(['a'])
    expect(takeSection(order, ['a'], 'b')).toEqual(['a', 'b'])
  })
  it('a won battle is heroClear or objectiveMet; every other outcome is a loss', () => {
    expect(['heroClear', 'objectiveMet', 'wipe', 'retreat', 'capped', 'objectiveFailed', null].map(wonOutcome)).toEqual([true, true, false, false, false, false, false])
  })
})

describe('Retaking Abbotown, from the sketch', () => {
  it('six sections in the ruled order, each keyed by its encounter, the engine\'s name where the engine has it', () => {
    expect(ABBOTOWN_MAP.title).toBe('Retaking Abbotown')
    expect(ABBOTOWN_MAP.sections.map(s => s.name)).toEqual(['Orphanage', 'Lumberjack House', 'Bridge', 'Cavern Trail', 'Gates', 'Cathedral'])
    for (const s of ABBOTOWN_MAP.sections) {
      expect(s.encounterId.startsWith('encounter.opening.')).toBe(true)
      const e = (ENCOUNTERS as Record<string, { name?: string }>)[s.encounterId]
      if (e) expect(s.name).toBe(e.name)
      expect(s.outline.length).toBeGreaterThanOrEqual(6)
    }
  })
  it('the page: six sections, the taken checked, one red arrow on the next, the next fields its battle, a win returns to the map', () => {
    const out = execFileSync(process.execPath, ['tools/abbotown-map.verify.mjs', 'BATTLE-SANDBOX.html', 'PLAY.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/abbotown map: six sections .*passed/)
  }, 180000)
})
