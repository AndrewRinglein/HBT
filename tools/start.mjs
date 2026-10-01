#!/usr/bin/env node
// `start engine` — where the package is, rendered. Built 2026-09-06 on the shape
// of the GBH package's tools/start.mjs (the GBH package's CARRYOVER.md item 3).
//
// A new chat knows nothing except what is auto-loaded and what a tool prints.
// This is the tool. It composes nothing from memory and counts nothing itself:
// the count is `gate.mjs --count`'s line verbatim, the Now line is the one the
// last wrap wrote to .state/now.json, the last landing is the gauntlet log's
// own record, the queue is next.mjs's readiness rule over .state/backlog.json,
// the Delegate line is that queue with where each item stands, the Calls lines
// are the switches recorded since the last wrap, and the stack is CLAUDE.md's
// Stack table for the top item.
//
//   node tools/start.mjs            print the lines, in order
//
// Rules: a missing Now line prints "none — last chat ended without wrap" —
// information, never a guess, never a prior value. A missing file is unknown,
// never zero and never yesterday. An empty queue prints "empty": that chat is
// planning, not landing. Runs in the package folder; every path is relative to
// cwd, like the gate.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = 'engine'
const BACKLOG = '.state/backlog.json'
const RUNLOG = '.state/gauntlet-log.jsonl'
const QUESTIONS = '.state/questions.md'
const NOW_FILE = '.state/now.json'
const SWITCHES_FILE = 'SWITCHES.md'

/** wrapping: the lines a wrap stores in now.json — without the uncommitted-wrap warning, which describes the wrap before this one */
export function render({ wrapping = false } = {}) {
  const backlog = readBacklog()
  const landedIds = new Set(backlog.filter((x) => String(x.status ?? '').startsWith('done')).map((x) => x.id))
  // the queue is next.mjs's rule, not a second one: no status, every `needs` landed
  const pending = backlog.filter((x) => !x.status)
  const queue = pending.filter((x) => (x.needs ?? []).every((n) => landedIds.has(n)))
  const item = (x) => `${x.id} [${x.kind} · ${x.shape}]`

  // 1. the package and where it is, with the gate's count line verbatim
  const countLine = execFileSync(process.execPath, [join(HERE, 'gate.mjs'), '--count'], { encoding: 'utf8' }).trim().split('\n').pop()
  const where = queue.length ? `next ${queue[0].id}`
    : pending.length ? `queue blocked — ${pending.length} pending, every one waiting on another`
      : 'backlog complete'
  const lines = [`${PACKAGE} — ${where}, ${countLine}`]

  // 2. the Now line, from the last wrap — never a guess
  const now = readNow()
  lines.push(now ? `Now: ${now.now}` : 'Now: none — last chat ended without wrap')
  // 2b. the next chat the wrap named: its label, then the first line to paste
  if (now?.next?.label && now?.next?.line) lines.push(now.next.label, `  ${now.next.line}`)

  // 3. the last landing, and how the previous chat ended — the gauntlet log is
  // the gate's own record of what landed and when; the backlog holds no date
  const last = lastLanding()
  const ended = !now ? 'WITHOUT WRAP'
    : now.by === 'wrap' ? `on a wrap, ${now.at}`
      : `unknown — ${NOW_FILE} says by: ${JSON.stringify(now.by)}`
  lines.push(`Last landing: ${last === null ? `unknown — ${RUNLOG}` : last ? `${last.at} (${last.id})` : 'none'}. Previous chat ended: ${ended}`)
  // 3b. an uncommitted wrap, said out loud (2026-09-07). wrap.mjs writes
  // `committed: false` and only a VERIFIED commit rewrites it to true, so a
  // false here means exactly one thing: those files are on disk and git has
  // never seen them. Resolve it before landing anything on top.
  if (now && now.committed === false && !wrapping) {
    lines.push(`WRAP NOT COMMITTED: ${now.at} — ${NOW_FILE} and the HANDOFF.md and STATE-ROW.md produced from it are on disk; git does not have them.`,
      `  Commit them from the ${PACKAGE} folder before landing anything: git add -A; git commit -m "wrap: ${now.now}"`)
  }

  // 4. what is Angela's — the flagged landings only she can clear, and the OPEN
  // questions in the Game Builder's inbox. Each carries what she looks at
  // (DISPLAY-RULES.md rule 24: the thing itself, never a document about it).
  // The flagged-landing review queue is no longer printed here (Andrew,
  // 2026-09-22, DECISIONS.md): `node tools/report.mjs` shows it when wanted.
  const yours = []
  const questions = readOpenQuestions()
  if (questions === null) yours.push(`open questions: unknown — ${QUESTIONS}`)
  else for (const q of questions) yours.push(`${q} — look: GAME-BUILDER.html`)
  lines.push(`Yours: ${yours.length ? yours.join('; ') : 'nothing'}`)

  // 5. the queue — the items a chat can land, in backlog order
  lines.push(queue.length
    ? `Queue: ${item(queue[0])}${queue.slice(1, 3).map((x) => `, then ${item(x)}`).join('')}${queue.length > 3 ? ` (+${queue.length - 3} more)` : ''}`
    : 'Queue: empty')

  // 5b. who owns what — Delegate: every ready item a subagent may take, i.e. the
  // queue in full, each with where it stands in the gate's own words. What only
  // Angela can decide is on the Yours line; an item is on exactly one of the two.
  const delegate = queue.map((x) => {
    const tried = x.attempts ? `${x.attempts} attempt(s)${x.reason ? ` — ${x.reason}` : ''}` : 'not yet gated'
    return `${item(x)} — ${tried}${x.auditFailed ? `; post-land audit reverted it: ${x.auditFailed}` : ''}`
  })
  lines.push(`Delegate: ${delegate.length ? delegate.join('; ') : 'none'}`)
  // 5c. and what is blocked, so a chat does not go looking for it
  const blocked = pending.filter((x) => !queue.includes(x))
  if (blocked.length) lines.push(`Blocked: ${blocked.map((x) => `${x.id} needs ${(x.needs ?? []).filter((n) => !landedIds.has(n)).join(', ')}`).join('; ')}`)

  // 5d. the calls subagents made — every SWITCHES.md row carrying a date on or
  // after the last wrap's. A subagent picks a default and records the switch
  // (DISPLAY-RULES.md rule 31); this is the chat's review queue. Oldest first.
  // A missing file is unknown, never none.
  const calls = readCalls()
  if (calls === null) lines.push(`Calls since last wrap: unknown — ${SWITCHES_FILE}`)
  else {
    const since = now?.by === 'wrap' ? String(now.at).slice(0, 10) : null
    const due = calls.filter((c) => !since || c.date >= since).sort((a, b) => a.date.localeCompare(b.date))
    if (!due.length) lines.push('Calls since last wrap: none')
    else lines.push('Calls since last wrap:', ...due.map((c) => `  ${c.switch} · ${c.date} · ${c.question}`))
  }

  // 6. the stack for the top item, from CLAUDE.md's Stack table
  if (queue.length) {
    const top = queue[0]
    const stack = readStack()
    if (stack === null) lines.push(`Stack for ${top.id}: unknown — no Stack section in CLAUDE.md`)
    else {
      const rows = stack.filter(([which]) => which.split(/[,\s]+/).some((t) => t === 'any' || t === top.kind || t === top.shape || t === top.id))
      lines.push(`Stack for ${top.id}:`, ...rows.map(([, files]) => `  ${files}`))
    }
  }
  return lines
}

function readBacklog() {
  if (!existsSync(BACKLOG)) throw new Error(`${BACKLOG}: not here — run from the engine folder`)
  return JSON.parse(readFileSync(BACKLOG, 'utf8'))
}

function readNow() {
  if (!existsSync(NOW_FILE)) return null
  let j
  try { j = JSON.parse(readFileSync(NOW_FILE, 'utf8')) } catch (e) { throw new Error(`${NOW_FILE}: ${e.message}`) }
  if (typeof j.now !== 'string' || !j.now.trim()) throw new Error(`${NOW_FILE}: no "now" line in it`)
  return j
}

/**
 * The last landing the gate recorded: the final `disposition: "landed"` line of
 * the run log. null when there is no run log (unknown); false when the log holds
 * no landing at all (none).
 */
function lastLanding() {
  if (!existsSync(RUNLOG)) return null
  let found = false
  for (const line of readFileSync(RUNLOG, 'utf8').split('\n')) {
    if (!line.includes('"disposition":"landed"')) continue
    try {
      const j = JSON.parse(line)
      if (j.disposition === 'landed') found = { at: String(j.at).slice(0, 16).replace('T', ' '), id: j.id }
    } catch { /* a torn line is not a landing */ }
  }
  return found
}

/** The bold titles under `## OPEN` in the questions inbox; null when there is no inbox. */
function readOpenQuestions() {
  if (!existsSync(QUESTIONS)) return null
  const lines = readFileSync(QUESTIONS, 'utf8').split('\n')
  const at = lines.findIndex((l) => /^## OPEN\b/.test(l))
  if (at < 0) return []
  const out = []
  for (let i = at + 1; i < lines.length && !/^## /.test(lines[i]); i++) {
    const m = lines[i].match(/^-\s*(\((\d{4}-\d{2}-\d{2})\)\s*)?\*\*(.+?)\*\*/)
    if (m) out.push(`${m[2] ? `(${m[2]}) ` : ''}${m[3]}`)
  }
  return out
}

/**
 * The switches recorded in SWITCHES.md: every table row carrying a YYYY-MM-DD,
 * in table order. The columns are matched by name, case-insensitively, so the
 * table can be widened without touching this. null when there is no SWITCHES.md.
 */
function readCalls() {
  if (!existsSync(SWITCHES_FILE)) return null
  const rows = readFileSync(SWITCHES_FILE, 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l.startsWith('|') && l.endsWith('|'))
    .map((l) => l.slice(1, -1).split('|').map((c) => c.trim()))
  const lower = (r) => r.map((c) => c.toLowerCase())
  const header = rows.find((r) => lower(r).includes('switch') && lower(r).includes('question'))
  if (!header) return []
  const col = { switch: lower(header).indexOf('switch'), question: lower(header).indexOf('question') }
  const calls = []
  for (const r of rows) {
    if (r === header || r.every((c) => /^:?-+:?$/.test(c))) continue
    const date = r.join(' ').match(/\b(\d{4}-\d{2}-\d{2})\b/)
    if (!date) continue
    calls.push({
      switch: (r[col.switch] ?? '').replace(/[`~]/g, ''),
      date: date[1],
      question: (r[col.question] ?? '').replace(/[`~]/g, ''),
    })
  }
  return calls
}

/** The `## Stack` table of CLAUDE.md → [[which, files], …]; null when there is no such section. */
function readStack() {
  if (!existsSync('CLAUDE.md')) return null
  const lines = readFileSync('CLAUDE.md', 'utf8').split('\n')
  const at = lines.findIndex((l) => /^## Stack\b/.test(l))
  if (at < 0) return null
  const rows = []
  for (let i = at + 1; i < lines.length && !/^## /.test(lines[i]); i++) {
    const m = lines[i].match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/)
    if (!m || /^-+$/.test(m[1]) || m[1] === 'Item') continue
    rows.push([m[1].replace(/`/g, ''), m[2]])
  }
  return rows
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(render().join('\n'))
}
