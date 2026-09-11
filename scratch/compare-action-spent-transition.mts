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
import { rosterOptionsOf, type Schedule } from '../src/sim/progression.js'

const base = 'b0a80f6'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-action-spent-before-'))
try {
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/)
  for (const file of files) {
    const target = path.resolve(temporary, file)
    assert.ok(target.startsWith(temporary + path.sep))
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 16 * 1024 * 1024 }))
  }
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}')
  const oldSetup = await import(pathToFileURL(path.join(temporary, 'src/core/setup.ts')).href)
  const oldBattle = await import(pathToFileURL(path.join(temporary, 'src/core/battle.ts')).href)
  const schedule = JSON.parse(fs.readFileSync('../progression/PROGRESSION-SCHEDULE.json', 'utf8')) as Schedule
  const cases = MAP_PANEL.flatMap(mapId => Array.from({ length: 25 }, (_, replicate) => ({ id: `${mapId}/${replicate}`, options: { mapId, replicate, enemyCount: 8 } })))
    .concat(Object.entries(SCENARIOS).map(([id, row]) => ({ id, options: scenarioOptions(row) as any })))
    .concat([0, 1, 2].map(replicate => ({ id: `progression-surge-${replicate}`, options: { ...rosterOptionsOf(schedule, 20, ITEMS), replicate, enemyCount: 12, mapId: 'map.open', strict: true } as any })))
  assert.equal(MAP_PANEL.length * 25, 450)
  const rows = []
  for (const { id, options } of cases) {
    const before = oldSetup.createBattle(options), after = createBattle(options)
    const priorResult = oldBattle.runBattle(before), result = runBattle(after)
    const expenditures = after.events.filter(e => e.type === 'action.spent')
    assert.ok(expenditures.length > 0, `${id}: no new event`)
    assert.equal(before.events.filter((e: any) => e.type === 'action.spent').length, 0)
    // Only the new record and the two sequence counters may differ.
    const normalizedEvents = after.events.filter(e => e.type !== 'action.spent').map((e, seq) => ({ ...e, seq }))
    const normalizedState = { ...after.state, seq: after.state.seq - expenditures.length }
    assert.deepEqual(normalizedEvents, before.events, `${id}: other events changed`)
    assert.deepEqual(normalizedState, before.state, `${id}: gameplay state changed`)
    assert.deepEqual(after.rng, before.rng, `${id}: RNG changed`)
    assert.deepEqual(after.battleCursor, before.battleCursor, `${id}: cursor changed`)
    assert.deepEqual(result, priorResult, `${id}: result changed`)
    rows.push({ id, eventsBefore: before.events.length, expenditures: expenditures.length })
  }
  const report = { base, contract: 'plumbing.action-spent', controls: 450, scenarios: Object.keys(SCENARIOS).length, progression: 3, battles: rows.length, expenditures: rows.reduce((sum, row) => sum + row.expenditures, 0), otherEventChanges: 0, gameplayChanges: 0, rngChanges: 0, resultChanges: 0, cases: rows }
  fs.writeFileSync('scratch/action-spent-transition-comparison.json', JSON.stringify(report, null, 2) + '\n')
  const { cases: _cases, ...summary } = report
  console.log(JSON.stringify(summary))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-action-spent-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
