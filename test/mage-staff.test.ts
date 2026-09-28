// content.mage-staff (2026-09-28): staff against bow, on armored and unarmored enemies.
//
// Angela: the Mage/Ranger split is intentional — the Mage deals MAGIC damage and the
// Ranger PHYSICAL, which diverge once enemies carry armor (magic is reduced by
// `resist`, physical by `armor` — src/core/mitigation.ts). Raw damage per swing
// against the standard horde (armor 0) is the wrong yardstick. Andrew, 2026-09-28
// (DECISIONS.md "the staff-vs-bow check runs against the Codex's armored enemies"):
// sweep against the Codex's armored bestiary rows and an unarmored one.
//
// The yardstick (SWITCHES.md `mageStaffYardstick`): the standard six, strict, on the
// same replicates — so the Air Mage (Lightning Staff, magic Bolt) and the Dusk Hawk
// (Shortbow, physical shots) fight the SAME battles side by side — and the damage
// each deals across the sweep, read from the log by the scoreboard.
import { describe, expect, it } from 'vitest'
import { createBattle, type BattleOptions } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
import { UNITS } from '../src/content/index.js'

const REPLICATES = 24
const MAGE = 'alpha-air-mage'
const RANGER = 'alpha-dusk-hawk'
const STAFF = 'attack.lightning-staff.'
const BOW = 'attack.shortbow.'
const ARMORED = 'unit.bruiser-demon' // armor 4, resist 1 — the Codex row the ruling names
const UNARMORED = 'unit.zombie'      // armor 0 — the standard horde

type Tally = { mage: number; ranger: number; staff: { swings: number; damage: number }; bow: { swings: number; damage: number } }

function sweep(enemy: string, overrides?: BattleOptions['overrides']): Tally {
  const t: Tally = { mage: 0, ranger: 0, staff: { swings: 0, damage: 0 }, bow: { swings: 0, damage: 0 } }
  for (let replicate = 0; replicate < REPLICATES; replicate++) {
    const ctx = createBattle({ replicate, strict: true, enemies: [enemy, enemy, enemy, enemy], enemyCount: 4, ...(overrides ? { overrides } : {}) })
    runBattle(ctx)
    const b = score(ctx.events)
    t.mage += b.damageDealtByType[MAGE] ?? 0
    t.ranger += b.damageDealtByType[RANGER] ?? 0
    for (const [id, a] of Object.entries(b.attacksByAttack)) {
      const arm = id.startsWith(STAFF) ? t.staff : id.startsWith(BOW) ? t.bow : null
      if (arm) { arm.swings += a.swings; arm.damage += a.damage }
    }
  }
  return t
}

// damage per swing compared without division: a/b > c/d  ⇔  a·d > c·b (Law 7, integers)
const perSwingGreater = (x: { swings: number; damage: number }, y: { swings: number; damage: number }) =>
  x.damage * y.swings > y.damage * x.swings

describe('content.mage-staff — the staff is distinguishable from the bow only against armor', () => {
  it('the fielding is what it claims: both heroes carry their weapons; one enemy armored, one not, neither resisting magic much', () => {
    expect(UNITS[MAGE]!.defaultItems).toContain('item.lightning-staff')
    expect(UNITS[RANGER]!.defaultItems).toContain('item.shortbow')
    expect(UNITS[ARMORED]!.armor).toBeGreaterThan(UNITS[ARMORED]!.resist)
    expect(UNITS[ARMORED]!.armor).toBeGreaterThanOrEqual(4)
    expect(UNITS[UNARMORED]!.armor).toBe(0)
  })

  it('against an armored enemy (Bruiser Demon, armor 4) the Mage out-damages the Ranger', () => {
    const t = sweep(ARMORED)
    expect(t.staff.swings).toBeGreaterThan(0)
    expect(t.bow.swings).toBeGreaterThan(0)
    expect(t.mage).toBeGreaterThan(t.ranger)
    expect(perSwingGreater(t.staff, t.bow)).toBe(true)
  }, 120_000)

  it('against an unarmored enemy (Zombie, armor 0) it does not', () => {
    const t = sweep(UNARMORED)
    expect(t.staff.swings).toBeGreaterThan(0)
    expect(t.bow.swings).toBeGreaterThan(0)
    expect(t.mage).toBeLessThan(t.ranger)
    expect(perSwingGreater(t.bow, t.staff)).toBe(true)
  }, 120_000)

  it('armor is the difference: the same Bruiser Demon with its armor overridden to 0, on the same dice, flips it back to the bow', () => {
    const t = sweep(ARMORED, { [ARMORED]: { armor: 0 } })
    expect(t.mage).toBeLessThan(t.ranger)
    expect(perSwingGreater(t.bow, t.staff)).toBe(true)
  }, 120_000)
})
