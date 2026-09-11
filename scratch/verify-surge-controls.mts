// One-time transition evidence for fix.surge-cycle, anchored to its actual parent.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'

const base = '03ab367'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-surge-before-'))
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
  let changed = 0, battles = 0
  for (const mapId of MAP_PANEL) for (let replicate = 0; replicate < 25; replicate++) {
    const options = { mapId, replicate, enemyCount: 8 }
    const before = oldSetup.createBattle(options), after = createBattle(options)
    const priorResult = oldBattle.runBattle(before), result = runBattle(after)
    const terminal = before.events.findIndex((event: { type: string }) => event.type === 'battle.end')
    const tail = before.events.slice(terminal + 1)
    assert.ok(tail.every((event: { type: string }) => event.type === 'phase.end.begin'))
    if (tail.length) changed++
    assert.deepEqual(after.events, before.events.slice(0, terminal + 1), `${mapId}/${replicate}: event delta`)
    assert.deepEqual(after.state, { ...before.state, seq: after.events.length }, `${mapId}/${replicate}: state delta`)
    assert.deepEqual(after.rng.log, before.rng.log, `${mapId}/${replicate}: RNG delta`)
    assert.deepEqual(result, priorResult, `${mapId}/${replicate}: outcome delta`)
    battles++
  }
  assert.equal(changed, 37)
  const report = { base, battles, changed, removedOnly: 'phase.end.begin after battle.end', stateRngOutcomeUnchanged: true }
  fs.writeFileSync('scratch/surge-control-comparison.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-surge-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
