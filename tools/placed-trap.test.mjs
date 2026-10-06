// capability.placed-traps (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a feature
// that is needed; his items stay in rewards'). Andrew: "All of those deadlines need to be added in as features that we need."
// The item's words for the page: "The viewer shows a placed trap on its hex to the placer's side and plays its spring." The
// component's half, on the library's own battle (battles/test.bear-traps.json — the engine's fielding: a warrior places two
// Bear Traps on Turn 1 and a zombie walks onto each): a trap the heroes placed lies on its hex from the engine's trap.placed
// until its trap.sprung, when it is gone and the spring is said; an enemy side's trap is not drawn; the log says the placing
// and the spring. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'
const battle = JSON.parse(readFileSync('battles/test.bear-traps.json', 'utf8'))

/** the page booted on one battle, as tools/affliction-pop-up.test.mjs boots it */
function boot(battle, opts = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false, ...opts })
  v.push(battle.events)
  return { w, v, V: v._V, L }
}
const at = type => battle.events.map((e, i) => e.type === type ? i : -1).filter(i => i >= 0)
const placed = at('trap.placed'), sprung = at('trap.sprung')
const drawn = V => [...(V.layers.TRAP ? V.layers.TRAP.values() : [])].map(n => +n.dataset.hex).sort((a, b) => a - b)

test('the engine\'s battle places two Bear Traps in one use and each is sprung by a unit that walks onto it', () => {
  assert.equal(placed.length, 2, 'two traps placed')
  assert.equal(battle.events.filter(e => e.type === 'power.used' && e.abilityId === 'power.bear-trap.use').length, 1, 'by one use')
  assert.equal(sprung.length, 2, 'both sprung in this battle')
  for (const i of placed) assert.deepEqual([battle.events[i].causeId, battle.events[i].side], ['power.bear-trap.use', 'hero'])
  assert.notEqual(battle.events[placed[0]].hex, battle.events[placed[1]].hex)
})

test('a trap the heroes placed lies on its hex until it springs: drawn at trap.placed, gone at trap.sprung, the other still there', () => {
  const { v, V } = boot(battle)
  const [p1, p2] = placed.map(i => battle.events[i]), [s1, s2] = sprung
  v.seek(placed[0])
  assert.deepEqual(drawn(V), [], 'no trap yet')
  v.seek(placed[0] + 1)
  assert.deepEqual(drawn(V), [p1.hex])
  const node = V.layers.TRAP.get(p1.trap)
  assert.equal(node.dataset.trap, String(p1.trap)); assert.equal(node.querySelector('img'), null, 'the page\'s own mark, no art')
  v.seek(placed[1] + 1)
  assert.deepEqual(drawn(V), [p1.hex, p2.hex].sort((a, b) => a - b))
  assert.deepEqual(Object.values(V.S.traps).map(t => [t.id, t.hex, t.side, t.source]).sort((a, b) => a[0] - b[0]), [[p1.trap, p1.hex, 'hero', 'power.bear-trap.use'], [p2.trap, p2.hex, 'hero', 'power.bear-trap.use']])
  // the first spring: that trap is gone, the other lies where it was
  const first = battle.events[s1]
  v.seek(s1 + 1)
  assert.deepEqual(drawn(V), [p1.hex, p2.hex].filter(h => h !== first.hex))
  v.seek(s2 + 1)
  assert.deepEqual(drawn(V), [])
  assert.deepEqual(Object.keys(V.S.traps), [])
  v.dispose()
})

test('an enemy side\'s trap is not drawn or announced until it springs', async () => {
  const { createState, fold } = await import('../src/fold.js')
  // the same battle with its traps said to be an enemy side's: they are on the board (the fold keeps them) and not on the page
  const as = { ...battle, events: battle.events.map(e => /^trap\./.test(e.type) ? { ...e, side: 'enemy' } : e) }
  const { v, V, L } = boot(as)
  v.seek(placed[1] + 1)
  assert.equal(Object.keys(V.S.traps).length, 2, 'both are on the board')
  assert.deepEqual(drawn(V), [], 'neither is on the page')
  const S = createState(), ctx = { UD: L.static.units, SN: L.static.statuses }
  const theirs = as.events[placed[0]]
  assert.deepEqual(fold(S, theirs, ctx).filter(c => c.k === 'float'), [], 'no float gives it away')
  assert.equal(S.traps[theirs.trap].side, 'enemy')
  // … and its spring is played like any other
  const cues = fold(S, { ...battle.events[sprung[0]], trap: theirs.trap, hex: theirs.hex, side: 'enemy' }, ctx)
  assert.ok(cues.some(c => c.k === 'float' && c.text === 'TRAP!' && c.hex === theirs.hex))
  assert.equal(S.traps[theirs.trap], undefined)
  v.dispose()
})

test('the fold and the log say the placing and the spring; the fold knows trap.placed, trap.sprung and trap.removed', async () => {
  const { FOLDED_TYPES, createState, fold } = await import('../src/fold.js')
  for (const t of ['trap.placed', 'trap.sprung', 'trap.removed']) assert.ok(FOLDED_TYPES.includes(t), t)
  const { L } = boot(battle)
  const ctx = { UD: L.static.units, SN: L.static.statuses }, S = createState()
  for (const e of battle.events) {
    const cues = fold(S, e, ctx)
    if (e.type === 'trap.placed') assert.ok(cues.some(c => c.k === 'float' && c.text === 'TRAP SET' && c.hex === e.hex))
    if (e.type === 'trap.sprung') assert.ok(cues.some(c => c.k === 'float' && c.text === 'TRAP!' && c.hex === e.hex))
  }
  // a trap nobody entered, taken up when the battle ends: off the board, nothing floated
  fold(S, { type: 'trap.placed', causeId: 'power.bear-trap.use', actor: 0, trap: 7, hex: 3, side: 'hero' }, ctx)
  assert.deepEqual(fold(S, { type: 'trap.removed', causeId: 'battle.end', actor: null, trap: 7, hex: 3, by: 0, side: 'hero', reason: 'battle-end' }, ctx).filter(c => c.k === 'float'), [])
  assert.equal(S.traps[7], undefined)
})

test('a trap nobody entered is taken up when the battle ends: off the board and off the page, before the end is told', () => {
  const left = JSON.parse(readFileSync('battles/test.bear-traps-s1.json', 'utf8'))
  const removed = left.events.map((e, i) => e.type === 'trap.removed' ? i : -1).filter(i => i >= 0)
  assert.equal(removed.length, 1, 'this battle ends with one trap nobody entered')
  const e = left.events[removed[0]], end = left.events.findIndex(x => x.type === 'battle.end')
  assert.deepEqual([e.causeId, e.reason, e.side], ['battle.end', 'battle-end', 'hero']); assert.ok(removed[0] < end)
  const { v, V } = boot(left)
  v.seek(removed[0])
  assert.deepEqual(drawn(V), [e.hex], 'it lay there to the end')
  v.seek(left.events.length)
  assert.deepEqual(drawn(V), []); assert.deepEqual(Object.keys(V.S.traps), [])
  v.dispose()
})
