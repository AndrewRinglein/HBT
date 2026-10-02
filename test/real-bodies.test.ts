// viewer.real-bodies (engine backlog; DECISIONS.md 2026-10-01 'the camera redesigned on the caravan preview; ... what is queued
// after it', Andrew: "I said we could use placeholders, but don't we have more 3D things we can use? ... the idea is to rig this
// up."). The engine's side: the opening's six encounters and the caravan field the unit types the viewer's pack must bind or list
// (the content's encounter rows). The viewer's half (../viewer/tools/real-bodies.test.mjs) reads the pack against the records
// that own each body and stands the new bodies up from their files. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

describe('every hero and enemy of the opening and the caravan stands in its own body, or is listed', () => {
  it('the opening and the caravan field the Bloodhound and the cast the viewer binds', () => {
    const raw = JSON.parse(readFileSync('../content/gen/encounters.json', 'utf8'))
    const rows = (Array.isArray(raw) ? raw : raw.encounters ?? Object.values(raw)).flat()
      .filter((e: any) => /^encounter\.(opening\.|caravan-aftermath$)/.test(e?.id || ''))
    const types = new Set(rows.flatMap((e: any) => JSON.stringify(e).match(/"unit\.[a-z0-9.-]+"/g) || []).map((s: string) => s.slice(1, -1)))
    expect(rows.length).toBeGreaterThanOrEqual(7)
    expect(types.has('unit.bloodhound')).toBe(true)
  })
  it('the viewer: bound or listed, never both; each hero in its own body or its placeholder saying what it lacks; the new bodies stand up from their files', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/real-bodies.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
