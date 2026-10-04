import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {runBattle} from '../src/core/battle.js'
import {preview} from '../src/core/pipeline.js'
import {projectPacketEvents as project} from '../test/packet-projection.js'
import {battleCursorCases} from '../test/battle-cursor-cases.js'

const base='6bb36dc',temporary=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-packets-before-'))
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')

try{
 const root=path.join(temporary,'engine')
 for(const file of execFileSync('git',['ls-tree','-r','--name-only',base,'src','test/battle-cursor-cases.ts'],{encoding:'utf8'}).trim().split(/\r?\n/)){
  const target=path.resolve(root,file);assert.ok(target.startsWith(root+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,execFileSync('git',['show',`${base}:${file}`],{maxBuffer:16*1024*1024}))
 }
 fs.writeFileSync(path.join(root,'package.json'),'{"type":"module"}');fs.mkdirSync(path.join(temporary,'progression'))
 fs.copyFileSync('../progression/PROGRESSION-SCHEDULE.json',path.join(temporary,'progression/PROGRESSION-SCHEDULE.json'))
 const oldBattle=await import(pathToFileURL(path.join(root,'src/core/battle.ts')).href)
  const oldPipeline=await import(pathToFileURL(path.join(root,'src/core/pipeline.ts')).href)
  const oldSetup=await import(pathToFileURL(path.join(root,'src/core/setup.ts')).href)
  const oldMutate=await import(pathToFileURL(path.join(root,'src/core/mutate.ts')).href)
  const oldStatus=await import(pathToFileURL(path.join(root,'src/core/status.ts')).href)
  const oldTrigger=await import(pathToFileURL(path.join(root,'src/core/trigger.ts')).href)
  const preChangeReds:any[]=[]
  for(const hook of ['onHit','onAttack','onCrit']){
    const ctx=oldSetup.createCustomBattle([{type:'test-warrior',hex:85}],[{type:'test-zombie',hex:86}]),at=ctx.state.units[0],tg=ctx.state.units[1],id='attack.test-red-reservation'
    Object.assign(at,{strength:4,accuracy:1000,crit:hook==='onCrit'?1000:-1000,triggers:[]});Object.assign(tg,{hp:100,maxHp:100,armor:0,dodge:0,luck:0,triggers:[]})
    ctx.actions={...ctx.actions,[id]:{id,name:'Pre-change proof',source:'weapon',staminaCost:0,cooldown:0,range:1,attack:{kind:'melee',damageType:'physical',bonus:2,stat:'strength'}}}
    at.actions.push(id);oldMutate.beginActivation(ctx,0,'test');ctx.cfg.switches.critChartShareVsEnemies=100
    at.triggers=oldTrigger.triggersFrom([{id:'test.red-hook',hook,chance:100,source:id,select:'target',effect:hook==='onHit'?{kind:'damage',amount:3,damageType:'true'}:{kind:'status.apply',statusId:'status.protection',value:3}}])
    if(hook==='onHit'){
      oldStatus.applyStatus(ctx,1,'status.protection',4,'test');oldPipeline.performAttack(ctx,0,1,id)
      assert.equal(tg.hp,98);preChangeReds.push({hook,actualHp:98,requiredHp:95})
    }else{
      assert.throws(()=>oldPipeline.performAttack(ctx,0,1,id),/preview\/applied mismatch/)
      preChangeReds.push({hook,actual:'preview/applied mismatch',required:'resolve against actual pre-damage hook result'})
    }
  }
 const oldCases=(await import(pathToFileURL(path.join(root,'test/battle-cursor-cases.ts')).href)).battleCursorCases()
 const fixtures=battleCursorCases(),cases:any[]=[],changes:any[]=[]
 let oldMs=0,newMs=0
 for(const fixture of fixtures){
  const priorFixture=oldCases.find((r:any)=>r.id===fixture.id)
  if(!priorFixture)continue // New explicitly declared TEST scenario is separately probed.
  const before=priorFixture.create(),after=fixture.create()
  let start=performance.now();const oldResult=oldBattle.runBattle(before);oldMs+=performance.now()-start
  start=performance.now();const result=runBattle(after);newMs+=performance.now()-start
  const index=before.events.findIndex((e:any,i:number)=>JSON.stringify(e)!==JSON.stringify(after.events[i]))
  if(index>=0){
   const a=before.events[index],b=after.events[index]
   assert.equal(a.type,'attack.hit',fixture.id);assert.equal(b.type,'attack.hit',fixture.id)
   assert.deepEqual(before.events.slice(0,index),after.events.slice(0,index))
   assert.deepEqual(project([a]),project([b]),fixture.id+' first raw divergence must be new packet/confirmed-crit facts')
  }
  const oldEvents=project(before.events),newEvents=project(after.events)
  const semanticIndex=oldEvents.findIndex((e:any,i:number)=>JSON.stringify(e)!==JSON.stringify(newEvents[i]))
  let cause='metadata-only'
  if(semanticIndex>=0){
   const a=oldEvents[semanticIndex],b=newEvents[semanticIndex],actual=after.events[semanticIndex]
   assert.deepEqual(oldEvents.slice(0,semanticIndex),newEvents.slice(0,semanticIndex))
   if(b.type==='status.reduced'&&a.type.startsWith('trigger.')&&b.causeId.startsWith('attack.')){
    const hit=after.events.slice(0,semanticIndex).findLast((e:any)=>e.type==='attack.hit'&&e.causeId===b.causeId&&e.target===b.target)
    assert.ok(hit);assert.ok(b.by>0);assert.equal(hit.packets.reduce((n:number,p:any)=>n+p.absorbed,0)>=b.by,true)
    cause='Protection reservation before onHit'
   }else if(a.type==='damage.applied'&&b.type==='damage.applied'){
    assert.equal(a.causeId,b.causeId);assert.equal(a.target,b.target);assert.ok(actual.packets.length>1)
    assert.equal(actual.amount,actual.packets.reduce((n:number,p:any)=>n+p.applied,0))
    // the Hand Axe's Chop was the other authored critical rider until its row was cut (content.unfielded-tier0-weapons-cut, 2026-10-03)
    assert.ok(['attack.bane-blade.banishing-blow'].includes(b.causeId))
    cause='authored critical packet'
   }else throw Error(fixture.id+' unexplained first semantic difference '+JSON.stringify({semanticIndex,a,b}))
   changes.push({id:fixture.id,firstEvent:index,firstSemanticEvent:semanticIndex,cause,before:a,after:b,resultChanged:JSON.stringify(oldResult)!==JSON.stringify(result)})
  }
  cases.push({id:fixture.id,changed:index>=0,semanticChanged:semanticIndex>=0,events:hash(after.events),state:hash(after.state),rng:hash(after.rng.log),result})
 }
 // Hot preview cost on an ordinary old fixture, measured separately from imports.
 const f=fixtures[0]!,a=f.create(),b=oldCases.find((r:any)=>r.id===f.id).create()
 const target=a.state.units.find(u=>u.side!==a.state.units[0]!.side)!.id,attack=a.state.units[0]!.actions.find(id=>a.actions[id]?.attack)!
 const bench=(fn:()=>unknown)=>{for(let i=0;i<20;i++)fn();const t=performance.now();for(let i=0;i<200;i++)fn();return performance.now()-t}
 const previewMs={old:bench(()=>oldPipeline.preview(b,0,target,attack)),current:bench(()=>preview(a,0,target,attack)),iterations:200}
 const report={base,count:cases.length,rawChanged:cases.filter(c=>c.changed).length,semanticChanged:changes.length,oldMs,newMs,previewMs,preChangeReds,changes}
 fs.mkdirSync('runs/v2-packets',{recursive:true});fs.writeFileSync('runs/v2-packets/transition.json',JSON.stringify(report,null,2)+'\n')
 const targetFile='test/fixtures/battle-cursor-packets.json',frozen=JSON.stringify({sourceCommit:base,workingTreeChange:'rule.damage-packets',rulesVersion:'v2-migration.19',cases},null,2)+'\n'
 if(fs.existsSync(targetFile))assert.equal(fs.readFileSync(targetFile,'utf8').replace(/\r\n/g,'\n'),frozen);else fs.writeFileSync(targetFile,frozen,{flag:'wx'})
 console.log(JSON.stringify({...report,changes:changes.map(c=>({id:c.id,cause:c.cause,resultChanged:c.resultChanged}))}))
}finally{
 assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));assert.ok(path.basename(temporary).startsWith('hobat-packets-before-'))
 fs.rmSync(temporary,{recursive:true,force:true})
}
