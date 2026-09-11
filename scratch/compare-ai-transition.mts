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

const base = '6577a7b'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-ai-before-'))
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
  const cases = MAP_PANEL.flatMap(mapId => Array.from({ length: 25 }, (_, replicate) => ({ id: `${mapId}/${replicate}`, options: { mapId, replicate, enemyCount: 8 } })))
    .concat(Object.entries(SCENARIOS).map(([id, row]) => ({ id, options: scenarioOptions(row) as any })))
  const groups: Record<string, { count: number; example: unknown }> = {}
  const changed: string[] = []
  let resultChanges = 0
  for (const { id, options } of cases) {
    const before = oldSetup.createBattle(options), after = createBattle(options)
    const priorResult = oldBattle.runBattle(before), result = runBattle(after)
    if (JSON.stringify(priorResult) !== JSON.stringify(result)) resultChanges++
    const index = before.events.findIndex((e: unknown, i: number) => JSON.stringify(e) !== JSON.stringify(after.events[i]))
    if (index < 0) { assert.deepEqual(after.events, before.events); assert.deepEqual(after.state, before.state); assert.deepEqual(after.rng.log, before.rng.log); continue }
    changed.push(id)
    const a = before.events[index], b = after.events[index]
    const key = `${a?.type}/${a?.causeId} -> ${b?.type}/${b?.causeId}`
    groups[key] ??= { count: 0, example: { id, before: before.events.slice(Math.max(0, index - 2), index + 3), after: after.events.slice(Math.max(0, index - 2), index + 3) } }
    groups[key]!.count++
  }
  const report = { base, battles: cases.length, changed: changed.length, resultChanges, scenarios: changed.filter(id => id.startsWith('showcase.')), groups }
  fs.writeFileSync('scratch/ai-transition-comparison.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-ai-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
