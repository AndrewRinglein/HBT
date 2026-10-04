// viewer.panel-area-trigger-text (engine backlog; engine DECISIONS.md 2026-10-04 'the Poison Imp, the Balrog and the four
// caster-centred class powers skip their owner too', its last line: the unit panel prints an area trigger's target as
// "[object Object]"). Found landing fix.fire-imp-burn-spares-self: a trigger's target is either a word ('self', 'target') or the
// engine's Targeting row (core/target.ts: select, side, radius, origin, requireTags, excludeSelf), and the panel printed the row
// as a string. The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): the panel says an area trigger's
// target in words made of the row's own fields — the Fire Imp's end-of-Activation Burn reads 'every other unit within 2 hexes'
// (the engine's own phrase, core/target.ts excludeSelf) — and no opening unit's panel, action bar or log line carries
// '[object Object]'. The sandbox's half is kingdom tools/panel-area-trigger-text.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { buildLog } from '../src/log.js'
const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']
const battle = name => JSON.parse(readFileSync(`battles/test.opening-${name}.json`, 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))

function page() {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView; B.harness.dispose()
  return { w, B, L: B.lib }
}
/** mount one battle on the page, every event folded (every unit that ever enters is on the board's roster) */
function mount({ w, B, L }, b) {
  const EV = b.events, mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: b.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false })
  v.push(EV); v.seek(EV.length)
  return { v, V: v._V, EV }
}
const text = x => String(x ?? '').replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
/** the panel's trigger rows under one hook label, as text */
const triggerRows = V => text(V.dom.panel.innerHTML.slice(V.dom.panel.innerHTML.indexOf('Triggers')))
const areaTriggers = typeId => (STATIC.units[typeId].triggers || []).filter(t => t.select && typeof t.select === 'object')

test('the Fire Imp at the Bridge: its end-of-Activation Burn names its target in words — every other unit within 2 hexes', () => {
  const P = page(), { v, V } = mount(P, battle('bridge'))
  const imp = Object.values(V.S.U).find(u => u.typeId === 'unit.fire-imp'); assert.ok(imp, 'the Bridge fields a Fire Imp')
  const t = areaTriggers('unit.fire-imp'); assert.equal(t.length, 1, 'one area trigger on its sheet')
  assert.deepEqual(t[0].select, { select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true }, 'the engine\'s row: an area of 2 round itself, itself left out')
  v.inspect(imp.id)
  const rows = triggerRows(V)
  assert.match(rows, /ACTIVATION END/); assert.match(rows, /Burn 1 → every other unit within 2 hexes/, rows)
  assert.ok(!V.dom.panel.innerHTML.includes('[object Object]'), 'no object printed as a string')
  /* its other trigger — Blast's Burn on the unit it hit — still names no target of its own */
  assert.match(rows, /ON HIT Burn 3(?! →)/, rows)
  v.dispose()
})

test('every unit of the six opening battles: no panel, action bar or log line shows [object Object]', () => {
  const P = page(), seen = new Set(), wanted = new Set()
  for (const name of OPENING) {
    const b = battle(name), { v, V, EV } = mount(P, b)
    for (const e of EV) if (e.type === 'unit.enter') wanted.add(e.typeId)
    for (const u of Object.values(V.S.U)) {
      v.inspect(u.id)
      for (const [what, node] of [['panel', V.dom.panel], ['action bar', V.dom.actionbar]]) {
        if (!node) continue
        assert.ok(!node.innerHTML.includes('[object Object]'), `${name}: ${u.name} (${u.typeId}) — the ${what} prints an object as a string: ${text(node.innerHTML).match(/.{0,60}\[object Object\].{0,30}/)}`)
      }
      /* an area trigger on its sheet is said in words in the panel */
      for (const t of areaTriggers(u.typeId)) assert.match(triggerRows(V), /→ (every|one) /, `${u.typeId} ${t.id}: its target in words`)
      seen.add(u.typeId)
    }
    assert.ok(!text(P.w.document.body.innerHTML).includes('[object Object]'), `${name}: nothing on the page prints an object as a string`)
    /* the log's sentences (the harness draws them from src/log.js buildLog): one per event, none with an object in it */
    const lines = buildLog(EV, STATIC.statuses, 0); assert.ok(lines.length > 100)
    for (const l of lines) assert.ok(!l.t.includes('[object Object]'), `${name}: the log line for event ${l.i} prints an object as a string: ${text(l.t)}`)
    /* the Gates' Bruiser Demon: its Protection is the engine's scaling rule (a share of the enemy side's Power), said as the rule */
    const bruiser = Object.values(V.S.U).find(u => u.typeId === 'unit.bruiser-demon')
    if (bruiser) {
      v.inspect(bruiser.id)
      assert.deepEqual(STATIC.units['unit.bruiser-demon'].triggers[0].effect.value, { scale: 'power', base: 0, mult: 0.334 })
      assert.match(triggerRows(V), /ACTIVATION END Protection 0\.334 × Power on self/, triggerRows(V))
    }
    v.dispose()
  }
  assert.deepEqual([...seen].sort(), [...wanted].sort(), 'every unit type the six battles field was read')
  for (const id of ['unit.fire-imp', 'unit.poison-imp', 'unit.necromancer', 'unit.lieutenant-demon', 'unit.bruiser-demon']) assert.ok(seen.has(id), id + ' — the opening\'s units with an area trigger or a scaled amount')
})

test('every area target the engine\'s sheets hold is worded from its own fields (the panel\'s own namer, src/actions.js targetWords)', async () => {
  const { targetWords: words, effectWord, valueWords } = await import('../src/actions.js')
  assert.equal(typeof words, 'function', 'src/actions.js exports targetWords'); assert.equal(typeof valueWords, 'function', 'src/actions.js exports valueWords')
  const all = new Map()
  for (const [typeId, d] of Object.entries(STATIC.units)) for (const t of d.triggers || []) all.set(JSON.stringify(t.select), typeId)
  assert.ok(all.size >= 7, 'the shapes on the sheets today')
  for (const [k] of all) { const s = words(JSON.parse(k)); assert.equal(typeof s, 'string'); assert.ok(!/object|undefined|null|NaN/.test(s), `${k} -> "${s}"`) }
  assert.equal(words('self'), 'self'); assert.equal(words('target'), 'the target')
  assert.equal(words({ select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true }), 'every other unit within 2 hexes')
  assert.equal(words({ select: 'area', side: 'any', radius: 2, origin: 'self' }), 'every unit within 2 hexes')
  assert.equal(words({ select: 'area', side: 'ally', radius: 4, origin: 'self', requireTags: ['demon'] }), 'every demon ally within 4 hexes')
  assert.equal(words({ select: 'area', side: 'enemy', radius: 1, origin: 'target' }), 'every enemy within 1 hex of the target')
  assert.equal(words({ select: 'area', side: 'ally', excludeSelf: true }), 'every other ally')
  assert.equal(words({ select: 'unit', side: 'enemy', requireTags: ['undead'] }), 'one undead enemy')
  assert.equal(words({ select: 'self', side: 'any' }), 'self')
  /* how much: a number stays a number; the engine's scaling rule (core/trigger.ts ValueSpec) is said, never worked out */
  let scaled = 0
  for (const [typeId, d] of Object.entries(STATIC.units)) for (const t of d.triggers || []) {
    const w = effectWord(t.effect, { BADGES: STATIC.badges, LAYERS: STATIC.layers }, STATIC.statuses)
    assert.ok(w && typeof w.word === 'string', `${typeId} ${t.id}`); assert.ok(w.val == null || typeof w.val !== 'object', `${typeId} ${t.id}: its amount is words, not an object`)
    if (typeof t.effect.value === 'object' || typeof t.effect.amount === 'object') scaled++
  }
  assert.ok(scaled >= 4, 'the sheets hold scaled amounts (the Bone Dragon, the Bruiser Demon, the Doombringer, the Terror Imp)')
  assert.equal(valueWords(3), 3); assert.equal(valueWords({ scale: 'power', base: 0, mult: 0.334 }), '0.334 × Power')
  assert.equal(valueWords({ scale: 'stat', stat: 'armor', base: 4 }), '4 + ARMOR'); assert.equal(valueWords({ scale: 'partyMagic', div: 2, round: 'up' }), 'party Magic ÷ 2 (rounded up)')
  assert.throws(() => valueWords({ scale: 'moon' }), /unknown value scale/)
  /* a shape the engine adds and the viewer has not been taught is a finding, never a guess (Law 1) */
  assert.throws(() => words({ select: 'cone', side: 'any' }), /unknown target/)
})
