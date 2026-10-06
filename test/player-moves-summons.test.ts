// rule.player-moves-summons (engine item) — the host's half. Ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'a prone unit only
// stands; …; the player moves a summon; …'): asked whether the player should move the summoned Wolf, or the computer as built —
// "Then the view Wolf's spine player should move to someone's wolf." (dictation; read back to him as: the player moves a
// summoned unit), and 2026-10-06 '… the player moves the summoned Wolf …'.
//
// The rule is the engine's (whose a unit is: core/control.ts controllerOf). The play input reads the engine for who may
// begin, whose bar it is and what it may do, so the Wolf is offered and played like a hero with no rule of the host's own.
// Held here, on the engine's own Call-the-Wolf fielding with the mage as the session's player: the Turn after it is called
// the Wolf is among the units the player may begin; chosen, it is the unit acting, its basic move armed with somewhere to
// go; a click walks it; the computer never chose for it; and the mage is still offered beside it.
import { describe, it, expect } from 'vitest'
import { advanceSandbox, commandSandbox, sandboxActivationChoices, type Sandbox } from '../src/core/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { controllerOf, isMove, type BattleCommand } from '../src/engine.js'
import { createBattle } from '../../engine/src/core/setup.js'
import { legalActions } from '../../engine/src/core/commands.js'
import { SCENARIOS, scenarioOptions } from '../../engine/src/content/scenarios.js'

const CALL = 'power.staff-of-summoning.call-the-wolf', WOLF = 'unit.wolf'
function session() {
  const setup = scenarioOptions(SCENARIOS['test.call-the-wolf']!), ctx = createBattle(setup)
  const mage = ctx.state.units.find((u) => u.side === 'hero')!
  const s = { config: { mapId: 'map.open', heroes: [mage.typeId], enemies: [], seed: 0 }, setup, ctx, policy: { humanUnitUids: [mage.uid] } } as unknown as Sandbox
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  const acting = () => (s.ctx.battleCursor?.at === 'acting' ? s.ctx.battleCursor.actor : null)
  return { s, P, mage, acting }
}

describe('rule.player-moves-summons — the Wolf a hero calls is the player\'s to play', () => {
  it('the Turn after it is called the Wolf is offered beside the mage; chosen, it is the unit acting with its basic move armed; a click walks it; the computer never chose for it', () => {
    const { s, P, mage, acting } = session()
    P.input({ kind: 'choose', id: mage.id }); expect(acting()).toBe(mage.id)
    const call = legalActions(s.ctx, mage.id).find((r) => r.actionId === CALL)!
    expect(call, 'Call the Wolf is the mage\'s to use').toBeDefined()
    expect(commandSandbox(s, { kind: 'action', ...call, expectedSeq: s.ctx.state.seq } as BattleCommand)).toMatchObject({ ok: true })
    const wolf = s.ctx.state.units.at(-1)!
    expect([wolf.typeId, wolf.summonedBy]).toEqual([WOLF, mage.id])
    expect(controllerOf(s.ctx, wolf.id, s.policy), 'the engine says it is the player\'s').toBe('human')
    const turn = s.ctx.state.turn
    // the Turn is ended; the enemies play; the next Hero Phase waits on the player
    if (acting() !== null) P.input({ kind: 'end-activation' })
    P.input({ kind: 'end-turn' })
    expect(s.ctx.state.outcome, 'the battle goes on').toBeFalsy(); expect(s.ctx.state.turn).toBe(turn + 1)
    expect(s.ctx.events.some((e) => e.type === 'ai.mode' && e.actor === wolf.id), 'the computer has not played the Wolf').toBe(false)
    /* the engine waits on the player with both to choose from — or the input has already begun one of the two for the player */
    const offered = new Set(sandboxActivationChoices(s).map((c) => c.uid)); if (acting() !== null) offered.add(s.ctx.state.units[acting()!]!.uid)
    expect([mage.uid, wolf.uid].filter((u) => !offered.has(u)), 'the mage and the Wolf are the player\'s to begin').toEqual([])
    expect([...offered].every((u) => u === mage.uid || u === wolf.uid), 'and nobody else').toBe(true)
    // the player begins the Wolf
    if (acting() !== wolf.id) { if (acting() !== null) expect(acting(), 'the unit begun for the player is its own').toBe(mage.id); P.input({ kind: 'choose', id: wolf.id }) }
    expect(acting(), 'the Wolf is the unit acting').toBe(wolf.id)
    const f = P.facts()
    expect(f.actor).toBe(wolf.id)
    expect(f.slot && isMove(s.ctx.actions[f.slot]!), 'its basic move is armed').toBe(true)
    expect(f.reach.length, 'with somewhere to go').toBeGreaterThan(0)
    const to = f.reach[0]!, at = wolf.hex
    expect(P.input({ kind: 'hex', hex: to })).toBe(true); if (wolf.hex === at) expect(P.input({ kind: 'hex', hex: to })).toBe(true)
    expect(wolf.hex, 'the Wolf walked where the player said').toBe(to)
    expect(s.ctx.events.some((e) => e.type === 'ai.mode' && e.actor === wolf.id), 'the computer never chose for it').toBe(false)
  })
})
