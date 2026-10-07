// tool.kingdom-vitest-workers (found 2026-10-04 by three workers and the home chat: GBH SWITCHES
// vitest.kingdomShardWorkers, gate.shardFewerWorkersUnderLoad, suites.kingdomWorkers). Kingdom had no
// vitest config of its own, so its suite took one file worker per CPU (sixteen on Andrew's PC) and,
// beside other workers' suites, its tests that spawn a child process passed their 5 s or 60 s limit
// on any tree. Every worker set VITEST_MAX_WORKERS=4 by hand; tools/suites.mjs set it for its own run.
//
// The rule: kingdom has a vitest.config.ts that caps the file workers by the SAME function the
// engine's config uses (tools/gate-progress.mjs vitestWorkersFor — one shape, not a second idea);
// the environment still overrides it; kingdom's `gate.mjs --shard`, a landing's checks and
// tools/suites.mjs all get the cap from that one place, so suites.mjs carries no cap of its own;
// the config is kingdom's code (tools/code-stamp.mjs PACKAGE_CODE); and no test's time limit moves.
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import { testTimeoutFor, vitestWorkersFor } from '../tools/gate-progress.mjs'
import { PACKAGE_CODE } from '../tools/code-stamp.mjs'
import { SUITES } from '../tools/suites.mjs'

const ENGINE = fileURLToPath(new URL('..', import.meta.url))
const KINGDOM = fileURLToPath(new URL('../../kingdom/', import.meta.url))
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

describe('tool.kingdom-vitest-workers — kingdom caps its vitest workers as the engine does', () => {
  it('one function names the cap: four workers, never more than the machine has CPUs', () => {
    expect(typeof vitestWorkersFor).toBe('function')
    expect(vitestWorkersFor(16)).toBe(4)
    expect(vitestWorkersFor(4)).toBe(4)
    expect(vitestWorkersFor(2)).toBe(2)
    expect(vitestWorkersFor(1)).toBe(1)
    expect(vitestWorkersFor()).toBe(Math.min(4, availableParallelism()))
  })

  it('both configs take their cap from that function — kingdom has no number of its own', () => {
    expect(existsSync(KINGDOM_CONFIG), 'kingdom/vitest.config.ts').toBe(true)
    for (const file of [KINGDOM_CONFIG, ENGINE_CONFIG]) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).toMatch(/maxWorkers:\s*vitestWorkersFor\(\)/)
      expect(text, file).toMatch(/import \{[^}]*\bvitestWorkersFor\b[^}]*\} from '[./]*(engine\/)?tools\/gate-progress\.mjs'/)
    }
  })

  it('with no environment variable set, vitest in kingdom/ runs on the capped number of workers — the same number as the engine', () => {
    const kingdom = resolved(KINGDOM)
    expect(kingdom.configFile?.replace(/\\/g, '/')).toMatch(/kingdom\/vitest\.config\.ts$/)
    expect(kingdom.maxWorkers).toBe(Math.min(4, availableParallelism()))
    expect(kingdom.maxWorkers).toBe(resolved(ENGINE).maxWorkers)
  }, LONG)

  it('VITEST_MAX_WORKERS still overrides the config', () => {
    expect(resolved(KINGDOM, '2').maxWorkers).toBe(2)
    expect(resolved(KINGDOM, '7').maxWorkers).toBe(7)
  }, LONG)

  // Law 10, 2026-10-06 — tool.thirty-second-test-limit-on-the-pc (Andrew, DECISIONS.md 'building is split from testing: three
  // builders and one lander; two tool items from the review of the testing', his item 1: "kingdom and viewer set no limit.
  // Make all three packages use 30 s on the PC too. 19 of the 42 busy-machine incidents were a 5-second time-out."). This
  // test held the rule that item changed on purpose: it was named
  //   "no test's time limit is changed: kingdom's config names none, and vitest keeps its own 5 s there"
  // and asserted the config text `.not.toMatch(/testTimeout|hookTimeout/)` and `resolved(KINGDOM).testTimeout` `.toBe(5000)`.
  // What it holds now: the config names no number of its own (the limit is the one function's), no hook limit, and vitest
  // resolves the function's limit there (30 seconds; test/thirty-second-test-limit-on-the-pc.test.ts holds the number). No
  // test's own explicit limit and no assertion of any other test moved.
  it("the default time limit is the one function's: kingdom's config holds no number of its own, and vitest resolves the function's limit there", () => {
    expect(existsSync(KINGDOM_CONFIG), 'kingdom/vitest.config.ts').toBe(true)
    const text = readFileSync(KINGDOM_CONFIG, 'utf8')
    expect(text).toMatch(/testTimeout:\s*testTimeoutFor\(\)/)
    expect(text).not.toMatch(/testTimeout:\s*\d|hookTimeout/)
    expect(resolved(KINGDOM).testTimeout).toBe(testTimeoutFor())   // 30 s, unless this run's own environment overrides it (HOBAT_TEST_TIMEOUT)
  }, LONG)

  it("tools/suites.mjs sets no worker cap of its own for kingdom's quarters — the config is the one place", () => {
    const kingdom = SUITES.find((s: { suite: string }) => s.suite === 'kingdom') as { cmds: string[][]; env?: Record<string, string> }
    expect(kingdom.cmds).toHaveLength(4)
    expect(kingdom.env?.VITEST_MAX_WORKERS).toBeUndefined()
    expect(kingdom.cmds.flat().some((a) => /max-?workers/i.test(a))).toBe(false)
    expect(readFileSync(fileURLToPath(new URL('../tools/suites.mjs', import.meta.url)), 'utf8')).not.toMatch(/VITEST_MAX_WORKERS:/)
  })

  it("kingdom's gate runs its shards with no cap of its own either — it leaves vitest to read the config", () => {
    const gate = readFileSync(fileURLToPath(new URL('../../kingdom/tools/gate.mjs', import.meta.url)), 'utf8')
    expect(gate).toMatch(/vitest\.mjs run --shard=/)
    expect(gate).not.toMatch(/VITEST_MAX_WORKERS|--maxWorkers|--max-workers/)
  })

  it("the config is kingdom's code: changing it makes kingdom's suite run again", () => {
    expect(PACKAGE_CODE.kingdom?.code).toContain('vitest.config.ts')
    expect(PACKAGE_CODE.engine?.code).toContain('vitest.config.ts')
  })
})
