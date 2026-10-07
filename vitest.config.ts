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
// The default test time limit is the engine's too — ../engine/tools/gate-progress.mjs testTimeoutFor,
// the function engine/vitest.config.ts reads: 30 s on every machine, and no number here
// (tool.thirty-second-test-limit-on-the-pc, 2026-10-06; Andrew, engine/DECISIONS.md 'building is
// split from testing ...': "kingdom and viewer set no limit. Make all three packages use 30 s on the
// PC too. 19 of the 42 busy-machine incidents were a 5-second time-out."). Until that day this file
// named no limit and vitest's own 5 s stood. HOBAT_TEST_TIMEOUT (milliseconds) overrides it; a
// test's own explicit limit still wins; no assertion is changed (a timeout is not an assertion).
// A plain object, not defineConfig: this package installs nothing, and 'vitest/config' does not
// resolve from here.
//
// This file is kingdom's code (engine/tools/code-stamp.mjs PACKAGE_CODE): changing it makes
// the suite run again.
import { testTimeoutFor, vitestWorkersFor } from '../engine/tools/gate-progress.mjs'

export default { test: { maxWorkers: vitestWorkersFor(), testTimeout: testTimeoutFor() } }
