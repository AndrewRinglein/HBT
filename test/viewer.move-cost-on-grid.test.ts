// viewer.move-cost-on-grid (engine backlog; engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out
// card; switching heroes asks first; movement costs on the grid; a tooltip on every hex'). Andrew: "When the movement grid is
// up (the blue movement grid on the board), tiles that require extra movement points should have that movement cost, I
// think, maybe on them in gray." The engine's side — and nothing of it changes: the number on a tile is the engine's own
// stepCost for the last step of the engine's own walk to that hex, which is exactly what its reach charges for that step and
// what its walk takes from the unit's movement. Held here on the Orphanage. The host hands the number to the board (kingdom
// src/ui/play-input.ts reachCost, kingdom test/move-cost-on-grid.test.ts); the viewer's half
// (../viewer/tools/move-cost-on-grid.test.mjs) asks the page to write the host's number, grey, on the tiles that cost more
// than one and on no other; the sandbox's half (../kingdom/tools/move-cost-on-grid.verify.mjs) steps a hero onto a numbered
// tile on the built BATTLE-SANDBOX.html and reads the engine's movement before and after. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'
import { reachable, stepCost, movementOptions } from '../../engine/src/core/movement.js'
import { TERRAIN } from '../../engine/src/core/types.js'

describe('the movement grid shows what each tile costs to enter: the engine\'s own number', () => {
  it('the engine: the reach charges stepCost for each step — woodland 2, open ground 1 — for every hero of the Orphanage', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1))
    let dear = 0
    for (const u of ctx.state.units.filter((x) => x.side === 'hero')) {
      u.movePointsLeft = 6
      const reach = reachable(ctx, u)
      for (const [hex, node] of reach) {
        const prior = node.prev === u.hex ? 0 : reach.get(node.prev)!.cost
        expect(node.cost - prior).toBe(stepCost(ctx, hex, node.prev))          // the step's charge is stepCost, nothing else
        if (ctx.state.terrain[hex] === TERRAIN.WOODLAND) { expect(stepCost(ctx, hex, node.prev)).toBe(2); dear++ }
        if (ctx.state.terrain[hex] === TERRAIN.OPEN) expect(stepCost(ctx, hex, node.prev)).toBe(1)
      }
    }
    expect(dear).toBeGreaterThan(0)
  })
  it('the engine: the walk it offers to a hex ends on that hex, and its total is the steps\' charges added by the engine', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), u = ctx.state.units.find((x) => x.side === 'hero')!
    u.movePointsLeft = 6
    const move = u.actions.find((id) => ctx.actions[id]!.move?.shape === 'path')!
    for (const plan of movementOptions(ctx, u.id, move)) {
      expect(plan.path[plan.path.length - 1]).toBe(plan.destination)
      let from = u.hex, total = 0
      for (const hex of plan.path) { total += stepCost(ctx, hex, from); from = hex }
      expect(total).toBe(plan.pathCost)
    }
  })
  it('the viewer page: the host\'s cost is written, small and grey, on the reach tiles that cost more than one, and on no other', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/move-cost-on-grid.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Orphanage) — the number on the tile is what the engine takes from the hero\'s movement', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/move-cost-on-grid.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/move-cost-on-grid.verify.mjs', 'scratch/move-cost-on-grid.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/move-cost-on-grid: .*passed/)
  }, 170000)
})
