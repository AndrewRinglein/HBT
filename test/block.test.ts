import {describe,it,expect} from 'vitest'
import {createCustomBattle,createBattle} from '../src/core/setup.js'
import {performAttack,preview} from '../src/core/pipeline.js'
import {beginActivation} from '../src/core/mutate.js'
import {applyStatus} from '../src/core/status.js'
import {triggersFrom} from '../src/core/trigger.js'
import {effective} from '../src/core/stats.js'
import {makeRng} from '../src/core/rng.js'
import {saveBattle,restoreBattle} from '../src/core/snapshot.js'
import {forkBattle} from '../src/core/fork.js'
import {executeAction} from '../src/core/commands.js'
import {attackOfOpportunity,executeMove,movePowerOf} from '../src/core/movement.js'
import {useBurst} from '../src/core/burst.js'
import {applyItems,applyBadges} from '../src/core/items.js'
import {makeUnit} from '../src/core/setup.js'
import {UNITS} from '../src/content/index.js'
import {validateNamedResists} from '../src/content/pack.js'
import type {AttackDef,DamageType} from '../src/core/types.js'
import {scenarioDef,scenarioOptions} from '../src/content/scenarios.js'
import {runBattle} from '../src/core/battle.js'

const rig=()=>{
 const ctx=createCustomBattle([{type:'test-warrior',hex:85}],[{type:'test-zombie',hex:86}],{strict:true})
 const at=ctx.state.units[0]!,tg=ctx.state.units[1]!
 at.triggers=[];tg.triggers=[];at.accuracy=100;tg.dodge=0;tg.hp=tg.maxHp=100
 beginActivation(ctx,0,'test')
 return {ctx,at,tg,id:at.actions.find(id=>ctx.actions[id]?.attack)!}
}
describe('rule.block — first independent incoming-hit cup',()=>{
 it('100 Block negates the hit before any accuracy/crit draw',()=>{
  const {ctx,tg,id}=rig();Object.assign(tg,{block:100})
  const hp=tg.hp,result=performAttack(ctx,0,1,id)
  expect(result.hit).toBe(false);expect(tg.hp).toBe(hp)
  expect(ctx.events.find(e=>e.type==='block.rolled')).toMatchObject({attacker:0,defender:1,kind:'melee',chance:100,blocked:true,ordinal:1})
  expect(ctx.rng.log.filter(r=>['to-hit','crit'].includes(r.stream))).toEqual([])
  expect(result.roll).toBeNull()
 })
 it('reports conditional accuracy separately from unconditional connection without mutation',()=>{
  const {ctx,at,tg,id}=rig();at.accuracy=80;Object.assign(tg,{block:25})
  const before=JSON.stringify([ctx.state,ctx.events,ctx.rng])
  const p=preview(ctx,0,1,id) as any
  expect(p.blockChance).toBe(25);expect(p.connectionChanceBps).toBe((100-25)*p.hitChance)
  expect(JSON.stringify([ctx.state,ctx.events,ctx.rng])).toBe(before)
 })
 it('freezes block before unconditional onAttack then fires reciprocal block hooks and miss',()=>{
  const {ctx,at,tg,id}=rig();Object.assign(tg,{block:100})
  const tr=(name:string,hook:any,select:any,effect:any)=>({id:'test.block.'+name,source:'test.block',hook,chance:100,select,effect})
  at.triggers=triggersFrom([
   tr('attack','onAttack','target',{kind:'statMod',stat:'block',value:-100,until:'battle'}),
   tr('offense','onBlock','target',{kind:'statMod',stat:'rangedBlock',value:-20,until:'battle'}),
   tr('miss','onMiss','self',{kind:'power.gain',value:1}),
  ])
  tg.triggers=triggersFrom([tr('defense','onBlock','self',{kind:'power.gain',value:2})])
  expect(performAttack(ctx,0,1,id).hit).toBe(false)
  expect(ctx.events.filter(e=>e.type==='trigger.rolled').map(e=>[e['actor'],e['hook']])).toEqual([[0,'onAttack'],[1,'onBlock'],[0,'onBlock'],[0,'onMiss']])
  const block=ctx.events.findIndex(e=>e.type==='block.rolled'),hook=ctx.events.findIndex(e=>e.type==='trigger.rolled')
  expect(block).toBeLessThan(hook)
 })
 it('Stun suppresses Block through a generic flag, with no block draw',()=>{
  const {ctx,tg,id}=rig();Object.assign(tg,{block:100});applyStatus(ctx,1,'status.stun',2,'test')
  performAttack(ctx,0,1,id)
  expect(ctx.events.find(e=>e.type==='block.rolled')).toMatchObject({chance:0,roll:null,blocked:false,suppressed:true})
  expect(ctx.rng.log.some(r=>String(r.stream)==='block')).toBe(false)
 })
 it('zero chance still records the incoming ordinal without drawing',()=>{
  const {ctx,tg,id}=rig();performAttack(ctx,0,1,id)
  expect(ctx.events.find(e=>e.type==='block.rolled')).toMatchObject({chance:0,roll:null,blocked:false,ordinal:1})
  expect((tg as any).incomingAttackOrdinal).toBe(1)
 })
})

function weapon(ctx:ReturnType<typeof rig>['ctx'],actor=0,kind:'melee'|'ranged'='melee',damageType:DamageType='physical',hits=1){
 const id='attack.test-block-probe'
 const a:AttackDef={id,name:'Block probe (TEST)',source:'weapon',staminaCost:1,cooldown:0,range:4,
  attack:{kind,damageType,stat:'strength',bonus:1,hits}}
 ctx.actions={...ctx.actions,[id]:a};ctx.state.units[actor]!.actions=[id,'power.move']
 return id
}
describe('rule.block — data, cups and lifecycle edges',()=>{
 for(const [scenario,trigger,type] of [['test.block-a','test.block-a.reaction','statmod.added'],['test.block-b','test.block-b.reaction','status.applied']] as const)
 it(scenario+' runs the authored Block variant and its actual state-changing hook',()=>{
  const ctx=createBattle(scenarioOptions(scenarioDef(scenario)))
  runBattle(ctx)
  expect(ctx.events.some(e=>e.type==='block.rolled'&&e['blocked']===true)).toBe(true)
  expect(ctx.events.some(e=>e.type===type&&e.causeId===trigger)).toBe(true)
  expect(ctx.events.some(e=>e.type==='trigger.rolled'&&e.causeId===trigger&&e['hook']==='onBlock'&&e['fired']===true)).toBe(true)
 })
 for(const kind of ['melee','ranged'] as const)for(const type of ['physical','magic','fire','poison','shadow','true'] as const)
 it(kind+' '+type+' chooses authored kind even at distance and suppresses all packets/pool spending',()=>{
  const {ctx,at,tg}=rig();tg.hex=88;tg.block=kind==='melee'?100:0;tg.rangedBlock=kind==='ranged'?100:0
  const id=weapon(ctx,0,kind,type);ctx.actions={...ctx.actions,[id]:{...ctx.actions[id]!,attack:{...ctx.actions[id]!.attack!,secondaryDamage:[{id:'extra',when:'hit',amount:9,damageType:'true'}]}}}
  applyStatus(ctx,1,'status.protection',10,'test');const hp=tg.hp,stamina=at.stamina,events=ctx.events.length
  expect(performAttack(ctx,0,1,id).blocked).toBe(true);expect(tg.hp).toBe(hp);expect(at.stamina).toBe(stamina-1)
  expect(tg.statuses.find(s=>s.id==='status.protection')!.value).toBe(10)
  expect(ctx.events.slice(events).some(e=>['attack.hit','attack.miss','damage.applied','status.reduced','crit.branch'].includes(e.type))).toBe(false)
 })
 it('clamps signed effective stats and zero checks do not draw or disable accuracy',()=>{
  for(const [value,chance] of [[-25,0],[0,0],[120,100]] as const){
   const {ctx,tg,id}=rig();tg.block=value
   expect(preview(ctx,0,1,id).blockChance).toBe(chance)
   performAttack(ctx,0,1,id)
   expect(ctx.rng.log.filter(r=>r.stream==='block')).toHaveLength(chance?1:0)
   expect(ctx.rng.log.filter(r=>r.stream==='to-hit')).toHaveLength(chance?0:1)
  }
 })
 it('block-only and activation-only status flags are independent and zero magnitude does not suppress',()=>{
  for(const [status,chance] of [['test.status.guard-open',0],['test.status.daze',100]] as const){
   const {ctx,tg,id}=rig();tg.block=100;applyStatus(ctx,1,status,2,'test')
   expect(preview(ctx,0,1,id).blockChance).toBe(chance)
   tg.statuses[0]!.value=0;expect(preview(ctx,0,1,id).blockChance).toBe(100)
  }
 })
 it('downed remains block-capable; a block cannot accelerate bleed-out',()=>{
  const {ctx,tg,id}=rig();tg.lifeState='downed';tg.hp=0;tg.bleedOut=4;tg.block=100
  expect(preview(ctx,0,1,id)).toMatchObject({blockChance:100,damageOnHit:0,critChance:0})
  expect(performAttack(ctx,0,1,id).hit).toBe(false);expect(tg.bleedOut).toBe(4)
 })
 it('unlimited multihit blocks use independent incoming cups and pay the action once',()=>{
  const {ctx,at,tg}=rig();tg.block=100;const id=weapon(ctx,0,'melee','physical',3),before=at.stamina
  const r=performAttack(ctx,0,1,id)
  expect(r.hits).toHaveLength(3);expect(r.hits!.every(h=>h.blocked&&!h.hit&&h.roll===null)).toBe(true)
  expect(ctx.events.filter(e=>e.type==='block.rolled').map(e=>e['ordinal'])).toEqual([1,2,3])
  expect(ctx.rng.log.filter(r=>r.stream==='block').map(r=>r.keys)).toEqual([[tg.uid,1],[tg.uid,2],[tg.uid,3]])
  expect(at.stamina).toBe(before-1);expect(ctx.events.filter(e=>e.type==='action.spent'&&e.actor===0)).toHaveLength(1)
 })
 it('reciprocal hooks retain unique roles and incoming ordinals across save, restore and fork',()=>{
  const {ctx,at,tg}=rig();at.block=tg.block=100;at.hp=at.maxHp=100;at.stamina=at.maxStamina=20;tg.stamina=tg.maxStamina=20
  const id=weapon(ctx);tg.actions=[id]
  for(const u of [at,tg])u.triggers=triggersFrom([{id:'test.block.shared',source:'test.block',hook:'onBlock',chance:60,select:'target',effect:{kind:'statMod',stat:'dodge',value:1,until:'battle'}}])
  performAttack(ctx,0,1,id,'reaction');performAttack(ctx,1,0,id,'reaction')
  const restored=restoreBattle(saveBattle(ctx),ctx),fork=forkBattle(ctx),historyLength=ctx.events.length
  for(const c of [ctx,restored,fork]){performAttack(c,0,1,id,'reaction');performAttack(c,1,0,id,'reaction')}
  expect(restored.state).toEqual(ctx.state);expect(restored.events).toEqual(ctx.events);expect(restored.rng.log).toEqual(ctx.rng.log)
  expect(fork.events).toEqual(ctx.events.slice(historyLength))
  expect(fork.state).toEqual(ctx.state);expect(fork.rng.log).toEqual(ctx.rng.log)
  const keys=ctx.rng.log.filter(r=>r.stream==='trigger').map(r=>JSON.stringify(r.keys))
  expect(new Set(keys).size).toBe(keys.length)
  expect(new Set(ctx.rng.log.filter(r=>r.stream==='trigger').map(r=>r.keys.at(-1)))).toEqual(new Set([0,1]))
  const bad=JSON.parse(saveBattle(ctx));bad.state.units[0].incomingAttackOrdinal--
  expect(()=>restoreBattle(JSON.stringify(bad),ctx)).toThrow(/incoming attack ordinal history/)
 })
 it('illegal out-of-range and wrong-slot commands do not spend or roll',()=>{
  const {ctx,tg,id}=rig();tg.block=100
  ctx.actions={...ctx.actions,[id]:{...ctx.actions[id]!,slot:'primary'}}
  const legalState=structuredClone([ctx.state,ctx.events,ctx.rng])
  expect(executeAction(ctx,{actor:0,actionId:id,target:1,slot:'movement'}).ok).toBe(false)
  expect([ctx.state,ctx.events,ctx.rng]).toEqual(legalState)
  tg.hex=140
  const before=structuredClone([ctx.state,ctx.events,ctx.rng])
  expect(executeAction(ctx,{actor:0,actionId:id,target:1}).ok).toBe(false)
  expect([ctx.state,ctx.events,ctx.rng]).toEqual(before)
  expect(()=>performAttack(ctx,0,1,id)).toThrow(/illegal attack/)
  expect([ctx.state,ctx.events,ctx.rng]).toEqual(before)
 })
 it('an attack-kind burst ignores 100 Block and its hooks completely',()=>{
  const {ctx,at,tg}=rig();tg.block=tg.rangedBlock=100
  const id='power.test-block-burst';ctx.actions={...ctx.actions,[id]:{id,name:'Burst TEST',source:'class',staminaCost:0,cooldown:0,range:3,burst:{shape:{kind:'radius',radius:0},side:'enemy',packets:[{id:'base',amount:3,damageType:'true'}]}}};at.actions.push(id)
  const hp=tg.hp;useBurst(ctx,0,tg.hex,id)
  expect(tg.hp).toBe(hp-3);expect(ctx.events.some(e=>e.type==='block.rolled')).toBe(false)
  expect(tg.incomingAttackOrdinal).toBeUndefined();expect(ctx.rng.log.some(r=>r.stream==='block')).toBe(false)
 })
 it('hand stats, badge and live modifiers add once, with independent ranged stat',()=>{
  const {ctx}=rig(),base={...UNITS['test-warrior']!,block:3,rangedBlock:4}
  const item=(id:string,block:number,rangedBlock:number)=>({id,name:id,itemClass:'weapon' as const,tier:1,hands:1,slots:1,statModifiers:{block,rangedBlock},grants:[],abilities:[],triggers:[]})
  const a=item('test.hand-a',5,1),b=item('test.hand-b',15,10)
  const equipped=applyItems(base,[a.id,b.id],{[a.id]:a,[b.id]:b},ctx.actions,'test').def
  const badge={id:'test.badge.block',name:'Block TEST',statModifiers:{block:2,rangedBlock:3},grants:[],triggers:[],flags:{}}
  const u=makeUnit(0,100,'TEST',applyBadges(equipped,[badge.id],{[badge.id]:badge},'test').def,85)
  u.mods.push({stat:'block',op:'add',value:-20,source:'test.strip',scope:'unit'})
  expect(effective(ctx,u,'block').value).toBe(5);expect(effective(ctx,u,'rangedBlock').value).toBe(18)
  for(const n of [NaN,Infinity,1.5,'10'])expect(()=>makeUnit(0,100,'TEST',{...base,block:n} as any,85)).toThrow(/block/)
 })
 it('actual movement stops after an early connected reaction even when its last hit blocks',()=>{
  for(const allBlocked of [false,true]){
   const {ctx,at,tg}=rig();at.hp=at.maxHp=100;at.block=allBlocked?100:0;tg.accuracy=1000;tg.strength=0;tg.crit=-1000;at.armor=0
   const id=weapon(ctx,1,'melee','physical',2);tg.triggers=triggersFrom([{id:'test.block.after-hit',source:id,hook:'onHit',chance:100,select:'target',effect:{kind:'statMod',stat:'block',value:100,until:'battle'}}])
   const walk=movePowerOf(ctx,at,'path')!
   executeMove(ctx,0,[69,53],walk)
   expect(ctx.events.some(e=>e.type==='aoo.provoked')).toBe(true)
   expect(ctx.events.filter(e=>e.type==='block.rolled').map(e=>e['blocked'])).toEqual(allBlocked?[true,true]:[false,true])
   expect(ctx.events.some(e=>e.type==='move.stopped')).toBe(!allBlocked)
   expect(at.hex).toBe(allBlocked?53:85)
  }
 })
 it('reaction result is connected in either block/connect order and per-hit facts remain exact',()=>{
  const {ctx,at,tg}=rig();at.block=100;at.hp=at.maxHp=100;tg.accuracy=1000;tg.crit=-1000
  const id=weapon(ctx,1,'melee','physical',2)
  tg.triggers=triggersFrom([{id:'test.block.strip',source:id,hook:'onBlock',chance:100,select:'target',effect:{kind:'statMod',stat:'block',value:-100,until:'battle'}}])
  expect(attackOfOpportunity(ctx,1,0)).toBe(true)
  expect(ctx.events.filter(e=>e.type==='block.rolled').map(e=>e['blocked'])).toEqual([true,false])
 })
 it('positive partial Block has independently reproduced draws and both outcomes',()=>{
  const results=[]
  for(let seed=0;seed<32;seed++){
   const {ctx,tg,id}=rig();ctx.rng=makeRng(seed,{strict:true});tg.block=37
   const r=performAttack(ctx,0,1,id),e=ctx.events.find(e=>e.type==='block.rolled')!
   const raw=ctx.rng.log.find(r=>r.stream==='block')!
   expect(e['roll']).toBe(raw.value%100+1);expect(!!r.blocked).toBe((e['roll'] as number)<=37)
   expect(raw.keys).toEqual([tg.uid,1]);results.push(!!r.blocked)
   expect(ctx.rng.log.filter(r=>r.stream==='to-hit')).toHaveLength(r.blocked?0:1)
  }
  expect(new Set(results)).toEqual(new Set([false,true]))
 })
 it('unconditional onAttack damage survives a block, with no weapon packet applied',()=>{
  const {ctx,at,tg,id}=rig();tg.block=100;applyStatus(ctx,1,'status.protection',2,'test')
  at.triggers=triggersFrom([{id:'test.block.unconditional',source:id,hook:'onAttack',chance:100,select:'target',effect:{kind:'damage',amount:3,damageType:'true'}}])
  const hp=tg.hp;performAttack(ctx,0,1,id)
  expect(tg.hp).toBe(hp-1)
  expect(ctx.events.filter(e=>e.type==='damage.applied').map(e=>e.causeId)).toEqual(['test.block.unconditional'])
  expect(ctx.events.some(e=>e.type==='attack.hit')).toBe(false)
 })
 it('malformed stat values and altered saved ordinal/history reject without touching live state',()=>{
  const {ctx,tg,id}=rig();tg.block=100;performAttack(ctx,0,1,id)
  const saved=saveBattle(ctx)
  for(const field of ['block','rangedBlock'])for(const value of [1.5,'3',Infinity])expect(()=>validateNamedResists({[field]:value},'TEST')).toThrow(/integer/)
  for(const field of ['block','rangedBlock','incomingAttackOrdinal']){
   const bad=JSON.parse(saved);bad.state.units[1][field]=1.5
   expect(()=>restoreBattle(JSON.stringify(bad),ctx)).toThrow(/unit|ordinal/)
  }
  const old=JSON.parse(saved);old.rulesVersion='v2-migration.20';expect(()=>restoreBattle(JSON.stringify(old),ctx)).toThrow(/version/)
  expect(saveBattle(ctx)).toBe(saved)
 })
 it('refuses exhausted unsigned RNG ordinal before payment or mutation',()=>{
  const {ctx,tg,id}=rig();tg.incomingAttackOrdinal=0xffffffff
  const before=structuredClone([ctx.state,ctx.events,ctx.rng])
  expect(()=>performAttack(ctx,0,1,id)).toThrow(/ordinal overflow/)
  expect([ctx.state,ctx.events,ctx.rng]).toEqual(before)
 })
})
