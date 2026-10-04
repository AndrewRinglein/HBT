/* ══════════════════════════════════════════════════════════════════════════
   mountBattleViewer(el, data, opts) — the battle viewer as a COMPONENT
   (THREE-PACKAGES-PLAN §3). One battle per mount. Events arrive through
   push(), all at once (a replay) or as the engine emits them (the game); the
   pump plays them on its own clock. Nothing here decides anything: the fold
   (fold.js) is pure, the draw reads it, and the only thing that passes in is
   the event log plus read-only content.

   data = { initialEvents, field?, fieldMapId?, units, statuses, actions, layers, artmap, assets, meta }
     initialEvents — initial engine facts, inspected before DOM mounting and never consumed
     field/fieldMapId — identity-bound registry ground, only when facts omit exact terrain
     units    — typeId -> unit sheet (generated/static.json.units)
     statuses — statusId -> display name
     actions  — the ONE action registry a grant of any kind resolves against (static.json)
     badges   — badgeId -> {name, statModifiers, grants, flags}
     layers   — ground layer number -> name (static.json.layers)
     actionKinds — actionId -> 'charge'|'attack'|'move'|'burst'|'power', the engine's classification (static.json)
     statusRows  — statusId -> {flags, tickDamageType?, standAction?}, each status's behaviour (static.json)
     items — itemId -> {name, itemClass, hands, slots, grants, abilities, mods}, each item's own row (static.json), and
                   hands — the engine's count of hands: the panel's items section (viewer.panel-lists-items); a host that
                   hands neither gets the items by their ids, with no empty hand drawn
     itemClasses — itemId -> the engine's item class (weapon, shield, …; static.json): a power a held shield grants raises the
                   shield (viewer.shield-guard-motion); a host that hands none gets no raised shield
     layerStatus · terrainApplies — what each painted layer and ground applies (static.json)
     terrainNames — terrain id -> the ground's name, for the hex tooltip (static.json; viewer.hex-tooltip)
     unitLines — unit type id -> the kind's player-facing sentence, the content's row (static.json; viewer.new-enemy-ability-line):
                 the line under the name in the "New enemy" notice; a kind with none shows its name alone
     artmap   — typeId -> {token, card, aspect, height, after?}; assets — file -> data URI / URL
                (after: affliction badgeId -> the hero's after card, viewer.affliction-pop-up; a hero with none has no entry)
     glyphs   — the icon outlines (generated/ra-glyphs.json); the sprite is added once per document
     meta     — {label, seed, engineCommit, outcome, turns} for the HUD; outcome/turns
                are the engine's stamps on the export, never derived here
   opts = { now?: () => ms, autoplay?: bool, onCursor?: (cursor, event) => void,
            onHexClick?: (hex) => boolean, onDrain?: () => void, onPlayState?: (playing) => void, onError?: (err) => void,
            onPlay?: (input) => boolean, look?: string[], newEnemies?: string[], onNewEnemy?: (typeId) => void,
            enemiesTogether?: bool }
     enemiesTogether (viewer.enemy-type-moves-together) — while the pump plays an Enemy Phase the enemies of one unit type are
            shown moving at the same time, then that type's attacks, then the next type (grouping.js). Display only: the
            log is untouched and the board ends on the engine's own state. Default true; false plays one at a time.
     newEnemies (viewer.new-enemy-notice) — the unit kinds (type ids) the host wants announced in this battle: the first
            time a unit of such a kind is on the board the view shows it and a gold notice reads "New enemy" with the unit
            sheet's name beneath; onNewEnemy hears each kind as its notice goes up, once. What is new is the host's to say
            (the run remembers what was met); with none handed — the replay page — nothing is announced.
     look (viewer.characters-stand-out) — the names of the looks shown (stand-out.js LOOKS: size, shadows, ground, rim,
            disc), exactly those; resolved once, here, into the numbers the camera, the bodies and the scene read. Absent:
            the default pair, size and shadows (viewer.size-and-shadows-default); an empty list: none.
     onPlay (viewer.play-input) — while the host has handed plan facts over (setPlay), what the mouse does on the board
            is offered to it: {kind:'point', hex|null} · {kind:'hex', hex} · {kind:'unit', id, hex} · {kind:'back'}
            (a right-click that did not drag, or Esc) · {kind:'slot', actionId, unit} (an action-bar row). The host
            answers from the engine and calls setPlay again; the viewer draws and never decides.
            viewer.play-chrome: a host that plays also gets the play chrome (src/chrome.js) — End Turn and its pop-up,
            End activation, 2× speed, the battle log — whose clicks come as {kind:'end-turn'} · {kind:'end-activation'}.
            viewer.switch-hero-asks: the switch pop-up, while the facts carry ask — its answer comes as {kind:'answer', yes}.
            viewer.auto-end-no-actions: notice(text) puts the host's words on the board for a time; it blocks nothing.

   Returns { setTargeting, setPlay, notice, push, seek, play, pause, speed, step, setZoom, setBare, inspect,
             peek, pan, render, dispose, get cursor/events/state/playing/view/invalid/
             speedValue/dom/art/assets, _V (the verifier's handle) }
   ══════════════════════════════════════════════════════════════════════════ */
import { targetingFacts } from './targeting.js'
import { playFacts } from './play.js'
import { mountOverlays } from './overlays.js'
import { POLICY as CAM_POLICY, ARRIVAL_SIDES } from './camera-policy.js'
import { screenOf as cameraScreenOf } from './camera3d.js'
import { mountPlayChrome } from './chrome.js'
import { opportunityPose, animateOpportunityStep, OPPORTUNITY_STEP_MS, feetOf, heightOf } from './board.js'
import { terrainLayer } from './terrain3d.js'
import { bundledModels } from './models.js'
import {prepareAtlasBinding} from './atlas.js'
import {paintedBinding, bundledPainted, paintedToCSS} from './painted.js'
import {worldToCSS} from './terrain-scene.js'
import {flatAffine} from './camera3d.js'
import { createState, fold, foldTo } from './fold.js'
import { el, ensureKeyframes, buildGround, syncProps, syncUnits, syncLayers, syncFalls, syncCorpses, syncAuras, drawAim, drawTargeting, syncPlayInput, drawPlay, applyCam, playCues, clearFloats, initFX, traverse, ROOT_TRANSITION, bindCamera, drawEdges, cancelBeats, turnCam, resetCam, homeCam, stopGlide, cameraView, cameraState, centreOn, revealPan, revealHex, clickBubble, isoK, boardAffine, GLIDE_MS } from './board.js'
import { drawPanel, drawPortrait } from './panel.js'
import { closeAffliction } from './affliction.js'
import { drawRail } from './rail.js'
import { pointHexTip, drawHexTip, hexTipOf, groundAt } from './hextip.js'
import { drawBar, drawStam } from './actionbar.js'
import { spriteHTML } from './icons.js'
import { prepareBattleField } from './engine.ts'
import { standOut } from './stand-out.js'
import { planEnemyPhase, prefixShown } from './grouping.js'

/* ── DUR: the clock lives here; events carry order, never duration ──────── */
export const DUR = { 'burst.declared': 900, 'burst.shielded': 300, 'burst.struck': 160, 'unit.enter': 0, 'turn.begin': 420, 'phase.begin': 120, 'moved': 600,
  'move.begin': 60, 'attack.declared': 900, 'attack.hit': 250, 'attack.miss': 700,
  'damage.applied': 650, 'life.downed': 420, 'life.dead': 520, 'power.used': 60,
  'status.applied': 200, 'status.reduced': 60, 'status.expired': 60, 'activation.idle': 200,
  'heal.applied': 260, 'activation.begin': 180, 'battle.end': 600, 'bleedout.tick': 140,
  'knocked': 340, 'crit.branch': 260, 'crit.effect': 620, 'maxHp.lost': 240, 'power.hit': 180,
  'stamina.gained': 60, 'staminaMax.lost': 60, 'statmod.added': 120, 'knockback.blocked': 160,
  /* 2026-09-03 */
  'unit.equipped': 0, 'loadout.swapped': 360, 'encounter.begin': 0, 'encounter.objective': 0, 'encounter.wave': 900, 'encounter.roll': 0, 'unit.shunted': 200,
  'encounter.won': 900, 'encounter.lost': 900, 'move.stopped': 520, 'aoo.provoked': 700, 'aoo.skipped': 0, 'attack.cancelled': 120,
  'corpse.created': 0, 'corpse.removed': 380, 'unit.raised': 640, 'corpse.eaten': 300, 'unit.obliterated': 520,
  /* the Deathbed Fighting modal holds the game (ruled 2026-09-03 evening): DB_TOTAL + a breath */
  'deathbed.stood': 2800, 'deathbed.fell': 2800, 'deathbed.none': 2800, 'hp.reset': 320, 'bleedout.accelerated': 320,
  'unit.badged': 0, 'unit.modified': 0, 'badge.gained': 420, 'badge.held': 0, 'power.exhausted': 160, 'charge.spent': 0, 'maxstamina.gained': 200,
  'surge.checked': 0, 'surge.hit': 600, 'power.gained': 320, 'heal.boosted': 200, 'status.cancelled': 220, 'maxHp.gained': 240,
  'stamina.drained': 160, 'layer.painted': 0, 'layer.cancelled': 0, 'band.advanced': 900, 'night.fell': 1200, 'light.cast': 0,
  'ai.mode': 0, 'ai.hunts': 260, 'ai.override': 0, 'unit.grown': 0,
  /* viewer.area-fall-warning (2026-10-04): the mark holds long enough to be seen; the landing a beat before its paint */
  'area.marked': 1200, 'area.landed': 420,
  /* R4 (2026-09-23): a KDB check that did not fire is silent (0); a fired one holds its word (beat(), as block.rolled) */
  'kdb.rolled': 0,
  /* R5 (2026-09-24): the Thorns word holds a short beat before its damage line */
  'thorns.reflected': 360,
  /* R7 (2026-09-24): a blow at a prop's hex holds like a short swing; each step and the fall hold a beat */
  'prop.struck': 520, 'prop.damaged': 260, 'prop.destroyed': 420 }
/* a RUN of ground paints folds as one beat (night falls on every hex, the
   heroes light ~100 each phase): the pump paints them together and holds this */
const PAINT_RUN_MS = 260
/* beats that redraw even when their duration is zero */
const REDRAW = new Set(['burst.declared', 'burst.shielded', 'burst.struck', 'attack.declared', 'damage.applied', 'life.dead', 'turn.begin', 'moved', 'heal.applied',
  'status.applied', 'life.downed', 'knocked', 'crit.effect', 'maxHp.lost',
  'unit.enter', 'unit.equipped', 'encounter.objective', 'unit.shunted', 'corpse.created', 'hp.reset', 'ai.mode', 'ai.hunts', 'surge.checked', 'aoo.skipped',
  'badge.gained', 'unit.badged', 'unit.modified', 'move.stopped'])
/* the roster is seeded instantly — everything up to and including battle.begin
   never animates: the setup's unit.enters, their kit (unit.equipped), the
   encounter's title and objectives, the map (2026-09-03: was a fixed three) */
const SEED_END = 'battle.begin'

// Exact data equality, including every field, without imposing object-key order.
// Incoming facts have already been detached; array order remains significant.
function sameFact(a, b) {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && a.length !== b.length) return false
  const ak = Object.keys(a), bk = Object.keys(b)
  return ak.length === bk.length && ak.every(k => Object.hasOwn(b, k) && sameFact(a[k], b[k]))
}

const TEMPLATE = `
  <div id="left">
    <div id="topbar">
      <div id="turnchip">Turn 1</div><div id="phasechip">Hero Phase</div><div id="encchip" style="display:none"></div><div id="powerchip" style="display:none" title="the enemy side's Power pool"></div>
      <div id="rail" role="toolbar" aria-label="Units"></div>
      <div data-slot="top" style="display:contents"></div>
    </div>
    <div id="boardwrap"><div id="stage"></div><div id="stageTop"></div>
      <canvas id="vfxC" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:35"></canvas>
      <div id="camHud" class="mono" style="position:absolute;left:10px;bottom:10px;z-index:50;font-size:11px;color:#8b8778;background:rgba(8,9,11,.72);padding:3px 9px;border:1px solid #2a251d;border-radius:2px;pointer-events:none"></div>
      <div id="playNote" role="status" style="display:none"></div></div>
    <div data-slot="transport" style="display:contents"></div>
    <div id="stambar"></div>
    <div id="barrow"><div id="unitPortrait" aria-hidden="true" style="display:none"><img alt=""></div><div id="actionbar"></div></div>
    <div data-slot="bottom" style="display:contents"></div>
  </div>
  <div id="panel"></div>`

export function mountBattleViewer(root, data, opts = {}) {
  /* viewer.characters-stand-out: the looks the host named, as numbers — a name that is no look is refused before the host's DOM is touched */
  const look = standOut(opts.look)
  // Inspect initial facts before touching the host DOM; every event still folds.
  const prepared = prepareBattleField(data.initialEvents, data.meta?.seed, { mapId: data.fieldMapId, field: data.field })
  const F = prepared.field
  const initialMap = structuredClone(data.initialEvents.find(e => e.type === 'map.loaded'))
  /* the board's scene: an Atlas layout the export binds, else the painted scene of the map it names
     (viewer.painted-board — map.opening.*; a host may hand its own pack as data.paintedScenes) */
  const atlas = prepareAtlasBinding(data.atlasScene, data.atlasCatalog, F, data.initialEvents.find(e=>e.type==='map.loaded'))
    ?? paintedBinding(initialMap && initialMap.mapId, F, data.paintedScenes ?? bundledPainted)
  let pushedMap = false
  const now = opts.now || (typeof performance !== 'undefined' && typeof performance.now === 'function' ? () => performance.now() : () => Date.now())
  root.innerHTML = TEMPLATE
  const q = s => root.querySelector(s)
  const dom = { root, stage: q('#stage'), stageTop: q('#stageTop'), canvas: q('#vfxC'), hud: q('#camHud'), portrait: q('#unitPortrait'), rail: q('#rail'), panel: q('#panel'),
    stambar: q('#stambar'), actionbar: q('#actionbar'), turnchip: q('#turnchip'), phasechip: q('#phasechip'),
    encchip: q('#encchip'), powerchip: q('#powerchip'), playNote: q('#playNote'),
    slots: { top: q('[data-slot=top]'), transport: q('[data-slot=transport]'), bottom: q('[data-slot=bottom]') } }
  /* THE BOARD IS THE MAP'S (engine 5603c40): width and height come from the
     field dump (and map.loaded says the same); nothing here assumes 16×16 */
  if (F.width == null || F.height == null) throw new Error('mountBattleViewer: the field carries no width/height — regenerate generated/fields.json at engine ≥ 5603c40')
  const LAYOUT = { W: F.hexW, H: F.hexH, COL: F.colStep, ROW: F.rowStep, ODD: F.oddOffset, COLS: F.width, ROWS: F.height, tilt: F.tilt }
  const V = {
    dom, now, look,
    data: { F, POS: F.hexes, LAYOUT, UD: data.units, SN: data.statuses, ABSORBING_STATUSES: data.absorbingStatuses || [],
      LAYERS: data.layers || {}, LAYER_STATUS: data.layerStatus || {}, TERRAIN_APPLIES: data.terrainApplies || {},
      /* viewer.hex-tooltip: each ground's name (static.json terrainNames); a host that hands none gets the engine's id */
      TERRAIN_NAMES: data.terrainNames || {},
      /* viewer.new-enemy-ability-line: each kind's own sentence (static.json unitLines — the content's row); none: the name alone */
      UNIT_LINES: data.unitLines || {}, distance: prepared.distance, BOARD: { width: F.width, height: F.height },
      ACT: data.actions || {}, BADGES: data.badges || {},
      /* viewer.reads-engine: what each action IS (the engine's predicates) and what each status DOES (its row's flags) */
      KINDS: data.actionKinds || {}, STATUS_ROWS: data.statusRows || {}, ITEM_CLASSES: data.itemClasses || {},
      /* viewer.panel-lists-items: each item's own row (name, class, hands, what it gives) and the engine's count of hands */
      ITEMS: data.items || {}, HANDS: Number.isInteger(data.hands) ? data.hands : null, ARTMAP: data.artmap, ASSETS: data.assets, atlas, displayHeights: null,
      /* viewer.true-3d-camera: the board's map from the scene's metres to board px — the battle's 3D scene's own, else the
         flat board's (camera3d.js); the one camera, the stage and the 3D layer all stand on it */
      boardAffine: atlas ? (atlas.kind === 'painted' ? paintedToCSS(atlas) : worldToCSS(atlas, F)) : flatAffine(F),
      /* viewer.character-models: which unit types are drawn as 3D models (a host may hand its own pack) */
      models: data.characterModels ?? bundledModels },
    meta: data.meta || {},
    S: createState(), EV: [], cursor: 0,
    view: { burstVisible: false, inspectId: null, statsOpen: false, TRG_OPEN: new Set(), zoom: '1x', peek: false, bare: false, camF: { x: null, y: null }, cam: homeCam(), home: null, glide: false, dragging: false },
    layers: { ground: null, dyn: null, unitsL: null, UEL: new Map(), floatL: null, FLOAT_SLOTS: {} },
    /* every pending beat the board schedules — timers, stray nodes, the injury
       queue — so seek() and dispose() can drop them all (review 2026-09-03) */
    fx: { FX: null, timers: new Set(), nodes: new Set(), injuryQ: [], paused: null },
    playing: false, speed: 1, timer: null, invalid: null,
    /* viewer.affliction-pop-up: the pump is held while the first-affliction pop-up stands (affliction.js) */
    hold: false, affliction: null,
  }
  const ctx = () => ({ UD: V.data.UD, SN: V.data.SN, IC: V.data.ITEM_CLASSES })
  /* the BEAT clock: wall time scaled by playback speed, so a row that lights
     for 1600 beat-ms lights for the same number of beats at ×⅓ and ×4. The fold
     stamps its `until`s from this, and the draw compares against it. */
  let clockValue = 0, wallHighWater = now()
  V.clock = () => {
    const wall = now()
    // Retain the high-water mark during rollback; recovering wall time is not
    // elapsed time twice. Pause deliberately does not stop visual decay.
    if (wall > wallHighWater) { clockValue += (wall - wallHighWater) * V.speed * .75; wallHighWater = wall }
    return clockValue
  }

  /* the stage is sized and centred once; without this it is a zero-size point
     and rotateX pivots around the wrong origin (the quarter-screen bug) */
  /* viewer.characters-unfaded: the floats' layer above the bodies is the stage's twin, drawn through the same camera */
  for (const s of [dom.stage, dom.stageTop]) { if (!s) continue
    s.style.width = F.w + 'px'; s.style.height = F.h + 'px'
    s.style.marginLeft = (-F.w / 2) + 'px'; s.style.marginTop = (-F.h / 2) + 'px' }
  /* viewer.characters-stand-out: what is drawn under a unit follows the look — the stylesheet's, by these two classes */
  dom.stage.classList.toggle('lookDisc', look.disc); dom.stage.classList.toggle('lookShadows', look.shadows)
  dom.stage.style.transition = 'none'                // born TILTED — the camera's glide (board.js) starts after first paint
  ensureKeyframes()
  /* the icon sprite is the component's: one per document, whoever mounts */
  if (data.glyphs && !document.getElementById('raSprite')) document.body.insertAdjacentHTML('beforeend', spriteHTML(data.glyphs))
  initFX(V)
  const unbindCamera = bindCamera(V)

  const terrain = terrainLayer(V, opts.terrainDriver)
  /* viewer.play-chrome: End Turn, End activation, 2×, the log — for a host that plays; nothing for a replay */
  V.asking = false
  const chrome = opts.onPlay ? mountPlayChrome(V, { offer: input => V.offerPlay(input), speed: x => api.speed(x) }) : { sync() {}, relog() {}, notice() {}, dispose() {} }

  function render() {
    if (!V.layers.ground) buildGround(V)
    syncProps(V)
    /* the persistent board objects, coplanar with the ground and right after it */
    syncLayers(V); syncFalls(V); syncCorpses(V); syncAuras(V)
    drawAim(V); drawTargeting(V)
    syncUnits(V); syncPlayInput(V); drawPlay(V)
    drawPanel(V); drawRail(V); drawActivated(); applyCam(V); drawEdges(V); drawChips(); terrain.update(); chrome.sync()
    drawHexTip(V)
  }
  /* viewer.bar-follows-activation (engine DECISIONS.md 2026-10-03 'the action bar changes with the Activation: the new unit's
     moves, attacks and powers'; Andrew: "when the activation changes, for whatever reason, the card art changes in the lower
     left, but the moves don't change"): the card beside the bar, the action bar and the stamina strip (with its swap) are ONE
     draw. Whose they are is one rule (subject.js barUnitOf) and all three are drawn from it at the same moment — in the full
     render AND whenever the host hands or clears its play facts. Was: the card drawn only by the full render, the bar and the
     strip also by setPlay; when an Activation ended with nothing to play (End activation) the next unit's begin was rendered
     while the last unit's facts were still in hand, and clearing them redrew the bar alone — the card and the bar showed
     different units until the next full render (the player's move). */
  function drawActivated() { drawPortrait(V); drawBar(V); drawStam(V) }
  V.render = render
  /* viewer.hex-tooltip: the hex under the pointer (board.js bindCamera says it once per change) has a tooltip just below it,
     kept under its hex through every redraw and every frame of a camera move; what it says of a hex, for the page tests */
  V.view.pointHex = null
  V.onPoint = hex => { if (!disposed) pointHexTip(V, hex) }
  V.afterPose = () => { if (V.view.pointHex != null) drawHexTip(V) }
  V.hexTip = hex => hexTipOf(V.data, groundAt(V, hex)); V.hexTipOf = ground => hexTipOf(V.data, ground)
  /* viewer.tutorial-overlays: the host's notice, pointers and look (overlays.js) */
  const overlays = mountOverlays(V); V.overlays = overlays
  /* viewer.bubble-click-reveals: the camera's reveal, for the bubbles' click and the page tests */
  V.revealPan = (pose, hex) => revealPan(V, pose, hex); V.revealHex = hex => revealHex(V, hex); V.clickBubble = ids => clickBubble(V, ids)
  /* viewer.camera-shows-edge-units: the camera's bound in board px — the board's own box (the centres whose view shows only
     board), the bound it is grown to (as far as the outermost hexes need), and why the view stands past the board's own box
     now, if it does ('scroll', 'subject', or null) */
  V.cameraBound = () => { const k = isoK(V), px = B => B ? { x: [...B.x], y: [B.y[0] / k, B.y[1] / k] } : null
    return { own: px(V.view.boardBox), bound: px(V.view.panBox), past: V.view.pastEdge || null } }
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

  // Burst facts are durable; this small clock controls only their visibility.
  // Remaining beats share the continuous clock, including speed changes and rollback.
  let burstTimer = null, burstGeneration = 0, burstRemaining = 0, burstStarted = 0, disposed = false
  let targetingGeneration = 0
  V.targeting = null
  V.inputActive = () => !disposed && !V.invalid
  V.offerHexClick = (hex, generation = targetingGeneration) => {
    if (!V.inputActive() || generation !== targetingGeneration || !V.targeting?.legalHexes.includes(hex) || !opts.onHexClick) return false
    try { return opts.onHexClick(hex) === true } catch (err) { return fault(err) }
  }
  V.targetingGeneration = () => targetingGeneration
  /* viewer.play-input: the host's plan facts (src/play.js) and the offer of what the mouse did */
  V.play = null; V.heldPlay = null
  /* viewer.turn-taking: a host that plays holds an activated unit — the bar, its card and the camera stay with it (subject.js barUnitOf) */
  V.host = !!opts.onPlay
  V.offerPlay = input => {
    if (!V.inputActive() || !V.play || !opts.onPlay) return false
    try { return opts.onPlay(input) === true } catch (err) { return fault(err) }
  }
  function clearPlay() { V.play = null; syncPlayInput(V); drawPlay(V); chrome.sync() }
  function setPlay(value) {
    if (disposed) throw new Error('viewer disposed')
    if (value === null) { if (V.play) { clearPlay(); drawActivated() } return }
    if (V.invalid) throw new Error('viewer faulted')
    const next = playFacts(value, V.data.POS)   // validate/detach the WHOLE payload before mutation
    V.play = next
    try { syncPlayInput(V); drawPlay(V); drawActivated(); chrome.sync() } catch (err) { fault(err) }
    /* fix.shield-power-double-click: a double-click on the bar held while the host resolved is offered now, once (actionbar.js) */
    const held = V.heldPlay; V.heldPlay = null
    if (held && V.play) V.offerPlay(held)
  }
  function clearTargeting() { targetingGeneration++; V.targeting = null; V.layers.targeting?.remove(); V.layers.targeting = null }
  function setTargeting(value) {
    if (disposed) throw new Error('viewer disposed')
    if (value === null) { clearTargeting(); return } // fault callbacks may safely clear without redrawing
    if (V.invalid) throw new Error('viewer faulted')
    const next = targetingFacts(value, V.data.POS) // validate/detach the WHOLE payload before mutation
    targetingGeneration++; V.targeting = next
    try { render() } catch (err) { fault(err) }
  }
  function cancelBurst() {
    burstGeneration++
    if (burstTimer != null) { clearTimeout(burstTimer); V.fx.timers.delete(burstTimer); burstTimer = null }
    burstRemaining = 0
  }
  function fault(err) {
    if (V.invalid) throw V.invalid
    clearTargeting(); V.play = null; V.heldPlay = null; V.layers.playInput?.remove(); V.layers.playInput = null; V.layers.play?.remove(); V.layers.play = null
    V.invalid = err; V.playing = false; plan = null; resumeWalks(); dropHold(); cancelBurst(); cancelOpportunityLabel(); cancelBeats(V)
    if (V.timer != null) { clearTimeout(V.timer); V.timer = null }
    if (opts.onPlayState) opts.onPlayState(false)
    if (opts.onError) opts.onError(err)
    throw err
  }
  function armBurst(beats = 2400) {
    cancelBurst(); burstRemaining = beats; burstStarted = V.clock()
    const generation = burstGeneration, declaration = V.S.BURST
    V.view.burstVisible = true
    burstTimer = setTimeout(function expireBurst() {
      if (disposed || V.invalid || generation !== burstGeneration || V.S.BURST !== declaration) return
      V.fx.timers.delete(burstTimer); burstTimer = null; burstRemaining = 0
      V.view.burstVisible = false
      try { render() } catch (err) { fault(err) }
    }, beats / (V.speed * .75))
    V.fx.timers.add(burstTimer)
  }
  function burstBeat(e) {
    const B = V.S.BURST
    if (!B) { cancelBurst(); V.view.burstVisible = false; return }
    const matching = e.causeId === B.causeId
    if (e.type === 'burst.declared' || (matching && (
      (e.type === 'burst.shielded' || e.type === 'burst.struck') && e.actor === B.actor ||
      e.type === 'damage.applied' && e.burst === true && e.actor === B.actor ||
      e.type === 'heal.applied' && B.targets.some(t => t.id === e.target)))) armBurst()
  }

  /* ── the pump ────────────────────────────────────────────────────────── */
  let opportunityLabel = null, opportunityGeneration = 0
  function cancelOpportunityLabel() {
    opportunityGeneration++
    if (opportunityLabel != null) { clearTimeout(opportunityLabel); V.fx.timers.delete(opportunityLabel); opportunityLabel = null }
  }
  function afterOpportunityStep(cues) {
    const generation = opportunityGeneration
    opportunityLabel = setTimeout(() => {
      if (disposed || V.invalid || generation !== opportunityGeneration) return
      V.fx.timers.delete(opportunityLabel); opportunityLabel = null
      try { playCues(V, cues) } catch (err) { fault(err) }
    }, OPPORTUNITY_STEP_MS/(V.speed*.75))
    V.fx.timers.add(opportunityLabel)
  }
  function applyOne(e, visual) {
    const cues = fold(V.S, e, ctx(), V.clock())
    if (!V.S.BURST) { cancelBurst(); V.view.burstVisible = false }
    if (visual) { burstBeat(e); playCues(V, cues) }
    V.cursor++
    trail.push(e)
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
  /* ── ENEMIES OF ONE TYPE MOVE TOGETHER (viewer.enemy-type-moves-together, 2026-10-04) ───────────────────────────────────
     Engine DECISIONS.md 2026-10-03 'the post's twelve questions answered' and 'Back Flip's rules; enemies only move together;
     the motion work comes first' (Andrew: "During the enemy turn I would like for all of the enemies of a type to move at the
     same time. … They can still be determined in the order they should have been determined, but we're just displaying it
     as if they're all moving at the same time." / "All the zombies move, and then attacks play." / "a free attack stops all
     action and just plays out, so the whole group freezes." / "functionally it should be exactly the same.").
     DISPLAY ONLY. While the pump PLAYS and reaches an enemy's Activation in the Enemy Phase, the run of enemy Activations
     from there is planned (grouping.js planEnemyPhase: PURE — a permutation of those log lines, and marks) and the pump
     shows the lines in the plan's order instead of the log's: each type's walks launched at the same moment (a `walks` mark),
     a free attack on a mover as a freeze of every walk in flight while its lines play (a `freeze` mark, then `resume`), then
     each Activation's remaining lines one after another (an `actor` mark names whose they are; a remainder with nothing to
     show is folded at once — `quiet`). The log (V.EV) is never touched. While a plan runs, V.cursor counts the lines SHOWN
     (it is the log's own place again when the run ends), and V.S is the board as shown; when the run has been shown V.S is
     replaced by the engine's own state at that line (the pure fold of the log), so every run ends exactly where the
     one-at-a-time playback ends, whatever order the engine's types were mixed in. A hand step inside a run goes back to the
     engine's state nearest behind what was shown (prefixShown) and steps on one line at a time; a seek is a place in the
     log, as ever. Only enemies, only the Enemy Phase; a type with one Activation in the run plays as before
     (viewer SWITCHES together*). */
  let together = opts.enemiesTogether !== false, plan = null, frozen = null, trail = [], trailFrom = 0
  /** the line shown at place n: the plan's while one runs, else the log's */
  const evAt = n => plan && n >= plan.from && n < plan.to ? V.EV[plan.order[n - plan.from]] : V.EV[n]
  V.together = { get on() { return together }, runs: [], log: [],
    /** the lines shown since place n, in the order shown (since the last seek) */
    shownSince: n => trail.slice(Math.max(0, n - trailFrom)) }
  const legMs = (moveBegin, hexes) => {
    if (!hexes) return 0
    const shape = moveBegin ? V.data.ACT[moveBegin.causeId]?.move?.shape ?? null : null
    return DUR.moved * (shape === 'flight' && Number.isInteger(moveBegin.hexes) && moveBegin.hexes > 0 ? moveBegin.hexes : hexes)
  }
  function startPlan() {
    const P = planEnemyPhase(V.EV, V.cursor, id => V.S.U[id] ? { side: V.S.U[id].side, typeId: V.S.U[id].typeId } : undefined, legMs)
    if (P) { plan = P; plan.shapes = new Map() }
    return !!P
  }
  /** every walk in flight under the units' layer stands still (the board's own hitstop mechanism, held until resumed) */
  function freezeWalks() {
    const L = V.layers.unitsL
    const running = L && L.getAnimations ? L.getAnimations({ subtree: true }).filter(a => a.playState === 'running') : []
    for (const a of running) a.pause()
    frozen = [...(frozen || []), ...running]
    return running.length
  }
  function resumeWalks() {
    const was = frozen || []; frozen = null
    let n = 0
    for (const a of was) { try { if (a.playState === 'paused') { a.play(); n++ } } catch (err) { /* an animation already gone */ } }
    return n
  }
  /** fold one leg of one mover's walk (its lines stand next in the plan) and say how to launch it */
  function foldLeg(actor, len, cues) {
    const attempt = opportunityPose(V)
    const startHex = V.S.U[actor] ? V.S.U[actor].hex : null, path = []
    let begin = null
    for (let k = 0; k < len; k++) {
      const x = evAt(V.cursor)
      if (x.type === 'move.begin' && x.actor === actor) { begin = x; plan.shapes.set(actor, x) }
      if (x.type === 'moved' && x.actor === actor) path.push(x.to)
      for (const c of applyOne(x, false)) cues.push(c)

    }
    const mb = begin || plan.shapes.get(actor) || null
    return { actor, startHex, path, hexes: path.length, dur: legMs(mb, path.length), attempt: attempt?.id === actor ? attempt : null,
      shape: mb ? V.data.ACT[mb.causeId]?.move?.shape ?? null : null }
  }
  const launch = L => { if (L.hexes && L.startHex != null) traverse(V, L.actor, L.startHex, L.path, L.dur, L.attempt, L.shape) }
  /** play one mark of the plan; a number is the beat it holds, null means go on at once */
  function playMark(m) {
    const note = more => V.together.log.push({ kind: m.kind, shown: V.cursor, clock: V.clock(), ...more })
    if (m.kind === 'walks') {
      const cues = [], shown = V.cursor, clock = V.clock()
      const legs = m.legs.map(l => foldLeg(l.actor, l.len, cues))
      /* nobody is "the one acting" while a group moves; the view follows the first mover */
      V.S.activeId = null; V.S.subjectId = m.legs[0].actor; V.S.subjectMode = 'acting'
      playCues(V, cues); render()
      for (const L of legs) launch(L)
      V.together.log.push({ kind: 'walks', typeId: m.typeId, shown, clock, wait: m.wait, actors: m.legs.map(l => l.actor), launched: legs.filter(L => L.hexes).map(L => ({ actor: L.actor, hexes: L.hexes, path: [...L.path], clock })) })
      return m.wait
    }
    if (m.kind === 'freeze') { note({ actor: m.actor, paused: freezeWalks() }); return null }
    if (m.kind === 'resume') {
      const resumed = resumeWalks()
      note({ actor: m.actor, resumed, leg: m.len > 0 })
      if (m.len > 0) { const cues = [], L = foldLeg(m.actor, m.len, cues); playCues(V, cues); render(); launch(L) }
      return m.wait > 0 || m.len > 0 ? m.wait : null
    }
    if (m.kind === 'actor') {
      /* the remaining lines are this unit's Activation: it is the one acting while they play */
      if (V.S.U[m.actor]) { V.S.activeId = m.actor; V.S.subjectId = m.actor; V.S.subjectMode = 'acting' }
      note({ actor: m.actor }); return null
    }
    if (m.kind === 'quiet') {
      let cues = []
      for (let k = 0; k < m.len; k++) cues = cues.concat(applyOne(evAt(V.cursor), false))
      playCues(V, cues); note({ len: m.len })
      return null
    }
    throw new Error('viewer: the plan holds a mark the pump does not know: ' + m.kind)
  }
  /** the board the engine's log decides, without the pump's view clocks — what a run must end on */
  const boardOf = S => JSON.stringify({ ...S, FIRING: null, TRIGFLASH: null, AIM: null, ATTACK: null, AOO: null, BURST: null, critPending: false, subjectId: null, subjectMode: null, activeId: null })
  /** the run has been shown: the board becomes the engine's own state at that line (the pure fold of the log) */
  function finishPlan() {
    const P = plan; plan = null; resumeWalks()
    const truth = foldTo(V.EV, P.to, ctx()), drift = boardOf(V.S) !== boardOf(truth)
    truth.FIRING = V.S.FIRING; truth.TRIGFLASH = V.S.TRIGFLASH
    V.S = truth
    const landed = boardOf(V.S) === boardOf(foldTo(V.EV, V.cursor, ctx())) && V.cursor === P.to
    V.together.runs.push({ from: P.from, to: P.to, groups: P.groups, drift, landed })
    V.together.log.push({ kind: 'done', shown: V.cursor, clock: V.clock(), drift })
    render()
  }
  /** a hand step inside a run: back to the engine's state nearest behind what was shown */
  function dropPlan() {
    const P = plan; if (!P) return
    const k = prefixShown(P, V.cursor - P.from)
    plan = null; resumeWalks()
    seek(k)
  }
  /** one pump step of a running plan: its marks at this place, then the line that stands there */
  function groupStep() {
    for (;;) {
      const marks = plan.marks.get(V.cursor)
      if (marks) for (const m of marks) { if (m.done) continue; m.done = true
        const d = playMark(m); if (d !== null) return d }
      if (V.cursor >= plan.to) { finishPlan(); return 0 }
      /* a place whose marks only folded lines (a quiet remainder) leaves the next place's marks to play in the same step */
      const next = plan.marks.get(V.cursor)
      if (next && next.some(m => !m.done)) continue
      return beat(evAt(V.cursor))
    }
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
    const actor = e.actor
    const attempt = opportunityPose(V)
    const startHex = V.S.U[actor] ? V.S.U[actor].hex : null
    const path = []
    let cues = []
    if (e.type === 'move.begin') cues = cues.concat(applyOne(e, false))
    for (;;) {
      const x = evAt(V.cursor); if (!x) break
      if (x.type === 'moved' && x.actor === actor) { path.push(x.to); cues = cues.concat(applyOne(x, false)); continue }
      /* a mid-walk side event followed by more of this walk folds inside the beat */
      const y = evAt(V.cursor + 1)
      if (MID_WALK.has(x.type) && y && y.type === 'moved' && y.actor === actor) { cues = cues.concat(applyOne(x, false)); continue }
      break
    }
    const hexes = path.length
    /* a flight is one `moved` over the engine's own distance (move.begin `hexes`): it is paced by that distance, not by
       its one landing (viewer.opening-cast; viewer SWITCHES flightPace) — the power's shape is the engine's action row */
    const shape = e.type === 'move.begin' ? V.data.ACT[e.causeId]?.move?.shape ?? null : null
    const span = shape === 'flight' && hexes && Number.isInteger(e.hexes) && e.hexes > 0 ? e.hexes : hexes
    /* viewer.walk-in-step (engine DECISIONS.md 2026-10-01, Andrew: "The walking isn't very well timed or spaced based on the
       number of tiles that are being moved"): a traversal takes DUR.moved per hex walked (viewer SWITCHES walkPace) — it
       grows with the walk, with no floor or ceiling; the 3D body's stride is timed to it (models.js pace). Was
       200 + 85 × hexes, clamped 320–900 ms: a five-hex walk crossed the board in 625 ms, before a walk clip could show. */
    const dur = hexes ? DUR.moved * span : 0
    playCues(V, cues)
    render()
    if (hexes && startHex != null) traverse(V, actor, startHex, path, dur, attempt?.id === actor ? attempt : null, shape)
    return dur + (hexes ? 60 : 0)                  // the arrival settle
  }
  /* ONE REPAINT PER RUN (2026-09-03): consecutive layer.painted/cancelled
     events fold together and the board redraws once — night.fell paints the
     whole board and each hero phase lights ~100; one beat each, not four seconds
     of 16ms ticks. Every event is still folded in order. */
  const PAINT = new Set(['layer.painted', 'layer.cancelled'])
  function stepPaint(e) {
    let cues = applyOne(e, false)
    while (evAt(V.cursor) && PAINT.has(evAt(V.cursor).type)) cues = cues.concat(applyOne(evAt(V.cursor), false))
    playCues(V, cues); render()
    return PAINT_RUN_MS
  }
  /* ── THE CAMERA SHOWS WHAT ARRIVES (viewer.arrivals-camera, 2026-10-04) ───────────────────────────────────────────────
     Engine DECISIONS.md 2026-10-04 'the opening's tutorial: … the camera shows what arrives …' (Andrew: "when a phase happens
     and enemies are introduced, the map is going to pan over to the enemies enough so they are on the screen. Don't center on
     them because they're usually on the edge and we don't want to go off the edge. For each side the enemies are on, we're
     going to go to that side. … When we're done looking at the things that have been added, we're going to focus and center on
     the first hero that's activated."). A scheduled arrival is the engine's encounter.wave, then a unit.enter for each unit
     that names the encounter (`arrived`), at the Start of the Turn, before the first Activation. While the pump PLAYS, the wave
     is one beat: its lines are folded together (the units are on the board, off the screen), then the view visits each side
     of the board that has arrivals it does not already show — in ARRIVAL_SIDES' order — by the bubbles' own slide (board.js
     revealHex: the least distance, the zoom and the angle kept, never centred, never past the board's edge), their drop-in
     plays while the view is there, the view holds (camera-policy.js ARRIVAL_HOLD_MS, shortened by the speed as every beat is),
     and goes on. The pump is held meanwhile ('arrivals'), as it is under the affliction pop-up; when it is let go the next
     lines play — the Hero Phase and the first Activation, whose own centring (board.js applyCam) takes the view to that hero.
     An arrival already in the view drops in at once and moves nothing. A hand step, a seek, the whole-board fit and a unit
     that enters by another unit's power (a raise, a summon: it names no encounter) are as before (viewer SWITCHES arrivals*). */
  /* ── NEW ENEMIES ARE NAMED (viewer.new-enemy-notice, 2026-10-04) ───────────────────────────────────────────────────────
     Engine DECISIONS.md 2026-10-04 'the opening's tutorial: … new enemies are named …' (Andrew: "If a new enemy is introduced
     there is going to be a notification: \"New enemy\" and their name." — the first time a kind is met: "To first time").
     What is new is the HOST's to say: it hands the kinds to announce (opts.newEnemies, setNewEnemies) and the viewer never
     decides it; with none handed nothing is announced. While the pump PLAYS, the first time a unit of such a kind is on the
     board the view shows it and the gold notice (overlays.js tell) reads "New enemy" with the unit sheet's name beneath:
       · a kind that arrives in a wave — while the arrivals camera is on its side (waveBeat), its drop-in played;
       · a kind on the board before a hero's Activation begins (the battle's opening; a unit raised or summoned since) —
         before that Activation is played: the view slides to each such kind in turn by the bubbles' least-distance slide
         (board.js revealHex), the notice stands, and the Activation then plays and centres the view on the hero as before.
     One notice per kind however many of it there are; the pump is held meanwhile; onNewEnemy hears the kind as its notice goes
     up. A hand step, a seek, a fault drop it, and a kind not yet named stays to be named (viewer SWITCHES newEnemy*). */
  const clockOfWall = () => now()
  let newEnemies = new Set(), namedEnemies = new Set(), namingRun = null
  function setNewEnemies(kinds) {
    if (!Array.isArray(kinds) || kinds.some(k => typeof k !== 'string' || !k)) throw new Error('viewer: the new enemies are a list of unit type ids')
    newEnemies = new Set(kinds)
  }
  if (opts.newEnemies !== undefined) setNewEnemies(opts.newEnemies)
  /** the kinds to announce among these units (all standing units of the board when none are named), each with the unit shown
      for it: the lowest id of that kind */
  function newKindsAmong(ids) {
    if (!newEnemies.size) return []
    const units = (ids ? ids.map(id => V.S.U[id]) : Object.values(V.S.U)).filter(u => u && u.life !== 'dead' && newEnemies.has(u.typeId) && !namedEnemies.has(u.typeId)).sort((a, b) => a.id - b.id)
    const kinds = []
    for (const u of units) if (!kinds.some(k => k.typeId === u.typeId)) kinds.push({ typeId: u.typeId, unit: u.id })
    return kinds
  }
  function cancelNaming() { const N = namingRun; if (!N) return; namingRun = null; if (N.timer != null) clearTimeout(N.timer) }
  /** name each kind in turn, then go on: the view slid to its unit (slide), the notice up for its time, the host told.
      `owner` is the run this belongs to (the arrivals', or the naming's own) — a run called off stops the chain. */
  function nameKinds(owner, kinds, slide, then) {
    const alive = () => owner === arrivalsRun || owner === namingRun
    const next = i => {
      if (!alive()) return
      if (i >= kinds.length) { then(); return }
      const k = kinds[i], u = V.S.U[k.unit]
      if (!u || namedEnemies.has(k.typeId)) { next(i + 1); return }
      const moved = slide && V.camTarget && V.view.zoom !== 'fit' && !V.view.peek && !V.view.overview ? revealHex(V, u.hex) : false
      if (moved) drawEdges(V)
      const glide = moved && V.view.glide && typeof requestAnimationFrame === 'function' ? GLIDE_MS : 0
      const say = () => {
        if (!alive()) return
        namedEnemies.add(k.typeId)
        const sheet = V.data.UD[k.typeId]
        V.enemiesNamed.push({ typeId: k.typeId, unit: k.unit, hex: u.hex, slid: moved, pose: { ...(V.camTarget || {}) }, at: V.clock() })
        if (opts.onNewEnemy) { try { opts.onNewEnemy(k.typeId) } catch (err) { fault(err) } }
        /* viewer.new-enemy-ability-line: under the name, what this kind can do — the content's own sentence for it, as dumped;
           a kind with none shows its name alone. Nothing is worded here. */
        const line = V.data.UNIT_LINES[k.typeId]
        overlays.tell(['New enemy', (sheet && sheet.name) || u.name, ...(typeof line === 'string' && line.trim() ? [line.trim()] : [])], { onDone: () => next(i + 1) })
      }
      if (glide) owner.timer = setTimeout(() => { owner.timer = null; say() }, glide); else say()
    }
    next(0)
  }
  /** before a hero's Activation plays: the kinds on the board not yet named. True when the pump is now held for them. */
  function nameBeforeActivation() {
    const kinds = newKindsAmong(null)
    if (!kinds.length) return false
    const N = namingRun = { timer: null }
    V.holdPump('newEnemy')
    nameKinds(N, kinds, true, () => { if (namingRun !== N) return; namingRun = null; V.releasePump('newEnemy') })
    return true
  }
  V.enemiesNamed = []
  const WAVE_LINES = new Set(['unit.enter', 'unit.equipped', 'unit.badged', 'unit.grown', 'unit.modified', 'unit.shunted', 'encounter.roll', 'encounter.objective', 'ai.override', 'ai.hunts'])
  let arrivalsRun = null
  function cancelArrivals() { const R = arrivalsRun; if (!R) return; arrivalsRun = null; if (R.timer != null) clearTimeout(R.timer) }
  /** the side of the board a hex stands nearest (true proportions; a tie goes to the earlier side of the fixed order) */
  function sideOf(hex) {
    const p = V.data.POS[hex], F = V.data.F, k = isoK(V), d = { left: p.px, right: F.w - p.px, top: p.py * k, bottom: (F.h - p.py) * k }
    return ARRIVAL_SIDES.reduce((a, b) => d[b] < d[a] ? b : a)
  }
  /** one arrival's drop-in, and what the view was when it played (V.arrivalsShown: read by the page tests) */
  function showArrival(c, side, slid) {
    playCues(V, [c])
    drawEdges(V)
    const p = V.data.POS[c.hex], cam = V.camera3d, s = cam ? cameraScreenOf(boardAffine(V), cam, p.px, p.py, heightOf(V, c.hex)) : null
    const bubble = V.layers.edgeL ? [...V.layers.edgeL.querySelectorAll('.edgeBub')].some(b => String(b.dataset.units).split(',').includes(String(c.id))) : false
    V.arrivalsShown.push({ id: c.id, hex: c.hex, side, slid, pose: { ...(V.camTarget || {}) }, inView: !bubble, screen: s ? { x: s.x, y: s.y } : null, at: V.clock() })
  }
  function waveBeat(e) {
    playCues(V, applyOne(e, false))
    const arrivals = [], rest = []
    while (V.cursor < V.EV.length && WAVE_LINES.has(V.EV[V.cursor].type)) {
      const x = V.EV[V.cursor]
      for (const c of applyOne(x, false)) (c.k === 'arrive' && x.type === 'unit.enter' && x.arrived ? arrivals : rest).push(c)
    }
    render(); playCues(V, rest)
    V.arrivalsShown = []
    const own = !!V.camTarget && V.view.zoom !== 'fit' && !V.view.peek && !V.view.overview        // the battle's own camera
    const groups = {}
    for (const c of arrivals) {
      const side = sideOf(c.hex)
      if (!own || revealPan(V, V.camTarget, c.hex) === null) showArrival(c, side, false)           // already in the view: no slide
      else (groups[side] = groups[side] || []).push(c)
    }
    const sides = ARRIVAL_SIDES.filter(s => groups[s])
    /* viewer.new-enemy-notice: an arrival of a kind the host wants announced is named while the view is on it — on its side
       (below), or where it stands when it was in the view already */
    const inView = arrivals.filter(c => !sides.some(s => groups[s].includes(c)))
    const fresh = newKindsAmong(inView.map(c => c.id))
    if (!sides.length && !fresh.length) return DUR[e.type] ?? 0
    const R = arrivalsRun = { timer: null }
    V.holdPump('arrivals')
    const visit = i => {
      if (arrivalsRun !== R) return
      if (i >= sides.length) { arrivalsRun = null; V.releasePump('arrivals'); return }
      const g = groups[sides[i]]
      let moved = false
      for (const c of g) moved = revealHex(V, c.hex) || moved
      const glide = moved && V.view.glide && typeof requestAnimationFrame === 'function' ? GLIDE_MS : 0
      R.timer = setTimeout(() => {
        if (arrivalsRun !== R) return
        for (const c of g) showArrival(c, sides[i], moved)
        const held = clockOfWall()
        /* the side's hold is at least the arrivals' own; a new kind among them is named first, and the hold is what is left */
        nameKinds(R, newKindsAmong(g.map(c => c.id)), false, () => {
          if (arrivalsRun !== R) return
          const left = Math.max(16, CAM_POLICY.ARRIVAL_HOLD_MS / (V.speed * 0.75) - (clockOfWall() - held))
          R.timer = setTimeout(() => visit(i + 1), left) })
      }, glide)
    }
    nameKinds(R, fresh, false, () => visit(0))
    return DUR[e.type] ?? 0
  }
  function beat(e) {
    cancelOpportunityLabel()
    let d
    if (e.type === 'encounter.wave' && V.playing && !V.invalid) return waveBeat(e)
    if (e.type === 'move.begin' || e.type === 'moved') d = stepMove(e)
    else if (PAINT.has(e.type)) d = stepPaint(e)
    else {
      const before = opportunityPose(V)
      const cues = applyOne(e, false)
      burstBeat(e)
      const after = opportunityPose(V)
      const starting = after && (!before || before.id !== after.id || before.moveSeq !== after.moveSeq || before.from !== after.from || before.to !== after.to)
      d = e.type === 'block.rolled' ? (e.blocked ? 700 : 0) : e.type === 'kdb.rolled' ? (e.fired ? 520 : 0) : DUR[e.type] ?? 0
      if (starting) {
        render()
        animateOpportunityStep(V, after.id, {...feetOf(V, after.from), z:heightOf(V,after.from)}, after)
        afterOpportunityStep(cues)
        d += OPPORTUNITY_STEP_MS
      } else {
        playCues(V, cues)
        if (d > 0 || REDRAW.has(e.type) || expireAim() || before && !after) render()
        // Forced displacement has its own authoritative shove animation.
        if (before && !after && e.type !== 'knocked') {
          const u = V.S.U[before.id]
          if (u && u.life !== 'dead') animateOpportunityStep(V,before.id,before,{...feetOf(V,u.hex),z:heightOf(V,u.hex)})
          d = Math.max(d, OPPORTUNITY_STEP_MS)
        }
      }
    }
    return d
  }
  /* viewer.affliction-pop-up (engine DECISIONS.md 2026-10-01: "There is a before/after pop-up mid-battle"; the item: "the
     battle pauses on a pop-up ... and the battle resumes when it is closed"): the pop-up HOLDS the pump — no next beat is
     scheduled and nothing drains, so a host that plays stays busy — and Continue releases it. Held is not paused: the pump
     is still playing and goes on by itself. A hand step, a seek, a fault and dispose drop the hold and the pop-up with it
     (viewer SWITCHES afflictionHold, afflictionSeek). */
  /* viewer.tutorial-overlays: a hold has a holder — the affliction pop-up, the host's notice — and the pump goes on only when
     every holder has let go (was one flag: the pop-up's Continue would have let the pump run on under a notice still up) */
  V.holds = new Set()
  V.holdPump = (who = 'affliction') => { V.holds.add(who); V.hold = true; if (V.timer != null) { clearTimeout(V.timer); V.timer = null } }
  V.releasePump = (who = 'affliction') => { if (!V.holds.delete(who) || V.holds.size) return; V.hold = false; if (!disposed && !V.invalid && V.playing && V.timer == null) step() }
  function dropHold() { cancelNaming(); cancelArrivals(); V.holds.clear(); V.hold = false; closeAffliction(V); overlays.dropped() }
  function step() {
    V.timer = null
    if (V.invalid || V.hold) return
    /* viewer.enemy-type-moves-together: a run of the plan that has been shown ends here, before the pump can run dry */
    if (plan && V.cursor >= plan.to) { const left = plan.marks.get(V.cursor); if (!left || left.every(m => m.done)) { try { finishPlan() } catch (err) { fault(err) } } }
    if (!plan && V.cursor >= V.EV.length) {
      /* dry, not paused: a live game will push more; a replay's host hears onDrain */
      if (opts.onDrain) opts.onDrain()
      return
    }
    let d
    /* viewer.new-enemy-notice: before a hero's Activation is played, the kinds on the board the host wants announced are named
       (the pump is held; it comes back here when the last notice has gone) */
    const nextUp = evAt(V.cursor) || {}
    if (V.playing && newEnemies.size && nextUp.type === 'activation.begin' && nextUp.phase === 'hero') {
      let held = false
      try { held = nameBeforeActivation() } catch (err) { fault(err) }
      if (held) return
    }
    /* Law 9: a beat that throws stops the run and says so — never a silent
       freeze behind a "Pause" button */
    try {
      /* viewer.enemy-type-moves-together: an enemy's Activation in the Enemy Phase begins a planned run (if there is a group) */
      if (!plan && together && V.playing && nextUp.type === 'activation.begin' && nextUp.phase === 'enemy') startPlan()
      d = plan ? groupStep() : beat(V.EV[V.cursor])
      /* the run's last line has been shown: the board is the engine's own state from this moment, not from the next beat */
      if (plan && V.cursor >= plan.to && !(plan.marks.get(V.cursor) || []).some(m => !m.done)) finishPlan()
      chrome.sync()
    }
    catch (err) { fault(err) }
    /* Ruled 2026-08-26: standard speed is 25% slower; all speeds scale off it */
    if (V.playing && !V.hold) V.timer = setTimeout(step, Math.max(16, (d || 8) / (V.speed * 0.75)))
  }
  function play() { if (V.invalid) return; V.playing = true; if (V.timer) { clearTimeout(V.timer); V.timer = null } if (opts.onPlayState) opts.onPlayState(true); step() }
  function pause() { V.playing = false; if (V.timer) { clearTimeout(V.timer); V.timer = null } if (opts.onPlayState) opts.onPlayState(false) }
  function stepOnce() { pause(); dropHold(); if (plan) dropPlan(); if (V.invalid || V.cursor >= V.EV.length) return; beat(V.EV[V.cursor]) }
  function seek(n) {
    if (V.timer) { clearTimeout(V.timer); V.timer = null }
    dropHold()
    /* viewer.enemy-type-moves-together: a seek is a place in the engine's log — a run being shown is dropped */
    plan = null; resumeWalks()
    V.cursor = Math.max(0, Math.min(n, V.EV.length))
    trail = []; trailFrom = V.cursor
    V.S = foldTo(V.EV, V.cursor, ctx())
    clearTargeting(); V.play = null; V.heldPlay = null; cancelBurst(); cancelOpportunityLabel(); cancelBeats(V); clearFloats(V)
    V.view.burstVisible = !!V.S.BURST
    V.view.inspectId = null                       // a click from before the scrub must not outrank the actor after it
    for (const E of V.layers.UEL.values()) { if (E.walk) { E.walk.cancel(); E.walk = null } E.root.style.transition = 'none' }
    render()
    V.cast?.snap()                                // the models land on their resting pose, the fallen at the death's end
    requestAnimationFrame(() => { for (const E of V.layers.UEL.values()) E.root.style.transition = ROOT_TRANSITION })
    if (opts.onCursor) opts.onCursor(V.cursor, V.EV[V.cursor - 1] || null)
    if (V.playing) V.timer = setTimeout(step, 120)
  }
  function push(events) {
    if (!Array.isArray(events)) throw new Error('push requires an event array')
    const incoming = structuredClone(events)
    let sawMap = pushedMap
    // Validate the incoming batch atomically; a rejected batch permits a corrected
    // retry. Never rescan accumulated history, skip setup events, or consume facts.
    for (const e of incoming) {
      if (e.type === 'map.loaded') {
        if (sawMap || !sameFact(e, initialMap)) throw new Error('pushed initial map differs from prepared facts or is duplicated')
        sawMap = true
      }
      if (e.type === 'battle.begin' && !sawMap) throw new Error('battle began before initial map facts')
    }
    const first = V.EV.length === 0
    // Input ownership ends here: later host edits cannot corrupt a seek.
    for (const e of incoming) V.EV.push(e)
    pushedMap = sawMap
    chrome.relog()
    if (first) {
      /* seed the roster instantly: everything through battle.begin (the setup's
         unit.enters, their kit, the encounter's title, the map). A log with no
         battle.begin seeds nothing and plays from the first event. */
      const end = V.EV.findIndex(e => e.type === SEED_END)
      while (V.cursor <= end) applyOne(V.EV[V.cursor], false)
      render()
      if (opts.autoplay !== false) play()
    } else if (V.playing && !V.timer && !V.hold && V.cursor < V.EV.length) step()   // the pump had run dry; it resumes (never past a held pop-up)
  }

  const api = {
    setTargeting, setPlay, push, seek, play, pause, step: stepOnce, render,
    speed(x) {
      if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) throw new Error('speed must be a finite positive number')
      const clock = V.clock() // settle elapsed time at the OLD rate before rebasing
      const remaining = burstTimer == null ? null : Math.max(0, burstRemaining - (clock - burstStarted))
      V.speed = x
      if (remaining != null) armBurst(remaining)
    },
    setZoom(z) { V.view.zoom = z; applyCam(V); drawEdges(V) },
    setBare(b) { V.view.bare = b; render() },
    inspect(id) { V.view.inspectId = id; render() },
    /* viewer.xcom-camera: the map centred on a unit at the standard zoom (the host's proposed hero) */
    centre(id) { centreOn(V, id) },
    /* viewer.tutorial-overlays (engine DECISIONS.md 2026-10-04 'the opening's tutorial …'): what the host's lessons are made of —
       drawn here, decided by the host (overlays.js). tell: a gold notice across the board's centre that goes by itself;
       point: an arrow with a word at a unit, a hex, a bar slot, a number, a bar, the panel, a card, a button; look: the view
       taken to a unit or a hex, nearer, and back. Each tells the host when it is done (onDone). */
    tell(words, o) { if (disposed) throw new Error('viewer disposed'); return overlays.tell(words, o) }, clearTell() { return overlays.clearTell() },
    point(target, o) { if (disposed) throw new Error('viewer disposed'); return overlays.point(target, o) }, unpoint(id) { return overlays.unpoint(id) },
    look(target, o) { if (disposed) throw new Error('viewer disposed'); return overlays.look(target, o) }, lookBack(o) { return overlays.lookBack(o) },
    get overlays() { return overlays.state },
    /* viewer.new-enemy-notice: the unit kinds the host wants announced in this battle ("New enemy" and the name, the first time
       a unit of the kind is on the board while the pump plays); a kind already named in this mount is not named again */
    setNewEnemies(kinds) { if (disposed) throw new Error('viewer disposed'); setNewEnemies(kinds) },
    /* viewer.enemy-type-moves-together: whether the Enemy Phase is shown with the enemies of one type moving together (the
       default) or one at a time; a run being shown is finished as it began */
    setTogether(on) { if (typeof on !== 'boolean') throw new Error('setTogether takes true or false'); together = on },
    /* viewer.bubble-click-reveals (engine DECISIONS.md 2026-10-03 'clicking an off-screen bubble selects the unit and slides the
       screen just far enough to show its hex'): the view slid the least distance that shows a unit's hex, or a hex — the zoom,
       the turn and the tilt kept, never centred, never past the board's edge; true when the view moved */
    reveal(id) { const u = V.S.U[id]; return !!u && u.life !== 'dead' && revealHex(V, u.hex) },
    revealHex(hex) { return revealHex(V, hex) },
    /* viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the battle screen's turn-taking, ruled', point 4: a double-click on
       another hero switches to it while the current one has done nothing): the host took back an Activation that did nothing
       — the engine's battle restored to before it began — so the log is cut back to the events that battle holds, and the
       board is folded again to that point. Nothing is re-decided here: the host names the count, the engine's log is the rest. */
    rewind(n) {
      if (disposed) throw new Error('viewer disposed')
      if (!Number.isInteger(n) || n < 0 || n > V.EV.length) throw new Error('rewind needs an event count within the log (0..' + V.EV.length + '), got ' + n)
      V.EV.length = n; chrome.relog(); seek(n)
    },
    get cursor() { return V.cursor }, get events() { return V.EV }, get state() { return V.S },
    get playing() { return V.playing }, get view() { return V.view }, get invalid() { return V.invalid },
    get speedValue() { return V.speed }, get dom() { return { slots: dom.slots, actionbar: dom.actionbar } }, get art() { return V.data.ARTMAP }, get assets() { return V.data.ASSETS },
    peek(on) { V.view.peek = !!on; applyCam(V); drawEdges(V) },
    pan(dx, dy) { applyCam(V, { pan: { x: dx, y: dy } }); drawEdges(V) },
    /* viewer.painted-board: turn (degrees about the view centre), tilt (degrees), zoom (a factor), Reset */
    turn(deg) { turnCam(V, { yaw: deg }) }, tilt(deg) { turnCam(V, { tilt: deg }) }, zoom(f) { turnCam(V, { zoom: f }) },
    resetView() { resetCam(V) },
    /* viewer.tactical-camera: the camera's named views — angled, lower, raise, left, right, whole, overhead, inspect, focus,
       reset — and what it is doing (stance, elevation, turn, zoom) */
    camera(kind) { cameraView(V, kind) }, get cameraState() { return cameraState(V) },
    /* viewer.auto-end-no-actions: the host's notice on the battle screen ("No remaining actions possible.") — its words, shown
       by the play chrome for a time and taken down by itself; it holds nothing and asks nothing (chrome.js). A viewer with
       no host that plays has no chrome and draws none. */
    notice(text) {
      if (disposed) throw new Error('viewer disposed')
      if (typeof text !== 'string' || !text.trim()) throw new Error('notice needs words to show')
      chrome.notice(text)
    },
    /* viewer.affliction-pop-up: whether the first-affliction pop-up is holding the pump */
    get held() { return V.hold },
    dispose() { disposed = true; plan = null; resumeWalks(); dropHold(); overlays.dispose(); stopGlide(V); chrome.dispose(); clearTargeting(); V.play = null; V.heldPlay = null; cancelBurst(); cancelOpportunityLabel(); terrain.dispose(); pause(); cancelBeats(V); unbindCamera(); for (const E of V.layers.UEL.values()) if (E.walk) E.walk.cancel(); root.innerHTML = '' },
    _V: V,
  }
  /* first frame is already tilted; enable the half-speed camera glide after it */
  requestAnimationFrame(() => requestAnimationFrame(() => { if (!disposed) V.view.glide = true }))
  return api
}
