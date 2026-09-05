// THE PROVING — the dashboard (proving.page, 2026-09-05; session 9's E8,
// 9-PROVING-SETTLED.md §4).
//
//   npm run proving:page [--state <dir>] [--out <path>]
//     reads  .state/proving/ranking.json   (npm run proving:rank writes it)
//     writes ../PROVING.html                (generated — never hand-edit)
//
// One file at the project root beside GAME-BUILDER.html: double-click, no
// server. The ranking is embedded as JSON; everything on the page is a
// projection of it — filters, sorting, the per-row pair detail, the initiative
// and controls panels, the findings. It draws what the rollup wrote and decides
// nothing; a number on this page that is not in ranking.json is a bug here.
// Every pair prints the export-battle command that reproduces that very
// battle for the Battle Viewer (E9) — the viewer plays a dropped export.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ENGINE = join(HERE, '..')
const ROOT = join(ENGINE, '..')
const args = process.argv.slice(2)
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
const STATE = opt('--state') ?? join(ENGINE, '.state', 'proving')
const OUT = opt('--out') ?? join(ROOT, 'PROVING.html')

const rankingPath = join(STATE, 'ranking.json')
if (!existsSync(rankingPath)) { console.error(`proving-page: no ${rankingPath} — run npm run proving:rank first`); process.exit(2) }
const ranking = JSON.parse(readFileSync(rankingPath, 'utf8')) as { generated: string; stamp: string; plans: { id: string; file: string | null; current: boolean }[]; units: unknown[]; findings: string[] }

// the plan file, as a command run from engine/ would name it
for (const p of ranking.plans) {
  if (p.file && p.file.includes('content/proving/')) p.file = `../content/proving/${basename(p.file)}`
  else if (p.file && p.file.includes('test/proving/')) p.file = `test/proving/${basename(p.file)}`
}
const stale = ranking.plans.filter((p) => !p.current).length

const DATA = JSON.stringify(ranking).replace(/<\/script/gi, '<\\/script')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Proving</title>
<style>
:root { --bg:#141210; --panel:#1e1b17; --ink:#e8e0d0; --dim:#9a9082; --line:#332e27; --hero:#6fb1e0; --enemy:#e0745f; --civ:#c9b458; --good:#7fc46a; --bad:#e0745f; --warn:#e0b25f; --bar:#4a5f7a; }
* { box-sizing:border-box }
body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 Georgia, 'Iowan Old Style', serif; }
header { padding:22px 28px 10px; border-bottom:1px solid var(--line); display:flex; flex-wrap:wrap; gap:8px 24px; align-items:baseline }
h1 { margin:0; font-size:26px; font-weight:normal; letter-spacing:.5px }
h2 { font-size:18px; font-weight:normal; margin:34px 0 10px; color:var(--ink) }
.stamp { color:var(--dim); font-size:13px } .stamp.stale { color:var(--bad) }
main { padding:0 28px 60px; max-width:1500px }
.intro { color:var(--dim); max-width:980px; margin:14px 0 18px }
.filters { display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; padding:12px 14px; background:var(--panel); border:1px solid var(--line); border-radius:6px; margin-bottom:12px }
.filters label { color:var(--dim); font-size:13px } .filters select, .filters input { background:#0f0e0c; color:var(--ink); border:1px solid var(--line); padding:4px 7px; font:inherit; font-size:13px; border-radius:4px }
.filters input[type=search] { width:220px } .filters .n { color:var(--dim); font-size:13px; margin-left:auto }
table { border-collapse:collapse; width:100% } th, td { padding:6px 9px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; white-space:nowrap }
th { color:var(--dim); font-weight:normal; cursor:pointer; user-select:none; position:sticky; top:0; background:var(--bg) } th.on { color:var(--ink) } th .arrow { font-size:11px; margin-left:4px }
tr.row { cursor:pointer } tr.row:hover td { background:#1a1815 } tr.open td { background:#1e1b17 }
td.num { text-align:right; font-variant-numeric:tabular-nums } th.num { text-align:right }
.id { color:var(--dim); font-size:12px; font-family:ui-monospace, Menlo, Consolas, monospace }
.kind { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:7px; vertical-align:middle } .kind.hero { background:var(--hero) } .kind.enemy { background:var(--enemy) } .kind.civilian { background:var(--civ) }
.bar { display:inline-block; width:60px; height:9px; background:#0f0e0c; border:1px solid var(--line); vertical-align:middle; margin-left:8px; position:relative } .bar i { position:absolute; left:0; top:0; bottom:0; background:var(--bar) }
.pos { color:var(--good) } .neg { color:var(--bad) } .zero { color:var(--dim) }
.flag { display:inline-block; background:#3a2a1a; color:var(--warn); border-radius:3px; padding:0 6px; font-size:12px; margin-left:6px } .flag.bad { background:#3a1f1a; color:var(--bad) }
tr.detail td { white-space:normal; background:#191713; padding:10px 14px 14px 34px }
.pairs { border-collapse:collapse; width:100%; margin:6px 0 8px } .pairs th, .pairs td { padding:3px 8px; border-bottom:1px solid #26221d; font-size:13px; white-space:nowrap; position:static; cursor:default }
.cmd { font:12px ui-monospace, Menlo, Consolas, monospace; color:var(--dim); background:#0f0e0c; border:1px solid var(--line); border-radius:4px; padding:2px 6px; cursor:pointer } .cmd:hover { color:var(--ink) }
.cmd.copied { color:var(--good) }
.note { color:var(--dim); font-size:13px; margin:6px 0 0 }
.find { color:var(--warn); font-size:13px }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(420px, 1fr)); gap:18px; align-items:start }
.panel { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:12px 16px 16px }
.panel h3 { margin:0 0 8px; font-size:15px; font-weight:normal } .panel table th { position:static; cursor:default } .panel td, .panel th { font-size:13px; padding:4px 8px }
svg text { fill:var(--dim); font:11px Georgia, serif }
ul.findings { padding-left:20px } ul.findings li { margin:4px 0; color:var(--warn) }
a { color:var(--hero) }
.legend { color:var(--dim); font-size:12px; margin-top:8px }
</style>
</head>
<body>
<header>
  <h1>The Proving</h1>
  <span class="stamp ${stale ? 'stale' : ''}" id="stamp"></span>
</header>
<main>
  <p class="intro">Every unit, ranked by its <b>victory rate</b>: each unit takes one seat of the control fight and the fight is run on five maps with one seed — <b>Power</b> is how many of the five its side <b>won with it in</b>. The same five are also run without it, and the <b>control</b> column is how many the control won on its own, so the difference is which way the unit moved the needle. <b>Flips</b> counts the pairs whose outcome changed either way; <b>swing</b> is how far the surviving strength moved, from the unit's own side (permille); <b>tempo</b> is turns shifted; <b>presence</b> counts the state-changing lines the unit itself wrote. Five pairs is a coarse ruler by design. A row opens its five pairs; each pair prints the command that reproduces that exact battle for the Battle Viewer.</p>

  <div class="filters" id="filters">
    <label>Side <select id="f-kind"><option value="">all</option><option value="hero">hero</option><option value="civilian">civilian</option><option value="enemy">enemy</option></select></label>
    <label>Class <select id="f-class"><option value="">all</option></select></label>
    <label>Family <select id="f-family"><option value="">all</option></select></label>
    <label>Tag <select id="f-tag"><option value="">all</option></select></label>
    <label>Ladder <select id="f-ladder"><option value="">all</option></select></label>
    <label><input type="search" id="f-q" placeholder="search id or name"></label>
    <label><input type="checkbox" id="f-find"> findings only</label>
    <span class="n" id="count"></span>
  </div>

  <table id="units">
    <thead><tr>
      <th data-k="rank" class="num">#</th>
      <th data-k="name">Unit</th>
      <th data-k="kind">Side</th>
      <th data-k="class">Class / family</th>
      <th data-k="ladder">Ladder</th>
      <th data-k="winsWith" class="num on">Power (wins)<span class="arrow">▼</span></th>
      <th data-k="controlWins" class="num">Control wins</th>
      <th data-k="flips" class="num">Flips</th>
      <th data-k="swing" class="num">Swing</th>
      <th data-k="tempo" class="num">Tempo</th>
      <th data-k="presence" class="num">Presence</th>
      <th data-k="invalid" class="num">Invalid</th>
    </tr></thead>
    <tbody id="body"></tbody>
  </table>
  <p class="legend">Power (wins of five, with the unit in) ranks first, swing breaks ties, then id. Ruled 2026-09-05: "The power ranking should be based on the victory rate in the battle." Flips is how many of the five outcomes changed against the control, in either direction — it says the unit mattered, not which way.</p>

  <div class="grid" id="panels"></div>

  <h2>Findings <span class="stamp">(written by the rollup, never by hand)</span></h2>
  <ul class="findings" id="findings"></ul>
</main>
<script id="data" type="application/json">${DATA}</script>
<script>
(() => {
  const R = JSON.parse(document.getElementById('data').textContent)
  const $ = (s) => document.querySelector(s)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const stale = R.plans.filter((p) => !p.current)
  $('#stamp').textContent = 'generated ' + R.generated + ' · pack ' + R.stamp + ' · ' + R.units.length + ' units · ' + R.plans.length + ' plans' + (stale.length ? ' · STALE: ' + stale.map((p) => p.id + ' ran on ' + p.stamp).join(', ') + ' — re-run' : '')
  const planFile = (id) => (R.plans.find((p) => p.id === id) || {}).file || ('<plan file for ' + id + '>')
  const sgn = (n) => (n > 0 ? '+' : '') + n
  const cls = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero')

  // filters
  const uniq = (f) => [...new Set(R.units.flatMap(f).filter(Boolean))].sort()
  const fill = (sel, vals) => { for (const v of vals) { const o = document.createElement('option'); o.value = v; o.textContent = v; $(sel).appendChild(o) } }
  fill('#f-class', uniq((u) => [u.class])); fill('#f-family', uniq((u) => [u.family])); fill('#f-tag', uniq((u) => u.tags)); fill('#f-ladder', uniq((u) => [u.ladder]))

  let sortK = 'winsWith', sortDir = -1, open = new Set()
  const keyOf = (u, k) => k === 'rank' ? u._rank : k === 'name' ? u.name.toLowerCase() : k === 'class' ? (u.class || u.family || '') : (u[k] ?? '')
  R.units.forEach((u, i) => { u._rank = i + 1 })   // the rollup's order: Power (wins), swing, id (Law 6)

  function visible() {
    const kind = $('#f-kind').value, klass = $('#f-class').value, fam = $('#f-family').value, tag = $('#f-tag').value, lad = $('#f-ladder').value, q = $('#f-q').value.trim().toLowerCase(), fo = $('#f-find').checked
    return R.units.filter((u) => (!kind || u.kind === kind) && (!klass || u.class === klass) && (!fam || u.family === fam) && (!tag || u.tags.includes(tag)) && (!lad || u.ladder === lad)
      && (!q || u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)) && (!fo || u.findings.length))
      .sort((a, b) => { const x = keyOf(a, sortK), y = keyOf(b, sortK); if (x < y) return -sortDir; if (x > y) return sortDir; return b.swing - a.swing || a.id.localeCompare(b.id) })
  }
  const rowKey = (u) => u.plan + '|' + u.id + '|' + u.rotation + '|' + (u.slot ?? '')
  function render() {
    const list = visible()
    $('#count').textContent = list.length + ' of ' + R.units.length
    const rows = []
    for (const u of list) {
      const flags = u.findings.map((f) => '<span class="flag' + (/INVALID/.test(f) ? ' bad' : '') + '" title="' + esc(f) + '">' + esc(f.length > 42 ? f.slice(0, 40) + '…' : f) + '</span>').join('')
      const k = rowKey(u)
      rows.push('<tr class="row' + (open.has(k) ? ' open' : '') + '" data-k="' + esc(k) + '">'
        + '<td class="num">' + u._rank + '</td>'
        + '<td><span class="kind ' + u.kind + '"></span>' + esc(u.name) + ' <span class="id">' + esc(u.id) + '</span>' + flags + '</td>'
        + '<td>' + u.kind + '</td><td>' + esc(u.class || u.family || '—') + '</td><td>' + esc(u.ladder) + '</td>'
        + '<td class="num"><b>' + u.winsWith + '/' + u.valid + '</b><span class="bar"><i style="width:' + (u.valid ? Math.round(100 * u.winsWith / u.valid) : 0) + '%"></i></span></td>'
        + '<td class="num zero">' + u.controlWins + '/' + u.valid + '</td>'
        + '<td class="num ' + (u.winsWith > u.controlWins ? 'pos' : u.winsWith < u.controlWins ? 'neg' : 'zero') + '">' + u.flips + '</td>'
        + '<td class="num ' + cls(u.swing) + '">' + sgn(u.swing) + '</td><td class="num ' + cls(u.tempo) + '">' + sgn(u.tempo) + '</td>'
        + '<td class="num">' + u.presence + '</td><td class="num' + (u.invalid ? ' neg' : ' zero') + '"' + (u.invalid ? ' title="' + esc(u.invalidReasons.join(' · ')) + '"' : '') + '>' + (u.invalid || '—') + '</td></tr>')
      if (open.has(k)) rows.push('<tr class="detail"><td colspan="12">' + detail(u) + '</td></tr>')
    }
    $('#body').innerHTML = rows.join('')
  }
  function cmd(u, i, arm) {
    return 'npx tsx tools/export-battle.mts --plan ' + planFile(u.plan) + ' --subject ' + u.id + (u.slot !== undefined ? ' --slot ' + u.slot : '') + ' --rotation ' + u.rotation + ' --pair ' + i + ' --arm ' + arm + ' > ../viewer/battles/proving-' + u.id.replace(/[^a-z0-9-]+/gi, '_') + '-' + i + '-' + arm + '.json'
  }
  function detail(u) {
    const o = (a) => a.outcome === 'invalid' ? '<span class="neg">INVALID</span>' : esc(a.outcome)
    let h = '<table class="pairs"><tr><th>#</th><th>Map</th><th>Seed</th><th>With</th><th>Without</th><th>Margin with</th><th>Margin without</th><th>Turns</th><th>Flipped</th><th>Presence</th><th>Export (run from engine/; drop the file on the Battle Viewer)</th></tr>'
    u.detail.forEach((p, i) => {
      h += '<tr><td>' + i + '</td><td>' + esc(p.map) + '</td><td>' + p.seed + '</td><td>' + o(p.with) + '</td><td>' + o(p.without) + '</td><td class="num">' + p.with.margin + '</td><td class="num">' + p.without.margin + '</td><td class="num">' + p.with.turns + ' / ' + p.without.turns + '</td><td>' + (p.flipped ? '<b class="pos">flip</b>' : '—') + '</td><td class="num">' + p.presence + '</td>'
        + '<td><span class="cmd" data-cmd="' + esc(cmd(u, i, 'with')) + '" title="click to copy">with</span> <span class="cmd" data-cmd="' + esc(cmd(u, i, 'without')) + '" title="click to copy">without</span></td></tr>'
      if (p.with.error || p.without.error) h += '<tr><td></td><td colspan="10" class="find">' + esc(p.with.error || p.without.error) + '</td></tr>'
    })
    h += '</table>'
    h += '<p class="note">Plan <code>' + esc(u.plan) + '</code> · fixture <code>' + esc(u.fixture) + '</code> · ' + esc(u.rotation) + (u.slot !== undefined ? ' seat ' + u.slot : '') + ' on the ' + u.side + ' side · pack ' + esc(u.stamp) + (u.current ? '' : ' <span class="neg">(stale)</span>') + '. Five pairs: k/5 has a wide interval — 2/5 and 3/5 are not distinguishable, 0/5 and 5/5 are. Open the exported battle in <a href="viewer/BATTLE-VIEWER.html">the Battle Viewer</a> by dropping the file on it.</p>'
    if (u.findings.length) h += '<p class="find">' + u.findings.map(esc).join('<br>') + '</p>'
    return h
  }
  $('#body').addEventListener('click', (e) => {
    const c = e.target.closest('.cmd')
    if (c) { navigator.clipboard && navigator.clipboard.writeText(c.dataset.cmd); c.classList.add('copied'); setTimeout(() => c.classList.remove('copied'), 900); e.stopPropagation(); return }
    const tr = e.target.closest('tr.row'); if (!tr) return
    const k = tr.dataset.k; if (open.has(k)) open.delete(k); else open.add(k); render()
  })
  for (const th of document.querySelectorAll('#units th')) th.addEventListener('click', () => {
    const k = th.dataset.k
    if (sortK === k) sortDir = -sortDir; else { sortK = k; sortDir = (k === 'name' || k === 'kind' || k === 'class' || k === 'ladder' || k === 'rank') ? 1 : -1 }
    for (const t of document.querySelectorAll('#units th')) { t.classList.toggle('on', t === th); const a = t.querySelector('.arrow'); if (a) a.remove() }
    th.insertAdjacentHTML('beforeend', '<span class="arrow">' + (sortDir < 0 ? '▼' : '▲') + '</span>')
    render()
  })
  for (const id of ['#f-kind', '#f-class', '#f-family', '#f-tag', '#f-ladder', '#f-find']) $(id).addEventListener('change', render)
  $('#f-q').addEventListener('input', render)
  render()

  // ── panels: initiative, gap, controls ──
  const panels = []
  if (R.initiative) {
    const I = R.initiative, maps = I.maps
    let h = '<div class="panel"><h3>Initiative — wins for the side moving first · ' + esc(I.plan) + ' · mirrorSideRules ' + esc(I.switches.mirrorSideRules || 'fielded') + '</h3>'
    h += '<table><tr><th>Mirror</th><th>First – second</th>' + maps.map((m) => '<th>' + esc(m.replace('map.proving.', '')) + '</th>').join('') + '</tr>'
    for (const m of I.mirrors) h += '<tr><td>' + esc(m.squad.replace('squad.', '')) + '</td><td><b>' + m.first + '–' + m.second + '</b>' + (m.other ? ' <span class="zero">(' + m.other + ' other)</span>' : '') + (m.invalid ? ' <span class="neg">' + m.invalid + ' INVALID</span>' : '') + '</td>' + maps.map((k) => { const p = m.perMap[k]; return '<td>' + (p ? p.first + '–' + p.second : '—') + '</td>' }).join('') + '</tr>'
    h += '</table><p class="note">Enemies against enemies, the same squad each side, ten battles a mirror (two seeds × five maps). Under <code>row</code> a zombie stays a zombie wherever it stands, so the hero-side rules are out of this number. The export command: <span class="cmd" data-cmd="npx tsx tools/export-battle.mts --plan ' + esc(planFile(I.plan)) + ' --matchup m.zombies-4 --battle 0 > ../viewer/battles/proving-initiative.json">matchup, battle 0</span></p></div>'
    panels.push(h)
  }
  if (R.gap && R.gap.sweep.length) {
    const G = R.gap.sweep, W = 440, H = 200, L = 34, B = 26, n = G.length, maxG = Math.max(...G.map((g) => g.gap)), minG = Math.min(...G.map((g) => g.gap))
    const x = (g) => L + ((g - minG) / Math.max(1, maxG - minG)) * (W - L - 10), y = (w, tot) => H - B - (w / tot) * (H - B - 12)
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px">'
    svg += '<line x1="' + L + '" y1="' + y(0.5, 1) + '" x2="' + (W - 10) + '" y2="' + y(0.5, 1) + '" stroke="#332e27" stroke-dasharray="3 3"/>'
    svg += '<text x="' + (L - 4) + '" y="' + (y(0.5, 1) + 4) + '" text-anchor="end">½</text><text x="' + (L - 4) + '" y="' + (y(1, 1) + 4) + '" text-anchor="end">all</text><text x="' + (L - 4) + '" y="' + (y(0, 1) + 4) + '" text-anchor="end">0</text>'
    const pts = G.map((g) => { const tot = g.first + g.second + g.other; return x(g.gap) + ',' + y(tot ? g.first : 0, tot || 1) })
    svg += '<polyline fill="none" stroke="#6fb1e0" stroke-width="2" points="' + pts.join(' ') + '"/>'
    for (const g of G) { const tot = g.first + g.second + g.other; svg += '<circle cx="' + x(g.gap) + '" cy="' + y(tot ? g.first : 0, tot || 1) + '" r="3" fill="#6fb1e0"><title>gap ' + g.gap + ': first ' + g.first + ', second ' + g.second + (g.other ? ', other ' + g.other : '') + ', margin ' + g.margin + '</title></circle>'; svg += '<text x="' + x(g.gap) + '" y="' + (H - 8) + '" text-anchor="middle">' + g.gap + '</text>' }
    svg += '<text x="' + ((L + W - 10) / 2) + '" y="' + (H - 8 - 14) + '" text-anchor="middle" style="fill:#5a5248">starting gap (hexes between the lines)</text></svg>'
    let h = '<div class="panel"><h3>Starting gap — first-mover share of wins · ' + esc(R.gap.plan) + ' on ' + esc(R.gap.map) + '</h3>' + svg
    h += '<table><tr><th>Gap</th>' + G.map((g) => '<th class="num">' + g.gap + '</th>').join('') + '</tr><tr><td>first – second</td>' + G.map((g) => '<td class="num">' + g.first + '–' + g.second + '</td>').join('') + '</tr><tr><td>margin</td>' + G.map((g) => '<td class="num ' + cls(g.margin) + '">' + sgn(g.margin) + '</td>').join('') + '</tr></table>'
    h += '<p class="note">Four zombies each way, twenty battles a gap, the two lines placed the named distance apart about the board\\'s middle. The oscillation is the movement number: whoever ARRIVES first spends the Activation arriving and eats the first swing.</p></div>'
    panels.push(h)
  }
  if (R.controls) {
    const C = R.controls
    let h = '<div class="panel"><h3>Controls — the reference the ladders hang on · ' + esc(C.plan) + '</h3>'
    h += '<table><tr><th>Candidate</th><th>Enemy squad</th><th>Seed-' + C.seed + ' five</th><th>Passes</th><th>Ten</th><th class="num">Margin</th><th class="num">Turns</th></tr>'
    for (const c of C.candidates) h += '<tr><td>' + esc(c.id) + '</td><td class="id">' + esc(c.enemy) + '</td><td><b>' + c.seed1.hero + '–' + c.seed1.enemy + '</b></td><td>' + (c.passes ? '<span class="pos">✓</span>' : '') + '</td><td>' + c.ten.hero + '–' + c.ten.enemy + (c.ten.other ? ' (' + c.ten.other + ')' : '') + '</td><td class="num ' + cls(c.margin) + '">' + sgn(c.margin) + '</td><td class="num">' + c.turns + '</td></tr>'
    h += '</table>'
    if (C.inUse && C.inUse.length) h += '<p class="note">The control the unit ladders were actually paired against (their WITHOUT arms, seed-' + C.seed + ' five): ' + C.inUse.map((u) => '<code>' + esc(u.plan) + '</code> <b class="' + (u.passes ? 'pos' : 'neg') + '">' + u.seed1.hero + '–' + u.seed1.enemy + '</b>').join(' · ') + '.</p>'
    h += '<p class="note">The rule (9-PROVING-SETTLED §3): the seed-1 five must be 2–3 or 3–2 — a control at 1–4 leaves a strong enemy one battle to flip and a strong hero four, and the two ladders would not read on one scale. Ties go to the ten-battle margin nearest zero, then the fewer bodies.</p></div>'
    panels.push(h)
  }
  $('#panels').innerHTML = panels.join('')
  document.addEventListener('click', (e) => { const c = e.target.closest('#panels .cmd'); if (c) { navigator.clipboard && navigator.clipboard.writeText(c.dataset.cmd); c.classList.add('copied'); setTimeout(() => c.classList.remove('copied'), 900) } })

  $('#findings').innerHTML = R.findings.length ? R.findings.map((f) => '<li>' + esc(f) + '</li>').join('') : '<li class="zero">none</li>'
})()
</script>
</body>
</html>
`
writeFileSync(OUT, html)
console.log(`proving-page: ${ranking.units.length} units · ${ranking.plans.length} plans · ${ranking.findings.length} findings${stale ? ` · ${stale} STALE plan(s)` : ''}\n  ${OUT}`)
