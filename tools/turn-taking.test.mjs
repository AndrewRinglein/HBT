// viewer.turn-taking (engine backlog; engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed',
// 'the action bar and its card stay with the activated unit', 'the battle screen's turn-taking, ruled'). Andrew: "This whole
// system is really glitchy and confusing ... I couldn't figure out whose turn it was." The component's half, asked of the page
// (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage: one acting mark, gone when its Activation ends; the Hero Phase opens
// with a banner and nothing of the Enemy Phase left on the board (its hit chance); for a host that plays, the action bar, the
// stamina strip and the card beside the bar stay with the activated hero while a click on another unit shows it in the panel
// only, and the camera does not go to it; the top bar is heroes | a divider | enemies; the host may take back an Activation
// that did nothing (rewind). The host's half — who begins, the move armed, the path, the refusals — is the kingdom's
// (kingdom test/turn-taking.test.ts, tools/turn-taking.verify.mjs).
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
  const seen = [], v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, seen, html }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const at = (type, from = 0, pred = () => true) => EV.findIndex((e, i) => i >= from && e.type === type && pred(e))
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
const nowChips = V => V.dom.rail.querySelectorAll('.railchip').filter(c => c.className.split(' ').includes('now')).map(c => +c.dataset.i)

test('one acting mark: the hero acting alone carries it, and it is gone when its Activation ends', () => {
  const { v, V } = boot()
  const begin = at('activation.begin', 0, e => e.phase === 'hero'), actor = EV[begin].actor
  v.seek(begin + 1)
  assert.equal(V.S.activeId, actor)
  assert.deepEqual(nowChips(V), [actor], 'the top bar lights the one acting, alone')
  assert.equal(V.layers.UEL.get(actor).mark.style.display, 'block', 'its mark on the map')
  const end = at('activation.end', begin, e => e.actor === actor); v.seek(end + 1)
  assert.equal(V.S.activeId, null, 'the Activation ended: nobody is acting')
  assert.deepEqual(nowChips(V), [], 'no card is lit as acting')
  for (const [id, E] of V.layers.UEL) assert.notEqual(E.mark.style.display, 'block', `unit ${id} still carries the acting mark`)
  assert.ok(V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === actor).className.includes(' done'), 'its card greys as acted')
  v.dispose()
})

test('the Hero Phase opens with its banner and nothing of the Enemy Phase on the board: no enemy hit chance remains', () => {
  const { w, v, V } = boot()
  const atk = at('attack.declared', 0, e => e.phase === 'enemy'), hero = at('phase.begin', atk, e => e.phase === 'hero')
  assert.ok(atk > 0 && hero > atk, 'the battle has an enemy attack before a Hero Phase')
  v.seek(atk + 1)
  assert.ok(V.S.AIM && V.S.AIM.hit != null, 'the enemy\'s hit chance is on the board while it attacks')
  v.seek(hero); V.S.AIM = { ...V.S.AIM ?? { from: 0, to: 0, hit: 50 }, missed: { roll: 99 } }   /* a miss line the pump never expired (it ran dry) */
  v.step()
  assert.equal(V.S.AIM, null, 'the Hero Phase cleared the enemy\'s hit chance')
  assert.equal(V.S.ATTACK, null); assert.equal(V.S.AOO, null)
  const wrap = V.dom.stage.parentNode, b = wrap.querySelector('.banner')
  assert.ok(b && /Hero Phase/.test(b.innerHTML), 'a Hero Phase banner')
  w._flush(2500); assert.equal(wrap.querySelector('.banner'), null, 'and it leaves')
  v.dispose()
})

test('for a host that plays, the bar, the stamina and the card stay with the activated hero; a click on another unit shows it in the panel only', () => {
  const seen = [], { v, V } = boot({ onPlay: e => { seen.push(e); return true } })
  const begin = at('activation.begin', 0, e => e.phase === 'hero'), actor = EV[begin].actor
  v.seek(begin + 1); v.setPlay(facts(actor))
  const bar = () => V.dom.actionbar.innerHTML, card = () => V.dom.root.querySelector('#unitPortrait img').getAttribute('src')
  const bar0 = bar(), card0 = card(), cam0 = { ...V.view.camF }
  const enemy = Object.values(V.S.U).find(u => u.side === 'enemy' && u.life === 'standing')
  fire(V.layers.UEL.get(enemy.id).img, 'click')
  assert.equal(V.view.inspectId, enemy.id, 'the panel is the enemy\'s')
  assert.ok(V.dom.panel.innerHTML.includes(enemy.name), 'its name in the right-hand panel')
  assert.equal(bar(), bar0, 'the action bar stays the hero\'s')
  assert.equal(card(), card0, 'the card beside the bar stays the hero\'s')
  assert.equal(card(), V.data.ASSETS[V.data.ARTMAP[V.S.U[actor].typeId].card])
  assert.deepEqual(V.view.camF, cam0, 'the camera does not go to the unit looked at')
  const other = Object.values(V.S.U).find(u => u.side === 'hero' && u.id !== actor && u.life === 'standing')
  fire(V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === other.id), 'click')
  assert.equal(V.view.inspectId, other.id); assert.equal(bar(), bar0, 'another hero clicked: the bar is still the acting hero\'s')
  /* a row clicked on the bar is the acting hero's order, whoever is in the panel */
  const row = V.dom.actionbar.querySelectorAll('.acRow').find(r => r.dataset.act)
  seen.length = 0; fire(row, 'click'); assert.deepEqual(seen.at(-1), { kind: 'slot', actionId: row.dataset.act, unit: actor })
  v.dispose()
})

test('the standalone page keeps the bar on whoever is looked at (no host acts there)', () => {
  const { v, V } = boot()
  v.seek(at('activation.begin', 0, e => e.phase === 'hero') + 1)
  const enemy = Object.values(V.S.U).find(u => u.side === 'enemy' && u.life === 'standing')
  v.inspect(enemy.id)
  assert.equal(V.dom.root.querySelector('#unitPortrait img').getAttribute('src'), V.data.ASSETS[V.data.ARTMAP[enemy.typeId].card], 'the replay\'s card follows the click')
  v.dispose()
})

test('the top bar is the heroes, a clear divider, then the enemies', () => {
  const { v, V } = boot()
  v.seek(at('activation.begin', 0, e => e.phase === 'enemy') + 1)
  const kids = V.dom.rail.children.map(c => c.className.split(' ')[0] === 'railsep' ? '|' : c.className.split(' ')[1])
  const cut = kids.indexOf('|')
  assert.equal(kids.filter(k => k === '|').length, 1, 'one divider')
  assert.ok(cut > 0 && kids.slice(0, cut).every(k => k === 'hero'), 'heroes (civilians with them) left of it: ' + kids.join(' '))
  assert.ok(kids.slice(cut + 1).length > 0 && kids.slice(cut + 1).every(k => k !== 'hero'), 'enemies right of it: ' + kids.join(' '))
  const heroIds = V.dom.rail.querySelectorAll('.railchip.hero').map(c => +c.dataset.i)
  assert.deepEqual(heroIds, [...heroIds].sort((a, b) => a - b), 'heroes left to right in the board\'s order')
  v.dispose()
})

test('the host may take back an Activation that did nothing: the log is cut back and the board is what it was', () => {
  const { v, V } = boot({ onPlay: () => true })
  const begin = at('activation.begin', 0, e => e.phase === 'hero')
  v.seek(begin); const before = JSON.stringify(V.S)
  v.seek(begin + 1); assert.notEqual(V.S.activeId, null)
  v.rewind(begin)
  assert.equal(V.EV.length, begin); assert.equal(V.cursor, begin)
  assert.equal(JSON.stringify(V.S), before, 'the state before the Activation began')
  assert.throws(() => v.rewind(begin + 5), /rewind/)
  v.dispose()
})
