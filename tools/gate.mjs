#!/usr/bin/env node
// node tools/gate.mjs <item-id> [--land|--abandon]
//
// The blocking gate. Claude does not get to decide whether an item passed —
// this does, and its exit code is not arguable.
//
// Three modes, deliberately separate:
//   (default)  run the gates and report. Changes nothing. This is the iteration loop.
//   --land     run the gates; commit ONLY if every one passes.
//   --abandon  give up on this item, revert the tree, record why.
//
// Reverting on the first failure would throw away both the work and the
// diagnostic, so the next attempt would start blind. Abandoning is explicit.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'

const id = process.argv[2]
const MODE = process.argv.includes('--land') ? 'land'
  : process.argv.includes('--abandon') ? 'abandon' : 'check'
if (!id) { console.error('usage: node tools/gate.mjs <item-id> [--land|--abandon]'); process.exit(2) }

const BACKLOG = '.state/backlog.json'
const LEDGER = '.state/ledger.md'
const GOLDEN = '.state/baseline.hash'

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts })
const tryRun = (cmd) => { try { return { ok: true, out: sh(cmd) } } catch (e) {
  return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') } } }

const backlog = JSON.parse(readFileSync(BACKLOG, 'utf8'))
const item = backlog.find((b) => b.id === id)
if (!item) { console.error(`no backlog item '${id}'`); process.exit(2) }

const checks = []
let ok = true
/** A hard gate. Failing one blocks the landing. */
const check = (name, fn) => {
  const r = fn()
  checks.push({ name, ...r })
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${name}${r.note ? '  — ' + r.note : ''}`)
  if (!r.ok) ok = false
  return r.ok
}
/**
 * A flag, not a gate. It lands, but loudly and with the diff in the ledger.
 * Blocking outright would deadlock the loop every time a stale test legitimately
 * needs updating; landing silently is how a loop launders a failure into a pass.
 */
const flag = (name, fn) => {
  const r = fn()
  checks.push({ name, ...r, warn: !r.ok })
  console.log(`  ${r.ok ? 'PASS' : 'WARN'}  ${name}${r.note ? '  — ' + r.note : ''}`)
  return r.ok
}

console.log(`\ngate: ${id}   [${MODE}]\n`)

check('dependencies landed', () => {
  const missing = (item.needs ?? []).filter((n) => !String(backlog.find((b) => b.id === n)?.status ?? '').startsWith('done'))
  return { ok: missing.length === 0, note: missing.length ? `waiting on ${missing.join(', ')}` : '' }
})

check('typecheck', () => {
  const r = tryRun('npx tsc --noEmit')
  return { ok: r.ok, note: r.ok ? '' : r.out.split('\n').filter(Boolean).slice(0, 3).join(' | ') }
})

check('full test suite', () => {
  const r = tryRun('npx vitest run --reporter=dot')
  const m = r.out.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/)
  if (r.ok) return { ok: true, note: m ? `${m[2]} passed` : '' }
  // Name the failures. A gate that only says "3 FAILED" makes the next attempt start blind.
  const names = [...r.out.matchAll(/(?:×|FAIL)\s+([^\n]+)/g)].map((x) => x[1].trim())
  return { ok: false, note: `${m?.[1] ?? '?'} FAILED — ${[...new Set(names)].slice(0, 6).join(' · ') || 'see vitest output'}` }
})

check('gate 1 — the id appears in a real battle', () => {
  const r = tryRun(`npx tsx tools/probe.mts ${id}`)
  return { ok: r.ok, note: r.out.trim().split('\n').pop() ?? '' }
})

check('brought its own tests', () => {
  const files = sh('git status --porcelain').split('\n').filter(Boolean).map((l) => l.slice(3))
  const touched = files.filter((f) => f.startsWith('test/'))
  return { ok: touched.length > 0, note: touched.length ? touched.join(', ') : 'no test file touched' }
})

// A new mechanic may ADD tests. Editing tests that already passed is the classic
// way an autonomous loop launders a failure into a success.
const weakened = (tryRun('git diff --numstat -- test/').out.trim() || '')
  .split('\n').filter(Boolean)
  .map((l) => { const [add, del, file] = l.split('\t'); return { file, add: +add, del: +del } })
  .filter((f) => f.del > 0)
flag('existing tests untouched', () => ({
  ok: weakened.length === 0,
  note: weakened.length ? `DELETED LINES in ${weakened.map((w) => `${w.file} (-${w.del})`).join(', ')} — will land FLAGGED for review` : '',
}))
const needsReview = weakened.length > 0
const testDiff = needsReview ? tryRun('git diff -U2 -- test/').out : ''

check('control battle unchanged', () => {
  const r = tryRun('npx tsx tools/baseline.mts')
  if (!r.ok) return { ok: false, note: 'baseline probe errored' }
  const now = r.out.trim().split('\n').pop()
  let golden = null
  try { golden = readFileSync(GOLDEN, 'utf8').trim() } catch {}
  if (!golden) { if (MODE === 'land') writeFileSync(GOLDEN, now + '\n'); return { ok: true, note: 'blessed (first run)' } }
  if (golden === now) return { ok: true, note: '' }
  if (item.changesBaseline) {
    if (MODE === 'land') writeFileSync(GOLDEN, now + '\n')
    return { ok: true, note: `re-blessed — this item DECLARED it changes the control battle (${golden.slice(0, 8)} -> ${now.slice(0, 8)})` }
  }
  return { ok: false, note: `CHANGED ${golden.slice(0, 8)} -> ${now.slice(0, 8)}. Something leaked. If intended, set "changesBaseline": true on the backlog item.` }
})

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
const body = checks.map((c) => `  ${c.ok ? 'PASS' : c.warn ? 'WARN' : 'FAIL'}  ${c.name}${c.note ? ' — ' + c.note : ''}`).join('\n')

if (MODE === 'abandon') {
  sh('git checkout -- . ; git clean -fdq -e node_modules -e .state -e scratch -e tools')
  item.status = 'failed'
  item.failedAt = stamp
  item.reason = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.note}`).join(' | ')
  writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
  appendFileSync(LEDGER, `\n## ${id} — ABANDONED\n${stamp}\n\n${body}\n`)
  console.log('\nABANDONED. Working tree is back to the last landed commit.\n')
  process.exit(1)
}

if (!ok) {
  item.attempts = (item.attempts ?? 0) + 1
  writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
  console.log(`\nNOT READY (attempt ${item.attempts}). Nothing reverted — fix and run the gate again.` +
    `\nIf it cannot be made to pass:  node tools/gate.mjs ${id} --abandon\n`)
  process.exit(1)
}

if (MODE !== 'land') {
  console.log('\nAll gates pass. Run with --land to commit.\n')
  process.exit(0)
}

sh('git add -A')
sh(`git -c user.email=a@b -c user.name=projections commit -q -m ${JSON.stringify(`${id}: ${item.spec.slice(0, 72)}`)}`)
const sha = sh('git rev-parse --short HEAD').trim()
item.status = needsReview ? 'done-needs-review' : 'done'
item.sha = sha
writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
appendFileSync(LEDGER, `\n## ${id} — LANDED \`${sha}\`${needsReview ? ' **NEEDS REVIEW**' : ''}\n${stamp}\n\n${body}\n` +
  (needsReview ? `\n<details><summary>Existing tests were edited — review this diff</summary>\n\n\`\`\`diff\n${testDiff}\`\`\`\n</details>\n` : ''))
console.log(`\nLANDED as ${sha}${needsReview ? '  (flagged: existing tests were edited)' : ''}\n`)
