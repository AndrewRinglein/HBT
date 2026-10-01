// The engine's installed libraries, found from any copy of the folder (Andrew,
// 2026-10-01: up to four workers at once, each in its own copy). Viewer and kingdom
// install nothing; they run on engine/node_modules (esbuild, tsx, vitest, typescript,
// postcss). A worker's copy — a git worktree or a local clone of engine/ — has no
// node_modules of its own, since node_modules is never committed.
//
// engineModules() returns the folder, and when this copy's engine/node_modules is
// missing it links it (a directory junction on Windows, needing no admin) to the one
// it found, so every `../engine/node_modules/...` path in viewer and kingdom — their
// package.json scripts, tsconfig, require() calls — works unchanged. Where it looks:
//
//   1. HOBAT_ENGINE_MODULES, if set — a node_modules folder
//   2. this copy's engine/node_modules — the main folder, or a copy that has one
//   3. the main worktree's engine/node_modules — engine/ is a `git worktree`
//   4. the origin's engine/node_modules — engine/ is a clone of a local folder
//
// Importing this module does it (viewer and kingdom tools import it first);
//   node ../engine/tools/engine-modules.mjs     does it and prints where.
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, symlinkSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ENGINE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HERE = join(ENGINE_DIR, 'node_modules')
const installed = (dir) => !!dir && existsSync(join(dir, 'vitest')) && existsSync(join(dir, 'tsx'))

function git(args) {
  try { return execFileSync('git', ['-C', ENGINE_DIR, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' }
}

/** Where the libraries are, in the order above; null when nowhere. */
export function findEngineModules() {
  const env = process.env.HOBAT_ENGINE_MODULES
  if (env && installed(resolve(env))) return resolve(env)
  if (installed(HERE)) return HERE
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (common) { const main = join(dirname(common), 'node_modules'); if (installed(main)) return main }
  const origin = git(['config', '--get', 'remote.origin.url']).replace(/^file:\/\/\/?/, '')
  if (origin && (isAbsolute(origin) || /^[A-Za-z]:[\\/]/.test(origin))) { const there = join(origin, 'node_modules'); if (installed(there)) return there }
  return null
}

/** The engine's node_modules, linked into this copy when it was elsewhere. Throws, saying how to fix it, when it is nowhere. */
export function engineModules() {
  const found = findEngineModules()
  if (!found) throw new Error(`engine/node_modules: not in this copy (${HERE}), not in the main worktree, not in the origin — run npm ci in the main engine folder, or set HOBAT_ENGINE_MODULES to a node_modules folder`)
  if (found !== HERE) {
    let present = false
    try { lstatSync(HERE); present = true } catch {}
    if (!present) symlinkSync(found, HERE, 'junction')
  }
  return HERE
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const found = findEngineModules()
    engineModules()
    console.log(found === HERE ? `engine/node_modules: here (${HERE})` : `engine/node_modules: linked ${HERE} → ${found}`)
  } catch (e) { console.error(e.message); process.exit(1) }
} else {
  // imported: link quietly if it can; a tool that then needs a library says what is missing
  try { engineModules() } catch {}
}
