#!/usr/bin/env node
// node tools/audit-all.mjs
//
// The Iron Gauntlet's periodic full audit. Per-item gates see DELTAS — this sees
// the WHOLE tree, because drift that arrives in ten innocent pieces is only
// visible in aggregate. The gate runs it automatically every 10 landings;
// batch-add runs it at the end of every batch; it can be run by hand any time.
//
// It does not revert anything: a failure here may implicate a landing five
// commits back, and unwinding that is a decision, not a reflex. It fails loudly,
// writes the ledger, and exits 1.

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, appendFileSync } from 'node:fs'
import { runDiagnosticCommand } from './command-diagnostic.mjs'
import { readBacklog } from './backlog.mjs'

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe' })
const tryRun = (cmd) => { try { return { ok: true, out: sh(cmd) } } catch (e) {
  return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') } } }

const results = []
const audit = (name, fn) => {
  const r = fn()
  results.push({ name, ...r })
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${name}${r.note ? '  — ' + r.note : ''}`)
}

console.log('\nIRON GAUNTLET — full audit\n')

audit('typecheck', () => {
  const r = tryRun('npx tsc --noEmit')
  return { ok: r.ok, note: r.ok ? '' : r.out.split('\n').filter(Boolean)[0] }
})

audit('every test in the suite', () => {
  const r = runDiagnosticCommand('npx vitest run --reporter=dot', 'audit-full-suite')
  const m = r.out.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/)
  return { ok: r.ok, note: r.ok ? `${m?.[2] ?? '?'} passed` : `${m?.[1] ?? '?'} FAILED — ${r.note}` }
})

audit('control battles match golden', () => {
  const r = tryRun('npx tsx tools/baseline.mts')
  if (!r.ok) return { ok: false, note: 'baseline probe errored' }
  const now = r.out.trim().split('\n').filter((l) => / [0-9a-f]{8}$/.test(l)).join('\n')
  let golden = ''
  try { golden = readFileSync('.state/baseline.hash', 'utf8').trim() } catch {}
  return { ok: now === golden, note: now === golden ? '' : 'hashes differ from golden — some landing since the last bless leaked' }
})

audit('whole-core hardcode scan', () => {
  // The per-item scan reads the diff; this reads EVERYTHING. Same patterns:
  // content-instance ids (three segments under a content kind) and creature-tag
  // literals (mirrors CODEX.md §12, 2026-08-20). Comment lines are exempt —
  // documentation may name examples; code may not.
  const ID = /['"`](attack|power|unit|badge|item|enchant|specialty|map)\.[a-z0-9-]+\.[a-z0-9-]+['"`]/
  const TAG = /['"`](beast|construct|demon|dragon|elemental|giant|horror|nightmare|plant|undead|vampire|werewolf|catfolk|dwarf|elf|fae)['"`]/
  const hits = []
  for (const f of readdirSync('src/core')) {
    if (!f.endsWith('.ts')) continue
    readFileSync(`src/core/${f}`, 'utf8').split('\n').forEach((line, i) => {
      const t = line.trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
      if (ID.test(line) || TAG.test(line)) hits.push(`${f}:${i + 1}`)
    })
  }
  return { ok: hits.length === 0, note: hits.length ? `content names in core: ${hits.slice(0, 5).join(', ')}` : '' }
})

audit('content has published sources', () => {
  const r = tryRun('node tools/content-check.mjs --strict')
  const n = (r.out.match(/INVENTED \.+ (\d+)/) ?? [])[1]
  return { ok: true, note: n && n !== '0' ? `${n} grandfathered INVENTED ids remain` : 'all sourced' }
})

audit('flagged landings awaiting review', () => {
  // Not a failure — a reminder. Flags only work if somebody reads them.
  const backlog = readBacklog()
  const flagged = backlog.filter((b) => b.status === 'done-needs-review').map((b) => b.id)
  return { ok: true, note: flagged.length ? `${flagged.length} flagged: ${flagged.slice(0, 6).join(', ')} — node tools/report.mjs` : 'none' }
})

audit('prior art — what is new since the last run', () => {
  // tool.prior-art-audit (2026-09-28): the whole tree's inventory (.state/inventory.json) diffed
  // against the last run. What is new is printed, not failed — a look-alike needs reading, and the
  // gate already asked each landing to name its prior art. A run that cannot finish fails (Law 9).
  const r = tryRun('node tools/prior-art.mjs --write')
  if (!r.ok) return { ok: false, note: r.out.split('\n').filter(Boolean).at(-1) }
  const lines = r.out.split('\n').filter(Boolean)
  for (const l of lines.slice(1)) console.log(`        ${l.trim()}`)
  return { ok: true, note: (lines.find((l) => l.startsWith('prior art')) ?? '').replace(/^prior art — /, '') }
})

audit('wrong home — what the engine holds that another package owns', () => {
  // tool.wrong-home-audit (2026-09-28): the removal list, generated/wrong-home.md. Printed, not failed —
  // every line is a move out of the engine, and each is its own item.
  const r = tryRun('node tools/wrong-home.mjs --write')
  if (!r.ok) return { ok: false, note: r.out.split('\n').filter(Boolean).at(-1) }
  const lines = r.out.split('\n').filter(Boolean)
  for (const l of lines.slice(1)) console.log(`        ${l.trim()}`)
  return { ok: true, note: `${(lines.find((l) => l.startsWith('wrong home')) ?? '').replace(/^wrong home — /, '')} — generated/wrong-home.md` }
})

const failed = results.filter((r) => !r.ok)
const stamp = new Date().toISOString()
// The audit runs at batch end — so it OWNS the batch boundary. One marker line
// into the run log; the Game Builder splits its bars on these, never on a time
// heuristic (a gap guess once swallowed a new session inside an approved bar).
const label = (() => { const i = process.argv.indexOf('--label'); return i > 0 ? process.argv[i + 1] : undefined })()
// --artifact "href|label" (repeatable): a thing this batch produced that a human
// WATCHES — the Game Builder puts it on the batch bar and plays .html ones inline.
// Hrefs are relative to the shipped page's home (the project root).
const artifacts = []
for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === '--artifact') {
  const [href, alabel] = String(process.argv[i + 1] ?? '').split('|')
  if (href) artifacts.push({ href, label: alabel || href })
}
// --checkpoint (the gate's every-10-landings run): audit only, NO batch-end
// marker — a health check mid-batch is not a boundary, and writing one split
// a real batch in two on 2026-08-20.
const checkpoint = process.argv.includes('--checkpoint')
if (!checkpoint) appendFileSync('.state/gauntlet-log.jsonl', JSON.stringify({ at: stamp, type: 'batch-end', audit: failed.length ? 'FAILED' : 'clean', ...(label ? { label } : {}), ...(artifacts.length ? { artifacts } : {}) }) + '\n')
try { execSync('node tools/game-builder.mjs --quiet', { stdio: 'ignore' }) } catch {}
if (failed.length) {
  appendFileSync('.state/ledger.md',
    `\n## IRON GAUNTLET FULL AUDIT — FAILED\n${stamp}\n\n${failed.map((f) => `  FAIL  ${f.name} — ${f.note}`).join('\n')}\n`)
  console.log(`\nAUDIT FAILED (${failed.length}). Nothing reverted — a failure here may implicate an older landing. Investigate before the next item.\n`)
  process.exit(1)
}
console.log('\nAudit clean.\n')
