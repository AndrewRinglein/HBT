import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { copyRuntime } from './workspace.mjs';
const source=path.resolve(import.meta.dirname,'..');
function candidate(change){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-bursts-')),work=path.join(root,'content');
 const live=path.resolve(source,'../engine/src/content/generated/pack.ts'),before=fs.readFileSync(live);
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});fs.mkdirSync(path.join(root, 'engine/generated'), { recursive: true }); fs.copyFileSync(path.join(source, '../engine/generated/vocabulary.json'), path.join(root, 'engine/generated/vocabulary.json'));   // the engine's vocabulary the converter reads (plumbing.vocabulary-export)
  copyRuntime(source,work,['assemble.mjs','mkenginepack.mjs'],['hbt-content.json','settled.json']);   // the scripts and every module they import (test/workspace.mjs)
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
// Law 10, 2026-10-04 — engine content.greatsword-war-axe-reauthored (engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the Great Sword's
// Great Cleave, one of the migrated area rows, is gone from the Codex (the Ledger's Great Sword is one attack and a power), so it
// is not in the list below, and the three tests that bent a weapon's burst row bend the Halberd's Cleave (gen/settled-items.json) — the other weapon
// burst, the same arc. Every check is unchanged.
//  was: for(const id of ['attack.halberd.cleave','attack.greatsword.great-cleave','power.lightning-staff.storm']){
//       … data.attacks.find(a=>a.id==='attack.greatsword.great-cleave') …   (three times)
test('compiler separates all four migrated area rows and both TEST burst profiles, preserving gear grants and deltas',()=>{
 const run=candidate(()=>{});assert.equal(run.status,0,run.stderr);
 assert.equal(run.pack.authoredBursts['attack.greatsword.great-cleave'],undefined);
 for(const id of ['attack.halberd.cleave','power.lightning-staff.storm']){
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
 const run=candidate(edit=>edit('gen/settled-items.json',data=>{data.attacks.find(a=>a.id==='attack.halberd.cleave').burst={...burst,...patch}}));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst/i);assert.equal(run.pack,null);
});

for(const patch of [{effects:[{kind:'heal',amount:3}],target:{select:'self',side:'any'}},{secondaryDamage:[{id:'extra',when:'hit',amount:2,damageType:'fire'}]},{armorPenetration:2}])test('compiler refuses mixed burst metadata instead of dropping it '+JSON.stringify(patch),()=>{
 const run=candidate(edit=>edit('test/abilities.json',rows=>Object.assign(rows.find(a=>a.id==='power.test-burst-flame'),patch)));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst|unknown field/i);assert.equal(run.pack,null);
});

for(const patch of [{secondaryDamage:[{id:'extra',when:'hit',amount:2,damageType:'fire'}]},{armorPenetration:2}])test('weapon burst refuses attack-only packet metadata '+JSON.stringify(patch),()=>{
 const run=candidate(edit=>edit('gen/settled-items.json',data=>Object.assign(data.attacks.find(a=>a.id==='attack.halberd.cleave'),patch)));
 assert.notEqual(run.status,0);assert.match(run.stdout+run.stderr,/burst/i);assert.equal(run.pack,null);
});

// engine fix.burst-ground-class-powers (2026-10-04; engine SWITCHES.md burstGroundClassPowers, classBlastGroundFromTheRow), Law 10:
// Fireball's and Scorch's ground clause is no longer a gap — it is the burst's own `paints` (engine capability.burst-paints-ground),
// authored on the row and held to the sentence. The lines this replaces, kept as they stood:
//   was: for(const [id,range,stat,amount,type] of [[…rain-of-arrows…],['power.fire-master.fireball',6,'magic',2,'magic'],['power.wyrmling.scorch',3,'magic',2,'magic']]){
//   was:  assert.equal(row.range,range);assert.deepEqual(row.burst,{shape:{kind:'radius',radius:1},side:'any',packets:[{id:'base',stat,amount,damageType:type}]});
//   was:  if(id!=='power.bowmaster.rain-of-arrows')assert.ok(row.gaps.some(g=>g.includes('burning')),'ground rider remains an honest gap');
// The rest of the rule stands: every travelling area damage is a hex burst, and a rider the engine cannot do is still visible
// (Fireball: the blast consuming the Burn).
test('all authored travelling area damage is classified as a hex burst, with unresolved riders still visible',()=>{
 const run=candidate(()=>{});assert.equal(run.status,0,run.stderr);
 for(const [id,range,stat,amount,type,paints] of [['power.bowmaster.rain-of-arrows',4,'precision',-1,'physical'],['power.fire-master.fireball',6,'magic',2,'magic','layer.burning'],['power.wyrmling.scorch',3,'magic',2,'magic','layer.burning']]){
  const row=run.pack.authoredBursts[id];assert.ok(row,id+' must compile as burst');
  assert.equal(row.range,range);assert.deepEqual(row.burst,{shape:{kind:'radius',radius:1},side:'any',packets:[{id:'base',stat,amount,damageType:type}],...(paints?{paints}:{})});
  assert.equal(run.pack.classPowers[id],undefined);assert.ok(!(row.gaps||[]).some(g=>g.includes('centres the blast on a UNIT')));
  assert.ok(!(row.gaps||[]).some(g=>/seven hexes become/.test(g)),id+": the ground is the burst's paints, not a gap");
 }
 assert.deepEqual(run.pack.authoredBursts['power.fire-master.fireball'].gaps,['rider: plus every stack of Burn that unit is already carrying — the blast CONSUMES that Burn','unparsed: allies caught in it burn too'],'the rider the engine cannot do is still an honest gap');
 assert.equal(run.pack.authoredBursts['power.wyrmling.scorch'].gaps,undefined);
 for(const row of Object.values(run.pack.classPowers))assert.ok(!(row.target?.select==='area'&&row.target.origin==='target'&&row.effects.some(e=>e.kind==='damage')),row.id);
});

// engine fix.burst-ground-class-powers (2026-10-04): the ground a class blast leaves is held to its sentence both ways
for(const [change,file,id,edit] of [
 ['a ground the row does not author','gen/mage.json','power.fire-master.fireball',row=>{delete row.burst.paints}],
 ['a different layer than the sentence names','gen/beast.json','power.wyrmling.scorch',row=>{row.burst.paints='layer.frost'}],
 ['a ground the sentence does not name','gen/ranger.json','power.bowmaster.rain-of-arrows',row=>{row.burst.paints='layer.burning'}],
])test('a class blast refuses '+change,()=>{
 const run=candidate(e=>e(file,data=>edit(data.powers.find(p=>p.id===id))));
 assert.notEqual(run.status,0);assert.match(run.stderr+run.stdout,/disagrees with its authored sentence: the ground it leaves/);assert.equal(run.pack,null);
});
test('the second layer is pure data: the Fireball row and its sentence changed together to frost compile',()=>{
 const run=candidate(e=>{for(const [file,id] of [['gen/mage.json','power.fire-master.fireball']])e(file,data=>{const row=data.powers.find(p=>p.id===id);row.burst.paints='layer.frost';row.description=row.description.replace('become burning','become frost')})});
 assert.equal(run.status,0,run.stderr);assert.equal(run.pack.authoredBursts['power.fire-master.fireball'].burst.paints,'layer.frost');
});
test('the three powers that only change ground are not bursts and say what they need',()=>{
 const run=candidate(()=>{});assert.equal(run.status,0,run.stderr);
 for(const id of ['power.fire-master.wake-of-cinders','power.grove-keeper.quench','power.broodmother.nest']){
  assert.equal(run.pack.authoredBursts[id],undefined,id);const row=run.pack.classPowers[id];assert.ok(row,id);assert.deepEqual(row.effects,[]);
  assert.ok(row.gaps.some(g=>/^needs capability: ground as a burst's only payload — /.test(g)),id);assert.ok(row.gaps.includes('no effect compiled — the power is inert'),id);
 }
});

for(const change of ['missing','payload mismatch'])test('travelling class damage refuses '+change+' burst metadata',()=>{
 const run=candidate(edit=>edit('gen/mage.json',data=>{const row=data.powers.find(p=>p.id==='power.fire-master.fireball');if(change==='missing')delete row.burst;else row.burst.packets[0].amount++}));
 assert.notEqual(run.status,0);assert.match(run.stderr+run.stdout,/burst/i);assert.equal(run.pack,null);
});
