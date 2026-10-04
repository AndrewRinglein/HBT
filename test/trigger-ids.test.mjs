// engine fix.trigger-ids-and-scopes (2026-10-04): two rules of the pack compiler (mkenginepack.mjs).
//   1. Within one row no two triggers share an id. An id is trigger.<row>.<name>; where two of a row would share it,
//      the one scoped to an attack is named for that attack (as a move's riders already were), then those still
//      sharing take their hook, then what they do; what the rule cannot tell apart FAILS THE BUILD.
//      (The Fire Imp's end-of-Activation burn and its Blast's burn were both trigger.fire-imp.burn.)
//   2. A weapon row's trigger may say `attack: 'own'`: it rides the attacks that weapon grants and no other
//      (one compiled trigger per attack, each onlyWithAttack). The War Axe's on-block rode a Punch.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { copyRuntime } from './workspace.mjs';
const source=path.resolve(import.meta.dirname,'..');
function candidate(change){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-trigger-ids-')),work=path.join(root,'content');
 const live=path.resolve(source,'../engine/src/content/generated/pack.ts'),before=fs.readFileSync(live);
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});fs.mkdirSync(path.join(root,'engine/generated'),{recursive:true});fs.copyFileSync(path.join(source,'../engine/generated/vocabulary.json'),path.join(root,'engine/generated/vocabulary.json'));
  copyRuntime(source,work,['assemble.mjs','mkenginepack.mjs'],['hbt-content.json','settled.json']);
  for(const dir of ['gen','test'])fs.cpSync(path.join(source,dir),path.join(work,dir),{recursive:true,filter:p=>!fs.statSync(p).isFile()||p.endsWith('.json')});
  const edit=(file,fn)=>{const p=path.join(work,file),data=JSON.parse(fs.readFileSync(p,'utf8'));fn(data);fs.writeFileSync(p,JSON.stringify(data))};
  change(edit);
  const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});if(assembled.status!==0)return {...assembled,pack:null};
  const run=spawnSync(process.execPath,['mkenginepack.mjs'],{cwd:work,encoding:'utf8'}),file=path.join(root,'engine/src/content/generated/pack.ts');
  return {...run,pack:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,'')):null};
 }finally{
  assert.deepEqual(fs.readFileSync(live),before);
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hobat-trigger-ids-'));
  fs.rmSync(root,{recursive:true,force:true});
 }
}
/** every `triggers` list in the pack, with the path of the row that holds it */
function lists(node,where,out=[]){
 if(Array.isArray(node)){node.forEach((x,i)=>lists(x,`${where}[${x?.typeId??x?.id??i}]`,out));return out}
 if(!node||typeof node!=='object')return out;
 for(const [k,v] of Object.entries(node)){if(k==='triggers'&&Array.isArray(v))out.push({where,triggers:v});else lists(v,`${where}.${k}`,out)}
 return out;
}
const twice=ts=>{const seen=new Set(),dup=new Set();for(const t of ts)(seen.has(t.id)?dup:seen).add(t.id);return [...dup]};
const enemy=(pack,id)=>pack.authoredEnemies.find(u=>u.typeId===id);
/** the authored row of one enemy, wherever the file keeps its list */
const authoredRow=(data,id)=>{const list=Array.isArray(data)?data:Object.values(data).find(v=>Array.isArray(v)&&v.some(u=>u&&u.id===id));return list.find(u=>u.id===id)};

const live=candidate(()=>{});
test('the pack compiles, and no row in it holds two triggers under one id',()=>{
 assert.equal(live.status,0,live.stderr);
 const all=lists(live.pack,'pack');assert.ok(all.length>200);
 assert.deepEqual(all.map(l=>({row:l.where,ids:twice(l.triggers)})).filter(x=>x.ids.length),[]);
});

test('the Fire Imp: the end-of-Activation burn keeps the plain id; the burn of its Blast is named for the Blast',()=>{
 const ts=enemy(live.pack,'unit.fire-imp').triggers;
 assert.deepEqual(ts.map(t=>[t.id,t.hook,t.onlyWithAttack??null]),[['trigger.fire-imp.burn','onActivationEnd',null],['trigger.fire-imp.burn.blast','onHit','attack.fire-imp.blast']]);
});

test('the three parts of the rule, each on the row that needs it: the attack, then the hook, then the effect',()=>{
 const ids=id=>enemy(live.pack,id).triggers.map(t=>t.id);
 assert.ok(['trigger.imp-master.burn.fire-bow','trigger.imp-master.burn.fire-sword'].every(x=>ids('unit.imp-master').includes(x)));
 assert.ok(['trigger.poison-imp.poison','trigger.poison-imp.poison.blast'].every(x=>ids('unit.poison-imp').includes(x)));
 assert.deepEqual(ids('unit.demon-hound').filter(x=>/regeneration/.test(x)).sort(),['trigger.demon-hound.regeneration.on-activation-end','trigger.demon-hound.regeneration.on-taking-damage','trigger.demon-hound.regeneration.start-of-battle']);
 // Dragged Under does three things on one hit; its Vision loss already carried the stat in its name (…dragged-under-vision)
 const dragged=enemy(live.pack,'unit.shadow-sorcerer').triggers.filter(t=>t.id.startsWith('trigger.shadow-sorcerer.dragged-under.'));
 assert.equal(dragged.length,2);assert.equal(new Set(dragged.map(t=>t.id)).size,2);
 assert.ok(dragged.some(t=>t.id==='trigger.shadow-sorcerer.dragged-under.root'&&t.effect.kind==='status.apply'));
 assert.ok(dragged.some(t=>/^trigger\.shadow-sorcerer\.dragged-under\.paint-[a-z-]+$/.test(t.id)&&t.effect.kind==='layer.paint'));
 assert.deepEqual(live.pack.items['item.troll-gut-vest'].triggers.map(t=>t.id).sort(),['trigger.troll-gut-vest.regeneration.on-taking-damage','trigger.troll-gut-vest.regeneration.start-of-battle']);
});

test('a row whose every trigger already has its own id keeps every id as it was',()=>{
 assert.deepEqual(enemy(live.pack,'unit.zombie').triggers.map(t=>t.id),['trigger.zombie.afflict-rotting-flesh','trigger.zombie.poison']);
 assert.deepEqual(live.pack.enemies.find(u=>u.typeId==='test-zombie').triggers.map(t=>t.id),['trigger.zombie.rot','test.zombie.sap','test.zombie.grasp']);
 assert.deepEqual(live.pack.items['item.dagger'].triggers.map(t=>t.id),['trigger.dagger.stab.protection']);
 assert.deepEqual(live.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onHit').map(t=>t.id),['trigger.war-axe.hack.bleed']);
});

test('two triggers the rule cannot tell apart fail the build, naming the row and the id',()=>{
 const run=candidate(edit=>edit('gen/enemies-authored.json',data=>{const row=authoredRow(data,'unit.fire-imp');row.triggers.push(JSON.parse(JSON.stringify(row.triggers[0])))}));
 assert.notEqual(run.status,0);assert.equal(run.pack,null);
 assert.match(run.stderr+run.stdout,/'unit\.fire-imp' holds two triggers under one id, 'trigger\.fire-imp\.burn/);
});

test('a test unit that is a delta over another holds the triggers of its base once',()=>{
 const base=live.pack.heroes.find(u=>u.typeId==='test-oathblade').triggers.map(t=>t.id);assert.ok(base.length>0);
 for(const id of ['test-slot-striker','test-packet-flame','test-packet-shadow'])assert.deepEqual(live.pack.test.units.find(u=>u.typeId===id).triggers.map(t=>t.id),base,id);
 // a delta that authors a trigger of its own still ADDS it to the base's
 const blockA=live.pack.test.units.find(u=>u.typeId==='test-block-a').triggers.map(t=>t.id);
 assert.deepEqual(blockA,[...base,'test.block-a.reaction']);
});

test('the War Axe says attack: own — its on-block pair rides Chop and Hack, each scoped; its copies follow their own attacks',()=>{
 const scoped=live.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onBlock').map(t=>[t.id,t.onlyWithAttack,t.role,t.effect.stat]);
 assert.deepEqual(scoped,[
  ['trigger.war-axe.on-block.block.chop','attack.war-axe.chop','attacker','block'],['trigger.war-axe.on-block.ranged-block.chop','attack.war-axe.chop','attacker','rangedBlock'],
  ['trigger.war-axe.on-block.block.hack','attack.war-axe.hack','attacker','block'],['trigger.war-axe.on-block.ranged-block.hack','attack.war-axe.hack','attacker','rangedBlock']]);
 const keen=live.pack.derivedItems['item.war-axe.keen'];
 assert.deepEqual(keen.triggers.filter(t=>t.hook==='onBlock').map(t=>t.onlyWithAttack),['attack.war-axe.chop.keen','attack.war-axe.chop.keen','attack.war-axe.hack.keen','attack.war-axe.hack.keen']);
 for(const t of keen.triggers)assert.ok(keen.grants.includes(t.onlyWithAttack),t.id);
});

test('the scope is the word on the row: without it the trigger rides every attack its holder makes, as before',()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>{for(const t of data.items.find(i=>i.id==='item.war-axe').triggers)delete t.attack}));
 assert.equal(run.status,0,run.stderr);
 assert.deepEqual(run.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onBlock').map(t=>[t.id,t.onlyWithAttack??null]),[['trigger.war-axe.on-block.block',null],['trigger.war-axe.on-block.ranged-block',null]]);
});

test('a scope word the compiler does not read, or a row with no attack of its own, is a named gap — never a guessed scope',()=>{
 const odd=candidate(edit=>edit('gen/weapons.json',data=>{data.items.find(i=>i.id==='item.war-axe').triggers[0].attack='basic'}));
 assert.equal(odd.status,0,odd.stderr);
 assert.deepEqual(odd.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onBlock'),[]);
 assert.ok(odd.pack.items['item.war-axe'].gaps.some(g=>/attack 'basic'/.test(g)),JSON.stringify(odd.pack.items['item.war-axe'].gaps));
 const worn=candidate(edit=>edit('gen/gear.json',data=>{data.bloodrunes.find(i=>i.id==='item.rune-burning-touch').triggers[0].attack='own'}));
 assert.equal(worn.status,0,worn.stderr);
 assert.deepEqual(worn.pack.items['item.rune-burning-touch'].triggers,[]);
 assert.ok(worn.pack.items['item.rune-burning-touch'].gaps.some(g=>/grants no attack of its own/.test(g)));
});

test('the nine weapons that say attack: own, and the three rows whose words are every strike of their bearer',()=>{
 const hooks=new Set(['onAttack','onBlock','onMiss','onHit','onCrit','onDamage','onKill']);
 const unscoped=Object.values(live.pack.items).filter(i=>i.triggers.some(t=>hooks.has(t.hook)&&(t.hook!=='onBlock'||t.role==='attacker')&&!t.onlyWithAttack)).map(i=>i.id).sort();
 assert.deepEqual(unscoped,['item.pharaohs-gauntlets','item.rune-bleeding-strike','item.rune-burning-touch']);
 for(const id of ['item.war-axe','item.bloody-axe','item.lumberjack-axe','item.poison-throwing-knives','item.twin-talon-bow','item.book-of-exorcisms','item.boarding-hook','item.scepter-of-salvation','item.stormforged-halberd']){
  const item=live.pack.items[id],attacks=item.grants.filter(g=>g.startsWith('attack.'));
  // every attacker-hook trigger on the row is scoped to an attack the row grants, and the row-level ones cover every attack it grants
  // (a row-level trigger is trigger.<item>.<name>[.<attack> where two attacks share it]; an attack's own rider is trigger.<item>.<attack>.<name>)
  const mine=item.triggers.filter(t=>hooks.has(t.hook));
  assert.ok(mine.length>=attacks.length,id);
  assert.ok(mine.every(t=>attacks.includes(t.onlyWithAttack)),id);
  assert.deepEqual([...new Set(mine.map(t=>t.onlyWithAttack))].sort(),[...attacks].sort(),id);
  if(attacks.length>1)assert.ok(attacks.every(a=>mine.some(t=>t.onlyWithAttack===a&&t.id.endsWith('.'+a.split('.').pop()))),id+': each attack has the row-level trigger named for it');
 }
});
