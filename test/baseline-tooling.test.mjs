import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { filesContaining } from '../tools/source-scan.mjs'

const spec = { id: 'plumbing.test-item', kind: 'plumbing', shape: 'plumbing', spec: 'Validate the pending specification.', expect: 'The pending item is added without a verdict.' }
describe('baseline tooling', () => {
  it('scans nested source files for literal ids and surfaces traversal failures', () => {
    const root = mkdtempSync(join(tmpdir(), 'source-scan-'))
    mkdirSync(join(root, 'nested'))
    writeFileSync(join(root, 'nested', 'a.ts'), 'power.a+b')
    writeFileSync(join(root, 'b.ts'), 'powerXaab')
    expect(filesContaining(root, 'power.a+b')).toEqual([join(root, 'nested', 'a.ts')])
    expect(filesContaining(root, 'power.absent')).toEqual([])
    expect(() => filesContaining(join(root, 'missing'), 'power.a')).toThrow()
  })

  it('adds validated pending specs, rejecting supplied verdicts and duplicates without changing the backlog', () => {
    const root = mkdtempSync(join(tmpdir(), 'add-item-'))
    const backlog = join(root, 'backlog.json'), input = join(root, 'spec.json')
    writeFileSync(backlog, JSON.stringify([{ id: 'prior', status: 'done', sha: 'preserve-me' }]))
    const run = (value) => {
      writeFileSync(input, JSON.stringify(value))
      return execFileSync(process.execPath, ['tools/add-item.mjs', input, '--backlog', backlog], { encoding: 'utf8', stdio: 'pipe' })
    }
    run({ ...spec, needs: ['prior'] })
    const saved = readFileSync(backlog, 'utf8')
    expect(JSON.parse(saved)).toEqual([{ id: 'prior', status: 'done', sha: 'preserve-me' }, { ...spec, needs: ['prior'] }])
    const next = { ...spec, id: 'plumbing.next' }
    for (const value of [spec, { ...next, status: 'done' }, { ...next, gauntlet: 'passed' }, { ...next, reviewed: {} }, { ...next, verdict: 'pass' }, { ...next, needs: ['missing'] }, { ...next, expect: '' }, { ...next, shape: 'ruel' }, { ...next, changesBaseline: 'true' }, { ...next, needs: [next.id] }, [next, next], [{ ...next, needs: ['plumbing.other'] }, { ...next, id: 'plumbing.other', needs: [next.id] }]]) {
      expect(() => run(value)).toThrow()
      expect(readFileSync(backlog, 'utf8')).toBe(saved)
    }
  })

  // Andrew, 2026-10-01 (DECISIONS 'the abandoned ids' dependants are repointed')
  it('repoints pending dependants of an abandoned item to its re-filed one, leaving landed rows and refusing bad pairs', () => {
    const root = mkdtempSync(join(tmpdir(), 'repoint-'))
    const backlog = join(root, 'backlog.json')
    const rows = [
      { id: 'a.old', status: 'failed' }, { id: 'a.new', status: 'done-needs-review' }, { id: 'a.live' },
      { id: 'b.wait', needs: ['a.old', 'a.live'] }, { id: 'b.both', needs: ['a.new', 'a.old'] },
      { id: 'b.landed', status: 'done', needs: ['a.old'] },
    ]
    writeFileSync(backlog, JSON.stringify(rows))
    const run = (...args) => execFileSync(process.execPath, ['tools/add-item.mjs', '--repoint', ...args, '--backlog', backlog], { encoding: 'utf8', stdio: 'pipe' })
    for (const pair of [['a.live', 'a.new'], ['a.old', 'a.missing'], ['a.old', 'a.old'], ['a.new', 'a.live']]) {
      const before = readFileSync(backlog, 'utf8')
      expect(() => run(...pair)).toThrow()
      expect(readFileSync(backlog, 'utf8')).toBe(before)
    }
    expect(run('a.old', 'a.new')).toContain('b.wait, b.both')
    const byId = Object.fromEntries(JSON.parse(readFileSync(backlog, 'utf8')).map((x) => [x.id, x]))
    expect(byId['b.wait'].needs).toEqual(['a.new', 'a.live'])
    expect(byId['b.both'].needs).toEqual(['a.new'])
    expect(byId['b.landed'].needs).toEqual(['a.old'])
    expect(() => run('a.old', 'a.new')).toThrow()   // nothing left to repoint
  })
})
