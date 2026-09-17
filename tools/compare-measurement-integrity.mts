// Compare the full no-disable battle trace against the pre-repair source.
// Historical source is materialized in a guarded temporary directory, never
// checked out over the working tree. No expected fixture is rewritten.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

assert.equal(process.env.CF_DISABLE_IDS ?? '', '', 'comparison requires no experimental omissions')
const base = '37b6ffd'
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-measurement-before-'))
const root = path.join(temporary, 'engine')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
try {
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src', 'test/battle-cursor-cases.ts'], { encoding: 'utf8' }).trim().split(/\r?\n/)
  for (const file of files) {
    const destination = path.resolve(root, file)
    assert.ok(destination.startsWith(root + path.sep))
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 16 * 1024 * 1024 }))
  }
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}')
  fs.mkdirSync(path.join(temporary, 'progression'))
  fs.copyFileSync('../progression/PROGRESSION-SCHEDULE.json', path.join(temporary, 'progression/PROGRESSION-SCHEDULE.json'))
  const beforeBattle = await import(pathToFileURL(path.join(root, 'src/core/battle.ts')).href)
  const beforeCases = (await import(pathToFileURL(path.join(root, 'test/battle-cursor-cases.ts')).href)).battleCursorCases()
  const { runBattle } = await import('../src/core/battle.js')
  const { battleCursorCases } = await import('../test/battle-cursor-cases.js')
  const cases = []
  for (const fixture of battleCursorCases()) {
    const prior = beforeCases.find((candidate: { id: string }) => candidate.id === fixture.id)
    assert.ok(prior, fixture.id)
    const before = prior.create(), after = fixture.create()
    const beforeResult = beforeBattle.runBattle(before), result = runBattle(after)
    assert.deepEqual(after.events, before.events, `${fixture.id}: events`)
    assert.deepEqual(after.state, before.state, `${fixture.id}: state`)
    assert.deepEqual(after.rng.log, before.rng.log, `${fixture.id}: RNG`)
    assert.deepEqual(result, beforeResult, `${fixture.id}: result`)
    cases.push({ id: fixture.id, events: hash(after.events), state: hash(after.state), rng: hash(after.rng.log), result })
  }
  assert.equal(cases.length, beforeCases.length)
  fs.mkdirSync('runs/measurement-integrity', { recursive: true })
  fs.writeFileSync('runs/measurement-integrity/no-disable-comparison.json', JSON.stringify({ base, exact: cases.length, cases }, null, 2) + '\n')
  console.log(JSON.stringify({ base, exact: cases.length, changed: 0, compared: ['events', 'state', 'RNG', 'result'] }))
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temporary).startsWith('hobat-measurement-before-'))
  fs.rmSync(temporary, { recursive: true, force: true })
}
