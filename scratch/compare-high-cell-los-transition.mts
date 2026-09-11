import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { ITEMS } from '../src/content/index.js'
import { rosterOptionsOf } from '../src/sim/progression.js'
import { TERRAIN } from '../src/core/types.js'

const base = '4b5c53b'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-high-cell-los-before-'))
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
  const oldProgression = await import(pathToFileURL(path.join(temporary, 'src/sim/progression.ts')).href)
  const oldItems = await import(pathToFileURL(path.join(temporary, 'src/content/index.ts')).href)
  const cases: { id: string; before: any; after: any }[] = MAP_PANEL.flatMap(mapId => Array.from({ length: 25 }, (_, replicate) => ({ id: `${mapId}/${replicate}`, before: { mapId, replicate, enemyCount: 8, strict: true }, after: { mapId, replicate, enemyCount: 8, strict: true } })))
  for (const [id, row] of Object.entries(oldScenarios.SCENARIOS)) {
    const before = oldScenarios.scenarioOptions(row), after = scenarioOptions(SCENARIOS[id]!)
    assert.deepEqual(after, before, `${id} unchanged options`)
    cases.push({ id, before, after })
  }
  const schedule = JSON.parse(fs.readFileSync('../progression/PROGRESSION-SCHEDULE.json', 'utf8'))
  for (const replicate of [0, 1, 2]) cases.push({ id: `progression-surge-${replicate}`, before: { ...oldProgression.rosterOptionsOf(schedule, 20, oldItems.ITEMS), replicate, enemyCount: 12, mapId: 'map.open', strict: true }, after: { ...rosterOptionsOf(schedule, 20, ITEMS), replicate, enemyCount: 12, mapId: 'map.open', strict: true } })
  const changed: any[] = [], identical: string[] = [], obstacleFree: string[] = []
  for (const { id, before: optsBefore, after: optsAfter } of cases) {
    const before = oldSetup.createBattle(optsBefore), after = createBattle(optsAfter)
    assert.deepEqual(after.state, before.state, `${id} setup state`)
    assert.deepEqual(after.events, before.events, `${id} setup events`)
    assert.deepEqual(after.rng, before.rng, `${id} setup full RNG`)
    const blockers = after.state.terrain.filter(t => t === TERRAIN.OBSTACLE).length
    const a = oldBattle.runBattle(before), b = runBattle(after)
    const prior = { state: before.state, events: before.events, rng: before.rng, cursor: before.battleCursor, result: a }
    const next = { state: after.state, events: after.events, rng: after.rng, cursor: after.battleCursor, result: b }
    if (!blockers) {
      assert.deepEqual(next, prior, `${id} obstacle-free exact state/events/full RNG/cursor/result`)
      obstacleFree.push(id)
    }
    if (isDeepStrictEqual(next, prior)) identical.push(id)
    else {
      assert.ok(blockers > 0, `${id} changes require blockers`)
      const first = before.events.findIndex((e: any, i: number) => !isDeepStrictEqual(e, after.events[i]))
      changed.push({ id, blockers, firstDifference: first, beforeEvent: before.events[first], afterEvent: after.events[first], beforeResult: a, afterResult: b })
    }
  }
  assert.ok(changed.length > 0, 'LOS has a real battle consequence')
  assert.ok(obstacleFree.length > 0, 'obstacle-free baseline actually exercised')
  const result = { base, battles: cases.length, exactSetupAll: true, obstacleFreeExact: obstacleFree.length, identical: identical.length, changedCount: changed.length, changedCursorCases: changed.filter(row => !row.id.includes('/')).map(row => row.id), obstacleFree, changed }
  fs.writeFileSync('scratch/high-cell-los-transition.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ ...result, obstacleFree: undefined, changed: undefined }, null, 2))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-high-cell-los-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
