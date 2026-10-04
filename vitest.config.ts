import { defineConfig } from 'vitest/config'
import { testTimeoutFor, vitestWorkersFor } from './tools/gate-progress.mjs'

// The file workers: four, never more than the machine has CPUs — tools/gate-progress.mjs
// vitestWorkersFor, the one cap, which kingdom/vitest.config.ts reads too
// (tool.kingdom-vitest-workers, 2026-10-04; the measurements are beside the function).
// Four cores or more — Andrew's machine — still gets exactly four, as before. Keep normal
// test budgets unchanged.
//
// 2026-09-26 (tool.cowork-test-timeout, Andrew): in Cowork only, the default test
// timeout is 30 s — load from outside the chat pushed 1-4 s tests past 5 s one after
// another. A terminal gets undefined here, so vitest's own default is unchanged.
const testTimeout = testTimeoutFor()
export default defineConfig({ test: { maxWorkers: vitestWorkersFor(), ...(testTimeout ? { testTimeout } : {}) } })
