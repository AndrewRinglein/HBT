// The cold-start run — ISC-001: "from a new save, with no human input, the run
// advances Week by Week to battle 11 and the Charter's first Article threshold
// fires." And ISC-025: it does so with every OUT system (THIN-SLICE-IMPLEMENTATION.md
// §8) absent or stubbed. The one probe that proves the slice is WHOLE.
//
//   node tools/slice-run.mjs --seed 1 --until article-1 [--assert no-out-systems] [--weeks 60]
//
// This file is the door; the run itself is tools/slice-run.mts (TypeScript, on
// the engine's tsx), and its exit code is this one's.
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import { spawnSync } from 'node:child_process'
const r = spawnSync(process.execPath, ['../engine/node_modules/tsx/dist/cli.mjs', 'tools/slice-run.mts', ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(r.status ?? 1)
