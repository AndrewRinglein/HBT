// Commit only the named files — never `git add -A` (Andrew, 2026-10-01: "have the
// gate and wrap commit only the files the item touched instead of everything").
// Anything else changed or staged in the tree is left exactly as it was, so
// another item's work in progress, another area's list or a chat's scratch file
// never rides along on a landing or a wrap.
//
//   changedPaths(cwd)                         every changed or new file, as git status lists it
//   commitOnly(paths, { message | amend, author, cwd })
//
// The paths go to git through a file (--pathspec-from-file), so neither a long list
// nor a name with spaces meets a shell or the Windows command-line limit.
import { execFileSync } from 'node:child_process'
import { writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const git = (args, cwd, opts = {}) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26, ...opts })

/** Every path `git status` reports — modified, deleted, staged, untracked (each file, -uall). Forward slashes, relative to cwd's repository root. */
export function changedPaths(cwd = process.cwd()) {
  const out = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], cwd)
  const parts = out.split('\0').filter(Boolean)
  const paths = []
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i].slice(0, 2), path = parts[i].slice(3)
    paths.push(path)
    if (code[0] === 'R' || code[0] === 'C') paths.push(parts[++i])   // a rename's old name follows it
  }
  return [...new Set(paths)]
}

/**
 * Stage and commit exactly `paths` (added, changed or deleted). With `amend`, the
 * paths are folded into HEAD and its message kept. Paths that neither exist nor are
 * known to git are dropped. `timeout` (ms) bounds each git call (wrap.mjs's clock).
 * Returns the paths committed.
 */
export function commitOnly(paths, { message, amend = false, author = null, cwd = process.cwd(), timeout = undefined } = {}) {
  const known = new Set(git(['ls-files', '-z'], cwd).split('\0').filter(Boolean))
  const list = [...new Set(paths)].filter((p) => existsSync(resolve(cwd, p)) || known.has(p))
  if (!list.length) throw new Error('commitOnly: no file to commit')
  const file = join(tmpdir(), `commit-only-${process.pid}-${Date.now()}`)
  writeFileSync(file, list.join('\0') + '\0')
  try {
    const spec = [`--pathspec-from-file=${file}`, '--pathspec-file-nul']
    git(['add', '-A', ...spec], cwd, { timeout })
    const who = author ? ['-c', `user.email=${author.email}`, '-c', `user.name=${author.name}`] : []
    git([...who, 'commit', '-q', ...(amend ? ['--amend', '--no-edit'] : ['-m', message]), ...spec], cwd, { timeout })
  } finally { try { rmSync(file, { force: true }) } catch {} }
  return list
}
