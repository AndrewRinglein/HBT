/* ══════════════════════════════════════════════════════════════════════════
   THE REPLAY HARNESS — the standalone page around the viewer component.
   Everything replay-only lives here and nowhere below: the battle library
   dropdown, play/pause/step/turn/scrub/speed, the unit rail, the log box,
   the intro prose, the page-fit scaling, and the file-drop that plays any
   export-battle.mts output (THREE-PACKAGES-PLAN §8.6). The kingdom mounts the
   same viewer without any of this (stage 3).
   ══════════════════════════════════════════════════════════════════════════ */
import { mountBattleViewer } from './viewer.js'
import { buildLog } from './log.js'

const OUTNAME = { heroClear: 'heroes win', wipe: 'heroes wiped', stall: 'stall', capped: 'capped' }

/** lib = { static:{units,statuses,engineCommit}, fields:{mapId:field}, art:{artmap,assets},
           battles:[{label, battle}], stamp:{viewer, engine, built} } */
export function startHarness(mountEl, lib) {
  let viewer = null, cur = 0, playingBeforeScrub = true
  const q = s => document.querySelector(s)
  const doc = q('#doc .sub')

  /* ── the chrome, built once ────────────────────────────────────────── */
  const top = document.createElement('div'); top.style.display = 'contents'
  top.innerHTML = `<div id="rail"></div><div id="battleDD" style="position:relative"></div><div id="seedline"></div>`
  const transport = document.createElement('div'); transport.id = 'transport'
  transport.innerHTML = `
      <button class="tbtn on" id="playBtn">&#10074;&#10074; Pause</button>
      <button class="tbtn" id="backBtn">&#9664; Step</button>
      <button class="tbtn" id="stepBtn">Step &#9654;</button>
      <button class="tbtn" id="turnBtn">Turn &#9654;</button>
      <input id="scrub" type="range" min="0" max="100" value="0">
      <button class="tbtn" id="speedBtn">&times;1</button>
      <button class="tbtn" id="bareBtn">units only</button>
      <button class="tbtn on" id="zoomBtn">1&times; native</button>
      <button class="tbtn" id="logBtn">log</button>`
  const logbox = document.createElement('div'); logbox.id = 'logbox'; logbox.style.display = 'none'

  function battleData(b) {
    const mapId = b.battle.seed.mapId
    const field = lib.fields[mapId]
    if (!field) throw new Error(`no field geometry for ${mapId} — generated/fields.json must hold every map`)
    return {
      field, units: lib.static.units, statuses: lib.static.statuses,
      artmap: lib.art.artmap, assets: lib.art.assets, glyphs: lib.glyphs,
      meta: { label: b.label, seed: b.battle.seed, engineCommit: b.battle.engineCommit, outcome: b.battle.outcome, turns: b.battle.turns },
    }
  }

  function load(i, extra) {
    const b = extra || lib.battles[i]
    if (viewer) viewer.dispose()
    cur = i
    viewer = mountBattleViewer(mountEl, battleData(b), {
      onCursor(c, e) { q('#scrub').value = String(c); markLog(c - 1) },
    })
    /* the harness's own pieces go into the component's slots */
    viewer._V.dom.slots.top.appendChild(top)
    viewer._V.dom.slots.transport.appendChild(transport)
    viewer._V.dom.slots.bottom.appendChild(logbox)
    const EV = b.battle.events
    const lines = buildLog(EV, lib.static.statuses, b.battle.turns)
    logbox.innerHTML = lines.map(l => `<div class="ln ${l.cls}" data-i="${l.i}">${l.t}</div>`).join('')
    q('#scrub').max = String(EV.length); q('#scrub').value = '0'
    q('#seedline').innerHTML =
      `seed <span class="mono">${b.battle.seed.replicate ?? '—'} · ${b.battle.seed.mapId} · ${b.battle.seed.enemyCount ?? b.battle.seed.scenarioId ?? ''}</span><br>` +
      `engine <span class="mono">${b.battle.engineCommit}</span> · ${EV.length} events`
    const bb = q('#battleBtn'); if (bb) bb.innerHTML = '⚔ ' + b.label + ' &#9662;'
    if (doc) doc.innerHTML = intro(b)
    q('#playBtn').textContent = '❚❚ Pause'; q('#playBtn').classList.add('on')
    viewer.push(EV)
    drawRail()
  }
  function intro(b) {
    const bt = b.battle
    return `Every frame folds out of <b>${bt.events.length} events</b> the engine emitted &mdash; seed ${bt.seed.replicate ?? bt.seed.scenarioId} on <code>${bt.seed.mapId}</code> (16&times;16), ` +
      `engine <code>${bt.engineCommit}</code>, ${OUTNAME[bt.outcome] || bt.outcome} in ${bt.turns} turns. Pick another battle from the dropdown, or drop an ` +
      `<code>export-battle.mts</code> file anywhere on the page. Nothing is scripted: HP, movement, statuses, downs and deaths are all read from the log.`
  }

  /* ── the unit rail: replay-only, cut from the game (ruled 2026-09-01) ── */
  function drawRail() {
    const rail = q('#rail'); if (!rail || !viewer) return
    const S = viewer.state, V = viewer._V
    rail.innerHTML = Object.values(S.U).map(u => {
      const a = V.data.ARTMAP[u.typeId] || V.data.ARTMAP['test-zombie']
      const acted = !!S.acted[u.id]
      return `<div class="railchip ${u.side}${u.id === S.activeId ? ' now' : ''}${acted ? ' done' : ''}${u.life === 'dead' ? ' gone' : ''}" data-i="${u.id}" title="${u.name}">
      <span class="railno">${u.life === 'dead' ? '✝' : acted ? '✓' : u.id === S.activeId ? '▸' : ''}</span>
      <img src="${V.data.ASSETS[a.token]}" alt=""></div>` }).join('')
    rail.querySelectorAll('.railchip').forEach(ch => ch.addEventListener('click', () => viewer.inspect(+ch.dataset.i)))
  }
  /* the rail follows the pump — a cheap hook on the viewer's own render */
  const railTimer = setInterval(() => { if (viewer && viewer.playing) drawRail() }, 400)

  function markLog(evIdx) {
    const rows = logbox.children; let target = null
    for (const r of rows) { if (+r.dataset.i <= evIdx) target = r; else break }
    for (const r of rows) r.classList.remove('cur')
    if (target) { target.classList.add('cur')
      const y = target.offsetTop - logbox.clientHeight / 2 + 10
      logbox.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }) }
  }

  /* ── the battle picker: a CUSTOM dropdown of plain divs — a native <select>
     cannot open inside the artifact pane (found 2026-08-27) ─────────────── */
  {
    const dd = top.querySelector('#battleDD')
    const btn = document.createElement('button'); btn.id = 'battleBtn'; btn.className = 'tbtn'
    btn.style.cssText = 'max-width:270px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
    const menu = document.createElement('div'); menu.id = 'battleMenu'
    menu.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:600;' +
      'min-width:290px;background:#14120e;border:1px solid #3a3323;border-radius:3px;box-shadow:0 10px 28px rgba(0,0,0,.65)'
    lib.battles.forEach((b, i) => {
      const o = document.createElement('div'); o.className = 'ddOpt'
      o.style.cssText = 'padding:9px 13px;cursor:pointer;font:600 13px \'Barlow Semi Condensed\',sans-serif;color:#d8cfae;border-bottom:1px solid #241f16;white-space:nowrap'
      o.textContent = b.label
      o.addEventListener('click', ev => { ev.stopPropagation(); menu.style.display = 'none'; load(i) })
      menu.appendChild(o)
    })
    btn.addEventListener('click', ev => { ev.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none' })
    document.addEventListener('click', () => { menu.style.display = 'none' })
    dd.appendChild(btn); dd.appendChild(menu)
  }

  /* ── transport ───────────────────────────────────────────────────────── */
  const T = s => transport.querySelector(s)
  const setPlayBtn = () => { T('#playBtn').textContent = viewer.playing ? '❚❚ Pause' : '▶ Play'; T('#playBtn').classList.toggle('on', viewer.playing) }
  T('#playBtn').addEventListener('click', () => { viewer.playing ? viewer.pause() : viewer.play(); setPlayBtn() })
  T('#stepBtn').addEventListener('click', () => { viewer.step(); setPlayBtn() })
  T('#backBtn').addEventListener('click', () => { viewer.pause(); viewer.seek(viewer.cursor - 1); setPlayBtn() })
  T('#turnBtn').addEventListener('click', () => {
    const EV = viewer.events
    for (let i = viewer.cursor; i < EV.length; i++) if (EV[i].type === 'turn.begin') { viewer.seek(i + 1); return }
    viewer.seek(EV.length) })
  T('#scrub').addEventListener('input', e => { viewer.pause(); viewer.seek(+e.target.value); setPlayBtn() })
  T('#speedBtn').addEventListener('click', e => {
    /* ruled 2026-08-26: a one-third speed for watching closely */
    const s = viewer._V.speed
    const n = s === 1 ? 2 : s === 2 ? 4 : s === 4 ? (1 / 3) : 1
    viewer.speed(n); e.target.textContent = n === 1 / 3 ? '×⅓' : '×' + n })
  T('#bareBtn').addEventListener('click', e => {
    const b = !viewer.view.bare; viewer.setBare(b)
    e.target.classList.toggle('on', b); e.target.textContent = b ? 'units only ✓' : 'units only' })
  T('#logBtn').addEventListener('click', e => {
    /* the log is a development affordance, not a game surface — it folds so the
       board keeps its height once the action bar takes the bottom (ruled 9.6) */
    const ab = viewer._V.dom.actionbar
    const on = logbox.style.display === 'none'
    logbox.style.display = on ? '' : 'none'; ab.style.display = on ? 'none' : ''
    e.target.classList.toggle('on', on)
    if (on) markLog(viewer.cursor - 1) })
  T('#zoomBtn').addEventListener('click', e => {
    const z = viewer.view.zoom === '1x' ? 'fit' : '1x'; viewer.setZoom(z)
    e.target.textContent = z === '1x' ? '1× native' : 'fit board'; e.target.classList.toggle('on', z === '1x') })

  /* ── drop an export on the page and it plays (plan §8.6) ─────────────── */
  document.addEventListener('dragover', e => { e.preventDefault() })
  document.addEventListener('drop', e => {
    e.preventDefault()
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return
    f.text().then(txt => {
      const b = JSON.parse(txt)
      if (!b || !Array.isArray(b.events) || !b.seed) throw new Error('not an export-battle.mts file: needs {seed, events, engineCommit, outcome, turns}')
      load(cur, { label: f.name.replace(/\.json$/, ''), battle: b })
    }).catch(err => { alert('Could not play that file: ' + err.message) })
  })
  /** the same path without the drag — for tests and for a future file button */
  function playExport(battle, label = 'dropped export') { load(cur, { label, battle }) }

  /* ── page fit: fill the window, capped at 2× (ruled 2026-08-27) ───────── */
  function fit() {
    const fw = q('#fitwrap'), sc = q('#screen'); if (!fw || !sc) return
    const s = Math.min(2, fw.clientWidth / 1920)
    sc.style.transform = `scale(${s})`; fw.style.height = (1080 * s) + 'px'
  }
  addEventListener('resize', fit); fit()

  load(0)
  return { load, playExport, get viewer() { return viewer }, dispose() { clearInterval(railTimer); if (viewer) viewer.dispose() } }
}
