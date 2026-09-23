import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'

// Measured during the shared-AI migration: unrestricted file workers caused
// six 5-second timeouts; four workers reduced that to the two expensive cases
// that also exceed 5 seconds in isolation. Keep normal test budgets unchanged.
//
// 2026-09-22: never more workers than CPUs. On a 2-vCPU Cowork sandbox four
// workers fought over two cores and "kiting works" (3.4 s alone) passed 5 s.
// Four cores or more — Andrew's machine — still gets exactly four, as before.
export default defineConfig({ test: { maxWorkers: Math.min(4, availableParallelism()) } })
