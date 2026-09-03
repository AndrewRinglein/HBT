// Water — the anti-status terrain. GAME-DESIGN §4: entry strips 1 Burn; End of
// Activation strips 1 Burn and 1 Poison. RULED, Angela 2026-08-20: regeneration
// is NOT stripped — your healing survives the river. Trait DATA on `wet`; a
// second stripping terrain is a data row, zero engine code.
import { describe, expect, it } from 'vitest'
import { stripsOnEnterOf, stripsOnActivationEndOf } from '../src/content/maps.js'
import { TERRAIN } from '../src/core/types.js'
import { createCustomBattle } from '../src/core/setup.js'
import { applyStatus, valueOf } from '../src/core/status.js'
import { executeMove, reachable, pathTo } from '../src/core/movement.js'
// executeMove takes the chosen movement power since 2026-08-21 (Law 10:
// movement became a content-driven CHOICE — same walk, now named).
import { MOVES } from '../src/content/moves.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { hexId, neighboursOf } from '../src/core/hex.js'

describe('water cleanses', () => {
  it('the data: wet strips burn on enter; burn and poison at EoA — NEVER regeneration', () => {
    expect(stripsOnEnterOf(TERRAIN.WATER)).toEqual(['status.burn'])
    expect([...stripsOnActivationEndOf(TERRAIN.WATER)].sort())
      .toEqual(['status.burn', 'status.poison'])
    expect(stripsOnActivationEndOf(TERRAIN.WATER)).not.toContain('status.regeneration')
    expect(stripsOnEnterOf(TERRAIN.OPEN)).toEqual([])
    expect(stripsOnActivationEndOf(TERRAIN.FOREST)).toEqual([])
  })

  /** First water hex on the map, and a passable non-water neighbour to start from. */
  function waterAndShore(mapId: string) {
    const probe = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(6, 6) }], [{ type: 'test-zombie', hex: hexId(11, 11) }], { mapId })
    const t = probe.state.terrain
    for (let h = 0; h < t.length; h++) {
      if (t[h] !== TERRAIN.WATER) continue
      for (const n of neighboursOf(h)) {
        if (t[n] !== undefined && t[n] !== TERRAIN.WATER && t[n] !== TERRAIN.OBSTACLE) return { water: h, shore: n }
      }
    }
    throw new Error(`no water with a shore on ${mapId}`)
  }

  it('running through water strips 1 Burn per splash — the entry rung', () => {
    const { water, shore } = waterAndShore('map.thicket')
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: shore }],
      [{ type: 'test-zombie', hex: hexId(11, 11) }],
      { mapId: 'map.thicket' },
    )
    const w = ctx.state.units[0]!
    applyStatus(ctx, w.id, 'status.burn', 3, 'test')
    beginActivation(ctx, w.id, 'test')   // movePointsLeft is granted per activation
    const path = pathTo(reachable(ctx, w), w.hex, water)
    expect(path.length).toBeGreaterThan(0)
    executeMove(ctx, w.id, path, MOVES['power.move']!)
    expect(w.hex).toBe(water)
    expect(valueOf(w, 'status.burn')).toBe(2)   // entry stripped exactly 1
  })

  it('standing in water: End of Activation strips burn, poison AND regeneration by 1 each', () => {
    // The full battle loop runs the EoA ladder — assert via events from a real
    // battle that terrain.water is the causeId of status.reduced lines.
    const { water } = waterAndShore('map.thicket')
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: water }],   // starts ON water
      [{ type: 'test-zombie', hex: hexId(11, 11) }],
      { mapId: 'map.thicket' },
    )
    const w = ctx.state.units[0]!
    applyStatus(ctx, w.id, 'status.burn', 5, 'test')
    applyStatus(ctx, w.id, 'status.poison', 5, 'test')
    runBattle(ctx)
    const waterStrips = ctx.events.filter((e) => e.type === 'status.reduced' && e.causeId === 'terrain.water')
    expect(waterStrips.length).toBeGreaterThan(0)
    const stripped = new Set(waterStrips.map((e) => e['statusId']))
    expect(stripped.has('status.burn')).toBe(true)
    expect(stripped.has('status.poison')).toBe(true)
  })

  it('§4 ordering promise: reaching water sheds Burn BEFORE the tick deals damage that turn', () => {
    // EoA (strip) runs inside the activation loop; the status tick runs at End
    // of Phase, after. So burn 1 on a hero standing in water: stripped to 0 at
    // EoA, and the tick deals NOTHING.
    const { water } = waterAndShore('map.thicket')
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: water }],
      [{ type: 'test-zombie', hex: hexId(11, 11) }],
      { mapId: 'map.thicket' },
    )
    const w = ctx.state.units[0]!
    applyStatus(ctx, w.id, 'status.burn', 1, 'test')
    runBattle(ctx)
    const burnTicks = ctx.events.filter((e) => e.type === 'damage.applied' && e['statusId'] === 'status.burn' && e.target === w.id)
    expect(burnTicks.length).toBe(0)
  })
})
