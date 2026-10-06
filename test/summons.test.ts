// capability.summons (2026-10-05). Ruled 2026-10-04 (DECISIONS.md 'his 28 reward weapons read back: … the mechanics his own
// items need are wanted'): "We need: summons". His Staff of Summoning - "Call the Wolf: 2 Stamina, cooldown 5, target: an empty
// hex adjacent to you. Summon one Wolf on a hex adjacent to you. It is a summoned ally with its own stat block and its own AI"
// and "Unbinding: … +15 Accuracy against summon" - acted in neither line.
//
// Wanted, with no content name in core: a power places a unit of a named unit row on a chosen empty hex in range, on the
// summoner's side, flagged summoned; it acts by its own AI in its side's Phase; it is not a hero for victory or defeat, it is
// removed at the end of the Battle and its death is not a hero's death; an attack may carry extra Accuracy against a kind of
// target named by a flag or a unit tag.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { executeAction, legalActions, validateAction, controllerOf } from '../src/core/commands.js'
import { beginActivation, setLifeState } from '../src/core/mutate.js'
import { checkVictory } from '../src/core/settle.js'
import { resolveAccuracy, attackDef } from '../src/core/pipeline.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { ACTIONS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Unit } from '../src/core/types.js'

const CALL = 'power.staff-of-summoning.call-the-wolf', UNBIND = 'attack.staff-of-summoning.unbinding', WOLF = 'unit.wolf'
const fielding = () => createBattle(scenarioOptions(SCENARIOS['test.call-the-wolf']!))
/** the battle at the mage's first Activation, nothing done yet */
function atMage(): { ctx: Ctx; mage: Unit } {
  const ctx = fielding()
  const mage = ctx.state.units.find((u) => u.side === 'hero')!
  beginActivation(ctx, mage.id, 'test')
  return { ctx, mage }
}
const hexesOf = (ctx: Ctx, actor: number) => legalActions(ctx, actor).filter((r) => r.actionId === CALL).map((r) => (r as { hex: number }).hex)
const typesOf = (ctx: Ctx, type: string) => ctx.events.filter((e) => e.type === type)

describe('the rows', () => {
  it('Call the Wolf is a power aimed at an empty hex within 1, 2 Stamina, cooldown 5, that summons the Codex\'s Wolf; Unbinding is 15 Accuracy better against anything summoned', () => {
    const a = ACTIONS[CALL]!
    expect(a).toBeDefined()
    expect([a.staminaCost, a.cooldown, a.range, a.free ?? false]).toEqual([2, 5, 1, false])
    expect(a.target).toEqual({ select: 'hex', side: 'any' })
    expect(a.effects).toEqual([{ kind: 'summon', unit: WOLF }])
    expect(a.gaps ?? []).toEqual([])
    expect(UNITS[WOLF]).toBeDefined()
    expect(UNITS[WOLF]!.name).toBe('Wolf')
    expect(ACTIONS[UNBIND]!.attack!.accuracyVs).toEqual({ summon: 15 })
  })
})

describe('a power places a unit on a chosen empty hex', () => {
  it('the action list offers it once for each empty hex beside the caster, and for no other hex', () => {
    const { ctx, mage } = atMage()
    const offered = hexesOf(ctx, mage.id)
    const beside = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).filter((h) => ctx.geo.distance(mage.hex, h) === 1)
    expect(offered.length).toBeGreaterThan(0)
    expect(offered).toEqual([...offered].sort((x, y) => x - y))
    for (const h of offered) { expect(beside).toContain(h); expect(ctx.state.units.some((u) => u.lifeState !== 'dead' && u.hex === h)).toBe(false) }
    // every empty passable hex beside the caster is offered
    for (const h of beside) if (!offered.includes(h)) expect(validateAction(ctx, { actor: mage.id, actionId: CALL, hex: h }).ok).toBe(false)
    // not its own hex, not a hex two away, not a hex a unit stands on, not a unit
    const two = Array.from({ length: ctx.geo.hexCount }, (_, h) => h).find((h) => ctx.geo.distance(mage.hex, h) === 2)!
    expect(validateAction(ctx, { actor: mage.id, actionId: CALL, hex: mage.hex })).toEqual({ ok: false, reason: 'illegal-hex-or-action' })
    expect(validateAction(ctx, { actor: mage.id, actionId: CALL, hex: two })).toEqual({ ok: false, reason: 'illegal-hex-or-action' })
    expect(validateAction(ctx, { actor: mage.id, actionId: CALL, target: mage.id }).ok).toBe(false)
  })
  it('used: a Wolf stands on the chosen hex on the caster\'s side, flagged summoned; the cost, the cooldown and the primary action are spent; the log says the power, the arrival and the summon', () => {
    const { ctx, mage } = atMage()
    const hex = hexesOf(ctx, mage.id)[0]!, stamina = mage.stamina, units = ctx.state.units.length
    expect(executeAction(ctx, { actor: mage.id, actionId: CALL, hex })).toEqual({ ok: true })
    expect(ctx.state.units.length).toBe(units + 1)
    const wolf = ctx.state.units[units]!
    expect([wolf.typeId, wolf.hex, wolf.side, wolf.rowSide, wolf.summoned, wolf.summonedBy, wolf.lifeState]).toEqual([WOLF, hex, 'hero', 'enemy', true, mage.id, 'standing'])
    expect(wolf.maxHp).toBe(UNITS[WOLF]!.maxHp)
    expect(wolf.badges).toEqual([])   // not a Hero: no Hero badge, so it never bleeds out
    expect(mage.stamina).toBe(stamina - 2)
    expect(mage.cooldowns[CALL]).toBe(ctx.state.turn + 5 + 1)   // ready again on the Turn after five have passed (the engine's one cooldown rule)
    expect(mage.primaryUsed).toBe(true)
    expect(validateAction(ctx, { actor: mage.id, actionId: CALL, hex: hexesOf(ctx, mage.id)[0] ?? hex }).ok).toBe(false)
    const used = typesOf(ctx, 'power.used').at(-1)!
    expect([used.causeId, used.actor, used['hex'], used['abilityId']]).toEqual([CALL, mage.id, hex, CALL])
    const entered = typesOf(ctx, 'unit.enter').at(-1)!
    expect([entered.actor, entered['typeId'], entered['side'], entered['arrived']]).toEqual([wolf.id, WOLF, 'hero', CALL])
    const said = typesOf(ctx, 'unit.summoned')
    expect(said.map((e) => [e.causeId, e.actor, e['summoned'], e['typeId'], e['hex'], e['side']])).toEqual([[CALL, mage.id, wolf.id, WOLF, hex, 'hero']])
  })
  // Law 10, 2026-10-06 — OVERTURNED by a ruling, not loosened: rule.player-moves-summons (Andrew, DECISIONS.md 2026-10-05 '… the
  // player moves a summon …', asked whether the player should move the summoned Wolf or the computer as built: "Then the view
  // Wolf's spine player should move to someone's wolf." — dictation; read back to him as: the player moves a summoned unit —
  // and 2026-10-06 '… the player moves the summoned Wolf …'). The test was:
  //   it('a hand that is not the session\'s is not the player\'s: the summoned unit is the computer\'s, whoever controls the caster', () => {
  //     … const policy = { humanUnitUids: [mage.uid] }
  //     expect(controllerOf(ctx, mage.id, policy)).toBe('human')
  //     expect(controllerOf(ctx, wolf.id, policy)).toBe('ai') })
  it('the summoned unit is its caster\'s player\'s: the player\'s when the session\'s player controls the caster, the computer\'s when nobody does', () => {
    const { ctx, mage } = atMage()
    executeAction(ctx, { actor: mage.id, actionId: CALL, hex: hexesOf(ctx, mage.id)[0]! })
    const wolf = ctx.state.units.at(-1)!
    const policy = { humanUnitUids: [mage.uid] }
    expect(controllerOf(ctx, mage.id, policy)).toBe('human')
    expect(controllerOf(ctx, wolf.id, policy)).toBe('human')
    expect(controllerOf(ctx, wolf.id, { humanUnitUids: [] })).toBe('ai')
  })
  it('a battle with a summoned unit on the board saves and restores', () => {
    const { ctx, mage } = atMage()
    executeAction(ctx, { actor: mage.id, actionId: CALL, hex: hexesOf(ctx, mage.id)[0]! })
    const again = restoreBattle(saveBattle(ctx), ctx)
    expect(again.state.units.at(-1)!.summonedBy).toBe(mage.id)
    expect(JSON.stringify(again.state)).toBe(JSON.stringify(ctx.state))
  })
})

describe('in a real battle, fought by the computer', () => {
  it('the mage calls the Wolf; from the next Turn it is activated in the Hero Phase by its own AI, walks and attacks the enemy', () => {
    const ctx = fielding()
    runBattle(ctx)
    const summon = typesOf(ctx, 'unit.summoned')[0]!
    expect(summon, 'the computer uses Call the Wolf').toBeDefined()
    const wolf = summon['summoned'] as number
    const acts = ctx.events.filter((e) => e.type === 'activation.begin' && e.actor === wolf)
    expect(acts.length).toBeGreaterThan(0)
    for (const e of acts) { expect(e['phase']).toBe('hero'); expect(e.turn).toBeGreaterThan(summon.turn) }
    const swings = ctx.events.filter((e) => e.type === 'attack.declared' && e.actor === wolf)
    expect(swings.length, 'the Wolf attacks').toBeGreaterThan(0)
    for (const e of swings) expect(ctx.state.units[e.target as number]!.side).toBe('enemy')
    expect(ctx.events.some((e) => e.type === 'ai.mode' && e.actor === wolf && e['mode'] === UNITS[WOLF]!.ai)).toBe(true)
    // the power's cooldown holds: never called again within 5 Turns of a call
    const calls = typesOf(ctx, 'unit.summoned').map((e) => e.turn)
    for (let i = 1; i < calls.length; i++) expect(calls[i]! - calls[i - 1]!).toBeGreaterThanOrEqual(5)
  })
  it('the battle\'s end removes every summoned unit still standing: one line each, before the end is told - and a recording made before has none', () => {
    // replicate 1 of the fielding: the first, read from 0 upward, in which the Wolf still stands when the battle ends (found, not
    // tuned - on its own replicate, 0, the Wolf dies first and nothing is left to remove; that case is held too, below)
    const ctx = createBattle({ ...scenarioOptions(SCENARIOS['test.call-the-wolf']!), replicate: 1 })
    runBattle(ctx)
    const end = ctx.events.findIndex((e) => e.type === 'battle.end')
    const standing = ctx.state.units.filter((u) => u.summonedBy !== undefined && u.lifeState === 'standing')
    const gone = typesOf(ctx, 'unit.dismissed')
    expect(standing.length, 'the Wolf stands at the end').toBe(1)
    expect(gone.map((e) => e.actor)).toEqual(standing.map((u) => u.id))
    expect(gone[0]!['summonedBy']).toBe(standing[0]!.summonedBy)
    // a summoned unit that died before the end is not removed again
    const died = fielding(); runBattle(died)
    expect(died.state.units.filter((u) => u.summonedBy !== undefined).map((u) => u.lifeState)).toEqual(['dead'])
    expect(died.events.some((e) => e.type === 'unit.dismissed')).toBe(false)
    for (const e of gone) expect(ctx.events.indexOf(e)).toBeLessThan(end)
    // a battle with no power that summons says nothing of the kind (a raised corpse is not dismissed)
    const other = createBattle(scenarioOptions(SCENARIOS['showcase.horrors']!)); runBattle(other)
    expect(other.events.some((e) => e.type === 'unit.dismissed' || e.type === 'unit.summoned')).toBe(false)
  })
})

describe('a summoned unit is not a hero', () => {
  it('for defeat: with every hero dead and the Wolf standing the battle is lost; for victory: the last enemy dead wins it', () => {
    const { ctx, mage } = atMage()
    executeAction(ctx, { actor: mage.id, actionId: CALL, hex: hexesOf(ctx, mage.id)[0]! })
    const wolf = ctx.state.units.at(-1)!
    expect(checkVictory(ctx, 'test')).toBe(false)
    for (const u of ctx.state.units) if (u.side === 'hero' && u.id !== wolf.id) setLifeState(ctx, u.id, 'dead', 'test')
    expect(wolf.lifeState).toBe('standing')
    expect(checkVictory(ctx, 'test')).toBe(true)
    expect(ctx.state.outcome).toBe('wipe')
    const won = atMage()
    executeAction(won.ctx, { actor: won.mage.id, actionId: CALL, hex: hexesOf(won.ctx, won.mage.id)[0]! })
    for (const u of won.ctx.state.units) if (u.side === 'enemy') setLifeState(won.ctx, u.id, 'dead', 'test')
    expect(checkVictory(won.ctx, 'test')).toBe(true)
    expect(won.ctx.state.outcome).toBe('heroClear')
  })
  it('its death is not a hero\'s death: no Deathbed roll, no bleeding out, no body left', () => {
    const ctx = fielding()
    runBattle(ctx)
    const wolves = ctx.state.units.filter((u) => u.summonedBy !== undefined)
    for (const w of wolves) {
      expect(ctx.events.some((e) => e.type === 'life.downed' && e.target === w.id)).toBe(false)
      expect(ctx.events.some((e) => (e.type === 'deathbed.rolled' || e.type === 'bleedout.set') && (e.target === w.id || e.actor === w.id))).toBe(false)
      expect((ctx.state.corpses ?? []).some((c) => c.uid === w.uid)).toBe(false)
    }
  })
})

describe('Accuracy against a kind of target', () => {
  it('Unbinding is 15 better against a summoned unit and not against any other; a row of its own says so', () => {
    const { ctx, mage } = atMage()
    const enemy = ctx.state.units.find((u) => u.side === 'enemy')!
    const a = attackDef(ctx, UNBIND)
    const plain = resolveAccuracy(ctx, mage, enemy, a)
    expect(plain.ledger.some((r) => r.name === 'ACCURACY_VS')).toBe(false)
    enemy.summoned = true
    const vs = resolveAccuracy(ctx, mage, enemy, a)
    expect(vs.value - plain.value).toBe(15)
    expect(vs.ledger.filter((r) => r.name === 'ACCURACY_VS').map((r) => [r.effectId, r.delta])).toEqual([[UNBIND, 15]])
    // another attack of the same hero gains nothing against it
    const other = mage.actions.map((id) => ACTIONS[id]!).find((x) => x.attack && x.id !== UNBIND && !x.attack.accuracyVs)!
    expect(resolveAccuracy(ctx, mage, enemy, attackDef(ctx, other.id)).ledger.some((r) => r.name === 'ACCURACY_VS')).toBe(false)
  })
})
