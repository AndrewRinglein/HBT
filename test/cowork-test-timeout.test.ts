// tool.cowork-test-timeout (Andrew 2026-09-26): in the Cowork sandbox the default test
// timeout is 30 s, because load from outside the chat pushes 1-4 s tests past vitest's
// 5 s default; a terminal keeps vitest's default. A timeout is not an assertion.
//
// Law 10, 2026-10-06 — tool.thirty-second-test-limit-on-the-pc (Andrew, DECISIONS.md 'building is split from testing:
// three builders and one lander; two tool items from the review of the testing', his item 1): "give tests the 30-second
// limit on my PC that Cowork already has. engine/tools/gate-progress.mjs testTimeoutFor() returns 30 s only in Cowork
// (tool.cowork-test-timeout, 2026-09-26, 'a timeout is not an assertion') ... Make all three packages use 30 s on the PC
// too." The first test below was named 'Cowork gets 30 s; a terminal keeps the default' and its last line asserted
//   expect(testTimeoutFor({ PATH: 'C:\\Windows;C:\\node' }, 'C:\\Users\\aring\\engine')).toBeUndefined()
// - the terminal half is the rule that ruling changed on purpose. Cowork's half is unchanged; the terminal now gets the
// same 30 s (test/thirty-second-test-limit-on-the-pc.test.ts holds the whole rule, the override and the three configs).
import { describe, expect, it } from 'vitest'
import { testTimeoutFor, COWORK_TEST_TIMEOUT_MS } from '../tools/gate-progress.mjs'
import config from '../vitest.config.js'

describe('the default test timeout follows the machine', () => {
  it('Cowork gets 30 s; since 2026-10-06 a terminal gets the same 30 s', () => {
    expect(COWORK_TEST_TIMEOUT_MS).toBe(30_000)
    expect(testTimeoutFor({ PATH: '/opt/cowork/bin:/usr/bin' }, '/home/x')).toBe(30_000)
    expect(testTimeoutFor({ PATH: '/usr/bin' }, '/sessions/abc/mnt/x')).toBe(30_000)
    expect(testTimeoutFor({ PATH: 'C:\\Windows;C:\\node' }, 'C:\\Users\\aring\\engine')).toBe(30_000)
  })
  it('the loaded config uses it', () => {
    expect((config as { test?: { testTimeout?: number } }).test?.testTimeout).toBe(testTimeoutFor())
  })
})
