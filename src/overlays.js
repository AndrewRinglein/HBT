/* ── THE HOST'S LESSONS: A NOTICE, POINTERS, A LOOK (viewer.tutorial-overlays, 2026-10-04) ─────────────────────────────────
   Engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, no map before battle 1, the Orphanage's
   lessons, the camera shows what arrives, new enemies are named, a closer start' (Andrew: "there should be a notification
   message across the center that is gold and easy to see" / "the gold message doesn't stay up. It only lasts for a time." /
   "The camera zooms onto the civilians, and an arrow points at them and says \"Civilians.\"" / "we're going to point an arrow
   over at the move button" / "There are two arrows pointing at the two base enemy numbers." / "It points to the right and
   says you can see all the details about this enemy on the right.").

   Three things the opening's lessons are made of — DRAWN here, DECIDED by the host: the viewer never chooses when a lesson
   shows, to whom, or in what words; nothing here is replay-only, and nothing reads the battle to decide anything.
     tell(words, {ms, hold, onDone})   the NOTICE: one to three lines across the centre of the board, gold. It lasts for a
                                       time and goes by itself (the host's ms, else camera-policy.js noticeMs: long enough to
                                       read twice); a click on it, the host's clear(), or the next notice ends it sooner.
                                       One at a time. hold: the pump waits while it is up, as it waits on the affliction
                                       pop-up — the battle does not run on under words nobody has read.
     point(target, {word, side})       a POINTER: an arrow with an optional word, at a unit (it follows the unit), a hex, an
                                       action-bar slot, an enemy's movement or attack number, a unit's Health or Protection
                                       bar, the stamina strip, the right-hand panel, a card of the top bar, End Turn or End
                                       activation, or anything on the page by selector. Several at once; each stays until the
                                       host clears it; it tracks its target every frame and never leaves the screen.
     look(target, {ms, back, onDone})  a LOOK: the view goes to a unit or a hex, closer than the play zoom, holds, and goes
                                       back to where it was (or stays, for the host to send it on) — the camera's own glide,
                                       never past the board's edge.
   Each call tells the host when it is done (onDone), so a host can run them in order. No number shown is worked out here. */
import { POLICY, noticeMs } from './camera-policy.js'
import { applyCam, drawEdges, viewportOf, boardAffine, heightOf, TOKEN_TOP, GLIDE_MS } from './board.js'
import { screenOf } from './camera3d.js'

const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const SIDES = ['top', 'bottom', 'left', 'right']
/** the named parts of the screen a pointer may mark: where they are, and the side the arrow comes from */
const UI = {
  stamina: { find: V => V.dom.stambar, side: 'top' },
  panel: { find: V => V.dom.panel, side: 'left' },                 // from the left, pointing right ("It points to the right …")
  'action-bar': { find: V => V.dom.actionbar, side: 'top' },
  'end-turn': { find: V => V.dom.root.querySelector('#playEndTurn'), side: 'top' },
  'end-activation': { find: V => V.dom.root.querySelector('#playEndAct'), side: 'top' },
}
/** a unit's parts on the board (board.js: E.mv its movement number, E.dg its attack number, E.hpbar, E.prot) */
const PARTS = { move: 'mv', attack: 'dg', health: 'hpbar', protection: 'prot' }

export function mountOverlays(V) {
  const root = V.dom.root, wrap = V.dom.stage.parentNode
  const layer = document.createElement('div'); layer.id = 'tutLayer'; root.appendChild(layer)
  const done = (f, why) => { if (typeof f === 'function') f(why) }
  const fail = why => { throw new Error('viewer overlays: ' + why) }

  /* ── the NOTICE ── */
  let told = null
  function endTell(why) {
    const t = told; if (!t) return false
    told = null
    if (t.timer != null) clearTimeout(t.timer)
    t.node.remove()
    if (t.hold) V.releasePump('notice')
    done(t.onDone, why)
    return true
  }
  function tell(words, opts = {}) {
    const lines = (Array.isArray(words) ? words : [words]).map(x => typeof x === 'string' ? x.trim() : x)
    if (!lines.length || lines.length > 3 || lines.some(x => typeof x !== 'string' || !x)) fail('a notice is one to three lines of words')
    if (opts.ms !== undefined && !(Number.isFinite(opts.ms) && opts.ms > 0)) fail('a notice lasts a positive number of milliseconds')
    endTell('replaced')
    const ms = opts.ms ?? noticeMs(lines.join(' '))
    /* viewer.notices-gold-low-no-backdrop: the one lettering, in the one stack just above the bottom of the board */
    const node = document.createElement('div'); node.id = 'tutNotice'; node.className = 'hbtNotice'; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite')
    node.innerHTML = lines.map(l => `<b>${esc(l)}</b>`).join('')
    const t = told = { node, lines, ms, hold: !!opts.hold, onDone: opts.onDone, timer: null }
    /* a click on the words clears them sooner; it is the notice's own, never the board's under it */
    node.addEventListener('click', ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (told === t) endTell('click') })
    for (const type of ['pointerdown', 'pointerup', 'dblclick', 'contextmenu']) node.addEventListener(type, ev => { if (ev && ev.stopPropagation) ev.stopPropagation() })
    ;(root.querySelector('#noticeStack') || wrap || root).appendChild(node)
    if (node.animate) node.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' })
    if (t.hold) V.holdPump('notice')
    t.timer = setTimeout(() => { t.timer = null; if (told === t) endTell('time') }, ms)
    return { ms, clear: () => { if (told === t) endTell('cleared') } }
  }

  /* ── the POINTERS ── */
  const pointers = new Map(); let nextId = 1, raf = null
  /** what a target names: {key, side, el() | at()} — an element on the page, or a point of the board through the camera */
  function resolve(target) {
    if (!target || typeof target !== 'object') fail('a pointer needs a target')
    const keys = Object.keys(target)
    if (target.unit !== undefined) {
      if (!Number.isInteger(target.unit)) fail('a pointer\'s unit is a unit id')
      if (target.part !== undefined) {
        if (!Object.hasOwn(PARTS, target.part)) fail('a unit\'s part is one of ' + Object.keys(PARTS).join(', '))
        return { key: `unit:${target.unit}:${target.part}`, side: 'top', el: () => { const E = V.layers.UEL.get(target.unit), n = E && E[PARTS[target.part]]; return n && n.style.display !== 'none' ? n : null } }
      }
      /* the unit itself: above its head, wherever it stands now */
      return { key: `unit:${target.unit}`, side: 'top', at: () => { const u = V.S.U[target.unit]; if (!u || !V.data.POS[u.hex]) return null
        const E = V.layers.UEL.get(u.id), tall = (E && E.pick && E.pick.h) || TOKEN_TOP; return board(u.hex, tall) } }
    }
    if (target.hex !== undefined) { if (!V.data.POS[target.hex]) fail('a pointer\'s hex is a board hex'); return { key: `hex:${target.hex}`, side: 'top', at: () => board(target.hex, 0) } }
    if (target.action !== undefined) { if (typeof target.action !== 'string' || !target.action) fail('a pointer\'s action is an action id')
      return { key: `action:${target.action}`, side: 'top', el: () => [...V.dom.actionbar.querySelectorAll('.acRow')].find(r => r.dataset.act === target.action) || null } }
    if (target.card !== undefined) { if (!Number.isInteger(target.card)) fail('a pointer\'s card is a unit id')
      return { key: `card:${target.card}`, side: 'bottom', el: () => [...V.dom.rail.querySelectorAll('.railchip')].find(c => +c.dataset.i === target.card) || null } }
    if (target.ui !== undefined) { const part = UI[target.ui]; if (!part) fail('a pointer\'s ui is one of ' + Object.keys(UI).join(', '))
      return { key: `ui:${target.ui}`, side: part.side, el: () => part.find(V) || null } }
    if (target.selector !== undefined) { if (typeof target.selector !== 'string' || !target.selector) fail('a pointer\'s selector is a CSS selector')
      return { key: `selector:${target.selector}`, side: 'top', el: () => root.querySelector(target.selector) || (typeof document !== 'undefined' && document.querySelector ? document.querySelector(target.selector) : null) } }
    fail('a pointer\'s target is one of unit, hex, action, card, ui, selector — got ' + keys.join(', '))
  }
  /** a board point as the camera shows it now, in the root's px (the wrap's own offset inside the root added) */
  function board(hex, up) {
    const cam = V.camera3d; if (!cam) return null
    const p = V.data.POS[hex], q = screenOf(boardAffine(V), cam, p.px, p.py, heightOf(V, hex) + up), o = offsetOf(wrap)
    return { x: o.x + q.x, y: o.y + q.y }
  }
  const rectOf = n => n && typeof n.getBoundingClientRect === 'function' ? n.getBoundingClientRect() : null
  /** an element's place inside the root (px of the root's own layout: a host may scale the whole component) */
  function offsetOf(n) {
    const r = rectOf(n), R = rectOf(root); if (!r || !R || !(R.width > 0)) return { x: 0, y: 0, w: 0, h: 0 }
    const k = (root.clientWidth || R.width) / R.width
    return { x: (r.left - R.left) * k, y: (r.top - R.top) * k, w: r.width * k, h: r.height * k }
  }
  /** where a pointer's tip goes: the target's edge on the side the arrow comes from */
  function tipOf(p) {
    if (p.spec.at) return p.spec.at()
    const n = p.spec.el(); p.el = n
    if (!n) return null
    const o = offsetOf(n)
    return p.side === 'top' ? { x: o.x + o.w / 2, y: o.y } : p.side === 'bottom' ? { x: o.x + o.w / 2, y: o.y + o.h }
      : p.side === 'left' ? { x: o.x, y: o.y + o.h / 2 } : { x: o.x + o.w, y: o.y + o.h / 2 }
  }
  const sizeOf = () => { const R = rectOf(root); return { w: root.clientWidth || (R && R.width) || viewportOf(V).W, h: root.clientHeight || (R && R.height) || viewportOf(V).H } }
  function place(p) {
    const tip = tipOf(p), M = POLICY.POINTER_INSET
    if (!tip) { p.node.style.display = 'none'; p.shown = null; return }
    /* "the screen" for a thing on the board is the battle area (the board never draws over the bars round it); for a part of
       the screen it is the whole of it */
    const full = sizeOf(), area = p.spec.at ? offsetOf(wrap) : null, B = area && area.w > 0 ? area : { x: 0, y: 0, w: full.w, h: full.h }
    const w = B.x + B.w, h = B.y + B.h
    /* never off the screen: a target outside it (or hard against its edge) keeps its pointer — the word and the arrow, whole —
       inside, at the edge, on the way to it. The pointer's own size is the browser's (0 where nothing is laid out). */
    p.node.style.display = ''
    const bw = p.node.offsetWidth || 0, bh = p.node.offsetHeight || 0, s = p.side
    const x0 = B.x + M + (s === 'left' ? bw : s === 'right' ? 0 : bw / 2), x1 = w - M - (s === 'right' ? bw : s === 'left' ? 0 : bw / 2)
    const y0 = B.y + M + (s === 'top' ? bh : s === 'bottom' ? 0 : bh / 2), y1 = h - M - (s === 'bottom' ? bh : s === 'top' ? 0 : bh / 2)
    const x = Math.min(Math.max(x0, x1), Math.max(Math.min(x0, x1), tip.x)), y = Math.min(Math.max(y0, y1), Math.max(Math.min(y0, y1), tip.y))
    p.node.style.left = x.toFixed(1) + 'px'; p.node.style.top = y.toFixed(1) + 'px'
    p.node.classList.toggle('tutEdge', x !== tip.x || y !== tip.y)
    p.shown = { x, y }
  }
  function frame() { raf = null; for (const p of pointers.values()) place(p); if (pointers.size && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame) }
  function point(target, opts = {}) {
    const spec = resolve(target), side = opts.side ?? spec.side
    if (!SIDES.includes(side)) fail('a pointer comes from one of ' + SIDES.join(', '))
    if (opts.word !== undefined && (typeof opts.word !== 'string' || !opts.word.trim())) fail('a pointer\'s word is words')
    const id = nextId++, node = document.createElement('div')
    node.className = 'tutPtr tut-' + side; node.setAttribute('data-ptr', String(id)); node.setAttribute('data-target', spec.key)
    node.innerHTML = (opts.word ? `<span class="tutWord hbtNotice">${esc(opts.word.trim())}</span>` : '') + '<i class="tutArrow"></i>'
    layer.appendChild(node)
    const p = { id, spec, side, node, word: opts.word ? opts.word.trim() : null, target: spec.key, el: null, shown: null }
    pointers.set(id, p); place(p)
    if (raf == null && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame)
    return { id, target: spec.key, clear: () => unpoint(id) }
  }
  /** clear one pointer by its id, or all of them; says how many went */
  function unpoint(id) {
    const gone = id === undefined ? [...pointers.values()] : pointers.has(id) ? [pointers.get(id)] : []
    for (const p of gone) { p.node.remove(); pointers.delete(p.id) }
    if (!pointers.size && raf != null && typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(raf); raf = null }
    return gone.length
  }

  /* ── the LOOK ── */
  let looking = null
  const glideMs = () => V.view.glide && typeof requestAnimationFrame === 'function' ? GLIDE_MS : 0
  const hexOf = target => {
    if (target && Number.isInteger(target.unit)) { const u = V.S.U[target.unit]; if (!u || !V.data.POS[u.hex]) fail('a look\'s unit is a unit on the board'); return u.hex }
    if (target && target.hex !== undefined && V.data.POS[target.hex]) return target.hex
    fail('a look goes to a unit or a hex')
  }
  function endLook(why) {
    const L = looking; if (!L) return false
    looking = null
    if (L.timer != null) clearTimeout(L.timer)
    done(L.onDone, why)
    return true
  }
  /** back to where the view was before the first look of the chain */
  function restore() {
    const from = V.view.looking; if (!from) return false
    V.view.cam = { ...from.cam }; V.view.camF = { ...from.camF }; V.view.overview = from.overview; V.view.looking = null
    applyCam(V, { hold: true }); drawEdges(V)
    return true
  }
  function look(target, opts = {}) {
    const hex = hexOf(target), ms = opts.ms ?? POLICY.LOOK_HOLD_MS, back = opts.back !== false
    if (!(Number.isFinite(ms) && ms >= 0)) fail('a look holds for a number of milliseconds')
    if (V.view.zoom === 'fit') fail('a look needs the battle\'s own camera (the whole-board fit has none to send)')
    endLook('replaced')
    /* the pose to come back to is the one before the FIRST look: a chain of looks returns to where the player was */
    if (!V.view.looking) V.view.looking = { cam: { ...V.view.cam }, camF: { ...V.view.camF }, overview: !!V.view.overview }
    V.view.peek = false; V.view.overview = false; V.view.revealed = null
    V.view.cam.zoom = POLICY.LOOK_ZOOM
    applyCam(V, { focus: V.data.POS[hex] }); drawEdges(V)
    const L = looking = { hex, onDone: opts.onDone, timer: null }
    L.timer = setTimeout(() => {
      L.timer = null; if (looking !== L) return
      if (!back) { endLook('held'); return }
      restore()
      L.timer = setTimeout(() => { L.timer = null; if (looking === L) endLook('back') }, glideMs())
    }, glideMs() + ms)
    return { hex, cancel: () => { if (looking === L) { restore(); endLook('cancelled') } } }
  }
  /** send the view back to where it was before the looks began (after look(..., {back: false})) */
  function lookBack(opts = {}) {
    endLook('replaced')
    if (!restore()) { done(opts.onDone, 'back'); return false }
    const L = looking = { hex: null, onDone: opts.onDone, timer: null }
    L.timer = setTimeout(() => { L.timer = null; if (looking === L) endLook('back') }, glideMs())
    return true
  }

  return {
    tell, clearTell: () => endTell('cleared'), point, unpoint, look, lookBack,
    /** a hand step, a seek, a fault: the notice and its hold go (as the affliction pop-up does); a look is called off */
    dropped() { endTell('dropped'); if (looking) { restore(); endLook('dropped') } },
    dispose() { endTell('disposed'); unpoint(); if (looking) endLook('disposed'); V.view.looking = null; layer.remove() },
    /** read-only, for the page tests: what stands now */
    get state() { return { notice: told ? { lines: [...told.lines], ms: told.ms, hold: told.hold, node: told.node } : null,
      pointers: [...pointers.values()].map(p => ({ id: p.id, target: p.target, word: p.word, side: p.side, el: p.el, shown: p.shown, node: p.node })), looking: looking ? { hex: looking.hex } : null } },
  }
}
