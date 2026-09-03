// fix.post-end-ladder (2026-09-03) — filed by the kingdom's ISC-003 probe: the
// axe killed the last zombie mid-Activation, battle.end was emitted, and then
// the End of Activation ladder ran — poison damaged a hero AFTER the battle
// ended. The kingdom's fold holds that nothing is damaged after battle.end.
// The rule: after battle.end, nothing.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

describe('nothing after battle.end', () => {
  it('across the standard panel, battle.end is the last state-changing line', () => {
    const CHANGING = new Set(['damage.applied', 'heal.applied', 'status.applied', 'status.reduced', 'moved', 'attack.declared', 'trigger.fired', 'surge.hit', 'deathbed.stood', 'life.downed', 'life.dead'])
    for (let r = 0; r < 12; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 + (r % 3) * 4, mapId: r % 2 ? 'map.open' : 'map.thicket' })
      runBattle(ctx)
      const end = ctx.events.find((e) => e.type === 'battle.end')!
      const after = ctx.events.filter((e) => e.seq > end.seq && CHANGING.has(e.type))
      expect(after, `seed ${r}: ${after.map((e) => e.type).join(',')}`).toEqual([])
    }
  })
})
