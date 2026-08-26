// The authored enemies — content.enemy-pack (2026-08-26).
//
// The 14 units the five prologue battles field, converted from
// content/gen/enemies-authored.json by mkenginepack.mjs. The conversion rule is
// compile-or-name-the-gap: 27 clauses the engine cannot express are in
// content/gen/enemy-pack-gaps.json, and NOTHING was invented — the archer's
// shoot (range null) is a reported gap, not a number somebody picked.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const SC = 'showcase.prologue-enemies'
const roster = () => scenarioDef(SC).enemies

const authored = () => {
  const raw = JSON.parse(readFileSync(
    join(__dirname, '..', '..', 'content', 'gen', 'enemies-authored.json'), 'utf8'))
  return new Map<string, { stats: Record<string, number> }>(
    raw.units.map((u: { id: string }) => [u.id, u]))
}

describe('the pack carries the authored rows faithfully', () => {
  it('every prologue-fielded enemy exists, keyed by its full Codex id', () => {
    for (const id of roster()) {
      expect(UNITS[id], id).toBeDefined()
      expect(UNITS[id]!.side, id).toBe('enemy')
      expect(UNITS[id]!.moves, `${id} — one movement power per enemy row`).toEqual(['power.move'])
      expect(UNITS[id]!.maxStamina, `${id} — enemies do not run stamina`).toBe(0)
    }
  })

  it('stats agree with enemies-authored.json — pipeline agreement, not frozen numbers', () => {
    const src = authored()
    for (const id of roster()) {
      const a = src.get(id)!.stats as Record<string, number>
      const u = UNITS[id]!
      expect(u.maxHp, `${id} health`).toBe(a.health)
      expect(u.accuracy, `${id} accuracy`).toBe(a.accuracy)
      expect(u.movement, `${id} movement`).toBe(a.movement)
      expect(u.strength, `${id} strength`).toBe(a.strength ?? 0)
      expect(u.armor, `${id} armor`).toBe(a.armor ?? 0)
      expect(u.dodge, `${id} dodge`).toBe(a.dodge ?? 0)
    }
  })

  it('the compilable riders came through: burn, poison, bleed, weak — and the sear pattern', () => {
    const has = (unit: string, statusId: string, hook: string, value: number) => {
      const t = (UNITS[unit]!.triggers ?? []).find((x) =>
        x.effect.kind === 'status.apply' && x.effect.statusId === statusId && x.hook === hook)
      expect(t, `${unit} should carry ${statusId} on ${hook}`).toBeDefined()
      expect((t!.effect as { value: number }).value, `${unit} ${statusId} value`).toBe(value)
    }
    has('unit.imp', 'status.burn', 'onHit', 2)
    has('unit.fire-imp', 'status.burn', 'onHit', 3)
    has('unit.poison-imp', 'status.poison', 'onHit', 3)
    has('unit.zombie', 'status.poison', 'onHit', 2)
    has('unit.skeletal-archer', 'status.bleed', 'onHit', 2)  // Gut, via sameAs
    has('unit.necromancer', 'status.weak', 'onHit', 2)
    // the hellhound's coat burns whoever strikes it — the sear pattern
    has('unit.hellhound', 'status.burn', 'onTakingDamage', 1)
  })

  it('the ranged attacks carry their authored ranges', () => {
    expect(ATTACKS['attack.imp.blast']).toMatchObject({ kind: 'ranged', reach: 4 })
    expect(ATTACKS['attack.necromancer.necro-bolt']).toMatchObject({ kind: 'ranged', reach: 7 })
    expect(ATTACKS['attack.lieutenant-demon.ranged']).toMatchObject({ kind: 'ranged', reach: 7 })
    // every enemy attack costs no stamina — enemies do not run it
    for (const id of roster()) for (const aid of UNITS[id]!.attacks) {
      expect(ATTACKS[aid]!.staminaCost, aid).toBe(0)
    }
  })

  it('the named gaps are REPORTED, never silently compiled', () => {
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string }[]
    // the archer's null range is a gap, and the shoot must NOT exist as an attack
    expect(gaps.some((g) => g.unit === 'unit.skeletal-archer' && /range unstated/.test(g.needs))).toBe(true)
    expect(ATTACKS['attack.skeletal-archer.shoot']).toBeUndefined()
    // afflictions and the power pool are named, not guessed
    expect(gaps.some((g) => g.needs.includes('capability.inflict-affliction'))).toBe(true)
    expect(gaps.some((g) => g.needs.includes('capability.power'))).toBe(true)
    // and NO gap-carrying clause leaked into the pack: nothing references afflictions
    for (const id of roster()) for (const t of UNITS[id]!.triggers ?? []) {
      expect(t.effect.kind, `${id} trigger ${t.id}`).toBe('status.apply')
    }
  })
})

describe('they fight — the verify battle', () => {
  it('the full prologue cast battles the cohort and the enemies actually act', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef(SC)))
    runBattle(ctx)
    const acted = new Set(ctx.events
      .filter((e) => e.type === 'attack.declared')
      .map((e) => ctx.state.units[e.actor as number]!.typeId)
      .filter((t) => t.startsWith('unit.')))
    // Not all 14 will swing in one battle (some die first); a majority must.
    expect(acted.size, `only ${[...acted].join(', ')} ever attacked`).toBeGreaterThanOrEqual(7)
    // riders fire in a REAL battle, not just in the registry
    expect(ctx.events.some((e) => e.type === 'status.applied' &&
      String(e.causeId).startsWith('trigger.') && String(e.causeId).includes('-imp')),
      'no imp ever burned anyone').toBe(true)
    expect(ctx.state.outcome, 'the battle must resolve').not.toBeNull()
  })

  it('is a seed — the same scenario twice is byte-identical in outcome', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef(SC)))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })

  it('log lines name the full Codex id once, never unit.unit.*', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef(SC)))
    const enter = ctx.events.filter((e) => e.type === 'unit.enter')
    expect(enter.some((e) => String(e.causeId).startsWith('unit.unit.'))).toBe(false)
    expect(enter.some((e) => e.causeId === 'unit.zombie')).toBe(true)
    expect(enter.some((e) => e.causeId === 'unit.test-oathblade')).toBe(true)
  })
})
