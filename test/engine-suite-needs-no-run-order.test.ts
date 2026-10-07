// tool.engine-suite-needs-no-run-order (Andrew, 2026-10-06, DECISIONS.md 'building is split from testing: three builders
// and one lander; two tool items from the review of the testing', his item 2): "the engine tests
// test/fix-shield-power-double-click.test.ts and test/movement-swap-and-shields.test.ts fail with 'Shared viewer metadata
// is stale or dirty' whenever the engine suite runs before the viewer's dumps are regenerated after an engine change. Make
// the run order right, or make the two tests not depend on it. This was 7 incidents."
//
// What the two were: each built the KINGDOM's sandbox page (kingdom/tools/build-sandbox.mjs, whose reader of the viewer's
// dumps refuses while viewer/generated/static.json carries another engine stamp) and played it with a kingdom verifier
// (tools/shield-dblclick.verify.mjs, tools/swap-shields.verify.mjs) - the kingdom's page tests, left in engine/test when
// the viewer's and the kingdom's page tests moved to their own packages (Andrew, 2026-10-01, engine 33c3f8b). They are the
// kingdom's now, word for word in what they assert (kingdom/test, the same two file names), beside the thirteen kingdom
// tests that already build a page. The rule this file holds so that it stays so: no test of the engine's suite builds
// another package's page or runs a tool in another package's folder - then nothing in the engine's suite can depend on a
// sibling package's generated files being current, and there is no order to remember. The refusal itself is not weakened.
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const KINGDOM = fileURLToPath(new URL('../../kingdom/', import.meta.url))
const MOVED = ['fix-shield-power-double-click.test.ts', 'movement-swap-and-shields.test.ts']
/** A test file's code: its text without the lines that are only a comment. */
const code = (file: string) => readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
/** A page builder of another package, or a child process started in another package's folder. */
const OTHER_PACKAGE_RUN = /tools\/build-(sandbox|slice|viewer)\.mjs|battle-view-assets\.mjs|cwd:\s*['"`]\.\.\/(kingdom|viewer|content)\b/

describe("tool.engine-suite-needs-no-run-order — the engine's suite passes whatever the state of the viewer's dumps", () => {
  it("no test of the engine's suite builds another package's page or runs a tool in another package's folder", () => {
    const offenders = readdirSync(HERE).filter((f) => /\.test\.(ts|mts|mjs)$/.test(f) && f !== 'engine-suite-needs-no-run-order.test.ts')
      .filter((f) => OTHER_PACKAGE_RUN.test(code(`${HERE}${f}`)))
    expect(offenders).toEqual([])
  })

  it("the two tests that did are the kingdom's page tests now, under the same names, and the engine has neither", () => {
    for (const f of MOVED) {
      expect(existsSync(`${HERE}${f}`), `engine/test/${f}`).toBe(false)
      expect(existsSync(`${KINGDOM}test/${f}`), `kingdom/test/${f}`).toBe(true)
      const text = readFileSync(`${KINGDOM}test/${f}`, 'utf8')
      // still the built page, played by the kingdom's own verifier, read against the engine's own numbers
      expect(text, f).toMatch(/tools\/build-sandbox\.mjs/)
      expect(text, f).toMatch(/tools\/(shield-dblclick|swap-shields)\.verify\.mjs/)
      expect(text, f).toMatch(/staminaCost/)
    }
  })

  it('the refusal the two ran into is not weakened: the kingdom still builds no page on dumps that carry another engine stamp', () => {
    const reader = readFileSync(`${KINGDOM}tools/battle-view-assets.mjs`, 'utf8')
    expect(reader).toMatch(/stat\.engineDirty\|\|stat\.engineCommit!==engineCommit\)throw Error\('Shared viewer metadata is stale or dirty/)
  })
})
