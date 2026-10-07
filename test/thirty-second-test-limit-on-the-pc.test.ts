// tool.thirty-second-test-limit-on-the-pc (Andrew, 2026-10-06, DECISIONS.md 'building is split from testing: three
// builders and one lander; two tool items from the review of the testing', his item 1): "give tests the 30-second limit on
// my PC that Cowork already has. engine/tools/gate-progress.mjs testTimeoutFor() returns 30 s only in Cowork
// (tool.cowork-test-timeout, 2026-09-26, 'a timeout is not an assertion'); kingdom and viewer set no limit. Make all three
// packages use 30 s on the PC too. 19 of the 42 busy-machine incidents were a 5-second time-out."
//
// The rule: testTimeoutFor() is 30 seconds on every machine; the engine's, kingdom's and the viewer's vitest configs all
// take their default limit from that one function (no number of their own); the environment may still override it
// (HOBAT_TEST_TIMEOUT, milliseconds - the name GBH SWITCHES vitest.budgetEnv gave it on 2026-09-19); a test that states its
// own limit keeps it. No assertion of any test is changed.
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { testTimeoutFor, COWORK_TEST_TIMEOUT_MS } from '../tools/gate-progress.mjs'

const ENGINE = fileURLToPath(new URL('..', import.meta.url))
const FOLDERS = { engine: ENGINE, kingdom: fileURLToPath(new URL('../../kingdom/', import.meta.url)), viewer: fileURLToPath(new URL('../../viewer/', import.meta.url)) }
const CONFIGS = Object.fromEntries(Object.entries(FOLDERS).map(([p, dir]) => [p, `${dir}vitest.config.ts`]))
const PC = { PATH: 'C:\\Windows;C:\\node' }, PC_CWD = 'C:\\Users\\aring\\Desktop\\Heroes of Blight and Tragic\\engine'
const LONG = 120_000   // a child process resolving a vitest config under other workers' load: a time limit is not the assertion

/** What vitest itself resolves for a package's folder, in a child process whose HOBAT_TEST_TIMEOUT is exactly `limit` (undefined: unset). */
function resolved(root: string, limit?: string): { testTimeout: number; configFile: string | null } {
  const env: Record<string, string | undefined> = { ...process.env }
  delete env.HOBAT_TEST_TIMEOUT
  if (limit !== undefined) env.HOBAT_TEST_TIMEOUT = limit
  const code = `import('vitest/node').then(async ({ resolveConfig }) => {
    const { vitestConfig, viteConfig } = await resolveConfig({ root: ${JSON.stringify(root)}, watch: false })
    console.log('RESOLVED ' + JSON.stringify({ testTimeout: vitestConfig.testTimeout, configFile: viteConfig.configFile ?? null }))
  }).catch((e) => { console.error(e); process.exit(1) })`
  const run = spawnSync(process.execPath, ['-e', code], { cwd: ENGINE, encoding: 'utf8', env })
  const line = run.stdout.split('\n').find((l) => l.startsWith('RESOLVED '))
  if (!line) throw new Error(`vitest resolved no config for ${root}: ${run.stdout}${run.stderr}`)
  return JSON.parse(line.slice('RESOLVED '.length))
}

describe('tool.thirty-second-test-limit-on-the-pc — a test gets 30 seconds on the PC, as in Cowork, in all three packages', () => {
  it('the one function says 30 seconds on the PC, in Cowork, and on any other machine', () => {
    expect(COWORK_TEST_TIMEOUT_MS).toBe(30_000)
    expect(testTimeoutFor(PC, PC_CWD)).toBe(30_000)
    expect(testTimeoutFor({ PATH: '/opt/cowork/bin:/usr/bin' }, '/home/x')).toBe(30_000)
    expect(testTimeoutFor({ PATH: '/usr/bin' }, '/home/someone/engine')).toBe(30_000)
  })

  it('the environment may still override it: HOBAT_TEST_TIMEOUT, in milliseconds', () => {
    expect(testTimeoutFor({ ...PC, HOBAT_TEST_TIMEOUT: '5000' }, PC_CWD)).toBe(5000)
    expect(testTimeoutFor({ ...PC, HOBAT_TEST_TIMEOUT: '90000' }, PC_CWD)).toBe(90_000)
    expect(testTimeoutFor({ ...PC, HOBAT_TEST_TIMEOUT: '' }, PC_CWD)).toBe(30_000)   // set and empty is not set
  })

  it('an override that is not a whole number of milliseconds above zero is refused loudly, never read as the default (Law 9)', () => {
    for (const bad of ['30s', '0', '-5', '2.5', 'abc']) expect(() => testTimeoutFor({ ...PC, HOBAT_TEST_TIMEOUT: bad }, PC_CWD), bad).toThrow(/HOBAT_TEST_TIMEOUT/)
  })

  it('the three configs take their limit from the one function — none holds a number of its own', () => {
    for (const [p, file] of Object.entries(CONFIGS)) {
      const text = readFileSync(file, 'utf8')
      expect(text, p).toMatch(/testTimeout:\s*testTimeoutFor\(\)/)
      expect(text, p).toMatch(/import \{[^}]*\btestTimeoutFor\b[^}]*\} from '[./]*(engine\/)?tools\/gate-progress\.mjs'/)
      expect(text, p).not.toMatch(/testTimeout:\s*\d/)
    }
  })

  it('with no environment variable set, vitest resolves 30 seconds in the engine, in kingdom and in the viewer — each from its own config', () => {
    for (const [p, dir] of Object.entries(FOLDERS)) {
      const r = resolved(dir)
      expect(r.configFile?.replace(/\\/g, '/'), p).toMatch(new RegExp(`${p}/vitest\\.config\\.ts$`))
      expect(r.testTimeout, p).toBe(30_000)
      expect(r.testTimeout, p).toBe(testTimeoutFor({}, dir))
    }
  }, LONG)

  it('and the override reaches vitest in all three', () => {
    for (const [p, dir] of Object.entries(FOLDERS)) expect(resolved(dir, '7000').testTimeout, p).toBe(7000)
  }, LONG)
})
