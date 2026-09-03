#!/usr/bin/env node
/* Play ONE export headlessly through a built page — the file-drop path verify
   uses, on any export-battle.mts output — and report what the fold saw: every
   event type (folded / ignored / UNKNOWN), every cue kind with a count, the
   final board objects, and the first throw if there is one.

     node tools/play.mjs .build/BATTLE-VIEWER.html ../engine/exports/some-battle.json

   A development affordance (2026-09-03): "play the sample after each section"
   without a browser. It asserts nothing; verify.mjs is the gate. */
import fs from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeWindow } from './fakedom.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), PKG = resolve(HERE, '..')
const [, , file, exportFile] = process.argv
if (!file || !exportFile) { console.error('usage: play.mjs <BATTLE-VIEWER.html> <export.json>'); process.exit(2) }
const { createState, fold, FOLDED_TYPES } = await import(pathToFileURL(resolve(PKG, 'src/fold.js')).href)
const html = fs.readFileSync(file, 'utf8')
const m = html.match(/<script>([\s\S]*)<\/script>\s*$/)
const bodyHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
const win = makeWindow(); win.document.body.innerHTML = bodyHTML
const run = new Function('window', 'document', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'addEventListener', 'alert', 'Date', 'performance', 'getComputedStyle', 'localStorage', 'self', 'globalThis', m[1])
run(win, win.document, win.requestAnimationFrame, win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
  win.addEventListener, win.alert, win.Date, win.performance, win.getComputedStyle, win.localStorage, win, win)
const BV = win.__battleView, H = BV.harness, LIB = BV.lib
const battle = JSON.parse(fs.readFileSync(exportFile, 'utf8'))
H.playExport(battle, exportFile)
const v = H.viewer; v.pause()
const wrap = v._V.dom.stage.parentNode
Object.defineProperty(wrap, 'clientWidth', { value: 1408, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 744, configurable: true })
const EV = v.events
const types = {}; for (const e of EV) types[e.type] = (types[e.type] || 0) + 1
const IGNORED = new Set(['turn.end', 'activation.idle', 'trigger.rolled', 'phase.end.begin', 'map.loaded', 'ai.tookHighGround', 'ai.denied', 'knockback.blocked', 'crit.branch'])
console.log(`${exportFile}: ${EV.length} events · engine ${battle.engineCommit} · ${battle.outcome} in ${battle.turns} turns · map ${battle.seed.mapId}`)
for (const [t, n] of Object.entries(types).sort()) console.log(`  ${FOLDED_TYPES.includes(t) ? 'fold   ' : IGNORED.has(t) ? 'ignore ' : 'UNKNOWN'} ${t} ×${n}`)
/* the pure fold's cues */
const S = createState(), cues = {}, floats = []
for (const e of EV) for (const c of fold(S, e, { UD: LIB.static.units, SN: LIB.static.statuses }, 0)) {
  const k = c.k + (c.kind ? ':' + c.kind : '') + (c.k === 'banner' ? ':' + c.kind : '')
  cues[k] = (cues[k] || 0) + 1
  if (c.k === 'float' && floats.length < 400) floats.push(c.text)
}
console.log('cues:'); for (const [k, n] of Object.entries(cues).sort()) console.log(`  ${k} ×${n}`)
console.log('floats (distinct):', [...new Set(floats.map(t => t.replace(/\d+/g, 'N')))].join(' | '))
/* drive the pumped viewer to the end */
let threw = null, cur = v.cursor
try { while (v.cursor < EV.length) { win._tick(200); v.step(); if (v.cursor === cur) throw new Error('step did not advance'); cur = v.cursor } }
catch (e) { threw = e }
const V = v._V, St = v.state
console.log(`pumped: cursor ${v.cursor}/${EV.length}${threw ? ' — THREW at ' + (EV[v.cursor] && EV[v.cursor].type) + ': ' + threw.message + '\n' + threw.stack : ''}`)
console.log(`final: outcome ${St.outcome} · units ${Object.keys(St.U).length} (dead ${Object.values(St.U).filter(u => u.life === 'dead').length}, downed ${Object.values(St.U).filter(u => u.life === 'downed').length}, wounded ${Object.values(St.U).filter(u => u.wound > 0).length})` +
  ` · corpses on board ${Object.keys(St.corpses).length} · painted hexes ${Object.keys(St.layers).length} · power ${St.power} · encounter ${St.encounter && St.encounter.name}`)
console.log(`board: corpse nodes ${V.layers.CORPSE ? V.layers.CORPSE.size : 0} · layer tiles ${V.layers.LAY ? V.layers.LAY.size : 0} · aura tiles ${V.layers.AURA ? V.layers.AURA.size : 0} · unit nodes ${V.layers.UEL.size}`)
for (const u of Object.values(St.U)) if (u.kit.items.length) { console.log(`kit: ${u.name} — ${u.kit.items.join(', ')} → attacks ${u.kit.grants.join(', ')}; mods ${u.mods.filter(m => /^item\./.test(m.source)).map(m => m.stat + ' ' + m.value).join(', ')}`); break }
process.exit(threw ? 1 : 0)
