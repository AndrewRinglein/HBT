// viewer.free-attack-kind-words (engine backlog; found landing capability.counterattack-and-fend, 2026-10-04 — engine SWITCHES.md
// freeAttackKindOnTheLine: a counterattack and a fend reuse the attack-of-opportunity log line, `aoo.provoked`, with an `as`
// field naming the kind; "It needs to be illustrated … like a crossed sword above their head").
// The item's expect: "a hero who has used the Longsword's Counterattack shows the condition on its card and panel; when an
// adjacent enemy attacks it, the log and the floating text say Counterattack, not attack of opportunity; a fend reads Fend; an
// ordinary attack of opportunity reads as before; a page test reads each wording."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the engine's own battles: tools/fixtures/free-attack-kinds.json
// (the fieldings test.counterattack and test.fend, made by test/viewer.free-attack-kind-words.test.ts) and the Cathedral's
// recording (ordinary attacks of opportunity).
import { test } from 'node:test'
import { shownName } from '../src/names.js'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { createState, fold } from '../src/fold.js'
import { buildLog } from '../src/log.js'
import * as ACTIONS from '../src/actions.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const kinds = load('tools/fixtures/free-attack-kinds.json'), cathedral = load('battles/test.opening-cathedral.json'), statics = load('generated/static.json'), glyphs = load('generated/ra-glyphs.json')
const CTX = { UD: statics.units, SN: statics.statuses, IC: statics.itemClasses }

function boot(battle, opts = {}) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L }
}
/** the floats the fold says for line i of a battle */
function floatsAt(battle, i) { const S = createState(); let cues = []; for (let k = 0; k <= i; k++) cues = fold(S, battle.events[k], CTX, 0); return cues.filter(c => c.k === 'float').map(c => c.text) }
const provoked = (battle, as) => battle.events.map((e, i) => ({ e, i })).filter(x => x.e.type === 'aoo.provoked' && x.e.as === as)
/* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
   letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): `nameOf` was the unit.enter line's own name, mark and all, and the log's sentences were asked for it. The claim is unchanged - the unit is named - and the
   name is the engine's less its mark, through the function the page itself reads (src/names.js shownName). */
const nameOf = (battle, id) => shownName(battle.events.find(e => e.type === 'unit.enter' && e.actor === id).name)
const WORDS = { counterattack: 'Counterattack', fend: 'Fend', undefined: 'Attack of opportunity' }

test('one table names the three free attacks and the glyph of each up-state: Counterattack (crossed swords), Fend (a shield) — existing glyphs, proposed', () => {
  const T = ACTIONS.FREE_ATTACK; assert.ok(T, 'actions.js: FREE_ATTACK')
  assert.equal(T.counterattack.word, 'Counterattack'); assert.equal(T.fend.word, 'Fend'); assert.equal(T.aoo.word, 'Attack of opportunity')
  assert.equal(T.counterattack.glyph, 'crossed-swords'); assert.equal(T.fend.glyph, 'shield')
  for (const k of ['counterattack', 'fend']) assert.ok(Object.keys(glyphs.glyphs || glyphs).includes(T[k].glyph), `${T[k].glyph} is a glyph the page already holds`)
})

test('the floating text says the kind: COUNTERATTACK, FEND, ATTACK OF OPPORTUNITY — and only a mover that was stopped "tries to keep moving"', () => {
  for (const kind of ['counterattack', 'fend']) { const lines = provoked(kinds[kind], kind); assert.ok(lines.length > 0)
    for (const { i } of lines) { const f = floatsAt(kinds[kind], i)
      assert.ok(f.includes(WORDS[kind].toUpperCase()), `${kind}: ${JSON.stringify(f)}`); assert.ok(!f.includes('ATTACK OF OPPORTUNITY'), 'not an attack of opportunity')
      assert.ok(!f.includes('TRIES TO KEEP MOVING'), 'the unit answered was not trying to move past') } }
  const plain = provoked(cathedral, undefined); assert.ok(plain.length > 0, 'the Cathedral has attacks of opportunity')
  for (const { i } of plain) { const f = floatsAt(cathedral, i); assert.ok(f.includes('ATTACK OF OPPORTUNITY'), 'as before'); assert.ok(f.includes('TRIES TO KEEP MOVING'), 'as before') }
  /* the Cathedral's own counterattacks (its paladin) read as counterattacks too */
  for (const { i } of provoked(cathedral, 'counterattack')) assert.ok(floatsAt(cathedral, i).includes('COUNTERATTACK'))
})

test('the log says the kind in its sentence, and an attack of opportunity\'s sentence is word for word what it was', () => {
  for (const kind of ['counterattack', 'fend']) { const B = kinds[kind], lines = buildLog(B.events, statics.statuses, 99)
    for (const { e, i } of provoked(B, kind)) { const t = lines.find(l => l.i === i).t
      assert.ok(t.includes(nameOf(B, e.actor)) && t.includes(nameOf(B, e.target)), t)
      assert.ok(new RegExp(kind === 'counterattack' ? 'counterattack' : 'fend', 'i').test(t), `${kind}: ${t}`); assert.ok(!/opportunity/i.test(t), `not "opportunity": ${t}`); assert.ok(!/keep moving/i.test(t), t); assert.ok(t.includes(e.attackId)) } }
  const lines = buildLog(cathedral.events, statics.statuses, 99)
  for (const { e, i } of provoked(cathedral, undefined))
    assert.equal(lines.find(l => l.i === i).t, `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nameOf(cathedral, e.target)}</b> tries to keep moving; ⚔ <b>${nameOf(cathedral, e.actor)}</b> takes an attack of opportunity <span class="sq">· ${e.attackId}</span>`)
  /* the one that could not be made says which kind it was */
  const skipped = [...kinds.counterattack.events, ...kinds.fend.events, ...cathedral.events].filter(e => e.type === 'aoo.skipped')
  for (const e of skipped) { const b = e.as ? kinds[e.as] : cathedral; void b }
  const sk = buildLog([{ type: 'unit.enter', actor: 0, name: 'A', side: 'hero' }, ...skipped.slice(0, 40)], statics.statuses, 99).map(l => l.t)
  for (const [k, e] of skipped.slice(0, 40).entries()) assert.ok(new RegExp(e.as === 'counterattack' ? 'no counterattack' : e.as === 'fend' ? 'no fend' : 'no attack of opportunity').test(sk[k]), sk[k])
})

test('the up-state is on the unit: its token, its panel and its card show Counterattack (or Fend) from the power\'s own line until the engine\'s line says it ran out', () => {
  for (const kind of ['counterattack', 'fend']) {
    const { v, V, EV } = boot(kinds[kind]), T = ACTIONS.FREE_ATTACK[kind]
    const up = EV.findIndex(e => e.type === 'statmod.added' && e.stat === kind), id = EV[up].actor, down = EV.findIndex((e, k) => k > up && e.type === 'statmod.expired' && e.stat === kind && e.actor === id)
    const token = () => V.layers.UEL.get(id).badges.querySelectorAll('.freeUp').map(n => n.dataset.kind)
    const card = () => V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === id).querySelectorAll('.railup').map(n => n.dataset.kind)
    const panel = () => { v.inspect(id); return V.dom.panel.querySelectorAll('.freeUpRow').map(n => n.dataset.kind + ':' + n.textContent) }
    v.seek(up)
    assert.deepEqual(token(), []); assert.deepEqual(card(), []); assert.deepEqual(panel(), [], 'nothing before the power is used')
    v.seek(up + 1)
    assert.deepEqual(token(), [kind], 'on its token'); assert.deepEqual(card(), [kind], 'on its card above the battle')
    const row = panel(); assert.equal(row.length, 1, 'in its panel\'s status effects'); assert.ok(row[0].includes(T.word), row[0])
    assert.ok(V.layers.UEL.get(id).badges.innerHTML.includes('#ra-' + T.glyph), `drawn with the ${T.glyph} glyph`); assert.ok(V.layers.UEL.get(id).badges.querySelector('.freeUp').getAttribute('title').includes(T.word))
    assert.ok(!V.dom.panel.textContent.includes('no status effects'), 'the panel does not say "no status effects" beside it')
    /* still up when it answers */
    const first = provoked(kinds[kind], kind)[0]; v.seek(first.i + 1); assert.deepEqual(token(), [kind])
    /* and gone when the engine's line says so */
    v.seek(down); assert.deepEqual(token(), [kind]); v.seek(down + 1)
    assert.deepEqual(token(), []); assert.deepEqual(card(), []); assert.deepEqual(panel(), [])
    v.dispose()
  }
})

test("the bar's tooltip for the power words it by its kind, not by the stat's id", () => {
  const D = { SN: statics.statuses, ACT: statics.actions, STATUS_ROWS: statics.statusRows, UD: statics.units, BADGES: statics.badges, ITEMS: statics.items }
  const P = statics.actions['power.longsword.counterattack'], s = P.effects.map(ef => ACTIONS.effectSentence(ef, ef.who, D, statics.statuses))
  assert.equal(s[0], 'Counterattack +1 until the end of the next Turn (self)'); assert.equal(s[1], 'Counterattack Accuracy +10 until the end of the next Turn (self)')
  const F = statics.actions['power.test-fend'].effects.map(ef => ACTIONS.effectSentence(ef, ef.who, D, statics.statuses))
  assert.equal(F[0], 'Fend +1 until the end of the next Turn (self)')
  /* the chip's word; a stat the table does not name is worded as before */
  assert.deepEqual(ACTIONS.effectWord(P.effects[0], D, statics.statuses), { word: 'Counterattack', val: 1, signed: true })
  assert.equal(ACTIONS.effectWord(P.effects[1], D, statics.statuses).word, 'Counterattack Accuracy')
  assert.equal(ACTIONS.effectWord({ kind: 'statMod', stat: 'strength', value: 2 }, D, statics.statuses).word, 'STR')
  /* on the page: the bar of the paladin's Activation carries the power, with those words */
  const { v, V, EV } = boot(kinds.counterattack)
  v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  const bar = V.dom.actionbar.innerHTML + ' ' + V.dom.actionbar.textContent
  assert.ok(V.dom.actionbar.textContent.includes('Counterattack'), 'the Counterattack power is on the bar')
  assert.ok(bar.includes('Counterattack +1'), 'its tooltip says Counterattack +1'); assert.ok(!bar.includes('COUNTERATTACK'), 'not the stat id in capitals')
  v.dispose()
  console.log('# the Counterattack power in words: ' + s.join(' · '))
})
