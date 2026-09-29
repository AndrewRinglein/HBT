// Writes generated/vocabulary.json — the engine's vocabulary (src/core/vocabulary.ts) for the
// tools that cannot import TypeScript: content/mkenginepack.mjs and content/audit.mjs read it.
// plumbing.vocabulary-export (2026-09-28). Generated — never hand-edit; test/vocabulary.test.ts
// refuses a stale copy.
//   npx tsx tools/vocabulary.mts           write it
//   npx tsx tools/vocabulary.mts --check   exit 1 if the file on disk is stale
import { readFileSync, writeFileSync } from 'node:fs'
import { vocabularyJson } from '../src/core/vocabulary.js'

const path = new URL('../generated/vocabulary.json', import.meta.url)
const now = vocabularyJson()
if (process.argv.includes('--check')) {
  let disk = ''
  try { disk = readFileSync(path, 'utf8') } catch {}
  if (disk !== now) { console.error('generated/vocabulary.json is stale — run: npx tsx tools/vocabulary.mts'); process.exit(1) }
  console.log('generated/vocabulary.json is current')
} else {
  writeFileSync(path, now)
  console.log('wrote generated/vocabulary.json')
}
