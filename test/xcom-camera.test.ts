// viewer.xcom-camera (engine backlog; DECISIONS.md 2026-10-01 'the XCOM-style camera'). Andrew: "I want to fully replace the
// camera with an XCOM-style camera. So no tilt, no free rotation." · "the most important things are the camera and the
// movements" ('the order'). The engine's side: the queue walks the heroes the engine lets begin, civilians among them — the
// Orphanage fields civilians on the hero side. The viewer's half (../viewer/tools/xcom-camera.test.mjs: the wheel's spring,
// the edge scroll, the centring, the portrait, the End buttons, the double-click, the see-through) and the fixed angle and
// quarter turns (../viewer/tools/true-3d-camera.test.mjs) run against the page; the queue is the kingdom's
// (kingdom/test/xcom-queue.test.ts). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS } from '../../engine/src/content/index.js'

const run = (file: string) => execFileSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })

describe('the XCOM-style camera', () => {
  it('the Orphanage fields civilians on the hero side: the character bar the queue walks includes them', () => {
    const enc = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']
    const fielded = [...enc.setup, ...enc.schedule.flatMap((s: any) => s.spawn)]
    expect(fielded.some((f: any) => f.civilian)).toBe(true)
  })
  it('the viewer page: spring-back zoom, edge scroll, centring, portrait, End buttons, double-click, see-through', () => {
    const out = run('tools/xcom-camera.test.mjs')
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the viewer page: one fixed angle, quarter turns by the arrow keys, no Reset', () => {
    const out = run('tools/true-3d-camera.test.mjs')
    expect(out).toMatch(/# fail 0/)
  }, 170000)
})
