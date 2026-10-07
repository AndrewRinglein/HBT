import { defineConfig } from 'vitest/config'
import { testTimeoutFor, vitestWorkersFor } from './tools/gate-progress.mjs'

// The file workers: four, never more than the machine has CPUs — tools/gate-progress.mjs
// vitestWorkersFor, the one cap, which kingdom/vitest.config.ts reads too
// (tool.kingdom-vitest-workers, 2026-10-04; the measurements are beside the function).
// Four cores or more — Andrew's machine — still gets exactly four, as before.
//
// The default test time limit: tools/gate-progress.mjs testTimeoutFor, the one function, which
// kingdom/vitest.config.ts and viewer/vitest.config.ts read too. 2026-09-26
// (tool.cowork-test-timeout, Andrew): 30 s in Cowork only — load from outside the chat pushed
// 1-4 s tests past 5 s one after another. 2026-10-06 (tool.thirty-second-test-limit-on-the-pc,
// Andrew, DECISIONS.md 'building is split from testing ...': "give tests the 30-second limit on
// my PC that Cowork already has"): 30 s on every machine. HOBAT_TEST_TIMEOUT (milliseconds)
// overrides it; a test's own explicit limit still wins. A timeout is not an assertion.
export default defineConfig({ test: { maxWorkers: vitestWorkersFor(), testTimeout: testTimeoutFor() } })
