// Put the working tree back to HEAD without deleting a file — the revert `--abandon`
// needs, made to work where the folder refuses unlink (Cowork's mount: `git checkout`
// and `git clean` delete and recreate, and die there). Andrew, 2026-09-24: "One, yes"
// (DECISIONS.md "abandon works in Cowork").
//
//   · a tracked file that differs from HEAD is OVERWRITTEN IN PLACE with HEAD's copy
//     (`git cat-file --filters`, so line-ending filters apply as checkout would);
//   · a tracked file deleted from the tree is written back;
//   · a file HEAD does not have — untracked, or added to the index — is MOVED into
//     `<git dir>/_abandoned/<stamp>/`, never deleted: nothing is lost, and nothing
//     under .git is ever committed;
//   · `keep` paths are left alone entirely (the gate's own memory, the tools, scratch);
//     ignored files are left alone, as `git clean` without -x leaves them;
//   · the index is reset to HEAD last.
// Works the same on a normal disk. Returns what it did, for the gate to print.
import { execFileSync } from 'node:child_process'
import { mkdirSync, renameSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function revertTree(keep, stamp = new Date().toISOString().replace(/[:.]/g, '-')) {
  const git = (...args) => execFileSync('git', args, { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] })
  const list = (...args) => git(...args).toString('utf8').split('\0').filter(Boolean)
  const kept = (p) => keep.some((k) => p === k || p.startsWith(k + '/'))
  const gitDir = git('rev-parse', '--git-dir').toString('utf8').trim()
  const inHead = new Set(list('ls-tree', '-r', '-z', '--name-only', 'HEAD'))
  const parked = [], restored = []
  const park = (p) => {
    if (!existsSync(p)) return
    const to = join(gitDir, '_abandoned', stamp, p)
    mkdirSync(dirname(to), { recursive: true })
    renameSync(p, to)
    parked.push(p)
  }
  // tracked changes against HEAD, staged or not — modified, deleted, or added
  for (const p of list('diff', '--name-only', '-z', 'HEAD', '--')) {
    if (kept(p)) continue
    if (!inHead.has(p)) { park(p); continue }
    mkdirSync(dirname(p) || '.', { recursive: true })
    writeFileSync(p, git('cat-file', '--filters', `HEAD:${p}`))
    restored.push(p)
  }
  // untracked, not ignored
  for (const p of list('ls-files', '--others', '--exclude-standard', '-z')) if (!kept(p)) park(p)
  git('reset', '-q')
  return { restored, parked, parkedAt: parked.length ? join(gitDir, '_abandoned', stamp) : null }
}
