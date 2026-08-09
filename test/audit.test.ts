import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { UNITS, ATTACKS, ABILITIES } from '../src/content/index.js'
import { accuracyBonusOf, reachBonusOf, terrainOf } from '../src/content/maps.js'
import { distance } from '../src/core/hex.js'

// An INDEPENDENT auditor. It re-derives every number straight from the stat blocks
// in FIRST-BATTLE.md and compares against what the engine logged. It deliberately
// does not import the pipeline — if both were wrong the same way, this would miss it.

describe('independent audit of logged battles', () => {
  it('recomputes every damage number, hit chance, stamina change and move from first principles', () => {
    let checkedDamage = 0, checkedAcc = 0, checkedStamina = 0, checkedMoves = 0

    for (let r = 0; r < 60; r++) {
      const mapId = ['open','ridge','flanks','highlands'][r % 4]!
      const ctx = createBattle({ replicate: r, enemyCount: r % 2 ? 4 : 8, mapId, strict: true })
      runBattle(ctx)
      const terr = terrainOf(mapId)

      const type = new Map<number, string>()
      const hex = new Map<number, number>()
      const stamina = new Map<number, number>()
      let pending: { actor: number; target: number; attackId: string; dist: number } | null = null
      let pendingPower: { actor: number; target: number; abilityId: string } | null = null

      for (const e of ctx.events) {
        switch (e.type) {
          case 'unit.enter': {
            const t = e['typeId'] as string
            type.set(e.actor!, t)
            hex.set(e.actor!, e['hex'] as number)
            stamina.set(e.actor!, UNITS[t]!.maxStamina)
            break
          }

          case 'moved': {
            const t = UNITS[type.get(e.actor!)!]!
            // one hex per point, and never more than the unit's movement
            expect(distance(e['from'] as number, e['to'] as number), 'a step is one hex').toBe(1)
            expect(e['cost']).toBe(terr[e['to'] as number] === 1 ? 2 : 1)
            expect(e['movePointsLeft'] as number).toBeGreaterThanOrEqual(0)
            expect(e['movePointsLeft'] as number).toBeLessThanOrEqual(t.movement - 1)
            hex.set(e.actor!, e['to'] as number)
            checkedMoves++
            break
          }

          case 'stamina.spent': {
            const before = stamina.get(e.actor!)!
            expect(before - (e['amount'] as number), 'stamina arithmetic').toBe(e['stamina'])
            expect(e['stamina'] as number).toBeGreaterThanOrEqual(0)
            stamina.set(e.actor!, e['stamina'] as number)
            checkedStamina++
            break
          }
          case 'stamina.regen': {
            const t = UNITS[type.get(e.actor!)!]!
            const before = stamina.get(e.actor!)!
            expect(e['stamina']).toBe(Math.min(t.maxStamina, before + t.staminaRegen))
            stamina.set(e.actor!, e['stamina'] as number)
            break
          }

          case 'attack.declared': {
            const at = UNITS[type.get(e.actor!)!]!
            const a = ATTACKS[e['attackId'] as string]!
            const d = distance(hex.get(e.actor!)!, hex.get(e.target!)!)
            expect(d, 'logged distance').toBe(e['distance'])

            // reach: hero Reach and high ground add to ranged only
            const myTerr = terr[hex.get(e.actor!)!]!
            const reach = a.kind === 'ranged' ? a.reach + at.reach + reachBonusOf(myTerr) : a.reach
            expect(d, 'attack was within reach').toBeLessThanOrEqual(reach)

            // accuracy, recomputed
            let acc = at.accuracy
            if (a.kind === 'ranged') acc += d === 1 ? -20 : -(d - 1) * 5
            acc += accuracyBonusOf(myTerr)
            expect(e['hitChance'], `hit chance for ${a.id} at range ${d}`).toBe(Math.max(0, Math.min(100, acc)))
            checkedAcc++

            pending = { actor: e.actor!, target: e.target!, attackId: a.id, dist: d }
            break
          }

          case 'power.used': {
            const at = UNITS[type.get(e.actor!)!]!
            const ab = ABILITIES[e['abilityId'] as string]!
            const d = distance(hex.get(e.actor!)!, hex.get(e.target!)!)
            expect(d, 'power was within range').toBeLessThanOrEqual(ab.range)
            expect(d).toBe(e['distance'])
            pendingPower = { actor: e.actor!, target: e.target!, abilityId: ab.id }
            pending = null
            break
          }

          case 'damage.applied': {
            if (pendingPower) {
              const at = UNITS[type.get(pendingPower.actor)!]!
              const tg = UNITS[type.get(pendingPower.target)!]!
              const ab = ABILITIES[pendingPower.abilityId]!
              const stat = ab.stat === 'strength' ? at.strength : ab.stat === 'magic' ? at.magic : at.precision
              const mit = ab.damageType === 'physical' ? tg.armor : ab.damageType === 'magic' ? tg.resist : 0
              const expected = Math.max(0, ab.bonus + stat - mit)
              expect((e['amount'] as number) + (e['overkill'] as number), `${ab.id} damage`).toBe(expected)
              checkedDamage++
              pendingPower = null
              break
            }
            if (!pending) break
            const at = UNITS[type.get(pending.actor)!]!
            const tg = UNITS[type.get(pending.target)!]!
            const a = ATTACKS[pending.attackId]!
            const stat = a.stat === 'strength' ? at.strength : at.precision
            const mit = a.damageType === 'physical' ? tg.armor : tg.resist
            const expected = Math.max(0, a.bonus + stat - mit)
            const total = (e['amount'] as number) + (e['overkill'] as number)
            expect(total, `${a.id} damage`).toBe(expected)
            expect(e['hpBefore'] as number - (e['amount'] as number)).toBe(e['hpAfter'])
            checkedDamage++
            pending = null
            break
          }
        }
      }
    }

    expect(checkedDamage).toBeGreaterThan(500)
    expect(checkedAcc).toBeGreaterThan(500)
    expect(checkedStamina).toBeGreaterThan(500)
    expect(checkedMoves).toBeGreaterThan(1000)
  })

  it('the specific expected numbers appear in real battles, not just unit tests', () => {
    const seen = new Set<string>()
    for (let r = 0; r < 200; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      const type = new Map<number, string>()
      let atk: string | null = null
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'attack.declared') atk = e['attackId'] as string
        if (e.type === 'damage.applied' && atk) {
          const total = (e['amount'] as number) + (e['overkill'] as number)
          seen.add(`${atk}->${type.get(e.target!)}=${total}`)
          atk = null
        }
      }
    }
    expect(seen, 'zombie -> warrior = 3').toContain('attack.zombie.basic->warrior=3')
    expect(seen, 'zombie -> ranger = 4').toContain('attack.zombie.basic->ranger=4')
    expect(seen, 'axe -> zombie = 6').toContain('attack.warrior.axe->zombie=6')
    expect(seen, 'massive -> zombie = 8').toContain('attack.warrior.massive->zombie=8')
    expect(seen, 'bow -> zombie = 5').toContain('attack.ranger.bow->zombie=5')
  })

  it('observed hit rates converge on the declared accuracies', () => {
    const tally: Record<string, { swings: number; hits: number }> = {}
    for (let r = 0; r < 400; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      let key: string | null = null
      for (const e of ctx.events) {
        if (e.type === 'attack.declared') {
          key = `${e['attackId']}@${e['hitChance']}`
          tally[key] ??= { swings: 0, hits: 0 }
          tally[key]!.swings++
        }
        if (e.type === 'attack.hit' && key) tally[key]!.hits++
        if (e.type === 'attack.miss' || e.type === 'attack.hit') key = null
      }
    }
    for (const [k, v] of Object.entries(tally)) {
      if (v.swings < 400) continue
      const declared = Number(k.split('@')[1])
      const observed = (v.hits / v.swings) * 100
      expect(Math.abs(observed - declared), `${k}: observed ${observed.toFixed(1)}%`).toBeLessThan(6)
    }
  })
})
