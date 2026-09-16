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
/** Detached stable identities from the captured, unspent phase queue. */
export function activationChoices(ctx:Ctx, policy:ControlPolicy):number[] {
  const c=ctx.battleCursor
  if(ctx.state.outcome || c?.at!=='selecting') return []
  return c.order.slice(c.next).filter(id=>{
    const u=ctx.state.units[id]!
    return u.lifeState==='standing' && !isBlocked(ctx,u) && controllerOf(ctx,id,policy)==='human'
  }).map(id=>ctx.state.units[id]!.uid)
}
