#!/usr/bin/env node
// The next kingdom backlog item that is ready. Pure read — never writes status.
// Same shape as engine/tools/next.mjs; the backlog is kingdom/.state/backlog.json.
import { readFileSync } from 'node:fs'
const b = JSON.parse(readFileSync('.state/backlog.json', 'utf8'))
const done = new Set(b.filter((x) => String(x.status ?? '').startsWith('done')).map((x) => x.id))
const next = b.find((x) => !x.status && (x.needs ?? []).every((n) => done.has(n)))
if (!next) {
  const blocked = b.filter((x) => !x.status)
  console.log(blocked.length
    ? `No item is ready. Blocked:\n${blocked.map((x) => `  ${x.id} needs ${(x.needs ?? []).filter((n) => !done.has(n)).join(', ')}`).join('\n')}`
    : 'Backlog complete.')
  process.exit(1)
}
console.log(`\n${next.id}   [${next.kind} · shape: ${next.shape}${next.milestone ? ' · ' + next.milestone : ''}]\n`)
console.log(`spec    ${next.spec}`)
console.log(`expect  ${next.expect}`)
if (next.isc?.length) console.log(`closes  ${next.isc.map((n) => `ISC-${n}`).join(', ')}`)
if (next.needs?.length) console.log(`needs   ${next.needs.join(', ')}`)
console.log(`\n  node tools/gate.mjs ${next.id}          # check`)
console.log(`  node tools/gate.mjs ${next.id} --land   # commit if clean\n`)
