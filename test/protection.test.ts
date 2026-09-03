// Protection — the pool shape made real. Codex (40 uses): "Protection decays 1
// a Phase and is spent by what it absorbs, so it limits itself." Absorbed at
// station PROTECTION (550, BEFORE armor/resist), spent by spendAbsorb after the
// hit lands — preview never spends. Battle sources are TESTING LANE:
// test.mage.arcane-ward (protection) and test.warrior.brace (the ward variant).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { TEST_COHORT } from '../src/content/index.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, tickStatuses, valueOf } from '../src/core/status.js'
import { resolvePowerDamage, usePower } from '../src/core/ability.js'
import { preview } from '../src/core/pipeline.js'
import { STATUSES } from '../src/content/statuses.js'
import { hexId } from '../src/core/hex.js'

function board() {
  const ctx = createCustomBattle(
    [{ type: 'mage', hex: hexId(5, 5) }],
    [{ type: 'zombie', hex: hexId(9, 5) }],
  )
  return { ctx, m: ctx.state.units[0]!, z: ctx.state.units[1]! }
}

describe('the data', () => {
  it('status.protection and its testing variant both declare the PROTECTION-station read', () => {
    for (const id of ['status.protection', 'test.status.ward']) {
      const def = STATUSES[id]!
      expect(def, id).toBeDefined()
      expect(def.reducesIncomingDamage, id).toBe(true)
      expect(def.shape, id).toBe('pool')
      expect(def.onPhaseEnd, id).toBeUndefined()   // it never ticks — it is spent
    }
  })
})

describe('a depleting pool that also decays (COMBAT-SEQUENCE)', () => {
  it('the backlog expect, exact: protection 3 hit for 2 absorbs 2 and drops to 1; End of Phase takes it to 0', () => {
    const { ctx, m, z } = board()
    applyStatus(ctx, z.id, 'status.protection', 3, 'test')
    // Weak the mage so the bolt asks exactly 2: 8 − 6 = 2.
    applyStatus(ctx, m.id, 'status.weak', 6, 'test')
    const hpBefore = z.hp
    const { damage } = usePower(ctx, m.id, z.id, 'power.mage.bolt')
    expect(damage).toBe(0)                                     // fully absorbed
    expect(z.hp).toBe(hpBefore)
    expect(valueOf(z, 'status.protection')).toBe(1)            // 3 − 2 spent
    tickStatuses(ctx, 'enemy')
    expect(valueOf(z, 'status.protection')).toBe(0)            // decay finishes it
  })

  it('absorbs at 550, BEFORE mitigation — the ledger says so in order', () => {
    const { ctx, m, z } = board()
    // The ledger skips no-op stations, so give the target real resist to make
    // the MITIGATION row exist at all.
    z.mods.push({ stat: 'resist', op: 'add', value: 2, source: 'test', scope: 'unit' })
    applyStatus(ctx, z.id, 'status.protection', 3, 'test')
    const r = resolvePowerDamage(ctx, m, z, ctx.abilities['power.mage.bolt']!, 3, 3)
    const names = r.ledger.map((row) => row.name)
    expect(names.indexOf('PROTECTION')).toBeGreaterThan(-1)
    expect(names.indexOf('MITIGATION')).toBeGreaterThan(names.indexOf('PROTECTION'))
    expect(r.ledger.find((row) => row.name === 'PROTECTION')!.delta).toBe(-3)
  })

  it('preview never spends: the pool is intact after the AI looks', () => {
    const { ctx, z } = board()
    const w = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(5, 6) }],
    )
    const zz = w.state.units[1]!
    applyStatus(w, zz.id, 'status.protection', 3, 'test')
    preview(w, 0, zz.id, 'attack.warrior.axe')
    expect(valueOf(zz, 'status.protection')).toBe(3)
    void z
  })

  it('additive when granted again (the answered protectionStacking switch)', () => {
    const { ctx, z } = board()
    applyStatus(ctx, z.id, 'status.protection', 2, 'test')
    applyStatus(ctx, z.id, 'status.protection', 2, 'test')
    expect(valueOf(z, 'status.protection')).toBe(4)
  })

  it('the ward variant absorbs identically, and Protection pays first (id order)', () => {
    const { ctx, m, z } = board()
    applyStatus(ctx, z.id, 'status.protection', 2, 'test')
    applyStatus(ctx, z.id, 'test.status.ward', 4, 'test')
    const hpBefore = z.hp
    const { damage } = usePower(ctx, m.id, z.id, 'power.mage.bolt')   // asks 8
    expect(damage).toBe(2)                                            // 6 absorbed
    expect(z.hp).toBe(hpBefore - 2)
    expect(valueOf(z, 'status.protection')).toBe(0)   // spent first — id order
    expect(valueOf(z, 'test.status.ward')).toBe(0)    // then the ward pays the rest
  })
})

// LAW 10 — 2026-09-02 (content.alpha-flip): the standard battle fields the ALPHA
// TEAM now, so the test-lane sources below no longer ride in it. The rule these
// tests check — "the battle source fires in a real, AI-driven battle" — is
// unchanged: the test-lane bearers are fielded explicitly (TEST_COHORT), and
// the AUTHORED counterpart is asserted in the standard battle itself, which is
// the stronger claim. Extended, never weakened.
describe('the battle sources fire in real battles', () => {
  it('the Air Mage\'s arcane-ward raises Protection in the STANDARD battle somewhere in the first 30 seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'alpha-air-mage.arcane-ward' && e['statusId'] === 'status.protection').length
    }
    expect(found).toBeGreaterThan(0)
  })

  it('arcane-ward raises Protection on the test mage somewhere in the first 30 seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, heroes: TEST_COHORT.heroes })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.mage.arcane-ward' && e['statusId'] === 'status.protection').length
    }
    expect(found).toBeGreaterThan(0)
  })

  it('brace raises the ward on the test warrior somewhere in the first 30 seeds', () => {
    let found = 0
    for (let r = 0; r < 30 && !found; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, heroes: TEST_COHORT.heroes })
      runBattle(ctx)
      found += ctx.events.filter((e) => e.type === 'status.applied'
        && e['causeId'] === 'test.warrior.brace' && e['statusId'] === 'test.status.ward').length
    }
    expect(found).toBeGreaterThan(0)
  })
})
