import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const source=path.resolve(import.meta.dirname,'..');
function candidate(change){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-bursts-')),work=path.join(root,'content');
 const live=path.resolve(source,'../engine/src/content/generated/pack.ts'),before=fs.readFileSync(live);
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});
  for(const file of ['assemble.mjs','mkenginepack.mjs','map-schema.mjs','burst-schema.mjs','hbt-content.json','settled.json'])fs.copyFileSync(path.join(source,file),path.join(work,file));
  for(const dir of ['gen','test'])fs.cpSync(path.join(source,dir),path.join(work,dir),{recursive:true,filter:p=>!fs.statSync(p).isFile()||p.endsWith('.json')});
  const edit=(file,fn)=>{const p=path.join(work,file),data=JSON.parse(fs.readFileSync(p,'utf8'));fn(data);fs.writeFileSync(p,JSON.stringify(data))};
  change(edit);
  const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});if(assembled.status!==0)return {...assembled,pack:null};
  const run=spawnSync(process.execPath,['mkenginepack.mjs'],{cwd:work,encoding:'utf8'}),file=path.join(root,'engine/src/content/generated/pack.ts');
  return {...run,pack:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,'')):null};
 }finally{
  assert.deepEqual(fs.readFileSync(live),before);
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hobat-bursts-'));
  fs.rmSync(root,{recursive:true,force:true});
 }
}
const burst={shape:{kind:'radius',radius:1},side:'enemy',packets:[{id:'ember',damageType:'fire',amount:4},{id:'shade',damageType:'shadow',amount:3}]};
test('compiler separates all four migrated area rows and both TEST burst profiles, preserving gear grants and deltas',()=>{
 const run=candidate(()=>{});assert.equal(run.status,0,run.stderr);
 for(const id of ['attack.halberd.cleave','attack.greatsword.great-cleave','power.lightning-staff.storm']){
  assert.ok(run.pack.authoredBursts[id]);assert.equal(run.pack.authoredAttacks[id],undefined);assert.equal(run.pack.authoredAbilities[id],undefined);
 }
 assert.deepEqual(run.pack.test.bursts['attack.test-arc.sweep'].burst,run.pack.authoredBursts['attack.halberd.cleave'].burst);
 assert.equal(run.pack.test.bursts['attack.test-arc.sweep'].staminaCost,0);
 assert.deepEqual(run.pack.test.bursts['power.test-burst-flame'].burst,burst);
 assert.equal(run.pack.test.bursts['power.test-burst-mercy'].burst.heal,7);
 assert.ok(run.pack.items['item.halberd'].grants.includes('attack.halberd.cleave'));
 const ward=run.pack.test.units.find(u=>u.typeId==='test-burst-ward');assert.equal(ward.triggers.filter(t=>t.hook==='onBurst').length,2);assert.ok(ward.triggers.some(t=>t.hook!=='onBurst')); // inherited ordinary riders remain
 assert.deepEqual(ward.triggers.find(t=>t.effect.kind==='burst.scale').effect,{kind:'burst.scale',percent:50});
});
for(const patch of [{side:'foe'},{shape:{kind:'blast1'}},{shape:{kind:'radius',radius:1.5}},{heal:-1},{packets:[{id:'x',amount:3,damageType:'holy'}]},{packets:[{id:'x',amount:1,damageType:'fire'},{id:'x',amount:2,damageType:'fire'}]}])test('compiler rejects malformed burst '+JSON.stringify(patch),()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>{data.attacks.find(a=>a.id==='attack.greatsword.great-cleave').burst={...burst,...patch}}));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst/i);assert.equal(run.pack,null);
});
