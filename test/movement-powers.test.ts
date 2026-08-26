// Movement powers — Angela 2026-08-21: "Movement is supposed to be a type of
// activation. There are different abilities in movement, like the sidestep,
// the regular move, or the flight. Movement is a choice, and that movement
// choice can have a modifier. It can cost stamina. It shouldn't be hard-coded.
// It should be content-driven."
//
// The rows are Codex-published (settled.json `powers`, movementAction): Move
// (1 Stamina, universal to all units), Sidestep (free, COOLDOWN 1 — "it's
// available every other turn", to Warrior/Mage/Priest/Paladin), Side Roll
// (1 Stamina, no cooldown, to Rogue/Ranger). Enemies carry exactly ONE
// movement power and pay no stamina — stamina is the hero throttle.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeSidestep, moveStaminaCost, usableMoves } from '../src/core/movement.js'
import { MOVES } from '../src/content/moves.js'
import { packUnits } from '../src/content/pack.js'
import { hexId } from '../src/core/hex.js'

const valueOf = (u: { statuses: { id: string; value: number }[] }, id: string) =>
  u.statuses.find((s) => s.id === id)?.value ?? 0

describe('the rows are the Codex rows — data, not code', () => {
  it('Move / Sidestep / Side Roll carry their published costs and cooldowns', () => {
    expect(MOVES['power.move']).toMatchObject({ shape: 'path', staminaCost: 1, cooldown: 0 })
    expect(MOVES['power.sidestep']).toMatchObject({ shape: 'sidestep', staminaCost: 0, cooldown: 1 })
    expect(MOVES['power.side-roll']).toMatchObject({ shape: 'sidestep', staminaCost: 1, cooldown: 0 })
  })

  it('who grants what is unit data: class grants on the cohort, one power per enemy row', () => {
    const pack = packUnits()
    // LAW 10 — rewritten 2026-08-25 as a RULE, not a frozen list. This asserted
    // the 2026-08-21 grants (Sidestep to warrior/mage/priest/paladin) and went
    // red the day the Codex split the half-step per class (S17: leap / focus /
    // devotion / sidestep / side-roll). The claim under test was never "these
    // ids", it was "grants are CONTENT the pack carries faithfully" — so the
    // test now asserts pack ↔ settled.json agreement, which survives regrants
    // and still dies loudly if the converter drops a grant.
    const settled = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'content', 'settled.json'), 'utf8'))
    for (const clone of settled.testCohort.heroes) {
      expect(pack[clone.typeId]!.moves, clone.typeId).toEqual(clone.engine.moves)
      expect(pack[clone.typeId]!.moves[0], clone.typeId + ' walks first').toBe('power.move')
      expect(pack[clone.typeId]!.moves, clone.typeId + ' one half-step').toHaveLength(2)
    }
    for (const t of ['test-zombie', 'test-zombie-burning']) {
      expect(pack[t]!.moves, t).toHaveLength(1)
    }
  })
})

describe('sidestep — one hex, free, terrain cost irrelevant, still a Step', () => {
  it('crosses onto burning ground with ZERO movement points and no stamina — and the embers still catch', () => {
    // test.map.embers rows 4-5 are the burning band. Points at 0 proves the
    // point budget is never consulted (the terrain cost is "irrelevant");
    // the burn on entry proves a sidestep is still a Step — only Flight
    // skips the ground.
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(3, 3) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
      { mapId: 'test.map.embers' },
    )
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    w.movePointsLeft = 0
    const stam = w.stamina
    const ok = executeSidestep(ctx, w.id, hexId(3, 4), MOVES['power.sidestep']!)
    expect(ok).toBe(true)
    expect(w.hex).toBe(hexId(3, 4))
    expect(w.stamina, 'sidestep costs no stamina').toBe(stam)
    expect(valueOf(w, 'status.burn'), 'the entry beat still fires').toBe(1)
    const mv = ctx.events.find((e) => e.type === 'moved' && e.causeId === 'power.sidestep')!
    expect(mv['cost'], 'terrain cost is irrelevant').toBe(0)
  })

  it('is available every other Turn — the cooldown gate (Angela 2026-08-21)', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
    )
    const w = ctx.state.units[0]!
    ctx.state.turn = 3
    beginActivation(ctx, w.id, 'test')
    executeSidestep(ctx, w.id, hexId(6, 5), MOVES['power.sidestep']!)
    const ids = () => usableMoves(ctx, w).map((m) => m.id)
    ctx.state.turn = 4
    expect(ids(), 'the Turn after use it is down').not.toContain('power.sidestep')
    ctx.state.turn = 5
    expect(ids(), 'every OTHER Turn').toContain('power.sidestep')
  })

  it('Side Roll is the same shape priced the other way: 1 stamina, usable every Turn', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(11, 11) }],
    )
    const r = ctx.state.units[0]!
    ctx.state.turn = 3
    beginActivation(ctx, r.id, 'test')
    const stam = r.stamina
    executeSidestep(ctx, r.id, hexId(6, 5), MOVES['power.side-roll']!)
    expect(r.stamina, 'Side Roll charges 1 stamina').toBe(stam - 1)
    ctx.state.turn = 4
    expect(usableMoves(ctx, r).map((m) => m.id), 'no cooldown — always there').toContain('power.side-roll')
  })
})

describe('stamina is the hero throttle — the enemy side does not run it', () => {
  it('a zombie can always afford its one movement power despite stamina 0', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(5, 7) }],
    )
    const z = ctx.state.units[1]!
    expect(z.maxStamina).toBe(0)
    expect(moveStaminaCost(z, MOVES['power.move']!)).toBe(0)
    beginActivation(ctx, z.id, 'test')
    expect(usableMoves(ctx, z).map((m) => m.id)).toContain('power.move')
  })

  it('across a battle, no enemy is ever refused a move for stamina', () => {
    for (const r of [0, 3, 9]) {
      const ctx = createBattle({ replicate: r })
      runBattle(ctx)
      const enemyIds = new Set(ctx.state.units.filter((u) => u.side === 'enemy').map((u) => u.id))
      const refused = ctx.events.filter((e) => e.type === 'move.refused' && enemyIds.has(e.actor!))
      expect(refused).toHaveLength(0)
    }
  })
})

describe('the choice is ALIVE in the standard battles', () => {
  it('heroes fall back to the free half-step when the walk is unaffordable — both data variants fire', () => {
    // The RULE: the granted sidestep-shaped power is used by the AI in real
    // battles (a power nothing chooses would be dead content). Which seeds
    // use it is a finding; that SOME do, across the sweep below, is the rule.
    // Disabling power.sidestep via CF_DISABLE_IDS kills the causeId and this
    // test with it — the kill-switch check relies on that.
    // LAW 10 — split 2026-08-25. Both variants used to fire in the sweep when
    // Sidestep had four grantors; the S17 regrant leaves it Paladin-only and
    // Osric never hits the fallback condition in 50 standard battles, so "both
    // appear in the sweep" stopped being a fact about the mechanism and became
    // a fact about stamina economics. The rule is two claims now:
    // (1) sweep — the fallback is ALIVE: some granted sidestep-shaped power is
    //     chosen by the AI in real battles;
    // (2) scripted — the OTHER data variant is chosen too, proven by starving
    //     its one grantor. Two variants, both AI-chosen, seed-independent.
    const used = new Set<string>()
    for (let r = 0; r < 25 && used.size < 1; r++) {
      for (const mapId of ['map.open', 'map.thicket']) {
        const ctx = createBattle({ replicate: r, enemyCount: 8, mapId })
        runBattle(ctx)
        for (const e of ctx.events) {
          if (e.type === 'moved' && (e.causeId === 'power.sidestep' || e.causeId === 'power.side-roll')) used.add(e.causeId)
        }
      }
    }
    expect(used.size, 'no sidestep-shaped power was ever AI-chosen').toBeGreaterThan(0)

    // (2) starve Osric — the sole Sidestep grantor — and the AI must fall back to it.
    const ctx = createCustomBattle(
      [{ type: 'test-osric', hex: hexId(3, 8) }],
      [{ type: 'test-zombie', hex: hexId(3, 12) }],
    )
    const os = ctx.state.units[0]!
    os.stamina = 0 // the walk costs 1 — unaffordable; Sidestep is free
    beginActivation(ctx, os.id, 'test')
    runActivation(ctx, os.id)
    const step = ctx.events.find((e) => e.type === 'moved')
    expect(step, 'the starved paladin never moved').toBeDefined()
    expect(step!.causeId, 'the fallback must be the granted Sidestep').toBe('power.sidestep')
  })

  it('every moved event names its power — the log says which CHOICE moved the unit (Law 12)', () => {
    const ctx = createBattle({ replicate: 1 })
    runBattle(ctx)
    for (const e of ctx.events.filter((e) => e.type === 'moved')) {
      expect(MOVES[e.causeId as string], `moved caused by '${e.causeId}'`).toBeDefined()
    }
  })
})
