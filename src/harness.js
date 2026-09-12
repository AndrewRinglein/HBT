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
import { prepareBattleField, initialMapId } from './engine.ts'

/* the engine's six Outcome arms (core/types.ts, 2026-09-03), in words */
const OUTNAME = { heroClear: 'heroes win', wipe: 'heroes wiped', capped: 'capped',
  objectiveMet: 'objective met', objectiveFailed: 'objective failed', retreat: 'heroes retreated' }

/** lib = { static:{units,statuses,engineCommit}, fields:{mapId:field}, art:{artmap,assets},
           battles:[{label, battle}], stamp:{viewer, engine, built} } */
export function startHarness(mountEl, lib) {
  let viewer = null, cur = 0
  /* chrome state the harness owns and re-applies to every mounted viewer */
  const chrome = { speed: 1, bare: false, zoom: '1x', log: false }
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
    const mapId = initialMapId(b.battle.seed)
    const field = lib.fields[mapId]
    // Validate before disposing the current view. The component uses this same
    // engine-owned preparation for hosts outside the standalone page.
    prepareBattleField(b.battle.events, b.battle.seed, { mapId, field })
    return {
      field, fieldMapId: mapId, initialEvents: b.battle.events, units: lib.static.units, statuses: lib.static.statuses,
      actions: lib.static.actions, badges: lib.static.badges, layers: lib.static.layers,
      artmap: lib.art.artmap, assets: lib.art.assets, glyphs: lib.glyphs,
      meta: { label: b.label, seed: b.battle.seed, engineCommit: b.battle.engineCommit, outcome: b.battle.outcome, turns: b.battle.turns },
    }
  }

  function load(i, extra) {
    const b = extra || lib.battles[i]
    const data = battleData(b)
    if (viewer) viewer.dispose()
    cur = i
    viewer = mountBattleViewer(mountEl, data, {
      onCursor(c, e) { q('#scrub').value = String(c); markLog(c - 1); drawRail(); foot(c) },
      onPlayState: setPlayBtn,
      onDrain() { viewer.pause() },                       // a replay's end reads as paused
      onError(err) { q('#seedline').innerHTML += `<br><b style="color:#ff8f8f">RUN INVALID: ${err.message}</b>` },
    })
    /* the harness's own pieces go into the component's slots */
    viewer.dom.slots.top.appendChild(top)
    viewer.dom.slots.transport.appendChild(transport)
    viewer.dom.slots.bottom.appendChild(logbox)
    /* the chrome's state outlives the viewer; apply it to the new one */
    viewer.speed(chrome.speed); if (chrome.bare) viewer.setBare(true); if (chrome.zoom !== '1x') viewer.setZoom(chrome.zoom)
    viewer.dom.actionbar.style.display = chrome.log ? 'none' : ''; logbox.style.display = chrome.log ? '' : 'none'
    const EV = b.battle.events
    const lines = buildLog(EV, lib.static.statuses, b.battle.turns)
    logbox.innerHTML = lines.map(l => `<div class="ln ${l.cls}" data-i="${l.i}">${l.t}</div>`).join('')
    q('#scrub').max = String(EV.length); q('#scrub').value = '0'
    q('#seedline').innerHTML =
      `seed <span class="mono">${b.battle.seed.replicate ?? '—'} · ${initialMapId(b.battle.seed)} · ${b.battle.seed.enemyCount ?? b.battle.seed.scenarioId ?? ''}</span><br>` +
      `engine <span class="mono">${b.battle.engineCommit}</span> · ${EV.length} events`
    const bb = q('#battleBtn'); if (bb) bb.innerHTML = '⚔ ' + b.label + ' &#9662;'
    if (doc) doc.innerHTML = intro(b)
    viewer.push(EV)
    drawRail()
  }
  /* the event counter: replay knowledge, so it is the harness's line, in the
     panel's foot slot (Law 5 — review 2026-09-03) */
  function foot(c) {
    const el = mountEl.querySelector('[data-slot=foot]'); if (!el || !viewer) return
    const EV = viewer.events
    el.textContent = `event ${c} of ${EV.length} · seq ${EV[Math.min(c, EV.length - 1)]?.seq ?? '—'}`
  }
  function intro(b) {
    const bt = b.battle
    /* the encounter's title and its gaps are prose from encounter.begin — listed here, in the intro */
    const enc = bt.events.find(e => e.type === 'encounter.begin')
    const ml = bt.events.find(e => e.type === 'map.loaded') || {}
    const board = ml.width && ml.height ? `${ml.width}&times;${ml.height}` : '?&times;?'
    const deploy = ml.deploy ? `, heroes ${ml.deploy.hero}, enemies ${ml.deploy.enemy}` : ''
    const gaps = enc && enc.gaps && enc.gaps.length
      ? ` <details style="display:inline"><summary style="display:inline;cursor:pointer;color:#8b8778">${enc.gaps.length} gap${enc.gaps.length === 1 ? '' : 's'} the engine named</summary><ul style="margin:6px 0 0 18px;padding:0;color:#8b8778;font-size:12px">${enc.gaps.map(g => `<li>${g}</li>`).join('')}</ul></details>`
      : ''
    return (enc ? `<b>${enc.name}</b> &mdash; ` : '') +
      `every frame folds out of <b>${bt.events.length} events</b> the engine emitted &mdash; seed ${bt.seed.replicate ?? bt.seed.scenarioId} on <code>${initialMapId(bt.seed)}</code> (${board}${deploy}), ` +
      `engine <code>${bt.engineCommit}</code>, ${OUTNAME[bt.outcome] || bt.outcome} in ${bt.turns} turns.${gaps} Pick another battle from the dropdown, or drop an ` +
      `<code>export-battle.mts</code> file anywhere on the page. Nothing is scripted: HP, movement, statuses, downs and deaths are all read from the log.`
  }

  /* ── the unit rail: replay-only, cut from the game (ruled 2026-09-01) ── */
  function drawRail() {
    const rail = q('#rail'); if (!rail || !viewer) return
    const S = viewer.state, ART = viewer.art, ASSETS = viewer.assets
    rail.innerHTML = Object.values(S.U).map(u => {
      const a = ART[u.typeId] || ART._pending
      const acted = !!S.acted[u.id]
      return `<div class="railchip ${u.side}${u.id === S.activeId ? ' now' : ''}${acted ? ' done' : ''}${u.life === 'dead' ? ' gone' : ''}" data-i="${u.id}" title="${u.name}">
      <span class="railno">${u.life === 'dead' ? '✝' : acted ? '✓' : u.id === S.activeId ? '▸' : ''}</span>
      <img src="${ASSETS[a.token]}" alt=""></div>` }).join('')
    rail.querySelectorAll('.railchip').forEach(ch => ch.addEventListener('click', () => viewer.inspect(+ch.dataset.i)))
  }

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
  const setPlayBtn = (playing = viewer && viewer.playing) => { T('#playBtn').textContent = playing ? '❚❚ Pause' : '▶ Play'; T('#playBtn').classList.toggle('on', !!playing) }
  T('#playBtn').addEventListener('click', () => { viewer.playing ? viewer.pause() : viewer.play() })
  T('#stepBtn').addEventListener('click', () => { viewer.step() })
  T('#backBtn').addEventListener('click', () => { viewer.pause(); viewer.seek(viewer.cursor - 1) })
  T('#turnBtn').addEventListener('click', () => {
    const EV = viewer.events
    for (let i = viewer.cursor; i < EV.length; i++) if (EV[i].type === 'turn.begin') { viewer.seek(i + 1); return }
    viewer.seek(EV.length) })
  T('#scrub').addEventListener('input', e => { viewer.pause(); viewer.seek(+e.target.value) })
  T('#speedBtn').addEventListener('click', e => {
    /* ruled 2026-08-26: a one-third speed for watching closely */
    const s = chrome.speed
    const n = s === 1 ? 2 : s === 2 ? 4 : s === 4 ? (1 / 3) : 1
    chrome.speed = n; viewer.speed(n); e.target.textContent = n === 1 / 3 ? '×⅓' : '×' + n })
  T('#bareBtn').addEventListener('click', e => {
    const b = !chrome.bare; chrome.bare = b; viewer.setBare(b)
    e.target.classList.toggle('on', b); e.target.textContent = b ? 'units only ✓' : 'units only' })
  T('#logBtn').addEventListener('click', e => {
    /* the log is a development affordance, not a game surface — it folds so the
       board keeps its height once the action bar takes the bottom (ruled 9.6) */
    const ab = viewer.dom.actionbar
    const on = !chrome.log; chrome.log = on
    logbox.style.display = on ? '' : 'none'; ab.style.display = on ? 'none' : ''
    e.target.classList.toggle('on', on)
    if (on) markLog(viewer.cursor - 1) })
  T('#zoomBtn').addEventListener('click', e => {
    const z = chrome.zoom === '1x' ? 'fit' : '1x'; chrome.zoom = z; viewer.setZoom(z)
    e.target.textContent = z === '1x' ? '1× native' : 'fit board'; e.target.classList.toggle('on', z === '1x') })

  /* ── drop an export on the page and it plays (plan §8.6) ─────────────── */
  /** one export file → a mounted battle; the drop listener and the verifier both
      come through here, so the parse and the validation are tested */
  function playExportText(txt, name = 'dropped export') {
    const b = JSON.parse(txt)
    if (!b || !Array.isArray(b.events) || !b.seed) throw new Error('not an export-battle.mts file: needs seed and events')
    load(cur, { label: String(name).replace(/\.json$/, ''), battle: b })
    return b
  }
  const onDrop = e => {
    e.preventDefault()
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return
    f.text().then(txt => playExportText(txt, f.name)).catch(err => { alert('Could not play that file: ' + err.message) })
  }
  document.addEventListener('dragover', e => { e.preventDefault() })
  document.addEventListener('drop', onDrop)
  function playExport(battle, label = 'dropped export') { load(cur, { label, battle }) }

  /* ── page fit: fill the window, capped at 2× (ruled 2026-08-27) ───────── */
  function fit() {
    const fw = q('#fitwrap'), sc = q('#screen'); if (!fw || !sc) return
    const s = Math.min(2, fw.clientWidth / 1920)
    sc.style.transform = `scale(${s})`; fw.style.height = (1080 * s) + 'px'
  }
  addEventListener('resize', fit); fit()

  load(0)
  return { load, playExport, playExportText, onDrop, battleData, get viewer() { return viewer }, dispose() { document.removeEventListener('drop', onDrop); if (viewer) viewer.dispose() } }
}
