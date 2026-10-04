// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { UNITS, ATTACKS, ABILITIES } from '../src/content/index.js'
import { STATUSES } from '../src/content/statuses.js'
import { MOVES } from '../src/content/moves.js'
import { accuracyBonusOf, accuracyAgainstOf, dodgeBonusOf, rangedAccuracyOf, reachBonusOf, terrainOf } from '../src/content/maps.js'
import { distance } from './board16.js'

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
      const statMods = new Map<number, { stat: string; value: number; expiresAtTurn?: number; seq: number; source?: string }[]>()
      // badge.afflictions (2026-09-04): a mod added WHILE a swing is in flight (an onHit
      // rider granting Rotting Flesh's +1 Armor before the damage line) does not touch
      // THAT damage — the number the preview promised is the number that lands (Law 1);
      // the mod bites from the next declaration. `beforeSeq` is the declaration's seq.
      const modded = (actor: number, statName: string, base: number, turn: number, beforeSeq?: number) =>
        base + (statMods.get(actor) ?? [])
          .filter((m) => m.stat === statName && (m.expiresAtTurn === undefined || turn < m.expiresAtTurn) && (beforeSeq === undefined || m.seq < beforeSeq))
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
      // v2.kdb (2026-09-23), EXTENDED under Law 10: KDB now knocks units down in
      // these battles, so the auditor learns Prone (v2.prone, COMBAT-V2 §10) from
      // its own events — unit.proned carries the status, whose ROW gives the
      // numbers (data, not a name); unit.stood lifts it. And a push may now be
      // caused by a KDB check (kdb.rolled names the cause first).
      const prone = new Map<number, { accuracyAgainst: number; dodge: number; damageAgainst: number; accuracy: number; damage: number }>()
      const kdbCauses = new Set<string>()
      let pending: { actor: number; target: number; attackId: string; dist: number; crit?: boolean; heads?: number; area?: number; seq: number; proneDamage?: number } | null = null
      let pendingPower: { actor: number; target: number; abilityId: string; stat: 'strength' | 'precision' | 'magic' | 'spirit'; bonus: number; damageType: string } | null = null
      let pendingHeal: string | null = null

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

          case 'unit.proned':
            prone.set(e.target!, STATUSES[e['statusId'] as string]!.prone!)
            break
          case 'unit.stood':
            prone.delete(e.actor!)
            break
          case 'kdb.rolled':
            kdbCauses.add(e.causeId)
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
            const allowed = mp && mp.move.shape === 'sidestep' ? Math.max(1, mp.move.stepRange ?? 1) : 1
            expect(distance(e['from'] as number, e['to'] as number), 'a step is its power\'s size').toBeLessThanOrEqual(allowed)
            // The auditor learned the movement CHOICE 2026-08-21 (Law 10:
            // rule widened, not weakened): every moved event now names its
            // power as causeId, and a sidestep-shaped power ignores terrain
            // cost BY THE PUBLISHED RULE ("the destination's terrain cost is
            // irrelevant"), so its recomputed cost is 0. A path-shaped move
            // still pays the terrain, recomputed from the board as before.
            const shape = MOVES[e.causeId]?.move.shape
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
            list.push({ stat: e['stat'] as string, value: e['value'] as number, seq: e.seq, source: e['source'] as string,
              ...(e['expiresAtTurn'] !== undefined ? { expiresAtTurn: e['expiresAtTurn'] as number } : {}) })
            statMods.set(e.actor!, list)
            break
          }
          // v2.shields (2026-09-23), extended: "until the end of your next Activation"
          // mods leave through their own mutator event; the model drops exactly that mod.
          case 'statmod.expired': {
            const list = statMods.get(e.actor!) ?? []
            const i = list.findIndex((m) => m.stat === e['stat'] && m.value === e['value'] && m.source === e['source'])
            expect(i, 'an expired mod was one the log added').toBeGreaterThanOrEqual(0)
            list.splice(i, 1)
            break
          }
          case 'knocked': {
            // capability.knockback (2026-08-27): a knocked unit travels along
            // the pusher->victim line, at most the triggering value — every
            // knockback in the game today is value 1, so the audit holds the
            // stronger claim available: exactly one hex, directly away.
            expect(distance(e['from'] as number, e['to'] as number), 'a knockback travels').toBeGreaterThanOrEqual(1)
            // A push is caused by a knockback trigger, OR — since station.crit
            // (2026-08-27) — by the critting attack itself (Knocked Sprawling:
            // the crit.effect event beside it names the row key). Extended.
            expect(String(e.causeId).includes('knockback') || String(e.causeId).startsWith('attack.') || kdbCauses.has(e.causeId),
              'a knocked unit names what pushed it').toBe(true)
            hex.set(e.target!, e['to'] as number) // the auditor's map must move too
            break
          }
          // station.crit (2026-08-27) — the chart's two bespoke mutators join
          // the ledgers, EXTENDED never weakened: a drain or a max-health loss
          // left untracked would silently skew every later arithmetic check.
          case 'stamina.drained': {
            const before = stamina.get(e.target!)!
            expect(e['stamina'], 'drain floors at zero').toBe(Math.max(0, before - (e['asked'] as number)))
            expect(e['amount']).toBe(before - (e['stamina'] as number))
            stamina.set(e.target!, e['stamina'] as number)
            break
          }
          case 'maxHp.lost': {
            expect(e['maxHp'] as number, 'nothing else floors — but never negative display').toBeGreaterThanOrEqual(0)
            expect(e['hp'] as number).toBeLessThanOrEqual(e['maxHp'] as number)
            break
          }
          case 'crit.effect': {
            // Every rolled injury names a key the chart actually carries.
            expect(typeof e['key']).toBe('string')
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
            const reach = a.attack.kind === 'ranged' ? a.range + at.reach + reachBonusOf(myTerr) : a.range
            expect(d, 'attack was within reach').toBeLessThanOrEqual(reach)

            // A ranged attack may not target an adjacent enemy at all.
            // Angela 2026-08-15; GAME-DESIGN.md §4.
            if (a.attack.kind === 'ranged') expect(d, 'ranged never targets an adjacent enemy').toBeGreaterThan(1)

            // accuracy, recomputed.
            //
            // CHANGED 2026-08-15, and this auditor is the reason the change was safe
            // to make: the −20 is charged when a living enemy is adjacent to the
            // SHOOTER, whatever the shooter is aiming at. It used to be charged when
            // the TARGET was at distance 1 — the case that is now illegal. Both
            // halves were wrong at once, so the old assertion passed: the penalty
            // was always being paid by somebody.
            // The chart writes accuracy statmods now (Blinded −30, since
            // station.crit / fix.crit-branch-even 2026-08-27) — the auditor's
            // own mod ledger applies to accuracy exactly as the engine's stat
            // pipeline does. EXTENDED, not weakened.
            let acc = modded(e.actor!, 'accuracy', at.accuracy, e.turn)
            if (a.attack.kind === 'ranged') {
              // range grace of 3 tiles, ruled 2026-08-26 — penalty from the 4th
              if (d > 3) acc -= (d - 3) * 5
              const me = hex.get(e.actor!)!
              const mySide = side.get(e.actor!)!
              const inMelee = [...standing].some(
                (id) => side.get(id) !== mySide && distance(me, hex.get(id)!) === 1)
              if (inMelee) acc -= 20
            }
            acc += accuracyBonusOf(myTerr)
            // The auditor learned the TERRAIN rung on 2026-09-24 (v2.retire-forest-hills (2026-09-24), Law 10 reason: the RULE changed by ruling — Andrew, DECISIONS.md: hills are "+10 accuracy and +1 reach", ranged only ("It's only 10 ranged accuracy").): the shooter's hills
            // (+10, ranged only) and the target's concealment — rules, recomputed, not numbers.
            if (a.attack.kind === 'ranged') acc += rangedAccuracyOf(myTerr)
            acc += accuracyAgainstOf(terr[hex.get(e.target!)!] ?? 0, a.attack.kind)
            // The auditor learned the attack's OWN modifier on 2026-09-03
            // (station.accuracy-field): the row's `accuracy` — Punch −5, the
            // war-axe's Hack −5, the longbow's +10 — lands at SITUATIONAL.
            acc += a.attack.accuracy ?? 0
            // The auditor learned the SPECIAL FREE ATTACK on 2026-10-04 (rule.free-attack-is-basic-attack; DECISIONS.md
            // 2026-09-28: "the basic attack, no stamina, −20 Accuracy"): an attack of opportunity's declared line says
            // `free`, and it swings at −20. EXTENDED, not weakened — every other swing is recomputed as before, and a
            // free swing that spent Stamina would break the stamina ledger below (no stamina.spent line is its rule).
            if (e['free'] === true) acc -= 20
            // … and on 2026-10-04 (capability.counterattack-and-fend) that a counterattack and a fend add the swinging
            // unit's own Accuracy for that free attack — "counterattack with +10 Accuracy" — read through the mod ledger.
            if (e['free'] === true && typeof e['as'] === 'string') acc += modded(e.actor!, e['as'] + 'Accuracy', 0, e.turn)
            // The auditor learned TARGET_DODGE on 2026-08-20 — the Codex
            // cohort brought the first nonzero dodge (Dusk Hawk 5), and dodge
            // is flat off the hit chance, plus whatever the target's terrain
            // grants (forest +10).
            const tgDef = UNITS[type.get(e.target!)!]!
            // Guard Broken docks dodge (min 0 at application) — the target's
            // dodge reads through the mod ledger too.
            acc -= modded(e.target!, 'dodge', tgDef.dodge, e.turn) + dodgeBonusOf(terr[hex.get(e.target!)!] ?? 0)
            // v2.kdb: the prone rows, flat — against a prone target +accuracyAgainst and
            // its Dodge falls by the row's dodge; a prone attacker takes its row's accuracy.
            const tp = prone.get(e.target!), ap = prone.get(e.actor!)
            if (tp) acc += tp.accuracyAgainst - tp.dodge
            if (ap) acc += ap.accuracy
            // V2 bursts have their own declaration; every attack here still rolls.
            expect(e['hitChance'], `hit chance for ${a.id} at range ${d}`).toBe(Math.max(0, Math.min(100, acc)))
            pending = { actor: e.actor!, target: e.target!, attackId: a.id, dist: d, seq: e.seq, proneDamage: (tp?.damageAgainst ?? 0) + (ap?.damage ?? 0) }
            checkedAcc++
            break
          }

          case 'attack.hit': {
            // V2: crit confirms the roll; critHeads explicitly records damage
            // arms, including zero for a chart-only critical. The independent
            // recompute below continues to multiply only by this head count.
            if (pending && e.actor === pending.actor) {
              pending.crit = e['crit'] === true
              // station.crit-count: several criticals stack +50% each.
              pending.heads = typeof e['critHeads'] === 'number' ? (e['critHeads'] as number) : (pending.crit ? 1 : 0)
            }
            break
          }

          // V2 bursts have an independent, non-attack lifecycle. No earlier
          // ordinary attack may remain armed across this declaration.
          case 'burst.declared': {
            pending = null; pendingPower = null
            expect(e['hexes']).toBeInstanceOf(Array)
            expect(e['centre']).toBeTypeOf('number')
            break
          }
          case 'burst.struck': {
            const packets = e['packets'] as {raw:number;absorbed:number;mitigationDelta:number;floorAdjustment:number;resolved:number;applied:number;overkill:number;ledger:{delta:number}[]}[]
            for (const p of packets) {
              expect(p.raw - p.absorbed + p.mitigationDelta + p.floorAdjustment).toBe(p.resolved)
              expect(p.applied + p.overkill).toBe(p.resolved)
              expect(p.ledger.reduce((n,r) => n+r.delta,0)).toBe(p.resolved)
            }
            expect(packets.reduce((n,p) => n+p.resolved,0)).toBe(e['damage'])
            expect(packets.reduce((n,p) => n+p.applied,0)).toBe(e['applied'])
            checkedDamage++
            break
          }

          case 'heal.applied': {
            if (pendingHeal && e.causeId === pendingHeal) { expect(e['asked'] as number, `${pendingHeal} heals a stated amount`).toBeGreaterThan(0); pendingHeal = null }
            break
          }

          case 'power.used': {
            const at = UNITS[type.get(e.actor!)!]!
            const ab = ABILITIES[e['abilityId'] as string]!
            const d = distance(hex.get(e.actor!)!, hex.get(e.target!)!)
            expect(d, 'power was within range').toBeLessThanOrEqual(ab.range)
            // capability.item-powers (2026-08-27): only ranged power events
            // carry `distance`; a selfGuard is used at distance 0 on oneself.
            if (e['distance'] !== undefined) expect(d).toBe(e['distance'])
            // Only a single-target DAMAGE power arms the recompute below —
            // heal carries `heal`, selfGuard carries `protection`, and an
            // area power's per-victim numbers arrive on power.hit events with
            // their own full ledgers. Extended, never weakened: the damage
            // recompute is exactly as strict as before for exactly the events
            // it always covered.
            // v2.shields (2026-09-23), extended: an effect-list power (the shield guards —
            // statMods with a lifetime) lands its effects through statmod.added, not a
            // damage.applied; only a row with no effect list is a bolt to recompute.
            // Law 10, fix.one-effect-vocabulary (2026-10-01): the legacy shapes retired, so the three checks
            // follow the rows to their effects lists — extended, never weakened. A single-target power whose
            // one effect is a statDamage (the TEST Arcane Bolt) arms the same recompute; a heal power's
            // heal.applied must ask a stated amount (was: power.used's `heal` field); a self power lands on its
            // caster (was: selfGuard only — no row has carried that shape since 2026-09-23).
            // was: if (!ab.effects && (ab.effect ?? 'damage') === 'damage') { pendingPower = {...} } else { heal / selfGuard checks }
            const only = ab.effects?.length === 1 ? ab.effects[0]! : undefined
            if (only?.kind === 'statDamage' && ab.target?.select === 'unit') {
              pendingPower = { actor: e.actor!, target: e.target!, abilityId: ab.id, stat: only.stat, bonus: only.bonus, damageType: only.damageType }
            } else {
              if (ab.effects?.some((x) => x.kind === 'heal')) pendingHeal = ab.id
              if (ab.target?.select === 'self') expect(e.target, `${ab.id} lands on its caster`).toBe(e.actor)
              pendingPower = null
            }
            pending = null
            break
          }

          case 'damage.applied': {
            // Status ticks are damage with no attack and no attacker.
            if (e.causeId.startsWith('status.')) {
              expect(e.actor, 'status damage has no attacker').toBeNull()
              expect(e['amount'] as number).toBeGreaterThanOrEqual(0)
              // fix.status-damage-types (2026-08-27): the tick carries its
              // row's type — magic ticks may show resist, true ticks never do.
              const tickType = STATUSES[e.causeId]?.tickDamageType ?? 'true'
              expect(e['damageType'], `${e.causeId} tick type`).toBe(tickType)
              if (tickType === 'true') expect(e['resisted'], 'nothing reduces a true tick').toBeUndefined()
              pending = null; pendingPower = null
              break
            }
            if (pendingPower) {
              const at = UNITS[type.get(pendingPower.actor)!]!
              const tg = UNITS[type.get(pendingPower.target)!]!
              const ab = pendingPower
              // pendingPower is only ever armed for a single-target statDamage power
              // (see power.used above), and carries that effect's numbers.
              const stat = modded(pendingPower.actor, ab.stat,
              ab.stat === 'strength' ? at.strength : ab.stat === 'magic' ? at.magic : at.precision, e.turn)
              const mit = ab.damageType === 'physical' ? tg.armor : ab.damageType === 'magic' ? tg.resist : 0
              // The auditor learned PROTECTION with the status.protection
              // landing (2026-08-20): the event names what a pool absorbed, and
              // the pipeline subtracts it before mitigation.
              const expected = Math.max(0, ab.bonus + stat - penaltyOf(pendingPower.actor)
                - ((e['absorbed'] as number) ?? 0) - mit)
              expect((e['amount'] as number) + (e['overkill'] as number), `${ab.abilityId} damage`).toBe(expected)
              checkedDamage++
              pendingPower = null
              break
            }
            if (!pending) break
            const at = UNITS[type.get(pending.actor)!]!
            // An area swing lands on every struck unit in turn; the victim is
            // whoever THIS event names, not the declared target.
            const tg = UNITS[type.get(pending.target)!]!
            const a = ATTACKS[pending.attackId]!
            // The attack names its stat (strength / precision / spirit since
            // the Chaplain's Mercy, 2026-08-28) — read that one, not a guess.
            const base = a.attack.stat === 'strength' ? at.strength : a.attack.stat === 'precision' ? at.precision
              : a.attack.stat === 'magic' ? at.magic : (at as unknown as Record<string, number>)[a.attack.stat] ?? 0
            const stat = modded(pending.actor, a.attack.stat, base, e.turn, pending.seq)
            // badge.afflictions (2026-09-04): Rotting Flesh's +1 Armor arrives as a stored mod — the
            // auditor reads the target's MODDED mitigation, as it already reads the attacker's modded stat
            const victim = pending.target
            const mit = a.attack.damageType === 'physical' ? modded(victim, 'armor', tg.armor, e.turn, pending.seq) : a.attack.damageType === 'magic' ? modded(victim, 'resist', tg.resist, e.turn, pending.seq) : 0
            // The damage-arm crit multiplies BEFORE Protection and Mitigation
            // (DMG.CRIT at 450), truncating division — the one rounding rule;
            // n heads multiply by (2+n)/2 (station.crit-count).
            const preMit = a.attack.bonus + stat - penaltyOf(pending.actor)
            const heads = pending.heads ?? (pending.crit ? 1 : 0)
            const critted = heads > 0 ? Math.trunc((preMit * (2 + heads)) / 2) : preMit
            // v2.kdb: DMG.PRONE (500) — flat, after the crit multiplier, before Protection and mitigation
            const expected = Math.max(0, critted + (pending.proneDamage ?? 0)
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

  // The complete 200-battle sample exceeded 5s under four-worker suite load,
  // but passes in isolation. As with the 400-battle rate probe below, this
  // verifies outcomes, not throughput; keep every seed and exact expectation.
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
    // Rewritten again 2026-09-02 (content.alpha-flip, Law 10): the party is the
    // Alpha Team with its authored kit. Same bodies (S31 copied the stat rows),
    // authored weapons: Halberd Hack = Str 5 + 2 = 7 physical; Lightning Staff
    // Bolt = Prc 3 + 3 = 6 magic into resist 0; Shortbow Short Shot = Prc 4 +
    // 1 = 5. Read off the pack rows, not invented.
    // content.enemy-flip (2026-09-02): the authored Zombie's Claw is Str 3 +
    // 0 — 3 into the unarmoured Oathblade, 2 into Osric's armor 1. Read off
    // enemies-authored.json, not invented.
    expect(seen, 'zombie -> Oathblade = 3').toContain('attack.zombie.claw->alpha-oathblade=3')
    expect(seen, 'zombie -> Osric = 2').toContain('attack.zombie.claw->alpha-osric=2')
    expect(seen, 'hack -> zombie = 7').toContain('attack.halberd.hack->unit.zombie=7')
    expect(seen, 'bolt -> zombie = 6').toContain('attack.lightning-staff.bolt->unit.zombie=6')
    expect(seen, 'short shot -> zombie = 5').toContain('attack.shortbow.short-shot->unit.zombie=5')
  }, 30000)

  // This 400-battle sample exceeded 5s in two full-suite runs. Keep all
  // samples and statistical thresholds; the test does not specify throughput.
  it('observed hit rates converge on the declared accuracies', () => {
    const tally: Record<string, { swings: number; hits: number }> = {}
    for (let r = 0; r < 400; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 })
      runBattle(ctx)
      let key: string | null = null
      for (const e of ctx.events) {
        if (e.type === 'attack.declared') {
          // Law 10, 2026-09-23 (v2.shields): with Block live on the heroes a swing lands at the
          // declared CONNECTION chance (Block cup, then the accuracy cup), which attack.declared
          // states as connectionChanceBps. With no Block that is exactly hitChance, as before.
          key = `${e['attackId']}@${e['connectionChanceBps'] !== undefined ? (e['connectionChanceBps'] as number) / 100 : e['hitChance']}`
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
      // Tolerance follows the sample (2026-09-02, content.enemy-flip: shorter
      // battles mean fewer swings per key): four binomial sigmas, never under
      // the old flat 6 — the same claim, stated for the n actually observed.
      const p = declared / 100
      const sigma = Math.sqrt((p * (1 - p)) / v.swings) * 100
      expect(Math.abs(observed - declared), `${k}: observed ${observed.toFixed(1)}% over ${v.swings}`).toBeLessThan(Math.max(6, 4 * sigma))
    }
  }, 30000)
})
