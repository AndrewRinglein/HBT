// viewer.plates-banners-tooltip-gold-look (engine backlog; engine DECISIONS.md 2026-10-05 'gifts: the word; each first-hero choice
// rolls its own; the plates, banners, tooltip and pop-up take the gold look'). Told that the notices' item left the Deathbed and
// injury plates, the phase and wave banners, the hex tooltip and the affliction pop-up as they were, and asked whether any
// should take the gold no-backdrop look too, Andrew: "One, yes."
// Nothing of the engine is in this item: these are the screen's. This file runs the two halves - the page's stylesheet and the
// DOM the Orphanage's and the Cavern Trail's own logs raise (../viewer/tools/plates-banners-tooltip-gold-look.test.mjs), and the
// built BATTLE-SANDBOX.html measured in a real browser (../kingdom/tools/plates-banners-tooltip-gold-look.verify.mjs; given no
// folder it takes no screenshot). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

describe('the plates, the banners, the tooltip and the pop-up take the notices\' gold look', () => {
  it('the look is still written once, and the six kinds are written with the class that wears it', () => {
    const css = readFileSync('src/styles.css', 'utf8')
    expect(css.match(/\/\* NOTICE-LOOK \*\//g)!.length, 'no second style').toBe(1)
    expect(css.match(/#ffd45e/g)!.length, 'the notice\'s gold is written in one place').toBe(1)
    const board = readFileSync('src/board.js', 'utf8'), tip = readFileSync('src/hextip.js', 'utf8'), affl = readFileSync('src/affliction.js', 'utf8')
    for (const made of ["el('banner hbtNotice ' + kind", "el('dbPlate hbtNotice'", "'dbPlate hbtNotice ' + c.result", "el('injPlate hbtNotice'", "el('injPlate fly hbtNotice'"]) expect(board, made).toContain(made)
    expect(tip).toContain("tip.className = 'hbtNotice'"); expect(affl).toContain('<div id="afflBox" class="hbtNotice">')
  })
  it('the viewer page: a phase banner, a wave banner, a Deathbed plate, an injury plate, the hex tooltip and the affliction pop-up wear the look; places and timings as they were; the gear panel unchanged', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/plates-banners-tooltip-gold-look.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox, in a real browser: each of the six is gold outlined letters with nothing drawn behind the words, in its own place', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/plates-banners-tooltip-gold-look.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/plates-banners-tooltip-gold-look.verify.mjs', 'scratch/plates-banners-tooltip-gold-look.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/plates-banners-tooltip-gold-look: .*passed/); expect(out).not.toMatch(/screenshot/)
  }, 170000)
})
