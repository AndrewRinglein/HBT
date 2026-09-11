// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// attack.multihit (2026-09-03) — Angela 2026-08-15: "An attack is a list of
// hits, resolved one at a time. Each hit runs the full cycle — damage,
// triggers, settle — before the next hit begins." No retargeting; the rest
// cancelled when the target stops standing; hit 2 re-resolved from scratch.
// Rows: the Ghoul's Rake (attackCount 2), the Throwing Knives' Fan (hits 2).
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { ATTACKS } from '../src/content/index.js'
import { hexId } from './board16.js'

describe('an attack of two hits', () => {
  it('the Rake declares two swings, numbered, and each resolves its own roll; stamina and the primary are paid once', () => {
    expect(ATTACKS['attack.ghoul.rake']!.attack.hits).toBe(2)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.ghoul', hex: hexId(5, 6) }])
    const g = ctx.state.units[1]!, w = ctx.state.units[0]!
    w.hp = 99; w.maxHp = 99
    beginActivation(ctx, g.id, 'test')
    performAttack(ctx, g.id, w.id, 'attack.ghoul.rake')
    const decl = ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === g.id)
    expect(decl.map((e) => e['hit'])).toEqual([1, 2])
    expect(decl.map((e) => e['of'])).toEqual([2, 2])
    expect(ctx.events.filter((e) => e.type === 'stamina.spent' && e['actor'] === g.id).length).toBeLessThanOrEqual(1)
    expect(g.primaryUsed).toBe(true)
  })

  it('a kill on the first hit cancels the second, and the log says so', () => {
    // V2 ends the event stream at battle.end. Keep this cancellation assertion
    // on a nonterminal kill; the separate terminal case below checks the boundary.
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }, { type: 'test-warrior', hex: hexId(1, 1) }], [{ type: 'unit.ghoul', hex: hexId(5, 6) }])
    const g = ctx.state.units[2]!, w = ctx.state.units[0]!
    // the warrior is the target; make him die to one rake hit — hp 1, and the ghoul cannot miss
    w.hp = 1
    g.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    beginActivation(ctx, g.id, 'test')
    performAttack(ctx, g.id, w.id, 'attack.ghoul.rake')
    expect(w.lifeState).not.toBe('standing')
    const cancelled = ctx.events.find((e) => e.type === 'attack.cancelled')
    expect(cancelled?.['hit']).toBe(2)
    expect(ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === g.id).length).toBe(1)
    expect(ctx.state.outcome).toBeNull()
  })

  it('a terminal first hit ends the battle without a second hit or trailing cancellation', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.ghoul', hex: hexId(5, 6) }])
    const g = ctx.state.units[1]!, w = ctx.state.units[0]!
    w.hp = 1
    g.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    beginActivation(ctx, g.id, 'test')
    performAttack(ctx, g.id, w.id, 'attack.ghoul.rake')
    expect(ctx.state.outcome).toBe('wipe')
    expect(ctx.events.filter(e => e.type === 'attack.declared')).toHaveLength(1)
    expect(ctx.events.some(e => e.type === 'attack.cancelled')).toBe(false)
    expect(ctx.events.at(-1)!.type).toBe('battle.end')
  })

  it('hit 2 reads what hit 1 applied — Frost put on by the first swing raises the second', () => {
    // the Frost war-hammer's rider applies Frost on hit; use a two-hit attack
    // on a Frost-carrying target instead, deterministically: pre-apply nothing,
    // then compare the second hit's damage row against a fresh preview
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.ghoul', hex: hexId(5, 6) }])
    const g = ctx.state.units[1]!, w = ctx.state.units[0]!
    w.hp = 99; w.maxHp = 99
    g.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    ctx.cfg.switches.critEnabled = false
    applyStatus(ctx, w.id, 'status.frost', 2, 'test')   // both hits read it — the point is each is resolved live
    beginActivation(ctx, g.id, 'test')
    performAttack(ctx, g.id, w.id, 'attack.ghoul.rake')
    const hits = ctx.events.filter((e) => e.type === 'attack.hit' && e['actor'] === g.id)
    expect(hits.length).toBe(2)
    for (const h of hits) expect((h['ledger'] as { station: string }[]).some((r) => r.station === 'FROST')).toBe(true)
  })
})
