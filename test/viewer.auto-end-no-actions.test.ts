// viewer.auto-end-no-actions (engine backlog; engine DECISIONS.md 2026-10-03 'a player unit with nothing left it can do ends
// its Activation by itself: "No remaining actions possible."'). Andrew: "If a player unit completes its move and it has a
// remaining primary action and there is no attack target in range, and no other powers it can use. You should just auto-end
// its turn and put a notification on the screen: 'No remaining actions possible.'" The engine's side: after a civilian walks
// its movement away from every enemy the engine validates no action from it — no move, no attack with a target, no power —
// and still takes its end-cycle: the test the host applies is the engine's legality, and the end it sends is the command
// End activation sends. No engine rule changes. The viewer's half (../viewer/tools/auto-end-no-actions.test.mjs) asks the
// page for the notice: an element, timed, blocking nothing. The sandbox's half (../kingdom/tools/auto-end-no-actions.verify.mjs)
// plays the expect line on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { activationChoices, validateBattleCommand, executeBattleCommand } from '../../engine/src/core/commands.js'
import { movementOptions } from '../../engine/src/core/movement.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('a player unit with nothing left it can do ends its Activation by itself', () => {
  it('the engine: a civilian that has walked away from every enemy has no action the engine would take, and its end-cycle is taken', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), policy = { humanUnitUids: ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.uid) }
    advanceBattle(ctx, policy)
    const civ = ctx.state.units.find((u) => u.side === 'hero' && /orphan|teacher/.test(u.typeId) && activationChoices(ctx, policy).includes(u.uid))!
    expect(civ, 'a civilian the player controls').toBeTruthy()
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: civ.uid, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    const move = civ.actions.find((id) => ctx.actions[id]?.move)!
    const enemies = ctx.state.units.filter((u) => u.side === 'enemy' && u.lifeState === 'standing')
    // its FULL movement: a walk short of it leaves the rest to be walked as its primary (the engine still offers the move in
    // the primary slot for what is left of the budget) — then it has something left and is not ended
    const options = movementOptions(ctx, civ.id, move, 'movement'), longest = Math.max(...options.map((o) => o.path.length))
    const far = options.filter((o) => o.path.length === longest).map((o) => o.destination)
      .sort((a, b) => Math.min(...enemies.map((e) => ctx.geo.distance(b, e.hex))) - Math.min(...enemies.map((e) => ctx.geo.distance(a, e.hex))))[0]!
    expect(executeBattleCommand(ctx, policy, { kind: 'action', actor: civ.id, actionId: move, slot: 'movement', destination: far, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    expect(ctx.battleCursor).toMatchObject({ at: 'acting', actor: civ.id }); expect(civ.primaryUsed).toBe(false)
    // every action on its sheet, in either slot, at every unit and every hex: the engine takes none
    const taken: string[] = []
    for (const id of civ.actions) for (const slot of ['movement', 'primary'] as const) {
      for (const t of ctx.state.units) if (validateBattleCommand(ctx, policy, { kind: 'action', actor: civ.id, actionId: id, slot, target: t.id, expectedSeq: ctx.state.seq }).ok) taken.push(`${id} at unit ${t.id}`)
      for (let h = 0; h < ctx.geo.hexCount; h++) if (validateBattleCommand(ctx, policy, { kind: 'action', actor: civ.id, actionId: id, slot, destination: h, expectedSeq: ctx.state.seq }).ok) taken.push(`${id} to hex ${h}`)
    }
    expect(taken, 'nothing left the engine would accept').toEqual([])
    expect(validateBattleCommand(ctx, policy, { kind: 'end-cycle', actor: civ.id, expectedSeq: ctx.state.seq }).ok, 'but ending its Activation').toBe(true)
  })
  it('the viewer page: the notice is an element with the host\'s words, timed, and blocks nothing', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/auto-end-no-actions.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/auto-end-no-actions.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/auto-end-no-actions.verify.mjs', 'scratch/auto-end-no-actions.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/auto-end-no-actions: .*passed/)
  }, 170000)
})
