// proving.page (2026-09-05) — session 9's E8/E9. The dashboard is one generated
// file at the root; every number on it is a projection of ranking.json. This
// test builds it from the smoke plan in a scratch tree and checks what it
// embeds; the export-battle --plan form (E9) is checked to reproduce the very
// battle the rig measured.
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const engine = join(__dirname, '..')
// Windows cannot exec a .cmd directly. Run the resolved JS CLI with Node;
// every assertion below still exercises the real proving commands.
const tsx = createRequire(import.meta.url).resolve('tsx/cli')
const run = (args: string[]) => execFileSync(process.execPath, [tsx, ...args], { cwd: engine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })

describe('proving-page', () => {
  it('writes one self-contained page: the ranking embedded, every unit row, the panels, the findings, a script that parses', () => {
    const state = mkdtempSync(join(tmpdir(), 'proving-page-'))
    run(['src/cli/proving.ts', 'test/proving/smoke.json', '--out', state, '--force'])
    run(['tools/proving-rank.mts', '--state', state, '--no-doc'])
    const out = join(state, 'PROVING.html')
    run(['tools/proving-page.mts', '--state', state, '--out', out])
    const html = readFileSync(out, 'utf8')
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).not.toMatch(/src=["']http/)   // no network — double-click, no server
    const data = JSON.parse(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1]!)
    const ranking = JSON.parse(readFileSync(join(state, 'ranking.json'), 'utf8'))
    expect(data.units.map((u: { id: string }) => u.id)).toEqual(ranking.units.map((u: { id: string }) => u.id))
    expect(data.plans[0].file).toBe('test/proving/smoke.json')   // the command the page prints runs from engine/
    expect(html).toContain('id="units"'); expect(html).toContain('id="panels"'); expect(html).toContain('id="findings"')
    const js = /<script>\n([\s\S]*?)\n<\/script>\n<\/body>/.exec(html)![1]!
    const f = join(state, 'page.js'); writeFileSync(f, js)
    execFileSync(process.execPath, ['--check', f])
  })

  it('E9: export-battle --plan reproduces the pair the rig measured — same outcome, same turns, seed names the pair', () => {
    const state = mkdtempSync(join(tmpdir(), 'proving-export-'))
    run(['src/cli/proving.ts', 'test/proving/smoke.json', '--out', state, '--force'])
    const res = JSON.parse(readFileSync(join(state, 'proving.smoke', 'hero.base.paladin-shiney@f.codex-v-six.replace.hero.2.json'), 'utf8'))
    for (const [i, arm] of [[1, 'with'], [3, 'without']] as const) {
      const out = JSON.parse(run(['tools/export-battle.mts', '--plan', 'test/proving/smoke.json', '--subject', 'hero.base.paladin-shiney', '--slot', '2', '--rotation', 'replace', '--pair', String(i), '--arm', arm]))
      const pair = res.pairs[i]
      expect(out.seed).toMatchObject({ plan: 'proving.smoke', subject: 'hero.base.paladin-shiney', pair: i, arm, map: pair.map, replicate: pair.seed })
      expect(out.outcome).toBe(pair[arm].outcome)
      expect(out.turns).toBe(pair[arm].turns)
      expect(out.events.find((e: { type: string }) => e.type === 'map.loaded')['mapId']).toBe(pair.map)
    }
    const m = JSON.parse(run(['tools/export-battle.mts', '--plan', 'test/proving/smoke.json', '--matchup', 'm.mirror-gap-3', '--battle', '0']))
    expect(m.seed).toMatchObject({ plan: 'proving.smoke', matchup: 'm.mirror-gap-3', battle: 0 })
    expect(m.events.find((e: { type: string }) => e.type === 'map.loaded')['gap']).toBe(3)
  })
})
