// fix.transformed-snapshot-order (2026-10-02; follows rule.afflictions-at-zero-refiled-2). The whole suite found it:
// test/battle-snapshot.test.ts refused a save of test.afflictions-at-zero-rule mid-Phase — "cursor order side" — because a
// hero queued for the Player Phase had transformed onto the enemy side (or fallen back into its own form) inside that
// Phase. The queue keeps it and the battle skips it (battle.ts, SWITCHES.md transformedMidPhase); the save must say so too.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { settle } from '../src/core/settle.js'
import { grantBadge } from '../src/core/mutate.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { hexId } from './board16.js'

const HERO = 'hero.base.warrior-iron'

describe('a hero that changed sides inside the Phase it was queued for', () => {
  it('saves and restores mid-Phase, and is skipped in that Phase — before and after the restore', () => {
    const ctx = createCustomBattle([{ type: HERO, hex: hexId(2, 2) }, { type: HERO, hex: hexId(2, 12) }], [{ type: 'test-zombie', hex: hexId(14, 14) }, { type: 'test-zombie', hex: hexId(14, 2) }])
    const first = advanceBattle(ctx)
    expect(first).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.battleCursor!.order).toEqual([0, 1])
    // hero 1, queued for this Player Phase, transforms onto the enemy side (Luck 0 always turns)
    const h = ctx.state.units[1]!
    grantBadge(ctx, h.id, 'badge.vampirism', 'test')
    h.luck = 0
    h.hp = 0
    settle(ctx, 'test')
    expect(h).toMatchObject({ typeId: 'unit.vampire', side: 'enemy' })
    const back = restoreBattle(saveBattle(ctx), ctx)
    expect(back.battleCursor!.order).toEqual([0, 1])
    for (const c of [ctx, back]) {
      completeActionCycle(c)
      const next = advanceBattle(c)
      // the Player Phase ends without it: the next actor is an enemy-side unit of the Enemy Phase
      expect(next.kind).toBe('acting')
      expect(c.state.phase).toBe('enemy')
      expect(c.state.units[(next as { actor: number }).actor]!.side).toBe('enemy')
    }
  })
})
