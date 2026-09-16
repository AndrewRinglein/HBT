import { validateDamageMetadata, validateNamedResists } from '../src/content/pack.js'
import {applyProgress,applyBadges} from '../src/core/items.js'
import {makeUnit} from '../src/core/setup.js'
import {UNITS} from '../src/content/index.js'
import {flatDamage} from '../src/core/mitigation.js'
import {describe,it,expect} from 'vitest'
import {createCustomBattle,createBattle,fieldedDef} from '../src/core/setup.js'
import {resolveDamage} from '../src/core/pipeline.js'
import {applyStatus,tickUnitStatuses,statusDamage} from '../src/core/status.js'
import {fireTriggers,triggersFrom} from '../src/core/trigger.js'
import {saveBattle,restoreBattle} from '../src/core/snapshot.js'
import {effective} from '../src/core/stats.js'
import {STATUSES} from '../src/content/statuses.js'
import type {DamageType} from '../src/core/types.js'
const rig=()=>createCustomBattle([{type:'test-warrior',hex:85}],[{type:'test-zombie',hex:86}])
const rows=[['physical','armor'],['magic','resist'],['fire','fireResist'],['poison','poisonResist'],['shadow','shadowResist'],['true',null]] as const

describe('rule.elemental-resists — one type owns one flat defense',()=>{
 for(const [kind,defense] of rows)it(kind+' resolves direct, status and trigger damage against its own stat',()=>{
  const ctx=rig(),source=ctx.state.units[1]!,target=ctx.state.units[0]!
  Object.assign(source,{strength:0});Object.assign(target,{armor:19,resist:19,fireResist:19,poisonResist:19,shadowResist:19})
  if(defense)Object.assign(target,{[defense]:3})
  const before=JSON.stringify([ctx.state,ctx.events,ctx.rng])
  const direct=resolveDamage(ctx,source,target,{id:'test.damage',bonus:4,stat:'strength',damageType:kind as DamageType},false)
  expect(direct.value).toBe(defense?1:4);expect(JSON.stringify([ctx.state,ctx.events,ctx.rng])).toBe(before)
  ctx.statuses={...ctx.statuses,'test.element':{id:'test.element',name:'Typed test',shape:'counter',stacking:'add',tickDamageType:kind as DamageType}}
  let hp=target.hp;statusDamage(ctx,target.id,4,'test.element');expect(hp-target.hp).toBe(direct.value)
  source.triggers=triggersFrom([{id:'test.element-trigger',hook:'onHit',chance:100,select:'target',source:'test.damage',effect:{kind:'damage',amount:4,damageType:kind as DamageType}}])
  hp=target.hp;fireTriggers(ctx,'onHit',{ownerId:source.id,targetId:target.id,causeId:'test',ordinal:1});expect(hp-target.hp).toBe(direct.value)
 })
 it('Burn and Poison are explicitly elemental and keep their full decay clocks',()=>{
  for(const [id,type,stat] of [['status.burn','fire','fireResist'],['status.poison','poison','poisonResist']] as const){
   expect(STATUSES[id]!.tickDamageType).toBe(type)
   const ctx=rig(),u=ctx.state.units[0]!;Object.assign(u,{[stat]:3,resist:99});applyStatus(ctx,u.id,id,4,'test')
   const hp=u.hp;tickUnitStatuses(ctx,u.id);expect(hp-u.hp).toBe(1);expect(u.statuses.find(s=>s.id===id)?.value).toBe(3)
   tickUnitStatuses(ctx,u.id);expect(u.hp).toBe(hp-1);expect(u.statuses.find(s=>s.id===id)?.value).toBe(2)
  }
 })
 it('defaults are zero and authored equipment is folded once and survives snapshots',()=>{
  const ctx=rig(),u=ctx.state.units[0]!
  for(const stat of ['fireResist','poisonResist','shadowResist'] as const)expect(effective(ctx,u,stat).value).toBe(0)
  const field=fieldedDef('hero.base.warrior-iron',['item.necklace-of-fire-immunity','item.necklace-of-poison-immunity'])
  expect(field.fireResist).toBe(1);expect(field.poisonResist).toBe(1)
  const battle=createBattle({replicate:1,heroes:['hero.base.warrior-iron'],heroItems:[['item.necklace-of-fire-immunity']],enemies:['unit.zombie']})
  const saved=saveBattle(battle),restored=restoreBattle(saved,createBattle({replicate:1,heroes:['hero.base.warrior-iron'],enemies:['unit.zombie']}))
  expect(restored.state).toEqual(battle.state);expect(effective(restored,restored.state.units[0]!,'fireResist').value).toBe(1)
 })
})

describe('elemental bounds, data folds and strict status typing',()=>{
 it('signed effective defense is shared on both sides, with a zero damage floor',()=>{
  for(const targetId of [0,1])for(const [type,stat] of rows){
   const ctx=rig(),u=ctx.state.units[targetId]!;u.hp=100
   if(stat)Object.assign(u,{[stat]:0})
   expect(flatDamage(ctx,u,4,type).value).toBe(4)
   if(!stat)continue
   for(const [defense,want] of [[4,0],[9,0],[-2,6]]){
    Object.assign(u,{[stat]:defense});expect(flatDamage(ctx,u,4,type).value).toBe(want)
    ctx.statuses={...ctx.statuses,'test.typed':{id:'test.typed',name:'Typed',shape:'counter',stacking:'add',tickDamageType:type}}
    const before=u.hp;statusDamage(ctx,u.id,4,'test.typed');expect(before-u.hp).toBe(want)
   }
  }
 })
 it('badge and effective stat modifiers apply once to named resists',()=>{
  for(const typeId of ['test-warrior','unit.zombie']){
   const base=UNITS[typeId]!,badge={id:'test.resistance',name:'Resistance test',statModifiers:{fireResist:2,poisonResist:3,shadowResist:4},grants:[],triggers:[],flags:{}}
   const folded=applyBadges(base,[badge.id],{[badge.id]:badge},'test').def
   const ctx=rig(),u=makeUnit(0,123,typeId,folded,85)
   u.mods.push({stat:'fireResist',op:'add',value:1,source:'test.mod',scope:'unit'})
   expect(effective(ctx,u,'fireResist').value).toBe(3);expect(effective(ctx,u,'poisonResist').value).toBe(3);expect(effective(ctx,u,'shadowResist').value).toBe(4)
  }
 })
 it('a damage tick without an explicit type is refused while Shadow growth remains distinct',()=>{
  const ctx=rig();expect(()=>statusDamage(ctx,0,1,'status.shadow')).toThrow(/declare.*damage type/)
  expect(()=>statusDamage(ctx,0,1,'missing')).toThrow(/declare.*damage type/)
  const u=ctx.state.units[0]!;u.shadowResist=999;applyStatus(ctx,u.id,'status.shadow',u.maxHp-1,'test');tickUnitStatuses(ctx,u.id)
  expect(u.lifeState).toBe('dead');expect(ctx.events.some(e=>e.type==='unit.obliterated')).toBe(true)
 })
 it('authored enemy, relic, enchant and specialty defenses survive real fielding',()=>{
  for(const [id,stat,want] of [['unit.imp','fireResist',1],['unit.powerful-imp','fireResist',1],['unit.fire-imp','fireResist',2],['unit.poison-imp','poisonResist',2]] as const){
   const ctx=createCustomBattle([{type:'test-warrior',hex:85}],[{type:id,hex:86}])
   expect(effective(ctx,ctx.state.units[1]!,stat).value).toBe(want)
  }
  const hearth=fieldedDef('hero.base.warrior-iron',['item.idol-of-the-hearthmother'])
  expect(hearth.fireResist).toBe(1);expect(hearth.poisonResist).toBe(1)
  const base=fieldedDef('hero.base.warrior-iron',['item.heavy-leather'])
  const ward=fieldedDef('hero.base.warrior-iron',['item.heavy-leather.fire-ward'])
  expect(ward.fireResist).toBe(2);expect(ward.resist-base.resist).toBe(1)
  const rogue=Object.values(UNITS).find(u=>u.typeId.startsWith('hero.base.')&&u.tags?.includes('class.rogue'))!
  expect(rogue).toBeDefined()
  const grown=fieldedDef(rogue.typeId,[],{level:2,specialtyId:'specialty.poison-master'})
  expect(grown.poisonResist).toBe(3);expect(grown.resist-rogue.resist).toBeGreaterThanOrEqual(2)
  const progression=applyProgress(UNITS['test-warrior']!,{level:2,specialtyId:'test.specialty'},'test.class',{'test.class':{id:'test.class',rows:[{level:2,grants:{fireResist:2,shadowResist:3}}]}},{'test.specialty':{id:'test.specialty',class:'test.class',statModifiers:{poisonResist:4}}},{},'test')
  expect([progression.fireResist,progression.poisonResist,progression.shadowResist]).toEqual([2,4,3])
 })
 it('loader rejects unsupported types and malformed named defense modifiers',()=>{
  expect(()=>validateDamageMetadata({id:'bad',damageType:'holy'})).toThrow(/damage type/)
  expect(()=>validateDamageMetadata({id:'bad',effects:[{kind:'selfDamage',amount:2,damageType:'holy'} as never]})).toThrow(/damage type/)
  for(const key of ['fireResist','poisonResist','shadowResist']){
   for(const value of [1.5,Infinity,'3',null])expect(()=>validateNamedResists({[key]:value},'test')).toThrow(/integer/)
   expect(()=>validateNamedResists({[key]:-2},'test')).not.toThrow()
  }
 })
 it('snapshot validates named defense integers and rejects previous rules',()=>{
  const ctx=rig(),saved=saveBattle(ctx)
  const bad=JSON.parse(saved);bad.state.units[0]!.fireResist=1.5
  expect(()=>restoreBattle(JSON.stringify(bad),rig())).toThrow(/fireResist/)
  const signed=JSON.parse(saved);signed.state.units[0]!.fireResist=-2
  expect(restoreBattle(JSON.stringify(signed),rig()).state.units[0]!.fireResist).toBe(-2)
  expect(restoreBattle(saved,rig()).state.units[0]!.fireResist).toBeUndefined()
  const old=JSON.parse(saved);old.rulesVersion='v2-migration.16';expect(()=>restoreBattle(JSON.stringify(old),rig())).toThrow(/unsupported version/)
 })
})
