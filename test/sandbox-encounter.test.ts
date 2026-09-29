// kingdom.encounter-battles (engine, 2026-09-28): a person plays an engine ENCOUNTER from the sandbox
// battle screen, through the same host adapter and commands a free battle uses. The encounter fields
// its own map, units, scheduled arrivals and civilians; the heroes are the player's, everyone else —
// civilians included — the AI's; the encounter's outcome ends the battle; the same commands replay the
// same battle; a save resumed mid-battle keeps the schedule. Marked fall areas show until they land.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxActivationChoices, sandboxChoices, sandboxMarkedAreas, saveSandbox, restoreSandbox, type Sandbox, type SandboxConfig } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT, SANDBOX_ENCOUNTERS } from '../src/content/sandbox.js'
import type { BattleCommand } from '../src/engine.js'

const ORPHANAGE: SandboxConfig = { mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 0, encounterId: 'encounter.opening.orphanage' }
const start = (config: SandboxConfig) => { const s = createSandbox(config); advanceSandbox(s); return s }

/** A patient player: ends each activation for `wait` Turns, then attacks an enemy when it can, else walks toward one. */
function choose(s: Sandbox, wait: number): BattleCommand {
  const c = s.ctx.battleCursor!
  if (c.at === 'selecting') return { kind: 'select-activation', unitUid: sandboxActivationChoices(s)[0]!.uid, expectedSeq: s.ctx.state.seq }
  const actor = c.actor!, end: BattleCommand = { kind: 'end-cycle', actor, expectedSeq: s.ctx.state.seq }
  if (s.ctx.state.turn <= wait) return end
  const foes = s.ctx.state.units.filter((u) => u.side === 'enemy' && u.lifeState === 'standing')
  const choices = sandboxChoices(s)
  const hit = choices.find((ch) => 'target' in ch.command && foes.some((f) => f.id === (ch.command as { target: number }).target) && ch.command.slot === 'primary' && ch.preview && 'hitChance' in ch.preview)
  if (hit) return hit.command
  const near = (h: number) => Math.min(...foes.map((f) => s.ctx.geo.distance(h, f.hex)))
  const here = near(s.ctx.state.units[actor]!.hex)
  const walks = choices.filter((ch) => 'destination' in ch.command && near((ch.command as { destination: number }).destination) < here)
    .sort((a, b) => near((a.command as { destination: number }).destination) - near((b.command as { destination: number }).destination) || (a.command as { destination: number }).destination - (b.command as { destination: number }).destination)
  return walks[0]?.command ?? end
}
function play(s: Sandbox, next: () => BattleCommand, log: BattleCommand[] = [], stopAtTurn = Infinity): BattleCommand[] {
  for (let guard = 0; guard < 20000; guard++) {
    if (s.ctx.state.outcome || s.ctx.state.turn >= stopAtTurn) return log
    const cmd = next(), r = commandSandbox(s, cmd)
    if (!r.ok) throw new Error(`refused: ${r.reason}`)
    log.push(cmd)
  }
  throw new Error('the battle did not end')
}
const arrived = (s: Sandbox, turn: number) => s.ctx.events.filter((e) => e.type === 'unit.enter' && e.turn === turn).map((e) => e['typeId'])

describe('kingdom.encounter-battles — the sandbox plays an engine encounter', () => {
  it('offers the opening\'s encounters by the engine\'s names', () => {
    expect(SANDBOX_ENCOUNTERS.map((e) => e.id)).toEqual(expect.arrayContaining(['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.opening.cavern-trail']))
    expect(SANDBOX_ENCOUNTERS.find((e) => e.id === 'encounter.opening.orphanage')!.name).toBe('Orphanage')
  })

  it('the Orphanage to the end: the civilians act on their own, the Turn 4 and Turn 5 Zombies arrive, clearing the map wins', () => {
    const s = start(ORPHANAGE)
    expect(s.ctx.events.find((e) => e.type === 'map.loaded')!['mapId']).toBe('map.opening.orphanage')
    const heroes = s.ctx.state.units.slice(0, ORPHANAGE.heroes.length).map((u) => u.uid)
    const civilians = s.ctx.state.units.filter((u, i) => u.side === 'hero' && i >= ORPHANAGE.heroes.length)
    expect(civilians.map((u) => u.typeId).sort()).toEqual(['hero.fixed.orphans', 'hero.fixed.school-teacher'])
    const offered = new Set<number>()
    play(s, () => { for (const u of sandboxActivationChoices(s)) offered.add(u.uid); return choose(s, 3) })
    expect([...offered].sort()).toEqual([...heroes].sort())
    for (const c of civilians) expect(s.ctx.events.some((e) => e.type === 'activation.begin' && e.actor === c.id), c.typeId).toBe(true)
    expect(arrived(s, 4)).toEqual(['unit.zombie'])
    expect(arrived(s, 5)).toEqual(['unit.zombie'])
    expect(s.ctx.state.outcome).toBe('heroClear')
  })

  it('the same commands replayed give the same battle', () => {
    const a = start(ORPHANAGE), commands = play(a, () => choose(a, 3))
    const b = start(ORPHANAGE); let i = 0
    play(b, () => ({ ...commands[i++]!, expectedSeq: b.ctx.state.seq }))
    expect(JSON.stringify(b.ctx.events)).toBe(JSON.stringify(a.ctx.events))
  })

  it('a save resumed mid-battle keeps the schedule and ends as the uninterrupted battle', () => {
    const whole = start(ORPHANAGE), commands = play(whole, () => choose(whole, 3))
    const first = start(ORPHANAGE); let i = 0
    play(first, () => ({ ...commands[i++]!, expectedSeq: first.ctx.state.seq }), [], 3)
    expect(first.ctx.state.turn).toBe(3)
    const resumed = restoreSandbox(saveSandbox(first))
    expect(resumed.config.encounterId).toBe('encounter.opening.orphanage')
    advanceSandbox(resumed)
    play(resumed, () => ({ ...commands[i++]!, expectedSeq: resumed.ctx.state.seq }))
    expect(arrived(resumed, 4)).toEqual(['unit.zombie'])
    expect(JSON.stringify(resumed.ctx.events)).toBe(JSON.stringify(whole.ctx.events))
  })

  it('marked fall areas show from area.marked until they land (the Cavern Trail\'s meteor fall)', () => {
    const s = start({ ...ORPHANAGE, encounterId: 'encounter.opening.cavern-trail' })
    play(s, () => choose(s, 99), [], 5)   // hold until Turn 5's first decision: the fall was marked as Turn 4 ended
    if (s.ctx.state.outcome) return expect.unreachable('the heroes fell before Turn 5')
    const marked = sandboxMarkedAreas(s)
    expect(marked).toHaveLength(1)
    expect(marked[0]).toMatchObject({ fall: 'trigger.cavern-trail.meteor-fall', landsAfterTurn: 5 })
    expect(marked[0]!.hexes.length).toBeGreaterThan(7)
    play(s, () => choose(s, 99), [], 6)
    expect(sandboxMarkedAreas(s)).toEqual([])
  })
})
