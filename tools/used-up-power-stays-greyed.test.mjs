// viewer.used-up-power-stays-greyed (engine backlog; engine DECISIONS.md 2026-10-06 'an Activation is one move action and one
// primary action, in that order; a used-up power stays on the bar, greyed'). Asked whether a used-up once-per-battle power
// should stay on the bar greyed instead of disappearing, Andrew: "One, yes."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the library's own battle
// (battles/test.banner-courage.json — a warrior plants the Banner of Courage on Turn 1: once per Battle):
//   · before it is used the power's row is lit; after the engine's line says its last use is spent (power.exhausted) the row
//     is STILL on the bar, in its place, greyed, marked disabled, saying "Used: once per Battle." — for the rest of the battle;
//   · where a host plays the unit, whether it is still used up is the host's word (the engine's): named in the host's
//     cantPay it says the host's line; not named — a use the rules gave back — it is lit at once;
//   · a press on the greyed row still goes to the host and the bar chooses nothing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle = JSON.parse(readFileSync('battles/test.banner-courage.json', 'utf8')), EV = battle.events
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))

function boot(opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const offered = []
  const v = B.mount(host, data, { autoplay: false, onPlay: input => { offered.push(input); return true }, ...opts })
  v.push(EV)
  return { v, V: v._V, offered }
}
const facts = (actor, more = {}) => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...more })
const rows = V => V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act)
const row = (V, id) => rows(V).find(r => r.dataset.act === id)
const has = (r, cls) => r.className.split(/\s+/).includes(cls)
const lastLine = r => r.getAttribute('title').split('\n').pop()
/* the recording's own lines: the power whose last use is spent, who spent it, and that unit's Activations either side */
const gone = EV.findIndex(e => e.type === 'power.exhausted'), WHO = EV[gone].actor, POWER = EV[gone].abilityId ?? EV[gone].actionId
const begins = EV.map((e, i) => (e.type === 'activation.begin' && e.actor === WHO ? i : -1)).filter(i => i >= 0)
const before = begins.filter(i => i < gone).pop(), after = begins.filter(i => i > gone)

test('the recording: a once-per-Battle power is used and the engine says its last use is spent; its unit acts again afterwards', () => {
  assert.equal(STATIC.actions[POWER].uses, 1, POWER + ' is once per Battle'); assert.ok(before >= 0 && after.length >= 2, 'it acts before and after')
})

test('before it is used the row is lit; after its last use it is still on the bar, in its place, greyed, marked disabled and says why — for the rest of the battle', () => {
  const { v, V } = boot()
  v.seek(before + 1)
  const order = rows(V).map(r => r.dataset.act), fresh = row(V, POWER)
  assert.ok(fresh, 'the power is on the bar'); assert.ok(!has(fresh, 'usedUp') && !has(fresh, 'cantPay'), 'lit'); assert.equal(fresh.getAttribute('aria-disabled'), null)
  for (const at of [after[0], after[after.length - 1]]) {
    v.seek(at + 1)
    assert.deepEqual(rows(V).map(r => r.dataset.act), order, 'every row is where it was: nothing left the bar')
    const r = row(V, POWER)
    assert.ok(has(r, 'usedUp') && has(r, 'cantPay'), 'the used-up row wears the disabled look'); assert.equal(r.getAttribute('aria-disabled'), 'true')
    assert.equal(lastLine(r), 'Used: once per Battle.'); assert.ok(!has(r, 'playChosen'))
    for (const o of rows(V).filter(x => x !== r)) assert.ok(!has(o, 'usedUp'), o.dataset.act + ' is not used up')
  }
  v.dispose()
})

test('where a host plays the unit it is the host\'s word: named, the row says the host\'s line; not named — a use given back — it is lit at once; a press goes to the host and chooses nothing', () => {
  const { v, V, offered } = boot(); v.seek(after[0] + 1)
  v.setPlay(facts(WHO, { cantPay: [{ id: POWER, why: 'Used: once per Battle.' }] }))
  let r = row(V, POWER); assert.ok(has(r, 'usedUp') && has(r, 'cantPay')); assert.equal(lastLine(r), 'Used: once per Battle.')
  offered.length = 0; for (const f of r.listeners.click || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {} })
  assert.deepEqual(offered.filter(o => o.kind === 'slot'), [{ kind: 'slot', actionId: POWER, unit: WHO }], 'the press is the host\'s to answer'); assert.ok(!rows(V).some(x => has(x, 'playChosen')))
  v.setPlay(facts(WHO, { cantPay: [] }))
  r = row(V, POWER); assert.ok(!has(r, 'usedUp') && !has(r, 'cantPay'), 'the host names it no longer: lit'); assert.equal(r.getAttribute('aria-disabled'), null)
  /* facts for another unit say nothing of this bar: the log's line stands */
  v.setPlay(facts(null)); assert.ok(has(row(V, POWER), 'usedUp'))
  v.dispose()
})
