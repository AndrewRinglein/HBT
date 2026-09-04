// capability.target-stamina-loss (2026-09-03) — ENEMY-REVIEW P8, ruled
// 2026-08-23: "the existing stamina loss, aimed at a target instead of paid as
// a cost. Same loss, normal recovery — one mechanism, new direction." The
// Ghoul's Shriek and the Necromancer's Necro Bolt carry it.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { UNITS } from '../src/content/index.js'
import { hexId } from './board16.js'

describe('a hit drains the target\'s stamina', () => {
  it('the Necro Bolt takes 1 Stamina off the hero it hits, floors at 0, and the ledger names the trigger', () => {
    const t = UNITS['unit.necromancer']!.triggers!.find((x) => x.effect.kind === 'stamina.drain')!
    expect(t.onlyWithAttack).toBe('attack.necromancer.necro-bolt')
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.necromancer', hex: hexId(5, 9) }])
    const w = ctx.state.units[0]!, n = ctx.state.units[1]!
    n.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    w.hp = 99; w.maxHp = 99
    const before = w.stamina
    beginActivation(ctx, n.id, 'test')
    performAttack(ctx, n.id, w.id, 'attack.necromancer.necro-bolt')
    expect(w.stamina).toBe(before - (t.effect as { value: number }).value)
    expect(ctx.events.some((e) => e.type === 'stamina.drained' && e.causeId === t.id)).toBe(true)
    w.stamina = 0
    beginActivation(ctx, n.id, 'test')
    performAttack(ctx, n.id, w.id, 'attack.necromancer.necro-bolt')
    expect(w.stamina).toBe(0)
  })
  it('the Ghoul\'s Shriek carries it too — the second row, pure data', () => {
    expect(UNITS['unit.ghoul']!.triggers!.some((x) => x.effect.kind === 'stamina.drain' && x.onlyWithAttack === 'attack.ghoul.shriek')).toBe(true)
  })
})
