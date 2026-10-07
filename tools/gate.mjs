#!/usr/bin/env node
// node tools/gate.mjs <item-id> [--land|--abandon]
//
// The kingdom's landing gate — "may this change land?" — modelled on
// engine/tools/gate.mjs (2026-09-01), NOT copied: that gate's decisive checks
// are engine-shaped (a probe that fields a battle, control-battle hashes, a
// hardcode scan over the damage pipeline). What transfers is the shape: one
// command, one non-arguable exit code, a state file that remembers, a ledger
// that says why. Claude does not decide whether an item passed — this does.
//
//   (default)  run the checks and report. Changes nothing. The iteration loop.
//   --land     run the checks; commit ONLY if every one passes; close the ISCs.
//   --abandon  give up on this item, revert the tree, record why.
//
// Where the engine gate asks "does the id appear in a real battle?", this one
// asks "does every criterion this item claims hold?" — the item's `isc` list is
// its gate 1, and the ISC instrument (slice-gate.mjs) is what answers. Where the
// engine re-runs the item's tests with its content disabled, this one demands a
// red on record for each claimed probe (and re-proves it live when the block
// carries `Disable:`). Where the engine checks control battles, this one re-runs
// EVERY P-tier probe: closing ISC-N must not reopen ISC-M.
//
// This gate commits to kingdom/'s own repository and nothing else. The engine is
// read, never written, from here (THIN-SLICE-IMPLEMENTATION.md §10).

import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import { execSync } from 'node:child_process'
import { revertTree } from './revert-tree.mjs'
import { codeStamp } from '../../engine/tools/code-stamp.mjs'
import { changedPaths, commitOnly } from '../../engine/tools/commit-only.mjs'
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { stampOf, allStamps, PACKAGES } from '../../engine/tools/code-stamp.mjs'
import { readPasses, hasPass, appendPass, appendFail, logCheck, copyName, PASSES_FILE, scheduledNow, SCHEDULED_COMMAND, SCHEDULED_MAX_AGE_HOURS } from '../../engine/tools/suites.mjs'
import { filesMentioningId } from './source-mentions.mjs'

// ── the suite in four parts (Andrew, 2026-09-23, engine/DECISIONS.md "less
// process per feature"; applied to the kingdom the same day: "We have to shorten
// the check to make it so you can do it.") ─────────────────────────────────────
// Cowork's shell kills any command at ~178 s; the whole suite plus the P-tier
// sweep took longer. So the suite runs as four separate commands,
// `node tools/gate.mjs --shard k/4` (~80 s each), each pass recorded against a
// hash of the working tree (everything `git add -A` would commit, minus .state/).
// A landing's "full test suite" check passes only when all four passed on the
// exact tree it is gating — edit one file and every shard must run again. The
// P-tier probes are test files, so the shards are also "nothing regresses".
//
// TESTS FOLLOW WHAT CHANGED (Andrew, 2026-10-04, engine/DECISIONS.md 'the same for content and
// kingdom changes: each kind of change runs its own tests'; engine/tools/code-stamp.mjs,
// engine/tools/suites.mjs). The shards are recorded against KINGDOM'S CODE — src/ without the
// generated items, test/, tools/, the fixture, package and compiler config — not the whole tree: a
// regenerated file, a rebuilt page, a document or .state/ makes no pass stale, and kingdom code does.
// A complete set appends one line to .state/passes.jsonl (the record a merge keeps, and combine and
// wrap read); a record with a tree and no stamp, as written before this day, is no pass. A landing
// whose shards ran on the same code but another tree prints SKIPPED with the reason, never PASS.
// What it costs, as ruled: this suite imports the engine and plays the viewer's page, and its pass
// is keyed on kingdom's code alone — an engine or viewer change that breaks a kingdom test is found
// at the once-per-chat full run (combine --full), not here.
const SHARDS = 4
const SHARDS_FILE = '.state/shards.json'
function treeHash() {
  const idx = join(tmpdir(), `kgate-index-${process.pid}-${Date.now()}`)
  try { copyFileSync(execSync('git rev-parse --git-path index', { encoding: 'utf8' }).trim(), idx) } catch {}
  const env = { ...process.env, GIT_INDEX_FILE: idx }
  try {
    execSync('git add -A -- . ":!.state"', { env, stdio: 'pipe' })
    // .state/ leaves the hash entirely — staged or not (a staged .state once changed the hash of an identical tree)
    execSync('git rm -r -q --cached --ignore-unmatch -- .state', { env, stdio: 'pipe' })
    return execSync('git write-tree', { env, encoding: 'utf8' }).trim()
  } finally { try { rmSync(idx, { force: true }) } catch {} }
}
function readShards() { try { return JSON.parse(readFileSync(SHARDS_FILE, 'utf8')) } catch { return null } }
/** kingdom's code as it stands (the one definition: engine/tools/code-stamp.mjs PACKAGE_CODE.kingdom) */
const codeNow = () => stampOf('kingdom', process.cwd())
/** the shard record for this code, or null — another code's, or an older tool's (a tree and no stamp) */
function shardsOn(code) {
  const s = readShards()
  return s && /^[0-9a-f]{10}$/.test(code) && s.stamp === code && s.total === SHARDS ? s : null
}
function shardsTodo(code) {
  const passed = shardsOn(code)?.passed ?? []
  return Array.from({ length: SHARDS }, (_, i) => i + 1).filter((x) => !passed.includes(x))
}
const when = (p) => `${String(p.at).slice(0, 16).replace('T', ' ')}${p.by ? ', ' + p.by : ''}${p.in ? ', in ' + p.in : ''}`

if (process.argv.includes('--shards-green')) {
  const code = codeNow(), todo = shardsTodo(code)
  // a suite pass on this code recorded elsewhere — another copy's run, the merge-back — counts too
  const pass = todo.length ? hasPass(readPasses('.'), 'kingdom', code) : null
  console.log(!todo.length ? `${SHARDS} of ${SHARDS} shards passed on kingdom code ${code}`
    : pass ? `kingdom's suite passed on kingdom code ${code} (${when(pass)}) — recorded in ${PASSES_FILE}`
      : `${SHARDS - todo.length} of ${SHARDS} shards passed on kingdom code ${code} — run ${todo.map((x) => `node tools/gate.mjs --shard ${x}/${SHARDS}`).join(' · ')}`)
  process.exit(todo.length && !pass ? 1 : 0)
}

const shardArg = process.argv.indexOf('--shard')
if (shardArg !== -1) {
  const m = String(process.argv[shardArg + 1] ?? '').match(/^(\d+)\/(\d+)$/)
  const k = m ? Number(m[1]) : NaN
  if (!m || Number(m[2]) !== SHARDS || k < 1 || k > SHARDS) {
    console.error(`usage: node tools/gate.mjs --shard <k>/${SHARDS}   (k = 1..${SHARDS})`)
    process.exit(2)
  }
  // recorded against kingdom's code as it stood when the shard started, with the other packages' code beside it
  const before = allStamps(resolve(process.cwd(), '..')), code = codeNow()
  const withKey = PACKAGES.map((p) => before[p]).join('.')
  let ok = true, out = ''
  try { out = execSync(`node ../engine/node_modules/vitest/vitest.mjs run --shard=${k}/${SHARDS} --reporter=dot`, { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, NO_COLOR: '1' } }) }
  catch (e) { ok = false; out = (e.stdout ?? '') + (e.stderr ?? '') }
  const count = out.replace(/\x1b\[[0-9;]*m/g, '').match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/)
  const moved = codeNow() !== code   // kingdom's code changed while the shard ran: nothing is recorded for it
  const s = shardsOn(code) ?? { stamp: code, total: SHARDS, passed: [], withs: {} }
  s.tree = treeHash()
  s.passed = s.passed.filter((x) => x !== k)
  if (ok && !moved) s.passed.push(k)
  s.passed.sort((a, b) => a - b)
  s.withs = { ...(s.withs ?? {}), [k]: withKey }
  s.at = new Date().toISOString()
  writeFileSync(SHARDS_FILE, JSON.stringify(s, null, 1) + '\n')
  const todo = shardsTodo(code)
  // a failed shard is recorded too: an older pass on this code is not relied on after it
  if (!ok && !moved) appendFail('.', { suite: 'kingdom', stamp: code, by: `gate --shard ${k}/${SHARDS}`, in: copyName(resolve(process.cwd(), '..')) })
  if (!todo.length) {
    // the whole suite passed on this code: one line in .state/passes.jsonl. `with` names the other
    // packages' code only when all four shards ran beside the same code (the full run reads it).
    const together = s.passed.every((x) => s.withs[x] === withKey) && PACKAGES.every((p) => /^[0-9a-f]{10}$/.test(before[p]))
    appendPass('.', { suite: 'kingdom', stamp: code, with: together ? before : null, at: s.at, by: `gate --shard (${SHARDS} of ${SHARDS})`, in: copyName(resolve(process.cwd(), '..')) })
  }
  const failed = ok ? '' : ' — ' + out.replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter((l) => /FAIL|AssertionError|Error:/.test(l)).slice(0, 6).join(' | ')
  console.log(`shard ${k}/${SHARDS}: ${ok ? 'PASS' : 'FAIL'}${count ? ` — ${count[1] ? count[1] + ' failed, ' : ''}${count[2]} passed` : ''}${failed}${ok && moved ? " — NOT RECORDED: kingdom's code changed while it ran" : ''}`)
  console.log(`kingdom code ${code}: ${SHARDS - todo.length} of ${SHARDS} shards passed` +
    (todo.length ? ` — still to run: ${todo.map((x) => `--shard ${x}/${SHARDS}`).join(', ')}` : ' — the suite is green on this code'))
  process.exit(ok ? 0 : 1)
}

const id = process.argv[2]
const MODE = process.argv.includes('--land') ? 'land'
  : process.argv.includes('--abandon') ? 'abandon' : 'check'
if (!id || id.startsWith('--')) { console.error(`usage: node tools/gate.mjs <item-id> [--land|--abandon]  |  --shard <k>/${SHARDS}  |  --shards-green`); process.exit(2) }

const BACKLOG = '.state/backlog.json'
const LEDGER = '.state/ledger.md'
const RUNLOG = '.state/gauntlet-log.jsonl'
const ENGINE = '../engine'

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts })
const tryRun = (cmd, opts = {}) => { try { return { ok: true, out: sh(cmd, opts) } } catch (e) {
  return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') } } }

const backlog = JSON.parse(readFileSync(BACKLOG, 'utf8'))
const item = backlog.find((b) => b.id === id)
if (!item) { console.error(`no backlog item '${id}'`); process.exit(2) }

const checks = []
let ok = true
let needsReview = false
let exemptions = 0
/* a check may answer { skipped: true, note } — its suite was not run because its code did not change
   (2026-10-04). It blocks nothing, and it is printed and logged SKIPPED, never PASS (Law 9). */
const check = (name, fn) => {
  const r = fn()
  checks.push({ name, ...r })
  if (!r.skipPrint) console.log(`  ${r.skipped ? 'SKIPPED' : r.ok ? 'PASS' : 'FAIL'}  ${name}${r.note ? '  — ' + r.note : ''}`)
  if (!r.ok && !r.skipped) ok = false
  return !!r.ok || !!r.skipped
}
/** A flag, not a gate: lands, but loudly, and withholds the seal. */
const flag = (name, fn) => {
  const r = fn()
  checks.push({ name, ...r, warn: !r.ok })
  console.log(`  ${r.ok ? 'PASS' : 'WARN'}  ${name}${r.note ? '  — ' + r.note : ''}`)
  if (!r.ok) needsReview = true
  return r.ok
}
/** An exemption: a written reason of 20+ characters, prints SKIP, flags, withholds the seal. */
const exempt = (name, reason) => {
  if (typeof reason !== 'string' || reason.length < 20) return { ok: false, note: `\`${name}\` must be a written reason, not a boolean` }
  needsReview = true; exemptions++
  console.log(`  SKIP  ${name} — exemption taken  — ${reason}`)
  return { ok: true, note: '', skipPrint: true }
}

function logRun(disposition, extra = {}) {
  try {
    appendFileSync(RUNLOG, JSON.stringify({
      at: new Date().toISOString(), id, mode: MODE, disposition,
      attempt: (item.attempts ?? 0) + (disposition === 'failed-checks' ? 0 : 1),
      engine: engineSha(),
      checks: checks.map(logCheck),   // the engine's one shape: a SKIPPED check is logged skipped: true, ok: false
      ...extra,
    }) + '\n')
  } catch { /* best-effort; the verdict never depends on it */ }
}
/* the engine's code stamp, not its HEAD (Andrew, 2026-10-01): a ruling commit changes nothing verified here */
const engineSha = () => codeStamp().stamp
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')

// -uall: an untracked DIRECTORY would otherwise appear as one line and hide
// every file inside it from the tests-brought and naming checks.
const porcelain = () => sh('git status --porcelain -uall').split('\n').filter(Boolean).map((l) => l.slice(3))
/** Added lines of the current working diff (tracked AND untracked files), restricted to a path prefix. */
function addedLines(prefix) {
  const out = []
  const diff = tryRun(`git diff -U0 -- ${prefix}`).out
  for (const l of diff.split('\n')) if (l.startsWith('+') && !l.startsWith('+++')) out.push(l.slice(1))
  for (const f of porcelain()) {
    if (!f.startsWith(prefix)) continue
    const tracked = tryRun(`git ls-files --error-unmatch -- "${f}"`).ok
    if (!tracked && existsSync(f) && statSync(f).isFile()) out.push(...readFileSync(f, 'utf8').split('\n'))
  }
  return out
}
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|mts)$/.test(f)) out.push(p)
  }
  return out
}

console.log(`\ngate: ${id}   [${MODE}]   engine @ ${engineSha()}\n`)

check('dependencies landed', () => {
  const missing = (item.needs ?? []).filter((n) => !String(backlog.find((b) => b.id === n)?.status ?? '').startsWith('done'))
  return { ok: missing.length === 0, note: missing.length ? `waiting on ${missing.join(', ')}` : '' }
})

flag('not already decided', () => {
  // The engine's decided.mjs, run from the engine so its '..' is the design folder.
  // A FLAG, never a gate: it reports CANDIDATE rulings, not verdicts.
  const text = [item.spec, item.expect].filter(Boolean).join(' ')
  if (!text) return { ok: true, note: 'no spec text to check' }
  const r = tryRun(`node tools/decided.mjs ${JSON.stringify(text).replace(/`/g, '')}`, { cwd: ENGINE })
  if (!r.ok) return { ok: true, note: 'decided.mjs unavailable' }
  const rulings = r.out.split('\n').filter((l) => l.trim().startsWith('RULING'))
  if (!rulings.length) return { ok: true, note: 'no existing ruling matches' }
  const where = rulings.slice(0, 2).map((l) => l.replace(/^\s*RULING\s*/, '').trim()).join(' · ')
  return { ok: false, note: `${rulings.length} candidate ruling(s) — READ BEFORE ASKING: ${where}` }
})

check('typecheck', () => {
  const r = tryRun('npm run -s typecheck')
  return { ok: r.ok, note: r.ok ? '' : r.out.split('\n').filter(Boolean).slice(0, 3).join(' | ') }
})

// The suite is not run here: it ran as the four shards (above), and this reads
// whether all four passed (2026-09-23) — since 2026-10-04, on kingdom's CODE. PASS only when
// they ran on this exact tree; when they ran on the same code but the tree has since changed in
// a regenerated file, a built page or a document — or the pass is another copy's — the suite is
// not run again and the check says SKIPPED, with why.
//
// 2026-10-06 — tool.landing-on-the-quick-check (engine/DECISIONS.md 'the one plan: land on the quick check, run the whole
// suites twice a day, four streams and one lander', decided by the home chat on Andrew's word: "Decide what keeps the
// checks that matter and removes the things that don't."). Until that day this check was named 'full test suite — four
// shards green on this code' and FAILED a landing whose kingdom code had no pass: `{ ok: false, note: 'kingdom code …:
// run node tools/gate.mjs --shard 1/4 · …' }`. A landing no longer asks for a whole-suite pass on its code. The lander
// runs all four suites twice a day (engine/tools/suites.mjs --run all --full); this check says when the last scheduled
// run was and what it found — SKIPPED, never PASS (Law 9) — and fails a landing (--land) only when no complete scheduled
// run is recorded in the last day. Four shards that did pass on this exact tree are still said — they ran — beside it;
// they are kingdom's alone, and are not the scheduled run.
check('the whole suites — a scheduled run in the last day', () => {
  const code = codeNow(), shards = shardsTodo(code).length ? null : shardsOn(code)
  const own = shards && shards.tree === treeHash() ? ` (kingdom's own ${SHARDS} shards did pass on this exact tree, kingdom code ${code})` : ''
  const whole = scheduledNow(resolve(process.cwd(), '..'))
  if (whole.due && MODE === 'land') return { ok: false, note: `${whole.said} — none in the last ${SCHEDULED_MAX_AGE_HOURS} hours. The lander runs the whole suites, alone on the machine, from engine/: ${SCHEDULED_COMMAND} — then land again${own}` }
  return { skipped: true, note: `kingdom's suite is not run at a landing — ${whole.said}${whole.due ? ` — none in the last ${SCHEDULED_MAX_AGE_HOURS} hours: a landing (--land) refuses until the lander has run it` : ''}${own}` }
})

// ── gate 1: every criterion this item claims holds ──────────────────────────
const iscs = (item.isc ?? []).map(String)
check('gate 1 — every claimed criterion holds', () => {
  if (iscs.length === 0) {
    // A tooling or plumbing item closes no criterion. That is the engine's
    // `unreachable` case, and it costs the same: a written reason, SKIP, a flag.
    if (!item.unreachable) return { ok: false, note: 'the item claims no criterion (`isc: [...]`) and takes no `unreachable` reason — one or the other' }
    return exempt('gate 1 — closes no criterion', item.unreachable)
  }
  // One call for all of them — the instrument batches the vitest probes into a
  // single process (2026-09-01: a landing has to fit the sandbox's ~3-minute cap).
  const r = tryRun(`node tools/slice-gate.mjs --isc ${iscs.join(',')}`)
  const lines = r.out.trim().split('\n').filter((l) => /^ISC-\d+/.test(l))
  if (!r.ok) return { ok: false, note: lines.filter((l) => /FAILS|not exist/.test(l)).join(' · ') || r.out.trim().split('\n').pop() }
  return { ok: true, note: lines.map((l) => l.replace(/ — .*?: PASSES$/, ' holds').replace(/ — H-tier.*$/, ' — H, a person checks')).join(' · ') }
})

check('brought its own tests', () => {
  const touched = porcelain().filter((f) => f.startsWith('test/'))
  if (item.unreachable && touched.length === 0) return { ok: true, note: 'tooling item — no criterion, no test demanded' }
  return { ok: touched.length > 0, note: touched.length ? touched.join(', ') : 'no test file touched' }
})

const weakened = (tryRun('git diff --numstat -- test/').out.trim() || '')
  .split('\n').filter(Boolean)
  .map((l) => { const [add, del, file] = l.split('\t'); return { file, add: +add, del: +del } })
  .filter((f) => f.del > 0)
flag('existing tests untouched', () => ({
  ok: weakened.length === 0,
  note: weakened.length ? `DELETED LINES in ${weakened.map((w) => `${w.file} (-${w.del})`).join(', ')} — will land FLAGGED for review` : '',
}))
const testDiff = weakened.length > 0 ? tryRun('git diff -U2 -- test/').out : ''

// ── the kill-switch: a red on record for every claimed probe ────────────────
check('kill switch — every claimed probe has been seen red', () => {
  if (iscs.length === 0) return { ok: true, note: 'no criterion claimed — not applicable' }
  if (item.killSwitchExempt) return exempt('kill switch', item.killSwitchExempt)
  const notes = []
  for (const n of iscs) {
    const r = tryRun(`node tools/slice-gate.mjs --isc ${n} --check-red`)
    const line = r.out.trim().split('\n').pop() ?? ''
    if (!r.ok) return { ok: false, note: line }
    notes.push(line.replace(/^ISC-\d+: /, `ISC-${n}: `))
  }
  return { ok: true, note: notes.join(' · ') }
})

// ── nothing regresses: the whole P set is test files, so the four shards above
// already ran every P-tier probe on this tree (2026-09-23 — the separate sweep
// took 154 s and could not fit a Cowork command). ──────────────────────────

// ── the anti-hardcode checks (§3 check 3) ───────────────────────────────────
// Kingdom instance ids are two segments (stage.mend, currency.salvage), so the
// engine's three-segment heuristic does not transfer. Instead: src/core may name
// an EVENT (the vocabulary in src/core/events.ts) and nothing else with a dot.
const KINDS = knownKinds()
const EVENTS = eventVocabulary()
const ID_LITERAL = new RegExp(`['"\`]((?:${[...KINDS].join('|')})\\.[a-z0-9][a-z0-9.-]*)['"\`]`, 'g')
check('hardcode scan — core knows mechanisms, never names', () => {
  if (item.coreLiteralAllow) return exempt('hardcode scan', item.coreLiteralAllow)
  const bad = []
  for (const l of addedLines('src/core')) {
    for (const m of l.matchAll(ID_LITERAL)) if (!EVENTS.has(m[1])) bad.push(l.trim().slice(0, 70))
  }
  return { ok: bad.length === 0, note: bad.length ? `content names in kingdom core: ${[...new Set(bad)].slice(0, 3).join(' | ')} — a mechanism reads rows; only content knows names. Move the id to src/content, or set coreLiteralAllow with the reason.` : '' }
})

const MECHANISM_SHAPES = ['rule', 'station', 'trigger', 'modifier', 'pool', 'counter', 'machine']
check('generalizes — the second instance costs zero kingdom code', () => {
  if (!MECHANISM_SHAPES.includes(item.shape)) return { ok: true, note: `shape '${item.shape}' — not a mechanism, exempt` }
  if (item.generalizationExempt) return exempt('generalizes', item.generalizationExempt)
  const variants = item.variants ?? []
  if (variants.length < 2) return { ok: false, note: `a '${item.shape}' item must declare "variants": two or more ids that exercise the SAME mechanism with different data. Or set generalizationExempt with a written reason.` }
  const notes = []
  for (const v of variants) {
    const inCore = filesMentioningId(walk('src/core'), v)
    if (inCore.length) return { ok: false, note: `variant '${v}' appears in ${inCore[0]} — the second instance must be pure data` }
    const inContent = filesMentioningId(walk('src/content'), v)
    if (!inContent.length) return { ok: false, note: `variant '${v}' is not a row anywhere under src/content` }
    if (!existsSync('tools/probe.mts')) return { ok: false, note: `variant '${v}' is a row, but tools/probe.mts does not exist yet — a variant must be probed LIVE in a run, and the probe tool is part of the first mechanism landing` }
    const r = tryRun(`node ../engine/node_modules/tsx/dist/cli.mjs tools/probe.mts ${v}`)
    const line = r.out.trim().split('\n').pop() ?? ''
    if (!r.ok) return { ok: false, note: `variant '${v}': ${line}` }
    notes.push(`${v} live`)
  }
  return { ok: true, note: notes.join(' · ') }
})

// ── naming: GLOSSARY.md is the authority; this is its teeth ─────────────────
check('naming — new ids use declared kinds', () => {
  const unknown = new Set()
  for (const l of [...addedLines('src'), ...addedLines('test')]) {
    for (const m of l.matchAll(/['"`]([a-z]+)\.[a-z0-9][a-z0-9.-]*['"`]/g)) {
      const k = m[1]
      if (KINDS.has(k) || EVENTS.has(m[0].slice(1, -1))) continue
      // relative module paths and file names are not ids
      if (/\.(js|ts|mts|mjs|json|md)['"`]$/.test(m[0])) continue
      unknown.add(k)
    }
  }
  return { ok: unknown.size === 0, note: unknown.size ? `unknown id kind(s): ${[...unknown].join(', ')} — declare the kind in GLOSSARY.md (Andrew's call) before minting ids under it` : '' }
})
flag('naming — no banned words invented', () => {
  const smells = new Set()
  // The file that DEFINES a ban necessarily contains the banned word (the root
  // vocab-check makes the same exemption); this gate flagged its own regex
  // line on the campaign.state landing.
  const ownLines = new Set(readFileSync('tools/gate.mjs', 'utf8').split('\n'))
  for (const l of [...addedLines('src'), ...addedLines('test'), ...addedLines('tools').filter((x) => !ownLines.has(x))]) {
    if (/(class|function|const|let)\s+\w*(Manager|Controller|Service|Handler)\b/.test(l)) smells.add('a *Manager/*Controller/*Service/*Handler — name the state slice and the functions separately')
    if (/\b(?:function|const|let)\s+(get|handle|process|do|update|check|calculate|compute|init|setup)[A-Z]\w*/.test(l)) smells.add('a banned function prefix (GLOSSARY.md) — xOf/listX/canX/performX/applyX/resolveX/makeX/beginX')
    if (/\b(proc|procs)\b/i.test(l)) smells.add("'proc' — say trigger")
    if (/\b(buff|debuff)s?\b/i.test(l)) smells.add("'buff/debuff' — say status")
    // "round" the unit of play — not rounding, round-trips, or Math.round
    // (the root vocab-check's own exclusions, 2026-09-01).
    if (/\bround\b/i.test(l) && !/round(ed|ing|-?trips?|Up|Down)|Math\.round/i.test(l)) smells.add("'round' — say Turn")
    if (/\bstrategic turns?\b/i.test(l)) smells.add("'strategic turn' — say Week")
    if (/\bprovinces?\b/i.test(l)) smells.add("'province' — say Territory")
  }
  for (const f of porcelain()) if (/(utils|helpers|misc|stuff)\.(ts|mts|mjs)$/.test(f)) smells.add(`${f} — a file named utils is where names go to be invented`)
  return { ok: smells.size === 0, note: smells.size ? [...smells].slice(0, 4).join(' | ') + ' — will land FLAGGED' : '' }
})

// ── the engine is read, never written ───────────────────────────────────────
flag('engine working tree clean', () => {
  // This gate cannot tell another session's dirt from this one's — the engine is
  // a different repository. It can say what the landing was verified AGAINST,
  // so the ledger records it and a reader can judge.
  const r = tryRun(`git -C ${ENGINE} status --porcelain -- src test`)
  const dirty = r.ok ? r.out.split('\n').filter(Boolean) : []
  return { ok: dirty.length === 0, note: dirty.length ? `verified against a DIRTY engine tree (${engineSha()} + ${dirty.length} uncommitted under src/test): ${dirty.slice(0, 3).map((l) => l.trim()).join(', ')}` : `engine @ ${engineSha()}, clean` }
})

check('one door to the engine', () => {
  // §4.5 — only src/engine.ts may import an engine path.
  const bad = []
  for (const f of walk('src')) {
    if (f.replace(/\\/g, '/') === 'src/engine.ts') continue
    const text = readFileSync(f, 'utf8')
    if (/from\s+['"][^'"]*\/engine\/[^'"]*['"]/.test(text)) bad.push(f)
  }
  return { ok: bad.length === 0, note: bad.length ? `${bad.join(', ')} import the engine directly — go through src/engine.ts` : '' }
})

// ── verdict ─────────────────────────────────────────────────────────────────
const body = checks.map((c) => `  ${c.skipped ? 'SKIPPED' : c.ok ? 'PASS' : c.warn ? 'WARN' : 'FAIL'}  ${c.name}${c.note ? ' — ' + c.note : ''}`).join('\n')

if (MODE === 'abandon') {
  // Cowork-safe revert (2026-09-24, engine DECISIONS.md "abandon works in Cowork"):
  // overwrite in place and park, never delete. Same spared paths as the old git clean.
  const rv = revertTree(['node_modules', '.state', 'tools'])
  console.log(`reverted ${rv.restored.length} file(s) to HEAD${rv.parked.length ? `; parked ${rv.parked.length} file(s) HEAD does not have in ${rv.parkedAt}` : ''}`)
  item.status = 'failed'
  item.failedAt = stamp
  item.reason = checks.filter((c) => !c.ok && !c.skipped).map((c) => `${c.name}: ${c.note}`).join(' | ')
  writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
  appendFileSync(LEDGER, `\n## ${id} — ABANDONED\n${stamp}\n\n${body}\n`)
  logRun('abandoned', { reason: item.reason })
  console.log('\nABANDONED. Working tree is back to the last landed commit.\n')
  process.exit(1)
}

if (!ok) {
  item.attempts = (item.attempts ?? 0) + 1
  writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
  console.log(`\nNOT READY (attempt ${item.attempts}). Nothing reverted — fix and run the gate again.` +
    `\nIf it cannot be made to pass:  node tools/gate.mjs ${id} --abandon\n`)
  logRun('failed-checks')
  process.exit(1)
}

if (MODE !== 'land') {
  console.log('\nAll checks pass. Run with --land to commit.\n')
  logRun('check-passed')
  process.exit(0)
}

// ── land ────────────────────────────────────────────────────────────────────
// The item's files, and only those (Andrew, 2026-10-01: "commit only the files the item
// touched instead of everything"): every file changed outside .state/ — exactly the tree
// the checks judged (treeHash) — never `git add -A`. The bookkeeping commit below takes
// the gate's records and whatever its own closing step changed, nothing else.
const KINGDOM = { email: 'a@b', name: 'kingdom' }
const before = new Set(changedPaths())
const itemFiles = [...before].filter((p) => !p.startsWith('.state/'))
// the subject goes to git as an argument, not through a shell, so a backtick in the spec is safe
commitOnly(itemFiles, { message: `${id}: ${item.spec.slice(0, 72)}`, author: KINGDOM })
const sha = sh('git rev-parse --short HEAD').trim()
item.status = needsReview ? 'done-needs-review' : 'done'
item.sha = sha
item.engineSha = engineSha()
writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
appendFileSync(LEDGER, `\n## ${id} — LANDED \`${sha}\`${needsReview ? ' **NEEDS REVIEW**' : ''}\n${stamp} · engine @ ${engineSha()}\n\n${body}\n` +
  (needsReview && testDiff ? `\n<details><summary>Existing tests were edited — review this diff</summary>\n\n\`\`\`diff\n${testDiff}\`\`\`\n</details>\n` : ''))

// The post-land audit (typecheck and claimed probes again, from the commit) is
// cut, as the engine cut its own 2026-09-22: the landing commits the exact
// tree the shards and the checks above passed on.

// Close the criteria this item claimed, at this sha. The ISC instrument refuses
// any criterion without a red on record — the same rule the check above enforced.
let closeNote = ''
if (iscs.length) {
  const r = tryRun(`node tools/slice-gate.mjs --close ${iscs.join(',')} --sha ${sha}`)
  closeNote = r.out.trim().split('\n').filter((l) => /CLOSED|FAILS|never|edited/.test(l)).join(' · ')
  if (!r.ok) { needsReview = true; closeNote = 'CLOSE REFUSED — ' + closeNote }
}

const warns = checks.filter((c) => c.warn).length
const gauntletNotes = []
if (warns > 0) gauntletNotes.push(`${warns} flag(s) warned`)
if (exemptions > 0) gauntletNotes.push(`${exemptions} exemption(s) taken`)
if (/REFUSED/.test(closeNote)) gauntletNotes.push('a claimed criterion did not close')
const gauntletPassed = gauntletNotes.length === 0
item.gauntlet = gauntletPassed ? 'passed' : `not passed — ${gauntletNotes.join('; ')}`
{
  const bl = JSON.parse(readFileSync(BACKLOG, 'utf8'))
  const it = bl.find((x) => x.id === id)
  if (it) { it.gauntlet = item.gauntlet; it.status = needsReview ? 'done-needs-review' : 'done'; writeFileSync(BACKLOG, JSON.stringify(bl, null, 1)) }
  const countLine = tryRun('node tools/slice-gate.mjs --count').out.trim()
  appendFileSync(LEDGER, `\n${closeNote ? closeNote + '\n' : ''}slice: ${countLine}\nIRON GAUNTLET: ${gauntletPassed ? 'PASSED' : item.gauntlet.toUpperCase()}\n`)
}
logRun('landed', { sha, seal: gauntletPassed ? 'passed' : gauntletNotes.join('; '), closed: closeNote || undefined })
// The bookkeeping is a SECOND commit, never an amend. Found on the first landing
// (2026-09-01): amending after recording the sha left the backlog, the ledger and
// isc.json all naming a commit that no longer existed. Two commits per landing,
// and every sha written down is one you can check out.
// the gate's records, and what the closing step changed since the landing (slice-gate syncs a criteria document)
const closed = changedPaths().filter((p) => !before.has(p) && !p.startsWith('.state/'))
// …and the record of what passed on this code (.state/passes.jsonl), so the merge-back does not run the suite again
commitOnly([BACKLOG, LEDGER, RUNLOG, '.state/isc.json', PASSES_FILE, ...closed], { message: `bookkeeping for ${id} (${sha})`, author: KINGDOM })
console.log(gauntletPassed
  ? `\n⛓  IRON GAUNTLET: PASSED — every check, no flags, no exemptions.`
  : `\n⛓  IRON GAUNTLET: NOT PASSED — ${gauntletNotes.join('; ')}. The landing stands; the seal is withheld.`)
if (closeNote) console.log(`   ${closeNote}`)
console.log(`\nLANDED as ${sha}${needsReview ? '  (flagged for review)' : ''}\n`)

// ── helpers that read the naming authority ──────────────────────────────────
function knownKinds() {
  // The union of tools/approved-kinds.json (the ruling file) and the kinds the
  // glossary's id block declares. GLOSSARY.md outranks everything; the approved
  // file is the machine-checkable ruling. Two lists that can disagree is the
  // failure Law 13 exists to prevent — so both are read, neither is hand-copied.
  const kinds = new Set()
  try { for (const k of Object.keys(JSON.parse(readFileSync('../tools/approved-kinds.json', 'utf8')).kinds)) kinds.add(k) } catch {}
  try {
    const g = readFileSync('../GLOSSARY.md', 'utf8')
    const at = g.indexOf('### Ids')
    const block = g.slice(at).match(/```\n([\s\S]*?)```/)
    for (const m of (block?.[1] ?? '').matchAll(/\b([a-z]+)\.[a-z0-9][a-z0-9.-]*/g)) kinds.add(m[1])
  } catch {}
  return kinds
}
function eventVocabulary() {
  // Two declared lists, both data: src/core/events.ts (what the kingdom SAYS)
  // and ENGINE_EVENTS in src/engine.ts (what the kingdom READS of the engine's).
  // Found on the first gate run (2026-09-01): the seam's fold switches on
  // 'unit.enter' and 'life.dead', and the scan read them as content ids.
  const ev = new Set()
  try { for (const m of readFileSync('src/core/events.ts', 'utf8').matchAll(/'([a-z]+\.[a-z-]+)'/g)) ev.add(m[1]) } catch {}
  try {
    const door = readFileSync('src/engine.ts', 'utf8')
    const block = door.match(/ENGINE_EVENTS\s*=\s*\[([\s\S]*?)\]/)
    for (const m of (block?.[1] ?? '').matchAll(/'([a-z]+\.[a-z-]+)'/g)) ev.add(m[1])
  } catch {}
  return ev
}
