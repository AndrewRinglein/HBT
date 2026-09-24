// v2.kdb — V2 R4 part 2: KDB, knock down and back (COMBAT-V2-DESIGN-2026-09-07.md
// §9.1, §9.2, §9.5, §15.4, ruled 2026-09-07).
//
//   margin = (physical damage dealt + Impact) − target's Strength
//   chance = margin × 15%, no cap; physical only; Impact counts at 0 damage.
//   Fired: 40% back · 40% down · 20% both. Already prone: no effect.
//   Stand Firm: neither; Agile: never down; Giant carries Stand Firm.
//
// Content (TEST lane): attack.test-kdb.maul (Impact 3), attack.test-kdb.bash
// (Impact 7, no damage); units test-kdb-mauler / -basher and zombies wearing
// badge.stand-firm / badge.agile / badge.giant (Codex rows). Defaults the
// documents do not answer are SWITCHES.md "V2 KDB".
import { describe, it, expect } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus, isProne } from '../src/core/status.js'
import { executeKnockback } from '../src/core/movement.js'
import { runBattle } from '../src/core/battle.js'
import { useBurst, previewBurst } from '../src/core/burst.js'
import { makeRng, roll100, draw } from '../src/core/rng.js'
import { kdbForecast, kdbDownStatus, resolveKdb, KDB_BACK_HEXES } from '../src/core/kdb.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { hexId } from './board16.js'
import type { BurstDef, Ctx, Event } from '../src/core/types.js'

const MAUL = 'attack.test-kdb.maul'
const BASH = 'attack.test-kdb.bash'
const rolled = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'kdb.rolled')
const kdbDraws = (ctx: Ctx) => ctx.rng.log.filter((r) => r.stream === 'kdb-occurs' || r.stream === 'kdb-type')
const typeOf = (r: number) => (r <= 40 ? 'back' : r <= 80 ? 'down' : 'both')

/** Attacker (hero) and target (enemy) adjacent on the open board; triggers off, crits off, a sure hit. */
function duel(hero: string, enemy: string, heroHex = hexId(5, 5), enemyHex = hexId(6, 5), seed = 0) {
  const ctx = createCustomBattle([{ type: hero, hex: heroHex }], [{ type: enemy, hex: enemyHex }], { strict: true, replicate: seed, cfg: { switches: { critEnabled: false } as never } })
  for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0 }
  const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
  at.accuracy = 500
  beginActivation(ctx, at.id, 'test')
  return { ctx, at, tg }
}

/** The first ordinal whose kdb-type roll lands on `want` for this target — the stream is pure, so the test reads it ahead. */
function keyFor(ctx: Ctx, uid: number, want: 'back' | 'down' | 'both'): number[] {
  const probe = makeRng(ctx.rng.rootSeed)
  for (let k = 1000; k < 5000; k++) if (typeOf(roll100(probe, 'kdb-type', uid, k, 0)) === want) return [uid, k, 0]
  throw new Error('no key')
}

describe('the chance — margin × 15, physical dealt + Impact − Strength, no cap', () => {
  it('the worked example: 7 dealt against Strength 3 is margin 4, 60%', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    tg.strength = 3
    expect(kdbForecast(ctx, tg, 7, 0)).toMatchObject({ margin: 4, chance: 60 })
  })
  it('Impact counts at zero damage: the bash (0 dealt, Impact 7) against Strength 4 is 45%', () => {
    const { ctx, tg } = duel('test-kdb-basher', 'test-zombie')
    expect(tg.strength).toBe(4)
    const pv = preview(ctx, 0, 1, BASH)
    expect(pv.damageOnHit).toBe(0)
    expect(pv.kdbChanceOnHit).toBe(45)
    performAttack(ctx, 0, 1, BASH)
    expect(rolled(ctx)).toHaveLength(1)
    expect(rolled(ctx)[0]).toMatchObject({ physical: 0, impact: 7, strength: 4, margin: 3, chance: 45, attackId: BASH, causeId: BASH })
  })
  it('a margin of 0 or less rolls nothing: chance 0, roll null, no draw on either stream', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    tg.strength = 50
    performAttack(ctx, 0, 1, MAUL)
    expect(rolled(ctx)[0]).toMatchObject({ chance: 0, roll: null, fired: false, typeRoll: null, kdbType: null, applied: null })
    expect(rolled(ctx)[0]!['margin']).toBeLessThan(0)
    expect(kdbDraws(ctx)).toHaveLength(0)
  })
  it('no cap: margin 16 is 240%, and it always fires', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    expect(kdbForecast(ctx, tg, 20, 0)).toMatchObject({ margin: 16, chance: 240 })
    expect(resolveKdb(ctx, 0, 1, 'test.kdb', 20, 0, [tg.uid, 900, 0])).not.toBeNull()
    expect(rolled(ctx)[0]).toMatchObject({ chance: 240, fired: true })
  })
  it('the maul: physical is the APPLIED physical HP (post-armor, post-Protection), plus Impact 3 — and preview equals execution', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    tg.armor = 1
    applyStatus(ctx, tg.id, 'status.protection', 1, 'test')
    const pv = preview(ctx, 0, 1, MAUL)
    performAttack(ctx, 0, 1, MAUL)
    const dmg = ctx.events.find((e) => e.type === 'damage.applied' && e.causeId === MAUL)!
    const ev = rolled(ctx)[0]!
    expect(ev['physical']).toBe(dmg['physicalApplied'])
    expect(ev['physical']).toBe(4 - 1 - 1)                 // Strength 4, Armor 1, Protection 1
    expect(ev).toMatchObject({ impact: 3, strength: 4, margin: 1, chance: 15 })
    expect(ev['chance']).toBe(pv.kdbChanceOnHit)
  })
})

describe('physical damage only', () => {
  for (const damageType of ['magic', 'true', 'fire', 'poison', 'shadow'] as const) it(`${damageType}: never a roll, never a draw`, () => {
    const { ctx } = duel('test-kdb-mauler', 'test-zombie')
    const a = structuredClone(ctx.actions[MAUL]!) as { attack: { damageType: string; impact?: number } }
    a.attack.damageType = damageType
    a.attack.impact = 50
    ctx.actions = { ...ctx.actions, [MAUL]: a as never }
    expect(preview(ctx, 0, 1, MAUL).kdbChanceOnHit).toBeNull()
    const r = performAttack(ctx, 0, 1, MAUL)
    expect(r.hit).toBe(true)
    expect(rolled(ctx)).toHaveLength(0)
    expect(kdbDraws(ctx)).toHaveLength(0)
  })
  it('collision damage is true, so it never triggers KDB (SWITCHES.md knockbackNeverFeedsKdb)', () => {
    const ctx = createCustomBattle([{ type: 'test-kdb-mauler', hex: 22 }], [{ type: 'test-zombie', hex: 6 }], { strict: true })
    for (const u of ctx.state.units) u.triggers = []
    const hp = ctx.state.units[1]!.hp
    executeKnockback(ctx, 0, 1, 5, 'test.push')
    expect(hp - ctx.state.units[1]!.hp).toBe(2 * 5)      // a real collision landed…
    expect(rolled(ctx)).toHaveLength(0)                    // …and nothing rolled KDB
    expect(kdbDraws(ctx)).toHaveLength(0)
  })
})

describe('what happens — 40 back · 40 down · 20 both, from kdb-type', () => {
  it('the type is the kdb-type roll on the same key, split 1–40 / 41–80 / 81–100', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    for (let k = 0; k < 30; k++) resolveKdb(ctx, 0, 1, 'test.kdb', 40, 0, [tg.uid, 2000 + k, 0])
    const evs = rolled(ctx).filter((e) => e['fired'])
    expect(evs.length).toBeGreaterThan(0)
    const probe = makeRng(ctx.rng.rootSeed)
    for (const e of evs) {
      const k = 2000 + rolled(ctx).indexOf(e)
      expect(e['typeRoll']).toBe(roll100(probe, 'kdb-type', tg.uid, k, 0))
      expect(e['kdbType']).toBe(typeOf(e['typeRoll'] as number))
    }
  })
  it('back: the V2 knockback, away from the attacker — and it collides (the board edge, 2 × remaining)', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie', 22, 6)
    const hp = tg.hp
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'back'))).toBe('back')
    const blocked = ctx.events.find((e) => e.type === 'knockback.blocked')!
    expect(blocked).toMatchObject({ causeId: MAUL, collidedWith: 'edge', asked: KDB_BACK_HEXES, remaining: 1 })
    expect(hp - tg.hp).toBe(2)
    expect(isProne(ctx, tg)).toBe(false)
  })
  it('back on open ground moves 1 hex (SWITCHES.md kdbBackDistance)', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'back'))
    expect(ctx.events.find((e) => e.type === 'knocked')).toMatchObject({ from: hexId(6, 5), to: hexId(7, 5), hexes: 1 })
    expect(tg.hex).toBe(hexId(7, 5))
  })
  it('down: the kdbDown status — status.applied then unit.proned; the unit stays in its hex', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    expect(kdbDownStatus(ctx)).not.toBeNull()
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'down'))).toBe('down')
    expect(isProne(ctx, tg)).toBe(true)
    expect(ctx.events.find((e) => e.type === 'unit.proned')).toMatchObject({ target: tg.id, statusId: kdbDownStatus(ctx), causeId: MAUL })
    expect(tg.hex).toBe(hexId(6, 5))
    expect(ctx.events.some((e) => e.type === 'knocked')).toBe(false)
  })
  it('both: back first, then down (SWITCHES.md kdbBothOrder)', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'both'))).toBe('both')
    const types = ctx.events.map((e) => e.type)
    expect(types.indexOf('kdb.rolled')).toBeLessThan(types.indexOf('knocked'))
    expect(types.indexOf('knocked')).toBeLessThan(types.indexOf('unit.proned'))
    expect(tg.hex).toBe(hexId(7, 5))
    expect(isProne(ctx, tg)).toBe(true)
  })
  it('already prone: no roll, no effect — no re-knock, no bonus', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    applyStatus(ctx, tg.id, kdbDownStatus(ctx)!, 1, 'test')
    const before = ctx.events.length
    expect(preview(ctx, 0, 1, MAUL).kdbChanceOnHit).toBe(0)
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'both'))).toBeNull()
    expect(rolled(ctx)[0]).toMatchObject({ immune: 'prone', chance: 0, roll: null, fired: false })
    expect(ctx.events.slice(before).filter((e) => e.type === 'knocked' || e.type === 'unit.proned' || e.type === 'status.applied')).toHaveLength(0)
    expect(kdbDraws(ctx)).toHaveLength(0)
  })
})

describe('the badges — Stand Firm, Agile, Giant (content flags, never ids in core)', () => {
  for (const firm of ['test-kdb-firm', 'test-kdb-giant']) it(`${firm}: immune to both — no roll; and no push from any source moves it`, () => {
    const { ctx, tg } = duel('test-kdb-mauler', firm)
    expect(preview(ctx, 0, 1, MAUL).kdbChanceOnHit).toBe(0)
    performAttack(ctx, 0, 1, MAUL)
    expect(rolled(ctx)[0]).toMatchObject({ immune: 'standFirm', immuneBy: [tg.badges[0]], chance: 0, roll: null })
    expect(kdbDraws(ctx)).toHaveLength(0)
    const hp = tg.hp
    expect(executeKnockback(ctx, 0, 1, 3, 'test.push')).toBe(0)
    expect(ctx.events.find((e) => e.type === 'knockback.blocked')).toMatchObject({ reason: 'cannot be knocked back', by: [tg.badges[0]] })
    expect(tg.hp).toBe(hp)                                // no collision: nothing was pushed
    expect(tg.hex).toBe(hexId(6, 5))
  })
  it('Agile: a down is suppressed (named), the unit stays up', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-kdb-agile')
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'down'))).toBe('none')
    expect(rolled(ctx)[0]).toMatchObject({ kdbType: 'down', applied: 'none', suppressedBy: ['badge.agile'] })
    expect(isProne(ctx, tg)).toBe(false)
  })
  it('Agile: a back still happens', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-kdb-agile')
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'back'))).toBe('back')
    expect(tg.hex).toBe(hexId(7, 5))
  })
  it("Agile: 'both' becomes back only", () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-kdb-agile')
    expect(resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'both'))).toBe('back')
    expect(rolled(ctx)[0]).toMatchObject({ kdbType: 'both', applied: 'back', suppressedBy: ['badge.agile'] })
    expect(tg.hex).toBe(hexId(7, 5))
    expect(isProne(ctx, tg)).toBe(false)
    expect(preview(ctx, 0, 1, MAUL).kdbChanceOnHit).toBeGreaterThan(0)   // Agile still rolls
  })
})

describe('named streams — keyed by what the roll is, never by when', () => {
  it('same seed, same KDB; extra draws elsewhere do not shift it', () => {
    const run = (noise: boolean) => {
      const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
      if (noise) for (let i = 0; i < 25; i++) draw(ctx.rng, 'to-hit', 77777, i)
      for (let k = 0; k < 10; k++) resolveKdb(ctx, 0, 1, MAUL, 5, 0, [tg.uid, 3000 + k, 0])
      return rolled(ctx).map((e) => [e['roll'], e['typeRoll'], e['kdbType']])
    }
    expect(run(true)).toEqual(run(false))
  })
  it('the attack key is the target uid and its incoming-attack ordinal, kind 0 — no turn', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    tg.strength = 0
    performAttack(ctx, 0, 1, MAUL)
    const occurs = ctx.rng.log.find((r) => r.stream === 'kdb-occurs')!
    expect(occurs.keys).toEqual([tg.uid, tg.incomingAttackOrdinal, 0])
  })
})

describe('bursts — physical burst damage rolls per recipient, with the burst row Impact', () => {
  const id = 'test.burst.kdb'
  function rig(impact?: number, damageType: 'physical' | 'magic' = 'physical') {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }, { type: 'test-zombie', hex: 87 }], { strict: true })
    const action: BurstDef = { id, name: 'Probe', staminaCost: 0, cooldown: 0, range: 8,
      burst: { shape: { kind: 'radius', radius: 3 }, side: 'enemy', packets: [{ id: 'base', amount: 3, damageType }], ...(impact !== undefined ? { impact } : {}) } }
    ctx.actions = { ...ctx.actions, [id]: action }; ctx.state.units[0]!.actions.push(id)
    for (const u of ctx.state.units) { u.hp = u.maxHp = 100; u.armor = 0; u.triggers = []; u.statuses = [] }
    beginActivation(ctx, 0, 'test')
    return ctx
  }
  it('one kdb.rolled per recipient; Impact from the row; preview agrees', () => {
    const ctx = rig(4)
    const pv = previewBurst(ctx, 0, 86, id)
    useBurst(ctx, 0, 86, id)
    const evs = rolled(ctx)
    expect(evs.map((e) => e.target)).toEqual([1, 2])
    for (const e of evs) expect(e).toMatchObject({ burst: true, physical: 3, impact: 4, strength: 4, margin: 3, chance: 45 })
    expect(pv.targets.map((t) => t.kdbChance)).toEqual([45, 45])
  })
  it('a burst row with no Impact uses 0; a magic burst never rolls', () => {
    const plain = rig()
    useBurst(plain, 0, 86, id)
    expect(rolled(plain).map((e) => e['impact'])).toEqual([0, 0])
    const magic = rig(4, 'magic')
    useBurst(magic, 0, 86, id)
    expect(rolled(magic)).toHaveLength(0)
  })
})

describe('a real battle, replayed', () => {
  it('test.kdb: both Impact attacks roll live, and the battle replays byte for byte', () => {
    const run = () => { const ctx = createBattle(scenarioOptions(SCENARIOS['test.kdb']!)); runBattle(ctx); return ctx }
    const a = run(), b = run()
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
    const causes = new Set(rolled(a).map((e) => e.causeId))
    expect(causes.has(MAUL) || causes.has(BASH)).toBe(true)
    // Law 3: one kdb.rolled per connecting physical attack, and every change it causes is its mutator's own line
    const hits = a.events.filter((e) => e.type === 'attack.hit' && (e as Event & { packets: { damageType: string }[] }).packets.some((p) => p.damageType === 'physical'))
    expect(rolled(a).length).toBeLessThanOrEqual(hits.length)
  })
  it('a snapshot taken mid-battle restores and carries the KDB facts (Law 5b)', () => {
    const { ctx, tg } = duel('test-kdb-mauler', 'test-zombie')
    resolveKdb(ctx, 0, 1, MAUL, 40, 0, keyFor(ctx, tg.uid, 'both'))
    const saved = saveBattle(ctx)
    const back = restoreBattle(saved, ctx)
    expect(JSON.stringify(back.state)).toBe(JSON.stringify(ctx.state))
  })
})
