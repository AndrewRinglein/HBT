// Weak — −1 damage dealt per point, never the stats. GAME-DESIGN §5 (as
// "Weakness"); the Codex name is Weak (38 uses), fresh over stale. Read at
// pipeline station SOURCE_STATUS (250) by outgoingPenalty — the slot existed
// and was tested with synthetic ids; this is the content that makes it live.
// Battle sources are TESTING LANE: test.zombie.sap (backlog trigger.zombie.sap
// absorbed here — a SECOND independent 20% onDamage beside rot) and
// test.mage.dampen (the enfeeble variant's source).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, tickStatuses, valueOf } from '../src/core/status.js'
import { preview } from '../src/core/pipeline.js'
import { previewPower } from '../src/core/ability.js'
import { effective } from '../src/core/stats.js'
import { STATUSES } from '../src/content/statuses.js'
import { hexId } from '../src/core/hex.js'

function board() {
  const ctx = createCustomBattle(
    [{ type: 'warrior', hex: hexId(5, 5) }, { type: 'mage', hex: hexId(5, 4) }],
    [{ type: 'zombie', hex: hexId(5, 6) }],
  )
  return { ctx, w: ctx.state.units[0]!, m: ctx.state.units[1]!, z: ctx.state.units[2]! }
}

describe('the data', () => {
  it('status.weak and its testing variant both declare the SOURCE_STATUS read', () => {
    for (const id of ['status.weak', 'test.status.enfeeble']) {
      const def = STATUSES[id]!
      expect(def, id).toBeDefined()
      expect(def.reducesOutgoingDamage, id).toBe(true)
      expect(def.shape, id).toBe('modifier')
      expect(def.onPhaseEnd, id).toBeUndefined()   // it never ticks damage
    }
  })
})

describe('−1 damage per point, not the stats (GAME-DESIGN §5)', () => {
  it('the design sentence as an expect: axe minus 2, strength unchanged', () => {
    const { ctx, w } = board()
    const clean = preview(ctx, w.id, 2, 'attack.warrior.axe').damageOnHit  // 1 + 5 = 6
    applyStatus(ctx, w.id, 'status.weak', 2, 'test')
    expect(preview(ctx, w.id, 2, 'attack.warrior.axe').damageOnHit).toBe(clean - 2)
    expect(effective(ctx, w, 'strength').value).toBe(5)   // the stat itself is unchanged
  })

  it('over-stack floors at zero, never negative', () => {
    const { ctx, w } = board()
    applyStatus(ctx, w.id, 'status.weak', 9, 'test')
    expect(preview(ctx, w.id, 2, 'attack.warrior.axe').damageOnHit).toBe(0)
  })

  it('reaches powers through the one damage function', () => {
    const { ctx, m } = board()
    const clean = previewPower(ctx, m.id, 2, 'power.mage.bolt').damage    // 6 + 2 = 8
    applyStatus(ctx, m.id, 'status.weak', 3, 'test')
    expect(previewPower(ctx, m.id, 2, 'power.mage.bolt').damage).toBe(clean - 3)
  })

  it('the enfeeble variant subtracts identically — the station reads data, not a name', () => {
    const { ctx, w } = board()
    const clean = preview(ctx, w.id, 2, 'attack.warrior.axe').damageOnHit
    applyStatus(ctx, w.id, 'test.status.enfeeble', 2, 'test')
    expect(preview(ctx, w.id, 2, 'attack.warrior.axe').damageOnHit).toBe(clean - 2)
  })

  it('decays 1 per End of Phase and deals no tick damage on the way', () => {
    const { ctx, w } = board()
    const hp0 = w.hp
    applyStatus(ctx, w.id, 'status.weak', 2, 'test')
    tickStatuses(ctx, 'hero')
    expect(valueOf(w, 'status.weak')).toBe(1)
    tickStatuses(ctx, 'hero')
    expect(valueOf(w, 'status.weak')).toBe(0)
    expect(w.hp).toBe(hp0)
  })
})

describe('the battle sources fire in real battles', () => {
  it('sap weakens heroes; rot and sap roll independently on their own streams', () => {
    let sapped = 0, both = 0
    for (let r = 0; r < 30; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      const sapEvents = ctx.events.filter((e) => e.type === 'status.applied' && e['causeId'] === 'test.zombie.sap')
      sapped += sapEvents.length
      // same-attack double procs: a rot fire and a sap fire with the same seq neighbourhood
      const rotFired = new Set(ctx.events.filter((e) => e.type === 'trigger.fired' && e['causeId'] === 'trigger.zombie.rot').map((e) => e['ordinal']))
      both += ctx.events.filter((e) => e.type === 'trigger.fired' && e['causeId'] === 'test.zombie.sap' && rotFired.has(e['ordinal'])).length
    }
    expect(sapped).toBeGreaterThan(0)
    // independence sanity: sap fires far more often alone than together with rot
    expect(both).toBeLessThan(sapped)
  })

  it('dampen enfeebles zombies somewhere in the first 30 field seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.field' })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied' && e['causeId'] === 'test.mage.dampen').length
    }
    expect(found).toBeGreaterThan(0)
  })
})
