// ISC-005 — a Week advances through all six Stages in the ruled order —
// stage.buy → stage.quest → stage.defend → stage.conquer → stage.build →
// stage.mend — and the order is read from the Stage rows, not the code.
// KINGDOM-DESIGN.md §3 · GLOSSARY.md
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { beginWeek, performAdvance, stageOf } from '../src/core/week.js'
import { setCursor } from '../src/core/mutate.js'

// The RULED order, written here from the design document — not read from the
// registry, so a registry missing a row (KINGDOM_DISABLE_IDS=stage.mend) fails this.
const RULED = ['stage.buy', 'stage.quest', 'stage.defend', 'stage.conquer', 'stage.build', 'stage.mend']

describe('ISC-005 — six Stages, the ruled order', () => {
  it('a Week visits the six ids in order and then the next Week begins at the first', () => {
    const ctx = loadFixture()
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(ctx, 'test')
    const week = ctx.campaign.week
    const visited: string[] = [stageOf(ctx.campaign).id]
    for (let i = 0; i < 5; i++) { performAdvance(ctx, 'test'); visited.push(stageOf(ctx.campaign).id) }
    expect(visited).toEqual(RULED)
    expect(ctx.campaign.week).toBe(week)
    performAdvance(ctx, 'test')
    expect(ctx.campaign.week).toBe(week + 1)
    expect(stageOf(ctx.campaign).id).toBe(RULED[0])
    const begun = ctx.events.filter((e) => e.type === 'stage.begun').map((e) => e['stageId'])
    expect(begun).toEqual([...RULED, RULED[0]])
  })
})
