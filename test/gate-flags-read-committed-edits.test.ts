// tool.gate-flags-read-committed-edits (2026-10-06). Found landing the first group under the group rule (DECISIONS.md
// 2026-10-06 'engine items too are built in groups of up to four, with one set of heavy checks for the group'): the gate's
// flag 'existing tests untouched' read only UNCOMMITTED edits, so an item built in a group - committed before its gate runs -
// was never flagged when it rewrote a standing test. The flag is how the review list is made (Law 10: an edited standing
// test is always shown to Andrew); the group rule must not empty it.
//
// Every flag and check of the gate that learns what an item touched from uncommitted state now also reads the commits that
// name the item - the whole id, never a longer one that begins the same way - in the engine and in the other three
// packages. Nothing is removed or loosened; a flag still never blocks.
//
// Scratch repositories; nothing here runs a tool on the real folder.
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { committedAddedLines, committedNewFiles, editedTests, itemCommits, reviewOf } from '../tools/gate-progress.mjs'
import { changedFiles } from '../tools/prior-art.mjs'

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const put = (file: string, text: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text) }
const commit = (dir: string, message: string) => { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', message) }
function repoAt(dir: string): string {
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q'); git(dir, 'config', 'user.email', 't@example.invalid'); git(dir, 'config', 'user.name', 't'); git(dir, 'config', 'commit.gpgsign', 'false'); git(dir, 'config', 'core.autocrlf', 'false')
  return dir
}
const OLD = "it('holds', () => {\n  expect(a).toBe(1)\n  expect(b).toBe(2)\n})\n"
/** The folder's shape: a root holding engine, viewer, kingdom and content, each its own repository with a standing test. */
function folder(): { root: string; engine: string; viewer: string; kingdom: string; content: string } {
  const root = mkdtempSync(join(tmpdir(), 'gate-flags-'))
  const f = { root, engine: repoAt(join(root, 'engine')), viewer: repoAt(join(root, 'viewer')), kingdom: repoAt(join(root, 'kingdom')), content: repoAt(join(root, 'content')) }
  put(join(f.engine, 'test/standing.test.ts'), OLD); put(join(f.engine, 'test/fixtures/held.json'), '{\n "a": 1\n}\n'); put(join(f.engine, 'src/core/a.ts'), 'export const a = 1\n'); put(join(f.engine, 'src/content/rows.ts'), "export const rows = ['unit.zombie']\n")
  put(join(f.viewer, 'test/viewer.page.test.ts'), OLD); put(join(f.viewer, 'tools/bar.test.mjs'), OLD); put(join(f.viewer, 'tools/fixtures/dump.json'), '{\n "a": 1\n}\n'); put(join(f.viewer, 'tools/build.mjs'), 'export const b = 1\n')
  put(join(f.kingdom, 'test/sets.test.ts'), OLD); put(join(f.kingdom, 'tools/stand-up.verify.mjs'), OLD)
  put(join(f.content, 'test/rows.test.mjs'), OLD)
  for (const d of [f.engine, f.viewer, f.kingdom, f.content]) commit(d, 'the tree before')
  return f
}
const RESTATED = "it('holds', () => {\n  // Restated: was expect(a).toBe(1)\n  expect(a).toBe(3)\n  expect(b).toBe(2)\n})\n"

describe('the commits that name an item', () => {
  it('are the item\'s, oldest first; a longer id that begins the same way is another item', () => {
    const f = folder()
    put(join(f.engine, 'src/core/a.ts'), 'export const a = 2\n'); commit(f.engine, 'rule.x: built')
    put(join(f.engine, 'src/core/a.ts'), 'export const a = 3\n'); commit(f.engine, 'rule.x-more: built')
    put(join(f.engine, 'src/core/a.ts'), 'export const a = 4\n'); commit(f.engine, 'group B (rule.x, rule.y): the records')
    const subjects = (id: string) => itemCommits(id, f.engine).map((sha) => git(f.engine, 'log', '-1', '--format=%s', sha))
    expect(subjects('rule.x')).toEqual(['rule.x: built', 'group B (rule.x, rule.y): the records'])
    expect(subjects('rule.x-more')).toEqual(['rule.x-more: built'])
    expect(subjects('rule.y')).toEqual(['group B (rule.x, rule.y): the records'])
    expect(itemCommits('rule.z', f.engine)).toEqual([])
    rmSync(f.root, { recursive: true, force: true })
  })
})

describe("'existing tests untouched' reads what the item committed", () => {
  it('an item whose own commit deletes lines of an existing test is flagged; one that only adds a new test file is not', () => {
    const f = folder()
    put(join(f.engine, 'test/standing.test.ts'), RESTATED); put(join(f.engine, 'test/mine.test.ts'), OLD); commit(f.engine, 'rule.restates: built, a standing line restated with a dated note')
    put(join(f.engine, 'test/only-new.test.ts'), OLD); commit(f.engine, 'rule.adds: built, its own test')
    expect(editedTests('rule.restates', { home: f.engine })).toEqual([{ file: 'test/standing.test.ts', add: 2, del: 1 }])
    expect(editedTests('rule.adds', { home: f.engine })).toEqual([])
    // … and what is still uncommitted counts beside it, as it always did
    put(join(f.engine, 'test/standing.test.ts'), OLD.replace('toBe(2)', 'toBe(5)'))
    expect(editedTests('rule.adds', { home: f.engine })).toEqual([{ file: 'test/standing.test.ts', add: 2, del: 3 }])
    rmSync(f.root, { recursive: true, force: true })
  })
  it('an item named rule.x is not charged with rule.x-more\'s commits', () => {
    const f = folder()
    put(join(f.engine, 'test/standing.test.ts'), RESTATED); commit(f.engine, 'rule.x-more: restates a standing test')
    put(join(f.engine, 'test/x.test.ts'), OLD); commit(f.engine, 'rule.x: its own test')
    expect(editedTests('rule.x', { home: f.engine })).toEqual([])
    expect(editedTests('rule.x-more', { home: f.engine }).map((w) => w.file)).toEqual(['test/standing.test.ts'])
    rmSync(f.root, { recursive: true, force: true })
  })
  it('a test the item itself added and then edited in a later commit of its own is not a standing test', () => {
    const f = folder()
    put(join(f.engine, 'test/mine.test.ts'), OLD); commit(f.engine, 'rule.mine: built')
    put(join(f.engine, 'test/mine.test.ts'), RESTATED); commit(f.engine, 'rule.mine: one more case')
    expect(editedTests('rule.mine', { home: f.engine })).toEqual([])
    rmSync(f.root, { recursive: true, force: true })
  })
  it('a fixture under the home\'s test/ that the item rewrote is flagged, as an uncommitted one always was', () => {
    const f = folder()
    put(join(f.engine, 'test/fixtures/held.json'), '{\n "a": 2\n}\n'); commit(f.engine, 'rule.fixture: the held numbers moved')
    expect(editedTests('rule.fixture', { home: f.engine })).toEqual([{ file: 'test/fixtures/held.json', add: 1, del: 1 }])
    rmSync(f.root, { recursive: true, force: true })
  })
  it('in the other three packages: a standing test the item\'s commit there restated is flagged under its package\'s name - test files, not regenerated data', () => {
    const f = folder()
    const others = [f.viewer, f.kingdom, f.content]
    put(join(f.viewer, 'test/viewer.page.test.ts'), RESTATED); put(join(f.viewer, 'tools/bar.test.mjs'), RESTATED)
    put(join(f.viewer, 'tools/fixtures/dump.json'), '{\n "a": 2\n}\n'); put(join(f.viewer, 'tools/build.mjs'), 'export const b = 2\n'); put(join(f.viewer, 'tools/new.test.mjs'), OLD)
    commit(f.viewer, 'content.words (engine item): the page says the new word; two older assertions restated')
    put(join(f.kingdom, 'test/sets.test.ts'), RESTATED); put(join(f.kingdom, 'tools/stand-up.verify.mjs'), RESTATED); commit(f.kingdom, 'content.words (engine item): the kingdom half')
    put(join(f.content, 'test/rows.test.mjs'), RESTATED); commit(f.content, 'content.words: the rows')
    put(join(f.engine, 'test/words.test.ts'), OLD); commit(f.engine, 'content.words: the pack, its own test')
    expect(editedTests('content.words', { home: f.engine, others }).map((w) => w.file)).toEqual([
      'content/test/rows.test.mjs', 'kingdom/test/sets.test.ts', 'kingdom/tools/stand-up.verify.mjs', 'viewer/test/viewer.page.test.ts', 'viewer/tools/bar.test.mjs'])
    // without the other packages named the engine's home alone is read
    expect(editedTests('content.words', { home: f.engine })).toEqual([])
    // a viewer item's home is the viewer: everything under its test/, and its tool tests
    expect(editedTests('content.words', { home: f.viewer, others: [f.engine, f.kingdom, f.content] }).map((w) => w.file)).toEqual([
      'content/test/rows.test.mjs', 'kingdom/test/sets.test.ts', 'kingdom/tools/stand-up.verify.mjs', 'test/viewer.page.test.ts', 'tools/bar.test.mjs'])
    rmSync(f.root, { recursive: true, force: true })
  })
})

describe('what a landed item should have been flagged for, read again from its commits', () => {
  it('reviewOf says whether the item needs review and carries the diff a reviewer reads', () => {
    const f = folder()
    put(join(f.engine, 'test/standing.test.ts'), RESTATED); commit(f.engine, 'rule.restates: built')
    put(join(f.viewer, 'tools/bar.test.mjs'), RESTATED); commit(f.viewer, 'rule.restates (engine item): the bar')
    put(join(f.engine, 'test/only-new.test.ts'), OLD); commit(f.engine, 'rule.adds: built')
    const r = reviewOf('rule.restates', { home: f.engine, others: [f.viewer, f.kingdom, f.content] })
    expect(r.needsReview).toBe(true)
    expect(r.edited.map((w) => w.file)).toEqual(['test/standing.test.ts', 'viewer/tools/bar.test.mjs'])
    expect(r.diff).toMatch(/-  expect\(a\)\.toBe\(1\)/)
    expect(r.diff).toMatch(/\+  expect\(a\)\.toBe\(3\)/)
    expect(r.diff).toMatch(/viewer\/tools\/bar\.test\.mjs|b\/tools\/bar\.test\.mjs/)
    expect(reviewOf('rule.adds', { home: f.engine, others: [f.viewer, f.kingdom, f.content] })).toEqual({ needsReview: false, edited: [], diff: '' })
    rmSync(f.root, { recursive: true, force: true })
  })
})

describe('the other checks that read what an item added', () => {
  it('the added lines of a path, and the files it added, are read from its commits too', () => {
    const f = folder()
    put(join(f.engine, 'src/core/a.ts'), "export const a = 1\nexport const named = 'unit.zombie.bite'\n"); put(join(f.engine, 'src/core/utils.ts'), 'export const u = 1\n')
    commit(f.engine, 'rule.names: built')
    put(join(f.engine, 'src/core/a.ts'), "export const a = 1\nexport const named = 'unit.zombie.bite'\nexport const later = 2\n"); commit(f.engine, 'rule.other: built')
    expect(committedAddedLines('rule.names', f.engine, 'src/core')).toEqual(["+export const named = 'unit.zombie.bite'", '+export const u = 1'])
    expect(committedAddedLines('rule.other', f.engine, 'src/core')).toEqual(['+export const later = 2'])
    expect(committedAddedLines('rule.names', f.engine, 'src/content')).toEqual([])
    expect(committedNewFiles('rule.names', f.engine)).toEqual(['src/core/utils.ts'])
    expect(committedNewFiles('rule.other', f.engine)).toEqual([])
    rmSync(f.root, { recursive: true, force: true })
  })
  it('the prior-art and wrong-home audits\' list of what an item changed holds its committed files, from the tree before its first commit', () => {
    const root = mkdtempSync(join(tmpdir(), 'gate-flags-audit-'))
    const engine = repoAt(join(root, 'engine'))
    put(join(engine, 'src/core/a.ts'), 'export const a = 1\n'); commit(engine, 'the tree before')
    put(join(engine, 'src/core/a.ts'), 'export const a = 1\nexport const b = 2\n'); put(join(engine, 'src/core/c.ts'), 'export const c = 3\n'); commit(engine, 'rule.audited: built')
    expect(changedFiles(root)).toEqual([])                                   // nothing uncommitted: it read nothing
    const mine = changedFiles(root, 'rule.audited')
    expect(mine.map((c) => [c.path, c.before, c.after, c.added])).toEqual([
      ['engine/src/core/a.ts', 'export const a = 1\n', 'export const a = 1\nexport const b = 2\n', [[2, 2]]],
      ['engine/src/core/c.ts', null, 'export const c = 3\n', [[1, 2]]]])
    expect(changedFiles(root, 'rule.audited-more')).toEqual([])
    rmSync(root, { recursive: true, force: true })
  })
})
