import type {Hero} from '../core/campaign.js'
import {HERO_KITS,HERO_ITEM_SLOTS} from './generated/kits.js'
import {atlasFieldings} from './atlas.js'
import {UNITS,type UnitDef} from '../engine.js'

export const SANDBOX_MAPS=atlasFieldings().map(r=>({id:r.id,name:r.name}))
/** Authored standalone presets; campaign drafting keeps its own explicit pool. */
export function sandboxHeroesOf(units:Readonly<Record<string,UnitDef>>=UNITS,kits:Readonly<Record<string,readonly string[]>>=HERO_KITS,slots:Readonly<Record<string,number>>=HERO_ITEM_SLOTS):Hero[]{
 return Object.keys(units).filter(id=>id.startsWith('hero.base.')).sort().map(id=>{
  const unit=units[id]!,kit=kits[id],itemSlots=slots[id]
  if(!kit)throw Error(`sandbox hero '${id}' has no authored kit`)
  if(itemSlots===undefined||!Number.isInteger(itemSlots)||itemSlots<0)throw Error(`sandbox hero '${id}' has no valid authored itemSlots`)
  const classes=unit.tags?.filter(t=>t.startsWith('class.'))??[]
  if(classes.length!==1)throw Error(`sandbox hero '${id}' requires one authored class tag`)
  if(!unit.name?.trim())throw Error(`sandbox hero '${id}' has no authored name`)
  return {id,name:unit.name,classes:[...classes],unitType:id,equipped:[...kit],itemSlots,level:1,xp:0,wound:0,lifeState:'alive',badges:[],corruption:0}
 })
}
export const SANDBOX_HEROES=sandboxHeroesOf()
// Standard published enemy bodies; this roster is content, not a rule.
export const SANDBOX_ENEMIES=['unit.zombie','unit.skeleton','unit.skeletal-archer','unit.fast-zombie','unit.imp','unit.fire-imp','unit.ghoul','unit.hellhound'].map(id=>({id,name:UNITS[id]!.name??id.replace('unit.','').replaceAll('-',' ')}))
export const SANDBOX_DEFAULT={mapId:'showcase.atlas-priory',heroes:['hero.base.warrior-iron','hero.base.ranger-aggressive','hero.base.priest-armored'],enemies:['unit.zombie','unit.zombie','unit.skeleton','unit.skeleton'],seed:1}
