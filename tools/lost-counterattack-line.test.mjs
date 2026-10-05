// viewer.lost-counterattack-line (engine backlog; found by the engine worker landing rule.counterattack-replaced-and-lost,
// 2026-10-05 — ruled 2026-10-04, engine DECISIONS.md 'after the backlog run: …': a counterattack used again replaces the old
// one, and being knocked down or knocked to another hex loses it).
// The item's expect: "In a battle where a hero holding a counterattack is knocked down, the log line says the counterattack
// is lost and that the knockdown did it; where it is knocked to another hex, that the knockback did it; where the hero uses
// the power again, that the old one is replaced; where it runs out, the line is what it was before. A battle with no
// counterattack reads the same log as before."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and of the source it is built from, on the engine's own battles:
// tools/fixtures/lost-counterattack.json (four fielded opening battles, each cut at the end of the Activation the loss fell
// in — made by test/viewer.lost-counterattack-line.test.ts), tools/fixtures/free-attack-kinds.json (a counterattack that runs
// out) and the library's recordings. Nothing here is worked out: the sentence is the engine's `reason` and `lost` in words.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { buildLog } from '../src/log.js'
import { FREE_ATTACK, sgn } from '../src/actions.js'
import { shownName } from '../src/names.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const lost = load('tools/fixtures/lost-counterattack.json'), kinds = load('tools/fixtures/free-attack-kinds.json'), STATIC = load('generated/static.json')
const D = { ACT: STATIC.actions, ITEMS: STATIC.items, BADGES: STATIC.badges, UD: STATIC.units, TERRAIN_NAMES: STATIC.terrainNames }
const LIBRARY = readdirSync('battles').filter(f => f.endsWith('.json') && f !== 'library.json').map(f => ({ f, b: load('battles/' + f) })).filter(x => Array.isArray(x.b.events))
const text = x => String(x ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const nameOf = (EV, id) => shownName(EV.find(e => e.type === 'unit.enter' && e.actor === id).name)
const logOf = EV => buildLog(EV, STATIC.statuses, 99, D)
const lineAt = (EV, i) => { const l = logOf(EV).find(x => x.i === i); assert.ok(l, 'the log has a line for event ' + i); return l }
/** the lines of the loss that opens at `at`: the engine's run of `statmod.expired` lines naming the same unit, kind and reason */
const lossAt = (EV, at) => { const out = []; for (let k = at; k < EV.length && EV[k].type === 'statmod.expired' && EV[k].actor === EV[at].actor && EV[k].lost === EV[at].lost && EV[k].reason === EV[at].reason; k++) out.push(k); return out }
/** what the line read before this item, for a modifier that ends */
const AS_BEFORE = (EV, e) => `&nbsp;&nbsp;&nbsp;&nbsp;${nameOf(EV, e.actor)} — ${e.stat} ${sgn(e.value)} ends <span class="sq">· ${e.source}</span>`

function boot(battle) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true })   /* a host that plays: the page's log is the play chrome's */
  v.push(EV)
  return { w, v, V: v._V, EV }
}

for (const [c, words] of [['knockedDown', 'knocked down'], ['knockedBack', 'knocked back']]) {
  test(`a hero holding a counterattack is ${words}: the log says the counterattack is lost and that being ${words} did it`, () => {
    const B = lost[c], EV = B.events, e = EV[B.at], lines = lossAt(EV, B.at), name = nameOf(EV, e.actor)
    assert.equal(e.type, 'statmod.expired'); assert.equal(e.lost, 'counterattack'); assert.equal(e.reason, B.reason)
    const l = lineAt(EV, B.at)
    assert.equal(text(l.t), `${name} loses its counterattack — ${words} · ${e.source}`)
    assert.equal(l.cls, 'status', 'a status line, as a modifier ending is'); assert.ok(l.t.includes(`<b>${name}</b>`), 'the unit named in bold, as the lines about a unit are')
    assert.ok(!/\bends\b/.test(text(l.t)), 'not "ends": it was taken, it did not run out')
    /* what went with it (its Accuracy) is still one line each, and says it went with the counterattack */
    assert.ok(lines.length > 1, 'the power\'s Accuracy went with it')
    for (const k of lines.slice(1)) assert.equal(text(lineAt(EV, k).t), `${name} — ${EV[k].stat} ${sgn(EV[k].value)} ends with it · ${EV[k].source}`)
    console.log(`# ${B.seed.scenarioId} replicate ${B.seed.replicate}, event ${B.at}: "${text(l.t)}"`)
  })
}

test('the hero uses the power again while it is up: the log says the old one is replaced by a newer one — and the older power\'s other modifier goes with it', () => {
  for (const c of ['replaced', 'replacedWithRider']) {
    const B = lost[c], EV = B.events, e = EV[B.at], lines = lossAt(EV, B.at), name = nameOf(EV, e.actor)
    assert.equal(e.reason, 'replaced'); assert.equal(e.lost, 'counterattack')
    const l = lineAt(EV, B.at)
    assert.equal(text(l.t), `${name}'s counterattack is replaced by a newer one · ${e.source}`)
    assert.ok(!/\bloses\b|\bends\b/.test(text(l.t)), 'replaced, not lost and not run out')
    for (const k of lines.slice(1)) assert.equal(text(lineAt(EV, k).t), `${name} — ${EV[k].stat} ${sgn(EV[k].value)} ends with it · ${EV[k].source}`)
    /* the newer one's own lines follow, worded as a modifier put on always was */
    const added = EV[B.at + lines.length]; assert.equal(added.type, 'statmod.added'); assert.equal(added.stat, 'counterattack')
    assert.equal(lineAt(EV, B.at + lines.length).t, `&nbsp;&nbsp;&nbsp;&nbsp;${name} — ${added.stat} ${sgn(added.value)} <span class="sq">· ${added.source}</span>`)
    console.log(`# ${B.seed.scenarioId} replicate ${B.seed.replicate}, event ${B.at}: "${text(l.t)}"${lines.length > 1 ? ' · then "' + text(lineAt(EV, lines[1]).t) + '"' : ''}`)
  }
  const rider = lost.replacedWithRider, went = lossAt(rider.events, rider.at).map(k => rider.events[k].stat)
  assert.ok(went.some(s => s !== FREE_ATTACK.counterattack.stat && s !== FREE_ATTACK.counterattack.accuracy), 'the Great Sword\'s other modifier is among them: ' + went.join(', '))
})

test('a counterattack that runs out reads word for word what it did — and so does every other modifier that ends, in every recording', () => {
  const EV = kinds.counterattack.events, out = EV.map((e, i) => ({ e, i })).filter(x => x.e.type === 'statmod.expired' && x.e.stat === 'counterattack')
  assert.ok(out.length > 0, 'the fielding holds a counterattack running out')
  for (const { e, i } of out) { assert.equal(e.reason, undefined); assert.equal(e.lost, undefined); assert.equal(lineAt(EV, i).t, AS_BEFORE(EV, e)) }
  let n = 0
  for (const { f, b } of LIBRARY) { const log = logOf(b.events)
    for (const l of log) { const e = b.events[l.i]; if (e.type !== 'statmod.expired' || e.lost !== undefined || e.reason !== undefined) continue
      assert.equal(l.t, AS_BEFORE(b.events, e), `${f} event ${l.i}`); n++ } }
  assert.ok(n > 0)
  console.log(`# ${out.length} counterattack(s) running out in the fielding and ${n} modifier(s) ending across ${LIBRARY.length} recordings read as before`)
})

test('a battle with no counterattack lost or replaced reads no such line; one that holds one says it (the Gates\' recording in the library)', () => {
  let none = 0, some = 0
  for (const { f, b } of LIBRARY) { const EV = b.events, said = logOf(EV).filter(l => /loses its |is replaced by a newer one|ends with it/.test(text(l.t)))
    const taken = EV.map((e, i) => ({ e, i })).filter(x => x.e.type === 'statmod.expired' && x.e.lost !== undefined)
    assert.deepEqual(said.map(l => l.i), taken.map(x => x.i), `${f}: such a line exactly where the engine says a special free attack went`)
    if (taken.length) some++; else none++ }
  assert.ok(none > 0, 'recordings with none')
  const gates = LIBRARY.find(x => x.f === 'test.opening-gates.json')
  if (gates) { const at = gates.b.events.findIndex(e => e.type === 'statmod.expired' && e.lost !== undefined)
    if (at >= 0) console.log(`# the Gates' recording, event ${at}: "${text(lineAt(gates.b.events, at).t)}"`) }
  console.log(`# ${none} recordings hold no lost or replaced counterattack and read no such line; ${some} hold one`)
})

test('a reason or a kind the page has no words for is still said, in the engine\'s own word — never dropped, never "ends"', () => {
  const enter = { type: 'unit.enter', actor: 0, name: 'Paladin A', side: 'hero' }, base = { type: 'statmod.expired', actor: 0, op: 'add', value: 1, source: 'power.x' }
  const say = e => text(buildLog([enter, e], {}, 1)[0].t)
  assert.equal(say({ ...base, stat: 'counterattack', reason: 'moved-by-a-power', lost: 'counterattack' }), 'Paladin loses its counterattack — moved by a power · power.x')
  assert.equal(say({ ...base, stat: 'fend', reason: 'knocked-back', lost: 'fend' }), 'Paladin loses its fend — knocked back · power.x')
  assert.equal(say({ ...base, stat: 'fend', reason: 'replaced', lost: 'fend' }), "Paladin's fend is replaced by a newer one · power.x")
  /* a kind the page's table does not hold: every line of it says the loss, with the stat that went */
  assert.equal(say({ ...base, stat: 'riposte', reason: 'knocked-down', lost: 'riposte' }), 'Paladin loses its riposte — knocked down · riposte +1 · power.x')
  assert.equal(say({ ...base, stat: 'riposteAccuracy', value: 10, reason: 'knocked-down', lost: 'riposte' }), 'Paladin loses its riposte — knocked down · riposteAccuracy +10 · power.x')
})

test('the page\'s own log shows the sentence at the line the engine wrote it, once the battle has played to it', () => {
  for (const c of ['knockedDown', 'replaced']) {
    const B = lost[c], { v, V, EV } = boot(B), e = EV[B.at]
    const log = V.dom.root.querySelector('#playLog'), row = () => [...log.children].find(r => r.getAttribute('data-i') === String(B.at))
    v.seek(B.at); assert.equal(row(), undefined, 'not before the line has played')
    v.seek(EV.length)
    const r = row(); assert.ok(r, 'the log holds the line')
    /* the test window's textContent does not keep a row's words in reading order, so each part of the sentence is asked for */
    const said = text(r.textContent); for (const part of [nameOf(EV, e.actor), e.source]) assert.ok(said.includes(part), `${part}: ${said}`)
    assert.equal(r.className, 'ln status')
    assert.match(said, c === 'knockedDown' ? /loses its counterattack — knocked down/ : /counterattack is replaced by a newer one/)
    /* the fold still takes the modifier off the unit: the icon and the attribute go away (rule.counterattack-replaced-and-lost) */
    v.seek(B.at); const up = () => (V.S.U[e.actor].mods || []).filter(m => m.stat === 'counterattack').length
    const before = up(); v.seek(B.at + 1); assert.equal(up(), before - 1, 'the modifier is off the unit at that line')
    v.dispose()
  }
})
