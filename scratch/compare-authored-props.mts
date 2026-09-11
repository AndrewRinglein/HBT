import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { ITEMS } from '../src/content/index.js'
import { rosterOptionsOf } from '../src/sim/progression.js'
import { projectShorthand } from '../test/props-projection.js'
const base = '038304f', temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-props-before-'))
try {
  for (const file of execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/)) {
    const target = path.resolve(temporary, file)
    assert.ok(target.startsWith(temporary + path.sep))
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 16 * 1024 * 1024 }))
  }
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}')
  const load = (file: string) => import(pathToFileURL(path.join(temporary, file)).href)
  const oldSetup = await load('src/core/setup.ts'), oldBattle = await load('src/core/battle.ts'), oldMaps = await load('src/content/maps.ts')
  const oldScenarios = await load('src/content/scenarios.ts'), oldProgression = await load('src/sim/progression.ts'), oldItems = await load('src/content/index.ts')
  assert.deepEqual(MAP_PANEL.slice(0, oldMaps.MAP_PANEL.length), oldMaps.MAP_PANEL)
  assert.equal(oldMaps.MAP_PANEL.length, 20)
  const cases: { id: string; before: any; after: any }[] = oldMaps.MAP_PANEL.flatMap((mapId: string) => Array.from({ length: 25 }, (_, replicate) => ({ id: `${mapId}/${replicate}`, before: { mapId, replicate, enemyCount: 8, strict: true }, after: { mapId, replicate, enemyCount: 8, strict: true } })))
  for (const [id, row] of Object.entries(oldScenarios.SCENARIOS)) {
    const before = oldScenarios.scenarioOptions(row), after = scenarioOptions(SCENARIOS[id]!)
    assert.deepEqual(after, before, `${id} unchanged fielding inputs`)
    cases.push({ id, before, after })
  }
  const schedule = JSON.parse(fs.readFileSync('../progression/PROGRESSION-SCHEDULE.json', 'utf8'))
  for (const replicate of [0, 1, 2]) cases.push({ id: `progression-surge-${replicate}`, before: { ...oldProgression.rosterOptionsOf(schedule, 20, oldItems.ITEMS), replicate, enemyCount: 12, mapId: 'map.open', strict: true }, after: { ...rosterOptionsOf(schedule, 20, ITEMS), replicate, enemyCount: 12, mapId: 'map.open', strict: true } })
  let diagnosticChanges = 0
  for (const item of cases) {
    const old = oldSetup.createBattle(item.before), next = createBattle(item.after), originalGround = [...old.state.terrain]
    const setup = projectShorthand(next, originalGround)
    assert.deepEqual(setup.state, old.state, `${item.id}: setup state`)
    assert.deepEqual(setup.events, old.events, `${item.id}: setup events`)
    assert.deepEqual(next.rng, old.rng, `${item.id}: setup full RNG`)
    const oldResult = oldBattle.runBattle(old), result = runBattle(next), projected = projectShorthand(next, originalGround)
    diagnosticChanges += next.events.filter(e => e.reason === 'impassable prop' || e.stoppedBy === 'impassable prop').length
    assert.deepEqual(projected.state, old.state, `${item.id}: final state`)
    assert.deepEqual(projected.events, old.events, `${item.id}: all other event fields`)
    assert.deepEqual(next.rng, old.rng, `${item.id}: full RNG`)
    assert.deepEqual(next.battleCursor, old.battleCursor, `${item.id}: cursor`)
    assert.deepEqual(result, oldResult, `${item.id}: result`)
  }
  const result = { base, battles: cases.length, oldMaps: 20, appendedMaps: MAP_PANEL.slice(20), exactGameplayAndRng: true, exactOtherEvents: true, diagnosticChanges, projection: 'Exact authored x props only; OPEN ground at those cells; initial census/terrain/props; precise knockback reason/stoppedBy diagnostic.' }
  fs.writeFileSync('scratch/authored-props-transition.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-props-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
