/* ── THE BOARD — the DOM half: ground, tokens, floats, VFX bridge, camera ──
   Reads V.S (the folded state) and draws it. Never folds. Every function takes
   the viewer context V; nothing here is module state, so two viewers can live
   on one page. Split out of viewer-core.js 2026-09-02 with the drawing intact. */
import { TSWATCH, stStyle, PROJ_TINT, SIDE_TINT, SIDE_GLOW, DMG_HUE, HEAL_HUE, MOD_UP, MOD_DOWN, CRIT_HUE, NOTE_HUE, PROT_SPENT, VFX_STATUS, rgb, layerHue, AURA_HUE, BLOOD_HUE, LAYER_STATUS } from './theme.js'
import { mvOf } from './actions.js'
import { subjectOf } from './subject.js'
import { projectTick, dangerOf } from './projection.js'
import { dangerHTML, raIcon } from './icons.js'
import { createHexVFX, playMeleeAttack, playMagicBolt, playHolyBolt, playArrow, playStatusApply, playStatusTick, STATUS_STYLES } from './hexvfx.js'

export const el = (cls, style, html) => { const d = document.createElement('div')
  if (cls) d.className = cls; if (style) d.style.cssText = style; if (html != null) d.innerHTML = html; return d }
const svgEl = t => document.createElementNS('http://www.w3.org/2000/svg', t)

/** insert `node` right after `ref` (insertBefore only: the headless DOM has no after()) */
const placeAfter = (ref, node) => ref.parentNode.insertBefore(node, ref.nextSibling || null)
export const feetOf = (V, hex) => ({ x: V.data.POS[hex].px, y: V.data.POS[hex].py + V.data.LAYOUT.H * 0.28 })
export const squash = V => Math.cos(V.data.LAYOUT.tilt * Math.PI / 180)

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
function burnTile(l, t) {
  const w = el('lay', `left:${l}px;top:${t}px`)
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,rgba(86,64,46,.42) 25%,rgba(98,76,54,.24) 66%,rgba(104,82,58,.06) 100%);mix-blend-mode:multiply`))
  w.appendChild(el('', `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 60%,rgba(255,130,25,.34) 0%,rgba(70,18,4,.04) 78%);mix-blend-mode:screen;animation:fxPulse 1.3s ease-in-out infinite`))
  ;[[38, 26, 24, 56, '#ffe6a8,#ff9a2e 48%,#e0490c', 2, .62, 0], [62, 36, 20, 46, '#fff0c8,#ffab3e 50%,#d64810', 1.6, .84, .21],
    [52, 46, 30, 38, '#fffbe8,#ffc45c 55%,#e8640f', 2.4, 1.02, .44], [25, 50, 16, 32, '#ffe6a8,#ff8f22 52%,#c33f0a', 1.6, .74, .66]]
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
    const p = POS[h], l = p.px - LAYOUT.W / 2, t = p.py - LAYOUT.H / 2
    const tid = F.terrainIds[h], sw = TSWATCH[tid] || 'hexPlains'
    ground.appendChild(el('cell', `left:${l}px;top:${t}px;background-image:url('${ASSETS[sw + '.png']}')`))
    if (tid === 'terrain.burning') ground.appendChild(burnTile(l, t))
    if (tid === 'terrain.poisoned') ground.appendChild(poisonTile(l, t))
    ground.appendChild(el('ring grid', `left:${l}px;top:${t}px`))
  }
  /* FIRST child, always: corpses and downed units lie FLAT — coplanar with
     these tiles — so DOM order is the tiebreak (found 2026-08-27). */
  V.dom.stage.insertBefore(ground, V.dom.stage.firstChild)
  V.layers.ground = ground
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
  const p = V.data.POS[hex], l = p.px - V.data.LAYOUT.W / 2, t = p.py - V.data.LAYOUT.H / 2
  const name = (V.data.LAYERS || {})[layer] || ('layer.' + layer)
  const hue = layerHue(name)
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
    if (L.LAY.has(+hex)) continue
    const node = layerTile(V, +hex, layer)
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
  for (const [id, E] of L.CORPSE) if (!want[id]) { E.node.remove(); L.CORPSE.delete(id) }
  for (const c of Object.values(want)) {
    if (L.CORPSE.has(c.id)) continue
    const a = ARTMAP[c.typeId] || ARTMAP._pending
    const f = feetOf(V, c.hex)
    const root = el('corpse', `left:${f.x}px;top:${f.y}px`)
    root.dataset.corpse = String(c.id)
    const ch = Math.round(150 * 1.60 * ((a.height || 1.55) / 1.55) * 0.55 * 0.6)
    const cw = Math.round(ch * a.aspect)
    const toCentre = Math.round(LAYOUT.H * 0.28)
    const img = el('', `position:absolute;left:${-cw / 2}px;top:${-ch / 2 - toCentre}px;width:${cw}px;height:${ch}px;` +
      `background-repeat:no-repeat;background-position:center bottom;background-size:contain;transform:rotate(-90deg);opacity:.38;pointer-events:none`)
    img.style.backgroundImage = `url("${ASSETS[a.token]}")`
    root.appendChild(img)
    L.corpseL.appendChild(root); L.CORPSE.set(c.id, { node: root, img })
  }
}
/** the beat a corpse leaves on: a raise lifts it, a feed swallows it, the rest fade */
export function corpseGone(V, corpseId, how) {
  const E = V.layers.CORPSE && V.layers.CORPSE.get(corpseId); if (!E || !E.img.animate) return
  const kf = how === 'raised' ? [{ opacity: .38, transform: 'rotate(-90deg)' }, { opacity: 0, transform: 'rotate(-90deg) translateX(-40px)' }]
    : how === 'eaten' || how === 'consumed' ? [{ opacity: .38, transform: 'rotate(-90deg) scale(1)' }, { opacity: 0, transform: 'rotate(-90deg) scale(.4)' }]
    : [{ opacity: .38 }, { opacity: 0 }]
  E.img.animate(kf, { duration: 360, easing: 'ease-in', fill: 'forwards' })
}

/* ── AURAS (2026-09-03, §7) — derived on read, never emitted: every STANDING
   holder with `auras` on its sheet tints the hexes within each aura's radius.
   The radius uses the engine's own hex distance table (generated/static.json
   .hexDist, dumped through the door) — the viewer draws a ring it was handed,
   it does not re-implement hex geometry. Hostile auras wear the debuff red,
   friendly ones the buff green (theme AURA_HUE). */
export function syncAuras(V) {
  const L = V.layers, S = V.S, { UD, POS, LAYOUT, DIST } = V.data
  if (!L.auraL) { L.auraL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d'); placeAfter(L.corpseL || L.layL || L.ground, L.auraL); L.AURA = new Map() }
  const want = new Map()                                   // hex -> {hue, edge}
  if (DIST) for (const u of Object.values(S.U)) {
    if (u.life !== 'standing') continue
    const auras = (UD[u.typeId] || {}).auras || []
    for (const a of auras) {
      const hue = AURA_HUE[a.side] || AURA_HUE.any
      const n = POS.length
      for (let h = 0; h < n; h++) { const d = DIST[u.hex * n + h]
        if (d <= a.radius && d > 0) { const k = h + '|' + hue; if (!want.has(k)) want.set(k, { hex: h, hue, edge: d === a.radius }) } }
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
  if (!L.floatL) { L.floatL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d;pointer-events:none'); V.dom.stage.appendChild(L.floatL) }
  const p = V.data.POS[hex]; if (!p) return
  const slot = (L.FLOAT_SLOTS[hex] = (L.FLOAT_SLOTS[hex] ?? -1) + 1)
  const life = o.crit ? 1900 : o.big ? 1500 : 1200
  const wrap = el('bb', `left:${p.px}px;top:${p.py}px`)
  wrap.style.transform = 'rotateX(var(--anti)) translateZ(150px)'
  /* units stand taller than the hex — floats start another half-hex above the head */
  if (o.crit) {
    /* rung 2: the numeral IS the crit — bigger, gold-rimmed, snaps in with an
       overshoot and holds ~200ms before it drifts (critPop keyframes) */
    wrap.appendChild(el('dmg crit', `left:-40px;top:${-140 - slot * 30}px;color:${col};font-size:52px;` +
      `-webkit-text-stroke:1.5px ${CRIT_HUE};text-shadow:0 0 14px rgba(255,207,106,.75),0 2px 6px #000;transform-origin:50% 100%;` +
      `animation:critPop 1900ms cubic-bezier(.2,1.3,.4,1) forwards`, text))
  } else
  wrap.appendChild(el('dmg', `left:-34px;top:${-136 - slot * 30}px;color:${col};` +
    (o.big ? 'font-size:36px;' : o.small ? 'font-size:15px;' : 'font-size:20px;') +
    `animation:floatUp ${life}ms ease-out forwards`, text))
  L.floatL.appendChild(wrap)
  setTimeout(() => { wrap.remove()
    if (L.FLOAT_SLOTS[hex] != null) { L.FLOAT_SLOTS[hex]--; if (L.FLOAT_SLOTS[hex] < 0) delete L.FLOAT_SLOTS[hex] } }, life + 60)
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
/* THE LIFT (Angela 2026-09-03, the dwarf with no legs): the token image sits
   2px in front of the ground plane. At z=0 the act ring's haze, the shadow
   (a blurred, composited layer) and the hex tiles paint over the lowest part
   of a billboard — a human lost its boots, an 81px dwarf lost its legs, and
   Andrew's "the units seem too low in the hex" was the same thing. Every
   animation on the image keeps the lift, or the legs vanish for the walk. */
export const LIFT = 'translateZ(2px)'
const BOB = [{ transform: LIFT + ' translateY(0) rotate(0)' }, { transform: LIFT + ' translateY(-6px) rotate(-2.6deg)', offset: .25 },
  { transform: LIFT + ' translateY(-2px) rotate(0)', offset: .5 }, { transform: LIFT + ' translateY(-6px) rotate(2.6deg)', offset: .75 }, { transform: LIFT + ' translateY(0) rotate(0)' }]
export function traverse(V, id, startHex, path, dur) {
  const E = V.layers.UEL.get(id), u = V.S.U[id]
  if (!E || !u || !E.root.animate) return
  const pts = [feetOf(V, startHex), ...path.map(h => feetOf(V, h))]
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = cum[cum.length - 1] || 1
  const kf = pts.map((p, i) => ({ left: p.x + 'px', top: p.y + 'px', offset: cum[i] / total }))
  if (E.walk) E.walk.cancel()
  E.root.style.transition = 'none'
  const a = E.root.animate(kf, { duration: dur, easing: 'cubic-bezier(.35,0,.2,1)', fill: 'none' })
  E.walk = a
  if (u.life === 'standing') E.img.animate(BOB, { duration: Math.max(120, dur / path.length), iterations: path.length, easing: 'ease-in-out' })
  a.oncancel = () => { E.root.style.transition = ROOT_TRANSITION; E.walk = null }
  a.onfinish = () => {
    E.root.style.transition = ROOT_TRANSITION
    E.walk = null
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
  const dx = pt.px - pa.px, dy = pt.py - pa.py, L = Math.hypot(dx, dy) || 1
  const kx = (dx / L * 6).toFixed(1), ky = (dy / L * 6 * squash(V)).toFixed(1)
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
  else V.fx.timers.add(setTimeout(done, DARKEN))
}
function playInjury(V) {
  const Q = V.fx.injuryQ; const job = Q[0]; if (!job) return
  const u = V.S.U[job.id], wrap = V.dom.stage.parentNode
  const next = () => { Q.shift(); if (Q.length) playInjury(V) }
  if (!u || !wrap) { next(); return }
  const p = V.data.POS[u.hex]
  const bb = el('bb', `left:${p.px}px;top:${p.py}px`)
  bb.style.transform = 'rotateX(var(--anti)) translateZ(160px)'
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
  A.bb.style.transform = `rotateX(var(--anti)) translate(${(dx / L * 26).toFixed(0)}px,${(dy / L * 26 * 0.65).toFixed(0)}px)`
  V.fx.timers.add(setTimeout(() => { A.bb.style.transform = 'rotateX(var(--anti))' }, 170))
}
export function hitFlash(V, tgtId) {
  /* a STRIKE, not a glow: 45ms (ruled 2026-09-01; it was 160 and read as a glow) */
  const T = V.layers.UEL.get(tgtId); if (!T) return
  T.flash.style.opacity = '1'
  V.fx.timers.add(setTimeout(() => { T.flash.style.opacity = '0' }, 60))
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
  V.fx.timers.add(setTimeout(() => { for (const a of anims) { try { if (a.playState === 'paused') a.play() } catch (e) {} } }, ms))
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
  E.bb.animate([{ transform: 'rotateX(var(--anti)) translateY(-46px)', opacity: 0 }, { transform: 'rotateX(var(--anti)) translateY(0)', opacity: 1 }],
    { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)' })
}
/* the RISE (unit.raised): the raised body stands up from the corpse's flat pose */
export function rise(V, id) {
  const E = V.layers.UEL.get(id); if (!E || !E.img.animate) return
  E.img.style.transformOrigin = '50% 100%'
  E.img.animate([{ transform: LIFT + ' rotate(-80deg) scaleY(.4)', opacity: .3 }, { transform: LIFT + ' rotate(0) scaleY(1)', opacity: 1 }],
    { duration: 620, easing: 'cubic-bezier(.3,0,.2,1)' })
}
/* the HOLD (move.stopped by a zone of control): a short dashed ground line from
   the mover to the holder, gone in 700ms — it points, it does not persist */
export function zocLine(V, aId, tId) {
  const A = V.S.U[aId], T = V.S.U[tId]; if (!A || !T) return
  const { POS, F } = V.data
  const a = POS[A.hex], b = POS[T.hex]
  const wrap = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d;pointer-events:none')
  const svg = svgEl('svg'); svg.setAttribute('width', F.w); svg.setAttribute('height', F.h)
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'
  svg.appendChild(groundLines(`M${a.px} ${a.py}L${b.px} ${b.py}`, 'rgba(203,185,160,.9)', { w: 4.4, haloW: 7.8, dash: '10 8' }))
  wrap.appendChild(svg); V.dom.stage.appendChild(wrap); V.fx.nodes.add(wrap)
  const t = setTimeout(() => { wrap.remove(); V.fx.nodes.delete(wrap); V.fx.timers.delete(t) }, 700)
  V.fx.timers.add(t)
}
/* a BANNER over the board (a wave, night, the band, the objective): screen
   space, top centre, 1.6s, one at a time — the newest replaces the last */
export function banner(V, kind, text, sub) {
  const wrap = V.dom.stage.parentNode; if (!wrap) return
  const old = wrap.querySelector('.banner'); if (old) { old.remove(); V.fx.nodes.delete(old) }
  const b = el('banner ' + kind, '', `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`)
  wrap.appendChild(b); V.fx.nodes.add(b)
  if (b.animate) b.animate([{ opacity: 0, transform: 'translate(-50%,-8px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: .12 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1600, fill: 'forwards' })
  const t = setTimeout(() => { b.remove(); V.fx.nodes.delete(b); V.fx.timers.delete(t) }, 1650)
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
  const stage1 = c.result === 'exhausted'
    ? `<span class="dbHead">UNIT DOWNED</span><span class="dbSub">No Deathbed Fighting roll left</span><span class="dbName">${u.name}</span>`
    : `<span class="dbHead">UNIT DOWNED</span><span class="dbSub">Deathbed Fighting roll</span><span class="dbName">${u.name}</span>${roll}`
  const stage2 = c.result === 'stood'
    ? `<span class="dbHead gold">DEATHBED FIGHTING</span><span class="dbBold gold">This hero fights on.</span><span class="dbName">${u.name}</span>${roll}`
    : c.result === 'fell'
    ? `<span class="dbHead red">DEATHBED FIGHTING</span><span class="dbBold red">This hero falls.</span><span class="dbName">${u.name}</span>${roll}`
    : `<span class="dbHead red">UNIT DOWNED</span><span class="dbBold red">This hero falls.</span><span class="dbName">${u.name}</span>`
  const m = el('dbModal ' + c.result, '', `<div class="dbVeil"></div><div class="dbPlate">${stage1}</div>`)
  wrap.appendChild(m); V.fx.nodes.add(m)
  const plate = m.querySelector('.dbPlate')
  if (plate.animate) plate.animate([{ transform: 'scale(1.12)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 160, easing: 'cubic-bezier(.2,1.2,.4,1)' })
  const t1 = setTimeout(() => { V.fx.timers.delete(t1); plate.innerHTML = stage2; plate.className = 'dbPlate ' + c.result
    if (plate.animate) plate.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,1.3,.4,1)' }) }, DB_STAGE)
  const t2 = setTimeout(() => { V.fx.timers.delete(t2); m.remove(); V.fx.nodes.delete(m) }, DB_TOTAL)
  V.fx.timers.add(t1); V.fx.timers.add(t2)
}

/* ── play the fold's cues on the DOM ───────────────────────────────────── */
export function playCues(V, cues) {
  for (const c of cues) {
    switch (c.k) {
      case 'lunge': lunge(V, c.a, c.t); break
      case 'flash': hitFlash(V, c.id); break
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
      case 'zoc': zocLine(V, c.a, c.t); break
      case 'banner': banner(V, c.kind, c.text, c.sub); break
      case 'power': powerPulse(V); break
      case 'corpse.gone': corpseGone(V, c.corpse, c.how); break
      case 'stand': standBeat(V, c.id); break
      case 'deathbed': deathbedModal(V, c); break
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
  const img = el('', 'position:absolute;background-repeat:no-repeat;background-position:center bottom;background-size:contain;pointer-events:auto;cursor:pointer')
  img.style.backgroundImage = `url("${ASSETS[a.token]}")`
  img.addEventListener('click', ev => { ev.stopPropagation(); V.view.inspectId = u.id; V.render() })
  bb.appendChild(img)
  const flash = el('', 'position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,220,160,.4) 55%,transparent 75%);opacity:0;transition:opacity .045s ease;pointer-events:none')
  bb.appendChild(flash)
  const badges = el('badges', '')
  const hpbar = el('hpbar', ''); const hpfill = el('hpfill', ''); hpbar.appendChild(hpfill)
  const proj = el('', 'display:none'); hpbar.appendChild(proj)
  const prot = el('', 'display:none')
  const mark = el('actMark', 'display:none')
  /* THE SKULL (ruled 2026-09-01, VISUAL-BATTLE-UPDATES §3.1): when the
     projection crosses zero — the unit dies of its statuses before it acts
     again — the bar carries a skull. The highest-value fact on the bar: do not
     spend an action here. Lifted with translateZ like every low numeral. */
  const skull = el('', 'position:absolute;display:none;pointer-events:none;transform:translateZ(60px);width:20px;height:20px;line-height:1',
    /* NO filter (the 3D trap) — the halo is a black copy scaled up behind the bone one */
    raIcon('skull', 'position:absolute;left:0;top:0;font-size:20px;color:#000;transform:scale(1.3);opacity:.9') +
    raIcon('skull', 'position:absolute;left:0;top:0;font-size:20px;color:#f4ece0'))
  /* the wound's blood: drips in BLOOD_HUE over the lower body, hidden until a stand */
  const blood = el('blood', 'display:none',
    [[14, 0, 3, 22, 0], [46, 4, 2, 30, .7], [70, 0, 3, 18, 1.3], [30, 8, 2, 26, 2.0]].map(([x, y, w2, h2, dl]) =>
      `<i style="left:${x}%;top:${y}px;width:${w2}px;height:${h2}px;background:linear-gradient(${BLOOD_HUE},${BLOOD_HUE}00);animation-delay:${dl}s"></i>`).join(''))
  bb.appendChild(blood)
  bb.appendChild(badges); bb.appendChild(hpbar); bb.appendChild(prot); bb.appendChild(mark); bb.appendChild(skull)
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
  return { root, fring, shadow, actA, actB, selR, downR, bb, img, flash, badges, hpbar, hpfill, proj, prot, mark, clock, mv, dg, skull, blood, glow, a }
}
export function syncUnits(V) {
  const { S, view, layers: L } = V, { UD, LAYOUT } = V.data
  if (!L.unitsL) { L.unitsL = el('', 'position:absolute;left:0;top:0;transform-style:preserve-3d'); V.dom.stage.appendChild(L.unitsL) }
  const bare = view.bare
  for (const [id, E] of L.UEL) if (!S.U[id]) E.root.style.display = 'none'
  for (const u of Object.values(S.U)) {
    let E = L.UEL.get(u.id); if (!E) { E = mkUnit(V, u); L.UEL.set(u.id, E) }
    const f = feetOf(V, u.hex)
    E.root.style.left = f.x + 'px'; E.root.style.top = f.y + 'px'
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
    const base = Math.round(150 * 1.60 * ((E.a.height || 1.55) / 1.55) * (down ? 0.5 : 1))
    const hpx = Math.round(base * 0.55)
    const w = Math.round(hpx * E.a.aspect * (down ? 2 : 1))
    E.img.style.left = (-w / 2) + 'px'; E.img.style.top = (-hpx) + 'px'
    E.img.style.width = w + 'px'; E.img.style.height = hpx + 'px'
    E.img.style.transform = down ? 'rotate(-90deg) ' + LIFT : LIFT
    if (down) E.img.style.top = (-Math.round(hpx * 0.42)) + 'px'
    /* A DOWNED HERO IS STILL A PERSON, not a decal (ruled 2026-09-01) */
    E.img.style.opacity = down ? '.82' : '1'
    E.img.style.boxShadow = down ? '0 10px 16px -6px rgba(0,0,0,.85)' : ''
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
    /* THE WOUND (Angela 2026-09-03): a little dripping blood on the token
       while the unit carries a Deathbed wound level; more drips when Badly */
    if (u.wound > 0 && !down) {
      E.blood.style.display = ''
      E.blood.style.left = (-w / 2 + 6) + 'px'; E.blood.style.top = (-Math.round(hpx * 0.62)) + 'px'
      E.blood.style.width = (w - 12) + 'px'; E.blood.style.height = Math.round(hpx * 0.6) + 'px'
      E.blood.className = 'blood' + (u.wound >= 2 ? ' badly' : '')
    } else E.blood.style.display = 'none'
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
    E.bb.style.transform = down ? 'rotateX(calc(var(--anti) * 0.68))' : 'rotateX(var(--anti))'
    E.actA.style.display = E.actB.style.display = (!bare && u.id === S.activeId && !down) ? '' : 'none'
    E.mark.style.cssText = `left:-9px;top:${-hpx - 46}px;display:${u.id === S.activeId && !down ? 'block' : 'none'}`
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
    const bhFull = Math.round(base * 0.55)
    const BAR_TRIM = 18
    const bh = Math.max(24, bhFull - BAR_TRIM)
    E.hpbar.style.cssText = down ? 'display:none' : `left:${w / 2 + 7}px;top:${-bhFull}px;height:${bh}px`
    /* CONSTANT fill (ruled 2026-09-01): colour here means gain or loss only */
    E.hpfill.style.cssText = `height:${Math.round(100 * frac)}%;background:linear-gradient(#e9e3d2,#c3bba4);transition:height .3s ease`
    {
      const P = projectTick(u, UD)
      if (down || P.net === 0) E.proj.style.display = 'none'
      else {
        const lossFrac = Math.min(frac, Math.max(0, P.net) / u.maxHp)
        const gainFrac = Math.min(1 - frac, Math.max(0, -P.net) / u.maxHp)
        E.proj.style.display = ''
        if (P.lethal) {
          E.proj.style.cssText = `position:absolute;left:0;right:0;bottom:0;height:${Math.round(100 * frac)}%;` +
            `background:repeating-linear-gradient(45deg,${P.tint}cc 0 3px,${P.tint}55 3px 6px);` +
            `border-top:2px solid #fff;box-shadow:0 0 8px ${P.tint}`
        } else if (P.net > 0) {
          E.proj.style.cssText = `position:absolute;left:0;right:0;bottom:${(100 * (frac - lossFrac)).toFixed(1)}%;` +
            `height:${(100 * lossFrac).toFixed(1)}%;background:${P.tint}d0;border-top:2px solid ${P.tint}`
        } else {
          E.proj.style.cssText = `position:absolute;left:0;right:0;bottom:${(100 * frac).toFixed(1)}%;` +
            `height:${(100 * gainFrac).toFixed(1)}%;background:${PROJ_TINT.heal}66;border-bottom:2px solid ${PROJ_TINT.heal}`
        }
      }
      /* the skull sits on the bar's shoulder — centred on the 6px bar, just above it */
      if (!down && P.lethal) { E.skull.style.display = ''; E.skull.style.left = (w / 2 + 7 + 3 - 10) + 'px'; E.skull.style.top = (-bhFull - 24) + 'px' }
      else E.skull.style.display = 'none'
      /* PROTECTION: its own segmented bar beside the HP bar (§1) */
      const segs = Math.min(12, P.pool)
      if (down || segs <= 0) E.prot.style.display = 'none'
      else {
        E.prot.style.cssText = `position:absolute;left:${w / 2 + 7 + 9}px;top:${-bhFull}px;height:${bh}px;` +
          `width:6px;display:flex;flex-direction:column-reverse;gap:1px;pointer-events:none`
        E.prot.innerHTML = Array.from({ length: segs }, (_, i) =>
          `<div style="flex:1;border-radius:1px;background:${i < segs - P.absorbed ? stStyle('status.protection').hue : PROT_SPENT};` +
          `box-shadow:0 0 3px rgba(0,0,0,.9)"></div>`).join('')
      }
    }
    /* OVERHEAD GLYPHS: Stun · Weak · one chevron. NOTHING ELSE (§1). */
    const OVER = ['status.stun', 'test.status.daze', 'status.dazed', 'status.weak', 'test.status.enfeeble']
    const sts = Object.entries(u.st).filter(([id, v]) => v > 0 && OVER.includes(id))
    /* the chevron is the buff/debuff layer — the stat block's green and red
       (ruled 2026-09-01 for move riders), not a status's hue (Law 6) */
    /* the kit and the growth a unit was fielded with (unit.equipped,
       unit.grown — `fielded`) are what it IS, not a buff — the chevron counts
       only what happened in the battle */
    const live = (u.mods || []).filter(m => !m.fielded)
    const chev = live.length ? live.reduce((n, m) => n + (m.value > 0 ? 1 : -1), 0) : 0
    E.badges.style.cssText = down ? 'display:none' : `left:${-w / 2 - 2}px;top:${-hpx - 22}px`
    E.badges.innerHTML = sts.map(([id, v]) => { const st = stStyle(id)
      return `<div class="badge"><div class="gl" style="clip-path:${st.gl};background:${st.hue};position:absolute;inset:0"></div>` +
             `<div class="pip${st.sq ? ' sq' : ''}" style="background:${st.hue}">${v}</div></div>` }).join('')
      + (chev !== 0 ? `<div class="badge"><div class="gl" style="position:absolute;inset:0;background:${chev > 0 ? MOD_UP : MOD_DOWN};` +
          `clip-path:${chev > 0 ? 'polygon(50% 12%,100% 74%,72% 74%,72% 92%,28% 92%,28% 74%,0 74%)' : 'polygon(50% 88%,0 26%,28% 26%,28% 8%,72% 8%,72% 26%,100% 26%)'}"></div></div>` : '')
  }
}

/* ── the transient layer: the aim arrow and the projection numbers ─────── */
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
  const AIM = S.AIM; if (!AIM) return
  const A = POS[AIM.from], B = POS[AIM.to]
  const dx = B.px - A.px, dy = B.py - A.py, L = Math.hypot(dx, dy) || 1, bow = Math.min(120, L * 0.22)
  const cx = (A.px + B.px) / 2 - dy / L * bow, cy = (A.py + B.py) / 2 + dx / L * bow
  /* the arrow is part of the forecast, so it is cool too (2026-09-01) */
  const aCol = AIM.missed ? 'rgba(150,143,132,.9)' : 'rgba(140,178,208,.96)'
  svg.appendChild(groundLines(`M${A.px} ${A.py}Q${cx} ${cy} ${B.px} ${B.py}`, aCol, { w: 6.2, haloW: 10.4, dash: AIM.missed ? '14 10' : null }))
  const tx = B.px - cx, ty = B.py - cy, TL = Math.hypot(tx, ty) || 1, ux = tx / TL, uy = ty / TL, px = -uy, py = ux
  const head = `M${B.px} ${B.py}L${B.px - ux * 30 + px * 15} ${B.py - uy * 30 + py * 15}L${B.px - ux * 18} ${B.py - uy * 18}L${B.px - ux * 30 - px * 15} ${B.py - uy * 30 - py * 15}Z`
  const hp = svgEl('path')
  hp.setAttribute('d', head); hp.setAttribute('fill', aCol)
  hp.setAttribute('stroke', 'rgba(0,0,0,.58)'); hp.setAttribute('stroke-width', '4.2')
  svg.appendChild(hp)
  /* No box (ruled 2026-08-26): bare numbers, haloed like every ground line. */
  const halo = 'text-shadow:0 2px 5px #000,0 0 14px rgba(0,0,0,.95),0 0 3px #000;'
  const line = (dyOff, html) => {
    const wrap = el('bb', `left:${B.px}px;top:${B.py}px`)
    wrap.style.transform = 'rotateX(var(--anti)) translateZ(150px)'
    wrap.appendChild(el('', `position:absolute;left:58px;top:${-150 + dyOff}px;white-space:nowrap;` +
      `font-family:'Barlow Semi Condensed',sans-serif;${halo}pointer-events:none`, html))
    dyn.appendChild(wrap) }
  /* COOL IS A FORECAST, WARM IS WHAT HAPPENED (ruled 2026-09-01) */
  line(0, `<span style="font-size:24px;font-weight:700;color:#8fa8bd">${AIM.hit}%</span>`)
  if (AIM.dmg != null) line(28, `<span style="font-size:46px;font-weight:700;color:#bcd4e6;line-height:1">${AIM.dmg}</span>`)
  if (AIM.mit) line(78, `<span style="font-size:21px;font-weight:600;color:#6f8fb0">−${AIM.mit} <span style="font-size:12px;letter-spacing:.06em">${AIM.mitLabel.toUpperCase()}</span></span>`)
  if (AIM.missed) line(104, `<span style="font-size:26px;font-weight:700;color:#b9b2a3">MISS <span style="font-size:13px;color:#8b8778">rolled ${AIM.missed.roll}</span></span>`)
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
export function applyCam(V, opts = {}) {
  const { S, view, data: { POS, F, LAYOUT } } = V
  const bw = F.w, bh = F.h, sq = squash(V)
  const fit = view.zoom === 'fit' || view.peek
  const { W: VW, H: VH } = viewportOf(V)
  const top = TOKEN_TOP / sq                          // the standee's overhang above its feet, in board-y
  const s = fit ? Math.min(VW / bw, VH / ((bh + top) * sq)) : 1
  const halfW = (VW / 2) / s, halfH = (VH / 2) / (s * sq)
  const M = 80
  const pts = []
  if (S.AIM) pts.push(POS[S.AIM.from], POS[S.AIM.to])
  else { const u = S.U[subjectOf(V)]; if (u) pts.push(POS[u.hex]) }
  /* a peek never moves the remembered camera; a manual pan is applied first */
  const camF = view.camF
  if (fit) { /* the whole board, centred; the remembered camera is not touched */ }
  else if (opts.pan) { if (camF.x == null) { camF.x = bw / 2; camF.y = bh / 2 } camF.x += opts.pan.x; camF.y += opts.pan.y }
  else if (camF.x == null) { const p = pts[0] || { px: bw / 2, py: bh / 2 }; camF.x = p.px; camF.y = p.py }
  else if (pts.length === 2 && (Math.abs(pts[0].px - pts[1].px) > 2 * (halfW - M) || Math.abs(pts[0].py - pts[1].py) > 2 * (halfH - M))) {
    camF.x = (pts[0].px + pts[1].px) / 2; camF.y = (pts[0].py + pts[1].py) / 2       // a pair that cannot both fit: the midpoint
  } else {
    for (const p of pts) {                                                             // the minimal nudge, per point
      if (p.px < camF.x - halfW + M) camF.x = p.px + halfW - M
      else if (p.px > camF.x + halfW - M) camF.x = p.px - halfW + M
      if (p.py - top < camF.y - halfH + M) camF.y = p.py - top + halfH - M            // the HEAD comes in, not the feet
      else if (p.py > camF.y + halfH - M) camF.y = p.py - halfH + M
    }
  }
  if (!fit) {
    /* the clamp lets the camera show TOKEN_TOP of empty space above row 0 */
    camF.x = bw <= halfW * 2 ? bw / 2 : Math.min(Math.max(camF.x, halfW), bw - halfW)
    camF.y = bh + top <= halfH * 2 ? (bh - top) / 2 : Math.min(Math.max(camF.y, halfH - top), bh - halfH)
  }
  const cx = fit ? bw / 2 : camF.x, cy = fit ? (bh - top) / 2 : camF.y                // peek shows the whole board and every standee, centred
  V.dom.stage.style.transform = `perspective(2600px) rotateX(${LAYOUT.tilt}deg) scale(${s.toFixed(4)}) translate(${(bw / 2 - cx).toFixed(1)}px,${(bh / 2 - cy).toFixed(1)}px)`
  V.dom.stage.style.setProperty('--anti', (-LAYOUT.tilt) + 'deg')
  /* the HUD says only what the camera is doing (Law 5: the export's outcome,
     turn count and engine stamp are the harness's to print, and a replay must
     not spoil its own ending on frame one — review 2026-09-03) */
  if (V.dom.hud) { const u = S.U[subjectOf(V)]
    V.dom.hud.textContent = (view.peek ? 'peek — whole board' : view.zoom === 'fit' ? 'fit' : '1× native · drag or arrows to pan · hold Z to peek') + (u ? ' · on ' + u.name : '') }
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
  const { S, view, data: { POS, F }, layers: L } = V
  const wrap = V.dom.stage.parentNode; if (!wrap) return
  if (!L.edgeL) { L.edgeL = el('edgeL', 'position:absolute;inset:0;pointer-events:none;z-index:40'); wrap.appendChild(L.edgeL) }
  const fit = view.zoom === 'fit' || view.peek
  const camF = view.camF
  if (fit || camF.x == null) { L.edgeL.innerHTML = ''; return }
  const sq = squash(V), s = 1
  const { W, H: Hh } = viewportOf(V)
  const halfW = (W / 2) / s, halfH = (Hh / 2) / (s * sq)
  const cx = W / 2, cy = Hh / 2
  const off = []
  for (const u of Object.values(S.U)) {
    if (u.life === 'dead') continue
    const p = POS[u.hex]
    const inside = Math.abs(p.px - camF.x) <= halfW - EDGE_TOKEN && (p.py - TOKEN_TOP / sq) >= camF.y - halfH && p.py <= camF.y + halfH - EDGE_TOKEN / sq
    if (inside) continue
    /* screen offset from the viewport centre, clamped to the edge rectangle */
    const dx = (p.px - camF.x) * s, dy = (p.py - camF.y) * s * sq
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
/** wire drag, arrow keys and the peek key; returns an unbind for dispose() */
export function bindCamera(V) {
  const wrap = V.dom.stage.parentNode; if (!wrap || !wrap.addEventListener) return () => {}
  let drag = null
  const down = e => { if (e.button !== 0 && e.button !== 1) return; drag = { x: e.clientX, y: e.clientY }; wrap.style.cursor = 'grabbing' }
  const move = e => { if (!drag) return
    /* the host may scale the whole component (the harness fits 1920 to the
       window): screen px → component px is the root's rect over its layout width */
    const sq = squash(V), scale = (V.dom.root.getBoundingClientRect && V.dom.root.offsetWidth) ? (V.dom.root.getBoundingClientRect().width / V.dom.root.offsetWidth || 1) : 1
    const dx = (e.clientX - drag.x) / scale, dy = (e.clientY - drag.y) / (scale * sq)
    drag = { x: e.clientX, y: e.clientY }
    if (dx || dy) { applyCam(V, { pan: { x: -dx, y: -dy } }); drawEdges(V) } }
  const up = () => { drag = null; wrap.style.cursor = '' }
  /* keys act only while the pointer is over the board or the component has
     focus — two viewers on one page must not both pan, and a host page keeps
     its arrow keys (review 2026-09-03) */
  let hover = false
  const enter = () => { hover = true }, leave = () => { hover = false; up() }
  const key = e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return
    if (!hover && !(V.dom.root.contains && document.activeElement && V.dom.root.contains(document.activeElement))) return
    const STEP = 120
    const pan = (x, y) => { applyCam(V, { pan: { x, y } }); drawEdges(V) }
    if (e.key === 'ArrowLeft') pan(-STEP, 0)
    else if (e.key === 'ArrowRight') pan(STEP, 0)
    else if (e.key === 'ArrowUp') pan(0, -STEP)
    else if (e.key === 'ArrowDown') pan(0, STEP)
    else if (e.key.toLowerCase() === PEEK_KEY && !e.repeat) { V.view.peek = true; applyCam(V); drawEdges(V) }
    else return
    e.preventDefault()
  }
  const keyup = e => { if (e.key.toLowerCase() === PEEK_KEY) { V.view.peek = false; applyCam(V); drawEdges(V) } }
  wrap.addEventListener('pointerdown', down); wrap.addEventListener('pointermove', move)
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointerleave', leave); wrap.addEventListener('pointerenter', enter)
  document.addEventListener('keydown', key); document.addEventListener('keyup', keyup)
  return () => { document.removeEventListener('keydown', key); document.removeEventListener('keyup', keyup) }
}

