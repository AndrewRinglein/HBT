// capability.planted-banners (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a feature
// that is needed; his items stay in rewards'). Andrew: "All of those deadlines need to be added in as features that we need."
// The item's words for the page: "The viewer shows the planted banner on its hex and the aura's reach; if there is no banner
// model it shows a stand-in." The component's half, on the library's own battle (battles/test.banner-courage.json — the
// engine's fielding: a warrior plants the Banner of Courage on Turn 1 and then walks away from it): when the engine's
// object.planted is folded a banner stands on that hex and every hex within its radius of THAT hex is tinted; both stay where
// they are for the rest of the battle, wherever the planter goes; the log says the planting, each warded Weak and each
// Surge Chance gained. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'
const battle = JSON.parse(readFileSync('battles/test.banner-courage.json', 'utf8'))

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
const at = battle.events.findIndex(e => e.type === 'object.planted'), planted = battle.events[at]
/** the hexes the reach covers, by the page's own distance — and its rim */
const reachOf = V => { const { distance, POS } = V.data, inside = [], rim = []
  for (let h = 0; h < POS.length; h++) { const d = distance(planted.hex, h); if (d <= planted.radius) inside.push(h); if (d === planted.radius) rim.push(h) }
  return { inside, rim } }
const tinted = V => new Set([...V.layers.AURA.keys()].map(k => +k.split('|')[0]))
const rimmed = V => new Set([...V.layers.AURA.keys()].filter(k => k.endsWith('|e')).map(k => +k.split('|')[0]))

test('the engine\'s battle plants a banner: one object.planted, on the planter\'s hex, with the row it gives', () => {
  assert.ok(at > 0, 'the library battle plants')
  assert.equal(battle.events.filter(e => e.type === 'object.planted').length, 1)
  assert.equal(planted.causeId, 'power.banner-courage.plant')
  assert.deepEqual([planted.side, planted.radius, planted.mods, planted.wards], ['hero', 2, { resist: 1 }, { 'status.weak': 2 }])
})

test('a planted banner stands on its hex and its reach is tinted from that hex; before it is planted there is no banner', () => {
  const { v, V } = boot(battle)
  v.seek(at)
  assert.equal(V.layers.PLANTED ? V.layers.PLANTED.size : 0, 0, 'nothing planted yet')
  /* a unit of this battle may hold an aura of its own (the Necromancer's): what is tinted before the planting is not the banner's */
  const before = V.layers.AURA ? tinted(V) : new Set()
  v.seek(at + 1)
  assert.deepEqual(Object.values(V.S.planted).map(p => [p.id, p.hex, p.side, p.radius, p.source, p.by]), [[planted.object, planted.hex, 'hero', 2, 'power.banner-courage.plant', planted.actor]])
  const node = V.layers.PLANTED.get(planted.object)
  assert.ok(node, 'the banner is drawn')
  assert.equal(node.dataset.planted, String(planted.object)); assert.equal(node.dataset.hex, String(planted.hex))
  assert.equal(node.children.length, 2, 'the stand-in: a pole and a pennant, no borrowed art')
  assert.equal(node.querySelector('img'), null)
  const { inside, rim } = reachOf(V)
  assert.equal(inside.length > rim.length && rim.length > 0, true)
  const now = tinted(V), added = [...now].filter(h => !before.has(h))
  assert.deepEqual(inside.filter(h => !now.has(h)), [], 'every hex within its radius of the banner\'s hex is tinted')
  assert.equal(added.length > 0, true, 'the planting tinted hexes that were not')
  assert.deepEqual(added.filter(h => !inside.includes(h)), [], 'and none beyond its radius')
  assert.deepEqual(rim.filter(h => !before.has(h) && !rimmed(V).has(h)), [], 'the rim is the hexes at exactly its radius')
  v.dispose()
})

test('the planter walks away and the banner and its reach stay where they were, to the end of the battle', () => {
  const { v, V } = boot(battle)
  v.seek(at + 1)
  const node = V.layers.PLANTED.get(planted.object), { inside } = reachOf(V)
  v.seek(battle.events.length)
  assert.notEqual(V.S.U[planted.actor].hex, planted.hex, 'the planter has left the hex')
  assert.equal(V.layers.PLANTED.size, 1)
  assert.equal(V.layers.PLANTED.get(planted.object), node, 'the same banner, not redrawn')
  assert.equal(V.S.planted[planted.object].hex, planted.hex)
  assert.deepEqual(inside.filter(h => !tinted(V).has(h)), [], 'the reach has not moved with the planter: every hex of it is still tinted')
  v.dispose()
})

test('the fold and the log say the planting, the Weak that did not land and the Surge Chance gained, each with the engine\'s own numbers', async () => {
  const { FOLDED_TYPES, createState, fold } = await import('../src/fold.js')
  for (const t of ['object.planted', 'status.warded', 'surge.gained']) assert.ok(FOLDED_TYPES.includes(t), t)
  const { L } = boot(battle)
  const ctx = { UD: L.static.units, SN: L.static.statuses }, S = createState()
  let warded = null, gained = null
  for (const e of battle.events) {
    const cues = fold(S, e, ctx)
    if (e.type === 'object.planted') assert.ok(cues.some(c => c.k === 'float' && c.text === 'PLANTED' && c.hex === e.hex))
    if (e.type === 'status.warded' && !warded) { warded = e
      const f = cues.find(c => c.k === 'float'); assert.ok(f, 'a warded status floats over the unit')
      /* Restated 2026-10-06 (engine item content.resistance-to-weak-and-vigil-party-spirit; ruled 2026-10-05, GLOSSARY.md
         'Resistance to Weak'): the word changed, the number is the same line's. It was:
           assert.match(f.text, /WEAK WARDED −\d+$/i) */
      assert.match(f.text, /^RESISTANCE TO WEAK −\d+$/); assert.equal(f.n, e.amount); assert.equal(f.of, 'amount') }
    if (e.type === 'surge.gained' && !gained) { gained = e
      const f = cues.find(c => c.k === 'float'); assert.ok(f)
      assert.equal(f.text, 'SURGE CHANCE +' + e.amount); assert.equal(f.n, e.amount); assert.equal(S.U[e.target].surgeChance, e.after) }
  }
  assert.ok(warded, 'the battle wards a Weak'); assert.ok(gained, 'the battle gives Surge Chance')
})
