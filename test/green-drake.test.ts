// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// The Green Drake — a PLAYER BEAST, redesigned by Angela 2026-08-20 and
// recorded in the Codex SOURCE (settled.json hero ruling → §10 hero table +
// §5 Drake's Maw): Health 12, Armor 2, Resist 1, Strength 4, Precision 3,
// Accuracy 65, reach 2. Two attacks with DIFFERENT on-hit riders — the case
// that forced attack-scoped triggers: Poison Breath (precision magic, 3
// Poison, 2 Stamina) and Snap (strength, 1 Poison, 1 Stamina). Her two
// movement powers (Flight +0 for 1 Stamina; regular movement 5 for 1 Stamina)
// wait on backlog movement.flight. BENCHED like the snake.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { removeStatus, valueOf } from '../src/core/status.js'
import { UNITS, ATTACKS } from '../src/content/index.js'
import { hexId } from './board16.js'

describe('the block — her dictation, verbatim', () => {
  it('every number she gave', () => {
    const d = UNITS['green-drake']!
    expect(d).toBeDefined()
    expect(d.side).toBe('hero')
    expect([d.maxHp, d.armor, d.resist, d.strength, d.precision, d.magic, d.spirit])
      .toEqual([12, 2, 1, 4, 3, 0, 0])
    expect(d.accuracy).toBe(65)
    expect([d.movement, d.reach]).toEqual([5, 2])   // the regular movement power's value
    expect(d.attacks).toEqual(['attack.drake.poison-breath', 'attack.drake.snap'])
  })
  it('the two attacks — Poison Breath and the disambiguated bite, Snap', () => {
    const b = ATTACKS['attack.drake.poison-breath']!
    expect([b.attack.kind, b.attack.stat, b.attack.bonus, b.attack.damageType, b.staminaCost]).toEqual(['ranged', 'precision', 0, 'magic', 2])
    const s = ATTACKS['attack.drake.snap']!
    expect([s.attack.kind, s.attack.stat, s.attack.bonus, s.attack.damageType, s.staminaCost]).toEqual(['melee', 'strength', 0, 'physical', 1])
  })
})

describe('two riders, two attacks — attack scoping doing real work', () => {
  function board() {
    // A ranged attack cannot fire adjacent (ruled 2026-08-15), so the drake
    // gets a breath target at range 3 and a snap target at its jaws.
    const ctx = createCustomBattle(
      [{ type: 'green-drake', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 8) }, { type: 'test-zombie', hex: hexId(5, 6) }],
    )
    const d = ctx.state.units[0]!
    d.mods.push({ stat: 'accuracy', op: 'add', value: 60, source: 'test', scope: 'unit' })  // never miss
    return { ctx, d, far: ctx.state.units[1]!, near: ctx.state.units[2]! }
  }
  it('the breath poisons 3; the snap poisons 1 — same hook, different attacks, different venom', () => {
    const { ctx, d, far, near } = board()
    beginActivation(ctx, d.id, 'test')
    performAttack(ctx, d.id, far.id, 'attack.drake.poison-breath')
    expect(valueOf(far, 'status.poison')).toBe(3)
    expect(valueOf(near, 'status.poison')).toBe(0)

    beginActivation(ctx, d.id, 'test')
    performAttack(ctx, d.id, near.id, 'attack.drake.snap')
    expect(valueOf(near, 'status.poison')).toBe(1)
    removeStatus(ctx, far.id, 'status.poison', 'test')
  })
  it('the numbers: breath previews 3 magic (precision 3), snap previews 4 physical (strength 4) vs no armor', () => {
    const { ctx, d, far, near } = board()
    expect(preview(ctx, d.id, far.id, 'attack.drake.poison-breath').damageOnHit).toBe(3)
    expect(preview(ctx, d.id, near.id, 'attack.drake.snap').damageOnHit).toBe(4)
  })
  it('the stamina ledger: a breath costs 2, a snap costs 1', () => {
    const { ctx, d, far, near } = board()
    beginActivation(ctx, d.id, 'test')
    performAttack(ctx, d.id, far.id, 'attack.drake.poison-breath')
    expect(d.stamina).toBe(d.maxStamina - 2)
    beginActivation(ctx, d.id, 'test')
    performAttack(ctx, d.id, near.id, 'attack.drake.snap')
    expect(d.stamina).toBe(d.maxStamina - 3)
  })
})

describe('benched', () => {
  it('no drake in any horde', () => {
    for (const z of [4, 8, 12]) {
      const ctx = createBattle({ replicate: 0, enemyCount: z })
      expect(ctx.state.units.some((u) => u.typeId === 'green-drake'), String(z)).toBe(false)
    }
  })
})
