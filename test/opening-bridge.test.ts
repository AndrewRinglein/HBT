// encounter.opening.bridge-ai (2026-09-30): battle 3 of the opening, the Bridge (DECISIONS.md 2026-09-28
// "battle 3 (Bridge)"): four Imps on the far bank; a Fire Imp on Turn 2, an Imp on Turn 4, a Fire Imp on
// Turn 5, all on the far side. Seven enemies. No time limit; clear the map.
//
// encounter.opening.bridge was cut (2026-09-28) because the battle never ended. THE STALL'S CAUSE: the
// kite's position ladder put safety strictly ahead of a shot, "safe" being out of every melee enemy's
// Movement + 1. An Imp's Blast reaches 4 and a walking hero threatens 5 or 6, so no hex was ever both;
// the Imps fly 7 and the heroes walk 5, so the Imps always found a safe hex, never shot, and a melee hero
// could never catch them — nobody attacked for 14 Turns. Fixed in the AI, not the map: a kiter with no
// melee ally standing plays its row's `positionAlone` ladder, a shot ahead of safety, the shot read by
// canAttack's geometry (SWITCHES.md aiKiteAlone). The heroes lose most seeds (99 of 100 replicates) —
// the balance is Andrew's; what this item owes is a result on every seed.
import { describe, expect, it } from 'vitest'
import { encounterDef } from '../src/content/scenarios.js'
import { AI_MODE_ROWS } from '../src/content/ai-modes.js'
import { arrivals, arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-bridge', SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
// Law 10, content.bridge-deck-pack (2026-10-01): the walkable deck (DECISIONS.md 2026-09-30, the northern branch
// included) moves every battle; replicate 4 is now the one the heroes win of replicates 0-99 (still 99 wipes, 1 win,
// every seed a result). The claim — the battle is won when the last enemy dies — is unchanged; only the seed moved.
// was: // Replicate 49 is a battle the heroes win (1 of replicates 0-99).
// was: const WIN = 49
const WIN = 4
const IMPS = new Set(['unit.imp', 'unit.fire-imp'])
describe('encounter.opening.bridge', () => {
  it('carries the ruled cast: four Imps on the far bank, then a Fire Imp, an Imp and a Fire Imp', () => {
    const e = encounterDef('encounter.opening.bridge')
    expect(e.mapId).toBe('map.opening.bridge')
    expect(e.setup.map((p) => [p.unit, p.count, p.hexes?.map((h) => [h.col, h.row])]))
      .toEqual([['unit.imp', 4, [[36, 6], [36, 8], [36, 10], [36, 12]]]])
    expect(e.schedule.map((w) => [w.phase, w.spawn.map((p) => p.unit)])).toEqual([[2, ['unit.fire-imp']], [4, ['unit.imp']], [5, ['unit.fire-imp']]])
    expect(e.loseAfter).toBeUndefined()
    expect(e.win).toBeUndefined()
  })
  it('runs deterministically on its map', () => deterministic(S))
  it('seven Imps, the last three arriving on their Turns on the far bank', () => {
    const ctx = openingBattle(S, 0, true)
    arrivedAt(ctx, 2, 'unit.fire-imp', 39, 9)
    arrivedAt(ctx, 4, 'unit.imp', 39, 11)
    arrivedAt(ctx, 5, 'unit.fire-imp', 39, 7)
    expect(arrivals(ctx)).toHaveLength(3)
    expect(ctx.state.units.filter((u) => u.side === 'enemy' && !u.summoned)).toHaveLength(7)
  })
  it('reaches a win or a loss on every seed tried — never the turn cap — and the Imps shoot in every one', () => {
    for (const r of SEEDS) {
      const ctx = openingBattle(S, r)
      expect(['heroClear', 'wipe'], `replicate ${r}: ${ctx.state.outcome} on Turn ${ctx.state.turn}`).toContain(ctx.state.outcome)
      const impIds = new Set(ctx.state.units.filter((u) => IMPS.has(u.typeId)).map((u) => u.id))
      expect(ctx.events.some((e) => e.type === 'attack.declared' && impIds.has(e.actor!)), `replicate ${r}: no Imp ever attacked`).toBe(true)
    }
  })
  it('nobody ever stands in the deep river', () => {
    for (const r of SEEDS.slice(0, 3)) {
      const ctx = openingBattle(S, r)
      const floor = ctx.state.floor!
      expect(floor.some((f) => !f)).toBe(true)
      for (const e of ctx.events) {
        if (e.type === 'moved' || e.type === 'unit.enter') expect(floor[(e['to'] ?? e['hex']) as number], `replicate ${r}: ${e.type} into deep water`).toBe(true)
      }
    }
  })
  it('is won when the last enemy dies', () => {
    const ctx = openingBattle(S, WIN)
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.units.filter((u) => u.side === 'enemy').every((u) => u.lifeState !== 'standing')).toBe(true)
  })
  it('a kiter left with no melee ally plays the row ladder that puts the shot first', () => {
    for (const mode of ['ranged-kite', 'support']) {
      const w = AI_MODE_ROWS[mode]!.weights
      expect(w['positionAlone']!.map((t) => Object.keys(t).sort().join('+'))).toEqual(['clearShot+safe', 'clearShot', 'highGround', 'spacing'])
      expect(w['position']!.map((t) => Object.keys(t).join('+'))).toEqual(['safe', 'canShoot', 'highGround', 'spacing'])
    }
  })
})
