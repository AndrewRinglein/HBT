// viewer.turn-taking (engine backlog; engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed',
// 'the action bar and its card stay with the activated unit', 'the battle screen's turn-taking, ruled'). Andrew: "This whole
// system is really glitchy and confusing ... This is a horrific experience right now." The engine's side: no partial
// Activations — while a hero acts the engine lets no other begin (activation-not-selectable) and takes no order from another
// (not-current-actor). The viewer's half (../viewer/tools/turn-taking.test.mjs) asks the page for the one acting mark, the Hero
// Phase banner, the bar and card staying with the activated hero, the top bar's divider and the rewind; the sandbox's half
// (../kingdom/tools/turn-taking.verify.mjs) plays the expect line on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { activationChoices, validateBattleCommand, executeBattleCommand } from '../../engine/src/core/commands.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the battle screen\'s turn-taking', () => {
  it('the engine: no partial Activations — once a hero is begun no other may begin or take an order', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), policy = { humanUnitUids: ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.uid) }
    let next = advanceBattle(ctx, policy)
    expect(next.kind).toBe('selecting')
    const [a, b] = activationChoices(ctx, policy)
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: a!, expectedSeq: ctx.state.seq }).ok).toBe(true)
    next = advanceBattle(ctx, policy)
    expect(validateBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: b!, expectedSeq: ctx.state.seq })).toEqual({ ok: false, reason: 'activation-not-selectable' })
    const other = ctx.state.units.find((u) => u.uid === b)!.id
    expect(validateBattleCommand(ctx, policy, { kind: 'end-cycle', actor: other, expectedSeq: ctx.state.seq })).toEqual({ ok: false, reason: 'not-current-actor' })
  })
  it('the viewer page: one acting mark, the Hero Phase banner with nothing of the Enemy Phase left, the bar and card stay, heroes | enemies, rewind', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/turn-taking.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/turn-taking.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/turn-taking.verify.mjs', 'scratch/turn-taking.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/turn-taking: .*passed/)
  }, 170000)
})
