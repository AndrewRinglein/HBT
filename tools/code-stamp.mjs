// The engine's code stamp — what viewer and kingdom check instead of the engine's
// latest commit (Andrew, 2026-10-01). A ruling, a wrap, a handoff or a gauntlet
// log line is an engine commit too; none of them changes a battle, so none of
// them may force viewer or kingdom to rebuild. The stamp names only what the
// battles and the sheets are made of: the engine's code and content (src/), the
// two engine tools the viewer runs, and the lockfile.
//
//   import { codeStamp } from '../../engine/tools/code-stamp.mjs'
//   codeStamp()            → { stamp: '1a2b3c4d5e', dirty: false }
//   node tools/code-stamp.mjs     (prints it)
//
// stamp: the first 10 hex characters of a sha1 over `git ls-tree -r HEAD` of
// those paths — the same files at HEAD give the same stamp whatever commit
// carried them. dirty: any uncommitted change under the same paths only.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ENGINE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const CODE_PATHS = ['src', 'tools/field-geometry.mts', 'tools/export-battle.mts', 'package-lock.json']

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 })

export function codeStamp(dir = ENGINE_DIR) {
  try {
    const tree = git(dir, ['ls-tree', '-r', 'HEAD', '--', ...CODE_PATHS])
    const dirty = git(dir, ['status', '--porcelain', '--', ...CODE_PATHS]).trim().length > 0
    return { stamp: createHash('sha1').update(tree).digest('hex').slice(0, 10), dirty }
  } catch { return { stamp: 'unknown', dirty: false } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { stamp, dirty } = codeStamp()
  console.log(`${stamp}${dirty ? ' (dirty)' : ''}`)
}
