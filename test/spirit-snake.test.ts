// The Spirit Snake — first of the Beast pen. Codex §10: "Spirit Snake | Beast |
// str 1 | prec 1 | armor 1 | health 2 | reach 1"; §5 Fangs: "Bite | melee |
// strength | +2 | physical"; §3 Serpent: "onHit your fang attacks apply 2
// Poison." Chaff with a venom clock. It extends the FIRST_BATTLE CYCLE — the
// first four enemies are the original 4v4 composition; the snake appears from
// the fifth enemy on. Accuracy 70 is SWITCHES.md beastAccuracy (no published
// Beast baseline); stamina 0 because enemies do not run stamina.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { preview } from '../src/core/pipeline.js'
import { UNITS, ATTACKS, FIRST_BATTLE } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

describe('the data — the Codex row, verbatim', () => {
  it('unit.spirit-snake carries the §10 statline', () => {
    const d = UNITS['spirit-snake']!
    expect(d).toBeDefined()
    expect([d.maxHp, d.armor, d.strength, d.precision, d.reach]).toEqual([2, 1, 1, 1, 1])
    expect(d.maxStamina).toBe(0)                       // enemies do not run stamina
    expect(d.movement).toBe(4)                         // "enemies 4"
    expect(d.attacks).toEqual(['attack.fangs.bite'])
    expect(d.attributes).toContain('beast')
    expect(d.triggers?.map((t) => t.id)).toEqual(['trigger.spirit-snake.venom'])
  })
  it('attack.fangs.bite is the §5 Fangs row', () => {
    const a = ATTACKS['attack.fangs.bite']!
    expect(a).toBeDefined()
    expect([a.kind, a.stat, a.bonus, a.damageType, a.reach, a.staminaCost])
      .toEqual(['melee', 'strength', 2, 'physical', 1, 0])
  })
})

describe('the horde cycle', () => {
  it('the first four enemies are the ORIGINAL 4v4 — the snake slithers in at the sixth', () => {
    expect(FIRST_BATTLE.enemies.slice(0, 4)).toEqual(['zombie', 'zombie', 'zombie', 'zombie-burning'])
    expect(FIRST_BATTLE.enemies[5]).toBe('spirit-snake')
    expect(FIRST_BATTLE.defaultEnemyCount).toBe(4)   // the canonical battle stays 4v4
    const four = createBattle({ replicate: 0, enemyCount: 4 })
    expect(four.state.units.filter((u) => u.typeId === 'spirit-snake').length).toBe(0)
    const eight = createBattle({ replicate: 0, enemyCount: 8 })
    expect(eight.state.units.filter((u) => u.typeId === 'spirit-snake').length).toBe(1)
    expect(eight.state.units.filter((u) => u.typeId === 'zombie').length).toBe(5)
    // the one-per-four burning cadence survives the Beast pen
    expect(eight.state.units.filter((u) => u.typeId === 'zombie-burning').length).toBe(2)
  })
  it('enemies are named for what they ARE — a snake is never "Zombie 5"', () => {
    const eight = createBattle({ replicate: 0, enemyCount: 8 })
    const snake = eight.state.units.find((u) => u.typeId === 'spirit-snake')!
    expect(snake.name).toBe('Spirit Snake 1')
    expect(eight.state.units.some((u) => u.name === 'Zombie Burning 1')).toBe(true)
  })
})

describe('the numbers', () => {
  it('bite previews 3 vs the unarmored ranger (1 str + 2 bonus), 2 vs the warrior (armor 1)', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }, { type: 'warrior', hex: hexId(6, 5) }],
      [{ type: 'spirit-snake', hex: hexId(5, 6) }],
    )
    expect(preview(ctx, 2, 0, 'attack.fangs.bite').damageOnHit).toBe(3)
    expect(preview(ctx, 2, 1, 'attack.fangs.bite').damageOnHit).toBe(2)
  })
  it('chaff by design: one warrior axe (6) is more than its whole body (2)', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'spirit-snake', hex: hexId(5, 6) }],
    )
    expect(preview(ctx, 0, 1, 'attack.warrior.axe').damageOnHit)
      .toBeGreaterThanOrEqual(UNITS['spirit-snake']!.maxHp)
  })
})

describe('the venom fires in real battles', () => {
  it('venom lands somewhere on the terrain maps — rare by DESIGN of the published row', () => {
    // FINDING (2026-08-20, recorded for Angela): with the Codex §10 statline
    // (hp 2) the snake almost never survives contact — venom fired 4 times in
    // 350 panel battles, and only where terrain slows the heroes down. The row
    // is faithful; whether chaff-with-a-clock is the intent is a design call.
    let found = 0
    outer: for (const mapId of ['map.field', 'map.thicket']) {
      for (const z of [8, 12]) {
        for (let r = 0; r < 25; r++) {
          const ctx = createBattle({ replicate: r, enemyCount: z, mapId })
          runBattle(ctx)
          found += ctx.events.filter((e) => e.type === 'status.applied'
            && e['causeId'] === 'trigger.spirit-snake.venom'
            && e['statusId'] === 'status.poison' && e['amount'] === 2).length
          if (found) break outer
        }
      }
    }
    expect(found).toBeGreaterThan(0)
  })
})
