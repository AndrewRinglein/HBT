// capability.auras (2026-09-03) — COMBAT-DESIGN §5, Design Law 27: "auras
// lend, they never give." A radius around a unit granting stat modifiers WHILE
// inside — derived on read like terrain; leaving is losing; overlaps stack.
// The Necromancer's +20 Accuracy / +1 Resist to Undead within 2 and its
// End-of-Activation heal-3 pulse are the first rows; the Balrog's −5 Movement
// to enemies within 2 the second.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { effective, auraMods } from '../src/core/stats.js'
import { beginActivation } from '../src/core/mutate.js'
import { UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from '../src/core/hex.js'
import { applyStatus } from '../src/core/status.js'

describe('lent, not given', () => {
  it('a zombie inside the Necromancer\'s aura has the row\'s Accuracy and Resist; step out and it is gone; a hero inside has nothing', () => {
    const aura = UNITS['unit.necromancer']!.auras!.find((a) => a.mods['accuracy'])!
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }],
      [{ type: 'unit.necromancer', hex: hexId(8, 8) }, { type: 'unit.zombie', hex: hexId(8, 9) }])
    const w = ctx.state.units[0]!, z = ctx.state.units[2]!
    const base = z.accuracy
    expect(effective(ctx, z, 'accuracy').value).toBe(base + aura.mods['accuracy']!)
    expect(effective(ctx, z, 'accuracy').ledger.some((r) => r.source === aura.id)).toBe(true)
    expect(effective(ctx, z, 'resist').value).toBe(z.resist + aura.mods['resist']!)
    z.hex = hexId(8, 12)   // beyond radius 2
    expect(effective(ctx, z, 'accuracy').value).toBe(base)
    w.hex = hexId(8, 7)
    expect(auraMods(ctx, w)).toEqual([])   // allies tagged Undead only
  })

  it('the Balrog\'s Imprisoning Aura takes Movement off enemies inside it, and beginActivation reads it', () => {
    const aura = UNITS['unit.balrog']!.auras!.find((a) => a.side === 'enemy')!
    expect(aura.mods['movement']).toBeLessThan(0)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.balrog', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    expect(w.movePointsLeft).toBe(Math.max(0, w.movement + aura.mods['movement']!))
  })

  it('a dead holder exerts nothing; two auras stack', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(0, 0) }],
      [{ type: 'unit.necromancer', hex: hexId(8, 8) }, { type: 'unit.bone-dragon', hex: hexId(8, 6) }, { type: 'unit.zombie', hex: hexId(8, 7) }])
    const n = ctx.state.units[1]!, z = ctx.state.units[3]!
    const both = effective(ctx, z, 'accuracy').value
    const nAcc = n.auras.find((a) => a.mods['accuracy'])!.mods['accuracy']!
    n.lifeState = 'dead'
    expect(effective(ctx, z, 'accuracy').value).toBe(both - nAcc)
  })

  it('the End-of-Activation pulse: the Necromancer heals its wounded undead within 2 through a heal trigger', () => {
    const pulse = UNITS['unit.necromancer']!.triggers!.find((t) => t.effect.kind === 'heal')!
    expect(pulse.hook).toBe('onActivationEnd')
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(0, 15) }],
      [{ type: 'unit.necromancer', hex: hexId(8, 8) }, { type: 'unit.zombie', hex: hexId(8, 9) }])
    const n = ctx.state.units[1]!, z = ctx.state.units[2]!
    z.hp = 1
    applyStatus(ctx, n.id, 'status.root', 9, 'test')   // the necromancer stays put, so its zombie stays inside 2
    applyStatus(ctx, z.id, 'status.root', 9, 'test')
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'heal.applied' && e.causeId === pulse.id && e['target'] === z.id)).toBe(true)
  })

  it('in Surrounded, the Necromancer lends its aura and the log ledgers it', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.surrounded')))
    runBattle(ctx)
    void ctx
    expect(UNITS['unit.necromancer']!.auras!.length).toBeGreaterThan(0)
  })
})
