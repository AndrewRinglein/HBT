import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const builder = fileURLToPath(new URL('../tools/game-builder.mjs', import.meta.url))
function build(rows: object[]): string {
  const folder = mkdtempSync(join(tmpdir(), 'hobat-builder-test-'))
  try {
    mkdirSync(join(folder, '.state'))
    writeFileSync(join(folder, '.state/gauntlet-log.jsonl'), rows.map(r => JSON.stringify(r)).join('\n'))
    writeFileSync(join(folder, '.state/backlog.json'), '[]')
    const run = spawnSync(process.execPath, [builder, '--quiet'], { cwd: folder, encoding: 'utf8' })
    expect(run.status, run.stderr).toBe(0)
    return readFileSync(join(folder, 'GAME-BUILDER.html'), 'utf8')
  } finally {
    if (dirname(folder) !== resolve(tmpdir()) || !folder.split(/[\\/]/).at(-1)!.startsWith('hobat-builder-test-')) throw new Error('unsafe fixture cleanup')
    rmSync(folder, { recursive: true, force: true })
  }
}
const audit = (label: string, result = 'clean') => ({ at: '2026-09-11T10:00:00Z', type: 'batch-end', label, audit: result })
const run = (id: string) => ({ at: '2026-09-12T10:00:00Z', id, mode: 'check', disposition: 'passed-checks', checks: [] })

it('preserves consecutive audit boundaries and stable batch IDs around later runs', () => {
  const html = build([audit('first audit'), audit('second audit'), run('fix.first'), audit('third audit'), audit('fourth audit'), run('fix.later')])
  for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`data-batch="batch-${n}"`)
  for (const label of ['first audit', 'second audit', 'third audit', 'fourth audit', 'fix.first', 'fix.later']) expect(html).toContain(label)
  expect(html).toContain('2026-09-11')
  expect(html).toContain('2 runs on record')
})

it('renders an audit-only batch with its artifacts and zero run count', () => {
  const html = build([{ ...audit('audit only'), artifacts: [{ href: 'proof.html', label: 'Proof artifact' }] }])
  expect(html).toContain('audit only')
  expect(html).toContain('Proof artifact')
  expect(html).toContain('0 items · 0 runs')
  expect(html).toContain('2026-09-11')
})

it('keeps a failed audit visible even when no gate run preceded it', () => {
  const html = build([audit('failed audit', 'FAILED')])
  expect(html).toContain('Audit: FAILED')
})

it('still explains a completely empty log', () => {
  expect(build([])).toContain('No runs yet')
})
