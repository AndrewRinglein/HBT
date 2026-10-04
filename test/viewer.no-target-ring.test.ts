// viewer.no-target-ring (engine backlog; engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes;
// ...' and 2026-10-03 'one draft after every battle; the yellow focus border goes; ...'). Andrew, asked "Is the yellow you want
// gone the ring on hexes the chosen action can hit (including the hero's own hex for a self power)?": "yes". / "There's a
// highlighting of a hex that happens where there's a big yellow border around the hex at some point during unit activation."
// / "That yellow focus border doesn't look good, so just remove it." Nothing of the engine's changes: the item is the board's
// drawing of the facts a host hands it (viewer src/board.js drawPlay - the `playTarget` hex ring is gone; each unit standing on
// a target hex wears a thin ring round its own feet, the hero acting none). The viewer's half
// (../viewer/tools/no-target-ring.test.mjs) asks the page, with an attack chosen and with a self power chosen, that no hex is
// ringed and that the mark is on each unit that can be hit; the sandbox's half (../kingdom/tools/no-target-ring.verify.mjs)
// plays the built BATTLE-SANDBOX.html?play=encounter.opening.orphanage through its own bar, cards and figures and holds the
// marked unit to be the one the engine's attack lands on. What it looks like in a browser is
// ../kingdom/tools/no-target-ring.shot.mjs (real Chrome; the before and after screenshots). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

describe('the yellow ring on the hexes the chosen action can hit is gone; the units that can be hit wear the mark', () => {
  it('the viewer page: no `playTarget` ring with an attack or a self power chosen; the mark on each unit that can be hit, the hero acting none', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/no-target-ring.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Orphanage) - a self power and an attack chosen, the marked unit is the one the engine\'s attack lands on', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/no-target-ring.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/no-target-ring.verify.mjs', 'scratch/no-target-ring.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/no-target-ring: .*passed/)
  }, 170000)
})
