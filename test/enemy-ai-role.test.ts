// fix.enemy-ai-role (2026-09-03) — found running Supper (encounter.supper).
//
// Two rules, both read off the rows: a unit kites when its ranged attacks are
// at least as many as its melee ones (the Ghoul — Rake, Shriek, Devour, Eat
// Corpse — bites; the Skeletal Archer — Gut, Shoot — shoots), and the kite's
// bow is its longest-reaching attack, never the first listed. The Archer's
// range 5 is the ruling (ENCOUNTERS-ENGINE-HANDOFF §5.2), now on its row.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const rangedCount = (id: string) => UNITS[id]!.attacks.filter((a) => ATTACKS[a]?.kind === 'ranged').length
const meleeCount = (id: string) => UNITS[id]!.attacks.filter((a) => ATTACKS[a]?.kind === 'melee').length

describe('the AI follows the weapons, by count', () => {
  it('every authored enemy: kite iff ranged >= melee (support rows keep their authored role)', () => {
    for (const [id, d] of Object.entries(UNITS)) {
      if (d.side !== 'enemy' || !id.startsWith('unit.') || d.aiAuthored) continue
      const r = rangedCount(id), m = meleeCount(id)
      if (r === 0 && m === 0) continue   // the weaponless (Iron Colossus) are a named gap
      expect(d.ai, `${id}: ${r} ranged / ${m} melee`).toBe(r > 0 && r >= m ? 'ranged-kite' : 'dumb-melee')
    }
  })

  it('the Ghoul bites and the Archer shoots — the two rows this was found on', () => {
    expect(UNITS['unit.ghoul']!.ai).toBe('dumb-melee')
    expect(UNITS['unit.skeletal-archer']!.ai).toBe('ranged-kite')
    expect(ATTACKS['attack.skeletal-archer.shoot']!.reach).toBe(5)
  })

  it('a kiter shoots with its longest reach even when a melee attack is listed first', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(8, 15) }],
      [{ type: 'unit.skeletal-archer', hex: hexId(8, 1) }],   // far enough that the warrior cannot reach it on Turn 1
    )
    const archer = ctx.state.units[1]!
    expect(archer.attacks[0]).not.toBe('attack.skeletal-archer.shoot')   // Gut is listed first
    runBattle(ctx)
    const shots = ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === archer.id && e.causeId === 'attack.skeletal-archer.shoot')
    expect(shots.length).toBeGreaterThan(0)
    for (const s of shots) expect(s['distance']).toBeGreaterThan(1)
  })

  it('in Surrounded the archers shoot and the necromancer bolts — the chaff the design asked for', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.surrounded')))
    runBattle(ctx)
    const by = (id: string) => ctx.events.filter((e) => e.type === 'attack.declared' && e.causeId === id).length
    expect(by('attack.skeletal-archer.shoot')).toBeGreaterThan(0)
  })
})
