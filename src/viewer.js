/* ══════════════════════════════════════════════════════════════════════════
   mountBattleViewer(el, data, opts) — the battle viewer as a COMPONENT
   (THREE-PACKAGES-PLAN §3). One battle per mount. Events arrive through
   push(), all at once (a replay) or as the engine emits them (the game); the
   pump plays them on its own clock. Nothing here decides anything: the fold
   (fold.js) is pure, the draw reads it, and the only thing that passes in is
   the event log plus read-only content.

   data = { field, units, statuses, attacks, abilities, layers, hexDist, artmap, assets, meta }
     field    — board geometry + terrain for this battle's map (generated/fields.json[mapId])
     units    — typeId -> unit sheet (generated/static.json.units)
     statuses — statusId -> display name
     attacks, abilities — the definition tables a unit.equipped grant resolves against (static.json)
     layers   — ground layer number -> name (static.json.layers); hexDist — the engine's hex
                distance tables keyed "WxH", each a Uint8Array of hexCount² (decoded by the host from static.json.hexDist)
     artmap   — typeId -> {token, card, aspect, height}; assets — file -> data URI / URL
     glyphs   — the icon outlines (generated/ra-glyphs.json); the sprite is added once per document
     meta     — {label, seed, engineCommit, outcome, turns} for the HUD; outcome/turns
                are the engine's stamps on the export, never derived here
   opts = { now?: () => ms, autoplay?: bool, onCursor?: (cursor, event) => void,
            onDrain?: () => void, onPlayState?: (playing) => void, onError?: (err) => void }

   Returns { push, seek, play, pause, speed, step, setZoom, setBare, inspect,
             peek, pan, render, dispose, get cursor/events/state/playing/view/invalid/
             speedValue/dom/art/assets, _V (the verifier's handle) }
   ══════════════════════════════════════════════════════════════════════════ */
import { createState, fold, foldTo } from './fold.js'
import { el, ensureKeyframes, buildGround, syncUnits, syncLayers, syncCorpses, syncAuras, drawAim, applyCam, playCues, clearFloats, initFX, traverse, ROOT_TRANSITION, bindCamera, drawEdges, cancelBeats } from './board.js'
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
  'stamina.gained': 60, 'staminaMax.lost': 60, 'statmod.added': 120, 'knockback.blocked': 160,
  /* 2026-09-03 */
  'unit.equipped': 0, 'encounter.begin': 0, 'encounter.objective': 0, 'encounter.wave': 900, 'encounter.roll': 0, 'unit.shunted': 200,
  'encounter.won': 900, 'encounter.lost': 900, 'move.stopped': 520, 'aoo.provoked': 700, 'aoo.skipped': 0, 'attack.cancelled': 120,
  'corpse.created': 0, 'corpse.removed': 380, 'unit.raised': 640, 'corpse.eaten': 300, 'unit.obliterated': 520,
  /* the Deathbed Fighting modal holds the game (ruled 2026-09-03 evening): DB_TOTAL + a breath */
  'deathbed.stood': 2800, 'deathbed.fell': 2800, 'deathbed.exhausted': 2800, 'hp.reset': 320, 'bleedout.accelerated': 320,
  'surge.checked': 0, 'surge.hit': 600, 'power.gained': 320, 'heal.boosted': 200, 'status.cancelled': 220, 'maxHp.gained': 240,
  'stamina.drained': 160, 'layer.painted': 0, 'layer.cancelled': 0, 'band.advanced': 900, 'night.fell': 1200, 'light.cast': 0,
  'ai.mode': 0, 'ai.hunts': 260, 'ai.override': 0, 'unit.grown': 0 }
/* a RUN of ground paints folds as one beat (night falls on every hex, the
   heroes light ~100 each phase): the pump paints them together and holds this */
const PAINT_RUN_MS = 260
/* beats that redraw even when their duration is zero */
const REDRAW = new Set(['attack.declared', 'damage.applied', 'life.dead', 'turn.begin', 'moved', 'heal.applied',
  'status.applied', 'life.downed', 'knocked', 'crit.effect', 'maxHp.lost',
  'unit.enter', 'unit.equipped', 'encounter.objective', 'unit.shunted', 'corpse.created', 'hp.reset', 'ai.mode', 'ai.hunts', 'surge.checked', 'aoo.skipped'])
/* the roster is seeded instantly — everything up to and including battle.begin
   never animates: the setup's unit.enters, their kit (unit.equipped), the
   encounter's title and objectives, the map (2026-09-03: was a fixed three) */
const SEED_END = 'battle.begin'

const TEMPLATE = `
  <div id="left">
    <div id="topbar">
      <div id="turnchip">Turn 1</div><div id="phasechip">Hero Phase</div><div id="encchip" style="display:none"></div><div id="powerchip" style="display:none" title="the enemy side's Power pool"></div>
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
    encchip: q('#encchip'), powerchip: q('#powerchip'),
    slots: { top: q('[data-slot=top]'), transport: q('[data-slot=transport]'), bottom: q('[data-slot=bottom]') } }
  /* THE BOARD IS THE MAP'S (engine 5603c40): width and height come from the
     field dump (and map.loaded says the same); nothing here assumes 16×16 */
  if (F.width == null || F.height == null) throw new Error('mountBattleViewer: the field carries no width/height — regenerate generated/fields.json at engine ≥ 5603c40')
  const LAYOUT = { W: F.hexW, H: F.hexH, COL: F.colStep, ROW: F.rowStep, ODD: F.oddOffset, COLS: F.width, ROWS: F.height, tilt: F.tilt }
  /* the hex distance table for THIS board — a hex id means nothing without its board (§10) */
  const boardKey = F.width + 'x' + F.height
  const DIST = data.hexDist && data.hexDist[boardKey]
  const V = {
    dom, now,
    data: { F, POS: F.hexes, LAYOUT, UD: data.units, SN: data.statuses, AT: data.attacks || {}, AB: data.abilities || {},
      LAYERS: data.layers || {}, DIST: DIST || null, BOARD: { width: F.width, height: F.height }, ARTMAP: data.artmap, ASSETS: data.assets },
    meta: data.meta || {},
    S: createState(), EV: [], cursor: 0,
    view: { inspectId: null, statsOpen: false, TRG_OPEN: new Set(), zoom: '1x', peek: false, bare: false, camF: { x: null, y: null } },
    layers: { ground: null, dyn: null, unitsL: null, UEL: new Map(), floatL: null, FLOAT_SLOTS: {} },
    /* every pending beat the board schedules — timers, stray nodes, the injury
       queue — so seek() and dispose() can drop them all (review 2026-09-03) */
    fx: { FX: null, timers: new Set(), nodes: new Set(), injuryQ: [] },
    playing: false, speed: 1, timer: null, invalid: null,
  }
  const ctx = () => ({ UD: V.data.UD, SN: V.data.SN })
  /* the board objects need the distance table; a host that forgot it is told (Law 1) */
  if (!V.data.DIST) throw new Error(`mountBattleViewer: data.hexDist has no table for the ${boardKey} board — decode generated/static.json .hexDist (the engine's per-board hex distance tables) and pass them`)
  /* the BEAT clock: wall time scaled by playback speed, so a row that lights
     for 1600 beat-ms lights for the same number of beats at ×⅓ and ×4. The fold
     stamps its `until`s from this, and the draw compares against it. */
  V.clock = () => now() * V.speed * 0.75

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
    /* the persistent board objects, coplanar with the ground and right after it */
    syncLayers(V); syncCorpses(V); syncAuras(V)
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
    /* the encounter's title (encounter.begin) and the enemy side's Power pool
       (power.gained) — both folded, both the component's to show */
    if (dom.encchip) { const enc = S.encounter
      dom.encchip.style.display = enc ? '' : 'none'; dom.encchip.textContent = enc ? enc.name : '' }
    if (dom.powerchip) { dom.powerchip.style.display = S.power == null ? 'none' : ''; dom.powerchip.textContent = S.power == null ? '' : 'Power ' + S.power }
  }

  /* ── the pump ────────────────────────────────────────────────────────── */
  function applyOne(e, visual) {
    const cues = fold(V.S, e, ctx(), V.clock())
    if (visual) playCues(V, cues)
    V.cursor++
    if (opts.onCursor) opts.onCursor(V.cursor, e)
    return cues
  }
  /* the forecast's MISS line expires on the beat clock; the pump owns that,
     never a draw call (review 2026-09-03: drawAim used to null S.AIM) */
  function expireAim() {
    const A = V.S.AIM
    if (A && A.expire && V.clock() > A.expire) { V.S.AIM = null; return true }
    return false
  }
  /* ONE TRAVERSAL PER MOVE (ruled 2026-09-01, VISUAL-BATTLE-UPDATES §1.1).
     The engine emits a `moved` per hex; the pump used to schedule each 125ms
     against a .26s CSS transition, so every step was interrupted at ~48% and
     the easing never resolved. Now a move.begin and the consecutive `moved`
     events of the same actor fold as ONE beat: every event is still folded in
     order (the state is exact at each), but the token travels the whole path
     under one easing, and the pump waits for the arrival. Pacing is the pump's
     to decide (Law 3); the log is untouched. Small events the engine emits
     mid-walk (a stamina spend, a status tick on entering terrain) fold inside
     the beat rather than cutting the walk in two. */
  const MID_WALK = new Set(['stamina.spent', 'status.applied', 'status.reduced', 'trigger.rolled', 'trigger.fired', 'ai.mode'])
  function stepMove(e) {
    const actor = e.actor, EV = V.EV
    const startHex = V.S.U[actor] ? V.S.U[actor].hex : null
    const path = []
    let cues = []
    if (e.type === 'move.begin') cues = cues.concat(applyOne(e, false))
    for (;;) {
      const x = EV[V.cursor]; if (!x) break
      if (x.type === 'moved' && x.actor === actor) { path.push(x.to); cues = cues.concat(applyOne(x, false)); continue }
      /* a mid-walk side event followed by more of this walk folds inside the beat */
      const y = EV[V.cursor + 1]
      if (MID_WALK.has(x.type) && y && y.type === 'moved' && y.actor === actor) { cues = cues.concat(applyOne(x, false)); continue }
      break
    }
    const hexes = path.length
    const dur = hexes ? Math.min(900, Math.max(320, 200 + 85 * hexes)) : 0
    playCues(V, cues)
    render()
    if (hexes && startHex != null) traverse(V, actor, startHex, path, dur)
    return dur + (hexes ? 60 : 0)                  // the arrival settle
  }
  /* ONE REPAINT PER RUN (2026-09-03): consecutive layer.painted/cancelled
     events fold together and the board redraws once — night.fell paints the
     whole board and each hero phase lights ~100; one beat each, not four seconds
     of 16ms ticks. Every event is still folded in order. */
  const PAINT = new Set(['layer.painted', 'layer.cancelled'])
  function stepPaint(e) {
    const EV = V.EV
    let cues = applyOne(e, false)
    while (EV[V.cursor] && PAINT.has(EV[V.cursor].type)) cues = cues.concat(applyOne(EV[V.cursor], false))
    playCues(V, cues); render()
    return PAINT_RUN_MS
  }
  function beat(e) {
    let d
    if (e.type === 'move.begin' || e.type === 'moved') d = stepMove(e)
    else if (PAINT.has(e.type)) d = stepPaint(e)
    else {
      applyOne(e, true)
      d = DUR[e.type] ?? 0
      if (d > 0 || REDRAW.has(e.type) || expireAim()) render()
    }
    return d
  }
  function step() {
    V.timer = null
    if (V.invalid) return
    if (V.cursor >= V.EV.length) {
      /* dry, not paused: a live game will push more; a replay's host hears onDrain */
      if (opts.onDrain) opts.onDrain()
      return
    }
    let d
    /* Law 9: a beat that throws stops the run and says so — never a silent
       freeze behind a "Pause" button */
    try { d = beat(V.EV[V.cursor]) }
    catch (err) { V.invalid = err; V.playing = false; if (opts.onPlayState) opts.onPlayState(false); if (opts.onError) opts.onError(err); throw err }
    /* Ruled 2026-08-26: standard speed is 25% slower; all speeds scale off it */
    if (V.playing) V.timer = setTimeout(step, Math.max(16, (d || 8) / (V.speed * 0.75)))
  }
  function play() { if (V.invalid) return; V.playing = true; if (V.timer) { clearTimeout(V.timer); V.timer = null } if (opts.onPlayState) opts.onPlayState(true); step() }
  function pause() { V.playing = false; if (V.timer) { clearTimeout(V.timer); V.timer = null } if (opts.onPlayState) opts.onPlayState(false) }
  function stepOnce() { pause(); if (V.invalid || V.cursor >= V.EV.length) return; beat(V.EV[V.cursor]) }
  function seek(n) {
    if (V.timer) { clearTimeout(V.timer); V.timer = null }
    V.cursor = Math.max(0, Math.min(n, V.EV.length))
    V.S = foldTo(V.EV, V.cursor, ctx())
    cancelBeats(V); clearFloats(V)
    V.view.inspectId = null                       // a click from before the scrub must not outrank the actor after it
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
      /* seed the roster instantly: everything through battle.begin (the setup's
         unit.enters, their kit, the encounter's title, the map). A log with no
         battle.begin seeds nothing and plays from the first event. */
      const end = V.EV.findIndex(e => e.type === SEED_END)
      while (V.cursor <= end) applyOne(V.EV[V.cursor], false)
      render()
      if (opts.autoplay !== false) play()
    } else if (V.playing && !V.timer && V.cursor < V.EV.length) step()   // the pump had run dry; it resumes
  }

  const api = {
    push, seek, play, pause, step: stepOnce, render,
    speed(x) { V.speed = x },
    setZoom(z) { V.view.zoom = z; applyCam(V); drawEdges(V) },
    setBare(b) { V.view.bare = b; render() },
    inspect(id) { V.view.inspectId = id; render() },
    get cursor() { return V.cursor }, get events() { return V.EV }, get state() { return V.S },
    get playing() { return V.playing }, get view() { return V.view }, get invalid() { return V.invalid },
    get speedValue() { return V.speed }, get dom() { return { slots: dom.slots, actionbar: dom.actionbar } }, get art() { return V.data.ARTMAP }, get assets() { return V.data.ASSETS },
    peek(on) { V.view.peek = !!on; applyCam(V); drawEdges(V) },
    pan(dx, dy) { applyCam(V, { pan: { x: dx, y: dy } }); drawEdges(V) },
    dispose() { pause(); cancelBeats(V); unbindCamera(); for (const E of V.layers.UEL.values()) if (E.walk) E.walk.cancel(); root.innerHTML = '' },
    _V: V,
  }
  /* first frame is already tilted; enable the half-speed camera glide after it */
  requestAnimationFrame(() => requestAnimationFrame(() => { dom.stage.style.transition = 'transform 1.1s cubic-bezier(.4,0,.2,1)' }))
  return api
}
