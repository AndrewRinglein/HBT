// kingdom.attack-one-armed-after-move — ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'the battle screen must feel smooth: …;
// attack one is chosen after a move; …'): "I do think after you move, we should auto-select your basic attack or your attack
// one. If you have a ranged weapon, it's still your attack one, so you don't have to select your attack to then start turning
// on the map. Basically, you're changing A from basic attack one if you want to do anything other than that first thing."
// (dictation: "turning on the map" is targeting on the map; "changing A from" is changing away from).
//
// Expect: "In the opening's battle 1 the Iron Dwarf, its walk ended next to a Zombie, shows Chop chosen on the bar with no click
// on the bar; pointing at the Zombie shows the arrow and the forecast at once, and two clicks on it strike; a hero holding a
// bow has its first bow attack chosen after its walk, the arrow drawn out to its range; clicking Heavy Chop changes the choice;
// a right-click clears it and it stays cleared for that Activation; a civilian with no attack has nothing chosen; a play-input
// test and a page test read each; the tutorial's page tests pass."
//
// The play input only: no engine change. Which attack is "attack one" is the engine's order (grantedActionIds: the first
// attack the unit is granted, the one its bar lists first); whether it may be chosen is the engine's answer to an order with
// it (validateBattleCommand: refused before the target is looked at — the unit cannot act, the action is not ready, its slot
// is closed — and nothing is chosen; refused for the target alone, it is chosen and its arrow shows how far it reaches).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { encounterDef, isMove, isAttack, grantedActionIds, actionReach, type BattleCommand } from '../src/engine.js'
import { drainStamina } from '../../engine/src/core/mutate.js'

const ORPHANAGE = 'encounter.opening.orphanage', DWARF = 'hero.base.warrior-iron', RANGER = 'hero.base.ranger-aggressive'
type U = Sandbox['ctx']['state']['units'][number]
function battle1(hero: string) {
  const s = createSandbox({ mapId: encounterDef(ORPHANAGE).mapId!, heroes: [hero], enemies: [], seed: 1, encounterId: ORPHANAGE })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  const me = () => s.ctx.state.units.find((x) => x.typeId === hero)!
  const acting = () => (s.ctx.battleCursor?.at === 'acting' ? s.ctx.battleCursor.actor : null)
  const begin = (u: U) => { if (acting() === u.id) return; P.input({ kind: 'choose', id: u.id }); expect(acting(), `${u.name}'s Activation`).toBe(u.id) }
  const attacksOf = (u: U) => grantedActionIds(s.ctx, u).filter((id) => isAttack(s.ctx.actions[id]!))
  const foes = () => s.ctx.state.units.filter((x) => x.side === 'enemy' && x.lifeState === 'standing')
  const near = (hex: number) => Math.min(...foes().map((f) => s.ctx.geo.distance(hex, f.hex)))
  /** walk the acting unit to `hex`: the click that plans, the click that walks (two clicks, the default) */
  const walk = (hex: number) => { expect(P.input({ kind: 'hex', hex }), 'the hex is planned').toBe(true); expect(P.facts().ghost?.hex).toBe(hex); expect(P.input({ kind: 'hex', hex }), 'the walk is taken').toBe(true) }
  /** the reach hex whose path's end has an enemy in reach of an attack (the engine's forecast: the path-end targets), or null */
  const strikingHex = () => { for (const hex of P.facts().reach) { P.input({ kind: 'hex', hex }); const n = P.facts().targets.length; P.input({ kind: 'back' }); if (n) return hex } return null }
  /** turn after turn the unit walks toward the enemy, until a walk of its own ends with an enemy in reach of an attack; returns that walk's hex — the walk is NOT yet made */
  const closeIn = (u: () => U) => {
    for (let turn = 0; turn < 10; turn++) {
      if (s.ctx.state.outcome) throw new Error('the battle ended before a walk could end beside an enemy')
      begin(u())
      const hex = strikingHex(); if (hex !== null) return hex
      const reach = P.facts().reach; expect(reach.length).toBeGreaterThan(0)
      walk([...reach].sort((a, b) => near(a) - near(b) || a - b)[0]!)
      if (acting() === u().id) P.input({ kind: 'end-activation' })
      if (acting() !== null) P.input({ kind: 'end-activation' })
      P.input({ kind: 'end-turn' })
    }
    throw new Error('no walk ended beside an enemy in ten turns')
  }
  /** the engine lists the unit's attack one against an enemy now (its validated choices) */
  const inReach = (u: U) => sandboxChoices(s).some((c) => c.command.actor === u.id && c.command.actionId === attacksOf(u)[0] && 'target' in c.command && s.ctx.state.units[c.command.target]?.side !== u.side)
  /** turn after turn the unit walks toward the enemy, until a walk of its own has been MADE that leaves it acting with an enemy in reach of its attack one */
  const walkBeside = (u: () => U) => {
    for (let turn = 0; turn < 12; turn++) {
      if (s.ctx.state.outcome) throw new Error('the battle ended before a walk ended beside an enemy')
      begin(u())
      const reach = P.facts().reach; expect(reach.length).toBeGreaterThan(0)
      walk(strikingHex() ?? [...reach].sort((a, b) => near(a) - near(b) || a - b)[0]!)
      if (acting() === u().id && inReach(u())) return
      if (acting() === u().id) P.input({ kind: 'end-activation' })
      if (acting() !== null) P.input({ kind: 'end-activation' })
      P.input({ kind: 'end-turn' })
    }
    throw new Error('no walk ended beside an enemy in twelve turns')
  }
  return { s, P, me, begin, walk, closeIn, walkBeside, attacksOf, foes, acting }
}

describe('kingdom.attack-one-armed-after-move — after a unit moves, its attack one is chosen by itself', () => {
  it('battle 1: the Iron Dwarf, its walk ended next to a Zombie, has Chop chosen with no click on the bar; pointing at the Zombie shows the arrow and the forecast at once, and two clicks on it strike', () => {
    const b = battle1(DWARF), { s, P } = b
    b.walkBeside(b.me)
    const dwarf = b.me(), [chop] = b.attacksOf(dwarf)
    expect(s.ctx.actions[chop!]!.name).toBe('Chop')
    expect(b.acting(), 'the engine waits for its next order').toBe(dwarf.id); expect(dwarf.moveUsed).toBe(true)
    // no click on the bar: attack one is chosen
    let f = P.facts()
    expect(f.slot, 'Chop is chosen by itself').toBe(chop); expect(f.ghost).toBeNull(); expect(f.reach, 'no move is armed beside it').toEqual([]); expect(f.note ?? null, 'nothing is said about it').toBeNull()
    const zombie = b.foes().find((z) => f.targets.includes(z.hex))!
    expect(zombie, 'its legal targets light: the Zombie beside it').toBeTruthy()
    // pointing at the Zombie: the arrow and the forecast at once
    P.input({ kind: 'point', hex: zombie.hex }); f = P.facts()
    expect(f.aim).toMatchObject({ from: dwarf.hex, to: zombie.hex, target: zombie.id, locked: false })
    expect(typeof f.aim!.hit).toBe('number'); expect(typeof f.aim!.dmg).toBe('number')
    // two clicks on it strike: the first locks the aim, the second confirms
    const from = s.ctx.events.length
    expect(P.input({ kind: 'unit', id: zombie.id, hex: zombie.hex })).toBe(true); expect(P.facts().aim?.locked).toBe(true); expect(s.ctx.events.length, 'the first click only locks').toBe(from)
    expect(P.input({ kind: 'unit', id: zombie.id, hex: zombie.hex })).toBe(true)
    const swing = s.ctx.events.slice(from).find((e) => e.type === 'attack.declared')!
    expect(swing).toMatchObject({ actor: dwarf.id, target: zombie.id, attackId: chop })
  })

  it('a hero holding a bow has its first bow attack chosen after its walk, and the arrow is drawn out to its range and no farther', () => {
    const b = battle1(RANGER), { s, P } = b, ranger = b.me(), [shot] = b.attacksOf(ranger)
    expect((s.ctx.actions[shot!] as { attack?: { kind?: string } }).attack?.kind, 'attack one is the bow\'s').toBe('ranged')
    b.begin(ranger)
    const reach = P.facts().reach; expect(reach.length).toBeGreaterThan(0)
    b.walk(reach[0]!)
    expect(b.acting()).toBe(ranger.id)
    expect(P.facts().slot, `${s.ctx.actions[shot!]!.name} is chosen by itself`).toBe(shot)
    // the arrow follows the pointer out to the attack's reach: pointing far past it, the arrow stops at the engine's reach
    const range = actionReach(s.ctx, ranger.id, shot!, ranger.hex)!, far = [...Array(s.ctx.geo.hexCount).keys()].sort((x, y) => s.ctx.geo.distance(ranger.hex, y) - s.ctx.geo.distance(ranger.hex, x))[0]!
    expect(s.ctx.geo.distance(ranger.hex, far)).toBeGreaterThan(range)
    P.input({ kind: 'point', hex: far }); const aim = P.facts().aim!
    expect(aim.from).toBe(ranger.hex); expect(s.ctx.geo.distance(ranger.hex, aim.to), 'the arrow is as long as the bow reaches').toBe(range)
  })

  it('a click on another row changes the choice; a right-click takes it back, and it is not chosen again by itself in that Activation — but it is in the next', () => {
    const b = battle1(DWARF), { s, P } = b, dwarf = b.me(), [chop, second] = b.attacksOf(dwarf)
    b.begin(dwarf)
    // a short walk — one hex of several — so the engine still offers the rest of it
    const here = dwarf.hex, step = P.facts().reach.find((h) => s.ctx.geo.distance(here, h) === 1)!
    expect(step).toBeDefined(); b.walk(step)
    expect(P.facts().slot).toBe(chop)
    // another row: the choice changes
    expect(P.input({ kind: 'slot', actionId: second!, unit: dwarf.id })).toBe(true); expect(P.facts().slot, `${s.ctx.actions[second!]!.name} is chosen instead`).toBe(second)
    // right-click: taken back
    expect(P.input({ kind: 'back' })).toBe(true)
    const after = P.facts().slot
    expect(after === null || isMove(s.ctx.actions[after]!), 'no attack is chosen: what is armed, if anything, is the rest of the walk').toBe(true)
    // the rest of the walk, where the engine still offers it: after that move it is NOT chosen again in this Activation
    const more = P.facts().reach
    if (more.length) { b.walk(more[0]!); if (b.acting() === dwarf.id) { const now = P.facts().slot; expect(now === null || isMove(s.ctx.actions[now]!), 'taken back, it stays back for this Activation').toBe(true) } }
    // the next Activation of the same unit: chosen again after its move
    if (b.acting() === dwarf.id) P.input({ kind: 'end-activation' })
    if (b.acting() !== null) P.input({ kind: 'end-activation' })
    P.input({ kind: 'end-turn' })
    if (!s.ctx.state.outcome && b.me().lifeState === 'standing') { b.begin(b.me()); const r = P.facts().reach
      if (r.length) { b.walk(r[0]!); if (b.acting() === dwarf.id) expect(P.facts().slot, 'a new Activation: chosen again after its move').toBe(chop) } }
  })

  it('changing away from attack one to move again: Move chosen on the bar is armed in its place; that second move is the unit\'s primary action, and whatever the engine then leaves it, attack one is never left chosen for an Activation that is over', () => {
    const b = battle1(DWARF), { s, P } = b, dwarf = b.me(), [chop] = b.attacksOf(dwarf)
    b.begin(dwarf)
    const move = P.facts().slot!, step = P.facts().reach.find((h) => s.ctx.geo.distance(dwarf.hex, h) === 1)!
    b.walk(step); expect(P.facts().slot).toBe(chop)
    // the player changes away from attack one to walk on: Move on the bar, then the hex
    expect(P.input({ kind: 'slot', actionId: move, unit: dwarf.id })).toBe(true)
    expect(P.facts().slot, 'Move is armed in its place').toBe(move)
    const more = P.facts().reach
    expect(more.length, 'the engine offers the move again, as the unit\'s primary action').toBeGreaterThan(0)
    b.walk(more[0]!)
    /* the engine's own rule decides what follows (a primary action ends the Activation by itself): if the Dwarf still acts,
       its attack one is chosen after this move too (kingdom SWITCHES attackOneAfterEachMove); if it does not, nothing of its is */
    if (b.acting() === dwarf.id) expect(P.facts().slot, 'still acting: chosen after this move too').toBe(chop)
    else { expect(dwarf.primaryUsed || dwarf.moveUsed).toBe(true); expect(P.facts().actor === dwarf.id && P.facts().slot === chop, 'the Activation is over: nothing of the Dwarf\'s is chosen').toBe(false) }
  })

  it('it is not chosen when the engine would refuse the attack for a reason other than reach — no Stamina for it — and then nothing is chosen, not a later attack', () => {
    /* "its primary is spent": a primary action ends the Activation by itself (engine rule.primary-ends-activation), so no move
       of the player's follows one and the input never stands there; the engine's refusal for it (action-slot-closed) is one of
       the three the input reads as "not for reach" (the play input's own comment). What can be reached is no Stamina: */
    // no Stamina for attack one: the engine's own drain, then the walk — nothing is chosen, though Punch costs nothing
    { const b = battle1(DWARF), { s, P } = b, dwarf = b.me(), attacks = b.attacksOf(dwarf)
      b.begin(dwarf)
      const free = attacks.find((id) => s.ctx.actions[id]!.staminaCost === 0)
      expect(s.ctx.actions[attacks[0]!]!.staminaCost, 'attack one costs Stamina').toBeGreaterThan(0); expect(free, 'a later attack costs none').toBeTruthy()
      /* the walk itself may cost Stamina (the engine's charge for it — the choice's own cost): all but that is drained, by the
         engine's own drain, so the walk is paid for and nothing is left for attack one */
      const hex = P.facts().reach[0]!, cost = sandboxChoices(s).find((c) => c.command.actor === dwarf.id && 'destination' in c.command && c.command.destination === hex)!.cost
      drainStamina(s.ctx, dwarf.id, dwarf.stamina - cost, 'kingdom.attack-one-armed-after-move')
      expect(dwarf.stamina).toBe(cost)
      expect(P.facts().reach, 'the walk can still be paid for').toContain(hex); b.walk(hex)
      expect(dwarf.stamina, 'nothing is left for attack one').toBe(0)
      if (b.acting() === dwarf.id) { const now = P.facts().slot; expect(now === null || isMove(s.ctx.actions[now]!), 'attack one cannot be paid for: nothing is chosen — not the later attack').toBe(true); expect(now).not.toBe(free) } }
  })

  it('a unit with no attack has nothing chosen after its walk', () => {
    /* Every unit of the player's in the opening has an attack (the civilians carry a Dagger: Stab, and Punch), so no fielded
       unit shows this. The state is MADE BY HAND here, and only here: a civilian's attacks are taken off the engine's list
       of what it is granted, to hold that a unit with none has nothing chosen. */
    const b = battle1(DWARF), { s, P } = b
    const civilian = s.ctx.state.units.find((x) => x.side === 'hero' && x.typeId !== DWARF)!
    expect(b.attacksOf(civilian).length, 'as fielded, the civilian has attacks').toBeGreaterThan(0)
    civilian.actions = civilian.actions.filter((id) => !isAttack(s.ctx.actions[id]!))
    b.begin(civilian)
    if (b.attacksOf(civilian).length === 0) { const r = P.facts().reach; expect(r.length).toBeGreaterThan(0); b.walk(r[0]!)
      if (b.acting() === civilian.id) { const now = P.facts().slot; expect(now === null || isMove(s.ctx.actions[now]!), 'no attack: nothing is chosen').toBe(true) } }
    else expect.fail('the civilian still holds an attack: ' + b.attacksOf(civilian).join(', '))
  })

  it('an Activation still begins with the basic move armed, and a path planned still plans the attacks from its end — ruled 2026-10-03, unchanged', () => {
    const b = battle1(DWARF), { s, P } = b
    const hex = b.closeIn(b.me), dwarf = b.me()
    expect(isMove(s.ctx.actions[P.facts().slot!]!)).toBe(true)
    P.input({ kind: 'hex', hex })
    const f = P.facts(); expect(f.ghost).toEqual({ unit: dwarf.id, hex }); expect(isMove(s.ctx.actions[f.slot!]!), 'the move is still the armed action while its path is shown').toBe(true)
    expect(f.targets.length, 'whom it could strike from the path\'s end').toBeGreaterThan(0)
  })

  it('the page: on the built battle screen, battle 1, the Iron Dwarf\'s walk next to a Zombie leaves Chop chosen on the bar with no click on it; two clicks on the Zombie strike', () => {
    const out = execFileSync(process.execPath, ['tools/attack-one-armed-after-move.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/attack-one-armed-after-move: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
