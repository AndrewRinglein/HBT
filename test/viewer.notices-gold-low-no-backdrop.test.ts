// viewer.notices-gold-low-no-backdrop (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post
// answered: every notice gold and low ...'). Andrew: "The notifications are in a very awkward spot. The fact that they have a
// backdrop makes them take up a lot more space. I was imagining this as gold and bright text with no backdrop. Also, let's drop
// it lower down on the screen so it's right above the bottom of the screen." - "I don't like the way it is for anything."
// Nothing of the engine is in this item: a notice is the screen's. This file runs the two halves - the page's stylesheet and
// DOM (../viewer/tools/notices-gold-low-no-backdrop.test.mjs), and the built BATTLE-SANDBOX.html measured in a real browser
// (../kingdom/tools/notices-gold-low-no-backdrop.verify.mjs: the computed colour, background, border, shadow and rectangle of
// each notice; given no folder it takes no screenshot). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

describe('every notice is gold bright text with no backdrop, just above the bottom of the screen', () => {
  it('the look is one rule of the viewer\'s stylesheet, and no notice\'s own rule draws anything behind its letters', () => {
    const css = readFileSync('src/styles.css', 'utf8')
    const block = css.match(/\/\* NOTICE-LOOK \*\/\s*([^{}]+)\{([^{}]*)\}\s*\/\* END NOTICE-LOOK \*\//)
    expect(block, 'the NOTICE-LOOK marks').not.toBeNull()
    expect(block![1]!.trim()).toBe('.hbtNotice')
    expect(block![2]).toMatch(/color:#ffd45e/); expect(block![2]).toMatch(/background:none/); expect(block![2]).toMatch(/border:none/); expect(block![2]).toMatch(/box-shadow:none/)
    expect(css.match(/\/\* NOTICE-LOOK \*\//g)!.length, 'written once').toBe(1)
  })
  it('the viewer page: the lesson, the host\'s notice and the play note wear the look in one stack above the bar; the questions keep their buttons', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/notices-gold-low-no-backdrop.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox, in a real browser: a lesson, "No remaining actions possible." and "New enemy" are gold letters with nothing behind them, low, clear of the action bar', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/notices-gold-low-no-backdrop.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/notices-gold-low-no-backdrop.verify.mjs', 'scratch/notices-gold-low-no-backdrop.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/notices-gold-low-no-backdrop: .*passed/)
    expect(out).not.toMatch(/screenshot/)
  }, 170000)
})
