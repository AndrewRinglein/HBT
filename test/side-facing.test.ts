// viewer.side-facing (engine backlog; DECISIONS.md 2026-10-01 'the first look at the XCOM camera, the weapons and the bodies',
// Andrew: "The enemies should be facing to the left, and the heroes should be facing to the right."). The engine's side: the
// Orphanage deploys the heroes west and the enemies east (map.loaded's deploy), so "right" is toward the enemy. The viewer's
// half (../viewer/tools/side-facing.test.mjs) reads each body's facing off the body itself. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

describe('heroes face right, enemies left', () => {
  it('the Orphanage deploys the heroes west and the enemies east', () => {
    const b = JSON.parse(readFileSync('../viewer/battles/test.opening-orphanage.json', 'utf8')) as { events: any[] }
    const ml = b.events.find((e) => e.type === 'map.loaded')
    expect([ml.deploy?.hero, ml.deploy?.enemy]).toEqual(['west', 'east'])
  })
  it('the viewer: every body faces its side\'s way at rest, toward its target when it strikes, and back again', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/side-facing.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 1/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
