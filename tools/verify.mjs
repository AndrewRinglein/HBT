#!/usr/bin/env node
/* Headless verification of the built battle viewer — the constitution's
   catches (VIEWER-CONSTITUTION.md) plus the standing checks. Runs on every
   build, before the page is written into place.

     node tools/verify.mjs BATTLE-VIEWER.html [--check <name>]...

   Standing checks, every library battle:
     · the page mounts, folds every event end to end, cursor == events.length
     · the folded outcome is the engine's stamped outcome
     · the PURE fold (src/fold.js) over the same events reaches the same state
       the pumped viewer did — the fold/draw split holds (plan §8.5)
     · every event type in every log is folded or on the explicit ignore list;
       every type in the pump's duration table is a real event type
     · every number a float carries appears verbatim in the event that cued it
       (the root law's catch — "the viewer computes nothing")
     · the EXEMPTION markers in src/ match tools/exemptions.json exactly
     · every fielded typeId has art; generated/fields.json covers every map
     · the ground is the stage's first child; no rendered surface prints "+-"
     · every <use href="#ra-…"> resolves to a sprite symbol
     · a dropped export plays (harness.playExport)
     · the page stamps the viewer and engine commits
     · a multi-hex move steps as ONE beat and lands the unit where the log says
     · hitstop cues carry only the ruled 70/110/140 and all three occur
     · the skull is on the bar exactly when the tick projection is lethal
     · the camera pans by inclusion, a manual pan holds, a peek restores
     · off-screen units get edge bubbles that account for every one of them; none during a peek
     · the emphasis ladder: CRIT! + kick + super impact fire together; injuries are queued plates, never floats
     · 2026-09-03 (engine/EVENTS-FOR-THE-VIEWER-2026-09-03.md): arrivals at any seq land as units and beats;
       the six outcome words; the kit (unit.equipped) reaches the action bar and the movement numeral;
       corpses and painted layers are board objects that come and go with their events, a paint run is one
       beat; the ZoC hold and the attack-of-opportunity label; the Deathbed stand's roll, wound level and
       blood; banners for waves, night, the band, the objective; Surge; the Power chip; auras round every
       standing holder and none round a fallen one
   Optional --check names add change-specific assertions. */
import fs from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeWindow } from './fakedom.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = resolve(HERE, '..')
const [, , file, ...rest] = process.argv
if (!file) { console.error('usage: verify.mjs <BATTLE-VIEWER.html> [--check name]'); process.exit(2) }
const CHECKS = new Set(); for (let i = 0; i < rest.length; i++) if (rest[i] === '--check') CHECKS.add(rest[++i])
const html = fs.readFileSync(file, 'utf8')
const fails = []
const check = (ok, msg) => { if (!ok) fails.push(msg) }

/* ── the pure fold, imported directly ──────────────────────────────────── */
const { createState, fold, foldTo, FOLDED_TYPES } = await import(pathToFileURL(resolve(PKG, 'src/fold.js')).href)
const { DUR } = await import(pathToFileURL(resolve(PKG, 'src/viewer.js')).href)   // Law 9: if this cannot import, say so
/* event types the viewer deliberately does nothing with — a NEW engine event
   is a failure until it is folded or listed here on purpose */
const IGNORED = new Set(['turn.end', 'activation.idle', 'trigger.rolled', 'phase.end.begin', 'map.loaded',
  'ai.tookHighGround', 'ai.denied', 'knockback.blocked', 'crit.branch'])

/* ── mount the page ────────────────────────────────────────────────────── */
const m = html.match(/<script>([\s\S]*)<\/script>\s*$/)
if (!m) { console.error('no trailing <script> in ' + file); process.exit(1) }
const bodyHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
const win = makeWindow()
win.document.body.innerHTML = bodyHTML
const run = new Function('window', 'document', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'addEventListener', 'alert', 'Date', 'performance', 'getComputedStyle', 'localStorage', 'self', 'globalThis', m[1])
try {
  run(win, win.document, win.requestAnimationFrame, win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
    win.addEventListener, win.alert, win.Date, win.performance, win.getComputedStyle, win.localStorage, win, win)
} catch (e) { console.error('FAIL — the page threw while booting:', e.stack || e); process.exit(1) }
const BV = win.__battleView
if (!BV) { console.error('FAIL — window.__battleView not exposed'); process.exit(1) }
const LIB = BV.lib
const stripB64 = s => s.replace(/data:[^"')]+/g, 'data:…')
const numsIn = e => { const out = new Set(); const walk = v => { if (typeof v === 'number') out.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }; walk(e); return out }

/* ── exemptions: the markers in the source match the file exactly ──────── */
{
  const ex = JSON.parse(fs.readFileSync(resolve(PKG, 'tools/exemptions.json'), 'utf8')).exemptions
  const found = new Set()
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = resolve(d, f); if (fs.statSync(p).isDirectory()) walk(p)
    else if (/\.(js|ts)$/.test(f)) for (const mm of fs.readFileSync(p, 'utf8').matchAll(/EXEMPTION ([a-z-]+)/g)) found.add(mm[1]) } }
  walk(resolve(PKG, 'src'))
  for (const n of found) check(ex[n], `exemptions: src carries EXEMPTION ${n} with no entry in tools/exemptions.json — a new computation needs its debt written down`)
  for (const n of Object.keys(ex)) check(found.has(n), `exemptions: ${n} is listed but no EXEMPTION ${n} marker remains in src — delete the entry, the list only shrinks`)
  /* the list may only shrink: compare against the committed file */
  try {
    const { execSync } = await import('node:child_process')
    const committed = JSON.parse(execSync('git show HEAD:tools/exemptions.json', { cwd: PKG, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).exemptions
    const grew = Object.keys(ex).filter(n => !committed[n])
    if (grew.length && !process.env.ALLOW_EXEMPTION_GROWTH) fails.push(`exemptions: the list GREW by ${grew.join(', ')} — it may only shrink. A review that found an unmarked computation may set ALLOW_EXEMPTION_GROWTH=1 for the commit that records it.`)
  } catch (e) { /* no committed copy yet */ }
}

/* ── fields cover every map; sprite; stamps ────────────────────────────── */
for (const id of (LIB.static.maps || [])) check(LIB.fields[id], `fields: generated/fields.json lacks ${id}`)
check(LIB.static.maps && LIB.static.maps.length > 0, 'static.json carries no map list')
const spriteEl = win.document.body.querySelector('#raSprite')
const spriteIds = new Set(spriteEl ? spriteEl.querySelectorAll('symbol').map(s => s.id) : [])
check(spriteIds.size >= 4, `sprite has only ${spriteIds.size} symbols`)
check(/GENERATED by viewer\/tools\/build-viewer\.mjs — never hand-edit\. viewer [0-9a-f]{7,}\*? · engine [0-9a-f]{7,}\*? · sheets [0-9a-f]{7,}\*? · fields [0-9a-f]{7,}\*?/.test(html.slice(0, 400)), 'the page does not stamp real viewer/engine/sheet/field commits in its header')
check(!/built \d{4}-/.test(html.slice(0, 400)), 'the page carries a build timestamp — builds must be byte-identical (PLAYBACK-DESIGN §9)')
{ const st = LIB.stamp; check(st && st.staticEngine === st.fieldsEngine, `the sheets (${st && st.staticEngine}) and the fields (${st && st.fieldsEngine}) were dumped from different engine commits`) }

/* ── every library battle ──────────────────────────────────────────────── */
const H = BV.harness
/* the fake DOM has no layout: give the board wrap the design viewport so the
   camera and the edge bubbles reason about a real-sized window */
const DESIGN = { W: 1408, H: 744 }
function sizeWrap() { const wrap = H.viewer && H.viewer._V.dom.stage.parentNode
  if (wrap) { Object.defineProperty(wrap, 'clientWidth', { value: DESIGN.W, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: DESIGN.H, configurable: true }) } }
const load = i => { H.load(i); sizeWrap() }
sizeWrap()
let uses = new Set(), damaging = 0, plain = 0
function drive(label, battle, allowStandee = false) {
  const v = H.viewer
  v.pause()
  const EV = v.events
  let cur = v.cursor
  try { while (v.cursor < EV.length) { win._tick(200); v.step(); if (v.cursor === cur) throw new Error('step did not advance'); cur = v.cursor } }
  catch (e) { fails.push(`${label}: threw at event ${v.cursor} (${EV[v.cursor] && EV[v.cursor].type}): ${e.message}`); return null }
  check(v.cursor === EV.length, `${label}: folded ${v.cursor} of ${EV.length}`)
  check(v.state.outcome === battle.outcome, `${label}: outcome ${v.state.outcome} vs engine ${battle.outcome}`)
  const V = v._V
  check(V.dom.stage.firstChild && V.dom.stage.firstChild === V.layers.ground, `${label}: ground is not the stage's first child`)
  for (const u of Object.values(v.state.U)) check(LIB.art.artmap[u.typeId] || allowStandee, `${label}: no art for ${u.typeId}`)
  /* the pure fold reaches the same state the pump did */
  const S2 = foldTo(EV, EV.length, { UD: LIB.static.units, SN: LIB.static.statuses })
  /* the lingering view-state foldTo() clears is stripped from both: AIM, FIRING, TRIGFLASH, the declared
     ATTACK and the AOO (a battle that ends on the killing blow ends mid-activation, with both still set) */
  const strip = S => JSON.stringify({ ...S, AIM: null, FIRING: null, TRIGFLASH: null, ATTACK: null, AOO: null, subjectId: null, subjectMode: null })
  check(strip(S2) === strip(v.state), `${label}: the pure fold and the pumped viewer disagree on the final state`)
  /* every type folded or ignored; float numbers verbatim from their event */
  const types = new Set(EV.map(e => e.type))
  for (const t of types) check(FOLDED_TYPES.includes(t) || IGNORED.has(t), `${label}: event type ${t} is neither folded nor on the ignore list`)
  { const S = createState(); for (const e of EV) { const cues = fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)
      for (const c of cues) {
        if (c.k === 'float') {
          /* the cue names the field its number came from; the number in the text must be that field, verbatim */
          const n = c.text.match(/\d+/)
          if (n) { check(c.of != null && e[c.of] === c.n && +n[0] === Math.abs(c.n), `${label}: float "${c.text}" — n=${c.n} of=${c.of}, event.${c.of}=${c.of && e[c.of]} (${e.type})`) }
          else check(c.n == null, `${label}: float "${c.text}" carries n=${c.n} but prints no number`)
        }
        /* no other cue may invent a number: every numeric field is an id, a hex, a beat length, or verbatim */
        if (c.k === 'fx.attack' && c.dmg != null) check(numsIn(e).has(c.dmg) || (S.ATTACK && S.ATTACK.dmg === c.dmg), `${label}: fx.attack carries dmg ${c.dmg} that no event stated`)
      } } }
  /* every surface for every unit — at the END state, and for the actor at each
     of the first 24 activations, so live-modifier, cooldown, FIRING and AIM
     branches render too (review 2026-09-03) */
  { let n = 0
    for (let i = 0; i < EV.length && n < 24; i++) if (EV[i].type === 'activation.begin') { n++
      const St = foldTo(EV, i + 1, { UD: LIB.static.units, SN: LIB.static.statuses })
      const saved = V.S; V.S = St; v.inspect(EV[i].actor); V.S = saved } }
  v.render()
  for (const u of Object.values(v.state.U)) {
    v.inspect(u.id)
    const bar = V.dom.actionbar.innerHTML
    for (const x of bar.matchAll(/href="#(ra-[a-z0-9-]+)"/g)) uses.add(x[1])
    for (const row of bar.split('class="acRow').slice(1)) { if (/DMG<\/span><span class="v" style="color:#/.test(row)) damaging++; else plain++ }
    for (const E of V.layers.UEL.values()) for (const x of (E.dg.innerHTML || '').matchAll(/href="#(ra-[a-z0-9-]+)"/g)) uses.add(x[1])
  }
  const surfaces = win.document.body.allHTML().map(stripB64).join('\n')
  check(!/\+-\d/.test(surfaces), `${label}: "+-" on a rendered surface`)
  return v
}
for (let i = 0; i < LIB.battles.length; i++) {
  const b = LIB.battles[i]
  if (i > 0) load(i)
  drive(b.label, b.battle)
}
for (const u of uses) check(spriteIds.has(u), `icons: <use> names ${u}, sprite lacks it`)
check(uses.has('ra-crossed-swords') && uses.has('ra-shoe-prints') && uses.has('ra-bow') && !uses.has('ra-crossbow'), `icons: expected swords, shoe-prints and the bow (never the crossbow) among uses, got ${[...uses].join(',')}`)
check(damaging > 0 && plain > 0, `icons: rows damaging=${damaging} plain=${plain} — both kinds must appear`)
if (DUR) for (const t of Object.keys(DUR)) check(FOLDED_TYPES.includes(t) || IGNORED.has(t), `pump: DUR names ${t}, which no log folds`)

/* ── one traversal per move (VISUAL-BATTLE-UPDATES §1.1) ───────────────── */
{
  const b = LIB.battles[0]; load(0); const v = H.viewer; v.pause()
  const EV = v.events
  const i = EV.findIndex(e => e.type === 'move.begin' && e.hexes > 1)
  if (i < 0) fails.push('traversal: no multi-hex move in the first battle to test with')
  else {
    v.seek(i); v.step()
    check(v.cursor === i + 1 + EV[i].hexes, `traversal: stepping a ${EV[i].hexes}-hex move advanced ${v.cursor - i} events, expected ${1 + EV[i].hexes} (one beat per move)`)
    const u = v.state.U[EV[i].actor]
    check(u && u.hex === EV[i].to, `traversal: after the beat the unit stands at ${u && u.hex}, the move said ${EV[i].to}`)
    const E = v._V.layers.UEL.get(EV[i].actor)
    const a = E && E.root.animations && E.root.animations[E.root.animations.length - 1]
    const want = Math.min(900, Math.max(320, 200 + 85 * EV[i].hexes))
    check(a && a.kf.length === EV[i].hexes + 1, `traversal: expected ${EV[i].hexes + 1} waypoints, got ${a && a.kf.length}`)
    check(a && a.opts.duration === want && a.opts.easing === 'cubic-bezier(.35,0,.2,1)', `traversal: duration/easing ${a && a.opts.duration}/${a && a.opts.easing}, expected ${want}/cubic-bezier(.35,0,.2,1)`)
    const bob = E && E.img.animations && E.img.animations[E.img.animations.length - 1]
    check(bob && bob.opts.iterations === EV[i].hexes, `traversal: the bob should cycle once per hex (${EV[i].hexes}), got ${bob && bob.opts.iterations}`)
  }
}

/* ── hitstop (VISUAL-BATTLE-UPDATES §1.2): 70 hit · 110 kill · 140 crit ── */
{
  const seen = new Set(); const S = createState()
  for (const b of LIB.battles) { const S = createState()
    for (const e of b.battle.events) for (const c of fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)) if (c.k === 'hitstop') seen.add(c.ms) }
  for (const ms of [70, 110, 140]) check(seen.has(ms), `hitstop: no ${ms}ms beat in any library battle`)
  for (const ms of seen) check([70, 110, 140].includes(ms), `hitstop: unruled duration ${ms}`)
}

/* ── the skull (VISUAL-BATTLE-UPDATES §3.1): shown exactly when the projection is lethal ── */
{
  const { projectTick } = await import(pathToFileURL(resolve(PKG, 'src/projection.js')).href)
  let lethalSeen = 0, mismatches = 0
  for (let bi = 0; bi < LIB.battles.length; bi++) {
    load(bi); const v = H.viewer; v.pause()
    const EV = v.events, V = v._V
    while (v.cursor < EV.length) {
      const before = v.cursor
      v.step(); if (v.cursor === before) break
      if (!['status.applied', 'damage.applied'].includes(EV[v.cursor - 1].type)) continue
      for (const u of Object.values(v.state.U)) {
        if (u.life !== 'standing') continue
        const E = V.layers.UEL.get(u.id); if (!E) continue
        const lethal = projectTick(u, LIB.static.units).lethal
        const shown = E.skull.style.display !== 'none'
        if (lethal) lethalSeen++
        if (lethal !== shown) mismatches++
      }
    }
  }
  check(lethalSeen > 0, 'skull: no lethal projection anywhere in the library — cannot test the skull')
  check(mismatches === 0, `skull: ${mismatches} unit-frames where the skull and the projection disagree`)
}

/* ── the camera (PLAYBACK-DESIGN §7.8): inclusion, not centring; pan holds; peek restores ── */
{
  load(0); const v = H.viewer; v.pause(); const V = v._V
  /* stand on an activation whose actor is away from the board's edges, so the
     camera is not clamped and has room to pan on either side */
  const POS = V.data.POS, sq = Math.cos(V.data.LAYOUT.tilt * Math.PI / 180)
  const halfW = DESIGN.W / 2, halfH = DESIGN.H / 2 / sq, M = 80
  const EV = v.events, bw0 = V.data.F.w
  const S0 = foldTo(EV, EV.length, { UD: LIB.static.units, SN: LIB.static.statuses })   // to know where everyone ends up
  let ai = -1
  for (let i = 0; i < EV.length; i++) if (EV[i].type === 'activation.begin') {
    const St = foldTo(EV, i + 1, { UD: LIB.static.units, SN: LIB.static.statuses }); const u = St.U[EV[i].actor]
    if (u && POS[u.hex].px > halfW + 100 && POS[u.hex].px < bw0 - halfW - 100) { ai = i; break } }
  check(ai >= 0, 'camera: no activation away from the board edges to test with')
  v.seek(ai + 1); v.render()
  const before = { ...V.view.camF }
  /* the actor is in view by construction; clicking it must not move the camera */
  const inside = v.state.U[V.S.subjectId]
  check(inside && Math.abs(POS[inside.hex].px - before.x) <= halfW && Math.abs(POS[inside.hex].py - before.y) <= halfH, 'camera: the acting unit is not on screen after its activation')
  if (inside) { v.inspect(inside.id); check(V.view.camF.x === before.x && V.view.camF.y === before.y, 'camera: inspecting a unit already in view moved the camera (centring, not inclusion)') }
  /* a manual pan holds while the subject stays in view. The lazy camera left
     the subject AT the margin, so pan toward it (it moves inward), by less
     than the room on that side */
  const subj = v.state.U[V.S.subjectId] || inside
  const sx = POS[subj.hex].px
  const dir = sx >= V.view.camF.x ? 1 : -1
  const bw = V.data.F.w, room = dir > 0 ? (bw - halfW - V.view.camF.x) : (V.view.camF.x - halfW)
  const step = Math.min(60, Math.floor(room / 2))
  check(step > 0, 'camera: no room to pan on the subject side')
  v.pan(step * dir, 0); const panned = { ...V.view.camF }
  check(panned.x !== before.x, 'camera: pan did nothing')
  v.render(); check(V.view.camF.x === panned.x, 'camera: a render undid a manual pan although the subject was still in view')
  /* peek shows the whole board and releases to exactly where it was */
  v.peek(true); check(/scale\(0\.\d+\)/.test(V.dom.stage.style.transform), 'camera: peek did not scale the board to fit')
  check(V.view.camF.x === panned.x && V.view.camF.y === panned.y, 'camera: peek moved the remembered camera')
  v.peek(false); check(/scale\(1\.0000\)/.test(V.dom.stage.style.transform), 'camera: releasing peek did not return to 1x')
}

/* ── a standee at the top of the board is shown whole (ruled 2026-09-03) ──── */
{
  load(0); const v = H.viewer; v.pause(); const V = v._V
  const POS = V.data.POS, sq = Math.cos(V.data.LAYOUT.tilt * Math.PI / 180), halfH = DESIGN.H / 2 / sq, TOP = 200 / sq
  const EV = v.events
  /* the first activation of a unit standing in row 0 or 1 */
  let ai = -1, actor = null
  for (let i = 0; i < EV.length; i++) if (EV[i].type === 'activation.begin') {
    const St = foldTo(EV, i + 1, { UD: LIB.static.units, SN: LIB.static.statuses }); const u = St.U[EV[i].actor]
    if (u && POS[u.hex].r <= 1) { ai = i; actor = u; break } }
  check(ai >= 0, 'camera-top: no activation of a top-row unit in the first battle to test with')
  if (ai >= 0) {
    v.seek(ai + 1); v.render()
    const head = POS[actor.hex].py - TOP, camTop = V.view.camF.y - halfH
    check(head >= camTop - 1, `camera-top: the acting unit's head (board-y ${head.toFixed(0)}) is above the viewport's top edge (${camTop.toFixed(0)}) — cut off`)
  }
}

/* ── off-screen indicators (PLAYBACK-DESIGN §7.8 part 1) ───────────────── */
{
  load(0); const v = H.viewer; v.pause(); const V = v._V
  for (let i = 0; i < 40 && v.cursor < v.events.length; i++) v.step()      // units spread out a little
  v.render()
  /* pan to a corner: with 16×16 board space larger than the view, someone must be off-screen */
  v.pan(-4000, -4000)
  const bubs = V.layers.edgeL ? V.layers.edgeL.querySelectorAll('.edgeBub') : []
  const POS = V.data.POS, camF = V.view.camF
  const sq = Math.cos(V.data.LAYOUT.tilt * Math.PI / 180)
  const offCount = Object.values(v.state.U).filter(u => u.life !== 'dead' && !(Math.abs(POS[u.hex].px - camF.x) <= DESIGN.W / 2 - 24 && (POS[u.hex].py - 200 / sq) >= camF.y - DESIGN.H / 2 / sq && POS[u.hex].py <= camF.y + DESIGN.H / 2 / sq - 24 / sq)).length
  check(offCount > 0, 'edges: panning to a corner left nobody off-screen — the test cannot bite')
  check(bubs.length > 0 && bubs.length <= offCount, `edges: ${bubs.length} bubbles for ${offCount} off-screen units`)
  const counted = bubs.reduce((n, b) => n + (b.querySelector('.edgeN') ? +b.querySelector('.edgeN').textContent : 1), 0)
  check(counted === offCount, `edges: bubbles account for ${counted} units, ${offCount} are off-screen`)
  check(bubs.some(b => b.querySelector('.edgeDg')), 'edges: no enemy bubble carries a danger numeral')
  v.peek(true); check((V.layers.edgeL.querySelectorAll('.edgeBub')).length === 0, 'edges: bubbles shown during peek, when nothing is off-screen'); v.peek(false)
}

/* ── the emphasis ladder (VISUAL-BATTLE-UPDATES §1.3, ruled 2026-09-02) ─── */
{
  let critWord = 0, critNumeral = 0, superTier = 0, kicks = 0, injuries = 0, injuryFloats = 0
  for (const b of LIB.battles) { const S = createState()
    for (const e of b.battle.events) for (const c of fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)) {
      if (c.k === 'float' && c.text === 'CRIT!') critWord++
      if (c.k === 'float' && c.crit) critNumeral++
      if (c.k === 'fx.attack' && c.crit) superTier++
      if (c.k === 'kick') kicks++
      if (c.k === 'injury') injuries++
      if (c.k === 'float' && /^✶/.test(c.text)) injuryFloats++ } }
  check(critWord > 0, 'ladder: no CRIT! word anywhere in the library')
  check(critWord === kicks && critWord === superTier, `ladder: CRIT! ${critWord}, kicks ${kicks}, super-tier impacts ${superTier} — rung 2 must fire all three together`)
  check(critNumeral > 0 && critNumeral <= critWord, `ladder: ${critNumeral} crit numerals for ${critWord} crits`)
  check(injuries > 0 && injuryFloats === 0, `ladder: ${injuries} injury plates, ${injuryFloats} injury floats — rung 3 is a plate, never a float`)
  /* the queue: two injuries at once produce ONE plate on the board and one waiting */
  const v = H.viewer, V = v._V
  const anyUnit = Object.values(v.state.U).find(u => u.life !== 'dead') || Object.values(v.state.U)[0]
  V.fx.injuryQ = []
  V.playCues([{ k: 'injury', id: anyUnit.id, name: 'Test Injury A' }, { k: 'injury', id: anyUnit.id, name: 'Test Injury B' }])
  const plates = V.dom.stage.querySelectorAll('.injPlate').length
  check(V.fx.injuryQ.length === 2 && plates === 1, `ladder: two simultaneous injuries gave ${plates} plate(s) with ${V.fx.injuryQ.length} queued — they must queue, one at a time`)
}

/* ── a dropped export plays (plan §8.6) — the REAL drop path, on a map with no
   library battle, fielding a unit with no art entry (the honest standee) ── */
{
  const src = LIB.battles[0].battle
  const mapId = (LIB.static.maps || []).find(m => !LIB.battles.some(b => b.battle.seed.mapId === m)) || src.seed.mapId
  const noArt = Object.keys(LIB.static.units).find(t => !LIB.art.artmap[t])
  const events = JSON.parse(JSON.stringify(src.events)).map(e => { if (e.type === 'map.loaded') e.mapId = mapId; return e })
  if (noArt) { const first = events.find(e => e.type === 'unit.enter'); first.typeId = noArt }
  const synthetic = { seed: { ...src.seed, mapId, replicate: 99 }, engineCommit: src.engineCommit, outcome: src.outcome, turns: src.turns, events }
  const file = { name: 'synthetic-drop.json', text: async () => JSON.stringify(synthetic) }
  let dropped = false
  try {
    win.document.dispatch('drop', { preventDefault() {}, dataTransfer: { files: [file] } })
    await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r))     // the file's text() resolves
    dropped = H.viewer && H.viewer.events === synthetic.events || (H.viewer && H.viewer.events.length === events.length && H.viewer._V.data.F === LIB.fields[mapId])
    check(dropped, `file-drop: the drop listener did not mount the dropped export (map ${mapId})`)
    if (dropped) { sizeWrap(); const v = drive('dropped export', synthetic, true); check(v && v.cursor === events.length, 'file-drop: the dropped export did not play to the end')
      if (noArt && v) { const E = v._V.layers.UEL.get(events.find(e => e.type === 'unit.enter').actor)
        check(E && E.a && E.a.token === LIB.art.artmap._pending.token, `file-drop: a unit with no art entry (${noArt}) did not get the ART PENDING standee`) } }
  } catch (e) { fails.push('file-drop: ' + e.message) }
  /* and the validation refuses a non-export */
  let refused = false
  try { H.playExportText('{"seed":{},"events":"no"}') } catch (e) { refused = true }
  check(refused, 'file-drop: a non-export file was accepted')
}

/* ── the live path: push in two batches, the pump drains and resumes; dispose leaves nothing behind ── */
{
  load(0); const v = H.viewer; const EV = v.events.slice()
  v.dispose()
  const { mountBattleViewer } = { mountBattleViewer: null }
  /* a fresh mount through the harness's own data path, fed in two halves */
  H.load(0); sizeWrap(); const v2 = H.viewer
  const half = Math.floor(EV.length / 2)
  v2.dispose()
  const root = win.document.getElementById('screen')
  const mount = BV.mount
  check(typeof mount === 'function', 'live: the page does not expose mountBattleViewer for the two-batch test')
  if (typeof mount === 'function') {
    const data = BV.harness.battleData ? BV.harness.battleData(LIB.battles[0]) : null
    check(data, 'live: harness.battleData not exposed')
    if (data) {
      const lv = mount(root, data, { autoplay: true })
      lv.push(EV.slice(0, half))
      win._flush(0)
      for (let g = 0; g < 100000 && lv.cursor < half; g++) win._flush(50)     // play the first half out
      check(lv.cursor === half, `live: after the first batch the pump stopped at ${lv.cursor}, expected ${half}`)
      check(lv.playing, 'live: the pump paused itself when it ran dry — a live game would freeze')
      lv.push(EV.slice(half))
      for (let g = 0; g < 100000 && lv.cursor < EV.length; g++) win._flush(50)
      check(lv.cursor === EV.length, `live: after the second batch the pump reached ${lv.cursor} of ${EV.length}`)
      const pendingBefore = win._pending()
      lv.dispose()
      win._flush(5000)
      const strays = win.document.body.querySelectorAll('.injPlate').length
      check(strays === 0, `live: ${strays} injury plate(s) survived dispose()`)
      if (win._pending()) { const seen = {}; for (const t of win._timers()) { const k = t.f; seen[k] = (seen[k] || 0) + 1 }
        fails.push(`live: ${win._pending()} timer(s) still pending after dispose() and a 5s flush: ${Object.entries(seen).map(([k, n]) => n + '× ' + k).join(' ; ')}`) }
    }
  }
}

/* ── 2026-09-03: the engine's feature run, one check per beat ──────────── */
{
  const CTX = { UD: LIB.static.units, SN: LIB.static.statuses }
  const byType = (EV, t) => EV.map((e, i) => [e, i]).filter(([e]) => e.type === t)
  /* the library must carry the mechanics, or these checks cannot bite */
  const has = t => LIB.battles.some(b => b.battle.events.some(e => e.type === t))
  for (const t of ['unit.equipped', 'encounter.wave', 'encounter.lost', 'corpse.created', 'corpse.removed', 'layer.painted', 'move.stopped', 'aoo.provoked',
    'deathbed.stood', 'deathbed.fell', 'hp.reset', 'bleedout.accelerated', 'surge.hit', 'power.gained', 'band.advanced', 'night.fell', 'light.cast', 'maxHp.gained', 'stamina.drained'])
    check(has(t), `2026-09-03: no library battle carries ${t} — the beat cannot be tested`)
  /* the six outcome words (Outcome has six arms) */
  const outcomes = new Set(LIB.battles.map(b => b.battle.outcome))
  check(outcomes.has('objectiveFailed') || outcomes.has('objectiveMet'), '2026-09-03: no library battle ends on an objective — the outcome words cannot be tested')
  for (let bi = 0; bi < LIB.battles.length; bi++) {
    const b = LIB.battles[bi], EV = b.battle.events, label = b.label
    if (!EV.some(e => /^(encounter|corpse|deathbed|layer|surge|aoo|move\.stopped|power\.gained)/.test(e.type))) continue
    load(bi); const v = H.viewer; v.pause(); const V = v._V
    const doc = win.document.querySelector('#doc .sub')
    if (doc && /objective/.test(b.battle.outcome)) check(/objective (met|failed)/.test(doc.innerHTML) && !/objective(Met|Failed)/.test(doc.innerHTML), `${label}: the intro prints the outcome id, not its words`)
    /* arrivals: every unit.enter after battle.begin is a unit in the final state and cued an arrival */
    const bb = EV.findIndex(e => e.type === 'battle.begin')
    const arrivals = byType(EV, 'unit.enter').filter(([, i]) => i > bb)
    const Send = foldTo(EV, EV.length, CTX)
    for (const [e] of arrivals) check(Send.U[e.actor] && Send.U[e.actor].arrived, `${label}: arrival ${e.name} (${e.actor}) is not in the folded roster as an arrival`)
    { const S = createState(); let cued = 0
      for (const e of EV) for (const c of fold(S, e, CTX, 0)) if (c.k === 'arrive') cued++
      check(cued === arrivals.length, `${label}: ${arrivals.length} arrivals, ${cued} arrive cues`) }
    /* and the beat lands on a token that exists: stepping the first arrival animates its billboard */
    if (arrivals.length) { const [e, i] = arrivals[0]; v.seek(i); v.step()
      const E = V.layers.UEL.get(e.actor)
      check(E && E.bb.animations && E.bb.animations.length > 0, `${label}: the arrival of ${e.name} played no drop-in (the token did not exist when the cue played?)`) }
    /* the kit: a unit with unit.equipped shows its granted attacks in the bar, and its resting movement is the sheet's plus the kit's */
    const eq = byType(EV, 'unit.equipped').find(([e]) => (e.grants || []).length)
    if (eq) { const [e] = eq
      v.seek(bb + 1); v.inspect(e.actor); v.render()
      check(V.dom.actionbar.innerHTML.includes(`data-act="${e.grants[0]}"`), `${label}: the action bar lacks the granted attack ${e.grants[0]} for unit ${e.actor}`)
      const u = v.state.U[e.actor], sheet = LIB.static.units[u.typeId]
      const kitMv = byType(EV, 'unit.equipped').filter(([x]) => x.actor === e.actor).reduce((n, [x]) => n + ((x.mods || {}).movement || 0), 0)
      const E = V.layers.UEL.get(e.actor)
      if (sheet && sheet.movement != null && E.mv.style.display !== 'none') check(+E.mv.textContent === Math.max(0, sheet.movement + kitMv), `${label}: unit ${e.actor} rests at movement ${E.mv.textContent}, the sheet says ${sheet.movement} and the kit ${kitMv}`)
      /* the kit is not a buff: no chevron from item.* sources alone */
      const St = foldTo(EV, bb + 1, CTX)
      if ((St.U[e.actor].mods || []).every(m => /^item\./.test(m.source))) check(!/polygon\(50% 12%|polygon\(50% 88%/.test(E.badges.innerHTML), `${label}: unit ${e.actor} wears a chevron for its kit alone`) }
    /* corpses: a board object per corpse.created, gone on corpse.removed; the dead unit's token leaves */
    for (const [e, i] of byType(EV, 'corpse.created').slice(0, 3)) {
      v.seek(i + 1); v.render()
      check(V.layers.CORPSE && V.layers.CORPSE.has(e.corpse), `${label}: no corpse node after corpse.created ${e.corpse}`)
      const E = V.layers.UEL.get(e.of); check(E && E.root.style.display === 'none', `${label}: dead unit ${e.of} still draws its token beside its corpse`) }
    for (const [e, i] of byType(EV, 'corpse.removed').slice(0, 3)) {
      v.seek(i + 1); v.render()
      check(!(V.layers.CORPSE && V.layers.CORPSE.has(e.corpse)), `${label}: corpse ${e.corpse} still drawn after corpse.removed (${e.how})`) }
    { const S = foldTo(EV, EV.length, CTX)
      const created = byType(EV, 'corpse.created').length, removed = byType(EV, 'corpse.removed').length
      check(Object.keys(S.corpses).length === created - removed, `${label}: ${Object.keys(S.corpses).length} corpses folded, ${created} created − ${removed} removed`) }
    /* layers: a paint run is ONE beat and the tiles match the folded layers */
    const paints = byType(EV, 'layer.painted')
    if (paints.length) { const [, i0] = paints[0]
      let runEnd = i0; while (EV[runEnd + 1] && /^layer\.(painted|cancelled)$/.test(EV[runEnd + 1].type)) runEnd++
      v.seek(i0); v.step()
      check(v.cursor === runEnd + 1, `${label}: stepping the first paint run advanced to ${v.cursor}, expected ${runEnd + 1} (one beat per run)`)
      const S = foldTo(EV, v.cursor, CTX)
      check(V.layers.LAY && V.layers.LAY.size === Object.keys(S.layers).length, `${label}: ${V.layers.LAY && V.layers.LAY.size} layer tiles for ${Object.keys(S.layers).length} painted hexes`)
      for (const [hex, layer] of Object.entries(S.layers).slice(0, 5)) check(V.layers.LAY.get(+hex) && V.layers.LAY.get(+hex).layer === layer, `${label}: hex ${hex} tile is not layer ${layer}`) }
    /* the hold: move.stopped floats HELD on the stop hex and cues the line to the holder; the mover stands on e.hex */
    { const S = createState(); let held = 0, zoc = 0
      for (const e of EV) for (const c of fold(S, e, CTX, 0)) { if (c.k === 'float' && c.kind === 'held' && c.hex === e.hex) held++; if (c.k === 'zoc' && c.t === e.by) zoc++ }
      const n = byType(EV, 'move.stopped').length
      check(held === n && zoc === n, `${label}: ${n} move.stopped, ${held} HELD floats, ${zoc} zoc cues`) }
    for (const [e, i] of byType(EV, 'move.stopped').slice(0, 2)) { const S = foldTo(EV, i + 1, CTX); check(S.U[e.actor].hex === e.hex, `${label}: after move.stopped unit ${e.actor} folds at ${S.U[e.actor].hex}, event says ${e.hex}`) }
    /* the attack of opportunity: labelled, and the attack that follows knows it is one */
    for (const [e, i] of byType(EV, 'aoo.provoked').slice(0, 3)) {
      const S = foldTo(EV, i, CTX); const cues = fold(S, e, CTX, 0)
      check(cues.some(c => c.k === 'float' && c.kind === 'aoo'), `${label}: aoo.provoked at ${i} cued no label`)
      const j = EV.findIndex((x, k) => k > i && x.type === 'attack.declared')
      /* folded by hand: foldTo() clears the lingering AOO, as it clears AIM */
      if (j > 0 && EV[j].actor === e.actor) { const S2 = createState(); for (let k = 0; k <= j; k++) fold(S2, EV[k], CTX, 0); check(S2.AIM && S2.AIM.aoo, `${label}: the attack after aoo.provoked at ${i} is not marked as one`) } }
    /* the Deathbed: the stand's float names the roll, the wound level lands on the unit, the blood shows, hp.reset restores the bar */
    for (const [e, i] of byType(EV, 'deathbed.stood').slice(0, 3)) {
      const S = foldTo(EV, i, CTX); const cues = fold(S, e, CTX, 0)
      check(cues.some(c => c.k === 'float' && c.kind === 'stood' && c.n === e.roll && c.of === 'roll'), `${label}: deathbed.stood at ${i} floats no roll`)
      check(S.U[e.target].wound === e.woundLevel, `${label}: after deathbed.stood unit ${e.target} carries wound ${S.U[e.target].wound}, event says ${e.woundLevel}`)
      const r = EV.findIndex((x, k) => k > i && x.type === 'hp.reset' && x.target === e.target)
      if (r > 0) { v.seek(r + 1); v.render(); const u = v.state.U[e.target], E = V.layers.UEL.get(e.target)
        check(u.hp === EV[r].hp && u.maxHp === EV[r].maxHp, `${label}: after hp.reset unit ${e.target} folds ${u.hp}/${u.maxHp}, event says ${EV[r].hp}/${EV[r].maxHp}`)
        check(E && E.blood.style.display !== 'none', `${label}: unit ${e.target} stood at the Deathbed but wears no blood`)
        check(E && (u.wound >= 2) === /badly/.test(E.blood.className), `${label}: unit ${e.target} at wound ${u.wound} has blood class "${E && E.blood.className}"`) } }
    { const S = foldTo(EV, bb + 1, CTX); for (const u of Object.values(S.U)) { const E = V.layers.UEL.get(u.id); v.seek(bb + 1); v.render(); if (E && u.wound === 0) check(E.blood.style.display === 'none', `${label}: unwounded unit ${u.id} bleeds`); break } }
    for (const [e, i] of byType(EV, 'deathbed.fell').slice(0, 2)) { const S = foldTo(EV, i, CTX); check(fold(S, e, CTX, 0).some(c => c.k === 'float' && c.kind === 'fell' && c.n === e.roll), `${label}: deathbed.fell at ${i} floats no roll`) }
    for (const [e, i] of byType(EV, 'bleedout.accelerated').slice(0, 2)) { const S = foldTo(EV, i + 1, CTX); check(S.U[e.target].bleed === e.bleedOut, `${label}: bleedout.accelerated left the counter at ${S.U[e.target].bleed}, event says ${e.bleedOut}`) }
    /* banners: a wave, the band, night, the objective — a node in the wrap that leaves */
    for (const t of ['encounter.wave', 'band.advanced', 'night.fell', 'encounter.lost', 'encounter.won']) {
      const hit = byType(EV, t)[0]; if (!hit) continue
      const [, i] = hit; if (i <= bb) continue                                  // seeded silently before battle.begin
      v.seek(i); v.step()
      const wrap = V.dom.stage.parentNode
      check(wrap.querySelector('.banner'), `${label}: no banner after ${t}`)
      win._flush(2000); check(!wrap.querySelector('.banner'), `${label}: the ${t} banner did not leave`) }
    /* Surge: the float, and the hero acts again with no activation.begin between */
    for (const [e, i] of byType(EV, 'surge.hit').slice(0, 2)) {
      const S = foldTo(EV, i, CTX); check(fold(S, e, CTX, 0).some(c => c.k === 'float' && c.kind === 'surge'), `${label}: surge.hit at ${i} cued no SURGE!`)
      const next = EV.slice(i + 1).find(x => x.type === 'activation.begin' || x.type === 'move.begin' || x.type === 'attack.declared')
      check(next && next.type !== 'activation.begin' && next.actor === e.actor, `${label}: after surge.hit at ${i} the next act is ${next && next.type} by ${next && next.actor}, expected the same hero (${e.actor})`) }
    /* Power: the chip prints the folded pool */
    for (const [e, i] of byType(EV, 'power.gained').slice(0, 1)) { v.seek(i + 1); v.render(); check(V.dom.powerchip.style.display !== 'none' && V.dom.powerchip.textContent === 'Power ' + e.after, `${label}: the Power chip reads "${V.dom.powerchip.textContent}", the pool is ${e.after}`) }
    /* the encounter chip carries the title from encounter.begin */
    { const enc = EV.find(e => e.type === 'encounter.begin'); v.seek(bb + 1); v.render()
      if (enc) check(V.dom.encchip.textContent === enc.name, `${label}: the encounter chip reads "${V.dom.encchip.textContent}", the encounter is "${enc.name}"`)
      else check(V.dom.encchip.style.display === 'none', `${label}: an encounter chip with no encounter`) }
    /* auras: tiles round every standing holder, from the engine's distance table; none once the holder falls */
    { const DIST = V.data.DIST, n = V.data.POS.length
      const holders = Object.values(Send.U).filter(u => ((LIB.static.units[u.typeId] || {}).auras || []).length)
      for (const h of holders.slice(0, 2)) {
        const enter = EV.findIndex(e => e.type === 'unit.enter' && e.actor === h.id)
        const at = Math.max(bb + 1, enter + 1); v.seek(at); v.render()
        const u = v.state.U[h.id]; const auras = LIB.static.units[u.typeId].auras
        const want = new Set(); for (const a of auras) for (let x = 0; x < n; x++) { const d = DIST[u.hex * n + x]; if (d > 0 && d <= a.radius) want.add(x + '|' + a.side) }
        const tiles = V.layers.AURA ? V.layers.AURA.size : 0
        check(tiles >= want.size, `${label}: ${h.name} at hex ${u.hex} should tint ${want.size} hexes, ${tiles} aura tiles drawn`)
        const dead = EV.findIndex(e => e.type === 'life.dead' && e.target === h.id)
        if (dead > 0 && holders.length === 1) { v.seek(dead + 1); v.render(); check((V.layers.AURA ? V.layers.AURA.size : 0) === 0, `${label}: ${h.name} is dead and still exerts an aura`) } } }
  }
}

if (fails.length) { console.error('FAIL\n  ' + fails.join('\n  ')); process.exit(1) }
console.log(`OK — ${LIB.battles.length} battles fold end to end · pure fold == pumped fold · icons ${uses.size} used · rows damaging=${damaging} plain=${plain}${CHECKS.size ? ' · checks: ' + [...CHECKS].join(', ') : ''}`)
