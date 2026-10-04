// viewer.area-fall-warning (engine backlog; engine DECISIONS.md 2026-10-03 'the opening replays show the heroes winning; one
// recording of each; the fall warnings are drawn': asked whether to file a viewer item that draws the meteor and curse warning
// areas on the board — Andrew: "Two, yes."). The engine's side — nothing of it changes: its fall (encounter.area-fall) marks
// its areas at the end of an Enemy Phase (area.marked: fall, lands, areas, layer) and lands them after the next Hero Phase
// (area.landed: areas, hit, layer). Held here against the engine's own rows and its own recordings: the Cavern Trail's meteor
// fall and the Gates' curse strike each mark seven areas of seven hexes, to land the Turn after, leaving the row's layer.
// The viewer's half (../viewer/tools/area-fall-warning.test.mjs) folds both events and draws the marked hexes from the mark
// until they land; the sandbox's half (../kingdom/tools/area-fall-warning.verify.mjs) plays the built BATTLE-SANDBOX.html to
// the mark and reads the board against the engine's own marked areas. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { ENCOUNTERS } from '../../engine/src/content/index.js'
import { engineVocabulary } from '../../engine/src/core/vocabulary.js'

type E = { type: string; turn: number; phase: string; fall?: string; lands?: number; areas?: number[][]; layer?: string; hit?: number[] }
const BATTLES = [['encounter.opening.cavern-trail', 'test.opening-cavern-trail'], ['encounter.opening.gates', 'test.opening-gates']] as const

describe('the fall warnings are drawn: the areas a fall marks, from the mark until they land', () => {
  it('the engine: both events are in its vocabulary, and each opening battle\'s row carries its fall', () => {
    const events = engineVocabulary().events
    expect(events).toEqual(expect.arrayContaining(['area.marked', 'area.landed']))
    for (const [id] of BATTLES) { const falls = (ENCOUNTERS as Record<string, { falls?: readonly { id: string; turn: number; areas: number; layer: string }[] }>)[id]!.falls ?? []
      expect(falls.length).toBe(1); expect(falls[0]!.areas).toBe(7) }
  })
  it('the engine\'s recordings: seven areas of seven hexes are marked at the end of an Enemy Phase and land after the next Hero Phase, on the same hexes', () => {
    for (const [id, file] of BATTLES) {
      const row = (ENCOUNTERS as Record<string, { falls?: readonly { id: string; turn: number; areas: number; layer: string }[] }>)[id]!.falls![0]!
      const EV: E[] = JSON.parse(readFileSync(`../viewer/battles/${file}.json`, 'utf8')).events
      const mark = EV.findIndex((e) => e.type === 'area.marked'), land = EV.findIndex((e) => e.type === 'area.landed')
      expect(mark).toBeGreaterThan(0); expect(land).toBeGreaterThan(mark)
      const M = EV[mark]!, L = EV[land]!
      expect(M).toMatchObject({ fall: row.id, turn: row.turn, phase: 'enemy', lands: row.turn + 1, layer: row.layer })
      expect(M.areas!.length).toBe(7); for (const a of M.areas!) expect(a.length).toBe(7)
      expect(L).toMatchObject({ fall: row.id, turn: M.lands, phase: 'hero', layer: row.layer }); expect(L.areas).toEqual(M.areas)
      /* what lands is painted on exactly the marked hexes, in the lines that follow */
      const painted: number[] = []
      for (let i = land + 1; EV[i] && EV[i]!.type === 'layer.painted'; i++) painted.push((EV[i] as unknown as { hex: number }).hex)
      expect([...painted].sort((a, b) => a - b)).toEqual([...new Set(M.areas!.flat())].sort((a, b) => a - b))
    }
  })
  it('the viewer page: the marked areas are folded and drawn from the mark until they land; the log says both; a seek equals a step', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/area-fall-warning.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 8/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: on the built BATTLE-SANDBOX.html (the Cavern Trail, the heroes idle) the marks on the board are the engine\'s marked hexes until they land', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/area-fall-warning.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/area-fall-warning.verify.mjs', 'scratch/area-fall-warning.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/area-fall-warning: .*passed/)
  }, 170000)
})
