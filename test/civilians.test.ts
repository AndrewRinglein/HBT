// The prologue civilians — content.civilians (2026-08-26).
//
// RULED: "we have a plan for a number of initial civilians, and they do
// things. They're just like the other heroes." And, correcting the first
// build in the same session: "Civilians are EXACTLY like heroes" — stamina
// included. They carry the level-1 hero baseline (Max 5, Regen 1,
// COMBAT-DESIGN.md:461) and pay what their attack rows author. No half-step
// ("Beasts and Civilians get neither"). The Lumberjack's axe attacks exist
// only as NAMES in the Codex, so he fields weaponless — the puppy precedent.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const CIVS = ['hero.fixed.orphans', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer']

describe('civilians are ordinary heroes with their Codex behaviour', () => {
  it('all three field hero-side with authored stats, the hero stamina baseline, no half-step', () => {
    for (const id of CIVS) {
      const u = UNITS[id]!
      expect(u, id).toBeDefined()
      expect(u.side, id).toBe('hero')
      // "Civilians are exactly like heroes" — the level-1 baseline, Max 5 Regen 1
      expect(u.maxStamina, `${id} runs stamina like any hero`).toBe(5)
      expect(u.staminaRegen, id).toBe(1)
      expect(u.moves, `${id} — Beasts and Civilians get neither half-step`).toEqual(['power.move'])
      expect(u.attributes, id).toContain('civilian')
    }
    expect(UNITS['hero.fixed.orphans']!.maxHp).toBe(7)
    expect(UNITS['hero.fixed.lumberjack-and-wife']!.strength).toBe(4)
    expect(UNITS['hero.fixed.farmer']!.maxHp).toBe(7)
  })

  it('the orphan throws rocks and the farmer jabs — paying what the rows author', () => {
    expect(UNITS['hero.fixed.orphans']!.attacks).toEqual(['attack.pile-of-rocks.throw'])
    expect(ATTACKS['attack.pile-of-rocks.throw']).toMatchObject(
      { kind: 'ranged', reach: 3, stat: 'precision', staminaCost: 0 })   // authored zero
    expect(UNITS['hero.fixed.farmer']!.attacks).toEqual(['attack.pitchfork.jab'])
    // civilians are exactly like heroes: the Farmer PAYS the authored 1
    expect(ATTACKS['attack.pitchfork.jab']).toMatchObject(
      { kind: 'melee', reach: 1, stat: 'strength', bonus: 1, staminaCost: 1 })
  })

  it('the Lumberjack is weaponless BY NAMED GAP, not by silent loss', () => {
    expect(UNITS['hero.fixed.lumberjack-and-wife']!.attacks).toEqual([])
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string }[]
    expect(gaps.some((g) => g.unit === 'hero.fixed.lumberjack-and-wife'
      && /item unauthored|attack rows unauthored/.test(g.needs))).toBe(true)
  })

  it('they ACT — the verify battle shows civilians fighting, not statues', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.civilians')))
    runBattle(ctx)
    const acted = new Set<string>()
    for (const e of ctx.events) {
      if ((e.type === 'attack.declared' || e.type === 'moved') && typeof e.actor === 'number') {
        acted.add(ctx.state.units[e.actor]!.typeId)
      }
    }
    expect(ctx.events.some((e) => e.type === 'attack.declared'
      && String(e['attackId']) === 'attack.pile-of-rocks.throw'), 'the orphan must throw').toBe(true)
    for (const id of CIVS) expect(acted.has(id), `${id} did nothing at all`).toBe(true)
    expect(ctx.state.outcome).not.toBeNull()
  })
})
