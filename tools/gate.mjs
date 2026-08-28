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
const RUNLOG = '.state/gauntlet-log.jsonl'

/**
 * The Game Builder's data source: one JSON line per gate invocation, appended at
 * every exit. `checks` carries each check's name/ok/warn/note verbatim, so the
 * run log is detailed enough to improve the gauntlet itself — which failures
 * recur, which checks never fire, where the loop spends its attempts.
 */
function logRun(disposition, extra = {}) {
  try {
    appendFileSync(RUNLOG, JSON.stringify({
      at: new Date().toISOString(), id, mode: MODE, disposition,
      attempt: (item.attempts ?? 0) + (disposition === 'failed-checks' ? 0 : 1),
      checks: checks.map((c) => ({ name: c.name, ok: !!c.ok, warn: !!c.warn, note: c.note || undefined })),
      ...extra,
    }) + '\n')
  } catch { /* the log is best-effort; the gate's verdict never depends on it */ }
  try { execSync('node tools/game-builder.mjs --quiet', { stdio: 'ignore' }) } catch { /* ditto */ }
}

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts })
const tryRun = (cmd, opts = {}) => { try { return { ok: true, out: sh(cmd, opts) } } catch (e) {
  return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') } } }

const backlog = JSON.parse(readFileSync(BACKLOG, 'utf8'))
const item = backlog.find((b) => b.id === id)
if (!item) { console.error(`no backlog item '${id}'`); process.exit(2) }

const checks = []
let ok = true
/** Set when an item takes the gate-1 deletion exemption. Forces a flagged landing. */
let unreachableUsed = false
/** A hard gate. Failing one blocks the landing. */
const check = (name, fn) => {
  const r = fn()
  checks.push({ name, ...r })
  if (!r.skipPrint) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${name}${r.note ? '  — ' + r.note : ''}`)
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

const okStillTrue = () => ok
console.log(`\ngate: ${id}   [${MODE}]\n`)

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

check('full test suite', () => {
  const r = tryRun('npx vitest run --reporter=dot')
  const m = r.out.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/)
  if (r.ok) return { ok: true, note: m ? `${m[2]} passed` : '' }
  // Name the failures. A gate that only says "3 FAILED" makes the next attempt start blind.
  const names = [...r.out.matchAll(/(?:×|FAIL)\s+([^\n]+)/g)].map((x) => x[1].trim())
  return { ok: false, note: `${m?.[1] ?? '?'} FAILED — ${[...new Set(names)].slice(0, 6).join(' · ') || 'see vitest output'}` }
})

check('gate 1 — the id appears in a real battle', () => {
  // DELETIONS. Gate 1 asks "is this wired into a battle?" — which a REMOVAL cannot
  // answer, and an item that removes an unreachable field cannot answer twice over.
  // Added 2026-08-15, when deleting Targeting.excludeSelf had no honest probe: the
  // targeting model is not reachable from a battle because no content uses it yet.
  //
  // The escape is deliberately expensive to take. It demands a written reason, it
  // prints as SKIP rather than PASS, and it FLAGS the landing for review — so a
  // session cannot quietly use it to dodge a probe it simply did not think about.
  // Law 10: the gate is not weakened, the exemption is made loud and auditable.
  if (item.unreachable) {
    if (typeof item.unreachable !== 'string' || item.unreachable.length < 20) {
      return { ok: false, note: '`unreachable` must be a written reason, not a boolean' }
    }
    unreachableUsed = true
    console.log(`  SKIP  gate 1 — not probeable  — ${item.unreachable}`)
    return { ok: true, note: '', skipPrint: true }
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
// Taking the gate-1 deletion exemption ALWAYS flags the landing, whatever else
// passed. An exemption that lands clean is an exemption nobody ever re-reads.
let needsReview = weakened.length > 0 || unreachableUsed
let pendingGolden = null
let exemptions = unreachableUsed ? 1 : 0
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
  if (!golden) { pendingGolden = now + '\n'; return { ok: true, note: 'will bless at commit (first run)' } }
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
    pendingGolden = now + '\n'
    return { ok: true, note: `will re-bless at commit — this item DECLARED it changes the control battles: ${detail}` }
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
  if (MODE === 'land') {
    try { const g = JSON.parse(readFileSync('.state/gauntlet.json', 'utf8')); g.inventedCount = n; writeFileSync('.state/gauntlet.json', JSON.stringify(g)) } catch { writeFileSync('.state/gauntlet.json', JSON.stringify({ landings: 0, inventedCount: n })) }
  }
  return { ok: true, warn: n > last, note: `${n} ids without a published source${n > last ? ` — ${n - last} NEW from THIS item, seal withheld until published` : n > 10 ? ` (${n - 10} awaiting publication from earlier items — see audit)` : ' (all grandfathered)'}` }
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
  if (item.coreLiteralAllow) {
    if (typeof item.coreLiteralAllow !== 'string' || item.coreLiteralAllow.length < 20) {
      return { ok: false, note: '`coreLiteralAllow` must be a written reason, not a boolean' }
    }
    needsReview = true; exemptions++
    console.log(`  SKIP  hardcode scan — exemption taken  — ${item.coreLiteralAllow}`)
    return { ok: true, note: '', skipPrint: true }
  }
  const bad = addedLines('src/core').filter((l) => CONTENT_ID_IN_CORE.test(l) || TAG_LITERALS.test(l))
  return {
    ok: bad.length === 0,
    note: bad.length ? `content names in engine code: ${bad.slice(0, 3).map((l) => l.trim().slice(0, 60)).join(' | ')} — a mechanism reads data; only content knows names. If this is genuinely a board rule (like ZoC), set coreLiteralAllow with the reason.` : '',
  }
})

// Shapes that introduce a MECHANISM must prove the second instance is data.
const MECHANISM_SHAPES = ['rule', 'station', 'trigger', 'modifier', 'pool', 'counter']
check('generalizes — the second instance costs zero engine code', () => {
  if (!MECHANISM_SHAPES.includes(item.shape)) return { ok: true, note: `shape '${item.shape}' — not a mechanism, exempt` }
  if (item.generalizationExempt) {
    if (typeof item.generalizationExempt !== 'string' || item.generalizationExempt.length < 20) {
      return { ok: false, note: '`generalizationExempt` must be a written reason, not a boolean' }
    }
    needsReview = true; exemptions++
    console.log(`  SKIP  generalizes — exemption taken  — ${item.generalizationExempt}`)
    return { ok: true, note: '', skipPrint: true }
  }
  const variants = item.variants ?? []
  if (variants.length < 2) {
    return { ok: false, note: `a '${item.shape}' item must declare "variants": two or more ids that exercise the SAME mechanism with different data (+2 vs demons proves nothing; +2 vs demons AND +4 vs undead proves a system). Or set generalizationExempt with a written reason.` }
  }
  const notes = []
  for (const v of variants) {
    // The variant must live in content, not in the engine…
    const inCore = tryRun(`grep -rl "${v}" src/core`).out.trim()
    if (inCore) return { ok: false, note: `variant '${v}' appears in ${inCore.split('\n')[0]} — the second instance must be pure data` }
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
    const stripped = l.replace(/['"][a-zA-Z.]{12}['"]/g, (s) => (s.includes('..') ? "''" : s))
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
  if (smells.length) needsReview = true
  return { ok: smells.length === 0, note: smells.length ? [...new Set(smells)].slice(0, 4).join(' | ') + ' — will land FLAGGED' : '' }
})

// THE KILL-SWITCH CHECK (Iron Gauntlet). Gate 2's assertions are written by the
// same session that wrote the code — so who tests the tests? This does: run the
// item's test files with the item's content DISABLED (the CF_DISABLE_IDS seam in
// src/content/disable.ts). They must FAIL. A test that passes either way would
// have passed before the feature existed, and proves nothing.
check('kill switch — the tests fail without the content', () => {
  if (item.killSwitchExempt) {
    if (typeof item.killSwitchExempt !== 'string' || item.killSwitchExempt.length < 20) {
      return { ok: false, note: '`killSwitchExempt` must be a written reason, not a boolean' }
    }
    needsReview = true; exemptions++
    console.log(`  SKIP  kill switch — exemption taken  — ${item.killSwitchExempt}`)
    return { ok: true, note: '', skipPrint: true }
  }
  const ids = (item.probeIds ?? [id]).filter((x) => x.includes('.'))
  if (item.unreachable || ids.length === 0) return { ok: true, note: 'no content id to disable — engine plumbing, not applicable' }
  const files = sh('git status --porcelain').split('\n').filter(Boolean).map((l) => l.slice(3)).filter((f) => f.startsWith('test/'))
  if (files.length === 0) return { ok: true, note: 'no touched test files (brought-its-own-tests already failed)' }
  // The env goes through execSync's `env` option, not a `VAR=x cmd` prefix —
  // that prefix is bash-only, and under cmd.exe this check would "fail" because
  // the shell could not find a program called CF_DISABLE_IDS. A kill-switch
  // gate that fails for that reason PASSES the item (it expects failure), so
  // the tautology check would have been silently inert on Windows.
  const r = tryRun(`npx vitest run ${files.join(' ')} --reporter=dot`,
    { env: { ...process.env, CF_DISABLE_IDS: ids.join(',') } })
  if (r.ok) {
    return { ok: false, note: `TAUTOLOGICAL — the touched tests PASS with ${ids.join(',')} disabled. They would have passed before the feature existed. Assert something the content actually causes.` }
  }
  return { ok: true, note: `tests fail without ${ids.join(',')} — they genuinely test it` }
})

const body = checks.map((c) => `  ${c.ok ? 'PASS' : c.warn ? 'WARN' : 'FAIL'}  ${c.name}${c.note ? ' — ' + c.note : ''}`).join('\n')

if (MODE === 'abandon') {
  // Two calls, not one `;`-joined string: `;` is a bash statement separator and
  // cmd.exe does not read it, so on Windows the whole tail became arguments to
  // `git checkout` and the clean never ran — an --abandon that left the tree
  // dirty while reporting success.
  sh('git checkout -- .')
  sh('git clean -fdq -e node_modules -e .state -e scratch -e tools')
  item.status = 'failed'
  item.failedAt = stamp
  item.reason = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.note}`).join(' | ')
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
  console.log('\nAll gates pass. Run with --land to commit.\n')
  logRun('check-passed')
  process.exit(0)
}

if (pendingGolden) writeFileSync(GOLDEN, pendingGolden)
sh('git add -A')
sh(`git -c user.email=a@b -c user.name=combat-framework commit -q -m ${JSON.stringify(`${id}: ${item.spec.slice(0, 72)}`)}`)
const sha = sh('git rev-parse --short HEAD').trim()
item.status = needsReview ? 'done-needs-review' : 'done'
item.sha = sha
writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
appendFileSync(LEDGER, `\n## ${id} — LANDED \`${sha}\`${needsReview ? ' **NEEDS REVIEW**' : ''}\n${stamp}\n\n${body}\n` +
  (needsReview ? `\n<details><summary>Existing tests were edited — review this diff</summary>\n\n\`\`\`diff\n${testDiff}\`\`\`\n</details>\n` : ''))
// ── post-land audit (2026-08-20) ────────────────────────────────────────────
// Re-run the decisive checks FROM THE COMMITTED TREE. The classic laundering
// failure is a pass that depended on a file that never got committed — every
// pre-land check ran against the working tree, so only a post-commit rerun can
// catch it. On failure the landing is undone, loudly.
{
  const t = tryRun('npx vitest run --reporter=dot')
  const b = tryRun('npx tsx tools/baseline.mts')
  const nowHashes = b.out.trim().split('\n').filter((l) => / [0-9a-f]{8}$/.test(l)).join('\n')
  const goldenNow = (() => { try { return readFileSync(GOLDEN, 'utf8').trim() } catch { return '' } })()
  const auditOk = t.ok && b.ok && nowHashes === goldenNow
  if (!auditOk) {
    sh('git reset --hard HEAD~1')
    const why = !t.ok ? 'test suite fails on the committed tree' : !b.ok ? 'baseline probe errors on the committed tree' : 'control battles differ on the committed tree'
    const bl = JSON.parse(readFileSync(BACKLOG, 'utf8'))
    const it = bl.find((x) => x.id === id)
    if (it) { it.attempts = (it.attempts ?? 0) + 1; it.auditFailed = why; writeFileSync(BACKLOG, JSON.stringify(bl, null, 1)) }
    appendFileSync(LEDGER, `\n## ${id} — LANDING REVERTED BY POST-LAND AUDIT\n${stamp}\n\n${why}. The pre-land pass depended on state that did not survive the commit.\n`)
    console.log(`\nLANDING REVERTED: ${why}. The commit is undone; nothing is lost from the working tree of the last good landing. Fix and gate again.\n`)
    logRun('reverted-by-post-land-audit', { reason: why })
    process.exit(1)
  }
}
// ── the Iron Gauntlet verdict ───────────────────────────────────────────────
// PASSED means: every hard check passed, no flag warned, no exemption was taken,
// the post-land audit agreed, and — for consequential mechanisms — the effect was
// measured. Anything less lands (flags exist so the loop cannot deadlock) but the
// seal is withheld, and the ledger says exactly why.
let gauntletNotes = []
// Grandfathered environmental debt (the INVENTED ids the content sessions have
// not yet published) is not this item's doing — it is tracked by the audit and
// must not withhold every seal until session 2 publishes. Only item-attributable
// flags count against the gauntlet.
const warns = checks.filter((c) => c.warn).length  // content-check now only warns on NEW unpublished ids, so it counts

// Effect measurement for consequential mechanisms: WITH vs WITHOUT, paired seeds,
// through the kill-switch seam. Recorded, not thresholded — magnitude is a
// finding, not a gate; the consequence clause already proved non-nullity.
let effectReport = ''
if (item.changesBaseline && MECHANISM_SHAPES.includes(item.shape)) {
  const ids = (item.probeIds ?? [id]).filter((x) => x.includes('.'))
  if (ids.length) {
    const r = tryRun(`npx tsx tools/effect-size.mts ${ids.join(',')}`)
    effectReport = r.out.trim()
    if (!r.ok) gauntletNotes.push('effect measurement errored')
    console.log('\n' + effectReport + '\n')
  }
}

// Landing counter and the periodic full audit — every 10th landing, the whole
// tree, because drift that arrives in ten innocent pieces is only visible in
// aggregate.
let auditNote = ''
{
  let g = { landings: 0 }
  try { g = JSON.parse(readFileSync('.state/gauntlet.json', 'utf8')) } catch {}
  g.landings = (g.landings ?? 0) + 1
  writeFileSync('.state/gauntlet.json', JSON.stringify(g))
  if (g.landings % 10 === 0) {
    console.log(`\nlanding #${g.landings} — running the periodic full audit`) 
    // --checkpoint: a mid-batch health check, NOT a batch boundary — the
    // unflagged call here once split "movement + ground" into two bars.
    const a = tryRun('node tools/audit-all.mjs --checkpoint')
    console.log(a.out.trim())
    if (!a.ok) { gauntletNotes.push('periodic full audit FAILED — investigate before the next item'); auditNote = ' · periodic audit FAILED' }
    else auditNote = ' · periodic audit clean'
  }
}

if (!okStillTrue()) gauntletNotes.push('a hard check failed') // defensive; land mode cannot reach here with ok=false
if (warns > 0) gauntletNotes.push(`${warns} flag(s) warned`)
if (exemptions > 0) gauntletNotes.push(`${exemptions} exemption(s) taken`)
const gauntletPassed = gauntletNotes.length === 0
item.gauntlet = gauntletPassed ? 'passed' : `not passed — ${gauntletNotes.join('; ')}`
{
  const bl = JSON.parse(readFileSync(BACKLOG, 'utf8'))
  const it = bl.find((x) => x.id === id)
  if (it) { it.gauntlet = item.gauntlet; writeFileSync(BACKLOG, JSON.stringify(bl, null, 1)) }
  appendFileSync(LEDGER, `\nIRON GAUNTLET: ${gauntletPassed ? 'PASSED' : item.gauntlet.toUpperCase()}${auditNote}\n` +
    (effectReport ? '\n```\n' + effectReport + '\n```\n' : ''))
  sh('git add -A')
  sh(`git -c user.email=a@b -c user.name=combat-framework commit -q --amend --no-edit`)
}
logRun('landed', { sha, seal: gauntletPassed ? 'passed' : gauntletNotes.join('; '), effect: effectReport || undefined })
console.log(gauntletPassed
  ? `\n⛓  IRON GAUNTLET: PASSED — every check, no flags, no exemptions.`
  : `\n⛓  IRON GAUNTLET: NOT PASSED — ${gauntletNotes.join('; ')}. The landing stands; the seal is withheld.`)
console.log(`\nLANDED as ${sha}${needsReview ? '  (flagged for review)' : ''}\n`)
