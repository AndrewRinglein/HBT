// capability.stabilise-downed-ally (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a
// feature that is needed; his items stay in rewards'). Andrew: "All of those deadlines need to be added in as features that we
// need." His Bandages: "Free, 0 Stamina: stabilize a downed ally — their bleed-out counter stops." The component's half, on
// the library's own battle (battles/test.bandages.json — the engine's fielding: a warrior falls and the one beside him, who
// carries the Bandages, stops his count): from the engine's bleedout.stopped the downed hero's count stands still and reads
// as held - on the board's clock and on the rail's first-aid mark - to the end of the battle; the word floats over him and
// the log says who did it. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'
const battle = JSON.parse(readFileSync('battles/test.bandages.json', 'utf8'))

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
const at = battle.events.findIndex(e => e.type === 'bleedout.stopped'), stopped = battle.events[at]

test('the engine\'s battle: a hero falls, the Bandages stop his count, and he is never counted down again', () => {
  assert.ok(at > 0, 'the library battle stabilises a downed hero')
  assert.equal(battle.events.filter(e => e.type === 'bleedout.stopped').length, 1)
  assert.equal(stopped.causeId, 'power.bandages.use')
  assert.equal(battle.events.slice(at).some(e => e.type === 'bleedout.tick' && e.target === stopped.target), false)
  assert.equal(battle.events.slice(at).some(e => e.type === 'life.dead' && e.target === stopped.target), false)
})

test('from bleedout.stopped the downed hero\'s count stands still and reads as held, on the board and on the rail, to the end', () => {
  const { v, V } = boot(battle)
  v.seek(at)
  const before = V.S.U[stopped.target]
  assert.equal(before.life, 'downed'); assert.equal(!!before.bleedHeld, false)
  assert.equal(V.layers.UEL.get(stopped.target).clock.textContent, String(before.bleed), 'the running count')
  v.seek(at + 1)
  const u = V.S.U[stopped.target]
  assert.deepEqual([u.life, u.bleed, u.bleedHeld], ['downed', stopped.bleedOut, true])
  assert.equal(V.layers.UEL.get(stopped.target).clock.textContent, '✚ ' + stopped.bleedOut)
  assert.match(V.layers.UEL.get(stopped.target).clock.title, /stabilised/i)
  v.seek(battle.events.length)
  const end = V.S.U[stopped.target]
  assert.deepEqual([end.life, end.bleed, end.bleedHeld], ['downed', stopped.bleedOut, true], 'still down, at the count it stopped on')
  assert.equal(V.layers.UEL.get(stopped.target).clock.textContent, '✚ ' + stopped.bleedOut)
  const rail = V.dom.root.querySelector('.railaid')
  assert.ok(rail, 'the rail\'s first-aid mark')
  assert.equal(rail.title || rail.getAttribute('title'), 'Downed — stabilised: the bleed-out count is stopped at ' + stopped.bleedOut)
  v.dispose()
})

test('the fold and the log say it: STABILISED over the hero, and the fold knows bleedout.stopped; a new fall starts a new count', async () => {
  const { FOLDED_TYPES, createState, fold } = await import('../src/fold.js')
  assert.ok(FOLDED_TYPES.includes('bleedout.stopped'))
  const { L } = boot(battle)
  const ctx = { UD: L.static.units, SN: L.static.statuses }, S = createState()
  for (const e of battle.events.slice(0, at)) fold(S, e, ctx)
  const cues = fold(S, stopped, ctx)
  assert.ok(cues.some(c => c.k === 'float' && c.text === 'STABILISED' && c.hex === S.U[stopped.target].hex))
  assert.equal(S.U[stopped.target].bleedHeld, true)
  fold(S, { type: 'bleedout.set', causeId: 'test', target: stopped.target, bleedOut: 4 }, ctx)
  assert.deepEqual([S.U[stopped.target].bleed, S.U[stopped.target].bleedHeld], [4, false])
})

/* fix.bandaged-hero-dies-at-zero (engine item, 2026-10-05; engine DECISIONS.md 2026-10-05 'a bandaged hero's count has no floor:
   bandaging stops the count, a hit still takes one, and at 0 the hero dies'): "No, it goes to 0 when they die. Bandaging is
   supposed to completely stop the bleed-out counter, and they're just stable." The page has no rule of its own for it - the
   count beside the hero, its held mark and the death follow the engine's lines. On the library's battle of it
   (battles/test.bandages-s47.json - the Bandages' fielding on replicate 47, the first in which the enemy strikes the bandaged
   hero to 0): after each hit the held count reads one less, still held; at 0 the hero is dead and has no count. */
test('a bandaged hero who is hit: the held count drops by one a hit and still reads as held; at 0 the hero is dead', () => {
  const struck = JSON.parse(readFileSync('battles/test.bandages-s47.json', 'utf8')), EV = struck.events
  const s = EV.findIndex(e => e.type === 'bleedout.stopped'), id = EV[s].target
  const hits = EV.map((e, i) => i > s && e.type === 'bleedout.accelerated' && e.target === id ? i : -1).filter(i => i >= 0)
  const death = EV.findIndex((e, i) => i > s && e.type === 'life.dead' && e.target === id)
  assert.ok(hits.length >= 2 && death > hits.at(-1), 'the battle strikes the bandaged hero to 0')
  assert.deepEqual(hits.map(i => EV[i].bleedOut), Array.from({ length: EV[s].bleedOut }, (_, k) => EV[s].bleedOut - 1 - k), 'one from the count a hit, down to 0')
  assert.equal(EV.slice(s, death).some(e => e.type === 'bleedout.tick' && e.target === id), false, 'never counted down by itself')
  const { v, V } = boot(struck)
  v.seek(s + 1)
  assert.equal(V.layers.UEL.get(id).clock.textContent, '✚ ' + EV[s].bleedOut)
  for (const i of hits.slice(0, -1)) {
    v.seek(i + 1)
    const u = V.S.U[id]
    assert.deepEqual([u.life, u.bleed, u.bleedHeld], ['downed', EV[i].bleedOut, true], 'still down, still held, one less')
    assert.equal(V.layers.UEL.get(id).clock.textContent, '✚ ' + EV[i].bleedOut)
  }
  v.seek(death + 1)
  assert.equal(V.S.U[id].life, 'dead')
  const E = V.layers.UEL.get(id)
  assert.ok(!E || E.root.style.display === 'none', 'a dead hero\'s token leaves the board, its count with it')
  const body = EV.findIndex((e, i) => i > death && e.type === 'corpse.created' && e.of === id)
  assert.ok(body > death, 'the engine leaves its body'); v.seek(body + 1)
  assert.ok(Object.values(V.S.corpses).some(c => c.of === id), 'and its body lies there')
  v.dispose()
})
