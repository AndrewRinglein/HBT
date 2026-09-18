/** Historical zero-Block comparison only. Refuse to hide an actual block cup. */
export function projectBlock<T extends {events:readonly Record<string,any>[];state:any}>(ctx:T){
 const checks=ctx.events.filter(e=>e.type==='block.rolled')
 if(checks.some(e=>e.chance!==0||e.roll!==null||e.blocked!==false))throw Error('cannot project nonzero Block gameplay')
 const events=ctx.events.filter(e=>e.type!=='block.rolled').map((e,seq)=>{
  const row=structuredClone(e);row.seq=seq
  if(e.type==='attack.declared'){delete row.blockChance;delete row.connectionChanceBps}
  return row as T['events'][number]
 })
 const state=structuredClone(ctx.state)
 state.seq-=checks.length
 for(const u of state.units)delete u.incomingAttackOrdinal
 return {events,state}
}
