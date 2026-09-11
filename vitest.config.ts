import { defineConfig } from 'vitest/config'

// Measured during the shared-AI migration: unrestricted file workers caused
// six 5-second timeouts; four workers reduced that to the two expensive cases
// that also exceed 5 seconds in isolation. Keep normal test budgets unchanged.
export default defineConfig({ test: { maxWorkers: 4 } })
