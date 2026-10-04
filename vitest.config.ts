// Kingdom's vitest config (tool.kingdom-vitest-workers, engine queue, 2026-10-04).
//
// The file workers are capped by the engine's own cap — ../engine/tools/gate-progress.mjs
// vitestWorkersFor: four, never more than the machine has CPUs — the function
// engine/vitest.config.ts reads. One shape, and no number here. Without this file vitest took
// one worker per CPU (sixteen on Andrew's PC), and beside other workers' suites the tests that
// spawn a child process (cold-start, item-generation-isolation, sandbox-ui, the page verifies)
// passed their 5 s or 60 s limit on any tree; every worker set VITEST_MAX_WORKERS=4 by hand.
//
// VITEST_MAX_WORKERS still overrides it: vitest reads the environment after the config.
// `node tools/gate.mjs --shard k/4`, a landing's checks (the engine gate runs vitest here) and
// engine/tools/suites.mjs all run vitest from this folder, so all three get the cap from here.
//
// No test's time limit is set or changed here (Law 10): vitest's own 5 s stands, and a test's
// own explicit limit still wins. A plain object, not defineConfig: this package installs
// nothing, and 'vitest/config' does not resolve from here.
//
// This file is kingdom's code (engine/tools/code-stamp.mjs PACKAGE_CODE): changing it makes
// the suite run again.
import { vitestWorkersFor } from '../engine/tools/gate-progress.mjs'

export default { test: { maxWorkers: vitestWorkersFor() } }
