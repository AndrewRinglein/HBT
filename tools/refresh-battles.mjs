// Refresh the library through the production exporter, preserving its exact seeds.
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, join } from 'node:path'
const dirty = execFileSync('git', ['-C', '../engine', 'status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0
if (dirty && !process.argv.includes('--dirty-ok')) throw new Error('engine is dirty; finish its landing or explicitly pass --dirty-ok for candidate verification')
const library = JSON.parse(readFileSync('battles/library.json', 'utf8')).battles
const outputs = []
for (const { file } of library) {
  const target = resolve('battles', file)
  if (!target.startsWith(resolve('battles') + '\\') && !target.startsWith(resolve('battles') + '/')) throw new Error('library path outside battles')
  const old = JSON.parse(readFileSync(target, 'utf8'))
  const args = old.seed.scenarioId ? ['--scenario', old.seed.scenarioId, ...(old.seed.replicate != null ? ['--seed', String(old.seed.replicate)] : [])] : [String(old.seed.replicate), old.seed.mapId, String(old.seed.enemyCount)]
  const bytes = old.atlasSetup
    ? execFileSync(process.execPath,[resolve('../engine/node_modules/tsx/dist/cli.mjs'),'tools/battle-atlas/combat-build.mts','--export-file',target],{cwd:'..',encoding:'utf8',maxBuffer:1<<28})
    : execFileSync(process.execPath, [resolve('../engine/node_modules/tsx/dist/cli.mjs'), 'tools/export-battle.mts', ...args], { cwd: '../engine', encoding: 'utf8', maxBuffer: 1 << 28 })
  const next = JSON.parse(bytes)
  if (!Array.isArray(next.events.find(e => e.type === 'map.loaded')?.props)) throw new Error(`${file}: exporter omitted props`)
  outputs.push({ target, bytes, file, events: next.events.length, commit: next.engineCommit })
}
for (const row of outputs) { writeFileSync(row.target, row.bytes); console.log(`${row.file}: ${row.events} events, engine ${row.commit}${dirty ? ' (working candidate)' : ''}`) }
