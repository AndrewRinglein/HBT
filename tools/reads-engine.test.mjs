// viewer.reads-engine (engine backlog; Duplication review 2026-09-28, findings V1 V2 V4 V5 V6 V7 V8 V11 V12 V13 V14; ruled
// "fix as proposed" in engine/DECISIONS.md '2026-09-28 — the duplication review, ruled'). The viewer reads the engine's
// facts instead of keeping copies of them. Expect: the fast zombie's Charge shows in its action bar; a prone unit shows
// Stand; the test zombies' danger reads 4; status.weak plays Weak's style; after a Surge the movement numeral is the
// engine's. Every table here is generated/static.json — the engine's own, dumped through the door. When VIEWER_PAGE names
// a built page, the page is asked whether it carries the same tables.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { actionsOf, absorbOf, moveHexes } from '../src/actions.js'
import { dangerOf } from '../src/projection.js'
import { STYLE, stStyle, rgb } from '../src/theme.js'
import { createState, fold } from '../src/fold.js'
import { fxStatus, fxTick } from '../src/board.js'

const ST = JSON.parse(readFileSync(new URL('../generated/static.json', import.meta.url), 'utf8'))
const D = { UD: ST.units, ACT: ST.actions, KINDS: ST.actionKinds, STATUS_ROWS: ST.statusRows, ABSORBING_STATUSES: ST.absorbingStatuses }
const ids = (u) => actionsOf(u, D).map((a) => a.id)

test('V1 — the fast zombie\'s Charge is one of its attacks, in the bar, by the engine\'s classification', () => {
  assert.equal(ST.actionKinds['move.fast-zombie.charge'], 'charge')
  const row = actionsOf({ typeId: 'unit.fast-zombie', st: {} }, D).find((a) => a.id === 'move.fast-zombie.charge')
  assert.ok(row, 'the Charge is on the bar')
  assert.equal(row.isAttack, true); assert.equal(row.charge, true); assert.equal(row.kind, 'melee')
  assert.ok(!actionsOf({ typeId: 'unit.fast-zombie', st: {} }, D).some((a) => a.kind === 'move' && a.id === 'move.fast-zombie.charge'), 'never a destination walk')
})

test('V1 — a prone unit shows Stand, granted by its status\'s own row; standing takes it away', () => {
  const stand = ST.statusRows['status.prone'].standAction
  assert.equal(stand, 'power.stand-up'); assert.equal(ST.actionKinds[stand], 'move')
  assert.ok(ids({ typeId: 'test-zombie', st: { 'status.prone': 1 } }).includes(stand))
  assert.ok(ids({ typeId: 'test-zombie', st: { 'test.status.floored': 1 } }).includes(stand), 'the testing lane\'s prone status grants the same')
  assert.ok(!ids({ typeId: 'test-zombie', st: { 'status.prone': 0 } }).includes(stand))
  assert.ok(!ids({ typeId: 'test-zombie', st: {} }).includes(stand))
})

test('V1 — an action the engine has not classified is a missing fact, never a guess', () => {
  assert.throws(() => actionsOf({ typeId: 'unit.zombie', st: {} }, { ...D, KINDS: {} }), /no engine classification/)
})

test('V2 — the danger marker is the bar\'s number: the test zombies read 4, the zombie 3; no hand table', () => {
  assert.deepEqual(dangerOf({ typeId: 'test-zombie', st: {} }, D), { n: 4, kind: 'melee' })
  assert.deepEqual(dangerOf({ typeId: 'test-zombie-burning', st: {} }, D), { n: 4, kind: 'melee' })
  assert.deepEqual(dangerOf({ typeId: 'unit.zombie', st: {} }, D), { n: 3, kind: 'melee' })
  const src = readFileSync(new URL('../src/projection.js', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /DANGER_AUTHORED|test-zombie/)
})

test('V4 — one absorbing pool for the panel and the board: the sum of every absorbing status', () => {
  assert.equal(absorbOf({ st: { 'status.protection': 3, 'test.status.ward': 2 } }, D), 5)
  const panel = readFileSync(new URL('../src/panel.js', import.meta.url), 'utf8')
  assert.doesNotMatch(panel, /test\.status\.ward/)
})

test('V5 — status.weak plays Weak\'s style, ringed in Weak\'s own hue; every test status wears the real one it behaves as', async () => {
  assert.equal(stStyle('status.weak', D).vfx, 'affliction')
  assert.notEqual(stStyle('status.weak', D).vfx, stStyle('status.protection', D).vfx)
  for (const [t, real] of [['test.status.daze', 'status.stun'], ['test.status.hobble', 'status.slow'], ['test.status.ward', 'status.protection'],
    ['test.status.enfeeble', 'status.weak'], ['test.status.floored', 'status.prone'], ['test.status.gash', 'status.bleed']])
    assert.equal(stStyle(t, D), STYLE[real], `${t} wears ${real}`)
  // the canvas: fxStatus plays the weak effect ringed in Weak's purple, not Protection's gold
  const seen = []
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop: (_, c) => seen.push(c) }) : () => {},
    set: (o, k, v) => { if (typeof v === 'string') seen.push(v); o[k] = v; return true } })
  const box = { getBoundingClientRect: () => ({ left: 100, top: 200, height: 120 }) }
  const draws = []
  const V = { fx: { FX: { add: (ms, fn) => { draws.push(fn); return Promise.resolve() } } }, dom: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0 }) } },
    layers: { UEL: new Map([[0, { root: box, img: box }]]) }, data: D }
  fxStatus(V, 0, 'status.weak')
  assert.equal(draws.length, 1)
  for (const t of [0.05, 0.1, 0.2, 0.3]) draws[0](ctx, 800, 600, t, t * 950, [], 0.016)
  assert.ok(seen.some((c) => c.includes(rgb(STYLE['status.weak'].hue))), 'Weak\'s purple rings the effect')
  assert.ok(!seen.some((c) => c.includes(rgb(STYLE['status.protection'].hue))), 'never Protection\'s gold')
  // a tick plays only for a status the engine says ticks damage
  draws.length = 0; fxTick(V, 0, 'status.slow'); assert.equal(draws.length, 0)
  fxTick(V, 0, 'status.burn'); assert.equal(draws.length, 1)
})

test('V6 V7 — after a Surge the movement numeral and a move\'s range are the engine\'s surge.hit movePoints; the amount is its after', () => {
  const S = createState(), ctx = { UD: ST.units, SN: ST.statuses }
  for (const e of [
    { type: 'unit.enter', actor: 0, name: 'Hero', typeId: 'unit.zombie', side: 'hero', hex: 0, hp: 9, maxHp: 9, stamina: 3, maxStamina: 3 },
    { type: 'activation.begin', actor: 0, ordinal: 1, hex: 0, hp: 9, stamina: 3 },
    { type: 'moved', actor: 0, from: 0, to: 1, cost: 3, terrain: 'terrain.open', movePointsLeft: 1 },
    { type: 'surge.checked', actor: 0, roll: null, chance: 120, surge: 20, hit: true, link: 0, before: 100, after: 20, automatic: true },
    { type: 'surge.hit', actor: 0, link: 1, movePoints: 4, before: 100, after: 20 },
  ]) fold(S, e, ctx, 0)
  assert.equal(S.U[0].activeMv, 4)
  assert.equal(S.U[0].surgeChance, 20)
  assert.equal(moveHexes({ move: { shape: 'path', budgetMod: 0 } }, S.U[0], D), 4)
})

test('V13 — hexvfx carries no second hex geometry', () => {
  const src = readFileSync(new URL('../src/hexvfx.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(src, /function hexToScreen|function hexCorners|Math\.sqrt\(3\)/)
})

test('the page carries the engine\'s tables', { skip: !process.env.VIEWER_PAGE }, () => {
  // assert.ok, never assert.match: a failing match would print the whole 20 MB page into the TAP stream
  const page = readFileSync(process.env.VIEWER_PAGE, 'utf8')
  assert.ok(/"move\.fast-zombie\.charge":\s*"charge"/.test(page), 'the page classifies the fast zombie\'s Charge')
  assert.ok(/"?standAction"?:\s*"power\.stand-up"/.test(page), 'the page carries the prone status\'s stand action')
  assert.ok(/"?layerStatus"?:\s*\{\s*"layer\./.test(page), 'the page carries what each layer applies')
})
