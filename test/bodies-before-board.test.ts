// viewer.bodies-before-board (DECISIONS.md 2026-09-30 "the civilians are played; no 2D before the 3D bodies"). Andrew:
// "two-dimensional images of other heroes are loading before the 3D images are loading. You still have some kind of
// legacy 2D other things loading". Expect: "Opening BATTLE-SANDBOX.html?play=encounter.opening.orphanage no 2D hero,
// enemy or civilian picture appears at any moment: the loading line, then the 3D map with every body standing." The
// engine's side: every unit battle 1 fields has a 3D body bound in the viewer's pack. The viewer's half
// (../viewer/tools/bodies-before-board.test.mjs) runs against the committed viewer page. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { ENCOUNTERS } from '../../engine/src/content/index.js'

describe('no 2D before the 3D bodies', () => {
  it('every unit battle 1 fields has a body in the viewer\'s pack', () => {
    const pack = JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }))
    const enc = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']
    const types = [...new Set([...enc.setup, ...(enc.schedule ?? []).flatMap((s: any) => s.spawn ?? [])].map((f: any) => f.unit))]
    for (const t of types) expect(pack[t], t).toBeDefined()
  }, 60000)
  it('the viewer page: no token while a body loads; the board opens when the bodies are in; a failed body keeps its token', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bodies-before-board.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 2/); expect(out).toMatch(/# fail 0/)
  }, 120000)
})
