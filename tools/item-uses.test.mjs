// V2 R6 item uses (engine v2.item-uses, 2026-09-24): a use belongs to the item INSTANCE.
// The engine adds no event: `charge.spent` names the instance that paid (instanceId,
// itemId, instanceLeft — 0 = spent) and `unit.enter` names instances carried in already
// spent (`spent`, instance ids). The fixture is the engine's own export of the TEST
// scenario test.item-uses (tools/fixtures/item-uses.json): a warrior with two Healing
// Potions and a spent Cure Poison, a priest with a live Cure Poison and a spent potion.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { foldTo } from '../src/fold.js'
import { buildLog } from '../src/log.js'

const FX = JSON.parse(readFileSync(new URL('./fixtures/item-uses.json', import.meta.url), 'utf8'))
const STATIC = JSON.parse(readFileSync(new URL('../generated/static.json', import.meta.url), 'utf8'))
const EV = FX.events, ctx = { UD: STATIC.units, SN: STATIC.statuses }
const spends = EV.filter(e => e.type === 'charge.spent' && e.instanceId)

test('the fixture: two drinks by one warrior, from two instances, each spent', () => {
  const w = spends.filter(e => e.itemId === 'item.healing-potion' && e.actor === 0)
  assert.equal(w.length, 2)
  assert.notEqual(w[0].instanceId, w[1].instanceId)
  assert.deepEqual(w.map(e => e.instanceLeft), [0, 0])
})

test('the fold carries the instances spent on arrival, from unit.enter', () => {
  const S = foldTo(EV, EV.length, ctx)
  for (const e of EV.filter(x => x.type === 'unit.enter' && x.spent)) assert.deepEqual(S.U[e.actor].spentItems, e.spent)
  const bare = EV.find(x => x.type === 'unit.enter' && !x.spent)
  assert.deepEqual(S.U[bare.actor].spentItems, [])
})

test('the fold keeps each instance\'s uses left as charge.spent states them', () => {
  const at = EV.indexOf(spends[0])
  const S = foldTo(EV, at + 1, ctx)
  assert.deepEqual(S.U[spends[0].actor].itemUses[spends[0].instanceId], { itemId: spends[0].itemId, left: spends[0].instanceLeft })
  const end = foldTo(EV, EV.length, ctx)
  for (const e of spends) assert.equal(end.U[e.actor].itemUses[e.instanceId].left, 0)
})

test('the log names the instance that paid, and says when it is spent', () => {
  const lines = buildLog(EV, ctx.SN, FX.turns)
  for (const e of spends) {
    const line = lines.find(l => l.i === EV.indexOf(e))
    assert.ok(line, 'charge.spent has a log line')
    for (const s of [e.instanceId, e.itemId.replace(/^item\./, ''), 'spent']) assert.ok(line.t.includes(s), s)
  }
})
