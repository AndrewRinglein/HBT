// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
import { describe, it, expect } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canAttack, preview, resolveAccuracy, inMelee, attackDef } from '../src/core/pipeline.js'
import { BLEED_OUT_COUNTER } from '../src/core/settle.js'
import { hexId } from './board16.js'

// Two rulings from Angela, 2026-08-15. Written as tests rather than as notes,
// because a ruling that lives only in a plan document gets archived.

// ─── Ranged and adjacency ────────────────────────────────────────────────────
//
//   "You cannot use a ranged attack on something adjacent. You can use a ranged
//    attack on something not adjacent at -20."
//
// GAME-DESIGN.md §4 carries both halves: "−20 if YOU are adjacent to an enemy
// (ranged only)" and "Ranged cannot target an adjacent enemy at all. You may shoot
// past it at something distant, at −20."
//
// The engine had the condition inside out until today: it charged the −20 when the
// TARGET stood at distance 1 — the shot that is now illegal — and charged nothing
// for shooting past an adjacent enemy, which is the whole case the rule exists for.

describe('ranged attacks and adjacency (Angela 2026-08-15)', () => {
  /** A ranger, a zombie in her face, and a second zombie four hexes out. */
  function board(withNeighbour: boolean) {
    return createCustomBattle(
      [{ type: 'test-ranger', hex: hexId(5, 5) }],
      withNeighbour
        ? [{ type: 'test-zombie', hex: hexId(6, 5) }, { type: 'test-zombie', hex: hexId(5, 9) }]
        : [{ type: 'test-zombie', hex: hexId(5, 9) }],
      { mapId: 'map.open' })
  }

  it('a ranged attack on an adjacent enemy is ILLEGAL, not merely penalised', () => {
    const ctx = board(true)
    expect(canAttack(ctx, 0, 1, 'attack.test-ranger.bow')).toBe(false)
    // and the fallback is a real one — she is not left with no action at all
    expect(canAttack(ctx, 0, 1, 'attack.punch')).toBe(true)
  })

  it('shooting PAST an adjacent enemy is legal, and costs 20', () => {
    const pinned = board(true)
    const clear = board(false)
    expect(canAttack(pinned, 0, 2, 'attack.test-ranger.bow')).toBe(true)

    // Same shooter, same target, same distance, same terrain. The only difference
    // is the zombie standing next to her.
    const a = preview(pinned, 0, 2, 'attack.test-ranger.bow')
    const b = preview(clear, 0, 1, 'attack.test-ranger.bow')
    expect(a.accuracy).toBe(b.accuracy - 20)
  })

  it('no adjacent enemy means no penalty at all — the ledger has no ADJACENT row', () => {
    const ctx = board(false)
    const acc = resolveAccuracy(ctx, ctx.state.units[0]!, ctx.state.units[1]!, attackDef(ctx, 'attack.test-ranger.bow'))
    expect(acc.ledger.some((r) => r.name === 'ADJACENT')).toBe(false)
    // ranger 90, four hexes = −5 under the 2026-08-26 grace window (Law 10:
    // was −15 when the penalty started past the first hex)
    expect(acc.value).toBe(85)
  })

  it('the penalty reads the SHOOTER\'s surroundings, not the target\'s distance', () => {
    const ctx = board(true)
    const ranger = ctx.state.units[0]!
    expect(inMelee(ctx, ranger)).toBe(true)
    // a dead neighbour threatens nobody
    ctx.state.units[1]!.lifeState = 'dead'
    expect(inMelee(ctx, ranger)).toBe(false)
    expect(preview(ctx, 0, 2, 'attack.test-ranger.bow').accuracy)
      .toBe(preview(board(false), 0, 1, 'attack.test-ranger.bow').accuracy)
  })

  it('an ally standing next to you is not a threat', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-ranger', hex: hexId(5, 5) }, { type: 'test-warrior', hex: hexId(6, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 9) }],
      { mapId: 'map.open' })
    expect(inMelee(ctx, ctx.state.units[0]!)).toBe(false)
  })

  it('melee is untouched — a sword still works at distance 1', () => {
    const ctx = board(true)
    expect(canAttack(ctx, 0, 1, 'attack.punch')).toBe(true)
    const acc = resolveAccuracy(ctx, ctx.state.units[0]!, ctx.state.units[1]!, attackDef(ctx, 'attack.punch'))
    expect(acc.ledger.some((r) => r.name === 'ADJACENT')).toBe(false)
  })
})

// ─── Bleed-out ───────────────────────────────────────────────────────────────
//
//   "Bleed Out counter should be five phases, but it only moves forward at the end
//    of the hero phase."
//
// Previously 3, advancing at Start of Turn. Both numbers moved, and the cadence
// matters more than the count: five ticks that only happen on the hero phase are
// five hero phases of rescue window, not five half-turns.

describe('bleed-out (Angela 2026-08-15)', () => {
  it('the counter is five', () => {
    expect(BLEED_OUT_COUNTER).toBe(5)
  })

// LAW 10 — 2026-09-02 (content.enemy-flip): the standard horde is the AUTHORED
// Zombie and Burning Zombie now (5 hp, str 3 — the Codex's), not the test
// clones (10 hp, str 4). FINDING: four authored zombies are a 2.8-turn walkover
// for the Alpha Team (100 battles: 100% clear, one hero down); pressure for a
// claim that needs it comes from a larger authored horde (enemyCount 12: 130
// downs per 100), and the test-lane enemy riders are fielded explicitly
// (TEST_COHORT.enemies). Claims unchanged; the fielding says where the
// pressure comes from.
  // 2026-09-03 (ability.effects): fourteen zombies no longer down a hero on
  // every seed once the Air Mage's Storm is actually reachable (the kite now
  // closes to a power's range) and the weapons hit at authored accuracies.
  // The CLAIM is per drop — "set to five, every time" — so the fielding is
  // sixteen (the ruled pressure ceiling) and the test demands at least one
  // drop across the sample, not one per seed. Same rule, honest fielding.
  // LAW 10 — rewritten 2026-10-04 as a RULE, not the number alone (found by rule.free-attack-is-basic-attack, whose re-timed
  // fights drop the Sky Pirate on replicate 0 AFTER a zombie has given him Rotting Flesh). This read `for (const e of set)
  // expect(e['bleedOut']).toBe(5)` — true while no hero in the sample carried a badge that moves the count. The rule was
  // always "five, plus the unit's own Turns to Bleed out" (settle.ts bleedOutCounterOf; Rotting Flesh is +5, ruled
  // 2026-09-04): a hero carrying nothing that moves it is set to five, every time, and one that does is set to five plus it.
  it('a hero who drops is set to five, every time — plus its own Turns to Bleed out, when a badge it carries moves them', () => {
    let drops = 0, plain = 0
    for (let r = 0; r < 8; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 16, mapId: 'map.open' })
      // what each unit's Turns to Bleed out are as the battle goes: what it was fielded with, then each badge it gains
      const turns = new Map(ctx.state.units.map((u) => [u.id, u.bleedOutTurns ?? 0]))
      const from = ctx.events.length
      runBattle(ctx)
      for (const e of ctx.events.slice(from)) {
        if (e.type === 'badge.gained') {
          const id = (e.target ?? e.actor) as number
          turns.set(id, (turns.get(id) ?? 0) + ((ctx.badges[e['badgeId'] as string]?.statModifiers as Readonly<Record<string, number | undefined>> | undefined)?.['bleedOutTurns'] ?? 0))
        }
        if (e.type !== 'bleedout.set') continue
        drops++
        const own = turns.get(e.target as number) ?? 0
        if (own === 0) plain++
        expect(e['bleedOut'], `replicate ${r}: unit ${e.target}, own Turns to Bleed out ${own}`).toBe(Math.max(1, 5 + own))
      }
    }
    expect(drops, 'eight seeds at sixteen zombies put nobody down — the sample proved nothing').toBeGreaterThan(0)
    expect(plain, 'no hero dropped carrying nothing that moves the count — the plain five was never seen').toBeGreaterThan(0)
  })

  it('it advances ONLY inside the End of Hero Phase ladder', () => {
    let ticksChecked = 0
    // Widened 8 -> 16 seeds on 2026-09-04 (badge.afflictions, Law 10 reason): the
    // standard heroes are tougher now — a stood roll gives a full bar, and the
    // zombie's Rotting Flesh is +8 Health — so eight seeds at fourteen zombies
    // produced exactly 20 ticks, one short of the sample the claim asks for.
    for (let r = 0; r < 16; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 14, mapId: 'map.open' })
      runBattle(ctx)

      // Walk the log and remember which ladder, if any, we are standing in.
      let ladder: string | null = null
      for (const e of ctx.events) {
        if (e.type === 'phase.end.begin') ladder = e['side'] as string
        else if (e.type === 'phase.end.done') ladder = null
        else if (e.type === 'bleedout.tick') {
          expect(ladder, `a bleed-out tick outside any End of Phase ladder, replicate ${r}`).toBe('hero')
          ticksChecked++
        }
      }
    }
    expect(ticksChecked, 'no ticks were examined — this test proved nothing').toBeGreaterThan(20)
  })

  it('it does NOT advance at Start of Turn any more', () => {
    const ctx = createBattle({ replicate: 0, enemyCount: 10, mapId: 'map.open' })
    runBattle(ctx)
    for (let i = 1; i < ctx.events.length; i++) {
      if (ctx.events[i]!.type === 'bleedout.tick') {
        // The event immediately before a tick is never turn.begin, which is what
        // Start-of-Turn advancement looked like.
        expect(ctx.events[i - 1]!.type).not.toBe('turn.begin')
      }
    }
  })

  it('five ticks and no rescue is a death, not a fourth or sixth', () => {
    const ctx = createBattle({ replicate: 0, enemyCount: 10, mapId: 'map.open' })
    runBattle(ctx)
    const ticksBefore = new Map<number, number>()
    for (const e of ctx.events) {
      if (e.type === 'bleedout.set') ticksBefore.set(e.target!, 0)
      else if (e.type === 'bleedout.tick') ticksBefore.set(e.target!, (ticksBefore.get(e.target!) ?? 0) + 1)
      else if (e.type === 'life.dead' && e['reason'] === 'bledOut') {
        expect(ticksBefore.get(e.target!), `unit ${e.target} bled out on the wrong tick`).toBe(5)
      }
    }
  })
})

describe('range grace — ruled 2026-08-26', () => {
  // "No ranged penalty up to 3 tiles away, and the range penalty starts at
  // the 4th tile: -5, then -10, then -15." The ledger is the proof surface:
  // at 2-3 tiles there must be NO RANGE row at all, not a zero-delta one.
  it('the 4th tile costs -5, the 5th -10, the 6th -15 — and 2-3 are free', () => {
    for (const [dist, delta] of [[2, 0], [3, 0], [4, -5], [5, -10], [6, -15]] as const) {
      const ctx = createCustomBattle(
        [{ type: 'test-dusk-hawk', hex: hexId(1, 8) }],
        [{ type: 'test-zombie', hex: hexId(1 + dist, 8) }],
      )
      const pv = preview(ctx, 0, 1, 'attack.test-ranger.bow')
      const row = pv.accLedger.find((r) => r.name === 'RANGE')
      if (delta === 0) expect(row, `distance ${dist} is inside the grace window`).toBeUndefined()
      else expect(row?.delta, `distance ${dist}`).toBe(delta)
    }
  })
})
