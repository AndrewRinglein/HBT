// tool.tests-follow-what-changed (engine queue; Andrew, 2026-10-04, engine/DECISIONS.md 'combat is
// tested only when the engine changed; a visual change does not re-run the fights' and 'the same for
// content and kingdom changes: each kind of change runs its own tests'). The viewer's gate runs when
// the viewer's CODE changed — src/, tools/, test/, the battle library — and not when a dump was
// regenerated or a document moved. A green gate records its pass against that code
// (engine/tools/code-stamp.mjs, the one definition; .state/passes.jsonl), and --land rebuilds the
// page WITHOUT re-running the parts only when that code has a recorded pass — printing each part
// SKIPPED with its reason, never PASS.
//
// The gate works on this package in place (it changes directory to it), so these tests read its
// source and ask it only for --status, which writes nothing.
//
// tool.landing-on-the-quick-check (engine queue, 2026-10-06; engine/DECISIONS.md 'the one plan: land on the quick
// check, run the whole suites twice a day, four streams and one lander': "A page item also needs the page to build and
// play its battles through (the viewer gate's verify part), once per group, by the lander" · "Dropped: … the viewer's
// whole gate at every page landing (its checks and tests parts)"). A page landing asks for the page built and the
// verify parts passed on this tree; the checks and tests parts stay runnable, are run by the scheduled run, and at a
// landing are printed SKIPPED when they were not run — never PASS. The last describe runs the REAL gate, copied into a
// scratch package beside a scratch engine/tools, with stand-ins for the page builder and the verifier.
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKAGE_CODE, stampOf } from '../../engine/tools/code-stamp.mjs'

const GATE = fileURLToPath(new URL('../tools/gate.mjs', import.meta.url))
const PKG = fileURLToPath(new URL('..', import.meta.url))
const src = readFileSync(GATE, 'utf8')

describe("the viewer's gate is recorded against the viewer's code", () => {
  it("the viewer's code is its sources, tools, tests and battle library — not the dumps, not the built page", () => {
    const code = PACKAGE_CODE.viewer!
    for (const p of ['src', 'tools', 'test', 'battles']) expect(code.code).toContain(p)
    for (const p of ['generated', 'BATTLE-VIEWER.html', '.build', '.state']) expect(code.code).not.toContain(p)
  })

  it('--status names the code the parts are judged on, and writes nothing', () => {
    const stamp = stampOf('viewer', PKG)
    expect(stamp).toMatch(/^[0-9a-f]{10}$/)
    const r = spawnSync(process.execPath, [GATE, '--status'], { encoding: 'utf8' })
    expect(r.stdout).toContain(`viewer code ${stamp}`)
    expect(stampOf('viewer', PKG)).toBe(stamp)
  }, 240_000)

  it('a green gate records its pass against the code, with the other packages beside it', () => {
    expect(src).toMatch(/appendPass\(PKG, \{ suite: 'viewer', stamp: code, with: /)
    expect(src).toMatch(/from '\.\.\/\.\.\/engine\/tools\/suites\.mjs'/)
  })

  it('the pass record is not part of the tree the parts are judged on', () => {
    expect(src).toMatch(/git rm -r -q --cached --ignore-unmatch -- \.build BATTLE-VIEWER\.html \.state/)
  })
})

describe('--land never reports a part as passed that it did not run', () => {
  // Law 10, 2026-10-06 — tool.landing-on-the-quick-check (the note at the top of this file; the same DECISIONS entry). This
  // test was named 'without a pass on this tree it refuses, unless the code has a recorded pass' and its second line asserted
  //   expect(src).toMatch(/if \(!pass\) \{ console\.error\('GATE REFUSES --land — every part must pass on this exact tree first'\)/)
  // — every part: that is the rule the entry changed on purpose. It still refuses without a recorded pass; what it asks for
  // in the refusal is the page built and the verify parts, and a part that was run on this tree and FAILED refuses too.
  it('without the verify parts on this tree it refuses, unless the code has a recorded pass', () => {
    expect(src).toMatch(/const pass = hasPass\(readPasses\(PKG\), 'viewer', code\)/)
    expect(src).toMatch(/if \(!pass \|\| st\.failed\.length\) \{ console\.error\(`GATE REFUSES --land — /)
    expect(src).toMatch(/the page must be built and every verify part must pass on this exact tree first/)
    expect(src).not.toMatch(/'GATE REFUSES --land — every part must pass on this exact tree first'/)
  })
  it('with one, it rebuilds the page and prints every part SKIPPED with the reason', () => {
    expect(src).toMatch(/for \(const p of PARTS\) console\.log\(`  SKIPPED  part \$\{p\} — viewer code \$\{code\} unchanged since its gate passed/)
    expect(src).toMatch(/REBUILT, NOT RE-VERIFIED/)
    expect(src).not.toMatch(/PASS \(skipped\)/)
  })
})

// ── a page landing, on a scratch package (tool.landing-on-the-quick-check, 2026-10-06) ──
const LONG = 240_000   // child processes beside other workers' runs: the time limit is not the assertion
const put = (file: string, text: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text) }
const ENGINE_TOOLS = fileURLToPath(new URL('../../engine/tools/', import.meta.url))

/**
 * A scratch viewer beside a scratch engine/tools: the REAL gate and its slice arithmetic, the engine's real code-stamp
 * and suites tools, and stand-ins for what would build or drive a page — the builder writes a page from the tree's
 * source, the verifier writes the facts a slice records (and fails when FIXTURE_FAIL names `verify-<k>`), the compiler
 * the checks part runs fails when FIXTURE_FAIL names `typecheck`. No page test (tests parts: nothing to run).
 */
function scratchViewer(): { viewer: string; gate: (env: Record<string, string>, ...args: string[]) => { status: number | null; stdout: string; stderr: string } } {
  const base = mkdtempSync(join(tmpdir(), 'vgate-')), viewer = join(base, 'viewer'), engine = join(base, 'engine')
  for (const f of ['code-stamp.mjs', 'suites.mjs', 'commit-only.mjs', 'backlog.mjs']) cpSync(join(ENGINE_TOOLS, f), join(engine, 'tools', f), { recursive: true })
  put(join(engine, 'tools', 'engine-modules.mjs'), 'export {}\n')
  put(join(engine, 'node_modules', 'typescript', 'bin', 'tsc'), "process.exit((process.env.FIXTURE_FAIL ?? '').split(',').includes('typecheck') ? 1 : 0)\n")
  cpSync(GATE, join(viewer, 'tools', 'gate.mjs'))
  cpSync(join(dirname(GATE), 'verify-slices.mjs'), join(viewer, 'tools', 'verify-slices.mjs'))
  put(join(viewer, 'tools', 'page-tests.mjs'), 'export const PAGE_TESTS = []\n')
  put(join(viewer, 'tools', 'build-viewer.mjs'), `import { readFileSync, writeFileSync } from 'node:fs'
writeFileSync(process.argv[process.argv.indexOf('--candidate') + 1], '<html>' + readFileSync('src/fold.js', 'utf8') + '</html>')
`)
  put(join(viewer, 'tools', 'verify.mjs'), `import { writeFileSync } from 'node:fs'
const a = process.argv.slice(2), k = Number(a[a.indexOf('--slice') + 1].split('/')[0])
if ((process.env.FIXTURE_FAIL ?? '').split(',').includes('verify-' + k)) process.exit(1)
writeFileSync(a[a.indexOf('--facts') + 1], JSON.stringify({ k, n: 4, libraryCount: 4, battles: [k - 1], singles: k === 1, uses: ['ra-crossed-swords', 'ra-shoe-prints', 'ra-bow'], damaging: 1, plain: 1, statusFrames: 1 }))
`)
  put(join(viewer, 'src', 'fold.js'), 'export const fold = 1\n')
  put(join(viewer, 'src', 'theme.js'), "export const theme = { poison: { hue: '#11aa22' } }\n")
  put(join(viewer, 'BATTLE-VIEWER.html'), '<html>the page as it was</html>\n')
  put(join(viewer, '.gitignore'), '.build/\n')
  const git = (...a: string[]) => execFileSync('git', a, { cwd: viewer, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'fixture'); git('config', 'core.autocrlf', 'false')
  git('add', '-A'); git('commit', '-q', '-m', 'the package as it starts')
  const gate = (env: Record<string, string>, ...args: string[]) => spawnSync(process.execPath, ['tools/gate.mjs', ...args], { cwd: viewer, encoding: 'utf8', env: { ...process.env, ...env } })
  return { viewer, gate }
}
const VERIFY_PARTS = [1, 2, 3, 4].map((k) => ['--part', 'verify', `${k}/4`])

describe('a page landing asks for the page built and the verify parts — not the checks and tests parts', () => {
  it('nothing run on this tree: refused, and the refusal names the verify parts', () => {
    const { viewer, gate } = scratchViewer()
    const r = gate({}, '--land')
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/GATE REFUSES --land — the page must be built and every verify part must pass on this exact tree first \(node tools\/gate\.mjs --part verify k\/4, k = 1\.\.4\)/)
    expect(readFileSync(join(viewer, 'BATTLE-VIEWER.html'), 'utf8')).toBe('<html>the page as it was</html>\n')
  }, LONG)

  it('the page built and the four verify parts passed: it lands, and the parts it did not run are said SKIPPED, never PASS', () => {
    const { viewer, gate } = scratchViewer()
    for (const part of VERIFY_PARTS) { const p = gate({}, ...part); expect(p.status, p.stdout + p.stderr).toBe(0) }
    const status = gate({}, '--status')
    expect(status.status).toBe(1)   // the whole gate is not green: three parts were not run
    expect(status.stdout).toMatch(/THE PAGE IS BUILT AND EVERY VERIFY PART PASSES — node tools\/gate\.mjs --land may write BATTLE-VIEWER\.html\. Not run on this tree, and not needed for a page landing \(the scheduled run runs them\): checks, tests 1\/2, tests 2\/2/)
    const r = gate({}, '--land')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    for (const p of ['checks', 'tests 1/2', 'tests 2/2']) {
      expect(r.stdout, p).toContain(`  SKIPPED  part ${p} — not run at a page landing: the viewer's whole gate is run by the scheduled run (from engine/: node tools/suites.mjs --run all --full); no scheduled run is recorded`)
      expect(r.stdout, p).not.toMatch(new RegExp(`${p}\\s+PASS`))
    }
    expect(r.stdout).toMatch(/landed BATTLE-VIEWER\.html · sha256 [0-9a-f]{12} · BUILT AND PLAYED THROUGH: the 4 verify parts passed against this page on tree [0-9a-f]{10}; NOT RUN: checks, tests 1\/2, tests 2\/2/)
    expect(readFileSync(join(viewer, 'BATTLE-VIEWER.html'), 'utf8')).toBe('<html>export const fold = 1\n</html>')
    // no pass of the whole gate is recorded: it did not run
    expect(existsSync(join(viewer, '.state', 'passes.jsonl'))).toBe(false)
  }, LONG)

  it('a verify part that fails: refused', () => {
    const { viewer, gate } = scratchViewer()
    for (const part of VERIFY_PARTS) gate({ FIXTURE_FAIL: 'verify-3' }, ...part)
    const r = gate({}, '--land')
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/GATE REFUSES --land — a part that was run on this tree FAILED \(verify 3\/4\)/)
    expect(readFileSync(join(viewer, 'BATTLE-VIEWER.html'), 'utf8')).toBe('<html>the page as it was</html>\n')
  }, LONG)

  it('a checks part that WAS run on this tree and failed still refuses: a failure in hand is not a check that was not run', () => {
    const { viewer, gate } = scratchViewer()
    for (const part of VERIFY_PARTS) expect(gate({}, ...part).status).toBe(0)
    expect(gate({ FIXTURE_FAIL: 'typecheck' }, '--part', 'checks').status).toBe(1)
    const r = gate({}, '--land')
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/GATE REFUSES --land — a part that was run on this tree FAILED \(checks\)/)
    // the tree changed (the fix): the record is another tree's, and the page must be played through again
    appendFileSync(join(viewer, 'src', 'fold.js'), 'export const fixed = 2\n')
    expect(gate({}, '--land').stderr).toMatch(/the page must be built and every verify part must pass on this exact tree first/)
    for (const part of VERIFY_PARTS) expect(gate({}, ...part).status).toBe(0)
    expect(gate({}, '--land').status).toBe(0)
    expect(readFileSync(join(viewer, 'BATTLE-VIEWER.html'), 'utf8')).toContain('export const fixed = 2')
  }, LONG)
})
