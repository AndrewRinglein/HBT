// viewer.plates-and-banners-sit-low (engine backlog; engine DECISIONS.md 2026-10-06 'the Deathbed notification and the others sit
// low, near the bottom of the screen'). Andrew: "The deathbed fighting notification and maybe other notifications are still
// happening too close to the center of the screen. Push it down closer to the bottom of the screen."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): every notification the battle screen shows of
// its own accord — a phase or wave banner, the Deathbed plate, an injury plate — is put in the notices' ONE place, the stack in
// the board's frame just above the action bar (#noticeStack), a newcomer above the ones before it; its words, its time and its
// look are what they were; the dimmed screen under the Deathbed plate is where it was. Where on the screen the stack stands
// is measured in a real browser: kingdom tools/plates-and-banners-sit-low.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8')), EV = battle.events
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ''
const rule = sel => { const at = css.indexOf('\n' + sel + '{'); assert.ok(at >= 0, 'the stylesheet has ' + sel); return css.slice(at, css.indexOf('}', at)) }

function boot() {
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
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'battle.begin') + 1)
  const V = v._V, wrap = V.dom.stage.parentNode, stack = V.dom.root.querySelector('#noticeStack')
  return { w, v, V, wrap, stack }
}
const classes = n => String(n.className).split(/\s+/)
const hero = V => Object.values(V.S.U).find(u => u.side === 'hero').id

test('the stack is the notices\' one place: in the board\'s frame, its foot just above the frame\'s bottom edge, drawn over the Deathbed veil', () => {
  const { wrap, stack, v } = boot()
  assert.ok(stack && stack.parentNode === wrap, 'the stack is in the board\'s frame')
  assert.match(rule('#noticeStack'), /position:\s*absolute/); assert.match(rule('#noticeStack'), /bottom:\s*36px/)
  const z = s => Number((s.match(/z-index:\s*(\d+)/) || [])[1]); assert.ok(z(rule('#noticeStack')) > z(rule('.dbModal')), 'the stack is over the veil, so the plate\'s words stay bright')
  v.dispose()
})

test('a banner — the Hero Phase, a wave — stands in the stack above the notices already there, one at a time, for its 1.65 s, with its words and its lettering', () => {
  const { w, v, V, wrap, stack } = boot()
  V.playCues([{ k: 'banner', kind: 'phase', text: 'Hero Phase', sub: 'your heroes act' }])
  let b = wrap.querySelector('.banner'); assert.ok(b, 'the banner'); assert.equal(b.parentNode, stack, 'in the notices\' stack'); assert.equal(stack.children[0], b, 'above what was there')
  assert.ok(classes(b).includes('phase') && classes(b).includes('hbtNotice')); assert.equal(b.querySelector('b').textContent, 'Hero Phase'); assert.equal(b.querySelector('span').textContent, 'your heroes act')
  assert.doesNotMatch(rule('.banner'), /top:\s*18px|position:\s*absolute|left:\s*50%/, 'it no longer stands under the top of the board')
  V.playCues([{ k: 'banner', kind: 'wave', text: 'A wave arrives', sub: 'Zombie' }])
  assert.equal(wrap.querySelectorAll('.banner').length, 1, 'one banner at a time, as before'); b = wrap.querySelector('.banner'); assert.ok(classes(b).includes('wave')); assert.equal(b.parentNode, stack)
  w._flush(1500); assert.ok(wrap.querySelector('.banner'), 'still up at 1.5 s'); w._flush(300); assert.equal(wrap.querySelector('.banner'), null, 'gone by 1.8 s, as before')
  v.dispose()
})

test('the Deathbed plate stands in the stack through its two stages; the dimmed screen is where it was, over the whole board; both go together', () => {
  const { w, v, V, wrap, stack } = boot(), id = hero(V)
  V.playCues([{ k: 'deathbed', id, result: 'stood', n: 12, chance: 40 }])
  const m = wrap.querySelector('.dbModal'), plate = wrap.querySelector('.dbPlate')
  assert.ok(m && m.parentNode === wrap && m.querySelector('.dbVeil'), 'the veil over the board, as before'); assert.equal(m.querySelector('.dbPlate'), null, 'the plate is no longer in the middle of it')
  assert.ok(plate && plate.parentNode === stack && stack.children[0] === plate, 'the plate is in the notices\' stack'); assert.ok(classes(plate).includes('hbtNotice'))
  assert.match(plate.innerHTML, /UNIT DOWNED/); assert.match(plate.innerHTML, /rolled <b>12<\/b> vs 40/)
  w._flush(1150); assert.match(plate.innerHTML, /This hero fights on\./, 'its second stage at 1.1 s, as before'); assert.equal(plate.parentNode, stack)
  w._flush(1500); assert.equal(wrap.querySelector('.dbModal'), null); assert.equal(wrap.querySelector('.dbPlate'), null, 'the veil and the plate leave together at 2.6 s')
  v.dispose()
})

test('an injury plate stands in the stack, not over its unit; two notifications up at once are two rows of the one stack, the newer above', () => {
  const { v, V, wrap, stack } = boot(), id = hero(V)
  V.playCues([{ k: 'banner', kind: 'wave', text: 'A wave arrives', sub: 'Zombie' }, { k: 'injury', id, name: 'Broken Arm' }])
  const inj = wrap.querySelector('.injPlate'), b = wrap.querySelector('.banner')
  assert.ok(inj && inj.parentNode === stack, 'the injury plate is in the stack'); assert.match(inj.textContent, /Broken Arm/); assert.ok(classes(inj).includes('hbtNotice'))
  assert.ok(b && b.parentNode === stack); assert.notEqual(inj, b)
  assert.ok(stack.children.indexOf(inj) < stack.children.indexOf(b), 'the newer one is above the older');
  assert.ok(stack.children.indexOf(b) < stack.children.indexOf(V.dom.root.querySelector('#playNote')), 'and both above the notices that were there')
  assert.doesNotMatch(rule('.injPlate'), /position:\s*absolute/)
  v.dispose()
})

test('what the player asked for with the pointer and what belongs to a unit are not moved: the hex tooltip and the floating words keep their rules', () => {
  assert.match(css, /#hexTip\{[^}]*position:\s*(absolute|fixed)/, 'the hex tooltip is placed at the pointer still')
  assert.match(rule('#playAsk,#playSwitch,#playGear'), /align-items:\s*center/, 'a question with buttons keeps its place')
  assert.match(rule('#afflPop'), /align-items:\s*center/, 'the affliction pop-up — a held screen with a Continue button — keeps its place (viewer SWITCHES lowAfflictionPopUpStays)')
})
