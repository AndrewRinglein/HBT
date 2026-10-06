// viewer.plates-and-banners-sit-low (engine backlog; engine DECISIONS.md 2026-10-06 'the Deathbed notification and the others sit low,
// near the bottom of the screen'). Andrew: "The deathbed fighting notification and maybe other notifications are still happening
// too close to the center of the screen. Push it down closer to the bottom of the screen."
// No engine change: the fold's cues are what they were. Held here are the page's two halves: the page's own DOM
// (../viewer/tools/plates-and-banners-sit-low.test.mjs — each notification is put in the notices' one stack, a newcomer above
// the ones before it, with its words, its time and its look) and the built BATTLE-SANDBOX.html MEASURED in a real browser
// (../kingdom/tools/plates-and-banners-sit-low.verify.mjs — where on the screen each stands).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

describe('the Deathbed plate, the injury plates and the banners sit low, in the band above the action bar', () => {
  it('the viewer page: each is put in the notices\' stack, the newer above the older; its words, its time and its look are what they were', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/plates-and-banners-sit-low.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox, measured in Chrome at 1920 x 1080: each stands in the band just above the bar, below the middle third of the screen; two at once do not overlap; the hex tooltip is still at the pointer', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/plates-and-banners-sit-low.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/plates-and-banners-sit-low.verify.mjs', 'scratch/plates-and-banners-sit-low.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/plates-and-banners-sit-low: .*passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 420000)
})
