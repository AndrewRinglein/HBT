#!/usr/bin/env node
// node tools/gate.mjs <item-id> [--land|--abandon] [--budget <s>] [--fresh]
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
//
// RESUMABLE (tool.gate-fits-cowork, Andrew 2026-09-26: 'Add it'). Cowork kills every
// shell call at ~178 s, so each check's result is recorded against the exact tree in
// .state/gate-progress.json (tools/gate-progress.mjs). A re-run on the same tree
// replays what already passed ("PASS (recorded)"); a changed tree discards it. With a
// budget — `--budget <s>`, 150 s by default in Cowork, none in a terminal — the gate
// stops between checks once the budget is spent, prints INCOMPLETE and exits 3,
// counting no attempt, logging nothing and landing nothing: run the same command
// again. --land commits only when every check has passed on the current tree,
// recorded or fresh. --fresh discards the record first; --abandon clears it.
//
// FAST BY DEFAULT, --full KEPT (Andrew, 2026-09-30, DECISIONS.md "the fast process; the
// full process kept"). The default runs every check except the prior-art and wrong-home
// flags, which `wrap` runs once over the whole tree, and its kill switch runs on the test
// files the item ADDED (every touched file when it added none). `--full` runs every
// per-item check exactly as before; the git tag `process-full-2026-09-30` is the whole
// harness as it stood. Outside Cowork the suite is one command: `--shard 1/1`.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { filesContaining } from './source-scan.mjs'
import { runDiagnosticCommand } from './command-diagnostic.mjs'
import { revertTree } from './revert-tree.mjs'
import { checkItem } from './prior-art.mjs'
import { checkWrongHome } from './wrong-home.mjs'
import {
  treeHash, contextHash, openProgress, recall, record, clearResults, serialize,
  stopBefore, budgetFrom, parseShard, recordShard, shardStatus, testFilesIn, killSwitchFiles,
} from './gate-progress.mjs'

const T0 = Date.now()

const id = process.argv[2]
const MODE = process.argv.includes('--land') ? 'land'
  : process.argv.includes('--abandon') ? 'abandon' : 'check'
const FULL = process.argv.includes('--full')
const PROCESS = FULL ? 'full' : 'fast'

const BACKLOG = '.state/backlog.json'
const LEDGER = '.state/ledger.md'
const GOLDEN = '.state/baseline.hash'
const RUNLOG = '.state/gauntlet-log.jsonl'
const PROGRESS = '.state/gate-progress.json'

// --count: the one line that says where the backlog is, printed by the gate
// because the gate is what wrote every status in it. `start` and
// `wrap` print this line VERBATIM — neither of them counts anything itself.
// (Added 2026-09-06 with tools/start.mjs; the GBH package's CARRYOVER.md item 3.)
if (process.argv.includes('--count')) {
  const b = JSON.parse(readFileSync(BACKLOG, 'utf8'))
  const n = (f) => b.filter(f).length
  console.log(`${n((x) => String(x.status ?? '').startsWith('done'))} of ${b.length} landed · `
    + `${n((x) => x.status === 'done-needs-review')} await review · `
    + `${n((x) => !x.status)} pending`)
  process.exit(0)
}

// ── the suite in four parts (Andrew, 2026-09-22, DECISIONS.md) ─────────────
// Cowork's shell kills any command at ~178 s and the whole suite takes longer,
// so the suite runs as SHARDS separate commands, `node tools/gate.mjs --shard k/4`.
// Each pass is recorded against a hash of the working tree (everything `git add -A`
// would commit, minus the gate's own .state/ and the generated Game Builder). The
// suite is green only when every shard passed on the exact tree — edit one file and
// every shard must run again.
//
// Any N works, not only four (tool.gate-fits-cowork, 2026-09-26): a quarter of the
// suite ran past 176 s in Cowork, so `--shard k/8` runs an eighth. Each N is its own
// set in .state/shards.json, and ANY complete set on the tree is the full suite.
// Four stays the default and the wording.
const SHARDS = 4
const SHARDS_FILE = '.state/shards.json'
function readShards() { try { return JSON.parse(readFileSync(SHARDS_FILE, 'utf8')) } catch { return null } }

// --shards-green: exit 0 only when a complete set of shards passed on this exact tree.
// `wrap` calls it and refuses without it (Andrew, 2026-09-23: the full suite runs
// once per chat, as the four shards, and wrap refuses until all four are green).
if (process.argv.includes('--shards-green')) {
  const tree = treeHash()
  const st = shardStatus(readShards(), tree, SHARDS)
  console.log(!st.green
    ? `${st.passed.length} of ${st.n} shards passed on tree ${tree.slice(0, 10)} — run ${st.todo.map((x) => `node tools/gate.mjs --shard ${x}/${st.n}`).join(' · ')}`
    : `${st.n} of ${st.n} shards passed on tree ${tree.slice(0, 10)}`)
  process.exit(st.green ? 0 : 1)
}

const shardArg = process.argv.indexOf('--shard')
if (shardArg !== -1) {
  const which = parseShard(process.argv[shardArg + 1])
  if (!which) {
    console.error(`usage: node tools/gate.mjs --shard <k>/${SHARDS}   (k = 1..${SHARDS}; or <k>/8, k = 1..8, for smaller shards)`)
    process.exit(2)
  }
  const { k, n } = which
  const tree = treeHash()
  const r = runDiagnosticCommand(`npx vitest run --shard=${k}/${n} --reporter=dot`, `gate-shard-${k}-of-${n}`)
  const count = r.out.replace(/\x1b\[[0-9;]*m/g, '').match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/)
  const s = recordShard(readShards(), tree, k, n, r.ok)
  s.at = new Date().toISOString()
  writeFileSync(SHARDS_FILE, JSON.stringify(s, null, 1) + '\n')
  const passed = s.sets[n]
  const todo = Array.from({ length: n }, (_, i) => i + 1).filter((x) => !passed.includes(x))
  console.log(`shard ${k}/${n}: ${r.ok ? 'PASS' : 'FAIL'}${count ? ` — ${count[1] ? count[1] + ' failed, ' : ''}${count[2]} passed` : ''}` +
    (r.ok ? '' : ` — ${r.note}`))
  console.log(`tree ${tree.slice(0, 10)}: ${passed.length} of ${n} shards passed` +
    (todo.length ? ` — still to run: ${todo.map((x) => `--shard ${x}/${n}`).join(', ')}` : ' — the suite is green on this tree'))
  process.exit(r.ok ? 0 : 1)
}

if (!id) { console.error(`usage: node tools/gate.mjs <item-id> [--land|--abandon "<why>"] [--full] [--budget <s>] [--fresh]  |  --shard <k>/${SHARDS} (1/1 = the whole suite, one command)  |  --count`); process.exit(2) }

let BUDGET
try { BUDGET = budgetFrom(process.argv) } catch (e) { console.error(e.message); process.exit(2) }

/**
 * The Game Builder's data source: one JSON line per gate invocation, appended at
 * every exit. `checks` carries each check's name/ok/warn/note verbatim, so the
 * run log is detailed enough to improve the gauntlet itself — which failures
 * recur, which checks never fire, where the loop spends its attempts.
 */
function logRun(disposition, extra = {}) {
  try {
    appendFileSync(RUNLOG, JSON.stringify({
      at: new Date().toISOString(), id, mode: MODE, process: PROCESS, disposition,
      attempt: (item.attempts ?? 0) + (disposition === 'failed-checks' ? 0 : 1),
      checks: checks.map((c) => ({ name: c.name, ok: !!c.ok, warn: !!c.warn, note: c.note || undefined })),
      ...extra,
    }) + '\n')
  } catch { /* the log is best-effort; the gate's verdict never depends on it */ }
  // The Game Builder rebuild on every exit was cut 2026-09-22 (DECISIONS.md):
  // run `node tools/game-builder.mjs` when you want to look.
}

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts })
const tryRun = (cmd, opts = {}) => { try { return { ok: true, out: sh(cmd, opts) } } catch (e) {
  return { ok: false, status: e.status, out: (e.stdout ?? '') + (e.stderr ?? '') } } }

const backlog = JSON.parse(readFileSync(BACKLOG, 'utf8'))
const item = backlog.find((b) => b.id === id)
if (!item) { console.error(`no backlog item '${id}'`); process.exit(2) }

const checks = []
let ok = true
// Checks are declared in order below and run afterwards, one at a time, by the loop at
// the end ("run the checks") — so each can be recorded, replayed, or left to the next call.
const CHECKS = []
/** A hard gate. Failing one blocks the landing. */
const check = (name, fn, o = {}) => { CHECKS.push({ name, kind: 'check', fn, ...o }) }
/**
 * A flag, not a gate. It lands, but loudly and with the diff in the ledger.
 * Blocking outright would deadlock the loop every time a stale test legitimately
 * needs updating; landing silently is how a loop launders a failure into a pass.
 */
const flag = (name, fn) => { CHECKS.push({ name, kind: 'flag', fn }) }

console.log(`\ngate: ${id}   [${MODE} · ${PROCESS}]\n`)

// --abandon runs no checks (2026-09-22): giving up needs a reason, not a full
// suite. `node tools/gate.mjs <id> --abandon "<why>"`.
if (MODE === 'abandon') {
  const i = process.argv.indexOf('--abandon')
  const reason = (process.argv[i + 1] ?? '').trim()
  if (reason.length < 20 || reason.startsWith('--')) {
    console.error('--abandon needs a written reason of 20+ characters:  node tools/gate.mjs <id> --abandon "<why>"')
    process.exit(2)
  }
  const stampA = new Date().toISOString().slice(0, 16).replace('T', ' ')
  // Cowork-safe revert (2026-09-24, DECISIONS.md "abandon works in Cowork"): overwrite
  // in place and park, never delete — `git checkout`/`git clean` died on the mount. The
  // same paths `git clean` spared are spared; .state is the gate's memory and is kept.
  const rv = revertTree(['node_modules', '.state', 'scratch', 'tools'])
  console.log(`reverted ${rv.restored.length} file(s) to HEAD${rv.parked.length ? `; parked ${rv.parked.length} file(s) HEAD does not have in ${rv.parkedAt}` : ''}`)
  item.status = 'failed'
  item.failedAt = stampA
  item.reason = reason
  writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
  appendFileSync(LEDGER, `\n## ${id} — ABANDONED\n${stampA}\n\n${reason}\n`)
  try { const p = JSON.parse(readFileSync(PROGRESS, 'utf8')); writeFileSync(PROGRESS, serialize(clearResults(openProgress(p, p)))) } catch {}
  logRun('abandoned', { reason })
  console.log('\nABANDONED. Working tree is back to the last landed commit.\n')
  process.exit(1)
}

check('dependencies landed', () => {
  const missing = (item.needs ?? []).filter((n) => !String(backlog.find((b) => b.id === n)?.status ?? '').startsWith('done'))
  return { ok: missing.length === 0, note: missing.length ? `waiting on ${missing.join(', ')}` : '' }
})

flag('not already decided', () => {
  // A rule you have to remember is not a mechanism. iron-gauntlet/SKILL.md has said
  // "run decided.mjs before asking anyone" since it was written, as prose — and the
  // multi-attack question was still settled, litigated, then re-asked as open. This
  // makes the check happen whether or not anyone remembers it.
  //
  // A FLAG, never a gate. decided.mjs reports CANDIDATE rulings, not verdicts; blocking
  // a landing on a keyword match would deadlock the loop on every coincidence. It lands
  // loudly, and the run log records it, so recurrence is measurable.
  const text = [item.spec, item.expect].filter(Boolean).join(' ')
  if (!text) return { ok: true, note: 'no spec text to check' }
  const r = tryRun(`node tools/decided.mjs ${JSON.stringify(text).replace(/`/g, '')}`)
  if (!r.ok) return { ok: true, note: 'decided.mjs unavailable' }
  const rulings = r.out.split('\n').filter((l) => l.trim().startsWith('RULING'))
  if (!rulings.length) return { ok: true, note: 'no existing ruling matches' }
  const where = rulings.slice(0, 2).map((l) => l.replace(/^\s*RULING\s*/, '').trim()).join(' · ')
  return { ok: false, note: `${rulings.length} candidate ruling(s) — READ BEFORE ASKING: ${where}` }
})

check('typecheck', () => {
  const r = tryRun('npx tsc --noEmit')
  return { ok: r.ok, note: r.ok ? '' : r.out.split('\n').filter(Boolean).slice(0, 3).join(' | ') }
})

// The item's own tests, not the full suite (Andrew, 2026-09-23, DECISIONS.md "less
// process per feature"). The full suite runs once per chat as the four shards, and
// `wrap` refuses until all four passed on the final tree.
const touchedTests = () => testFilesIn(sh('git status --porcelain --untracked-files=all'))
check("the item's own tests", () => {
  const files = touchedTests()
  if (!files.length) return { ok: false, note: 'no test file touched' }
  const r = vitestFiles("the item's own tests", files, (cmd) => runDiagnosticCommand(cmd, `gate-item-tests-${id}`))
  if (!r) return { deferred: true }
  return { ok: r.ok, note: r.ok ? files.join(', ') : `${files.join(', ')} — ${r.note}` }
}, { split: true })

check('gate 1 — the id appears in a real battle', () => {
  // Engine-only work skips this check instead of taking an exemption (Andrew,
  // 2026-09-23, DECISIONS.md "less process per feature"): a plumbing item that names
  // no probeIds has no content id a battle could show. Exemptions are gone.
  if (item.shape === 'plumbing' && !item.probeIds) {
    return { ok: true, note: 'engine-only plumbing, no probeIds — not applicable' }
  }
  // An item may nominate the ids to probe when its own id is not a content id
  // (a plumbing item like terrain.kinds introduces terrain.forest, not itself).
  const ids = item.probeIds ?? [id]
  const flag = item.neutral ? ' --neutral' : ''
  const notes = []
  for (const probeId of ids) {
    const r = tryRun(`npx tsx tools/probe.mts ${probeId}${flag}`)
    const line = r.out.trim().split('\n').pop() ?? ''
    if (!r.ok) return { ok: false, note: `${probeId}: ${line}` }
    notes.push(`${probeId}: ${line}`)
  }
  return { ok: true, note: item.neutral ? `NEUTRAL — ${notes.length} ids present, none changed state` : notes.join(' · ') }
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
// Edited tests still land for Angela's review (Law 10); that is not a seal.
let needsReview = weakened.length > 0
let pendingGolden = null
const testDiff = weakened.length > 0 ? tryRun('git diff -U2 -- test/').out : ''

check('control battles unchanged', () => {
  const r = tryRun('npx tsx tools/baseline.mts')
  if (!r.ok) return { ok: false, note: 'baseline probe errored' }
  // One `<mapId> <hash>` line per control map. Naming WHICH maps moved is the
  // point of the split — "all four" and "only the ones with hills" are very
  // different findings.
  const now = r.out.trim().split('\n').filter((l) => / [0-9a-f]{8}$/.test(l)).join('\n')
  if (!now) return { ok: false, note: 'baseline probe produced no hashes' }
  let golden = null
  try { golden = readFileSync(GOLDEN, 'utf8').trim() } catch {}
  if (!golden) return { ok: true, golden: now + '\n', note: 'will bless at commit (first run)' }
  if (golden === now) {
    // THE CONSEQUENCE CLAUSE (2026-08-20). An item that DECLARES it changes the
    // control battles and then changes nothing has not done its job — "the aura
    // should have some consequence." Before this clause, changesBaseline:true with
    // identical hashes passed silently, so a mechanic that claimed to matter and
    // did nothing landed clean.
    if (item.changesBaseline) {
      return { ok: false, note: 'declared changesBaseline — but every control battle is byte-identical. The mechanic had no consequence. Wire it into a control map, or remove the declaration and explain why it is neutral.' }
    }
    return { ok: true, note: '' }
  }

  const was = new Map(golden.split('\n').map((l) => l.split(' ')))
  const is = new Map(now.split('\n').map((l) => l.split(' ')))
  const moved = [...is.keys()].filter((k) => was.get(k) !== is.get(k))
  const added = [...is.keys()].filter((k) => !was.has(k))
  const gone = [...was.keys()].filter((k) => !is.has(k))
  const detail = [
    ...moved.map((k) => `${k} ${(was.get(k) ?? '?').slice(0, 8)}->${is.get(k).slice(0, 8)}`),
    ...added.map((k) => `${k} NEW`), ...gone.map((k) => `${k} GONE`),
  ].join(', ')

  if (item.changesBaseline) {
    // DEFERRED BLESS (bug found by the gauntlet's own first landing, 2026-08-20):
    // blessing here, during the check, moved the golden even when a LATER check
    // failed the landing — and the next attempt then compared against the
    // polluted golden and read its own change as "no consequence". The bless now
    // happens only when the commit does.
    return { ok: true, golden: now + '\n', note: `will re-bless at commit — this item DECLARED it changes the control battles: ${detail}` }
  }
  return { ok: false, note: `CHANGED: ${detail}. Something leaked. If intended, set "changesBaseline": true on the backlog item.` }
})

check('content has a published source', () => {
  // The engine is downstream of the content sessions. It may only implement ids
  // published in a `*-SETTLED.md` table. This exists because 24 ids were built and
  // exactly one of them came through that structure.
  const r = tryRun('node tools/content-check.mjs --strict')
  const line = r.out.trim().split('\n').filter(Boolean).pop() ?? ''
  if (r.ok) return { ok: true, note: line }
  // Pre-existing invented content is grandfathered and listed, not blocked — the
  // gate stops NEW unpublished ids. Blocking outright would stall every item until
  // seven content sessions publish.
  const n = Number((r.out.match(/INVENTED \.+ (\d+)/) ?? [])[1] ?? 0)
  // 10 INVENTED ids are grandfathered scaffolding (2026-08-15) and do not count
  // against the seal. Every id ABOVE that count is NEW unpublished content this
  // item introduced — the warn then counts, so the seal is withheld until the
  // content session publishes the row. Growth of the number is the signal.
  // Attribution: warn only when THIS item grew the count. The standing debt
  // (grandfathered scaffolding + earlier items' still-unpublished ids) is
  // tracked by audit-all and the ledger — inheriting it here blamed every
  // landing for its predecessors (found on fix.one-damage-function, which
  // added zero ids and lost its seal anyway).
  let last = 10
  try { last = JSON.parse(readFileSync('.state/gauntlet.json', 'utf8')).inventedCount ?? 10 } catch {}
  // The land-mode write of inventedCount is applied by the check loop (the `invented`
  // effect), so a recorded result replays it exactly as a fresh one does.
  return { ok: true, warn: n > last, invented: n, note: `${n} ids without a published source${n > last ? ` — ${n - last} NEW from THIS item, publish them` : n > 10 ? ` (${n - 10} awaiting publication from earlier items — see audit)` : ' (all grandfathered)'}` }
})

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
// ── the anti-hardcode gates (2026-08-20) ────────────────────────────────────
// "It is easier to add +2 damage against demons as some custom one-off thing
// than to make sure it is implemented properly." — Angela. These three checks
// exist to make the one-off HARDER than the system, not just discouraged.

/** Added lines of the current working diff, restricted to a path. */
function addedLines(path) {
  const out = tryRun(`git diff -U0 -- ${path}`).out
  return out.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
}

// Content-instance ids are three segments (attack.zombie.basic). Two-segment
// names in core are EVENT vocabulary (attack.declared, status.applied) and are
// legal. Tag literals mirror CODEX.md §12 creature+ancestry as of 2026-08-20 —
// if §12 changes, this list is regenerated, not trusted.
const CONTENT_ID_IN_CORE = /['"`](attack|power|unit|badge|item|enchant|specialty|map)\.[a-z0-9-]+\.[a-z0-9-]+['"`]/
const TAG_LITERALS = /['"`](beast|construct|demon|dragon|elemental|giant|horror|nightmare|plant|undead|vampire|werewolf|catfolk|dwarf|elf|fae)['"`]/

check('hardcode scan — core knows mechanisms, never names', () => {
  const bad = addedLines('src/core').filter((l) => CONTENT_ID_IN_CORE.test(l) || TAG_LITERALS.test(l))
  return {
    ok: bad.length === 0,
    note: bad.length ? `content names in engine code: ${bad.slice(0, 3).map((l) => l.trim().slice(0, 60)).join(' | ')} — a mechanism reads data; only content knows names.` : '',
  }
})

// tool.prior-art-audit (2026-09-28; DECISIONS.md "the duplication review, ruled", the review page's
// Prevention section, and "the opening is tested with the player's party": "we need to check
// features aren't copying something the engine already has"). What the item changed across the
// four packages (uncommitted, per repository) against the tree as it stands: a new vocabulary that
// looks like one elsewhere, a new name another file already declares, a new call around a ruled
// funnel (tools/prior-art-funnels.json), and jscpd clones on its added lines. A FLAG: it lands, but
// for review, unless the spec has a "Prior art:" line naming what it resembles and why it is not
// the same. A run that cannot finish (jscpd missing) is loud and holds the landing too (Law 9).
flag('prior art — nothing new copies what exists', () => {
  if (!FULL) return { ok: true, note: 'fast — wrap runs it over the whole tree; --full runs it here' }
  try { const { ok, review, note } = checkItem(item); return { ok, review, note } }
  catch (e) { return { ok: false, review: true, note: `the prior-art audit could not run: ${String(e.message ?? e).split('\n')[0]}` } }
})

// tool.wrong-home-audit (2026-09-28, the same ruling: "…or that the engine had something that was
// supposed to be somewhere else and we need to remove it from the engine"). The item's changed engine
// files: a content row or a content value typed in, a content name read by core/ai/sim, a campaign
// quantity, a display colour. A FLAG: it lands for review unless the spec has an "Engine rule:" line.
flag('wrong home — nothing another package owns', () => {
  if (!FULL) return { ok: true, note: 'fast — wrap runs it over the whole tree; --full runs it here' }
  try { const { ok, review, note } = checkWrongHome(item); return { ok, review, note } }
  catch (e) { return { ok: false, review: true, note: `the wrong-home audit could not run: ${String(e.message ?? e).split('\n')[0]}` } }
})

// Shapes that introduce a MECHANISM must prove the second instance is data.
const MECHANISM_SHAPES = ['rule', 'station', 'trigger', 'modifier', 'pool', 'counter']
check('generalizes — the second instance costs zero engine code', () => {
  if (!MECHANISM_SHAPES.includes(item.shape)) return { ok: true, note: `shape '${item.shape}' — not a mechanism, exempt` }
  const variants = item.variants ?? []
  if (variants.length < 2) {
    return { ok: false, note: `a '${item.shape}' item must declare "variants": two or more ids that exercise the SAME mechanism with different data (+2 vs demons proves nothing; +2 vs demons AND +4 vs undead proves a system).` }
  }
  const notes = []
  for (const v of variants) {
    // The variant must live in content, not in the engine…
    const inCore = filesContaining('src/core', v)
    if (inCore.length) return { ok: false, note: `variant '${v}' appears in ${inCore[0]} — the second instance must be pure data` }
    // …and must actually run in a battle.
    const r = tryRun(`npx tsx tools/probe.mts ${v}`)
    const line = r.out.trim().split('\n').pop() ?? ''
    if (!r.ok) return { ok: false, note: `variant '${v}': ${line}` }
    notes.push(`${v} live`)
  }
  return { ok: true, note: notes.join(' · ') }
})

// Naming: GLOSSARY.md is the authority; this is its teeth. Grammar violations
// block; style smells flag the landing for review rather than deadlocking it.
//
// The kind list is the UNION of the engine's own kinds and the project-wide
// ruling file tools/approved-kinds.json (fixed 2026-08-27): this list and that
// file had drifted apart — 'showcase' was Andrew-approved there and unknown
// here, unnoticed only because new files never hit addedLines. Two lists that
// can disagree is the exact failure Law 13 exists to prevent; the ruling file
// wins for everything it names.
const ENGINE_KINDS = ['attack', 'power', 'status', 'unit', 'terrain', 'map', 'badge', 'item', 'enchant', 'specialty', 'origin', 'card', 'class', 'art', 'rule', 'engagement', 'trigger', 'ability', 'ai', 'baseline', 'test', 'hero']
const KNOWN_KINDS = (() => {
  try {
    const approved = JSON.parse(readFileSync('../tools/approved-kinds.json', 'utf8')).kinds
    return [...new Set([...ENGINE_KINDS, ...Object.keys(approved)])]
  } catch { return ENGINE_KINDS } // engine checked out alone — its own kinds still hold
})()
check('naming — new content ids use declared kinds', () => {
  const ids = new Set()
  for (const l of addedLines('src/content')) {
    // Map ROW art is not an id: a quoted 12-glyph string with a '..' run is
    // board ASCII ('ww..bbbb....'), and reading 'ww' as an id kind was a false
    // positive found landing map.showcase (2026-08-20).
    // map.opening-six (2026-09-28): boards are any authored width now (board.variable-size), so
    // row art is recognised at any length of 12 or more — a 20- or 40-glyph row read 'xf' as a kind.
    // An id never holds '..' (tools/add-item.mjs id pattern), so the guard is unchanged.
    const stripped = l.replace(/['"][a-zA-Z.]{12,}['"]/g, (s) => (s.includes('..') ? "''" : s))
    for (const m of stripped.matchAll(/['"`]([a-z]+)\.[a-z0-9][a-z0-9.-]*['"`]/g)) ids.add(m[1])
  }
  const unknown = [...ids].filter((k) => !KNOWN_KINDS.includes(k))
  return { ok: unknown.length === 0, note: unknown.length ? `unknown id kind(s): ${unknown.join(', ')} — declare the kind in GLOSSARY.md before minting ids under it` : '' }
})
flag('naming — no banned words invented', () => {
  const smells = []
  for (const l of [...addedLines('src'), ...addedLines('test')]) {
    if (/(class|function|const|let)\s+\w*(Manager|Controller|Service)\b/.test(l)) smells.push('a *Manager/*Controller/*Service — name the state slice and the functions separately')
    if (/\b(proc|procs)\b/i.test(l)) smells.push("'proc' — say trigger")
    if (/\b(buff|debuff)s?\b/i.test(l)) smells.push("'buff/debuff' — say status")
  }
  const newFiles = sh('git status --porcelain').split('\n').filter((l) => l.startsWith('??') || l.startsWith('A '))
    .map((l) => l.slice(3)).filter((f) => /(utils|helpers|misc|stuff)\.(ts|mjs)$/.test(f))
  for (const f of newFiles) smells.push(`${f} — a file named utils is where names go to be invented`)
  return { ok: smells.length === 0, review: smells.length > 0, note: smells.length ? [...new Set(smells)].slice(0, 4).join(' | ') + ' — will land FLAGGED' : '' }
})

// THE KILL-SWITCH CHECK (Iron Gauntlet). Gate 2's assertions are written by the
// same session that wrote the code — so who tests the tests? This does: run the
// item's test files with the item's content DISABLED (the CF_DISABLE_IDS seam in
// src/content/disable.ts). They must FAIL. A test that passes either way would
// have passed before the feature existed, and proves nothing.
check('kill switch — the tests fail without the content', () => {
  const ids = (item.probeIds ?? [id]).filter((x) => x.includes('.'))
  if ((item.shape === 'plumbing' && !item.probeIds) || ids.length === 0) return { ok: true, note: 'no content id to disable — engine plumbing, not applicable' }
  // fast: the test files the item ADDED — its own verify scenario, not an existing battle
  // file it happened to edit; every touched file when it added none. --full: every touched file.
  const files = killSwitchFiles(sh('git status --porcelain --untracked-files=all'), FULL)
  if (files.length === 0) return { ok: true, note: 'no touched test files (brought-its-own-tests already failed)' }
  // The env goes through execSync's `env` option, not a `VAR=x cmd` prefix —
  // that prefix is bash-only, and under cmd.exe this check would "fail" because
  // the shell could not find a program called CF_DISABLE_IDS. A kill-switch
  // gate that fails for that reason PASSES the item (it expects failure), so
  // the tautology check would have been silently inert on Windows.
  const r = vitestFiles('kill switch — the tests fail without the content', files,
    (cmd) => tryRun(cmd, { env: { ...process.env, CF_DISABLE_IDS: ids.join(',') } }))
  if (!r) return { deferred: true }
  if (r.ok) {
    return { ok: false, note: `TAUTOLOGICAL — the touched tests PASS with ${ids.join(',')} disabled. They would have passed before the feature existed. Assert something the content actually causes.` }
  }
  return { ok: true, note: `tests fail without ${ids.join(',')} — they genuinely test it` }
}, { split: true })

// ── run the checks: replay what passed on this tree, run the rest, honour the budget ──
const tree = treeHash()
let progress = (() => {
  let raw = null
  try { raw = JSON.parse(readFileSync(PROGRESS, 'utf8')) } catch {}
  let golden = null
  try { golden = readFileSync(GOLDEN, 'utf8').trim() } catch {}
  // the process is part of the context: a fast pass never replays into a --full run
  return openProgress(raw, { id, tree, ctx: contextHash({ ...item, process: PROCESS }, backlog, golden) })
})()
if (process.argv.includes('--fresh')) progress = clearResults(progress)
const saveProgress = () => { try { writeFileSync(PROGRESS, serialize(progress)) } catch { /* best-effort: a lost record only means re-running checks */ } }
const recordedCount = () => CHECKS.filter((c) => recall(progress, c.name)).length
if (recordedCount()) console.log(`  resuming: ${recordedCount()} of ${CHECKS.length} checks already passed on tree ${tree.slice(0, 10)}\n`)

/**
 * The vitest run a check makes over `files`. Unbudgeted (a terminal) it is the one
 * command it always was. Under a budget it runs one command per file, each recorded
 * on the tree, so a check longer than one Cowork call finishes across calls: the
 * result is ok only when every file passed, and is the first failing file's result
 * otherwise — the same verdict one command over every file gives. Returns null when
 * the budget ran out before the files did.
 */
let ranFresh = 0
function vitestFiles(checkName, files, run) {
  if (BUDGET === Infinity) return run(`npx vitest run ${files.join(' ')} --reporter=dot`)
  for (const f of files) {
    const key = `${checkName} ▸ ${f}`
    if (recall(progress, key)) continue
    if (stopBefore({ elapsedMs: Date.now() - T0, budgetMs: BUDGET, estimateMs: progress.durations[key], ranFresh })) return null
    const t = Date.now()
    const r = run(`npx vitest run ${f} --reporter=dot`)
    ranFresh++
    progress = record(progress, key, { ok: r.ok }, Date.now() - t); saveProgress()
    if (!r.ok) return r
  }
  return { ok: true, out: '' }
}

let stoppedAt = -1
{
  for (let i = 0; i < CHECKS.length; i++) {
    const c = CHECKS[i]
    const had = recall(progress, c.name)
    if (!had && stopBefore({ elapsedMs: Date.now() - T0, budgetMs: BUDGET, estimateMs: c.split ? undefined : progress.durations[c.name], ranFresh })) { stoppedAt = i; break }
    const t = Date.now()
    const r = had ?? c.fn()
    if (r.deferred) { stoppedAt = i; break }
    const res = c.kind === 'flag' ? { ...r, warn: !r.ok } : r
    checks.push({ name: c.name, ...res })
    const tag = c.kind === 'flag' ? (r.ok ? 'PASS' : 'WARN') : (r.ok ? 'PASS' : 'FAIL')
    if (c.kind === 'flag' || !r.skipPrint) console.log(`  ${tag}${had ? ' (recorded)' : ''}  ${c.name}${r.note ? '  — ' + r.note : ''}`)
    if (c.kind === 'check' && !r.ok) ok = false
    // effects — applied the same whether the result is fresh or recorded
    if (r.golden) pendingGolden = r.golden
    if (r.review) needsReview = true
    if (MODE === 'land' && r.invented !== undefined) {
      const n = r.invented
      try { const g = JSON.parse(readFileSync('.state/gauntlet.json', 'utf8')); g.inventedCount = n; writeFileSync('.state/gauntlet.json', JSON.stringify(g)) } catch { writeFileSync('.state/gauntlet.json', JSON.stringify({ landings: 0, inventedCount: n })) }
    }
    if (!had) { ranFresh++; progress = record(progress, c.name, res, Date.now() - t); saveProgress() }
  }
}
if (stoppedAt !== -1) {
  const left = CHECKS.slice(stoppedAt).map((c) => {
    const parts = Object.keys(progress.results).filter((k) => k.startsWith(`${c.name} ▸ `)).length
    return parts ? `${c.name} (${parts} test file(s) recorded)` : c.name
  })
  if (ok) {
    // Out of budget, nothing failed: no attempt, no run-log line, no landing.
    console.log(`\nINCOMPLETE — ${recordedCount()} of ${CHECKS.length} checks recorded on tree ${tree.slice(0, 10)}; run the same command again` +
      `\n  (${((Date.now() - T0) / 1000).toFixed(0)} s of a ${(BUDGET / 1000).toFixed(0)} s budget; still to run: ${left.join(', ')})\n`)
    process.exit(3)
  }
  // A check already failed: the verdict is decided, so the run ends as a failed run does.
  console.log(`  (not run — out of budget after a failure: ${left.join(', ')})`)
}

const body = checks.map((c) => `  ${c.ok ? 'PASS' : c.warn ? 'WARN' : 'FAIL'}  ${c.name}${c.note ? ' — ' + c.note : ''}`).join('\n')

if (!ok) {
  item.attempts = (item.attempts ?? 0) + 1
  writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
  console.log(`\nNOT READY (attempt ${item.attempts}). Nothing reverted — fix and run the gate again.` +
    `\nIf it cannot be made to pass:  node tools/gate.mjs ${id} --abandon\n`)
  logRun('failed-checks')
  process.exit(1)
}

if (MODE !== 'land') {
  console.log('\nAll gates pass. Run with --land to commit.\n')
  logRun('check-passed')
  process.exit(0)
}

// Nothing the checks read is left out of the commit. `git add -A` takes every
// tracked and untracked file; only an ignored file under src/, test/ or tools/
// could make a pass that the committed tree does not reproduce. Seconds, not a
// second full suite (replaces the post-land audit, cut 2026-09-22).
{
  // tools/jscpd/node_modules is the prior-art audit's installed dependency, as node_modules/ is the
  // engine's: npm ci --prefix tools/jscpd, never committed (tool.prior-art-audit, 2026-09-28).
  const left = tryRun(`git ls-files --others --ignored --exclude-standard -- src test tools ':!tools/jscpd/node_modules'`).out.trim()
  if (left) {
    console.log(`\nNOT LANDED: ignored files the checks could have read would be left out of the commit:\n${left}\nCommit them, move them out, or un-ignore them, then gate again.\n`)
    logRun('refused-ignored-files', { reason: left.split('\n').slice(0, 5).join(', ') })
    process.exit(1)
  }
}
if (pendingGolden) writeFileSync(GOLDEN, pendingGolden)
progress = clearResults(progress); saveProgress()   // landed: this tree's record is spent
sh('git add -A')
sh(`git -c user.email=a@b -c user.name=combat-framework commit -q -m ${JSON.stringify(`${id}: ${item.spec.slice(0, 72)}`)}`)
const sha = sh('git rev-parse --short HEAD').trim()
item.status = needsReview ? 'done-needs-review' : 'done'
item.sha = sha
writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
appendFileSync(LEDGER, `\n## ${id} — LANDED \`${sha}\`${needsReview ? ' **NEEDS REVIEW**' : ''}\n${stamp}\n\n${body}\n` +
  (needsReview ? `\n<details><summary>Existing tests were edited — review this diff</summary>\n\n\`\`\`diff\n${testDiff}\`\`\`\n</details>\n` : ''))
// The seal is gone (Andrew, 2026-09-23, DECISIONS.md "less process per feature"):
// every check is pass or fail, and a landing is a landing. Flags still print and
// still go in the ledger; edited tests still land for review (Law 10).
// The landing's gauntlet-log line goes into the landing commit, not a commit of
// its own (Andrew, 2026-10-01): logged before the amend picks it up.
logRun('landed', { sha })
sh('git add -A')
sh(`git -c user.email=a@b -c user.name=combat-framework commit -q --amend --no-edit`)
console.log(`\nLANDED as ${sha}${needsReview ? '  (flagged for review — existing tests edited, a banned word, prior art not named, or a wrong home)' : ''}\n`)
