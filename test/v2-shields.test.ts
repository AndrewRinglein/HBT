// v2.shields — V2 R1 end to end (2026-09-23; one item per feature, Andrew). The three
// shields, their six powers, weapon Block and the axe that cuts through shields, as
// published by the content pack. Numbers: V2-SHIELDS-AND-WEAPONS-2026-09-20.md; the
// power numbers are the provisional switch SWITCHES.md shieldPowerNumbers.
import { describe, expect, it } from 'vitest'
import { createCustomBattle, createBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation, endActivation, expireActivationMods } from '../src/core/mutate.js'
import { usePower } from '../src/core/ability.js'
import { effective } from '../src/core/stats.js'
import { applyItems } from '../src/core/items.js'
import { runBattle } from '../src/core/battle.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import type { Ctx } from '../src/core/types.js'

const KITE = 'item.kite-shield', ROUND = 'item.round-shield', TOWER = 'item.tower-shield'
// Law 10, 2026-10-04 — content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the shields' powers were typed here by id
//   [KITE]: ['power.kite-shield.shield-wall', 'power.kite-shield.raise-guard'], [ROUND]: ['power.round-shield.turn-aside', 'power.round-shield.brace'],
//   [TOWER]: ['power.tower-shield.cover', 'power.tower-shield.stand-tall']
// and the Ledger replaced all six. A shield's powers are what its row grants - read from the pack, in the row's order - so the
// claims below hold whatever the rows are; the rows themselves are held in test/shields-reauthored.test.ts.
const POWERS: Record<string, string[]> = Object.fromEntries([KITE, ROUND, TOWER].map((s) => [s, [...ITEMS[s]!.abilities]]))
const warrior = UNITS['hero.base.warrior-iron']!

/** One Activation of unit `id`, then its end — the ladder's own order. */
function activate(ctx: Ctx, id: number, during?: () => void) {
  beginActivation(ctx, id, 'test'); during?.(); endActivation(ctx, id, 'test'); expireActivationMods(ctx, id, 'activation.end')
}

describe('the three shields, as the pack publishes them', () => {
  // Law 10, 2026-10-04 — content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): "Tower Shield +10 Block, +20 Ranged Block, -5 Dodge, -1 max Stamina" - the Tower's
  // numbers changed by ruling; the Kite's and the Round's stand. The claim (each shield folds its row's numbers onto its holder, beside
  // a one-hander, and grants its powers) is unchanged.
  // was: it('Kite +20/+5, Round +10/+10, Tower +15/+15 with -10 Dodge and -1 max Stamina — held beside a one-hander', …  [TOWER]: [15, 15, -10, -1]
  it('Kite +20/+5, Round +10/+10, Tower +10/+20 with -5 Dodge and -1 max Stamina — held beside a one-hander', () => {
    const bare = applyItems(warrior, ['item.longsword'], ITEMS, ACTIONS, 'test').def
    const want: Record<string, [number, number, number, number]> = { [KITE]: [20, 5, 0, 0], [ROUND]: [10, 10, 0, 0], [TOWER]: [10, 20, -5, -1] }
    for (const [id, [b, rb, dodge, stam]] of Object.entries(want)) {
      expect(ITEMS[id]!.itemClass, id).toBe('shield')
      const held = applyItems(warrior, ['item.longsword', id], ITEMS, ACTIONS, 'test').def
      expect((held.block ?? 0) - (bare.block ?? 0), id).toBe(b)
      expect((held.rangedBlock ?? 0) - (bare.rangedBlock ?? 0), id).toBe(rb)
      expect(held.dodge - bare.dodge, id).toBe(dodge)
      expect(held.maxStamina - bare.maxStamina, id).toBe(stam)
      for (const p of POWERS[id]!) expect(held.abilities, `${id} grants ${p}`).toContain(p)
    }
  })

  // Law 10, 2026-10-04 — content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): "The Knight shield is a fourth shield" - retired on 2026-09-20, it is a row again, so
  // it is no longer "a retired shield". The Buckler is still gone; no unit's kit carries either (the heroes whose kits hold a shield
  // keep the one they had); the powers the two retired rows had are still gone.
  // was: for (const gone of ['item.knight-shield', 'item.buckler']) { expect(ITEMS[gone], gone).toBeUndefined() …
  it('no unit kit and no item carries a retired shield; the Knight Shield is back as a row, in nobody\'s kit', () => {
    expect(ITEMS['item.buckler'], 'item.buckler').toBeUndefined()
    expect(ITEMS['item.knight-shield']?.itemClass, 'item.knight-shield').toBe('shield')
    for (const gone of ['item.knight-shield', 'item.buckler']) {
      for (const u of Object.values(UNITS)) expect(u.defaultItems ?? [], `${u.typeId} carries ${gone}`).not.toContain(gone)
    }
    for (const gone of ['power.knight-shield.block', 'power.buckler.block-and-dodge']) expect(ACTIONS[gone], gone).toBeUndefined()
  })

  // Law 10, 2026-10-04 — content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the Tower's numbers are read from its row (was: block >= 15, dodge - 10, maxStamina - 1)
  it('a Tower-carrying hero fields with its row\'s Block, Dodge and max Stamina in a real battle', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 120 }])
    const w = ctx.state.units[0]!
    const bare = applyItems(warrior, (warrior.defaultItems ?? []).filter((i) => i !== TOWER), ITEMS, ACTIONS, 'test').def
    expect(warrior.defaultItems).toContain(TOWER)
    const row = ITEMS[TOWER]!.statModifiers
    expect([row.block, row.dodge, row.maxStamina].every((n) => typeof n === 'number' && n !== 0)).toBe(true)
    expect(effective(ctx, w, 'block').value).toBeGreaterThanOrEqual(row.block!)
    expect(w.dodge).toBe(bare.dodge + row.dodge!)
    expect(w.maxStamina).toBe(bare.maxStamina + row.maxStamina!)
  })
})

describe('shield powers last until the end of the holder\'s next Activation', () => {
  // Law 10, 2026-10-04 — content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): this ran over each shield's two powers and held that every effect of both is a stat
  // modifier lasting until the end of the next Activation. The Kite's second power is Cover Ally now - Protection put on an adjacent
  // ally, no modifier of the holder's and nothing timed (held in test/shields-reauthored.test.ts). The rule is unchanged and said of
  // what it is about: every shield power that is made of stat modifiers lasts until the end of the holder's next Activation - and
  // each shield has one.
  // was: for (const [shield, [first, second]] of Object.entries(POWERS)) { it(`${first} and ${second} add their Block and are gone …`
  //        … u.actions.push(first!, second!) … for (const p of [first!, second!]) { … for (const e of effects) expect(e.kind === 'statMod' && e.until, p).toBe('endOfNextActivation') }
  const TIMED = Object.entries(POWERS).flatMap(([shield, powers]) => powers.filter((p) => ACTIONS[p]!.effects!.every((e) => e.kind === 'statMod')).map((p) => [shield, p] as const))
  it('every shield has a power made of stat modifiers; the one that is not is the Kite\'s Cover Ally', () => {
    for (const shield of Object.keys(POWERS)) expect(TIMED.some(([s]) => s === shield), shield).toBe(true)
    expect(Object.values(POWERS).flat().filter((p) => !TIMED.some(([, t]) => t === p))).toEqual(['power.kite-shield.cover-ally'])
  })
  for (const [shield, first] of TIMED) {
    it(`${first} adds its numbers and is gone after the next Activation, not before`, () => {
      const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 140 }])
      const u = ctx.state.units[0]!
      u.actions.push(first); u.stamina = 99
      for (const p of [first]) {
        const effects = ACTIONS[p]!.effects!
        expect(effects.length, p).toBeGreaterThan(0)
        for (const e of effects) expect(e.kind === 'statMod' && e.until, p).toBe('endOfNextActivation')
      }
      const stat = (s: 'block' | 'rangedBlock' | 'armor') => effective(ctx, u, s).value
      const base = { block: stat('block'), rangedBlock: stat('rangedBlock'), armor: stat('armor') }
      const gain = (p: string) => { const g = { block: 0, rangedBlock: 0, armor: 0 }; for (const e of ACTIONS[p]!.effects!) if (e.kind === 'statMod') g[e.stat as keyof typeof g] += e.value; return g }
      const g = gain(first)
      activate(ctx, u.id, () => usePower(ctx, u.id, u.id, first))
      // the enemy's phase: still up
      expect(stat('block')).toBe(base.block + g.block); expect(stat('rangedBlock')).toBe(base.rangedBlock + g.rangedBlock); expect(stat('armor')).toBe(base.armor + g.armor)
      ctx.state.turn += 1
      activate(ctx, u.id)   // the next Activation — up through it, gone at its end
      expect([stat('block'), stat('rangedBlock'), stat('armor')]).toEqual([base.block, base.rangedBlock, base.armor])
      expect(ctx.events.filter((e) => e.type === 'statmod.expired' && e['source'] === first).length).toBe(ACTIONS[first]!.effects!.length)
      expect(shield).toMatch(/^item\./)
    })
  }
})

describe('weapon Block and the axe', () => {
  it('swords and daggers add Block only, never Ranged Block', () => {
    for (const [id, b] of [['item.longsword', 5], ['item.greatsword', 10], ['item.dagger', 5]] as const) {
      expect(ITEMS[id]!.statModifiers.block, id).toBe(b)
      expect(ITEMS[id]!.statModifiers.rangedBlock ?? 0, id).toBe(0)
    }
  })

  function axeRig() {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
    tg.triggers = []; tg.hp = tg.maxHp = 100
    tg.mods.push({ stat: 'block', op: 'add', value: 15, source: 'test', scope: 'unit' }, { stat: 'rangedBlock', op: 'add', value: 10, source: 'test', scope: 'unit' })
    return { ctx, at, tg, axe: ACTIONS['attack.war-axe.chop'] ? 'attack.war-axe.chop' : at.actions.find((a) => a.startsWith('attack.war-axe'))! }
  }

  it('a blocked axe attack leaves the blocker 20 lower in Block and Ranged Block for the battle, never below 0', () => {
    const { ctx, tg, axe } = axeRig()
    tg.mods.push({ stat: 'block', op: 'add', value: 85, source: 'test.certain', scope: 'unit' })   // 100: the block is certain
    beginActivation(ctx, 0, 'test')
    expect(performAttack(ctx, 0, 1, axe).blocked).toBe(true)
    tg.mods = tg.mods.filter((m) => m.source !== 'test.certain')
    expect(effective(ctx, tg, 'block').value).toBe(15 - 20)
    expect(effective(ctx, tg, 'rangedBlock').value).toBe(10 - 20)
    ctx.state.turn += 10
    expect(effective(ctx, tg, 'block').value).toBe(-5)   // the whole battle
    // floored at 0 where it is read: the Block cup
    expect(preview(ctx, 0, 1, axe).blockChance).toBe(0)
    expect(ctx.events.filter((e) => e.type === 'statmod.added' && String(e.causeId).startsWith('trigger.war-axe.on-block')).length).toBe(2)
  })

  it('the axe is the attacker\'s: an axe-holder who blocks strips nothing', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    w.mods.push({ stat: 'block', op: 'add', value: 100, source: 'test.certain', scope: 'unit' })
    const before = z.mods.length
    beginActivation(ctx, 1, 'test')
    const bite = z.actions.find((a) => ctx.actions[a]?.attack)!
    expect(performAttack(ctx, 1, 0, bite).blocked).toBe(true)
    expect(z.mods.length).toBe(before)
    expect(ctx.events.some((e) => e.type === 'trigger.rolled' && String(e.causeId).startsWith('trigger.war-axe.on-block'))).toBe(false)
  })
})

describe('in real battles', () => {
  it('a shield-carrying hero blocks on the standard panel', () => {
    let blocked = 0
    for (let replicate = 0; replicate < 6 && !blocked; replicate++) {
      const ctx = createBattle({ replicate })
      runBattle(ctx)
      blocked += ctx.events.filter((e) => e.type === 'block.rolled' && e['blocked'] === true).length
    }
    expect(blocked).toBeGreaterThan(0)
  })
})
