// viewer.characters-stand-out (engine backlog; engine DECISIONS.md 2026-10-03 'the characters must stand out from the board: try
// 10% larger characters and 10% smaller hexes', corrected there to 30% larger). Andrew: "the characters don't stand out enough
// against the backdrop. They look a little too small on the screen. ... And what else can we do to make the characters stand out
// more? We have a very colorful background. Is that part of the problem? Do we need more shadows? I don't know what we need." ·
// "Actually, let's change this to 30% bigger characters, 10% smaller hexes." Looks to judge, each off unless the host names it.
// The engine's side: the battle the looks are shown on is its own Orphanage, heroes against enemies — the two sides the rim and
// the disc are coloured by. The viewer's half (../viewer/tools/characters-stand-out.test.mjs) asks the page and its modules that
// each look is exactly its own thing, on with its name and off without, and that the size look never shows white space; the
// kingdom's half (../kingdom/tools/characters-stand-out.verify.mjs) checks the review page's links and opens the BUILT battle
// page in a real browser with no look, with all five, and with a wrong name. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { ENCOUNTERS } from '../../engine/src/content/index.js'
import { MAPS } from '../../engine/src/content/maps.js'

describe('the characters stand out: five looks to judge, each on only when named', () => {
  it('the Orphanage is an engine encounter on its own 20 by 14 map', () => {
    const enc = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']
    expect(enc?.mapId).toBe('map.opening.orphanage')
    const m = MAPS.find((x) => x.id === enc.mapId) as any
    expect([m?.width ?? m?.board?.width, m?.height ?? m?.board?.height]).toEqual([20, 14])
  })
  it('the viewer page: no look is the page as it was; size shows the board at 0.9× with bodies 1.3× on the screen and no white space; shadows, ground, rim and disc are each their own', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/characters-stand-out.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    // Law 10 (viewer.size-and-shadows-default, engine DECISIONS.md 2026-10-03 'size and shadows are the default'): the page test
    // gained the default's own test — was /# pass 6/
    expect(out).toMatch(/# pass 7/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the kingdom: the review page links the Orphanage as today, with each look alone and with all together; the built battle page takes them from its link', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-stand-out.mjs', 'scratch/characters-stand-out.html'], { cwd: '../kingdom', stdio: 'pipe' })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/characters-stand-out-sandbox.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/characters-stand-out.verify.mjs', 'scratch/characters-stand-out.html', 'scratch/characters-stand-out-sandbox.html', 'scratch'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/characters-stand-out: .*passed/)
    // about a minute alone: three loads of the battle page in a real browser on software GL
  }, 280000)
})
