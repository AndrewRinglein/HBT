import {describe,it,expect} from 'vitest'
import {createBattle} from '../src/core/setup.js'
import {scenarioDef,scenarioOptions} from '../src/content/scenarios.js'
import {runBattle,advanceBattle} from '../src/core/battle.js'
import {attackLineClear,forkAttackLines} from '../src/core/los.js'
import {passableHexes,decodeProps} from '../src/core/props.js'
import {reachable,planMovement,executeMove,executeKnockback,flightLandings} from '../src/core/movement.js'
import {executeBattleCommand} from '../src/core/commands.js'
import {saveBattle,restoreBattle} from '../src/core/snapshot.js'
import {prepareBattleField} from '../src/view/field.js'
import {arrive} from '../src/core/encounter.js'
import {decodeMap} from '../src/content/maps.js'
import type {MoveDef} from '../src/core/types.js'
import {segmentCrossesPolygon,segmentNearPolygon,centerPoint,type Point} from '../src/core/geometry.js'
import {attackLineStats} from '../src/core/los.js'

const wall=(vertices=[[3900,1800],[4100,1800],[4100,4200],[3900,4200]],movementPadding=0)=>({id:'prop.test-wall',height:'high',material:3,footprint:{kind:'polygon',vertices,movementPadding}})
const row=(props:any[]=[wall()],floor?:boolean[])=>({id:'test.map.geometry',name:'Geometry',rows:['.....','.....','.....'],props,...(floor?{floor}:{})})
const setup=(map:any=row(),heroHexes=[5],enemyHexes=[9])=>createBattle({replicate:0,map,heroes:['test-ranger'],enemies:['test-zombie'],heroHexes,enemyHexes})
describe('terrain.authored-geometry',()=>{
 it.each(['test.geometry-corridor','test.geometry-diagonal'])('%s runs real pure-data geometry',id=>{
  const ctx=createBattle(scenarioOptions(scenarioDef(id)));expect(ctx.state.props.some(p=>p.footprint.kind==='polygon')).toBe(true)
  expect((ctx.state as any).floor).toContain(false);runBattle(ctx);expect(ctx.events.some(e=>e.type==='battle.end')).toBe(true)
 })
 it('blocks a finite wall between open centers without blocking an unrelated ray',()=>{
  const ctx=setup();expect(passableHexes(ctx)(6)).toBe(true);expect(passableHexes(ctx)(7)).toBe(true)
  expect(attackLineClear(ctx,5,9)).toBe(false);expect(attackLineClear(ctx,9,5)).toBe(false)
  expect(attackLineClear(ctx,0,4)).toBe(true)
  advanceBattle(ctx)
  expect(planMovement(ctx,0,'power.move',7)).toMatchObject({kind:'move'})
  const path=(planMovement(ctx,0,'power.move',7) as any).path
  expect(path).not.toEqual([6,7])
 })
 it('keeps absent floor out of LOS while rejecting every destination consumer',()=>{
  const floor=Array(15).fill(true);floor[7]=false;const ctx=setup(row([],floor))
  expect(attackLineClear(ctx,5,9)).toBe(true);expect(passableHexes(ctx)(7)).toBe(false)
  expect(reachable(ctx,ctx.state.units[0]!).has(7)).toBe(false)
  expect(()=>setup(row([],floor),[7])).toThrow(/impassable/)
  expect(arrive(ctx,ctx.units!['test-zombie']!,7,'test',{}).hex).not.toBe(7)
  expect(flightLandings(ctx,ctx.state.units[0]!,ctx.actions['power.flight'] as MoveDef)).not.toContain(7)
 })
 it('padding changes movement but not physical LOS; weighted metric respects x anisotropy',()=>{
  const narrow=wall([[3400,2900],[3500,2900],[3500,3100],[3400,3100]],700)
  const ctx=setup(row([narrow]),[0]);expect(passableHexes(ctx)(6)).toBe(false)
  expect(attackLineClear(ctx,1,11)).toBe(true)
  ;(ctx.state.props[0]!.footprint as any).movementPadding=600
  expect(passableHexes(ctx)(6)).toBe(true);expect(attackLineClear(ctx,1,11)).toBe(true)
 })
 it('rejects a walking command across the wall atomically, but flight keeps destination-only semantics',()=>{
  const ctx=setup(row([wall()]),[6]);const u=ctx.state.units[0]!;u.actions.push('power.sidestep','power.flight');advanceBattle(ctx)
  const before=saveBattle(ctx)
  expect(executeBattleCommand(ctx,{humanUnitUids:[u.uid]},{kind:'action',actor:0,actionId:'power.sidestep',destination:7,expectedSeq:ctx.state.seq}).ok).toBe(false)
  expect(saveBattle(ctx)).toBe(before)
  expect(executeMove(ctx,0,[7],ctx.actions['power.move'] as MoveDef)).toBe(0);expect(saveBattle(ctx)).toBe(before)
  expect(executeBattleCommand(ctx,{humanUnitUids:[u.uid]},{kind:'action',actor:0,actionId:'power.flight',destination:7,expectedSeq:ctx.state.seq}).ok).toBe(true)
 })
 it('knockback stops at the thin physical wall even though target center is open',()=>{
  const ctx=setup(row([wall()]),[5],[6]);expect(executeKnockback(ctx,0,1,1,'test')).toBe(0)
  // v2.knockback-collisions (2026-09-23, Law 10 — the rule changed, COMBAT-V2 §9.3): the stopped
  // push is a collision now, so the blocked line is followed by the mover's collision damage.
  expect(ctx.state.units[1]!.hex).toBe(6);expect(ctx.events.at(-2)?.type).toBe('knockback.blocked')
  expect(ctx.events.at(-1)).toMatchObject({type:'damage.applied',target:1,collision:true,collidedWith:'prop',collisionValue:2,remaining:1})
 })
 it('detaches initial facts and observes polygon replacement/in-place edits across forks and restore',()=>{
  const input=row();const ctx=setup(input),initial=ctx.events.find(e=>e.type==='map.loaded')!
  input.props[0].footprint.vertices[0][0]=1;expect((initial.props as any)[0].footprint.vertices[0][0]).toBe(3900)
  const fork=restoreBattle(saveBattle(ctx),ctx);forkAttackLines(ctx,fork)
  expect(attackLineClear(fork,5,9)).toBe(false)
  ;(ctx.state.props[0]!.footprint as any).vertices=[[3900,6000],[4100,6000],[4100,6200],[3900,6200]]
  expect(attackLineClear(ctx,5,9)).toBe(true);expect(attackLineClear(fork,5,9)).toBe(false)
  ctx.state.props=[];expect(attackLineClear(ctx,5,9)).toBe(true)
 })
 it('transports floor/physical polygon through JSON and exact passive field preparation',()=>{
  const floor=Array(15).fill(true);floor[0]=false;const ctx=setup(row([wall()],floor))
  const restored=restoreBattle(saveBattle(ctx),ctx);expect(restored.state).toEqual(ctx.state)
  const field=prepareBattleField(JSON.parse(JSON.stringify(ctx.events)),{mapId:ctx.state.mapId}).field
  expect((field as any).floor).toEqual(floor);expect(field.passable[0]).toBe(false);expect(field.props).toEqual(ctx.state.props)
  for(const target of ['state','initial']){const s=JSON.parse(saveBattle(ctx));const h=target==='state'?s.state:s.events.find((e:any)=>e.type==='map.loaded');h.floor=[true];expect(()=>restoreBattle(JSON.stringify(s),ctx)).toThrow(/floor/)}
 })
 it.each([[[0,0],[1,1]],[[0,0],[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[3,0],[1,1],[3,3],[0,3]],[[0,0],[3,3],[0,3],[3,0]],[[0,0],[1.5,0],[0,1]],[[0,0],[40000001,0],[0,1]]].map(vertices=>({vertices})))('rejects invalid finite convex vertices $vertices',({vertices})=>{
  expect(()=>decodeProps([wall(vertices)],15)).toThrow(/prop|polygon/)
 })
 it.each([null,[],[true],Array(15).fill(1)].map(floor=>({floor})))('rejects invalid floor $floor',({floor})=>{expect(()=>decodeMap({...row(),floor} as any)).toThrow(/floor/)})
 it('agrees for every pair with an independent BigInt segment-edge oracle on both orientations',()=>{
  const cross=(a:Point,b:Point,c:Point)=>BigInt(b[0]-a[0])*BigInt(c[1]-a[1])-BigInt(b[1]-a[1])*BigInt(c[0]-a[0])
  const between=(a:Point,b:Point,c:Point)=>cross(a,b,c)===0n&&c[0]>=Math.min(a[0],b[0])&&c[0]<=Math.max(a[0],b[0])&&c[1]>=Math.min(a[1],b[1])&&c[1]<=Math.max(a[1],b[1])
  const sign=(n:bigint)=>n<0n?-1:n>0n?1:0
  const edges=(a:Point,b:Point,c:Point,d:Point)=>between(a,b,c)||between(a,b,d)||between(c,d,a)||between(c,d,b)||(sign(cross(a,b,c))*sign(cross(a,b,d))<0&&sign(cross(c,d,a))*sign(cross(c,d,b))<0)
  const inside=(a:Point,v:Point[])=>{const turns=v.map((p,i)=>sign(cross(p,v[(i+1)%v.length]!,a)));return turns.every(n=>n>=0)||turns.every(n=>n<=0)}
  const polygons:Point[][]=[[[3200,800],[5700,1600],[4800,5200],[2300,4400]],[[2000,0],[4000,3000],[2000,6000],[0,3000]],[[3900,1800],[4100,1800],[4100,4200],[3900,4200]]]
  for(const v of polygons)for(const vertices of [v,[...v].reverse()])for(let a=0;a<30;a++)for(let b=0;b<30;b++){
   const p=centerPoint({width:6,height:5},a),q=centerPoint({width:6,height:5},b)
   const expected=inside(p,vertices)||inside(q,vertices)||vertices.some((r,i)=>edges(p,q,r,vertices[(i+1)%vertices.length]!))
   expect(segmentCrossesPolygon(p,q,vertices)).toBe(expected)
  }
 })
 it('handles exact tangent and padding boundaries including large coordinates without rounded products',()=>{
  const rect:Point[]=[[0,0],[2000,0],[2000,2000],[0,2000]]
  expect(segmentCrossesPolygon([-1000,0],[3000,0],rect)).toBe(true)
  expect(segmentCrossesPolygon([-1000,-1],[3000,-1],rect)).toBe(false)
  expect(segmentNearPolygon([-1000,-640],[3000,-640],rect,640)).toBe(true)
  expect(segmentNearPolygon([-1000,-641],[3000,-641],rect,640)).toBe(false)
  const huge:Point[]=[[-40000000,-40000000],[40000000,-40000000],[40000000,40000000],[-40000000,40000000]]
  expect(segmentCrossesPolygon([-40000000,40000000],[40000000,40000000],huge)).toBe(true)
  expect(segmentNearPolygon([-40000000,40000640],[40000000,40000640],huge,640)).toBe(true)
  expect(segmentNearPolygon([-40000000,40000641],[40000000,40000641],huge,640)).toBe(false)
 })
 it('invalidates additions, removals, padding, dimensions and floor independently without retained mutable views',()=>{
  const ctx=setup(row([]));expect(attackLineClear(ctx,5,9)).toBe(true)
  ctx.state.props=[wall() as any];expect(attackLineClear(ctx,5,9)).toBe(false)
  const previous=passableHexes(ctx);(ctx.state as any).floor=Array(15).fill(true);(ctx.state as any).floor[6]=false
  expect(previous(6)).toBe(true);expect(passableHexes(ctx)(6)).toBe(false)
  expect(attackLineClear(ctx,0,4)).toBe(true)
  ctx.state.props=[];expect(attackLineClear(ctx,5,9)).toBe(true)
  expect(attackLineStats(ctx).bytes).toBeLessThan(1000)
 })
 it('refuses excessive or accessor geometry before allocation without executing input code',()=>{
  const vertices=wall().footprint.vertices;Object.defineProperty(vertices,'0',{get(){throw Error('executed input')}})
  expect(()=>decodeProps([wall(vertices)],15)).toThrow(/dense data/)
  const floor=Array(15).fill(true);Object.defineProperty(floor,'0',{get(){throw Error('executed input')}})
  expect(()=>decodeMap({...row(),floor})).toThrow(/floor/)
  const invalid=[-1,1.5,100001,null,undefined]
  for(const movementPadding of invalid)expect(()=>decodeProps([{...wall(),footprint:{...wall().footprint,movementPadding}}],15)).toThrow(/padding/)
  const ctx=createBattle({replicate:0,heroes:[],enemies:[],map:{id:'test.map.limit',name:'Limit',rows:Array(100).fill('.'.repeat(100))}})
  ctx.state.props=Array.from({length:6},(_,i)=>({...wall(),id:'prop.limit.'+i,footprint:{...wall().footprint,vertices:wall().footprint.vertices.map(([x,y])=>[x!+i,y!])}})) as any
  expect(()=>attackLineClear(ctx,0,9999)).toThrow(/work limit/)
 })
})
