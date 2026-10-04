// The code stamps — one file, two questions (GBH SWITCHES tests.twoStampLists).
//
// 1. WHAT THE BATTLES ARE MADE OF — codeStamp() — what viewer and kingdom check instead
// of the engine's latest commit (Andrew, 2026-10-01). A ruling, a wrap, a handoff or a
// gauntlet log line is an engine commit too; none of them changes a battle, so none of
// them may force viewer or kingdom to rebuild. The stamp names only what the battles and
// the sheets are made of: the engine's code and content (src/, the content pack with it),
// the two engine tools the viewer runs, and the lockfile. A page is REBUILT when it moves.
//
//   import { codeStamp } from '../../engine/tools/code-stamp.mjs'
//   codeStamp()            → { stamp: '1a2b3c4d5e', dirty: false }
//   node tools/code-stamp.mjs     (prints it; --packages adds each package's code stamp)
//
// stamp: the first 10 hex characters of a sha1 over `git ls-tree -r HEAD` of
// those paths — the same files at HEAD give the same stamp whatever commit
// carried them. dirty: any uncommitted change under the same paths only.
//
// 2. THIS PACKAGE'S CODE — stampOf(name, dir), allStamps(root) — what starts a package's
// TESTS (Andrew, 2026-10-04, DECISIONS.md 'combat is tested only when the engine changed'
// and 'the same for content and kingdom changes: each kind of change runs its own tests').
// One definition per package, PACKAGE_CODE below, read by that package's gate, by wrap and
// by the root's tools/combine.mjs through tools/suites.mjs — never a copy. A package's
// suite runs when its stamp has no recorded pass, and not otherwise. What is NOT a
// package's code, and so starts no suite: a regenerated file (the engine's content pack,
// content's published outputs, the viewer's dumps, a built page, kingdom's generated
// items), a document, a ruling, .state/ and a log.
//
// stampOf: the first 10 hex characters of a sha1 over the WORKING TREE's files under the
// package's code paths (path, mode and git blob of each — uncommitted and new files
// included, ignored files not), read through a throwaway index so the real one is never
// touched. The same code gives the same stamp in any copy of the folder, committed or not,
// which is what lets a pass recorded in a worker's copy count at the merge-back.
// 'unknown' when git cannot say; 'unknown' never matches a recorded pass.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ENGINE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** The folder that holds the four packages. */
export const ROOT_DIR = resolve(ENGINE_DIR, '..')
export const CODE_PATHS = ['src', 'tools/field-geometry.mts', 'tools/export-battle.mts', 'package-lock.json']

const git = (dir, args, env) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26, ...(env ? { env } : {}) })

export function codeStamp(dir = ENGINE_DIR) {
  try {
    const tree = git(dir, ['ls-tree', '-r', 'HEAD', '--', ...CODE_PATHS])
    const dirty = git(dir, ['status', '--porcelain', '--', ...CODE_PATHS]).trim().length > 0
    return { stamp: createHash('sha1').update(tree).digest('hex').slice(0, 10), dirty }
  } catch { return { stamp: 'unknown', dirty: false } }
}

// ── this package's code ─────────────────────────────────────────────────────
/** The four packages that have a suite, in the order their stamps are always written. */
export const PACKAGES = ['engine', 'content', 'viewer', 'kingdom']

/** A log is never code, wherever it sits (the *-red.log files beside the tools). */
const LOGS = ':(glob)**/*.log'

/**
 * `code`: git pathspecs, relative to the package folder, whose files are this package's
 * code. `not`: paths inside them that are generated or logs — a change there starts no
 * suite. Everything outside `code` (documents, rulings, .state/, built pages, art) is
 * not code either.
 */
export const PACKAGE_CODE = {
  // engine: src/ without the generated content pack, test/, the tools the tests run,
  // package and compiler config → the engine suite and the control battles.
  engine: {
    code: ['src', 'test', 'tools', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts'],
    not: ['src/content/generated', LOGS],
  },
  // content: the authored rows (gen/, settled.json), the pipeline scripts (the top-level
  // .mjs/.mts/.ts files) and its tests → content's suite. The publisher's outputs
  // (publish.mjs OUTPUTS) are regenerated; test/tests-follow-what-changed.test.ts holds
  // this list to that one.
  content: {
    code: ['gen', 'test', 'settled.json', 'package.json', ':(glob)*.mjs', ':(glob)*.mts', ':(glob)*.ts'],
    not: ['gen/functions.json', 'gen/enemy-pack-gaps.json', 'gen/class-power-gaps.json', LOGS],
  },
  // viewer: its sources, its tools, its tests, the battle library its gate plays (GBH
  // SWITCHES tests.viewerLibraryIsCode) and its package, compiler and test-runner config
  // (vitest.config.ts: how many workers its page tests run on — tool.viewer-vitest-workers)
  // → the viewer's gate. Not generated/ (the dumps, the prepared art) and not
  // BATTLE-VIEWER.html (the built page).
  viewer: {
    code: ['src', 'tools', 'test', 'battles', 'art-src', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts'],
    not: [LOGS],
  },
  // kingdom: its sources without the generated items, its tests, its tools, its one
  // fixture and its package, compiler and test-runner config (vitest.config.ts: how many
  // workers its suite runs on — tool.kingdom-vitest-workers) → kingdom's suite. Not
  // generated/ (art) and not the built pages.
  kingdom: {
    code: ['src', 'test', 'tools', 'fixtures', 'package.json', 'tsconfig.json', 'vitest.config.ts'],
    not: ['src/content/generated', LOGS],
  },
}

const exclude = (p) => (p.startsWith(':(') ? `:(exclude,${p.slice(2)}` : `:(exclude)${p}`)

/**
 * The stamp of package `name`'s code as it stands in `dir` (default: that package beside
 * this engine). Never throws: 'unknown' when `dir` is not a git repository or git fails.
 */
export function stampOf(name, dir = join(ROOT_DIR, name)) {
  const def = PACKAGE_CODE[name]
  if (!def) return 'unknown'
  const idx = join(tmpdir(), `code-stamp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  try {
    try { copyFileSync(resolve(dir, git(dir, ['rev-parse', '--git-path', 'index']).trim()), idx) } catch { /* no commit yet: an empty index */ }
    const env = { ...process.env, GIT_INDEX_FILE: idx }
    // every file `git add -A` would commit, as treeHash reads the tree; then only the code paths of it
    git(dir, ['add', '-A', '--', '.'], env)
    const files = git(dir, ['ls-files', '-s', '--', ...def.code, ...def.not.map(exclude)], env)
    return createHash('sha1').update(files).digest('hex').slice(0, 10)
  } catch { return 'unknown' } finally { try { rmSync(idx, { force: true }) } catch {} }
}

/** Every package's stamp, for the folder `root` that holds the four packages. */
export function allStamps(root = ROOT_DIR) {
  return Object.fromEntries(PACKAGES.map((p) => [p, stampOf(p, join(root, p))]))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { stamp, dirty } = codeStamp()
  console.log(`${stamp}${dirty ? ' (dirty)' : ''}`)
  if (process.argv.includes('--packages')) for (const [p, s] of Object.entries(allStamps())) console.log(`${p.padEnd(8)} code ${s}`)
}
