// trigger.mage.kindle — Andrew, 2026-09-25 (engine/DECISIONS.md "Mage Kindle is wanted": "Build
// Kindle is described."). The backlog row, as described: "Mage: 100% onAttack — every swing, hit or
// miss — apply status.burn to target, value = ceil(partyMagicSum / 5). Angela: this is compensation
// for the Mage's lower hit chance, and is deliberately NOT the flaming-bow onHit case."
// Carried by the TEST Mage as test.mage.kindle (content/test/units.json; trigger.* is not a
// publishable kind — as test.zombie.sap). No engine code: the onAttack hook, status.apply and the
// party-wide Magic scale all exist; this proves the row reaches them.
import { describe, it, expect } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { performAttack, canAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { runBattle } from '../src/core/battle.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'
import type { Ctx } from '../src/core/types.js'

const STAFF = 'attack.test-mage.staff'
const kindled = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'test.mage.kindle')
/** The test Mage (unit 0), optionally a second hero (unit 1), and a zombie three hexes off; one staff shot. */
function shot(replicate: number, partner?: { magic: number }) {
  const heroes = [{ type: 'test-mage', hex: hexId(5, 5) }, ...(partner ? [{ type: 'test-warrior', hex: hexId(4, 5) }] : [])]
  const ctx = createCustomBattle(heroes, [{ type: 'test-zombie', hex: hexId(8, 5) }], { mapId: 'map.open', replicate })
  if (partner) ctx.state.units[1]!.magic = partner.magic
  const zombie = ctx.state.units.length - 1
  ctx.state.units[zombie]!.hp = ctx.state.units[zombie]!.maxHp = 99   // it lives through the shot
  beginActivation(ctx, 0, 'test')
  expect(canAttack(ctx, 0, zombie, STAFF)).toBe(true)
  const r = performAttack(ctx, 0, zombie, STAFF)
  return { ctx, r, zombie }
}

describe('Kindle — every swing, hit or miss, Burns the target', () => {
  it('one Burn per swing, on the target, across thirty shots — misses included', () => {
    let misses = 0
    for (let rep = 0; rep < 30; rep++) {
      const { ctx, r, zombie } = shot(rep)
      const k = kindled(ctx)
      expect(k).toEqual([expect.objectContaining({ statusId: 'status.burn', target: zombie, amount: 1 })])
      if (!r.hit) misses++
    }
    expect(misses).toBeGreaterThan(0)   // the point of it: a miss still kindles
  })
  it('it is the Burn that lands: the target holds it after a miss', () => {
    for (let rep = 0; rep < 30; rep++) {
      const { ctx, r, zombie } = shot(rep)
      if (r.hit) continue
      expect(ctx.state.units[zombie]!.statuses.find((s) => s.id === 'status.burn')?.value).toBe(1)
      return
    }
    throw new Error('no miss in thirty shots — the test needs one')
  })
})

describe('Kindle — ceil(party Magic ÷ 5)', () => {
  it('the Mage alone (Magic 2): 1', () => {
    expect(kindled(shot(0).ctx)[0]).toEqual(expect.objectContaining({ amount: 1 }))
  })
  it('party Magic 5 is still 1; it rises to 2 when the party Magic sum reaches 6', () => {
    expect(kindled(shot(0, { magic: 3 }).ctx)[0]).toEqual(expect.objectContaining({ amount: 1 }))
    expect(kindled(shot(0, { magic: 4 }).ctx)[0]).toEqual(expect.objectContaining({ amount: 2 }))
  })
})

describe('Kindle in a battle', () => {
  it('in the test.mage-kindle scenario the Mage kindles its targets', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.mage-kindle']!))
    runBattle(ctx)
    const mage = ctx.state.units.find((u) => u.typeId === 'test-mage')!.id
    const swings = ctx.events.filter((e) => e.type === 'attack.declared' && e.actor === mage).length
    expect(swings).toBeGreaterThan(0)
    expect(kindled(ctx).length).toBe(swings)
  })
})
