// Trusted session ownership, independent of allegiance and combat-side rules.
import type {Ctx} from './types.js'
import {isBlocked} from './status.js'
export type ControlPolicy = { readonly humanUnitUids: readonly number[] }
export function controllerOf(ctx: Ctx, actor: number, policy: ControlPolicy): 'human' | 'ai' {
  const u = ctx.state.units[actor]
  if (!u) throw new Error(`unknown controller actor ${actor}`)
  if (u.statuses.some(s => s.value > 0 && ctx.statuses[s.id]?.aiControlled)) return 'ai'
  return policy.humanUnitUids.includes(u.uid) ? 'human' : 'ai'
}
/**
 * The human heroes still to act this Phase, as unit ids: the captured, unspent phase queue,
 * standing, able to act, human-controlled and not forgone. Read while the Phase waits on the
 * player — a selection, or a hero acting (who has begun, so is not in the unspent queue).
 */
export function yetToActIds(ctx:Ctx, policy:ControlPolicy):number[] {
  const c=ctx.battleCursor
  // waiting on the player: a selection, or a human hero's activation under way
  const waiting=c?.at==='selecting' || c?.at==='acting' || c?.at==='surge-check' || c?.at==='activation-end'
  if(ctx.state.outcome || !c || !waiting) return []
  return c.order.slice(c.next).filter(id=>{
    const u=ctx.state.units[id]!
    return u.lifeState==='standing' && !isBlocked(ctx,u) && controllerOf(ctx,id,policy)==='human' && !c.forgo?.includes(id)
  })
}
/**
 * command.end-player-phase — the query for the End Turn pop-up (ruled 2026-09-29, DECISIONS.md
 * "the playable battle screen": "If you have anybody who has not acted, it should pop up"):
 * the heroes that have not acted, as detached stable identities. Empty means End Turn asks nothing.
 */
export function heroesYetToAct(ctx:Ctx, policy:ControlPolicy):number[] {
  return yetToActIds(ctx,policy).map(id=>ctx.state.units[id]!.uid)
}
/** Detached stable identities from the captured, unspent phase queue — offered only at a selection. */
export function activationChoices(ctx:Ctx, policy:ControlPolicy):number[] {
  return ctx.battleCursor?.at==='selecting' ? heroesYetToAct(ctx,policy) : []
}
