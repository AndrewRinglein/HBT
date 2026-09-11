// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// The class bonus moves — movement.bonus-actions (2026-08-25).
//
// The S17 half-step split gave three cohort classes powers MoveDef could not
// express: Leap (move exactly 2, +2 Strength until end of Turn), Focus (move
// zero, gain 1 Stamina), Devotion (move zero, lose 1 Stamina Max for the
// Battle, gain 2). The MECHANISM is MoveDef.stepRange + MoveDef.effects; the
// three rows are pure data. Bastion's compiler refused these exact clauses —
// "no pattern" — which is what the capability gap looked like from outside.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { saveBattle } from '../src/core/snapshot.js'
import { runActivation } from '../src/ai/modes.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeSidestep, stepRangeOf } from '../src/core/movement.js'
import { stat } from '../src/core/stats.js'
import { MOVES } from '../src/content/moves.js'
import { hexId } from './board16.js'

describe('the rows are the Codex rows — data, not code', () => {
  it('Leap / Focus / Devotion carry their published shapes', () => {
    expect(MOVES['power.leap']).toMatchObject({ staminaCost: 2, cooldown: 0, move: { shape: 'sidestep', stepRange: 2 } })
    expect(MOVES['power.focus']).toMatchObject({ staminaCost: 0, cooldown: 0, move: { shape: 'sidestep', stepRange: 0 } })
    expect(MOVES['power.devotion']).toMatchObject({ staminaCost: 0, cooldown: 0, move: { shape: 'sidestep', stepRange: 0 } })
    expect(stepRangeOf(MOVES['power.sidestep']!)).toBe(1) // absent = the classic half-step
  })
})

describe('leap — exactly 2 hexes, and the rider rides the swing', () => {
  it('moves exactly 2, refuses 1, and grants +2 Strength until end of Turn', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-oathblade', hex: hexId(4, 8) }],
      [{ type: 'test-zombie', hex: hexId(12, 8) }],
    )
    const w = ctx.state.units[0]!
    const before = stat(ctx, w, 'strength')
    beginActivation(ctx, w.id, 'test')
    expect(() => executeSidestep(ctx, w.id, hexId(5, 8), MOVES['power.leap']!))
      .toThrow(/exactly 2/)
    expect(executeSidestep(ctx, w.id, hexId(6, 8), MOVES['power.leap']!)).toBe(true)
    expect(w.hex).toBe(hexId(6, 8))
    expect(stat(ctx, w, 'strength'), 'the rider applies now').toBe(before + 2)
    // Until the end of THIS Turn: the next Turn no longer sees it.
    ctx.state.turn += 1
    expect(stat(ctx, w, 'strength'), 'expired with the Turn').toBe(before)
    ctx.state.turn -= 1
  })

  it('pays its 2 Stamina and is refused when the pool cannot cover it', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-oathblade', hex: hexId(4, 8) }],
      [{ type: 'test-zombie', hex: hexId(12, 8) }],
    )
    const w = ctx.state.units[0]!
    w.stamina = 1
    beginActivation(ctx, w.id, 'test')
    const before = saveBattle(ctx)
    expect(executeSidestep(ctx, w.id, hexId(6, 8), MOVES['power.leap']!)).toBe(false)
    // V2 shared legality rejects before spending, emitting or drawing RNG.
    expect(saveBattle(ctx)).toBe(before)
  })

  it('the AI leaps into adjacency when the switch is on — and carries the rider into the attack', () => {
    // Warrior 2 hexes from a zombie, full stamina: leap (2) + axe (1) is
    // affordable, so the switch-on AI takes the leap for its +2 Strength.
    const ctx = createCustomBattle(
      [{ type: 'test-oathblade', hex: hexId(6, 8) }],
      [{ type: 'test-zombie', hex: hexId(8, 8) }],
    )
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    runActivation(ctx, w.id)
    const leapt = ctx.events.find((e) => e.type === 'moved' && e.causeId === 'power.leap')
    expect(leapt, 'the AI never chose the leap').toBeDefined()
    const swing = ctx.events.find((e) => e.type === 'attack.hit' || e.type === 'attack.miss')
    expect(swing, 'the leap must enable a swing').toBeDefined()
    const mod = ctx.events.find((e) => e.type === 'statmod.added' && e.causeId === 'power.leap')
    expect(mod).toMatchObject({ stat: 'strength', value: 2 })
  })

  it('with the switch OFF the same board walks instead — the other code path stays sweepable', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-oathblade', hex: hexId(6, 8) }],
      [{ type: 'test-zombie', hex: hexId(8, 8) }],
      { cfg: { switches: { aiLeapToAdjacent: false } as never } },
    )
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    runActivation(ctx, w.id)
    expect(ctx.events.some((e) => e.type === 'moved' && e.causeId === 'power.leap')).toBe(false)
  })
})

describe('the zero-hex bonus moves — you stand still on purpose', () => {
  it('Focus gains exactly 1 Stamina, capped at max, and spends the move slot', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-air-mage', hex: hexId(4, 8) }],
      [{ type: 'test-zombie', hex: hexId(12, 8) }],
    )
    const m = ctx.state.units[0]!
    m.stamina = 2
    beginActivation(ctx, m.id, 'test')
    expect(executeSidestep(ctx, m.id, m.hex, MOVES['power.focus']!)).toBe(true)
    expect(m.stamina).toBe(3)
    expect(m.hex, 'zero hexes on purpose').toBe(hexId(4, 8))
    expect(m.moveUsed, 'it is still the move slot').toBe(true)
    // capped: at max it changes nothing and emits nothing
    const evBefore = ctx.events.length
    m.stamina = m.maxStamina
    executeSidestep(ctx, m.id, m.hex, MOVES['power.focus']!)
    expect(m.stamina).toBe(m.maxStamina)
    expect(ctx.events.slice(evBefore).some((e) => e.type === 'stamina.gained')).toBe(false)
  })

  it('Devotion trades 1 Stamina Max for 2 Stamina, floor 1, for the rest of the battle', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-lucius', hex: hexId(4, 8) }],
      [{ type: 'test-zombie', hex: hexId(12, 8) }],
    )
    const p = ctx.state.units[0]!
    const max0 = p.maxStamina
    p.stamina = 0
    beginActivation(ctx, p.id, 'test')
    expect(executeSidestep(ctx, p.id, p.hex, MOVES['power.devotion']!)).toBe(true)
    expect(p.maxStamina, 'the price is permanent this battle').toBe(max0 - 1)
    expect(p.stamina, 'the gain lands after the new ceiling').toBe(2)
    // the floor: docking cannot take max below 1 (the wounds precedent)
    // V2 legality applies to direct executors too: each new use needs a fresh cycle.
    for (let i = 0; i < 12; i++) {
      beginActivation(ctx, p.id, 'test')
      expect(executeSidestep(ctx, p.id, p.hex, MOVES['power.devotion']!)).toBe(true)
    }
    expect(p.maxStamina).toBe(1)
  })

  it('a starved kiter uses its zero-range bonus move instead of standing refused', () => {
    // The mage cannot afford the shot; Focus is the designed refill. The AI
    // fallback must pick it — this is what keeps the variant ALIVE in battles.
    const ctx = createCustomBattle(
      [{ type: 'test-air-mage', hex: hexId(4, 8) }],
      [{ type: 'test-zombie', hex: hexId(12, 8) }],
    )
    const m = ctx.state.units[0]!
    m.stamina = 0
    beginActivation(ctx, m.id, 'test')
    runActivation(ctx, m.id)
    expect(ctx.events.some((e) => e.type === 'stamina.gained' && e.causeId === 'power.focus'),
      'the starved mage should Focus').toBe(true)
  })
})

describe('alive in the standard battles — dead content is the failure mode', () => {
  it('all three variants fire across a sweep of standard battles', () => {
    const seen = new Set<string>()
    // Widened 2026-09-03 (station.accuracy-field): at eight zombies the
    // Alpha Team, now hitting at authored accuracies, ends the fight before a
    // starved priest ever needs Devotion; at twelve it does. Same claim, more
    // pressure — "tests needing pressure field twelve to sixteen" (ruled
    // 2026-09-02, keep the zombies).
    for (let r = 0; r < 40 && seen.size < 3; r++) {
      for (const mapId of ['map.open', 'map.thicket']) for (const enemyCount of [8, 12]) {
        if (seen.size === 3) break
        const ctx = createBattle({ replicate: r, enemyCount, mapId })
        runBattle(ctx)
        for (const e of ctx.events) {
          if (typeof e.causeId === 'string' && ['power.leap', 'power.focus', 'power.devotion'].includes(e.causeId)) {
            seen.add(e.causeId)
          }
        }
      }
    }
    expect([...seen].sort(), 'every bonus move must be chosen by the AI somewhere')
      .toEqual(['power.devotion', 'power.focus', 'power.leap'])
  })
})
