#!/usr/bin/env node
// The next item to work on. Pure read — never writes status.
// --area <a>: the next item of one area's list (tools/backlog.mjs) — a worker's own queue.
// An item marked `later` is named only when nothing else asked about is ready (backlog.mjs readyQueue).
import { readBacklog, areaOf, landedIds, readyQueue } from './backlog.mjs'
import { lookFolderOf } from './gate-progress.mjs'
const at = process.argv.indexOf('--area'), area = at >= 0 ? process.argv[at + 1] : null
const all = readBacklog()
const b = area ? all.filter(x => areaOf(x) === area) : all
const done = landedIds(all)
const next = readyQueue(all, area)[0]
if (!next) {
  const blocked = b.filter(x => !x.status)
  console.log(blocked.length
    ? `No item is ready. Blocked:\n${blocked.map(x => `  ${x.id} needs ${x.needs.filter(n => !done.has(n)).join(', ')}`).join('\n')}`
    : 'Backlog complete.')
  process.exit(1)
}
console.log(`\n${next.id}   [${next.kind} · shape: ${next.shape}${next.later ? ' · later' : ''}${next.look ? ' · look' : ''}]\n`)
console.log(`spec    ${next.spec}`)
console.log(`expect  ${next.expect}`)
if (next.needs) console.log(`needs   ${next.needs.join(', ')}`)
if (next.changesBaseline) console.log(`note    declared to change the control battle`)
if (next.later) console.log(`later   marked later — named because nothing else ${area ? `in ${area}` : 'in any area'} is ready`)
// tool.look-items-land-on-a-picture (2026-10-06): what a look item brings in place of a test, said where its builder reads the item
if (next.look) console.log(`look    a look item — it lands on a PICTURE of the real built page, not a test: ${lookFolderOf(next.id, '<yyyy-mm-dd>')}/<name>.png at the root, committed there (git add -f) by a commit that names the item, after its change is committed in ${next.kind}/; it lands for Andrew's review`)
console.log(`\n  node tools/gate.mjs ${next.id}          # check`)
console.log(`  node tools/gate.mjs ${next.id} --land   # commit if clean\n`)
