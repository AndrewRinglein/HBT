// ability.effects (2026-09-03) — powers speak the trigger vocabulary and more.
//
// Backlog: "Abilities get the trigger effect vocabulary (status.apply /
// status.remove / damage / knockback) ..." plus heal, a stat modifier with a
// lifetime, and self-damage — what the class powers say. Every row here is a
// Codex class power compiled by the converter from its exact sentence; the
// tests read the rows and assert the engine did what the row says.
import { describe, expect, it } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canUsePower, usePower, previewPower, powerTargetsOf } from '../src/core/ability.js'
import { beginActivation } from '../src/core/mutate.js'
import { valueOf } from '../src/core/status.js'
import { effective } from '../src/core/stats.js'
import { ABILITIES } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from '../src/core/hex.js'
import type { AbilityEffect } from '../src/core/types.js'

const AEGIS = 'power.sacred-shield.aegis'
const CIRCLE = 'power.shepherd.circle-of-healing'
const MIGHT = 'power.fire-master.eldritch-might'
const PRAYER = 'power.shepherd.prayer'
const FIREBALL = 'power.fire-master.fireball'

function board(powers: string[]) {
  const ctx = createCustomBattle(
    [{ type: 'test-warrior', hex: hexId(5, 5) }, { type: 'test-mage', hex: hexId(6, 5) }],
    [{ type: 'test-zombie', hex: hexId(5, 8) }, { type: 'test-zombie', hex: hexId(6, 8) }],
  )
  const w = ctx.state.units[0]!, m = ctx.state.units[1]!
  w.abilities.push(...powers); w.stamina = 99
  return { ctx, w, m, z: ctx.state.units[2]! }
}
const eff = (id: string, kind: AbilityEffect['kind']) => ABILITIES[id]!.effects!.find((e) => e.kind === kind)!

describe('the effect vocabulary, one row each', () => {
  it('status.apply with a Spirit-scaled value — Aegis gives the target Protection 3 + Spirit', () => {
    const { ctx, w, m } = board([AEGIS])
    beginActivation(ctx, w.id, 'test')
    expect(canUsePower(ctx, w.id, m.id, AEGIS)).toBe(true)
    usePower(ctx, w.id, m.id, AEGIS)
    const spec = eff(AEGIS, 'status.apply') as { value: { base: number } }
    const partySpirit = w.spirit + m.spirit
    expect(valueOf(m, 'status.protection')).toBe(spec.value.base + partySpirit)
  })

  it('area heal on the caster\'s circle — Circle of Healing heals every ally within its radius, the caster included', () => {
    const { ctx, w, m } = board([CIRCLE])
    w.hp = 1; m.hp = 1
    beginActivation(ctx, w.id, 'test')
    const targets = powerTargetsOf(ctx, w.id, w.id, ABILITIES[CIRCLE]!)
    expect(targets).toEqual([w.id, m.id])
    const amount = previewPower(ctx, w.id, w.id, CIRCLE).heal!
    usePower(ctx, w.id, w.id, CIRCLE)
    expect(w.hp).toBe(Math.min(w.maxHp, 1 + amount))
    expect(m.hp).toBe(Math.min(m.maxHp, 1 + amount))
  })

  it('selfDamage + a battle-long statMod — Eldritch Might costs Health now and raises Magic for the rest of the Battle', () => {
    const { ctx, w } = board([MIGHT])
    const before = w.hp, magic = effective(ctx, w, 'magic').value
    beginActivation(ctx, w.id, 'test')
    usePower(ctx, w.id, w.id, MIGHT)
    const dmg = eff(MIGHT, 'selfDamage') as { amount: number }
    const mod = eff(MIGHT, 'statMod') as { value: number }
    expect(w.hp).toBe(before - dmg.amount)
    expect(effective(ctx, w, 'magic').value).toBe(magic + mod.value)
    ctx.state.turn += 10
    expect(effective(ctx, w, 'magic').value).toBe(magic + mod.value)   // the rest of the Battle
  })

  it('a free power does not spend the primary action; a warmup power is not ready on Turn 1', () => {
    const { ctx, w, m } = board([PRAYER])
    m.hp = 1
    expect(ABILITIES[PRAYER]!.free).toBe(true)
    beginActivation(ctx, w.id, 'test')
    usePower(ctx, w.id, m.id, PRAYER)
    expect(w.primaryUsed).toBe(false)
    // warmup: Fireball on a fresh unit is not ready until turn warmup+1
    const f = ABILITIES[FIREBALL]!
    expect(f.warmup).toBeGreaterThan(0)
    const ctx2 = createBattle({ ...scenarioOptions(scenarioDef('showcase.assembled-party')) })
    const mage = ctx2.state.units.find((u) => u.abilities.includes(FIREBALL))!
    expect(mage.cooldowns[FIREBALL]).toBe(f.warmup! + 1)
  })

  it('an inert power says why — every class power with no effects names its gaps', () => {
    const rows = Object.values(ABILITIES).filter((a) => a.effects && a.effects.length === 0)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.gaps!.length, r.id).toBeGreaterThan(0)
  })
})

describe('alive in a real battle', () => {
  it('the assembled party uses its powers — a heal, a buff and an area blast all fire', () => {
    const used = new Set<string>()
    for (let r = 0; r < 3; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.assembled-party')), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) if (e.type === 'power.used') used.add(String(e.causeId))
    }
    expect(used.has(AEGIS)).toBe(true)
    expect(used.has(CIRCLE)).toBe(true)
    expect(used.has(FIREBALL)).toBe(true)
  })
})
