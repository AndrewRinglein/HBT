// proving.rank (2026-09-05) — session 9's E7. The rank rollup reads every plan's
// rollup.json and writes ranking.json (one row per unit, tagged by ladder, with
// the dashboard's columns) and PROVING-RESULTS.md (generated). It runs no battle
// and decides nothing; this test runs the smoke plan into a scratch tree and
// ranks it there, so the real .state/proving is never touched.
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const engine = join(__dirname, '..')
const tsx = join(engine, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
const run = (args: string[]) => execFileSync(tsx, args, { cwd: engine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

describe('proving-rank', () => {
  it('ranks the smoke plan: one row per unit subject, ladders, the columns, the findings, the document', () => {
    const state = mkdtempSync(join(tmpdir(), 'proving-rank-'))
    run(['src/cli/proving.ts', 'test/proving/smoke.json', '--out', state, '--force'])
    const doc = join(state, 'RESULTS.md')
    const out = run(['tools/proving-rank.mts', '--state', state, '--doc', doc])
    expect(out).toMatch(/proving-rank: \d+ units across 1 plans/)
    const ranking = JSON.parse(readFileSync(join(state, 'ranking.json'), 'utf8'))
    expect(ranking.plans.map((p: { id: string }) => p.id)).toEqual(['proving.smoke'])
    expect(ranking.plans[0].switches).toEqual({ mirrorSideRules: 'row' })
    // units only: replace/add subjects — the equip and the grow are later passes
    const ids = ranking.units.map((u: { id: string; rotation: string }) => `${u.id}/${u.rotation}`)
    expect(ids).toContain('test-arc-golem/replace'); expect(ids).toContain('unit.ghoul/replace'); expect(ids).toContain('hero.base.paladin-shiney/replace')
    expect(ids.some((x: string) => x.startsWith('item.halberd'))).toBe(false)
    expect(ids.some((x: string) => x.includes('@l5'))).toBe(false)
    for (const u of ranking.units) {
      for (const k of ['name', 'kind', 'side', 'ladder', 'flips', 'valid', 'invalid', 'flipRatePermille', 'winsWith', 'controlWins', 'swing', 'tempo', 'presence', 'detail', 'findings', 'current']) expect(u, k).toHaveProperty(k)
      expect(u.detail.length).toBe(u.pairs)
      expect(Number.isInteger(u.swing)).toBe(true)
    }
    // sorted: Power = wins WITH (re-ruled 2026-09-05: "based on the victory rate"), then swing, then id (Law 6)
    for (let i = 1; i < ranking.units.length; i++) {
      const a = ranking.units[i - 1], b = ranking.units[i]
      expect(a.winsWith > b.winsWith || (a.winsWith === b.winsWith && (a.swing > b.swing || (a.swing === b.swing && a.id <= b.id)))).toBe(true)
    }
    // the unfieldable subject is a finding, never a number
    const nobody = ranking.units.find((u: { id: string }) => u.id === 'unit.nobody')
    expect(nobody.valid).toBe(0)
    expect(nobody.findings[0]).toMatch(/INVALID on every pair/)
    expect(ranking.findings.some((f: string) => f.startsWith('unit.nobody'))).toBe(true)
    // kinds read off the pack
    expect(ranking.units.find((u: { id: string }) => u.id === 'unit.ghoul').kind).toBe('enemy')
    expect(ranking.units.find((u: { id: string }) => u.id === 'hero.base.paladin-shiney').kind).toBe('hero')
    expect(ranking.units.find((u: { id: string }) => u.id === 'hero.base.paladin-shiney').class).toBe('paladin')
    // the document
    expect(existsSync(doc)).toBe(true)
    const md = readFileSync(doc, 'utf8')
    expect(md).toMatch(/^# The Proving — results \(generated\)/)
    expect(md).toContain('## Enemy ladder')
    expect(md).toContain('## Findings (written by the rollup)')
    expect(md).toContain('unit.nobody')
  })
})
