// viewer.tutorial-overlays (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line,
// no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer start').
// Andrew: "there should be a notification message across the center that is gold and easy to see" / "the gold message doesn't
// stay up. It only lasts for a time." / "an arrow points at them and says \"Civilians.\"" / "we're going to point an arrow over
// at the move button" / "There are two arrows pointing at the two base enemy numbers." The engine's side — and nothing is asked
// of it: a lesson is drawn by the viewer and decided by the host, it is no command and reads no rule. What the Orphanage's
// lessons will point at is the engine's and is there: the placed civilians, the Zombie, the first hero's own move action. The
// viewer's half (../viewer/tools/tutorial-overlays.test.mjs) drives the three calls — tell, point, look — on the page; the
// sandbox's half (../kingdom/tools/tutorial-overlays.verify.mjs) drives them through the built BATTLE-SANDBOX.html's own
// viewer and reads the engine's battle before and after. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { isMove, isAttack } from '../../engine/src/core/action.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the host\'s lessons: a notice, pointers, a look', () => {
  it('the engine: what the Orphanage\'s lessons point at is on its board — the civilians, the Zombie, the hero\'s move action', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), units = ctx.state.units
    expect(units.filter((u) => u.side === 'hero' && (u.tags ?? []).includes('civilian')).length).toBe(2)
    expect(units.filter((u) => u.side === 'enemy').map((u) => u.typeId)).toEqual(['unit.zombie'])
    const hero = units.find((u) => u.side === 'hero' && !(u.tags ?? []).includes('civilian'))!
    expect(hero.actions.some((id) => isMove(ctx.actions[id]!) && !isAttack(ctx.actions[id]!))).toBe(true)
  })
  it('the viewer page: the notice\'s words and its time, each pointer\'s target, the pump held under a notice that asks, a look and back', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/tutorial-overlays.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the three calls through the built BATTLE-SANDBOX.html\'s own viewer (the Orphanage); the engine\'s battle untouched', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/tutorial-overlays.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/tutorial-overlays.verify.mjs', 'scratch/tutorial-overlays.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/tutorial-overlays: .*passed/)
  }, 170000)
})
