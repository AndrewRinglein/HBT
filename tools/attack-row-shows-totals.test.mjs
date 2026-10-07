// viewer.attack-row-shows-totals (engine backlog; engine DECISIONS.md 2026-10-06 'an attack shows its total Accuracy and Crit, not
// the weapon's plus' and 'an attack's numbers: the total alone, no list of what it is made of'). Andrew: "The dagger doesn't show
// +5 critical. What happens is the attack shows the total critical. The same thing is true of accuracy. There's no reason to show
// a plus accuracy. You just put it in the accuracy." / "we should always be showing the numbers, not the contributing [sum]
// numbers. … We just need to see the total."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and of the sources it is built from:
//   · an attack's row has Accuracy and then Crit, each the TOTAL for that unit's attack; a host that plays hands the engine's
//     own figures (the mount option attackTotals) and the row shows exactly those;
//   · in a replay — no engine on the page — the row's totals are the engine's own figures at fielding for every attack of every
//     unit of the six opening recordings (tools/fixtures/attack-totals.json, engine-made: test/viewer.attack-row-shows-totals.test.ts);
//   · no chip, word or tooltip line names a part of a total: no "crit +5", no "ACC -10 with this attack", no figure beside the
//     damage's stat; a cell says nothing on hover (no list of parts); what is not a total stays (on hit, range, Stamina).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { foldTo } from '../src/fold.js'
import { totalsOf, actionLines, effectTag, actionsOf } from '../src/actions.js'
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = load('generated/static.json'), FIG = load('tools/fixtures/attack-totals.json').figures
const OPENINGS = load('battles/library.json').battles.filter(b => /^test\.opening-/.test(b.file)).map(b => b.file.replace(/\.json$/, ''))
const orphanage = load('battles/test.opening-orphanage.json'), EV = orphanage.events
const STAB = 'attack.dagger.stab', PUNCH = 'attack.punch'

function boot(opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: orphanage.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  v.push(EV)
  return { w, v, V: v._V, L }
}
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
const rows = V => V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act)
const row = (V, id) => rows(V).find(r => r.dataset.act === id)
/** a row's cells in the order they are written: [[label, value]] */
const cells = r => r.querySelectorAll('.acCell').map(c => [c.querySelector('.k').textContent.trim(), c.querySelector('.v').textContent.trim()])
const cellOf = (r, k) => (cells(r).find(c => c[0] === k) || [])[1]
/* a part of a total, said in any of the ways the bar said it before this item */
const PART = /crit\s*[+\-−]\s*\d|ACC\s*[+\-−]\s*\d|Accuracy\s*[+\-−]\s*\d+(?! Accuracy against)|with this attack|Damage [^(|]*\([^)|]*\s[+\-−]\d/i
/* the recording's own lines: the unit that carries the Dagger, and its first Activation */
const WHO = EV.find(e => e.type === 'unit.equipped' && e.itemId === 'item.dagger').actor
const begin = EV.findIndex(e => e.type === 'activation.begin' && e.actor === WHO)
const D = { UD: STATIC.units, ACT: STATIC.actions, KINDS: STATIC.actionKinds, STATUS_ROWS: STATIC.statusRows, ITEMS: STATIC.items, ITEM_CLASSES: STATIC.itemClasses, BADGES: STATIC.badges }

test('the dump and the recording: the Dagger\'s Stab is +5 Crit and Punch is -5 Crit and -5 Accuracy in the engine\'s rows; a unit carries the Dagger; the sheet states each unit\'s Crit at rest', () => {
  assert.equal(STATIC.actions[STAB].attack.crit, 5); assert.equal(STATIC.actions[PUNCH].attack.crit, -5); assert.equal(STATIC.actions[PUNCH].attack.accuracy, -5)
  assert.ok(begin > 0, 'the Dagger\'s carrier acts')
  for (const [id, u] of Object.entries(STATIC.units)) assert.ok(Number.isFinite(u.critAtRest) && u.critAtRest >= (u.crit ?? 0), id + ' has its Crit at rest')
})

test('a replay: the Dagger carrier\'s rows show Accuracy and then Crit as totals — the engine\'s own figures for it — with Stab\'s Crit ten over Punch\'s, and no "+5" anywhere on the row', () => {
  const { v, V } = boot(); v.seek(begin + 1); v.setPlay(facts(WHO))
  const stab = row(V, STAB), punch = row(V, PUNCH); assert.ok(stab && punch, 'its bar: ' + rows(V).map(r => r.dataset.act).join(', '))
  assert.deepEqual(cells(stab).map(c => c[0]).slice(0, 2), ['ACC', 'CRIT'], 'Accuracy and then Crit'); assert.deepEqual(cells(stab).map(c => c[0]), ['ACC', 'CRIT', 'RNG', 'DMG', 'STA'])
  const fig = FIG['test.opening-orphanage'][WHO].attacks
  for (const [id, r] of [[STAB, stab], [PUNCH, punch]]) {
    assert.deepEqual(fig[id].unlogged, { accuracy: 0, crit: 0 }, id + ': every part of its figure is in the log')
    assert.equal(cellOf(r, 'ACC'), String(fig[id].accuracy), id + ': Accuracy is the engine\'s total'); assert.equal(cellOf(r, 'CRIT'), String(fig[id].crit), id + ': Crit is the engine\'s total')
    assert.doesNotMatch(r.textContent, PART, id + ': no part on the row'); assert.doesNotMatch(r.getAttribute('title'), PART, id + ': no part in its tooltip')
    assert.match(r.getAttribute('title'), new RegExp(`Accuracy ${fig[id].accuracy} · Crit ${fig[id].crit} · Range`), id + ': the tooltip says the same totals') }
  assert.equal(Number(cellOf(stab, 'CRIT')) - Number(cellOf(punch, 'CRIT')), Math.min(10, Number(cellOf(stab, 'CRIT'))), 'the Dagger\'s +5 and the fist\'s -5 are in the totals')
  assert.equal(Number(cellOf(stab, 'ACC')) - Number(cellOf(punch, 'ACC')), 5, 'Punch\'s -5 Accuracy is in its total')
  console.log(`# the Orphanage's ${V.S.U[WHO].name}: Stab ACC ${cellOf(stab, 'ACC')} CRIT ${cellOf(stab, 'CRIT')} · Punch ACC ${cellOf(punch, 'ACC')} CRIT ${cellOf(punch, 'CRIT')}`)
  v.dispose()
})

test('a host that plays: the row shows exactly the figures the host hands for that unit — the engine\'s — and falls back to the replay\'s when it hands none', () => {
  const asked = []
  const { v, V } = boot({ attackTotals: id => { asked.push(id); return id === WHO ? { [STAB]: { accuracy: 91, crit: 17 } } : null } })
  v.seek(begin + 1); v.setPlay(facts(WHO))
  assert.ok(asked.includes(WHO), 'the host is asked for the unit on the bar')
  assert.equal(cellOf(row(V, STAB), 'ACC'), '91'); assert.equal(cellOf(row(V, STAB), 'CRIT'), '17'); assert.match(row(V, STAB).getAttribute('title'), /Accuracy 91 · Crit 17 · Range/)
  const fig = FIG['test.opening-orphanage'][WHO].attacks
  assert.equal(cellOf(row(V, PUNCH), 'ACC'), String(fig[PUNCH].accuracy), 'an attack the host names no figure for keeps the replay\'s'); assert.equal(cellOf(row(V, PUNCH), 'CRIT'), String(fig[PUNCH].crit))
  v.dispose()
})

test('every attack of every unit of the six opening recordings: at fielding the replay\'s totals are the engine\'s own figures — less only what the engine counts with no line of the log (an aura) — and no line or tag names a part', () => {
  let asked = 0, lent = 0; const off = []
  for (const name of OPENINGS) {
    const E = load(`battles/${name}.json`).events, at = E.findIndex(e => e.type === 'battle.begin') + 1
    const S = foldTo(E, at, { UD: STATIC.units, SN: STATIC.statuses, IC: STATIC.itemClasses })
    for (const u of Object.values(S.U)) for (const a of actionsOf(u, D).filter(x => x && x.isAttack && x.kind !== 'burst')) {
      const unit = FIG[name][u.id]; assert.equal(unit && unit.typeId, u.typeId, `${name}: unit ${u.id} is the recording's ${u.name}`)
      const fig = unit.attacks[a.id]; if (!fig) { off.push(`${name}: ${u.name}'s ${a.name} has no engine figure`); continue }
      const T = totalsOf(a, u, D), gap = fig.unlogged; asked++; if (gap.accuracy || gap.crit) lent++
      /* a replay has no engine: its row is the engine's figure less exactly what no line states (the host's row has that too) */
      if (!T || T.accuracy + gap.accuracy !== fig.accuracy || Math.max(0, T.crit + gap.crit) !== fig.crit) off.push(`${name}: ${u.name}'s ${a.name}: the row ${T && T.accuracy}/${T && T.crit}, the engine ${fig.accuracy}/${fig.crit} (no line states ${gap.accuracy}/${gap.crit} of it)`)
      const said = actionLines(a, u, D, STATIC.statuses).join(' | ') + ' | ' + effectTag(a, u, D, STATIC.statuses)
      assert.doesNotMatch(said, PART, `${name}: ${u.name}'s ${a.name} names a part: ${said}`)
    }
  }
  assert.ok(asked > 60, 'attacks asked: ' + asked); assert.deepEqual(off, [], 'rows that are not the engine\'s figure')
  console.log(`# ${asked} attack rows over the six opening recordings: each total the engine's own figure at fielding, none naming a part; ${lent} of them have a part no line of the log states (an aura's lent Accuracy, the ground a unit stands on) — a replay's row is short by that, a host's is not`)
})

test('what is not a total stays: a status an attack applies, its range, its Stamina, its damage and what the damage is made from', () => {
  const { v, V } = boot(); v.seek(begin + 1); v.setPlay(facts(WHO))
  const stab = row(V, STAB), a = STATIC.actions[STAB]
  assert.equal(cellOf(stab, 'RNG'), String(a.range)); assert.equal(cellOf(stab, 'STA'), String(a.staminaCost)); assert.match(cellOf(stab, 'DMG'), /^\d+$/)
  assert.match(stab.getAttribute('title'), /Damage \d+ \(STR\w*\)/, 'the damage is the number, and its stat is named with no figure beside it')
  /* a modifier to what the row does NOT show as a total is said as before: an attack's own Accuracy against a kind of target */
  const vs = Object.entries(STATIC.actions).find(([, x]) => x.attack && x.attack.accuracyVs)
  if (vs) assert.match(actionLines({ id: vs[0], ...vs[1], isAttack: true }, {}, D, STATIC.statuses).join(' | '), /[+\-−]\d+ Accuracy against /)
  v.dispose()
})

test('pointing at a total shows no list of its parts: a cell of the row carries no tooltip of its own', () => {
  const { v, V } = boot({ attackTotals: () => ({ [STAB]: { accuracy: 91, crit: 17 } }) }); v.seek(begin + 1); v.setPlay(facts(WHO))
  for (const r of rows(V)) for (const c of r.querySelectorAll('.acCell')) { assert.equal(c.getAttribute('title'), null); for (const s of c.querySelectorAll('span')) assert.equal(s.getAttribute('title'), null) }
  assert.doesNotMatch(row(V, STAB).getAttribute('title'), /yours|\+5|made of/i)
  v.dispose()
})
