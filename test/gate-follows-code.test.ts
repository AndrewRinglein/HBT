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
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
  it('without a pass on this tree it refuses, unless the code has a recorded pass', () => {
    expect(src).toMatch(/const pass = hasPass\(readPasses\(PKG\), 'viewer', code\)/)
    expect(src).toMatch(/if \(!pass\) \{ console\.error\('GATE REFUSES --land — every part must pass on this exact tree first'\)/)
  })
  it('with one, it rebuilds the page and prints every part SKIPPED with the reason', () => {
    expect(src).toMatch(/for \(const p of PARTS\) console\.log\(`  SKIPPED  part \$\{p\} — viewer code \$\{code\} unchanged since its gate passed/)
    expect(src).toMatch(/REBUILT, NOT RE-VERIFIED/)
    expect(src).not.toMatch(/PASS \(skipped\)/)
  })
})
