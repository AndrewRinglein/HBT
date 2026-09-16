import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const source=path.resolve(import.meta.dirname,'..');
function candidate(change){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-packets-')),work=path.join(root,'content');
 const live=path.resolve(source,'../engine/src/content/generated/pack.ts'),before=fs.readFileSync(live);
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});
  for(const file of ['assemble.mjs','mkenginepack.mjs','map-schema.mjs','hbt-content.json','settled.json'])fs.copyFileSync(path.join(source,file),path.join(work,file));
  for(const dir of ['gen','test'])fs.cpSync(path.join(source,dir),path.join(work,dir),{recursive:true,filter:p=>!fs.statSync(p).isFile()||p.endsWith('.json')});
  const edit=(file,fn)=>{const p=path.join(work,file),data=JSON.parse(fs.readFileSync(p,'utf8'));fn(data);fs.writeFileSync(p,JSON.stringify(data))};
  change(edit);
  const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});assert.equal(assembled.status,0,assembled.stderr);
  const run=spawnSync(process.execPath,['mkenginepack.mjs'],{cwd:work,encoding:'utf8'}),file=path.join(root,'engine/src/content/generated/pack.ts');
  return {...run,pack:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,'')):null};
 }finally{
  assert.deepEqual(fs.readFileSync(live),before);
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hobat-packets-'));
  fs.rmSync(root,{recursive:true,force:true});
 }
}
const packet={id:'ember',when:'hit',damageType:'fire',amount:2};
test('compiler transports ordered flat packets and penetration through real weapon rows',()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>{const a=data.attacks.find(a=>a.id==='attack.hand-axe.chop');a.secondaryDamage=[packet,{id:'shade',when:'crit',damageType:'shadow',amount:4}];a.armorPenetration=3}));
 assert.equal(run.status,0,run.stderr);const row=run.pack.authoredAttacks['attack.hand-axe.chop'];
 assert.deepEqual(row.secondaryDamage,[packet,{id:'shade',when:'crit',damageType:'shadow',amount:4}]);assert.equal(row.armorPenetration,3);
});
for(const change of [a=>a.secondaryDamage=[packet,packet],a=>a.secondaryDamage=[{...packet,id:'base'}],a=>a.secondaryDamage=[{...packet,amount:1.5}],a=>a.secondaryDamage=[{...packet,when:'miss'}],a=>a.secondaryDamage=[{...packet,damageType:'holy'}],a=>a.armorPenetration=-1])test('compiler rejects invalid packet metadata: '+change,()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>change(data.attacks.find(a=>a.id==='attack.hand-axe.chop'))));
 assert.notEqual(run.status,0);assert.match(run.stderr,/packet|penetration/i);assert.equal(run.pack,null);
});
