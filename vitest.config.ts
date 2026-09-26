import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'
import { testTimeoutFor } from './tools/gate-progress.mjs'

// Measured during the shared-AI migration: unrestricted file workers caused
// six 5-second timeouts; four workers reduced that to the two expensive cases
// that also exceed 5 seconds in isolation. Keep normal test budgets unchanged.
//
// 2026-09-22: never more workers than CPUs. On a 2-vCPU Cowork sandbox four
// workers fought over two cores and "kiting works" (3.4 s alone) passed 5 s.
// Four cores or more — Andrew's machine — still gets exactly four, as before.
//
// 2026-09-26 (tool.cowork-test-timeout, Andrew): in Cowork only, the default test
// timeout is 30 s — load from outside the chat pushed 1-4 s tests past 5 s one after
// another. A terminal gets undefined here, so vitest's own default is unchanged.
const testTimeout = testTimeoutFor()
export default defineConfig({ test: { maxWorkers: Math.min(4, availableParallelism()), ...(testTimeout ? { testTimeout } : {}) } })
