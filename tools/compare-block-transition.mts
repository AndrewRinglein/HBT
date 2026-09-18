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
import {projectBlock} from '../test/block-projection.js'

const base='22c8c79',temporary=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-block-before-'))
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
 const oldSetup=await import(pathToFileURL(path.join(root,'src/core/setup.ts')).href)
 const oldCases=(await import(pathToFileURL(path.join(root,'test/battle-cursor-cases.ts')).href)).battleCursorCases()
 const cases:any[]=[],controls:any[]=[];let oldMs=0,newMs=0,rawChanged=0,checks=0
 function compare(id:string,before:any,after:any){
  let t=performance.now();const oldResult=oldBattle.runBattle(before);oldMs+=performance.now()-t
  t=performance.now();const result=runBattle(after);newMs+=performance.now()-t
  const index=before.events.findIndex((e:any,i:number)=>JSON.stringify(e)!==JSON.stringify(after.events[i]))
  if(index>=0){
   rawChanged++;assert.deepEqual(before.events.slice(0,index),after.events.slice(0,index),id)
   assert.equal(before.events[index].type,'attack.declared',id+' actual first divergence')
   assert.equal(after.events[index].type,'attack.declared',id+' actual first divergence')
   const row={...after.events[index]};delete row.blockChance;delete row.connectionChanceBps
   assert.deepEqual(row,before.events[index],id+' first difference is only Block metadata')
  }
  const projected=projectBlock(after);checks+=after.events.length-projected.events.length
  assert.deepEqual(projected.events,before.events,id+' exact historical events')
  assert.deepEqual(projected.state,before.state,id+' exact historical state')
  assert.deepEqual(after.rng.log,before.rng.log,id+' historical RNG')
  assert.deepEqual(result,oldResult,id+' historical outcome/result')
  return {id,events:hash(after.events),state:hash(after.state),rng:hash(after.rng.log),result,firstDifference:index}
 }
 for(const fixture of battleCursorCases()){
  const prior=oldCases.find((r:any)=>r.id===fixture.id);if(prior)cases.push(compare(fixture.id,prior.create(),fixture.create()))
 }
 for(const mapId of MAP_PANEL){
  const rows=[]
  for(let replicate=0;replicate<25;replicate++)rows.push(compare(mapId+':'+replicate,oldSetup.createBattle({mapId,replicate,enemyCount:8}),createBattle({mapId,replicate,enemyCount:8})))
  controls.push({mapId,count:rows.length,events:hash(rows.map(r=>r.events)),result:hash(rows.map(r=>r.result))})
 }
 const report={base,cases:cases.length,controls:controls.length,battles:cases.length+controls.length*25,rawChanged,blockChecks:checks,semanticChanges:0,outcomeChanges:0,oldMs,newMs}
 fs.mkdirSync('runs/v2-block',{recursive:true});fs.writeFileSync('runs/v2-block/transition.json',JSON.stringify({report,controls},null,2)+'\n')
 const file='test/fixtures/battle-cursor-block.json',frozen=JSON.stringify({sourceCommit:base,workingTreeChange:'rule.block',rulesVersion:'v2-migration.21',cases},null,2)+'\n'
 if(fs.existsSync(file))assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),frozen);else fs.writeFileSync(file,frozen,{flag:'wx'})
 console.log(JSON.stringify(report))
}finally{
 assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));assert.ok(path.basename(temporary).startsWith('hobat-block-before-'))
 fs.rmSync(temporary,{recursive:true,force:true})
}
