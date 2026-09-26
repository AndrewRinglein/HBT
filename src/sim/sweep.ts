// The sweep loop, as a function — so what `npm run sweep` prints and what a test
// asserts are the same run. Like score.ts and coverage.ts beside it, this reads
// finished event logs only; nothing here is reachable from src/core.
//
// sim.coverage (2026-09-25): with `coverage: true` the sweep also answers "what did
// this run never touch" — the merged report of src/sim/coverage.ts. The report is
// read AFTER each battle from its log, so the battles are byte-identical with it on
// or off (test/coverage-sweep.test.ts asserts exactly that).

import { createBattle } from '../core/setup.js'
import { runBattle } from '../core/battle.js'
import { score, type Scoreboard } from './score.js'
import { coverage as coverageOf, mergeCoverage, type Coverage } from './coverage.js'

export type SweepOptions = {
  /** Merge a coverage report across the sweep (SWITCHES.md `sweepCoverageReport`). */
  coverage?: boolean
  /** Keep each battle's serialized event log — for tests that compare runs. */
  keepLogs?: boolean
}

export type Sweep = {
  boards: Scoreboard[]
  /** Null unless asked for — the report is a question the caller chooses to ask. */
  coverage: Coverage | null
  /** JSON of each battle's events, in replicate order; empty unless `keepLogs`. */
  logs: string[]
}

/** Replicates 0..n-1 of the standard battle, strict, exactly as `npm run sweep` always ran them. */
export function runSweep(n: number, opts: SweepOptions = {}): Sweep {
  if (!Number.isInteger(n) || n < 1) throw new Error(`runSweep: battle count must be a positive integer, got ${n}`)
  const boards: Scoreboard[] = []
  const reports: Coverage[] = []
  const logs: string[] = []
  for (let i = 0; i < n; i++) {
    const ctx = createBattle({ replicate: i, strict: true })
    runBattle(ctx)
    boards.push(score(ctx.events))
    if (opts.coverage) reports.push(coverageOf(ctx))
    if (opts.keepLogs) logs.push(JSON.stringify(ctx.events))
  }
  return { boards, coverage: opts.coverage ? mergeCoverage(reports) : null, logs }
}
