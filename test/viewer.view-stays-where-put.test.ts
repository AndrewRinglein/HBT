// viewer.view-stays-where-put (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … the view
// goes back to the acting unit'). Andrew: "It's awkward to try to roll the map around … Things are not on the screen." Found
// on the Bridge: after the player scrolls the view away from the acting unit, the next thing that draws the board again — a
// notch of the wheel, a click on any unit or on its card, the 3D scene finishing its load — brought the view straight back
// until the acting unit was 80 px inside it. Ruled 2026-10-01: "You can look at different parts of the map by just looking
// around on the map". Expect: "On the built page's Bridge, scrolled a screen away from the acting hero: a wheel notch zooms
// where the view is and the hero stays off the screen; clicking an enemy there shows its panel and the view does not move;
// pointing at hexes and clicking one does not move it; ending the Activation centres on the next hero; an enemy's attack on
// a hero off the screen brings both ends into view as now; a page test reads each."
// The engine's side — nothing is asked of it: looking around is no command. The Bridge is the board the fault was measured
// on (40 columns: wider than the battle area shows). The viewer's half (../viewer/tools/view-stays-where-put.test.mjs) drives
// the page on the Bridge's recording as a player does — the pointer at the screen's edge, the wheel, clicks; the sandbox's
// half (../kingdom/tools/view-stays-where-put.verify.mjs) plays the built BATTLE-SANDBOX.html and reads the engine's battle
// before and after. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the view the player put somewhere stays there until the game has reason to move it', () => {
  it('the engine: the Bridge is wider than a screen, and its heroes begin far from its enemies — a board the player scrolls', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-bridge'), 1)), g = ctx.geo
    expect(g.board.width).toBeGreaterThanOrEqual(30)
    const heroes = ctx.state.units.filter((u) => u.side === 'hero'), enemies = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(heroes.length).toBeGreaterThan(0); expect(enemies.length).toBeGreaterThan(0)
    const spread = Math.max(...ctx.state.units.map((u) => g.colOf(u.hex))) - Math.min(...ctx.state.units.map((u) => g.colOf(u.hex)))
    expect(spread, 'columns between the westmost and the eastmost unit at the opening').toBeGreaterThan(5)
  })
  it('the viewer page, the Bridge\'s recording: scrolled away it stays through a redraw, the scene\'s load, a look at another unit, a wheel notch, pointing and clicking; a new Activation, the player\'s own centre and Reset take it; an attack off the screen is brought into view', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/view-stays-where-put.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Bridge) — and the engine\'s battle is untouched by looking', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/view-stays-where-put.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/view-stays-where-put.verify.mjs', 'scratch/view-stays-where-put.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/view-stays-where-put: .*passed/)
    for (const n of [1, 2, 3, 4, 5, 6]) expect(out, `step ${n}`).toMatch(new RegExp(`^  ${n} `, 'm'))
  }, 300000)
})
