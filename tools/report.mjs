#!/usr/bin/env node
import { readFileSync } from 'node:fs'
const b = JSON.parse(readFileSync('.state/backlog.json', 'utf8'))
const by = (s) => b.filter(x => (x.status ?? 'pending') === s)
const flagged = by('done-needs-review'), done = by('done'), failed = by('failed'), pending = by('pending')
console.log(`\nBacklog — ${done.length + flagged.length} landed, ${failed.length} abandoned, ${pending.length} pending\n`)
for (const x of [...done, ...flagged]) console.log(`  LANDED  ${x.sha ?? '-'}  ${x.id}${x.status === 'done-needs-review' ? '   ** NEEDS REVIEW **' : ''}`)
for (const x of failed) console.log(`  ABANDON            ${x.id}   ${x.reason ?? ''}`)
for (const x of pending) console.log(`  pending            ${x.id}`)
if (flagged.length) console.log(`\n${flagged.length} item(s) edited existing tests — read the diffs in .state/ledger.md before trusting them.\n`)
