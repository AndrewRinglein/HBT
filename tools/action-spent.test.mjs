import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createState, fold, foldTo } from '../src/fold.js'
const ctx = { UD: {}, SN: {} }
const enter = { type: 'unit.enter', actor: 0, name: 'Fixture', typeId: 'test', side: 'hero', hex: 0, hp: 10, maxHp: 10, stamina: 5, maxStamina: 5 }
const spend = (slot, moveUsed, primaryUsed, free = false) => ({ type: 'action.spent', actor: 0, actionId: 'power.fixture', slot, free, moveUsed, primaryUsed })
test('copies resolved expenditure flags for paid, free and reaction facts', () => {
  const S = createState(); fold(S, enter, ctx)
  assert.deepEqual([S.U[0].moveUsed, S.U[0].primaryUsed], [false, false])
  for (const e of [spend('movement', true, false), spend('movement', true, false, true), spend('reaction', true, false), spend('primary', true, true)]) {
    fold(S, e, ctx)
    assert.deepEqual([S.U[0].moveUsed, S.U[0].primaryUsed], [e.moveUsed, e.primaryUsed])
  }
})
test('only real activation and Surge boundaries reset slots; every seek equals stepping', () => {
  const events = [enter, spend('primary', true, true), { type: 'activation.end', actor: 0 }, { type: 'phase.begin', phase: 'hero' }, { type: 'activation.begin', actor: 0 }, spend('movement', true, false), { type: 'surge.hit', actor: 0 }, spend('primary', true, true)]
  const S = createState()
  for (let i = 0; i < events.length; i++) {
    fold(S, events[i], ctx, 0)
    assert.deepEqual(foldTo(events, i + 1, ctx), S)
    if ([1, 2, 3, 7].includes(i)) assert.deepEqual([S.U[0].moveUsed, S.U[0].primaryUsed], [true, true])
    if ([4, 6].includes(i)) assert.deepEqual([S.U[0].moveUsed, S.U[0].primaryUsed], [false, false])
  }
})
