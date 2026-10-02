/* ── THE BOARD — the DOM half: ground, tokens, floats, VFX bridge, camera ──
   Reads V.S (the folded state) and draws it. Never folds. Every function takes
   the viewer context V; nothing here is module state, so two viewers can live
   on one page. Split out of viewer-core.js 2026-09-02 with the drawing intact. */
import { TSWATCH, stStyle, SIDE_TINT, SIDE_GLOW, DMG_HUE, HEAL_HUE, MOD_UP, MOD_DOWN, CRIT_HUE, NOTE_HUE, VFX_STATUS, rgb, layerHue, AURA_HUE, BLOOD_HUE, onBodyAs, movementOnly, PLAY_HUE } from './theme.js'
import { mvOf } from './actions.js'
import { subjectOf } from './subject.js'
import { dangerOf } from './projection.js'
import { dangerHTML, raIcon } from './icons.js'
import { flatAffine, anisoOf, orbitCamera, stageMatrix, matrix3d, screenOf, boardRay, pickBoard, LENS } from './camera3d.js'
import { POLICY, TILT, fitZoom, zoomLimits, tiltLimits, panRange, turned as turnedBy, elevationOfTilt } from './camera-policy.js'
import { createHexVFX, playMeleeAttack, playMagicBolt, playHolyBolt, playArrow, playStatusApply, playStatusTick, STATUS_STYLES } from './hexvfx.js'

export const el = (cls, style, html) => { const d = document.createElement('div')
  if (cls) d.className = cls; if (style) d.style.cssText = style; if (html != null) d.innerHTML = html; return d }
const svgEl = t => document.createElementNS('http://www.w3.org/2000/svg', t)

/** insert `node` right after `ref` (insertBefore only: the headless DOM has no after()) */
const placeAfter = (ref, node) => ref.parentNode.insertBefore(node, ref.nextSibling || null)
export const feetOf = (V, hex) => ({ x: V.data.POS[hex].px, y: V.data.POS[hex].py + V.data.LAYOUT.H * 0.28 })
export const heightOf = (V, hex) => V.data.displayHeights?.[hex] || 0
// Visual interpolation only: both endpoints and whether entry occurred belong
// to the engine. Never change the unit's authoritative hex for this pose.
export const OPPORTUNITY_STEP_MS = 240
export function opportunityPose(V) {
  const a = V.S.AOO
  if (a?.to == null) return null
  if (!V.data.POS[a.from] || !V.data.POS[a.to]) throw new Error('opportunity references unknown hex')
  const u = V.S.U[a.mover]
  if (!u || u.life !== 'standing' || u.hex !== a.from) return null
  const from = feetOf(V, a.from), to = feetOf(V, a.to)
  return { id: a.mover, from: a.from, to: a.to, moveSeq: a.moveSeq,
    x: from.x + (to.x-from.x)/3, y: from.y + (to.y-from.y)/3,
    z: heightOf(V,a.from) + (heightOf(V,a.to)-heightOf(V,a.from))/3 }
}
export function animateOpportunityStep(V, id, from, to) {
  const E = V.layers.UEL.get(id)
  if (!E?.root.animate) return
  if (E.walk) E.walk.cancel()
  E.root.style.transition = 'none'
  const frame = p => ({left:p.x+'px',top:p.y+'px',transform:`translateZ(${p.z}px)`})
  const a = E.root.animate([frame(from),frame(to)], {duration:OPPORTUNITY_STEP_MS/(V.speed*.75),easing:'ease-in-out',fill:'none'})
  E.walk = a
  a.onfinish = a.oncancel = () => { if (E.walk === a) { E.walk = null; E.root.style.transition = ROOT_TRANSITION } }
}
/* the board's tilt NOW: the engine's F.tilt is the starting angle; the painted board's camera may tilt it
   (viewer.painted-board). Everything that foreshortens by the tilt reads this, so it follows the camera. */
export const tiltOf = V => (V.view && V.view.cam && V.view.cam.tilt != null) ? V.view.cam.tilt : V.data.LAYOUT.tilt
export const squash = V => Math.cos(tiltOf(V) * Math.PI / 180)
/** a screen-direction vector turned into the board's frame (undoes the camera's yaw); identity at yaw 0 */
export function unturn(V, x, y) {
  const yaw = (V.view && V.view.cam && V.view.cam.yaw) || 0
  if (!yaw) return { x, y }
  const a = -yaw * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a)
  return { x: x * c - y * sn, y: x * sn + y * c }
}
/** a board-frame vector as the turned camera shows it (applies the yaw); identity at yaw 0 */
export function turned(V, x, y) {
  const yaw = (V.view && V.view.cam && V.view.cam.yaw) || 0
  if (!yaw) return { x, y }
  const a = yaw * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a)
  return { x: x * c - y * sn, y: x * sn + y * c }
}

/* ── keyframes the tokens and floats use (once per document) ─────────── */
export function ensureKeyframes() {
  if (typeof document === 'undefined' || document.getElementById('bvKeyframes')) return
  const s = document.createElement('style'); s.id = 'bvKeyframes'
  s.textContent = '@keyframes floatUp{0%{transform:translateY(0);opacity:0}6%{opacity:1}' +
    '70%{opacity:1}100%{transform:translateY(-52px);opacity:0}}' +
    /* the crit numeral: overshoot in (1.35 → 1), HOLD, then drift like the rest */
    '@keyframes critPop{0%{transform:scale(1.35) translateY(0);opacity:0}8%{opacity:1;transform:scale(1.35) translateY(0)}' +
    '18%{transform:scale(1) translateY(0)}30%{transform:scale(1) translateY(0);opacity:1}' +
    '75%{opacity:1}100%{transform:scale(1) translateY(-52px);opacity:0}}'
  document.body.appendChild(s)
}

/* ── the ground: per-hex swatches and the two persistent ground recipes ── */
function groundLines(d, colour, opt = {}) {
  const g = svgEl('g')
  const mk = (w, col, dash) => { const p = svgEl('path')
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', col)
    p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round')
    if (dash) p.setAttribute('stroke-dasharray', dash); return p }
  g.appendChild(mk(opt.haloW || 7.8, 'rgba(0,0,0,.58)', opt.dash))
  g.appendChild(mk(opt.w || 4.4, colour, opt.dash))
  return g
}
/* the burning ground's flames (and, since viewer.under-unit, a burning body's): gradient, flicker s, delay s */
const FIRE = [['#ffe6a8,#ff9a2e 48%,#e0490c', .62, 0], ['#fff0c8,#ffab3e 50%,#d64810', .84, .21],
  ['#fffbe8,#ffc45c 55%,#e8640f', 1.02, .44], ['#ffe6a8,#ff8f22 52%,#c33f0a', .74, .66]]
function burnTile(l, t) {
  const w = el('lay', `left:${l}px;top:${t}px`)
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,rgba(86,64,46,.42) 25%,rgba(98,76,54,.24) 66%,rgba(104,82,58,.06) 100%);mix-blend-mode:multiply`))
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 60%,rgba(255,130,25,.34) 0%,rgba(70,18,4,.04) 78%);mix-blend-mode:screen;animation:fxPulse 1.3s ease-in-out infinite`))
  ;[[38, 26, 24, 56, 2], [62, 36, 20, 46, 1.6], [52, 46, 30, 38, 2.4], [25, 50, 16, 32, 1.6]]
    .map(([fl, ft, fw, fh, bl], i) => [fl, ft, fw, fh, FIRE[i][0], bl, FIRE[i][1], FIRE[i][2]])
    .forEach(([fl, ft, fw, fh, g, bl, d, dl]) => w.appendChild(el('flame',
      `left:${fl}px;top:${ft}px;width:${fw}px;height:${fh}px;background:linear-gradient(${g});filter:blur(${bl}px);animation:fxFlicker ${d}s ease-in-out ${dl}s infinite`)))
  ;[[44, 60, 5, '#ffca6a', 8, 2.4, 0], [70, 56, 4, '#ffd98a', 7, 3.1, .6], [58, 70, 3, '#ffb347', 6, 2.8, 1.3]]
    .forEach(([fl, ft, sz, c2, gl2, d, dl]) => w.appendChild(el('ember',
      `left:${fl}px;top:${ft}px;width:${sz}px;height:${sz}px;background:${c2};box-shadow:0 0 ${gl2}px #ff9a2e;animation:fxEmber ${d}s linear ${dl}s infinite`)))
  return w
}
function poisonTile(l, t) {
  const w = el('lay', `left:${l}px;top:${t}px`)
  w.appendChild(el('', `position:absolute;inset:0;background:rgba(150,146,110,.85);mix-blend-mode:saturation`))
  w.appendChild(el('', `position:absolute;inset:0;background:rgba(176,206,72,.42);mix-blend-mode:color`))
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,rgba(92,104,44,.34) 20%,rgba(92,104,44,.10) 80%);mix-blend-mode:multiply`))
  ;[[34, 52, 13, '170,240,120,.5', 3.2, 0], [66, 44, 9, '170,240,120,.45', 3.8, .9], [52, 66, 16, '140,215,95,.4', 4.4, 1.8]]
    .forEach(([fl, ft, sz, c2, d, dl]) => w.appendChild(el('',
      `position:absolute;left:${fl}px;top:${ft}px;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(${c2});animation:fxBubble ${d}s ease-in ${dl}s infinite`)))
  return w
}
export function buildGround(V) {
  const { POS, F, LAYOUT, ASSETS } = V.data
  const ground = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d')
  for (let h = 0; h < POS.length; h++) {
    if (F.floor && !F.floor[h]) continue
    const p = POS[h], l = p.px - LAYOUT.W / 2, t = p.py - LAYOUT.H / 2
    const tid = F.terrainIds[h], sw = TSWATCH[tid] || 'hexPlains'
    const tile = el('cell', `left:${l}px;top:${t}px;background-image:url('${ASSETS[sw + '.png']}')`)
    tile.dataset.terrain = tid; ground.appendChild(tile)
    /* a ground that burns draws fire, whatever its id — lava does now (review V9); the retired
       terrain.burning / terrain.poisoned ids still draw for exports made before 2026-09-28 */
    const applies = (V.data.TERRAIN_APPLIES || {})[tid] || []
    if (applies.includes('status.burn') || tid === 'terrain.burning') ground.appendChild(burnTile(l, t))
    if (applies.includes('status.poison') || tid === 'terrain.poisoned') ground.appendChild(poisonTile(l, t))
    ground.appendChild(el('ring grid', `left:${l}px;top:${t}px`))
  }
  /* FIRST child, always: corpses and downed units lie FLAT — coplanar with
     these tiles — so DOM order is the tiebreak (found 2026-08-27). */
  V.dom.stage.insertBefore(ground, V.dom.stage.firstChild)
  V.dom.stage.style.setProperty('--forest-art', `url('${ASSETS['hexForest.png']}')`)
  V.dom.stage.style.setProperty('--rocky-art', `url('${ASSETS['hexScrub.png']}')`)
  V.layers.ground = ground
}

/** Draw authored footprints as a separate layer; the ground remains visible below. */
export function syncProps(V) {
  const props = V.S.props === null ? V.data.F.props : V.S.props
  if (!Array.isArray(props)) throw new Error('field has no canonical props; regenerate the field dump')
  const key = JSON.stringify(props)
  if (V.propKey === key && V.layers.props) return
  V.layers.props?.remove()
  const layer = el('props', 'position:absolute;left:0;top:0;transform-style:preserve-3d;pointer-events:none')
  const { POS, LAYOUT, ASSETS } = V.data
  for (const p of props) {
   if(p.footprint.kind==='polygon') {
    const svg=svgEl('svg'),shape=svgEl('polygon'),F=V.data.F;
    svg.style.cssText='position:absolute;left:0;top:0;overflow:visible;width:1px;height:1px;transform:translateZ(1px)';
    shape.setAttribute('points',p.footprint.vertices.map(([x,y])=>`${POS[0].px+x*F.colStep/2000},${POS[0].py+y*F.rowStep/3000}`).join(' '));
    shape.setAttribute('fill',p.height==='high'?'rgba(62,57,51,.9)':'rgba(119,99,69,.65)');shape.setAttribute('stroke','rgba(220,205,173,.75)');shape.setAttribute('stroke-width','1');
    shape.dataset.prop=p.id;shape.dataset.height=p.height;if(p.steps){shape.dataset.steps=String(p.steps);shape.setAttribute('stroke-dasharray','3 2')}svg.appendChild(shape);layer.appendChild(svg);continue;
   }
   for (const h of p.footprint.hexes) {
    const pos = POS[h]
    if (!pos) throw new Error(`prop ${p.id} has no field position for hex ${h}`)
    const tile = el('prop cell', `left:${pos.px - LAYOUT.W / 2}px;top:${pos.py - LAYOUT.H / 2}px;background-image:url('${ASSETS['hexMountain.png']}');transform:translateZ(1px)`)
    tile.dataset.prop = p.id; tile.dataset.hex = String(h)
    /* R4 (2026-09-23): a prop's authored collision value and `consumes` (map.loaded), as stated */
    tile.title = `${p.id} · ${p.height} · material ${p.material}` + (p.collisionValue != null ? ` · collision ${p.collisionValue}` : '') + (p.consumes ? ' · consumes' : '')
      /* R7 (2026-09-24): steps taken, as the fold holds them (prop.damaged); low cover reads lighter */
      + (p.steps ? ` · damaged ${p.steps}/${p.material}` : '')
    tile.dataset.height = p.height
    if (p.steps) { tile.dataset.steps = String(p.steps); tile.style.filter = 'sepia(.6) brightness(.8)' }
    if (p.height === 'low') tile.style.opacity = '.6'
    if (p.consumes) tile.dataset.consumes = '1'
    layer.appendChild(tile)
  }
  }
  placeAfter(V.layers.ground, layer)
  V.layers.props = layer; V.propKey = key
}

/* ── THE PAINTED GROUND LAYERS (2026-09-03, EVENTS-FOR-THE-VIEWER §6) ──────
   A layer sits ON the terrain: one tile per painted hex, keyed by hex, in a
   persistent layer right after the ground (coplanar, DOM order the tiebreak).
   Burning and poisoned reuse the terrain recipes; frost and weak are tints in
   the status's hue; darkness is a dark veil — and a unit standing in it is
   drawn dimmed (syncUnits), because the log says its hex is dark. */
function frostTile(l, t, hue) {
  const w = el('lay', `left:${l}px;top:${t}px`)
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,${hue}66 0%,${hue}33 55%,${hue}0d 100%);mix-blend-mode:screen`))
  w.appendChild(el('', `position:absolute;inset:0;background:${hue};opacity:.16;mix-blend-mode:color`))
  ;[[40, 44, 9, 0], [76, 58, 7, .8], [58, 84, 11, 1.5], [30, 78, 6, 2.1]].forEach(([fl, ft, sz, dl]) => w.appendChild(el('',
    `position:absolute;left:${fl}px;top:${ft}px;width:${sz}px;height:${sz}px;transform:rotate(45deg);background:${hue};opacity:.7;animation:fxSparkle 2.6s ease-in-out ${dl}s infinite`)))
  return w
}
function tintTile(l, t, hue) {
  const w = el('lay', `left:${l}px;top:${t}px`)
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,${hue}55 0%,${hue}2a 60%,${hue}08 100%)`))
  return w
}
function darkTile(l, t, hue) {
  const w = el('lay dark', `left:${l}px;top:${t}px`)
  w.appendChild(el('', `position:absolute;inset:0;background:${hue};opacity:.78`))
  return w
}
export function layerTile(V, hex, layer) {
  /* Law 1 — the viewer never guesses, and Law 9 — never swallow a failure. A
     paint outside the board is an ENGINE fault, and saying which hex and which
     board turned a bare TypeError deep in a draw call into a one-step diagnosis
     (engine 7be5c55 painted 96 hexes as `null`; ENGINE-FINDINGS #17). */
  const p = V.data.POS[hex]
  if (!p) throw new Error(`layer.painted names hex ${JSON.stringify(hex)}, which is not on this ${V.data.BOARD.width}×${V.data.BOARD.height} board (${V.data.POS.length} hexes) — the engine owes a hex`)
  const l = p.px - V.data.LAYOUT.W / 2, t = p.py - V.data.LAYOUT.H / 2
  const name = (V.data.LAYERS || {})[layer] || ('layer.' + layer)
  const hue = layerHue(name, V.data.LAYER_STATUS)
  if (name === 'layer.burning') return burnTile(l, t)
  if (name === 'layer.poisoned') return poisonTile(l, t)
  if (name === 'layer.frost') return frostTile(l, t, hue)
  if (name === 'layer.darkness') return darkTile(l, t, hue)
  return tintTile(l, t, hue)                   // weak, and any layer the engine adds: the status's hue
}
export function syncLayers(V) {
  const L = V.layers, S = V.S
  if (!L.layL) { L.layL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d'); placeAfter(L.ground, L.layL); L.LAY = new Map() }
  const want = S.layers || {}
  for (const [hex, E] of L.LAY) if (want[hex] !== E.layer) { E.node.remove(); L.LAY.delete(hex) }
  for (const [hex, layer] of Object.entries(want)) {
    if (L.LAY.has(+hex)) { L.LAY.get(+hex).node.style.transform = `translateZ(${heightOf(V, +hex)}px)`; continue }
    const node = layerTile(V, +hex, layer)
    node.style.transform = `translateZ(${heightOf(V, +hex)}px)`
    L.layL.appendChild(node); L.LAY.set(+hex, { layer, node })
  }
}
export const isDark = (V, hex) => { const n = (V.data.LAYERS || {})[(V.S.layers || {})[hex]]; return n === 'layer.darkness' }

/* ── CORPSES (2026-09-03, §3) — board objects, not a dead unit's leftover ──
   corpse.created puts a body on the hex; corpse.removed takes it (raised,
   eaten, consumed, destroyed). The body is the dead unit's own art lying flat
   in the middle of its hex — the look ruled 2026-08-26 ("a corpse, not a
   disappearance") and 2026-09-01 (flat, mid-hex) — drawn from the corpse's
   typeId, so a corpse outlives nothing and needs no unit. A unit that died
   with no corpse (obliterated, a summon) leaves nothing. */
export function syncCorpses(V) {
  const L = V.layers, S = V.S, { ARTMAP, ASSETS, LAYOUT } = V.data
  if (!L.corpseL) { L.corpseL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d'); placeAfter(L.layL || L.ground, L.corpseL); L.CORPSE = new Map() }
  const want = S.corpses || {}
  /* a corpse the fold has removed keeps its node while `corpseGone` plays the
     beat (`leaving`); without this the node was removed in the same tick the
     360ms fade started and all four `how` branches were dead code (REVIEW §C2).
     `cancelBeats` drops the leavers, so a seek is still instant. */
  for (const [id, E] of L.CORPSE) if (!want[id] && !E.leaving) { E.node.remove(); L.CORPSE.delete(id) }
  for (const c of Object.values(want)) {
    /* a body that is its 3D model lies there itself (viewer.character-models): the flat art gives way */
    const art = V.cast?.shows(c.of) ? '0' : '.38'
    if (L.CORPSE.has(c.id)) { const E = L.CORPSE.get(c.id); E.node.style.transform = `translateZ(${heightOf(V, c.hex)}px)`; E.img.style.opacity = art; continue }
    const a = ARTMAP[c.typeId] || ARTMAP._pending
    const f = feetOf(V, c.hex)
    const root = el('corpse', `left:${f.x}px;top:${f.y}px`)
    root.style.transform = `translateZ(${heightOf(V, c.hex)}px)`
    root.dataset.corpse = String(c.id)
    const ch = Math.round(150 * 1.60 * ((a.height || 1.55) / 1.55) * 0.55 * 0.6)
    const cw = Math.round(ch * a.aspect)
    const toCentre = Math.round(LAYOUT.H * 0.28)
    const img = el('', `position:absolute;left:${-cw / 2}px;top:${-ch / 2 - toCentre}px;width:${cw}px;height:${ch}px;` +
      `background-repeat:no-repeat;background-position:center bottom;background-size:contain;transform:rotate(-90deg);opacity:${art};pointer-events:none`)
    img.style.backgroundImage = `url("${ASSETS[a.token]}")`
    root.appendChild(img)
    L.corpseL.appendChild(root); L.CORPSE.set(c.id, { node: root, img })
  }
}
/** the beat a corpse leaves on: a raise lifts it, a feed swallows it, the rest fade */
export function corpseGone(V, corpseId, how) {
  const M = V.layers.CORPSE, E = M && M.get(corpseId); if (!E) return
  const done = () => { E.node.remove(); M.delete(corpseId) }
  if (!E.img.animate) return done()
  const kf = how === 'raised' ? [{ opacity: .38, transform: 'rotate(-90deg)' }, { opacity: 0, transform: 'rotate(-90deg) translateX(-40px)' }]
    : how === 'eaten' || how === 'consumed' ? [{ opacity: .38, transform: 'rotate(-90deg) scale(1)' }, { opacity: 0, transform: 'rotate(-90deg) scale(.4)' }]
    : [{ opacity: .38 }, { opacity: 0 }]
  E.leaving = true
  E.img.animate(kf, { duration: dilate(V, 360), easing: 'ease-in', fill: 'forwards' })
  const t = setTimeout(() => { V.fx.timers.delete(t); done() }, dilate(V, 360) + 40)
  V.fx.timers.add(t)
}

/* ── AURAS (2026-09-03, §7) — derived on read, never emitted: every STANDING
   holder with `auras` on its sheet tints the hexes within each aura's radius.
   The radius uses the engine's exact distance accessor through the readonly
   door — the viewer draws a ring with the geometry it was handed,
   it does not re-implement hex geometry. Hostile auras wear the debuff red,
   friendly ones the buff green (theme AURA_HUE). */
export function syncAuras(V) {
  const L = V.layers, S = V.S, { UD, POS, LAYOUT, distance } = V.data
  if (!L.auraL) { L.auraL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d'); placeAfter(L.corpseL || L.layL || L.ground, L.auraL); L.AURA = new Map() }
  const want = new Map()                                   // hex -> {hue, edge}
  if (distance) for (const u of Object.values(S.U)) {
    if (u.life !== 'standing') continue
    const auras = (UD[u.typeId] || {}).auras || []
    for (const a of auras) {
      const hue = AURA_HUE[a.side] || AURA_HUE.any
      const n = POS.length
      for (let h = 0; h < n; h++) { const d = distance(u.hex, h)
        /* the key carries `edge` too: a hex that was the rim and is now interior
           must get a NEW tile, or it keeps the bright rim opacity for the rest of
           the battle and the edge smears (REVIEW §C1, 2026-09-04) */
        if (d <= a.radius && d > 0) { const edge = d === a.radius, k = h + '|' + hue + '|' + (edge ? 'e' : 'i')
          if (!want.has(k)) want.set(k, { hex: h, hue, edge }) } }
    }
  }
  for (const [k, E] of L.AURA) if (!want.has(k)) { E.remove(); L.AURA.delete(k) }
  for (const [k, w] of want) {
    if (L.AURA.has(k)) continue
    const p = POS[w.hex], l = p.px - LAYOUT.W / 2, t = p.py - LAYOUT.H / 2
    const node = el('lay aura', `left:${l}px;top:${t}px;background:${w.hue}${w.edge ? '30' : '1c'}`)
    L.auraL.appendChild(node); L.AURA.set(k, node)
  }
}

/* ── floating numbers (ruled 2026-08-27: overhead, float up) ─────────────
   Fire-and-forget DOM: created ONCE, drifts via CSS, removes itself. Never
   redrawn from a render — that rebuild was the flicker. */
/* the cue says WHAT the float is; the hue is theme.js's (Law 6) */
export function floatHue(c) {
  switch (c.kind) {
    case 'damage': return DMG_HUE[c.dt] || DMG_HUE.other
    case 'heal': return HEAL_HUE
    case 'status': return stStyle(c.statusId).hue
    case 'crit': return CRIT_HUE
    default: return NOTE_HUE[c.kind] || '#e8e5dc'
  }
}
export function pushFloat(V, hex, text, col, o = {}) {
  if (hex == null) return
  const L = V.layers
  /* viewer.characters-unfaded: the floats ride above the bodies (#stageTop, the stage's twin), never under them */
  if (!L.floatL) { L.floatL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d;pointer-events:none'); (V.dom.stageTop || V.dom.stage).appendChild(L.floatL) }
  const p = V.data.POS[hex]; if (!p) return
  const slot = (L.FLOAT_SLOTS[hex] = (L.FLOAT_SLOTS[hex] ?? -1) + 1)
  const life = o.crit ? 1900 : o.big ? 1500 : 1200
  const wrap = el('bb', `left:${p.px}px;top:${p.py}px`)
  wrap.style.transform = (V.data.displayHeights ? `translateZ(${heightOf(V, hex)}px) ` : '') + 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translateZ(150px)'
  /* units stand taller than the hex — floats start another half-hex above the head */
  if (o.crit) {
    /* rung 2: the numeral IS the crit — bigger, gold-rimmed, snaps in with an
       overshoot and holds ~200ms before it drifts (critPop keyframes) */
    wrap.appendChild(el('dmg crit', `left:-40px;top:${-140 - slot * 30}px;color:${col};font-size:52px;` +
      `-webkit-text-stroke:1.5px ${CRIT_HUE};text-shadow:0 0 14px rgba(255,207,106,.75),0 2px 6px #000;transform-origin:50% 100%;` +
      `animation:critPop 1900ms cubic-bezier(.2,1.3,.4,1) forwards`)).textContent = text
  } else
  wrap.appendChild(el('dmg', `left:-34px;top:${-136 - slot * 30}px;color:${col};` +
    (o.big ? 'font-size:36px;' : o.small ? 'font-size:15px;' : 'font-size:20px;') +
    `animation:floatUp ${life}ms ease-out forwards`)).textContent = text
  L.floatL.appendChild(wrap)
  /* registered like every other beat: an unregistered timer survives seek(),
     fires against a cleared FLOAT_SLOTS and stacks the next floats (REVIEW §C3) */
  const ft = setTimeout(() => { V.fx.timers.delete(ft); wrap.remove()
    if (L.FLOAT_SLOTS[hex] != null) { L.FLOAT_SLOTS[hex]--; if (L.FLOAT_SLOTS[hex] < 0) delete L.FLOAT_SLOTS[hex] } }, life + 60)
  V.fx.timers.add(ft)
}
export function clearFloats(V) {
  if (V.layers.floatL) V.layers.floatL.innerHTML = ''
  for (const k in V.layers.FLOAT_SLOTS) delete V.layers.FLOAT_SLOTS[k]
}

/* ── hexVFX bridge — anchors are {x,y,h}: feet in CANVAS pixels ───────────
   Every call is guarded: a VFX failure must never stop the pump (Law 9
   applies to the run, not to sparkles). */
export function initFX(V) {
  /* Law 6: the canvas palette takes the theme's hues — hexvfx.js ships its own,
     and a second palette is exactly what "one hue per status, everywhere" forbids */
  for (const [style, sid] of Object.entries(VFX_STATUS)) if (STATUS_STYLES[style]) STATUS_STYLES[style].ring = rgb(stStyle(sid).hue)
  STATUS_STYLES.heal.ring = rgb(HEAL_HUE)
  try { V.fx.FX = createHexVFX(V.dom.canvas) } catch (e) { V.fx.FX = null }
}
function anchorOf(V, id) {
  const E = V.layers.UEL.get(id); if (!E || !V.dom.canvas) return null
  try {
    const r = E.root.getBoundingClientRect(), c = V.dom.canvas.getBoundingClientRect()
    const h = (E.img.getBoundingClientRect().height) || 90
    return { x: r.left - c.left, y: r.top - c.top, h }
  } catch (e) { return null }
}
const TIER = n => n == null ? 'med' : n <= 3 ? 'low' : n <= 6 ? 'med' : n <= 10 ? 'high' : 'super'
const DTYPE = { physical: 'phys', magic: 'mag', 'true': 'true' }
const VSTYLE = id => { const n = String(id).replace(/^test\./, '').replace(/^status\./, '')
  return { regeneration: 'regen', stun: 'shadow', daze: 'shadow', slow: 'frost', hobble: 'frost',
    protection: 'weak', ward: 'weak', enfeeble: 'affliction' }[n] || n }
export function fxAttack(V, kind, dt, aId, tId, dmg, crit = false) {
  const FX = V.fx.FX; if (!FX) return
  const A = anchorOf(V, aId), T = anchorOf(V, tId); if (!A || !T) return
  const tier = crit ? 'super' : TIER(dmg)          // rung 2: a crit renders at the super tier regardless of damage
  try {
    if (kind === 'melee')    playMeleeAttack(FX, A, T, DTYPE[dt] || 'phys', tier, {})
    else if (dt === 'magic') playMagicBolt(FX, A, T, tier, {})
    else if (dt === 'true')  playHolyBolt(FX, A, T, tier, {})
    else                     playArrow(FX, A, T, {})
  } catch (e) {}
}
export function fxStatus(V, tId, styleId) {
  const FX = V.fx.FX; if (!FX) return; const T = anchorOf(V, tId); if (!T) return
  try { playStatusApply(FX, T, VSTYLE(styleId)) } catch (e) {}
}
export function fxTick(V, tId, causeId) {
  const FX = V.fx.FX; if (!FX) return; const T = anchorOf(V, tId); if (!T) return
  const st = VSTYLE(causeId)
  if (!['burn', 'poison', 'bleed', 'frost', 'blight'].includes(st)) return
  try { playStatusTick(FX, T, st) } catch (e) {}
}

/* ── one traversal per move (ruled 2026-09-01, VISUAL-BATTLE-UPDATES §1.1) ─
   The token's style already holds the destination (render ran first); this
   animation drives it from the start hex along the whole path under ONE
   easing — duration 200 + 85 × hexes, clamped 320–900ms — with the walk-bob
   cycling once per hex (bob by distance travelled, not per event) and a 60ms
   arrival settle. Web Animations override the style during playback and
   release to it on finish, so there is no snap. Without `animate` (the
   headless verifier) the token is simply already there. */
export const ROOT_TRANSITION = 'left .26s ease, top .26s ease, opacity .5s ease'
/* THE PUMP'S CLOCK OWNS EVERY DURATION (Law 3, enforced 2026-09-04).
   `viewer.js` waits `DUR / (speed * 0.75)` between beats, so a board animation
   measured in wall-clock milliseconds keeps its full length while the beat
   shrinks: at ×2 the pump waits two thirds of the animation, at ×4 a third, and
   the next beat lands inside the running walk every time — which is what made
   the async-cancel race in `traverse` routine rather than rare (REVIEW §C4).

   Dividing by SPEED ALONE (not by the pump's 0.75) keeps the animation the same
   FRACTION of its beat at every speed — (ms/speed) ÷ (DUR/(speed×0.75)) has no
   speed in it — while leaving ×1 byte-identical to what Angela reviewed. */
export const dilate = (V, ms) => Math.max(16, Math.round(ms / (V.speed || 1)))

/* THE LIFT (Angela 2026-09-03, the dwarf with no legs): the token image sits
   2px in front of the ground plane. At z=0 the act ring's haze, the shadow
   (a blurred, composited layer) and the hex tiles paint over the lowest part
   of a billboard — a human lost its boots, an 81px dwarf lost its legs, and
   Andrew's "the units seem too low in the hex" was the same thing. Every
   animation on the image keeps the lift, or the legs vanish for the walk. */
export const LIFT = 'translateZ(2px)'
const BOB = [{ transform: LIFT + ' translateY(0) rotate(0)' }, { transform: LIFT + ' translateY(-6px) rotate(-2.6deg)', offset: .25 },
  { transform: LIFT + ' translateY(-2px) rotate(0)', offset: .5 }, { transform: LIFT + ' translateY(-6px) rotate(2.6deg)', offset: .75 }, { transform: LIFT + ' translateY(0) rotate(0)' }]
export function traverse(V, id, startHex, path, dur, startPose = null, shape = null) {
  const E = V.layers.UEL.get(id), u = V.S.U[id]
  /* the move's shape (the engine's movement power: path, sidestep, flight) rides the token, for its model (viewer.opening-cast) */
  if (E) E.walkShape = shape || 'path'
  if (!E || !u || !E.root.animate) return
  const pts = [startPose || feetOf(V, startHex), ...path.map(h => feetOf(V, h))]
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = cum[cum.length - 1] || 1
  const kf = pts.map((p, i) => ({ left: p.x + 'px', top: p.y + 'px', ...(V.data.displayHeights ? {transform:`translateZ(${heightOf(V, [startHex,...path][i])}px)`} : {}), offset: cum[i] / total }))
  if (startPose) kf[0].transform = `translateZ(${startPose.z}px)`
  if (E.walk) E.walk.cancel()
  E.root.style.transition = 'none'
  const motionDuration = startPose ? dilate(V, dur) : dur
  const a = E.root.animate(kf, { duration: motionDuration, easing: 'cubic-bezier(.35,0,.2,1)', fill: 'none' })
  E.walk = a
  if (u.life === 'standing') E.img.animate(BOB, { duration: Math.max(120, motionDuration / path.length), iterations: path.length, easing: 'ease-in-out' })
  /* `cancel()` dispatches ASYNCHRONOUSLY, so a walk cancelled by a later beat
     runs this handler after that beat has claimed `E.walk` — nulling it would
     orphan the new animation from seek() and dispose() (REVIEW §C4). Only the
     current owner may clear the slot. */
  const release = () => { if (E.walk === a) { E.root.style.transition = ROOT_TRANSITION; E.walk = null } }
  a.oncancel = release
  a.onfinish = () => {
    release()
    if (u.life === 'standing' && E.img.animate) {
      E.img.style.transformOrigin = '50% 100%'
      E.img.animate([{ transform: LIFT + ' scaleY(.94)' }, { transform: LIFT + ' scaleY(1)' }], { duration: 60, easing: 'ease-out' })
    }
  }
}

/* ── THE EMPHASIS LADDER, rungs 2 and 3 (ruled 2026-09-02) ────────────────
   Celebration comes from channels nothing else uses: time (hitstop), the
   camera (the kick), scale-of-motion (the crit numeral) and movement between
   board and panel (the injury plate). Each is reserved for its rung. */
/* rung 2 · the camera KICK — ~6px along the blow, 90ms out, 140ms back;
   translation only, never rotation; on the wrap, outside the 3D scene, so
   applyCam's stage transform is untouched. Reserved for crits. */
export function cameraKick(V, aId, tId) {
  const wrap = V.dom.stage.parentNode, A = V.S.U[aId], T = V.S.U[tId]
  if (!wrap || !wrap.animate || !A || !T) return
  const pa = V.data.POS[A.hex], pt = V.data.POS[T.hex]
  /* along the blow as the camera shows it (viewer.true-3d-camera) */
  if (!V.camera3d) return
  const a = screenOf(boardAffine(V), V.camera3d, pa.px, pa.py, heightOf(V, A.hex)), b = screenOf(boardAffine(V), V.camera3d, pt.px, pt.py, heightOf(V, T.hex))
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1
  const kx = (dx / L * 6).toFixed(1), ky = (dy / L * 6).toFixed(1)
  wrap.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${kx}px,${ky}px)`, offset: 90 / 230 }, { transform: 'translate(0,0)' }],
    { duration: 230, easing: 'ease-out' })
}
/* rung 3 · the INJURY PLATE — the name lands on the token, holds ~900ms, then
   flies to the panel's injury list: nothing else moves between board and
   panel, so it is unmistakable and it teaches where the fact went to live. A
   ~250ms darkening beneath it, once per group. critCount can land several on
   one attack, so plates QUEUE: plate, fly, next plate — never three at once. */
const PLATE_HOLD = 900, PLATE_FLY = 450, DARKEN = 250
export function queueInjury(V, id, name) {
  const Q = (V.fx.injuryQ ??= [])
  Q.push({ id, name })
  if (Q.length === 1) { darken(V); playInjury(V) }
}
/** drop every pending beat — seek() and dispose() call this so nothing lands
    on a board that has moved on (review 2026-09-03) */
export function cancelBeats(V) {
  for (const t of V.fx.timers) clearTimeout(t)
  V.fx.timers.clear()
  /* a seek that lands inside a hitstop would otherwise leave every token frozen
     mid-animation, with the paused animation overriding anything a render
     writes (REVIEW §C5) */
  if (V.fx.paused) { for (const a of V.fx.paused) { try { if (a.playState === 'paused') a.play() } catch (e) {} } V.fx.paused = null }
  if (V.fx.injuryQ) V.fx.injuryQ.length = 0
  for (const n of V.fx.nodes) { try { n.remove() } catch (e) {} }
  V.fx.nodes.clear()
  if (V.fx.FX && V.fx.FX.clear) { try { V.fx.FX.clear() } catch (e) {} }
}
function darken(V) {
  const wrap = V.dom.stage.parentNode; if (!wrap) return
  const d = el('', 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:38')
  wrap.appendChild(d); V.fx.nodes.add(d)
  const done = () => { d.remove(); V.fx.nodes.delete(d) }
  if (d.animate) { const a = d.animate([{ opacity: 0 }, { opacity: .45, offset: .35 }, { opacity: 0 }], { duration: DARKEN }); a.onfinish = done }
  else { const t = setTimeout(() => { V.fx.timers.delete(t); done() }, dilate(V, DARKEN)); V.fx.timers.add(t) }
}
function playInjury(V) {
  const Q = V.fx.injuryQ; const job = Q[0]; if (!job) return
  const u = V.S.U[job.id], wrap = V.dom.stage.parentNode
  const next = () => { Q.shift(); if (Q.length) playInjury(V) }
  if (!u || !wrap) { next(); return }
  const p = V.data.POS[u.hex]
  const bb = el('bb', `left:${p.px}px;top:${p.py}px`)
  bb.style.transform = 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translateZ(160px)'
  const plate = el('injPlate', 'left:-90px;top:-118px;width:180px', `<b>✶</b> ${job.name}`)
  bb.appendChild(plate); V.dom.stage.appendChild(bb); V.fx.nodes.add(bb)
  if (plate.animate) plate.animate([{ transform: 'scale(1.25)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 140, easing: 'cubic-bezier(.2,1.2,.4,1)' })
  const t = setTimeout(() => {
    V.fx.timers.delete(t)
    /* fly: a screen-space clone from the plate's rect to the injured unit's
       list in the panel — the fold makes the injured unit the subject for
       exactly this reason; if the panel has moved on, no flight */
    let from = null, to = null
    try {
      from = plate.getBoundingClientRect()
      const tgt = subjectOf(V) === job.id && V.dom.panel ? V.dom.panel.querySelector('.pInjuries') : null
      to = tgt ? tgt.getBoundingClientRect() : null
    } catch (e) {}
    bb.remove(); V.fx.nodes.delete(bb)
    if (from && to && document.body.animate) {
      const fly = el('injPlate fly', `position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;z-index:1000;margin:0`, `<b>✶</b> ${job.name}`)
      document.body.appendChild(fly); V.fx.nodes.add(fly)
      const a = fly.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(.6)`, opacity: .9 }],
        { duration: PLATE_FLY, easing: 'cubic-bezier(.4,0,.2,1)' })
      a.onfinish = () => { fly.remove(); V.fx.nodes.delete(fly); next() }
    } else next()
  }, PLATE_HOLD)
  V.fx.timers.add(t)
}

/* ── token beats: walk-bob, lunge, flash ───────────────────────────────── */
export function lunge(V, attId, tgtId) {
  const A = V.layers.UEL.get(attId), T = V.S.U[tgtId], from = V.S.U[attId]
  if (!A || !T || !from) return
  const p1 = V.data.POS[from.hex], p2 = V.data.POS[T.hex]
  const dx = p2.px - p1.px, dy = p2.py - p1.py, L = Math.hypot(dx, dy) || 1
  A.bb.style.transition = 'transform .13s ease'
  A.bb.style.transform = `scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translate(${(dx / L * 26).toFixed(0)}px,${(dy / L * 26 * 0.65).toFixed(0)}px)`
  { const t = setTimeout(() => { V.fx.timers.delete(t); A.bb.style.transform = 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti))' }, dilate(V, 170)); V.fx.timers.add(t) }
}
export function hitFlash(V, tgtId) {
  /* a STRIKE, not a glow: 45ms (ruled 2026-09-01; it was 160 and read as a glow) */
  const T = V.layers.UEL.get(tgtId); if (!T) return
  T.flash.style.opacity = '1'
  { const t = setTimeout(() => { V.fx.timers.delete(t); T.flash.style.opacity = '0' }, dilate(V, 60)); V.fx.timers.add(t) }
}
/* HITSTOP (ruled 2026-09-01): freeze TOKEN TRANSFORMS ONLY — every animation
   under the units layer (traversals, bobs, the lunge's transition) pauses for
   the beat; the canvas VFX and the floating numbers keep running, because they
   are other layers. Time is a channel nothing else on the board uses. */
export function hitstop(V, ms) {
  const L = V.layers.unitsL; if (!L || !L.getAnimations) return
  const anims = L.getAnimations({ subtree: true }).filter(a => a.playState === 'running')
  if (!anims.length) return
  for (const a of anims) a.pause()
  /* the resume must survive a seek landing inside the freeze: cancelBeats
     clears every timer, so it calls resumeAll() too (REVIEW §C5) */
  const resume = () => { for (const a of anims) { try { if (a.playState === 'paused') a.play() } catch (e) {} } }
  V.fx.paused = anims
  const t = setTimeout(() => { V.fx.timers.delete(t); V.fx.paused = null; resume() }, dilate(V, ms))
  V.fx.timers.add(t)
}

/* ── 2026-09-03 beats: arrivals, the rise, the ZoC hold, banners, Power ──── */
/* an ARRIVAL (a wave's unit.enter after battle.begin): the token drops in and
   settles — the summon-arrival design's landing, without its iris (HANDOFF-
   ICONS-AND-SUMMON §3; the iris used a blur, which flattens the 3D scene) */
export function arrive(V, id) {
  /* the cue plays before the beat's render, so the arrival's token may not
     exist yet — make it now, so the drop-in has something to drop */
  if (!V.layers.UEL.has(id)) syncUnits(V)
  const E = V.layers.UEL.get(id); if (!E || !E.root.animate) return
  E.bb.animate([{ transform: 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translateY(-46px)', opacity: 0 }, { transform: 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translateY(0)', opacity: 1 }],
    { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)' })
}
/* the RISE (unit.raised): the raised body stands up from the corpse's flat pose */
export function rise(V, id) {
  const E = V.layers.UEL.get(id); if (!E || !E.img.animate) return
  E.img.style.transformOrigin = '50% 100%'
  E.img.animate([{ transform: LIFT + ' rotate(-80deg) scaleY(.4)', opacity: .3 }, { transform: LIFT + ' rotate(0) scaleY(1)', opacity: 1 }],
    { duration: 620, easing: 'cubic-bezier(.3,0,.2,1)' })
}
/* a BANNER over the board (a wave, night, the band, the objective): screen
   space, top centre, 1.6s, one at a time — the newest replaces the last */
export function banner(V, kind, text, sub) {
  const wrap = V.dom.stage.parentNode; if (!wrap) return
  const old = wrap.querySelector('.banner'); if (old) { old.remove(); V.fx.nodes.delete(old) }
  const b = el('banner ' + kind, '', `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`)
  wrap.appendChild(b); V.fx.nodes.add(b)
  if (b.animate) b.animate([{ opacity: 0, transform: 'translate(-50%,-8px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: .12 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1600, fill: 'forwards' })
  const t = setTimeout(() => { b.remove(); V.fx.nodes.delete(b); V.fx.timers.delete(t) }, dilate(V, 1650))
  V.fx.timers.add(t)
}
/* the Power chip pulses when the pool rises (the number is the fold's) */
export function powerPulse(V) {
  const chip = V.dom.powerchip; if (!chip || !chip.animate) return
  chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: .3 }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' })
}
/* the STAND (deathbed.stood): the token draws itself up — a scale beat, the
   opposite of the settle — and the blood begins (syncUnits shows it) */
export function standBeat(V, id) {
  const E = V.layers.UEL.get(id); if (!E || !E.img.animate) return
  E.img.style.transformOrigin = '50% 100%'
  E.img.animate([{ transform: LIFT + ' scaleY(.82)' }, { transform: LIFT + ' scaleY(1.06)', offset: .6 }, { transform: LIFT + ' scaleY(1)' }], { duration: 520, easing: 'cubic-bezier(.2,1.2,.4,1)' })
}

/* KNOCKBACK BEYOND ONE (engine 2e649b5, §12): a push of `asked` travels
   `hexes`, so the token slides the whole way rather than teleporting — the
   move traversal's easing, at a shove's pace. */
export function shove(V, id, from, to, hexes) {
  const E = V.layers.UEL.get(id)
  if (!E || !E.root.animate || from == null || to == null || from === to) return
  const a = feetOf(V, from), b = feetOf(V, to)
  const dur = dilate(V, Math.min(420, 150 + 90 * Math.max(1, hexes || 1)))
  if (E.walk) E.walk.cancel()
  E.root.style.transition = 'none'
  const anim = E.root.animate([{ left: a.x + 'px', top: a.y + 'px', ...(V.data.displayHeights ? {transform:`translateZ(${heightOf(V, from)}px)`} : {}) }, { left: b.x + 'px', top: b.y + 'px', ...(V.data.displayHeights ? {transform:`translateZ(${heightOf(V, to)}px)`} : {}) }],
    { duration: dur, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' })
  E.walk = anim
  /* only the current owner clears the slot — see traverse (REVIEW §C4) */
  anim.oncancel = anim.onfinish = () => { E.root.style.transition = ROOT_TRANSITION; if (E.walk === anim) E.walk = null }
}

/* a BADGE gained mid-battle (engine 2e76ede): the token pulses in the badge's
   own red — the float says which badge, this says WHO */
export function badgeBeat(V, id) {
  const E = V.layers.UEL.get(id); if (!E || !E.bb.animate) return
  E.bb.animate([{ transform: 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) scale(1)' }, { transform: 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) scale(1.08)', offset: .35 },
    { transform: 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) scale(1)' }], { duration: dilate(V, 420), easing: 'ease-out' })
}

/* DEATHBED FIGHTING — the modal (Angela, 2026-09-03 evening, VISUAL-BATTLE-
   UPDATES §3.2). Screen space over the board wrap, outside the 3D scene; the
   pump holds the beat, which is the freeze. Stage one: UNIT DOWNED — Deathbed
   Fighting roll, the unit's name, the roll against the chance. Stage two: the
   bold result. The replay times it (DB_STAGE, DB_TOTAL); the game will wait
   for a click. One at a time — a new one replaces the last. */
export const DB_STAGE = 1100, DB_TOTAL = 2600
export function deathbedModal(V, c) {
  const wrap = V.dom.stage.parentNode, u = V.S.U[c.id]; if (!wrap || !u) return
  const old = wrap.querySelector('.dbModal'); if (old) { old.remove(); V.fx.nodes.delete(old) }
  const roll = c.n != null ? `<span class="dbRoll">rolled <b>${c.n}</b> vs ${c.chance}</span>` : ''
  /* three results since the reversal (engine b4cbd9b): stood, fell, and none —
     a unit already Wounded gets no roll at all */
  const stage1 = c.result === 'none'
    ? `<span class="dbHead">UNIT DOWNED</span><span class="dbSub">Already Wounded — no roll</span><span class="dbName">${u.name}</span>`
    : `<span class="dbHead">UNIT DOWNED</span><span class="dbSub">Deathbed Fighting roll</span><span class="dbName">${u.name}</span>${roll}`
  const stage2 = c.result === 'stood'
    ? `<span class="dbHead gold">DEATHBED FIGHTING</span><span class="dbBold gold">This hero fights on.</span><span class="dbName">${u.name}</span>${roll}`
    : c.result === 'fell'
    ? `<span class="dbHead red">DEATHBED FIGHTING</span><span class="dbBold red">This hero falls.</span><span class="dbName">${u.name}</span>${roll}`
    : `<span class="dbHead red">DEATHBED FIGHTING</span><span class="dbBold red">This hero falls.</span><span class="dbName">${u.name}</span>`
  /* the veil and the plate are built as elements and the plate's content is
     SET on it — a nested innerHTML is not readable back on every DOM the
     verifier runs (found 2026-09-04) */
  const m = el('dbModal ' + c.result, '')
  m.appendChild(el('dbVeil', ''))
  const plate = el('dbPlate', '')
  plate.innerHTML = stage1
  m.appendChild(plate)
  wrap.appendChild(m); V.fx.nodes.add(m)
  if (plate.animate) plate.animate([{ transform: 'scale(1.12)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 160, easing: 'cubic-bezier(.2,1.2,.4,1)' })
  const t1 = setTimeout(() => { V.fx.timers.delete(t1); plate.innerHTML = stage2; plate.className = 'dbPlate ' + c.result
    if (plate.animate) plate.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,1.3,.4,1)' }) }, dilate(V, DB_STAGE))
  const t2 = setTimeout(() => { V.fx.timers.delete(t2); m.remove(); V.fx.nodes.delete(m) }, dilate(V, DB_TOTAL))
  V.fx.timers.add(t1); V.fx.timers.add(t2)
}

/* ── play the fold's cues on the DOM ───────────────────────────────────── */
export function playCues(V, cues) {
  for (const c of cues) {
    switch (c.k) {
      /* the models strike and flinch on the same cues the standees lunge and flash on (viewer.character-models) */
      case 'lunge': lunge(V, c.a, c.t); V.cast?.strike(c.a, c.t, c.kind); break
      case 'flash': hitFlash(V, c.id); V.cast?.flinch(c.id); break
      case 'hitstop': hitstop(V, c.ms); break
      case 'float': pushFloat(V, c.hex, c.text, floatHue(c), c); break
      case 'fx.attack': fxAttack(V, c.kind, c.dt, c.a, c.t, c.dmg, c.crit); break
      case 'kick': cameraKick(V, c.a, c.t); break
      case 'injury': queueInjury(V, c.id, c.name); break
      case 'fx.status': fxStatus(V, c.id, c.style); break
      case 'fx.tick': fxTick(V, c.id, c.cause); break
      case 'inspect.clear': V.view.inspectId = null; break
      /* 2026-09-03 */
      case 'arrive': arrive(V, c.id); break
      case 'rise': rise(V, c.id); break
      case 'banner': banner(V, c.kind, c.text, c.sub); break
      case 'power': powerPulse(V); break
      case 'corpse.gone': corpseGone(V, c.corpse, c.how); break
      case 'stand': standBeat(V, c.id); break
      case 'deathbed': deathbedModal(V, c); break
      case 'shove': shove(V, c.id, c.from, c.to, c.hexes); break
      case 'badge': badgeBeat(V, c.id); break
    }
  }
}

/* ── persistent unit elements ──────────────────────────────────────────── */
function mkUnit(V, u) {
  const { ARTMAP, ASSETS } = V.data
  const a = ARTMAP[u.typeId] || ARTMAP._pending      // Law 1: an honest ART PENDING standee, never borrowed art
  const root = el('', 'position:absolute;width:0;height:0;transform-style:preserve-3d;transition:' + ROOT_TRANSITION)
  const tint = SIDE_TINT[u.side] || SIDE_TINT.enemy, glow = SIDE_GLOW[u.side] || SIDE_GLOW.enemy
  const fring = el('fring', `left:-46px;top:-30px;width:92px;height:60px;border-color:${tint};opacity:.55`)
  const shadow = el('shadow', 'left:-44px;top:-24px;width:88px;height:44px;transform:rotate(-16deg) scale(1.05,.8);opacity:.58')
  const actA = el('act-a', 'left:-68px;top:-45px;width:136px;height:90px;display:none')
  const actB = el('act-a2', 'left:-58px;top:-38px;width:116px;height:76px;display:none')
  const selR = el('sel', 'left:-48px;top:-31px;width:96px;height:62px;display:none')
  const downR = el('', 'position:absolute;left:-58px;top:-38px;width:116px;height:76px;border-radius:50%;border:3px dashed rgba(255,90,90,.85);box-shadow:0 0 20px rgba(180,20,20,.5);pointer-events:none;display:none')
  const bb = el('bb', 'left:0;top:0')
  /* a DIV with background-image, not an <img>; and NO filter — filters force
     flattening inside 3D contexts */
  const img = el('', 'position:absolute;background-repeat:no-repeat;background-position:center bottom;background-size:contain;pointer-events:none;cursor:pointer')
  img.style.backgroundImage = `url("${ASSETS[a.token]}")`
  const id = u.id
  /* the token's own click (a host or a test that clicks it); a pointer's click is the camera's pick (bindCamera) */
  img.addEventListener('click', ev => { ev.stopPropagation(); if (!V.clickSuppressed?.(ev)) clickUnit(V, id) })
  img.addEventListener('pointerenter', () => { const current = V.S.U[id]; if (current && V.play) V.offerPlay({ kind: 'point', hex: current.hex }) })
  bb.appendChild(img)
  const flash = el('', 'position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,220,160,.4) 55%,transparent 75%);opacity:0;transition:opacity .045s ease;pointer-events:none')
  bb.appendChild(flash)
  const badges = el('badges', '')
  const hpbar = el('hpbar', ''); const hpfill = el('hpfill', ''); hpbar.appendChild(hpfill)
  const prot = el('', 'display:none')
  const mark = el('actMark', 'display:none')
  /* viewer.under-unit: the name under the feet, and what a status draws ON the body (Stun, Burn, Poison) */
  const name = el('uuName', 'display:none'), fx = el('uuFx', 'display:none')
  bb.appendChild(fx); bb.appendChild(badges); bb.appendChild(hpbar); bb.appendChild(prot); bb.appendChild(mark); bb.appendChild(name)
  const clock = el('clockchip', 'left:-20px;top:16px;display:none')
  /* NO PLATE (ruled 2026-09-01); LIFTED toward the camera with translateZ so the
     hex in front does not shear the numeral (PLAYBACK-DESIGN §7.3d) */
  const mv = el('', 'position:absolute;display:none;font:700 17px ui-monospace,monospace;' +
    'pointer-events:none;transform:translateZ(60px);' +
    'text-shadow:0 2px 4px #000,0 0 9px rgba(0,0,0,.95),0 0 2px #000')
  bb.appendChild(mv)
  const dg = el('', 'position:absolute;display:none;align-items:center;gap:4px;' +
    'pointer-events:none;transform:translateZ(60px);' +
    'text-shadow:0 2px 4px #000,0 0 9px rgba(0,0,0,.95),0 0 2px #000')
  bb.appendChild(dg)
  root.appendChild(fring); root.appendChild(shadow); root.appendChild(actA)
  root.appendChild(actB); root.appendChild(selR); root.appendChild(downR)
  root.appendChild(bb); root.appendChild(clock)
  V.layers.unitsL.appendChild(root)
  return { root, fring, shadow, actA, actB, selR, downR, bb, img, flash, badges, hpbar, hpfill, prot, mark, clock, mv, dg, glow, a, name, fx }
}
/* ── UNDER THE UNIT (viewer.under-unit, 2026-09-29; engine DECISIONS.md "the playable battle screen" and "the
   playable screen: the acting mark ..."; PLAYABLE-OPENING-PLAN.md item 6) ─────────────────────────────────────
   "a health bar and name underneath the units … some icons go there as well" · "Protection should be represented
   by a bar underneath health" · no Poison or Burn icon: "we can display that on the unit directly with a fire and
   poison" · "Stun should be shown on a character" · Slow "can just change the number that shows how much movement
   that character has". Drawn on the playable screen's battles — those bound to a painted scene (SWITCHES
   underUnitWhere); every other board keeps the beside-the-token bar and the overhead glyphs it was ruled with.
   The Health and Protection bars are the SAME elements laid across (rotated 90°, so they fill from the left):
   the fill is still the folded HP and the segments still the engine's absorbing pool — nothing new is counted. */
export const underUnit = V => V.data.atlas?.kind === 'painted'
const UU = { w: 64, name: 10, hp: 28, prot: 38, icons: 46, iconsBare: 38, lift: 'translateZ(60px)' }
const BODY_FX = {
  /* the burning ground's flames (its colours and flicker), as tongues standing up the body: pointed, translucent,
     low on the figure so the figure still shows through */
  burn: H => { const W = Math.max(30, Math.round(H * .46))
    const at = [[-.3, 0, .34, .4], [.3, .02, .3, .36], [0, .1, .36, .46], [-.18, .36, .26, .3], [.2, .4, .24, .28]]
    const tongue = 'polygon(50% 0,60% 20%,76% 44%,86% 68%,78% 90%,50% 100%,22% 90%,14% 68%,24% 44%,40% 20%)'
    return '<div class="uuFire">' + at.map(([x, b, fw, fh], i) => { const [g, d, dl] = FIRE[i % FIRE.length], [c1, c2, c3] = g.split(',').map(c => c.split(' ')[0])
      const ww = Math.round(fw * W), hh = Math.round(fh * H)
      return `<div class="flame" style="left:${Math.round(x * W - ww / 2)}px;top:${-Math.round(b * H) - hh}px;width:${ww}px;height:${hh}px;clip-path:${tongue};` +
        `background:radial-gradient(ellipse 50% 62% at 50% 76%,${c1} 0%,${c2} 30%,${c3}99 58%,${c3}00 78%);opacity:.82;` +
        `animation:fxFlicker ${d}s ease-in-out ${dl + i * .13}s infinite"></div>` }).join('') +
      [[-.18, .3, 2.4, 0], [.14, .45, 3.1, .6], [.02, .6, 2.8, 1.3]].map(([x, b, d, dl]) => `<div class="ember" style="left:${Math.round(x * W)}px;` +
        `top:${-Math.round(b * H)}px;width:4px;height:4px;background:#ffca6a;box-shadow:0 0 7px #ff9a2e;animation:fxEmber ${d}s linear ${dl}s infinite"></div>`).join('') + '</div>' },
  /* Poison's green haze and its bubbles rising off the body */
  poison: H => { const W = Math.max(30, Math.round(H * .46)), c = rgb(stStyle('status.poison').hue)
    return `<div class="uuPoison"><div style="position:absolute;left:${-Math.round(W * .7)}px;top:${-Math.round(H * .9)}px;width:${Math.round(W * 1.4)}px;` +
      `height:${Math.round(H * .9)}px;border-radius:50%;background:radial-gradient(ellipse at 50% 62%,rgba(${c},.46) 0%,rgba(${c},.18) 45%,rgba(${c},0) 72%);` +
      'animation:fxPulse 1.9s ease-in-out infinite"></div>' +
      [[-.22, .18, 11, 3.2, 0], [.2, .34, 9, 3.8, .9], [-.04, .52, 13, 4.4, 1.8], [.12, .7, 8, 3.4, 2.4], [-.16, .44, 7, 3.6, 1.2]].map(([x, b, s, d, dl]) =>
        `<div style="position:absolute;left:${Math.round(x * W - s / 2)}px;top:${-Math.round(b * H)}px;width:${s}px;height:${s}px;border-radius:50%;` +
        `background:rgba(${c},.72);box-shadow:0 0 4px rgba(${c},.8);animation:fxBubble ${d}s ease-in ${dl}s infinite"></div>`).join('') + '</div>' },
  /* Stun's stars circling the head, in Stun's hue and glyph */
  stun: H => { const st = stStyle('status.stun')
    return `<div class="uuStun" style="position:absolute;left:0;top:${-H - 12}px">` +
      [0, 1, 2].map(i => `<div class="uuStar" style="clip-path:${st.gl};background:${st.hue};animation-delay:${-(i * .5).toFixed(2)}s"></div>`).join('') + '</div>' },
}
/** the standee's size from its art row (ruled 2026-08-26: units reduced 45%; a downed one half height, lying) */
function standeeSize(a, down) {
  const base = Math.round(150 * 1.60 * ((a.height || 1.55) / 1.55) * (down ? 0.5 : 1))
  const hpx = Math.round(base * 0.55)
  return { base, hpx, w: Math.round(hpx * a.aspect * (down ? 2 : 1)) }
}
export function syncUnits(V) {
  const { S, view, layers: L } = V, { UD, LAYOUT } = V.data
  if (!L.unitsL) { L.unitsL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d'); V.dom.stage.appendChild(L.unitsL) }
  const bare = view.bare
  for (const [id, E] of L.UEL) if (!S.U[id]) E.root.style.display = 'none'
  for (const u of Object.values(S.U)) {
    let E = L.UEL.get(u.id); if (!E) { E = mkUnit(V, u); L.UEL.set(u.id, E) }
    const attempted = opportunityPose(V)
    const f = attempted?.id === u.id ? attempted : feetOf(V, u.hex)
    E.root.style.left = f.x + 'px'; E.root.style.top = f.y + 'px'
    E.root.style.transform = V.data.displayHeights || attempted?.id === u.id ? `translateZ(${attempted?.id === u.id ? attempted.z : heightOf(V, u.hex)}px)` : ''
    if (u.life === 'dead') {
      /* a corpse, not a disappearance (ruled 2026-08-26) — and since 2026-09-03
         the corpse is the engine's board object (corpse.created), drawn by
         syncCorpses from the log; the unit's own token leaves. A death with no
         corpse (obliterated, a summon) leaves nothing, as the log says. */
      E.root.style.display = 'none'
      continue
    }
    E.root.style.display = ''
    /* a unit standing in painted darkness is drawn dimmed: the hex is dark (§6) */
    E.root.style.opacity = isDark(V, u.hex) ? '.5' : '1'
    E.badges.style.display = ''; E.mark.style.display = ''
    const down = u.life === 'downed'
    /* Ruled 2026-08-26: units reduced 45%; the health bar keeps its size. */
    const { base, hpx, w } = standeeSize(E.a, down)
    E.img.style.left = (-w / 2) + 'px'; E.img.style.top = (-hpx) + 'px'
    E.img.style.width = w + 'px'; E.img.style.height = hpx + 'px'
    /* PRONE (v2.prone, 2026-09-23 — PROVISIONAL, Angela to judge; VIEWER-CHECKPOINT):
       the unit.proned the log stated lays the figure over — full size, tipped
       62° onto its side and dropped toward its hex, the billboard leaning back
       — until unit.stood. Distinct from DOWNED (half size, flat 90°, the red
       ring): a prone unit keeps its HP bar, pips and full opacity. A class on
       the root and inline transforms only: no filter, the 3D chain untouched. */
    const prone = !down && !!(u.prone && u.prone.length)
    E.root.classList.toggle('tokProne', prone)
    E.img.style.transform = down ? 'rotate(-90deg) ' + LIFT : prone ? 'rotate(-62deg) ' + LIFT : LIFT
    if (down) E.img.style.top = (-Math.round(hpx * 0.42)) + 'px'
    else if (prone) E.img.style.top = (-Math.round(hpx * 0.9)) + 'px'
    /* A DOWNED HERO IS STILL A PERSON, not a decal (ruled 2026-09-01). A unit drawn as its 3D model
       (viewer.character-models) keeps the standee only as its click target: ring, shadow, bars, chips and
       the bleed-out counter stay; the picture is the model's. */
    const modelled = !!V.cast?.shows(u.id)
    /* what rides the figure's head (the acting arrow, the overhead glyphs, the stars of a Stun) rides the MODEL's
       head where a model stands — about two thirds of the standee (SWITCHES modelScale, viewer.under-unit) */
    const figPx = modelled ? Math.round(V.cast.heightPx?.(u.id) || hpx) : hpx
    /* what the pointer's ray meets (pickAt): an upright body on the feet, as tall as the figure drawn — a downed one low and wide */
    E.pick = down ? { r: Math.max(30, w / 2), h: 36 } : { r: Math.max(26, Math.round(w * .36)), h: figPx }
    const under = underUnit(V)
    /* viewer.bodies-before-board: a body still loading is not stood in for by its 2D token (the token stays the click
       target, unseen); a body that cannot be had keeps its token, as before */
    const waiting = !modelled && !!V.cast?.pending?.(u.id)
    E.img.style.opacity = modelled || waiting ? '0' : down ? '.82' : '1'
    E.img.style.boxShadow = down && !modelled ? '0 10px 16px -6px rgba(0,0,0,.85)' : ''
    E.flash.style.left = (-w / 2 - 8) + 'px'; E.flash.style.top = (-hpx * 0.7) + 'px'
    E.flash.style.width = (w + 16) + 'px'; E.flash.style.height = (hpx * 0.6) + 'px'
    E.downR.style.display = down ? '' : 'none'
    /* bleed-out: a BIG red number, white outline, upper-right (ruled 2026-08-26) */
    if (down && u.bleed > 0) {
      E.clock.style.cssText = 'left:22px;top:-64px;display:block;background:none;border:none;' +
        'padding:0;font:700 40px \'Barlow Semi Condensed\',sans-serif;color:#ff3226;' +
        '-webkit-text-stroke:1.8px #fff;text-shadow:0 2px 6px rgba(0,0,0,.65)'
      E.clock.textContent = String(u.bleed)
    } else E.clock.style.display = 'none'
    E.fring.style.display = (bare || down) ? 'none' : ''
    /* an encounter OBJECTIVE (a civilian whose death loses) wears a dashed ring */
    E.fring.style.borderStyle = u.objective ? 'dashed' : 'solid'
    /* THE FOOTPRINT FOLLOWS THE STATURE (Angela 2026-09-03: the dwarf, once
       short, stood "at the wrong elevation" — a human-sized ring and shadow
       under an 81px figure read as a platform he hovers on). The ring, the
       shadow, the act rings and the select ring scale with the token's height
       against the human 132px, clamped so a mite keeps a readable ring and a
       dragon's does not swallow its neighbours. */
    const fp = Math.min(1.4, Math.max(0.55, hpx / 132))
    const R = (elm, l, t, wd, ht) => { elm.style.left = Math.round(l * fp) + 'px'; elm.style.top = Math.round(t * fp) + 'px'; elm.style.width = Math.round(wd * fp) + 'px'; elm.style.height = Math.round(ht * fp) + 'px' }
    R(E.fring, -46, -30, 92, 60); R(E.actA, -68, -45, 136, 90); R(E.actB, -58, -38, 116, 76); R(E.selR, -48, -31, 96, 62); R(E.downR, -58, -38, 116, 76)

    if (down && !bare) {
      E.shadow.style.display = ''
      E.shadow.style.cssText = `left:${-w / 2 - 6}px;top:-6px;width:${w + 12}px;height:22px;` +
        'transform:rotate(-90deg) scale(1.25,.7);opacity:.5;' +
        'background:radial-gradient(ellipse,rgba(4,4,3,.9),rgba(4,4,3,0) 72%)'
    } else {
      E.shadow.style.display = bare ? 'none' : ''
      if (!bare && !down) E.shadow.style.cssText = `left:${Math.round(-44 * fp)}px;top:${Math.round(-24 * fp)}px;width:${Math.round(88 * fp)}px;height:${Math.round(44 * fp)}px;` +
        'transform:rotate(-16deg) scale(1.05,.8);opacity:.58'
    }
    E.bb.style.transform = down ? 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(calc(var(--anti) * 0.68))' : prone ? 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(calc(var(--anti) * 0.82))' : 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti))'
    E.actA.style.display = E.actB.style.display = (!bare && u.id === S.activeId && !down) ? '' : 'none'
    E.mark.style.cssText = `left:-9px;top:${-figPx - 46}px;display:${u.id === S.activeId && !down ? 'block' : 'none'}`
    E.selR.style.display = u.id === view.inspectId ? '' : 'none'
    /* Movement numeral, lower-left (ruled 2026-08-26) */
    {
      const acted = !!S.acted[u.id], isActive = u.id === S.activeId
      let num = null, grey = false
      /* the resting figure is the sheet's plus every movement modifier the log
         stated (an item's, a wound's); the engine's own budget outranks it
         during an activation (activation.begin movePoints, moved movePointsLeft) */
      const rest = mvOf(u, V.data)
      if (u.side === 'enemy') { num = isActive && u.activeMv != null ? u.activeMv : rest; grey = acted && !isActive }
      else if (!down) {
        if (isActive) { num = u.activeMv ?? rest; if (num === 0) num = null }
        else if (!acted) num = rest
      }
      if (num == null) E.mv.style.display = 'none'
      else {
        E.mv.style.display = ''
        E.mv.style.left = (-w / 2 - 10) + 'px'; E.mv.style.top = '-10px'
        E.mv.textContent = String(num)
        E.mv.style.color = grey ? '#8b8778' : (u.side === 'enemy' ? '#d9b8f2' : '#ffe2a0')
      }
      /* danger, lower-right — GREY, never faction-coloured (ruled 2026-09-01) */
      const dgr = dangerOf(u, V.data)
      if (!dgr || down) E.dg.style.display = 'none'
      else {
        const GREY = '#c3bdb0'
        E.dg.style.display = 'flex'
        E.dg.style.left = (w / 2 - 4) + 'px'; E.dg.style.top = '-10px'
        E.dg.style.color = GREY
        E.dg.innerHTML = dangerHTML(dgr, GREY)
      }
    }
    /* HP bar rides the token; trimmed from the BOTTOM only (ruled 2026-09-01) */
    const frac = Math.max(0, u.hp / u.maxHp)
    const bhFull = modelled ? figPx : Math.round(base * 0.55)
    const BAR_TRIM = 18
    const bh = Math.max(24, bhFull - BAR_TRIM)
    /* the absorbing pool the Protection bar draws (§1): the engine's absorbing statuses, as folded */
    const pool = V.data.ABSORBING_STATUSES.reduce((n, id) => n + (u.st[id] || 0), 0)
    /* under the unit: laid across below the name, filling from the left (UU above) */
    const across = top => `left:${UU.w / 2}px;top:${top}px;height:${UU.w}px;transform-origin:0 0;transform:${UU.lift} rotate(90deg)`
    E.hpbar.style.cssText = down ? 'display:none' : under ? across(UU.hp) : `left:${w / 2 + 7}px;top:${-bhFull}px;height:${bh}px`
    /* CONSTANT fill (ruled 2026-09-01): colour here means gain or loss only */
    E.hpfill.style.cssText = `height:${Math.round(100 * frac)}%;background:linear-gradient(#e9e3d2,#c3bba4);transition:height .3s ease`
    {
      /* PROTECTION: its own segmented bar beside the HP bar (§1) */
      const segs = Math.min(12, pool)
      if (down || segs <= 0) E.prot.style.display = 'none'
      else {
        E.prot.style.cssText = (under ? `position:absolute;${across(UU.prot)};width:5px;` : `position:absolute;left:${w / 2 + 7 + 9}px;top:${-bhFull}px;height:${bh}px;width:6px;`) +
          `display:flex;flex-direction:column-reverse;gap:1px;pointer-events:none`
        E.prot.innerHTML = Array.from({ length: segs }, (_, i) =>
          `<div style="flex:1;border-radius:1px;background:${stStyle('status.protection').hue};` +
          `box-shadow:0 0 3px rgba(0,0,0,.9)"></div>`).join('')
      }
    }
    /* OVERHEAD GLYPHS: Stun · Weak · one chevron — and, since 2026-09-04, the
       DEATHBED SKULL (Angela: "they need a skull in their status bar, to show
       they're on death's door" · "Use a very small skull for what goes
       overhead, and make it red"). Small and red is what tells it apart from
       a future death prediction; only the engine may supply that fact. NOTHING ELSE (§1). */
    const OVER = ['status.stun', 'test.status.daze', 'status.dazed', 'status.weak', 'test.status.enfeeble']
    /* under the unit, every status is an icon but those drawn on the body, the movement-only ones and the
       Protection bar's pool (viewer.under-unit) */
    const iconed = id => under ? !onBodyAs(id) && !movementOnly(id) && !V.data.ABSORBING_STATUSES.includes(id) : OVER.includes(id)
    const sts = Object.entries(u.st).filter(([id, v]) => v > 0 && iconed(id))
    /* the chevron is the buff/debuff layer — the stat block's green and red
       (ruled 2026-09-01 for move riders), not a status's hue (Law 6) */
    /* the kit and the growth a unit was fielded with (unit.equipped,
       unit.grown — `fielded`) are what it IS, not a buff — the chevron counts
       only what happened in the battle */
    const live = (u.mods || []).filter(m => !m.fielded)
    const chev = live.length ? live.reduce((n, m) => n + (m.value > 0 ? 1 : -1), 0) : 0
    E.badges.classList.toggle('uuIcons', under)
    E.badges.style.cssText = down ? 'display:none' : under
      ? `left:${-UU.w / 2}px;top:${pool > 0 ? UU.icons : UU.iconsBare}px;width:${UU.w}px;justify-content:center;transform:${UU.lift}`
      : `left:${-w / 2 - 2}px;top:${-figPx - 22}px`
    /* the name, under the feet (the unit's own, from its unit.enter) */
    if (under && !bare) { E.name.style.cssText = `display:block;left:-90px;top:${UU.name}px;width:180px;color:${SIDE_TINT[u.side] || SIDE_TINT.enemy}`
      if (E.name.textContent !== u.name) E.name.textContent = u.name }
    else E.name.style.display = 'none'
    /* ON THE BODY: Stun's stars, Burn's flames, Poison's haze — rebuilt only when what is drawn changes, so the
       animations run on and are not restarted by every render */
    const body = under && !down ? [...new Set(Object.entries(u.st).filter(([, v]) => v > 0).map(([id]) => onBodyAs(id)).filter(Boolean))].sort() : []
    const fxKey = body.join(',') + '|' + figPx
    if (E.fxKey !== fxKey) { E.fxKey = fxKey
      E.fx.style.cssText = body.length ? '' : 'display:none'
      E.fx.innerHTML = body.map(k => BODY_FX[k](figPx)).join('') }
    const dbSkull = u.deathbed ? `<div class="badge dbSkull" title="stood at the Deathbed">${raIcon('skull', `font-size:13px;color:${BLOOD_HUE}`)}</div>` : ''
    E.badges.innerHTML = dbSkull + sts.map(([id, v]) => { const st = stStyle(id)
      return `<div class="badge"><div class="gl" style="clip-path:${st.gl};background:${st.hue};position:absolute;inset:0"></div>` +
             `<div class="pip${st.sq ? ' sq' : ''}" style="background:${st.hue}">${v}</div></div>` }).join('')
      + (chev !== 0 ? `<div class="badge"><div class="gl" style="position:absolute;inset:0;background:${chev > 0 ? MOD_UP : MOD_DOWN};` +
          `clip-path:${chev > 0 ? 'polygon(50% 12%,100% 74%,72% 74%,72% 92%,28% 92%,28% 74%,0 74%)' : 'polygon(50% 88%,0 26%,28% 26%,28% 8%,72% 8%,72% 26%,100% 26%)'}"></div></div>` : '')
  }
}

/* ── the transient layer: the aim arrow and the projection numbers ─────── */
/* Targeting is a host-owned overlay, independent of replay BURST facts. */
export function drawTargeting(V) {
  V.layers.targeting?.remove(); V.layers.targeting = null
  const T = V.targeting; if (!T) return
  const layer = el('targeting', 'position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none')
  V.layers.targeting = layer
  V.dom.stage.insertBefore(layer, V.layers.unitsL)
  const generation = V.targetingGeneration(), {POS, LAYOUT} = V.data
  const tile = (hex, cls, color) => {
    const p = POS[hex]
    const n = el('ring ' + cls, `left:${p.px-LAYOUT.W/2}px;top:${p.py-LAYOUT.H/2}px;background:${color};pointer-events:none`)
    n.dataset.hex = String(hex); n.style.transform = `translateZ(${heightOf(V, hex)}px)`
    layer.appendChild(n); return n
  }
  for (const h of T.hexes) tile(h, 'targetFootprint', 'rgba(100,190,255,.20)')
  if (T.centre !== null) tile(T.centre, 'targetCentre', 'rgba(255,220,110,.35)')
  for (const row of T.shielded) {
    const n = tile(row.hex, 'targetShield', 'rgba(120,120,150,.4)')
    n.dataset.props = row.props.join(','); n.setAttribute('title', 'Terrain shielding: ' + row.props.join(', '))
  }
  for (const h of T.legalHexes) {
    const p = POS[h], n = document.createElement('button')
    n.className = 'targetHex'; n.setAttribute('type', 'button'); n.setAttribute('aria-label', 'Select hex ' + h)
    n.dataset.hex = String(h)
    n.style.cssText = `position:absolute;left:${p.px-LAYOUT.W/2}px;top:${p.py-LAYOUT.H/2}px;width:${LAYOUT.W}px;height:${LAYOUT.H}px;background:transparent;border:0;padding:0;cursor:crosshair;pointer-events:none;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)`
    n.style.transform = `translateZ(${heightOf(V, h)}px)`
    n.addEventListener('click', ev => { ev.stopPropagation(); if (!V.clickSuppressed?.(ev)) V.offerHexClick(h, generation) })
    layer.appendChild(n)
  }
}

export function drawAim(V) {
  const { S, dom, data: { POS, F } } = V
  if (V.layers.dyn) V.layers.dyn.remove()
  const dyn = V.layers.dyn = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d')
  dom.stage.appendChild(dyn)
  if (V.view.bare) return
  const svg = svgEl('svg')
  svg.setAttribute('width', F.w); svg.setAttribute('height', F.h)
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none'
  dyn.appendChild(svg)
  const attempt = opportunityPose(V)
  if (attempt) {
    const p = POS[attempt.to], {W,H} = V.data.LAYOUT
    const mark = el('ring opportunityDestination', `left:${p.px-W/2}px;top:${p.py-H/2}px;background:${NOTE_HUE.aoo};pointer-events:none`)
    mark.dataset.hex = String(attempt.to); mark.title = 'Attempted step'
    mark.style.transform = `translateZ(${heightOf(V,attempt.to)+2}px)`
    dyn.appendChild(mark)
  }
  // Copy the engine footprint. No radius, recipient or shielding calculation.
  if (S.BURST && V.view.burstVisible) {
    const B = S.BURST, W = V.data.LAYOUT.W, H = V.data.LAYOUT.H
    const tile = (hex, cls, colour) => {
      const p = POS[hex]; if (!Number.isInteger(hex) || !p) throw new Error(`burst references unknown hex ${hex}`)
      const n = el('ring ' + cls, `left:${p.px-W/2}px;top:${p.py-H/2}px;background:${colour};pointer-events:none`)
      n.dataset.hex = String(hex); n.style.transform = `translateZ(${heightOf(V, hex)}px)`
      dyn.appendChild(n); return n
    }
    for (const hex of B.hexes) tile(hex, 'burstHex', 'rgba(214,178,94,.48)')
    const centre = tile(B.centre, 'burstCentre', NOTE_HUE)
    if (centre) centre.title = 'Burst centre'
    for (const fact of B.shielded) {
      const n = tile(fact.hex, 'burstShield', 'rgba(160,184,202,.9)')
      if (n) { n.dataset.props = fact.props.join(', '); n.title = 'Terrain shielding: ' + fact.props.join(', ') }
    }
    const p = POS[B.centre]
    if (p) {
      const label = el('bb burstLabel', `left:${p.px}px;top:${p.py}px;pointer-events:none`)
      label.style.transform = `translateZ(${heightOf(V, B.centre)}px) scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translateZ(150px)`
      const text = el('', 'position:absolute;left:36px;top:-80px;white-space:nowrap;font:700 18px sans-serif;color:'+NOTE_HUE+';text-shadow:0 2px 5px #000')
      text.textContent = 'BURST' + (B.shielded.length ? ' · Terrain shielding' : '')
      label.appendChild(text); dyn.appendChild(label)
    }
  }
  const AIM = S.AIM; if (!AIM) return
  /* the arrow is part of the forecast, so it is cool too (2026-09-01) */
  const aCol = AIM.missed ? 'rgba(150,143,132,.9)' : 'rgba(140,178,208,.96)'
  const line = aimArrow(V, dyn, svg, AIM.from, AIM.to, aCol, !!AIM.missed)
  /* COOL IS A FORECAST, WARM IS WHAT HAPPENED (ruled 2026-09-01) */
  line(0, `<span style="font-size:24px;font-weight:700;color:#8fa8bd">${AIM.hit}%</span>`)
  if (AIM.dmg != null) line(28, `<span style="font-size:46px;font-weight:700;color:#bcd4e6;line-height:1">${AIM.dmg}</span>`)
  if (AIM.missed) line(104, `<span style="font-size:26px;font-weight:700;color:#b9b2a3">${AIM.missed.cause==='cover'?'COVER':AIM.missed.cause==='dodge'?'DODGE':'MISS'} <span style="font-size:13px;color:#8b8778">rolled ${AIM.missed.roll}</span></span>`)
}
/** THE aim arrow — the bowed ground line and its head from one hex to another — and a writer for the bare, haloed
    forecast lines beside its head. Shared by the log's aim (drawAim) and the play input's (drawPlay). */
function aimArrow(V, dyn, svg, fromHex, toHex, aCol, dashed) {
  const { POS } = V.data, A = POS[fromHex], B = POS[toHex]
  const dx = B.px - A.px, dy = B.py - A.py, L = Math.hypot(dx, dy) || 1, bow = Math.min(120, L * 0.22)
  const cx = (A.px + B.px) / 2 - dy / L * bow, cy = (A.py + B.py) / 2 + dx / L * bow
  svg.appendChild(groundLines(`M${A.px} ${A.py}Q${cx} ${cy} ${B.px} ${B.py}`, aCol, { w: 6.2, haloW: 10.4, dash: dashed ? '14 10' : null }))
  const tx = B.px - cx, ty = B.py - cy, TL = Math.hypot(tx, ty) || 1, ux = tx / TL, uy = ty / TL, px = -uy, py = ux
  const head = `M${B.px} ${B.py}L${B.px - ux * 30 + px * 15} ${B.py - uy * 30 + py * 15}L${B.px - ux * 18} ${B.py - uy * 18}L${B.px - ux * 30 - px * 15} ${B.py - uy * 30 - py * 15}Z`
  const hp = svgEl('path')
  hp.setAttribute('d', head); hp.setAttribute('fill', aCol)
  hp.setAttribute('stroke', 'rgba(0,0,0,.58)'); hp.setAttribute('stroke-width', '4.2')
  svg.appendChild(hp)
  /* No box (ruled 2026-08-26): bare numbers, haloed like every ground line. */
  const halo = 'text-shadow:0 2px 5px #000,0 0 14px rgba(0,0,0,.95),0 0 3px #000;'
  return (dyOff, html) => {
    const wrap = el('bb', `left:${B.px}px;top:${B.py}px`)
    wrap.style.transform = (V.data.displayHeights ? `translateZ(${heightOf(V, toHex)}px) ` : '') + 'scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti)) translateZ(150px)'
    wrap.appendChild(el('', `position:absolute;left:58px;top:${-150 + dyOff}px;white-space:nowrap;` +
      `font-family:'Barlow Semi Condensed',sans-serif;${halo}pointer-events:none`, html))
    dyn.appendChild(wrap)
    return wrap }
}

/* ── THE PLAY INPUT (viewer.play-input, 2026-09-30; PLAYABLE-OPENING-PLAN.md item 7; engine DECISIONS.md 2026-09-29
   "the playable battle screen" and "the playable screen: the acting mark, pointing at an enemy, the forecast";
   VFX/UI-BUILD-NOTES-2026-09-02.md §5) ─────────────────────────────────────────────────────────────────────────────
   Two layers under the units while a host has handed facts over (setPlay, src/play.js). The INPUT layer is one
   transparent hex button per board hex — pointing at it and clicking it are offered to the host, which answers from
   the engine; it is built once and kept, so redrawing the plan under a still pointer does not re-fire the pointing.
   The PLAN layer draws the facts: the reach, the zone-of-control hatching, the engine's walk to the hex pointed at and
   its provoke points, the ghost, an enemy's reach, the chosen action's targets, and the aim — the forecast's arrow
   from the hero (or its ghost) with its hit chance and damage beside the head, and the notch it would cut in the
   target's Health bar (the skull when it would kill). Nothing here decides a hex or works out a number. */
const HEXCLIP = 'clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)'
export function syncPlayInput(V) {
  if (!V.play) { V.layers.playInput?.remove(); V.layers.playInput = null; return }
  if (V.layers.playInput) return
  const { POS, LAYOUT } = V.data, layer = el('playInput', 'position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none')
  V.layers.playInput = layer
  V.dom.stage.insertBefore(layer, V.layers.unitsL || null)
  for (const key of Object.keys(POS)) {
    const h = +key, p = POS[h], n = document.createElement('button')
    n.className = 'playHex'; n.setAttribute('type', 'button'); n.setAttribute('aria-label', 'Hex ' + h); n.dataset.hex = String(h)
    n.style.cssText = `position:absolute;left:${p.px - LAYOUT.W / 2}px;top:${p.py - LAYOUT.H / 2}px;width:${LAYOUT.W}px;height:${LAYOUT.H}px;background:transparent;border:0;padding:0;cursor:pointer;pointer-events:none;${HEXCLIP}`
    n.style.transform = `translateZ(${heightOf(V, h)}px)`
    n.addEventListener('pointerenter', () => { V.offerPlay({ kind: 'point', hex: h }) })
    n.addEventListener('click', ev => { ev.stopPropagation(); if (!V.clickSuppressed?.(ev)) V.offerPlay({ kind: 'hex', hex: h }) })
    layer.appendChild(n)
  }
}
export function drawPlay(V) {
  V.layers.play?.remove(); V.layers.play = null
  const P = V.play
  for (const E of V.layers.UEL.values()) { if (E.playNotch) E.playNotch.style.display = 'none'; if (E.playSkull) E.playSkull.style.display = 'none' }
  if (V.dom.playNote) { V.dom.playNote.style.display = P && P.note ? '' : 'none'; V.dom.playNote.textContent = P && P.note ? P.note : '' }
  if (!P) return
  const { POS, LAYOUT, F } = V.data
  const layer = el('playPlan', 'position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none')
  V.layers.play = layer
  V.dom.stage.insertBefore(layer, V.layers.playInput ? V.layers.playInput.nextSibling : (V.layers.unitsL || null))
  const tile = (hex, cls, style) => { const p = POS[hex]
    const n = el('playTile ' + cls, `position:absolute;left:${p.px - LAYOUT.W / 2}px;top:${p.py - LAYOUT.H / 2}px;width:${LAYOUT.W}px;height:${LAYOUT.H}px;pointer-events:none;${style}`)
    n.dataset.hex = String(hex); n.style.transform = `translateZ(${heightOf(V, hex) + 1}px)`; layer.appendChild(n); return n }
  const ring = (hex, cls, colour) => { const n = el('ring ' + cls, `left:${POS[hex].px - LAYOUT.W / 2}px;top:${POS[hex].py - LAYOUT.H / 2}px;background:${colour};pointer-events:none`)
    n.dataset.hex = String(hex); n.style.transform = `translateZ(${heightOf(V, hex) + 2}px)`; layer.appendChild(n); return n }
  for (const h of P.reach) tile(h, 'playReach', `background:${PLAY_HUE.reach};${HEXCLIP}`)
  for (const h of P.zoc) tile(h, 'playZoc', `background:repeating-linear-gradient(45deg,${PLAY_HUE.zoc} 0 5px,transparent 5px 14px);${HEXCLIP}`)
  if (P.threat) {
    for (const h of P.threat.move) tile(h, 'playThreatMove', `background:${PLAY_HUE.threatMove};${HEXCLIP}`)
    for (const h of P.threat.hit) ring(h, 'playThreatHit', PLAY_HUE.threatHit)
  }
  for (const h of P.targets) ring(h, 'playTarget', PLAY_HUE.target)
  const svg = svgEl('svg')
  svg.setAttribute('width', F.w); svg.setAttribute('height', F.h)
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none'
  layer.appendChild(svg)
  if (P.path.length > 1) {
    const line = svgEl('g'); line.setAttribute('class', 'playPath')
    line.appendChild(groundLines('M' + P.path.map(h => `${POS[h].px} ${POS[h].py}`).join('L'), PLAY_HUE.path, { w: 5, haloW: 9, dash: '2 12' }))
    svg.appendChild(line)
  }
  for (const h of P.provokes) { const n = ring(h, 'playProvoke', PLAY_HUE.provoke); n.title = 'Attack of opportunity' }
  if (P.ghost) drawGhost(V, layer, P.ghost)
  if (P.aim) {
    const A = P.aim, line = aimArrow(V, layer, svg, A.from, A.to, PLAY_HUE.aim, !A.locked)   /* red (viewer.battle-full-screen) */
    const lines = []
    if (A.hit != null) lines.push(line(0, `<span class="playHit" style="font-size:24px;font-weight:700;color:${PLAY_HUE.aimHit}">${A.hit}%</span>`))
    if (A.dmg != null) lines.push(line(28, `<span class="playDmg" style="font-size:46px;font-weight:700;color:${PLAY_HUE.aimDmg};line-height:1">${A.dmg}</span>`))
    for (const w of lines) w.classList.add('playAim')
    const E = A.target != null ? V.layers.UEL.get(A.target) : null, u = A.target != null ? V.S.U[A.target] : null
    if (E && u && A.hpAfter != null && u.maxHp > 0) {
      if (!E.playNotch) { E.playNotch = el('playNotch', ''); E.hpbar.appendChild(E.playNotch) }
      const after = Math.max(0, A.hpAfter)
      E.playNotch.style.cssText = `position:absolute;left:0;right:0;bottom:${100 * after / u.maxHp}%;height:${Math.max(0, 100 * (u.hp - after) / u.maxHp)}%;` +
        `background:${A.lethal ? PLAY_HUE.lethal : PLAY_HUE.loss};border-bottom:2px solid ${PLAY_HUE.notch};box-sizing:border-box;pointer-events:none`
      E.playNotch.dataset.hpAfter = String(A.hpAfter)
      if (A.lethal) {
        if (!E.playSkull) { E.playSkull = el('playSkull', ''); E.playSkull.innerHTML = raIcon('skull', `font-size:15px;color:${PLAY_HUE.skull}`); E.bb.appendChild(E.playSkull) }
        E.playSkull.style.cssText = underUnit(V) ? `position:absolute;left:${-UU.w / 2 - 18}px;top:${UU.hp - 8}px;transform:${UU.lift};pointer-events:none`
          : `position:absolute;left:${(parseFloat(E.hpbar.style.left) || 0) - 5}px;top:${(parseFloat(E.hpbar.style.top) || 0) - 20}px;pointer-events:none`
      }
    }
  }
}
/* the ghost: the planned hero's own standee, faint, on the planned hex — "a phantom of the unit appears there. The unit
   does not move; nothing is spent" (UI-BUILD-NOTES §5). The standee's size is the token's (standeeSize). */
function drawGhost(V, layer, G) {
  const u = V.S.U[G.unit]; if (!u) return
  const { ARTMAP, ASSETS } = V.data, a = ARTMAP[u.typeId] || ARTMAP._pending, f = feetOf(V, G.hex), { hpx, w } = standeeSize(a, false)
  const root = el('playGhost', `position:absolute;left:${f.x}px;top:${f.y}px;width:0;height:0;transform-style:preserve-3d;pointer-events:none;transform:translateZ(${heightOf(V, G.hex) + 3}px)`)
  root.dataset.hex = String(G.hex); root.dataset.unit = String(G.unit)
  root.appendChild(el('sel', `left:-48px;top:-31px;width:96px;height:62px;border-color:${PLAY_HUE.ghost}`))
  const bb = el('bb', 'left:0;top:0;transform:scale3d(1, var(--aniso, 1), 1) rotateZ(var(--unspin, 0deg)) rotateX(var(--anti))')
  const img = el('', `position:absolute;left:${-w / 2}px;top:${-hpx}px;width:${w}px;height:${hpx}px;background-repeat:no-repeat;background-position:center bottom;background-size:contain;opacity:.45;pointer-events:none;transform:${LIFT}`)
  img.style.backgroundImage = `url("${ASSETS[a.token]}")`
  bb.appendChild(img); root.appendChild(bb); layer.appendChild(root)
}

/* ── camera (PLAYBACK-DESIGN §7.8, ruled 2026-09-01) ─────────────────────
   PAN BY INCLUSION, NEVER BY CENTRING: the camera moves the minimum that
   brings the subject wholly inside the viewport, with a margin, and not at all
   when it is already inside. Governs clicking a unit and the enemy phase alike.
   FREE PAN: drag the board, or the arrow keys; a manual pan holds until the
   subject leaves the view, when the same inclusion rule pulls it back.
   HOLD-TO-PEEK: hold Z to see the whole board; release and the camera is
   exactly where it was. An overview is a check you perform, not a scale you
   play at (fit is 0.654 — a 132px token becomes 86px). */
export const VIEW = { W: 1408, H: 744 }
export const PEEK_KEY = 'z'
/* A unit is its whole standee, not its feet: the token stands ~132 screen px
   above the feet point, with the bars, badges and floats above that. When the
   camera brings a unit into view it must bring the HEAD in, and at the top of
   the board it must be allowed to show empty space above row 0 for the
   standees standing there (Andrew, 2026-09-03: "the units are taller than two
   hexes … a unit on the top of the map … is getting cut off"). Screen px,
   converted to board-y by the squash where it matters. */
export const TOKEN_TOP = 200
/** the viewport the camera reasons in: the board wrap as laid out, or the
    design size when nothing is laid out yet (review 2026-09-03: the inclusion
    test and the bubble placement used two different rectangles) */
export function viewportOf(V) {
  const wrap = V.dom.stage.parentNode
  const W = wrap && wrap.clientWidth ? wrap.clientWidth : VIEW.W
  const H = wrap && wrap.clientHeight ? wrap.clientHeight : VIEW.H
  return { W, H }
}
/* viewer.true-3d-camera (2026-09-30; engine DECISIONS.md "a true 3D battle: an orbit camera …"): the pose worked out
   here — the board point looked at, the turn, the tilt, the zoom — is handed to ONE real perspective camera
   (camera3d.js), and the stage's CSS matrix and the 3D scene both come from that camera. The inclusion rule reasons
   in the board's true proportions: iso px, where a board px south is stretched by isoK to the length of one east
   (1 on a board with no 3D scene), so a turned view frames what it shows. */
export const isoK = V => 1 / anisoOf(boardAffine(V))
/** the board's own map, scene metres -> board px (viewer.js sets it from the battle's scene; a bare V gets the flat one) */
export const boardAffine = V => V.data.boardAffine || (V.data.boardAffine = flatAffine(V.data.F))
/* viewer.tactical-camera (2026-10-01): the camera's stance — Overhead (a toggle that restores the view before it), Inspect
   (broader exploration that restores the tactical pose after it), else the tactical camera (camera-policy.js) */
/** the scene carries decorative surroundings beyond the board (its presentation profile; viewer.caravan-scene) */
export const surrounded = V => !!(V.data.atlas && V.data.atlas.presentation && V.data.atlas.presentation.surroundings)
export const camStance = V => V.view.overhead ? 'overhead' : V.view.inspect ? 'inspect' : 'tactical'
/** the whole original board's fit at this turn and tilt on this viewport (camera-policy.js fitZoom): the engine's map,
    never decoration, with a standing figure's room */
export function boardFit(V, yaw, tilt) {
  const k = isoK(V), { W, H } = viewportOf(V)
  return fitZoom({ w: V.data.F.w, h: V.data.F.h * k }, { w: W, h: H }, yaw, tilt, TOKEN_TOP, LENS)
}
export function applyCam(V, opts = {}) {
  const { S, view, data: { POS, F } } = V
  const k = isoK(V), bw = F.w, bh = F.h * k
  const cam = view.cam || (view.cam = homeCam()), stance = camStance(V)
  /* a pan or a focus leaves the whole-map framing from where it is */
  if ((opts.pan || opts.focus) && view.overview) view.overview = false
  /* the tilt stays inside its stance's limits (tactical 15–50° from straight down: 40–75° above the ground) */
  const [tlo, thi] = tiltLimits(stance), t0 = cam.tilt == null ? TILT.START : cam.tilt
  const tc = Math.min(thi, Math.max(tlo, t0)); if (tc !== cam.tilt) cam.tilt = tc
  const yaw = cam.yaw || 0, tilt = tiltOf(V), sq = squash(V)
  const { W: VW, H: VH } = viewportOf(V)
  const fitZ = boardFit(V, yaw, tilt)
  /* fit: the harness's fit, the held peek and the whole-map views (Whole map, Overhead) — refitted on every resize */
  const fit = view.zoom === 'fit' || view.peek || view.overview
  const [zlo, zhi] = zoomLimits(stance, fitZ, { w: VW, h: VH }, TOKEN_TOP)
  if (!fit) { const zc = Math.min(zhi, Math.max(zlo, cam.zoom)); if (zc !== cam.zoom) cam.zoom = zc }
  const s = fit ? fitZ : cam.zoom
  const top = TOKEN_TOP / sq                          // the standee's overhang above its feet, in iso board-y
  const halfW = (VW / 2) / s, halfH = (VH / 2) / (s * sq)
  const M = 80
  const iso = p => ({ px: p.px, py: p.py * k })
  const pts = []
  if (S.AIM) pts.push(iso(POS[S.AIM.from]), iso(POS[S.AIM.to]))
  else { const u = S.U[subjectOf(V)]; if (u) pts.push(iso(POS[u.hex])) }
  /* a peek never moves the remembered camera; a manual pan is applied first. view.camF is in board px; f is it in iso */
  const camF = view.camF, f = { x: camF.x, y: camF.y == null ? null : camF.y * k }, f0 = { ...f }
  /* viewer.tactical-camera: the pan is bounded by the ORIGINAL board, opened by how much nearer than the whole-map fit
     the camera is (pinned to the middle at the fit — the whole-map fit's own centre — the whole board near), the board's
     rectangle grown a little north and south so a figure on the first or last row, its head and its name and bars,
     can be brought to the middle and seen whole. Inspect roams the whole of it at any zoom. The subject's inclusion is
     applied AFTER the bound, so a unit's head and label win over the bound (the handoff: "Unit head/label clearance
     takes priority over blindly copying the preview's ground-only pan clamp"). */
  const bound = () => {
    const X = [0, bw], Y = [-POLICY.EDGE_ROOM, bh + POLICY.EDGE_ROOM]
    /* viewer.xcom-camera-tuning (engine DECISIONS.md 2026-10-01, Andrew: "The pointing-to-scroll on the map does not work very
       well. If you point to the edge, you sometimes get some movement."): the view may centre ANY point of the board, at any
       zoom, as Inspect always could — the pan was pinned to the board's middle on a board smaller than the view (viewer
       SWITCHES cameraPanNoVoid, retired), so pointing at an edge mostly moved nothing. Overhead keeps the whole-map framing. */
    const [xlo, xhi] = stance === 'overhead' ? panRange(X[0], X[1], s, fitZ) : X
    const [ylo, yhi] = stance === 'overhead' ? panRange(Y[0], Y[1], s, fitZ) : Y
    f.x = Math.min(Math.max(f.x, xlo), xhi); f.y = Math.min(Math.max(f.y, ylo), yhi)
  }
  /* viewer.xcom-camera (engine DECISIONS.md 2026-10-01 'the XCOM-style camera'): a new activation centres the map on the
     one acting — the board's own acting unit, in a replay as in a game */
  const acting = S.activeId != null ? S.U[S.activeId] : null
  if (!fit && !opts.focus && !opts.pan && acting && acting.life === 'standing' && view.centredOn !== S.activeId && POS[acting.hex]) {
    view.centredOn = S.activeId; opts = { ...opts, focus: POS[acting.hex] }
    /* the first activation's centring is where the battle opens: the starting view a reset returns to */
    if (!view.homeCentred) { view.homeCentred = true; view.home = null } }
  if (fit) { /* the whole board, centred; the remembered camera is not touched */ }
  else if (opts.pan) { if (f.x == null) { f.x = bw / 2; f.y = bh / 2 } f.x += opts.pan.x; f.y += opts.pan.y * k; bound() }
  else if (opts.focus) { f.x = opts.focus.px; f.y = opts.focus.py * k; bound() }      // Focus selected unit: centred, on purpose
  else if (opts.hold) bound()                                                        // a restored view (Overhead, Inspect off) is shown as it was
  else if (f.x == null) { const p = pts[0] || { px: bw / 2, py: bh / 2 }; f.x = p.px; f.y = p.py; bound() }
  else if (view.inspect) bound()                                                     // Inspect explores: selection never pulls the camera
  else {
    bound()
    if (yaw) includeTurned(V, f, pts, halfW, halfH, M, top)                          // the turned camera: the same rule in its own frame
    else if (pts.length === 2 && (Math.abs(pts[0].px - pts[1].px) > 2 * (halfW - M) || Math.abs(pts[0].py - pts[1].py) > 2 * (halfH - M))) {
      f.x = (pts[0].px + pts[1].px) / 2; f.y = (pts[0].py + pts[1].py) / 2         // a pair that cannot both fit: the midpoint
    } else {
      for (const p of pts) {                                                           // the minimal nudge, per point
        if (p.px < f.x - halfW + M) f.x = p.px + halfW - M
        else if (p.px > f.x + halfW - M) f.x = p.px - halfW + M
        if (p.py - top < f.y - halfH + M) f.y = p.py - top + halfH - M                // the HEAD comes in, not the feet
        else if (p.py > f.y + halfH - M) f.y = p.py - halfH + M
      }
    }
  }
  /* written back only when moved, so a camera that did not move keeps its exact numbers. A whole-map view (not the peek,
     not the harness's fit) remembers its centre, so what follows it — a drag, a turn, Inspect — starts from the view seen */
  /* viewer.xcom-camera: a turn shows the view its bound allows but keeps the centre it turned about, so four quarter turns
     come round to exactly the view they left (the bound swaps its axes at 90° and 270°) */
  if (!fit && !opts.turn) { if (f.x !== f0.x) camF.x = f.x; if (f.y !== f0.y) camF.y = f.y / k }
  else if (view.overview && !view.peek && view.zoom !== 'fit') { camF.x = bw / 2; camF.y = bh / 2 / k }
  const cx = fit ? bw / 2 : f.x, cy = fit ? bh / 2 : f.y                             // a fit shows the whole board, centred
  if (!fit && !view.home && camF.x != null) view.home = { x: camF.x, y: camF.y }     // the starting view Reset returns to
  setPose(V, { x: cx, y: cy / k, yaw, tilt, zoom: s })
  syncCamBar(V)
  /* the HUD says only what the camera is doing (Law 5: the export's outcome,
     turn count and engine stamp are the harness's to print, and a replay must
     not spoil its own ending on frame one — review 2026-09-03) */
  if (V.dom.hud) { const u = S.U[subjectOf(V)]
    const what = view.peek ? 'peek — whole board' : view.zoom === 'fit' ? 'fit'
      : (stance === 'inspect' ? 'Inspect · free exploration' : stance === 'overhead' ? 'Overhead' : 'Tactical camera · ' + Math.round(elevationOfTilt(tilt)) + '°') + (view.overview ? ' · whole map' : '')
    V.dom.hud.textContent = what + ' · ←/→ turn 90° · wheel to look closer · point at an edge to scroll' + (u ? ' · on ' + u.name : '') }
}
/* ── the glide (the 1.1 s half-speed camera glide of 2026-09-01, which was the stage's CSS transition) is now the
   camera's own: the pose eases to its target and every frame of it is one real camera, so the 3D scene and the board
   never part. A drag, a mount and a host with no animation frames show the pose at once. ─────────────────────── */
export const GLIDE_MS = 1100
function bezier(x1, y1, x2, y2) {
  const c = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t
  return u => { if (u <= 0) return 0; if (u >= 1) return 1
    let lo = 0, hi = 1, t = u
    for (let i = 0; i < 40; i++) { const x = c(x1, x2, t); if (Math.abs(x - u) < 1e-7) break; if (x < u) lo = t; else hi = t; t = (lo + hi) / 2 }
    return c(y1, y2, t) }
}
const EASE = bezier(.4, 0, .2, 1)
const clockOf = V => V.now ? V.now() : Date.now()
const samePose = (a, b) => a.x === b.x && a.y === b.y && a.yaw === b.yaw && a.tilt === b.tilt && a.zoom === b.zoom
function setPose(V, pose) {
  V.camTarget = pose
  const from = V.camShown
  if (!from || !V.view.glide || V.view.dragging || typeof requestAnimationFrame !== 'function') { V.camAnim = null; showPose(V, pose); return }
  if (samePose(from, pose)) { if (!V.camAnim) showPose(V, pose); else V.camAnim.to = pose; return }
  V.camAnim = { from: { ...from }, to: pose, t0: clockOf(V) }
  if (V.camRaf == null) V.camRaf = requestAnimationFrame(() => glideFrame(V))
}
function glideFrame(V) {
  V.camRaf = null
  const A = V.camAnim; if (!A) return
  const t = Math.min(1, (clockOf(V) - A.t0) / GLIDE_MS), e = EASE(t), a = A.from, b = A.to
  const turn = ((b.yaw - a.yaw) % 360 + 540) % 360 - 180                              // the short way round
  let yaw = a.yaw + turn * e; yaw = ((yaw + 180) % 360 + 360) % 360 - 180
  showPose(V, t >= 1 ? b : { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, yaw, tilt: a.tilt + (b.tilt - a.tilt) * e, zoom: a.zoom * Math.pow(b.zoom / a.zoom, e) })
  if (t < 1) V.camRaf = requestAnimationFrame(() => glideFrame(V)); else V.camAnim = null
}
/** stop a glide where it is (dispose) */
export function stopGlide(V) {
  V.camAnim = null
  if (V.camRaf != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(V.camRaf)
  V.camRaf = null
}
/** show a pose: the camera, and the stage drawn through it (its CSS matrix, the billboards' angles and correction) */
export function showPose(V, pose) {
  const { W, H } = viewportOf(V), A = boardAffine(V)
  V.camera3d = orbitCamera(A, pose, { w: W, h: H }, V.camera3d || undefined)
  const m = matrix3d(stageMatrix(A, V.camera3d, { w: V.data.F.w, h: V.data.F.h }))
  /* the stage and its twin above the bodies (viewer.characters-unfaded) are drawn through the one camera */
  for (const s of [V.dom.stage, V.dom.stageTop]) { if (!s) continue
    const st = s.style
    st.transformOrigin = '0 0 0'
    st.transform = m
    st.setProperty('--anti', (-pose.tilt) + 'deg'); st.setProperty('--unspin', (pose.yaw ? -pose.yaw : 0) + 'deg')
    st.setProperty('--aniso', String(anisoOf(A))) }
  V.camShown = pose; V.camVersion = (V.camVersion || 0) + 1
}
/* ── the turned camera (viewer.painted-board; engine DECISIONS.md 2026-09-29 "the playable battle
   screen": "You should be able to rotate around, but there should be a button to reset. You should be
   able to right-click to grab the map and move. You should be able to navigate, zoom, and tilt, and
   there should be a button somewhere where you just reset, and it goes back to the starting angled
   view."). Yaw turns the camera about the board point it looks at, tilt is its angle from straight down
   (F.tilt is the starting angle), zoom brings it nearer. Billboards undo yaw and tilt (--unspin, --anti) and the
   board's south squeeze (--aniso), so every standee still faces the camera, true. The limits are look choices
   (viewer SWITCHES cameraLimits). */
/* viewer.tactical-camera (2026-10-01): the limits are the policy's (camera-policy.js) — tactical tilt 15–50° from straight
   down (40–75° above the ground), Overhead 0°, Inspect 1–87°; zoom from the whole original board's fit to a standing
   figure at half the view's height. What is left here is the feel of the drag and the wheel (viewer SWITCHES cameraLimits). */
export const CAM = { TILT_MIN: TILT.MIN, TILT_MAX: TILT.MAX, YAW_PER_PX: .3, TILT_PER_PX: .2, WHEEL: .0015, FOCUS_ZOOM: 1.5 }
/** the starting angled view: 40° above the ground, no turn, 1× (the policy's, not the engine field's 49.3° tilt) */
export const homeCam = () => ({ yaw: 0, tilt: TILT.START, zoom: 1 })
/** PAN BY INCLUSION in the turned camera's own frame — the rule above, rotated (iso px throughout) */
function includeTurned(V, camF, pts, halfW, halfH, M, top) {
  const rel = p => turned(V, p.px - camF.x, p.py - camF.y)
  if (pts.length === 2) { const a = rel(pts[0]), b = rel(pts[1])
    if (Math.abs(a.x - b.x) > 2 * (halfW - M) || Math.abs(a.y - b.y) > 2 * (halfH - M)) { camF.x = (pts[0].px + pts[1].px) / 2; camF.y = (pts[0].py + pts[1].py) / 2; return } }
  for (const p of pts) {
    const r = rel(p); let dx = 0, dy = 0
    if (r.x < -halfW + M) dx = r.x + halfW - M; else if (r.x > halfW - M) dx = r.x - halfW + M
    if (r.y - top < -halfH + M) dy = r.y - top + halfH - M; else if (r.y > halfH - M) dy = r.y - halfH + M
    const d = unturn(V, dx, dy); camF.x += d.x; camF.y += d.y
  }
}
/** turn, tilt or zoom the camera by a step; the angles and scale stay inside the stance's limits (applyCam clamps). Any
    such step leaves the whole-map framing; a tilt from Overhead unlocks it at the steepest tactical angle. */
export function turnCam(V, { yaw = 0, tilt = 0, zoom = 1 } = {}) {
  const c = V.view.cam || (V.view.cam = homeCam())
  if (V.view.overhead && tilt) { V.view.overhead = null; c.tilt = TILT.MIN }
  if (yaw || tilt || zoom !== 1) V.view.overview = false
  if (yaw) c.yaw = turnedBy(c.yaw || 0, yaw)
  if (tilt) { const [lo, hi] = tiltLimits(camStance(V)); c.tilt = Math.min(hi, Math.max(lo, tiltOf(V) + tilt)) }
  if (zoom !== 1) c.zoom = c.zoom * zoom
  applyCam(V, yaw && !tilt && zoom === 1 ? { turn: true } : {}); drawEdges(V)
}
/** Reset: back to the starting angled view — 40° above the ground, no turn, 1× zoom, the camera where the battle opened;
    Overhead and Inspect are left */
export function resetCam(V) {
  V.view.cam = homeCam(); V.view.overhead = null; V.view.inspect = null; V.view.overview = false
  V.view.camF = V.view.home ? { x: V.view.home.x, y: V.view.home.y } : { x: null, y: null }
  applyCam(V); drawEdges(V)
}
/** viewer.xcom-camera: the map centred on a unit at the standard zoom (the proposed hero, an ability chosen) */
export function centreOn(V, id) {
  const u = V.S.U[id]; if (!u || u.life === 'dead' || !V.data.POS[u.hex]) return
  V.view.overview = false; V.view.peek = false
  applyCam(V, { focus: V.data.POS[u.hex] }); drawEdges(V)
}
/** viewer.xcom-camera: the wheel looks nearer or farther, within POLICY.ZOOM_FAR..ZOOM_NEAR of the standard zoom, and
    springs back to it once the wheel is still ("it snaps back to the standard zoom as soon as you stop pressing") */
export function lookCloser(V, deltaY) {
  const c = V.view.cam || (V.view.cam = homeCam()), std = homeCam().zoom
  c.zoom = Math.min(std * POLICY.ZOOM_NEAR, Math.max(std * POLICY.ZOOM_FAR, c.zoom * Math.exp(-deltaY * CAM.WHEEL)))
  V.view.overview = false; applyCam(V); drawEdges(V)
  if (V.zoomRest != null) clearTimeout(V.zoomRest)
  V.zoomRest = setTimeout(() => { V.zoomRest = null; if (!V.view.cam) return; V.view.cam.zoom = std; applyCam(V); drawEdges(V) }, POLICY.ZOOM_REST_MS)
}
/** viewer.xcom-camera: the map scrolls toward the edge the pointer is at (dir: -1, 0 or 1 across and down the screen) for
    `dt` seconds ("When you mouse or point past the edge of a map, the map just scrolls") */
export function edgeScroll(V, dir, dt) {
  const step = POLICY.EDGE_SCROLL_SPEED * dt, d = unturn(V, dir.x * step, dir.y * step)
  applyCam(V, { pan: { x: d.x, y: d.y / isoK(V) } }); drawEdges(V)
}
const snapshot = V => ({ cam: { ...V.view.cam }, camF: { ...V.view.camF }, overview: !!V.view.overview, overhead: V.view.overhead || null })
function restore(V, s) { V.view.cam = { ...s.cam }; V.view.camF = { ...s.camF }; V.view.overview = s.overview; V.view.overhead = s.overhead }
/** the unit Focus selected unit centres on: the one clicked last, else the subject */
export const focusUnitOf = V => { const id = V.view.inspectId != null && V.S.U[V.view.inspectId] ? V.view.inspectId : subjectOf(V); const u = V.S.U[id]; return u && u.life !== 'dead' ? u : null }
/** the camera's named views (viewer.tactical-camera; the accepted caravan preview's buttons):
    angled · lower · raise · left · right · whole · overhead · inspect · focus · reset */
export function cameraView(V, kind) {
  const view = V.view, c = view.cam || (view.cam = homeCam())
  if (kind === 'reset') return resetCam(V)
  if (kind === 'left' || kind === 'right') return turnCam(V, { yaw: kind === 'left' ? -POLICY.TURN_STEP : POLICY.TURN_STEP })
  /* Lower angle brings the eye down toward the ground (a larger tilt from straight down); Raise lifts it */
  if (kind === 'lower' || kind === 'raise') return turnCam(V, { tilt: (kind === 'lower' ? 1 : -1) * POLICY.ANGLE_STEP })
  if (kind === 'angled') { view.overhead = null; view.overview = false; c.tilt = TILT.START }
  else if (kind === 'whole') { view.overhead = null; view.overview = true; c.yaw = 0; c.tilt = TILT.WHOLE }
  else if (kind === 'overhead') {
    if (view.overhead) { const back = view.overhead; view.overhead = null; restore(V, back); view.overhead = back.overhead }
    else { const back = snapshot(V); view.overhead = back; view.overview = true; c.yaw = 0; c.tilt = 0 }
  } else if (kind === 'inspect') {
    if (view.inspect) { const back = view.inspect; view.inspect = null; restore(V, back) }
    else { view.inspect = snapshot(V); view.overhead = null; view.overview = false }
  } else if (kind === 'focus') {
    const u = focusUnitOf(V); if (!u) return
    view.overview = false; view.peek = false
    if (c.zoom < CAM.FOCUS_ZOOM) c.zoom = CAM.FOCUS_ZOOM
    applyCam(V, { focus: V.data.POS[u.hex] }); drawEdges(V); return
  } else throw new Error('cameraView: unknown view ' + kind)
  /* a whole-map view keeps the zoom it had for when it is left; the fit is applyCam's */
  if (view.overview) c.zoom = boardFit(V, c.yaw || 0, c.tilt)
  applyCam(V, { hold: kind === 'overhead' || kind === 'inspect' }); drawEdges(V)
}
/** what the camera is doing, for the bar and the hosts */
export function cameraState(V) {
  const c = V.view.cam || homeCam(), tilt = tiltOf(V)
  return { stance: camStance(V), overhead: !!V.view.overhead, inspect: !!V.view.inspect, overview: !!V.view.overview,
    yaw: c.yaw || 0, tilt, elevation: elevationOfTilt(tilt), zoom: V.camTarget ? V.camTarget.zoom : c.zoom, focus: focusUnitOf(V)?.id ?? null }
}
/** the camera bar's buttons say the camera's state: Overhead and Inspect pressed, Focus only with a unit to focus */
export function syncCamBar(V) {
  const bar = V.dom.camBar; if (!bar) return
  const st = cameraState(V)
  for (const b of bar.querySelectorAll('button')) {
    const k = b.getAttribute('data-cam')
    if (k === 'overhead') b.setAttribute('aria-pressed', String(st.overhead))
    else if (k === 'inspect') b.setAttribute('aria-pressed', String(st.inspect))
    else if (k === 'focus') b.setAttribute('aria-disabled', String(st.focus == null))
  }
}
/* ── OFF-SCREEN UNIT INDICATORS (PLAYBACK-DESIGN §7.8 part 1, ruled) ──────
   Andrew: "a little bubble with an arrow pointing off with a miniaturized
   version of unit that says 2." One bubble per cluster of off-screen units,
   pinned at the viewport edge in their direction: the unit's own art, an
   arrow, a count when it stands for more than one, faction-coloured, and for
   enemies the danger numeral. Continuous whole-board awareness at zero screen
   cost — the load-bearing answer to "you need to see the entire board." Uses
   the camera's own notion of inside (the same margin), so a unit the camera
   would not nudge for is never flagged. Screen-space layer over the board
   wrap, outside the 3D scene. */
/* a unit is OFF-SCREEN when it is outside the viewport itself (less a token's
   half-width), not outside the camera's comfort margin: near a board edge the
   clamp leaves units visible but past the margin, and a bubble over a visible
   unit is noise (review 2026-09-03). Bubbles sit EDGE_INSET inside the edge. */
export const EDGE_INSET = 34, EDGE_GROUP = 44, EDGE_TOKEN = 24
export function drawEdges(V) {
  const { S, view, data: { POS }, layers: L } = V
  const wrap = V.dom.stage.parentNode; if (!wrap) return
  if (!L.edgeL) { L.edgeL = el('edgeL', 'position:absolute;inset:0;pointer-events:none;z-index:40'); wrap.appendChild(L.edgeL) }
  const fit = view.zoom === 'fit' || view.peek
  if (fit || view.camF.x == null || !V.camTarget) { L.edgeL.innerHTML = ''; return }
  /* viewer.true-3d-camera: inside is where the camera (where it is going, when it glides) shows the unit — its hex as
     the perspective draws it, the standee's head inside the top edge — not a rectangle of the board */
  const { W, H: Hh } = viewportOf(V), A = boardAffine(V)
  const cam = orbitCamera(A, V.camTarget, { w: W, h: Hh }), s = V.camTarget.zoom
  const cx = W / 2, cy = Hh / 2
  const off = []
  for (const u of Object.values(S.U)) {
    if (u.life === 'dead') continue
    /* viewer.tactical-camera (2026-10-01; Andrew: "the pointed indicators … are pointing at things that are on-map. I
       start out looking at three heroes, and they have those bubbles pointing at them"): a bubble is for a unit NONE of
       whose figure is in view — its feet and its head as the camera draws them (the body's own height where a model
       stands), a figure's half-width either side. The old test flagged any unit whose head came within a full figure's
       height of the top edge at the focus's scale, so a hero plainly standing in view near the top got a bubble. */
    const p = POS[u.hex], z = heightOf(V, u.hex), E = V.layers.UEL.get(u.id), tall = (E && E.pick && E.pick.h) || TOKEN_TOP
    const q = screenOf(A, cam, p.px, p.py, z), head = screenOf(A, cam, p.px, p.py, z + tall)
    const half = EDGE_TOKEN * s, ys = [q.y, head.y]
    const inside = q.ahead && head.ahead && Math.max(q.x, head.x) >= -half && Math.min(q.x, head.x) <= W + half && Math.max(...ys) >= 0 && Math.min(...ys) <= Hh
    if (inside) continue
    /* screen offset from the viewport centre, clamped to the edge rectangle */
    const dx = q.x - cx, dy = q.y - cy
    const k = Math.min((cx - EDGE_INSET) / Math.max(1, Math.abs(dx)), (cy - EDGE_INSET) / Math.max(1, Math.abs(dy)))
    const x = cx + dx * Math.min(1, k), y = cy + dy * Math.min(1, k)
    off.push({ u, x, y, ang: Math.atan2(dy, dx) })
  }
  /* cluster by proximity along the edge */
  const groups = []
  for (const o of off) {
    const g = groups.find(g => g.u.side === o.u.side && Math.hypot(g.x - o.x, g.y - o.y) < EDGE_GROUP)
    if (g) { g.n++; g.units.push(o.u) } else groups.push({ ...o, n: 1, units: [o.u] })
  }
  L.edgeL.innerHTML = groups.map(g => {
    const a = V.data.ARTMAP[g.u.typeId] || V.data.ARTMAP._pending
    const tint = SIDE_TINT[g.u.side] || SIDE_TINT.enemy
    const dgr = g.u.side === 'enemy' ? dangerOf(g.u, V.data) : null
    const deg = Math.round(g.ang * 180 / Math.PI)
    return `<div class="edgeBub" style="left:${g.x.toFixed(0)}px;top:${g.y.toFixed(0)}px;border-color:${tint}" title="${g.units.map(x => x.name).join(', ')}">
      <i class="edgeArrow" style="transform:rotate(${deg}deg) translateX(26px);border-left-color:${tint}"></i>
      <span class="edgeArt" style="background-image:url('${V.data.ASSETS[a.token]}')"></span>
      ${g.n > 1 ? `<b class="edgeN" style="background:${tint}">${g.n}</b>` : ''}
      ${dgr ? `<span class="edgeDg">${dgr.n}${raIcon(dgr.kind === 'ranged' ? 'bow' : 'crossed-swords', 'font-size:12px')}</span>` : ''}
    </div>` }).join('')
}
/* ── what is under the pointer (viewer.true-3d-camera): the camera's ray through the pointer against the board — every
   unit's body and every hex's top at its display height (camera3d.js pickBoard) — never the stage's flat plane. A
   unit's body is an upright cylinder on its feet as tall as its figure (its model's height where a model stands). */
export function pointerAt(V, e) {
  const wrap = V.dom.stage.parentNode, cam = V.camera3d
  if (!wrap || !cam || e.clientX == null) return null
  /* the host may scale the whole component (the harness fits 1920 to the window; the kingdom fills it): client px ->
     the wrap's own layout px */
  const r = wrap.getBoundingClientRect ? wrap.getBoundingClientRect() : { left: 0, top: 0, width: wrap.clientWidth, height: wrap.clientHeight }
  const { W, H } = viewportOf(V)
  if (!(r.width > 0 && r.height > 0)) return null
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }
}
export function pickAt(V, x, y) {
  const cam = V.camera3d; if (!cam) return null
  const { POS, LAYOUT, F } = V.data, A = boardAffine(V)
  const hexes = []
  for (const key of Object.keys(POS)) { const h = +key; if (F.floor && !F.floor[h]) continue; hexes.push({ hex: h, x: POS[h].px, y: POS[h].py, z: heightOf(V, h) }) }
  const units = []
  for (const u of Object.values(V.S.U)) {
    if (u.life === 'dead') continue
    const E = V.layers.UEL.get(u.id); if (!E || !E.pick || E.root.style.display === 'none') continue
    const f = feetOf(V, u.hex)
    units.push({ id: u.id, hex: u.hex, x: f.x, y: f.y, z: heightOf(V, u.hex), r: E.pick.r, h: E.pick.h })
  }
  return pickBoard(boardRay(A, cam, x, y), hexes, units, { W: LAYOUT.W, H: LAYOUT.H }, anisoOf(A))
}
/** a click on a unit (its body, under the pointer): the targeting host first, then the panel and the play host */
export function clickUnit(V, id) {
  if (!V.inputActive()) return
  const current = V.S.U[id]
  if (!current || V.offerHexClick(current.hex) || !V.inputActive()) return
  /* viewer.play-input: the panel shows whoever was clicked last (engine DECISIONS.md 2026-09-29), and the click is
     offered to the host too — to start the hero's activation, or to aim at (and fire on) a target */
  V.view.inspectId = id
  if (V.play) V.offerPlay({ kind: 'unit', id, hex: current.hex })
  if (V.inputActive()) V.render()
}
/** a click on a hex (its top, under the pointer): a legal target hex goes to the targeting host, else to the play host */
export function clickHex(V, hex) {
  const T = V.targeting
  if (T && T.legalHexes.includes(hex)) { V.offerHexClick(hex, V.targetingGeneration()); return }
  if (V.play) V.offerPlay({ kind: 'hex', hex })
}
/** wire the wheel, the arrow keys, the edge scroll, the double-click and the pointer's pick; returns an unbind for dispose().
    viewer.xcom-camera (engine DECISIONS.md 2026-10-01 'the XCOM-style camera', replacing viewer.painted-board's drags and
    viewer.tactical-camera's bar): one fixed angle and zoom; the arrow keys turn a quarter; the wheel looks closer and
    springs back; the pointer at an edge scrolls; a right-click (no drag) steps the plan back (viewer SWITCHES xcom*). */
export function bindCamera(V) {
  const wrap = V.dom.stage.parentNode; if (!wrap || !wrap.addEventListener) return () => {}
  let drag = null, dragged = false, pointed
  V.clickSuppressed = e => e.detail !== 0 && dragged
  const down = e => { if (e.button !== 0 && e.button !== 1 && e.button !== 2) return; dragged = false
    drag = { x: e.clientX, y: e.clientY, originX: e.clientX, originY: e.clientY } }
  /* the pointer over the board: point at what is under it (offered once per change), and say so with the cursor */
  const hover = e => {
    const at = pointerAt(V, e), hit = at ? pickAt(V, at.x, at.y) : null
    const T = V.targeting
    wrap.style.cursor = !hit ? '' : hit.unit == null && T && T.legalHexes.includes(hit.hex) ? 'crosshair' : (hit.unit != null || V.play) ? 'pointer' : ''
    if (!V.play) { pointed = undefined; return }
    const hex = hit ? hit.hex : null
    if (hex !== pointed) { pointed = hex; V.offerPlay({ kind: 'point', hex }) }
  }
  /* viewer.xcom-camera: the pointer at the board's edge scrolls the map that way, a frame at a time, until it leaves the edge */
  let edge = null, edgeRaf = null, edgeT = 0
  const edgeStep = () => { edgeRaf = null; if (!edge) return
    const now = clockOf(V), dt = Math.min(.05, Math.max(0, (now - edgeT) / 1000)); edgeT = now
    if (dt > 0) edgeScroll(V, edge, dt)
    edgeRaf = requestAnimationFrame(edgeStep) }
  const edgeAt = e => {
    if (!wrap.getBoundingClientRect) return null
    const r = wrap.getBoundingClientRect(), B = POLICY.EDGE_SCROLL_PX, x = e.clientX - r.left, y = e.clientY - r.top
    if (!(r.width > 0 && r.height > 0) || x < 0 || y < 0 || x > r.width || y > r.height) return null
    const dx = x < B ? -1 : x > r.width - B ? 1 : 0, dy = y < B ? -1 : y > r.height - B ? 1 : 0
    return dx || dy ? { x: dx, y: dy } : null }
  /* viewer.xcom-camera-tuning: in the battle screen the board's edges meet the bar, the panel and the ability bar, not the
     screen's — so the screen's own edge scrolls too, wherever over the battle the pointer meets it */
  const edgeOfScreen = e => {
    const W = typeof window !== 'undefined' ? window.innerWidth : 0, H = typeof window !== 'undefined' ? window.innerHeight : 0, B = POLICY.EDGE_WINDOW_PX
    if (!(W > 0 && H > 0)) return null
    const dx = e.clientX < B ? -1 : e.clientX > W - B ? 1 : 0, dy = e.clientY < B ? -1 : e.clientY > H - B ? 1 : 0
    return dx || dy ? { x: dx, y: dy } : null }
  const root = V.dom.root
  const rootMove = e => edgeTo(edgeAt(e) || edgeOfScreen(e))
  /* leaving the battle stops it — unless it left through the screen's edge, where the pointer is still pointing past it */
  const rootLeave = e => { if (!edgeOfScreen(e)) edgeTo(null) }
  const edgeTo = dir => { edge = dir
    if (edge && edgeRaf == null && typeof requestAnimationFrame === 'function') { edgeT = clockOf(V); edgeRaf = requestAnimationFrame(edgeStep) } }
  const move = e => { if (!drag) { hover(e); return }
    // Screen-pixel threshold from pointerdown: jitter is a click, a real drag
    // applies its full displacement once and then continues incrementally.
    const travel = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY)
    /* viewer.xcom-camera (engine DECISIONS.md 2026-10-01): no grab-drag, no free turn or tilt — a press that wanders is
       still not a click (4 px), and moves nothing */
    if (!dragged && travel < 4) return
    dragged = true }
  const up = e => { const released = drag; drag = null; wrap.style.cursor = ''
    /* viewer.play-input: a right-click that did not drag the map steps the plan back one stage (UI-BUILD-NOTES §5) */
    if (e && e.button === 2 && released && !dragged && V.play) V.offerPlay({ kind: 'back' }) }
  /* a click lands on what the camera's ray meets — a unit's body or a hex — at any angle (a keyboard press on a
     focused hex button is that button's own; a press on a control is the control's) */
  const click = e => {
    if (!e || !(e.detail > 0) || V.clickSuppressed(e)) return
    const t = e.target
    if (t && t !== wrap && typeof t.closest === 'function' && t.closest('button:not(.playHex):not(.targetHex),input,select,textarea,a,#playChrome')) return
    const at = pointerAt(V, e), hit = at ? pickAt(V, at.x, at.y) : null
    if (!hit) return
    if (hit.unit != null) clickUnit(V, hit.unit); else clickHex(V, hit.hex)
  }
  /* the right button is the map's grab, never the browser's menu */
  const menu = e => { e.preventDefault() }
  const wheel = e => { if (!e.deltaY) return; e.preventDefault(); lookCloser(V, e.deltaY) }
  /* viewer.xcom-camera: a double-click on a unit's body chooses it to act next (the host decides whether it may) */
  const dbl = e => { if (!V.play || !V.inputActive()) return
    const at = pointerAt(V, e), hit = at ? pickAt(V, at.x, at.y) : null
    if (hit && hit.unit != null) V.offerPlay({ kind: 'choose', id: hit.unit }) }
  /* keys act only while the pointer is over the board or the component has
     focus — two viewers on one page must not both pan, and a host page keeps
     its arrow keys (review 2026-09-03) */
  let over = false
  const enter = () => { over = true }, leave = () => { over = false; up(); pointed = undefined; if (V.play) V.offerPlay({ kind: 'point', hex: null }) }
  const key = e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
    if (!over && !(V.dom.root.contains && document.activeElement && V.dom.root.contains(document.activeElement))) return
    /* viewer.xcom-camera: the arrow keys turn the view a quarter (Q / E as well); there is no tilt, pan key, peek or Reset */
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey
    if ((e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') && plain && !e.repeat) cameraView(V, 'left')
    else if ((e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') && plain && !e.repeat) cameraView(V, 'right')
    else if (e.key === 'Escape' && V.play && !V.asking) V.offerPlay({ kind: 'back' })   /* ESC behaves as the right-click (UI-BUILD-NOTES §5) */
    else if (e.key === 'Escape' && V.asking) return   /* viewer.play-chrome: the End Turn pop-up takes its own Esc (chrome.js) */
    else return
    e.preventDefault()
  }
  const bound = [['pointerdown',down],['pointermove',move],['pointerup',up],['pointerleave',leave],['pointerenter',enter],['contextmenu',menu],['wheel',wheel],['click',click],['dblclick',dbl]]
  for (const [type, fn] of bound) wrap.addEventListener(type, fn, type === 'wheel' ? { passive: false } : undefined)
  document.addEventListener('keydown', key)
  if (root && root.addEventListener) { root.addEventListener('pointermove', rootMove); root.addEventListener('pointerleave', rootLeave) }
  return () => { edgeTo(null); if (root && root.removeEventListener) { root.removeEventListener('pointermove', rootMove); root.removeEventListener('pointerleave', rootLeave) } if (edgeRaf != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(edgeRaf)
    if (V.zoomRest != null) { clearTimeout(V.zoomRest); V.zoomRest = null }
    document.removeEventListener('keydown', key); for (const [type, fn] of bound) wrap.removeEventListener(type, fn) }
}
