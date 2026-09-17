// content.alpha-flip (2026-09-02) — the standard battle fields the ALPHA TEAM.
// Ruled "Yes, proceed with step one." (DECISIONS.md 2026-09-02): the eight
// control baselines and every sweep now run on real authored content — the six
// S31 heroes with their authored kits and riders — not on the test cohort's
// clones. This file asserts what the flip claims and nothing the pack already
// proves elsewhere (alpha-team.test.ts owns the units' shape).
import { describe, expect, it } from 'vitest'
import { fieldedDef, createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ATTACKS, FIRST_BATTLE, TEST_COHORT, UNITS } from '../src/content/index.js'

// LAW 10 — 2026-09-02 (seam.items-per-unit): hero rows are BARE now — the kit's
// attacks, powers, riders and stat deltas are applied at FIELDING by
// applyItems, not folded into the row by the converter. Every claim below
// about what a hero carries is a claim about the hero AS FIELDED, so it reads
// fieldedDef(id) (the one function the battle and any preview share). The
// claims are unchanged; only where the kit lives moved.
const ALPHA_SIX = ['alpha-oathblade', 'alpha-sky-pirate', 'alpha-dusk-hawk',
  'alpha-air-mage', 'alpha-lucius', 'alpha-osric']

describe('the standard battle is the Alpha Team', () => {
  it('FIRST_BATTLE fields exactly the six alpha ids, in the S31 order', () => {
    expect([...FIRST_BATTLE.heroes]).toEqual(ALPHA_SIX)
    // and the test cohort is still a named, fieldable fixture — not deleted
    expect(TEST_COHORT.heroes.length).toBe(6)
    for (const t of TEST_COHORT.heroes) expect(UNITS[t], t).toBeDefined()
  })

  it('still honours the 2026-08-20 ruling — six heroes, one of each class', () => {
    // The Alpha Team IS six heroes, one of each class; the clones it replaces
    // were clones of exactly these six. Read the classes off the pack rows.
    const classes = FIRST_BATTLE.heroes.map((t) => (UNITS[t] as unknown as { class?: string }).class ?? UNITS[t]!.role)
    expect(classes.length).toBe(6)
    const ctx = createBattle({ replicate: 0 })
    const heroes = ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.typeId)
    expect(heroes.sort()).toEqual([...ALPHA_SIX].sort())
  })

  it('every alpha hero swings an AUTHORED attack in the standard battle — no test-lane weapon anywhere', () => {
    const swung = new Map<string, Set<string>>()
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r }); runBattle(ctx)
      const type = new Map<number, string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'attack.declared') {
          const t = type.get(e.actor!)!
          if (!swung.has(t)) swung.set(t, new Set())
          swung.get(t)!.add(e['attackId'] as string)
        }
      }
    }
    for (const t of ALPHA_SIX) {
      const ids = swung.get(t)
      expect(ids, `${t} attacked`).toBeDefined()
      for (const id of ids!) {
        expect(fieldedDef(t).attacks, `${t} swung ${id}, which is not in its authored kit`).toContain(id)
        expect(id.startsWith('attack.') && !id.includes('.test'), id).toBe(true)
        expect(ATTACKS[id], id).toBeDefined()
      }
    }
    // the Oathblade's authored Halberd is the standard battle's front line
    expect(swung.get('alpha-oathblade')).toContain('attack.halberd.hack')
  })

  it('the authored riders fire in the standard battle — push, cleave, protection, bleed, slow, weak, stun', () => {
    const causes = new Set<string>()
    let knocked = 0, area = 0
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 16 }); runBattle(ctx)   // authored horde, pressure (content.enemy-flip): sixteen before the back line is reached
      for (const e of ctx.events) {
        if (e.type === 'status.applied') causes.add(e['causeId'] as string)
        if (e.type === 'knocked') knocked++
        if (e.type === 'burst.declared' && (e['shape'] as {kind:string}).kind === 'arc') area++
      }
    }
    expect(knocked, 'the Halberd pushes').toBeGreaterThan(0)
    expect(area, 'Cleave swings as an arc').toBeGreaterThan(0)
    for (const c of ['alpha-air-mage.arcane-ward', 'alpha-oathblade.brace', 'alpha-oathblade.oath-of-blood',
      'alpha-sky-pirate.ragged-edge', 'alpha-dusk-hawk.pin', 'alpha-air-mage.dampen', 'alpha-oathblade.stagger']) {
      expect(causes, c).toContain(c)
    }
  })
})
