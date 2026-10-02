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
     · current HP/shields are shown without guessed future loss/death
     · the camera pans by inclusion, a manual pan holds, a peek restores
     · off-screen units get edge bubbles that account for every one of them; none during a peek
     · the emphasis ladder: CRIT! + kick + super impact fire together; injuries are queued plates, never floats
     · 2026-09-03 (engine/EVENTS-FOR-THE-VIEWER-2026-09-03.md): arrivals at any seq land as units and beats;
       the six outcome words; the kit (unit.equipped) reaches the action bar and the movement numeral;
       corpses and painted layers are board objects that come and go with their events, a paint run is one
       beat; the ZoC hold and the attack-of-opportunity label; the Deathbed stand's roll, wound level and
       blood; banners for waves, night, the band, the objective; Surge; the Power chip; auras round every
       standing holder and none round a fallen one
   Optional --check names add change-specific assertions.

     node tools/verify.mjs <page> --slice k/N [--facts out.json]      (the gate, 2026-09-23)

   One slice drives only its share of the library battles (tools/verify-slices.mjs
   assigns them) and slice 1 also runs every check that is not per battle. The
   library-wide checks that need every battle's facts are written to --facts and
   judged by the gate over all N slices (verify-slices.mjs mergedFails). With no
   --slice, everything runs here, exactly as before. */
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import fs from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {fixtureUnits} from './burst-fixture-data.mjs'
import { makeWindow } from './fakedom.mjs'
import { assignSlices, iconFails, frameFails } from './verify-slices.mjs'
// The readonly engine door is TypeScript in native Node as well as the browser bundle.
import {registerAtlasDependency} from './atlas-node.mjs'
// imported after the link above exists, so a worker's copy resolves it
const { register } = await import('../../engine/node_modules/tsx/dist/esm/api/index.mjs')
register()
registerAtlasDependency()

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = resolve(HERE, '..')
const [, , file, ...rest] = process.argv
if (!file) { console.error('usage: verify.mjs <BATTLE-VIEWER.html> [--check name] [--slice k/N [--facts out.json]]'); process.exit(2) }
const CHECKS = new Set(); let SLICE = null, FACTS = null
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--check') CHECKS.add(rest[++i])
  else if (rest[i] === '--facts') FACTS = rest[++i]
  else if (rest[i] === '--slice') { const sm = String(rest[++i]).match(/^(\d+)\/(\d+)$/)
    if (!sm || +sm[1] < 1 || +sm[1] > +sm[2]) { console.error('verify: --slice takes k/N with 1 <= k <= N'); process.exit(2) }
    SLICE = { k: +sm[1], n: +sm[2] } }
}
if (FACTS && !SLICE) { console.error('verify: --facts needs --slice'); process.exit(2) }
const html = fs.readFileSync(file, 'utf8')
const fails = []
const check = (ok, msg) => { if (!ok) fails.push(msg) }

/* ── the pure fold, imported directly ──────────────────────────────────── */
const { createState, fold, foldTo, FOLDED_TYPES } = await import(pathToFileURL(resolve(PKG, 'src/fold.js')).href)
const { DUR } = await import(pathToFileURL(resolve(PKG, 'src/viewer.js')).href)   // Law 9: if this cannot import, say so
const { orbitCamera } = await import(pathToFileURL(resolve(PKG, 'src/camera3d.js')).href)   // the camera's pose -> the camera (viewer.true-3d-camera)
const THREE = await import('three')
/* event types the viewer deliberately does nothing with — a NEW engine event
   is a failure until it is folded or listed here on purpose */
const IGNORED = new Set(['activation.selected', 'turn.end', 'activation.idle', 'trigger.rolled', 'phase.end.begin',
  'ai.tookHighGround', 'ai.denied', 'crit.branch'])   // knockback.blocked folded 2026-09-23 (R4 collisions)

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
/* the slice's share: its battles, and (slice 1 only) the checks that are not per battle */
const ASSIGN = SLICE ? assignSlices(LIB.battles, SLICE.n) : null
const mine = i => !SLICE || ASSIGN[i] === SLICE.k
const SINGLES = !SLICE || SLICE.k === 1
const driven = []
/* the fold context and the projection, hoisted: both are used by checks that
   run before the blocks that used to define them (TDZ, found 2026-09-04) */
const BURST_TESTS = JSON.parse(fs.readFileSync(resolve(PKG, 'tools/fixtures/bursts.json'), 'utf8'))
const CTX0 = { UD: LIB.static.units, SN: LIB.static.statuses }
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
  } catch (e) {
    /* Law 9: never swallow a failure. Only a MISSING path at HEAD is legitimate
       (the file is new); anything else — git absent, an unborn HEAD, a tarball,
       or the file being RENAMED — silently disabled the whole "may only shrink"
       rule until 2026-09-04 (REVIEW §D6). */
    const msg = String(e && e.message || e)
    if (/exists on disk, but not in|does not exist in|unknown revision|Not a valid object name|fatal: path/.test(msg))
      console.warn('exemptions: no committed copy of tools/exemptions.json at HEAD — the shrink rule is not enforced for this run')
    else fails.push(`exemptions: could not read the committed list, so the "may only shrink" rule did not run — ${msg.split('\n')[0]}`)
  }
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
  /* ONLY the pump's clock is stripped. AIM goes because the PUMP can expire it
     (expireAim, on V.clock()) where the pure fold cannot; FIRING and TRIGFLASH
     are lingering `until` stamps. ATTACK, AOO, subjectId and subjectMode were
     stripped until 2026-09-04 to silence a failure — which hid the scrub bug in
     REVIEW §A for a day. They are compared now, and they must stay compared. */
  const strip = S => JSON.stringify({ ...S, AIM: null, FIRING: null, TRIGFLASH: null })
  check(strip(S2) === strip(v.state), `${label}: the pure fold and the pumped viewer disagree on the final state`)
  /* ── SEEKING TO N MUST EQUAL STEPPING TO N (REVIEW §D3, added 2026-09-04) ──
     The pure-vs-pumped check above folds the same events in the same order
     through the same function, so it cannot see a bug in foldTo itself. This
     one can: it is what the scrub actually does. foldTo may differ ONLY in what
     the pump's clock stamped, so the comparison strips exactly what strip()
     does. 678 of 678 attacks failed this before the fix. */
  { const scrubStrip = S => JSON.stringify({ ...S, AIM: null, FIRING: null, TRIGFLASH: null })
    const sample = new Set()
    for (let i = 0; i < EV.length; i++) if (/^(burst\.|attack\.|aoo\.|deathbed\.|crit\.|badge\.)/.test(EV[i].type)) sample.add(i)
    for (let i = 0; i < EV.length; i += Math.max(1, Math.floor(EV.length / 40))) sample.add(i)
    const stepped = createState(); let at = 0, bad = 0, firstBad = null
    for (const i of [...sample].sort((a, b) => a - b)) {
      while (at < i) { fold(stepped, EV[at], CTX0, 0); at++ }
      const a = scrubStrip(foldTo(EV, i, CTX0)), b = scrubStrip(stepped)
      if (a !== b && bad++ === 0) firstBad = i
    }
    check(bad === 0, `${label}: seeking and stepping disagree at ${bad} of ${sample.size} sampled cursors (first at event ${firstBad}, ${firstBad != null && EV[firstBad] && EV[firstBad].type}) — foldTo may discard only what the pump's clock stamped`) }

  // A step after seeking must produce the same burst cue, not merely final HP.
  { const state = createState()
    for (let i=0;i<EV.length;i++) {
      const cues=fold(state,EV[i],CTX0,0)
      if (EV[i].type.startsWith('burst.')) {
        const sought=foldTo(EV,i,CTX0),after=fold(sought,EV[i],CTX0,0)
        check(JSON.stringify(cues)===JSON.stringify(after), `${label}: burst cue after seek differs at ${i}`)
        check(JSON.stringify(state.BURST)===JSON.stringify(sought.BURST), `${label}: durable burst facts after seek differ at ${i}`)
      }
    }
  }
  /* every type folded or ignored; float numbers verbatim from their event */
  const types = new Set(EV.map(e => e.type))
  for (const t of types) check(FOLDED_TYPES.includes(t) || IGNORED.has(t), `${label}: event type ${t} is neither folded nor on the ignore list`)
  { const S = createState(); for (const e of EV) { const cues = fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)
      for (const c of cues) {
        if (c.k === 'float') {
          /* the cue names the field its number came from; the number in the text must be that field, verbatim */
          const n = c.text.match(/\d+/)
          if (n) {
            // Packet cues name an exact nested fact. Preserve the scalar check;
            // never accept an unrelated equal number elsewhere in the event.
            const source = c.packetIndex == null ? e : (Number.isInteger(c.packetIndex) && c.packetIndex >= 0 ? e.packets?.[c.packetIndex] : undefined)
            check(c.of != null && source?.[c.of] === c.n && +n[0] === Math.abs(c.n), `${label}: float "${c.text}" — n=${c.n} packet=${c.packetIndex} of=${c.of}, source=${source?.[c.of]} (${e.type})`)
          }
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
  /* NO RAW ENGINE ID WHERE A NAME BELONGS (Angela 2026-09-04: "Badge grant
     should not be labeled 'badge grant.' It should be labeled what the badge
     grant is"). Seven of the eleven trigger effect kinds fell through to their
     dotted id. A `data-act` attribute and a tooltip may carry an id; visible
     TEXT may not. */
  { const text = surfaces.replace(/<[^>]*>/g, ' ')
    for (const bad of ['badge.grant', 'corpse.consume', 'corpse.raise', 'layer.paint', 'power.gain', 'stamina.drain', 'status.apply'])
      check(!text.includes(bad), `${label}: "${bad}" is printed as visible text — name the effect, not its engine id`) }
  return v
}
for (let i = 0; i < LIB.battles.length; i++) {
  if (!mine(i)) continue
  const b = LIB.battles[i]
  if (i > 0) load(i)
  drive(b.label, b.battle); driven.push(i)
}
// These are TEST imports, never entries in the library picker. Their exact
// engine-generated logs cover shielding/save/zero cases the showcase may not.
const playbackTests=[...BURST_TESTS.cases,...BURST_TESTS.support]
if (SINGLES) for (const c of playbackTests) {
  const battle={events:c.events,seed:{mapId:c.options.map.id},outcome:null,turns:0,engineCommit:BURST_TESTS.engineCommit}
  const units=LIB.static.units,actions=LIB.static.actions
  LIB.static.units=fixtureUnits(units,c.action);LIB.static.actions={...actions,[c.action.id]:c.action}
  try {
    H.playExport(battle,'Burst playback TEST: '+c.name);sizeWrap()
    drive('Burst playback TEST: '+c.name,battle,true)
  } finally { LIB.static.units=units;LIB.static.actions=actions }
}
for (const u of uses) check(spriteIds.has(u), `icons: <use> names ${u}, sprite lacks it`)
/* library-wide: judged here when whole, by the gate over every slice's facts when sliced */
const iconFacts = { uses: [...uses], damaging, plain }
if (!SLICE) fails.push(...iconFails(iconFacts))
if (SINGLES) {
check(DUR, 'viewer.js no longer exports DUR — the pump/DUR cross-check did not run')
for (const t of Object.keys(DUR || {})) check(FOLDED_TYPES.includes(t) || IGNORED.has(t), `pump: DUR names ${t}, which no log folds`)
}
/* THE OTHER DIRECTION (REVIEW §B, added 2026-09-04): the completeness check
   above proves every event seen is folded; this proves every fold ARM has an
   example. An arm no log exercises is written from the engine's emit site and
   untested — list it on purpose, the way IGNORED is a deliberate list. */
if (SINGLES) {
  const seen = new Set()
  for (const b of LIB.battles) for (const e of b.battle.events) seen.add(e.type)
  for (const c of playbackTests) for (const e of c.events) seen.add(e.type)
  /* known-unexercised, each waiting on a showcase that fields it (ENGINE-FINDINGS #10) */
  // badge.held (2026-09-23): the engine still emits it (mutate.ts, a badge already worn), but the
  // library re-exported at 7ad7516 no longer grants any unit a badge twice
  // badge.held left 2026-09-23: showcase.rime-s1 carries one at engine 4688026
  // loadout.swapped (2026-09-24, V2 R6): a swap is a HUMAN command and the AI never swaps (engine
  // SWITCHES swapAi, ruled 2026-09-24), so an exported AI battle cannot carry one; the engine's own
  // log of a human swap is tools/fixtures/loadout-swap.json, driven by tools/loadout-swap.test.mjs
  // prop.struck (2026-09-24, V2 R7): an attack aimed at a prop's hex is a HUMAN command and the AI
  // never aims at props (engine SWITCHES propAttackAi); the engine's own log of three blows is
  // tools/fixtures/prop-strike.json, driven by tools/prop-destroy.test.mjs. prop.damaged and
  // prop.destroyed are carried by the library's test.prop-destroy.
  const UNEXERCISED = new Set(['encounter.roll', 'encounter.won', 'unit.obliterated', 'layer.cancelled', 'loadout.swapped', 'prop.struck'])
  const dark = FOLDED_TYPES.filter(t => !seen.has(t))
  for (const t of dark) check(UNEXERCISED.has(t), `fold: ${t} is folded but no library battle carries one — add it to UNEXERCISED on purpose or field a showcase that exercises it`)
  for (const t of UNEXERCISED) check(!seen.has(t), `fold: ${t} is listed UNEXERCISED but the library now carries one — delete the entry, the list only shrinks`)
}

/* ── PRONE AND STANDING (v2.prone, added 2026-09-23) ──────────────────────
   The engine states the going-down (unit.proned) and the getting-up
   (unit.stood). A library battle must carry both; the pure fold marks the unit
   prone between them and not after; the token wears the prone presentation
   while prone and drops it after; and neither event moves a single HP. */
if (SINGLES) {
  /* 2026-09-23 (R4): real content now knocks units prone (KDB), and the first
     prone unit of a battle may die lying down (Supper s5, unit 7). The check
     takes the first unit.proned in the library whose unit later stands — the
     pair it always meant — and still fails when no such pair exists. */
  const standsLater = (EV, i) => EV.some((e, j) => j > i && e.type === 'unit.stood' && e.actor === EV[i].target)
  const bi = LIB.battles.findIndex(b => b.battle.events.some((e, i, EV) => e.type === 'unit.proned' && standsLater(EV, i)))
  if (bi < 0) fails.push('prone: no library battle carries a unit.proned whose unit later stands (unit.stood)')
  else {
    const label = LIB.battles[bi].label, EV = LIB.battles[bi].battle.events
    const down = EV.findIndex((e, i) => e.type === 'unit.proned' && standsLater(EV, i))
    const who = EV[down].target
    const up = EV.findIndex((e, i) => i > down && e.type === 'unit.stood' && e.actor === who)
    if (up < 0) fails.push(`prone: ${label} — unit ${who} goes prone at ${down} and never stands`)
    else {
      const hpOf = S => JSON.stringify(Object.values(S.U).map(u => [u.id, u.hp, u.maxHp]))
      for (let i = 0; i < EV.length; i++) if (EV[i].type === 'unit.proned' || EV[i].type === 'unit.stood') {
        const S = foldTo(EV, i, CTX0), before = hpOf(S), cues = fold(S, EV[i], CTX0, 0)
        check(hpOf(S) === before, `prone: ${label} — ${EV[i].type} at ${i} changed HP (neither event carries any)`)
        check(cues.every(c => c.n == null), `prone: ${label} — ${EV[i].type} at ${i} floats a number no event stated`)
      }
      const at = n => foldTo(EV, n, CTX0).U[who]
      check(at(down + 1)?.prone?.includes(EV[down].statusId), `prone: ${label} — after unit.proned (${down}) the fold does not mark unit ${who} prone with ${EV[down].statusId}`)
      check(at(up)?.prone?.length > 0, `prone: ${label} — unit ${who} is not prone just before unit.stood (${up})`)
      check(at(up + 1)?.prone == null, `prone: ${label} — unit ${who} is still prone after unit.stood (${up})`)
      load(bi); const v = H.viewer; v.pause()
      const tok = n => { v.seek(n); v.render(); return v._V.layers.UEL.get(who) }
      { const E = tok(down + 1)
        check(E && E.root.classList.contains('tokProne') && /rotate\(-62deg\)/.test(E.img.style.transform), `prone: ${label} — unit ${who}'s token does not read as prone after unit.proned (class ${E && E.root.className}, img ${E && E.img.style.transform})`) }
      { const E = tok(up + 1)
        check(E && !E.root.classList.contains('tokProne') && !/rotate\(/.test(E.img.style.transform), `prone: ${label} — unit ${who}'s token still reads as prone after unit.stood (class ${E && E.root.className}, img ${E && E.img.style.transform})`) }
    }
  }
}

/* ── KDB AND KNOCKBACK COLLISIONS (V2 R4, added 2026-09-23) ──────────────
   The engine states each KDB check (kdb.rolled: margin, chance, roll, fired,
   kdbType, applied), each collision (knocked / knockback.blocked name what was
   struck; the cost is a damage.applied with collision: true) and a consumed
   death (life.dead reason 'consumed', corpse: false). The library must carry a
   fired and an unfired check, a collision's damage and a consumed death; the
   fold moves no HP on kdb.rolled / knocked / knockback.blocked / life.dead,
   sets the collision's HP to the event's hpAfter and touches no other unit, and
   every number a cue floats is its event's field; a consumed body leaves no
   corpse in the fold or on the board, and its token is gone. */
if (SINGLES) {
  const all = LIB.battles.map((b, bi) => ({ bi, label: b.label, EV: b.battle.events }))
  const find = pred => { for (const b of all) { const i = b.EV.findIndex(pred); if (i >= 0) return { ...b, i } } return null }
  const fired = find(e => e.type === 'kdb.rolled' && e.fired === true)
  const unfired = find(e => e.type === 'kdb.rolled' && e.fired === false)
  const hit = find(e => e.type === 'damage.applied' && e.collision === true)
  const eaten = find(e => e.type === 'life.dead' && e.reason === 'consumed')
  if (!fired) fails.push('kdb: no library battle carries a kdb.rolled that fired')
  if (!unfired) fails.push('kdb: no library battle carries a kdb.rolled that did not fire')
  if (!hit) fails.push('collision: no library battle carries a damage.applied with collision: true')
  if (!eaten) fails.push('collision: no library battle carries a consumed death (life.dead reason consumed)')
  const hpOf = S => JSON.stringify(Object.values(S.U).map(u => [u.id, u.hp, u.maxHp]))
  const quiet = new Set(['kdb.rolled', 'knocked', 'knockback.blocked', 'life.dead'])
  for (const b of all) {
    const idx = b.EV.map((e, i) => (quiet.has(e.type) && (e.type !== 'life.dead' || e.reason === 'consumed')) || (e.type === 'damage.applied' && e.collision === true) ? i : -1).filter(i => i >= 0)
    if (!idx.length) continue
    const S = createState(); let at = 0
    for (const i of idx) {
      while (at < i) fold(S, b.EV[at++], CTX0, 0)
      const e = b.EV[i], before = JSON.parse(hpOf(S)), cues = fold(S, e, CTX0, 0); at++
      const after = JSON.parse(hpOf(S))
      if (e.type === 'damage.applied') {
        check(S.U[e.target]?.hp === e.hpAfter, `collision: ${b.label} — damage.applied at ${i} leaves unit ${e.target} at ${S.U[e.target]?.hp}, the event says hpAfter ${e.hpAfter}`)
        check(JSON.stringify(after.filter(r => r[0] !== e.target)) === JSON.stringify(before.filter(r => r[0] !== e.target)), `collision: ${b.label} — damage.applied at ${i} moved another unit's HP`)
        check(cues.some(c => c.k === 'float' && c.kind === 'damage' && c.of === 'amount' && c.n === e.amount), `collision: ${b.label} — damage.applied at ${i} floats no ${e.amount}`)
      } else check(JSON.stringify(after) === JSON.stringify(before), `kdb: ${b.label} — ${e.type} at ${i} changed HP (the event carries none)`)
      for (const c of cues) if (c.n != null) check(c.of != null && e[c.of] === c.n, `kdb: ${b.label} — ${e.type} at ${i} floats ${c.n}, the event's ${c.of} is ${e[c.of]}`)
      if (e.type === 'kdb.rolled') check(cues.filter(c => c.k === 'float').length === (e.fired ? 1 : 0), `kdb: ${b.label} — kdb.rolled at ${i} (fired ${e.fired}) floats ${cues.filter(c => c.k === 'float').length} words`)
      if ((e.type === 'knocked' || e.type === 'knockback.blocked') && e.collidedWith) check(cues.some(c => c.k === 'float' && c.kind === 'collision' && c.of === 'collisionValue'), `collision: ${b.label} — ${e.type} at ${i} struck ${e.collidedWith} and the mover wears no collision cue`)
    }
  }
  if (eaten) {
    const e = eaten.EV[eaten.i], who = e.target
    const Sf = foldTo(eaten.EV, eaten.EV.length, CTX0)
    check(!Object.values(Sf.corpses).some(c => c.of === who), `consumed: ${eaten.label} — unit ${who} was consumed (${e.by}) and the fold holds a corpse for it`)
    load(eaten.bi); const v = H.viewer; v.pause(); const V = v._V
    v.seek(eaten.i + 1); v.render()
    const E = V.layers.UEL.get(who)
    check(E && E.root.style.display === 'none', `consumed: ${eaten.label} — unit ${who}'s token still draws after it was consumed`)
    check([...(V.layers.CORPSE?.keys() || [])].every(id => v.state.corpses[id]?.of !== who) && (V.layers.CORPSE?.size || 0) === Object.keys(v.state.corpses).length, `consumed: ${eaten.label} — the board draws a corpse for consumed unit ${who}`)
    v.seek(eaten.EV.length); v.render()
    check(!Object.values(v.state.corpses).some(c => c.of === who), `consumed: ${eaten.label} — a corpse for consumed unit ${who} at the end of the battle`)
  }
}

/* ── THORNS (V2 R5, added 2026-09-24) ─────────────────────────────────────
   Thorns is a magnitude (COMBAT-V2-DESIGN §9.4). On each connecting melee hit
   on a thorned unit the engine states thorns.reflected {actor: the thorned
   unit, target: the attacker, attackId, thorns, amount} and then a
   damage.applied on the attacker with thorns: true. The library must carry
   one; the fold moves no HP on thorns.reflected and floats exactly one word,
   THORNS <thorns>, over the ATTACKER's hex (never the thorned unit's); the
   damage.applied with thorns: true that follows (same attacker, same attackId)
   sets the attacker's HP to its hpAfter, touches no other unit, and — in at
   least one library instance — lowers it. */
if (SINGLES) {
  const hpOf = S => Object.values(S.U).map(u => [u.id, u.hp, u.maxHp])
  let seenThorns = 0, lowered = 0
  for (const b of LIB.battles) {
    const EV = b.battle.events
    if (!EV.some(e => e.type === 'thorns.reflected')) continue
    const S = createState(); let at = 0
    for (let i = 0; i < EV.length; i++) {
      if (EV[i].type !== 'thorns.reflected') continue
      const e = EV[i]; seenThorns++
      while (at < i) fold(S, EV[at++], CTX0, 0)
      const attacker = S.U[e.target], thorned = S.U[e.actor]
      check(attacker && thorned, `thorns: ${b.label} — thorns.reflected at ${i} names a unit the fold does not hold (actor ${e.actor}, target ${e.target})`)
      const before = JSON.stringify(hpOf(S)), cues = fold(S, e, CTX0, 0); at++
      check(JSON.stringify(hpOf(S)) === before, `thorns: ${b.label} — thorns.reflected at ${i} changed HP (the damage.applied that follows carries it)`)
      const words = cues.filter(c => c.k === 'float')
      check(words.length === 1 && words[0].kind === 'thorns' && words[0].text === 'THORNS ' + e.thorns && words[0].hex === attacker?.hex,
        `thorns: ${b.label} — thorns.reflected at ${i} floats ${JSON.stringify(words.map(c => [c.kind, c.text, c.hex]))}, want one THORNS ${e.thorns} over the attacker (unit ${e.target}, hex ${attacker?.hex})`)
      const j = EV.findIndex((d, k) => k > i && d.type === 'damage.applied' && d.thorns === true && d.target === e.target && d.attackId === e.attackId)
      check(j > i, `thorns: ${b.label} — thorns.reflected at ${i} is followed by no damage.applied with thorns: true on the attacker`)
      if (j <= i) continue
      while (at < j) fold(S, EV[at++], CTX0, 0)
      const d = EV[j], hp0 = S.U[d.target]?.hp, rows0 = hpOf(S).filter(r => r[0] !== d.target)
      fold(S, d, CTX0, 0); at++
      const hp1 = S.U[d.target]?.hp
      check(hp1 === d.hpAfter, `thorns: ${b.label} — the thorns damage.applied at ${j} leaves unit ${d.target} at ${hp1}, the event says hpAfter ${d.hpAfter}`)
      check(JSON.stringify(hpOf(S).filter(r => r[0] !== d.target)) === JSON.stringify(rows0), `thorns: ${b.label} — the thorns damage.applied at ${j} moved another unit's HP`)
      if (d.amount > 0) check(hp1 < hp0, `thorns: ${b.label} — the thorns damage.applied at ${j} (amount ${d.amount}) did not lower unit ${d.target}'s HP (${hp0} → ${hp1})`)
      if (hp1 < hp0) lowered++
    }
  }
  if (!seenThorns) fails.push('thorns: no library battle carries a thorns.reflected')
  else if (!lowered) fails.push('thorns: no library thorns.reflected is followed by a damage.applied that lowers the attacker\'s HP')
}

/* ── one traversal per move (VISUAL-BATTLE-UPDATES §1.1) ───────────────── */
if (SINGLES) {
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
    /* Law 10 (viewer.walk-in-step, 2026-10-01): was Math.min(900, Math.max(320, 200 + 85 * hexes)). Andrew (engine DECISIONS.md
       2026-10-01): "The walking isn't very well timed or spaced based on the number of tiles that are being moved" — the
       rule kept is the pump's: the traversal is DUR.moved per hex, so it grows with the walk */
    const want = DUR.moved * EV[i].hexes
    check(a && a.kf.length === EV[i].hexes + 1, `traversal: expected ${EV[i].hexes + 1} waypoints, got ${a && a.kf.length}`)
    check(a && a.opts.duration === want && a.opts.easing === 'cubic-bezier(.35,0,.2,1)', `traversal: duration/easing ${a && a.opts.duration}/${a && a.opts.easing}, expected ${want}/cubic-bezier(.35,0,.2,1)`)
    const bob = E && E.img.animations && E.img.animations[E.img.animations.length - 1]
    check(bob && bob.opts.iterations === EV[i].hexes, `traversal: the bob should cycle once per hex (${EV[i].hexes}), got ${bob && bob.opts.iterations}`)
  }
}

/* ── hitstop (VISUAL-BATTLE-UPDATES §1.2): 70 hit · 110 kill · 140 crit ── */
if (SINGLES) {
  const seen = new Set(); const S = createState()
  for (const b of LIB.battles) { const S = createState()
    for (const e of b.battle.events) for (const c of fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)) if (c.k === 'hitstop') seen.add(c.ms) }
  for (const ms of [70, 110, 140]) check(seen.has(ms), `hitstop: no ${ms}ms beat in any library battle`)
  for (const ms of seen) check([70, 110, 140].includes(ms), `hitstop: unruled duration ${ms}`)
}

/* V2: current HP/shields only. No engine forecast is present in these logs. */
let statusFrames = 0
{
  for (let bi = 0; bi < LIB.battles.length; bi++) {
    if (!mine(bi)) continue
    load(bi); const v = H.viewer; v.pause()
    while (v.cursor < v.events.length) {
      const before = v.cursor; v.step(); if (v.cursor === before) break
      if (!['status.applied', 'damage.applied'].includes(v.events[v.cursor - 1].type)) continue
      for (const u of Object.values(v.state.U)) {
        if (u.life !== 'standing') continue
        const E = v._V.layers.UEL.get(u.id); if (!E) continue
        if (Object.values(u.st).some(n => n > 0)) statusFrames++
        check(E.proj === undefined && E.skull === undefined, 'renderer invented a future HP/death forecast')
        check(E.hpfill.style.height === Math.round(100 * Math.max(0, u.hp / u.maxHp)) + '%', 'HP bar must draw observed HP only')
        const pool = LIB.static.absorbingStatuses.reduce((n, id) => n + (u.st[id] || 0), 0)
        check((E.prot.style.display !== 'none') === (pool > 0), 'current shield counter missing or invented')
      }
    }
  }
  if (!SLICE) fails.push(...frameFails({ statusFrames }))
}

/* ── the camera (PLAYBACK-DESIGN §7.8): inclusion, not centring; pan holds; peek restores ── */
if (SINGLES) {
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
  /* viewer.true-3d-camera: the zoom is the one camera's pose (V.camTarget), not a scale() in the stage's CSS — these read
     scale(0.x) and scale(1.0000) in the transform; rewritten as the pose's zoom */
  v.peek(true); check(V.camTarget && V.camTarget.zoom < 1, 'camera: peek did not scale the board to fit')
  check(V.view.camF.x === panned.x && V.view.camF.y === panned.y, 'camera: peek moved the remembered camera')
  v.peek(false); check(V.camTarget && V.camTarget.zoom === 1, 'camera: releasing peek did not return to 1x')
}

/* ── a standee at the top of the board is shown whole (ruled 2026-09-03) ──── */
if (SINGLES) {
  load(LIB.battles.findIndex(b=>b.battle.seed.mapId==='test.map.horde-24')); const v = H.viewer; v.pause(); const V = v._V
  const POS = V.data.POS, sq = Math.cos(V.data.LAYOUT.tilt * Math.PI / 180), halfH = DESIGN.H / 2 / sq, TOP = 200 / sq
  const EV = v.events
  /* the first activation of a unit standing in row 0 or 1 */
  let ai = -1, actor = null
  for (let i = 0; i < EV.length; i++) if (EV[i].type === 'activation.begin') {
    const St = foldTo(EV, i + 1, { UD: LIB.static.units, SN: LIB.static.statuses }); const u = St.U[EV[i].actor]
    if (u && POS[u.hex].r <= 1) { ai = i; actor = u; break } }
  check(ai >= 0, 'camera-top: no activation of a top-row unit in the retained horde fixture to test with')
  if (ai >= 0) {
    v.seek(ai + 1); v.render()
    const head = POS[actor.hex].py - TOP, camTop = V.view.camF.y - halfH
    check(head >= camTop - 1, `camera-top: the acting unit's head (board-y ${head.toFixed(0)}) is above the viewport's top edge (${camTop.toFixed(0)}) — cut off`)
  }
}

/* ── off-screen indicators (PLAYBACK-DESIGN §7.8 part 1) ───────────────── */
if (SINGLES) {
  load(0); const v = H.viewer; v.pause(); const V = v._V
  for (let i = 0; i < 40 && v.cursor < v.events.length; i++) v.step()      // units spread out a little
  v.render()
  /* pan to a corner: with board space larger than the view, someone must be off-screen */
  v.pan(-4000, -4000)
  const bubs = V.layers.edgeL ? V.layers.edgeL.querySelectorAll('.edgeBub') : []
  /* viewer.true-3d-camera: off-screen is where the perspective camera draws the unit — its hex outside the window (a
     token's width in from the sides and the foot, its 200 px standee inside the top) — counted here with Three's own
     projection; it was a rectangle of the board about camF (no perspective, no turn), rewritten as that rule */
  const POS = V.data.POS, T = V.camTarget, s = T.zoom, inv = V.data.boardAffine.clone().invert()
  const cam = orbitCamera(V.data.boardAffine, T, { w: DESIGN.W, h: DESIGN.H })
  /* viewer.tactical-camera (2026-10-01; Andrew: "the pointed indicators … are pointing at things that are on-map"):
     off-screen is now when NO part of the figure is in view — its feet and its head (its body's height) as the camera
     draws them, half a token's width either side (viewer SWITCHES edgeBubbleInside). The rule counted before (the hex in
     from the sides and the foot, a 200 px standee wholly inside the top) flagged heroes standing in view; rewritten as
     the ruled rule, the same projection. */
  const shown = (u, z) => { const w = new THREE.Vector3(POS[u.hex].px, POS[u.hex].py, z).applyMatrix4(inv)
    const ahead = w.clone().applyMatrix4(cam.matrixWorldInverse).z < 0, n = w.project(cam); return { ahead, x: (n.x + 1) / 2 * DESIGN.W, y: (1 - n.y) / 2 * DESIGN.H } }
  const offCount = Object.values(v.state.U).filter(u => {
    if (u.life === 'dead') return false
    const z = V.data.displayHeights?.[u.hex] || 0, E = V.layers.UEL.get(u.id), tall = (E && E.pick && E.pick.h) || 200
    const q = shown(u, z), h = shown(u, z + tall), half = 24 * s
    return !(q.ahead && h.ahead && Math.max(q.x, h.x) >= -half && Math.min(q.x, h.x) <= DESIGN.W + half && Math.max(q.y, h.y) >= 0 && Math.min(q.y, h.y) <= DESIGN.H) }).length
  check(offCount > 0, 'edges: panning to a corner left nobody off-screen — the test cannot bite')
  check(bubs.length > 0 && bubs.length <= offCount, `edges: ${bubs.length} bubbles for ${offCount} off-screen units`)
  const counted = bubs.reduce((n, b) => n + (b.querySelector('.edgeN') ? +b.querySelector('.edgeN').textContent : 1), 0)
  check(counted === offCount, `edges: bubbles account for ${counted} units, ${offCount} are off-screen`)
  check(bubs.some(b => b.querySelector('.edgeDg')), 'edges: no enemy bubble carries a danger numeral')
  v.peek(true); check((V.layers.edgeL.querySelectorAll('.edgeBub')).length === 0, 'edges: bubbles shown during peek, when nothing is off-screen'); v.peek(false)
}

/* ── the emphasis ladder (VISUAL-BATTLE-UPDATES §1.3, ruled 2026-09-02) ─── */
if (SINGLES) {
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
  // Ordered packets have one numeral per final HP packet, not one per hit.
  // Keep exact cardinality and event ownership rather than relaxing the limit.
  const expectedNumerals=LIB.battles.flatMap(b=>b.battle.events).filter(e=>e.type==='damage.applied'&&e.attackId&&e.crit===true).reduce((n,e)=>n+(e.packets?e.packets.length:1),0)
  check(critNumeral > 0 && critNumeral === expectedNumerals, `ladder: ${critNumeral} crit numerals, expected ${expectedNumerals} from actual critical damage packets`)
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
if (SINGLES) {
  /* THE PAIR: a source battle and a map NO library battle plays, on the SAME
     board — a hex id means nothing on another board (§10). Choosing battle 0
     unconditionally meant the decoy search always failed and the drop silently
     replayed its own map, so the cross-map path never ran (REVIEW §B5). */
  const unplayed = (LIB.static.maps || []).filter(m => !LIB.battles.some(b => b.battle.seed.mapId === m) && LIB.fields[m])
  let src = null, mapId = null
  for (const b of LIB.battles.filter(b=>!b.battle.atlasScene && LIB.fields[b.battle.seed.mapId])) { const f = LIB.fields[b.battle.seed.mapId]
    const d = unplayed.find(m => LIB.fields[m].width === f.width && LIB.fields[m].height === f.height)
    if (d) { src = b.battle; mapId = d; break } }
  check(src, `file-drop: no library battle shares a board with any unplayed map (${unplayed.length} unplayed) — the cross-map drop path cannot be tested`)
  if (!src) { src = LIB.battles[0].battle; mapId = src.seed.mapId }
  const noArt = Object.keys(LIB.static.units).find(t => !LIB.art.artmap[t])
  const events = JSON.parse(JSON.stringify(src.events)).map(e => { if (e.type === 'map.loaded') { e.mapId = mapId; e.causeId = mapId } return e })
  if (noArt) { const first = events.find(e => e.type === 'unit.enter'); first.typeId = noArt }
  const synthetic = { seed: { ...src.seed, mapId, replicate: 99 }, engineCommit: src.engineCommit, outcome: src.outcome, turns: src.turns, events }
  const file = { name: 'synthetic-drop.json', text: async () => JSON.stringify(synthetic) }
  let dropped = false
  /* the pre-drop events array, by IDENTITY: `synthetic` is a deep copy of the
     already-loaded battle, so comparing lengths or the field proved nothing —
     the check passed whether or not the listener ran (REVIEW §B4) */
  const beforeDrop = H.viewer && H.viewer.events
  try {
    win.document.dispatch('drop', { preventDefault() {}, dataTransfer: { files: [file] } })
    await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r))     // the file's text() resolves
    dropped = !!(H.viewer && H.viewer.events !== beforeDrop && H.viewer.events.length === events.length && JSON.stringify(H.viewer._V.data.F) === JSON.stringify(LIB.fields[mapId]))
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
if (SINGLES) {
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

/* ── the board is the map's (engine 5603c40, §10): a non-square board and a west deploy in the library, laid out from the field and the log, never from a constant ── */
if (SINGLES) {
  const odd = LIB.battles.map((b, i) => [b, i]).filter(([b]) => { const ml = b.battle.events.find(e => e.type === 'map.loaded'); return ml && ml.width !== ml.height })
  check(odd.length > 0, 'board: no non-square battle in the library — the 16×16 assumption cannot be tested')
  const west = LIB.battles.map((b, i) => [b, i]).filter(([b]) => { const ml = b.battle.events.find(e => e.type === 'map.loaded'); return ml && ml.deploy && ml.deploy.hero === 'west' })
  check(west.length > 0, 'board: no battle with heroes deploying west in the library')
  /* 2026-09-23 (R4): a scenario that fields units at NAMED hexes (seed heroHexes /
     enemyHexes — test.knockback-well puts its zombies beside the golem mid-board)
     makes no deploy-edge claim, so it is not drawn into this edge sample; the
     sample stays the battles it was (dungeon-16x8 and horde-24 before the R4 adds). */
  const edgeDeployed = ([b]) => !b.battle.atlasSetup && !(b.battle.seed && (b.battle.seed.heroHexes || b.battle.seed.enemyHexes))
  for (const [b, i] of [...odd.filter(([b])=>b.battle.atlasSetup).slice(0,2),...[...odd,...west].filter(edgeDeployed).slice(0,2)]) {
    load(i); const v = H.viewer; v.pause(); const V = v._V, EV = v.events
    const ml = EV.find(e => e.type === 'map.loaded')
    check(V.data.BOARD.width === ml.width && V.data.BOARD.height === ml.height, `${b.label}: the field says ${V.data.BOARD.width}×${V.data.BOARD.height}, map.loaded says ${ml.width}×${ml.height}`)
    check(V.data.POS.length === ml.width * ml.height, `${b.label}: ${V.data.POS.length} hex positions for a ${ml.width}×${ml.height} board`)
    check(typeof V.data.distance === 'function', `${b.label}: the engine distance accessor is missing`)
    check(V.data.distance(0,0) === 0 && V.data.distance(0,ml.width-1) === ml.width-1, `${b.label}: distance accessor is not bound to this board`)
    check(v.state.board && v.state.board.deploy && v.state.board.deploy.hero === ml.deploy.hero, `${b.label}: the fold did not keep map.loaded's deploy`)
    /* every unit stands on a hex the board has, and the heroes start on their edge */
    const bb = EV.findIndex(e => e.type === 'battle.begin'); const S0 = foldTo(EV, bb + 1, CTX0)
    for (const u of Object.values(S0.U)) { check(u.hex >= 0 && u.hex < V.data.POS.length, `${b.label}: ${u.name} at hex ${u.hex} is off a ${ml.width}×${ml.height} board`)
      const p = V.data.POS[u.hex]; if (!p) continue
      if(b.battle.atlasSetup){const slots=u.side==='hero'?b.battle.atlasSetup.heroHexes:b.battle.atlasSetup.enemyHexes;check(slots.includes(u.hex),`${b.label}: initial unit is outside authored deployment slots`);check(V.data.F.floor[u.hex],`${b.label}: initial unit has no authored floor`)}
      if (!b.battle.atlasSetup && ml.deploy.hero === 'west' && u.side === 'hero') check(p.c === 0, `${b.label}: hero ${u.name} deploys at column ${p.c}, the map says west`)
      if (!b.battle.atlasSetup && ml.deploy.enemy === 'east' && u.side === 'enemy') check(p.c === ml.width - 1, `${b.label}: enemy ${u.name} deploys at column ${p.c}, the map says east`) }
    v.render(); for (let k = 0; k < 30 && v.cursor < EV.length; k++) v.step()
  }
}

/* ── the lift (Angela 2026-09-03: the dwarf with no legs): every standing or downed token image sits in front of the ground plane, and keeps it through its animations ── */
if (SINGLES) {
  load(0); const v = H.viewer; v.pause(); v.render(); const V = v._V
  let n = 0
  for (const u of Object.values(v.state.U)) { if (u.life === 'dead') continue; const E = V.layers.UEL.get(u.id); if (!E) continue; n++
    check(/translateZ\(2px\)/.test(E.img.style.transform), `lift: ${u.name}'s token image is not lifted off the ground plane (${E.img.style.transform || 'no transform'})`) }
  check(n > 0, 'lift: no tokens to check')
  const EV = v.events, i = EV.findIndex(e => e.type === 'move.begin' && e.hexes > 1)
  if (i >= 0) { v.seek(i); v.step(); const E = V.layers.UEL.get(EV[i].actor); const bob = E && E.img.animations && E.img.animations[E.img.animations.length - 1]
    check(bob && bob.kf.every(k => /translateZ\(2px\)/.test(k.transform)), 'lift: the walk-bob drops the lift — the legs would vanish for the walk') }
}

/* ── the footprint follows the stature (Angela 2026-09-03: the dwarf's elevation) ── */
if (SINGLES) {
  load(0); const v = H.viewer; v.pause(); v.render(); const V = v._V
  const rings = []
  for (const u of Object.values(v.state.U)) { if (u.life !== 'standing') continue
    const E = V.layers.UEL.get(u.id); const a = LIB.art.artmap[u.typeId] || LIB.art.artmap._pending
    rings.push({ h: a.height || 1.55, ring: parseFloat(E.fring.style.width), shadow: parseFloat(E.shadow.style.width) }) }
  const tall = rings.find(r => r.h >= 1.5), short = rings.find(r => r.h <= 1.0)
  if (!short) { for (let i = 1; i < LIB.battles.length && !rings.some(r => r.h <= 1.0); i++) { load(i); H.viewer.pause(); H.viewer.render()
    for (const u of Object.values(H.viewer.state.U)) { const a = LIB.art.artmap[u.typeId] || LIB.art.artmap._pending; const E = H.viewer._V.layers.UEL.get(u.id); if (u.life === 'standing' && E) rings.push({ h: a.height || 1.55, ring: parseFloat(E.fring.style.width), shadow: parseFloat(E.shadow.style.width) }) } } }
  const t2 = rings.find(r => r.h >= 1.5), s2 = rings.find(r => r.h <= 1.0)
  check(t2 && s2, 'footprint: no short and tall standing units in the library to compare')
  if (t2 && s2) { check(s2.ring < t2.ring && s2.shadow < t2.shadow, `footprint: a ${s2.h}-high unit's ring/shadow (${s2.ring}/${s2.shadow}) is not smaller than a ${t2.h}-high unit's (${t2.ring}/${t2.shadow})`)
    check(Math.abs(s2.ring / t2.ring - Math.max(0.55, s2.h / t2.h)) < 0.08, `footprint: ring ratio ${(s2.ring / t2.ring).toFixed(2)} does not follow the stature ratio ${(s2.h / t2.h).toFixed(2)}`) }
}

/* ── 2026-09-03: the engine's feature run, one check per beat ──────────── */
if (SINGLES) {
  const CTX = { UD: LIB.static.units, SN: LIB.static.statuses }
  const byType = (EV, t) => EV.map((e, i) => [e, i]).filter(([e]) => e.type === t)
  /* the library must carry the mechanics, or these checks cannot bite */
  const has = t => LIB.battles.some(b => b.battle.events.some(e => e.type === t))
  for (const t of ['unit.equipped', 'encounter.wave', 'encounter.lost', 'corpse.created', 'corpse.removed', 'layer.painted', 'move.stopped', 'aoo.provoked',
    'deathbed.stood', 'deathbed.fell', 'deathbed.none', 'hp.reset', 'bleedout.accelerated', 'surge.hit', 'power.gained', 'band.advanced', 'night.fell', 'light.cast', 'maxHp.gained', 'stamina.drained',
    'unit.badged', 'badge.gained', 'unit.grown'])
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
    /* the kit: a unit with unit.equipped shows its granted attacks in the bar, and its resting movement is the ENGINE's —
       viewer.reads-engine (review V6): the oracle was the viewer's own formula (sheet + kit), so it could never catch the
       formula. The engine's movement at an activation's start is in its own log: when activation.begin names neither a
       reduced budget (movePoints) nor a lending source (movementMods), the unit moves on its full fielded movement, and
       that activation's first step states it — movePointsLeft + cost − bonusPaid (moveUnit). The numeral the unit rested
       at just before is compared with that. */
    const eq = byType(EV, 'unit.equipped').find(([e]) => (e.grants || []).length)
    if (eq) { const [e] = eq
      v.seek(bb + 1); v.inspect(e.actor); v.render()
      check(V.dom.actionbar.innerHTML.includes(`data-act="${e.grants[0]}"`), `${label}: the action bar lacks the granted attack ${e.grants[0]} for unit ${e.actor}`)
      const at = EV.findIndex((x, i) => i > bb && x.type === 'activation.begin' && x.actor === e.actor && x.movePoints == null && !x.movementMods)
      const end = at < 0 ? -1 : EV.findIndex((x, i) => i > at && (x.type === 'activation.end' || x.type === 'surge.hit') && x.actor === e.actor)
      const step = at < 0 ? -1 : EV.findIndex((x, i) => i > at && (end < 0 || i < end) && x.type === 'moved' && x.actor === e.actor)
      /* the kit is not a buff: no chevron from item.* sources alone */
      const E = V.layers.UEL.get(e.actor), St = foldTo(EV, bb + 1, CTX)
      if ((St.U[e.actor].mods || []).every(m => m.fielded)) check(!/polygon\(50% 12%|polygon\(50% 88%/.test(E.badges.innerHTML), `${label}: unit ${e.actor} wears a chevron for its kit alone`)
      if (step > 0) { v.seek(at); v.render(); const R = V.layers.UEL.get(e.actor), m = EV[step], engineMv = m.movePointsLeft + m.cost - (m.bonusPaid || 0)
        if (R && R.mv.style.display !== 'none') check(+R.mv.textContent === engineMv, `${label}: unit ${e.actor} rests at movement ${R.mv.textContent}; the engine's first step of its next activation (${step}) says it started on ${engineMv}`) } }
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
    /* Law 10 reason, 2026-09-16: requested explanation of attempted movement now
       labels an actual HIT stop. Replace the old zero-cues assertion with the
       exact cause/hex/text contract; retain NO HELD and no zone-entry stop below. */
    { const S = createState()
      for (const e of EV) { const cues = fold(S, e, CTX, 0)
        if (e.type !== 'move.stopped') continue
        const expected = e.reason === 'hit' ? [{ k:'float', hex:e.hex, kind:'note', text:'STOPPED BY HIT', small:true }] : []
        check(JSON.stringify(cues) === JSON.stringify(expected), `${label}: move.stopped must explain only an authoritative hit at hex ${e.hex}`) } }
    for (const [e] of byType(EV, 'move.stopped')) check(e.reason !== 'zone of control', `${label}: move.stopped still says "zone of control" — the engine reversed it to 'hit'`)
    { const html = win.document.body.allHTML().map(stripB64).join('\n'); check(!/\bHELD\b/.test(html), `${label}: "HELD" is on a rendered surface`) }
    for (const [e, i] of byType(EV, 'move.stopped').slice(0, 2)) { const S = foldTo(EV, i + 1, CTX); check(S.U[e.actor].hex === e.hex, `${label}: after move.stopped unit ${e.actor} folds at ${S.U[e.actor].hex}, event says ${e.hex}`) }
    /* the attack of opportunity: labelled, and the attack that follows knows it is one */
    for (const [e, i] of byType(EV, 'aoo.provoked').slice(0, 3)) {
      const S = foldTo(EV, i, CTX); const cues = fold(S, e, CTX, 0)
      check(cues.some(c => c.k === 'float' && c.kind === 'aoo'), `${label}: aoo.provoked at ${i} cued no label`)
      const j = EV.findIndex((x, k) => k > i && x.type === 'attack.declared')
      /* folded by hand: foldTo() clears the lingering AOO, as it clears AIM */
      if (j > 0 && EV[j].actor === e.actor) { const S2 = createState(); for (let k = 0; k <= j; k++) fold(S2, EV[k], CTX, 0); check(S2.AIM && S2.AIM.aoo, `${label}: the attack after aoo.provoked at ${i} is not marked as one`) } }
    /* the Deathbed (ruled 2026-09-03 evening): a MODAL, never a float and never the word "stands"; the roll and
       chance verbatim; stage one says UNIT DOWNED, stage two the bold result; the wound level lands on the
       unit, the blood shows, hp.reset restores the bar */
    { const S = createState(); for (const e of EV) for (const c of fold(S, e, CTX, 0)) {
        if (/^deathbed\./.test(e.type)) { check(!(c.k === 'float'), `${label}: ${e.type} floats "${c.text}" — the Deathbed is a modal`)
          if (c.k === 'deathbed' && c.n != null) check(e[c.of] === c.n && e[c.chanceOf] === c.chance, `${label}: the Deathbed modal carries roll ${c.n}/chance ${c.chance}, the event says ${e.roll}/${e.chance}`) } } }
    for (const [e, i] of byType(EV, 'deathbed.stood').slice(0, 3)) {
      const S = foldTo(EV, i, CTX); const cues = fold(S, e, CTX, 0)
      check(cues.some(c => c.k === 'deathbed' && c.result === 'stood' && c.n === e.roll), `${label}: deathbed.stood at ${i} cued no modal`)
      v.seek(i); v.step()
      const wrap = V.dom.stage.parentNode, m = wrap.querySelector('.dbModal')
      /* the fake DOM's innerHTML is per element and not re-serialised from children: read the PLATE, which is what carries the words */
      const plateHTML = () => m ? m.querySelector('.dbPlate').innerHTML : ''
      check(m && /UNIT DOWNED/.test(plateHTML()) && /Deathbed Fighting roll/.test(plateHTML()) && new RegExp('<b>' + e.roll + '</b> vs ' + e.chance).test(plateHTML()), `${label}: the Deathbed modal's first stage is wrong or missing at ${i}`)
      win._flush(1200); check(/DEATHBED FIGHTING/.test(plateHTML()) && /This hero fights on\./.test(plateHTML()), `${label}: the Deathbed modal's second stage does not say the hero fights on`)
      check(!/stands/i.test(plateHTML()), `${label}: the Deathbed modal says "stands"`)
      win._flush(2000); check(!wrap.querySelector('.dbModal'), `${label}: the Deathbed modal did not leave`)
      check(S.U[e.target].deathbed === true, `${label}: after deathbed.stood unit ${e.target} does not carry the Deathbed mark`)
      const r = EV.findIndex((x, k) => k > i && x.type === 'hp.reset' && x.target === e.target)
      if (r > 0) { v.seek(r + 1); v.render(); const u = v.state.U[e.target], E = V.layers.UEL.get(e.target)
        check(u.hp === EV[r].hp && u.maxHp === EV[r].maxHp, `${label}: after hp.reset unit ${e.target} folds ${u.hp}/${u.maxHp}, event says ${EV[r].hp}/${EV[r].maxHp}`)
        /* THE SMALL RED SKULL (Angela 2026-09-04), in the overhead row and nowhere else */
        check(E && /dbSkull/.test(E.badges.innerHTML), `${label}: unit ${e.target} stood at the Deathbed but wears no skull`)
        check(E.skull === undefined, `${label}: actual Deathbed mark must not invent a future death prediction`)
        const st = (E.badges.innerHTML.match(/dbSkull[^>]*>.*?font-size:(\d+)px/) || [])[1]
        check(st && +st <= 14, `${label}: the Deathbed skull is ${st}px — Angela ruled "a very small skull"`) } }
    /* EVERY unit, at the END state — the old check broke after the first one
       and ran at battle start, when nobody had stood yet (REVIEW §E) */
    { const S = foldTo(EV, EV.length, CTX); v.seek(EV.length); v.render()
      for (const u of Object.values(S.U)) { const E = V.layers.UEL.get(u.id); if (!E || u.life === 'dead') continue
        check(/dbSkull/.test(E.badges.innerHTML) === !!u.deathbed,
          `${label}: unit ${u.id} ${u.deathbed ? 'stood at the Deathbed and wears no skull' : 'never stood and wears a Deathbed skull'}`) } }
    for (const [e, i] of byType(EV, 'deathbed.fell').slice(0, 2)) { const S = foldTo(EV, i, CTX); check(fold(S, e, CTX, 0).some(c => c.k === 'deathbed' && c.result === 'fell' && c.n === e.roll), `${label}: deathbed.fell at ${i} cued no modal`)
      v.seek(i); v.step(); win._flush(1200); const m = V.dom.stage.parentNode.querySelector('.dbModal'); check(m && /This hero falls\./.test(m.querySelector('.dbPlate').innerHTML), `${label}: the fell modal does not say the hero falls`); win._flush(2000) }
    /* deathbed.none — a Wounded unit at 0: no roll, dead (engine b4cbd9b) */
    for (const [e, i] of byType(EV, 'deathbed.none').slice(0, 1)) { v.seek(i); v.step()
      const m = V.dom.stage.parentNode.querySelector('.dbModal')
      check(m && /Already Wounded/.test(m.querySelector('.dbPlate').innerHTML), `${label}: the no-roll modal does not say the unit was already Wounded`); win._flush(3000) }
    /* BADGES (engine 2e76ede): every badge the log grants is on the unit, and a mid-battle one beats */
    { const S = foldTo(EV, EV.length, CTX)
      for (const [e] of byType(EV, 'unit.badged').slice(0, 4)) check(S.U[e.actor] && S.U[e.actor].badges.includes(e.badgeId), `${label}: unit ${e.actor} lacks the fielded badge ${e.badgeId}`)
      for (const [e] of byType(EV, 'badge.gained').slice(0, 4)) check(S.U[e.actor] && S.U[e.actor].badges.includes(e.badgeId), `${label}: unit ${e.actor} lacks the gained badge ${e.badgeId}`)
      const g = byType(EV, 'badge.gained')[0]
      if (g) { const St = foldTo(EV, g[1], CTX); const cues = fold(St, g[0], CTX, 0)
        check(cues.some(c => c.k === 'badge' && c.id === g[0].actor), `${label}: badge.gained cued no beat`)
        check(cues.some(c => c.k === 'float' && c.kind === 'badge'), `${label}: badge.gained floated no name`) }
      /* a badge's name comes from the dumped table, never invented */
      for (const [e] of byType(EV, 'badge.gained').slice(0, 2)) check(LIB.static.badges[e.badgeId], `${label}: badge ${e.badgeId} is not in the dumped BADGES table`) }
    /* capability.charges: an exhausted action leaves the bar (viewer finding 2026-09-04) */
    for (const [e, i] of byType(EV, 'power.exhausted').slice(0, 1)) { const id = e.abilityId ?? e.actionId
      v.seek(i); v.inspect(e.actor); v.render()
      check(V.dom.actionbar.innerHTML.includes(`data-act="${id}"`), `${label}: ${id} is not on the bar before it is exhausted`)
      v.step(); v.inspect(e.actor); v.render()
      check(!V.dom.actionbar.innerHTML.includes(`data-act="${id}"`), `${label}: ${id} spent its last use and is still on the bar`) }
    /* light.cast / maxHp.gained / stamina.drained — on the mandatory list since
       2026-09-03 with NO assertion anywhere until 2026-09-04 (REVIEW §B2) */
    for (const [e, i] of byType(EV, 'light.cast').slice(0, 2)) {
      /* the layer.painted after:0 lines BEFORE it are the hexes it lit: darkness must fall */
      let j = i - 1; while (j >= 0 && EV[j].type === 'layer.painted') j--
      const before = foldTo(EV, j + 1, CTX0), after = foldTo(EV, i + 1, CTX0)
      const dark = S => Object.values(S.layers).filter(l => (LIB.static.layers[l] || '') === 'layer.darkness').length
      check(dark(after) < dark(before), `${label}: light.cast at ${i} lit ${e.hexes} hexes but the folded darkness did not shrink (${dark(before)} → ${dark(after)})`) }
    for (const [e, i] of byType(EV, 'maxHp.gained').slice(0, 3)) { const S = foldTo(EV, i + 1, CTX0)
      check(S.U[e.target] && S.U[e.target].maxHp === e.maxHp && S.U[e.target].hp === e.hp,
        `${label}: after maxHp.gained unit ${e.target} folds ${S.U[e.target] && S.U[e.target].hp}/${S.U[e.target] && S.U[e.target].maxHp}, event says ${e.hp}/${e.maxHp}`) }
    for (const [e, i] of byType(EV, 'stamina.drained').slice(0, 3)) { const S = foldTo(EV, i + 1, CTX0)
      check(S.U[e.target] && S.U[e.target].stam === e.stamina, `${label}: after stamina.drained unit ${e.target} folds ${S.U[e.target] && S.U[e.target].stam} stamina, event says ${e.stamina}`) }
    /* knockback beyond one (engine 2e649b5) */
    for (const [e, i] of byType(EV, 'knocked').slice(0, 2)) { const S = foldTo(EV, i, CTX); const cues = fold(S, e, CTX, 0)
      check(cues.some(c => c.k === 'shove' && c.to === e.to), `${label}: knocked cued no travel`)
      check(S.U[e.target].hex === e.to, `${label}: after knocked unit ${e.target} folds at ${S.U[e.target].hex}, event says ${e.to}`) }
    for (const [e, i] of byType(EV, 'bleedout.accelerated').slice(0, 2)) { const S = foldTo(EV, i + 1, CTX); check(S.U[e.target].bleed === e.bleedOut, `${label}: bleedout.accelerated left the counter at ${S.U[e.target].bleed}, event says ${e.bleedOut}`) }
    /* banners: a wave, the band, night, the objective — a node in the wrap that leaves */
    for (const t of ['encounter.wave', 'band.advanced', 'night.fell', 'encounter.lost', 'encounter.won']) {
      const hit = byType(EV, t)[0]; if (!hit) continue
      const [ev, i] = hit
      /* the CUE is asserted whatever the seq — a banner cued before battle.begin
         is seeded silently by the pump and never reaches the DOM, which is how
         night.fell's test skipped itself while its coverage guard passed
         (REVIEW §B3). Only the DOM half is conditional. */
      { const St = foldTo(EV, i, CTX0); const cues = fold(St, ev, CTX0, 0)
        check(cues.some(c => c.k === 'banner'), `${label}: ${t} cued no banner`) }
      if (i <= bb) continue                                  // seeded before battle.begin: no DOM beat to look at
      v.seek(i); v.step()
      const wrap = V.dom.stage.parentNode
      check(wrap.querySelector('.banner'), `${label}: no banner after ${t}`)
      win._flush(2000); check(!wrap.querySelector('.banner'), `${label}: the ${t} banner did not leave`) }
    /* the movement numeral during an activation is the engine's own budget: activation.begin's movePoints, each step's
       movePointsLeft, and — viewer.reads-engine (review V7) — after a Surge, surge.hit's movePoints */
    for (const [e, i] of [...byType(EV, 'moved').slice(0, 3), ...byType(EV, 'surge.hit').slice(0, 2), ...byType(EV, 'activation.begin').filter(([x]) => x.movePoints != null).slice(0, 2)]) {
      const want = e.type === 'moved' ? e.movePointsLeft : e.movePoints
      v.seek(i + 1); v.render(); const E = V.layers.UEL.get(e.actor), u = v.state.U[e.actor]
      if (!E || !u || u.life !== 'standing' || v.state.activeId !== e.actor) continue
      check(u.activeMv === want, `${label}: after ${e.type} at ${i} unit ${e.actor} folds movement ${u.activeMv}, the engine says ${want}`)
      if (want > 0) check(E.mv.style.display !== 'none' && +E.mv.textContent === want, `${label}: after ${e.type} at ${i} unit ${e.actor}'s movement numeral reads ${E.mv.style.display === 'none' ? 'nothing' : E.mv.textContent}, the engine says ${want}`) }
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
    /* auras: tiles round every standing holder, from the engine's distance table — its own hex included, as the engine's
       auraMods counts the holder inside its own aura (review V8); none once the holder falls */
    { const distance = V.data.distance, n = V.data.POS.length
      const holders = Object.values(Send.U).filter(u => ((LIB.static.units[u.typeId] || {}).auras || []).length)
      for (const h of holders.slice(0, 2)) {
        const enter = EV.findIndex(e => e.type === 'unit.enter' && e.actor === h.id)
        const at = Math.max(bb + 1, enter + 1); v.seek(at); v.render()
        const u = v.state.U[h.id]; const auras = LIB.static.units[u.typeId].auras
        const want = new Set(); for (const a of auras) for (let x = 0; x < n; x++) { const d = distance(u.hex, x); if (d <= a.radius) want.add(x + '|' + a.side) }
        const tiles = V.layers.AURA ? V.layers.AURA.size : 0
        /* `===`, not `>=`: a runaway radius or a tile left over from a previous
           frame passed the old assertion while its message claimed equality
           (REVIEW §C1/§E). One holder on the board, so the counts must match. */
        const only = holders.length === 1
        check(only ? tiles === want.size : tiles >= want.size,
          `${label}: ${h.name} at hex ${u.hex} should tint ${want.size} hexes, ${tiles} aura tiles drawn`)
        const dead = EV.findIndex(e => e.type === 'life.dead' && e.target === h.id)
        if (dead > 0 && holders.length === 1) { v.seek(dead + 1); v.render(); check((V.layers.AURA ? V.layers.AURA.size : 0) === 0, `${label}: ${h.name} is dead and still exerts an aura`) } } }
  }
}

// Independent display fixture: extreme status values cannot invent a forecast.
if (SINGLES) {
  load(0); const v = H.viewer; v.pause()
  v.seek(v.events.findIndex(e => e.type === 'battle.begin') + 1)
  const V = v._V, u = Object.values(v.state.U).find(u => u.life === 'standing')
  check(!!u, 'resistance display fixture requires a standing unit')
  if (u) {
    V.data.UD = {...V.data.UD, [u.typeId]: {...V.data.UD[u.typeId], fireResist: 2, poisonResist: 3, shadowResist: 4}}
    V.data.ABSORBING_STATUSES = [...V.data.ABSORBING_STATUSES, 'test.status.display-pool']
    u.hp = 1; u.st = {'status.burn': 100, 'test.status.display-pool': 3}
    V.view.inspectId = u.id; V.view.statsOpen = true; v.render()
    for (const label of ['Armor', 'Magic Resist', 'Fire Resist', 'Poison Resist', 'Shadow Resist'])
      check(V.dom.panel.innerHTML.includes(label), `missing visible defense label: ${label}`)
    for (const [label, n] of [['Fire Resist', 2], ['Poison Resist', 3], ['Shadow Resist', 4]])
      check(new RegExp(label + '</span><span[^>]+>' + n + '</span>').test(V.dom.panel.innerHTML), `named defense value was dropped: ${label}`)
    const E = V.layers.UEL.get(u.id)
    check(u.hp === 1 && E.proj === undefined && E.skull === undefined, 'large Burn counter fabricated HP/death instead of waiting for engine facts')
    check(E.prot.style.display !== 'none' && (E.prot.innerHTML.match(/<div /g) || []).length === 3, 'current pool metadata/counter was replaced with a guessed spend')
  }
}

if (FACTS) fs.writeFileSync(FACTS, JSON.stringify({ k: SLICE.k, n: SLICE.n, libraryCount: LIB.battles.length, battles: driven, singles: SINGLES,
  ...iconFacts, statusFrames, ok: fails.length === 0, fails }) + '\n')
if (fails.length) { console.error('FAIL\n  ' + fails.join('\n  ')); process.exit(1) }
if (SLICE) { console.log(`OK — slice ${SLICE.k}/${SLICE.n}: ${driven.length} of ${LIB.battles.length} battles fold end to end${SINGLES ? ' · the single checks' : ''} · icons ${uses.size} used · rows damaging=${damaging} plain=${plain} · status frames ${statusFrames} (library-wide checks: the gate, over all ${SLICE.n} slices)`); process.exit(0) }
console.log(`OK — ${LIB.battles.length} battles fold end to end · pure fold == pumped fold · icons ${uses.size} used · rows damaging=${damaging} plain=${plain}${CHECKS.size ? ' · checks: ' + [...CHECKS].join(', ') : ''}`)
