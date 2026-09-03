// The Spirit Snake — a PLAYER BEAST. Angela 2026-08-20: "These beasts were
// meant to be player beasts... Spirit Snake is supposed to be a hero unit,"
// and she dictated its block, recorded in the Codex SOURCE (settled.json hero
// ruling → the §10 hero table): Health 4, Dodge 50, Move 8, Accuracy 110,
// Armor 0, Resist 2, Strength 2, Precision 0, Stamina 8; venom 3 Poison on
// hit; zero Item Slots and no weapon slots. BENCHED by her fielding ruling —
// hero-side, out of the default party, fielded here in custom battles.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { performAttack, preview, resolveAccuracy } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { valueOf } from '../src/core/status.js'
import { UNITS, ATTACKS, FIRST_BATTLE } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

describe('the block — Angela\'s dictation, verbatim from the Codex hero table', () => {
  it('every number she gave', () => {
    const d = UNITS['spirit-snake']!
    expect(d).toBeDefined()
    expect(d.side).toBe('hero')
    expect([d.maxHp, d.dodge, d.movement, d.accuracy]).toEqual([4, 50, 8, 110])
    expect([d.armor, d.resist, d.strength, d.precision, d.magic, d.spirit]).toEqual([0, 2, 2, 0, 0, 0])
    expect(d.maxStamina).toBe(8)
    expect(d.attacks).toEqual(['attack.fangs.bite'])
    const t = d.triggers![0]!
    expect(t.effect).toEqual({ kind: 'status.apply', statusId: 'status.poison', value: 3 })
    expect(t.hook).toBe('onHit')
    expect(t.onlyWithAttack).toBe('attack.fangs.bite')
  })
  it('the bite pays its Codex Stam 1 — a hero wields it now (brawlStaminaCost, answered)', () => {
    expect(ATTACKS['attack.fangs.bite']!.staminaCost).toBe(1)
  })
})

describe('benched — out of every horde, off the default party', () => {
  it('no snake at any enemy count, and the standard battle is the Codex cohort (2026-08-20)', () => {
    for (const z of [4, 8, 12]) {
      const ctx = createBattle({ replicate: 0, enemyCount: z })
      expect(ctx.state.units.some((u) => u.typeId === 'spirit-snake'), String(z)).toBe(false)
    }
    expect([...FIRST_BATTLE.enemies]).toEqual(['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie-burning'])
    // 2026-09-02 (content.alpha-flip): the standard party is the Alpha Team —
    // still the six Codex bodies, one of each class, still snake-free.
    expect([...FIRST_BATTLE.heroes]).toEqual(['alpha-oathblade', 'alpha-sky-pirate', 'alpha-dusk-hawk',
      'alpha-air-mage', 'alpha-lucius', 'alpha-osric'])
  })
})

describe('fielded in a custom battle, it plays like her block says', () => {
  function board() {
    const ctx = createCustomBattle(
      [{ type: 'spirit-snake', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(5, 6) }],
    )
    return { ctx, s: ctx.state.units[0]!, z: ctx.state.units[1]! }
  }
  it('accuracy 110 vs no dodge NEVER misses — the bite lands 4 and venom lands 3, every time', () => {
    const { ctx, s, z } = board()
    expect(preview(ctx, s.id, z.id, 'attack.fangs.bite').hitChance).toBeGreaterThanOrEqual(100)
    beginActivation(ctx, s.id, 'test')
    const r = performAttack(ctx, s.id, z.id, 'attack.fangs.bite')
    expect(r.hit).toBe(true)
    expect(r.damage).toBe(4)                       // strength 2 + fangs +2, armor 0
    expect(valueOf(z, 'status.poison')).toBe(3)    // her venom, scoped to the fangs
    expect(s.stamina).toBe(s.maxStamina - 1)       // the bite cost its Stam 1
  })
  it('dodge 50 makes it slippery: a zombie bite has only a 15% chance to touch it', () => {
    const { ctx, s, z } = board()
    expect(resolveAccuracy(ctx, z, s, ctx.attacks['attack.zombie.basic']!).value).toBe(15)  // 65 − 50
  })
})
