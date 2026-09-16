import { isDamageType } from './types.js'
import type { SecondaryDamage } from './types.js'

/** Strict optional packet metadata at every public content/runtime boundary. */
export function attackPacketFields(value: unknown): {secondaryDamage?: readonly SecondaryDamage[]; armorPenetration?: number} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('attack packet metadata must be an object')
  const fields = Object.getOwnPropertyDescriptors(value)
  const read = (key: string): unknown => {
    const d=fields[key]
    if(d && !('value' in d))throw Error(`attack packet ${key} must be plain data`)
    return d?.value
  }
  const pen=read('armorPenetration'),rows=read('secondaryDamage')
  if(pen!==undefined&&(!Number.isSafeInteger(pen)||Number(pen)<0||Number(pen)>1000000))throw Error('armor penetration must be an integer from 0 to 1000000')
  let secondaryDamage: SecondaryDamage[]|undefined
  if(rows!==undefined){
    if(!Array.isArray(rows)||rows.length>32||Reflect.ownKeys(rows).length!==rows.length+1)throw Error('secondary packet list must be dense, plain and at most 32 rows')
    const ids=new Set(['base']);secondaryDamage=[]
    for(let i=0;i<rows.length;i++){
      const d=Object.getOwnPropertyDescriptor(rows,String(i))
      if(!d||!('value'in d))throw Error('secondary packet list must contain plain rows')
      const row=d.value
      if(!row||typeof row!=='object'||Array.isArray(row)||![Object.prototype,null].includes(Object.getPrototypeOf(row)))throw Error('secondary packet must be plain data')
      const ds=Object.getOwnPropertyDescriptors(row),keys=Reflect.ownKeys(row)
      if(keys.length!==4||keys.some(k=>typeof k!=='string'||!['id','when','damageType','amount'].includes(k)||!('value'in ds[k]!)))throw Error('secondary packet requires only id, when, damageType, amount')
      const {id,when,damageType,amount}=row
      if(typeof id!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(id)||ids.has(id))throw Error('secondary packet id must be unique and base is reserved')
      if(when!=='hit'&&when!=='crit')throw Error('secondary packet when must be hit or crit')
      if(!isDamageType(damageType))throw Error('secondary packet damage type is invalid')
      if(!Number.isSafeInteger(amount)||amount<0||amount>1000000)throw Error('secondary packet amount must be an integer from 0 to 1000000')
      ids.add(id);secondaryDamage.push({id,when,damageType,amount})
    }
  }
  return {...(pen!==undefined?{armorPenetration:pen as number}:{}),...(secondaryDamage!==undefined?{secondaryDamage}:{})}
}
