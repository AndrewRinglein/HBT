// ai.action-list (AI-DESIGN.md §3A, §7 step 1; ruled 2026-09-26): ONE engine
// function lists every legal action for a unit right now — movement, attacks,
// powers, bursts, item powers — for heroes and enemies alike, each entry an
// ActionRequest the one legality function (validateAction) accepts. The AI
// modes read it instead of building their own candidates. Rules, not numbers:
//   (a) every action the AI executes in a real control battle is on the list
//       for that actor at that moment, and the list the AI read was computed
//       on the state it acted in (the modes' memo is invalidated — Law 8)
//   (b) every entry on the list passes validateAction
//   (c) cooldown, uses and warmup remove an action and restore it
//   (d) a hero case and an enemy case
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as commands from '../src/core/commands.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { attacksOf, grantedActionIds } from '../src/core/action.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { ABILITIES } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

afterEach(() => vi.restoreAllMocks())

type Req = commands.ActionRequest
/** One canonical key per request — key order in the object never matters. */
function keyOf(r: Req): string {
  const aim = 'target' in r ? `target:${r.target}` : 'destination' in r ? `destination:${r.destination}` : 'centre' in r ? `centre:${r.centre}` : `hex:${r.hex}`
  return `${r.actor}|${r.actionId}|${aim}|${r.slot ?? '-'}`
}
const has = (ctx: Ctx, actor: number, actionId: string) => commands.legalActions(ctx, actor).some((r) => r.actionId === actionId)

describe('the action list', () => {
  // One test per control map: the whole panel in one test outran the 5 s budget.
  it.each(MAP_PANEL)('(a)(b)(d) %s: every action the AI takes is on the list, read on the state it acted in, and every entry is legal', (mapId) => {
    const real = commands.legalActions
    const aiReads: { actor: number; seq: number }[] = []
    let checking = false
    const listSpy = vi.spyOn(commands, 'legalActions').mockImplementation((live, actor) => {
      if (!checking) aiReads.push({ actor, seq: live.state.seq })
      return real(live, actor)
    })
    const execute = commands.executeAction
    let checked = 0
    const sides = new Set<string>(), shapes = new Set<string>()
    vi.spyOn(commands, 'executeAction').mockImplementation((live, request) => {
      const r = request as Req
      checking = true
      const list = real(live, r.actor)
      checking = false
      // (a) the action taken is on the list for that actor at that moment
      expect(list.map(keyOf), `${live.state.units[r.actor]!.typeId} ${keyOf(r)}`).toContain(keyOf(r))
      // (a, Law 8) the AI's last read of this actor's list was on this exact state
      const last = aiReads.filter((x) => x.actor === r.actor).at(-1)
      expect(last?.seq, `stale list for ${keyOf(r)}`).toBe(live.state.seq)
      // (b) nothing on the list is refused
      for (const e of list) expect(commands.validateAction(live, e), keyOf(e)).toEqual({ ok: true })
      checked++
      sides.add(String(live.state.units[r.actor]!.side))
      shapes.add('target' in r ? 'target' : 'destination' in r ? 'destination' : 'centre' in r ? 'centre' : 'hex')
      return execute(live, request)
    })
    const ctx = createBattle({ replicate: 0, enemyCount: 8, mapId })
    runBattle(ctx)
    expect(ctx.state.outcome).toBeTruthy()
    expect(listSpy).toHaveBeenCalled()
    expect(checked).toBeGreaterThan(0)
    // (d) heroes and enemies alike; the AI both moves and aims at units
    expect(sides.size).toBeGreaterThanOrEqual(2)
    expect(shapes).toContain('target')
    expect(shapes).toContain('destination')
    // a battle that is over lists nothing for anyone
    vi.restoreAllMocks()
    for (const u of ctx.state.units) expect(commands.legalActions(ctx, u.id), `${mapId} unit ${u.id} after the end`).toEqual([])
  })

  it('(b) at the start of every control battle, every standing unit\'s list is legal, ordered, and a unit that cannot act has none', () => {
    for (const mapId of MAP_PANEL) {
      const ctx = createBattle({ replicate: 0, enemyCount: 8, mapId })
      for (const u of ctx.state.units) {
        beginActivation(ctx, u.id, 'test')
        const list = commands.legalActions(ctx, u.id)
        for (const e of list) {
          expect(e.actor).toBe(u.id)
          expect(commands.validateAction(ctx, e), `${mapId} ${keyOf(e)}`).toEqual({ ok: true })
        }
        // deterministic: the same state lists the same entries in the same order
        expect(commands.legalActions(ctx, u.id)).toEqual(list)
        // declared action order, then the aim in ascending order within an action
        const order = grantedActionIds(ctx, u)
        for (let i = 1; i < list.length; i++) {
          const a = order.indexOf(list[i - 1]!.actionId), b = order.indexOf(list[i]!.actionId)
          expect(a, `${mapId} ${keyOf(list[i]!)}`).toBeLessThanOrEqual(b)
        }
        // no duplicates
        expect(new Set(list.map(keyOf)).size).toBe(list.length)
      }
    }
  })

  it('a downed unit lists nothing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    beginActivation(ctx, 0, 'test')
    expect(commands.legalActions(ctx, 0).length).toBeGreaterThan(0)
    const z = ctx.state.units[1]!
    z.lifeState = 'downed'
    expect(commands.legalActions(ctx, 1)).toEqual([])
  })

  it('(c)(d) enemy: an attack on cooldown leaves the list and returns on the Turn it is ready', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.ghoul', hex: hexId(5, 6) }])
    const w = ctx.state.units[0]!, g = ctx.state.units[1]!
    w.hp = 99; w.maxHp = 99
    const cd = attacksOf(ctx, g).find((a) => (a.cooldown ?? 0) > 0)!
    expect(cd, 'an enemy attack with a cooldown').toBeDefined()
    ctx.state.turn = 1
    beginActivation(ctx, g.id, 'test')
    const use = commands.legalActions(ctx, g.id).find((r) => r.actionId === cd.id && 'target' in r && r.target === w.id)
    expect(use).toBeDefined()
    expect(commands.executeAction(ctx, use!)).toEqual({ ok: true })
    const ready = g.cooldowns[cd.id]!
    expect(ready).toBeGreaterThan(ctx.state.turn + 1)
    for (let t = ctx.state.turn + 1; t <= ready; t++) {
      ctx.state.turn = t
      beginActivation(ctx, g.id, 'test')
      expect(has(ctx, g.id, cd.id), `turn ${t}`).toBe(t >= ready)
    }
  })

  it('(c)(d) hero: a power with uses leaves the list at zero and returns when a use is restored; spent for real, it is gone', () => {
    const potion = Object.values(ABILITIES).find((a) => (a.uses ?? 0) > 0 && a.id.includes('healing-potion'))!
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(15, 15) }])
    const w = ctx.state.units[0]!
    w.actions.push(potion.id); w.usesLeft[potion.id] = 1
    w.hp = 1
    beginActivation(ctx, w.id, 'test')
    expect(has(ctx, w.id, potion.id)).toBe(true)
    w.usesLeft[potion.id] = 0
    expect(has(ctx, w.id, potion.id)).toBe(false)
    w.usesLeft[potion.id] = 1
    expect(has(ctx, w.id, potion.id)).toBe(true)
    const use = commands.legalActions(ctx, w.id).find((r) => r.actionId === potion.id)!
    expect(commands.executeAction(ctx, use)).toEqual({ ok: true })
    expect(has(ctx, w.id, potion.id)).toBe(false)
  })

  it('(c)(d) hero: an action with a warmup is off the list until its Turn, then on it', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.assembled-party')))
    const u = ctx.state.units.find((x) => grantedActionIds(ctx, x).some((id) => (ctx.actions[id]?.warmup ?? 0) > 0))!
    expect(u, 'a fielded unit with a warmup action').toBeDefined()
    const id = grantedActionIds(ctx, u).find((x) => (ctx.actions[x]?.warmup ?? 0) > 0)!
    const ready = u.cooldowns[id]!
    ctx.state.turn = 1
    beginActivation(ctx, u.id, 'test')
    expect(has(ctx, u.id, id)).toBe(false)
    ctx.state.turn = ready
    beginActivation(ctx, u.id, 'test')
    expect(has(ctx, u.id, id)).toBe(true)
  })

  it('movement shapes: a granted walk, flight and leap each list their destinations, and only while ready', () => {
    for (const shape of ['path', 'flight', 'sidestep'] as const) {
      const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(12, 12) }])
      const u = ctx.state.units[0]!
      // the first registry row of that shape that actually moves (ids sorted — Law 6)
      // (capability.charge, 2026-09-27: a charge — move AND attack — walks to a unit, never to a
      // listed destination, so it is not a movement row here; Law 10, the rule is unchanged)
      const id = Object.keys(ctx.actions).sort().find((k) => { const m = ctx.actions[k]!.move; return m?.shape === shape && !ctx.actions[k]!.attack && !(ctx.actions[k]!.effects ?? []).some((e) => e.kind === 'stand') && (shape !== 'sidestep' || (m.stepRange ?? 1) > 1) })!
      expect(id, shape).toBeDefined()
      u.actions = [...u.actions.filter((a) => !ctx.actions[a]?.move), id]
      u.stamina = u.maxStamina
      beginActivation(ctx, u.id, 'test')
      const dests = commands.legalActions(ctx, u.id).filter((r) => r.actionId === id && 'destination' in r)
      expect(dests.length, shape).toBeGreaterThan(0)
      u.cooldowns[id] = ctx.state.turn + 1
      expect(has(ctx, u.id, id), `${shape} on cooldown`).toBe(false)
    }
  })
})
