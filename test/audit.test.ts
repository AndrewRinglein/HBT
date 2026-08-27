import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { UNITS, ATTACKS, ABILITIES } from '../src/content/index.js'
import { STATUSES } from '../src/content/statuses.js'
import { MOVES } from '../src/content/moves.js'
import { accuracyBonusOf, dodgeBonusOf, reachBonusOf, terrainOf } from '../src/content/maps.js'
import { distance } from '../src/core/hex.js'

// An INDEPENDENT auditor. It re-derives every number straight from the stat blocks
// in FIRST-BATTLE.md and compares against what the engine logged. It deliberately
// does not import the pipeline — if both were wrong the same way, this would miss it.

describe('independent audit of logged battles', () => {
  it('recomputes every damage number, hit chance, stamina change and move from first principles', () => {
    let checkedDamage = 0, checkedAcc = 0, checkedStamina = 0, checkedMoves = 0

    for (let r = 0; r < 60; r++) {
      const mapId = ['map.open','map.ridge','map.flanks','map.highlands'][r % 4]!
      const ctx = createBattle({ replicate: r, enemyCount: r % 2 ? 4 : 8, mapId, strict: true })
      runBattle(ctx)
      const terr = terrainOf(mapId)

      const type = new Map<number, string>()
      const hex = new Map<number, number>()
      const stamina = new Map<number, number>()
      // movement.bonus-actions (2026-08-25): Devotion moves the CEILING, so the
      // auditor tracks live max per unit instead of trusting the static def.
      const maxStam = new Map<number, number>()
      // movement.bonus-actions (2026-08-25): riders add stored stat mods, and
      // the event carries stat/value/expiry — so the auditor keeps its own mod
      // ledger and recomputes the EFFECTIVE stat, exactly like the engine.
      const statMods = new Map<number, { stat: string; value: number; expiresAtTurn?: number }[]>()
      const modded = (actor: number, statName: string, base: number, turn: number) =>
        base + (statMods.get(actor) ?? [])
          .filter((m) => m.stat === statName && (m.expiresAtTurn === undefined || turn < m.expiresAtTurn))
          .reduce((sum, m) => sum + m.value, 0)
      // Side and standing-ness, tracked only so the auditor can re-derive the
      // ranged adjacency penalty, which is a question about the SHOOTER's
      // surroundings rather than about the target's distance.
      const side = new Map<number, string>()
      const standing = new Set<number>()
      // The auditor LEARNED SOURCE_STATUS on 2026-08-20 (the status.weakness
      // landing made the station live): damage dealt is reduced by the
      // attacker's active outgoing-penalty stacks, tracked here independently
      // from the status events. It re-derives WHICH statuses penalize from the
      // registry flag — data, not a hardcoded name list.
      const outPenalty = new Map<number, Map<string, number>>()
      const penaltyOf = (id: number) =>
        [...(outPenalty.get(id) ?? new Map()).values()].reduce((a, b) => a + b, 0)
      let pending: { actor: number; target: number; attackId: string; dist: number } | null = null
      let pendingPower: { actor: number; target: number; abilityId: string } | null = null

      for (const e of ctx.events) {
        switch (e.type) {
          case 'unit.enter': {
            const t = e['typeId'] as string
            type.set(e.actor!, t)
            hex.set(e.actor!, e['hex'] as number)
            stamina.set(e.actor!, UNITS[t]!.maxStamina)
            maxStam.set(e.actor!, UNITS[t]!.maxStamina)
            side.set(e.actor!, e['side'] as string)
            standing.add(e.actor!)
            break
          }

          case 'life.downed':
          case 'life.dead':
            standing.delete(e.target!)
            break

          case 'status.applied': case 'status.reduced': {
            const sid = e['statusId'] as string
            if (!STATUSES[sid]?.reducesOutgoingDamage) break
            const m = outPenalty.get(e.target!) ?? new Map<string, number>()
            m.set(sid, e['after'] as number)
            outPenalty.set(e.target!, m)
            break
          }
          case 'status.expired': {
            outPenalty.get(e.target!)?.delete(e['statusId'] as string)
            break
          }

          case 'moved': {
            const t = UNITS[type.get(e.actor!)!]!
            // one hex per point — except a bonus move, whose stepRange is the
            // PUBLISHED size of its jump (Leap: "move exactly 2 hexes",
            // movement.bonus-actions 2026-08-25). The auditor recomputes the
            // allowed distance from the causing power's own row — widened to
            // follow the rule, not loosened: a 3-hex leap would still fail.
            const mp = MOVES[String(e.causeId)]
            const allowed = mp && mp.shape === 'sidestep' ? Math.max(1, mp.stepRange ?? 1) : 1
            expect(distance(e['from'] as number, e['to'] as number), 'a step is its power\'s size').toBeLessThanOrEqual(allowed)
            // The auditor learned the movement CHOICE 2026-08-21 (Law 10:
            // rule widened, not weakened): every moved event now names its
            // power as causeId, and a sidestep-shaped power ignores terrain
            // cost BY THE PUBLISHED RULE ("the destination's terrain cost is
            // irrelevant"), so its recomputed cost is 0. A path-shaped move
            // still pays the terrain, recomputed from the board as before.
            const shape = MOVES[e.causeId]?.shape
            expect(shape, `moved must be caused by a movement power (got '${e.causeId}')`).toBeDefined()
            expect(e['cost']).toBe(shape === 'sidestep' ? 0 : terr[e['to'] as number] === 1 ? 2 : 1)
            expect(e['movePointsLeft'] as number).toBeGreaterThanOrEqual(0)
            expect(e['movePointsLeft'] as number).toBeLessThanOrEqual(t.movement - (shape === 'sidestep' ? 0 : 1))
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
            // Live max, not the def's: Devotion docks the ceiling mid-battle.
            expect(e['stamina']).toBe(Math.min(maxStam.get(e.actor!)!, before + t.staminaRegen))
            stamina.set(e.actor!, e['stamina'] as number)
            break
          }

          // movement.bonus-actions (2026-08-25) — the auditor EXTENDED, not
          // weakened: two new mutator events join the stamina ledger so the
          // running model stays exact. Leaving them out made every later
          // spend's arithmetic wrong, which is precisely the audit working.
          case 'statmod.added': {
            const list = statMods.get(e.actor!) ?? []
            list.push({ stat: e['stat'] as string, value: e['value'] as number,
              ...(e['expiresAtTurn'] !== undefined ? { expiresAtTurn: e['expiresAtTurn'] as number } : {}) })
            statMods.set(e.actor!, list)
            break
          }
          case 'stamina.gained': {
            const before = stamina.get(e.actor!)!
            expect(before + (e['amount'] as number), 'gain arithmetic').toBe(e['stamina'])
            expect(e['stamina'] as number, 'gain may never overfill').toBeLessThanOrEqual(maxStam.get(e.actor!)!)
            stamina.set(e.actor!, e['stamina'] as number)
            break
          }
          case 'staminaMax.lost': {
            const beforeMax = maxStam.get(e.actor!)!
            expect(beforeMax - (e['amount'] as number), 'max arithmetic').toBe(e['maxStamina'])
            expect(e['maxStamina'] as number, 'the wounds floor').toBeGreaterThanOrEqual(1)
            maxStam.set(e.actor!, e['maxStamina'] as number)
            expect(e['stamina'] as number, 'stamina clamped to the new ceiling').toBeLessThanOrEqual(e['maxStamina'] as number)
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

            // A ranged attack may not target an adjacent enemy at all.
            // Angela 2026-08-15; GAME-DESIGN.md §4.
            if (a.kind === 'ranged') expect(d, 'ranged never targets an adjacent enemy').toBeGreaterThan(1)

            // accuracy, recomputed.
            //
            // CHANGED 2026-08-15, and this auditor is the reason the change was safe
            // to make: the −20 is charged when a living enemy is adjacent to the
            // SHOOTER, whatever the shooter is aiming at. It used to be charged when
            // the TARGET was at distance 1 — the case that is now illegal. Both
            // halves were wrong at once, so the old assertion passed: the penalty
            // was always being paid by somebody.
            let acc = at.accuracy
            if (a.kind === 'ranged') {
              // range grace of 3 tiles, ruled 2026-08-26 — penalty from the 4th
              if (d > 3) acc -= (d - 3) * 5
              const me = hex.get(e.actor!)!
              const mySide = side.get(e.actor!)!
              const inMelee = [...standing].some(
                (id) => side.get(id) !== mySide && distance(me, hex.get(id)!) === 1)
              if (inMelee) acc -= 20
            }
            acc += accuracyBonusOf(myTerr)
            // The auditor learned TARGET_DODGE on 2026-08-20 — the Codex
            // cohort brought the first nonzero dodge (Dusk Hawk 5), and dodge
            // is flat off the hit chance, plus whatever the target's terrain
            // grants (forest +10).
            const tgDef = UNITS[type.get(e.target!)!]!
            acc -= tgDef.dodge + dodgeBonusOf(terr[hex.get(e.target!)!] ?? 0)
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
            // Status ticks are damage with no attack and no attacker.
            if (e.causeId.startsWith('status.')) {
              expect(e.actor, 'status damage has no attacker').toBeNull()
              expect(e['amount'] as number).toBeGreaterThanOrEqual(0)
              pending = null; pendingPower = null
              break
            }
            if (pendingPower) {
              const at = UNITS[type.get(pendingPower.actor)!]!
              const tg = UNITS[type.get(pendingPower.target)!]!
              const ab = ABILITIES[pendingPower.abilityId]!
              const stat = modded(pendingPower.actor, ab.stat,
              ab.stat === 'strength' ? at.strength : ab.stat === 'magic' ? at.magic : at.precision, e.turn)
              const mit = ab.damageType === 'physical' ? tg.armor : ab.damageType === 'magic' ? tg.resist : 0
              // The auditor learned PROTECTION with the status.protection
              // landing (2026-08-20): the event names what a pool absorbed, and
              // the pipeline subtracts it before mitigation.
              const expected = Math.max(0, ab.bonus + stat - penaltyOf(pendingPower.actor)
                - ((e['absorbed'] as number) ?? 0) - mit)
              expect((e['amount'] as number) + (e['overkill'] as number), `${ab.id} damage`).toBe(expected)
              checkedDamage++
              pendingPower = null
              break
            }
            if (!pending) break
            const at = UNITS[type.get(pending.actor)!]!
            const tg = UNITS[type.get(pending.target)!]!
            const a = ATTACKS[pending.attackId]!
            const stat = modded(pending.actor, a.stat,
              a.stat === 'strength' ? at.strength : at.precision, e.turn)
            const mit = a.damageType === 'physical' ? tg.armor : tg.resist
            const expected = Math.max(0, a.bonus + stat - penaltyOf(pending.actor)
              - ((e['absorbed'] as number) ?? 0) - mit)
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
    // Pairs rewritten 2026-08-20 (Law 10): the party is the Codex cohort now.
    // Same arithmetic, new bodies — a bite into the unarmoured Oathblade lands
    // its full 4; Osric's armor 1 shaves it to 3.
    expect(seen, 'zombie -> Oathblade = 4').toContain('attack.zombie.basic->test-oathblade=4')
    expect(seen, 'zombie -> Osric = 3').toContain('attack.zombie.basic->test-osric=3')
    expect(seen, 'axe -> zombie = 6').toContain('attack.warrior.axe->test-zombie=6')
    expect(seen, 'massive -> zombie = 8').toContain('attack.warrior.massive->test-zombie=8')
    expect(seen, 'bow -> zombie = 5').toContain('attack.ranger.bow->test-zombie=5')
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
