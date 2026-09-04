// The board is the MAP's, not a constant — board.variable-size / board.deploy-edges
// (engine, 2026-09-04; ruled 2026-09-03, engine/DECISIONS.md "board formats", and
// written up in engine/EVENTS-FOR-THE-VIEWER-2026-09-03.md §10).
//
// `WIDTH`, `HEIGHT`, `HEX_COUNT` and the free hex functions are gone from the
// engine. `src/view/battle.ts` used to import WIDTH/HEIGHT/colOf/rowOf and decode
// every hex id at 16 wide; it now reads the geometry off the Ctx the engine built
// (ctx.geo), which is bound to that map's board.
//
// This is an ordinary regression test, not an ISC probe: no criterion moved, a
// removal upstream forced a repair here. What it pins is the failure the removal
// would otherwise have hidden — a hex id decoded against the wrong width lands a
// unit on the wrong hex and the screen is quietly, plausibly wrong. Hex ids are
// `row × width + col` PER BOARD (§10: "Never decode an id without the board it
// came from"), so that identity is the whole claim, and it holds at 8×8, 16×8,
// 16×16 and 24×24 alike. Nothing here names 16.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, performDeploy, listDeployable } from '../src/core/prep.js'
import { viewBattle } from '../src/view/battle.js'

function atBattle() {
  const ctx = makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))
  beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  for (const h of listDeployable(ctx.campaign).slice(0, 4)) performDeploy(ctx, h, 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  return ctx
}

describe('the battle screen sizes its board from the map', () => {
  it('reports a whole board, and one terrain per hex on it', () => {
    const v = viewBattle(atBattle().campaign)
    expect(v.width).toBeGreaterThan(0)
    expect(v.height).toBeGreaterThan(0)
    expect(v.terrain.length).toBe(v.width * v.height)
  })

  it('decodes every unit hex against THAT board — id = row × width + col', () => {
    const v = viewBattle(atBattle().campaign)
    expect(v.units.length).toBeGreaterThan(0)
    for (const u of v.units) {
      expect(u.hex).toBe(u.row * v.width + u.col)
      expect(u.col).toBeGreaterThanOrEqual(0); expect(u.col).toBeLessThan(v.width)
      expect(u.row).toBeGreaterThanOrEqual(0); expect(u.row).toBeLessThan(v.height)
    }
  })

  it('takes no side of the board for granted — heroes may deploy on any edge', () => {
    const v = viewBattle(atBattle().campaign)
    const heroes = v.units.filter((u) => u.side === 'hero')
    const enemies = v.units.filter((u) => u.side === 'enemy')
    expect(heroes.length).toBeGreaterThan(0)
    expect(enemies.length).toBeGreaterThan(0)
    // The two sides are somewhere else from each other; WHERE is the map's `deploy`
    // and not this screen's business (the screen plots what unit.enter said).
    const hexes = new Set(v.units.map((u) => u.hex))
    expect(hexes.size).toBe(v.units.length)
  })
})
