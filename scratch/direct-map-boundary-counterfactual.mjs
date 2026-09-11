import fs from 'node:fs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

// Restore exactly the two earlier implementation defects, then restore exact
// current bytes in finally. This is an intermediate-source counterfactual, not
// a claim that direct input existed at the committed baseline.
const packPath = 'src/content/pack.ts', scenariosPath = 'src/content/scenarios.ts'
const packBytes = fs.readFileSync(packPath), scenarioBytes = fs.readFileSync(scenariosPath)
try {
  let pack = packBytes.toString('utf8')
  const from = pack.indexOf("  if (!Array.isArray(m.rows) || m.rows.length === 0)")
  const to = pack.indexOf('  const board =', from)
  assert.ok(from > 0 && to > from)
  pack = pack.slice(0, from) + "  if (!Array.isArray(m.rows) || m.rows.length === 0 || [...m.rows].some(row => typeof row !== 'string')) throw new Error('maps: rows must be nonempty strings')\n" + pack.slice(to)
  let scenarios = scenarioBytes.toString('utf8')
  scenarios = scenarios.replace("import { MAPS } from './maps.js'", "import { MAPS, mapDef } from './maps.js'")
  assert.ok(scenarios.includes('  const map = MAPS.find(row => row.id === mapId)'))
  scenarios = scenarios.replace('  const map = MAPS.find(row => row.id === mapId)\n  if (!map) continue', '  const map = mapDef(mapId)')
  fs.writeFileSync(packPath, pack)
  fs.writeFileSync(scenariosPath, scenarios)
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'test/direct-map.test.ts', '-t', 'bounds row|custom row|only removes'], { encoding: 'utf8' })
  fs.writeFileSync('scratch/direct-map-boundary-red-clean.log', run.stdout + run.stderr)
  assert.equal(run.status, 1)
  assert.match(run.stdout + run.stderr, /4 failed/)
  assert.doesNotMatch(run.stdout + run.stderr, /Unhandled Errors/)
  console.log('Four clean boundary failures reproduced; exact source bytes restored.')
} finally {
  fs.writeFileSync(packPath, packBytes)
  fs.writeFileSync(scenariosPath, scenarioBytes)
  assert.deepEqual(fs.readFileSync(packPath), packBytes)
  assert.deepEqual(fs.readFileSync(scenariosPath), scenarioBytes)
}
