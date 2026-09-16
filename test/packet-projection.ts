/** Historical comparison only: remove new packet facts and restore the old
 * damage-head meaning of crit. No HP/state/RNG facts are altered. */
export function projectPacketEvents<T extends Record<string,any>>(events:readonly T[]):T[]{
  const hits=new Map<string,number>()
  return events.map(e=>{
    const row:Record<string,any>=structuredClone(e),key=String(e.actor)+':'+String(e.target)+':'+e.causeId
    delete row.packets;delete row.physicalApplied
    if(e.type==='attack.hit'){
      const heads=e.critHeads??(e.crit?1:0);hits.set(key,heads);row.crit=heads>0
      if(heads<=1)delete row.critHeads
    }
    if(e.type==='damage.applied'&&e.attackId&&hits.has(key))row.crit=hits.get(key)!>0
    return row as T
  })
}
