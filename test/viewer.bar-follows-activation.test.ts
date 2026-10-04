// viewer.bar-follows-activation (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar changes with the Activation:
// the new unit's moves, attacks and powers; the switch pop-up is still not built'). Andrew: "when the activation changes, for
// whatever reason, the card art changes in the lower left, but the moves don't change. They need to change to the character's
// moves. And attacks and powers and all that". A fault in landed viewer.turn-taking. The engine's side: ending an Activation
// with nothing else to resolve emits one event (activation.end) and beginning the next two (activation.selected,
// activation.begin) — nothing with a beat between them, which is why the screen drew the new unit while it still held the old
// unit's play facts; and every unit carries its own action list, the one the bar must show. The viewer's half
// (../viewer/tools/bar-follows-activation.test.mjs) asks the page that the card, the bar and the stamina strip are one draw;
// the sandbox's half (../kingdom/tools/bar-follows-activation.verify.mjs) plays the expect line on the built
// BATTLE-SANDBOX.html, reading the bar against the activated unit at each change of Activation. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { activationChoices, executeBattleCommand } from '../../engine/src/core/commands.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the action bar changes with the Activation', () => {
  it('the engine: End activation and the next begin are three events with the actors named, and each unit has its own actions', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), policy = { humanUnitUids: ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.uid) }
    advanceBattle(ctx, policy)
    const [a, b] = activationChoices(ctx, policy)
    const A = ctx.state.units.find((u) => u.uid === a)!, B = ctx.state.units.find((u) => u.uid === b)!
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: a!, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    const before = ctx.events.length
    expect(executeBattleCommand(ctx, policy, { kind: 'end-cycle', actor: A.id, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: b!, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(ctx.events.slice(before).map((e) => [e.type, (e as { actor?: number }).actor])).toEqual([['activation.end', A.id], ['activation.selected', B.id], ['activation.begin', B.id]])
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: B.id })
    expect([...B.actions].sort()).not.toEqual([...A.actions].sort())
  })
  it('the viewer page: the card, the bar and the stamina strip are one draw, from the same unit', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bar-follows-activation.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/bar-follows-activation.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/bar-follows-activation.verify.mjs', 'scratch/bar-follows-activation.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/bar-follows-activation: .*passed/)
  }, 170000)
})
