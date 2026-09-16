import {describe,it,expect} from 'vitest'
import {advanceBattle,runBattle,completeActionCycle} from '../src/core/battle.js'
import {createCustomBattle} from '../src/core/setup.js'
import {executeAction,executeBattleCommand,validateBattleCommand,activationChoices,controllerOf,type ControlPolicy} from '../src/core/commands.js'
import {saveBattle,restoreBattle} from '../src/core/snapshot.js'
import {forkBattle} from '../src/core/fork.js'
import {applyStatus} from '../src/core/status.js'
import type {Ctx} from '../src/core/types.js'
const fixture=()=>createCustomBattle([{type:'test-warrior',hex:85},{type:'test-ranger',hex:86},{type:'test-warrior',hex:87}],[{type:'test-zombie',hex:181},{type:'test-zombie',hex:182}],{strict:true,heroUids:[402,7,99],enemyUids:[900,800]})
const policy:ControlPolicy={humanUnitUids:[99,402,7]}
const copy=(ctx:Ctx)=>{const out=forkBattle(ctx);out.events=structuredClone(ctx.events);return out}
const select=(ctx:Ctx,uid:number)=>({kind:'select-activation',unitUid:uid,expectedSeq:ctx.state.seq})
function reject(ctx:Ctx,command:unknown,p=policy){const before=saveBattle(ctx);expect(validateBattleCommand(ctx,p,command).ok).toBe(false);expect(executeBattleCommand(ctx,p,command).ok).toBe(false);expect(saveBattle(ctx)).toBe(before)}
function choose(ctx:Ctx,uid:number,p=policy){expect(executeBattleCommand(ctx,p,select(ctx,uid))).toEqual({ok:true});return advanceBattle(ctx,p)}
describe('plumbing.activation-choice',()=>{
 it('waits before beginActivation, then selects by UID rather than array position or policy order',()=>{
  const ctx=fixture();expect(advanceBattle(ctx,policy)).toEqual({kind:'selecting',unitUids:[402,7,99]})
  expect(ctx.events.some(e=>e.type==='activation.begin')).toBe(false);expect(ctx.state.units.every(u=>u.activationOrdinal===0)).toBe(true)
  const before=saveBattle(ctx);expect(activationChoices(ctx,policy)).toEqual([402,7,99]);expect(advanceBattle(ctx,policy)).toEqual({kind:'selecting',unitUids:[402,7,99]});expect(saveBattle(ctx)).toBe(before)
  const command=select(ctx,99);expect(validateBattleCommand(ctx,policy,command)).toEqual({ok:true});expect(saveBattle(ctx)).toBe(before)
  expect(executeBattleCommand(ctx,policy,command)).toEqual({ok:true});expect(ctx.state.units.every(u=>u.activationOrdinal===0)).toBe(true);expect(ctx.events.at(-1)).toMatchObject({type:'activation.selected',actor:2,unitUid:99})
  expect(advanceBattle(ctx,policy)).toEqual({kind:'acting',actor:2});expect(ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor)).toEqual([2]);expect(ctx.battleCursor!.order).toEqual([2,0,1])
 })
 it('rejects malformed, accessor, stale, wrong-phase and wrong-controller choices without any mutation',()=>{
  const ctx=fixture();advanceBattle(ctx,policy)
  for(const command of [null,{},[],{...select(ctx,99),extra:true},{...select(ctx,99),unitUid:-1},{...select(ctx,99),unitUid:2**32},{...select(ctx,99),unitUid:NaN},{...select(ctx,99),unitUid:2},{...select(ctx,99),expectedSeq:ctx.state.seq-1},select(ctx,900),{kind:'select-activation',actor:2,expectedSeq:ctx.state.seq}])reject(ctx,command)
  let read=false;reject(ctx,Object.defineProperty({...select(ctx,99)},'unitUid',{get(){read=true;return 99}}));expect(read).toBe(false)
  reject(ctx,select(ctx,99),{humanUnitUids:[402]});const stale=select(ctx,99);choose(ctx,99);reject(ctx,stale);reject(ctx,select(ctx,7))
 })
 it('rejects dead, blocked and spent actors, preserving the remaining phase snapshot',()=>{
  const ctx=fixture();advanceBattle(ctx,policy);ctx.state.units[1]!.hp=0;ctx.state.units[1]!.lifeState='dead';reject(ctx,select(ctx,7));expect(activationChoices(ctx,policy)).toEqual([402,99])
  const block=Object.values(ctx.statuses).find(s=>s.blocksAction)!;applyStatus(ctx,0,block.id,1,'test');reject(ctx,select(ctx,402));expect(activationChoices(ctx,policy)).toEqual([99])
  expect(choose(ctx,99)).toEqual({kind:'acting',actor:2});expect(executeBattleCommand(ctx,policy,{kind:'end-cycle',actor:2,expectedSeq:ctx.state.seq})).toEqual({ok:true});advanceBattle(ctx,policy);reject(ctx,select(ctx,99))
  expect(ctx.events.filter(e=>e.type==='activation.end'&&e.actor===0)).toHaveLength(1)
 })
 it('preserves AI relative order while humans may choose a different order',()=>{
  const ctx=fixture(),mixed={humanUnitUids:[402,99]},begun:number[]=[]
  expect(advanceBattle(ctx,mixed)).toEqual({kind:'selecting',unitUids:[402,99]});expect(choose(ctx,99,mixed)).toEqual({kind:'acting',actor:2});completeActionCycle(ctx)
  expect(advanceBattle(ctx,mixed)).toEqual({kind:'selecting',unitUids:[402]});expect(choose(ctx,402,mixed)).toEqual({kind:'acting',actor:0});completeActionCycle(ctx)
  for(const actor of [1,3,4]){expect(advanceBattle(ctx,mixed)).toEqual({kind:'acting',actor});expect(controllerOf(ctx,actor,mixed)).toBe('ai');completeActionCycle(ctx)}
  begun.push(...ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor!));expect(begun).toEqual([2,0,1,3,4]);expect(advanceBattle(ctx,mixed).kind).toBe('selecting')
 })
 it('ownership overrides remain authoritative, and new phase arrivals cannot join captured selection',()=>{
  const ctx=fixture();advanceBattle(ctx,policy);const ai=Object.values(ctx.statuses).find(s=>s.aiControlled)!;expect(ai).toBeDefined();applyStatus(ctx,2,ai.id,1,'test');expect(controllerOf(ctx,2,policy)).toBe('ai');reject(ctx,select(ctx,99));expect(activationChoices(ctx,policy)).toEqual([402,7])
  ctx.state.units.push({...structuredClone(ctx.state.units[0]!),id:5,uid:777,hex:100});const expanded={humanUnitUids:[...policy.humanUnitUids,777]};reject(ctx,select(ctx,777),expanded);expect(activationChoices(ctx,expanded)).toEqual([402,7])
 })
 it('restores reachable mid-phase ownership changes and rejects forged allegiance changes',()=>{
  const ctx=fixture();advanceBattle(ctx,policy);const ai=Object.values(ctx.statuses).find(s=>s.aiControlled)!
  applyStatus(ctx,2,ai.id,1,'test')
  for(const other of [restoreBattle(saveBattle(ctx),ctx),copy(ctx)]){
   expect(activationChoices(other,policy)).toEqual([402,7]);reject(other,select(other,99));expect(choose(other,7)).toEqual({kind:'acting',actor:1})
  }
  const forged=JSON.parse(saveBattle(ctx));forged.state.units[0].side='enemy'
  expect(()=>restoreBattle(JSON.stringify(forged),ctx)).toThrow(/cursor order side/)
 })
 it('keeps Surge on the selected actor and runs its end ladder only once',()=>{
  const ctx=fixture();ctx.state.units[2]!.surge=100;advanceBattle(ctx,policy);choose(ctx,99);completeActionCycle(ctx)
  expect(advanceBattle(ctx,policy)).toEqual({kind:'acting',actor:2});expect(ctx.events.filter(e=>e.type==='activation.selected')).toHaveLength(1);expect(ctx.events.filter(e=>e.type==='activation.begin')).toHaveLength(1);reject(ctx,select(ctx,402))
  ctx.state.units[2]!.surge=0;completeActionCycle(ctx);expect(advanceBattle(ctx,policy)).toEqual({kind:'selecting',unitUids:[402,7]});expect(ctx.events.filter(e=>e.type==='activation.end'&&e.actor===2)).toHaveLength(1)
 })
 it('restores and forks pending selection and selected-but-not-begun boundaries independently',()=>{
  const ctx=fixture();advanceBattle(ctx,policy);const restored=restoreBattle(saveBattle(ctx),ctx),fork=copy(ctx)
  for(const other of [restored,fork]){expect(advanceBattle(other,policy)).toEqual({kind:'selecting',unitUids:[402,7,99]});expect(choose(other,7)).toEqual({kind:'acting',actor:1})}
  expect(saveBattle(restored)).toBe(saveBattle(fork));expect(ctx.battleCursor!.at).toBe('selecting');expect(ctx.state.units.every(u=>u.activationOrdinal===0)).toBe(true)
  expect(executeBattleCommand(ctx,policy,select(ctx,99))).toEqual({ok:true});const selected=restoreBattle(saveBattle(ctx),ctx);expect(advanceBattle(selected,policy)).toEqual({kind:'acting',actor:2});expect(advanceBattle(ctx,policy)).toEqual({kind:'acting',actor:2});expect(saveBattle(selected)).toBe(saveBattle(ctx))
 })
 it('default automatic driver safely resumes pending selection with exact fixed-order events and RNG',()=>{
  const ctx=fixture(),automatic=copy(ctx);advanceBattle(ctx,policy);const restored=restoreBattle(saveBattle(ctx),ctx),expected=runBattle(automatic),actual=runBattle(restored)
  expect(actual).toEqual(expected);expect(restored.state).toEqual(automatic.state);expect(restored.events).toEqual(automatic.events);expect(restored.rng).toEqual(automatic.rng);expect(restored.events.some(e=>e.type==='activation.selected')).toBe(false)
 })
 it('selected human action uses the same shared resolver as AI and preserves prior slot rules',()=>{
  const ctx=fixture();advanceBattle(ctx,policy);choose(ctx,99);const direct=copy(ctx)
  const selected=ctx.events.filter(e=>e.type==='activation.selected');expect(selected).toHaveLength(1)
  reject(ctx,{kind:'action',actor:0,actionId:'power.move',destination:84,expectedSeq:ctx.state.seq});const move={kind:'action',actor:2,actionId:'power.move',destination:88,expectedSeq:ctx.state.seq};expect(validateBattleCommand(ctx,policy,move).ok).toBe(true);expect(executeBattleCommand(ctx,policy,move).ok).toBe(true);expect(executeAction(direct,{actor:2,actionId:'power.move',destination:88})).toEqual({ok:true});expect(ctx.state).toEqual(direct.state);expect(ctx.events).toEqual(direct.events);expect(ctx.rng).toEqual(direct.rng)
  reject(ctx,{...move,expectedSeq:ctx.state.seq});expect(ctx.state.units[2]!.moveUsed).toBe(true);expect(ctx.state.units[0]!.moveUsed).toBe(false)
 })
 it('permits a trusted enemy UID at its own phase without treating allegiance as ownership',()=>{
  const ctx=fixture(),enemyPolicy={humanUnitUids:[900]}
  for(const actor of [0,1,2]){expect(advanceBattle(ctx,enemyPolicy)).toEqual({kind:'acting',actor});completeActionCycle(ctx)}
  expect(advanceBattle(ctx,enemyPolicy)).toEqual({kind:'selecting',unitUids:[900]});reject(ctx,select(ctx,402),enemyPolicy);expect(choose(ctx,900,enemyPolicy)).toEqual({kind:'acting',actor:3})
 })
 it('rejects malformed pending snapshots and rewinding an already spent actor into selection',()=>{
  const ctx=fixture();advanceBattle(ctx,policy);choose(ctx,99);completeActionCycle(ctx);advanceBattle(ctx,policy);const saved=JSON.parse(saveBattle(ctx))
  for(const edit of [(s:any)=>s.cursor.actor=0,(s:any)=>s.cursor.next=0,(s:any)=>s.cursor.order.push(s.cursor.order[0])]){const bad=structuredClone(saved);edit(bad);expect(()=>restoreBattle(JSON.stringify(bad),ctx)).toThrow()}
  expect(executeBattleCommand(ctx,policy,select(ctx,7))).toEqual({ok:true});const selected=JSON.parse(saveBattle(ctx));selected.events.at(-1).unitUid=402;expect(()=>restoreBattle(JSON.stringify(selected),ctx)).toThrow(/selected activation/)
 })

})
