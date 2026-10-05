// fix.stand-up-does-nothing — reported 2026-10-05 (Andrew, playing the opening run; engine/DECISIONS.md 'playtest post, two
// more reports': "The stand-up button doesn't seem to work. When the lumberjack wife has been knocked down, I cannot seem to
// stand up with her."), and ruled the same day ('the playtest post answered': "Stand-up is a special move that is only
// available if you were prone, and yes, it takes your move.").
//
// Expect: "In the opening's battle 2 a knocked-down Lumberjack's Wife stands when the player presses Stand Up on her Activation
// - the engine logs the stand, the prone status is gone and she can then do what a unit that has stood may do by the rules;
// the same holds for a knocked-down hero in a later battle; a test holds it red before the fix and green after; the report
// names the cause with its file and line."
//
// The cause was the host's, twice: Stand Up is granted by the prone status while it is held — the engine derives it
// (grantedActionIds), it is never on the unit's stored action list — and the host read the stored list. So the sandbox listed
// no choice for it (src/core/sandbox.ts sandboxChoices) and the play input dropped the press on its bar button
// (src/ui/play-input.ts, the 'slot' event). The engine took the command all along. Both now ask the engine what the unit is
// granted. Here: the play input, driven as the battle screen drives it; the built page is tools/stand-up.verify.mjs.
//
// The knockdown: the status the engine's own knockdown roll applies (kdb.ts kdbDownStatus — the content row flagged kdbDown),
// put on by the engine's own mutator in a Zombie's name. The roll itself is not sought on a seed.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { encounterDef, validateBattleCommand, staminaCostOf, isMove, isAttack, type BattleCommand } from '../src/engine.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { kdbDownStatus } from '../../engine/src/core/kdb.js'
import { legalActions } from '../../engine/src/core/commands.js'

const LUMBERJACK = 'encounter.opening.lumberjack', BRIDGE = 'encounter.opening.bridge'
type U = Sandbox['ctx']['state']['units'][number]

/** The battle fielded, `who` knocked down by a Zombie, and `who`'s Activation begun as the player begins it. */
function knockedDown(encounterId: string, who: (s: Sandbox) => U) {
  const s = createSandbox({ mapId: encounterDef(encounterId).mapId!, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId })
  advanceSandbox(s)
  const u = who(s), enemy = s.ctx.state.units.find((x) => x.side === 'enemy' && x.lifeState === 'standing')!
  const prone = kdbDownStatus(s.ctx)!, stand = s.ctx.statuses[prone]!.prone!.standAction!
  applyStatus(s.ctx, u.id, prone, 1, 'fix.stand-up-does-nothing', enemy.id)
  expect(s.ctx.events.some((e) => e.type === 'unit.proned' && e['target'] === u.id), `${u.name} is knocked down`).toBe(true)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  P.input({ kind: 'choose', id: u.id }); P.input({ kind: 'unit', id: u.id, hex: u.hex })
  expect(s.ctx.battleCursor, `${u.name}'s Activation`).toMatchObject({ at: 'acting', actor: u.id })
  return { s, u, P, prone, stand, isProne: () => u.statuses.some((x) => x.id === prone && x.value > 0) }
}
/** What the engine would take from the unit acting, and what the host lists for it — as action and aim. */
const aimOf = (c: object) => JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k]) => ['actionId', 'destination', 'target', 'hex', 'centre'].includes(k)).sort()))
const engineLists = (s: Sandbox, id: number) => [...new Set(legalActions(s.ctx, id).map(aimOf))].sort()
const hostLists = (s: Sandbox) => [...new Set(sandboxChoices(s).map((c) => aimOf(c.command)))].sort()

/** Press Stand Up on the bar and confirm it, as a move that goes nowhere is used: chosen, then chosen again. */
function standsByTheBar(k: ReturnType<typeof knockedDown>) {
  const { s, u, P, stand } = k
  const row = s.ctx.actions[stand]!
  expect(row.name).toBe('Stand Up')
  expect(isMove(row), 'Stand Up is a move').toBe(true)
  // the engine offers it, on the unit's own hex — and would take it
  expect(engineLists(s, u.id), 'the engine lists Stand Up').toContain(aimOf({ actionId: stand, destination: u.hex }))
  expect(validateBattleCommand(s.ctx, s.policy, { kind: 'action', actor: u.id, actionId: stand, slot: 'movement', destination: u.hex, expectedSeq: s.ctx.state.seq })).toEqual({ ok: true })
  // the host lists what the engine lists: Stand Up among it, and no other movement while down
  expect(hostLists(s), 'the host lists the engine\'s own choices').toEqual(engineLists(s, u.id))
  expect(sandboxChoices(s).filter((c) => 'destination' in c.command).map((c) => c.command.actionId)).toEqual([stand])
  const from = s.ctx.events.length, stamina = u.stamina, hex = u.hex
  // the press on the bar: taken
  expect(P.input({ kind: 'slot', actionId: stand, unit: u.id }), 'the press on Stand Up is taken').toBe(true)
  if (k.isProne()) {
    // a move that goes nowhere is planned on the unit's own hex and used by the next press (kingdom SWITCHES playInputStandStill)
    expect(P.facts().ghost).toEqual({ unit: u.id, hex })
    expect(P.facts().note).toBe('Stand Up: click it again, or the hero, to use it.')
    expect(P.input({ kind: 'slot', actionId: stand, unit: u.id })).toBe(true)
  }
  const since = s.ctx.events.slice(from)
  // the engine logs the stand; the prone status is gone
  expect(since.filter((e) => e.type === 'unit.stood').map((e) => e['actor']), 'the engine logs the stand').toEqual([u.id])
  expect(k.isProne(), 'the prone status is gone').toBe(false)
  expect(u.hex).toBe(hex)
  // what standing costs is the engine's: its row's Stamina, and the unit's move — "it takes your move" (2026-10-05)
  expect(stamina - u.stamina).toBe(staminaCostOf(u, row))
  expect(u.moveUsed, 'standing took the move').toBe(true)
  return { since }
}

describe('fix.stand-up-does-nothing — a knocked-down unit stands when Stand Up is pressed', () => {
  it('battle 2: the Lumberjack\'s Wife, knocked down, stands on her Activation; her move is spent and what is left is what the engine allows', () => {
    const k = knockedDown(LUMBERJACK, (s) => s.ctx.state.units.find((x) => x.typeId === 'hero.fixed.lumberjacks-wife')!)
    const { s, u, stand } = k
    expect(u.name).toMatch(/Lumberjack's Wife/)
    standsByTheBar(k)
    // she has stood: Stand Up is no longer hers, and no other movement is taken — the move is spent
    expect(engineLists(s, u.id).some((x) => x.includes(stand))).toBe(false)
    for (const id of u.actions.filter((a) => isMove(s.ctx.actions[a]!) && !isAttack(s.ctx.actions[a]!))) {
      const walk = validateBattleCommand(s.ctx, s.policy, { kind: 'action', actor: u.id, actionId: id, slot: 'movement', destination: u.hex, expectedSeq: s.ctx.state.seq })
      if (s.ctx.battleCursor?.actor === u.id) expect(walk, `${id} after standing`).toMatchObject({ ok: false })
    }
    // and she may still attack or use a power as the rules allow after a move: the primary action is not spent by standing
    expect(u.primaryUsed).toBe(false)
    if (s.ctx.battleCursor?.at === 'acting' && s.ctx.battleCursor.actor === u.id) expect(hostLists(s)).toEqual(engineLists(s, u.id))
  })

  it('a later battle: a knocked-down hero stands the same way', () => {
    const k = knockedDown(BRIDGE, (s) => s.ctx.state.units.find((x) => s.setup.heroUids!.includes(x.uid))!)
    expect(k.u.side).toBe('hero')
    standsByTheBar(k)
    expect(k.u.primaryUsed).toBe(false)
  })

  it('a unit that is not down is offered no Stand Up: it is the prone unit\'s alone', () => {
    const s = createSandbox({ mapId: encounterDef(LUMBERJACK).mapId!, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: LUMBERJACK })
    advanceSandbox(s)
    const stand = s.ctx.statuses[kdbDownStatus(s.ctx)!]!.prone!.standAction!
    const wife = s.ctx.state.units.find((x) => x.typeId === 'hero.fixed.lumberjacks-wife')!
    const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
    P.input({ kind: 'choose', id: wife.id }); P.input({ kind: 'unit', id: wife.id, hex: wife.hex })
    expect(s.ctx.battleCursor).toMatchObject({ at: 'acting', actor: wife.id })
    expect(hostLists(s)).toEqual(engineLists(s, wife.id))
    expect(sandboxChoices(s).some((c) => c.command.actionId === stand)).toBe(false)
    expect(P.input({ kind: 'slot', actionId: stand, unit: wife.id }), 'a press that is not hers is not taken').toBe(false)
    expect(s.ctx.events.some((e) => e.type === 'unit.stood')).toBe(false)
  })

  it('the page: on the built battle screen PLAY.html opens for battle 2, a knocked-down hero and the knocked-down Lumberjack\'s Wife each stand when the Stand Up button is pressed', () => {
    const out = execFileSync(process.execPath, ['tools/stand-up.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/stand-up: .* passed/)
  }, 240000)
})
