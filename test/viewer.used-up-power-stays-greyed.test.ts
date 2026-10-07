// viewer.used-up-power-stays-greyed (engine backlog; engine DECISIONS.md 2026-10-06 'an Activation is one move action and one
// primary action, in that order; a used-up power stays on the bar, greyed'). Asked whether a used-up once-per-battle power
// should stay on the bar greyed instead of disappearing, Andrew: "One, yes."
// The engine's side, unchanged by this item: the last use of an action spent, the engine takes it off the unit's list and says
// so in one line (power.exhausted), and remembers the use (usesSpentThisBattle) — what the bar and the host read. The viewer's
// half (../viewer/tools/used-up-power-stays-greyed.test.mjs) keeps the row on the bar, greyed; the kingdom's
// (../kingdom/test/used-up-power-stays-greyed.test.ts) names it to the bar and answers a press.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('a used-up power stays on the bar, greyed', () => {
  it('the engine: the Banner of Courage planted, its one use is spent — the engine says power.exhausted, drops it from the unit\'s list and remembers the use', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.banner-courage')))
    runBattle(ctx)
    const gone = ctx.events.find((e) => e.type === 'power.exhausted') as { actor: number; abilityId: string } | undefined
    expect(gone, 'a last use was spent').toBeTruthy()
    const u = ctx.state.units[gone!.actor]!
    expect(ctx.actions[gone!.abilityId]!.uses).toBe(1)
    expect(u.actions).not.toContain(gone!.abilityId)
    expect(u.usesSpentThisBattle?.[gone!.abilityId]).toBe(1)
  })
  it('the viewer page: the used-up row is still on the bar in its place, greyed, saying "Used: once per Battle."; a host that plays has the last word', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/used-up-power-stays-greyed.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
