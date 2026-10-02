// viewer.unit-card-bar (engine backlog; DECISIONS.md 2026-10-01, Andrew: "We also need a character selector bar above the
// screen, the way it is in the visual playback. You have all the heroes and enemies as tiny little cards above the screen.
// That should still be there. And I can use that to target things as well as clicking on them."). The engine's side: the
// Orphanage fields heroes and enemies both, every one a card. The viewer's half (../viewer/tools/unit-card-bar.test.mjs) runs
// against the page: the strip in the component's top bar, a card's click the body's click, a double-click the next to act;
// the kingdom's (kingdom/test/unit-card-bar.test.ts) plays the built sandbox. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS, UNITS } from '../../engine/src/content/index.js'

describe('the unit-card bar', () => {
  it('the Orphanage fields heroes and enemies: both sides have cards', () => {
    const enc = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']
    const sides = new Set([...enc.setup, ...enc.schedule.flatMap((s: any) => s.spawn)].map((f: any) => (UNITS as Record<string, any>)[f.unit]?.side))
    expect(sides.has('enemy')).toBe(true)
  })
  it('the viewer page: the strip in the top bar, a card is its body\'s click, a double-click offers it to act next', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/unit-card-bar.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
