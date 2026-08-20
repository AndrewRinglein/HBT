#!/usr/bin/env node
// node tools/game-builder.mjs [--quiet]
//
// THE GAME BUILDER. Reads the gauntlet run log, the backlog, and the questions
// inbox; writes GAME-BUILDER.html at the repo root — self-contained, no server,
// double-click it. The gate rebuilds it after every run, so it is always current.
//
// Data sources (all read-only here):
//   .state/gauntlet-log.jsonl   one line per gate invocation (the gate writes it)
//   .state/backlog.json         item status, seals, specs
//   .state/questions.md         the human inbox — OPEN and ANSWERED

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const quiet = process.argv.includes('--quiet')
const read = (p, fallback = '') => (existsSync(p) ? readFileSync(p, 'utf8') : fallback)

const runs = read('.state/gauntlet-log.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const backlog = JSON.parse(read('.state/backlog.json', '[]'))
const questionsMd = read('.state/questions.md')

// ── aggregates ───────────────────────────────────────────────────────────────
const landed = backlog.filter((b) => String(b.status ?? '').startsWith('done'))
const flagged = backlog.filter((b) => b.status === 'done-needs-review')
const sealed = backlog.filter((b) => b.gauntlet === 'passed')
const open = backlog.filter((b) => !b.status)
const abandoned = backlog.filter((b) => b.status === 'failed' || b.status === 'reverted')

// FAIL counts per check name — "where we are failing" is the improvement signal
const failCounts = {}
for (const r of runs) { if (r.type === 'batch-end') continue
  for (const c of r.checks ?? []) {
  if (!c.ok) failCounts[c.name] = (failCounts[c.name] ?? 0) + 1
} }
const failRows = Object.entries(failCounts).sort((a, b) => b[1] - a[1])

// ── batches ──────────────────────────────────────────────────────────────────
// A batch is a working session: consecutive runs with < 3h between them. Old
// batches collapse to one summary bar — "4 landed, 1 sealed" — with the detail
// inside; the newest batch renders open on top. The Approve button marks a batch
// read (a per-viewer localStorage convenience — the durable review state stays
// in the backlog's done-needs-review flags).
// Boundaries are DATA, never a time guess: audit-all appends a batch-end marker
// to the log at every batch end, and bars split exactly there. (A 3h-gap
// heuristic once swallowed a new session inside an already-approved bar.) Ids
// are sequential and stable — the log only appends, so batch-3 is batch-3
// forever, and an approval can never absorb future runs.
const batches = [{ id: 'batch-1', runs: [], closed: false }]
for (const r of runs) {
  if (r.type === 'batch-end') {
    batches[batches.length - 1].closed = true
    if (r.label) batches[batches.length - 1].label = r.label
    // Artifacts ride the marker: things this batch produced that a human WATCHES,
    // not reads — a replay, an mp4. Hrefs are relative to the shipped page's home
    // (the project root, where replay.html lives), not the engine folder.
    if (r.artifacts) batches[batches.length - 1].artifacts = r.artifacts
    batches.push({ id: `batch-${batches.length + 1}`, runs: [], closed: false })
    continue
  }
  batches[batches.length - 1].runs.push(r)
}
while (batches.length && batches[batches.length - 1].runs.length === 0) batches.pop()
batches.reverse() // newest first

function groupByItem(rs) {
  const byItem = new Map()
  for (const r of rs) {
    if (!byItem.has(r.id)) byItem.set(r.id, [])
    byItem.get(r.id).push(r)
  }
  return [...byItem.entries()].sort((a, b) =>
    (b[1][b[1].length - 1].at ?? '').localeCompare(a[1][a[1].length - 1].at ?? ''))
}

// questions: split OPEN / ANSWERED sections of the md
function section(md, header) {
  const i = md.indexOf(`## ${header}`)
  if (i < 0) return []
  const rest = md.slice(i + header.length + 3)
  const end = rest.indexOf('\n## ')
  return (end < 0 ? rest : rest.slice(0, end)).split('\n')
    .map((l) => l.replace(/^- /, '').trim()).filter((l) => l && !l.startsWith('#'))
}
const qOpen = section(questionsMd, 'OPEN')
const qDone = section(questionsMd, 'ANSWERED')

const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── the page ─────────────────────────────────────────────────────────────────
// Colors follow the dataviz reference palette: status roles (icon + label,
// never color alone), single-hue sequential blue for the one magnitude chart.
const maxFail = Math.max(1, ...failRows.map(([, n]) => n))
const barW = 420

const failChartRows = failRows.map(([name, n]) => `
  <div class="frow" data-tip="${esc(name)}: ${n} FAIL${n === 1 ? '' : 'S'} across all runs">
    <div class="fname">${esc(name)}</div>
    <div class="ftrack"><div class="fbar" style="width:${Math.max(8, Math.round((n / maxFail) * barW))}px"></div>
    <span class="fval">${n}</span></div>
  </div>`).join('')

const failTable = failRows.map(([name, n]) => `<tr><td>${esc(name)}</td><td>${n}</td></tr>`).join('')

const dispBadge = (r) => {
  if (r.disposition === 'landed') return r.seal === 'passed'
    ? `<span class="b b-seal">⛓ LANDED · SEAL PASSED</span>`
    : `<span class="b b-good">✓ LANDED</span> <span class="b b-warn">⚑ seal withheld: ${esc(r.seal)}</span>`
  if (r.disposition === 'failed-checks') return `<span class="b b-crit">✗ NOT READY</span>`
  if (r.disposition === 'abandoned') return `<span class="b b-crit">■ ABANDONED</span>`
  if (r.disposition === 'reverted-by-post-land-audit') return `<span class="b b-crit">↩ REVERTED BY AUDIT</span>`
  return `<span class="b b-good">✓ CHECKS PASS</span>`
}

const itemCardsFor = (itemsOrdered) => itemsOrdered.map(([id, rs]) => {
  const item = backlog.find((b) => b.id === id) ?? {}
  const last = rs[rs.length - 1]
  const state = last.disposition === 'landed' ? (last.seal === 'passed' ? 'sealed' : 'landed') : 'failing'
  const attempts = rs.map((r) => {
    const fails = (r.checks ?? []).filter((c) => !c.ok)
    const warns = (r.checks ?? []).filter((c) => c.ok && c.warn)
    const notes = (r.checks ?? []).filter((c) => c.note && (!c.ok || c.warn))
    return `
    <div class="run">
      <div class="runhead">
        <span class="rlabel">${esc(id)} · ${r.mode === 'land' ? 'landing' : r.mode} ${r.attempt}</span>
        ${dispBadge(r)}
        ${r.sha ? `<span class="sha">${esc(r.sha)}</span>` : ''}
        <span class="when">${esc((r.at ?? '').slice(0, 16).replace('T', ' '))}${r.source === 'reconstructed' ? ' · reconstructed' : ''}</span>
      </div>
      ${fails.length ? `<div class="fails">${fails.map((c) => `<span class="b b-crit">✗ ${esc(c.name)}</span>`).join(' ')}</div>` : ''}
      ${warns.length ? `<div class="fails">${warns.map((c) => `<span class="b b-warn">⚑ ${esc(c.name)}</span>`).join(' ')}</div>` : ''}
      ${notes.length ? `<ul class="notes">${notes.map((c) => `<li>${esc(c.note)}</li>`).join('')}</ul>` : ''}
      ${r.effect ? `<div class="effect">measured: ${esc(r.effect)}</div>` : ''}
    </div>`
  }).join('')
  return `<div class="card" data-state="${state}">
    <div class="cardtitle"><span class="iid">${esc(id)}</span>
      ${item.gauntlet === 'passed' ? '<span class="b b-seal">⛓ SEALED</span>' : item.gauntlet ? `<span class="b b-warn">⚑ ${esc(item.gauntlet)}</span>` : ''}
      ${item.status === 'done-needs-review' ? '<span class="b b-warn">needs review</span>' : ''}</div>
    ${item.spec ? `<div class="spec">${esc(String(item.spec).slice(0, 220))}${String(item.spec).length > 220 ? '…' : ''}</div>` : ''}
    ${attempts}
  </div>`
}).join('')

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Game Builder — Iron Gauntlet log</title>
<style>
  :root { color-scheme: light;
    --surface:#fcfcfb; --card:#f4f3f1; --ink:#0b0b0b; --ink2:#52514e; --ink3:#8a8880;
    --seq:#2a78d6; --seq-deep:#1c5cab;
    --good:#0ca30c; --warn:#fab219; --crit:#d03b3b; --seal:#4a3aa7;
    --line:#e4e2dd; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme=light]) {
    color-scheme: dark;
    --surface:#1a1a19; --card:#242422; --ink:#ffffff; --ink2:#c3c2b7; --ink3:#8a8880;
    --seq:#3987e5; --seq-deep:#86b6ef;
    --good:#0ca30c; --warn:#fab219; --crit:#d03b3b; --seal:#9085e9;
    --line:#33332f; } }
  * { box-sizing: border-box }
  body { margin:0; background:var(--surface); color:var(--ink);
    font:14px/1.45 ui-sans-serif,system-ui,'Segoe UI',sans-serif; padding:28px 32px 80px }
  h1 { font-size:20px; margin:0 0 2px } h2 { font-size:15px; margin:34px 0 10px; color:var(--ink) }
  .sub { color:var(--ink2); margin-bottom:22px }
  .tiles { display:flex; gap:14px; flex-wrap:wrap; margin:18px 0 8px }
  .tile { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:12px 18px; min-width:130px }
  .tile .n { font-size:26px; font-weight:700 } .tile .l { color:var(--ink2); font-size:12px }
  .frow { display:flex; align-items:center; gap:10px; margin:5px 0; position:relative }
  .fname { width:340px; text-align:right; color:var(--ink2); font-size:12.5px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
  .ftrack { display:flex; align-items:center; gap:8px }
  .fbar { height:14px; background:var(--seq); border-radius:0 4px 4px 0 }
  .frow:hover .fbar { background:var(--seq-deep) }
  .fval { font-variant-numeric:tabular-nums; color:var(--ink); font-size:12.5px }
  .frow[data-tip]:hover::after { content:attr(data-tip); position:absolute; left:352px; top:-26px;
    background:var(--ink); color:var(--surface); padding:3px 8px; border-radius:5px; font-size:12px; white-space:nowrap; z-index:2 }
  .filters { display:flex; gap:8px; margin:14px 0 16px }
  .filters button { background:var(--card); color:var(--ink2); border:1px solid var(--line);
    border-radius:16px; padding:4px 14px; cursor:pointer; font-size:13px }
  .filters button[aria-pressed=true] { background:var(--seq); color:#fff; border-color:var(--seq) }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin:12px 0 }
  .cardtitle { display:flex; gap:10px; align-items:center; flex-wrap:wrap }
  .iid { font-weight:700; font-size:15px }
  .spec { color:var(--ink2); font-size:12.5px; margin:6px 0 4px }
  .run { border-top:1px dashed var(--line); margin-top:10px; padding-top:9px }
  .runhead { display:flex; gap:10px; align-items:center; flex-wrap:wrap }
  .rlabel { font-weight:600 } .when { color:var(--ink3); font-size:12px; margin-left:auto }
  .sha { font-family:ui-monospace,monospace; font-size:12px; color:var(--ink2) }
  .b { display:inline-block; border-radius:5px; padding:1px 8px; font-size:11.5px; font-weight:600; color:#fff }
  .b-good { background:var(--good) } .b-warn { background:var(--warn); color:#1a1a19 }
  .b-crit { background:var(--crit) } .b-seal { background:var(--seal) }
  .fails { margin:6px 0 0; display:flex; gap:6px; flex-wrap:wrap }
  .notes { margin:6px 0 0; padding-left:20px; color:var(--ink2); font-size:12.5px }
  .effect { margin-top:6px; font-size:12.5px; color:var(--ink2); font-style:italic }
  .q { background:var(--card); border:1px solid var(--line); border-left:4px solid var(--warn);
    border-radius:6px; padding:9px 13px; margin:7px 0; font-size:13px }
  .q.done { border-left-color:var(--good); color:var(--ink2) }
  details { margin-top:8px } summary { cursor:pointer; color:var(--ink2); font-size:12.5px }
  .batch { border:1px solid var(--line); border-radius:10px; margin:14px 0; background:var(--surface) }
  .batchbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:10px 14px;
    background:var(--card); border-radius:10px; font-size:13px }
  details.batch > summary.batchbar { list-style:none } details.batch > summary::-webkit-details-marker { display:none }
  details.batch > summary.batchbar::before { content:'▸ '; color:var(--ink3) }
  details.batch[open] > summary.batchbar::before { content:'▾ ' }
  .bday { font-weight:700 } .bmeta { color:var(--ink3); font-size:12px }
  .batch .cards { padding:0 14px 12px }
  .approve { margin-left:auto; background:var(--surface); border:1px solid var(--line); color:var(--ink2);
    border-radius:14px; padding:3px 12px; cursor:pointer; font-size:12px }
  .approve:hover { border-color:var(--good); color:var(--good) }
  .art { color:var(--seq); font-size:12px; text-decoration:none; border:1px solid var(--line);
    border-radius:14px; padding:2px 10px; background:var(--surface) }
  .art:hover { border-color:var(--seq) }
  .watch { margin:10px 14px 0 }
  .watch iframe { width:100%; height:660px; border:1px solid var(--line); border-radius:8px; background:#111; margin-top:8px }
  .approved-tick { color:var(--good); font-weight:600; font-size:12.5px; margin-left:auto }
  table { border-collapse:collapse; margin-top:6px } td,th { border:1px solid var(--line); padding:3px 10px; font-size:12.5px }
</style></head><body>
<h1>The Game Builder</h1>
<div class="sub">The Iron Gauntlet's running log — every landing, every failure, every question. Regenerated by the gate after each run. Built ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${runs.filter((r) => r.type !== 'batch-end').length} runs on record${runs.some((r) => r.source === 'reconstructed') ? ' (earliest reconstructed from the 2026-08-20 session; live per-check capture from then on)' : ''}.</div>

<div class="tiles">
  <div class="tile"><div class="n">${landed.length}</div><div class="l">landed</div></div>
  <div class="tile"><div class="n">${sealed.length}</div><div class="l">⛓ seals passed</div></div>
  <div class="tile"><div class="n">${flagged.length}</div><div class="l">flagged, need review</div></div>
  <div class="tile"><div class="n">${abandoned.length}</div><div class="l">abandoned / reverted</div></div>
  <div class="tile"><div class="n">${open.length}</div><div class="l">backlog open</div></div>
  <div class="tile"><div class="n">${qOpen.length}</div><div class="l">open questions</div></div>
</div>

<h2>Where the loop fails — FAIL count by check, all runs</h2>
${failRows.length ? failChartRows : '<div class="sub">No failures on record yet.</div>'}
<details><summary>table view</summary><table><tr><th>check</th><th>fails</th></tr>${failTable}</table></details>

<h2>Questions — the inbox</h2>
${qOpen.map((q) => `<div class="q">❓ ${esc(q)}</div>`).join('')}
${qDone.length ? `<details><summary>${qDone.length} answered</summary>${qDone.map((q) => `<div class="q done">✓ ${esc(q)}</div>`).join('')}</details>` : ''}
<div class="sub" style="margin-top:8px">Add or answer questions in <code>.state/questions.md</code> — this page re-renders on the next gate run (or <code>node tools/game-builder.mjs</code>).</div>

<h2>Run log — newest batch on top, older batches collapsed</h2>
<div class="filters" role="group" aria-label="filter runs">
  <button aria-pressed="true" data-f="all">all</button>
  <button aria-pressed="false" data-f="failing">failing</button>
  <button aria-pressed="false" data-f="landed">landed</button>
  <button aria-pressed="false" data-f="sealed">⛓ sealed</button>
</div>
${batches.map((batch, bi) => {
  const items = groupByItem(batch.runs)
  const landedRuns = batch.runs.filter((r) => r.disposition === 'landed')
  const sealedRuns = landedRuns.filter((r) => r.seal === 'passed')
  const failedRuns = batch.runs.filter((r) => r.disposition === 'failed-checks').length
  const day = (batch.runs[0].at ?? '').slice(0, 10)
  const bar = `<span class="bday">${esc(batch.id.replace('batch-', 'Batch '))}${batch.label ? ' — ' + esc(batch.label) : ''} · ${esc(day)}</span>
    <span class="b b-good">✓ ${landedRuns.length} landed</span>
    ${sealedRuns.length ? `<span class="b b-seal">⛓ ${sealedRuns.length} sealed</span>` : ''}
    ${failedRuns ? `<span class="b b-crit">✗ ${failedRuns} failed attempts</span>` : ''}
    <span class="bmeta">${items.length} item${items.length === 1 ? '' : 's'} · ${batch.runs.length} runs</span>
    ${(batch.artifacts ?? []).map((a) => `<a class="art" href="${esc(a.href)}" target="_blank" onclick="event.stopPropagation()">▶ ${esc(a.label)}</a>`).join('')}
    <button class="approve" data-batch="${batch.id}">Approve — collapse when read</button>
    <span class="approved-tick" hidden>✓ approved</span>`
  // An html artifact plays INSIDE the batch — a lazy iframe that only loads when
  // opened, so twenty batches of history never load twenty replays at once.
  const playable = (batch.artifacts ?? []).find((a) => a.href.endsWith('.html'))
  const watch = playable ? `<details class="watch"><summary>▶ watch it right here — ${esc(playable.label)}</summary>
    <iframe data-src="${esc(playable.href)}" title="${esc(playable.label)}"></iframe></details>` : ''
  const body = `${watch}<div class="cards">${itemCardsFor(items)}</div>`
  return bi === 0
    ? `<section class="batch open" data-batch="${batch.id}"><div class="batchbar">${bar}</div>${body}</section>`
    : `<details class="batch" data-batch="${batch.id}"><summary class="batchbar">${bar}</summary>${body}</details>`
}).join('') || '<div class="sub">No runs yet — the log fills as the gate runs.</div>'}

<script>
  document.querySelector('.filters').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return
    document.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
    const f = b.dataset.f
    document.querySelectorAll('.batch .card').forEach((c) => {
      c.style.display = (f === 'all' || c.dataset.state === f) ? '' : 'none'
    })
  })
  // Approve = a per-viewer read-marker. Stored in this browser only (the page is
  // a local file that regenerates); the DURABLE review state is the backlog's
  // done-needs-review flags, which approving does not touch. Wrapped in
  // try/catch — if storage is unavailable the button still collapses for now.
  const store = { get(k) { try { return localStorage.getItem(k) } catch { return null } },
                  set(k, v) { try { localStorage.setItem(k, v) } catch {} } }
  function applyApproval(el) {
    const id = el.dataset.batch
    if (store.get('gb-approved-' + id) !== '1') return
    el.querySelector('.approve')?.setAttribute('hidden', '')
    el.querySelector('.approved-tick')?.removeAttribute('hidden')
    if (el.tagName === 'DETAILS') el.removeAttribute('open')
    else { // the newest batch collapses into a details element on approval
      const d = document.createElement('details')
      d.className = 'batch'; d.dataset.batch = id
      const bar = el.querySelector('.batchbar'); const sum = document.createElement('summary')
      sum.className = 'batchbar'; sum.innerHTML = bar.innerHTML; bar.remove()
      d.appendChild(sum); while (el.firstChild) d.appendChild(el.firstChild)
      el.replaceWith(d)
    }
  }
  document.querySelectorAll('.batch').forEach(applyApproval)
  // The embedded replay loads only when its drawer opens — and only once.
  document.querySelectorAll('details.watch').forEach((d) => d.addEventListener('toggle', () => {
    const f = d.querySelector('iframe'); if (d.open && f && !f.src) f.src = f.dataset.src
  }))
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.approve'); if (!b) return
    e.preventDefault()
    const el = b.closest('.batch')
    store.set('gb-approved-' + el.dataset.batch, '1')
    applyApproval(el)
  })
</script>
</body></html>`

writeFileSync('GAME-BUILDER.html', html)
if (!quiet) console.log(`GAME-BUILDER.html — ${runs.length} runs, ${failRows.length} distinct failing checks, ${qOpen.length} open questions`)
