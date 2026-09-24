// V2 R7 prop destruction (engine v2.prop-destroy, v2.prop-attack, fix.prop-destroyed-remnant,
// 2026-09-24; COMBAT-V2-DESIGN-2026-09-07 §12, §15.1). The props drawn from map.loaded change
// by id exactly as the events state them: prop.damaged sets the steps taken, prop.destroyed
// replaces the prop with the engine's `remnant` (low cover, same id) or removes it, and
// prop.struck — an attack aimed at a prop's hex — is a word with no unit and no roll.
// The fixture is the engine's own log of three Choppers striking one high boulder in turn
// (tools/fixtures/prop-strike.json); the AI never aims at a prop (engine propAttackAi).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createState, fold, foldTo, FOLDED_TYPES } from '../src/fold.js'
import { buildLog } from '../src/log.js'

const FX = JSON.parse(readFileSync(new URL('./fixtures/prop-strike.json', import.meta.url), 'utf8'))
const STATIC = JSON.parse(readFileSync(new URL('../generated/static.json', import.meta.url), 'utf8'))
const EV = FX.events, ctx = { UD: STATIC.units, SN: STATIC.statuses }
const idx = type => EV.map((e, i) => e.type === type ? i : -1).filter(i => i >= 0)
const boulder = S => S.props.find(p => p.id === 'prop.test.boulder')

test('the fixture: three blows at hex 10 — damaged, destroyed to low cover with a remnant, damaged again', () => {
  assert.equal(idx('prop.struck').length, 3)
  assert.deepEqual(idx('prop.damaged').map(i => EV[i].stepsAfter), [1, 2, 1])
  const d = EV[idx('prop.destroyed')[0]]
  assert.equal(d.leaves, 'low')
  assert.equal(d.remnant.height, 'low')
  assert.equal(idx('attack.declared').length, 0)
})

test('the fold knows the three events and the pump gives each a beat', () => {
  const dur = readFileSync(new URL('../src/viewer.js', import.meta.url), 'utf8').match(/export const DUR = \{[\s\S]*?\n\}|export const DUR = \{[\s\S]*?\}/)
  for (const t of ['prop.struck', 'prop.damaged', 'prop.destroyed']) {
    assert.ok(FOLDED_TYPES.includes(t), t)
    assert.ok(dur && dur[0].includes(`'${t}':`), t)
  }
})

test('the fold follows the prop: intact, damaged 1/2, the remnant exactly, then the remnant damaged', () => {
  const [d1, d2, d3] = idx('prop.damaged'), [x] = idx('prop.destroyed')
  assert.equal(boulder(foldTo(EV, d1, ctx)).steps, undefined)
  const S1 = foldTo(EV, d1 + 1, ctx)
  assert.equal(boulder(S1).steps, 1); assert.equal(boulder(S1).height, 'high'); assert.equal(boulder(S1).collisionValue, 4)
  assert.equal(boulder(foldTo(EV, d2 + 1, ctx)).steps, 1, 'at the tier, prop.destroyed decides — the damaged line does not')
  assert.deepEqual(boulder(foldTo(EV, x + 1, ctx)), EV[x].remnant)
  assert.deepEqual(boulder(foldTo(EV, d3 + 1, ctx)), { ...EV[x].remnant, steps: 1 })
})

test('scrubbing never edits the map.loaded fact it started from', () => {
  const loaded = EV.find(e => e.type === 'map.loaded')
  const before = JSON.stringify(loaded.props)
  foldTo(EV, EV.length, ctx)
  assert.equal(JSON.stringify(loaded.props), before)
})

test('a prop that leaves nothing is removed; low cover with no remnant is refused loudly', () => {
  const S = foldTo(EV, idx('prop.struck')[0], ctx)
  fold(S, { type: 'prop.destroyed', prop: 'prop.test.boulder', leaves: 'nothing', actor: 0 }, ctx)
  assert.equal(boulder(S), undefined)
  const T = foldTo(EV, idx('prop.struck')[0], ctx)
  assert.throws(() => fold(T, { type: 'prop.destroyed', prop: 'prop.test.boulder', leaves: 'low', actor: 0 }, ctx), /remnant/)
})

test('floats: the blow names the props it struck; a step shows n/of; the fall says what is left', () => {
  const cuesAt = i => { const S = foldTo(EV, i, ctx); return fold(S, EV[i], ctx) }
  const struck = cuesAt(idx('prop.struck')[0])
  assert.ok(JSON.stringify(struck).includes('STRIKES 1 PROP'))
  assert.ok(JSON.stringify(cuesAt(idx('prop.damaged')[0])).includes('DAMAGED 1/2'))
  assert.ok(!JSON.stringify(cuesAt(idx('prop.damaged')[1])).includes('DAMAGED'), 'no damaged word at the tier')
  assert.ok(JSON.stringify(cuesAt(idx('prop.destroyed')[0])).includes('DESTROYED · LOW COVER'))
})

test('the log says each step and what the fall leaves, in the engine\'s own fields', () => {
  const lines = buildLog(EV, ctx.SN, FX.turns)
  const line = i => lines.find(l => l.i === i)?.t ?? ''
  assert.ok(line(idx('prop.struck')[0]).includes('strikes hex 10'))
  assert.ok(line(idx('prop.damaged')[0]).includes('steps 0 → 1'))
  assert.ok(line(idx('prop.destroyed')[0]).includes('leaves low cover'))
})
