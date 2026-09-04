// fix.unit-tags (2026-09-03, Law 11) — one field for what a unit IS.
//
// UnitDef carried BOTH `attributes` and `tags`. Content filled `attributes`
// (zombie: ['undead']); every reader — target.ts requireTags, the planned
// VS_TARGET station — read `tags`; no row set it. So "target undead" found no
// zombies. `attributes` is gone; `tags` is the field, on every row, from the
// converter. The receptacle golem's `trigger.test-tags.grave-rot` is the first
// type-filtered rider that DEPENDS on it.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { resolveTargets } from '../src/core/target.js'
import { UNITS } from '../src/content/index.js'
import { hexId } from './board16.js'

const ROT = 'trigger.test-tags.grave-rot'

describe('tags is the one field', () => {
  it('no row in the pack carries `attributes`; every row carries `tags`', () => {
    for (const [id, d] of Object.entries(UNITS)) {
      expect((d as unknown as Record<string, unknown>)['attributes'], `${id} has no attributes field`).toBeUndefined()
      expect(Array.isArray(d.tags), `${id} carries tags`).toBe(true)
    }
  })

  it('resolveTargets with requireTags:["undead"] returns the zombies — the backlog row\'s own expect', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-arc-golem', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 6) }, { type: 'test-zombie', hex: hexId(6, 6) }],
    )
    const golem = ctx.state.units[0]!
    const got = resolveTargets(ctx, golem, { select: 'area', side: 'enemy', radius: 3, requireTags: ['undead'] }, golem.id)
    expect(got).toEqual([1, 2])
    expect(resolveTargets(ctx, golem, { select: 'area', side: 'enemy', radius: 3, requireTags: ['demon'] }, golem.id)).toEqual([])
  })

  it('a type-filtered rider read off the row fires on undead and never on a non-undead target', () => {
    const t = UNITS['test-arc-golem']!.triggers?.find((x) => x.id === ROT)
    expect(t, 'the rider is on the golem').toBeDefined()
    const ctx = createCustomBattle(
      [{ type: 'test-arc-golem', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 6) }],
    )
    runBattle(ctx)
    const fired = ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === ROT)
    expect(fired.length, 'the golem struck the zombie and the rider fired').toBeGreaterThan(0)
    for (const e of fired) expect(ctx.state.units[e['target'] as number]!.tags).toContain('undead')
  })
})
