// Law10 / V2 sections8.2 and18 (2026-09-07): named elemental defense supersedes
// magic Resist for Burn/Poison. Preserve exact tick/decay assertions under the new stat.
// RULED, Angela 2026-08-20: Resist mitigates Poison (and Burn) per tick, never
// Bleed. The canonical table from DECISIONS.md, asserted verbatim.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { applyStatus, tickStatuses } from '../src/core/status.js'
import { hexId } from './board16.js'

function warriorWithResist(resist: number) {
  const ctx = createCustomBattle(
    [{ type: 'test-warrior', hex: hexId(5, 5) }],
    [{ type: 'test-zombie', hex: hexId(11, 11) }],
  )
  const w = ctx.state.units[0]!
  if (resist) w.mods.push({ stat: 'poisonResist', op: 'add', value: resist, source: 'test', scope: 'unit' })
  return { ctx, w }
}

describe('Poison Resist mitigates poison ticks (V2 section8.2)', () => {
  it('the canonical 5-vs-2 walk: take 3, 2, 1, 0, 0 — full clock, shortened pain', () => {
    const { ctx, w } = warriorWithResist(2)
    const hp0 = w.hp
    applyStatus(ctx, w.id, 'status.poison', 5, 'test')
    const taken: number[] = []
    for (let i = 0; i < 5; i++) {
      const before = w.hp
      tickStatuses(ctx, 'hero')
      taken.push(before - w.hp)
    }
    expect(taken).toEqual([3, 2, 1, 0, 0])
    expect(w.hp).toBe(hp0 - 6)
    // the clock ran in full — value hit zero by decay, not by resist
    expect(w.statuses.find((s) => s.id === 'status.poison')).toBeUndefined()
  })

  it('boundary: zero Resist is the old behaviour exactly', () => {
    const { ctx, w } = warriorWithResist(0)
    applyStatus(ctx, w.id, 'status.poison', 3, 'test')
    const before = w.hp
    tickStatuses(ctx, 'hero')
    expect(before - w.hp).toBe(3)
  })

  it('boundary: Resist above the tick floors at zero and the event says what was resisted', () => {
    const { ctx, w } = warriorWithResist(9)
    applyStatus(ctx, w.id, 'status.poison', 4, 'test')
    const before = w.hp
    tickStatuses(ctx, 'hero')
    expect(w.hp).toBe(before)
    const ev = ctx.events.filter((e) => e.type === 'damage.applied' && e['statusId'] === 'status.poison').pop()!
    expect(ev['resisted']).toBe(4)
    expect(ev['amount']).toBe(0)
  })

  it('interaction with the shipped neighbour: regeneration is UNTOUCHED by Resist', () => {
    // Resist mitigates damage ticks, never heal ticks — regen 2 heals 2 whatever
    // the Resist stat says.
    const { ctx, w } = warriorWithResist(5)
    w.hp = 3
    applyStatus(ctx, w.id, 'status.regeneration', 2, 'test')
    tickStatuses(ctx, 'hero')
    expect(w.hp).toBe(5)
  })
})
