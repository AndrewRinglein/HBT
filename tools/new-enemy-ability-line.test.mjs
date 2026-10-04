// viewer.new-enemy-ability-line (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class
// line, no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer
// start'). Andrew: "I think when enemies have new mechanics and appear, there should probably be a notification when that
// enemy is focused on. In that notification there should be something like, \"This enemy can do X.\"" The component's half,
// asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): the "New enemy" notice carries, under the name, the enemy's own
// sentence — the content's row (content/gen/enemies-authored.json `playerLine`, published in content/hbt-content.json and
// dumped with the unit sheets as static.json `unitLines`), never typed in the viewer or the kingdom; a kind with no sentence
// shows its name alone; changing the row changes the page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']
const recording = n => JSON.parse(readFileSync(`battles/test.opening-${n}.json`, 'utf8'))
const lumberjack = recording('lumberjack')
const CONTENT = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8'))
const AUTHORED = JSON.parse(readFileSync('../content/gen/enemies-authored.json', 'utf8'))

function boot(battle, opts = {}, patch = d => d) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = patch({ field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    unitLines: L.static.unitLines,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } })
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L }
}
const at = (EV, type, from = 0, pred = () => true) => EV.findIndex((e, i) => i >= from && e.type === type && pred(e))
/** play until a notice stands; its lines */
function firstNotice(w, v) { for (let n = 0; n < 60000 && !v.overlays.notice; n++) w._flush(16); assert.ok(v.overlays.notice, 'a notice stands'); return v.overlays.notice.lines }
/** battle 2 played to its Turn 2 arrival, the Skeleton Archer handed over as new */
function archerNotice(patch) {
  const { w, v, EV, L } = boot(lumberjack, { newEnemies: ['unit.skeletal-archer'] }, patch)
  v.seek(at(EV, 'encounter.wave', 0, e => e.turn === 2)); v.speed(4); v.play()
  const lines = firstNotice(w, v); v.pause(); v.dispose()
  return { lines, L }
}
/** every enemy kind the six opening recordings field */
const openingKinds = () => [...new Set(OPENING.flatMap(n => recording(n).events.filter(e => e.type === 'unit.enter' && e.side === 'enemy').map(e => e.typeId)))].sort()

test('battle 2\'s "New enemy / Skeleton Archer" notice carries a line beginning "This enemy can" that says it shoots from range', () => {
  const { lines, L } = archerNotice()
  assert.equal(lines.length, 3, 'three lines: ' + JSON.stringify(lines)); assert.deepEqual(lines.slice(0, 2), ['New enemy', 'Skeleton Archer'])
  assert.match(lines[2], /^This enemy can /); assert.match(lines[2], /shoot/i); assert.match(lines[2], /far|distance|range/i)
  assert.equal(lines[2], L.static.unitLines['unit.skeletal-archer'], 'the line is the dumped row');
})

test('every enemy kind of the six opening battles has a sentence, or is listed in the content as having none; each is the content\'s own row', () => {
  const { v, L } = boot(lumberjack); v.dispose()
  const kinds = openingKinds(); assert.ok(kinds.length >= 16, kinds.length + ' enemy kinds in the six opening recordings')
  const published = Object.fromEntries(CONTENT.bestiary.map(r => [r.id, r])), authored = Object.fromEntries(AUTHORED.units.map(r => [r.id, r]))
  const lines = L.static.unitLines; assert.ok(lines && typeof lines === 'object', 'the page carries unitLines')
  let said = 0
  for (const k of kinds) {
    const row = authored[k]; assert.ok(row, k + ' is an authored enemy row'); assert.ok('playerLine' in row, k + ' has a sentence or says it has none (playerLine: null)')
    assert.deepEqual(published[k].playerLine, row.playerLine, k + ': the published content carries the authored row\'s sentence')
    if (row.playerLine === null) { assert.ok(!(k in lines), k + ' has none: nothing dumped'); continue }
    assert.match(row.playerLine, /^This enemy can [a-z].*\.$/, k + ': written "This enemy can …."'); assert.doesNotMatch(row.playerLine, /\d/, k + ': no numbers')
    assert.equal(lines[k], row.playerLine, k + ': the page\'s line is the content\'s row, word for word'); said++
  }
  assert.ok(said >= 14, said + ' kinds have a sentence')
  /* nothing is dumped that the content does not say */
  for (const [k, line] of Object.entries(lines)) assert.equal(published[k] && published[k].playerLine, line, k)
})

test('a kind with no sentence shows its name alone; changing the row changes the page', () => {
  const none = archerNotice(d => ({ ...d, unitLines: Object.fromEntries(Object.entries(d.unitLines).filter(([k]) => k !== 'unit.skeletal-archer')) }))
  assert.deepEqual(none.lines, ['New enemy', 'Skeleton Archer'], 'no sentence: the name alone')
  const absent = archerNotice(d => { const { unitLines, ...rest } = d; return rest })
  assert.deepEqual(absent.lines, ['New enemy', 'Skeleton Archer'], 'a host that hands no lines at all: the name alone')
  const changed = archerNotice(d => ({ ...d, unitLines: { ...d.unitLines, 'unit.skeletal-archer': 'This enemy can be read from its row.' } }))
  assert.deepEqual(changed.lines, ['New enemy', 'Skeleton Archer', 'This enemy can be read from its row.'], 'the row\'s words are what the page shows')
})

test('no "This enemy can" sentence is typed in viewer/src or kingdom/src', () => {
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name])
  for (const root of ['src', '../kingdom/src']) for (const f of walk(root).filter(f => /\.(js|ts|css|html)$/.test(f)))
    assert.ok(!/This enemy can/i.test(readFileSync(f, 'utf8')), f + ' types no such sentence')
  /* nor in the page's own code: the sentences are in its data (the dump), once each */
  const script = html.match(/<script>([\s\S]*)<\/script>\s*$/)[1]
  const count = (script.match(/This enemy can /g) || []).length
  const { v, L } = boot(lumberjack); v.dispose()
  assert.equal(count, Object.keys(L.static.unitLines).length, 'every "This enemy can" in the page is a dumped row')
})
