// viewer.bar-follows-activation (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar changes with the Activation:
// the new unit's moves, attacks and powers'; Andrew: "when the activation changes, for whatever reason, the card art changes
// in the lower left, but the moves don't change. They need to change to the character's moves. And attacks and powers and all
// that"). A fault in landed viewer.turn-taking ("the bar and its card stay with the activated unit"): the card beside the bar
// was drawn only by the full render, the bar and the stamina strip also whenever the host handed or cleared its play facts —
// so at a change of Activation the two could be drawn from different moments and show different units. The component's half,
// asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage, for a host that plays: the card, the bar and the
// stamina strip are ONE draw — whenever any of them is drawn, all three are, from the same unit. The host's half — End
// activation, the double-click switch, each Hero Phase on the built sandbox — is kingdom tools/bar-follows-activation.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'
const EV = battle1.events

function boot(opts = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  v.push(EV)
  return { w, v, V: v._V }
}
const at = (type, from = 0, pred = () => true) => EV.findIndex((e, i) => i >= from && e.type === type && pred(e))
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
/* two heroes that act one after the other, with different sheets: A's Activation, then B's */
const beginA = at('activation.begin', 0, e => e.phase === 'hero'), A = EV[beginA].actor
const endA = at('activation.end', beginA, e => e.actor === A)
const beginB = at('activation.begin', endA, e => e.phase === 'hero'), B = EV[beginB].actor
const look = V => ({
  card: V.dom.portrait.style.display === 'none' ? null : V.dom.portrait.querySelector('img').getAttribute('src'),
  bar: V.dom.actionbar.querySelectorAll('.acRow').map(r => r.dataset.act).filter(Boolean),
  stam: (V.dom.stambar.querySelector('.num') || {}).textContent })
const cardOf = (V, id) => V.data.ASSETS[V.data.ARTMAP[V.S.U[id].typeId].card]
/* what a full render draws for a unit: its bar's buttons and its stamina, read with only that unit on the bar */
function own(id, when) { const { v, V } = boot(); v.seek(when); v.setPlay(facts(id)); v.render(); const o = look(V); v.dispose(); return o }

test('the recording has two different heroes acting one after the other', () => {
  assert.ok(beginA >= 0 && endA > beginA && beginB > endA && A !== B)
  const a = own(A, beginA + 1), b = own(B, beginB + 1)
  assert.notDeepEqual(a.bar, b.bar, 'their bars differ'); assert.notEqual(a.card, b.card, 'their cards differ')
})

test('the Activation changes while the host still holds the last unit\'s facts: once it clears them, the card, the bar and the stamina are the new unit\'s — together', () => {
  const { v, V } = boot()
  v.seek(beginA + 1); v.setPlay(facts(A))
  assert.equal(look(V).card, cardOf(V, A)); assert.deepEqual(look(V).bar, own(A, beginA + 1).bar)
  /* the host resolves End activation and the next begin in one go: the pump plays them with the old facts still in hand */
  v.seek(endA); v.setPlay(facts(A))
  while (v.cursor <= beginB) v.step()
  assert.equal(V.S.activeId, B, 'the fold: B is acting')
  v.setPlay(null)                                    /* the host: "none while the resolved actions play" */
  const mid = look(V), b = own(B, beginB + 1)
  assert.equal(mid.card, cardOf(V, B), 'the card is the new unit\'s the moment the old facts are cleared')
  assert.deepEqual(mid.bar, b.bar, 'and so is the bar: its moves, attacks and powers')
  assert.equal(mid.stam, b.stam, 'and its stamina')
  v.setPlay(facts(B))                                /* the board is still: the host hands the new unit's facts */
  const still = look(V)
  assert.equal(still.card, cardOf(V, B)); assert.deepEqual(still.bar, b.bar); assert.equal(still.stam, b.stam)
  v.dispose()
})

test('whenever the host hands its facts, the card is drawn with the bar from the unit they name', () => {
  const { v, V } = boot()
  v.seek(beginA + 1)                                 /* a full render: nobody's facts, the fold says A is acting */
  assert.equal(look(V).card, cardOf(V, A))
  v.setPlay(facts(B))                                /* the host's acting unit outranks the fold (subject.js barUnitOf) */
  const now = look(V), b = own(B, beginA + 1)
  assert.deepEqual(now.bar, b.bar, 'the bar is the unit the host names')
  assert.equal(now.card, cardOf(V, B), 'and the card beside it is the same unit\'s, drawn at the same moment')
  v.setPlay(null)                                    /* cleared: both go back to whoever the fold says is acting */
  assert.equal(look(V).card, cardOf(V, A)); assert.deepEqual(look(V).bar, own(A, beginA + 1).bar)
  v.dispose()
})

test('the standalone page (no host) is unchanged: the card and the bar follow whoever is looked at, together', () => {
  const { v, V } = boot({ onPlay: undefined })
  v.seek(beginB + 1)
  v.inspect(A); const a = look(V)
  v.inspect(B); const b = look(V)
  assert.equal(a.card, cardOf(V, A)); assert.equal(b.card, cardOf(V, B))
  assert.notDeepEqual(a.bar, b.bar, 'each hero looked at shows its own bar')
  v.dispose()
})
