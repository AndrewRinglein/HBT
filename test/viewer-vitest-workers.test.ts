// tool.viewer-vitest-workers (found 2026-10-04 by the engine and viewer workers: GBH SWITCHES
// vitest.kingdomConfig, gate.shardFewerWorkersUnderLoad). The viewer had no vitest config of its own,
// so its gate's checks part (`vitest run --dir test`, viewer/tools/gate.mjs step 2a) took one file
// worker per CPU (sixteen on Andrew's PC) and, beside other workers' gates, untouched page tests
// passed their 60-170 s limits and one headless-Chrome verifier hung. Every worker set
// VITEST_MAX_WORKERS=4 by hand.
//
// The rule, the one tool.kingdom-vitest-workers gave kingdom: the viewer has a vitest.config.ts that
// caps the file workers by the SAME function the engine's and kingdom's configs use
// (tools/gate-progress.mjs vitestWorkersFor — one shape, not a third idea); the environment still
// overrides it; the viewer's gate sets no cap of its own; the config is the viewer's code
// (tools/code-stamp.mjs PACKAGE_CODE); and no test's time limit moves.
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import { testTimeoutFor, vitestWorkersFor } from '../tools/gate-progress.mjs'
import { PACKAGE_CODE } from '../tools/code-stamp.mjs'
import { SUITES } from '../tools/suites.mjs'

const ENGINE = fileURLToPath(new URL('..', import.meta.url))
const VIEWER = fileURLToPath(new URL('../../viewer/', import.meta.url))
const VIEWER_CONFIG = fileURLToPath(new URL('../../viewer/vitest.config.ts', import.meta.url))
const KINGDOM_CONFIG = fileURLToPath(new URL('../../kingdom/vitest.config.ts', import.meta.url))
const ENGINE_CONFIG = fileURLToPath(new URL('../vitest.config.ts', import.meta.url))
const LONG = 120_000   // a child process resolving a vitest config under other workers' load: a time limit is not the assertion

/** What vitest itself resolves for a package's folder — its config file read, then the environment — in a child process whose VITEST_MAX_WORKERS is exactly `workers` (undefined: unset). */
function resolved(root: string, workers?: string): { maxWorkers: number; testTimeout: number; configFile: string | null } {
  const env: Record<string, string | undefined> = { ...process.env }
  delete env.VITEST_MAX_WORKERS
  if (workers !== undefined) env.VITEST_MAX_WORKERS = workers
  const code = `import('vitest/node').then(async ({ resolveConfig }) => {
    const { vitestConfig, viteConfig } = await resolveConfig({ root: ${JSON.stringify(root)}, watch: false })
    console.log('RESOLVED ' + JSON.stringify({ maxWorkers: vitestConfig.maxWorkers, testTimeout: vitestConfig.testTimeout, configFile: viteConfig.configFile ?? null }))
  }).catch((e) => { console.error(e); process.exit(1) })`
  const run = spawnSync(process.execPath, ['-e', code], { cwd: ENGINE, encoding: 'utf8', env })
  const line = run.stdout.split('\n').find((l) => l.startsWith('RESOLVED '))
  if (!line) throw new Error(`vitest resolved no config for ${root}: ${run.stdout}${run.stderr}`)
  return JSON.parse(line.slice('RESOLVED '.length))
}

describe('tool.viewer-vitest-workers — the viewer caps its vitest workers as the engine and kingdom do', () => {
  it('the three configs take their cap from the one function — the viewer has no number of its own', () => {
    expect(existsSync(VIEWER_CONFIG), 'viewer/vitest.config.ts').toBe(true)
    for (const file of [VIEWER_CONFIG, KINGDOM_CONFIG, ENGINE_CONFIG]) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).toMatch(/maxWorkers:\s*vitestWorkersFor\(\)/)
      expect(text, file).toMatch(/import \{[^}]*\bvitestWorkersFor\b[^}]*\} from '[./]*(engine\/)?tools\/gate-progress\.mjs'/)
    }
    // one shape: the viewer's config is kingdom's, word for word in what it exports
    const exported = (file: string) => readFileSync(file, 'utf8').split('\n').filter((l) => /^(import|export) /.test(l)).join('\n')
    expect(exported(VIEWER_CONFIG)).toBe(exported(KINGDOM_CONFIG))
    expect(readFileSync(VIEWER_CONFIG, 'utf8')).not.toMatch(/maxWorkers:\s*\d/)
  })

  it('with no environment variable set, vitest in viewer/ runs on the capped number of workers — the same number as the engine and kingdom', () => {
    const viewer = resolved(VIEWER)
    expect(viewer.configFile?.replace(/\\/g, '/')).toMatch(/viewer\/vitest\.config\.ts$/)
    expect(viewer.maxWorkers).toBe(vitestWorkersFor())
    expect(viewer.maxWorkers).toBe(Math.min(4, availableParallelism()))
    expect(viewer.maxWorkers).toBe(resolved(ENGINE).maxWorkers)
  }, LONG)

  it('VITEST_MAX_WORKERS still overrides the config', () => {
    expect(resolved(VIEWER, '2').maxWorkers).toBe(2)
    expect(resolved(VIEWER, '7').maxWorkers).toBe(7)
  }, LONG)

  // Law 10, 2026-10-06 — tool.thirty-second-test-limit-on-the-pc (Andrew, DECISIONS.md 'building is split from testing: three
  // builders and one lander; two tool items from the review of the testing', his item 1: "kingdom and viewer set no limit.
  // Make all three packages use 30 s on the PC too. 19 of the 42 busy-machine incidents were a 5-second time-out."). This
  // test held the rule that item changed on purpose: it was named
  //   "no test's time limit is changed: the viewer's config names none, and vitest keeps its own 5 s there"
  // and asserted the config text `.not.toMatch(/testTimeout|hookTimeout/)` and `resolved(VIEWER).testTimeout` `.toBe(5000)`.
  // What it holds now: the config names no number of its own (the limit is the one function's), no hook limit, and vitest
  // resolves the function's limit there (30 seconds; test/thirty-second-test-limit-on-the-pc.test.ts holds the number). No
  // test's own explicit limit and no assertion of any other test moved.
  it("the default time limit is the one function's: the viewer's config holds no number of its own, and vitest resolves the function's limit there", () => {
    expect(existsSync(VIEWER_CONFIG), 'viewer/vitest.config.ts').toBe(true)
    const text = readFileSync(VIEWER_CONFIG, 'utf8')
    expect(text).toMatch(/testTimeout:\s*testTimeoutFor\(\)/)
    expect(text).not.toMatch(/testTimeout:\s*\d|hookTimeout/)
    expect(resolved(VIEWER).testTimeout).toBe(testTimeoutFor())   // 30 s, unless this run's own environment overrides it (HOBAT_TEST_TIMEOUT)
  }, LONG)

  it("the viewer's gate runs its checks part with no cap of its own — it leaves vitest to read the config, from the viewer's folder", () => {
    const gate = readFileSync(fileURLToPath(new URL('../../viewer/tools/gate.mjs', import.meta.url)), 'utf8')
    expect(gate).toMatch(/vitest\.mjs', 'run', '--dir', 'test'/)
    expect(gate).not.toMatch(/VITEST_MAX_WORKERS|--maxWorkers|--max-workers|--config/)
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../../viewer/package.json', import.meta.url)), 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts.test).toMatch(/vitest\.mjs run --dir test/)
    expect(pkg.scripts.test).not.toMatch(/VITEST_MAX_WORKERS|--maxWorkers|--max-workers|--config/)
  })

  it("tools/suites.mjs sets no worker cap of its own for the viewer's gate — the config is the one place", () => {
    const viewer = SUITES.find((s: { suite: string }) => s.suite === 'viewer') as { cmds: string[][]; env?: Record<string, string> }
    expect(viewer.env?.VITEST_MAX_WORKERS).toBeUndefined()
    expect(viewer.cmds.flat().some((a) => /max-?workers/i.test(a))).toBe(false)
  })

  it("the config is the viewer's code: changing it makes the viewer's gate run again", () => {
    expect(PACKAGE_CODE.viewer?.code).toContain('vitest.config.ts')
    expect(PACKAGE_CODE.kingdom?.code).toContain('vitest.config.ts')
    expect(PACKAGE_CODE.engine?.code).toContain('vitest.config.ts')
  })
})
