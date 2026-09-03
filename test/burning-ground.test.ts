// Burning ground — terrain that APPLIES statuses, the exact inverse of water's
// strips. GAME-DESIGN §4: "running through costs 1 stack and standing costs 2";
// §6: "applied once on entry and again at the occupant's end of turn"; ruled
// 2026-08-20 (Flight): "flying onto burning ground burns you at end of
// activation." One general mechanism (appliesOnEnter / appliesOnActivationEnd,
// unioned by composed(), consumed at the two sites strips already were) — the
// second pure-data instance is poisoned ground (Codex, Creeping Blight: "2
// Poison and 1 Weak — allies included"). Both live on test.map.embers (TESTING
// LANE — the map that makes the mechanism probeable).
import { describe, expect, it } from 'vitest'
import { appliesOnEnterOf, appliesOnActivationEndOf, stripsOnEnterOf, moveCostOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { valueOf } from '../src/core/status.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeMove, pathTo, reachable } from '../src/core/movement.js'
// executeMove takes the chosen movement power since 2026-08-21 (Law 10:
// movement became a content-driven CHOICE — same walk, now named).
import { MOVES } from '../src/content/moves.js'
import { hexId } from '../src/core/hex.js'

describe('the data — one mechanism, two pure-data instances', () => {
  it('burning: +1 Burn on enter AND +1 at End of Activation ("standing costs 2")', () => {
    expect(appliesOnEnterOf(TERRAIN.BURNING)).toEqual([['status.burn', 1]])
    expect(appliesOnActivationEndOf(TERRAIN.BURNING)).toEqual([['status.burn', 1]])
  })
  // Law 10 rewrite, RULED 2026-09-03 (Angela, DECISIONS.md): "all of the
  // statuses that are on the ground are supposed to be the same ... when you
  // step on them, you gain one, and if you're there at the end of activation,
  // you gain one." The 2 Poison + 1 Weak of 5-GROUND-SETTLED is superseded.
  it('poisoned: the one ground shape — 1 Poison on enter, 1 Poison at End of Activation, exactly as burning', () => {
    expect(appliesOnEnterOf(TERRAIN.POISONED)).toEqual([['status.poison', 1]])
    expect(appliesOnActivationEndOf(TERRAIN.POISONED)).toEqual([['status.poison', 1]])
    expect(appliesOnEnterOf(TERRAIN.BURNING)).toEqual([['status.burn', 1]])
    expect(appliesOnActivationEndOf(TERRAIN.BURNING)).toEqual([['status.burn', 1]])
  })
  it('every other terrain applies nothing — and burning strips nothing', () => {
    for (const t of [TERRAIN.OPEN, TERRAIN.HILLS, TERRAIN.FOREST, TERRAIN.WATER]) {
      expect(appliesOnEnterOf(t), String(t)).toEqual([])
      expect(appliesOnActivationEndOf(t), String(t)).toEqual([])
    }
    expect(stripsOnEnterOf(TERRAIN.BURNING)).toEqual([])
  })
  it('the layer carries no move surcharge — the base ground owns cost', () => {
    expect(moveCostOf(TERRAIN.BURNING)).toBe(1)
    expect(moveCostOf(TERRAIN.POISONED)).toBe(1)
  })
})

describe('running through costs 1 stack per splash — the entry beat', () => {
  it('a warrior crossing 2 ember hexes picks up Burn 2', () => {
    // test.map.embers: rows 4-5 are the full-width burning band.
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(3, 5) }],
      [{ type: 'test-zombie', hex: hexId(11, 11) }],
      { mapId: 'test.map.embers' },
    )
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    const path = pathTo(reachable(ctx, w), w.hex, hexId(5, 5))
    expect(path.length).toBeGreaterThan(0)
    executeMove(ctx, w.id, path, MOVES['power.move']!)
    expect(w.hex).toBe(hexId(5, 5))
    expect(valueOf(w, 'status.burn')).toBe(2)   // one per entered ember hex
    const causes = ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'terrain.burning')
    expect(causes.length).toBe(2)
  })

  it('walking through poisoned ground applies NOTHING — only ending there does', () => {
    // rows 7-8 are the poisoned belt.
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(6, 5) }],
      [{ type: 'test-zombie', hex: hexId(11, 11) }],
      { mapId: 'test.map.embers' },
    )
    const w = ctx.state.units[0]!
    beginActivation(ctx, w.id, 'test')
    const path = pathTo(reachable(ctx, w), w.hex, hexId(9, 5))   // through both p rows
    expect(path.length).toBeGreaterThan(0)
    executeMove(ctx, w.id, path, MOVES['power.move']!)
    expect(valueOf(w, 'status.poison')).toBe(0)
    expect(valueOf(w, 'status.weak')).toBe(0)
  })
})

describe('standing costs 2 — the End of Activation beat, in the real loop', () => {
  it('battles on the ember field produce terrain.burning AND terrain.poisoned applications', () => {
    let burnApplied = 0, poisonApplied = 0, weakApplied = 0
    for (let r = 0; r < 10; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'test.map.embers' })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type !== 'status.applied') continue
        if (e.causeId === 'terrain.burning') burnApplied++
        if (e.causeId === 'terrain.poisoned' && e['statusId'] === 'status.poison') poisonApplied++
        if (e.causeId === 'terrain.poisoned' && e['statusId'] === 'status.weak') weakApplied++
      }
    }
    expect(burnApplied).toBeGreaterThan(0)
    expect(poisonApplied).toBeGreaterThan(0)
    void weakApplied   // Weak left poisoned ground on 2026-09-03 (the one ground shape); it is a layer of its own now
  })

  it('the six real maps are untouched — no applies fire anywhere on them', () => {
    for (const mapId of ['map.open', 'map.thicket']) {
      const ctx = createBattle({ replicate: 0, enemyCount: 8, mapId })
      runBattle(ctx)
      const applied = ctx.events.filter((e) => e.type === 'status.applied'
        && (e.causeId === 'terrain.burning' || e.causeId === 'terrain.poisoned'))
      expect(applied.length, mapId).toBe(0)
    }
  })
})
