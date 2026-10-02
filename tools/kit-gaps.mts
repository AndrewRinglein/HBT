// Writes src/content/generated/kits-gaps.json: the pool heroes with no kit (ISC-053). Run by tools/mk-items.mjs
// after the rows; runnable alone:
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/kit-gaps.mts
// A hero's kit is its engine row's defaultItems (src/content/heroes.ts heroKitOf — kingdom.reads-engine, review K15).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { HERO_POOL, CIVILIANS, heroKitOf } from '../src/content/heroes.js'
import { KIT_SPECS } from '../src/content/generated/kits.js'

// --candidate reads the pending specs on stdin and returns JSON, writing nothing.
// Standalone use still audits the published specs; --out-dir redirects its file.
const candidate = process.argv.includes('--candidate')
const { kitSpecs } = candidate
  ? JSON.parse(readFileSync(0, 'utf8')) as { kitSpecs: readonly { id: string }[] }
  : { kitSpecs: KIT_SPECS }
const heroes = [...HERO_POOL, ...CIVILIANS]
const ids = heroes.map((h) => h.id)
const pool = heroes.filter((h) => !heroKitOf(h.unitType)).map((h) => h.id)
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
