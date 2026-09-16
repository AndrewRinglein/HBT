import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {runBattle} from '../src/core/battle.js'
import {battleCursorCases} from '../test/battle-cursor-cases.js'

const base = '1723e63'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-elemental-before-'))
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
try {
  const root = path.join(temporary, 'engine')
  for (const file of execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src', 'test/battle-cursor-cases.ts'], {encoding: 'utf8'}).trim().split(/\r?\n/)) {
    const target = path.resolve(root, file)
    assert.ok(target.startsWith(root + path.sep))
    fs.mkdirSync(path.dirname(target), {recursive: true})
    fs.writeFileSync(target, execFileSync('git', ['show', `${base}:${file}`], {maxBuffer: 16 * 1024 * 1024}))
  }
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}')
  fs.mkdirSync(path.join(temporary, 'progression'))
  fs.copyFileSync('../progression/PROGRESSION-SCHEDULE.json', path.join(temporary, 'progression/PROGRESSION-SCHEDULE.json'))
  const oldBattle = await import(pathToFileURL(path.join(root, 'src/core/battle.ts')).href)
  const oldCases = (await import(pathToFileURL(path.join(root, 'test/battle-cursor-cases.ts')).href)).battleCursorCases()
  const changes: unknown[] = [], cases: unknown[] = []
  for (const fixture of battleCursorCases()) {
    const before = oldCases.find((row: {id: string}) => row.id === fixture.id).create()
    const after = fixture.create()
    const priorResult = oldBattle.runBattle(before), result = runBattle(after)
    const prior = {events: hash(before.events), state: hash(before.state), rng: hash(before.rng.log), result: priorResult}
    const current = {events: hash(after.events), state: hash(after.state), rng: hash(after.rng.log), result}
    const changed = JSON.stringify(prior) !== JSON.stringify(current)
    if (changed) {
      const index = before.events.findIndex((event: unknown, i: number) => JSON.stringify(event) !== JSON.stringify(after.events[i]))
      const a = before.events[index], b = after.events[index]
      assert.equal(a.type, 'damage.applied', fixture.id)
      assert.equal(b.type, 'damage.applied', fixture.id)
      assert.ok(['status.burn', 'status.poison'].includes(a.statusId), fixture.id)
      assert.equal(a.statusId, b.statusId)
      assert.equal(a.damageType, 'magic')
      assert.equal(b.damageType, a.statusId === 'status.burn' ? 'fire' : 'poison')
      assert.deepEqual(before.events.slice(0, index), after.events.slice(0, index))
      changes.push({id: fixture.id, firstEvent: index, before: before.events[index], after: after.events[index], resultChanged: JSON.stringify(priorResult) !== JSON.stringify(result)})
    }
    cases.push({id: fixture.id, changed, ...current})
  }
  const report = {base, count: cases.length, changes}
  fs.writeFileSync('runs/v2-elemental/transition.json', JSON.stringify(report, null, 2) + '\n')
  const frozen = JSON.stringify({sourceCommit: base, workingTreeChange: 'rule.elemental-resists', rulesVersion: 'v2-migration.17', cases}, null, 2) + '\n'
  const target = 'test/fixtures/battle-cursor-elemental.json'
  if (fs.existsSync(target)) assert.equal(fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), frozen)
  else fs.writeFileSync(target, frozen, {flag: 'wx'})
  console.log(JSON.stringify({base, count: cases.length, changed: changes.length, unchanged: cases.length - changes.length}))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-elemental-before-'))
  fs.rmSync(temporary, {recursive: true, force: true})
}
