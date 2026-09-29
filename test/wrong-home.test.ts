// tool.wrong-home-audit (2026-09-28; DECISIONS.md "the opening is tested with the player's party …
// the prior-art audit also finds what the engine holds that belongs elsewhere"): Andrew, "…or that
// the engine had something that was supposed to be somewhere else and we need to remove it from the
// engine." The removal list, the ruled exception, and the gate's verdict.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadContext, removalList, scanEngineFile, newFindings, wrongHomeVerdict as verdict, namesEngineRule, describeFinding, markdown, readRules } from '../tools/wrong-home.mjs'

const ctx = loadContext()
const list = removalList(undefined, ctx)

describe('tool.wrong-home-audit — today\'s tree', () => {
  it('lists the hand-typed content rows with file, line and owner', () => {
    const drake = list.find((x) => x.id === 'attack.drake.snap')!
    expect([drake.what, drake.file, drake.owner]).toEqual(['Codex row typed in the engine', 'engine/src/content/index.ts', "the Codex's attack rows — no row yet"])
    expect(drake.line).toBeGreaterThan(0)
  })
  it('lists a content name the engine\'s logic reads, with its Codex row (the review\'s E6)', () => {
    const p = list.find((x) => x.id === 'status.protection' && x.file === 'engine/src/core/ability.ts')!
    expect(p.what).toBe('content name in engine logic')
    expect(p.owner).toMatch(/^content\/settled\.json\.statuses\[\d+\]$/)
  })
  it('leaves the ruled ground table off the list, and never lists the engine\'s own names', () => {
    expect(readRules().ruledEngine.map((e) => e.path)).toContain('engine/src/content/terrain.ts')
    expect(list.filter((x) => x.file === 'engine/src/content/terrain.ts')).toEqual([])
    // the ground table typed as a content row would be listed anywhere else
    const row = "export const T = { 'prop.crates': { moveCost: 1 } }\n"
    expect(scanEngineFile('engine/src/content/terrain.ts', row, ctx)).toEqual([])
    expect(scanEngineFile('engine/src/content/maps.ts', row, ctx).map((x) => x.what)).toEqual(['Codex row typed in the engine'])
    // an event type and an effect kind share a family's word, and are the engine's
    expect(scanEngineFile('engine/src/core/x.ts', "const S = { 'attack.declared': { n: 1 }, 'badge.grant': { n: 2 } }\n", ctx)).toEqual([])
  })
  it('the markdown names every finding', () => {
    const md = markdown(list)
    for (const x of list) expect(md).toContain(`\`${x.file}:${x.line}\``)
  })
})

describe('tool.wrong-home-audit — a scratch item', () => {
  const path = 'engine/src/content/scenarios.ts'
  const before = "export const S = { 'test.x': { id: 'test.x', enemies: ['unit.zombie'], replicate: 0 } }\n"
  const after = "export const S = { 'test.x': { id: 'test.x', enemies: ['unit.zombie'], replicate: 0, override: { unit: 'unit.zombie', maxHp: 12 } } }\n"
  const fresh = newFindings(scanEngineFile(path, before, ctx), scanEngineFile(path, after, ctx))
  it("typing a Codex unit's health into scenarios.ts is flagged", () => {
    expect(fresh.map(describeFinding)).toEqual([`Codex value typed beside its id: unit.zombie (maxHp: 12) — ${path}:1 — owner: ${ctx.codex.ids.get('unit.zombie')}`])
    const v = verdict({ spec: 'Zombies are sturdier in the test.' }, fresh)
    expect([v.ok, v.review]).toEqual([false, true])
    expect(v.note).toMatch(/no "Engine rule:" line in the spec: lands for review/)
  })
  it('an engine rule with its ruling named lands normally', () => {
    const rule = 'export const LOW_COVER_ACCURACY = 20\n'
    expect(newFindings(scanEngineFile('engine/src/core/pipeline.ts', '', ctx), scanEngineFile('engine/src/core/pipeline.ts', rule, ctx))).toEqual([])
    expect(verdict({ spec: 'x' }, [])).toEqual({ ok: true, note: 'nothing another package owns' })
    const named = verdict({ spec: 'Engine rule: DECISIONS.md 2026-09-24, low cover is -20 to hit.' }, fresh)
    expect([named.ok, named.review]).toEqual([false, false])
    expect([namesEngineRule({ spec: 'engine rule: x' }), namesEngineRule({ spec: 'an engine rule' })]).toEqual([true, false])
  })
  it('a moved finding is not new; a second copy is', () => {
    const one = scanEngineFile(path, after, ctx)
    expect(newFindings(one, scanEngineFile(path, `\n\n${after}`, ctx))).toEqual([])
    expect(newFindings(one, scanEngineFile(path, `${after}export const T = { unit: 'unit.zombie', armor: 3 }\n`, ctx))).toHaveLength(1)
  })
  it('a campaign quantity and a display colour are listed; the engine\'s own text renderer may colour', () => {
    const src = "export const R = { tier: 2, xp: 5 }\nexport const C = '#ff8800'\n"
    expect(scanEngineFile('engine/src/core/r.ts', src, ctx).map((x) => x.what)).toEqual(['kingdom fact', 'viewer display fact'])
    expect(scanEngineFile('engine/src/view/r.ts', src, ctx).map((x) => x.what)).toEqual(['kingdom fact'])
  })
})

describe('tool.wrong-home-audit — the generated list is current', () => {
  it('generated/wrong-home.json lists what the tree holds (line numbers may drift; run node tools/wrong-home.mjs --write)', () => {
    const disk = JSON.parse(readFileSync(new URL('../generated/wrong-home.json', import.meta.url), 'utf8')).findings as { file: string; what: string; id: string }[]
    const key = (x: { file: string; what: string; id: string }) => `${x.file} ${x.what} ${x.id}`
    expect(disk.map(key).sort()).toEqual(list.map(key).sort())
  })
})
