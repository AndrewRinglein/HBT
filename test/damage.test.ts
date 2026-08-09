import { describe, it, expect } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { resolveDamage, resolveAccuracy, preview, canAttack, reachOf } from '../src/core/pipeline.js'
import { ATTACKS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

// Adjacent pair, mid-board.
function pair(heroType: string, enemyType = 'zombie') {
  return createCustomBattle(
    [{ type: heroType, hex: hexId(5, 5) }],
    [{ type: enemyType, hex: hexId(6, 5) }],
  )
}

describe('FIRST-BATTLE expected numbers', () => {
  it('Zombie -> Warrior = 3 (4 strength, 1 armor)', () => {
    const ctx = createCustomBattle([{ type: 'warrior', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
    const z = ctx.state.units[1]!, w = ctx.state.units[0]!
    expect(resolveDamage(z, w, ATTACKS['attack.zombie.basic']!, false).value).toBe(3)
  })

  it('Zombie -> Ranger = 4 (no armor)', () => {
    const ctx = createCustomBattle([{ type: 'ranger', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
    const z = ctx.state.units[1]!, r = ctx.state.units[0]!
    expect(resolveDamage(z, r, ATTACKS['attack.zombie.basic']!, false).value).toBe(4)
  })

  it('Warrior Axe -> Zombie = 6', () => {
    const ctx = pair('warrior')
    expect(resolveDamage(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.warrior.axe']!, false).value).toBe(6)
  })

  it('Warrior Massive Strike -> Zombie = 8', () => {
    const ctx = pair('warrior')
    expect(resolveDamage(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.warrior.massive']!, false).value).toBe(8)
  })

  it('Ranger Bow -> Zombie = 5', () => {
    const ctx = pair('ranger')
    expect(resolveDamage(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.ranger.bow']!, false).value).toBe(5)
  })

  it('Warrior Punch -> Zombie = 4, Ranger Punch -> Zombie = 2', () => {
    expect(resolveDamage(pair('warrior').state.units[0]!, pair('warrior').state.units[1]!, ATTACKS['attack.punch']!, false).value).toBe(4)
    expect(resolveDamage(pair('ranger').state.units[0]!, pair('ranger').state.units[1]!, ATTACKS['attack.punch']!, false).value).toBe(2)
  })

  it('hits-to-kill matches the spec table', () => {
    const hits = (dmg: number, hp: number) => Math.ceil(hp / dmg)
    expect(hits(3, 10)).toBe(4)   // zombie -> warrior
    expect(hits(4, 7)).toBe(2)    // zombie -> ranger
    expect(hits(6, 10)).toBe(2)   // axe -> zombie
    expect(hits(8, 10)).toBe(2)   // massive -> zombie  <- same as axe
    expect(hits(5, 10)).toBe(2)   // bow -> zombie
  })

  it('Massive Strike buys nothing against a 10hp zombie — the predicted content finding', () => {
    const ctx = pair('warrior')
    const axe = resolveDamage(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.warrior.axe']!, false).value
    const massive = resolveDamage(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.warrior.massive']!, false).value
    expect(massive).toBeGreaterThan(axe)
    expect(Math.ceil(10 / massive)).toBe(Math.ceil(10 / axe))
  })

  it('damage never goes below zero', () => {
    const ctx = createCustomBattle([{ type: 'ranger', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
    const r = ctx.state.units[0]!
    const tank = { ...ctx.state.units[1]!, armor: 99 }
    expect(resolveDamage(r, tank, ATTACKS['attack.punch']!, false).value).toBe(0)
  })

  it('the ledger fully explains every damage number', () => {
    const ctx = pair('warrior')
    for (const id of Object.keys(ATTACKS)) {
      const d = resolveDamage(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS[id]!, false)
      expect(d.ledger.reduce((s, r) => s + r.delta, 0)).toBe(d.value)
    }
  })
})

describe('accuracy stations', () => {
  it('ranged loses 5 per hex past the first', () => {
    for (let d = 1; d <= 6; d++) {
      const ctx = createCustomBattle([{ type: 'ranger', hex: hexId(2,5) }], [{ type: 'zombie', hex: hexId(2+d,5) }])
      const acc = resolveAccuracy(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.ranger.bow']!).value
      expect(acc).toBe(d === 1 ? 90 - 20 : 90 - (d - 1) * 5)
    }
  })

  it('melee takes no range penalty', () => {
    const ctx = pair('warrior')
    expect(resolveAccuracy(ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.warrior.axe']!).value).toBe(80)
  })

  it('the accuracy value is not clamped — crit surplus survives', () => {
    const ctx = pair('warrior')
    const sniper = { ...ctx.state.units[0]!, accuracy: 160 }
    expect(resolveAccuracy(sniper, ctx.state.units[1]!, ATTACKS['attack.warrior.axe']!).value).toBe(160)
    expect(preview(ctx, 0, 1, 'attack.warrior.axe').hitChance).toBeLessThanOrEqual(100)
  })
})

describe('reach and legality', () => {
  it('bow reaches exactly 6, not 7', () => {
    const at6 = createCustomBattle([{ type: 'ranger', hex: hexId(2,5) }], [{ type: 'zombie', hex: hexId(8,5) }])
    const at7 = createCustomBattle([{ type: 'ranger', hex: hexId(2,5) }], [{ type: 'zombie', hex: hexId(9,5) }])
    expect(canAttack(at6, 0, 1, 'attack.ranger.bow')).toBe(true)
    expect(canAttack(at7, 0, 1, 'attack.ranger.bow')).toBe(false)
  })

  it('melee only reaches 1', () => {
    const adj = pair('warrior')
    const far = createCustomBattle([{ type: 'warrior', hex: hexId(2,5) }], [{ type: 'zombie', hex: hexId(4,5) }])
    expect(canAttack(adj, 0, 1, 'attack.warrior.axe')).toBe(true)
    expect(canAttack(far, 0, 1, 'attack.warrior.axe')).toBe(false)
  })

  it('hero Reach adds to ranged only', () => {
    const ctx = pair('ranger')
    const r = { ...ctx.state.units[0]!, reach: 2 }
    expect(reachOf(r, ATTACKS['attack.ranger.bow']!)).toBe(8)
    expect(reachOf(r, ATTACKS['attack.punch']!)).toBe(1)
  })

  it('cannot afford an attack without the stamina', () => {
    const ctx = pair('warrior')
    ctx.state.units[0]!.stamina = 1
    expect(canAttack(ctx, 0, 1, 'attack.warrior.massive')).toBe(false)
    expect(canAttack(ctx, 0, 1, 'attack.warrior.axe')).toBe(true)
    expect(canAttack(ctx, 0, 1, 'attack.punch')).toBe(true)
  })
})
