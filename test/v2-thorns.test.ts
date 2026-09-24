// v2.thorns — V2 R5: Thorns is a magnitude, not a tick (COMBAT-V2-DESIGN-2026-09-07.md
// §9.4, ruled 2026-09-07; true damage, DECISIONS.md 2026-08-27). A unit with Thorns N:
//   - deals N true damage to any melee attacker that hits it — on the hit, whether or
//     not armor absorbed the damage; never on a miss, a block, a ranged attack or a burst;
//   - adds N to its collision value (§9.3: a unit is 1 + Thorns);
//   - does nothing when it attacks.
// The V1 onTakingDamage retaliation (any range, only when damage got through) is gone.
//
// Content (TEST lane): test.badge.bramble (Thorns 1), test.badge.briar (Thorns 3), worn
// by the cohort zombie as test-thorns-bramble / test-thorns-briar; the golem wears
// bramble. Defaults the design does not answer are SWITCHES.md "V2 Thorns".
import { describe, it, expect } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { settle } from '../src/core/settle.js'
import { executeKnockback, COLLISION_UNIT_BASE } from '../src/core/movement.js'
import { useBurst } from '../src/core/burst.js'
import { runBattle } from '../src/core/battle.js'
import { thornsOf } from '../src/core/thorns.js'
import { ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'
import type { BurstDef, Ctx, Event } from '../src/core/types.js'

const AXE = 'attack.test-warrior.axe'
const reflected = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'thorns.reflected')
const thornDamage = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'damage.applied' && e['thorns'] === true)

/** Attacker (hero) adjacent to target (enemy) on the open board; triggers off, crits off, Block off, a sure hit. */
function duel(hero: string, enemy: string, heroHex = hexId(5, 5), enemyHex = hexId(6, 5)) {
  const ctx = createCustomBattle([{ type: hero, hex: heroHex }], [{ type: enemy, hex: enemyHex }], { strict: true, cfg: { switches: { critEnabled: false } as never } })
  for (const u of ctx.state.units) { u.triggers = []; u.block = 0; u.rangedBlock = 0; u.hp = u.maxHp = 100 }
  const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
  at.accuracy = 500
  beginActivation(ctx, at.id, 'test')
  return { ctx, at, tg }
}

describe('the magnitude — a stat the badges lend', () => {
  it('bramble is Thorns 1, briar Thorns 3, a bare zombie 0', () => {
    expect(thornsOf(duel('test-warrior', 'test-thorns-bramble').ctx, duel('test-warrior', 'test-thorns-bramble').tg)).toBe(1)
    const { ctx, tg } = duel('test-warrior', 'test-thorns-briar')
    expect(thornsOf(ctx, tg)).toBe(3)
    const bare = duel('test-warrior', 'test-zombie')
    expect(thornsOf(bare.ctx, bare.tg)).toBe(0)
  })
})

describe('a connecting melee hit — N true damage to the attacker', () => {
  it('Thorns 3: the axe that hits costs the warrior 3, named by the badge; preview says so', () => {
    const { ctx, at } = duel('test-warrior', 'test-thorns-briar')
    const pv = preview(ctx, 0, 1, AXE)
    expect(pv.thornsOnHit).toBe(3)
    const r = performAttack(ctx, 0, 1, AXE)
    expect(r.hit).toBe(true)
    expect(at.hp).toBe(100 - 3)
    expect(reflected(ctx)).toHaveLength(1)
    expect(reflected(ctx)[0]).toMatchObject({ actor: 1, target: 0, attackId: AXE, thorns: 3, amount: 3, causeId: AXE })
    expect(thornDamage(ctx)).toHaveLength(1)
    expect(thornDamage(ctx)[0]).toMatchObject({ target: 0, amount: 3, damageType: 'true', causeId: AXE, actor: 1, attackId: AXE })
  })
  it('the second instance is pure data: Thorns 1 costs 1', () => {
    const { ctx, at } = duel('test-warrior', 'test-thorns-bramble')
    performAttack(ctx, 0, 1, AXE)
    expect(at.hp).toBe(100 - 1)
    expect(reflected(ctx)[0]).toMatchObject({ thorns: 1 })
  })
  it('armor-zero: a hit armor absorbs entirely still pays Thorns', () => {
    const { ctx, at, tg } = duel('test-warrior', 'test-thorns-briar')
    tg.armor = 100
    expect(preview(ctx, 0, 1, AXE).damageOnHit).toBe(0)
    performAttack(ctx, 0, 1, AXE)
    expect(tg.hp).toBe(100)
    expect(at.hp).toBe(100 - 3)
  })
  it('true damage: the attacker\'s Armor does not reduce it; its Protection absorbs it', () => {
    const { ctx, at } = duel('test-warrior', 'test-thorns-briar')
    at.armor = 50
    applyStatus(ctx, at.id, 'status.protection', 2, 'test')
    performAttack(ctx, 0, 1, AXE)
    expect(at.hp).toBe(100 - 1)
    expect(reflected(ctx)[0]).toMatchObject({ thorns: 3, amount: 1, absorbed: 2 })
  })
  it('the killing blow still pays: a target the hit kills reflects (SWITCHES.md thornsOnKillingBlow)', () => {
    const { ctx, at, tg } = duel('test-warrior', 'test-thorns-briar')
    tg.hp = 1
    performAttack(ctx, 0, 1, AXE)
    expect(tg.hp).toBe(0)
    expect(at.hp).toBe(100 - 3)
  })
  it('Thorns can kill the attacker; the battle settles it and nothing answers back', () => {
    const { ctx, at } = duel('test-warrior', 'test-thorns-briar')
    at.hp = 2
    performAttack(ctx, 0, 1, AXE)
    settle(ctx, 'test')
    expect(at.hp).toBe(0)
    expect(at.lifeState).not.toBe('standing')
    expect(reflected(ctx)).toHaveLength(1)
  })
})

describe('never on a miss, a block, a ranged attack or a burst', () => {
  it('a miss', () => {
    const { ctx, at } = duel('test-warrior', 'test-thorns-briar')
    at.accuracy = -500
    const r = performAttack(ctx, 0, 1, AXE)
    expect(r.hit).toBe(false)
    expect(reflected(ctx)).toHaveLength(0)
    expect(at.hp).toBe(100)
  })
  it('a block', () => {
    const { ctx, at, tg } = duel('test-warrior', 'test-thorns-briar')
    tg.block = 100
    const r = performAttack(ctx, 0, 1, AXE)
    expect(r.blocked).toBe(true)
    expect(reflected(ctx)).toHaveLength(0)
    expect(at.hp).toBe(100)
  })
  it('a ranged attack: the bow hits, the ranger pays nothing, and preview says 0', () => {
    const { ctx, at } = duel('test-ranger', 'test-thorns-briar', hexId(2, 5), hexId(6, 5))
    const bow = 'attack.test-ranger.bow'
    expect(preview(ctx, 0, 1, bow).thornsOnHit).toBe(0)
    const r = performAttack(ctx, 0, 1, bow)
    expect(r.hit).toBe(true)
    expect(reflected(ctx)).toHaveLength(0)
    expect(at.hp).toBe(100)
  })
  it('a burst', () => {
    const { ctx, at } = duel('test-warrior', 'test-thorns-briar')
    const id = 'test.burst.thorns'
    const action: BurstDef = { id, name: 'Probe', staminaCost: 0, cooldown: 0, range: 8,
      burst: { shape: { kind: 'radius', radius: 1 }, side: 'enemy', packets: [{ id: 'base', amount: 3, damageType: 'physical' }] } }
    ctx.actions = { ...ctx.actions, [id]: action }; at.actions.push(id)
    const hp = ctx.state.units[1]!.hp
    useBurst(ctx, 0, ctx.state.units[1]!.hex, id)
    expect(ctx.state.units[1]!.hp).toBeLessThan(hp)
    expect(reflected(ctx)).toHaveLength(0)
    expect(at.hp).toBe(100)
  })
})

describe('nothing when it attacks — and two thorned units settle safely', () => {
  it('a Thorns 5 warrior hitting a bare zombie reflects nothing onto anyone', () => {
    const { ctx, at, tg } = duel('test-warrior', 'test-zombie')
    at.mods.push({ stat: 'thorns', op: 'add', value: 5, source: 'test', scope: 'unit' })
    const r = performAttack(ctx, 0, 1, AXE)
    expect(r.hit).toBe(true)
    expect(reflected(ctx)).toHaveLength(0)
    expect(at.hp).toBe(100)
    expect(tg.hp).toBeLessThan(100)
  })
  it('a thorned attacker hits briar: it pays 3, once; briar\'s spikes are never answered by its own', () => {
    const { ctx, at, tg } = duel('test-warrior', 'test-thorns-briar')
    at.mods.push({ stat: 'thorns', op: 'add', value: 2, source: 'test', scope: 'unit' })   // a stored modifier: Thorns 2
    expect(thornsOf(ctx, at)).toBe(2)
    performAttack(ctx, 0, 1, AXE)
    settle(ctx, 'test')
    expect(reflected(ctx)).toHaveLength(1)
    expect(reflected(ctx)[0]).toMatchObject({ actor: tg.id, target: at.id, thorns: 3 })
    expect(thornDamage(ctx).filter((e) => e.target === tg.id)).toHaveLength(0)
  })
})

describe('the collision value — 1 + Thorns (§9.3)', () => {
  it('pushed into the briar zombie (Thorns 3) with 2 points left: 4 × 2 true', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }, { type: 'test-thorns-briar', hex: hexId(8, 5) }], { strict: true })
    for (const u of ctx.state.units) u.triggers = []
    const mover = ctx.state.units[1]!, struck = ctx.state.units[2]!
    const [mhp, shp] = [mover.hp, struck.hp]
    expect(executeKnockback(ctx, 0, mover.id, 3, 'test.push')).toBe(1)
    expect(mhp - mover.hp).toBe((COLLISION_UNIT_BASE + 3) * 2)
    expect(struck.hp).toBe(shp)
    expect(ctx.events.find((e) => e.type === 'knocked')).toMatchObject({ collidedWith: 'unit', blocker: struck.id, collisionValue: 4, remaining: 2 })
  })
})

describe('content — the V1 retaliation trigger is gone; Thorns is the stat', () => {
  it('no item carries a thorns trigger; the Armor of Thorns lends Thorns 3', () => {
    for (const it of Object.values(ITEMS)) for (const t of it.triggers) expect(t.id.endsWith('.thorns')).toBe(false)
    expect(ITEMS['item.armor-of-thorns']!.statModifiers['thorns']).toBe(3)
  })
})

describe('a real battle, replayed', () => {
  const run = () => { const ctx = createBattle(scenarioOptions(SCENARIOS['test.thorns']!)); runBattle(ctx); return ctx }
  it('test.thorns: both badges reflect live, only on melee hits, and the battle replays byte for byte', () => {
    const ctx = run()
    const evs = reflected(ctx)
    expect(new Set(evs.map((e) => e['thorns']))).toEqual(new Set([1, 3]))   // both badges, live
    for (const e of evs) {
      const kind = (ctx.actions[e['attackId'] as string] as { attack: { kind: string } }).attack.kind
      expect(kind).toBe('melee')
    }
    const hits = ctx.events.filter((e: Event) => e.type === 'attack.hit' && e['downed'] !== true && (ctx.actions[e.causeId] as { attack?: { kind: string } })?.attack?.kind === 'melee')
    const onThorned = hits.filter((e) => { const t = ctx.state.units[e['target'] as number]!; return t.badges?.some((b: string) => b.startsWith('test.badge.b')) })
    expect(evs.length).toBe(onThorned.length)
    expect(JSON.stringify(run().events)).toBe(JSON.stringify(ctx.events))
  })
})
