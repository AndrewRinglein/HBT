// content.ghost (2026-09-29, Andrew, DECISIONS.md 'the Ghost as the bestiary has it; Cold Resist; ...'): "Should the Ghost
// go in with its bestiary numbers as-is (4 Strength, 5 Precision, 4 Health, 10 Dodge, Movement 5, Possess at 25%) ...?"
// — "Yes." · "Ghost should inflict possession". · content.ghost-possess-on-attack (2026-09-29): "We should move it to a
// chance on attack. Let's give it a 15% chance on attack." — Possess (0 damage, nothing else) dropped.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { effective } from '../src/core/stats.js'
import { ACTIONS, UNITS } from '../src/content/index.js'
import { hexId } from './board16.js'

describe('the Ghost, as the bestiary has it', () => {
  // LAW 10 — content.ghost-possess-on-attack: the rider moved from Possess (25%) to Attack (15%) and Possess is dropped.
  // was: 'its row: … and Possess that deals 0' · attacks [attack, possess] · trigger onlyWithAttack possess, chance 25
  it('its row: the ported numbers, flight, and one magic-typed Attack on Strength that possesses on 15% of hits', () => {
    const g = UNITS['unit.ghost']!
    expect({ maxHp: g.maxHp, strength: g.strength, precision: g.precision, armor: g.armor, resist: g.resist, dodge: g.dodge, accuracy: g.accuracy, movement: g.movement })
      .toEqual({ maxHp: 4, strength: 4, precision: 5, armor: 0, resist: 0, dodge: 10, accuracy: 85, movement: 5 })
    expect(g.moves).toEqual(['power.flight'])
    expect(g.attacks).toEqual(['attack.ghost.attack'])
    expect(ACTIONS['attack.ghost.attack']!.attack).toMatchObject({ damageType: 'magic', stat: 'strength', bonus: 0 })
    expect(ACTIONS['attack.ghost.possess']).toBeUndefined()
    const t = (g.triggers ?? []).find((x) => x.effect.kind === 'badge.grant')!
    expect(t).toMatchObject({ hook: 'onHit', chance: 15, onlyWithAttack: 'attack.ghost.attack', effect: { kind: 'badge.grant', badgeId: 'badge.possession' } })
  })

  // was: 'Possess: a hit deals nothing, and one in four possesses …' — the Attack deals its Strength now; the claim about Possession is unchanged
  it('Attack: a hit that possesses gives +2 Magic now and leaves the −10 Surge for the next battle', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.ghost', hex: hexId(5, 6) }], { cfg: { switches: { critEnabled: false } as never } })
    const w = ctx.state.units[0]!, g = ctx.state.units[1]!
    g.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
    w.hp = 999; w.maxHp = 999
    const magic0 = effective(ctx, w, 'magic').value, surge0 = w.surge
    for (let i = 0; i < 80 && !w.badges.includes('badge.possession'); i++) { beginActivation(ctx, g.id, 'test'); performAttack(ctx, g.id, w.id, 'attack.ghost.attack') }
    expect(w.badges).toContain('badge.possession')
    expect(effective(ctx, w, 'magic').value).toBe(magic0 + 2)
    expect(w.surge).toBe(surge0)
    expect(ctx.events.find((e) => e.type === 'badge.gained' && e['badgeId'] === 'badge.possession')!['atFielding']).toEqual({ surge: -10 })
  })
})
