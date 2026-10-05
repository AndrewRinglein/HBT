// viewer.timed-effect-status-marks (engine backlog; found by the engine worker landing capability.effect-lasts-activations,
// 2026-10-05). The three timed effects — the Fire Gauntlet's Stoke, the Staff of the Ultimate Destroyer's Perfect Sight and
// Poison Coating — show on the unit as statuses with their count, but each wore the fallback, a green dot in Poison's hue, "so
// a hero under Stoke reads as poisoned".
// The item's expect: "A hero who has used Stoke shows a flame-marked buff with 3, then 2, then 1, and never Poison's dot;
// Perfect Sight and Poison Coating each show their own mark and count; the panel and tooltip name each and say what it does; a
// status with no mark in the table shows the neutral buff mark and is listed by the checks."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and of the source it is built from, on the engine's own lines:
// tools/fixtures/timed-effects.json (three Fire Mages at the Orphanage, each carrying one of the three items, each using its power in its first
// Activation and passing four more — made by test/viewer.timed-effect-status-marks.test.ts). What a status does and how long
// it has left are words made of its own row (generated/static.json statusRows: `lends`, `countsDown`), typed nowhere.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { STYLE, stStyle, BUFF_MARK, PLAIN_MARK } from '../src/theme.js'
import { statusLines } from '../src/actions.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const FX = load('tools/fixtures/timed-effects.json'), STATIC = load('generated/static.json'), GLYPHS = Object.keys((load('generated/ra-glyphs.json').glyphs))
const D = { STATUS_ROWS: STATIC.statusRows, ACT: STATIC.actions, UD: STATIC.units, BADGES: STATIC.badges, ITEMS: STATIC.items }, SN = STATIC.statuses
const EV = FX.events, { stoke: STOKE, sight: SIGHT, coating: COATING } = FX.statuses, WHO = FX.holders
const POISON = STYLE['status.poison']

/* The page on the fixture's own map — the Orphanage, a PAINTED scene, where every status is an icon under its unit
   (viewer.under-unit); on the old hex board only Stun and Weak ever stood over a unit. Booted as tools/under-unit.test.mjs
   boots it: the page's own harness, the map by its link, the battle played as a dropped export. */
function boot() {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow(), hash = '#' + FX.seed.mapId
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { value: { hash, protocol: 'file:', href: 'file:///BATTLE-VIEWER.html' + hash }, configurable: true })
  try { new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n])) }
  finally { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location }
  const H = w.__battleView.harness
  H.playExport({ seed: FX.seed, outcome: null, turns: 1, events: EV }, 'timed-effects')
  const view = H.viewer, V = view._V
  /* seek, then draw: the board is drawn by the page's own render */
  const v = { seek(i) { view.seek(i); V.render() }, inspect(id) { view.inspect(id); V.render() }, dispose() { H.dispose() } }
  return { w, v, V }
}
const has = (n, cls) => n.className.split(/\s+/).includes(cls)
/** the lines of one status on its holder, in order: [index, the count it leaves] */
const linesOf = id => EV.map((e, i) => ({ e, i })).filter(x => x.e.statusId === id).map(x => [x.i, x.e.type === 'status.expired' ? 0 : x.e.after])
const badges = (V, unit) => V.layers.UEL.get(unit).badges
const badgeOf = (V, unit, id) => badges(V, unit).querySelectorAll('.badge').find(b => b.dataset.status === id)

test('the table: Stoke and Poison Coating have marks of their own — a buff\'s square pip and frame, a glyph the page already ships (a flame, a drop), a hue that is no other status\'s; Perfect Sight, with no shipped glyph that fits, wears the neutral buff mark', () => {
  const stoke = STYLE[STOKE], coating = STYLE[COATING]
  assert.ok(stoke && coating, 'both have a row in the status table')
  assert.equal(stoke.glyph, 'fire'); assert.equal(coating.glyph, 'droplet')
  for (const [id, st] of [[STOKE, stoke], [COATING, coating]]) { assert.ok(GLYPHS.includes(st.glyph), `${st.glyph} is a glyph the page already ships`)
    assert.equal(st.buff, true, id + ' is marked as a status that gives'); assert.equal(st.sq, true, 'with the square pip a helpful status wears')
    assert.notEqual(st.hue.toLowerCase(), POISON.hue.toLowerCase(), id + ' is not in Poison\'s hue') }
  assert.equal(STYLE[SIGHT], undefined, 'Perfect Sight has no row: the shipped set holds no eye')
  assert.ok(!GLYPHS.some(g => /eye|sight/.test(g)), 'no eye among the shipped glyphs: ' + GLYPHS.join(' '))
  assert.equal(stStyle(SIGHT, D), BUFF_MARK, 'it wears the neutral buff mark')
  /* one hue per status, everywhere (Law 6): every hue in the table, and the two neutral marks, are different */
  const hues = [...Object.entries(STYLE).map(([k, s]) => [k, s.hue.toLowerCase()]), ['the neutral buff mark', BUFF_MARK.hue.toLowerCase()], ['the plain neutral mark', PLAIN_MARK.hue.toLowerCase()]]
  for (const [k, h] of hues) assert.deepEqual(hues.filter(x => x[1] === h).map(x => x[0]), [k], `${h} is one status's`)
  assert.equal(BUFF_MARK.buff, true); assert.equal(BUFF_MARK.sq, true); assert.equal(BUFF_MARK.glyph, undefined)
})

test('a status with no mark in the table never wears Poison\'s dot: one whose row lends something wears the neutral buff mark, any other a plain grey one — and every status wearing either is listed here', () => {
  const made = { ...STATIC.statusRows, 'status.later-timed-effect': { flags: [], lends: { doubles: ['strength'] }, decayPerPhase: 0, countsDown: 'activation' }, 'status.later-unknown': { flags: [] } }
  assert.equal(stStyle('status.later-timed-effect', { STATUS_ROWS: made }), BUFF_MARK, 'a timed effect added later falls back to the neutral buff mark')
  assert.equal(stStyle('status.later-unknown', { STATUS_ROWS: made }), PLAIN_MARK, 'a status that lends nothing: a plain neutral mark')
  assert.equal(stStyle('status.nobody-knows', {}), PLAIN_MARK); assert.equal(stStyle('status.nobody-knows'), PLAIN_MARK, 'with no tables at all, still not Poison\'s')
  for (const m of [BUFF_MARK, PLAIN_MARK]) assert.notEqual(m.hue.toLowerCase(), POISON.hue.toLowerCase())
  const neutral = Object.keys(STATIC.statuses).filter(id => { const st = stStyle(id, D); return st === BUFF_MARK || st === PLAIN_MARK })
  assert.ok(neutral.includes(SIGHT))
  for (const id of Object.keys(STATIC.statuses)) if (STATIC.statusRows[id].lends && !STYLE[id]) assert.equal(stStyle(id, D), BUFF_MARK, id)
  console.log(`# statuses with no mark of their own (${neutral.length}): ` + neutral.map(id => `${SN[id]} [${id}] — ${stStyle(id, D) === BUFF_MARK ? 'the neutral buff mark' : 'the plain neutral mark'}`).join(' · '))
})

test('what each does and what it has left, in words made of its own row: Stoke, Perfect Sight, Poison Coating', () => {
  const stoke = statusLines(STOKE, 3, D, SN), sight = statusLines(SIGHT, 3, D, SN), coating = statusLines(COATING, 1, D, SN)
  assert.equal(stoke.length, 2); assert.match(stoke[0], /^On hit: apply .*Burn/); assert.equal(stoke[1], '3 Activations left')
  assert.equal(statusLines(STOKE, 1, D, SN)[1], '1 Activation left')
  assert.deepEqual(sight, ['PRE doubled', '3 Activations left'])
  assert.deepEqual(coating, ['On hit: apply 1 Poison (60%)', 'for the rest of the Battle'])
  /* a status that lends nothing has no lines: its name and number say it, as before */
  assert.deepEqual(statusLines('status.poison', 2, D, SN), []); assert.deepEqual(statusLines('status.nobody-knows', 2, D, SN), [])
  /* the other count the engine has: by the holder's attacks, and by attacks that carry a tag (its own test row) */
  const byAttack = Object.keys(STATIC.statusRows).find(id => STATIC.statusRows[id].countsDown === 'attack')
  if (byAttack) { const l = statusLines(byAttack, 2, D, SN), tag = STATIC.statusRows[byAttack].countsAttackTag; assert.equal(l[l.length - 1], `2 ${tag ? tag + ' ' : ''}attacks left`) }
  console.log(`# Stoke: ${stoke.join(' · ')}`); console.log(`# Perfect Sight: ${sight.join(' · ')}`); console.log(`# Poison Coating: ${coating.join(' · ')}`)
})

test('on the token: a hero who has used Stoke shows a flame-marked buff with 3, then 2, then 1, then nothing — never Poison\'s dot', () => {
  const { v, V } = boot(), st = STYLE[STOKE], steps = linesOf(STOKE)
  assert.deepEqual(steps.map(s => s[1]), [3, 2, 1, 0, 0], 'the engine\'s lines: put on at 3, down to 2, 1, 0, expired')
  v.seek(steps[0][0]); assert.equal(badgeOf(V, WHO.stoke, STOKE), undefined, 'nothing before the power is used')
  for (const [i, n] of steps.slice(0, 3)) { v.seek(i + 1)
    const b = badgeOf(V, WHO.stoke, STOKE); assert.ok(b, 'the mark is on its token at ' + n)
    assert.ok(has(b, 'buff'), 'a buff\'s frame'); assert.ok(badges(V, WHO.stoke).innerHTML.includes('#ra-fire'), 'a flame from the shipped icon set')
    const pip = b.querySelector('.pip'); assert.equal(pip.textContent.trim(), String(n), 'its count: ' + n); assert.ok(has(pip, 'sq'), 'the square pip')
    const all = badges(V, WHO.stoke).innerHTML.toLowerCase()
    assert.ok(all.includes(st.hue.toLowerCase()), 'in its own hue'); assert.ok(!all.includes(POISON.hue.toLowerCase()), 'never Poison\'s hue'); assert.ok(!all.includes('circle(50%)'), 'never a dot')
    const tip = b.getAttribute('title'); assert.ok(tip.startsWith('Stoke — On hit: apply '), tip); assert.ok(tip.endsWith(` — ${n} Activation${n === 1 ? '' : 's'} left`), tip) }
  v.seek(steps[3][0] + 2); assert.equal(badgeOf(V, WHO.stoke, STOKE), undefined, 'gone when the engine says it ran out')
  v.dispose()
})

test('on the token: Perfect Sight wears the neutral buff mark with its count, and Poison Coating a drop with its 1 for the whole Battle', () => {
  const { v, V } = boot()
  const sight = linesOf(SIGHT); v.seek(sight[0][0] + 1)
  let b = badgeOf(V, WHO.sight, SIGHT); assert.ok(b && has(b, 'buff'), 'Perfect Sight: a buff\'s frame')
  assert.ok(!badges(V, WHO.sight).innerHTML.includes('#ra-'), 'no glyph: the neutral buff mark'); assert.ok(badges(V, WHO.sight).innerHTML.toLowerCase().includes(BUFF_MARK.hue.toLowerCase()))
  assert.ok(!badges(V, WHO.sight).innerHTML.toLowerCase().includes(POISON.hue.toLowerCase()), 'never Poison\'s hue')
  assert.equal(b.querySelector('.pip').textContent.trim(), '3'); assert.equal(b.getAttribute('title'), 'Perfect Sight — PRE doubled — 3 Activations left')
  v.seek(sight[1][0] + 1); assert.equal(badgeOf(V, WHO.sight, SIGHT).querySelector('.pip').textContent.trim(), '2')
  v.seek(sight[2][0] + 1); assert.equal(badgeOf(V, WHO.sight, SIGHT).querySelector('.pip').textContent.trim(), '1')
  const coat = linesOf(COATING); v.seek(coat[0][0] + 1)
  b = badgeOf(V, WHO.coating, COATING); assert.ok(b && has(b, 'buff')); assert.ok(badges(V, WHO.coating).innerHTML.includes('#ra-droplet'), 'a drop from the shipped icon set')
  assert.ok(!badges(V, WHO.coating).innerHTML.toLowerCase().includes(POISON.hue.toLowerCase()), 'the coating is not Poison: never Poison\'s hue')
  assert.equal(b.getAttribute('title'), 'Poison Coating — On hit: apply 1 Poison (60%) — for the rest of the Battle')
  v.seek(EV.length); b = badgeOf(V, WHO.coating, COATING); assert.ok(b, 'still held at the end'); assert.equal(b.querySelector('.pip').textContent.trim(), '1')
  v.dispose()
})

test('in the panel: each is named, with its mark and count, and says what it does and what is left; the hover says the same', () => {
  const { v, V } = boot()
  const rows = () => V.dom.panel.querySelectorAll('.pStatus'), rowOf = id => rows().find(r => r.dataset.status === id)
  for (const [k, id, name] of [['stoke', STOKE, 'Stoke'], ['sight', SIGHT, 'Perfect Sight'], ['coating', COATING, 'Poison Coating']]) {
    const at = linesOf(id)[0][0], n = EV[at].after
    v.seek(at + 1); v.inspect(WHO[k])
    const r = rowOf(id); assert.ok(r, name + ' is in the panel\'s status effects'); assert.ok(has(r, 'buff'))
    const said = r.textContent.replace(/\s+/g, ' ')
    assert.ok(said.includes(name), said); for (const l of statusLines(id, n, D, SN)) assert.ok(said.includes(l), `${name}: "${l}" — ${said}`)
    assert.equal(r.getAttribute('title'), [name, ...statusLines(id, n, D, SN)].join(' — '))
    assert.ok(!V.dom.panel.textContent.includes('no status effects'))
    const st = stStyle(id, D), markup = V.dom.panel.innerHTML
    if (st.glyph) assert.ok(markup.includes('#ra-' + st.glyph), name + ': its glyph in the panel')
  }
  /* an ordinary status row is what it was: no lines under its name, no hover of this kind */
  v.dispose()
})
