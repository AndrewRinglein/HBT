#!/usr/bin/env node
// What landed, what was abandoned, what needs review — and the slice count.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
const b = JSON.parse(readFileSync('.state/backlog.json', 'utf8'))
const by = (s) => b.filter((x) => (x.status ?? 'pending') === s)
const flagged = by('done-needs-review'), done = by('done'), failed = by('failed'), pending = by('pending')
console.log(`\nKingdom backlog — ${done.length + flagged.length} landed, ${failed.length} abandoned, ${pending.length} pending\n`)
for (const x of [...done, ...flagged]) console.log(`  LANDED  ${x.sha ?? '-'}  ${x.id}${x.isc?.length ? '  closes ' + x.isc.map((n) => `ISC-${n}`).join(',') : ''}${x.gauntlet === 'passed' ? '  ⛓' : x.gauntlet ? '  (' + x.gauntlet + ')' : ''}${x.status === 'done-needs-review' ? '   ** NEEDS REVIEW **' : ''}`)
for (const x of failed) console.log(`  ABANDON            ${x.id}   ${x.reason ?? ''}`)
for (const x of pending) console.log(`  pending            ${x.id}`)
try { console.log(`\nslice: ${execSync('node tools/slice-gate.mjs --count', { encoding: 'utf8' }).trim()}`) } catch {}
if (flagged.length) console.log(`\n${flagged.length} item(s) landed flagged — read .state/ledger.md before trusting them.`)
console.log()
