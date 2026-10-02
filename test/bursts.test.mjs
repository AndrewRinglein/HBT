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
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});fs.mkdirSync(path.join(root, 'engine/generated'), { recursive: true }); fs.copyFileSync(path.join(source, '../engine/generated/vocabulary.json'), path.join(root, 'engine/generated/vocabulary.json'));   // the engine's vocabulary the converter reads (plumbing.vocabulary-export)
  for(const file of ['assemble.mjs','mkenginepack.mjs','map-schema.mjs','burst-schema.mjs','mkpaintedmaps.mjs','hbt-content.json','settled.json'])fs.copyFileSync(path.join(source,file),path.join(work,file));
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
 assert.deepEqual(ward.triggers.find(t=>t.effect.kind==='burstScale').effect,{kind:'burstScale',percent:50});
});
for(const patch of [{side:'foe'},{shape:{kind:'blast1'}},{shape:{kind:'radius',radius:1.5}},{heal:-1},{packets:[{id:'x',amount:3,damageType:'holy'}]},{packets:[{id:'x',amount:1,damageType:'fire'},{id:'x',amount:2,damageType:'fire'}]}])test('compiler rejects malformed burst '+JSON.stringify(patch),()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>{data.attacks.find(a=>a.id==='attack.greatsword.great-cleave').burst={...burst,...patch}}));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst/i);assert.equal(run.pack,null);
});

for(const patch of [{effects:[{kind:'heal',amount:3}],target:{select:'self',side:'any'}},{secondaryDamage:[{id:'extra',when:'hit',amount:2,damageType:'fire'}]},{armorPenetration:2}])test('compiler refuses mixed burst metadata instead of dropping it '+JSON.stringify(patch),()=>{
 const run=candidate(edit=>edit('test/abilities.json',rows=>Object.assign(rows.find(a=>a.id==='power.test-burst-flame'),patch)));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst|unknown field/i);assert.equal(run.pack,null);
});

for(const patch of [{secondaryDamage:[{id:'extra',when:'hit',amount:2,damageType:'fire'}]},{armorPenetration:2}])test('weapon burst refuses attack-only packet metadata '+JSON.stringify(patch),()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>Object.assign(data.attacks.find(a=>a.id==='attack.greatsword.great-cleave'),patch)));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst/i);assert.equal(run.pack,null);
});

test('all authored travelling area damage is classified as a hex burst, with unresolved riders still visible',()=>{
 const run=candidate(()=>{});assert.equal(run.status,0,run.stderr);
 for(const [id,range,stat,amount,type] of [['power.bowmaster.rain-of-arrows',4,'precision',-1,'physical'],['power.fire-master.fireball',6,'magic',2,'magic'],['power.wyrmling.scorch',3,'magic',2,'magic']]){
  const row=run.pack.authoredBursts[id];assert.ok(row,id+' must compile as burst');
  assert.equal(row.range,range);assert.deepEqual(row.burst,{shape:{kind:'radius',radius:1},side:'any',packets:[{id:'base',stat,amount,damageType:type}]});
  assert.equal(run.pack.classPowers[id],undefined);assert.ok(!(row.gaps||[]).some(g=>g.includes('centres the blast on a UNIT')));
  if(id!=='power.bowmaster.rain-of-arrows')assert.ok(row.gaps.some(g=>g.includes('burning')),'ground rider remains an honest gap');
 }
 for(const row of Object.values(run.pack.classPowers))assert.ok(!(row.target?.select==='area'&&row.target.origin==='target'&&row.effects.some(e=>e.kind==='damage')),row.id);
});

for(const change of ['missing','payload mismatch'])test('travelling class damage refuses '+change+' burst metadata',()=>{
 const run=candidate(edit=>edit('gen/mage.json',data=>{const row=data.powers.find(p=>p.id==='power.fire-master.fireball');if(change==='missing')delete row.burst;else row.burst.packets[0].amount++}));
 assert.notEqual(run.status,0);assert.match(run.stderr+run.stdout,/burst/i);assert.equal(run.pack,null);
});
