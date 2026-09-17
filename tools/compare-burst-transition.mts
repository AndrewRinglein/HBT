import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {runBattle} from '../src/core/battle.js'
import {createBattle} from '../src/core/setup.js'
import {MAP_PANEL} from '../src/content/maps.js'
import {battleCursorCases} from '../test/battle-cursor-cases.js'

const base='cfbcac4',temporary=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-bursts-before-'))
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
 const oldCases=(await import(pathToFileURL(path.join(root,'test/battle-cursor-cases.ts')).href)).battleCursorCases()
 const cases:any[]=[],changes:any[]=[]
 let oldMs=0,newMs=0
 for(const fixture of battleCursorCases()){
  const prior=oldCases.find((r:any)=>r.id===fixture.id);if(!prior)continue
  const before=prior.create(),after=fixture.create()
  let t=performance.now();const oldResult=oldBattle.runBattle(before);oldMs+=performance.now()-t
  t=performance.now();const result=runBattle(after);newMs+=performance.now()-t
  let index=before.events.findIndex((e:any,i:number)=>JSON.stringify(e)!==JSON.stringify(after.events[i]))
  if(index<0&&before.events.length!==after.events.length)index=Math.min(before.events.length,after.events.length)
  if(index>=0){
   const a=before.events[index],b=after.events[index]
   assert.deepEqual(before.events.slice(0,index),after.events.slice(0,index))
   assert.ok(['attack.declared','power.used'].includes(a.type),fixture.id+' old declaration')
   assert.equal(b.type,'burst.declared',fixture.id+' first difference is migrated burst')
   assert.equal(a.causeId,b.causeId);assert.ok(['attack.test-arc.sweep','attack.halberd.cleave','power.lightning-staff.storm','power.bowmaster.rain-of-arrows','power.fire-master.fireball','power.wyrmling.scorch'].includes(b.causeId))
   assert.ok(after.actions[b.causeId].burst);assert.equal(after.actions[b.causeId].attack,undefined)

   changes.push({id:fixture.id,firstEvent:index,before:a,after:b,resultChanged:JSON.stringify(oldResult)!==JSON.stringify(result)})
  }else{
   assert.deepEqual(before.state,after.state,fixture.id+' unchanged event state')
   assert.deepEqual(before.rng.log,after.rng.log,fixture.id+' unchanged event RNG')
   assert.deepEqual(oldResult,result)
  }
  cases.push({id:fixture.id,changed:index>=0,events:hash(after.events),state:hash(after.state),rng:hash(after.rng.log),result})
 }
 const oldSetup=await import(pathToFileURL(path.join(root,'src/core/setup.ts')).href)
 const controls:any[]=[]
 for(const mapId of MAP_PANEL){
  let oldHash=2166136261,newHash=2166136261,changed=0,resultChanges=0
  const firstChanges:any[]=[]
  for(let replicate=0;replicate<25;replicate++){
   const before=oldSetup.createBattle({mapId,replicate,enemyCount:8})
   const after=createBattle({mapId,replicate,enemyCount:8})
   const oldResult=oldBattle.runBattle(before),result=runBattle(after)
   const beforeJson=JSON.stringify(before.events),afterJson=JSON.stringify(after.events)
   for(const c of beforeJson){oldHash^=c.charCodeAt(0);oldHash=Math.imul(oldHash,16777619)}
   for(const c of afterJson){newHash^=c.charCodeAt(0);newHash=Math.imul(newHash,16777619)}
   if(beforeJson!==afterJson){
    changed++
    let index=before.events.findIndex((e:any,i:number)=>JSON.stringify(e)!==JSON.stringify(after.events[i]))
    if(index<0)index=Math.min(before.events.length,after.events.length)
    const a=before.events[index],b=after.events[index]
    assert.deepEqual(before.events.slice(0,index),after.events.slice(0,index))
    assert.ok(after.actions[b.causeId]?.burst || after.actions[a.causeId]?.burst,mapId+' first changed choice involves a migrated burst')
    if(a.type==='stamina.spent'&&b.type==='stamina.spent'){
     assert.equal(a.actor,b.actor)
     if(after.actions[b.causeId]?.burst) assert.ok(after.events.slice(index+1).find((e:any)=>e.type==='burst.declared'&&e.actor===b.actor&&e.causeId===b.causeId),mapId+' changed cost precedes selected burst')
     else assert.ok(before.events.slice(index+1).find((e:any)=>['attack.declared','power.used'].includes(e.type)&&e.actor===a.actor&&e.causeId===a.causeId),mapId+' displaced old area action follows its cost')
    }else{
     assert.ok(['attack.declared','power.used'].includes(a.type),mapId+' old declaration')
     assert.equal(b.type,'burst.declared',mapId+' first changed declaration')
     assert.equal(a.causeId,b.causeId)
    }
    firstChanges.push({replicate,index,before:a,after:b})
   }else{
    assert.deepEqual(before.state,after.state,mapId+' identical control state')
    assert.deepEqual(before.rng.log,after.rng.log,mapId+' identical control RNG')
    assert.deepEqual(oldResult,result)
   }
   if(JSON.stringify(oldResult)!==JSON.stringify(result))resultChanges++
  }
  controls.push({mapId,oldHash:(oldHash>>>0).toString(16).padStart(8,'0'),newHash:(newHash>>>0).toString(16).padStart(8,'0'),changed,resultChanges,firstChanges})
 }
 const frozen=JSON.parse(fs.readFileSync('test/fixtures/battle-cursor-bursts.json','utf8'))
 if(process.argv.includes('--update-class-blasts')) {
  const allowed=['showcase.assembled-party','progression-surge-0','progression-surge-1','progression-surge-2']
  const changed=cases.filter(row=>JSON.stringify(row)!==JSON.stringify(frozen.cases.find((old:any)=>old.id===row.id)))
  assert.deepEqual(changed.map(row=>row.id).sort(),allowed.sort(),'only newly migrated class blast fixtures change')
  for(const row of changed)assert.ok(changes.some(change=>change.id===row.id),'each updated fixture has attributed first divergence')
  fs.writeFileSync('test/fixtures/battle-cursor-bursts.json',JSON.stringify({...frozen,cases},null,2)+'\n')
 } else assert.deepEqual(cases,frozen.cases,'complete frozen fixture outputs')
 const report={base,count:cases.length,changed:changes.length,oldMs,newMs,changes,controls}
 fs.mkdirSync('runs/v2-bursts',{recursive:true});fs.writeFileSync('runs/v2-bursts/transition.json',JSON.stringify(report,null,2)+'\n')
 if(process.argv.includes('--write'))fs.writeFileSync('test/fixtures/battle-cursor-bursts.json',JSON.stringify({sourceCommit:base,workingTreeChange:'rule.bursts',rulesVersion:'v2-migration.20',cases},null,2)+'\n',{flag:'wx'})
 console.log(JSON.stringify(report))
}finally{
 assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));assert.ok(path.basename(temporary).startsWith('hobat-bursts-before-'))
 fs.rmSync(temporary,{recursive:true,force:true})
}
