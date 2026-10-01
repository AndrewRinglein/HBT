// tools/commit-only.mjs (Andrew, 2026-10-01): the gate and wrap commit only the files
// the item touched, never `git add -A`. What is not named stays changed, staged or
// untracked exactly as it was.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { changedPaths, commitOnly } from '../tools/commit-only.mjs'

const dirs = []
const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'commit-only-'))
  dirs.push(dir)
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' }).trim()
  git('init', '-q')
  for (const f of ['a.txt', 'b.txt', 'gone.txt']) writeFileSync(join(dir, f), f)
  git('add', '.'); git('commit', '-q', '-m', 'init')
  return { dir, git }
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })

describe('commitOnly', () => {
  it('commits the named files — changed, new, deleted, with spaces — and leaves every other change where it was', () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, 'a.txt'), 'a2')
    writeFileSync(join(dir, 'b.txt'), 'b2'); git('add', 'b.txt')       // staged by hand, not named
    mkdirSync(join(dir, 'sub dir')); writeFileSync(join(dir, 'sub dir', 'new file.txt'), 'n')
    writeFileSync(join(dir, 'stray.txt'), 's')                        // untracked, not named
    rmSync(join(dir, 'gone.txt'))
    expect(changedPaths(dir).sort()).toEqual(['a.txt', 'b.txt', 'gone.txt', 'stray.txt', 'sub dir/new file.txt'])

    commitOnly(['a.txt', 'sub dir/new file.txt', 'gone.txt', 'never-existed.txt'], { message: 'only these', cwd: dir })
    expect(git('show', '--name-only', '--format=', 'HEAD').split('\n').sort()).toEqual(['a.txt', 'gone.txt', 'sub dir/new file.txt'])
    expect(git('status', '--porcelain', '-uall').split('\n').sort()).toEqual(['?? stray.txt', 'M  b.txt'])
  })

  it('amends HEAD with more named files and keeps its message', () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, 'a.txt'), 'a2'); writeFileSync(join(dir, 'b.txt'), 'b2')
    commitOnly(['a.txt'], { message: 'the landing', cwd: dir, author: { email: 'a@b', name: 'combat-framework' } })
    commitOnly(['b.txt'], { amend: true, cwd: dir, author: { email: 'a@b', name: 'combat-framework' } })
    expect(git('log', '--format=%an %s')).toBe('combat-framework the landing\nt init')
    expect(git('show', '--name-only', '--format=', 'HEAD').split('\n').sort()).toEqual(['a.txt', 'b.txt'])
  })
})
