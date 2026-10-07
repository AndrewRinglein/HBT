// tool.later-items (Andrew 2026-10-06, DECISIONS.md 'the bug list is queued at low priority, behind
// anything real': "I want them to be in our queue, but I want to make sure that, as I queue up other
// real things that we need, these don't get in the way."). An item may carry `later: true`; the
// queue's readers offer it only when nothing else in its area is ready, wherever it sits in the list.
//
// Every test here runs the real tools on a scratch state folder (the four area lists, filed through
// tools/add-item.mjs), so a tool that stopped reading the field fails it.
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AREAS, backlogFile, readBacklog, readyQueue, saveItem } from '../tools/backlog.mjs'

const tool = (name: string) => fileURLToPath(new URL(`../tools/${name}`, import.meta.url))
const PREFIX = 'hobat-later-items-'
type Spec = Record<string, unknown> & { id: string }
const spec = (id: string, more: Record<string, unknown> = {}): Spec =>
  ({ id, kind: 'engine', shape: 'plumbing', spec: `the spec of ${id}`, expect: `the check of ${id}`, ...more })

/** A scratch folder holding four empty area lists; `run` is a tool run in it. */
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), PREFIX))
  mkdirSync(join(dir, '.state'))
  for (const area of AREAS) writeFileSync(join(dir, backlogFile(area)), '[]\n')
  const run = (name: string, ...args: string[]) => spawnSync(process.execPath, [tool(name), ...args], { cwd: dir, encoding: 'utf8' })
  let n = 0
  /** File items with the real add-item.mjs, in the order given. */
  const file = (items: Spec[], ...flags: string[]) => {
    const path = join(dir, `spec-${++n}.json`)
    writeFileSync(path, JSON.stringify(items))
    return run('add-item.mjs', path, ...flags)
  }
  const list = (area: (typeof AREAS)[number]) => JSON.parse(readFileSync(join(dir, backlogFile(area)), 'utf8')) as Spec[]
  const state = join(dir, '.state')
  const done = () => {
    if (dirname(dir) !== resolve(tmpdir()) || !dir.split(/[\\/]/).at(-1)!.startsWith(PREFIX)) throw new Error('unsafe fixture cleanup')
    rmSync(dir, { recursive: true, force: true })
  }
  return { dir, state, run, file, list, done }
}
/** The id next.mjs names: the first word of its first printed line. */
const named = (out: string) => out.trim().split('\n')[0]!.trim().split(/\s+/)[0]
const line = (out: string, start: string) => out.split('\n').find((l) => l.startsWith(start)) ?? ''

describe('add-item.mjs takes `later`, a boolean and nothing else', () => {
  it('files an item marked later, the mark on its row', () => {
    const s = scratch()
    try {
      const r = s.file([spec('fix.a-bug', { later: true }), spec('rule.real-work')])
      expect(r.status, r.stderr).toBe(0)
      expect(s.list('engine').map((x) => [x.id, x.later])).toEqual([['fix.a-bug', true], ['rule.real-work', undefined]])
    } finally { s.done() }
  }, 60_000)
  it('refuses a later that is not a boolean, and files nothing', () => {
    const s = scratch()
    try {
      for (const bad of ['yes', 1, null, 'true', {}]) {
        const r = s.file([spec('fix.a-bug', { later: bad })])
        expect(r.status, JSON.stringify(bad)).toBe(1)
        expect(r.stderr).toContain('later must be boolean')
      }
      expect(s.list('engine')).toEqual([])
    } finally { s.done() }
  }, 60_000)
})

describe('next.mjs and start.mjs offer a later item only when nothing else in its area is ready', () => {
  it('a ready ordinary item filed AFTER a ready later item is the one both name', () => {
    const s = scratch()
    try {
      expect(s.file([spec('fix.first-bug', { later: true }), spec('fix.second-bug', { later: true })]).status).toBe(0)
      expect(s.file([spec('rule.real-work'), spec('rule.more-real-work')]).status).toBe(0)
      // the list holds the bugs first: file order alone would offer fix.first-bug
      expect(s.list('engine').map((x) => x.id)).toEqual(['fix.first-bug', 'fix.second-bug', 'rule.real-work', 'rule.more-real-work'])
      for (const area of [[], ['--area', 'engine']]) {
        const next = s.run('next.mjs', ...area)
        expect(next.status, next.stderr).toBe(0)
        expect(named(next.stdout)).toBe('rule.real-work')
        const start = s.run('start.mjs', ...area)
        expect(start.status, start.stderr).toBe(0)
        expect(start.stdout.split('\n')[0]).toContain('engine — next rule.real-work,')
        const queue = line(start.stdout, 'Queue: ')
        expect(queue).toMatch(/^Queue: rule\.real-work \[engine · plumbing\], then rule\.more-real-work \[engine · plumbing\]/)
        // the bugs are counted on the line, never named ahead of or among the real work
        expect(queue).not.toContain('fix.first-bug')
        expect(queue).toContain('2 later')
        expect(line(start.stdout, 'Delegate: ')).not.toContain('fix.first-bug')
        expect(line(start.stdout, 'Stack for ')).toBe('Stack for rule.real-work: unknown — no Stack section in CLAUDE.md')
      }
    } finally { s.done() }
  }, 60_000)
  it('with only later items ready, both name the first of those and say it is one', () => {
    const s = scratch()
    try {
      expect(s.file([spec('fix.first-bug', { later: true }), spec('fix.second-bug', { later: true }),
        spec('rule.waits', { needs: ['fix.second-bug'] })]).status).toBe(0)
      const next = s.run('next.mjs', '--area', 'engine')
      expect(next.status, next.stderr).toBe(0)
      expect(named(next.stdout)).toBe('fix.first-bug')
      expect(next.stdout.trim().split('\n')[0]).toContain('later')
      const start = s.run('start.mjs', '--area', 'engine')
      expect(start.stdout.split('\n')[0]).toContain('engine — next fix.first-bug,')
      expect(line(start.stdout, 'Queue: ')).toMatch(/^Queue: fix\.first-bug \[engine · plumbing · later\], then fix\.second-bug \[engine · plumbing · later\]$/)
      expect(line(start.stdout, 'Delegate: ')).toContain('fix.first-bug')
      // an ordinary item that is NOT ready does not hold a later one back, and stays on the Blocked line
      expect(line(start.stdout, 'Blocked: ')).toBe('Blocked: rule.waits needs fix.second-bug')
    } finally { s.done() }
  }, 60_000)
  it('the rule is per area: real work in another area does not hide this area\'s later item', () => {
    const s = scratch()
    try {
      expect(s.file([spec('fix.engine-bug', { later: true }), spec('viewer.real-work', { kind: 'viewer' }),
        spec('viewer.page-bug', { kind: 'viewer', later: true })]).status).toBe(0)
      expect(named(s.run('next.mjs', '--area', 'engine').stdout)).toBe('fix.engine-bug')
      expect(named(s.run('next.mjs', '--area', 'viewer-kingdom').stdout)).toBe('viewer.real-work')
      // asked of every area at once, real work anywhere comes before a later item anywhere
      expect(named(s.run('next.mjs').stdout)).toBe('viewer.real-work')
      expect(readyQueue(readBacklog(s.state), null).map((x) => x.id)).toEqual(['viewer.real-work', 'fix.engine-bug', 'viewer.page-bug'])
      expect(readyQueue(readBacklog(s.state), 'viewer-kingdom').map((x) => x.id)).toEqual(['viewer.real-work', 'viewer.page-bug'])
    } finally { s.done() }
  }, 60_000)
  it('a later item whose needs have not landed is not offered at all', () => {
    const s = scratch()
    try {
      expect(s.file([spec('fix.needs-the-other', { later: true, needs: ['fix.the-other'] }), spec('fix.the-other', { later: true, kind: 'content' })]).status).toBe(0)
      const next = s.run('next.mjs', '--area', 'engine')
      expect(next.status).toBe(1)
      expect(next.stdout).toContain('fix.needs-the-other needs fix.the-other')
      expect(named(s.run('next.mjs', '--area', 'content').stdout)).toBe('fix.the-other')
    } finally { s.done() }
  }, 60_000)
})

describe('the Game Builder page lists the later items apart', () => {
  it('under their own heading, and out of the open count', () => {
    const s = scratch()
    try {
      expect(s.file([spec('fix.first-bug', { later: true }), spec('rule.real-work'), spec('viewer.page-bug', { kind: 'viewer', later: true })]).status).toBe(0)
      const r = s.run('game-builder.mjs', '--quiet')
      expect(r.status, r.stderr).toBe(0)
      const html = readFileSync(join(s.dir, 'GAME-BUILDER.html'), 'utf8')
      const at = html.indexOf('<h2 id="later">')
      expect(at).toBeGreaterThan(-1)
      const section = html.slice(at, html.indexOf('<h2', at + 4))
      expect(section).toContain('fix.first-bug')
      expect(section).toContain('viewer.page-bug')
      expect(section).not.toContain('rule.real-work')
      expect(html).toContain('<div class="n">1</div><div class="l">backlog open</div>')
      expect(html).toContain('<div class="n">2</div><div class="l">later</div>')
    } finally { s.done() }
  }, 60_000)
  it('a page with no later item has no such heading', () => {
    const s = scratch()
    try {
      expect(s.file([spec('rule.real-work')]).status).toBe(0)
      expect(s.run('game-builder.mjs', '--quiet').status).toBe(0)
      const html = readFileSync(join(s.dir, 'GAME-BUILDER.html'), 'utf8')
      expect(html).not.toContain('<h2 id="later">')
      expect(html).toContain('<div class="n">1</div><div class="l">backlog open</div>')
    } finally { s.done() }
  }, 60_000)
})

describe('the gate treats a later item like any other once it is named', () => {
  it('counts it, finds it by its id, and writes its verdict to its own list with the mark kept', () => {
    const s = scratch()
    try {
      const git = (...a: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: s.dir, encoding: 'utf8' })
      git('init', '-q')
      writeFileSync(join(s.dir, 'a.txt'), 'one\n')
      git('add', 'a.txt'); git('commit', '-q', '-m', 'first')
      expect(s.file([spec('fix.a-bug', { later: true, kind: 'content' }), spec('fix.b-bug', { kind: 'content' })]).status).toBe(0)
      expect(s.run('gate.mjs', '--count').stdout.trim()).toBe('0 of 2 landed · 0 await review · 2 pending')
      // the same command on the later item and on the ordinary one beside it: the same exit, the same record
      const why = 'a scratch run: the gate is asked for an item by its name'
      const rows = ['fix.a-bug', 'fix.b-bug'].map((id) => {
        const r = s.run('gate.mjs', id, '--abandon', why)
        expect(r.stdout).toContain(`gate: ${id}   [abandon · fast]`)
        expect(r.stdout).toContain('ABANDONED')
        expect(r.status).toBe(1)
        const { failedAt, ...row } = s.list('content').find((x) => x.id === id)!
        expect(String(failedAt)).toMatch(/^\d{4}-\d{2}-\d{2} /)
        return row
      })
      expect(rows[0]).toEqual({ ...spec('fix.a-bug', { later: true, kind: 'content' }), status: 'failed', reason: why })
      expect(rows[1]).toEqual({ ...spec('fix.b-bug', { kind: 'content' }), status: 'failed', reason: why })
      expect(s.list('engine')).toEqual([])
    } finally { s.done() }
  }, 60_000)
  it('a landed later item leaves the queue as a landed ordinary one does, and frees what needed it', () => {
    const s = scratch()
    try {
      expect(s.file([spec('fix.a-bug', { later: true }), spec('fix.b-bug', { later: true }), spec('rule.waits', { needs: ['fix.a-bug'] })]).status).toBe(0)
      // what the gate writes at a landing (tools/gate.mjs: item.status, item.sha, saveItem)
      const all = readBacklog(s.state)
      const item = all.find((x) => x.id === 'fix.a-bug')!
      item.status = 'done'; item.sha = 'abc1234'
      saveItem(all, item, s.state)
      expect(s.list('engine')[0]).toMatchObject({ id: 'fix.a-bug', later: true, status: 'done', sha: 'abc1234' })
      // the item that needed the bug is real work and now ready: it comes before the bug still waiting
      expect(named(s.run('next.mjs', '--area', 'engine').stdout)).toBe('rule.waits')
      expect(readyQueue(readBacklog(s.state), 'engine').map((x) => x.id)).toEqual(['rule.waits', 'fix.b-bug'])
    } finally { s.done() }
  }, 60_000)
  it('reads no `later` anywhere: its checks cannot tell the two apart', () => {
    const gate = readFileSync(tool('gate.mjs'), 'utf8') + readFileSync(tool('gate-progress.mjs'), 'utf8')
    expect(gate).not.toMatch(/\.later\b|['"]later['"]/)
  })
})
