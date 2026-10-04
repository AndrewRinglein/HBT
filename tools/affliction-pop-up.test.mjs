// viewer.affliction-pop-up (engine backlog; engine DECISIONS.md 2026-10-01 'the afflictions at 0 Health: ... the first-affliction
// pop-up'). Andrew: "The first time someone gets any one of the four main status afflictions, we need to pop up before and after
// art for that character with an explanation" / "There is a before/after pop-up mid-battle that will explain what just happened
// with the card art of both before and after." The component's half, on battles exported from the engine as it stands (the
// library's exports are older than the engine's `atZero` line): when the pump plays a hero's `badge.gained` that carries the
// engine's 0-Health rule, the battle holds on a pop-up — the hero's card before and after, the stat changes, the drawbacks and
// what happens at 0 Health, every number and name the event's or the sheet's — and goes on when it is closed. A hero with no
// after art is told so, never shown borrowed art. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { makeWindow } from './fakedom.mjs'
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'

/** a battle the engine fights now: its own export tool, as tools/direct-map.test.mjs asks it */
const exportOf = (scenario, seed) => JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/export-battle.mts', '--scenario', scenario, ...(seed == null ? [] : ['--seed', String(seed)])], { cwd: '../engine', encoding: 'utf8', maxBuffer: 1 << 27 }))

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
  let drained = 0
  const v = B.mount(el, data, { autoplay: false, onDrain: () => { drained++ }, ...opts })
  v.push(battle.events)
  return { w, v, V: v._V, L, drains: () => drained }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const pop = V => V.dom.root.querySelector('#afflPop')
const sgn = n => (n > 0 ? '+' : '') + n
/** the words of an element as a browser reads them: the test's document keeps the page's escapes (as tools/panel-lists-items.test.mjs) */
const words = x => String(x ?? '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const paras = P => P.querySelector('#afflZero').querySelectorAll('p').map(p => words(p.textContent))
/** the first affliction a hero gains mid-battle: the engine's badge.gained line carrying its 0-Health rule */
const gainOf = battle => { const i = battle.events.findIndex(e => e.type === 'badge.gained' && e.atZero); assert.ok(i > 0, 'the battle afflicts a hero'); return { i, e: battle.events[i] } }
/** play from just before event i until the pop-up stands (or the pump runs dry) */
function playTo(t, i) { t.v.seek(i); t.v.play(); for (let n = 0; n < 400 && !pop(t.V) && t.v.cursor < t.v.events.length; n++) t.w._flush(250) }

test('a hero first afflicted: the battle holds on the pop-up — its card before and after, the three explanations — and goes on when it is closed', () => {
  const battle = exportOf('showcase.prologue-party'), { i, e } = gainOf(battle), t = boot(battle), { v, V, w, L } = t
  const hero = battle.events.find(x => x.type === 'unit.enter' && x.actor === e.actor)
  assert.equal(hero.side, 'hero'); assert.equal(e.badgeId, 'badge.rotting-flesh')
  playTo(t, i)
  const P = pop(V); assert.ok(P, 'the pop-up stands when the gain is played'); assert.notEqual(P.style.display, 'none')
  assert.equal(P.getAttribute('role'), 'dialog'); assert.equal(P.getAttribute('aria-modal'), 'true')
  // the battle pauses on it: the pump holds at the gain, neither paused by the player nor run dry
  assert.equal(v.cursor, i + 1, 'held right after the gain')
  w._flush(60000); assert.equal(v.cursor, i + 1, 'a minute on, the battle has not moved'); assert.equal(v.playing, true, 'held, not paused'); assert.equal(t.drains(), 0, 'not drained')
  // who and what, in the engine's names
  const title = P.querySelector('#afflTitle').textContent
  assert.ok(title.includes(hero.name), `names the hero: ${title}`); assert.ok(title.includes(e.name), `names the affliction: ${title}`)
  // before and after: the hero's own card, and the art manifest's after card for this affliction
  const art = L.art.artmap[hero.typeId], before = P.querySelector('#afflBefore').querySelector('img'), after = P.querySelector('#afflAfter').querySelector('img')
  assert.ok(art.after && art.after[e.badgeId], `the art manifest names ${hero.typeId}'s after card for ${e.badgeId}`)
  assert.equal(before.getAttribute('src'), L.art.assets[art.card], 'before: the hero\'s card')
  assert.equal(after.getAttribute('src'), L.art.assets[art.after[e.badgeId]], 'after: the hero\'s own afflicted card')
  assert.notEqual(after.getAttribute('src'), before.getAttribute('src')); assert.ok(String(after.getAttribute('src')).startsWith('data:image/'), 'real art, inlined')
  assert.equal(P.querySelector('.afflNoArt'), null, 'nothing is missing here')
  // 1 · the stat changes: every modifier on the event, its number the event's (Law 0), no other
  const stats = P.querySelector('#afflStats'), rows = stats.querySelectorAll('.afflStat'), mods = Object.entries(e.mods).filter(([, n]) => n)
  assert.equal(rows.length, mods.length, 'one row per modifier the event states')
  for (const [stat, n] of mods) { const row = rows.find(r => r.getAttribute('data-stat') === stat); assert.ok(row, `a row for ${stat}`)
    assert.equal(row.getAttribute('data-n'), String(n)); assert.ok(row.textContent.includes(sgn(n).replace('-', '−')) || row.textContent.includes(sgn(n)), `${stat} reads ${sgn(n)}: ${row.textContent}`) }
  /* Law 10, 2026-10-04 (engine fix.affliction-pop-up-words; engine DECISIONS.md 2026-10-03 "the affliction pop-up's 0-Health words and its drawbacks come from the engine": "Okay, do it that way."): step 2 read
       const draw = P.querySelector('#afflDraw'), lowered = mods.filter(([, n]) => n < 0)
       assert.equal(draw.querySelectorAll('.afflLow').length, lowered.length, 'each lowered stat is a drawback')
       … assert.deepEqual(terms, e.gaps.map(…), 'the row\'s written terms, in the engine\'s words')
     — the viewer judging which terms are drawbacks: every stat with a minus, and EVERY written term, a boon among them. The
     engine marks them now (the line's `drawbacks`: the stats and the written terms that are drawbacks), and the pop-up
     shows exactly the marked ones, each in the line's own words; step 3's paragraph is the line's own text, whole. */
  // 2 · the drawbacks: exactly the terms the event marks — the stats in its `drawbacks.mods`, the written terms in its `drawbacks.gaps`
  const draw = P.querySelector('#afflDraw'), lowered = mods.filter(([stat]) => e.drawbacks.mods.includes(stat))
  assert.ok(e.drawbacks.mods.length >= 1 && e.drawbacks.gaps.length >= 1, 'the event marks drawbacks')
  assert.equal(draw.querySelectorAll('.afflLow').length, e.drawbacks.mods.length, 'each stat the event marks is a drawback, and no other')
  for (const [stat] of lowered) assert.ok(draw.querySelectorAll('.afflLow').some(r => r.getAttribute('data-stat') === stat), `${stat} is named as lowered`)
  const terms = draw.querySelectorAll('.afflTerm').map(r => words(r.textContent))
  assert.deepEqual(terms, e.drawbacks.gaps.map(g => g.replaceAll('`', '')), 'the written terms the event marks, in the engine\'s words')
  // 3 · at 0 Health: Rotting Flesh rolls Deathbed Fighting as normal and gains Fragile — the event's atZero, the badge's name the sheet's
  const zero = words(P.querySelector('#afflZero').textContent)
  /* (Law 10, 2026-10-04, as at step 2: was assert.deepEqual(e.atZero, { deathbedFighting: true, gains: 'badge.fragile' }) — the rule's
     shape, from which the viewer wrote its own sentences. The event carries the Codex's text beside the shape, and the
     paragraph is that text, word for word, and nothing else.) */
  { const { text, ...facts } = e.atZero; assert.deepEqual(facts, { deathbedFighting: true, gains: 'badge.fragile' }); assert.equal(typeof text, 'string')
    assert.deepEqual(paras(P), [text], 'the 0-Health paragraph is the event\'s text, word for word, and nothing else') }
  assert.match(zero, /0 Health/); assert.match(zero, /Deathbed Fighting/); assert.ok(zero.includes(L.static.badges['badge.fragile'].name), `names Fragile: ${zero}`)
  assert.doesNotMatch(zero, /Luck|enemy|rises/, 'not another affliction\'s rule')
  // closed, the battle goes on to its end
  const close = P.querySelector('#afflClose'); assert.equal(close.tag, 'button')
  fire(close, 'click')
  assert.equal(pop(V), null, 'closed'); w._flush(30); assert.ok(v.cursor > i + 1 || t.drains() > 0, 'the battle resumes when it is closed')
  for (let n = 0; n < 4000 && !t.drains(); n++) { w._flush(1000); const again = pop(V); if (again) fire(again.querySelector('#afflClose'), 'click') }
  assert.equal(v.cursor, battle.events.length, 'played to the end'); assert.equal(t.drains() > 0, true)
  v.dispose()
})

test('a hero with no after art is told so, never shown borrowed art; Lycanthropy says it transforms and rolls Luck', () => {
  const battle = exportOf('test.afflictions-at-zero-rule'), { i, e } = gainOf(battle), t = boot(battle), { v, V, L } = t
  const hero = battle.events.find(x => x.type === 'unit.enter' && x.actor === e.actor)
  assert.equal(e.badgeId, 'badge.lycanthropy'); assert.equal(L.art.artmap[hero.typeId]?.after, undefined, 'this TEST body has no after art')
  playTo(t, i)
  const P = pop(V); assert.ok(P)
  assert.equal(P.querySelector('#afflAfter').querySelector('img'), null, 'no borrowed picture')
  const none = P.querySelector('#afflAfter').querySelector('.afflNoArt'); assert.ok(none, 'the missing art is said'); assert.match(none.textContent, /art/i)
  const zero = words(P.querySelector('#afflZero').textContent)
  assert.ok(zero.includes(L.static.units[e.atZero.transformsInto].name), `names the Werewolf: ${zero}`)
  assert.match(zero, /Luck/); assert.match(zero, /enemy/); assert.match(zero, /no Deathbed Fighting roll/i)
  assert.deepEqual(paras(P), [e.atZero.text], 'the paragraph is the event\'s text')
  v.dispose()
})

test('Vampirism and Possession read their own 0-Health rules off the event: a Vampire on a Luck roll; a Ghost rises, an enemy', () => {
  for (const [scenario, seed, badgeId, key] of [['test.vampire-bite', 7, 'badge.vampirism', 'transformsInto'], ['test.ghost', 18, 'badge.possession', 'raises']]) {
    const battle = exportOf(scenario, seed), { i, e } = gainOf(battle), t = boot(battle), { v, V, L } = t
    assert.equal(e.badgeId, badgeId); playTo(t, i)
    const P = pop(V); assert.ok(P, `${scenario}: the pop-up`)
    const zero = words(P.querySelector('#afflZero').textContent), form = L.static.units[e.atZero[key]].name
    assert.ok(zero.includes(form), `${badgeId} names the ${form}: ${zero}`)
    /* Law 10, 2026-10-04 (engine fix.affliction-pop-up-words, as above): the first branch read assert.match(zero, /rises/) — a word
       of the viewer's own sentence ("a Ghost rises from the body"). The Codex's text says the Ghost "is summoned on the hero's
       hex as an enemy unit"; the paragraph is that text. What stood — bleeds out, an enemy, no Luck — stands. */
    if (key === 'raises') { assert.match(zero, /summoned/); assert.match(zero, /bleeds out/); assert.match(zero, /enemy/); assert.doesNotMatch(zero, /Luck/) }
    else { assert.match(zero, /Luck/); assert.match(zero, /enemy/) }
    assert.deepEqual(paras(P), [e.atZero.text], `${badgeId}: the paragraph is the event's text, word for word`)
    /* the drawbacks are the marked terms and no others: a boon written on the row (Vampirism heals on a melee hit) is not listed */
    const shownTerms = P.querySelector('#afflDraw').querySelectorAll('.afflTerm').map(r => words(r.textContent))
    assert.deepEqual(shownTerms, e.drawbacks.gaps.map(g => g.replaceAll('`', '')), `${badgeId}: the marked terms`)
    for (const g of e.gaps.filter(g => !e.drawbacks.gaps.includes(g))) assert.ok(!words(P.querySelector('#afflDraw').textContent).includes(g.replaceAll('`', '')), `${badgeId}: '${g}' is not marked and is not shown as a drawback`)
    assert.deepEqual(P.querySelector('#afflDraw').querySelectorAll('.afflLow').map(r => r.getAttribute('data-stat')), e.drawbacks.mods, `${badgeId}: the marked stats`)
    for (const [stat, n] of Object.entries(e.mods).filter(([, n]) => n)) assert.equal(P.querySelector('#afflStats').querySelectorAll('.afflStat').find(r => r.getAttribute('data-stat') === stat)?.getAttribute('data-n'), String(n), `${badgeId} ${stat}`)
    v.dispose()
  }
})

test('a scrub draws no pop-up and is never held; a hand step shows it and the next step goes on; an enemy\'s gain is not a hero\'s', () => {
  const battle = exportOf('showcase.prologue-party'), { i } = gainOf(battle), t = boot(battle), { v, V, w } = t
  v.seek(battle.events.length); assert.equal(pop(V), null, 'a seek past the gain plays no cue')
  v.seek(i); v.step(); assert.ok(pop(V), 'a hand step over the gain shows it'); assert.equal(v.cursor, i + 1)
  v.step(); assert.equal(v.cursor > i + 1, true, 'the next hand step is never held'); assert.equal(pop(V), null, 'and the pop-up is gone')
  playTo(t, i); assert.ok(pop(V)); v.seek(i + 5); assert.equal(pop(V), null, 'a seek closes it')
  w._flush(5000); assert.ok(v.cursor > i + 5, 'and the pump, still playing, is no longer held')
  v.dispose()
  /* the same gain on an enemy unit (the fold's own cue, as the verifier injects one): no pop-up — the ruling is the hero's */
  const t2 = boot(battle), enemy = Object.values(t2.V.S.U).find(u => u.side !== 'hero')
  const ev = { ...battle.events[i], actor: enemy.id }
  t2.v.seek(i); t2.V.EV[i] = ev; t2.v.step(); assert.equal(pop(t2.V), null, 'an enemy\'s badge is not a hero\'s first affliction')
  t2.v.dispose()
})

test('the art: every after card the manifest names is inlined; heroes with none are listed, not faked', () => {
  const { v, L } = boot(exportOf('showcase.prologue-party')), art = L.art
  const afflictions = Object.values(L.static.badges).filter(b => b.atZero).map(b => b.id).sort()
  assert.deepEqual(afflictions, ['badge.lycanthropy', 'badge.possession', 'badge.rotting-flesh', 'badge.vampirism'], 'the engine\'s four afflictions (badges with a 0-Health rule)')
  let cards = 0
  for (const [tid, a] of Object.entries(art.artmap)) for (const [badgeId, file] of Object.entries(a.after || {})) { cards++
    assert.ok(afflictions.includes(badgeId), `${tid}: ${badgeId} is an affliction`); assert.ok(art.assets[file], `${tid}: ${file} is inlined`); assert.notEqual(file, a.card) }
  assert.ok(cards >= 80, `most heroes have before and after art: ${cards} after cards`)
  assert.deepEqual(Object.keys(art.artmap['hero.base.warrior-iron'].after).sort(), afflictions, 'the Iron Dwarf has all four')
  // the list of what is missing is the manifest's, by hero type and affliction
  assert.ok(art.noAfterArt && typeof art.noAfterArt === 'object', 'the manifest lists the heroes with no after art')
  for (const [tid, missing] of Object.entries(art.noAfterArt)) { assert.equal(L.static.units[tid]?.side, 'hero', `${tid} is a hero`)
    for (const b of missing) assert.equal(art.artmap[tid]?.after?.[b], undefined, `${tid} ${b} is listed as missing and is missing`) }
  for (const [tid, a] of Object.entries(art.artmap)) if (L.static.units[tid]?.side === 'hero') for (const b of afflictions)
    assert.ok((a.after && a.after[b]) || (art.noAfterArt[tid] || []).includes(b), `${tid} ${b}: either an after card or listed`)
  assert.ok(art.noAfterArt['hero.fixed.orphans'], 'the Orphans have none, and are listed')
  v.dispose()
})

test('the viewer writes no 0-Health sentence and judges no drawback: src/affliction.js holds neither', () => {
  const src = readFileSync('src/affliction.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  for (const words of ['Deathbed Fighting', 'transforms into', 'rises from', 'bleeds out', 'rolls Luck', 'which is most likely', 'taken to 0 Health']) assert.ok(!src.includes(words), `affliction.js writes "${words}"`)
  assert.doesNotMatch(src, /n\s*<\s*0/, 'no lowered-stat test: which terms are drawbacks is the event\'s')
  assert.match(src, /atZero\.text/); assert.match(src, /drawbacks/)
})
