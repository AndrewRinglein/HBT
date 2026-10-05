// viewer.ability-click-keeps-view (engine backlog; ruled 2026-10-05, Andrew, engine DECISIONS.md 'the battle screen must feel
// smooth: …' — asked "Should clicking an ability stop re-centring the view on your hero?": "3 yes"). Overturns 2026-10-01
// "Clicking an ability re-centers on the acting unit". A new Activation still centres on the unit that begins.
// Expect: "On the built page's Bridge, scrolled a screen away from the acting hero: clicking Chop on the bar chooses Chop and the
// view does not move; clicking the portrait brings the hero to the middle; clicking an enemy's card in the top bar brings that
// enemy to the middle and shows its panel; ending the Activation centres on the next hero as now; a page test reads each; the
// test that asserted the re-centring is changed, citing the ruling."
// The engine's side — nothing is asked of it: where the view stands is no command, and neither click sends one (the kingdom's
// half reads the engine's battle untouched). The viewer's half is ../viewer/tools/ability-click-keeps-view.test.mjs, on the page
// (VIEWER_PAGE) as the gate runs it; the kingdom's is ../kingdom/tools/ability-click-keeps-view.verify.mjs, on a sandbox built
// from these sources. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

describe('clicking an ability leaves the view where the player has it; the portrait and a card in the top bar centre it', () => {
  it('the bar\'s row no longer centres; the portrait takes the pointer', () => {
    const bar = readFileSync('src/actionbar.js', 'utf8')
    expect(bar.replace(/\/\*[\s\S]*?\*\//g, ''), 'the bar centres nothing').not.toMatch(/centreOn/)
    const css = readFileSync('src/styles.css', 'utf8'), rule = /#unitPortrait\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(rule).toMatch(/pointer-events:auto/); expect(rule).toMatch(/cursor:pointer/)
  })
  it('the viewer page, the Bridge\'s recording: scrolled away, an attack clicked on the bar is chosen and the view does not move; the portrait and an enemy\'s card centre; a new Activation centres as now', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/ability-click-keeps-view.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on a built BATTLE-SANDBOX.html (the Bridge, Chop) — and the engine\'s battle is untouched by choosing and looking', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/ability-click-keeps-view.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/ability-click-keeps-view.verify.mjs', 'scratch/ability-click-keeps-view.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/ability-click-keeps-view: .*passed/)
    for (const n of [1, 2, 3, 4]) expect(out, `step ${n}`).toMatch(new RegExp(`^  ${n} `, 'm'))
  }, 300000)
  it('the test that asserted the re-centring now asserts the view that stays, citing the ruling', () => {
    const src = readFileSync('tools/xcom-camera.test.mjs', 'utf8')
    expect(src).toMatch(/Law 10, 2026-10-05 \(viewer\.ability-click-keeps-view/); expect(src).toMatch(/"3 yes"/)
    expect(src).toMatch(/and the map does not move/)
  })
})
