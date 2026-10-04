// tool.tests-follow-what-changed (Andrew, 2026-10-04, DECISIONS.md 'combat is tested only when the
// engine changed; a visual change does not re-run the fights' and 'the same for content and kingdom
// changes: each kind of change runs its own tests'). A package's tests run when that package's own
// code changed, and not otherwise; a suite that passed on the same code is not run again; a skipped
// suite is said to be skipped, never passed; everything together still runs once per chat, and
// wrap refuses without it.
//
// Every test here builds a scratch copy of the folder's shape — a root repository and the four
// packages, each its own git repository — with the REAL tools copied in (tools/code-stamp.mjs,
// tools/suites.mjs, tools/wrap.mjs and what they import, the root's tools/combine.mjs) and stub
// suites that only write down that they ran. Nothing here runs a tool on the real folder.
import { beforeAll, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TOOLS = fileURLToPath(new URL('../tools/', import.meta.url))
const ROOT_TOOLS = fileURLToPath(new URL('../../tools/', import.meta.url))
const LONG = 240_000   // child processes under three workers' load: a time limit is not the assertion

const sh = (cwd: string, cmd: string, ...args: string[]) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const git = (cwd: string, ...args: string[]) => sh(cwd, 'git', ...args).trim()
const put = (file: string, text: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text) }

/** A stub suite: it appends its name and arguments (and, when FIXTURE_WORKERS is set, its vitest worker cap) to FIXTURE_RAN, and fails when FIXTURE_FAIL names it. */
const stub = (name: string) => `import { appendFileSync } from 'node:fs'
if (process.env.FIXTURE_RAN) appendFileSync(process.env.FIXTURE_RAN, '${name} ' + process.argv.slice(2).join(' ') + (process.env.FIXTURE_WORKERS ? ' workers=' + (process.env.VITEST_MAX_WORKERS ?? 'unset') : '') + '\\n')
process.exit((process.env.FIXTURE_FAIL ?? '').split(',').includes('${name}') ? 1 : 0)
`

interface Fixture { main: string; ran: string; env: Record<string, string> }

/** The folder's shape, in a scratch directory: root + engine, content, viewer, kingdom, all committed. */
function makeFolder(): Fixture {
  const base = mkdtempSync(join(tmpdir(), 'follow-'))
  const main = join(base, 'main'), ran = join(base, 'ran.log')
  // root
  put(join(main, '.gitignore'), 'engine/\ncontent/\nviewer/\nkingdom/\n')
  put(join(main, 'STATE.md'), 'where the project is\n')
  cpSync(join(ROOT_TOOLS, 'combine.mjs'), join(main, 'tools', 'combine.mjs'))
  // engine: its real tools (the top-level files), then the stubs over the two that run a suite
  const engine = join(main, 'engine')
  mkdirSync(join(engine, 'tools'), { recursive: true })
  for (const f of readdirSync(TOOLS)) if (/\.(mjs|mts|json)$/.test(f)) cpSync(join(TOOLS, f), join(engine, 'tools', f))
  put(join(engine, 'tools', 'gate.mjs'), stub('engine'))
  put(join(engine, 'tools', 'engine-modules.mjs'), 'export {}\n')
  put(join(engine, 'node_modules', 'vitest', 'vitest.mjs'), stub('kingdom'))
  put(join(engine, '.gitignore'), 'node_modules/\n')
  put(join(engine, '.gitattributes'), '.state/passes.jsonl merge=union\n')
  put(join(engine, 'src', 'core', 'battle.ts'), 'export const a = 1\n')
  put(join(engine, 'src', 'content', 'generated', 'pack.ts'), 'export const pack = 1\n')
  put(join(engine, 'test', 'a.test.ts'), '// a test\n')
  put(join(engine, 'package.json'), '{}\n')
  put(join(engine, 'DECISIONS.md'), '# rulings\n')
  put(join(engine, '.state', 'baseline.hash'), 'bridge aaaaaaaa\nfield bbbbbbbb\n')
  put(join(engine, '.state', 'backlog.engine.json'), '[]\n')
  // content
  const content = join(main, 'content')
  put(join(content, 'gen', 'weapons.json'), '[]\n')
  put(join(content, 'settled.json'), '{}\n')
  put(join(content, 'assemble.mjs'), '// the pipeline\n')
  put(join(content, 'hbt-content.json'), '{}\n')
  put(join(content, 'test', 'a.test.mjs'), `import { appendFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert'
test('content', () => { if (process.env.FIXTURE_RAN) appendFileSync(process.env.FIXTURE_RAN, 'content\\n'); assert.ok(!(process.env.FIXTURE_FAIL ?? '').split(',').includes('content')) })
`)
  put(join(content, '.gitattributes'), '.state/passes.jsonl merge=union\n')
  // viewer
  const viewer = join(main, 'viewer')
  put(join(viewer, 'src', 'fold.js'), 'export const fold = 1\n')
  put(join(viewer, 'tools', 'gate.mjs'), stub('viewer'))
  put(join(viewer, 'generated', 'static.json'), '{}\n')
  put(join(viewer, 'BATTLE-VIEWER.html'), '<html></html>\n')
  put(join(viewer, 'CLAUDE.md'), '# viewer\n')
  put(join(viewer, '.gitattributes'), '.state/passes.jsonl merge=union\n')
  // kingdom
  const kingdom = join(main, 'kingdom')
  put(join(kingdom, 'src', 'core', 'week.ts'), 'export const week = 1\n')
  put(join(kingdom, 'src', 'content', 'generated', 'items.ts'), 'export const items = 1\n')
  put(join(kingdom, 'test', 'k.test.ts'), '// a test\n')
  put(join(kingdom, 'SLICE.html'), '<html></html>\n')
  put(join(kingdom, '.gitattributes'), '.state/passes.jsonl merge=union\n')
  for (const r of ['.', 'engine', 'content', 'viewer', 'kingdom']) {
    const dir = join(main, r)
    git(dir, 'init', '-q', '-b', 'master')
    git(dir, 'config', 'user.email', 'fixture@example.invalid'); git(dir, 'config', 'user.name', 'fixture')
    git(dir, 'config', 'core.autocrlf', 'false')
    git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'the folder as it starts')
  }
  return { main, ran, env: { FIXTURE_RAN: ran } }
}
const commitAll = (dir: string, msg: string) => { git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', msg) }
const node = (cwd: string, env: Record<string, string>, ...args: string[]) =>
  spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
const suites = (f: Fixture, ...args: string[]) => node(join(f.main, 'engine'), f.env, 'tools/suites.mjs', ...args)
const ranLines = (f: Fixture) => (existsSync(f.ran) ? readFileSync(f.ran, 'utf8').split('\n').filter(Boolean) : [])
const ranSuites = (f: Fixture) => [...new Set(ranLines(f).map((l) => l.split(' ')[0]))].sort()
const clearRan = (f: Fixture) => writeFileSync(f.ran, '')
interface PlanRow { suite: string; run: boolean; reason: string; stamp: string }
interface Plan { stamps: Record<string, string>; suites: PlanRow[]; golden: { action: string; reason: string } }
const planOf = (f: Fixture, ...flags: string[]): Plan => {
  const r = suites(f, '--plan', '--json', ...flags)
  expect(r.status, r.stderr + r.stdout).toBe(0)
  return JSON.parse(r.stdout) as Plan
}
const runs = (p: Plan) => p.suites.filter((s) => s.run).map((s) => s.suite).sort()
/** A folder on which everything passed together once: the four suites and the control battles, recorded and committed. */
async function testedFolder(): Promise<Fixture> {
  const f = makeFolder()
  const full = suites(f, '--run', 'all', '--full')
  expect(full.status, full.stdout + full.stderr).toBe(0)
  const { recordControl } = await import('../tools/suites.mjs')
  recordControl(join(f.main, 'engine'), { by: 'the fixture', moved: null })
  for (const r of ['engine', 'content', 'viewer', 'kingdom']) commitAll(join(f.main, r), 'the pass records')
  clearRan(f)
  return f
}

describe("one definition of 'this package's code' per package", () => {
  it('a stamp is ten hex characters, and the same files give the same stamp in another copy', async () => {
    const { stampOf, allStamps, PACKAGES } = await import('../tools/code-stamp.mjs')
    const f = makeFolder()
    expect(PACKAGES).toEqual(['engine', 'content', 'viewer', 'kingdom'])
    const s = allStamps(f.main)
    for (const p of PACKAGES) expect(s[p], p).toMatch(/^[0-9a-f]{10}$/)
    const copy = join(dirname(f.main), 'copy-engine')
    git(dirname(f.main), 'clone', '-q', join(f.main, 'engine'), copy)
    expect(stampOf('engine', copy)).toBe(s.engine)
  }, LONG)

  it('a document, a ruling, .state/, a log line and a regenerated file change no stamp', async () => {
    const { allStamps } = await import('../tools/code-stamp.mjs')
    const f = makeFolder()
    const before = allStamps(f.main)
    appendFileSync(join(f.main, 'engine', 'DECISIONS.md'), '\n## a ruling\n')
    put(join(f.main, 'engine', '.state', 'now.json'), '{}\n')
    put(join(f.main, 'engine', 'tools', 'a-run.log'), 'a log line\n')
    appendFileSync(join(f.main, 'engine', 'src', 'content', 'generated', 'pack.ts'), 'export const more = 2\n')   // the content pack
    appendFileSync(join(f.main, 'content', 'hbt-content.json'), '\n')                                             // content's built output
    appendFileSync(join(f.main, 'viewer', 'generated', 'static.json'), '\n')                                      // the viewer's dump
    appendFileSync(join(f.main, 'viewer', 'BATTLE-VIEWER.html'), '<!-- rebuilt -->\n')                            // a built page
    appendFileSync(join(f.main, 'viewer', 'CLAUDE.md'), 'a line\n')
    appendFileSync(join(f.main, 'kingdom', 'src', 'content', 'generated', 'items.ts'), 'export const more = 2\n') // kingdom's generated items
    appendFileSync(join(f.main, 'kingdom', 'SLICE.html'), '<!-- rebuilt -->\n')
    expect(allStamps(f.main)).toEqual(before)
  }, LONG)

  it("each package's own code moves its own stamp and no other", async () => {
    const { allStamps } = await import('../tools/code-stamp.mjs')
    const f = makeFolder()
    const before = allStamps(f.main)
    const moved = (b: Record<string, string>, a: Record<string, string>) => Object.keys(b).filter((k) => a[k] !== b[k])
    appendFileSync(join(f.main, 'engine', 'src', 'core', 'battle.ts'), ' ')
    const e = allStamps(f.main); expect(moved(before, e)).toEqual(['engine'])
    appendFileSync(join(f.main, 'content', 'gen', 'weapons.json'), ' ')
    const c = allStamps(f.main); expect(moved(e, c)).toEqual(['content'])
    appendFileSync(join(f.main, 'viewer', 'src', 'fold.js'), ' ')
    const v = allStamps(f.main); expect(moved(c, v)).toEqual(['viewer'])
    appendFileSync(join(f.main, 'kingdom', 'src', 'core', 'week.ts'), ' ')
    expect(moved(v, allStamps(f.main))).toEqual(['kingdom'])
    // a new, uncommitted test file is the package's code too
    const k = allStamps(f.main)
    put(join(f.main, 'kingdom', 'test', 'new.test.ts'), '// new\n')
    expect(moved(k, allStamps(f.main))).toEqual(['kingdom'])
  }, LONG)

  it("content's generated outputs are the publisher's list, not a second one typed here", async () => {
    const { PACKAGE_CODE } = await import('../tools/code-stamp.mjs')
    const publish = readFileSync(fileURLToPath(new URL('../../content/publish.mjs', import.meta.url)), 'utf8')
    const outputs = [...publish.slice(publish.indexOf('OUTPUTS'), publish.indexOf(']);')).matchAll(/'content\/([^']+)'/g)].map((m) => m[1]!)
    expect(outputs.length).toBeGreaterThan(3)
    // every output the publisher writes inside content/ is either outside content's code or named as not code
    const code = PACKAGE_CODE.content!
    for (const o of outputs) {
      const inside = code.code.some((c: string) => o === c || o.startsWith(c + '/') || (c.startsWith(':(glob)') && new RegExp('^' + c.slice(7).replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$').test(o)))
      if (inside) expect(code.not, `${o} is generated, so it is not content's code`).toContain(o)
    }
  })
})

describe('a pass names the stamp of the code it ran on', () => {
  it('a recorded pass is found by suite and stamp; a record with no stamp is no pass', async () => {
    const { parsePasses, hasPass } = await import('../tools/suites.mjs')
    const passes = parsePasses([
      JSON.stringify({ suite: 'engine', stamp: 'aaaaaaaaaa', at: '2026-10-04T10:00:00Z', by: 'gate --shard 1/1' }),
      JSON.stringify({ suite: 'engine', at: '2026-10-04T11:00:00Z' }),                        // an older tool's record: no stamp
      JSON.stringify({ suite: 'kingdom', stamp: 'unknown', at: '2026-10-04T11:00:00Z' }),     // git could not say
      'not json',
      '',
    ].join('\n'))
    expect(passes).toHaveLength(1)
    expect(hasPass(passes, 'engine', 'aaaaaaaaaa')).toMatchObject({ by: 'gate --shard 1/1' })
    expect(hasPass(passes, 'engine', 'bbbbbbbbbb')).toBeNull()
    expect(hasPass(passes, 'kingdom', 'unknown')).toBeNull()
    expect(hasPass(passes, 'viewer', 'aaaaaaaaaa')).toBeNull()
    // a pass counts only while it is the latest run on that code — by when it ran, whatever order a merge left the lines in
    const later = [{ suite: 'engine', stamp: 'aaaaaaaaaa', failed: true, at: '2026-10-04T12:00:00Z' }, ...passes]
    expect(hasPass(later, 'engine', 'aaaaaaaaaa')).toBeNull()
    expect(hasPass([...later, { suite: 'engine', stamp: 'aaaaaaaaaa', at: '2026-10-04T13:00:00Z', by: 'again' }], 'engine', 'aaaaaaaaaa')).toMatchObject({ by: 'again' })
  })

  it("the engine's old shard record (a tree, no stamp) is no pass for --shards-green's key", async () => {
    const { shardsFor } = await import('../tools/suites.mjs')
    expect(shardsFor({ tree: 'fe94da49c9', sets: { 1: [1] } }, 'aaaaaaaaaa')).toBeNull()
    expect(shardsFor({ stamp: 'bbbbbbbbbb', sets: { 1: [1] } }, 'aaaaaaaaaa')).toBeNull()
    expect(shardsFor({ stamp: 'aaaaaaaaaa', tree: 't', sets: { 1: [1] } }, 'aaaaaaaaaa')).toMatchObject({ sets: { 1: [1] } })
  })

  it('a suite run records its pass with the four stamps it ran with; a failed run records nothing', async () => {
    const { readPasses, hasPass } = await import('../tools/suites.mjs')
    const { allStamps } = await import('../tools/code-stamp.mjs')
    const f = makeFolder()
    const bad = node(join(f.main, 'engine'), { ...f.env, FIXTURE_FAIL: 'viewer' }, 'tools/suites.mjs', '--run', 'viewer')
    expect(bad.status).toBe(1)
    expect(bad.stdout).toMatch(/FAIL\s+the viewer's whole gate/)
    const stamps = allStamps(f.main)
    // the failure is written down — as a failure, never as a pass
    expect(readPasses(join(f.main, 'viewer'))).toMatchObject([{ suite: 'viewer', stamp: stamps.viewer, failed: true }])
    expect(hasPass(readPasses(join(f.main, 'viewer')), 'viewer', stamps.viewer!)).toBeNull()
    const ok = suites(f, '--run', 'viewer')
    expect(ok.status, ok.stdout + ok.stderr).toBe(0)
    expect(readPasses(join(f.main, 'viewer')).at(-1)).toMatchObject({ suite: 'viewer', stamp: stamps.viewer, with: stamps, in: 'main' })
    expect(hasPass(readPasses(join(f.main, 'viewer')), 'viewer', stamps.viewer!)).not.toBeNull()
    // …and a failure after a pass, on the same code, takes the pass away: the suite runs again
    expect(planOf(f).suites.find((s) => s.suite === 'viewer')).toMatchObject({ run: false })
    expect(node(join(f.main, 'engine'), { ...f.env, FIXTURE_FAIL: 'viewer' }, 'tools/suites.mjs', '--run', 'viewer').status).toBe(1)
    const after = planOf(f).suites.find((s) => s.suite === 'viewer')!
    expect(after.run).toBe(true)
    expect(after.reason).toMatch(/viewer's last run on its code [0-9a-f]{10} FAILED/)
  }, LONG)
})

describe('what a change runs', () => {
  let f: Fixture
  beforeAll(async () => { f = await testedFolder() }, LONG)

  it('a tree that differs from the last pass only in a document or .state/ runs nothing and satisfies wrap\'s check', () => {
    appendFileSync(join(f.main, 'engine', 'DECISIONS.md'), '\n## 2026-10-04 — a ruling\n')
    put(join(f.main, 'engine', '.state', 'ledger.md'), 'a landing\n')
    appendFileSync(join(f.main, 'kingdom', 'SLICE.html'), '<!-- rebuilt -->\n')
    const p = planOf(f)
    expect(runs(p)).toEqual([])
    expect(p.golden.action).toBe('skip')
    for (const s of p.suites) expect(s.reason).toMatch(/unchanged since .* passed/)
    const all = suites(f, '--run', 'all')
    expect(all.status, all.stdout + all.stderr).toBe(0)
    expect(ranLines(f)).toEqual([])
    expect(all.stdout.match(/^\s*SKIPPED /gm)?.length).toBe(4)
    expect(all.stdout).not.toMatch(/^\s*PASS /m)
    const green = suites(f, '--full-green')
    expect(green.status, green.stdout).toBe(0)
    for (const r of ['engine', 'kingdom']) git(join(f.main, r), 'checkout', '-q', '--', '.')
  }, LONG)

  it('a one-character change under engine src/core runs the engine suite and the control battles', async () => {
    appendFileSync(join(f.main, 'engine', 'src', 'core', 'battle.ts'), ' ')
    const p = planOf(f)
    expect(runs(p)).toEqual(['engine'])
    expect(p.golden.action).toBe('run')
    const all = suites(f, '--run', 'all')
    expect(all.status, all.stdout + all.stderr).toBe(0)
    expect(ranLines(f)).toEqual(['engine --shard 1/1'])
    expect(all.stdout.match(/^\s*SKIPPED /gm)?.length).toBe(3)
    // the landing's check runs the control battles: nothing is recorded for this engine code
    const { controlCheck } = await import('../tools/suites.mjs')
    let ran = 0
    const r = controlCheck({ engineDir: join(f.main, 'engine'), item: {}, baseline: () => { ran++; return 'bridge aaaaaaaa\nfield bbbbbbbb' } })
    expect(ran).toBe(1)
    expect(r).toMatchObject({ ok: true })
    expect(r.skipped).toBeFalsy()
    clearRan(f); git(join(f.main, 'engine'), 'checkout', '-q', '--', 'src')
  }, LONG)

  it("a pack-only change runs content's suite, re-records the golden and does not start the engine suite, the viewer's gate or kingdom's suite", async () => {
    appendFileSync(join(f.main, 'content', 'gen', 'weapons.json'), ' ')                                         // the row that changed
    appendFileSync(join(f.main, 'engine', 'src', 'content', 'generated', 'pack.ts'), 'export const more = 2\n')  // the pack shipped from it
    const p = planOf(f)
    expect(runs(p)).toEqual(['content'])
    expect(p.golden.action).toBe('re-record')
    const all = suites(f, '--run', 'all')
    expect(all.status, all.stdout + all.stderr).toBe(0)
    // content's suite, then the engine gate's --pack-golden (the stub here) — and no --shard, no viewer gate, no kingdom quarter
    expect(ranLines(f)).toEqual(['content', 'engine --pack-golden'])
    expect(all.stdout).toMatch(/^\s*GOLDEN\s+the control-battle golden — re-recorded for the new content pack/m)
    expect(all.stdout.match(/^\s*SKIPPED /gm)?.length).toBe(3)
    // what --pack-golden does: re-record the golden and say whether the fights moved; it never fails the content item
    const { packGolden, readPasses, controlCheck } = await import('../tools/suites.mjs')
    const engine = join(f.main, 'engine')
    const said = packGolden({ engineDir: engine, baseline: () => 'bridge cccccccc\nfield bbbbbbbb' })
    expect(said).toMatchObject({ action: 're-record', moved: 'bridge aaaaaaaa->cccccccc' })
    expect(said.said).toMatch(/the fights moved: bridge aaaaaaaa->cccccccc/)
    expect(readFileSync(join(engine, '.state', 'baseline.hash'), 'utf8')).toBe('bridge cccccccc\nfield bbbbbbbb\n')
    expect(readPasses(engine).at(-1)).toMatchObject({ suite: 'control', moved: 'bridge aaaaaaaa->cccccccc' })
    // …and the next landing finds the golden true for this code and this pack: the control battles are skipped, said so
    const next = controlCheck({ engineDir: engine, item: {}, baseline: () => { throw new Error('the control battles ran') } })
    expect(next).toMatchObject({ skipped: true })
    expect(next.ok).toBeFalsy()
    expect(planOf(f).golden.action).toBe('skip')
    clearRan(f)
    for (const r of ['engine', 'content']) { git(join(f.main, r), 'checkout', '-q', '--', '.') }
  }, LONG)

  it("a kingdom-only change runs kingdom's suite alone", () => {
    appendFileSync(join(f.main, 'kingdom', 'src', 'core', 'week.ts'), ' ')
    expect(runs(planOf(f))).toEqual(['kingdom'])
    const all = suites(f, '--run', 'all')
    expect(all.status, all.stdout + all.stderr).toBe(0)
    expect(ranSuites(f)).toEqual(['kingdom'])
    expect(ranLines(f).map((l) => l.match(/--shard=(\d\/4)/)?.[1])).toEqual(['1/4', '2/4', '3/4', '4/4'])   // in four quarters, as combine ran it
    // each quarter on four vitest workers, so its child-process tests keep their 5 s beside other workers' suites — unless the caller's environment says otherwise
    clearRan(f)
    expect(node(join(f.main, 'engine'), { ...f.env, FIXTURE_WORKERS: '1' }, 'tools/suites.mjs', '--run', 'kingdom').status).toBe(0)
    expect(ranLines(f).every((l) => l.endsWith(' workers=4')), ranLines(f).join(' | ')).toBe(true)
    clearRan(f)
    expect(node(join(f.main, 'engine'), { ...f.env, FIXTURE_WORKERS: '1', VITEST_MAX_WORKERS: '2' }, 'tools/suites.mjs', '--run', 'kingdom').status).toBe(0)
    expect(ranLines(f).every((l) => l.endsWith(' workers=2')), ranLines(f).join(' | ')).toBe(true)
    clearRan(f); git(join(f.main, 'kingdom'), 'checkout', '-q', '--', 'src')
  }, LONG)

  it("a viewer-only change runs the viewer's gate alone", () => {
    appendFileSync(join(f.main, 'viewer', 'src', 'fold.js'), ' ')
    expect(runs(planOf(f))).toEqual(['viewer'])
    const all = suites(f, '--run', 'all')
    expect(all.status, all.stdout + all.stderr).toBe(0)
    expect(ranSuites(f)).toEqual(['viewer'])
    clearRan(f); git(join(f.main, 'viewer'), 'checkout', '-q', '--', 'src')
  }, LONG)

  it('--full runs all four, whatever is recorded', () => {
    const p = planOf(f, '--full')
    expect(runs(p)).toEqual(['content', 'engine', 'kingdom', 'viewer'])
  }, LONG)
})

describe('the control battles at a landing', () => {
  const golden = 'bridge aaaaaaaa\nfield bbbbbbbb'
  it('engine code changed: they run, and every verdict is what it was before', async () => {
    const { controlCheck } = await import('../tools/suites.mjs')
    const f = makeFolder()   // nothing recorded: the control battles have never passed on this code
    const engine = join(f.main, 'engine')
    expect(controlCheck({ engineDir: engine, item: {}, baseline: () => golden })).toMatchObject({ ok: true })
    const leaked = controlCheck({ engineDir: engine, item: {}, baseline: () => 'bridge cccccccc\nfield bbbbbbbb' })
    expect(leaked.ok).toBe(false)
    expect(leaked.note).toMatch(/CHANGED: bridge aaaaaaaa->cccccccc\. Something leaked/)
    const declared = controlCheck({ engineDir: engine, item: { changesBaseline: true }, baseline: () => 'bridge cccccccc\nfield bbbbbbbb' })
    expect(declared).toMatchObject({ ok: true, golden: 'bridge cccccccc\nfield bbbbbbbb\n' })
    const noConsequence = controlCheck({ engineDir: engine, item: { changesBaseline: true }, baseline: () => golden })
    expect(noConsequence.ok).toBe(false)
    expect(noConsequence.note).toMatch(/declared changesBaseline — but every control battle is byte-identical/)
    expect(controlCheck({ engineDir: engine, item: {}, baseline: () => '' }).ok).toBe(false)
  }, LONG)

  it('nothing a battle is made of changed: SKIPPED with the reason, never ok', async () => {
    const { controlCheck, recordControl } = await import('../tools/suites.mjs')
    const f = makeFolder()
    const engine = join(f.main, 'engine')
    recordControl(engine, { by: 'the fixture', moved: null })
    appendFileSync(join(f.main, 'viewer', 'src', 'fold.js'), ' ')   // a visual change
    appendFileSync(join(engine, 'DECISIONS.md'), 'a ruling\n')
    const r = controlCheck({ engineDir: engine, item: {}, baseline: () => { throw new Error('the control battles ran') } })
    expect(r.skipped).toBe(true)
    expect(r.ok).toBeFalsy()
    expect(r.note).toMatch(/engine code [0-9a-f]{10} and the content pack are the ones the control battles last passed on/)
  }, LONG)

  it('a pack-only change at a landing re-records instead of failing, and still refuses a declared change with no consequence', async () => {
    const { controlCheck, recordControl, packGolden } = await import('../tools/suites.mjs')
    const f = makeFolder()
    const engine = join(f.main, 'engine')
    recordControl(engine, { by: 'the fixture', moved: null })
    appendFileSync(join(engine, 'src', 'content', 'generated', 'pack.ts'), 'export const more = 2\n')
    const moved = controlCheck({ engineDir: engine, item: {}, baseline: () => 'bridge cccccccc\nfield bbbbbbbb' })
    expect(moved).toMatchObject({ ok: true, golden: 'bridge cccccccc\nfield bbbbbbbb\n' })
    expect(moved.note).toMatch(/the fights moved: bridge aaaaaaaa->cccccccc/)
    const same = controlCheck({ engineDir: engine, item: {}, baseline: () => golden })
    expect(same).toMatchObject({ ok: true })
    expect(same.note).toMatch(/the fights did not move/)
    expect(controlCheck({ engineDir: engine, item: { changesBaseline: true }, baseline: () => golden }).ok).toBe(false)
    // engine code changed as well: shipping the pack does NOT re-record — the engine item's landing judges the battles
    appendFileSync(join(engine, 'src', 'core', 'battle.ts'), ' ')
    const refused = packGolden({ engineDir: engine, baseline: () => { throw new Error('the control battles ran') } })
    expect(refused.action).toBe('run')
    expect(refused.said).toMatch(/NOT RE-RECORDED/)
    expect(readFileSync(join(engine, '.state', 'baseline.hash'), 'utf8')).toBe(golden + '\n')
  }, LONG)
})

describe('combine runs what the worker changed, and says what it skipped', () => {
  let f: Fixture, worker: string
  const combine = (...args: string[]) => node(f.main, f.env, 'tools/combine.mjs', worker, ...args)
  beforeAll(async () => {
    f = await testedFolder()
    worker = join(dirname(f.main), 'worker')
    mkdirSync(worker)
    for (const r of ['.', 'engine', 'content', 'viewer', 'kingdom']) {
      git(dirname(f.main), 'clone', '-q', join(f.main, r), join(worker, r))
      git(join(worker, r), 'config', 'user.email', 'worker@example.invalid'); git(join(worker, r), 'config', 'user.name', 'worker')
      // the clone keeps git's own line-ending setting (on this PC the two real folders differ too: one checks
      // out CRLF, one LF). A stamp is over git's blobs, so the same code is the same stamp in both.
    }
    put(join(worker, 'engine', 'node_modules', 'vitest', 'vitest.mjs'), stub('kingdom'))
  }, LONG)

  it("a worker that brought only kingdom code: kingdom's suite alone, and the three it skipped and why", () => {
    appendFileSync(join(worker, 'kingdom', 'src', 'core', 'week.ts'), 'export const more = 2\n')
    commitAll(join(worker, 'kingdom'), 'kingdom.an-item: a kingdom change')
    const r = combine()
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(ranSuites(f)).toEqual(['kingdom'])
    expect(ranLines(f)).toHaveLength(4)
    for (const s of ["content's suite", "the engine's whole suite", "the viewer's whole gate"]) {
      expect(r.stdout).toMatch(new RegExp(`SKIPPED\\s+${s} — .* code [0-9a-f]{10} unchanged since .* passed`))
    }
    // each skip names the recorded pass it relied on: the stamp, when, by what command, in which copy, and the file that holds it
    expect(r.stdout).toMatch(/SKIPPED\s+content's suite — content code [0-9a-f]{10} unchanged since its suite passed \(\d{4}-\d\d-\d\d \d\d:\d\d, suites --run --full, in main; content\/\.state\/passes\.jsonl\)/)
    expect(r.stdout).toMatch(/PASS\s+kingdom's suite/)
    expect(r.stdout).not.toMatch(/PASS\s+(content's suite|the engine's whole suite|the viewer's whole gate)/)
    expect(r.stdout).toMatch(/COMBINED/)
    // this folder now holds the worker's commit, and the record of the pass it was tested by
    expect(git(join(f.main, 'kingdom'), 'rev-parse', 'HEAD')).toBe(git(join(worker, 'kingdom'), 'rev-parse', 'HEAD'))
    expect(git(join(f.main, 'kingdom'), 'status', '--porcelain')).toBe('')
    const kingdomPasses = readFileSync(join(f.main, 'kingdom', '.state', 'passes.jsonl'), 'utf8').trim().split('\n')
    expect(kingdomPasses).toHaveLength(2)
    // the pass combine recorded ran in the WORKER's copy, and says so; it reached this folder only through the merge
    expect(JSON.parse(kingdomPasses[1]!)).toMatchObject({ suite: 'kingdom', in: 'worker', by: 'suites --run' })
    // …but the four have not passed together on this code: wrap's check is not satisfied
    expect(suites(f, '--full-green').status).toBe(1)
    clearRan(f)
  }, LONG)

  it('a failing suite stops the merge-back and this folder is not changed', () => {
    appendFileSync(join(worker, 'viewer', 'src', 'fold.js'), 'export const more = 2\n')
    commitAll(join(worker, 'viewer'), 'viewer.an-item: a viewer change')
    const before = git(join(f.main, 'viewer'), 'rev-parse', 'HEAD')
    const r = node(f.main, { ...f.env, FIXTURE_FAIL: 'viewer' }, 'tools/combine.mjs', worker)
    expect(r.status).toBe(1)
    expect(r.stdout).toMatch(/FAIL\s+the viewer's whole gate/)
    expect(r.stderr).toMatch(/This folder was not changed/)
    expect(git(join(f.main, 'viewer'), 'rev-parse', 'HEAD')).toBe(before)
    expect(ranSuites(f)).toEqual(['viewer'])
    clearRan(f)
  }, LONG)

  it('combine --full runs all four, and then wrap\'s check is satisfied', () => {
    const r = combine('--full')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(ranSuites(f)).toEqual(['content', 'engine', 'kingdom', 'viewer'])
    expect(r.stdout).not.toMatch(/SKIPPED/)
    expect(r.stdout.match(/^\s*PASS /gm)?.length).toBeGreaterThanOrEqual(4)
    expect(git(join(f.main, 'viewer'), 'rev-parse', 'HEAD')).toBe(git(join(worker, 'viewer'), 'rev-parse', 'HEAD'))
    expect(suites(f, '--full-green').status).toBe(0)
    clearRan(f)
    // nothing new to bring and nothing changed: --full still runs all four (the once-per-chat run), plain combine runs none
    const again = combine('--full')
    expect(again.status, again.stdout + again.stderr).toBe(0)
    expect(ranSuites(f)).toEqual(['content', 'engine', 'kingdom', 'viewer'])
    clearRan(f)
    const plain = combine()
    expect(plain.status).toBe(0)
    expect(plain.stdout).toMatch(/Nothing to combine/)
    expect(ranLines(f)).toEqual([])
  }, LONG)
})

describe('wrap refuses without a full run', () => {
  const WRAP = ['tools/wrap.mjs', 'an item — an epic. Tried: it. Next: the next.', '--next', 'New chat with Heroes of Blight and Tragic — engine: the next item', 'start engine']
  it('four suites that never passed together: refused, naming the run that satisfies it; nothing is written', () => {
    const f = makeFolder()
    const engine = join(f.main, 'engine')
    for (const s of ['content', 'kingdom', 'engine', 'viewer']) expect(suites(f, '--run', s).status).toBe(0)   // each passed, with the others as they are…
    appendFileSync(join(f.main, 'kingdom', 'src', 'core', 'week.ts'), ' ')                                    // …then kingdom's code moved
    expect(suites(f, '--run', 'kingdom').status).toBe(0)
    const green = suites(f, '--full-green')
    expect(green.status).toBe(1)
    expect(green.stdout).toMatch(/content: passed on its own code [0-9a-f]{10}, but not together with the other three as they are now/)
    const r = node(engine, f.env, ...WRAP)
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/no full run has passed on the code being wrapped/)
    expect(r.stderr).toMatch(/combine\.mjs <worker folder> --full/)
    expect(existsSync(join(engine, '.state', 'now.json'))).toBe(false)
  }, LONG)

  it('after a full run, a ruling and a log line do not make it stale', () => {
    const f = makeFolder()
    expect(suites(f, '--full-green').status).toBe(1)
    expect(suites(f, '--run', 'all', '--full').status).toBe(0)
    appendFileSync(join(f.main, 'engine', 'DECISIONS.md'), '\n## a ruling\n')
    put(join(f.main, 'engine', '.state', 'gauntlet-log.jsonl'), '{}\n')
    const green = suites(f, '--full-green')
    expect(green.status, green.stdout).toBe(0)
    expect(green.stdout).toMatch(/all four suites passed together on engine [0-9a-f]{10}/)
  }, LONG)

  it('wrap asks that check and no narrower one', () => {
    const wrap = readFileSync(join(TOOLS, 'wrap.mjs'), 'utf8')
    expect(wrap).toMatch(/fullGreenNow\(/)
    expect(wrap).not.toMatch(/--shards-green/)
  })
})

describe('a skipped check is logged as skipped, never as passed (Law 9)', () => {
  it('the run log line of a skipped check has ok false and skipped true', async () => {
    const { logCheck } = await import('../tools/suites.mjs')
    expect(logCheck({ name: 'control battles unchanged', skipped: true, note: 'why' })).toEqual({ name: 'control battles unchanged', ok: false, warn: false, skipped: true, note: 'why' })
    expect(logCheck({ name: 'typecheck', ok: true, note: '' })).toEqual({ name: 'typecheck', ok: true, warn: false, note: undefined })
  })
  it('the gate prints SKIPPED for it and the Game Builder does not count it as a failure', () => {
    const gate = readFileSync(join(TOOLS, 'gate.mjs'), 'utf8')
    expect(gate).toMatch(/r\.skipped \? 'SKIPPED'/)
    expect(gate).toMatch(/checks: checks\.map\(logCheck\)/)
    const builder = readFileSync(join(TOOLS, 'game-builder.mjs'), 'utf8')
    expect(builder).toMatch(/!c\.ok && !c\.skipped/)
  })
})
