// capability.stealth (2026-09-28; ruled 2026-09-27, Andrew, DECISIONS.md "stealth
// gets a Codex row and its own backlog item"). Stealth as the Codex settled it
// (CODEX.md 475, 1589): "you cannot be seen and cannot be targeted by an attack.
// Area effects, terrain and auras all still reach you. It breaks the moment you use
// an attack or a power, and whenever a reveal effect finds you — moving never breaks it."
//
// The item's expect, one block each:
//   1. the Codex row compiles through the pack, not a hand-written status
//   2. a stealthed unit cannot be attacked by the other side
//   3. but is still reached by an area effect
//   4. it breaks when its carrier attacks or uses a power, and not when it moves
//   5. a reveal effect breaks it on every enemy in its radius and none outside
// Plus the second instance, test.status.cloak (content/test/statuses.json: the same
// flags as data, minus breaking on a power, with a clock), and both live in a real
// battle (test.stealth-a / -b). The engine names neither status. The defaults taken
// are SWITCHES.md "Stealth".
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { canAttack } from '../src/core/pipeline.js'
import { canUsePower } from '../src/core/ability.js'
import { previewBurst } from '../src/core/burst.js'
import { executeAction, legalActions, validateAction } from '../src/core/commands.js'
import { packStatuses } from '../src/content/pack.js'
import { STATUSES } from '../src/content/statuses.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, Event, Unit } from '../src/core/types.js'
import { hexId, neighbours } from './board16.js'

const STEALTH = 'status.stealth'
const CLOAK = 'test.status.cloak'
const AXE = 'attack.test-warrior.axe'
const BITE = 'attack.test-zombie.bite'
const BOLT = 'power.test-mage.bolt'
const WIND = 'power.test-second-wind'
const FLAME = 'power.test-burst-flame'
const LANTERN = 'power.test-lantern'

type SettledRow = { id: string; name: string; shape: string; effect: string; decay: string }
const SETTLED = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'settled.json'), 'utf8')) as { statuses: SettledRow[] }
const CODEX_MD = readFileSync(join(__dirname, '..', '..', 'CODEX.md'), 'utf8')

const holds = (u: Unit, id: string) => u.statuses.some((s) => s.id === id && s.value > 0)
const broke = (evs: readonly Event[], target: number, id: string) =>
  evs.filter((e) => e.type === 'status.expired' && e.target === target && e['statusId'] === id && e['broken'] !== undefined)

/** Osric beside a zombie, a second zombie six hexes off; everyone deep in Health; Turn 1. */
function field() {
  const z0 = hexId(8, 8)
  const ctx = createCustomBattle(
    [{ type: 'test-osric', hex: neighbours(z0)[0]! }],
    [{ type: 'test-zombie', hex: z0 }, { type: 'test-zombie', hex: hexId(8, 14) }])
  ctx.state.turn = 1
  const [osric, zombie, far] = [ctx.state.units[0]!, ctx.state.units[1]!, ctx.state.units[2]!]
  for (const u of ctx.state.units) { u.hp = u.maxHp = 999; u.stamina = u.maxStamina = Math.max(u.maxStamina, 9) }
  return { ctx, osric, zombie, far }
}
function act(ctx: Ctx, actor: number, request: Record<string, unknown>): Event[] {
  const from = ctx.events.length
  const r = executeAction(ctx, { actor, ...request })
  expect(r).toEqual({ ok: true })
  return ctx.events.slice(from)
}

describe('1. the Codex row compiles through the pack, not a hand-written status', () => {
  it('status.stealth is a Codex row whose sentence is the settled definition, word for word', () => {
    const row = SETTLED.statuses.find((r) => r.id === STEALTH)!
    expect(row).toBeDefined()
    // CODEX.md 475 and 1589 — the definition the row copies ("Copy, don't invent")
    expect(CODEX_MD).toContain('you cannot be seen and cannot be targeted by an attack. Area effects, terrain and auras all still reach you. It breaks the moment you use an attack or a power, and whenever a reveal effect finds you — moving never breaks it')
    expect(row.effect.toLowerCase()).toContain('you cannot be seen and cannot be targeted by an attack. area effects, terrain and auras all still reach you. it breaks the moment you use an attack or a power, and whenever a reveal effect finds you — moving never breaks it')
  })
  it('the converter compiled it to behaviour flags, in the generated pack', () => {
    expect(packStatuses()[STEALTH]).toMatchObject({ shape: 'flag', decayPerPhase: 0,
      hidesFromFoes: true, untargetable: true, breaksOnAttack: true, breaksOnPower: true, breaksOnReveal: true })
    expect(STATUSES[STEALTH]).toEqual(packStatuses()[STEALTH])
  })
  it('the second instance is data: the Cloak carries the same flags but does not break on a power, and has a clock', () => {
    expect(STATUSES[CLOAK]).toMatchObject({ shape: 'flag', decayPerPhase: 1,
      hidesFromFoes: true, untargetable: true, breaksOnAttack: true, breaksOnReveal: true })
    expect(STATUSES[CLOAK]!.breaksOnPower).toBeUndefined()
  })
})

describe.each([[STEALTH], [CLOAK]])('2. %s — cannot be targeted by an attack of the other side', (sid) => {
  it('the zombie beside Osric may bite him; stealthed, it may not — legality, list and command agree', () => {
    const { ctx, osric, zombie } = field()
    expect(canAttack(ctx, zombie.id, osric.id, BITE)).toBe(true)
    applyStatus(ctx, osric.id, sid, 1, 'test')
    expect(canAttack(ctx, zombie.id, osric.id, BITE)).toBe(false)
    beginActivation(ctx, zombie.id, 'test')
    expect(legalActions(ctx, zombie.id).filter((r) => 'target' in r && r.target === osric.id)).toEqual([])
    expect(validateAction(ctx, { actor: zombie.id, actionId: BITE, target: osric.id })).toEqual({ ok: false, reason: 'illegal-target-or-action' })
  })
  it('and a power aimed at him is refused too; his own side may still aim at him', () => {
    const { ctx, osric, zombie } = field()
    zombie.actions.push(BOLT)
    expect(canUsePower(ctx, zombie.id, osric.id, BOLT)).toBe(true)
    applyStatus(ctx, osric.id, sid, 1, 'test')
    expect(canUsePower(ctx, zombie.id, osric.id, BOLT)).toBe(false)
    osric.actions.push(WIND)
    expect(canUsePower(ctx, osric.id, osric.id, WIND)).toBe(true)
  })
  it('an enemy under it cannot be hit by the hero either — the rule is the side, not the name', () => {
    const { ctx, osric, zombie } = field()
    expect(canAttack(ctx, osric.id, zombie.id, AXE)).toBe(true)
    applyStatus(ctx, zombie.id, sid, 1, 'test')
    expect(canAttack(ctx, osric.id, zombie.id, AXE)).toBe(false)
  })
  it('a unit that leaves his zone draws no attack of opportunity from him while it is hidden', () => {
    for (const hidden of [false, true]) {
      const { ctx, osric, zombie } = field()
      if (hidden) applyStatus(ctx, zombie.id, sid, 1, 'test')
      beginActivation(ctx, zombie.id, 'test')
      const away = legalActions(ctx, zombie.id).find((r) => 'destination' in r && ctx.geo.distance(r.destination, osric.hex) >= 3)!
      expect(away).toBeDefined()
      const evs = act(ctx, zombie.id, { actionId: away.actionId, destination: (away as { destination: number }).destination })
      const swings = evs.filter((e) => e.type === 'attack.declared' && e.actor === osric.id)
      expect(swings.length > 0).toBe(!hidden)
    }
  })
})

describe('3. area effects still reach a stealthed unit', () => {
  it.each([[STEALTH], [CLOAK]])('%s: a burst centred beside it strikes it all the same', (sid) => {
    const { ctx, osric, zombie } = field()
    osric.actions.push(FLAME)
    applyStatus(ctx, zombie.id, sid, 1, 'test')
    const centre = neighbours(zombie.hex).find((h) => h !== osric.hex && !ctx.state.units.some((u) => u.hex === h))!
    const p = previewBurst(ctx, osric.id, centre, FLAME)
    expect(p.targets.map((t) => t.id)).toContain(zombie.id)
    beginActivation(ctx, osric.id, 'test')
    const evs = act(ctx, osric.id, { actionId: FLAME, centre })
    expect(evs.some((e) => e.type === 'burst.struck' && e.target === zombie.id)).toBe(true)
    // the struck zombie is still hidden: being reached is not a reveal
    expect(holds(zombie, sid)).toBe(true)
  })
})

describe('4. it breaks when its carrier attacks or uses a power, and not when it moves', () => {
  it.each([[STEALTH], [CLOAK]])('%s: moving never breaks it', (sid) => {
    const { ctx, osric } = field()
    applyStatus(ctx, osric.id, sid, 1, 'test')
    beginActivation(ctx, osric.id, 'test')
    const step = legalActions(ctx, osric.id).find((r) => 'destination' in r)!
    const evs = act(ctx, osric.id, { actionId: step.actionId, destination: (step as { destination: number }).destination })
    expect(evs.some((e) => e.type === 'move.begin' || e.type === 'unit.moved' || e.type === 'move.step')).toBe(true)
    expect(holds(osric, sid)).toBe(true)
    expect(broke(ctx.events, osric.id, sid)).toEqual([])
  })
  it.each([[STEALTH], [CLOAK]])('%s: an attack breaks it the moment it is declared, the attack named as the cause', (sid) => {
    const { ctx, osric, zombie } = field()
    applyStatus(ctx, osric.id, sid, 1, 'test')
    beginActivation(ctx, osric.id, 'test')
    const evs = act(ctx, osric.id, { actionId: AXE, target: zombie.id })
    const b = broke(evs, osric.id, sid)
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ causeId: AXE, broken: 'attack' })
    const declared = evs.findIndex((e) => e.type === 'attack.declared' && e.actor === osric.id)
    expect(declared).toBeGreaterThan(evs.indexOf(b[0]!))
    expect(holds(osric, sid)).toBe(false)
    // and he is a target again
    expect(canAttack(ctx, zombie.id, osric.id, BITE)).toBe(true)
  })
  it('status.stealth breaks on a power, the power named as the cause', () => {
    const { ctx, osric } = field()
    osric.actions.push(WIND)
    applyStatus(ctx, osric.id, STEALTH, 1, 'test')
    beginActivation(ctx, osric.id, 'test')
    const evs = act(ctx, osric.id, { actionId: WIND, target: osric.id })
    expect(broke(evs, osric.id, STEALTH)).toEqual([expect.objectContaining({ causeId: WIND, broken: 'power' })])
    expect(holds(osric, STEALTH)).toBe(false)
  })
  it('the Cloak does not break on a power — the flag is the row\'s, not the engine\'s', () => {
    const { ctx, osric } = field()
    osric.actions.push(WIND)
    applyStatus(ctx, osric.id, CLOAK, 1, 'test')
    beginActivation(ctx, osric.id, 'test')
    const evs = act(ctx, osric.id, { actionId: WIND, target: osric.id })
    expect(evs.some((e) => e.type === 'power.used' && e.actor === osric.id)).toBe(true)
    expect(broke(evs, osric.id, CLOAK)).toEqual([])
    expect(holds(osric, CLOAK)).toBe(true)
  })
  it('status.stealth has no clock: End of Phase leaves it', () => {
    const { ctx, osric } = field()
    applyStatus(ctx, osric.id, STEALTH, 1, 'test')
    applyStatus(ctx, osric.id, CLOAK, 1, 'test')
    // the ladder's decay, as tickStatuses runs it for the hero side
    return import('../src/core/status.js').then(({ tickStatuses }) => {
      tickStatuses(ctx, 'hero')
      expect(holds(osric, STEALTH)).toBe(true)
      expect(holds(osric, CLOAK)).toBe(false)
    })
  })
})

describe('5. a reveal effect breaks it on every enemy in its radius and none outside', () => {
  /** Osric with the Lantern (radius 3), stealthed zombies at 2, 3 and 4 hexes, a stealthed ally beside him. */
  function lit() {
    const o = hexId(4, 8)
    const ctx = createCustomBattle(
      [{ type: 'test-osric', hex: o }, { type: 'test-osric', hex: hexId(4, 9) }],
      [{ type: 'test-zombie', hex: hexId(6, 8) }, { type: 'test-zombie', hex: hexId(7, 8) }, { type: 'test-zombie', hex: hexId(8, 8) }])
    ctx.state.turn = 1
    const [osric, ally, z2, z3, z4] = ctx.state.units as Unit[]
    expect([z2, z3, z4].map((z) => ctx.geo.distance(o, z!.hex))).toEqual([2, 3, 4])
    for (const u of ctx.state.units) { u.hp = u.maxHp = 999; u.stamina = u.maxStamina = 9 }
    osric!.actions.push(LANTERN)
    applyStatus(ctx, ally!.id, STEALTH, 1, 'test')
    applyStatus(ctx, z2!.id, STEALTH, 1, 'test')
    applyStatus(ctx, z3!.id, CLOAK, 1, 'test')
    applyStatus(ctx, z4!.id, STEALTH, 1, 'test')
    return { ctx, osric: osric!, ally: ally!, z2: z2!, z3: z3!, z4: z4! }
  }
  it('the zombies at 2 and 3 are revealed, the one at 4 is not, and his own side keeps its stealth', () => {
    const { ctx, osric, ally, z2, z3, z4 } = lit()
    beginActivation(ctx, osric.id, 'test')
    const evs = act(ctx, osric.id, { actionId: LANTERN, target: osric.id })
    expect(broke(evs, z2.id, STEALTH)).toEqual([expect.objectContaining({ causeId: LANTERN, broken: 'reveal' })])
    expect(broke(evs, z3.id, CLOAK)).toEqual([expect.objectContaining({ causeId: LANTERN, broken: 'reveal' })])
    expect(holds(z2, STEALTH)).toBe(false)
    expect(holds(z3, CLOAK)).toBe(false)
    expect(holds(z4, STEALTH)).toBe(true)
    expect(holds(ally, STEALTH)).toBe(true)
    // revealed, they are targets like anything else
    expect(canAttack(ctx, ally.id, z2.id, AXE) || ctx.geo.distance(ally.hex, z2.hex) > 1).toBe(true)
  })
  it('a reveal is not an attack: a status that does not break on reveal survives it', () => {
    const { ctx, osric, z2 } = lit()
    applyStatus(ctx, z2.id, 'test.status.shroud', 1, 'test')
    beginActivation(ctx, osric.id, 'test')
    act(ctx, osric.id, { actionId: LANTERN, target: osric.id })
    expect(holds(z2, 'test.status.shroud')).toBe(true)
  })
})

describe('in a real battle, both instances from the rows (startOfBattle, content/test/units.json)', () => {
  it('test.stealth-a: the zombie never bites Stealthed Osric until he breaks it with an attack of his own', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.stealth-a']!))
    runBattle(ctx)
    const hid = ctx.state.units.find((u) => u.typeId === 'test-stealthed-osric')!.id
    const zombieId = ctx.state.units.find((u) => u.typeId === 'test-zombie')!.id
    const on = ctx.events.findIndex((e) => e.type === 'status.applied' && e['statusId'] === STEALTH && e.target === hid)
    expect(on).toBeGreaterThanOrEqual(0)
    const off = ctx.events.findIndex((e) => e.type === 'status.expired' && e['statusId'] === STEALTH && e.target === hid)
    expect(off).toBeGreaterThan(on)
    expect(ctx.events[off]).toMatchObject({ broken: 'attack' })
    const held = ctx.events.slice(on, off)
    expect(held.filter((e) => e.type === 'attack.declared' && e.actor === zombieId && e.target === hid)).toEqual([])
    // he walked while hidden, and the walk did not break it
    expect(held.some((e) => e.actor === hid && (e.type === 'move.begin' || e.type === 'unit.moved'))).toBe(true)
  })
  it('test.stealth-b: Osric never swings at the Cloaked Zombie while the Cloak holds', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.stealth-b']!))
    runBattle(ctx)
    const osricId = ctx.state.units.find((u) => u.typeId === 'test-osric')!.id
    const cloaked = ctx.state.units.find((u) => u.typeId === 'test-cloaked-zombie')!.id
    const on = ctx.events.findIndex((e) => e.type === 'status.applied' && e['statusId'] === CLOAK && e.target === cloaked)
    expect(on).toBeGreaterThanOrEqual(0)
    const off = ctx.events.findIndex((e) => e.type === 'status.expired' && e['statusId'] === CLOAK && e.target === cloaked)
    const held = ctx.events.slice(on, off < 0 ? undefined : off)
    expect(held.filter((e) => e.type === 'attack.declared' && e.actor === osricId && e.target === cloaked)).toEqual([])
    expect(ctx.events.filter((e) => e.type === 'attack.declared' && e.actor === osricId).length).toBeGreaterThan(0)
  })
})
