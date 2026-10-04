// The viewer's vitest config (tool.viewer-vitest-workers, engine queue, 2026-10-04).
//
// The file workers are capped by the engine's own cap — ../engine/tools/gate-progress.mjs
// vitestWorkersFor: four, never more than the machine has CPUs — the function
// engine/vitest.config.ts and kingdom/vitest.config.ts read. One shape, and no number here.
// Without this file vitest took one worker per CPU (sixteen on Andrew's PC), and beside other
// workers' gates the page tests in test/ (each spawns `node --test` over a headless page)
// passed their 60-170 s limits on any tree; every worker set VITEST_MAX_WORKERS=4 by hand.
//
// VITEST_MAX_WORKERS still overrides it: vitest reads the environment after the config.
// `node tools/gate.mjs --part checks` (step 2a: `vitest run --dir test`), `npm test` and
// engine/tools/suites.mjs (which runs this gate) all run vitest from this folder, so all
// three get the cap from here.
//
// No test's time limit is set or changed here (Law 10): vitest's own 5 s stands, and a test's
// own explicit limit still wins. A plain object, not defineConfig: this package installs
// only Three.js, and 'vitest/config' does not resolve from here.
//
// This file is the viewer's code (engine/tools/code-stamp.mjs PACKAGE_CODE): changing it makes
// the gate run again.
import { vitestWorkersFor } from '../engine/tools/gate-progress.mjs'

export default { test: { maxWorkers: vitestWorkersFor() } }
