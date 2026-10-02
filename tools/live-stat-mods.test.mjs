// viewer.live-stat-mods (2026-10-01; Andrew, playing the Lumberjack House: "The Leap from a Warrior gives +2 Strength. It did
// not show in the modifier log. It did show in the stat window. It showed a +2. It showed a green 4 for the Strength, but the
// Strength should have gone to 6. None of the attacks have their damage modified by the Strength."). The sheet is the bare
// unit; the log's statmod lines carry every live modifier (an item's, a Leap's). The stat window shows the sheet plus them,
// and an attack's number moves with its stat's modifiers — and back when the engine says they ended (statmod.expired).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createState, fold } from '../src/fold.js'
import { dmgOf } from '../src/actions.js'
import { drawPanel } from '../src/panel.js'

const UD = { 'hero.fixture': { strength: 4, movement: 5, maxHp: 12, accuracy: 75, armor: 1, precision: 3 } }
const ctx = { UD, SN: {} }
const enter = { type: 'unit.enter', actor: 0, name: 'Iron Dwarf A', typeId: 'hero.fixture', side: 'hero', hex: 0, hp: 16, maxHp: 16, stamina: 5, maxStamina: 5 }
const mod = (stat, value, source) => ({ type: 'statmod.added', actor: 0, stat, op: 'add', value, source })
const ended = (stat, value, source) => ({ type: 'statmod.expired', actor: 0, stat, op: 'add', value, source })
const chop = { id: 'attack.fixture.chop', attack: { stat: 'strength', bonus: 1, kind: 'melee' } }
const unitOf = (events) => { const S = createState(); for (const e of events) fold(S, e, ctx, 0); return S }

function panelText(S) {
  let html = ''
  const panel = { set innerHTML(v) { html = v }, get innerHTML() { return html }, className: '', querySelector: () => null }
  drawPanel({ clock: () => 0, dom: { panel }, S: { ...S, subjectId: 0, subjectMode: 'acting' }, view: {}, data: { UD, SN: {}, POS: { 0: { c: 0, r: 0 } }, F: { terrainIds: ['terrain.open'] }, ARTMAP: {}, ASSETS: {} } })
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

test('the stat window shows the sheet plus every live modifier — the Leap\'s Strength 4 + 2 reads 6, the mail\'s Move 5 − 1 reads 4', () => {
  const S = unitOf([enter, mod('movement', -1, 'item.destroyed-mail'), mod('strength', 2, 'power.leap')])
  const text = panelText(S)
  assert.match(text, /Strength \+2 ?6\b/)
  assert.match(text, /Move −?-?1 ?4\b/)
  assert.doesNotMatch(text, /Strength \+2 ?4\b/)
})

test('an attack never seen: the sheet\'s stat plus its live modifiers plus the bonus — 4 + 2 + 1', () => {
  const S = unitOf([enter, mod('strength', 2, 'power.leap')])
  assert.deepEqual(dmgOf(chop, S.U[0], ctx), { n: 7, live: false })
})

test('an attack seen at 5: the Leap moves it to 7, and its end moves it back', () => {
  const declared = { type: 'attack.declared', actor: 0, target: 1, attackId: chop.id, kind: 'melee', damageOnHit: 5, hitChance: 80, damageType: 'physical' }
  const target = { ...enter, actor: 1, typeId: 'hero.fixture', side: 'enemy', hex: 1 }
  const S = unitOf([enter, target, declared])
  assert.equal(dmgOf(chop, S.U[0], ctx).n, 5)
  fold(S, mod('strength', 2, 'power.leap'), ctx, 0)
  assert.deepEqual(dmgOf(chop, S.U[0], ctx), { n: 7, live: true })
  fold(S, ended('strength', 2, 'power.leap'), ctx, 0)
  assert.deepEqual(dmgOf(chop, S.U[0], ctx), { n: 5, live: true })
})
