import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { scenarioOptions, SCENARIOS } from '../src/content/scenarios.js'

const base = '240993d'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-direct-map-before-'))
try {
  for (const file of execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/)) {
    const target = path.resolve(temporary, file)
    assert.ok(target.startsWith(temporary + path.sep))
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 16 * 1024 * 1024 }))
  }
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}')
  const oldSetup = await import(pathToFileURL(path.join(temporary, 'src/core/setup.ts')).href)
  const oldBattle = await import(pathToFileURL(path.join(temporary, 'src/core/battle.ts')).href)
  const oldScenarios = await import(pathToFileURL(path.join(temporary, 'src/content/scenarios.ts')).href)
  const zoneScenarios: string[] = []
  const cases: { id: string; before: any; after: any }[] = MAP_PANEL.flatMap(mapId => Array.from({ length: 25 }, (_, replicate) => ({ id: `${mapId}/${replicate}`, before: { mapId, replicate, enemyCount: 8, strict: true }, after: { mapId, replicate, enemyCount: 8, strict: true } })))
  for (const [id, row] of Object.entries(oldScenarios.SCENARIOS)) {
    const before = oldScenarios.scenarioOptions(row), after = scenarioOptions(SCENARIOS[id]!)
    assert.deepEqual(after, before, `${id} unchanged fielding`)
    if (before.encounter?.heroZone) zoneScenarios.push(id)
    cases.push({ id, before, after })
  }
  assert.ok(zoneScenarios.length > 0)
  for (const { id, before: optsBefore, after: optsAfter } of cases) {
    const before = oldSetup.createBattle(optsBefore), after = createBattle(optsAfter)
    assert.deepEqual(after.state, before.state, `${id} setup state`)
    assert.deepEqual(after.events, before.events, `${id} setup events`)
    assert.deepEqual(after.rng, before.rng, `${id} setup full RNG`)
    const a = oldBattle.runBattle(before), b = runBattle(after)
    assert.deepEqual(b, a, `${id} result`)
    assert.deepEqual(after.state, before.state, `${id} final state`)
    assert.deepEqual(after.events, before.events, `${id} final events`)
    assert.deepEqual(after.rng, before.rng, `${id} final full RNG`)
    assert.deepEqual(after.battleCursor, before.battleCursor, `${id} final cursor`)
  }
  // A provenance-backed red counterfactual for the actual-zone reservation gap.
  const roster = { replicate: 0, heroes: ['test-warrior'], enemies: ['test-zombie'], strict: true }
  const center = oldSetup.createBattle(roster).state.units[1].hex
  const options = { ...roster, encounter: { id: 'test.encounter.zone', name: 'Zone TEST', setup: [], schedule: [], heroZone: { count: 1, at: { near: { col: center % 16, row: Math.floor(center / 16) }, range: 0 } } } }
  const before = oldSetup.createBattle(options), after = createBattle(options)
  assert.equal(new Set(before.state.units.map((u: any) => u.hex)).size, 1, 'old setup overlaps the zone hero and rolled enemy')
  assert.equal(new Set(after.state.units.map((u: any) => u.hex)).size, 2, 'new setup reserves the actual zone')
  assert.deepEqual(fs.readFileSync('scratch/direct-map-controls.log', 'utf8').trim().split(/\r?\n/), execFileSync('git', ['show', `${base}:.state/baseline.hash`], { encoding: 'utf8' }).trim().split(/\r?\n/))
  console.log(JSON.stringify({ base, identicalBattles: cases.length, exactControls: MAP_PANEL.length, zoneScenarios, changedExistingCases: 0, zoneOverlapCounterfactual: { oldDistinctHexes: 1, newDistinctHexes: 2 } }, null, 2))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-direct-map-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
