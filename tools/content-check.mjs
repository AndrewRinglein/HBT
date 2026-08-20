#!/usr/bin/env node
// Does every content value in the engine come from a published design document?
//
// The project structure says downstream reads `<n>-<AREA>-SETTLED.md` and never the
// NOTES. The engine is downstream. So: every content id the engine implements must
// appear in a SETTLED file, and every id a SETTLED file publishes should exist here.
//
// This exists because seven terrain rows were invented while the spec sat one
// directory up. A rule in CLAUDE.md would not have caught that — it depends on
// being read. This does not.
//
//   node tools/content-check.mjs          report
//   node tools/content-check.mjs --strict  exit 1 on any INVENTED id

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DESIGN = '..'                        // the design folder, one level up
const STRICT = process.argv.includes('--strict')

// ── what the design documents publish ───────────────────────────────────────
const idRe = /\b((?:terrain|status|attack|power|unit|map|ai|item|badge|condition|encounter|realm|territory|building|quest|unlock|currency|injury|origin|legacy|screen|stage|engagement|card|cup|class|folk)\.[a-z0-9][a-z0-9.-]*)/g

// A SETTLED file PUBLISHES an id only in a table row of the Ids section. Prose is
// not publication — 1-EFFECTS-SETTLED.md names `status.burn` in a sentence saying
// it is NOT yet shaped and must not be referenced. Grepping for the string read
// that as approval, which is exactly backwards.
function publishedIn(path) {
  const out = new Map()
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trimStart().startsWith('|')) continue          // table rows only
    const first = line.split('|')[1] ?? ''                    // the Id column
    const m = first.match(/`([a-z]+\.[a-z0-9][a-z0-9.-]*)`/)
    if (m) out.set(m[1], path)
  }
  return out
}

function scanDoc(path) {
  const out = new Map()
  if (!existsSync(path)) return out
  const text = readFileSync(path, 'utf8')
  for (const m of text.matchAll(idRe)) out.set(m[1], path)
  return out
}

const settledFiles = existsSync(DESIGN)
  ? readdirSync(DESIGN).filter((f) => /-SETTLED\.md$/.test(f)).map((f) => join(DESIGN, f))
  : []
// Everything else in the design folder is context, NOT contract.
const otherDocs = existsSync(DESIGN)
  ? readdirSync(DESIGN).filter((f) => f.endsWith('.md') && !/-SETTLED\.md$/.test(f)).map((f) => join(DESIGN, f))
  : []

// RULED, Angela 2026-08-20: THE CODEX COUNTS AS A PUBLISHED SOURCE — it is the
// fresh generated layer and may still change, but a row in it is a decision, not
// an invention. An id counts as Codex-published when it appears in CODEX.md at
// all (the Codex is generated from authored content; it has no provisional prose
// the way NOTES files do).
const codexPath = join(DESIGN, 'CODEX.md')
const codexIds = scanDoc(codexPath)

// RULED, Angela 2026-08-20: THE TESTING LANE. Content invented purely to exercise
// a mechanic under test is legal when marked — the id kind is `test`
// (test.warrior.second-wind). Test rows live in content/ beside real rows, are
// excluded from the published-source contract, and never ship.
const isTestId = (id) => id.startsWith('test.')

const published = new Map()   // id -> file   (the contract)
for (const f of settledFiles) for (const [id, p] of publishedIn(f)) if (!published.has(id)) published.set(id, p)
for (const [id, p] of codexIds) if (!published.has(id)) published.set(id, p)
const mentioned = new Map()   // id -> file   (context only)
// A SETTLED file's PROSE is context, not contract — same as any other document.
for (const f of [...otherDocs, ...settledFiles]) for (const [id, p] of scanDoc(f)) if (!mentioned.has(id)) mentioned.set(id, p)

// ── what the engine actually implements ─────────────────────────────────────
const engineIds = new Map()   // id -> where
function scanSrc(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) { scanSrc(p); continue }
    if (!/\.(ts|mts)$/.test(e.name)) continue
    const text = readFileSync(p, 'utf8')
    for (const m of text.matchAll(/id:\s*'([a-z]+\.[a-z0-9.-]+)'/g)) if (!engineIds.has(m[1])) engineIds.set(m[1], p)
    for (const m of text.matchAll(/'(terrain\.[a-z-]+)'/g)) if (!engineIds.has(m[1])) engineIds.set(m[1], p)
  }
}
scanSrc('src')

// ── report ──────────────────────────────────────────────────────────────────
const invented = [], contextOnly = [], ok = [], unbuilt = [], testing = []
for (const [id, where] of [...engineIds].sort()) {
  if (isTestId(id)) testing.push([id, where])
  else if (published.has(id)) ok.push([id, published.get(id)])
  else if (mentioned.has(id)) contextOnly.push([id, where, mentioned.get(id)])
  else invented.push([id, where])
}
// The unbuilt list stays SETTLED-only: the Codex publishes hundreds of ids the
// engine hasn't built yet, and that gap is the roadmap, not a finding.
for (const [id, f] of [...published].sort()) if (!engineIds.has(id) && !String(f).endsWith('CODEX.md')) unbuilt.push([id, f])

const pad = (s, n) => String(s).padEnd(n)
console.log(`\ncontent-check — ${settledFiles.length} SETTLED files, ${engineIds.size} ids in the engine\n`)

console.log(`PUBLISHED and built .......... ${ok.length}`)
for (const [id, f] of ok) console.log(`  ok        ${pad(id, 26)} ${f}`)

console.log(`\nMENTIONED but not published ... ${contextOnly.length}   <- in a design doc, not in a SETTLED file`)
for (const [id, where, doc] of contextOnly) console.log(`  context   ${pad(id, 26)} engine:${where}  doc:${doc}`)

if (testing.length) console.log(`\nTESTING lane .................. ${testing.length}   <- marked test.*, never ships`)
for (const [id, where] of testing) console.log(`  ${pad('test', 9)} ${pad(id, 26)} ${where}`)
console.log(`\nINVENTED ...................... ${invented.length}   <- no design source anywhere`)
for (const [id, where] of invented) console.log(`  INVENTED  ${pad(id, 26)} ${where}`)

console.log(`\nPUBLISHED but not built ....... ${unbuilt.length}`)
for (const [id, f] of unbuilt) console.log(`  todo      ${pad(id, 26)} ${f}`)

console.log()
if (STRICT && invented.length) {
  console.log(`FAIL — ${invented.length} content ids have no design source.`)
  process.exit(1)
}
