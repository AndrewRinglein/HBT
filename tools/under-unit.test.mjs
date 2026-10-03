// viewer.under-unit (engine backlog; PLAYABLE-OPENING-PLAN.md item 6; engine DECISIONS.md 2026-09-29 "the playable
// battle screen" and "the playable screen: the acting mark ..."): under each unit its name, a Health bar, a
// Protection bar beneath it and compact status icons (SWITCHES statusUnderUnit) — no Poison or Burn icon, those show
// on the body; Stun shows on the body; Slow only changes the movement number; ring, shadow and chips kept; the acting
// unit carries the glowing disc with its sweep and the bobbing arrow, over its model's head, not the old standee's.
// Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and the page's own modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels } from './character-models.mjs'
import { STAND_OUT } from '../src/stand-out.js'
const A = await modules(), pack = await packCharacterModels()
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const HUE = { poison: '#8ed14f', burn: '#ff9d3c', stun: '#f5d442', slow: '#6fb3df', weak: '#b48ae0' }   // src/theme.js STYLE

function boot(hash) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  if (hash) Object.defineProperty(globalThis, 'location', { value: { hash, protocol: 'file:', href: 'file:///BATTLE-VIEWER.html' + hash }, configurable: true })
  try { new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n])) }
  finally { if (hash) { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location } }
  return w
}
const at = (V, type, pred = () => true) => V.EV.findIndex(e => e.type === type && pred(e))
const px = s => parseFloat(s || 'NaN')
/* battle 1 with the statuses its log does not carry, applied to the Forest Elf (0) just before its first activation */
function withStatuses(rows) {
  const events = structuredClone(battle1.events), i = events.findIndex(e => e.type === 'activation.begin' && e.actor === 0)
  events.splice(i, 0, ...rows.map(([statusId, after], k) => ({ seq: 9000 + k, turn: 1, phase: 'hero', type: 'status.applied', causeId: 'test.under-unit', actor: null, target: 0, statusId, amount: after, before: 0, after })))
  const w = boot('#map.opening.orphanage'); w.__battleView.harness.playExport({ ...battle1, events }, 'under-unit')
  return { w, H: w.__battleView.harness, V: w.__battleView.harness.viewer._V, begin: i + rows.length }
}

test('every unit in battle 1 shows its name, Health and Protection under it; ring and shadow kept', () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, v = H.viewer, V = v._V
  v.seek(at(V, 'unit.enter', e => e.name === 'Zombie 1') + 1); V.render()
  const units = Object.values(V.S.U)
  assert.equal(units.length, 4)
  for (const u of units) {
    const E = V.layers.UEL.get(u.id)
    assert.ok(E.name, `unit ${u.id} has a name under it`); assert.equal(E.name.textContent, u.name)
    assert.notEqual(E.name.style.display, 'none'); assert.ok(px(E.name.style.top) > 0, `${u.name}: the name sits under the feet`)
    assert.ok(px(E.hpbar.style.top) > px(E.name.style.top), `${u.name}: the Health bar under the name`)
    assert.match(E.hpbar.style.transform, /rotate\(90deg\)/, `${u.name}: the Health bar lies across, under the unit`)
    assert.equal(E.hpfill.style.height, Math.round(100 * u.hp / u.maxHp) + '%', 'the Health bar draws the folded HP')
    assert.notEqual(E.fring.style.display, 'none'); assert.notEqual(E.shadow.style.display, 'none')
  }
  H.dispose()
  /* Protection: its own bar, beneath the Health bar */
  const { H: H2, V: V2, begin } = withStatuses([['status.protection', 3]])
  H2.viewer.seek(begin); V2.render()
  const E = V2.layers.UEL.get(0)
  assert.notEqual(E.prot.style.display, 'none'); assert.equal((E.prot.innerHTML.match(/<div /g) || []).length, 3, 'three segments for a pool of 3')
  assert.ok(px(E.prot.style.top) > px(E.hpbar.style.top), 'the Protection bar is beneath the Health bar')
  assert.match(E.prot.style.transform, /rotate\(90deg\)/)
  H2.dispose()
})

test('the icons under a unit: none for Poison, Burn, Stun or Slow; the rest compact under the bars', () => {
  const { H, V, begin } = withStatuses([['status.poison', 2], ['status.burn', 2], ['status.stun', 1], ['status.slow', 2], ['status.weak', 1]])
  H.viewer.seek(begin); V.render()
  const E = V.layers.UEL.get(0), icons = E.badges.innerHTML
  for (const k of ['poison', 'burn', 'stun', 'slow']) assert.ok(!icons.includes(HUE[k]), `no ${k} icon under the unit`)
  assert.ok(icons.includes(HUE.weak), 'Weak is an icon under the unit')
  assert.ok(E.badges.classList.contains('uuIcons'), 'the compact icons')
  assert.ok(px(E.badges.style.top) > px(E.hpbar.style.top), 'the icons under the bars')
  H.dispose()
})

test('a stunned unit shows it on the body; a burning one burns; a poisoned one shows its poison', () => {
  const { H, V, begin } = withStatuses([['status.stun', 1], ['status.burn', 2]])
  H.viewer.seek(begin); V.render()
  const E = V.layers.UEL.get(0)
  assert.ok(E.fx, 'a body-effect layer'); assert.notEqual(E.fx.style.display, 'none')
  assert.ok(E.fx.querySelector('.uuStun'), 'Stun is on the body'); assert.ok(E.fx.querySelectorAll('.uuStar').length >= 3, 'stars circle the head')
  assert.ok(E.fx.querySelector('.uuFire'), 'Burn is on the body'); assert.ok(E.fx.querySelectorAll('.flame').length >= 3, 'it burns')
  assert.equal(E.fx.querySelector('.uuPoison'), null)
  /* the School Teacher, poisoned by a Zombie in the log itself */
  const p = at(V, 'status.applied', e => e.statusId === 'status.poison' && e.after > 0)
  H.viewer.seek(p + 1); V.render()
  const T = V.layers.UEL.get(V.EV[p].target)
  assert.ok(T.fx.querySelector('.uuPoison'), 'Poison is on the body'); assert.ok(!T.badges.innerHTML.includes(HUE.poison))
  /* gone when the status is */
  const gone = at(V, 'status.expired', e => e.statusId === 'status.poison' && e.target === V.EV[p].target)
  if (gone >= 0) { H.viewer.seek(gone + 1); V.render(); assert.equal(T.fx.querySelector('.uuPoison'), null) }
  H.dispose()
})

test('the acting unit carries the glowing disc, its sweep and the bobbing arrow — over its model\'s head', async () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, v = H.viewer, V = v._V
  const scene = new THREE.Scene(), toWorld = A.paintedToCSS(V.data.atlas).invert()
  const standIn = look => { const s = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; s.add(hip); const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
    return { look, scene: s, clips: Object.fromEntries(Object.keys(look.motions).map(k => [k, new THREE.AnimationClip(k, 1, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])])), props: [] } }
  V.cast = A.createCast(V, scene, toWorld, { load: async look => standIn(look), readStyle: el => el.style })
  const i = at(V, 'activation.begin', e => e.actor === 0)
  v.seek(i + 1); V.cast.frame(0); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); V.cast.frame(0); V.render()
  assert.equal(V.S.activeId, 0); assert.ok(V.cast.shows(0))
  const E = V.layers.UEL.get(0)
  assert.notEqual(E.actA.style.display, 'none', 'the glowing disc under its feet'); assert.ok(E.actA.classList.contains('act-a'))
  assert.notEqual(E.actB.style.display, 'none', 'the sweep'); assert.ok(E.actB.classList.contains('act-a2'))
  assert.equal(E.mark.style.display, 'block', 'the bobbing arrow'); assert.ok(E.mark.classList.contains('actMark'))
  /* Law 10 (viewer.size-and-shadows-default, engine DECISIONS.md 2026-10-03 'size and shadows are the default', Andrew: "looks like
     the size change does it ... but we should still have them have shadows" · "yes"): a battle's bodies stand 1.3 / 0.9 of their
     roster stature by default (30% larger on a board shown at 0.9×); the arrow still rides the head.
     was: const head = Math.round(pack['hero.base.ranger-scantily'].looks[0].height * V.data.atlas.toBoard.sx) */
  const head = Math.round(pack['hero.base.ranger-scantily'].looks[0].height * STAND_OUT.BODY / STAND_OUT.BOARD * V.data.atlas.toBoard.sx)
  assert.equal(Math.round(V.cast.heightPx(0)), head, 'the model stands its roster height, at the default size, in board px')
  assert.ok(Math.abs(px(E.mark.style.top) + head + 46) <= 1, `the arrow rides the model's head (${E.mark.style.top}, head ${head}px)`)
  /* the others are not acting */
  for (const [id, O] of V.layers.UEL) if (id !== 0) { assert.equal(O.actA.style.display, 'none'); assert.equal(O.mark.style.display, 'none') }
  H.dispose()
})

test('a battle with no painted scene keeps the beside-the-token bar and the overhead glyphs', () => {
  const w = boot(), H = w.__battleView.harness, v = H.viewer, V = v._V
  assert.ok(!V.data.atlas || V.data.atlas.kind !== 'painted')
  v.seek(Math.min(V.EV.length, 40)); V.render()
  for (const [, E] of V.layers.UEL) {
    if (E.root.style.display === 'none') continue
    assert.ok(!/rotate\(90deg\)/.test(E.hpbar.style.transform || ''), 'the Health bar stands beside the token')
    assert.ok(!E.name || E.name.style.display === 'none', 'no name under the token')
    assert.ok(!E.badges.classList.contains('uuIcons'))
  }
  H.dispose()
})
