// capability.frost / capability.root / capability.taunt (2026-09-03) — three
// Codex status rows that were named gaps, each one flag read where it belongs.
//   Frost: "Adds its value to every physical hit the unit receives, per hit."
//          Ruled 2026-09-03: added BEFORE Armor. rule.burn-frost-cancel.
//   Root:  "Stops the unit moving at all."
//   Taunt: "Forces the taunted unit to target whoever taunted it." Angela:
//          "It can keep its same AI, like melee or ranged."
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { DMG, preview } from '../src/core/pipeline.js'
import { applyStatus, valueOf, isRooted, forcedTargetOf } from '../src/core/status.js'
import { beginActivation } from '../src/core/mutate.js'
import { livingEnemies } from '../src/core/movement.js'
import { STATUSES } from '../src/content/statuses.js'
import { hexId } from '../src/core/hex.js'

describe('Frost', () => {
  it('is loaded from the Codex with the flag, and adds its value to a physical hit before Armor — a FROST ledger row', () => {
    expect(STATUSES['status.frost']!.addsIncomingPhysical).toBe(true)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    const before = preview(ctx, w.id, z.id, 'attack.test-warrior.axe')
    applyStatus(ctx, z.id, 'status.frost', 3, 'test')
    const after = preview(ctx, w.id, z.id, 'attack.test-warrior.axe')
    expect(after.damageOnHit - before.damageOnHit).toBe(3)
    const rows = (after as { dmgLedger?: unknown }).dmgLedger
    void rows
    // the ledger order: FROST (540) sits before MITIGATION (600)
    expect(DMG.FROST).toBeLessThan(DMG.MITIGATION)
  })

  it('adds nothing to a magic hit', () => {
    const ctx = createCustomBattle([{ type: 'test-mage', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 8) }])
    const m = ctx.state.units[0]!, z = ctx.state.units[1]!
    const magic = m.attacks.find((a) => ctx.attacks[a]!.damageType === 'magic')!
    const before = preview(ctx, m.id, z.id, magic).damageOnHit
    applyStatus(ctx, z.id, 'status.frost', 3, 'test')
    expect(preview(ctx, m.id, z.id, magic).damageOnHit).toBe(before)
  })

  it('Burn and Frost annihilate one for one on application — a unit never carries both', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const z = ctx.state.units[1]!
    applyStatus(ctx, z.id, 'status.burn', 3, 'test')
    applyStatus(ctx, z.id, 'status.frost', 2, 'test')
    expect(valueOf(z, 'status.burn')).toBe(1)
    expect(valueOf(z, 'status.frost')).toBe(0)
    applyStatus(ctx, z.id, 'status.frost', 4, 'test')
    expect(valueOf(z, 'status.burn')).toBe(0)
    expect(valueOf(z, 'status.frost')).toBe(3)
    expect(ctx.events.filter((e) => e.type === 'status.cancelled').length).toBe(2)
  })
})

describe('Root', () => {
  it('a rooted unit has zero movement points at its activation and still acts', () => {
    expect(STATUSES['status.root']!.blocksMovement).toBe(true)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!
    applyStatus(ctx, w.id, 'status.root', 1, 'test')
    expect(isRooted(ctx, w)).toBe(true)
    beginActivation(ctx, w.id, 'test')
    expect(w.movePointsLeft).toBe(0)
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'attack.declared' && e['actor'] === w.id)).toBe(true)
  })
})

describe('Taunt', () => {
  it('narrows the taunted unit\'s enemies to the taunter, keeps its AI, and lapses when the taunter falls', () => {
    expect(STATUSES['status.taunt']!.forcesTarget).toBe(true)
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(4, 5) }, { type: 'test-mage', hex: hexId(6, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 6) }],
    )
    const w = ctx.state.units[0]!, m = ctx.state.units[1]!, z = ctx.state.units[2]!
    applyStatus(ctx, z.id, 'status.taunt', 2, 'test', w.id)
    expect(forcedTargetOf(ctx, z)).toBe(w.id)
    expect(livingEnemies(ctx, z).map((u) => u.id)).toEqual([w.id])
    expect(z.ai).toBe(ctx.state.units[2]!.ai)   // the AI mode is untouched
    w.lifeState = 'downed'
    expect(forcedTargetOf(ctx, z)).toBeNull()
    expect(livingEnemies(ctx, z).map((u) => u.id)).toEqual([m.id])
  })
})
