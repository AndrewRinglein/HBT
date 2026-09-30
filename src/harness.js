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
import {prepareAtlasBinding} from './atlas.js'

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
  top.innerHTML = `<div id="rail"></div><div id="seedline"></div>`
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
    const prepared = prepareBattleField(b.battle.events, b.battle.seed, { mapId, field })
    prepareAtlasBinding(b.battle.atlasScene, lib.atlas, prepared.field, b.battle.events.find(e=>e.type==='map.loaded'))
    return {
      field, fieldMapId: mapId, initialEvents: b.battle.events, units: lib.static.units, statuses: lib.static.statuses, absorbingStatuses: lib.static.absorbingStatuses,
      actions: lib.static.actions, badges: lib.static.badges, layers: lib.static.layers,
      artmap: lib.art.artmap, assets: lib.art.assets, glyphs: lib.glyphs,
      atlasScene: b.battle.atlasScene, atlasCatalog: lib.atlas,
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
    updatePicker(extra ? -1 : i, b.label)
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

  /* The battle picker stays outside the scaled/clipped scene. A custom
     listbox also works where the artifact host cannot open native selects. */
  const dd=document.createElement('div');dd.id='battleDD'
  const label=document.createElement('label');label.id='battleLabel';label.textContent='Battle';label.setAttribute('for','battleBtn')
  const btn=document.createElement('button');btn.id='battleBtn';btn.setAttribute('role','combobox');btn.setAttribute('aria-labelledby','battleLabel');btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-controls','battleMenu');btn.setAttribute('aria-expanded','false')
  const menu=document.createElement('div');menu.id='battleMenu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Battles');menu.style.display='none'
  dd.appendChild(label);dd.appendChild(btn);dd.appendChild(menu)
  const host=q('#doc')||mountEl.parentNode||document.body;host.appendChild(dd)
  let focused=0,selected=0
  const options=lib.battles.map((b,i)=>{
    const o=document.createElement('div');o.className='ddOpt';o.id='battleOption'+i;o.setAttribute('role','option');o.setAttribute('aria-selected','false');o.textContent=b.label
    o.addEventListener('click',e=>{e.stopPropagation();choose(i)})
    menu.appendChild(o);return o
  })
  function closePicker(){menu.style.display='none';btn.setAttribute('aria-expanded','false');btn.removeAttribute?.('aria-activedescendant')}
  function openPicker(index=selected<0?0:selected){menu.style.display='block';btn.setAttribute('aria-expanded','true');focusOption(index)}
  function focusOption(index){focused=Math.max(0,Math.min(options.length-1,index));options.forEach((o,i)=>o.classList.toggle('focused',i===focused));btn.setAttribute('aria-activedescendant',options[focused].id);options[focused].scrollIntoView({block:'nearest'})}
  function choose(index){load(index);closePicker();btn.focus()}
  function updatePicker(index,title){selected=index;btn.textContent=(index<0?'Imported · ':'')+title+' ▾';options.forEach((o,i)=>o.setAttribute('aria-selected',String(index===i)))}
  const pickerKey=e=>{
    const open=menu.style.display!=='none'
    if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(e.key)){e.preventDefault();e.stopPropagation()}
    else if(e.key==='Tab'){closePicker();return}else return
    if(e.key==='Escape'){closePicker();return}
    if(e.key==='Home'){openPicker(0);return}
    if(e.key==='End'){openPicker(options.length-1);return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!open)openPicker();else focusOption(focused+(e.key==='ArrowDown'?1:-1));return}
    if(open)choose(focused);else openPicker()
  }
  const outside=e=>{if(!dd.contains(e.target))closePicker()}
  btn.addEventListener('keydown',pickerKey)
  btn.addEventListener('click',e=>{e.stopPropagation();menu.style.display==='none'?openPicker():closePicker()})
  document.addEventListener('click',outside)

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

  const atlasLink = document.createElement('a')
  atlasLink.id = 'atlasLink'; atlasLink.className = 'atlas-link'
  atlasLink.setAttribute('href', '../assets/battle-atlas/index.html')
  atlasLink.setAttribute('target', '_blank'); atlasLink.setAttribute('rel', 'noopener')
  atlasLink.textContent = 'Open Battle Atlas maps ↗'
  ;(q('#doc') || mountEl.parentNode).appendChild(atlasLink)
  /* the page's address may name the battle to open — its map or its scenario, e.g.
     BATTLE-VIEWER.html#map.opening.orphanage (viewer.painted-board: battle 1 opens on its painted scene) */
  const hash = typeof location !== 'undefined' && location && typeof location.hash === 'string' ? decodeURIComponent(location.hash.slice(1)) : ''
  const named = hash ? lib.battles.findIndex(b => b.battle.seed && (b.battle.seed.mapId === hash || b.battle.seed.scenarioId === hash)) : -1
  load(named >= 0 ? named : 0)
  return { load, playExport, playExportText, onDrop, battleData, get viewer() { return viewer }, dispose() { atlasLink.remove(); dd.remove(); document.removeEventListener('click',outside); document.removeEventListener('drop', onDrop); if (viewer) viewer.dispose() } }
}
