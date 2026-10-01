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
//   4. NEVER MOVE OR DELETE A FILE. Every file is overwritten in place.
//      `renameSync` is an unlink, and unlink is what this mount refuses.
//
// When git is unavailable the wrap still records — the handoff is the thing you
// most need when the machine is misbehaving — but it records the truth, prints
// the one command that finishes the job, and exits 1. `start engine` shows the
// uncommitted wrap until it is resolved. (Switch `wrap.gitUnavailable` in
// the GBH package's SWITCHES.md; `refuse` is the other path.)
//
// One file (Andrew, 2026-10-01): wrap.mjs writes .state/now.json and nothing
// else — the Now line, the next chat, the count, what start.mjs printed and the
// chat's commits. HANDOFF.md and STATE-ROW.md are produced from it by
// tools/handoff.mjs; the previous handoff and the wrap history are git's
// (`git log -- .state/now.json`), not archive/ and not a wraps file. The backlog, the
// ledger and .state/gauntlet.json stay the gate's alone — a wrap changes no
// item's status.
//
// Then the chat stops.

import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from './start.mjs'
import { produce, NOW_FILE } from './handoff.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = 'engine'

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

// 1. the chat's commits since the last wrap — git's record, not a wraps file
const since = gitUp ? gitTry(['log', '-1', '--grep=^wrap:', '--format=%h']).out || null : null
const log = !gitUp ? { ok: false, why: probe.why } : since ? gitTry(['log', '--format=%h %ad %s', '--date=format:%Y-%m-%d %H:%M', `${since}..HEAD`]) : gitTry(['log', '--format=%h %ad %s', '--date=format:%Y-%m-%d %H:%M', '-20'])
const commits = log.ok ? log.out.split('\n').filter(Boolean) : [`unknown — git log: ${log.why}`]

// 2. now.json — written `committed: false` (hardening 2); only a verified commit
// may change that, at the very end. The Now line goes in first so the count and
// start.mjs's lines read it; then they go in too, and the handoff is produced.
mkdirSync('.state', { recursive: true })
let now = { now: nowLine, at, sha, by: 'wrap', committed: false, next }
const writeNow = (extra = {}) => { now = { ...now, ...extra }; writeFileSync(NOW_FILE, JSON.stringify(now, null, 1) + '\n'); produce() }
writeFileSync(NOW_FILE, JSON.stringify(now, null, 1) + '\n')
const countLine = execFileSync(process.execPath, [join(HERE, 'gate.mjs'), '--count'], { encoding: 'utf8' }).trim().split('\n').pop()
writeNow({ count: countLine, lines: render({ wrapping: true }), since, commits })

// the handover: one plain-words line naming the chat, then the first line alone
// inside a fenced code block — ``` above and below, nothing else
const handover = [next.label, '```', next.line, '```']
const subject = `wrap: ${nowLine}`.replace(/[`$]/g, '').slice(0, 200)

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

// only now may anything say it is committed (hardening 2). `sha` stays the HEAD
// the chat ended on: the amend below would orphan the wrap commit's own sha.
writeNow({ committed: true })
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
    `${NOW_FILE} written; HANDOFF.md and STATE-ROW.md produced from it.`,
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
