// ISC-007 — the cursor survives a save and reload at every position within a
// Week, and the reloaded Campaign advances identically from there.
// GAME-ARCHITECTURE.md §2.2 · THIN-SLICE-IMPLEMENTATION.md §4.4
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import { makeCtx, setCursor, type KingdomEvent } from '../src/core/mutate.js'
import { beginWeek } from '../src/core/week.js'
import { playStage, DEFAULTS } from '../src/sim/autoplay.js'

const shapeOf = (events: KingdomEvent[], from: number) => events.slice(from).map((e) => ({ ...e, seq: 0 }))

describe('ISC-007 — the cursor round-trips at every position, and the reload continues identically', () => {
  it('at every Stage of a Week with a battle in it, stringify/parse then play on gives the same events', () => {
    const base = loadFixture()
    setCursor(base, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(base, 'test')
    const positions: string[] = []
    for (let stage = 0; stage < 4; stage++) {
      // fork: the original continues; the copy is a reload of the save at this position
      const copy = makeCtx(campaignOf(saveOf(base.campaign)))
      expect(copy.campaign).toEqual(base.campaign)
      positions.push(`${base.campaign.cursor.stage}/${base.campaign.cursor.fieldStep}/${base.campaign.cursor.step}`)
      const fromA = base.events.length, fromB = copy.events.length
      playStage(base, DEFAULTS, 'test')
      playStage(copy, DEFAULTS, 'test')
      expect(copy.campaign, positions.at(-1)).toEqual(base.campaign)
      expect(shapeOf(copy.events, fromB), positions.at(-1)).toEqual(shapeOf(base.events, fromA))
    }
    expect(positions).toEqual(['stage.field/conquest/open', 'stage.field/defense/open', 'stage.field/quests/open', 'stage.city/null/open'])
    expect(base.campaign.week).toBe(4)
    expect(base.events.some((e) => e.type === 'engagement.resolved')).toBe(true)   // the Week had a battle in it
  })
})
