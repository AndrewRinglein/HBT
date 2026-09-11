// Writes src/content/generated/kits-gaps.json: the pool heroes the codex gives no kit
// (ISC-053). Run by tools/mk-items.mjs after the rows; runnable alone:
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/kit-gaps.mts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { HERO_POOL, CIVILIANS } from '../src/content/heroes.js'
import { HERO_KITS, KIT_SPECS } from '../src/content/generated/kits.js'

// --candidate reads the pending kits on stdin and returns JSON, writing nothing.
// Standalone use still audits the published kits; --out-dir redirects its file.
const candidate = process.argv.includes('--candidate')
const { kits, kitSpecs } = candidate
  ? JSON.parse(readFileSync(0, 'utf8')) as { kits: Record<string, readonly string[]>; kitSpecs: readonly { id: string }[] }
  : { kits: HERO_KITS, kitSpecs: KIT_SPECS }
const ids = [...HERO_POOL, ...CIVILIANS].map((h) => h.id)
const pool = ids.filter((id) => !kits[id])
const pinnedSpecs = kitSpecs.filter((k) => ids.includes(k.id)).map((k) => k.id)
const report = JSON.stringify({ writtenBy: 'tools/kit-gaps.mts', pool, pinnedSpecs }, null, 1) + '\n'
if (candidate) process.stdout.write(report)
else {
  const at = process.argv.indexOf('--out-dir')
  const out = at < 0 ? 'src/content/generated' : process.argv[at + 1]
  if (!out) throw new Error('--out-dir requires a directory')
  mkdirSync(out, { recursive: true })
  const path = join(out, 'kits-gaps.json')
  writeFileSync(path, report)
  console.log(`${path} — ${pool.length} pool hero(es) without a kit${pool.length ? ': ' + pool.join(', ') : ''}`)
}
