// ISC-005, superseded by KINGDOM-V2-2026-09-07: two halves, ordered Field activities.
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { beginWeek, performAdvance } from '../src/core/week.js'
import { setCursor } from '../src/core/mutate.js'
import { STAGES } from '../src/content/stages.js'

describe('ISC-005 — Field then unordered City', () => {
  it('visits Conquest, Defense, due quests, City and the next Week exactly once', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['stage.field', 'stage.city'])
    const ctx = loadFixture()
    beginWeek(ctx, 'test')
    const week = ctx.campaign.week
    const visited: string[] = []
    for (let i = 0; i < 4; i++) {
      visited.push(`${ctx.campaign.cursor.stage}/${ctx.campaign.cursor.fieldStep}`)
      setCursor(ctx, { attack: null }, 'no attack in this flow probe')
      performAdvance(ctx, 'test')
    }
    expect(visited).toEqual(['stage.field/conquest', 'stage.field/defense', 'stage.field/quests', 'stage.city/null'])
    expect(ctx.campaign.week).toBe(week + 1)
    expect(ctx.campaign.cursor).toMatchObject({ stage: 'stage.field', fieldStep: 'conquest' })
    expect(ctx.events.filter((e) => e.type === 'stage.begun').map((e) => e['stageId'])).toEqual(['stage.field', 'stage.city', 'stage.field'])
    expect(ctx.events.filter((e) => e.type === 'stage.ended').map((e) => e['stageId'])).toEqual(['stage.field', 'stage.city'])
  })
})
