#!/usr/bin/env node
// node tools/review.mjs <id> --ok "note"        clear one flagged landing
// node tools/review.mjs --all --ok "note"       clear every flagged landing
//
// The missing half of the flag mechanism (built 2026-08-20, when Angela asked
// what she was supposed to DO about withheld seals). The gate flags a landing
// so a human looks at it; this is where the human's verdict LANDS — the only
// sanctioned status writer besides the gate itself. It never grants a seal:
// the gauntlet verdict is history and stays exactly as the gate wrote it. It
// records WHO signed off, WHEN, and in what words, in both the backlog and
// the ledger, and flips done-needs-review → done so the queue counts down.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const all = args.includes('--all')
const okAt = args.indexOf('--ok')
const note = okAt >= 0 ? args[okAt + 1] : null
const id = all ? null : args.find((a) => !a.startsWith('--') && a !== note)

if (!note || note.length < 8) {
  console.error('A review needs the reviewer\'s words: --ok "why this is fine" (8+ chars).')
  process.exit(2)
}
if (!all && !id) { console.error('usage: review.mjs <id> --ok "note"  |  review.mjs --all --ok "note"'); process.exit(2) }

const backlog = JSON.parse(readFileSync('.state/backlog.json', 'utf8'))
const targets = backlog.filter((b) => b.status === 'done-needs-review' && (all || b.id === id))
if (targets.length === 0) { console.log(all ? 'Nothing is flagged.' : `'${id}' is not flagged.`); process.exit(all ? 0 : 1) }

const stamp = new Date().toISOString()
for (const b of targets) {
  b.status = 'done'
  b.reviewed = { by: 'Angela', at: stamp, note }
  console.log(`  reviewed  ${b.id}  (${b.gauntlet ?? 'no gauntlet verdict'})`)
}
writeFileSync('.state/backlog.json', JSON.stringify(backlog, null, 1) + '\n')
appendFileSync('.state/ledger.md',
  `\n## REVIEW — ${targets.length} flagged landing(s) cleared\n${stamp} · Angela: "${note}"\n\n` +
  targets.map((b) => `  ok  ${b.id}`).join('\n') + '\n')
try { execSync('node tools/game-builder.mjs --quiet', { stdio: 'ignore' }) } catch {}
console.log(`\n${targets.length} cleared. The seal history is untouched — this records the human verdict, it does not rewrite the gate's.`)
