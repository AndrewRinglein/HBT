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

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const id = process.argv[2]
const MODE = process.argv.includes('--land') ? 'land'
  : process.argv.includes('--abandon') ? 'abandon' : 'check'
if (!id) { console.error('usage: node tools/gate.mjs <item-id> [--land|--abandon]'); process.exit(2) }

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
const check = (name, fn) => {
  const r = fn()
  checks.push({ name, ...r })
  if (!r.skipPrint) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${name}${r.note ? '  — ' + r.note : ''}`)
  if (!r.ok) ok = false
  return r.ok
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
      checks: checks.map((c) => ({ name: c.name, ok: !!c.ok, warn: !!c.warn, note: c.note || undefined })),
      ...extra,
    }) + '\n')
  } catch { /* best-effort; the verdict never depends on it */ }
}
const engineSha = () => { const r = tryRun(`git -C ${ENGINE} rev-parse --short HEAD`); return r.ok ? r.out.trim() : 'unknown' }
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

check('full test suite', () => {
  const r = tryRun('npm test -s -- --reporter=dot')
  const m = r.out.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/)
  if (r.ok) return { ok: true, note: m ? `${m[2]} passed` : '' }
  const names = [...r.out.matchAll(/(?:×|FAIL)\s+([^\n]+)/g)].map((x) => x[1].trim())
  return { ok: false, note: `${m?.[1] ?? '?'} FAILED — ${[...new Set(names)].slice(0, 6).join(' · ') || 'see vitest output'}` }
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
  const notes = []
  for (const n of iscs) {
    const r = tryRun(`node tools/slice-gate.mjs --isc ${n}`)
    const line = r.out.trim().split('\n').pop() ?? ''
    if (!r.ok) return { ok: false, note: `ISC-${n}: ${line}` }
    notes.push(`ISC-${n} holds`)
  }
  return { ok: true, note: notes.join(' · ') }
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

// ── nothing regresses: the whole P set, not the one you touched ─────────────
check('nothing regresses — every P-tier probe', () => {
  const r = tryRun('node tools/slice-gate.mjs')
  const summary = r.out.trim().split('\n').filter((l) => /P-tier probe\(s\)/.test(l)).pop() ?? ''
  return { ok: r.ok, note: summary }
})

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
    const inCore = tryRun(`grep -rl "${v}" src/core`).out.trim()
    if (inCore) return { ok: false, note: `variant '${v}' appears in ${inCore.split('\n')[0]} — the second instance must be pure data` }
    const inContent = tryRun(`grep -rl "${v}" src/content`).out.trim()
    if (!inContent) return { ok: false, note: `variant '${v}' is not a row anywhere under src/content` }
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
const body = checks.map((c) => `  ${c.ok ? 'PASS' : c.warn ? 'WARN' : 'FAIL'}  ${c.name}${c.note ? ' — ' + c.note : ''}`).join('\n')

if (MODE === 'abandon') {
  sh('git checkout -- .')
  sh('git clean -fdq -e node_modules -e .state -e tools')
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
  console.log('\nAll checks pass. Run with --land to commit.\n')
  logRun('check-passed')
  process.exit(0)
}

// ── land ────────────────────────────────────────────────────────────────────
sh('git add -A')
sh(`git -c user.email=a@b -c user.name=kingdom commit -q -m ${JSON.stringify(`${id}: ${item.spec.slice(0, 72)}`)}`)
const sha = sh('git rev-parse --short HEAD').trim()
item.status = needsReview ? 'done-needs-review' : 'done'
item.sha = sha
item.engineSha = engineSha()
writeFileSync(BACKLOG, JSON.stringify(backlog, null, 1))
appendFileSync(LEDGER, `\n## ${id} — LANDED \`${sha}\`${needsReview ? ' **NEEDS REVIEW**' : ''}\n${stamp} · engine @ ${engineSha()}\n\n${body}\n` +
  (needsReview && testDiff ? `\n<details><summary>Existing tests were edited — review this diff</summary>\n\n\`\`\`diff\n${testDiff}\`\`\`\n</details>\n` : ''))

// Post-land audit: the decisive checks FROM THE COMMITTED TREE. On failure the
// landing is undone, loudly.
{
  const t = tryRun('npm test -s -- --reporter=dot')
  const p = tryRun('node tools/slice-gate.mjs')
  if (!t.ok || !p.ok) {
    sh('git reset --hard HEAD~1')
    const why = !t.ok ? 'test suite fails on the committed tree' : 'a P-tier probe regresses on the committed tree'
    const bl = JSON.parse(readFileSync(BACKLOG, 'utf8'))
    const it = bl.find((x) => x.id === id)
    if (it) { it.attempts = (it.attempts ?? 0) + 1; it.auditFailed = why; delete it.status; delete it.sha; writeFileSync(BACKLOG, JSON.stringify(bl, null, 1)) }
    appendFileSync(LEDGER, `\n## ${id} — LANDING REVERTED BY POST-LAND AUDIT\n${stamp}\n\n${why}.\n`)
    console.log(`\nLANDING REVERTED: ${why}. Fix and gate again.\n`)
    logRun('reverted-by-post-land-audit', { reason: why })
    process.exit(1)
  }
}

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
sh('git add -A')
sh(`git -c user.email=a@b -c user.name=kingdom commit -q -m ${JSON.stringify(`bookkeeping for ${id} (${sha})`)}`)
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
