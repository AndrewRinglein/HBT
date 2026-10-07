// viewer.attack-row-shows-totals — ruled 2026-10-06 (Andrew, engine/DECISIONS.md 'an attack shows its total Accuracy and Crit, not
// the weapon's plus' and 'an attack's numbers: the total alone, no list of what it is made of'): "The dagger doesn't show +5
// critical. What happens is the attack shows the total critical. The same thing is true of accuracy." / "We just need to see
// the total."
// What the battle screen's action bar shows for a unit's attacks: the ENGINE'S OWN figures, now, on the live battle — its
// attackFigures for every attack the unit is granted (grantedActionIds: its own list and what a status grants). Nothing is
// added up here; a unit the battle does not hold has none.
import {attackFigures,grantedActionIds,isAttack} from '../engine.js'
import type {Sandbox} from '../core/sandbox.js'

export type AttackTotals=Record<string,{accuracy:number;crit:number}>
export function attackTotalsOf(ctx:Sandbox['ctx']|null|undefined,unitId:number):AttackTotals|null{
 const u=ctx?.state.units[unitId];if(!ctx||!u)return null
 const out:AttackTotals={}
 for(const id of grantedActionIds(ctx,u)){const a=ctx.actions[id];if(a&&isAttack(a))out[id]=attackFigures(ctx,u,a)}
 return out
}
