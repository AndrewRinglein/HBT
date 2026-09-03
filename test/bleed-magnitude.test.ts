// fix.bleed-magnitude (2026-09-02) — Bleed is a MAGNITUDE that healing cures.
// Codex S41 (adb627b), ruled verbatim: "Bleed is True Damage." / "Bleed is
// being converted to magnitude damage. Also healing should cure bleed. Regen
// should be healing." S43: "karma and bonuses to healing before Burn, then
// halved, then applied" — half the applied amount comes off Bleed.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, tickStatuses, valueOf } from '../src/core/status.js'
import { applyHealing } from '../src/core/mutate.js'
import { STATUSES } from '../src/content/statuses.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from '../src/core/hex.js'

const rig = () => createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(9, 9) }])

describe('the tick is the value, true', () => {
  it('Bleed 5 ticks 5,4,3,2,1 — resist 2 changes nothing', () => {
    const ctx = rig()
    const w = ctx.state.units[0]!
    w.resist = 2
    w.maxHp = 20; w.hp = 20   // room for the whole ramp: 5+4+3+2+1 = 15
    applyStatus(ctx, 0, 'status.bleed', 5, 'test')
    const ticks: number[] = []
    for (let i = 0; i < 6; i++) {
      const before = w.hp
      tickStatuses(ctx, 'hero')
      ticks.push(before - w.hp)
      if (w.hp <= 0) break
    }
    expect(ticks.slice(0, 5)).toEqual([5, 4, 3, 2, 1])
    expect(w.hp).toBe(5)
    const dmg = ctx.events.filter((e) => e.type === 'damage.applied' && e.causeId === 'status.bleed')
    expect(dmg[0]!['damageType']).toBe('true')
    expect(dmg[0]!['resisted']).toBeUndefined()
  })
  it('the row says shedByHealing, and Bleed is not the only row that does — the mechanism is a flag', () => {
    expect(STATUSES['status.bleed']!.shedByHealing).toBe('half')
    expect(STATUSES['test.status.gash']!.shedByHealing).toBe('half')
    expect(STATUSES['status.poison']!.shedByHealing).toBeUndefined()
  })
})

describe('healing sheds half, rounded nearest with 0.5 up, through the one heal mutator', () => {
  it('a 4-point heal on Bleed 3 leaves Bleed 1; the log carries status.reduced by 2 with the heal as cause', () => {
    const ctx = rig()
    const w = ctx.state.units[0]!
    w.hp = 4
    applyStatus(ctx, 0, 'status.bleed', 3, 'test')
    applyHealing(ctx, 0, 4, 'test.heal')
    expect(w.hp).toBe(8)
    expect(valueOf(w, 'status.bleed')).toBe(1)
    const red = ctx.events.find((e) => e.type === 'status.reduced' && e['statusId'] === 'status.bleed')!
    expect(red.causeId).toBe('test.heal')
    expect(red['by']).toBe(2)
    // the heal event comes first — heal, then shed
    expect(ctx.events.findIndex((e) => e.type === 'heal.applied')).toBeLessThan(ctx.events.indexOf(red))
  })
  it('odd halves round UP: a 3-point heal sheds 2; a 1-point heal sheds 1', () => {
    const ctx = rig()
    const w = ctx.state.units[0]!
    w.hp = 2
    applyStatus(ctx, 0, 'status.bleed', 5, 'test')
    applyHealing(ctx, 0, 3, 'test.heal')
    expect(valueOf(w, 'status.bleed')).toBe(3)
    applyHealing(ctx, 0, 1, 'test.heal')
    expect(valueOf(w, 'status.bleed')).toBe(2)
  })
  it('Burn halves the heal FIRST — Regeneration 2 under Burn heals 1 and sheds 1 (S43: a burning unit sheds a quarter)', () => {
    const ctx = rig()
    const w = ctx.state.units[0]!
    w.maxHp = 20; w.hp = 12
    // Burn 2 so it is still present (1) when Regeneration ticks after it —
    // statuses tick in id order: bleed, burn, regeneration.
    applyStatus(ctx, 0, 'status.burn', 2, 'test')
    applyStatus(ctx, 0, 'status.bleed', 4, 'test')
    applyStatus(ctx, 0, 'status.regeneration', 2, 'test')
    // End of Phase: bleed ticks 4 true, burn ticks 2 magic, regen heals trunc(2/2)=1
    const hpBefore = w.hp
    tickStatuses(ctx, 'hero')
    const heal = ctx.events.find((e) => e.type === 'heal.applied' && e.causeId === 'status.regeneration')!
    expect(heal['amount']).toBe(1)
    expect(heal['halvedBy']).toBe('status.burn')
    const shed = ctx.events.find((e) => e.type === 'status.reduced' && e['statusId'] === 'status.bleed' && e.causeId === 'status.regeneration')!
    expect(shed['by']).toBe(1)
    expect(w.hp).toBe(hpBefore - 4 - 2 + 1)
  })
  it('a shed that empties the status expires it, like any other reduction', () => {
    const ctx = rig()
    const w = ctx.state.units[0]!
    w.hp = 1
    applyStatus(ctx, 0, 'status.bleed', 1, 'test')
    applyHealing(ctx, 0, 2, 'test.heal')
    expect(w.statuses.find((s) => s.id === 'status.bleed')).toBeUndefined()
    expect(ctx.events.some((e) => e.type === 'status.expired' && e['statusId'] === 'status.bleed' && e.causeId === 'test.heal')).toBe(true)
  })
  it('the switch: at full health nothing lands, so the landed base sheds nothing; the asked-after-Burn base still sheds', () => {
    const a = rig()
    applyStatus(a, 0, 'status.bleed', 4, 'test')
    applyHealing(a, 0, 4, 'test.heal')
    expect(valueOf(a.state.units[0]!, 'status.bleed')).toBe(4)
    const b = rig()
    b.cfg.switches.bleedShedFromLanded = false
    applyStatus(b, 0, 'status.bleed', 4, 'test')
    applyHealing(b, 0, 4, 'test.heal')
    expect(valueOf(b.state.units[0]!, 'status.bleed')).toBe(2)
  })
})

describe('in real battles', () => {
  it('the Alpha Team bleeds zombies in the standard battle and a heal sheds it somewhere in the first 40 seeds', () => {
    let ticks = 0, sheds = 0
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 }); runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'damage.applied' && e.causeId === 'status.bleed') { ticks++; expect(e['damageType']).toBe('true') }
        if (e.type === 'status.reduced' && e['statusId'] === 'status.bleed' && !String(e.causeId).startsWith('status.bleed')) sheds++
      }
    }
    expect(ticks).toBeGreaterThan(0)
    // zombies never heal, so the sheds must come from heroes being healed while bleeding
    expect(sheds).toBeGreaterThan(0)
  })
  it('the gash variant: a second shedByHealing status is healed off in showcase.gash-variant', () => {
    let sheds = 0
    for (let r = 0; r < 20 && !sheds; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.gash-variant')), replicate: r }); runBattle(ctx)
      sheds += ctx.events.filter((e) => e.type === 'status.reduced' && e['statusId'] === 'test.status.gash'
        && e.causeId === 'power.holy-symbol.heal').length
    }
    expect(sheds).toBeGreaterThan(0)
  })
})
