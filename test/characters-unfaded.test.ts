// viewer.characters-unfaded (engine backlog; DECISIONS.md 2026-10-01, Andrew: "these characters are faded, like they're
// ghost-like, because there are other competing things. The characters are the stars. They should not be faded, especially
// not one that's selected."). The engine's side: the battles Andrew plays field bodies on painted 3D scenes (the Orphanage's
// map is a painted scene the viewer binds). The viewer's half (../viewer/tools/characters-unfaded.test.mjs) asks the page and
// the 3D driver for the layering: the bodies' own canvas above the board's marks, the floats above it, the scene's depth
// first, the subject's key light. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { MAPS } from '../../engine/src/content/maps.js'

describe('the characters, unfaded', () => {
  it('the Orphanage is an engine map the viewer draws in 3D', () => {
    expect(MAPS.some((m) => m.id === 'map.opening.orphanage')).toBe(true)
  })
  it('the viewer page: the bodies over the marks, the floats over the bodies, depth first, the subject lit', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/characters-unfaded.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
