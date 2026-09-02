// ISC-026 — Combat Prep advances the cursor through reveal → council → deploy →
// equip, in that order and no other, before the battle step.
// GAME-ARCHITECTURE.md §4 "Inside Combat Prep" · SKELETON-SETTLED.md:127

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, performDeploy, prepStepOf, listDeployable } from '../src/core/prep.js'

const load = () => makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))

describe('ISC-026 — the four prep steps, in the ruled order', () => {
  it('visits reveal, council, deploy, equip and then the battle', () => {
    const ctx = load()
    beginCombatPrep(ctx, 'test')
    const visited: string[] = [prepStepOf(ctx.campaign)]
    performAdvancePrep(ctx, 'test')            // reveal → council
    visited.push(prepStepOf(ctx.campaign))
    performAdvancePrep(ctx, 'test')            // council (skipped) → deploy
    visited.push(prepStepOf(ctx.campaign))
    performDeploy(ctx, listDeployable(ctx.campaign)[0]!, 'test')
    performAdvancePrep(ctx, 'test')            // deploy → equip
    visited.push(prepStepOf(ctx.campaign))
    performAdvancePrep(ctx, 'test')            // equip → battle
    expect(visited).toEqual(['reveal', 'council', 'deploy', 'equip'])
    expect(ctx.campaign.cursor.step).toBe('battle')
    expect(ctx.campaign.cursor.prepStep).toBeNull()
    expect(ctx.campaign.cursor.battle).toEqual({ resultSet: false })
    // every move was an event a save can be keyed to
    const moves = ctx.events.filter((e) => e.type === 'cursor.moved').map((e) => (e['to'] as { prepStep: string | null; step: string }))
    expect(moves.map((m) => m.prepStep ?? m.step)).toEqual(['reveal', 'council', 'deploy', 'equip', 'battle'])
  })

  it('deploy cannot be left with nobody sent; the other steps can be', () => {
    const ctx = load()
    beginCombatPrep(ctx, 'test')
    performAdvancePrep(ctx, 'test')
    performAdvancePrep(ctx, 'test')
    expect(prepStepOf(ctx.campaign)).toBe('deploy')
    expect(() => performAdvancePrep(ctx, 'test')).toThrow(/not skippable/)
    expect(prepStepOf(ctx.campaign)).toBe('deploy')
  })
})
