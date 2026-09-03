/* ══════════════════════════════════════════════════════════════════════════
   mountBattleViewer(el, data, opts) — the battle viewer as a COMPONENT
   (THREE-PACKAGES-PLAN §3). One battle per mount. Events arrive through
   push(), all at once (a replay) or as the engine emits them (the game); the
   pump plays them on its own clock. Nothing here decides anything: the fold
   (fold.js) is pure, the draw reads it, and the only thing that passes in is
   the event log plus read-only content.

   data = { field, units, statuses, artmap, assets, meta }
     field    — board geometry + terrain for this battle's map (generated/fields.json[mapId])
     units    — typeId -> unit sheet (generated/static.json.units)
     statuses — statusId -> display name
     artmap   — typeId -> {token, card, aspect, height}; assets — file -> data URI / URL
     glyphs   — the icon outlines (generated/ra-glyphs.json); the sprite is added once per document
     meta     — {label, seed, engineCommit, outcome, turns} for the HUD; outcome/turns
                are the engine's stamps on the export, never derived here
   opts = { now?: () => ms, autoplay?: bool, onCursor?: (cursor, event) => void }

   Returns { push, seek, play, pause, speed, step, setZoom, setBare, inspect,
             peek, pan, render, dispose, get cursor, get events, get state, _V }
   ══════════════════════════════════════════════════════════════════════════ */
import { createState, fold, foldTo } from './fold.js'
import { el, ensureKeyframes, buildGround, syncUnits, drawAim, applyCam, playCues, clearFloats, initFX, traverse, ROOT_TRANSITION, bindCamera, drawEdges } from './board.js'
import { drawPanel } from './panel.js'
import { drawBar, drawStam } from './actionbar.js'
import { spriteHTML } from './icons.js'

/* ── DUR: the clock lives here; events carry order, never duration ──────── */
export const DUR = { 'unit.enter': 0, 'turn.begin': 420, 'phase.begin': 120, 'moved': 125,
  'move.begin': 60, 'attack.declared': 900, 'attack.hit': 250, 'attack.miss': 700,
  'damage.applied': 650, 'life.downed': 420, 'life.dead': 520, 'power.used': 60,
  'status.applied': 200, 'status.reduced': 60, 'status.expired': 60, 'activation.idle': 200,
  'heal.applied': 260, 'activation.begin': 180, 'battle.end': 600, 'bleedout.tick': 140,
  'knocked': 340, 'crit.branch': 260, 'crit.effect': 620, 'maxHp.lost': 240, 'power.hit': 180,
  'stamina.gained': 60, 'staminaMax.lost': 60, 'statmod.added': 120, 'knockback.blocked': 160 }
/* beats that redraw even when their duration is zero */
const REDRAW = new Set(['attack.declared', 'damage.applied', 'life.dead', 'turn.begin', 'moved', 'heal.applied',
  'status.applied', 'life.downed', 'knocked', 'crit.effect', 'maxHp.lost'])
/* the roster is seeded instantly — these never animate */
const SEED = new Set(['unit.enter', 'map.loaded', 'battle.begin'])

const TEMPLATE = `
  <div id="left">
    <div id="topbar">
      <div id="turnchip">Turn 1</div><div id="phasechip">Hero Phase</div>
      <div data-slot="top" style="display:contents"></div>
    </div>
    <div id="boardwrap"><div id="stage"></div>
      <canvas id="vfxC" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:35"></canvas>
      <div id="camHud" class="mono" style="position:absolute;left:14px;bottom:10px;z-index:50;font-size:11px;color:#8b8778;background:rgba(8,9,11,.72);padding:3px 9px;border:1px solid #2a251d;border-radius:2px;pointer-events:none"></div></div>
    <div data-slot="transport" style="display:contents"></div>
    <div id="stambar"></div>
    <div id="actionbar"></div>
    <div data-slot="bottom" style="display:contents"></div>
  </div>
  <div id="panel"></div>`

export function mountBattleViewer(root, data, opts = {}) {
  const F = data.field
  const now = opts.now || (() => Date.now())
  root.innerHTML = TEMPLATE
  const q = s => root.querySelector(s)
  const dom = { root, stage: q('#stage'), canvas: q('#vfxC'), hud: q('#camHud'), panel: q('#panel'),
    stambar: q('#stambar'), actionbar: q('#actionbar'), turnchip: q('#turnchip'), phasechip: q('#phasechip'),
    slots: { top: q('[data-slot=top]'), transport: q('[data-slot=transport]'), bottom: q('[data-slot=bottom]') } }
  const LAYOUT = { W: F.hexW, H: F.hexH, COL: F.colStep, ROW: F.rowStep, ODD: F.oddOffset, COLS: 16, ROWS: 16, tilt: F.tilt }
  const V = {
    dom, now,
    data: { F, POS: F.hexes, LAYOUT, UD: data.units, SN: data.statuses, ARTMAP: data.artmap, ASSETS: data.assets },
    meta: data.meta || {},
    S: createState(), EV: [], cursor: 0,
    view: { inspectId: null, statsOpen: false, TRG_OPEN: new Set(), zoom: '1x', peek: false, bare: false, camF: { x: null, y: null } },
    layers: { ground: null, dyn: null, unitsL: null, UEL: new Map(), floatL: null, FLOAT_SLOTS: {} },
    fx: { FX: null },
    playing: false, speed: 1, timer: null,
  }
  const ctx = () => ({ UD: V.data.UD, SN: V.data.SN })

  /* the stage is sized and centred once; without this it is a zero-size point
     and rotateX pivots around the wrong origin (the quarter-screen bug) */
  dom.stage.style.width = F.w + 'px'; dom.stage.style.height = F.h + 'px'
  dom.stage.style.marginLeft = (-F.w / 2) + 'px'; dom.stage.style.marginTop = (-F.h / 2) + 'px'
  dom.stage.style.transition = 'none'                // born TILTED — the glide starts after first paint
  ensureKeyframes()
  /* the icon sprite is the component's: one per document, whoever mounts */
  if (data.glyphs && !document.getElementById('raSprite')) document.body.insertAdjacentHTML('beforeend', spriteHTML(data.glyphs))
  initFX(V)
  const unbindCamera = bindCamera(V)

  function render() {
    if (!V.layers.ground) buildGround(V)
    drawAim(V)
    syncUnits(V)
    drawPanel(V); drawBar(V); drawStam(V); applyCam(V); drawEdges(V); drawChips()
  }
  V.render = render
  V.playCues = cues => playCues(V, cues)      // the verifier injects synthetic cues here
  function drawChips() {
    const S = V.S
    if (dom.turnchip) dom.turnchip.textContent = 'Turn ' + Math.max(1, S.turnNo)
    if (dom.phasechip) {
      dom.phasechip.textContent = S.phase === 'enemy' ? 'Enemy Phase' : 'Hero Phase'
      dom.phasechip.className = S.phase === 'enemy' ? 'enemy' : ''
      if (S.outcome) { dom.phasechip.textContent = S.outcome.toUpperCase(); dom.phasechip.className = 'enemy' }
    }
  }

  /* ── the pump ────────────────────────────────────────────────────────── */
  function applyOne(e, visual) {
    const cues = fold(V.S, e, ctx(), now())
    if (visual) playCues(V, cues)
    V.cursor++
    if (opts.onCursor) opts.onCursor(V.cursor, e)
    return cues
  }
  /* ONE TRAVERSAL PER MOVE (ruled 2026-09-01, VISUAL-BATTLE-UPDATES §1.1).
     The engine emits a `moved` per hex; the pump used to schedule each 125ms
     against a .26s CSS transition, so every step was interrupted at ~48% and
     the easing never resolved. Now a move.begin and the consecutive `moved`
     events of the same actor fold as ONE beat: every event is still folded in
     order (the state is exact at each), but the token travels the whole path
     under one easing, and the pump waits for the arrival. Pacing is the pump's
     to decide (Law 3); the log is untouched. */
  function stepMove(e) {
    const actor = e.actor, EV = V.EV
    const startHex = V.S.U[actor] ? V.S.U[actor].hex : null
    const path = []
    let cues = []
    if (e.type === 'move.begin') cues = cues.concat(applyOne(e, false))
    while (V.cursor < EV.length && EV[V.cursor].type === 'moved' && EV[V.cursor].actor === actor) {
      path.push(EV[V.cursor].to)
      cues = cues.concat(applyOne(EV[V.cursor], false))
    }
    const hexes = path.length
    const dur = hexes ? Math.min(900, Math.max(320, 200 + 85 * hexes)) : 0
    playCues(V, cues.filter(c => c.k !== 'walk'))
    render()
    if (hexes && startHex != null) traverse(V, actor, startHex, path, dur)
    return dur + (hexes ? 60 : 0)                  // the arrival settle
  }
  function step() {
    if (V.cursor >= V.EV.length) { pause(); return }
    const e = V.EV[V.cursor]
    let d
    if (e.type === 'move.begin' || e.type === 'moved') d = stepMove(e)
    else {
      applyOne(e, true)
      d = DUR[e.type] ?? 0
      if (d > 0 || REDRAW.has(e.type)) render()
    }
    /* Ruled 2026-08-26: standard speed is 25% slower; all speeds scale off it */
    if (V.playing) V.timer = setTimeout(step, Math.max(16, (d || 8) / (V.speed * 0.75)))
  }
  function play() { V.playing = true; clearTimeout(V.timer); step() }
  function pause() { V.playing = false; clearTimeout(V.timer) }
  function stepOnce() { pause(); if (V.cursor >= V.EV.length) return
    const e = V.EV[V.cursor]
    if (e.type === 'move.begin' || e.type === 'moved') stepMove(e); else { applyOne(e, true); render() } }
  function seek(n) {
    clearTimeout(V.timer)
    V.cursor = Math.max(0, Math.min(n, V.EV.length))
    V.S = foldTo(V.EV, V.cursor, ctx())
    clearFloats(V)
    for (const E of V.layers.UEL.values()) { if (E.walk) { E.walk.cancel(); E.walk = null } E.root.style.transition = 'none' }
    render()
    requestAnimationFrame(() => { for (const E of V.layers.UEL.values()) E.root.style.transition = ROOT_TRANSITION })
    if (opts.onCursor) opts.onCursor(V.cursor, V.EV[V.cursor - 1] || null)
    if (V.playing) V.timer = setTimeout(step, 120)
  }
  function push(events) {
    const first = V.EV.length === 0
    for (const e of events) V.EV.push(e)
    if (first) {
      /* seed the roster instantly: unit.enter + map.loaded + battle.begin */
      while (V.cursor < V.EV.length && SEED.has(V.EV[V.cursor].type)) applyOne(V.EV[V.cursor], false)
      render()
      if (opts.autoplay !== false) play()
    } else if (V.playing && V.cursor < V.EV.length && !V.timer) step()
  }

  const api = {
    push, seek, play, pause, step: stepOnce, render,
    speed(x) { V.speed = x },
    setZoom(z) { V.view.zoom = z; applyCam(V) },
    setBare(b) { V.view.bare = b; render() },
    inspect(id) { V.view.inspectId = id; render() },
    get cursor() { return V.cursor }, get events() { return V.EV }, get state() { return V.S },
    get playing() { return V.playing }, get view() { return V.view },
    peek(on) { V.view.peek = !!on; applyCam(V); drawEdges(V) },
    pan(dx, dy) { applyCam(V, { pan: { x: dx, y: dy } }); drawEdges(V) },
    dispose() { pause(); unbindCamera(); root.innerHTML = '' },
    _V: V,
  }
  /* first frame is already tilted; enable the half-speed camera glide after it */
  requestAnimationFrame(() => requestAnimationFrame(() => { dom.stage.style.transition = 'transform 1.1s cubic-bezier(.4,0,.2,1)' }))
  return api
}
