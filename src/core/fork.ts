import type { Ctx } from './types.js'

/** Isolated lookahead: immutable runtime bindings are shared, mutable data is copied. */
export function forkBattle(ctx: Ctx): Ctx {
  return {
    ...ctx,
    state: structuredClone(ctx.state),
    cfg: structuredClone(ctx.cfg),
    rng: structuredClone(ctx.rng),
    events: [],
    ...(ctx.encounter ? { encounter: structuredClone(ctx.encounter) } : {}),
  }
}
