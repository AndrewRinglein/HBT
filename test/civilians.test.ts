// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
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
import { fieldedDef, createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { beginActivation } from '../src/core/mutate.js'
import { hexId } from './board16.js'

// LAW 10 — 2026-09-02 (seam.items-per-unit): hero rows are BARE now — the kit's
// attacks, powers, riders and stat deltas are applied at FIELDING by
// applyItems, not folded into the row by the converter. Every claim below
// about what a hero carries is a claim about the hero AS FIELDED, so it reads
// fieldedDef(id) (the one function the battle and any preview share). The
// claims are unchanged; only where the kit lives moved.
const CIVS = ['hero.fixed.orphans', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer']

describe('civilians are ordinary heroes with their Codex behaviour', () => {
  it('all three field hero-side with authored stats, the hero stamina baseline, no half-step', () => {
    for (const id of CIVS) {
      const u = fieldedDef(id)
      expect(u, id).toBeDefined()
      expect(u.side, id).toBe('hero')
      // "Civilians are exactly like heroes" — the level-1 baseline, Max 5 Regen 1
      expect(u.maxStamina, `${id} runs stamina like any hero`).toBe(5)
      expect(u.staminaRegen, id).toBe(1)
      expect(u.moves, `${id} — Beasts and Civilians get neither half-step`).toEqual(['power.move'])
      expect(u.tags, id).toContain('civilian')   // fix.unit-tags 2026-09-03: one field
    }
    expect(fieldedDef('hero.fixed.orphans').maxHp).toBe(7)
    expect(fieldedDef('hero.fixed.lumberjack-and-wife').strength).toBe(4)
    expect(fieldedDef('hero.fixed.farmer').maxHp).toBe(7)
  })

  it('the orphan throws rocks and the farmer jabs — paying what the rows author', () => {
    // Law 10, 2026-09-10: the Sep 5 ruling arms every civilian with universal
    // Punch as well as their weapon. Exact lists still reject accidental extras.
    expect(fieldedDef('hero.fixed.orphans').attacks).toEqual(['attack.pile-of-rocks.throw', 'attack.punch'])
    expect(ATTACKS['attack.pile-of-rocks.throw']).toMatchObject(
      { range: 3, staminaCost: 0, attack: { kind: 'ranged', stat: 'precision' } })   // authored zero
    expect(fieldedDef('hero.fixed.farmer').attacks).toEqual(['attack.pitchfork.jab', 'attack.punch'])
    // civilians are exactly like heroes: the Farmer PAYS the authored 1
    expect(ATTACKS['attack.pitchfork.jab']).toMatchObject(
      { range: 1, staminaCost: 1, attack: { kind: 'melee', stat: 'strength', bonus: 1 } })
  })

  it('the Lumberjack swings the axe that was authored all along — and its drops are NAMED', () => {
    // LAW 10 — 2026-08-27: the axe was never a gap. mkenginepack read only
    // gen/settled-items.json; the axe and its attacks live in settled.json,
    // the second authored source (S30 merged both). The weaponless assertion
    // was testing a CONVERTER bug as if it were content truth.
    expect(fieldedDef('hero.fixed.lumberjack-and-wife').attacks)
      .toEqual(['attack.lumberjack-axe.chop', 'attack.lumberjack-axe.cleave', 'attack.punch'])
    expect(ATTACKS['attack.lumberjack-axe.chop']).toMatchObject(
      { staminaCost: 1, attack: { kind: 'melee', bonus: 1 } })
    expect(ATTACKS['attack.lumberjack-axe.cleave']).toMatchObject(
      { staminaCost: 2, attack: { kind: 'melee', bonus: 2 } })
    // Chop's dictated rider travelled: 20% for 2 Bleed, scoped to the chop
    const rider = (fieldedDef('hero.fixed.lumberjack-and-wife').triggers ?? [])
      .find((t) => t.id === 'trigger.lumberjack-axe.chop.bleed')!
    expect(rider).toBeDefined()
    expect(rider.chance).toBe(20)
    expect(rider.effect).toMatchObject({ statusId: 'status.bleed', value: 2 })
    // Cleave's one-hex arc is still dropped WITH ITS NAME on file (a chosen
    // half-arc the engine does not speak) — but its crit 20 COMPILES since
    // station.crit (2026-08-27; Law 10, extended toward the rule the day the
    // capability landed).
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string; what: string }[]
    expect(gaps.some((g) => /cleave/.test(g.what) && g.needs === 'area attack shape')).toBe(true)
    expect(gaps.some((g) => /cleave/.test(g.what) && /crit/.test(g.needs))).toBe(false)
    expect(ATTACKS['attack.lumberjack-axe.cleave']!.attack.crit).toBe(20)
  })

  it('they ACT — the verify battles show civilians fighting, not statues', () => {
    // LAW 10 — 2026-08-27: single-seed once again. Arming the Lumberjack (S30)
    // ended seed 0 before the orphan's first throw. The rule is the union
    // across a handful of seeds, same as the enemy-pack aliveness test.
    const acted = new Set<string>()
    let orphanThrew = false
    for (const r of [0, 1, 2]) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.civilians')), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) {
        if ((e.type === 'attack.declared' || e.type === 'moved') && typeof e.actor === 'number') {
          acted.add(ctx.state.units[e.actor]!.typeId)
        }
      }
      expect(ctx.state.outcome, `replicate ${r}`).not.toBeNull()
    }
    void orphanThrew
    for (const id of CIVS) expect(acted.has(id), `${id} did nothing in any seed`).toBe(true)
  })

  it('the orphan throws when a zombie is in range — scripted, not seed-luck', () => {
    // LAW 10 — 2026-08-27: in the open verify battles the orphan NEVER throws,
    // and that is the kiter being RIGHT, not broken: her reach is 4 and a
    // zombie threatens every hex she could shoot from, so she retreats while
    // the Lumberjack wins the fight. The claim "she can fight" is proven where
    // it is deterministic — put a target in reach and run her activation.
    const ctx = createCustomBattle(
      [{ type: 'hero.fixed.orphans', hex: hexId(5, 8) }],
      [{ type: 'unit.zombie', hex: hexId(8, 8) }],
    )
    const o = ctx.state.units[0]!
    // With stamina for the walk she FLEES instead — correctly: safety scores
    // above the shot, her reach is 4 and the zombie threatens radius 5, so
    // kiting away is her policy. Starved of the walk (the throw itself costs
    // 0), the only thing left is the rock — deterministic, and story-apt.
    o.stamina = 0
    beginActivation(ctx, o.id, 'test')
    runActivation(ctx, o.id)
    expect(ctx.events.some((e) => e.type === 'attack.declared'
      && String(e['attackId']) === 'attack.pile-of-rocks.throw'), 'rocks must fly').toBe(true)
  })
})
