// viewer.opening-replays-refiled (engine backlog; filed as viewer.opening-replays with shape data and re-filed as plumbing, as every
// viewer item is - SWITCHES.md openingReplaysRefiled; engine DECISIONS.md 2026-10-03 'the opening battles are watchable as computer-played
// replays'). Andrew, asked whether the viewer is set up to replay the opening battles: "I want to be able to watch some of the
// replays of these initial battles." - and whether battles he played or the computer's: "Just the computer played recordings."
// Ruled: the replay library carries a computer-played recording of each of the opening's six battles (the engine plays both
// sides; export-battle.mts), current with the engine. The engine's side: the six are its own scenarios, one per opening
// position, and each library file is that scenario's export on one recorded seed - the row's name is the encounter's, the
// order the opening's. That each still re-exports byte for byte is `node tools/gate.mjs --fresh` in ../viewer, run at
// landing (not here: a suite test that re-exported would turn red on every later engine fact). The viewer's half
// (../viewer/tools/opening-replays.test.mjs): the page's dropdown lists the six by name in order, and each plays from start
// to finish with no unknown event. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { SCENARIOS } from '../../engine/src/content/scenarios.js'
import { ENCOUNTERS } from '../../engine/src/content/index.js'

type Row = { file: string, label: string, seed?: number }
const library: Row[] = JSON.parse(readFileSync('../viewer/battles/library.json', 'utf8')).battles
const battle = (file: string) => JSON.parse(readFileSync('../viewer/battles/' + file, 'utf8'))
/* the opening's battles as the engine fields them: one scenario per opening position, in position order */
const opening = Object.values(SCENARIOS as Record<string, any>).filter((s) => s.openingPosition).sort((a, b) => a.openingPosition - b.openingPosition)
const ids = new Set(opening.map((s) => s.id))
const rows = library.map((row, i) => ({ ...row, i, battle: battle(row.file) })).filter((r) => ids.has(r.battle.seed.scenarioId))

describe('the opening battles are watchable as computer-played replays', () => {
  it('the engine fields the opening as six battles, positions 1 to 6, each its own encounter', () => {
    expect(opening.map((s) => s.openingPosition)).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(opening.map((s) => s.encounterId)).size).toBe(6)
  })
  it('the library carries one recording of each, together, in the opening\'s order, under the encounter\'s name', () => {
    expect(rows.map((r) => r.battle.seed.scenarioId)).toEqual(opening.map((s) => s.id))
    expect(rows.map((r) => r.label)).toEqual(opening.map((s) => (ENCOUNTERS as Record<string, any>)[s.encounterId].name))
    expect(rows.map((r) => r.i)).toEqual(rows.map((_, k) => rows[0]!.i + k))
  })
  it('each row records its one seed, and it is the seed the file was exported on', () => {
    expect(rows).toHaveLength(6)
    for (const r of rows) { expect(Number.isInteger(r.seed), r.file).toBe(true); expect(r.battle.seed.replicate, r.file).toBe(r.seed) }
  })
  it('each file is the engine\'s export of that encounter, whole, and all six come from one engine', () => {
    expect(rows).toHaveLength(6)
    for (const r of rows) {
      const s = opening.find((o) => o.id === r.battle.seed.scenarioId)!
      expect(r.battle.seed.encounter.id, r.file).toBe(s.encounterId)
      expect(r.battle.events.find((e: any) => e.type === 'map.loaded').mapId, r.file).toBe(s.mapId)
      const end = r.battle.events.at(-1)
      expect(end.type, r.file).toBe('battle.end'); expect(end.outcome, r.file).toBe(r.battle.outcome)
    }
    expect(new Set(rows.map((r) => r.battle.engineCommit)).size).toBe(1)
  })
  it('the viewer page: the dropdown lists the six by name in order, and each plays from start to finish with no unknown event', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/opening-replays.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 8/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
