// The Alpha Team — content.alpha-team (2026-08-27).
//
// The six S31 heroes: the test cohort rebuilt the way heroes actually are —
// authored kits, authored attack rows, riders in the real status vocabulary,
// stat bodies resolved through copyOf from the Codex (content 0b20516: S31's
// programmatic copy wrote empty objects; copyOf named the source all along).
// Nine clauses the engine cannot express are NAMED GAPS in
// content/gen/enemy-pack-gaps.json — push, cleave arc, four crits, three item
// powers — and nothing was guessed to make a row fit.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const SC = 'showcase.alpha-team'
const ALPHA = () => scenarioDef(SC).heroes

// Pipeline agreement, not frozen numbers: the settled row names its copyOf
// source; the Codex dump carries the stat body. The pack must agree with BOTH.
const settled = () => JSON.parse(readFileSync(
  join(__dirname, '..', '..', 'content', 'settled.json'), 'utf8'))
const codexHeroes = () => {
  const D = JSON.parse(readFileSync(
    join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8'))
  const all: { id: string; ported: Record<string, number>; derivedBase: Record<string, number> }[] = []
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return }
    if (o && typeof o === 'object') {
      const r = o as { id?: string; ported?: Record<string, number> }
      if (r.id && String(r.id).startsWith('hero.') && r.ported) all.push(r as (typeof all)[0])
      else Object.values(o).forEach(walk)
    }
  }
  walk(D.heroes)
  return all
}

describe('the pack carries the six alpha heroes with their real stat bodies', () => {
  it('all six exist, hero-side, in the alpha- family, and run stamina', () => {
    expect(ALPHA().length).toBe(6)
    for (const id of ALPHA()) {
      expect(UNITS[id], id).toBeDefined()
      expect(id.startsWith('alpha-'), `${id} — the declared alpha- family`).toBe(true)
      expect(UNITS[id]!.side, id).toBe('hero')
      expect(UNITS[id]!.maxStamina, `${id} — heroes run stamina`).toBeGreaterThan(0)
    }
  })

  it('stat bodies agree with the copyOf Codex source — the S31 empty-object bug stays dead', () => {
    // S31 wrote ported:{} / derivedBase:{} and the converter emitted heroes
    // with NO maxHp/accuracy/movement/maxStamina and strength 0. The fix
    // resolves copyOf; this test is the regression net. Settled fields still
    // win where they speak, so agreement is checked field-by-field against
    // the MERGED view, exactly as the converter builds it.
    const at = settled().alphaTeam.heroes as {
      typeId: string; copyOf: string
      ported: Record<string, number>; derivedBase: Record<string, number>
    }[]
    const codex = codexHeroes()
    for (const h of at) {
      const base = codex.find((x) => x.id === h.copyOf)
      expect(base, `${h.typeId} copyOf ${h.copyOf} must exist in the Codex`).toBeDefined()
      const p = { ...base!.ported, ...h.ported }
      const d = { ...base!.derivedBase, ...h.derivedBase }
      const u = UNITS[h.typeId]!
      expect(u.maxHp, `${h.typeId} health`).toBe(p.health)
      expect(u.accuracy, `${h.typeId} accuracy`).toBe(d.accuracy)
      expect(u.movement, `${h.typeId} movement`).toBe(d.movement)
      expect(u.maxStamina, `${h.typeId} staminaMax`).toBe(d.staminaMax)
      expect(u.strength, `${h.typeId} strength`).toBe(p.strength ?? 0)
      expect(u.maxHp, `${h.typeId} — the empty-body bug emitted undefined`).toBeGreaterThan(0)
    }
  })

  it('the kits are authored attack rows, and heroes PAY authored stamina', () => {
    const cost = (aid: string) => ATTACKS[aid]!.staminaCost
    // The delivered table (S31): Hack 1, Cleave 2 — and the universal Punch
    // costs 1 with its -1 bonus, weaker than any weapon by design.
    expect(ATTACKS['attack.halberd.hack']).toMatchObject({ bonus: 2, staminaCost: 1, kind: 'melee' })
    expect(ATTACKS['attack.halberd.cleave']).toMatchObject({ bonus: 1, staminaCost: 2 })
    expect(ATTACKS['attack.javelin.throw']).toMatchObject({ kind: 'ranged', reach: 4 })
    expect(ATTACKS['attack.shortbow.short-shot']).toMatchObject({ kind: 'ranged', reach: 5 })
    expect(ATTACKS['attack.shortbow.quick-shot']).toMatchObject({ kind: 'ranged', reach: 4 })
    expect(ATTACKS['attack.punch']).toMatchObject({ bonus: -1, staminaCost: 1, kind: 'melee' })
    for (const id of ALPHA()) {
      for (const aid of UNITS[id]!.attacks) expect(ATTACKS[aid], `${id} grants ${aid}`).toBeDefined()
      expect(UNITS[id]!.attacks, `${id} — Punch is universal (universalToAllUnits honored)`)
        .toContain('attack.punch')
      expect(UNITS[id]!.attacks.some((aid) => cost(aid) > 0),
        `${id} — at least one kit attack costs stamina`).toBe(true)
    }
    // Arcane Bolt is gone — the mage's power is the staff's.
    expect(UNITS['alpha-air-mage']!.attacks).toEqual(['attack.lightning-staff.bolt', 'attack.punch'])
  })

  it('the riders came through in the REAL vocabulary — translated, not test statuses', () => {
    const rider = (unit: string, statusId: string, hook: string) =>
      (UNITS[unit]!.triggers ?? []).find((t) =>
        t.effect.kind === 'status.apply' && t.effect.statusId === statusId && t.hook === hook)
    // Oathblade: Regen 1 OTD · Stun 20% · Protection 50% OTD · Bleed on attack
    expect(rider('alpha-oathblade', 'status.regeneration', 'onTakingDamage')).toMatchObject({ chance: 100 })
    expect(rider('alpha-oathblade', 'status.stun', 'onDamage')).toMatchObject({ chance: 20 })
    expect(rider('alpha-oathblade', 'status.protection', 'onTakingDamage')).toMatchObject({ chance: 50 })
    // Dusk Hawk: Slow 1 @20% on hit — ward→protection, hobble→slow, the
    // translation the delivery named. A test- status id appearing here would
    // mean the translation regressed.
    expect(rider('alpha-dusk-hawk', 'status.slow', 'onHit')).toMatchObject({ chance: 20 })
    expect(rider('alpha-air-mage', 'status.weak', 'onHit')).toMatchObject({ chance: 20 })
    // Every status-applying rider must speak the engine vocabulary; other
    // effect kinds (knockback, since capability.knockback) carry no statusId.
    for (const id of ALPHA()) for (const t of UNITS[id]!.triggers ?? []) {
      if (t.effect.kind !== 'status.apply') continue
      expect(String(t.effect.statusId)
        .startsWith('status.'), `${id} trigger ${t.id} uses engine vocabulary`).toBe(true)
    }
  })

  it('every clause the engine cannot express is NAMED, never silently compiled', () => {
    // LAW 10 — rewritten 2026-08-27, same day it was written: the first
    // version froze "nine gaps", and the very next item
    // (capability.area-attack) closed one by teaching the engine the arc.
    // A count is the wrong claim — the rule is that each REMAINING
    // inexpressible clause is on the record, and a clause the engine has
    // since learned is NOT.
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string }[]
    const alpha = gaps.filter((g) => String(g.unit).startsWith('alpha-'))
    // the Halberd's push COMPILES now too (capability.knockback, same day):
    // its gap is gone and the trigger stands on the unit in its place
    expect(alpha.some((g) => /trigger shape/.test(g.needs))).toBe(false)
    expect((UNITS['alpha-oathblade']!.triggers ?? []).some((t) =>
      t.id === 'trigger.halberd.hack.knockback' && t.effect.kind === 'knockback')).toBe(true)
    // Cleave's arc COMPILES now (capability.area-attack) — its gap must be gone
    expect(alpha.some((g) => /area attack/.test(g.needs))).toBe(false)
    expect(ATTACKS['attack.halberd.cleave']!.area).toBe('arc')
    // four crit fields — still owed (station.crit)
    expect(alpha.filter((g) => /crit/.test(g.needs)).length).toBe(4)
    // the three item powers COMPILE now (capability.item-powers) — their gaps
    // are gone, the powers stand on their units, and Storm's arbitrary-hex
    // targeting remainder is the one NAMED partial left behind
    expect(alpha.filter((g) => /item power/.test(g.needs)).length).toBe(0)
    expect(alpha.some((g) => /power targeting: arbitrary hex/.test(g.needs))).toBe(true)
    expect(UNITS['alpha-air-mage']!.abilities).toEqual(['power.lightning-staff.storm'])
    expect(UNITS['alpha-lucius']!.abilities).toEqual(['power.holy-symbol.heal'])
    expect(UNITS['alpha-osric']!.abilities).toEqual(['power.knight-shield.block'])
  })
})

describe('they fight — the verify battle', () => {
  it('no alpha hero is dead content, riders fire, and stamina is paid', () => {
    const acted = new Set<string>(), died = new Set<string>()
    let riderFired = false
    let alphaPaid = false
    for (const r of [0, 1, 2]) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(SC)), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) {
        const actor = typeof e.actor === 'number' ? ctx.state.units[e.actor] : undefined
        const target = typeof e.target === 'number' ? ctx.state.units[e.target] : undefined
        if ((e.type === 'attack.declared' || e.type === 'moved') && actor) acted.add(actor.typeId)
        if (e.type === 'life.dead' && target) died.add(target.typeId)
        if (e.type === 'status.applied' && /^(alpha-|trigger\.(dagger|knight-shield))/.test(String(e.causeId))) riderFired = true
        if (e.type === 'stamina.spent' && actor?.typeId.startsWith('alpha-')) alphaPaid = true
      }
      expect(ctx.state.outcome, `replicate ${r} must resolve`).not.toBeNull()
    }
    for (const id of ALPHA()) {
      expect(acted.has(id) || died.has(id), `${id} neither acted nor died in any seed — dead content`).toBe(true)
    }
    expect(riderFired, 'no alpha rider ever fired across three seeds').toBe(true)
    expect(alphaPaid, 'no alpha hero ever paid stamina — the kit costs are not wired').toBe(true)
  })

  it('is a seed — the same scenario twice is byte-identical in outcome', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef(SC)))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })
})
