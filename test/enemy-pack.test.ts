// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
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
    expect(ATTACKS['attack.imp.blast']).toMatchObject({ range: 4, attack: { kind: 'ranged' } })
    expect(ATTACKS['attack.necromancer.necro-bolt']).toMatchObject({ range: 7, attack: { kind: 'ranged' } })
    expect(ATTACKS['attack.lieutenant-demon.ranged']).toMatchObject({ range: 7, attack: { kind: 'ranged' } })
    // every enemy attack costs no stamina — enemies do not run it
    for (const id of roster()) for (const aid of UNITS[id]!.attacks) {
      expect(ATTACKS[aid]!.staminaCost, aid).toBe(0)
    }
  })

  it('the named gaps are REPORTED, never silently compiled', () => {
    const gaps = JSON.parse(readFileSync(
      join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps as
      { unit: string; needs: string }[]
    // Law 10 rewrite, 2026-09-03: the archer's range WAS a gap (null) and the
    // shoot did not exist — then it was ruled 5 (ENCOUNTERS-ENGINE-HANDOFF
    // §5.2) and the row carries it. The RULE the old assertion protected is
    // that a null range never compiles into a bow: so no attack in the pack
    // may carry a non-number reach, and the archer's Shoot, now authored,
    // reaches exactly what its row says.
    for (const a of Object.values(ATTACKS)) expect(typeof a.range, `${a.id} reach`).toBe('number')
    expect(ATTACKS['attack.skeletal-archer.shoot']?.range).toBe(5)
    expect(gaps.some((g) => g.unit === 'unit.skeletal-archer' && /range unstated/.test(g.needs))).toBe(false)
    // afflictions and the power pool are named, not guessed
    expect(gaps.some((g) => g.needs.includes('capability.inflict-affliction'))).toBe(true)
    // capability.power-pool landed 2026-09-03: `capability.power` is no longer
    // a gap anywhere — the Lieutenant's clock and the Vampire Lord's feed are
    // power.gain triggers, the necro-bolt carries its powerScale on the row.
    expect(gaps.some((g) => g.needs.includes('capability.power'))).toBe(false)
    expect(UNITS['unit.lieutenant-demon']!.triggers!.some((t) => t.effect.kind === 'power.gain')).toBe(true)
    expect(ATTACKS['attack.necromancer.necro-bolt']!.attack.powerScale).toBe(1)
    // and NO gap-carrying clause leaked into the pack: nothing references afflictions
    for (const id of roster()) for (const t of UNITS[id]!.triggers ?? []) {
      // capability.auras (2026-09-03): the Necromancer's EOA pulse is a heal to its area
      expect(['status.apply', 'power.gain', 'heal', 'corpse.raise', 'corpse.consume', 'statMod', 'layer.paint', 'stamina.drain'], `${id} trigger ${t.id}`).toContain(t.effect.kind)   // + corpses, statMod, layers — 2026-09-03
    }
  })
})

describe('they fight — the verify battle', () => {
  it('the full prologue cast battles the cohort and no enemy is dead content', () => {
    // LAW 10 — 2026-08-26, twice rewritten and each time toward the real rule.
    // "At least 7 swing" broke when the status-tick ruling changed pacing;
    // "everyone acts in THIS battle" broke because a 20-unit board legitimately
    // ends before the back line arrives. The claim that survives both is: no
    // enemy is DEAD CONTENT — across a handful of seeds of the same fielding,
    // every enemy either attacks or is killed. A unit no seed can make matter
    // still fails loudly.
    const acted = new Set<string>(), died = new Set<string>()
    let anyImpBurn = false
    for (const r of [0, 1, 2]) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(SC)), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) {
        // acting = swinging OR marching: the far-flank zombies walk toward a
        // fight that ends before they arrive (5-6 turn wipes), and a unit that
        // moves under its own AI every seed is demonstrably alive content.
        // life.* events carry the unit in TARGET (mutate.ts setLifeState);
        // attack/moved carry it in actor. Reading actor for deaths silently
        // missed every unit killed before its first activation.
        const actor = typeof e.actor === 'number' ? ctx.state.units[e.actor] : undefined
        const target = typeof e.target === 'number' ? ctx.state.units[e.target] : undefined
        if ((e.type === 'attack.declared' || e.type === 'moved') && actor) acted.add(actor.typeId)
        if (e.type === 'life.dead' && target) died.add(target.typeId)
        if (e.type === 'status.applied' && String(e.causeId).startsWith('trigger.')
          && String(e.causeId).includes('-imp')) anyImpBurn = true
      }
      expect(ctx.state.outcome, `replicate ${r} must resolve`).not.toBeNull()
    }
    for (const id of roster()) {
      expect(acted.has(id) || died.has(id), `${id} neither attacked nor died in any seed — dead content`).toBe(true)
    }
    expect(anyImpBurn, 'no imp ever burned anyone').toBe(true)
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
