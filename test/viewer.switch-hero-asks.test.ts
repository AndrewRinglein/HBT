// viewer.switch-hero-asks (engine backlog; engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out
// card; switching heroes asks first; ...', 'switching from a hero that has not acted is free ...', 'the opening draft pool is
// all 24 heroes ...; the switch pop-up is for any player unit'). Andrew: "when you double-click on a hero but you still have a
// hero primary activation left, it should pop up and say, 'End activation of X hero and start activation of Y hero.' ... there
// needs to be some kind of check to make sure that I'm willing to end the activation of that other hero." · "by hero, I just
// mean any player unit ... And you can click yes or no." The engine's side: a unit that has begun and still has its primary
// may be ended (end-cycle), another may then begin (select-activation), and the one ended does not come back — the two
// commands a yes sends, and nothing new. The viewer's half (../viewer/tools/switch-hero-asks.test.mjs) asks the page for the
// pop-up: an element, the ruled words with both names, Yes / No, the answer offered to the host. The sandbox's half
// (../kingdom/tools/switch-hero-asks.verify.mjs) plays the expect line on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { activationChoices, validateBattleCommand, executeBattleCommand } from '../../engine/src/core/commands.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('switching heroes asks first', () => {
  it('the engine: a unit acting may be ended with its primary unused, another then begins, and the first does not come back; civilians are the player\'s too', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), policy = { humanUnitUids: ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.uid) }
    advanceBattle(ctx, policy)
    const choices = activationChoices(ctx, policy), a = choices[0]!, b = choices.at(-1)!
    const A = ctx.state.units.find((u) => u.uid === a)!, B = ctx.state.units.find((u) => u.uid === b)!
    expect(choices.length).toBeGreaterThan(2)
    expect(ctx.state.units.filter((u) => choices.includes(u.uid)).some((u) => /orphan|teacher/.test(u.typeId)), 'a civilian is among those the player may begin').toBe(true)
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: a, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(A.primaryUsed).toBe(false)
    // while A acts the engine lets nobody else begin: the question is the screen's, the two commands are the engine's
    expect(validateBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: b, expectedSeq: ctx.state.seq })).toEqual({ ok: false, reason: 'activation-not-selectable' })
    expect(validateBattleCommand(ctx, policy, { kind: 'end-cycle', actor: A.id, expectedSeq: ctx.state.seq }).ok).toBe(true)
    expect(executeBattleCommand(ctx, policy, { kind: 'end-cycle', actor: A.id, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: b, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: B.id })
    expect(executeBattleCommand(ctx, policy, { kind: 'end-cycle', actor: B.id, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(activationChoices(ctx, policy), 'the one ended does not come back').not.toContain(a)
    expect(validateBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: a, expectedSeq: ctx.state.seq })).toEqual({ ok: false, reason: 'activation-not-selectable' })
  })
  it('the viewer page: the pop-up is an element with the ruled words and both names, Yes / No, and the answer goes to the host', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/switch-hero-asks.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/switch-hero-asks.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/switch-hero-asks.verify.mjs', 'scratch/switch-hero-asks.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/switch-hero-asks: .*passed/)
  }, 170000)
})
