// test.fixture-migration (2026-09-02) — the last hand-typed units leave the
// engine. The 2026-08-14 fixtures (zombie, zombie-burning, warrior, ranger,
// mage), their six PROVISIONAL attacks and the invented Arcane Bolt are test
// rows in content/test/ now, under the test family; the test cohort in
// settled.json swings the renamed attacks. src/content/index.ts types no
// unit but the three dictated beasts, no attack but the drake's two, and no
// ability at all — those wait on their Codex rows (content.beasts).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ABILITIES, ATTACKS, UNITS } from '../src/content/index.js'
import { packTestAbilities, packTestAttacks, packUnits } from '../src/content/pack.js'
import { createCustomBattle } from '../src/core/setup.js'
import { resolveDamage } from '../src/core/pipeline.js'
import { hexId } from './board16.js'

const src = () => readFileSync(join(__dirname, '..', 'src', 'content', 'index.ts'), 'utf8')

describe('what index.ts still types', () => {
  it('exactly the three beasts, the drake\'s two attacks, and nothing else', () => {
    const hand = Object.keys(UNITS).filter((id) => !packUnits()[id])
    expect(hand.sort()).toEqual(['green-drake', 'shadow-hound-puppy', 'spirit-snake'])
    const handAttacks = Object.keys(ATTACKS).filter((id) => !(id in packTestAttacks()) && /^attack\.(zombie\.basic|warrior|ranger|mage)\b/.test(id))
    expect(handAttacks).toEqual([])
    expect(src()).not.toMatch(/'power\.mage\.bolt'/)
    expect(ABILITIES['power.mage.bolt']).toBeUndefined()
    expect(ABILITIES['power.test-mage.bolt']).toBeDefined()
    expect(packTestAbilities()['power.test-mage.bolt']).toBeDefined()
  })

  it('the old fixture ids are gone, the test-family ids stand in, and the test cohort swings the renamed attacks', () => {
    for (const old of ['zombie', 'zombie-burning', 'warrior', 'ranger', 'mage']) expect(UNITS[old], old).toBeUndefined()
    for (const t of ['test-warrior', 'test-ranger', 'test-mage', 'test-gash-zombie']) expect(packUnits()[t], t).toBeDefined()
    for (const old of ['attack.zombie.basic', 'attack.warrior.axe', 'attack.warrior.massive', 'attack.ranger.bow', 'attack.mage.staff', 'attack.mage.strike']) expect(ATTACKS[old], old).toBeUndefined()
    expect(UNITS['test-oathblade']!.attacks).toEqual(['attack.test-warrior.massive', 'attack.test-warrior.axe', 'attack.punch'])
    expect(UNITS['test-zombie']!.attacks).toEqual(['attack.test-zombie.bite'])
    expect(UNITS['test-air-mage']!.abilities).toEqual(['power.test-mage.bolt'])
  })

  it('the gash zombie is the cohort zombie plus one rider — a delta, its base\'s riders re-sourced', () => {
    const g = UNITS['test-gash-zombie']!, z = UNITS['test-zombie']!
    expect([g.maxHp, g.strength, g.accuracy]).toEqual([z.maxHp, z.strength, z.accuracy])
    expect(g.attacks).toEqual(z.attacks)
    const ids = (g.triggers ?? []).map((t) => t.id)
    for (const t of z.triggers ?? []) expect(ids).toContain(t.id)
    expect(ids).toContain('test.zombie.gash')
    for (const t of g.triggers ?? []) expect(t.source).toBe('unit.test-gash-zombie')
  })

  it('the classic arithmetic still reads: the test zombie bites the test warrior for 3 through armor 1, the test ranger for 4', () => {
    const w = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }])
    const r = createCustomBattle([{ type: 'test-ranger', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }])
    expect(resolveDamage(w, w.state.units[1]!, w.state.units[0]!, ATTACKS['attack.test-zombie.bite']!, false).value).toBe(3)
    expect(resolveDamage(r, r.state.units[1]!, r.state.units[0]!, ATTACKS['attack.test-zombie.bite']!, false).value).toBe(4)
  })
})
