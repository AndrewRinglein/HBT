// content.opening-units (2026-09-28): the two opening units the pack did not have.
// (1) The Lumberjack's Wife, her own civilian (DECISIONS.md 2026-09-28: "Second battle is Lumberjack
//     and wife. They're two different units."), her numbers as dictated ("the Lumberjack's Wife and
//     the Undead Soldier, dictated"): Strength 2, Precision 2, Accuracy 65, Health 6, Dodge 10,
//     Movement 5, a knife (item.dagger) and basic armor (item.basic-armor). Authored in the Codex
//     (content/gen/civilian-rulings.json) as hero.fixed.lumberjacks-wife; hero.fixed.lumberjack-and-wife
//     is the Lumberjack alone.
// (2) Battle 2's Undead Soldier is the existing unit.soldier ("Let's just use the existing soldier as
//     the undead soldier."), published with its Codex numbers (gen/bestiary.json → gen/enemies-authored.json).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyDamage } from '../src/core/mutate.js'
import { settle } from '../src/core/settle.js'
import { ITEMS, UNITS } from '../src/content/index.js'

const WIFE = 'hero.fixed.lumberjacks-wife', LUMBERJACK = 'hero.fixed.lumberjack-and-wife', SOLDIER = 'unit.soldier'

describe('content.opening-units', () => {
  it('the Wife is her own civilian row with her dictated numbers', () => {
    const w = UNITS[WIFE]!
    expect([w.name, w.side]).toEqual(["Lumberjack's Wife", 'hero'])
    expect(w.tags).toContain('class.civilian')
    expect({ strength: w.strength, precision: w.precision, accuracy: w.accuracy, maxHp: w.maxHp, dodge: w.dodge, movement: w.movement })
      .toEqual({ strength: 2, precision: 2, accuracy: 65, maxHp: 6, dodge: 10, movement: 5 })
    expect(w.defaultItems).toEqual(['item.dagger', 'item.basic-armor'])
  })

  it('she fields beside the Lumberjack as two units, each killable on its own', () => {
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: [LUMBERJACK, WIFE], enemies: [SOLDIER], enemyCount: 1, strict: true })
    const lj = ctx.state.units.find((u) => u.typeId === LUMBERJACK)!, wife = ctx.state.units.find((u) => u.typeId === WIFE)!
    expect(lj.id).not.toBe(wife.id)
    // her row's Health 6, plus what her basic armor adds when she wears it
    const armorHealth = (ITEMS['item.basic-armor']!.statModifiers as Record<string, number> | undefined)?.['maxHp'] ?? (ITEMS['item.basic-armor']!.statModifiers as Record<string, number> | undefined)?.['health'] ?? 0
    expect([wife.side, wife.maxHp, wife.strength, wife.precision, wife.movement]).toEqual(['hero', 6 + armorHealth, 2, 2, 5])
    expect(ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === wife.id).map((e) => e['itemId'])).toEqual(expect.arrayContaining(['item.dagger', 'item.basic-armor']))
    applyDamage(ctx, wife.id, 99, 'test.kill', { actor: null })
    settle(ctx, 'test.kill')
    expect(wife.lifeState).not.toBe('standing')
    expect(lj.lifeState).toBe('standing')
  })

  it('unit.soldier fields as an enemy with its Codex numbers and fights a battle to its end', () => {
    const s = UNITS[SOLDIER]!
    expect({ side: s.side, strength: s.strength, armor: s.armor, maxHp: s.maxHp, accuracy: s.accuracy, movement: s.movement })
      .toEqual({ side: 'enemy', strength: 5, armor: 2, maxHp: 10, accuracy: 62, movement: 4 })
    const ctx = createBattle({ replicate: 0, mapId: 'map.open', enemies: [SOLDIER, SOLDIER, SOLDIER, SOLDIER], enemyCount: 4, strict: true })
    runBattle(ctx)
    expect(ctx.state.outcome).not.toBeNull()
    expect(ctx.events.some((e) => e.type === 'attack.declared' && String(e['attackId']).startsWith('attack.soldier.'))).toBe(true)
  })

  it('no row still names the Lumberjack and Wife as one unit', () => {
    for (const u of Object.values(UNITS)) expect(u.name ?? '', u.typeId).not.toMatch(/lumberjack and wife/i)
    const kingdom = readFileSync(join(__dirname, '..', '..', 'kingdom', 'src', 'content', 'heroes.ts'), 'utf8')
    expect(kingdom).not.toMatch(/'Lumberjack and Wife'/)
  })
})
