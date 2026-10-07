// A scratch copy of the folder's shape, for the tests of the tools that land work (tool.landing-on-the-quick-check and
// tool.look-items-land-on-a-picture, 2026-10-06). Not a test file: test/landing-on-the-quick-check.test.ts and
// test/look-items-land-on-a-picture.test.ts build their folders with it.
//
// What it makes: a root repository and the four packages, each its own git repository, with the REAL tools copied in —
// every top-level file of engine/tools (the gate, the suites, wrap, the backlog, add-item and what they import) and the
// root's tools/combine.mjs — and STAND-INS for everything that would run a compiler, a test runner or a battle:
//   · `npx` on the PATH the fixture hands its commands (the engine's gate runs `npx tsc`, `npx vitest`, `npx tsx`);
//   · engine/node_modules/{vitest/vitest.mjs, typescript/bin/tsc, tsx/dist/cli.mjs} (kingdom's suite and a viewer or
//     kingdom item's tests; the three typechecks; the control battles of a merge-back);
//   · viewer/tools/gate.mjs (the viewer's whole gate, as a suite);
//   · content/test/a.test.mjs, a real `node --test` file.
// A stand-in only writes down that it ran — one line in FIXTURE_RAN, `<name> <its arguments>` — and fails when
// FIXTURE_FAIL names it, printing FIXTURE_FAILING first (what a real runner would print about its failing tests). The
// control battles print FIXTURE_BASELINE, or the golden the folder starts with. Nothing here runs a tool on the real
// folder. (test/tests-follow-what-changed.test.ts has an older fixture of the same shape, with the engine's gate a
// stand-in too; this one keeps the gate real so that a landing can be made in it.)
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TOOLS = fileURLToPath(new URL('../tools/', import.meta.url))
export const ROOT_TOOLS = fileURLToPath(new URL('../../tools/', import.meta.url))
export const LONG = 240_000   // child processes under other workers' load: a time limit is not the assertion
export const PACKAGES = ['engine', 'content', 'viewer', 'kingdom'] as const
export const GOLDEN = 'bridge aaaaaaaa\nfield bbbbbbbb'

export const sh = (cwd: string, cmd: string, ...args: string[]) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
export const git = (cwd: string, ...args: string[]) => sh(cwd, 'git', ...args).trim()
export const put = (file: string, text: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text) }
export const commitAll = (dir: string, msg: string) => { git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', msg) }

/**
 * A stand-in's source. `how` says what it is called for, from its arguments and the folder it runs in:
 *   'npx'    — tsc → typecheck-<folder>; vitest → <folder> for a --shard run (the engine's suite), tests-<folder> for an
 *              item's test files; tsx → baseline or probe
 *   'vitest' — the same two vitest names (kingdom's quarters; a viewer or kingdom item's tests)
 *   'tsc'    — typecheck-<folder>          'tsx' — baseline or probe          any other word — that name
 */
const standIn = (how: string) => `import { appendFileSync } from 'node:fs'
import { basename } from 'node:path'
const args = process.argv.slice(2), here = basename(process.cwd())
const how = ${JSON.stringify(how)}
const tool = how === 'npx' ? args[0] : how
const rest = how === 'npx' ? args.slice(1) : args
const name = tool === 'tsc' ? 'typecheck-' + here
  : tool === 'vitest' ? (rest.some((a) => a.startsWith('--shard=')) ? here : 'tests-' + here)
  : tool === 'tsx' ? (rest.some((a) => a.includes('baseline')) ? 'baseline' : 'probe')
  : tool
if (process.env.FIXTURE_RAN) appendFileSync(process.env.FIXTURE_RAN, name + ' ' + rest.join(' ') + '\\n')
if (name === 'baseline') console.log(process.env.FIXTURE_BASELINE ?? ${JSON.stringify(GOLDEN)})
const failing = (process.env.FIXTURE_FAIL ?? '').split(',').includes(name)
if (failing && process.env.FIXTURE_FAILING) console.log(process.env.FIXTURE_FAILING)
if (!failing && tool === 'vitest') console.log(' Tests  3 passed (3)')
process.exit(failing ? 1 : 0)
`

export interface Scratch { base: string; main: string; ran: string; env: Record<string, string> }

/** The stand-ins a copy of the engine needs under node_modules (ignored by git, so every clone gets them afresh). */
export function standInModules(engine: string) {
  put(join(engine, 'node_modules', 'vitest', 'vitest.mjs'), standIn('vitest'))
  put(join(engine, 'node_modules', 'typescript', 'bin', 'tsc'), standIn('tsc'))
  put(join(engine, 'node_modules', 'tsx', 'dist', 'cli.mjs'), standIn('tsx'))
}

/** The folder's shape, in a scratch directory: root + engine, content, viewer, kingdom, all committed. */
export function makeScratch(): Scratch {
  const base = mkdtempSync(join(tmpdir(), 'landing-'))
  const main = join(base, 'main'), ran = join(base, 'ran.log'), bin = join(base, 'bin')
  // `npx`, for cmd.exe and for sh
  put(join(bin, 'npx.mjs'), standIn('npx'))
  put(join(bin, 'npx.cmd'), '@node "%~dp0npx.mjs" %*\r\n')
  put(join(bin, 'npx'), '#!/bin/sh\nexec node "$(dirname "$0")/npx.mjs" "$@"\n')
  chmodSync(join(bin, 'npx'), 0o755)
  // root
  put(join(main, '.gitignore'), 'engine/\ncontent/\nviewer/\nkingdom/\n')
  put(join(main, 'STATE.md'), 'where the project is\n')
  cpSync(join(ROOT_TOOLS, 'combine.mjs'), join(main, 'tools', 'combine.mjs'))
  // engine: its real tools (the top-level files), and stand-ins for what they would run
  const engine = join(main, 'engine')
  mkdirSync(join(engine, 'tools'), { recursive: true })
  for (const f of readdirSync(TOOLS)) if (/\.(mjs|mts|json)$/.test(f)) cpSync(join(TOOLS, f), join(engine, 'tools', f))
  put(join(engine, 'tools', 'engine-modules.mjs'), 'export {}\n')
  standInModules(engine)
  put(join(engine, '.gitignore'), 'node_modules/\nruns/\n')
  put(join(engine, '.gitattributes'), '.state/passes.jsonl merge=union\n.state/ledger.md merge=union\n.state/gauntlet-log.jsonl merge=union\n.state/timed-out-twice.jsonl merge=union\n')
  put(join(engine, 'src', 'core', 'battle.ts'), 'export const a = 1\n')
  put(join(engine, 'src', 'content', 'generated', 'pack.ts'), 'export const pack = 1\n')
  put(join(engine, 'test', 'a.test.ts'), '// a test\n')
  put(join(engine, 'package.json'), '{}\n')
  put(join(engine, 'DECISIONS.md'), '# rulings\n')
  put(join(engine, '.state', 'baseline.hash'), GOLDEN + '\n')
  for (const area of ['engine', 'viewer-kingdom', 'content', 'art']) put(join(engine, '.state', `backlog.${area}.json`), '[]\n')
  // content
  const content = join(main, 'content')
  put(join(content, 'gen', 'weapons.json'), '[]\n')
  put(join(content, 'settled.json'), '{}\n')
  put(join(content, 'assemble.mjs'), '// the pipeline\n')
  put(join(content, 'hbt-content.json'), '{}\n')
  put(join(content, 'test', 'a.test.mjs'), `import { appendFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert'
test('a content row', () => { if (process.env.FIXTURE_RAN) appendFileSync(process.env.FIXTURE_RAN, 'content\\n'); assert.ok(!(process.env.FIXTURE_FAIL ?? '').split(',').includes('content')) })
`)
  put(join(content, '.gitattributes'), '.state/passes.jsonl merge=union\n')
  // viewer
  const viewer = join(main, 'viewer')
  put(join(viewer, 'src', 'fold.js'), 'export const fold = 1\n')
  put(join(viewer, 'tools', 'gate.mjs'), standIn('viewer'))
  put(join(viewer, 'test', 'v.test.ts'), '// a test\n')
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
  for (const r of ['.', ...PACKAGES]) {
    const dir = join(main, r)
    git(dir, 'init', '-q', '-b', 'master')
    git(dir, 'config', 'user.email', 'fixture@example.invalid'); git(dir, 'config', 'user.name', 'fixture')
    git(dir, 'config', 'core.autocrlf', 'false')
    commitAll(dir, 'the folder as it starts')
  }
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH'
  return { base, main, ran, env: { FIXTURE_RAN: ran, [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ''}` } }
}

/** Run node in `cwd` with the fixture's environment (and `env` over it). */
export const node = (f: Scratch, cwd: string, env: Record<string, string>, ...args: string[]) =>
  spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: { ...process.env, ...f.env, ...env } })
/** The engine's suites tool, in the folder `root` (default: the fixture's main folder). */
export const suites = (f: Scratch, args: string[], env: Record<string, string> = {}, root = f.main) => node(f, join(root, 'engine'), env, 'tools/suites.mjs', ...args)
export const ranLines = (f: Scratch) => (existsSync(f.ran) ? readFileSync(f.ran, 'utf8').split('\n').filter(Boolean) : [])
/** The names of what ran, each once, sorted. */
export const ranNames = (f: Scratch) => [...new Set(ranLines(f).map((l) => l.split(' ')[0]!))].sort()
export const clearRan = (f: Scratch) => writeFileSync(f.ran, '')
export const passLines = (root: string, pkg: string): Array<Record<string, unknown>> => {
  const file = join(root, pkg, '.state', 'passes.jsonl')
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
}

/**
 * Write a scheduled run into the folder's records as the tool writes one: a line in each of the four packages'
 * passes.jsonl, all carrying the time the run started. `hoursAgo`: how long ago it started. `failed`: the suites it found
 * failing, each with the tests its output named.
 */
export async function recordScheduled(root: string, { hoursAgo, failed = {}, only = PACKAGES as readonly string[] }: { hoursAgo: number; failed?: Record<string, Array<{ name: string; timedOut: boolean }>>; only?: readonly string[] }) {
  const { allStamps } = await import('../tools/code-stamp.mjs')
  const stamps = allStamps(root), started = new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
  for (const suite of only) {
    const line = { suite, stamp: stamps[suite], ...(failed[suite] ? { failed: true, failing: failed[suite] } : {}), with: stamps, at: started, by: 'suites --run --full', in: 'main', scheduled: started }
    const file = join(root, suite, '.state', 'passes.jsonl')
    put(file, (existsSync(file) ? readFileSync(file, 'utf8') : '') + JSON.stringify(line) + '\n')
  }
  return started
}

/** A copy of the folder, as a worker has one: each repository cloned, the stand-in modules put back. */
export function cloneScratch(f: Scratch, name: string): string {
  const worker = join(f.base, name)
  mkdirSync(worker)
  for (const r of ['.', ...PACKAGES]) {
    git(f.base, 'clone', '-q', join(f.main, r), join(worker, r))
    git(join(worker, r), 'config', 'user.email', 'worker@example.invalid'); git(join(worker, r), 'config', 'user.name', 'worker')
  }
  standInModules(join(worker, 'engine'))
  return worker
}
