// viewer.area-fall-warning (engine backlog; engine DECISIONS.md 2026-10-03 'the opening replays show the heroes winning; one
// recording of each; the fall warnings are drawn': asked whether to file a viewer item that draws the meteor and curse
// warning areas on the board — Andrew: "Two, yes."). The engine's fall (encounter.area-fall) writes area.marked (fall, lands,
// areas: seven areas of seven hexes, layer) at the end of an Enemy Phase and area.landed (areas, hit, layer) after the next
// Hero Phase. The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the engine's own recordings
// of the Cavern Trail (the meteor fall) and the Gates (the curse strike): the fold holds the marked areas from the mark
// until they land, the board draws every marked hex in the hue of what will land, the log says the mark and the landing,
// neither event is on verify's ignore list, and a seek into the marked span shows what stepping there shows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { buildLog } from '../src/log.js'
import { shownName } from '../src/names.js'
import { FOLDED_TYPES, createState, fold, foldTo } from '../src/fold.js'
import { layerHue } from '../src/theme.js'
const RECORDINGS = { 'the Cavern Trail': JSON.parse(readFileSync('battles/test.opening-cavern-trail.json', 'utf8')), 'the Gates': JSON.parse(readFileSync('battles/test.opening-gates.json', 'utf8')) }
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')

function boot(battle, opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const EV = battle.events, mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    layerStatus: L.static.layerStatus, terrainApplies: L.static.terrainApplies,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, L, EV }
}
const marks = V => V.dom.stage.querySelectorAll('.fallMark')
const markedHexes = V => marks(V).map(n => +n.dataset.hex).sort((a, b) => a - b)
const uniq = areas => [...new Set(areas.flat())].sort((a, b) => a - b)
const span = EV => ({ mark: EV.findIndex(e => e.type === 'area.marked'), land: EV.findIndex(e => e.type === 'area.landed') })

for (const [name, battle] of Object.entries(RECORDINGS)) {
  test(`${name}: the seven marked areas are on the board from the event that marks them until they land`, () => {
    const { v, V, L, EV } = boot(battle), { mark, land } = span(EV), M = EV[mark]
    assert.ok(mark > 0 && land > mark, 'the recording marks a fall and lands it'); assert.equal(M.areas.length, 7); assert.ok(M.areas.every(a => a.length === 7))
    const hexes = uniq(M.areas)
    /* before the mark: nothing */
    v.seek(mark); assert.deepEqual(V.S.falls, []); assert.equal(marks(V).length, 0, 'no mark is drawn before the areas are marked')
    /* from the mark: the fold holds the fall as the event states it, and the board draws each marked hex once */
    v.seek(mark + 1)
    assert.deepEqual(V.S.falls, [{ fall: M.fall, lands: M.lands, layer: M.layer, areas: M.areas }], 'the fold holds the fall, its landing Turn, its layer and its areas — all the event\'s')
    assert.deepEqual(markedHexes(V), hexes, 'every marked hex is drawn, once')
    for (const n of marks(V)) { const p = V.data.POS[+n.dataset.hex]
      assert.equal(n.dataset.fall, M.fall); assert.equal(n.dataset.lands, String(M.lands))
      assert.ok(Math.abs(parseFloat(n.style.left) - (p.px - V.data.LAYOUT.W / 2)) < 1 && Math.abs(parseFloat(n.style.top) - (p.py - V.data.LAYOUT.H / 2)) < 1, 'the mark lies on its hex') }
    /* each area's own centre (the first hex the engine names) is told apart */
    assert.deepEqual(marks(V).filter(n => n.className.split(' ').includes('fallCentre')).map(n => +n.dataset.hex).sort((a, b) => a - b), [...new Set(M.areas.map(a => a[0]))].sort((a, b) => a - b))
    /* it wears the hue of what will land: the status the falling layer applies (the engine's layerStatus) */
    const status = L.static.layerStatus[M.layer]; assert.ok(status, M.layer + ' applies a status')
    for (const n of marks(V)) assert.equal(n.dataset.hue, layerHue(M.layer, L.static.layerStatus), 'the hue of ' + status)
    /* through the whole marked span, at every Turn and Phase line: the same marks, still drawn */
    const inside = EV.map((e, i) => i > mark && i < land && (e.type === 'turn.begin' || e.type === 'phase.begin' || e.type === 'activation.begin') ? i : -1).filter(i => i >= 0)
    assert.ok(inside.length >= 3)
    for (const i of inside) { v.seek(i + 1); assert.deepEqual(markedHexes(V), hexes, 'event ' + i + ': the marks stand') }
    /* they land: the marks go, and what landed is on the ground (the engine's layer.painted lines that follow) */
    v.seek(land); assert.deepEqual(markedHexes(V), hexes, 'still marked just before they land')
    v.seek(land + 1); assert.deepEqual(V.S.falls, []); assert.equal(marks(V).length, 0, 'landed: the marks are gone')
    let k = land + 1; while (EV[k] && EV[k].type === 'layer.painted') k++
    v.seek(k); const layerNo = +Object.keys(L.static.layers).find(n => L.static.layers[n] === M.layer)
    for (const h of hexes) assert.equal(V.S.layers[h], layerNo, 'hex ' + h + ' wears what landed')
    v.dispose()
  })

  test(`${name}: a seek into the marked span shows the same marks as stepping there; the fold alone says the same`, () => {
    const { v, V, EV } = boot(battle), { mark, land } = span(EV)
    const mid = mark + Math.floor((land - mark) / 2)
    v.seek(mark - 3); while (v.cursor < mid) v.step()
    v.render(); const stepped = { falls: structuredClone(V.S.falls), hexes: markedHexes(V) }
    assert.ok(stepped.hexes.length > 0)
    v.seek(mid); assert.deepEqual({ falls: V.S.falls, hexes: markedHexes(V) }, stepped, 'seek to N equals stepping to N')
    /* and on over the landing */
    while (v.cursor <= land) v.step()
    v.render(); assert.equal(marks(V).length, 0); assert.deepEqual(V.S.falls, [])
    /* the pure fold, with no page: folding one event at a time equals foldTo */
    const ctx = { UD: {}, SN: {} }, S = createState()
    for (let i = 0; i < mid; i++) fold(S, EV[i], ctx, 0)
    assert.deepEqual(S.falls, foldTo(EV, mid, ctx).falls); assert.deepEqual(S.falls, stepped.falls)
    v.dispose()
  })

  test(`${name}: the log says when the areas are marked and when they land`, () => {
    const EV = battle.events, { mark, land } = span(EV), M = EV[mark], lines = buildLog(EV, {}, 0)
    const said = i => lines.find(l => l.i === i)
    assert.ok(said(mark), 'a sentence for the mark'); assert.ok(said(land), 'a sentence for the landing')
    const word = M.fall.split('.').pop().replace(/-/g, ' ')
    assert.match(said(mark).t, new RegExp(word, 'i'), 'it names the fall'); assert.match(said(mark).t, /7 areas/); assert.match(said(mark).t, /marked/i)
    assert.match(said(mark).t, new RegExp('Turn ' + M.lands + '\\b'), 'and the Turn the event says it lands')
    assert.match(said(land).t, new RegExp(word, 'i')); assert.match(said(land).t, /lands/i)
    const names = Object.fromEntries(EV.filter(e => e.type === 'unit.enter').map(e => [e.actor, e.name]))
    /* Restated 2026-10-06 (engine items rule.surge-is-at-least-level and rule.special-moves-unlock-at-level-two; engine DECISIONS.md 2026-10-06 'everyone gains Surge equal to its level at the least …', 'a hero's special moves unlock at level 2, ruled …'): the
       six recordings are other battles now, and in the Cavern Trail's the meteors strike a hero for the first time - until now
       no recording's fall struck anyone, so this line had nothing to check. The log names a unit as the board does, the
       engine's name less its mark (viewer.unit-names-no-letters-or-numbers: "Skullplate Veteran", not "Skullplate Veteran A");
       the line asked for the engine's name whole. It was:
         for (const id of EV[land].hit) assert.ok(said(land).t.includes(names[id]), 'it names ' + names[id] + ', whom the engine says it struck') */
    for (const id of EV[land].hit) assert.ok(said(land).t.includes('<b>' + shownName(names[id]) + '</b>'), 'it names ' + shownName(names[id]) + ', whom the engine says it struck')
    assert.ok(!/\[object|undefined|NaN/.test(said(mark).t + said(land).t))
  })
}

test('both events are folded, not ignored: verify\'s ignore list no longer names them, and the pump gives each a beat', () => {
  assert.ok(FOLDED_TYPES.includes('area.marked') && FOLDED_TYPES.includes('area.landed'), 'the fold knows both')
  const verify = readFileSync('tools/verify.mjs', 'utf8'), list = verify.match(/const IGNORED = new Set\(\[([\s\S]*?)\]\)/)[1]
  assert.ok(!/'area\.marked'|'area\.landed'/.test(list), 'verify.mjs\'s ignore list names neither')
  /* the pump's own table (src/viewer.js DUR; verify.mjs holds it against the fold's list) gives each a beat */
  const pump = readFileSync('src/viewer.js', 'utf8')
  for (const t of ['area.marked', 'area.landed']) { const at = pump.indexOf("'" + t + "': "); assert.ok(at > 0 && parseInt(pump.slice(at + t.length + 4), 10) > 0, t + ' holds a beat') }
})

test('played, not stepped: the mark is drawn as its beat plays, with a banner that names the fall; two falls marked at once are both held', () => {
  const { w, v, V, EV } = boot(RECORDINGS['the Cavern Trail']), { mark } = span(EV), M = EV[mark]
  v.seek(mark); v.play(); w._flush(40)
  assert.deepEqual(markedHexes(V), uniq(M.areas), 'the marks are on the board as the mark\'s beat plays')
  const b = V.dom.stage.parentNode.querySelector('.banner'); assert.ok(b, 'a banner says it'); assert.match(b.textContent, /meteor fall/i)
  assert.equal(v.cursor, mark + 1, 'the pump holds on the mark for its beat')
  v.pause(); v.dispose()
  /* the pure fold: a second fall marked before the first lands is held beside it, and each landing takes its own */
  const S = createState(), ctx = { UD: {}, SN: {} }
  const a = { type: 'area.marked', fall: 'trigger.x.first-fall', lands: 5, areas: [[10, 11]], layer: 'layer.burning' }, b2 = { type: 'area.marked', fall: 'trigger.x.second-fall', lands: 6, areas: [[20, 21]], layer: 'layer.weak' }
  fold(S, a, ctx, 0); fold(S, b2, ctx, 0); assert.equal(S.falls.length, 2)
  fold(S, { type: 'area.landed', fall: a.fall, areas: a.areas, hit: [], layer: a.layer }, ctx, 0)
  assert.deepEqual(S.falls.map(f => f.fall), [b2.fall])
  fold(S, { type: 'area.landed', fall: b2.fall, areas: b2.areas, hit: [], layer: b2.layer }, ctx, 0); assert.deepEqual(S.falls, [])
})
