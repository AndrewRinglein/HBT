import { describe, it, expect } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, valueOf, heal, tickStatuses } from '../src/core/status.js'
import { hexId } from '../src/core/hex.js'
import { preview, performAttack, resolveDamage } from '../src/core/pipeline.js'
import { ATTACKS } from '../src/content/index.js'

// A hero and a zombie in opposite corners never meet, so nothing but the
// status under test changes the board.
const isolated = () => createCustomBattle(
  [{ type: 'warrior', hex: hexId(0, 11) }], [{ type: 'zombie', hex: hexId(11, 0) }])

describe('status.poison', () => {
  it('gate 2 — 3 poison deals 3 then 2 then 1, then is gone', () => {
    // Ticked directly, so nothing else on the board can touch the number.
    const ctx = isolated()
    ctx.state.units[0]!.maxHp = 99
    ctx.state.units[0]!.hp = 99
    applyStatus(ctx, 0, 'status.poison', 3, 'test')
    const from = ctx.events.length
    for (let i = 0; i < 4; i++) tickStatuses(ctx, 'hero')
    const ticks = ctx.events.slice(from)
      .filter(e => e.type === 'damage.applied' && e.causeId === 'status.poison' && e.target === 0)
      .map(e => e['amount'] as number)
    expect(ticks).toEqual([3, 2, 1])
    expect(valueOf(ctx.state.units[0]!, 'status.poison')).toBe(0)
    expect(99 - ctx.state.units[0]!.hp).toBe(6)
  })

  it('gate 2 — a re-application mid-stack adds to what is left', () => {
    const ctx = isolated()
    ctx.state.units[0]!.maxHp = 99; ctx.state.units[0]!.hp = 99
    applyStatus(ctx, 0, 'status.poison', 3, 'test')
    tickStatuses(ctx, 'hero')                              // 3 damage, 3 -> 2
    applyStatus(ctx, 0, 'status.poison', 2, 'bite')        // 2 + 2 = 4
    expect(valueOf(ctx.state.units[0]!, 'status.poison')).toBe(4)
  })

  it('gate 2 — poison stacks additively', () => {
    const ctx = isolated()
    applyStatus(ctx, 0, 'status.poison', 2, 'test')
    applyStatus(ctx, 0, 'status.poison', 3, 'test')
    expect(valueOf(ctx.state.units[0]!, 'status.poison')).toBe(5)
  })

  it('gate 2 — ticks exactly once per turn', () => {
    const ctx = isolated()
    applyStatus(ctx, 0, 'status.poison', 4, 'test')
    const from = ctx.events.length
    runBattle(ctx)
    const byTurn = new Map<number, number>()
    for (const e of ctx.events.slice(from))
      if (e.type === 'damage.applied' && e.causeId === 'status.poison')
        byTurn.set(e.turn as number, (byTurn.get(e.turn as number) ?? 0) + 1)
    for (const n of byTurn.values()) expect(n).toBe(1)
  })

  it('gate 2 — the status is removed at zero, never left at 0 on a unit', () => {
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 10, strict: true })
      runBattle(ctx)
      for (const u of ctx.state.units) for (const s of u.statuses) expect(s.value).toBeGreaterThan(0)
    }
  })

  it('gate 1 — zombies poison heroes in real battles, and it ticks', () => {
    let applied = 0, ticked = 0, dmg = 0
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, strict: true })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'status.applied' && e['statusId'] === 'status.poison') applied++
        if (e.type === 'damage.applied' && e.causeId === 'status.poison') { ticked++; dmg += e['amount'] as number }
      }
    }
    expect(applied).toBeGreaterThan(0)
    expect(ticked).toBeGreaterThan(0)
    expect(dmg).toBeGreaterThan(0)
  })

  it('poison does not affect healing — only burn does that', () => {
    const ctx = isolated()
    ctx.state.units[0]!.hp = 4
    applyStatus(ctx, 0, 'status.poison', 3, 'test')
    expect(heal(ctx, 0, 4, 'test')).toBe(4)
  })

  it('a poisoned hero can still be killed by poison, and dies properly', () => {
    const ctx = isolated()
    ctx.state.units[0]!.hp = 3
    applyStatus(ctx, 0, 'status.poison', 5, 'test')
    runBattle(ctx)
    expect(['downed', 'dead']).toContain(ctx.state.units[0]!.lifeState)
    expect(ctx.state.outcome).toBe('wipe')
  })
})

describe('status.burn', () => {
  const iso = () => createCustomBattle(
    [{ type: 'warrior', hex: hexId(0, 11) }], [{ type: 'zombie', hex: hexId(11, 0) }])

  it('gate 2 — 3 burn deals 3 then 2 then 1, like poison', () => {
    const ctx = iso()
    ctx.state.units[0]!.maxHp = 99; ctx.state.units[0]!.hp = 99
    applyStatus(ctx, 0, 'status.burn', 3, 'test')
    const from = ctx.events.length
    for (let i = 0; i < 4; i++) tickStatuses(ctx, 'hero')
    expect(ctx.events.slice(from)
      .filter(e => e.type === 'damage.applied' && e.causeId === 'status.burn')
      .map(e => e['amount'] as number)).toEqual([3, 2, 1])
  })

  it('gate 2 — burn halves healing, truncated; poison does not', () => {
    const ctx = iso()
    ctx.state.units[0]!.hp = 2
    applyStatus(ctx, 0, 'status.burn', 3, 'test')
    expect(heal(ctx, 0, 5, 'test')).toBe(2)     // 5 -> 2, truncated
    ctx.state.units[0]!.hp = 2
    expect(heal(ctx, 0, 4, 'test')).toBe(2)     // 4 -> 2
  })

  it('gate 2 — burn and poison stack independently and both tick', () => {
    const ctx = iso()
    ctx.state.units[0]!.maxHp = 99; ctx.state.units[0]!.hp = 99
    applyStatus(ctx, 0, 'status.burn', 2, 'test')
    applyStatus(ctx, 0, 'status.poison', 3, 'test')
    const from = ctx.events.length
    tickStatuses(ctx, 'hero')
    const ticks = ctx.events.slice(from).filter(e => e.type === 'damage.applied')
    expect(ticks.map(e => e.causeId).sort()).toEqual(['status.burn', 'status.poison'])
    expect(99 - ctx.state.units[0]!.hp).toBe(5)
  })

  it('gate 1 — the Mage actually burns things in real battles', () => {
    let applied = 0, ticked = 0
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, strict: true })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'status.applied' && e['statusId'] === 'status.burn') applied++
        if (e.type === 'damage.applied' && e.causeId === 'status.burn') ticked++
      }
    }
    expect(applied).toBeGreaterThan(0)
    expect(ticked).toBeGreaterThan(0)
  })
})

describe('the status system itself', () => {
  const iso = () => createCustomBattle(
    [{ type: 'warrior', hex: hexId(0, 11) }], [{ type: 'zombie', hex: hexId(11, 0) }])

  it('one pass: every status acts and decays together, whatever its shape', () => {
    const ctx = iso()
    ctx.state.units[0]!.maxHp = 99; ctx.state.units[0]!.hp = 99
    applyStatus(ctx, 0, 'status.poison', 2, 'test')
    applyStatus(ctx, 0, 'status.burn', 2, 'test')
    tickStatuses(ctx, 'hero')
    expect(valueOf(ctx.state.units[0]!, 'status.poison')).toBe(1)
    expect(valueOf(ctx.state.units[0]!, 'status.burn')).toBe(1)
  })

  it('resolveDamage stays PURE — a preview never spends an absorbing status', () => {
    const ctx = iso()
    // A pool-shaped status, registered inline so the mechanism is exercised
    // before any content grants one.
    ;(ctx.statuses as Record<string, unknown>)['status.testward'] = {
      id: 'status.testward', name: 'Ward', shape: 'pool', stacking: 'add',
      reducesIncomingDamage: true,
    }
    applyStatus(ctx, 0, 'status.testward', 5, 'test')
    const before = valueOf(ctx.state.units[0]!, 'status.testward')
    preview(ctx, 1, 0, 'attack.zombie.basic')
    preview(ctx, 1, 0, 'attack.zombie.basic')
    expect(valueOf(ctx.state.units[0]!, 'status.testward')).toBe(before)
  })

  it('an absorbing status reduces the hit AND is spent by exactly what it absorbed', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }])
    ;(ctx.statuses as Record<string, unknown>)['status.testward'] = {
      id: 'status.testward', name: 'Ward', shape: 'pool', stacking: 'add',
      reducesIncomingDamage: true,
    }
    applyStatus(ctx, 0, 'status.testward', 2, 'test')
    const hp0 = ctx.state.units[0]!.hp
    const pv = preview(ctx, 1, 0, 'attack.zombie.basic')
    // zombie 4 strength, warrior 1 armour: normally 3. Ward 2 absorbs first.
    expect(pv.damageOnHit).toBe(1)
    performAttack(ctx, 1, 0, 'attack.zombie.basic')
    const hit = ctx.events.filter(e => e.type === 'damage.applied').pop()
    if (hit) {
      expect(hit['absorbed']).toBe(2)
      expect(hp0 - ctx.state.units[0]!.hp).toBe(1)
      expect(valueOf(ctx.state.units[0]!, 'status.testward')).toBe(0)
    }
  })

  it('the damage ledger still fully explains the number when a pool absorbs', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }])
    ;(ctx.statuses as Record<string, unknown>)['status.testward'] = {
      id: 'status.testward', name: 'Ward', shape: 'pool', stacking: 'add',
      reducesIncomingDamage: true,
    }
    applyStatus(ctx, 0, 'status.testward', 2, 'test')
    const d = resolveDamage(ctx.state.units[1]!, ctx.state.units[0]!,
      ATTACKS['attack.zombie.basic']!, false, 0, 2)
    expect(d.ledger.reduce((s, r) => s + r.delta, 0)).toBe(d.value)
    expect(d.absorbed).toBe(2)
    expect(d.ledger.map(r => r.name)).toContain('PROTECTION')
  })

  it('decayPerPhase 0 means the status lasts until something removes it', () => {
    const ctx = iso()
    ;(ctx.statuses as Record<string, unknown>)['status.testmark'] = {
      id: 'status.testmark', name: 'Mark', shape: 'flag', stacking: 'refresh', decayPerPhase: 0,
    }
    applyStatus(ctx, 0, 'status.testmark', 1, 'test')
    for (let i = 0; i < 5; i++) tickStatuses(ctx, 'hero')
    expect(valueOf(ctx.state.units[0]!, 'status.testmark')).toBe(1)
  })
})
