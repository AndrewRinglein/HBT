// tool.cowork-test-timeout (Andrew 2026-09-26): in the Cowork sandbox the default test
// timeout is 30 s, because load from outside the chat pushes 1-4 s tests past vitest's
// 5 s default; a terminal keeps vitest's default. A timeout is not an assertion.
import { describe, expect, it } from 'vitest'
import { testTimeoutFor, COWORK_TEST_TIMEOUT_MS } from '../tools/gate-progress.mjs'
import config from '../vitest.config.js'

describe('the default test timeout follows the machine', () => {
  it('Cowork gets 30 s; a terminal keeps the default', () => {
    expect(COWORK_TEST_TIMEOUT_MS).toBe(30_000)
    expect(testTimeoutFor({ PATH: '/opt/cowork/bin:/usr/bin' }, '/home/x')).toBe(30_000)
    expect(testTimeoutFor({ PATH: '/usr/bin' }, '/sessions/abc/mnt/x')).toBe(30_000)
    expect(testTimeoutFor({ PATH: 'C:\\Windows;C:\\node' }, 'C:\\Users\\aring\\engine')).toBeUndefined()
  })
  it('the loaded config uses it', () => {
    expect((config as { test?: { testTimeout?: number } }).test?.testTimeout).toBe(testTimeoutFor())
  })
})
