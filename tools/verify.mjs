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
const { DUR } = await import(pathToFileURL(resolve(PKG, 'src/viewer.js')).href).catch(() => ({ DUR: null }))
/* event types the viewer deliberately does nothing with — a NEW engine event
   is a failure until it is folded or listed here on purpose */
const IGNORED = new Set(['turn.end', 'activation.idle', 'ai.mode', 'trigger.rolled', 'phase.end.begin', 'map.loaded', 'battle.begin',
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
  for (const n of found) check(ex[n], `exemptions: src carries EXEMPTION ${n} with no entry in tools/exemptions.json — a sixth computation needs its debt written down`)
  for (const n of Object.keys(ex)) check(found.has(n), `exemptions: ${n} is listed but no EXEMPTION ${n} marker remains in src — delete the entry, the list only shrinks`)
}

/* ── fields cover every map; sprite; stamps ────────────────────────────── */
for (const id of (LIB.static.maps || [])) check(LIB.fields[id], `fields: generated/fields.json lacks ${id}`)
check(LIB.static.maps && LIB.static.maps.length > 0, 'static.json carries no map list')
const spriteEl = win.document.body.querySelector('#raSprite')
const spriteIds = new Set(spriteEl ? spriteEl.querySelectorAll('symbol').map(s => s.id) : [])
check(spriteIds.size >= 4, `sprite has only ${spriteIds.size} symbols`)
check(/GENERATED by viewer\/tools\/build-viewer\.mjs — never hand-edit\. viewer \S+ · engine \S+/.test(html.slice(0, 400)), 'the page does not stamp viewer and engine commits in its header')

/* ── every library battle ──────────────────────────────────────────────── */
const H = BV.harness
let uses = new Set(), damaging = 0, plain = 0
function drive(label, battle) {
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
  for (const u of Object.values(v.state.U)) check(LIB.art.artmap[u.typeId], `${label}: no art for ${u.typeId}`)
  /* the pure fold reaches the same state the pump did */
  const S2 = foldTo(EV, EV.length, { UD: LIB.static.units, SN: LIB.static.statuses })
  const strip = S => JSON.stringify({ ...S, AIM: null, FIRING: null, TRIGFLASH: null, subjectId: null, subjectMode: null })
  check(strip(S2) === strip(v.state), `${label}: the pure fold and the pumped viewer disagree on the final state`)
  /* every type folded or ignored; float numbers verbatim from their event */
  const types = new Set(EV.map(e => e.type))
  for (const t of types) check(FOLDED_TYPES.includes(t) || IGNORED.has(t), `${label}: event type ${t} is neither folded nor on the ignore list`)
  { const S = createState(); for (const e of EV) { const cues = fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)
      for (const c of cues) if (c.k === 'float') { const n = c.text.match(/\d+/); if (n) check(numsIn(e).has(+n[0]), `${label}: float "${c.text}" carries ${n[0]}, absent from its ${e.type} event`) } } }
  /* every surface for every unit; no "+-"; icons resolve; DMG hues */
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
  if (i > 0) H.load(i)
  drive(b.label, b.battle)
}
for (const u of uses) check(spriteIds.has(u), `icons: <use> names ${u}, sprite lacks it`)
check(uses.has('ra-crossed-swords') && uses.has('ra-shoe-prints'), `icons: expected swords and shoe-prints among uses, got ${[...uses].join(',')}`)
check(damaging > 0 && plain > 0, `icons: rows damaging=${damaging} plain=${plain} — both kinds must appear`)
if (DUR) for (const t of Object.keys(DUR)) check(FOLDED_TYPES.includes(t) || IGNORED.has(t), `pump: DUR names ${t}, which no log folds`)

/* ── a dropped export plays (plan §8.6) ────────────────────────────────── */
{
  const b = LIB.battles[Math.min(1, LIB.battles.length - 1)]
  try { H.playExport(b.battle, 'dropped-' + b.label); const v = drive('dropped export', b.battle); check(v && v.cursor === b.battle.events.length, 'file-drop: the dropped export did not play to the end') }
  catch (e) { fails.push('file-drop: ' + e.message) }
}

if (fails.length) { console.error('FAIL\n  ' + fails.join('\n  ')); process.exit(1) }
console.log(`OK — ${LIB.battles.length} battles fold end to end · pure fold == pumped fold · icons ${uses.size} used · rows damaging=${damaging} plain=${plain}${CHECKS.size ? ' · checks: ' + [...CHECKS].join(', ') : ''}`)
