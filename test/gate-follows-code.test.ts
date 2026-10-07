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
    // a later run on the same code that FAILED takes the pass away
    appendFileSync(join(dir, '.state', 'passes.jsonl'), JSON.stringify({ suite: 'kingdom', stamp, failed: true, at: '2026-10-04T11:00:00.000Z', by: 'gate --shard 2/4' }) + '\n')
    expect(gate(dir, '--shards-green').status).toBe(1)
    writeFileSync(join(dir, '.state', 'passes.jsonl'), JSON.stringify({ suite: 'kingdom', at: '2026-10-04T10:00:00.000Z' }) + '\n')   // no stamp: no pass
    expect(gate(dir, '--shards-green').status).toBe(1)
  }, LONG)
})

describe('a landing never reports PASS for a suite it did not run', () => {
  const src = readFileSync(GATE, 'utf8')
  // Law 10, 2026-10-06 — tool.landing-on-the-quick-check (engine queue; engine/DECISIONS.md 'the one plan: land on the quick
  // check, run the whole suites twice a day, four streams and one lander', decided by the home chat on Andrew's word: "Decide
  // what keeps the checks that matter and removes the things that don't."; the item: "the engine gate's and the kingdom
  // gate's suite line … say when the last scheduled run was and what it found, and refuse only when no scheduled run is
  // recorded in the last day"). This test was named 'the full-suite check says SKIPPED when the shards ran on the same code
  // but another tree' and its first line asserted
  //   expect(src).toMatch(/skipped: true, note: `kingdom code \$\{code\} is unchanged since the four shards passed/)
  // — the check then FAILED a landing whose code had no pass at all. It no longer asks for a pass on the code: unless the
  // four shards passed on this exact tree it says SKIPPED with the last scheduled run, whatever the code (the describe below).
  it('the suite check says SKIPPED, with the last scheduled run, whenever the shards did not pass on this exact tree', () => {
    expect(src).toMatch(/return \{ skipped: true, note: `kingdom's suite is not run at a landing — \$\{whole\.said\}/)
    expect(src).not.toMatch(/is unchanged since the four shards passed/)
    expect(src).toMatch(/r\.skipped \? 'SKIPPED'/)
  })
  it('a skipped check is logged skipped, with ok false (the engine\'s logCheck, not a copy)', () => {
    expect(src).toMatch(/checks: checks\.map\(logCheck\)/)
    expect(src).toMatch(/from '\.\.\/\.\.\/engine\/tools\/suites\.mjs'/)
  })
})

// tool.landing-on-the-quick-check (2026-10-06, the note above). The real gate, on a scratch package whose item passes
// nothing else here (there is no compiler in a scratch folder): only the suite line is read.
describe("a landing says what the last scheduled run found, and fails for the suites only when none is recorded in the last day", () => {
  const SUITES = "the whole suites — a scheduled run in the last day"
  const item = (dir: string) => writeFileSync(join(dir, '.state', 'backlog.json'), JSON.stringify([{ id: 'tool.a-thing', kind: 'kingdom', shape: 'plumbing', spec: 'A thing.', expect: 'It does it.', unreachable: 'a tooling item: it closes no criterion of the slice' }]))
  /** A scheduled run, as engine/tools/suites.mjs records one: a line in each of the four packages' passes.jsonl, all dated by when it started. */
  const scheduled = (dir: string, hoursAgo: number, failed: string[] = []) => {
    const at = new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
    for (const suite of ['engine', 'content', 'viewer', 'kingdom']) {
      const state = join(dirname(dir), suite, '.state')
      mkdirSync(state, { recursive: true })
      appendFileSync(join(state, 'passes.jsonl'), JSON.stringify({ suite, stamp: '0123456789', at, by: 'suites --run --full', in: 'main', scheduled: at, ...(failed.includes(suite) ? { failed: true, failing: [{ name: 'test/a.test.ts > x', timedOut: false }] } : {}) }) + '\n')
    }
  }
  const line = (out: string) => out.split('\n').find((l) => l.includes(SUITES)) ?? ''

  it('none recorded: a check says so and that a landing will refuse; a landing FAILS on it, naming the run to make', () => {
    const dir = scratch()
    item(dir)
    expect(line(gate(dir, 'tool.a-thing').stdout)).toMatch(/^  SKIPPED  the whole suites — a scheduled run in the last day  — kingdom's suite is not run at a landing — no scheduled run of the whole suites is recorded — none in the last 24 hours: a landing \(--land\) refuses until the lander has run it$/)
    expect(line(gate(dir, 'tool.a-thing', '--land').stdout)).toMatch(/^  FAIL  the whole suites — a scheduled run in the last day  — no scheduled run of the whole suites is recorded — none in the last 24 hours\. The lander runs the whole suites, alone on the machine, from engine\/: node tools\/suites\.mjs --run all --full — then land again$/)
  }, LONG)

  it('one under a day old — though kingdom code has no pass of its own, and the run found a failure: SKIPPED with what it found, at a check and at a landing', () => {
    const dir = scratch()
    item(dir)
    scheduled(dir, 4, ['engine'])
    expect(gate(dir, '--shards-green').status).toBe(1)   // what a landing asked for until 2026-10-06
    for (const args of [['tool.a-thing'], ['tool.a-thing', '--land']]) {
      expect(line(gate(dir, ...args).stdout)).toMatch(/^  SKIPPED  the whole suites — a scheduled run in the last day  — kingdom's suite is not run at a landing — the last scheduled run of the whole suites: \d{4}-\d\d-\d\d \d\d:\d\d, in main — content PASS · kingdom PASS · engine FAIL \(test\/a\.test\.ts > x\) · viewer PASS$/)
    }
  }, LONG)

  it('one over a day old: a landing fails on it, and the old run is named', () => {
    const dir = scratch()
    item(dir)
    scheduled(dir, 30)
    expect(line(gate(dir, 'tool.a-thing', '--land').stdout)).toMatch(/^  FAIL  the whole suites — a scheduled run in the last day  — the last scheduled run of the whole suites: .* — 30 hours ago, over 24 — none in the last 24 hours\./)
  }, LONG)

  it("four shards that passed on this exact tree are still said, beside the scheduled run: they ran, and they are kingdom's alone", () => {
    const dir = scratch()
    item(dir)
    // the tree the gate judges: everything `git add -A` would commit, less .state/ (tools/gate.mjs treeHash)
    const env = { ...process.env, GIT_INDEX_FILE: join(mkdtempSync(join(tmpdir(), 'kidx-')), 'index') }
    const g = (...a: string[]) => execFileSync('git', a, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    g('add', '-A', '--', '.', ':!.state'); g('rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', '.state')
    const tree = g('write-tree').trim()
    record(dir, { stamp: stampOf('kingdom', dir), tree, total: 4, passed: [1, 2, 3, 4], at: new Date().toISOString() })
    scheduled(dir, 4)
    expect(line(gate(dir, 'tool.a-thing', '--land').stdout)).toMatch(/^  SKIPPED  the whole suites — a scheduled run in the last day  — kingdom's suite is not run at a landing — the last scheduled run of the whole suites: .* · viewer PASS \(kingdom's own 4 shards did pass on this exact tree, kingdom code [0-9a-f]{10}\)$/)
    // the same shards, another tree (a document moved): they are not said of this tree
    appendFileSync(join(dir, 'CLAUDE.md'), 'a line\n')
    expect(line(gate(dir, 'tool.a-thing', '--land').stdout)).toMatch(/ · viewer PASS$/)
  }, LONG)
})
