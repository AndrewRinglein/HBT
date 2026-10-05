// viewer.move-cost-on-hex (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...', 'the playtest post answered' and
// 'seven answers: ... an X on a hex that cannot be walked ...'). Andrew: "When you are in the movement phase, if there are
// squares in your movement area that cost 2 or can't be walked through, that number needs to be on the square." - asked "is an
// X right for a hex you can't walk through": "6, yes".
// The engine's side - what the marks are read from, and nothing new: what a step onto a hex costs (core/movement.ts
// stepCost) and whether a unit may enter a hex from another (core/structure.ts passableFor: the ground, the props, the
// structures). The opening's boards hold both kinds of ground. The viewer's half (../viewer/tools/move-cost-on-hex.test.mjs)
// draws the host's fact on the page; the kingdom's halves (../kingdom/test/move-cost-on-hex.test.ts, ../kingdom/tools/
// move-cost-on-hex.verify.mjs) hold the host's fact to the engine and the built BATTLE-SANDBOX.html to the fact. Imports no
// page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { stepCost } from '../../engine/src/core/movement.js'
import { passableFor } from '../../engine/src/core/structure.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the hexes beside the movement area say their cost, or an X', () => {
  it('the engine: the Orphanage\'s board holds ground a hero cannot enter and ground that costs two; both are the engine\'s own answers', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1))
    const hero = ctx.state.units.find((u) => u.side === 'hero')!, enter = passableFor(ctx, hero)
    let blocked = 0, dear = 0, plain = 0
    for (let hex = 0; hex < ctx.state.terrain.length; hex++) {
      const from = ctx.geo.neighbours(hex)
      if (!from.some((a) => enter(hex, a))) blocked++
      else { const c = Math.min(...from.filter((a) => enter(hex, a)).map((a) => stepCost(ctx, hex, a))); expect(Number.isInteger(c) && c >= 1, `hex ${hex}`).toBe(true); if (c > 1) dear++; else plain++ }
    }
    expect(blocked).toBeGreaterThan(0); expect(dear).toBeGreaterThan(0); expect(plain).toBeGreaterThan(dear)
  })
  it('the viewer page: an X on a bordering hex that cannot be entered, its number on one that costs more, nothing on a plain one; the marks are the host\'s and go with the facts', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/move-cost-on-hex.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: over the six opening battles on the built BATTLE-SANDBOX.html, every X and every bordering number is the engine\'s answer for the acting hero', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/move-cost-on-hex.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/move-cost-on-hex.verify.mjs', 'scratch/move-cost-on-hex.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/move-cost-on-hex: .*passed/)
  }, 170000)
})
