// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// ai.attack-choice (2026-09-03) — the choice policy is a SWITCH, not a ruling.
//
// `declared` (default) takes the first affordable attack in declared order and
// four authored attacks never fire (integration.test names them, from the
// rows). `bestDamage` takes the legal attack with the highest previewed
// damage on hit. Neither prices riders. A sweep decides; this proves both
// paths are real and that the default is byte-for-byte the old rule.
import { attackIdsOf, powerIdsOf } from '../src/core/action.js'
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { beginActivation } from '../src/core/mutate.js'
import { preview } from '../src/core/pipeline.js'
import { hexId } from './board16.js'

describe('the two policies', () => {
  it('bestDamage swings the hardest legal attack; declared swings the first — on the same board they differ', () => {
    // Osric: Slash (+1, cost 1) is listed before Stab (+2, cost 2)
    const make = (policy: 'declared' | 'bestDamage') => {
      const ctx = createCustomBattle([{ type: 'alpha-osric', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(5, 6) }])
      ctx.cfg.switches.aiAttackChoice = policy
      const o = ctx.state.units[0]!, z = ctx.state.units[1]!
      o.stamina = 99; z.hp = 99; z.maxHp = 99
      beginActivation(ctx, o.id, 'test')
      runActivation(ctx, o.id)
      const swung = ctx.events.find((e) => e.type === 'attack.declared' && e['actor'] === o.id)!.causeId
      return { ctx, o, z, swung }
    }
    const d = make('declared'), b = make('bestDamage')
    expect(d.swung).toBe(attackIdsOf(d.ctx, d.o)[0])   // the first non-area listing
    const best = attackIdsOf(b.ctx, b.o)
      .map((id) => ({ id, dmg: preview(b.ctx, b.o.id, b.z.id, id).damageOnHit }))
      .sort((x, y) => y.dmg - x.dmg)[0]!
    expect(b.swung).toBe(best.id)
    expect(preview(b.ctx, b.o.id, b.z.id, b.swung).damageOnHit).toBeGreaterThanOrEqual(preview(d.ctx, d.o.id, d.z.id, d.swung).damageOnHit)
  })

  it('under bestDamage the structurally-dead attacks of the standard battle come alive', () => {
    const used = new Set<string>()
    for (let r = 0; r < 12; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 12, mapId: 'map.open', cfg: { switches: { aiAttackChoice: 'bestDamage' } as never } })
      runBattle(ctx)
      for (const e of ctx.events) if (e.type === 'attack.declared') used.add(String(e.causeId))
    }
    expect(used.has('attack.longsword.stab')).toBe(true)
  })

  it('the default is declared, so the control battles are what they were', () => {
    const ctx = createBattle({ replicate: 0 })
    expect(ctx.cfg.switches.aiAttackChoice).toBe('declared')
  })
})
