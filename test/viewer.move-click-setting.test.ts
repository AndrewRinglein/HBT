// kingdom.move-click-setting (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …; one click or
// two to move is a setting'). Andrew: "Actually, I guess for number 4, let's have a setting where it can be either way, so I
// can just play with it either way." Two clicks is the default.
//
// The item is the kingdom's (its play input and where the choice is kept); the control is the viewer's chrome, drawn from a
// fact and deciding nothing. The engine's side — what the stop before a free attack stands on, and nothing new: the engine's
// forecast of a walk names where on it a free attack would come (core/forecast.ts forecastFrom: `provokes`), and for a walk
// away from an enemy beside the unit it names one, for a walk that passes no enemy none. The viewer's half
// (../viewer/tools/move-click-setting.test.mjs) is the control; the kingdom's halves (../kingdom/test/move-click-setting.test.ts,
// ../kingdom/tools/move-click-setting.verify.mjs) hold the play input and the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { forecastFrom } from '../../engine/src/core/forecast.js'
import { beginActivation } from '../../engine/src/core/mutate.js'
import { movementOptions, usableMoves } from '../../engine/src/core/movement.js'
import { SCENARIOS, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('one click or two to move is a setting', () => {
  it('the engine: its forecast of a walk says where a free attack would come — none on a walk that passes no enemy, one on a walk away from an enemy beside the unit', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.opening-orphanage']!, 0))
    const hero = ctx.state.units.find((u) => u.side === 'hero')!, zombie = ctx.state.units.find((u) => u.side === 'enemy')!
    beginActivation(ctx, hero.id, 'viewer.move-click-setting')
    const move = usableMoves(ctx, hero)[0]!
    const forecasts = (from: string) => movementOptions(ctx, hero.id, move.id, 'movement').map((o) => { const f = forecastFrom(ctx, { actor: hero.id, actionId: move.id, destination: o.destination, slot: 'movement' }); expect(f.ok, from).toBe(true); return f.ok ? f.provokes.length : -1 })
    const far = forecasts('far from the enemy'); expect(far.length).toBeGreaterThan(0); expect(far.every((n) => n === 0), 'no walk from the start passes the Zombie').toBe(true)
    /* the hero stood beside the Zombie (placed there for this question alone): walking away draws a free attack on the forecast */
    const beside = ctx.geo.neighbours(zombie.hex).find((h: number) => !ctx.state.units.some((u) => u.hex === h) && ctx.state.terrain[h] !== undefined)!
    hero.hex = beside
    const near = forecasts('beside the enemy'); expect(near.some((n) => n > 0), 'a walk away from the Zombie is forecast to draw a free attack').toBe(true)
  })
  it('the viewer page: the control beside 2× is drawn from the host\'s fact, says which way it is set, offers the other way back and decides nothing; no fact, no control', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/move-click-setting.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: on the built BATTLE-SANDBOX.html a move is played each way, a walk that draws a free attack takes its second click at one click, and the choice survives a reload and the next battle', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/move-click-setting.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/move-click-setting.verify.mjs', 'scratch/move-click-setting.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/move-click-setting: .*passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 300000)
})
