import {afterEach,describe,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {createBattle} from '../src/core/setup.js'
import {beginActivation} from '../src/core/mutate.js'
import {runActivation} from '../src/ai/modes.js'
import * as commands from '../src/core/commands.js'
import {movementOptions,planMovement,stepCost,executeMove} from '../src/core/movement.js'
import type {MoveDef} from '../src/core/types.js'
const captured:any[]= JSON.parse(readFileSync(new URL('./fixtures/melee-contact-atlas.json',import.meta.url),'utf8'))
const open=Array(5).fill('........')
function setup(hero:number,enemy:number,rows=open,type='unit.zombie'){
 const ctx=createBattle({map:{id:'test.contact',name:'Contact',rows},replicate:0,heroes:['test-warrior'],enemies:[type],heroHexes:[hero],enemyHexes:[enemy]});beginActivation(ctx,1,'test');return ctx
}
afterEach(()=>vi.restoreAllMocks())
describe('fix.ai-melee-contact',()=>{
 it.each([[17,21,18],[21,17,20]])('open contact from hero %i and enemy %i stops at %i', (hero,enemy,dest)=>{
  const ctx=setup(hero!,enemy!),spy=vi.spyOn(commands,'executeAction');runActivation(ctx,1)
  expect(spy).toHaveBeenCalledWith(ctx,{actor:1,destination:dest,actionId:'power.move'});expect(ctx.state.units[1]!.hex).toBe(dest)
  expect(ctx.events.filter(e=>e.type==='moved'&&e.actor===1)).toHaveLength(3);expect(ctx.events.some(e=>e.type==='aoo.provoked')).toBe(false)
 })
 it.each(['unit.zombie','unit.skeleton'])('%s uses the same least-cost contact policy',type=>{
  const ctx=setup(17,21,open,type);ctx.state.units[1]!.ai='dumb-melee';const spy=vi.spyOn(commands,'executeAction');runActivation(ctx,1);expect(spy).toHaveBeenCalledWith(ctx,{actor:1,destination:18,actionId:'power.move'})
 })
 it('uses actual weighted movement cost before hex ID',()=>{
  const ctx=setup(20,24,['h......h','....h...','...h....','h....h..','....h...']),spy=vi.spyOn(commands,'executeAction');runActivation(ctx,1);expect(spy).toHaveBeenCalledWith(ctx,{actor:1,destination:27,actionId:'power.move'})
 })
 it('uses path length after equal cost, then hex ID after both tie',()=>{
  const ctx=setup(11,15,['h.......','....h...','........','.....h..','........']),spy=vi.spyOn(commands,'executeAction');runActivation(ctx,1);expect(spy).toHaveBeenCalledWith(ctx,{actor:1,destination:12,actionId:'power.move'})
  const tie=setup(9,27),plans=movementOptions(tie,1,'power.move');const scored=plans.map(p=>({p,d:tie.geo.distance(p.destination,9),cost:p.path.reduce((v,h,i)=>v+stepCost(tie,h,i?p.path[i-1]:27),0)})).sort((a,b)=>a.d-b.d||a.cost-b.cost||a.p.path.length-b.p.path.length||a.p.destination-b.p.destination)
  expect(scored.filter(v=>v.d===scored[0]!.d&&v.cost===scored[0]!.cost&&v.p.path.length===scored[0]!.p.path.length).length).toBeGreaterThan(1)
  runActivation(tie,1);expect(spy).toHaveBeenCalledWith(tie,{actor:1,destination:scored[0]!.p.destination,actionId:'power.move'})
 })
 it('exposes exact pure path cost, including explicit low edges, in both planners',()=>{
  const ctx=setup(17,21);ctx.state.props.push({id:'prop.edge',height:'low',material:1,crossingCost:1,footprint:{kind:'polygon',vertices:[[7900,5000],[8100,5000],[8100,7000],[7900,7000]],movementPadding:0}})
  const before=structuredClone({state:ctx.state,events:ctx.events,rng:ctx.rng});let extra=false
  for(const p of movementOptions(ctx,1,'power.move')){const cost=p.path.reduce((v,h,i)=>v+stepCost(ctx,h,i?p.path[i-1]:21),0);expect(p.pathCost).toBe(cost);expect(planMovement(ctx,1,'power.move',p.destination)).toEqual(p);if(cost>p.path.length)extra=true}
  expect(extra).toBe(true);expect({state:ctx.state,events:ctx.events,rng:ctx.rng}).toEqual(before)
 })
 it.each(captured)('actual $name continuation state chooses $best rather than $old',row=>{
  const ctx=createBattle(row.setup);ctx.state=structuredClone(row.state);ctx.battleCursor=structuredClone(row.cursor);ctx.rng={...structuredClone(row.rng),seen:row.rng.seen?new Map(row.rng.seen):null};ctx.events=[]
  const spy=vi.spyOn(commands,'executeAction');runActivation(ctx,row.actor);expect(spy).toHaveBeenCalledWith(ctx,{actor:row.actor,destination:row.best,actionId:'power.move'})
  expect(ctx.events.some(e=>e.type==='aoo.provoked')).toBe(false);expect(ctx.state.units[row.actor]!.hex).toBe(row.best);expect(row.oldEvents.some((e:any)=>e.type==='aoo.provoked')).toBe(true)
 })
 it('keeps the existing reaction when a legal path deliberately continues after contact',()=>{
  const ctx=setup(17,21),power=ctx.actions['power.move'] as MoveDef
  executeMove(ctx,1,[20,19,18],power);expect(ctx.events.some(e=>e.type==='aoo.provoked')).toBe(false)
  const continued=setup(17,21);executeMove(continued,1,[20,19,18,9],power)
  const reaction=continued.events.findIndex(e=>e.type==='aoo.provoked');expect(reaction).toBeGreaterThan(0)
  expect(continued.events.slice(0,reaction).filter(e=>e.type==='moved').map(e=>e['to'])).toEqual([20,19,18])
 })
})
