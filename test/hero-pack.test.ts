// The prologue party — content.hero-pack (2026-08-26).
//
// Ruled: "pick a ranger of the 24 Eve, then a warrior and a preist, all from
// 24 eve." The Hunter resolves fully (dictated longbow override); Iron Dwarf
// and Battle Chaplain have SPEC kits whose roll belongs to the draft — NAMED
// GAPS in content/gen/enemy-pack-gaps.json until a dictated override lands.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const HUNTER = 'hero.base.ranger-aggressive'

describe('the Hunter is a real hero from the Codex', () => {
  it('carries the authored Eve stats and pays stamina like a hero', () => {
    const h = UNITS[HUNTER]!
    expect(h).toBeDefined()
    expect(h.side).toBe('hero')
    expect(h.maxHp).toBe(6)
    expect(h.accuracy).toBe(80)
    expect(h.precision).toBe(5)
    expect(h.maxStamina, 'heroes run stamina').toBe(5)
    // class half-step read from the Codex movementAction grants
    expect(h.moves).toEqual(['power.move', 'power.side-roll'])
  })

  it('fights with the longbow the kit dictated — both attacks, stamina PAID', () => {
    expect(UNITS[HUNTER]!.attacks).toEqual(['attack.longbow.shot', 'attack.longbow.long-shot'])
    expect(ATTACKS['attack.longbow.shot']).toMatchObject(
      { kind: 'ranged', reach: 6, stat: 'precision', bonus: 1, staminaCost: 1 })
    expect(ATTACKS['attack.longbow.long-shot']).toMatchObject(
      { kind: 'ranged', reach: 7, bonus: 2, staminaCost: 2 })
  })

  it('the two SPEC kits are named gaps, not rolls somebody made in a converter', () => {
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string }[]
    for (const id of ['hero.base.warrior-iron', 'hero.base.priest-armored']) {
      expect(gaps.some((g) => g.unit === id && g.needs === 'kit unresolved'), id).toBe(true)
      expect(UNITS[id], `${id} must NOT be fielded with an invented kit`).toBeUndefined()
    }
  })

  it('battle 1 in miniature runs: the Hunter shoots authored zombies', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.prologue-party')))
    runBattle(ctx)
    const shots = ctx.events.filter((e) =>
      e.type === 'attack.declared' && String(e['attackId']).startsWith('attack.longbow.'))
    expect(shots.length, 'the Hunter never drew the bow').toBeGreaterThan(0)
    expect(ctx.events.some((e) => e.type === 'stamina.spent' &&
      String(e.causeId).startsWith('attack.longbow.')), 'shots must cost stamina').toBe(true)
    expect(ctx.state.outcome).not.toBeNull()
  })
})
