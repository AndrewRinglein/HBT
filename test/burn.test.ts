// status.burn — Codex-published (79 uses). Poison's tick with a second edge:
// halves all healing received while held (§5: halves, never blocks). Source in
// battle: the Burning Zombie's sear — "on taking damage, the zombie deals 1 burn
// to its attacker" (Angela, 2026-08-20).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, tickStatuses, heal } from '../src/core/status.js'
import { applyHealing, applyDamage } from '../src/core/mutate.js'
import { UNITS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

function board(resist = 0) {
  const ctx = createCustomBattle(
    [{ type: 'test-warrior', hex: hexId(5, 5) }],
    [{ type: 'test-zombie-burning', hex: hexId(6, 5) }],
  )
  const w = ctx.state.units[0]!
  if (resist) w.mods.push({ stat: 'resist', op: 'add', value: resist, source: 'test', scope: 'unit' })
  return { ctx, w, z: ctx.state.units[1]! }
}

describe('status.burn', () => {
  it('ticks like poison and is Resist-mitigated: the 5-vs-2 walk holds for burn too', () => {
    const { ctx, w } = board(2)
    const hp0 = w.hp
    applyStatus(ctx, w.id, 'status.burn', 5, 'test')
    const taken: number[] = []
    for (let i = 0; i < 5; i++) { const b = w.hp; tickStatuses(ctx, 'hero'); taken.push(b - w.hp) }
    expect(taken).toEqual([3, 2, 1, 0, 0])
    expect(w.hp).toBe(hp0 - 6)
  })

  it('halves all healing received while held — truncating, never blocking', () => {
    const { ctx, w } = board()
    applyDamage(ctx, w.id, 8, 'test', {})
    applyStatus(ctx, w.id, 'status.burn', 2, 'test')
    const before = w.hp
    applyHealing(ctx, w.id, 5, 'test-heal')
    expect(w.hp).toBe(before + 2)          // trunc(5/2)
    const ev = ctx.events.filter((e) => e.type === 'heal.applied').pop()!
    expect(ev['asked']).toBe(5)
    expect(ev['amount']).toBe(2)
    expect(ev['halvedBy']).toBe('status.burn')
  })

  it("the SETTLED clause is now real: regeneration is halved while burn is present", () => {
    const { ctx, w } = board()
    applyDamage(ctx, w.id, 8, 'test', {})
    applyStatus(ctx, w.id, 'status.regeneration', 4, 'test')
    applyStatus(ctx, w.id, 'status.burn', 2, 'test')
    const before = w.hp
    tickStatuses(ctx, 'hero')
    // burn ticks 2 damage and decays to 1 (still held); regen asks 4, halved to 2 → net 0
    expect(w.hp).toBe(before + 0)
  })

  it('edge, stated not hidden: burn 1 expires by decay BEFORE regen ticks, releasing the heal', () => {
    // Statuses resolve in id order (Law 6): status.burn < status.regeneration.
    // Burn 1 deals its last tick, decays to 0, expires — so regeneration the same
    // phase-end is NOT halved. Recorded in SWITCHES.md (burnHalvingReadLive):
    // the alternative is snapshotting "was burning" before any tick resolves.
    const { ctx, w } = board()
    applyDamage(ctx, w.id, 8, 'test', {})
    applyStatus(ctx, w.id, 'status.regeneration', 4, 'test')
    applyStatus(ctx, w.id, 'status.burn', 1, 'test')
    const before = w.hp
    tickStatuses(ctx, 'hero')
    expect(w.hp).toBe(before - 1 + 4)
  })

  it('heal() the delegate and applyHealing agree — one path', () => {
    const { ctx, w } = board()
    applyDamage(ctx, w.id, 6, 'test', {})
    applyStatus(ctx, w.id, 'status.burn', 1, 'test')
    expect(heal(ctx, w.id, 4, 'test')).toBe(2)
  })

  it('the sear: hitting a burning zombie burns the attacker, 1 per connected hit', () => {
    const { ctx } = board()
    const zdef = UNITS['test-zombie-burning']!
    // WEAKENED 2026-08-20 with a reason (Law 10): this asserted sear was the
    // ONLY trigger. status.stun's landing gave the burning zombie a second,
    // testing-lane trigger (test.zombie-burning.lurch — the blocksAction
    // generalization variant's battle source), so exclusivity is stale by
    // design. The sear itself is unchanged and still asserted.
    expect(zdef.triggers?.map((t) => t.id)).toContain('trigger.zombie-burning.sear')
    // end-to-end across real battles: sear fires and heroes carry burn
    let seared = 0
    for (let r = 0; r < 12; r++) {
      const b = createBattle({ replicate: r, enemyCount: 8 }); runBattle(b)
      seared += b.events.filter((e) => e.type === 'status.applied' && e.causeId === 'trigger.zombie-burning.sear').length
    }
    expect(seared).toBeGreaterThan(0)
  })

  it('the mix: enemyCount 8 fields exactly 2 burning zombies (one per four, cycled)', () => {
    // Zombie count 6 → 5 → 6 across 2026-08-20 (Law 10, reasons written both
    // times): the Beast pen borrowed the cycle's sixth slot, then left the
    // horde entirely when Angela ruled the beasts are PLAYER units. The claim
    // under test — one burning zombie per four — never moved.
    // typeIds updated 2026-08-20 (Law 10): the horde reads from the Codex pack
    // now (test-zombie / test-zombie-burning). The cadence claim is unchanged.
    // content.enemy-flip (2026-09-02): the AUTHORED Burning Zombie, one per
    // four — Angela's cadence, kept (6-BESTIARY-SETTLED).
    const ctx = createBattle({ replicate: 3, enemyCount: 8 })
    expect(ctx.state.units.filter((u) => u.typeId === 'unit.zombie-burning').length).toBe(2)
    expect(ctx.state.units.filter((u) => u.typeId === 'unit.zombie').length).toBe(6)
  })
})
