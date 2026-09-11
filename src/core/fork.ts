import type { Ctx } from './types.js'
import { forkAttackLines } from './los.js'

/** Isolated lookahead: immutable runtime bindings are shared, mutable data is copied. */
export function forkBattle(ctx: Ctx): Ctx {
  const fork = {
    ...ctx,
    state: structuredClone(ctx.state),
    cfg: structuredClone(ctx.cfg),
    rng: structuredClone(ctx.rng),
    events: [],
    ...(ctx.battleCursor ? { battleCursor: structuredClone(ctx.battleCursor) } : {}),
    ...(ctx.encounter ? { encounter: structuredClone(ctx.encounter) } : {}),
  }
  forkAttackLines(ctx, fork)
  return fork
}
