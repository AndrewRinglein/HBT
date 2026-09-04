// Law 1, restored: powers resolve through THE damage pipeline. Before
// 2026-08-20, ability.ts hand-rolled a second one that skipped SOURCE_STATUS,
// CRIT and PROTECTION — so Weakness could not have reduced a power, and
// Protection could not have absorbed one. These tests hold the door shut.
import { describe, expect, it } from 'vitest'
import type { StatusDef } from '../src/core/status.js'
import { applyStatus } from '../src/core/status.js'
import { previewPower, resolvePowerDamage, usePower } from '../src/core/ability.js'
import { createCustomBattle } from '../src/core/setup.js'
import { hexId } from './board16.js'

// Synthetic statuses: no CONTENT declares reducesOutgoingDamage or
// reducesIncomingDamage yet (they are slots), so the tests inject minimal defs
// to exercise the stations. When weakness/protection land as content, these
// can be replaced with the real ids.
function board() {
  const ctx = createCustomBattle(
    [{ type: 'test-mage', hex: hexId(5, 5) }],
    [{ type: 'test-zombie', hex: hexId(9, 5) }],
  )
  const statuses = ctx.statuses as Record<string, StatusDef>
  statuses['status.test-weak'] = { id: 'status.test-weak', name: 'TestWeak', shape: 'counter', stacking: 'add', reducesOutgoingDamage: true }
  statuses['status.test-ward'] = { id: 'status.test-ward', name: 'TestWard', shape: 'pool', stacking: 'add', reducesIncomingDamage: true }
  return { ctx, mage: ctx.state.units[0]!, zombie: ctx.state.units[1]! }
}

describe('one damage function (Law 1)', () => {
  it('baseline parity: an unmodified bolt resolves exactly as before the unification', () => {
    const { ctx } = board()
    // Arcane Bolt: bonus 6 + mage magic 2, magic damage vs resist 0 → 8.
    expect(previewPower(ctx, 0, 1, 'power.test-mage.bolt').damage).toBe(8)
  })

  it('SOURCE_STATUS now reaches powers: outgoing penalty reduces a bolt', () => {
    const { ctx, mage, zombie } = board()
    applyStatus(ctx, mage.id, 'status.test-weak', 3, 'test')
    const r = resolvePowerDamage(ctx, mage, zombie, ctx.abilities['power.test-mage.bolt']!, 3, 0)
    expect(r.value).toBe(5)
    expect(r.ledger.some((row) => row.name === 'SOURCE_STATUS' && row.delta === -3)).toBe(true)
  })

  it('PROTECTION now reaches powers: an absorb pool eats a bolt and is spent', () => {
    const { ctx, zombie } = board()
    applyStatus(ctx, zombie.id, 'status.test-ward', 3, 'test')
    const hpBefore = zombie.hp
    const { damage } = usePower(ctx, 0, 1, 'power.test-mage.bolt')
    expect(damage).toBe(5)                       // 8 asked, 3 absorbed
    expect(zombie.hp).toBe(hpBefore - 5)
    expect(zombie.statuses.find((s) => s.id === 'status.test-ward')).toBeUndefined() // 3 absorbed = pool spent
    const ev = ctx.events.filter((e) => e.type === 'damage.applied').pop()!
    expect(ev['absorbed']).toBe(3)
  })

  it('the preview and the applied number are the same code path, penalties included', () => {
    const { ctx, zombie } = board()
    applyStatus(ctx, zombie.id, 'status.test-ward', 2, 'test')
    const pv = previewPower(ctx, 0, 1, 'power.test-mage.bolt').damage
    const { damage } = usePower(ctx, 0, 1, 'power.test-mage.bolt')
    expect(damage).toBe(pv)
  })

  it('powers still cannot crit — Design Law 23 survives the unification', () => {
    const { ctx, mage, zombie } = board()
    const r = resolvePowerDamage(ctx, mage, zombie, ctx.abilities['power.test-mage.bolt']!)
    expect(r.ledger.some((row) => row.name === 'CRIT')).toBe(false)
  })
})
