#!/usr/bin/env node
// The ISC instrument — "is the slice done?" — for the thin slice of Heroes of
// Blight and Tragic. THIN-SLICE-IMPLEMENTATION.md §3.
//
// One list, one state, one tool between them:
//   the LIST  is ../THIN-SLICE-IMPLEMENTATION.md — every `### ISC-NNN — title`
//             heading outside a fence, followed by a fenced block carrying
//             State: / Tier: / Truth: / Probe: / Disable: / Source:
//   the STATE is .state/isc.json — reds, closes, accepts, blocks, regressions.
//             Written only by this tool. Never by hand.
//
//   node tools/slice-gate.mjs                     run every P-tier probe; exit 1 on a REGRESSION
//   node tools/slice-gate.mjs --isc 002           run one criterion's probe, report
//   node tools/slice-gate.mjs --isc 002 --red     the probe must FAIL now; record the red
//   node tools/slice-gate.mjs --isc 002 --check-red   exit 0 iff a red is on record for THIS probe
//   node tools/slice-gate.mjs --count             "N of M closed · K probed · J accepted"
//   node tools/slice-gate.mjs --sync              write the header count and every State: line
//   node tools/slice-gate.mjs --accept 031 "..."  Andrew's yes on an H criterion, his words
//   node tools/slice-gate.mjs --block 001 "..."   name the §9 blocker that stops a criterion
//   node tools/slice-gate.mjs --close 002,003 --sha abc1234   (the landing gate calls this)
//
// THE KILL-SWITCH, applied to criteria (§3 check 1). A probe that still passes
// when the feature is deleted is not a probe. So a criterion may only CLOSE when
// this tool has SEEN its probe fail — a red on record, hashed against the probe's
// own files, so a probe edited after its red must be seen red again. Where a block
// carries `Disable:`, the red is re-provable on demand: the probe runs with those
// ids removed from the kingdom's content registries (KINGDOM_DISABLE_IDS, the
// kingdom's copy of the engine's CF_DISABLE_IDS seam) and must fail.
//
// THE COUNT CAN GO DOWN (§2). The no-argument run re-runs every P probe, and a
// CLOSED criterion whose probe fails goes back to OPEN, on the record, and the
// exit code says so. A list that can only grow is decorative.
//
// Tiers are derived, never typed: H if the block says H; P once a red is on
// record (the command exists and has been seen to exit nonzero); S otherwise.
// States are derived too: ACCEPTED > BLOCKED > CLOSED (unless regressed since) >
// OPEN. The doc's State: lines are a rendering of this file's facts.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The criteria documents. One list, two files: THIN-SLICE-IMPLEMENTATION.md (ISC-001…050,
// the slice) and GEAR-IMPLEMENTATION.md (ISC-051…, the gear plan; G0, 2026-09-02). ISC
// numbers are unique across both; each file carries its own header count line, written
// by --sync, over the criteria it holds.
const DOCS = ['../THIN-SLICE-IMPLEMENTATION.md', '../GEAR-IMPLEMENTATION.md'].filter(existsSync)
const DOC = DOCS.join(' + ')
const STATE = '.state/isc.json'

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined }
/** A vitest JSON report the caller already produced — file probes read from it instead of re-running. */
const REPORT = val('--report')

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts })
const tryRun = (cmd, opts = {}) => { try { return { ok: true, out: sh(cmd, opts) } } catch (e) {
  return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') } } }
const shaNow = () => { const r = tryRun('git rev-parse --short HEAD'); return r.ok ? r.out.trim() : 'none' }
const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

// ── the list ────────────────────────────────────────────────────────────────
/** Parse the document: heading outside a fence, then the first fenced block. */
function readList() {
  const iscs = new Map()
  for (const doc of DOCS) readDoc(doc, iscs)
  if (iscs.size === 0) throw new Error(`no ISC blocks found in ${DOC}`)
  return iscs
}
function readDoc(doc, iscs) {
  const text = readFileSync(doc, 'utf8')
  const lines = text.split('\n')
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    const m = line.match(/^### ISC-(\d{3}) — (.+)$/)
    if (!m) continue
    const n = m[1]
    if (iscs.has(n)) throw new Error(`ISC-${n} appears twice (${iscs.get(n).doc} and ${doc} line ${i + 1})`)
    // the block: skip blank lines, expect a fence
    let j = i + 1
    while (j < lines.length && lines[j].trim() === '') j++
    if (!/^```/.test(lines[j] ?? '')) throw new Error(`ISC-${n}: no fenced block after the heading (line ${i + 1})`)
    const start = j + 1
    let k = start
    while (k < lines.length && !/^```/.test(lines[k])) k++
    const block = lines.slice(start, k)
    const field = (name) => {
      const idx = block.findIndex((l) => l.startsWith(name + ':'))
      if (idx < 0) return undefined
      let v = block[idx].slice(name.length + 1).trim()
      for (let q = idx + 1; q < block.length && /^\s+\S/.test(block[q]); q++) v += ' ' + block[q].trim()
      return v
    }
    const stateLine = block.findIndex((l) => l.startsWith('State:'))
    if (stateLine < 0) throw new Error(`ISC-${n}: block has no State: line`)
    const tierDoc = (block[stateLine].match(/Tier:\s*([PSH])/) ?? [])[1]
    const probe = field('Probe')
    const source = field('Source')
    if (!probe) throw new Error(`ISC-${n}: no Probe: line — a criterion without a probe is a task list entry`)
    if (!source) throw new Error(`ISC-${n}: no Source: line — Law 12, every line names its cause`)
    iscs.set(n, {
      n, title: m[2].trim(), tierDoc, truth: field('Truth') ?? '', probe, source,
      disable: (field('Disable') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      headingLine: i, stateLine: start + stateLine, doc,
    })
    i = k
  }
}

// ── the state ───────────────────────────────────────────────────────────────
function readState() {
  try { return JSON.parse(readFileSync(STATE, 'utf8')) } catch { return {} }
}
function writeState(s) {
  mkdirSync('.state', { recursive: true })
  writeFileSync(STATE, JSON.stringify(s, null, 1) + '\n')
}

/** What a probe is made of: the command, plus every path in it that exists. */
function probeHash(isc) {
  const h = createHash('sha256').update(isc.probe)
  for (const p of probePaths(isc)) h.update('\0' + p + '\0' + readFileSync(p, 'utf8'))
  return h.digest('hex').slice(0, 12)
}
function probePaths(isc) {
  return isc.probe.split(/\s+/).filter((t) => /^[\w./-]+\.(ts|mts|mjs|js|json)$/.test(t) && existsSync(t))
}
function probeMissing(isc) {
  return isc.probe.split(/\s+/).filter((t) => /^[\w./-]+\.(ts|mts|mjs|js|json)$/.test(t) && !existsSync(t))
}

function tierOf(isc, st) {
  if (isc.tierDoc === 'H') return 'H'
  return st?.red ? 'P' : 'S'
}
function stateOf(isc, st) {
  if (!st) return 'OPEN'
  if (st.accepted) return 'ACCEPTED'
  if (st.blocked) return 'BLOCKED'
  if (st.closed && !(st.regressed?.length && st.regressed[st.regressed.length - 1].at > st.closed.at)) return 'CLOSED'
  return 'OPEN'
}

function runProbe(isc, { disabled = false } = {}) {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
  if (disabled) env.KINGDOM_DISABLE_IDS = isc.disable.join(',')
  const r = tryRun(isc.probe, { env, timeout: 10 * 60 * 1000 })
  // eslint-disable-next-line no-control-regex
  const plain = r.out.replace(/\x1b\[[0-9;]*m/g, '')
  return { ok: r.ok, tail: plain.trim().split('\n').filter((l) => l.trim() && !/^[⎯\s]+(\[\d+\/\d+\])?[⎯\s]*$/.test(l)).slice(-3).join(' | ').slice(0, 300) }
}

/**
 * Many probes in one go. Every `npm test -- test/x.test.ts` probe is one
 * vitest file, and vitest can run them all in ONE process with a per-file
 * verdict (the JSON reporter) — a minute of spawns becomes ten seconds, which
 * is what lets a landing fit the sandbox's ~3-minute tool-call cap
 * (2026-09-01). Probes of any other shape run one at a time as before.
 * Verdicts stay per criterion; only the spawning is shared.
 */
const VITEST_PROBE = /^npm test -- (test\/[\w./-]+\.test\.ts)$/
function runProbes(iscs, { disabled = false } = {}) {
  const results = new Map()
  const batch = iscs.filter((i) => VITEST_PROBE.test(i.probe) && !(disabled && i.disable.length))
  for (const isc of iscs.filter((i) => !batch.includes(i))) results.set(isc.n, runProbe(isc, { disabled }))
  if (batch.length) {
    let report = null
    if (REPORT) {
      // --report <vitest json>: the gate already ran the whole suite with the
      // JSON reporter; the file probes' verdicts are in it, so read rather than
      // re-run. The verdict per criterion is unchanged — only the spawn is saved.
      try { report = JSON.parse(readFileSync(REPORT, 'utf8')) } catch (e) { throw new Error(`--report ${REPORT}: ${e.message}`) }
    } else {
      const files = batch.map((i) => i.probe.match(VITEST_PROBE)[1])
      const out = join(tmpdir(), `slice-probes-${process.pid}.json`)
      const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
      tryRun(`npm test -s -- ${files.join(' ')} --reporter=json --outputFile=${JSON.stringify(out)}`, { env, timeout: 10 * 60 * 1000 })
      try { report = JSON.parse(readFileSync(out, 'utf8')); unlinkSync(out) } catch { /* no report: every batched probe is a failure below */ }
    }
    for (const isc of batch) {
      const file = isc.probe.match(VITEST_PROBE)[1]
      const tr = report?.testResults?.find((t) => String(t.name).replace(/\\/g, '/').endsWith(file))
      if (!tr) { results.set(isc.n, { ok: false, tail: report ? `vitest produced no verdict for ${file}` : 'vitest produced no report' }); continue }
      const failed = (tr.assertionResults ?? []).filter((a) => a.status === 'failed')
      const tail = failed.length
        ? failed.slice(0, 2).map((a) => `${a.title}: ${String(a.failureMessages?.[0] ?? '').split('\n')[0]}`).join(' | ').slice(0, 300)
        : tr.status === 'passed' ? '' : String(tr.message ?? '').split('\n')[0].slice(0, 300)
      results.set(isc.n, { ok: tr.status === 'passed', tail })
    }
  }
  return results
}

// ── count and sync ──────────────────────────────────────────────────────────
function count(list = readList(), state = readState()) {
  let closed = 0, probed = 0, accepted = 0
  for (const isc of list.values()) {
    const st = state[isc.n]
    const s = stateOf(isc, st)
    if (s === 'CLOSED') closed++
    if (s === 'ACCEPTED') accepted++
    if (tierOf(isc, st) === 'P') probed++
  }
  return { closed, probed, accepted, total: list.size, line: `${closed} of ${list.size} closed · ${probed} probed · ${accepted} accepted` }
}

function sync() {
  const list = readList()
  const state = readState()
  for (const doc of DOCS) {
    const own = new Map([...list].filter(([, isc]) => isc.doc === doc))
    const text = readFileSync(doc, 'utf8')
    const lines = text.split('\n')
    const c = count(own, state)
    const headerAt = lines.findIndex((l) => /^\*\*`\d+ of \d+ closed · \d+ probed · \d+ accepted`\*\*/.test(l))
    if (headerAt < 0) throw new Error(`${doc}: no header count line to rewrite — add a line of the form **\`0 of 0 closed · 0 probed · 0 accepted\`**`)
    lines[headerAt] = lines[headerAt].replace(/`\d+ of \d+ closed · \d+ probed · \d+ accepted`/, '`' + c.line + '`')
    for (const isc of own.values()) {
      const st = state[isc.n]
      lines[isc.stateLine] = `State:  ${stateOf(isc, st).padEnd(8)} Tier: ${tierOf(isc, st)}`
    }
    const out = lines.join('\n')
    if (out !== text) { writeFileSync(doc, out); console.log(`synced ${doc}: ${c.line}`) }
    else console.log(`${doc} already in sync: ${c.line}`)
  }
}

// ── modes ───────────────────────────────────────────────────────────────────
function need(n) {
  const list = readList()
  const isc = list.get(n)
  if (!isc) { console.error(`no ISC-${n} in ${DOC}`); process.exit(2) }
  return { list, isc, state: readState() }
}

if (has('--count')) { console.log(count().line); process.exit(0) }
if (has('--sync')) { sync(); process.exit(0) }

if (has('--accept')) {
  const n = val('--accept'); const words = argv[argv.indexOf('--accept') + 2]
  const { isc, state } = need(n)
  if (isc.tierDoc !== 'H') { console.error(`ISC-${n} is not H-tier — it closes by probe, not by a person`); process.exit(1) }
  if (!words || words.length < 10) { console.error('record Andrew\'s words, verbatim — at least ten characters'); process.exit(1) }
  state[n] = { ...(state[n] ?? {}), accepted: { at: stamp(), sha: shaNow(), words } }
  writeState(state); sync(); process.exit(0)
}
if (has('--block')) {
  const n = val('--block'); const why = argv[argv.indexOf('--block') + 2]
  const { state } = need(n)
  if (!why || why.length < 10) { console.error('name the §9 blocker — at least ten characters'); process.exit(1) }
  state[n] = { ...(state[n] ?? {}), blocked: { at: stamp(), why } }
  writeState(state); sync(); process.exit(0)
}
if (has('--unblock')) {
  const n = val('--unblock'); const { state } = need(n)
  if (state[n]) delete state[n].blocked
  writeState(state); sync(); process.exit(0)
}

if (has('--close')) {
  // Called by gate.mjs at landing. Every listed criterion must have a red on
  // record for exactly this probe, and its probe must pass now.
  const ns = (val('--close') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const sha = val('--sha') ?? shaNow()
  const list = readList(); const state = readState()
  let ok = true
  const runnable = ns.map((n) => list.get(n)).filter((i) => i && i.tierDoc !== 'H')
  const verdicts = runProbes(runnable)
  for (const n of ns) {
    const isc = list.get(n)
    if (!isc) { console.error(`no ISC-${n}`); ok = false; continue }
    const st = state[n] ?? {}
    if (isc.tierDoc === 'H') {
      // An H criterion is not closed by a landing. The landing makes it
      // checkable; Andrew's --accept is what moves it, in his words.
      state[n] = { ...st, landed: { at: stamp(), sha } }
      console.log(`ISC-${n}: H-tier — landed at ${sha}, awaits --accept ${n} "<Andrew's words>"`)
      continue
    }
    if (!st.red) { console.error(`ISC-${n}: never seen red — run --isc ${n} --red before the feature exists`); ok = false; continue }
    if (st.red.hash !== probeHash(isc)) { console.error(`ISC-${n}: probe edited since its red (${st.red.hash} → ${probeHash(isc)}) — see it red again`); ok = false; continue }
    const r = verdicts.get(n)
    if (!r.ok) { console.error(`ISC-${n}: probe FAILS — ${r.tail}`); ok = false; continue }
    state[n] = { ...st, closed: { at: stamp(), sha } }
    console.log(`ISC-${n}: CLOSED at ${sha}`)
  }
  writeState(state)
  if (ok) sync()
  process.exit(ok ? 0 : 1)
}

if (has('--isc') && val('--isc').includes(',') && !has('--red') && !has('--check-red')) {
  // several criteria at once — one vitest process for all the file probes
  const ns = val('--isc').split(',').map((s) => s.trim()).filter(Boolean)
  const list = readList(); const state = readState()
  const iscs = ns.map((n) => { const i = list.get(n); if (!i) { console.error(`no ISC-${n}`); process.exit(2) } return i })
  const missing = iscs.flatMap((i) => probeMissing(i).map((m) => `ISC-${i.n}: ${m}`))
  if (missing.length) { console.log(`probes name files that do not exist yet — ${missing.join(', ')}`); process.exit(1) }
  const verdicts = runProbes(iscs.filter((i) => i.tierDoc !== 'H'))
  let ok = true
  for (const isc of iscs) {
    if (isc.tierDoc === 'H') { console.log(`ISC-${isc.n} — H-tier, ${stateOf(isc, state[isc.n])}: a person checks`); continue }
    const r = verdicts.get(isc.n)
    if (!r.ok) ok = false
    console.log(`ISC-${isc.n} — ${isc.title}: ${r.ok ? 'PASSES' : 'FAILS'}${r.tail ? ' — ' + r.tail : ''}`)
  }
  process.exit(ok ? 0 : 1)
}

if (has('--isc')) {
  const n = val('--isc')
  const { isc, state } = need(n)
  const st = state[n] ?? {}
  if (isc.tierDoc === 'H') {
    if (has('--red')) { console.log(`ISC-${n} is H-tier — a person sees it red or green; there is no probe to record`); process.exit(1) }
    console.log(`ISC-${n} is H-tier: ${isc.probe}\n  ${stateOf(isc, st)} — closes to ACCEPTED with --accept ${n} "<Andrew's words>"${has('--check-red') ? '\n  (no red demanded of an H criterion)' : ''}`)
    process.exit(0)
  }
  const missing = probeMissing(isc)
  if (missing.length) {
    console.log(`ISC-${n}: the probe names files that do not exist yet — ${missing.join(', ')}\n  ${isc.probe}\n  Write the probe first. A red against a missing file proves nothing.`)
    process.exit(1)
  }
  if (has('--check-red')) {
    if (!st.red) { console.log(`ISC-${n}: no red on record`); process.exit(1) }
    if (st.red.hash !== probeHash(isc)) { console.log(`ISC-${n}: probe edited since its red (${st.red.hash} → ${probeHash(isc)}) — see it red again`); process.exit(1) }
    if (isc.disable.length) {
      const r = runProbe(isc, { disabled: true })
      if (r.ok) { console.log(`ISC-${n}: TAUTOLOGICAL — the probe PASSES with ${isc.disable.join(',')} disabled`); process.exit(1) }
      console.log(`ISC-${n}: red on record (${st.red.at} @ ${st.red.sha}) and re-proven — fails without ${isc.disable.join(',')}`)
    } else {
      console.log(`ISC-${n}: red on record (${st.red.at} @ ${st.red.sha}, probe ${st.red.hash})`)
    }
    process.exit(0)
  }
  if (has('--red')) {
    const r = runProbe(isc, { disabled: isc.disable.length > 0 })
    if (r.ok) {
      console.log(`ISC-${n}: the probe PASSES${isc.disable.length ? ` with ${isc.disable.join(',')} disabled` : ''} — that is not a red.\n  ${isc.probe}\n  A red must be seen before the feature exists (or with its content disabled). If the feature is already there, stash it: git stash push -- src`)
      process.exit(1)
    }
    state[n] = { ...st, red: { at: stamp(), sha: shaNow(), hash: probeHash(isc), how: isc.disable.length ? `disabled ${isc.disable.join(',')}` : 'feature absent', tail: r.tail } }
    writeState(state); sync()
    console.log(`ISC-${n}: RED recorded — ${r.tail}\n  tier is now P. Implement, then land the item that claims it.`)
    process.exit(0)
  }
  const r = runProbe(isc)
  console.log(`ISC-${n} — ${isc.title}\n  ${stateOf(isc, st)} · tier ${tierOf(isc, st)} · probe ${r.ok ? 'PASSES' : 'FAILS'}${r.tail ? ' — ' + r.tail : ''}`)
  process.exit(r.ok ? 0 : 1)
}

// ── default: every P-tier probe, regressions on the record ──────────────────
{
  const list = readList(); const state = readState()
  let regressed = 0, ran = 0, green = 0
  console.log(`\nslice-gate — every P-tier probe\n`)
  const ps = [...list.values()].filter((isc) => tierOf(isc, state[isc.n]) === 'P')
  const verdicts = runProbes(ps)
  for (const isc of ps) {
    const st = state[isc.n]
    ran++
    const before = stateOf(isc, st)
    const r = verdicts.get(isc.n)
    if (r.ok) green++
    let note = ''
    if (before === 'CLOSED' && !r.ok) {
      regressed++
      state[isc.n] = { ...st, regressed: [...(st.regressed ?? []), { at: stamp(), sha: shaNow(), tail: r.tail }] }
      note = 'REGRESSED — reopened'
    } else if (before === 'OPEN' && r.ok) note = 'green but not landed — the item that claims it has not been through the gate'
    else if (before === 'OPEN') note = 'red (unbuilt)'
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ISC-${isc.n}  ${isc.title}${note ? '  — ' + note : ''}`)
  }
  if (regressed) writeState(state)
  sync()
  console.log(`\n${ran} P-tier probe(s): ${green} green, ${ran - green} red, ${regressed} regression(s). ${count(list, readState()).line}\n`)
  process.exit(regressed ? 1 : 0)
}
