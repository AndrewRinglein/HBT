// tool.tests-follow-what-changed (engine queue; Andrew, 2026-10-04, engine/DECISIONS.md 'the same for
// content and kingdom changes: each kind of change runs its own tests'). Kingdom's suite runs when
// kingdom's CODE changed — src/ without the generated items, test/, tools/ — and not when a
// regenerated file, a built page, a document or .state/ did. The gate's shard record is keyed on that
// code (engine/tools/code-stamp.mjs, the one definition), a record with no stamp is no pass, and a
// landing whose shards ran on the same code but another tree says SKIPPED, never PASS.
//
// The real gate, run in a scratch repository shaped like this package. Nothing here touches kingdom/.
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stampOf } from '../../engine/tools/code-stamp.mjs'

const GATE = fileURLToPath(new URL('../tools/gate.mjs', import.meta.url))
const LONG = 120_000   // child processes beside other workers' suites: the time limit is not the assertion

function scratch(): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'kgate-')), 'kingdom')
  const put = (f: string, text: string) => { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), text) }
  put('src/core/week.ts', 'export const week = 1\n')
  put('src/content/generated/items.ts', 'export const items = 1\n')
  put('test/week.test.ts', '// a test\n')
  put('tools/a-tool.mjs', '// a tool\n')
  put('SLICE.html', '<html></html>\n')
  put('CLAUDE.md', '# kingdom\n')
  put('.state/backlog.json', '[]\n')
  const git = (...a: string[]) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'fixture'); git('config', 'core.autocrlf', 'false')
  git('add', '-A'); git('commit', '-q', '-m', 'the package as it starts')
  return dir
}
const gate = (dir: string, ...args: string[]) => spawnSync(process.execPath, [GATE, ...args], { cwd: dir, encoding: 'utf8' })
const record = (dir: string, rec: unknown) => writeFileSync(join(dir, '.state', 'shards.json'), JSON.stringify(rec))

describe("kingdom's shards are recorded against kingdom's code", () => {
  it('four shards on this code are green; a record with a tree and no stamp is no pass', () => {
    const dir = scratch()
    const stamp = stampOf('kingdom', dir)
    expect(stamp).toMatch(/^[0-9a-f]{10}$/)
    record(dir, { stamp, tree: 'any', total: 4, passed: [1, 2, 3, 4] })
    const green = gate(dir, '--shards-green')
    expect(green.status, green.stdout + green.stderr).toBe(0)
    expect(green.stdout).toContain(`4 of 4 shards passed on kingdom code ${stamp}`)
    record(dir, { stamp, tree: 'any', total: 4, passed: [1, 2, 4] })
    const partial = gate(dir, '--shards-green')
    expect(partial.status).toBe(1)
    expect(partial.stdout).toContain('node tools/gate.mjs --shard 3/4')
    record(dir, { tree: 'b3f244e88b3694e21cc75d69e9e7605391f4525a', total: 4, passed: [1, 2, 3, 4] })   // as the gate wrote it before 2026-10-04
    expect(gate(dir, '--shards-green').status).toBe(1)
  }, LONG)

  it('a regenerated file, a built page, a document and .state/ do not make the pass stale; kingdom code does', () => {
    const dir = scratch()
    const stamp = stampOf('kingdom', dir)
    record(dir, { stamp, tree: 'any', total: 4, passed: [1, 2, 3, 4] })
    appendFileSync(join(dir, 'src/content/generated/items.ts'), 'export const more = 2\n')   // mk-items.mjs ran
    appendFileSync(join(dir, 'SLICE.html'), '<!-- rebuilt -->\n')
    appendFileSync(join(dir, 'CLAUDE.md'), 'a line\n')
    writeFileSync(join(dir, '.state', 'ledger.md'), 'a landing\n')
    expect(stampOf('kingdom', dir)).toBe(stamp)
    expect(gate(dir, '--shards-green').status).toBe(0)
    appendFileSync(join(dir, 'src/core/week.ts'), ' ')
    expect(stampOf('kingdom', dir)).not.toBe(stamp)
    const stale = gate(dir, '--shards-green')
    expect(stale.status).toBe(1)
    expect(stale.stdout).toContain('0 of 4 shards passed on kingdom code')
  }, LONG)

  it("a pass recorded in .state/passes.jsonl on this code — another copy's run, a merge-back — counts", () => {
    const dir = scratch()
    const stamp = stampOf('kingdom', dir)
    expect(gate(dir, '--shards-green').status).toBe(1)
    writeFileSync(join(dir, '.state', 'passes.jsonl'), JSON.stringify({ suite: 'kingdom', stamp, with: null, at: '2026-10-04T10:00:00.000Z', by: 'suites --run' }) + '\n')
    const green = gate(dir, '--shards-green')
    expect(green.status, green.stdout).toBe(0)
    expect(green.stdout).toContain(`kingdom's suite passed on kingdom code ${stamp}`)
    writeFileSync(join(dir, '.state', 'passes.jsonl'), JSON.stringify({ suite: 'kingdom', at: '2026-10-04T10:00:00.000Z' }) + '\n')   // no stamp: no pass
    expect(gate(dir, '--shards-green').status).toBe(1)
  }, LONG)
})

describe('a landing never reports PASS for a suite it did not run', () => {
  const src = readFileSync(GATE, 'utf8')
  it('the full-suite check says SKIPPED when the shards ran on the same code but another tree', () => {
    expect(src).toMatch(/skipped: true, note: `kingdom code \$\{code\} is unchanged since the four shards passed/)
    expect(src).toMatch(/r\.skipped \? 'SKIPPED'/)
  })
  it('a skipped check is logged skipped, with ok false (the engine\'s logCheck, not a copy)', () => {
    expect(src).toMatch(/checks: checks\.map\(logCheck\)/)
    expect(src).toMatch(/from '\.\.\/\.\.\/engine\/tools\/suites\.mjs'/)
  })
})
