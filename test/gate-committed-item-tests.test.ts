// The engine gate counts an item's COMMITTED tests as its own (2026-10-06; DECISIONS.md 2026-10-06 'engine items too are
// built in groups of up to four, with one set of heavy checks for the group': "each item is still its own commit, with its own
// test written first and seen red", and the gate is run for each item after the group's one chain).
//
// Until now the gate read an engine item's own tests from the working tree's uncommitted changes only; for a viewer or a
// kingdom item it also counted that package's commits that name the item (GBH SWITCHES gate.testsHome). An engine item
// built in a group is committed before its gate runs, so the gate found "no test file touched". The one rule now holds in
// every home: a commit whose message names the item counts, its test files in `git status --porcelain` form.
//
// A scratch repository; nothing here touches the real folder.
import { describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { committedItemTests, killSwitchFiles, testFilesIn } from '../tools/gate-progress.mjs'

// every test here makes a scratch repository and runs git a dozen times: seconds alone, more beside other workers' runs - a time limit is not the assertion
vi.setConfig({ testTimeout: 120_000 })
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const put = (file: string, text: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text) }
function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gate-committed-'))
  git(dir, 'init', '-q'); git(dir, 'config', 'user.email', 't@example.invalid'); git(dir, 'config', 'user.name', 't'); git(dir, 'config', 'commit.gpgsign', 'false')
  put(join(dir, 'test/old.test.ts'), '// old\n'); put(join(dir, 'src/a.ts'), 'export const a = 1\n')
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'the tree before')
  return dir
}

describe("an item's committed tests are its own", () => {
  it('the commits that name the item: a test file it added reads as added, one it edited as modified; other commits and other files do not count', () => {
    const dir = repo()
    put(join(dir, 'test/new.test.ts'), '// new\n'); put(join(dir, 'test/old.test.ts'), '// old, restated\n'); put(join(dir, 'src/a.ts'), 'export const a = 2\n')
    put(join(dir, 'test/fixtures/new.json'), '{}\n')
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'rule.one-thing: built, its test first')
    put(join(dir, 'test/other.test.ts'), '// other\n')
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'rule.another-thing: built')
    const mine = committedItemTests('rule.one-thing', dir)
    expect(testFilesIn(mine).sort()).toEqual(['test/new.test.ts', 'test/old.test.ts'])
    expect(killSwitchFiles(mine)).toEqual(['test/new.test.ts'])          // the kill switch runs on what the item ADDED
    expect(testFilesIn(committedItemTests('rule.another-thing', dir))).toEqual(['test/other.test.ts'])
    expect(committedItemTests('rule.nobody-built-this', dir)).toBe('')
  })
  it('an id is matched as written, not as a pattern, and a longer id that begins the same way is another item', () => {
    const dir = repo()
    put(join(dir, 'test/b.test.ts'), '// b\n')
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'rule.one-thing-more: built')
    expect(testFilesIn(committedItemTests('rule.one-thing-more', dir))).toEqual(['test/b.test.ts'])
    expect(committedItemTests('rule.one.thing-more', dir)).toBe('')      // the dot is a dot
    // 'rule.one-thing' is the start of 'rule.one-thing-more': the shorter id does not claim the longer one's commit
    expect(committedItemTests('rule.one-thing', dir)).toBe('')
  })
  it('a test the item added and a later commit of the same item edited is still one it added', () => {
    const dir = repo()
    put(join(dir, 'test/c.test.ts'), '// c\n')
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'rule.c: built')
    put(join(dir, 'test/c.test.ts'), '// c, more\n')
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'rule.c: one more case')
    expect(killSwitchFiles(committedItemTests('rule.c', dir))).toEqual(['test/c.test.ts'])
  })
})
