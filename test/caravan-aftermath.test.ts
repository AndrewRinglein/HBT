// encounter.caravan-aftermath (2026-10-01): the caravan aftermath, fielded. Ruled provisionally (DECISIONS.md 2026-10-01
// "the caravan's fight"): asked what the heroes fight there, Andrew chose "Imps and Bloodhounds (Recommended)" — 2 Imps +
// 2 Bloodhounds from the far end of the road, the heroes at the near end, the ground fires burning and the corpse hexes
// cursed (Weak). The map is compiled from the painted scene's measured navigation (content/mkpaintedmaps.mjs): its
// usable hexes open, the wrecks and the pockets walled in by them high obstacles; the encounter paints the scene's own
// ground lists, never retyped (content/gen/painted-maps.json).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { layerIdOf } from '../src/content/terrain.js'
import { deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.caravan-aftermath', SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const painted = JSON.parse(readFileSync(new URL('../../content/gen/painted-maps.json', import.meta.url), 'utf8'))
const ROWS: string[] = painted.maps.find((m: { id: string }) => m.id === 'map.caravan-aftermath').rows
const GROUND: { cursed: number[]; fire: number[] } = painted.ground['map.caravan-aftermath']
/** the battle as fielded, before anyone acts */
const fielded = () => createBattle({ ...scenarioOptions(scenarioDef(S), 0), replicate: 0 } as Parameters<typeof createBattle>[0])

describe('encounter.caravan-aftermath', () => {
  it('carries the ruled fight: two Bloodhounds and two Imps at the east end of the road, the heroes at the west end', () => {
    const e = encounterDef('encounter.caravan-aftermath')
    expect(e.mapId).toBe('map.caravan-aftermath')
    expect(e.setup.map((p) => [p.unit, p.count])).toEqual([['unit.bloodhound', 2], ['unit.imp', 2]])
    for (const p of e.setup) for (const h of p.hexes ?? []) expect(h.col, `${p.unit} at the east end`).toBeGreaterThanOrEqual(29)
    expect(e.schedule).toEqual([])
    expect(e.loseAfter).toBeUndefined()
  })
  it('stands on the scene\'s measured board: 32 by 18, its wrecks impassable, its fires burning and its corpses cursed from the first frame', () => {
    const ctx = fielded()
    const W = ctx.geo.board.width, H = ctx.geo.board.height
    expect([W, H]).toEqual([32, 18])
    expect(ROWS.join('').split('x').length - 1).toBe(18)
    const burning = [], weak = []
    for (let h = 0; h < W * H; h++) { const id = layerIdOf((ctx.state.layers ?? [])[h] ?? 0); if (id === 'layer.burning') burning.push(h); if (id === 'layer.weak') weak.push(h) }
    expect(burning).toEqual(GROUND.fire)
    expect(weak).toEqual(GROUND.cursed)
    expect(GROUND.fire).toHaveLength(7); expect(GROUND.cursed).toHaveLength(31)
    /* the legal deployment: every unit on an open hex; the heroes within two of (1,5) on clean ground, the foes where placed */
    const heroes = ctx.state.units.filter((u) => u.side === 'hero'), foes = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(heroes).toHaveLength(4); expect(foes).toHaveLength(4)
    for (const u of [...heroes, ...foes]) expect(ROWS[Math.floor(u.hex / W)]![u.hex % W], `${u.typeId} on open ground`).toBe('.')
    for (const u of heroes) {
      expect(ctx.geo.distance(u.hex, 5 * W + 1), `${u.typeId} in the heroes' zone`).toBeLessThanOrEqual(2)
      expect(GROUND.fire.includes(u.hex) || GROUND.cursed.includes(u.hex), `${u.typeId} starts on clean ground`).toBe(false)
    }
    expect(foes.map((u) => [u.typeId, u.hex % W, Math.floor(u.hex / W)]).sort()).toEqual([['unit.bloodhound', 29, 10], ['unit.bloodhound', 29, 11], ['unit.imp', 31, 11], ['unit.imp', 31, 9]].sort())
  })
  it('runs deterministically on its map', () => deterministic(S))
  it('reaches a win or a loss on every seed tried — never the turn cap — and both the hounds and the Imps attack', () => {
    const everAttacked = new Set<string>()
    for (const r of SEEDS) {
      const ctx = openingBattle(S, r)
      expect(['heroClear', 'wipe'], `replicate ${r}: ${ctx.state.outcome} on Turn ${ctx.state.turn}`).toContain(ctx.state.outcome)
      for (const type of ['unit.bloodhound', 'unit.imp']) {
        const ids = new Set(ctx.state.units.filter((u) => u.typeId === type).map((u) => u.id))
        // Law 10, 2026-10-05 — capability.damage-from-two-stats (DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': of damage from two stats added, "We do need that."): this read
        //   expect(ctx.events.some((e) => e.type === 'attack.declared' && ids.has(e.actor!)), `replicate ${r}: no ${type} attacked`).toBe(true)
        // - on every seed, each kind attacks. The party's staffs and books deal their second term now (the Force Staff its half
        // Magic, the Holy Texts its Spirit), and on one seed both Bloodhounds are killed before either has swung. What the line
        // holds is that the fight is a fight: a kind attacks, unless every unit of it was killed before it could - a hound left
        // alive that never attacks still fails. And over the seeds tried each kind does attack.
        const attacked = ctx.events.some((e) => e.type === 'attack.declared' && ids.has(e.actor!))
        const allKilled = ctx.state.units.filter((u) => u.typeId === type).every((u) => u.lifeState === 'dead')
        expect(attacked || allKilled, `replicate ${r}: a living ${type} never attacked`).toBe(true)
        if (attacked) everAttacked.add(type)
      }
    }
    expect([...everAttacked].sort(), 'over the seeds tried, both the hounds and the Imps attack').toEqual(['unit.bloodhound', 'unit.imp'])
  })
  it('nobody ever stands on a wreck', () => {
    for (const r of SEEDS.slice(0, 3)) {
      const ctx = openingBattle(S, r), W = ctx.geo.board.width
      for (const e of ctx.events) if (e.type === 'moved' || e.type === 'unit.enter') {
        const h = (e['to'] ?? e['hex']) as number
        expect(ROWS[Math.floor(h / W)]![h % W], `replicate ${r}: ${e.type} onto (${h % W},${Math.floor(h / W)})`).toBe('.')
      }
    }
  })
})
