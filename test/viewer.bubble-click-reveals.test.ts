// viewer.bubble-click-reveals (engine backlog; engine DECISIONS.md 2026-10-03 'clicking an off-screen bubble selects the unit
// and slides the screen just far enough to show its hex'). Andrew: "I should be able to click on one of the bubbles for a unit
// that's off-screen to both focus it and also scroll the screen over so they are visible, but only just to their hex. Don't
// focus on it or center the screen on it. Just slide over until they're visible." The engine's side — and nothing new is
// asked of it: where a unit stands is the log's (unit.enter, moved), and looking at a unit or sliding the view is no command.
// The Orphanage opens with a Zombie on the board's last column, far from the party — the unit a bubble stands for. The
// viewer's half (../viewer/tools/bubble-click-reveals.test.mjs) clicks the bubble on the page; the sandbox's half
// (../kingdom/tools/bubble-click-reveals.verify.mjs) clicks it on the built BATTLE-SANDBOX.html and reads the engine's battle
// before and after. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('a click on an off-screen unit\'s bubble selects it and slides the view to its hex', () => {
  it('the engine: the Orphanage opens with a Zombie on the board\'s last column, far from the party', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), g = ctx.geo
    const zombie = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!, heroes = ctx.state.units.filter((u) => u.side === 'hero')
    expect(g.colOf(zombie.hex)).toBe(g.board.width - 1)
    for (const h of heroes) expect(g.distance(h.hex, zombie.hex)).toBeGreaterThan(5)
    expect(ctx.events.find((e) => e.type === 'unit.enter' && e.actor === zombie.id)).toMatchObject({ hex: zombie.hex })
  })
  it('the viewer page: the bubble is a button; a click selects its unit and slides the view the least distance that shows its hex', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bubble-click-reveals.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Orphanage) — and the engine\'s battle is untouched by the click', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/bubble-click-reveals.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/bubble-click-reveals.verify.mjs', 'scratch/bubble-click-reveals.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/bubble-click-reveals: .*passed/)
  }, 170000)
})
