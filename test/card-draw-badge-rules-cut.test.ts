// content.card-draw-badge-rules-cut (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'Knocked Sprawling knocks Prone and
// takes no Surge; the Bleeding crit is 4 Bleed; the card-draw badge rules are cut for now'), asked whether the badges that
// speak of drawing cards belong to a card system or are leftovers: "We may add a card system at some point, but you can cut
// all those for now." Five rows carried such a clause - Anguish, Possession, Quick Study, Wise, Old - and the engine named
// each as a rule it did not read. The clause is gone from each; Possession and Old keep their other rules; Anguish and Wise,
// which had nothing else, stay as empty rows until there is a card system (SWITCHES.md cardBadgesEmptied).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { grantBadge } from '../src/core/mutate.js'
import { BADGES } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

const CARD = /card draw|\bdraw\b|draws? a card/i
const said = (b: unknown) => JSON.stringify(b, (k, v) => (k === 'id' ? undefined : v))

describe('the rows', () => {
  it('no badge of the registry speaks of drawing a card', () => {
    expect(Object.values(BADGES).filter((b) => CARD.test(said(b))).map((b) => b.id)).toEqual([])
  })
  it('Possession keeps its other rules: its stats, its Deathbed line, its deploy cost, its 0-Health rule and its drawbacks', () => {
    const b = BADGES['badge.possession']! as unknown as { statModifiers: Record<string, number>; deathbedFighting: number; gaps: string[]; atZero: { raises: string }; drawbacks: { mods: string[]; gaps: string[] } }
    expect(b.statModifiers).toEqual({ magic: 2, resist: 1, vision: 3, surge: -10 })
    expect(b.deathbedFighting).toBe(-10)
    expect(b.gaps).toEqual(['deploying the hero costs 3 Mana'])
    expect(b.drawbacks).toEqual({ mods: ['surge'], gaps: ['deploying the hero costs 3 Mana'] })
    expect(b.atZero.raises).toBe('unit.ghost')
  })
  it('Old keeps its losses and its Item Slots line; Quick Study keeps its Surge and names nothing unread', () => {
    expect(BADGES['badge.old']).toMatchObject({ statModifiers: { maxHp: -1, movement: -1 }, gaps: ['+2 Item slots'] })
    expect(BADGES['badge.quick-study']).toMatchObject({ statModifiers: { surge: 1 } })
    expect(BADGES['badge.quick-study']!.gaps ?? []).toEqual([])
  })
  it('Anguish and Wise had no rule but the card draw: each is a row with nothing on it', () => {
    for (const id of ['badge.anguish', 'badge.wise']) expect(BADGES[id], id).toMatchObject({ statModifiers: {}, grants: [], flags: {}, gaps: ['no payload'] })
  })
})

describe('in a battle', () => {
  it('a hero gaining Possession: the line names no card, and its one written drawback is the deploy cost', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(12, 12) }])
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    expect(grantBadge(ctx, hero.id, 'badge.possession', 'test.affliction')).toBe(true)
    const e = ctx.events.find((x) => x.type === 'badge.gained' && x['badgeId'] === 'badge.possession')!
    expect(CARD.test(JSON.stringify(e))).toBe(false)
    expect(e['gaps']).toEqual(['deploying the hero costs 3 Mana'])
    expect(e['drawbacks']).toEqual({ mods: ['surge'], gaps: ['deploying the hero costs 3 Mana'] })
  })
  it('test.afflictions-at-zero-rule: the possessed warrior is fielded with the badge and falls by its 0-Health rule, and no line of the Battle speaks of a card', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.afflictions-at-zero-rule']!))
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'unit.badged' && JSON.stringify(e).includes('badge.possession'))).toBe(true)
    expect(ctx.events.filter((e) => CARD.test(JSON.stringify(e)))).toEqual([])
  })
})
