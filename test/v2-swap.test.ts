// v2.swap — V2 R6 part 2 (COMBAT-V2-DESIGN-2026-09-07 §11.2, ruled 2026-09-07):
// "One swap per activation. Only before the primary action … Costs stamina. `swapCost`
// is a stat, default 1, and it is foldable … A Surge reopens everything, the swap
// included. Enemies do not swap loadouts." §15.1: loadout.swapped carries the unit,
// the hands before, the hands after and the stamina spent.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeBattleCommand, validateBattleCommand, type ControlPolicy } from '../src/core/commands.js'
import { canSwap, performSwap } from '../src/core/swap.js'
import { markPrimaryUsed, reopenSurgeCycle } from '../src/core/mutate.js'
import { effective } from '../src/core/stats.js'
import { attackIdsOf } from '../src/core/action.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { ITEMS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'

const base = scenarioOptions(scenarioDef('showcase.prologue-party'))
const WARRIOR = 'hero.base.warrior-iron'
const HERO_UID = 501
const policy: ControlPolicy = { humanUnitUids: [HERO_UID] }

/** A warrior with a longsword in hand and a kite shield stowed, at the start of its activation. */
function acting(badges: string[] = [], hands = ['item.longsword'], stowed = ['item.kite-shield'], hero = WARRIOR): { ctx: Ctx; h: number } {
  const ctx = createBattle({ ...base, heroes: [hero], heroHexes: [247], heroItems: [hands], heroStowed: [stowed], heroBadges: [badges], heroUids: [HERO_UID], strict: true })
  const h = ctx.state.units.findIndex((u) => u.uid === HERO_UID)
  let next = advanceBattle(ctx, policy)
  while (next.kind === 'acting') { next = advanceBattle(ctx, policy) }
  expect(next.kind).toBe('selecting')
  expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: HERO_UID, expectedSeq: ctx.state.seq })).toEqual({ ok: true })
  expect(advanceBattle(ctx, policy)).toEqual({ kind: 'acting', actor: h })
  return { ctx, h }
}
const ids = (ctx: Ctx, h: number) => ({ hands: ctx.state.units[h]!.loadout!.hands.map((i) => i.instanceId), stowed: ctx.state.units[h]!.loadout!.stowed.map((i) => i.instanceId) })
const swap = (ctx: Ctx, h: number, hands: string[]) => ({ kind: 'swap', actor: h, hands, expectedSeq: ctx.state.seq })

describe('v2.swap — the loadout swap', () => {
  it('longsword out, kite shield in: costs 1 stamina, moves attacks, Block and powers, and says so', () => {
    const { ctx, h } = acting()
    const u = ctx.state.units[h]!
    const kite = ITEMS['item.kite-shield']!, sword = ITEMS['item.longsword']!
    const before = { stamina: u.stamina, block: u.block ?? 0, attacks: attackIdsOf(ctx, u) }
    for (const a of sword.grants) expect(before.attacks).toContain(a)
    const { hands: [sw], stowed: [ks] } = ids(ctx, h)
    expect(validateBattleCommand(ctx, policy, swap(ctx, h, [ks!]))).toEqual({ ok: true })
    expect(executeBattleCommand(ctx, policy, swap(ctx, h, [ks!]))).toEqual({ ok: true })
    expect(u.stamina).toBe(before.stamina - 1)
    for (const a of sword.grants) expect(u.actions).not.toContain(a)
    for (const p of kite.abilities) expect(u.actions).toContain(p)
    expect((u.block ?? 0) - before.block).toBe((kite.statModifiers.block ?? 0) - (sword.statModifiers.block ?? 0))
    expect(u.loadout!.hands.map((i) => i.instanceId)).toEqual([ks])
    expect(u.loadout!.stowed.map((i) => i.instanceId)).toEqual([sw])
    const e = ctx.events.find((x) => x.type === 'loadout.swapped')!
    expect(e).toMatchObject({ actor: h, stamina: 1 })
    expect(e.handsBefore).toEqual([{ instanceId: sw, itemId: 'item.longsword' }])
    expect(e.handsAfter).toEqual([{ instanceId: ks, itemId: 'item.kite-shield' }])
    const eq = ctx.events.filter((x) => x.type === 'unit.equipped' && x.seq > e.seq)
    expect(eq.map((x) => x.instanceId)).toEqual([ks])
    // the primary is still open after a swap
    expect(u.primaryUsed).toBe(false)
  })

  it('refuses a second swap, a swap after the primary, a swap it cannot pay for and an enemy swap — and changes nothing', () => {
    const refuse = (ctx: Ctx, h: number, hands: string[]) => {
      const was = saveBattle(ctx)
      expect(canSwap(ctx, h, hands)).not.toBeNull()
      expect(executeBattleCommand(ctx, policy, swap(ctx, h, hands)).ok).toBe(false)
      expect(saveBattle(ctx)).toBe(was)
    }
    { const { ctx, h } = acting(); const { hands, stowed } = ids(ctx, h)
      expect(executeBattleCommand(ctx, policy, swap(ctx, h, stowed)).ok).toBe(true); refuse(ctx, h, hands) }
    { const { ctx, h } = acting(); markPrimaryUsed(ctx, h); refuse(ctx, h, ids(ctx, h).stowed) }
    { const { ctx, h } = acting(); ctx.state.units[h]!.stamina = 0; refuse(ctx, h, ids(ctx, h).stowed) }
    { const { ctx, h } = acting()
      const enemy = ctx.state.units.findIndex((u) => u.side === 'enemy')
      expect(canSwap(ctx, enemy, [])).toMatch(/enem/) }
    // malformed: an instance it does not carry, the same instance twice, three hands
    { const { ctx, h } = acting([], ['item.longsword'], ['item.kite-shield', 'item.longsword'])
      const { hands, stowed } = ids(ctx, h)
      refuse(ctx, h, ['999/9'])
      refuse(ctx, h, [stowed[0]!, stowed[0]!])
      expect(canSwap(ctx, h, [...hands, ...stowed])).toMatch(/hands/)
      refuse(ctx, h, hands) }
  })

  it('a Surge reopens the swap', () => {
    const { ctx, h } = acting()
    const { hands, stowed } = ids(ctx, h)
    performSwap(ctx, h, stowed)
    expect(canSwap(ctx, h, hands)).not.toBeNull()
    markPrimaryUsed(ctx, h)
    reopenSurgeCycle(ctx, h, ctx.state.units[h]!.movement, 1)
    expect(canSwap(ctx, h, hands)).toBeNull()
  })

  it('swapCost is a foldable stat: Fast Hands pays 0, Slow Hands pays 2', () => {
    { const { ctx, h } = acting(['test.badge.fast-hands'])
      expect(effective(ctx, ctx.state.units[h]!, 'swapCost').value).toBe(0)
      const s = ctx.state.units[h]!.stamina; performSwap(ctx, h, ids(ctx, h).stowed); expect(ctx.state.units[h]!.stamina).toBe(s) }
    { const { ctx, h } = acting(['test.badge.slow-hands'])
      expect(effective(ctx, ctx.state.units[h]!, 'swapCost').value).toBe(2)
      const s = ctx.state.units[h]!.stamina; performSwap(ctx, h, ids(ctx, h).stowed); expect(ctx.state.units[h]!.stamina).toBe(s - 2) }
  })

  it('a Health modifier that leaves the hands lowers the maximum and clamps current Health', () => {
    // the Holy Shield carries Health (+2 in the pack); a paladin holds it
    const giver = ITEMS['item.holy-shield']!
    expect(giver.statModifiers.maxHp).toBeGreaterThan(0)
    const { ctx, h } = acting([], ['item.longsword', giver.id], ['item.longsword'], 'hero.base.paladin-hunk')
    const leaves = ctx.state.units[h]!.loadout!.hands[1]!.instanceId, keeps = ctx.state.units[h]!.loadout!.hands[0]!.instanceId
    const u = ctx.state.units[h]!
    const max = u.maxHp
    expect(u.hp).toBe(max)
    performSwap(ctx, h, [keeps, ...ids(ctx, h).stowed])
    expect(u.loadout!.stowed.map((i) => i.instanceId)).toEqual([leaves])
    expect(u.maxHp).toBe(max - giver.statModifiers.maxHp!)
    expect(u.hp).toBe(u.maxHp)
  })

  it('the swap survives a JSON round trip and a save and restore of the battle', () => {
    const { ctx, h } = acting()
    performSwap(ctx, h, ids(ctx, h).stowed)
    expect(JSON.parse(JSON.stringify(ctx.state))).toEqual(ctx.state)
    expect(restoreBattle(saveBattle(ctx), ctx).state).toEqual(ctx.state)
  })

  it('a swapped hero is the hero fielded holding those items — stats, actions and triggers', () => {
    const { ctx, h } = acting([], ['item.longsword'], ['item.kite-shield'])
    const { ctx: other, h: o } = acting([], ['item.kite-shield'], ['item.longsword'])
    performSwap(ctx, h, ids(ctx, h).stowed)
    const a = ctx.state.units[h]!, b = other.state.units[o]!
    for (const k of ['maxHp', 'armor', 'block', 'rangedBlock', 'dodge', 'strength', 'accuracy', 'movement', 'maxStamina'] as const) expect(a[k], k).toBe(b[k])
    expect(a.actions).toEqual(b.actions)
    expect(a.triggers.map((t) => `${t.source}:${t.id}`).sort()).toEqual(b.triggers.map((t) => `${t.source}:${t.id}`).sort())
  })
})
