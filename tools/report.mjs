#!/usr/bin/env node
import { readBacklog } from './backlog.mjs'
const b = readBacklog()
const by = (s) => b.filter(x => (x.status ?? 'pending') === s)
const flagged = by('done-needs-review'), done = by('done'), failed = by('failed'), pending = by('pending')
console.log(`\nBacklog — ${done.length + flagged.length} landed, ${failed.length} abandoned, ${pending.length} pending\n`)
for (const x of [...done, ...flagged]) console.log(`  LANDED  ${x.sha ?? '-'}  ${x.id}${x.status === 'done-needs-review' ? '   ** NEEDS REVIEW **' : ''}${x.picture ? ` — look: ${x.picture}` : ''}`)
for (const x of failed) console.log(`  ABANDON            ${x.id}   ${x.reason ?? ''}`)
for (const x of pending) console.log(`  pending            ${x.id}`)
// a look item (tool.look-items-land-on-a-picture, 2026-10-06) is flagged for its picture, not for an edited test: the two are counted apart
const looks = flagged.filter((x) => x.picture)
if (looks.length) console.log(`\n${looks.length} look item(s) landed on a picture — open each: the path beside it, from the folder that holds the packages.`)
if (flagged.length > looks.length) console.log(`\n${flagged.length - looks.length} item(s) edited existing tests — read the diffs in .state/ledger.md before trusting them.\n`)
