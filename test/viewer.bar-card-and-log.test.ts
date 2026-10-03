// viewer.bar-card-and-log (engine backlog; engine DECISIONS.md 2026-10-03 'the hero card sits small, left of the action bar; the log
// collapses behind a button out of the way'). Andrew: "This small hero card should be smaller, and it should be to the left of the
// move. We need to move the move, the powers, and the attacks a little bit more to the right, make them more condensed, and put that
// hero card to the left. Also, collapse and put an expandable log button somewhere out of the way, not on the screen." The engine's
// side: the Orphanage is the battle the expect plays. The viewer's half (../viewer/tools/bar-card-and-log.test.mjs) asks the page:
// the card in the bar's row before the bar, smaller and no taller than it, the columns and stamina strip right of it, the log
// collapsed at mount and opened and closed by its button in the top bar, over the panel, never the board; the sandbox's half
// (../kingdom/tools/bar-card-and-log.verify.mjs) measures the expect line on the built BATTLE-SANDBOX.html in a real browser at
// 1920 x 1080. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { MAPS } from '../../engine/src/content/maps.js'

describe('the hero card sits small, left of the action bar; the log collapses behind a button', () => {
  it('the Orphanage is a 20 by 14 board', () => {
    const m = MAPS.find((x) => x.id === 'map.opening.orphanage') as any
    expect([m?.width ?? m?.board?.width, m?.height ?? m?.board?.height]).toEqual([20, 14])
  })
  it('the viewer page: the card in the bar\'s row, smaller, no taller than the bar; the columns right of it; the log collapsed, its button opens and closes it', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bar-card-and-log.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, measured on the built BATTLE-SANDBOX.html (the Orphanage) at 1920 x 1080', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/bar-card-and-log.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/bar-card-and-log.verify.mjs', 'scratch/bar-card-and-log.html', 'scratch/bar-card-and-log.png'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/bar-card-and-log: .*passed/)
  }, 170000)
})
