// V2 R6 swap (COMBAT-V2-DESIGN-2026-09-07 §11.2, §15.1): `loadout.swapped` = unit, hands
// before, hands after, stamina spent → "the rail icons and the unit's kit". The fixture is
// the real engine's log of one human swap (tools/fixtures/loadout-swap.json: an Iron Dwarf,
// longsword in hand, kite shield stowed, swaps to the shield). The AI never swaps
// (engine SWITCHES swapAi, ruled 2026-09-24), so no library battle carries one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createState, fold, foldTo, FOLDED_TYPES } from '../src/fold.js'
import { actionsOf } from '../src/actions.js'
import { buildLog } from '../src/log.js'

const FX = JSON.parse(readFileSync(new URL('./fixtures/loadout-swap.json', import.meta.url), 'utf8'))
const STATIC = JSON.parse(readFileSync(new URL('../generated/static.json', import.meta.url), 'utf8'))
const EV = FX.events, ctx = { UD: STATIC.units, SN: STATIC.statuses }
const D = { UD: STATIC.units, ACT: STATIC.actions }
const at = EV.findIndex(e => e.type === 'loadout.swapped')
const SW = EV[at], id = SW.actor
const ids = list => list.map(i => i.instanceId)

test('the fixture is the engine log of one swap: stamina.spent, loadout.swapped, then unit.equipped for what arrived', () => {
  assert.ok(at > 0)
  assert.equal(EV[at - 1].type, 'stamina.spent'); assert.equal(EV[at - 1].amount, SW.stamina)
  assert.equal(EV[at + 1].type, 'unit.equipped'); assert.equal(EV[at + 1].instanceId, SW.handsAfter[0].instanceId)
})

test('the fold knows loadout.swapped and the pump gives it a beat', () => {
  assert.ok(FOLDED_TYPES.includes('loadout.swapped'))
  // viewer.js imports the door (TypeScript), so the pump's table is read as text here; verify.mjs imports it
  const dur = readFileSync(new URL('../src/viewer.js', import.meta.url), 'utf8').match(/export const DUR = \{[\s\S]*?\n\}/)
  assert.ok(dur && dur[0].includes("'loadout.swapped':"))
})

test('before the swap: hands from unit.equipped (by instance), stowed from unit.enter', () => {
  const S = foldTo(EV, at, ctx), u = S.U[id]
  assert.deepEqual(ids(u.hands), ids(SW.handsBefore))
  assert.deepEqual(ids(u.stowed), ['501/1'])
  assert.deepEqual(u.kit.items, ['item.longsword'])
  assert.ok(u.kit.grants.includes('attack.longsword.slash'))
})

test('after the swap: the hands are the event\'s, the rest is stowed, the kit and its modifiers follow the hands', () => {
  const S = foldTo(EV, EV.length, ctx), u = S.U[id]
  assert.deepEqual(ids(u.hands), ids(SW.handsAfter))
  assert.deepEqual(ids(u.stowed), ids(SW.handsBefore))
  assert.deepEqual(u.kit.items, ['item.kite-shield'])
  assert.deepEqual(u.kit.grants, [])
  assert.deepEqual(u.kit.abilities, EV[at + 1].abilities)
  // the longsword's Block +5 left with it; the shield's Block and Ranged Block arrived
  const itemMods = u.mods.filter(m => m.fielded && String(m.source).startsWith('item.'))
  assert.deepEqual(itemMods.map(m => [m.source, m.stat, m.value]), Object.entries(EV[at + 1].mods).map(([k, v]) => ['item.kite-shield', k, v]))
  // the stamina the swap spent: the stamina.spent before it already set the bar
  assert.equal(u.stam, EV[at - 1].stamina)
})

test('the bar\'s icons change: the longsword\'s attacks leave, the shield\'s powers arrive', () => {
  const before = actionsOf(foldTo(EV, at, ctx).U[id], D).map(a => a.id)
  const after = actionsOf(foldTo(EV, EV.length, ctx).U[id], D).map(a => a.id)
  assert.ok(before.includes('attack.longsword.slash') && !after.includes('attack.longsword.slash'))
  for (const p of EV[at + 1].abilities) { assert.ok(!before.includes(p), p); assert.ok(after.includes(p), p) }
  assert.ok(after.includes('attack.punch'))   // §11.1 "Punch is always available"
})

test('one float names the swap and the stamina spent, verbatim from the event', () => {
  const S = foldTo(EV, at, ctx), cues = fold(S, SW, ctx, 0)
  const f = cues.filter(c => c.k === 'float')
  assert.equal(f.length, 1)
  assert.equal(f[0].of, 'stamina'); assert.equal(f[0].n, SW[f[0].of])
  assert.match(f[0].text, /SWAP/)
  // a free swap (Fast Hands, swapCost 0) floats the word with no number
  const S0 = foldTo(EV, at, ctx), free = fold(S0, { ...SW, stamina: 0 }, ctx, 0).filter(c => c.k === 'float')
  assert.equal(free.length, 1); assert.equal(free[0].n, undefined); assert.equal(free[0].text, 'SWAP')
})

test('seeking to any point after the swap equals stepping to it', () => {
  const S = createState(); for (const e of EV) fold(S, e, ctx, 0)
  assert.deepEqual(foldTo(EV, EV.length, ctx).U, S.U)
})

test('the log line names the hands before and after and the stamina spent', () => {
  const line = buildLog(EV, ctx.SN, 1).find(l => l.i === at)
  assert.ok(line, 'loadout.swapped has a log line')
  for (const s of ['swaps', 'longsword', 'kite-shield', '1 stamina']) assert.ok(line.t.includes(s), s)
})
