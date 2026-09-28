// capability.placed-remains (2026-09-28): bodies an encounter lays on the board at setup
// (DECISIONS.md 2026-09-28 "Gates is the Curse; the Cathedral has a Necromancer raising the dead":
// the Cathedral's remains are raisable corpses). They are the SAME board objects capability.corpses
// makes (CODEX.md 1834, the universal corpse rule) — raised by the Necromancer's Raise, eaten by the
// Ghoul's Eat Corpse. The ground under them is cursed (layer.weak, the row's `paint`), and it stays
// when the body is raised or eaten (ruled: "When the body is raised, the cursed ground stays").
// Authored in content as the setup entry content already wrote: `{ corpses, id, typeId, hexes }`.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { executeAction } from '../src/core/commands.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { UNITS } from '../src/content/index.js'
import { layerOfId } from '../src/content/maps.js'
import type { Ctx } from '../src/core/types.js'

const field = (scenario: string) => createBattle(scenarioOptions(scenarioDef(scenario)))
const WEAK = layerOfId('layer.weak')

describe('capability.placed-remains — an encounter\'s bodies, laid at setup', () => {
  it('three placed remains field three corpses on their hexes, corpse.created naming the encounter', () => {
    const ctx = field('test.placed-remains-a')
    const row = encounterDef('test.encounter.placed-remains-a').remains!
    expect(row.map((r) => [r.id, r.typeId, r.hexes.length])).toEqual([['test.remains.chapel', 'unit.zombie', 3]])
    const made = ctx.events.filter((e) => e.type === 'corpse.created')
    expect(made.map((e) => [e.causeId, e['remains'], e['hex'], e['typeId'], e['side'], e['of']]))
      .toEqual(row[0]!.hexes.map((h) => ['test.encounter.placed-remains-a', 'test.remains.chapel', h, 'unit.zombie', 'enemy', null]))
    expect(ctx.state.corpses!.map((c) => c.hex)).toEqual(row[0]!.hexes)
    // no body's identity is a unit's
    const uids = new Set(ctx.state.units.map((u) => u.uid))
    for (const c of ctx.state.corpses!) expect(uids.has(c.uid)).toBe(false)
    for (const h of row[0]!.hexes) expect(ctx.state.layers![h]).toBe(WEAK)
  })

  it('the Necromancer in reach raises them, and each raised body\'s hex stays cursed ground', () => {
    const ctx = field('test.placed-remains-a')
    runBattle(ctx)
    const hexes = encounterDef('test.encounter.placed-remains-a').remains![0]!.hexes
    const raised = ctx.events.filter((e) => e.type === 'corpse.removed' && e['how'] === 'raised')
    expect(raised.length).toBeGreaterThan(0)
    for (const e of raised) {
      expect(e.causeId).toBe('trigger.necromancer.raise')
      expect(hexes).toContain(e['hex'])
      expect(ctx.state.layers![e['hex'] as number]).toBe(WEAK)
    }
    expect(ctx.events.filter((e) => e.type === 'unit.raised').map((e) => e['hex'])).toEqual(raised.map((e) => e['hex']))
  })

  it('a Ghoul eats one, healing the row\'s numbers, and its hex stays cursed ground', () => {
    const ctx = field('test.placed-remains-b')
    const ghoul = ctx.state.units.find((u) => u.typeId === 'unit.ghoul')!
    ghoul.hp = 2 // wounded, so the heal shows whole
    let ate = false
    while (true) {
      const next = advanceBattle(ctx)
      if (next.kind === 'complete') break
      if (next.actor === ghoul.id && !ate) {
        expect(executeAction(ctx, { actor: ghoul.id, actionId: 'power.ghoul.eat-corpse', target: ghoul.id })).toEqual({ ok: true })
        ate = true
        completeActionCycle(ctx)
        break
      }
      runActivation(ctx, next.actor)
      completeActionCycle(ctx)
    }
    expect(ate).toBe(true)
    const eaten = ctx.events.find((e) => e.type === 'corpse.eaten')!
    const removed = ctx.events.find((e) => e.type === 'corpse.removed' && e['how'] === 'eaten')!
    expect(encounterDef('test.encounter.placed-remains-b').remains![0]!.hexes).toContain(removed['hex'])
    expect(eaten['of']).toBe('unit.skeleton')
    // the row's numbers (power.ghoul.eat-corpse: heal 5, +2 Max Health)
    const heal = ctx.events.find((e) => e.type === 'heal.applied' && e.causeId === 'power.ghoul.eat-corpse')!
    expect(heal['amount']).toBe(5)
    expect(ghoul.maxHp).toBe(UNITS['unit.ghoul']!.maxHp + 2)
    expect(ctx.state.layers![removed['hex'] as number]).toBe(WEAK)
    expect(ctx.state.corpses!.length).toBe(1)
  })

  it('a placed remain on a hex no unit can stand on is a loud error', () => {
    const enc = encounterDef('test.encounter.placed-remains-b')
    const opts = scenarioOptions(scenarioDef('test.placed-remains-b'))
    const walled = { ...enc, remains: [{ ...enc.remains![0]!, hexes: [0] }] }
    const map = { id: 'test.map.journey-20x10', name: 'walled', note: 'a TEST map with an obstacle at hex 0', rows: ['x' + '.'.repeat(19), ...Array(9).fill('.'.repeat(20))] }
    expect(() => createBattle({ ...opts, map, encounter: walled })).toThrow(/impassable/)
  })

  it('the second instance is pure data: two rows, two encounters, one mechanism', () => {
    const b = encounterDef('test.encounter.placed-remains-b').remains!
    expect(b.map((r) => [r.id, r.typeId, r.hexes.length])).toEqual([['test.remains.yard', 'unit.skeleton', 2]])
    const ctx: Ctx = field('test.placed-remains-b')
    expect(ctx.events.filter((e) => e.type === 'corpse.created').map((e) => e['remains'])).toEqual(['test.remains.yard', 'test.remains.yard'])
  })
})
