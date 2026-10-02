// Generator failures must never publish partial content, and candidate checks
// must exercise the candidate kits rather than whatever the live module cached.
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const generator = resolve('tools/mk-items.mjs')
const combos = resolve('../content/gen/tier3-combinations.json')
const live = resolve('src/content/generated')
const names = ['items.ts', 'items-gaps.json', 'kits.ts', 'kits-gaps.json']
const dirs: string[] = []
const bytes = (dir: string) => Object.fromEntries(names.map((name) => [name, readFileSync(join(dir, name), 'utf8')]))
const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kingdom-item-generation-'))
  dirs.push(dir)
  // Even the pre-fix generator writes only into this disposable working tree.
  const published = join(dir, 'src/content/generated')
  mkdirSync(published, { recursive: true })
  for (const name of names) writeFileSync(join(published, name), `sentinel: ${name}\n`)
  const codex = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8'))
  const source = join(dir, 'codex.json')
  const out = join(dir, 'candidate')
  const run = () => {
    writeFileSync(source, JSON.stringify(codex))
    return spawnSync(process.execPath, [generator, '--codex', source, '--combos', combos, '--out-dir', out], { cwd: dir, encoding: 'utf8' })
  }
  return { dir, published, codex, out, run }
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

describe('item generation isolation', () => {
  it('writes all four artifacts only to the candidate directory, deterministically', () => {
    const t = setup()
    const before = bytes(t.published), liveBefore = bytes(live)
    const first = t.run()
    expect(first.status, first.stderr).toBe(0)
    expect(readdirSync(t.out).sort()).toEqual([...names].sort())
    const candidate = bytes(t.out)
    expect(t.run().status).toBe(0)
    expect(bytes(t.out)).toEqual(candidate)
    expect(bytes(t.published)).toEqual(before)
    expect(bytes(live)).toEqual(liveBefore)
  })

  /* Law 10, 2026-10-02 (kingdom.reads-engine, review finding K15): a hero's kit is its engine row's defaultItems, read
     through the door — the generator no longer publishes kits, so a candidate codex cannot remove one. What the
     candidate still decides is the pinned-kit report, and that is checked from the candidate, not the live module. */
  it('reports pinned kit specs from the candidate codex, including a newly pinned pool kit', () => {
    const t = setup()
    const hero = t.codex.heroes.heroes.find((h: { id: string }) => h.id === 'hero.base.ranger-aggressive')
    hero.kit = { pinned: ['item.longbow'] }
    const result = t.run()
    expect(result.status, result.stderr).toBe(0)
    const gaps = JSON.parse(readFileSync(join(t.out, 'kits-gaps.json'), 'utf8'))
    expect(gaps.pinnedSpecs).toContain(hero.id)
  })

  /* Law 10, 2026-10-02 (kingdom.reads-engine, K2 K15): the generator no longer checks kit items (the kit is the engine
     row's); it refuses a set payload naming no engine stat — the same claim: a refusal replaces nothing. */
  it('validates every set payload before replacing any output; failure preserves live and candidate bytes', () => {
    const t = setup()
    mkdirSync(t.out)
    for (const name of names) writeFileSync(join(t.out, name), `candidate sentinel: ${name}\n`)
    const before = bytes(t.published), liveBefore = bytes(live), candidateBefore = bytes(t.out)
    t.codex.items.at(-1).setBonus = { tag: 'no-such-set', each: { 'no-such-stat': 1 } }
    const result = t.run()
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no-such-stat')
    expect(bytes(t.published)).toEqual(before)
    expect(bytes(t.out)).toEqual(candidateBefore)
    expect(bytes(live)).toEqual(liveBefore)
  })
})
