#!/usr/bin/env node
// `wrap` — end the chat in one command. Built 2026-09-06 on the shape of
// the GBH package's tools/wrap.mjs (the GBH package's CARRYOVER.md item 3); hardened 2026-09-07 after
// a wrap wrote every state file and then could not commit.
//
//   node tools/wrap.mjs "<now line>" --next "<which chat, what it does>" "<its first line>"
//
// The Now line: item, epic, what was tried, next. `--next`: the chat that comes
// after this one — a plain-words label naming the folders, the package and what
// that chat will do, and the first line Angela pastes to start it. A wrap
// without --next is refused: a wrap that does not say what chat comes next is
// not a wrap (ruled 2026-09-06; the GBH package's DISPLAY-RULES.md rules 6, 7 and 36).
//
// ── The four hardenings (2026-09-07, Angela: "please fix those four") ────────
// The mount your folders arrive on is slow and REFUSES `unlink`. git is the one
// step that suffers, and yesterday it took the whole machine down twice. The
// old order — write six things, commit last — meant a failed commit left every
// state file claiming a wrap that git had never heard of. A wrap that lies to
// the next chat is worse than a wrap that fails.
//
//   1. PROBE FIRST, ON A CLOCK. Every git call runs under a timeout; a git that
//      does not answer in GIT_PROBE_MS is treated as unavailable, immediately,
//      instead of hanging for three minutes and dying. This is what would have
//      saved 2026-09-06.
//   2. NOTHING CLAIMS TO BE COMMITTED UNTIL IT IS. The state files must be
//      written before the commit — the commit contains them — so the honesty is
//      carried by a flag, not by ordering: everything is written
//      `committed: false`, and only a verified commit rewrites it to true and
//      amends. A crash at any point leaves `committed: false`, which is true.
//      (The add → commit → amend pattern is the gate's own, tools/gate.mjs.)
//   3. VERIFY, NEVER ASSUME. "Committed" means git was asked afterwards and
//      said so — HEAD moved — not that this script reached its last line.
//   4. NEVER MOVE OR DELETE A FILE. The previous handoff is COPIED to archive/
//      and then HANDOFF.md is overwritten in place. `renameSync` is an unlink,
//      and unlink is what this mount refuses.
//
// When git is unavailable the wrap still records — the handoff is the thing you
// most need when the machine is misbehaving — but it records the truth, prints
// the one command that finishes the job, and exits 1. `start engine` shows the
// uncommitted wrap until it is resolved. (Switch `wrap.gitUnavailable` in
// the GBH package's SWITCHES.md; `refuse` is the other path.)
//
// One writer per file: wrap.mjs writes .state/now.json, .state/wraps.json,
// HANDOFF.md and STATE-ROW.md, and nothing else writes them. The backlog, the
// ledger and .state/gauntlet.json stay the gate's alone — a wrap changes no
// item's status.
//
// Then the chat stops.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from './start.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = 'engine'
const TITLE = 'Combat engine'   // the first cell of root STATE.md's workstream table
const NOW_FILE = '.state/now.json'
const WRAPS_FILE = '.state/wraps.json'
const HANDOFF = 'HANDOFF.md'
const ROW = 'STATE-ROW.md'

// A git that has not answered in this long is not going to. Twenty seconds is
// far past a healthy call here (milliseconds) and far short of the three-minute
// ceiling that killed the machine.
const GIT_PROBE_MS = 20_000
const GIT_WORK_MS = 120_000

const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
const fail = (msg) => { console.error(`wrap: ${msg}`); process.exit(1) }

/**
 * git, on a clock, never throwing. Hardening 1: a timeout is not an error to be
 * retried, it is the answer "git cannot work on this mount right now".
 */
function gitTry(args, ms = GIT_WORK_MS) {
  try {
    return { ok: true, out: execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms }).trim() }
  } catch (e) {
    const timedOut = e.killed === true || e.signal === 'SIGTERM' || e.code === 'ETIMEDOUT'
    const msg = String(e.stderr || e.message || '').split('\n')[0]
    return { ok: false, timedOut, why: timedOut ? `no answer in ${ms / 1000}s — the mount is not letting git work` : msg }
  }
}

const argv = process.argv.slice(2)
const nextAt = argv.indexOf('--next')
const nowLine = (nextAt === 0 ? '' : argv[0] ?? '').trim()
const USAGE = '  node tools/wrap.mjs "unit.archer — epic.x. Tried: … Next: …" --next "New chat with Heroes of Blight and Tragic — engine: land unit.brute" "start engine"'
if (!nowLine) fail(`the Now line is empty — say what you were on, its epic, what was tried, and what is next:\n${USAGE}`)

// the next chat: a label in plain words — the folders, the package, and what
// that chat will do — and the first line to paste. Both are the wrapping chat's.
if (nextAt < 0) fail(`no --next — a wrap that does not say what chat comes next is not a wrap. Name the next chat and its first line:\n${USAGE}`)
const next = { label: (argv[nextAt + 1] ?? '').trim(), line: (argv[nextAt + 2] ?? '').trim() }
if (!next.label) fail(`--next needs a label — the next chat in plain words, the folders, the package and what it will do:\n${USAGE}`)
if (!next.line) fail(`--next needs the next chat's first line, after the label — what Angela pastes to start it:\n${USAGE}`)
if (/\n/.test(next.line)) fail('--next takes one line to paste, not several — one block per line')
if (!/^New chat with /.test(next.label)) fail(`the next chat's label starts "New chat with <folders> — <package>: <what it does>" (ruled 2026-09-06), so Angela knows which folders to select before she reads anything else:\n${USAGE}`)

// The full suite runs once per chat, as the four shards, and wrap refuses until
// all four passed on the final tree (Andrew, 2026-09-23, DECISIONS.md "less process
// per feature"). Checked before a byte is written: the wrap's own files change the tree.
{
  let green
  try { execFileSync(process.execPath, [join(HERE, 'gate.mjs'), '--shards-green'], { encoding: 'utf8', stdio: 'pipe' }); green = null }
  catch (e) { green = String(e.stdout || e.message).trim() }
  if (green) fail(`the suite is not green on this tree — ${green}. Run the shards (Cowork: --shard k/8; a terminal: --shard 1/1, the whole suite in one command), then wrap.`)
}

// The fast process (Andrew, 2026-09-30, DECISIONS.md "the fast process; the full process
// kept"): the prior-art and wrong-home flags no longer run per item — they run here, once,
// over the whole tree, before a byte is written. Flags: each prints its one summary line and
// never blocks; the detail is the tool's own output. A run that cannot finish says so.
for (const [name, tool] of [['prior art', 'prior-art.mjs'], ['wrong home', 'wrong-home.mjs']]) {
  let line
  try {
    const out = execFileSync(process.execPath, [join(HERE, tool)], { encoding: 'utf8', stdio: 'pipe', timeout: 60_000 })
    line = out.split('\n').map((l) => l.trim()).find(Boolean) ?? `${name}: no output`
  } catch (e) { line = `${name}: did not finish (${String(e.message ?? e).split('\n')[0].slice(0, 80)})` }
  console.log(`flag  ${line}  — detail: node tools/${tool}`)
}

const at = stamp()

// ── 0. the probe (hardening 1) ──────────────────────────────────────────────
// One cheap read, on the clock, before a single byte is written. Its answer
// decides which of the two endings this wrap has.
const probe = gitTry(['rev-parse', '--short', 'HEAD'], GIT_PROBE_MS)
const gitUp = probe.ok
const sha = gitUp ? probe.out : null
if (!gitUp) console.error(`wrap: git cannot work here — ${probe.why}. Recording anyway, and saying so.`)

// 1. the Now line — written `committed: false` (hardening 2). Only a verified
// commit is allowed to change that, at the very end.
mkdirSync('.state', { recursive: true })
const writeNow = (extra = {}) => writeFileSync(NOW_FILE, JSON.stringify({ now: nowLine, at, sha, by: 'wrap', committed: false, next, ...extra }, null, 1) + '\n')
writeNow()

// 2. the count — and everything else start.mjs renders, now that the Now line is written
const countLine = execFileSync(process.execPath, [join(HERE, 'gate.mjs'), '--count'], { encoding: 'utf8' }).trim().split('\n').pop()
const lines = render()

// 3. the handoff — one file, the previous COPIED to archive/ and this one
// overwritten in place (hardening 4: no rename, no unlink, ever)
if (existsSync(HANDOFF)) {
  const prev = readFileSync(HANDOFF, 'utf8')
  const m = prev.match(/^# .* — handoff (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/m)
  const when = m ? m[1] : statSync(HANDOFF).mtime.toISOString().slice(0, 16).replace('T', ' ')
  mkdirSync('archive', { recursive: true })
  const base = `HANDOFF-${when.replace(' ', '-').replace(':', '')}`
  let dest = join('archive', `${base}.md`)
  for (let i = 2; existsSync(dest); i++) dest = join('archive', `${base}-${i}.md`)
  writeFileSync(dest, prev)   // copy; the original is overwritten below, never unlinked
}
// the handover: one plain-words line naming the chat, then the first line alone
// inside a fenced code block — ``` above and below, nothing else
const handover = [next.label, '```', next.line, '```']
const previous = readWraps()
const since = previous.filter((w) => w.committed !== false).at(-1)?.sha
const log = since ? gitTry(['log', '--format=%h %ad %s', '--date=format:%Y-%m-%d %H:%M', `${since}..HEAD`]) : gitTry(['log', '--format=%h %ad %s', '--date=format:%Y-%m-%d %H:%M', '-20'])
const commits = log.ok ? log.out.split('\n').filter(Boolean) : [`unknown — git log: ${log.why}`]
const handoff = [
  `# ${PACKAGE} — handoff ${at}`, '',
  `*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by \`start ${PACKAGE}\` — not by a chat, directly.*`, '',
  ...lines, '',
  `## The chat's commits${since ? ` since the last committed wrap (${since})` : ' (last 20; no committed wrap on record)'}`, '',
  ...(commits.length ? commits.map((c) => `- ${c}`) : ['- none']), '',
  '## Next chat', '',
  ...handover, '',
].join('\n')
writeFileSync(HANDOFF, handoff)   // overwrite in place

// 4. the STATE row — one table row, the shape root STATE.md's workstream table
// uses (four cells); the GBH package's tools/state-rows.mjs assembles it, run by hand
const get = (prefix) => (lines.find((l) => l.startsWith(prefix)) ?? '').slice(prefix.length).trim()
const cell = (s) => s.replace(/\|/g, '\\|')
const row = `| **${TITLE}** | \`engine/CLAUDE.md\` · \`engine/ENGINE-CONSTITUTION.md\` · \`engine/COMBAT-SEQUENCE.md\` · \`engine/HANDOFF.md\` | ${cell(`**\`${countLine}\`** (${at}), the count written by its own gate. Last landing: ${get('Last landing:').replace(/\. Previous chat ended:.*$/, '')}. Now: ${nowLine}`)} | ${cell(`**Angela:** ${get('Yours:')}. **Queue:** ${get('Queue:')}`)} |\n`
writeFileSync(ROW, row)

// 5. the wrap on record — `committed` is the honest field the next wrap and
// `start` both read
const subject = `wrap: ${nowLine}`.replace(/[`$]/g, '').slice(0, 200)
const writeWraps = (committed, head) => writeFileSync(WRAPS_FILE, JSON.stringify([...previous, { at, sha: head ?? sha, now: nowLine, committed }], null, 1) + '\n')
writeWraps(false)

// ── 6. the commit, then the verification, then the truth ────────────────────
const RECOVER = `git add -A; git commit -m ${JSON.stringify(subject)}`
if (!gitUp) done(false, `git never answered — ${probe.why}`)

const add = gitTry(['add', '-A'])
if (!add.ok) done(false, `git add failed — ${add.why}`)
const commit = gitTry(['commit', '-q', '-m', subject])
// a commit that fails because there was nothing to commit is not a failure
const nothing = !commit.ok && /nothing to commit|no changes added/i.test(commit.why)
if (!commit.ok && !nothing) done(false, `git commit failed — ${commit.why}`)

// hardening 3: ask git, do not assume. HEAD must have moved.
const after = gitTry(['rev-parse', '--short', 'HEAD'], GIT_PROBE_MS)
if (!after.ok) done(false, `committed, but git could not confirm it — ${after.why}`)
if (after.out === sha && !nothing) done(false, `git reported success but HEAD is still ${sha} — the commit did not land`)

// only now may anything say it is committed (hardening 2)
writeNow({ committed: true, sha: after.out })
writeWraps(true, after.out)
const amend = gitTry(['add', '-A'])
if (amend.ok) gitTry(['commit', '-q', '--amend', '--no-edit'])
const head = gitTry(['rev-parse', '--short', 'HEAD'], GIT_PROBE_MS)
done(true, null, head.ok ? head.out : after.out)

/**
 * The one ending, printed the same way whether or not git cooperated. The last
 * thing printed is always the handover, so the chat's reply ends the same way.
 */
function done(committed, why, head) {
  console.log([
    committed
      ? `wrapped ${PACKAGE} at ${at} — commit ${head}, confirmed by git`
      : `RECORDED BUT NOT COMMITTED — ${PACKAGE} at ${at}`,
    `Now: ${nowLine}`,
    countLine,
    `${HANDOFF} replaced; ${ROW} rendered.`,
    committed ? 'Stop here.' : [
      `git did not commit it: ${why}.`,
      `The files are on disk and correct; git does not have them.`,
      `Finish it from the ${PACKAGE} folder on Windows, where git is not on this mount:`,
      `  ${RECOVER}`,
      `Until then \`start ${PACKAGE}\` will say the wrap is uncommitted. Stop here.`,
    ].join('\n'),
    ...handover,
  ].join('\n'))
  process.exit(committed ? 0 : 1)   // never swallow a failure (law 9)
}

/** Every wrap on record. [] when there is none — this is the first. */
function readWraps() {
  if (!existsSync(WRAPS_FILE)) return []
  try {
    const j = JSON.parse(readFileSync(WRAPS_FILE, 'utf8'))
    return Array.isArray(j) ? j : []
  } catch (e) { fail(`${WRAPS_FILE}: ${e.message}`) }
}
