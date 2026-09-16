import {describe,it,expect} from 'vitest'
import {createBattle} from '../src/core/setup.js'
import {scenarioDef,scenarioOptions} from '../src/content/scenarios.js'
import {runBattle,advanceBattle} from '../src/core/battle.js'
import {preview,performAttack,canAttack,resolveDamage,damageSourceOfAttack} from '../src/core/pipeline.js'
import {attackLineClear,segmentCrossesCell} from '../src/core/los.js'
import {passableHexes,decodeProps} from '../src/core/props.js'
import {stepCost,executeMove,planMovement,executeSidestep,executeKnockback,flightLandings,reachable} from '../src/core/movement.js'
import {executeBattleCommand} from '../src/core/commands.js'
import {hasLowCover,coverStats,lowPropCovers,preparedLowEdgeCost} from '../src/core/cover.js'
import type {Point} from '../src/core/geometry.js'
import {saveBattle,restoreBattle} from '../src/core/snapshot.js'
import {forkBattle} from '../src/core/fork.js'
import {prepareBattleField} from '../src/view/field.js'
import type {AttackDef,MoveDef} from '../src/core/types.js'
const bow='attack.test-ranger.bow'
const hex=(hexes=[10])=>({id:'prop.crates',height:'low',material:1,footprint:{kind:'hex',hexes}})
const polygon=(vertices=[[7800,2100],[8200,2100],[8200,3900],[7800,3900]],crossingCost?:number)=>({id:'prop.fence',height:'low',material:2,footprint:{kind:'polygon',vertices,movementPadding:0},...(crossingCost===undefined?{}:{crossingCost})})
const row=(props:any[]=[hex()])=>({id:'test.map.cover',name:'Cover',rows:['.......','.......','.......'],props})
const setup=(props:any[]=[hex()],replicate=0)=>createBattle({replicate,map:row(props) as any,heroes:['test-ranger'],enemies:['test-zombie'],heroHexes:[7],enemyHexes:[11]})
describe('terrain.low-cover',()=>{
 it.each(['test.cover-crates','test.cover-fence'])('%s is live plain data',id=>{const ctx=createBattle(scenarioOptions(scenarioDef(id)));expect(ctx.state.props.some(p=>(p.height as string)==='low')).toBe(true);runBattle(ctx);expect(ctx.events.some(e=>e.type==='battle.end')).toBe(true)})
 it('low cells stay passable, do not block attack lines, and apply one capped cover instance',()=>{
  const open=setup([]),covered=setup([hex([10,11]),{...hex([10]),id:'prop.second'}]);const pv=preview(open,0,1,bow),cv=preview(covered,0,1,bow)
  expect(passableHexes(covered)(10)).toBe(true);expect(attackLineClear(covered,7,11)).toBe(true)
  expect(cv.accuracy).toBe(pv.accuracy-20);expect(cv.damageOnHit).toBe(pv.damageOnHit-1)
  expect(cv.damageOnCrit).toBe(pv.damageOnCrit-1);expect(cv.accLedger.filter(r=>r.name==='COVER')).toHaveLength(1)
 })
 it('excludes source-own and distant cover while using only the crossed target neighbor',()=>{
  const pv=preview(setup([]),0,1,bow)
  for(const props of [[hex([7])],[hex([8])],[hex([4])]])expect(preview(setup(props),0,1,bow)).toEqual(pv)
  expect(preview(setup([hex([10])]),0,1,bow).accuracy).toBe(pv.accuracy-20)
 })
 it('clips a long rotated polygon to the target end instead of counting its distant intersection',()=>{
  const open=preview(setup([]),0,1,bow)
  const distant=polygon([[2500,2700],[9000,4500],[9000,4700],[2500,2900]])
  expect(preview(setup([distant]),0,1,bow).accuracy).toBe(open.accuracy)
  expect(preview(setup([polygon()]),0,1,bow).accuracy).toBe(open.accuracy-20)
 })
 it('keys cover on attack kind, not range, for melee reach',()=>{
  const a=setup([]),b=setup([hex([10])]);for(const ctx of[a,b]){const atk=structuredClone(ctx.actions[bow]!) as any;atk.id='attack.test-reach';atk.attack.kind='melee';atk.range=4;ctx.actions={...ctx.actions,[atk.id]:atk};ctx.state.units[0]!.actions.push(atk.id)}
  const av=preview(a,0,1,'attack.test-reach'),bv=preview(b,0,1,'attack.test-reach');expect(bv.accuracy).toBe(av.accuracy);expect(bv.damageOnHit).toBe(av.damageOnHit-1)
 })
 it('keeps legacy area attacks unchanged',()=>{
  const a=setup([]),b=setup();for(const ctx of[a,b]){const atk=structuredClone(ctx.actions[bow]!) as any;atk.area='blast1';ctx.actions={...ctx.actions,[bow]:atk}}
  expect(preview(b,0,1,bow)).toEqual(preview(a,0,1,bow))
 })
 it('charges only explicitly authored low edge crossings in planning and actual movement',()=>{
  const barrier=polygon([[3800,2000],[4200,2000],[4200,4000],[3800,4000]],1),ctx=setup([barrier]);advanceBattle(ctx)
  expect(stepCost(ctx,9,8)).toBe(2);expect(stepCost(ctx,8,7)).toBe(1)
  const before=ctx.state.units[0]!.movePointsLeft;expect(executeMove(ctx,0,[8,9],ctx.actions['power.move'] as MoveDef)).toBe(2)
  expect(ctx.state.units[0]!.movePointsLeft).toBe(before-3)
  const {crossingCost,...crate}=barrier;const ordinary=setup([crate]);expect(stepCost(ordinary,9,8)).toBe(1)
 })
 it('observes low prop edits, height swaps, forks and restore without changing initial facts',()=>{
  const ctx=setup(),pv=preview(ctx,0,1,bow),saved=saveBattle(ctx),fork=forkBattle(ctx)
  ;(ctx.state.props[0]!.footprint as any).hexes=[7];expect(preview(ctx,0,1,bow).accuracy).toBe(pv.accuracy+20)
  expect(preview(fork,0,1,bow)).toEqual(pv);expect(preview(restoreBattle(saved,ctx),0,1,bow)).toEqual(pv)
  ctx.state.props[0]!.height='high';(ctx.state.props[0]!.footprint as any).hexes=[10];expect(attackLineClear(ctx,7,11)).toBe(false)
  expect(prepareBattleField(ctx.events,{mapId:ctx.state.mapId}).field.props[0]!.height).toBe('low')
 })
 it('all seeded actual hits agree with preview and emits a cover miss attribution',()=>{
  let pings=0,hits=0
  for(let seed=0;seed<100;seed++){const ctx=setup([hex()],seed);ctx.cfg.switches.critEnabled=false;advanceBattle(ctx);expect(canAttack(ctx,0,1,bow)).toBe(true);const pv=preview(ctx,0,1,bow);const result=performAttack(ctx,0,1,bow);if(result.hit){hits++;expect(result.damage).toBe(result.crit?pv.damageOnCrit:pv.damageOnHit)}else{const ev=ctx.events.find(e=>e.type==='attack.miss')!;if(result.roll<=Math.min(100,pv.accuracy+20)){expect(ev.cover).toBe(true);pings++}}}
  expect(hits).toBeGreaterThan(0);expect(pings).toBeGreaterThan(0)
 })
 it('rejects illegal crossing-cost roles and preserves high schema',()=>{
  for(const prop of [{...hex(),crossingCost:1},{...polygon(),height:'high',crossingCost:1},{...polygon(),crossingCost:2}])expect(()=>decodeProps([prop],21)).toThrow(/crossing|prop/)
 })
 it('matches an independent rational subdivision oracle in every direction and with reversed winding',()=>{
  // Independent algorithm: subdivide the segment at every polygon/hex edge
  // intersection, then test rational endpoints and open interval midpoints.
  // No production clipping or orientation helper participates in this oracle.
  type F=[bigint,bigint]
  const cmp=(a:F,b:F)=>a[0]*b[1]-b[0]*a[1]
  const center=(h:number):Point=>[2000*(h%7)+1000*(Math.floor(h/7)%2),3000*Math.floor(h/7)]
  const cell=(h:number):Point[]=>{const[x,y]=center(h);return [[x,y-2000],[x+1000,y-1000],[x+1000,y+1000],[x,y+2000],[x-1000,y+1000],[x-1000,y-1000]]}
  const cross=(x:bigint,y:bigint,u:bigint,v:bigint)=>x*v-y*u
  const inside=(a:Point,b:Point,t:F,v:readonly Point[])=>{
   const x=BigInt(a[0])*t[1]+BigInt(b[0]-a[0])*t[0],y=BigInt(a[1])*t[1]+BigInt(b[1]-a[1])*t[0]
   const signs=v.map((p,i)=>{const q=v[(i+1)%v.length]!;return cross(BigInt(q[0]-p[0]),BigInt(q[1]-p[1]),x-BigInt(p[0])*t[1],y-BigInt(p[1])*t[1])})
   return signs.every(n=>n>=0n)||signs.every(n=>n<=0n)
  }
  const shapes=[polygon(),polygon([[2500,2700],[9000,4500],[9000,4700],[2500,2900]]),polygon([[0,0],[2000,0],[2000,6000],[0,6000]]),polygon([[4500,800],[6500,1400],[5300,5400],[3300,4800]])]
  let directional=0,covered=0
  for(const raw of shapes)for(const vertices of [raw.footprint.vertices,[...raw.footprint.vertices].reverse()]){
   const ctx=setup([polygon(vertices)]),prop=ctx.state.props[0]!
   for(let a=0;a<21;a++)for(let b=0;b<21;b++){
    const p=center(a),q=center(b),own=cell(a),regions=[b,...ctx.geo.neighboursOf(b)].filter(h=>h!==a).map(cell),v=vertices as unknown as Point[]
    const ts:F[]=[[0n,1n],[1n,1n]]
    for(const polygon of [v,own,...regions])for(let i=0;i<polygon.length;i++){
     const r=polygon[i]!,s=polygon[(i+1)%polygon.length]!,dx=BigInt(q[0]-p[0]),dy=BigInt(q[1]-p[1]),ex=BigInt(s[0]-r[0]),ey=BigInt(s[1]-r[1])
     let den=cross(dx,dy,ex,ey),num=cross(BigInt(r[0]-p[0]),BigInt(r[1]-p[1]),ex,ey)
     if(!den)continue;if(den<0n){den=-den;num=-num}if(num>=0n&&num<=den)ts.push([num,den])
    }
    ts.sort((x,y)=>cmp(x,y)<0n?-1:cmp(x,y)>0n?1:0)
    const samples=[...ts];for(let i=1;i<ts.length;i++){const x=ts[i-1]!,y=ts[i]!;samples.push([x[0]*y[1]+y[0]*x[1],2n*x[1]*y[1]])}
    const expected=a!==b&&samples.some(t=>inside(p,q,t,v)&&!inside(p,q,t,own)&&regions.some(r=>inside(p,q,t,r)))
    expect(lowPropCovers(ctx.geo,a,b,prop),`${a}->${b}`).toBe(expected);expect(hasLowCover(ctx,a,b)).toBe(expected)
    if(expected)covered++;if(expected!==hasLowCover(ctx,b,a))directional++
   }
  }
  expect(covered).toBeGreaterThan(100);expect(directional).toBeGreaterThan(100)
 })
 it('handles exact closed tangent, one-unit gap and source-boundary-only contact',()=>{
  const tangent=polygon([[7000,3000],[9000,3000],[9000,3300],[7000,3300]])
  expect(hasLowCover(setup([tangent]),7,11)).toBe(true)
  expect(hasLowCover(setup([polygon(tangent.footprint.vertices.map(([x,y])=>[x!,y!+1]))]),7,11)).toBe(false)
  const own=polygon([[1000,2000],[2000,2000],[2000,4000],[1000,4000]])
  expect(hasLowCover(setup([own]),7,8)).toBe(false)
 })
 it('matches target-neighborhood hex rules for all ordered pairs including adjacent shooter-own cover',()=>{
  const ctx=setup([hex([3,7,10,17])])
  for(let a=0;a<21;a++)for(let b=0;b<21;b++){
   const expected=a!==b&&[3,7,10,17].some(h=>h!==a&&(h===b||ctx.geo.distance(h,b)===1)&&segmentCrossesCell(ctx.state.board,a,b,h))
   expect(hasLowCover(ctx,a,b),`${a}->${b}`).toBe(expected)
  }
 })
 it('keys padding, material, ID and dimensions completely without turning low padding into cover',()=>{
  const ctx=setup([polygon()]),before=hasLowCover(ctx,7,11)
  const prop=ctx.state.props[0]!,fp=prop.footprint as any
  for(const edit of [()=>{fp.movementPadding=640},()=>{prop.material=3},()=>{prop.id='prop.renamed'}]){edit();expect(hasLowCover(ctx,7,11)).toBe(before);expect(passableHexes(ctx)(10)).toBe(true)}
  const changed=createBattle({replicate:0,heroes:[],heroHexes:[],enemies:[],enemyHexes:[],map:{id:'test.map.other-dimensions',name:'Other dimensions',rows:Array(7).fill('...'),props:ctx.state.props}})
  for(let a=0;a<21;a++)for(let b=0;b<21;b++)expect(hasLowCover(changed,a,b)).toBe(lowPropCovers(changed.geo,a,b,changed.state.props[0]!))
 })
 it('rejects malformed low data on setup and restore, including getters and invalid initial facts',()=>{
  const prop=polygon();Object.defineProperty(prop,'crossingCost',{get(){throw Error('executed getter')}})
  expect(()=>setup([prop])).toThrow(/accessor/)
  const ctx=setup();for(const target of ['state','initial']){const s=JSON.parse(saveBattle(ctx)),facts=target==='state'?s.state:s.events.find((e:any)=>e.type==='map.loaded');facts.props[0].crossingCost=1;expect(()=>restoreBattle(JSON.stringify(s),ctx)).toThrow(/crossing/)}
  const field=prepareBattleField(ctx.events,{mapId:ctx.state.mapId}).field;expect(field.props).toEqual(ctx.state.props);expect(field.passable[10]).toBe(true)
 })
 it('refuses excessive all-pair low geometry before its pair loop',()=>{
  const huge=polygon([[-1000,-2000],[200000,-2000],[200000,300000],[-1000,300000]])
  expect(()=>createBattle({replicate:0,heroes:[],heroHexes:[],enemies:[],enemyHexes:[],map:{id:'test.map.cover-limit',name:'Cover limit',rows:Array(100).fill('.'.repeat(100)),props:[huge] as any}})).toThrow(/cover: geometry work limit/)
 })
 it('reuses unchanged geometry and clears only affected cover pairs after removal',()=>{
  const first=polygon([[7799,2099],[8199,2099],[8199,3899],[7799,3899]]),second={...hex([11]),id:'prop.overlap'}
  const ctx=setup([first,second]);const before=coverStats(ctx);expect(hasLowCover(ctx,7,11)).toBe(true)
  expect(coverStats(ctx)).toEqual(before)
  ctx.state.props.pop();expect(hasLowCover(ctx,7,11)).toBe(true);expect(coverStats(ctx).changedPairs).toBeGreaterThan(0)
  const fp=ctx.state.props[0]!.footprint as any;fp.vertices=fp.vertices.map(([x,y]:number[])=>[x,y!+9000])
  expect(hasLowCover(ctx,7,11)).toBe(false)
  ctx.state.props=[];expect(hasLowCover(ctx,7,11)).toBe(false);expect(coverStats(ctx).bytes).toBeLessThan(1000)
 })
 it('sums explicit low edges, refreshes cost edits, and atomically refuses unaffordable paths',()=>{
  const edge=polygon([[3800,2000],[4200,2000],[4200,4000],[3800,4000]],1),ctx=setup([edge,{...edge,id:'prop.second-edge'}]);advanceBattle(ctx)
  expect(stepCost(ctx,9,8)).toBe(3)
  const u=ctx.state.units[0]!;u.movePointsLeft=2;const before=saveBattle(ctx)
  expect(executeMove(ctx,0,[8,9],ctx.actions['power.move'] as MoveDef)).toBe(0);expect(saveBattle(ctx)).toBe(before)
  expect(planMovement(ctx,0,'power.move',9)).toMatchObject({ok:false})
  expect(executeBattleCommand(ctx,{humanUnitUids:[u.uid]},{kind:'action',actor:0,actionId:'power.move',destination:9,expectedSeq:ctx.state.seq}).ok).toBe(false)
  expect(saveBattle(ctx)).toBe(before)
  delete ctx.state.props[0]!.crossingCost;expect(stepCost(ctx,9,8)).toBe(2)
  delete ctx.state.props[1]!.crossingCost;expect(stepCost(ctx,9,8)).toBe(1)
 })
 it('captures props and edge costs once during path enumeration and detaches prepared lookups',()=>{
  const edge=polygon([[3800,2000],[4200,2000],[4200,4000],[3800,4000]],1),ctx=setup([edge]);advanceBattle(ctx)
  const props=ctx.state.props,oldCost=preparedLowEdgeCost(ctx);let reads=0
  Object.defineProperty(ctx.state,'props',{get(){reads++;return props},configurable:true})
  const options=reachable(ctx,ctx.state.units[0]!);expect(options.size).toBeGreaterThan(1);expect(reads).toBe(1)
  delete props[0]!.crossingCost;expect(oldCost(8,9)).toBe(1);expect(preparedLowEdgeCost(ctx)(8,9)).toBe(0)
 })
 it('retains explicit sidestep, flight and forced-movement budget semantics',()=>{
  const edge=polygon([[3800,2000],[4200,2000],[4200,4000],[3800,4000]],1),ctx=createBattle({replicate:0,map:row([edge]) as any,heroes:['test-ranger'],enemies:['test-zombie'],heroHexes:[8],enemyHexes:[7]})
  const u=ctx.state.units[0]!;u.actions.push('power.sidestep','power.flight');advanceBattle(ctx)
  expect(flightLandings(ctx,u,ctx.actions['power.flight'] as MoveDef)).toContain(9)
  expect(executeKnockback(ctx,1,0,1,'test')).toBe(1);expect(u.hex).toBe(9)
  u.hex=8;u.movePointsLeft=0;expect(executeSidestep(ctx,0,9,ctx.actions['power.sidestep'] as MoveDef)).toBe(true);expect(u.movePointsLeft).toBe(0)
 })
 it('subtracts one after multiple critical heads and before Protection/mitigation; powers retain their damage',()=>{
  const ctx=setup(),at=ctx.state.units[0]!,tg=ctx.state.units[1]!,source=damageSourceOfAttack(ctx.actions[bow] as AttackDef)
  const covered=resolveDamage(ctx,at,tg,source,2,0,3);ctx.state.props=[];const open=resolveDamage(ctx,at,tg,source,2,0,3)
  expect(covered.value).toBe(open.value-1);expect(covered.ledger.find(r=>r.name==='COVER')?.delta).toBe(-1)
  const names=covered.ledger.map(r=>r.name);expect(names.indexOf('COVER')).toBeGreaterThan(names.indexOf('CRIT'));expect(names.indexOf('COVER')).toBeLessThan(names.indexOf('PROTECTION'))
  const {attackKind,...power}=source;const noCover=resolveDamage(ctx,at,tg,power,false);ctx.state.props=decodeProps([hex()],21)
  expect(resolveDamage(ctx,at,tg,power,false)).toEqual(noCover)
 })
 it('gives dodge priority within overlapping miss bands while preserving uncovered event shape',()=>{
  let dodged=0,covered=0
  for(let seed=0;seed<150;seed++){
   const ctx=setup([hex()],seed);ctx.state.units[1]!.dodge=35;ctx.state.units[0]!.accuracy=110;advanceBattle(ctx)
   const pv=preview(ctx,0,1,bow),r=performAttack(ctx,0,1,bow)
   if(!r.hit){const ev=ctx.events.find(e=>e.type==='attack.miss')!;if(r.roll>65){expect(ev.missCause).toBe('dodge');expect(ev.cover).toBe(false);dodged++}else if(r.roll<=pv.accuracy+20){expect(ev.missCause).toBe('cover');covered++}}
  }
  expect(dodged).toBeGreaterThan(0);expect(covered).toBeGreaterThan(0)
  const ctx=setup([],0);ctx.state.units[0]!.accuracy=0;advanceBattle(ctx);performAttack(ctx,0,1,bow)
  const event=ctx.events.find(e=>e.type==='attack.miss')!;expect(event).not.toHaveProperty('cover');expect(event).not.toHaveProperty('missCause')
 })
 it('applies identical melee cover during reactions',()=>{
  const a=setup([]),b=setup([hex([8])]);for(const ctx of[a,b]){ctx.state.units[1]!.hex=8;const atk=structuredClone(ctx.actions[bow]!) as any;atk.attack.kind='melee';ctx.actions={...ctx.actions,[bow]:atk};ctx.cfg.switches.critEnabled=false;ctx.state.units[0]!.accuracy=200}
  const av=preview(a,0,1,bow),bv=preview(b,0,1,bow);expect(bv.damageOnHit).toBe(av.damageOnHit-1)
  expect(performAttack(a,0,1,bow,'reaction').damage).toBe(av.damageOnHit);expect(performAttack(b,0,1,bow,'reaction').damage).toBe(bv.damageOnHit)
 })
})
