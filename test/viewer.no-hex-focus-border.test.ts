// viewer.no-hex-focus-border (engine backlog; engine DECISIONS.md 2026-10-03 'one draft after every battle; the yellow focus
// border goes; a death is tied to the strike; ...'). Andrew: "There's a highlighting of a hex that happens where there's a big
// yellow border around the hex at some point during unit activation. I don't quite know what that's for visually." / "That
// yellow focus border doesn't look good, so just remove it." Nothing of the engine's changes: the item is one stylesheet rule
// (viewer src/styles.css `.targetHex:focus-visible`). The viewer's half (../viewer/tools/no-hex-focus-border.test.mjs) asks the
// page's stylesheet that a focused target hex is painted with nothing and that the hexes stay buttons the keyboard can press;
// the sandbox's half (../kingdom/tools/no-hex-focus-border.verify.mjs) asks a real browser what a hex looks like — with the
// mouse, after a key, and keyboard-focused, a target hex included — on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

describe('the yellow keyboard-focus border on a hex is gone', () => {
  it('the viewer page: the stylesheet paints nothing on a focused target hex; the hexes stay buttons', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/no-hex-focus-border.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox, in a real browser: no hex is yellow with the mouse, after a key, or keyboard-focused; the keyboard still moves and targets', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/no-hex-focus-border.html'], { cwd: '../kingdom', stdio: 'pipe' })
    /* the browser half is given its own limit: a headless Chrome that hangs must fail this test, not hold the run */
    const out = execFileSync(process.execPath, ['tools/no-hex-focus-border.verify.mjs', 'scratch/no-hex-focus-border.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26, timeout: 400000 })
    expect(out).toMatch(/no-hex-focus-border: .*passed/)
  }, 440000)
})
