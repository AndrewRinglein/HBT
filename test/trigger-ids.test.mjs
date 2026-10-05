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
 // Law 10, 2026-10-04 — engine content.greatsword-war-axe-reauthored (engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): this read
 //   assert.deepEqual(live.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onHit').map(t=>t.id),['trigger.war-axe.hack.bleed']);
 // — the Hack's Bleed, which is not in the Ledger's Heavy Chop and is gone. The War Axe's triggers that remain keep their ids.
 assert.deepEqual(live.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onHit').map(t=>t.id),[]);
 assert.deepEqual(live.pack.items['item.war-axe'].triggers.map(t=>t.id).sort(),['trigger.war-axe.on-block.block.chop','trigger.war-axe.on-block.block.hack','trigger.war-axe.on-block.ranged-block.chop','trigger.war-axe.on-block.ranged-block.hack']);
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

// engine fix.enchant-triggers-own-weapon (2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: … an enchant is its
// own weapon's …'): an ARTIFACT ATTRIBUTE (a tier-3 row of `enchants`, put on a base by gen/tier3-combinations.json; the field
// is still `enchant`) brings its attacker-hook triggers to the attacks of the weapon it is on, and to no other — by the
// compiler's rule, not by a word on each attribute row.
const ATTACKERS=new Set(['onAttack','onMiss','onHit','onCrit','onDamage','onKill']);
test('an attribute on a weapon: every trigger it adds on an attacker\'s hook is scoped to an attack that weapon grants — over every tier-3 row',()=>{
 const rows=Object.values(live.pack.enchanted).filter(i=>i.grants.length);
 const added=rows.flatMap(i=>i.triggers.filter(t=>t.source===i.id&&ATTACKERS.has(t.hook)).map(t=>({i,t})));
 assert.ok(added.length>80,String(added.length));
 assert.deepEqual(added.filter(({i,t})=>!i.grants.includes(t.onlyWithAttack)).map(({i,t})=>`${i.id}: ${t.id}`),[]);
 const hammer=live.pack.enchanted['item.war-hammer.frost'];
 assert.deepEqual(hammer.triggers.filter(t=>t.source===hammer.id).map(t=>[t.id,t.hook,t.onlyWithAttack]),[
  ['trigger.war-hammer.frost.frost.smash','onHit','attack.war-hammer.smash'],['trigger.war-hammer.frost.frost.skullsplitter','onHit','attack.war-hammer.skullsplitter'],
  ['trigger.war-hammer.frost.frost-crit.smash','onCrit','attack.war-hammer.smash'],['trigger.war-hammer.frost.frost-crit.skullsplitter','onCrit','attack.war-hammer.skullsplitter']]);
 // a weapon with one attack keeps the plain id, scoped
 assert.deepEqual(live.pack.enchanted['item.longsword.taunting'].triggers.filter(t=>t.source==='item.longsword.taunting').map(t=>[t.id,t.onlyWithAttack]),[['trigger.longsword.taunting.taunt','attack.longsword.slash']]);
});
test('the attribute\'s own word still decides: basic is the first attack alone (Flaming), own is said the same as unsaid, another word is a named gap',()=>{
 const axe=live.pack.enchanted['item.war-axe.flaming'];
 assert.deepEqual(axe.triggers.filter(t=>t.source===axe.id).map(t=>t.onlyWithAttack),[axe.grants[0],axe.grants[0]]);
 const said=candidate(edit=>edit('gen/armor-enchants.json',data=>{for(const t of data.enchants.find(e=>e.id==='enchant.frost').triggers)t.attack='own'}));
 assert.equal(said.status,0,said.stderr);
 assert.deepEqual(said.pack.enchanted['item.war-hammer.frost'].triggers,live.pack.enchanted['item.war-hammer.frost'].triggers);
 const odd=candidate(edit=>edit('gen/armor-enchants.json',data=>{data.enchants.find(e=>e.id==='enchant.frost').triggers[0].attack='every'}));
 assert.equal(odd.status,0,odd.stderr);
 assert.ok(odd.pack.enchanted['item.war-hammer.frost'].gaps.some(g=>/attack 'every'/.test(g)),JSON.stringify(odd.pack.enchanted['item.war-hammer.frost'].gaps));
 assert.deepEqual(odd.pack.enchanted['item.war-hammer.frost'].triggers.filter(t=>t.source==='item.war-hammer.frost'&&t.hook==='onHit'),[]);
});
test('a hook that is not the attacker\'s keeps no scope: an attribute on worn armor is its wearer\'s',()=>{
 const worn=Object.values(live.pack.enchanted).filter(i=>!i.grants.length).flatMap(i=>i.triggers.filter(t=>t.source===i.id));
 assert.ok(worn.length>0);
 assert.deepEqual(worn.filter(t=>t.onlyWithAttack).map(t=>t.id),[]);
 assert.deepEqual([...new Set(worn.map(t=>t.hook))].filter(h=>ATTACKERS.has(h)),[]);
});

// engine capability.unit-trigger-with-tag (2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: … a trigger on the hero
// with a tag requirement …'): a trigger row may say `attackTag: '<tag>'` — the compiled trigger carries `onlyWithTag` and fires
// only for an attack carrying that tag. One word on a unit's row, an item's row, a test badge; an unknown tag fails the build.
// What an attack's tags are is the compiler's (engine SWITCHES.md attackHasTag): its own Codex tags, joined with its item's
// tags less the manner words.
const MANNER=new Set(JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8')).tags.filter(t=>t.group==='manner').map(t=>t.id.replace(/^tag\./,'')));
test('the rows that say attackTag: the Burning Touch requires melee, Pharaoh\'s Gauntlets brawl; the Bleeding Strike says nothing and requires nothing',()=>{
 const tagOf=id=>live.pack.items[id].triggers.map(t=>[t.id,t.hook,t.onlyWithTag??null,t.onlyWithAttack??null]);
 assert.deepEqual(tagOf('item.rune-burning-touch'),[['trigger.rune-burning-touch.burn','onHit','melee',null]]);
 assert.deepEqual(tagOf('item.pharaohs-gauntlets'),[['trigger.pharaohs-gauntlets.weak','onHit','brawl',null]]);
 assert.deepEqual(tagOf('item.rune-bleeding-strike'),[['trigger.rune-bleeding-strike.bleed','onCrit',null,null]]);
 const badge=live.pack.test.badges['test.badge.melee-burn'];
 assert.deepEqual(badge.triggers.map(t=>[t.id,t.onlyWithTag,t.source]),[['trigger.test-melee-burn.burn','melee','test.badge.melee-burn']]);
 assert.equal(live.pack.test.badges['test.badge.any-burn'].triggers[0].onlyWithTag,undefined);
});
test('an attack\'s tags: its own Codex tags, joined with its item\'s tags less the manner words; a Forge copy keeps its original\'s',()=>{
 const A=live.pack.authoredAttacks,codex=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
 assert.deepEqual(A['attack.dagger.stab'].tags,['dagger','melee']);
 assert.deepEqual(A['attack.longsword.slash'].tags,['blade','melee']);             // 'blade' is the Longsword's, 'melee' the Slash's own
 assert.ok(A['attack.javelin.throw'].tags.includes('ranged')&&!A['attack.javelin.throw'].tags.includes('melee'));
 assert.ok(A['attack.javelin.stab'].tags.includes('melee')&&!A['attack.javelin.stab'].tags.includes('ranged'));
 assert.deepEqual(A['attack.punch'].tags,['brawl','melee']);
 assert.deepEqual(A['attack.longsword.slash.keen'].tags,A['attack.longsword.slash'].tags);
 // the rule, over every Codex attack the pack holds: exactly its own tags and its granting items' non-manner tags
 let checked=0;
 for(const a of codex.attacks){
  if(!A[a.id])continue;
  const want=new Set(a.tags||[]);
  for(const i of codex.items)if((i.grants||[]).includes(a.id))for(const t of i.tags||[])if(!MANNER.has(t))want.add(t);
  assert.deepEqual(A[a.id].tags??[],[...want].sort(),a.id);checked++;
 }
 assert.ok(checked>100,String(checked));
 // an item's manner word never reaches an attack that does not say it itself
 const leaked=[];
 for(const i of codex.items)for(const m of (i.tags||[]).filter(t=>MANNER.has(t)))for(const g of i.grants||[]){const row=codex.attacks.find(a=>a.id===g);if(row&&A[g]&&!(row.tags||[]).includes(m)&&(A[g].tags||[]).includes(m))leaked.push(`${i.id} ${m} -> ${g}`)}
 assert.deepEqual(leaked,[]);
 // a bestiary attack authors no tags: the pack row carries none (the engine reads its kind)
 assert.equal(A['attack.zombie.claw'].tags,undefined);
});
test('an unknown tag fails the build, naming the row, the trigger and the tag — on an item\'s row and on a test badge',()=>{
 const item=candidate(edit=>edit('gen/gear.json',data=>{data.bloodrunes.find(i=>i.id==='item.rune-burning-touch').triggers[0].attackTag='meele'}));
 assert.notEqual(item.status,0);assert.equal(item.pack,null);
 assert.match(item.stderr+item.stdout,/'item\.rune-burning-touch' trigger 'trigger\.rune-burning-touch\.burn' requires tag 'meele', which is not in the Codex's tag vocabulary/);
 const badge=candidate(edit=>edit('test/badges.json',data=>{data.find(b=>b.id==='test.badge.melee-burn').triggers[0].onlyWithTag='handheld'}));
 assert.notEqual(badge.status,0);assert.equal(badge.pack,null);
 assert.match(badge.stderr+badge.stdout,/'test\.badge\.melee-burn' trigger 'trigger\.test-melee-burn\.burn' requires tag 'handheld'/);
});
test('the word is the same on a unit\'s own row, and beside attack: own on a weapon\'s row; without it nothing is required',()=>{
 const unit=candidate(edit=>edit('gen/enemies-authored.json',data=>{authoredRow(data,'unit.fire-imp').triggers[0].attackTag='melee'}));
 assert.equal(unit.status,0,unit.stderr);
 assert.deepEqual(enemy(unit.pack,'unit.fire-imp').triggers.map(t=>[t.id,t.onlyWithTag??null]),[['trigger.fire-imp.burn','melee'],['trigger.fire-imp.burn.blast',null]]);
 const both=candidate(edit=>edit('gen/weapons.json',data=>{for(const t of data.items.find(i=>i.id==='item.war-axe').triggers)if(t.attack==='own')t.attackTag='axe'}));
 assert.equal(both.status,0,both.stderr);
 const onBlock=both.pack.items['item.war-axe'].triggers.filter(t=>t.hook==='onBlock');
 assert.ok(onBlock.length>=4);assert.ok(onBlock.every(t=>t.onlyWithTag==='axe'&&both.pack.items['item.war-axe'].grants.includes(t.onlyWithAttack)));
 const none=candidate(edit=>edit('gen/gear.json',data=>{delete data.bloodrunes.find(i=>i.id==='item.rune-burning-touch').triggers[0].attackTag}));
 assert.equal(none.status,0,none.stderr);
 assert.equal(none.pack.items['item.rune-burning-touch'].triggers[0].onlyWithTag,undefined);
});

// engine fix.kit-attack-clauses (2026-10-04; engine DECISIONS.md 2026-10-04 'the weapon audit …'): a settled attack's rider that
// moves a stat compiles to the engine's battle-long stat modifier, scoped to that attack — "the target loses N Stat [for the
// rest of the Battle]" on the struck unit, "gain N Stat" on the one attacking. A phrase the compiler does not read stays a gap.
test('a weapon attack\'s stat rider: Crush takes 1 Armor, Elf Shot gives 1 Precision, the Obsidian Fang takes 1 Strength at 20% — each scoped to its attack, for the Battle',()=>{
 const of=(item,attack)=>live.pack.items[item].triggers.filter(t=>t.onlyWithAttack===attack).map(t=>[t.id,t.hook,t.chance,t.select,t.effect]);
 assert.deepEqual(of('item.iron-mace','attack.iron-mace.crush'),[['trigger.iron-mace.crush.armor','onHit',100,'target',{kind:'statMod',stat:'armor',value:-1,until:'battle'}]]);
 assert.deepEqual(of('item.iron-mace','attack.iron-mace.swing'),[]);
 assert.deepEqual(of('item.elfbow','attack.elfbow.elf-shot'),[['trigger.elfbow.elf-shot.precision','onHit',100,'self',{kind:'statMod',stat:'precision',value:1,until:'battle'}]]);
 for(const a of ['fang','gut'])assert.deepEqual(of('item.obsidian-fang-dagger','attack.obsidian-fang-dagger.'+a),[[`trigger.obsidian-fang-dagger.${a}.strength`,'onHit',20,'target',{kind:'statMod',stat:'strength',value:-1,until:'battle'}]]);
 // the Surge the Thrown Dagger's kill gives is no stat a modifier reaches: nothing compiled for it, nothing guessed
 assert.deepEqual(of('item.daggers','attack.daggers.thrown-dagger'),[]);
});
test('the phrase is exact: a stat the engine cannot modify, or other words, compile nothing',()=>{
 const run=candidate(edit=>edit('gen/weapons.json',data=>{const a=data.attacks.find(x=>x.id==='attack.iron-mace.crush');a.triggers=[{hook:'onHit',effect:'the target loses 1 Nerve for the rest of the Battle'},{hook:'onHit',effect:'the target is rattled'}]}));
 assert.equal(run.status,0,run.stderr);
 assert.deepEqual(run.pack.items['item.iron-mace'].triggers.filter(t=>t.onlyWithAttack==='attack.iron-mace.crush'),[]);
});

// engine content.shields-reauthored (2026-10-04; the Armory Ledger, approved for now 2026-09-28): the two shield sentences the
// compiler learned, and a weapon attack's own cooldown — each a shape the engine had, reaching it through the pack.
test('Lock Shields lends its Block to every ally within 1 of the holder; Cover Ally puts Protection on one adjacent ally; a sentence the compiler does not read compiles nothing',()=>{
 const A=live.pack.authoredAbilities;
 assert.deepEqual([A['power.round-shield.lock-shields'].target,A['power.round-shield.lock-shields'].effects],[{select:'area',side:'ally',radius:1,origin:'self'},[{kind:'statMod',stat:'block',value:10,until:'endOfNextActivation'},{kind:'statMod',stat:'rangedBlock',value:10,until:'endOfNextActivation'}]]);
 assert.deepEqual(A['power.iron-round-shield.lock-shields'].effects.map(e=>[e.stat,e.value]),[['block',15],['rangedBlock',10]]);
 assert.deepEqual([A['power.kite-shield.cover-ally'].range,A['power.kite-shield.cover-ally'].target,A['power.kite-shield.cover-ally'].effects],[1,{select:'unit',side:'ally'},[{kind:'status.apply',statusId:'status.protection',value:4}]]);
 const odd=candidate(edit=>edit('gen/settled-items.json',data=>{data.powers.find(p=>p.id==='power.kite-shield.cover-ally').description='An adjacent ally gains 4 Protection and a pat on the back.'}));
 assert.equal(odd.status,0,odd.stderr);
 assert.equal(odd.pack.authoredAbilities['power.kite-shield.cover-ally'],undefined);
 assert.ok(!odd.pack.items['item.kite-shield'].abilities.includes('power.kite-shield.cover-ally'));
});
test('a weapon attack\'s own cooldown reaches the pack: the Knight Shield\'s Shield Slam, and the staffs whose rows always said one',()=>{
 const A=live.pack.authoredAttacks;
 assert.equal(A['attack.knight-shield.shield-slam'].cooldown,2);assert.equal(A['attack.iron-knight-shield.shield-slam'].cooldown,2);
 assert.equal(A['attack.staff-of-the-destroyer.ruin'].cooldown,3);assert.equal(A['attack.staff-of-the-ultimate-destroyer.annihilation'].cooldown,5);
 assert.equal(A['attack.longsword.slash'].cooldown,undefined);
 assert.deepEqual(live.pack.items['item.knight-shield'].triggers.map(t=>[t.id,t.hook,t.chance,t.onlyWithAttack,t.effect]),[['trigger.knight-shield.shield-slam.stun','onHit',70,'attack.knight-shield.shield-slam',{kind:'status.apply',statusId:'status.stun',value:1}]]);
});

// engine content.greatsword-war-axe-reauthored (2026-10-04; the Armory Ledger, approved for now 2026-09-28): the Great Sword's
// power — "Counterattack and +2 Strength until the end of your next turn. 2 Stamina" — is the Counterattack sentence with one
// more clause, a stat gained for the same lifetime; and the War Axe's two attacks carry the Ledger's Accuracy.
test('the Great Sword\'s Counterattack: the free attack up and +2 Strength, both until the end of the next Turn; a stat the engine has no name for compiles nothing',()=>{
 const A=live.pack.authoredAbilities['power.greatsword.counterattack'];
 assert.deepEqual([A.staminaCost,A.target,A.effects],[2,{select:'self',side:'any'},[{kind:'statMod',stat:'counterattack',value:1,until:'endOfNextTurn',who:'self'},{kind:'statMod',stat:'strength',value:2,until:'endOfNextTurn',who:'self'}]]);
 assert.deepEqual(live.pack.items['item.greatsword'].abilities,['power.greatsword.counterattack']);assert.deepEqual(live.pack.items['item.greatsword'].grants,['attack.greatsword.hew']);
 // Law 10, 2026-10-04 — engine capability.free-attack-accuracy (engine DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10
 // counterattack' on a weapon is +10 Accuracy on your counterattacks."): this read {block:5} while the row's "+10 counterattack" was a
 // named gap; the clause is a stat modifier of the row now. The Block the claim was about is the same 5.
 assert.deepEqual(live.pack.items['item.greatsword'].statModifiers,{block:5,counterattackAccuracy:10});
 // the Longsword's sentence is read as it was
 assert.deepEqual(live.pack.authoredAbilities['power.longsword.counterattack'].effects.map(e=>[e.stat,e.value]),[['counterattack',1],['counterattackAccuracy',10]]);
 const odd=candidate(edit=>edit('gen/settled-items.json',data=>{data.powers.find(p=>p.id==='power.greatsword.counterattack').description='Gain Counterattack and +2 Nerve until the end of your next Turn.'}));
 assert.equal(odd.status,0,odd.stderr);
 assert.equal(odd.pack.authoredAbilities['power.greatsword.counterattack'],undefined);
});
test('the War Axe\'s attacks at the Ledger\'s numbers: the basic attack −10 Accuracy, Heavy Chop Strength +3 at −15, and the on-block rider on each and on nothing else',()=>{
 const A=live.pack.authoredAttacks,of=id=>[A[id].name,A[id].staminaCost,A[id].accuracy??0,A[id].bonus];
 assert.deepEqual(of('attack.war-axe.chop'),['Chop',1,-10,1]);assert.deepEqual(of('attack.war-axe.hack'),['Heavy Chop',2,-15,3]);
 assert.deepEqual(of('attack.greatsword.hew'),['Hew',1,0,2]);assert.equal(A['attack.greatsword.great-cleave'],undefined);
 const T=live.pack.items['item.war-axe'].triggers;
 assert.ok(T.length>0&&T.every(t=>t.hook==='onBlock'),'no rider but the on-block ones (the Hack\'s Bleed is gone)');
 assert.deepEqual([...new Set(T.map(t=>t.onlyWithAttack))].sort(),['attack.war-axe.chop','attack.war-axe.hack']);
});

// engine fix.enchant-stats-on-weapon (2026-10-04; engine DECISIONS.md 2026-09-28 '… What a weapon's enchantment or custom tier may
// convey: Strength becomes the weapon's damage (its attacks go up); Crit and Accuracy apply to that weapon's attacks …'): one
// rule for every weapon row of every tier — its Strength, Precision, Crit and Accuracy ride its own attacks, never its wielder.
test('a weapon row carries no Strength, Precision, Crit or Accuracy for its wielder — codex rows, tier-3 rows and the Forge\'s rows alike',()=>{
 const rows=[...Object.values(live.pack.items),...Object.values(live.pack.enchanted),...Object.values(live.pack.derivedItems)].filter(i=>i.itemClass==='weapon');
 assert.ok(rows.length>300);
 assert.deepEqual(rows.filter(i=>['strength','precision','crit','accuracy'].some(k=>i.statModifiers[k])).map(i=>i.id),[]);
 // every attack-scoped rider of a row rides an attack that row grants (a copy carries its riders with it)
 for(const i of rows)for(const t of i.triggers)if(t.onlyWithAttack)assert.ok(i.grants.includes(t.onlyWithAttack),i.id+': '+t.id+' rides '+t.onlyWithAttack);
});
test('a tier-3 row grants its own copy of each attack it raises, by the damage stat the attack uses; a number that can ride nothing is named',()=>{
 const A=live.pack.authoredAttacks,E=live.pack.enchanted;
 // +1 Strength on a Strength attack
 assert.deepEqual(E['item.greatsword.soul-reaper'].grants,['attack.greatsword.hew.soul-reaper']);
 assert.equal(A['attack.greatsword.hew.soul-reaper'].bonus,A['attack.greatsword.hew'].bonus+1);
 assert.deepEqual(A['attack.greatsword.hew.soul-reaper'].tags,A['attack.greatsword.hew'].tags);
 assert.equal(E['item.greatsword.soul-reaper'].statModifiers.strength,undefined);
 // +3 Crit, and its on-crit rider follows the copy
 assert.equal(A['attack.greatsword.hew.bloodletting'].crit??0,(A['attack.greatsword.hew'].crit??0)+3);
 assert.deepEqual(E['item.greatsword.bloodletting'].triggers.filter(t=>t.hook==='onCrit').map(t=>t.onlyWithAttack),['attack.greatsword.hew.bloodletting']);
 // +1 Precision rides the throw, not the thrust: the spear's Strength attack is not copied at all
 const spear=live.pack.items['item.hunting-spear'].grants,hunt=E['item.hunting-spear.hunting'].grants;
 for(const [i,aid] of spear.entries()){if(A[aid].stat==='precision'){assert.equal(hunt[i],aid+'.hunting');assert.equal(A[hunt[i]].bonus,A[aid].bonus+1)}else assert.equal(hunt[i],aid)}
 // +2 Strength rides; +2 Precision has no attack on a Greatsword — named on the row, and no stat of the wielder; −4 Health and −10 Dodge are his
 const sac=E['item.greatsword.sacrifice'];
 assert.equal(A[sac.grants[0]].bonus,A['attack.greatsword.hew'].bonus+2);
 assert.ok(sac.gaps.some(g=>/precision 2: the weapon grants no attack that uses precision/.test(g)),JSON.stringify(sac.gaps));
 assert.deepEqual([sac.statModifiers.maxHp,sac.statModifiers.dodge,sac.statModifiers.precision],[-4,-10,undefined]);
 // an attribute with nothing for the attacks grants the base's own attacks (the Flaming Longsword)
 assert.deepEqual(E['item.longsword.flaming'].grants,live.pack.items['item.longsword'].grants);
 // "+1 damage" (an attackModifier) was dropped on a tier-3 row; it rides the copy as it does on the Forge's
 assert.equal(A[E['item.greatsword.destroying'].grants[0]].bonus,A['attack.greatsword.hew'].bonus+1);
});
test('a named weapon\'s own attack rows are raised where they are; the Forge\'s rows are what they were',()=>{
 const A=live.pack.authoredAttacks,C=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(source,'gen/weapons.json'),'utf8')).attacks.map(a=>[a.id,a]));
 for(const [item,strength,crit] of [['item.death-blade',1,0],['item.demonic-shiv',1,5],['item.cursed-sand-blade',2,0]]){
  const row=live.pack.items[item];assert.equal(row.statModifiers.strength,undefined,item);assert.equal(row.statModifiers.crit,undefined,item);
  for(const g of row.grants){assert.ok(C[g],g+' is authored in gen/weapons.json');assert.equal(A[g].bonus,C[g].damage+(C[g].stat==='strength'?strength:0),g);assert.equal(A[g].crit??0,(C[g].crit??0)+crit,g)}
 }
 const hew=A['attack.greatsword.hew'];
 assert.equal(A['attack.greatsword.hew.heavy'].bonus,hew.bonus+1);assert.equal(A['attack.greatsword.hew.keen'].accuracy,(hew.accuracy??0)+6);
 assert.deepEqual([A['attack.greatsword.hew.cruel'].accuracy,A['attack.greatsword.hew.cruel'].crit],[(hew.accuracy??0)+3,(hew.crit??0)+4]);
});

// engine capability.free-attack-accuracy (2026-10-04; engine DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10 counterattack'
// on a weapon is +10 Accuracy on your counterattacks." / "Bonuses 'to special attacks' and 'Dodge against special attacks' apply
// to all three."): the Codex's stat words reach the engine's four stats, and the two swords carry the clause as a stat of the row.
test('the swords\' "+10 counterattack" is a stat modifier of the row — Counterattack Accuracy 10 — and no longer a named gap; the stat words map to the engine\'s',async()=>{
 const {statOf}=await import('../stat-words.mjs');
 assert.deepEqual(['Counterattack Accuracy','counterattackAccuracy','Fend Accuracy','Free Attack Accuracy','freeAttackAccuracy','Free Attack Dodge','freeAttackDodge'].map(statOf),
  ['counterattackAccuracy','counterattackAccuracy','fendAccuracy','freeAttackAccuracy','freeAttackAccuracy','freeAttackDodge','freeAttackDodge']);
 for(const sword of ['item.longsword','item.greatsword']){
  assert.deepEqual(live.pack.items[sword].statModifiers,{block:5,counterattackAccuracy:10},sword);
  assert.deepEqual((live.pack.items[sword].gaps??[]).filter(g=>/counterattack/i.test(g)),[],sword);
 }
 // rows made from them carry it; it is the wielder's stat (fix.enchant-stats-on-weapon moves Accuracy, Crit, Strength and Precision only)
 assert.equal(live.pack.enchanted['item.longsword.flaming'].statModifiers.counterattackAccuracy,10);
 assert.equal(live.pack.derivedItems['item.greatsword.masterwork'].statModifiers.counterattackAccuracy,10);
 // the general stats' instances are test badges; a stat word the Codex does not hold is refused by the assembler, by name
 const B=live.pack.test.badges;
 assert.deepEqual(B['test.badge.free-attack-aim'].statModifiers,{freeAttackAccuracy:15});assert.deepEqual(B['test.badge.free-attack-slip'].statModifiers,{freeAttackDodge:20});
 const odd=candidate(edit=>edit('gen/settled-items.json',data=>{data.items.find(i=>i.id==='item.longsword').statModifiers.counterAccuracy=10}));
 assert.notEqual(odd.status,0);assert.match(odd.stdout+odd.stderr,/item item\.longsword: unknown stat "counterAccuracy"/);assert.equal(odd.pack,null);
});

// engine content.elfbow-double-shot-one-target (2026-10-04; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back: the Elfbow
// shoots one target …'): the Elfbow's Double Shot is two hits on one target — the row says one enemy, so nothing of it is a gap.
test('the Elfbow\'s Double Shot: one enemy within 4 hexes, two hits; the Throwing Knives\' Fan still names its several targets',()=>{
 const row=JSON.parse(fs.readFileSync(path.join(source,'gen/settled-items.json'),'utf8')).attacks.find(a=>a.id==='attack.elfbow.double-shot');
 assert.deepEqual([row.targets,row.hits,row.damage,row.stamina,row.accuracy,row.range],['one enemy within 4 hexes',2,-2,2,-5,4]);
 assert.equal(live.pack.authoredAttacks['attack.elfbow.double-shot'].hits,2);
 // (the gap list itself is the shipped gen/enemy-pack-gaps.json: the engine's test/elfbow-double-shot-one-target.test.ts holds that no line of it names the Double Shot)
 assert.equal(JSON.parse(fs.readFileSync(path.join(source,'gen/weapons.json'),'utf8')).attacks.find(x=>x.id==='attack.throwing-knives.fan').targets,'up to 3 enemies within 3 hexes');
});

// engine capability.effect-lasts-activations (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need:
// … time / number of activations for a duration"): a power's timed line compiles to a counted STATUS row of the pack that lends
// what the line gives, and the power applies it. Three of his lines; a line the compiler does not read is still a named gap.
test('a timed effect is a status the pack carries: Stoke, Perfect Sight and Poison Coating — and the Fire Punch\'s own half-Magic Burn',()=>{
 const S=live.pack.statuses,A=live.pack.authoredAbilities,half={scale:'partyMagic',div:2,round:'nearest'};
 assert.deepEqual(S['status.fire-gauntlet.stoke'],{id:'status.fire-gauntlet.stoke',name:'Stoke',shape:'counter',family:'duration',stacking:'highest',decayPerPhase:0,countsDown:'activation',
  lends:{triggers:[{id:'trigger.fire-gauntlet.stoke.burn',hook:'onHit',chance:100,select:'target',effect:{kind:'status.apply',statusId:'status.burn',value:half},source:'status.fire-gauntlet.stoke'}]}});
 assert.deepEqual(A['power.fire-gauntlet.stoke'].effects,[{kind:'status.apply',statusId:'status.fire-gauntlet.stoke',value:3,who:'self'}]);
 assert.deepEqual(S['status.staff-of-the-ultimate-destroyer.perfect-sight'].lends,{doubles:['precision']});
 assert.equal(S['status.staff-of-the-ultimate-destroyer.perfect-sight'].countsDown,'activation');
 assert.deepEqual(A['power.staff-of-the-ultimate-destroyer.perfect-sight'].effects,[{kind:'status.apply',statusId:'status.staff-of-the-ultimate-destroyer.perfect-sight',value:3,who:'self'}]);
 const coat=S['status.poison-coating'];
 assert.equal(coat.countsDown,undefined);assert.equal(coat.decayPerPhase,0);
 assert.deepEqual(coat.lends.triggers.map(t=>[t.hook,t.chance,t.effect]),[['onHit',60,{kind:'status.apply',statusId:'status.poison',value:1}]]);
 assert.deepEqual(live.pack.items['item.poison-coating'].gaps??[],[]);assert.deepEqual(live.pack.items['item.fire-gauntlet'].gaps??[],[]);assert.deepEqual(live.pack.items['item.staff-of-the-ultimate-destroyer'].gaps??[],[]);
 assert.deepEqual(live.pack.items['item.fire-gauntlet'].triggers.map(t=>[t.id,t.onlyWithAttack,t.effect.value]),[['trigger.fire-gauntlet.fire-punch.burn','attack.fire-gauntlet.fire-punch',half]]);
 // every status the Codex already had is what it was: none of them lends or counts
 for(const id of ['status.burn','status.poison','status.weak','status.protection','status.stun'])assert.ok(!S[id].lends&&!S[id].countsDown,id);
});
test('the timed lines are exact: other words compile no status and stay a named gap',()=>{
 const odd=candidate(edit=>edit('gen/settled-items.json',data=>{data.powers.find(p=>p.id==='power.fire-gauntlet.stoke').description='For your next 3 Activations, every hit you land sets the target alight.'}));
 assert.equal(odd.status,0,odd.stderr);
 assert.equal(odd.pack.statuses['status.fire-gauntlet.stoke'],undefined);
 assert.ok(odd.pack.items['item.fire-gauntlet'].gaps.some(g=>g.includes('power.fire-gauntlet.stoke')));
});

// engine capability.damage-from-two-stats (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We do need
// that."; 'the Force Staff is Precision plus half Magic, as magic damage'): the four fields an attack row says a second term in
// reach the pack as the engine's sum of terms; on a burst they stay a named gap.
test('an attack row\'s second term reaches the pack: addsStat once, halfStatBonus over 2, doubleStatBonus twice, doubleStat the own stat twice',()=>{
 const A=live.pack.authoredAttacks,terms=id=>[A[id].stat,A[id].statMult??1,A[id].addsStats??[]];
 assert.deepEqual(terms('attack.force-staff.force-blast'),['precision',1,[{stat:'magic',mult:1,div:2}]]);
 assert.deepEqual(terms('attack.staff-of-summoning.unbinding'),['precision',1,[{stat:'magic',mult:1,div:2}]]);
 assert.deepEqual(terms('attack.staff-of-the-destroyer.ruin'),['precision',1,[{stat:'magic',mult:2}]]);
 assert.deepEqual(terms('attack.staff-of-the-ultimate-destroyer.annihilation'),['precision',2,[{stat:'magic',mult:2}]]);
 assert.deepEqual(terms('attack.war-hammer.skullsplitter')[2],[{stat:'armor',mult:1}]);
 assert.deepEqual(terms('attack.longsword.slash'),['strength',1,[]]);
 // a Forge copy keeps its original's terms
 const copy=Object.keys(A).find(id=>id.startsWith('attack.war-hammer.skullsplitter.'));assert.ok(copy);assert.deepEqual(A[copy].addsStats,[{stat:'armor',mult:1}]);
 assert.equal(JSON.parse(fs.readFileSync(path.join(source,'gen/settled-items.json'),'utf8')).attacks.find(a=>a.id==='attack.force-staff.force-blast').description,"Damage equals your Precision plus half the party's Magic.");
});
test('a second term names a stat the engine resolves, or the build fails; on a burst it is a named gap, not a number',()=>{
 const bad=candidate(edit=>edit('gen/settled-items.json',data=>{data.attacks.find(a=>a.id==='attack.force-staff.force-blast').halfStatBonus='nerve'}));
 assert.notEqual(bad.status,0);assert.match(bad.stdout+bad.stderr,/attack\.force-staff\.force-blast adds 'nerve' to its damage/);
 const burst=candidate(edit=>edit('gen/settled-items.json',data=>{data.attacks.find(a=>a.id==='attack.halberd.cleave').addsStat='armor'}));
 assert.equal(burst.status,0,burst.stderr);
 assert.equal(burst.pack.authoredBursts['attack.halberd.cleave'].addsStats,undefined);
});

// engine content.hero-origin-badges (2026-10-05; engine DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes
// …': asked whether the Codex's origin badges should be put on the heroes' rows - "3, yes."): each of the 24 base heroes' rows
// carries, after the Hero badge, the origin badges the Codex names for it (gen/heroes.json `originBadges`, badge NAMES; the
// rows are gen/badges.json), in the Codex's order. Only the 24: a fixed hero's row is as it was.
test('each base hero\'s row carries the Codex\'s origin badges after the Hero badge; no other hero row gains one',()=>{
 const heroes=JSON.parse(fs.readFileSync(path.join(source,'gen/heroes.json'),'utf8')).heroes,badges=JSON.parse(fs.readFileSync(path.join(source,'gen/badges.json'),'utf8')).badges;
 const idOf=n=>{const rows=badges.filter(b=>b.name===n);assert.equal(rows.length,1,n);return rows[0].id};
 const base=heroes.filter(h=>h.id.startsWith('hero.base.'));assert.equal(base.length,24);
 const all=[...live.pack.heroes,...live.pack.prologueParty,...live.pack.alphaTeam],rowOf=id=>{const u=all.find(u=>u.typeId===id);assert.ok(u,id+' has a row in the pack');return u};
 for(const h of base)assert.deepEqual(rowOf(h.id).badges,['badge.hero',...(h.originBadges||[]).map(idOf)],h.id);
 assert.deepEqual(rowOf('hero.base.warrior-iron').badges,['badge.hero','badge.stalwart','badge.dwarf']);
 assert.deepEqual(rowOf('hero.base.mage-fire').badges,['badge.hero']);
 for(const u of all)if(!u.typeId.startsWith('hero.base.'))assert.ok((u.badges||[]).every(b=>b==='badge.hero'),u.typeId+' '+JSON.stringify(u.badges));
});
test('an origin badge the Codex has no row for fails the build by name; it is never dropped',()=>{
 const bad=candidate(edit=>edit('gen/heroes.json',data=>{data.heroes.find(h=>h.id==='hero.base.warrior-iron').originBadges=['Stalwart','No Such Badge']}));
 assert.notEqual(bad.status,0);assert.match(bad.stdout+bad.stderr,/hero\.base\.warrior-iron names the origin badge 'No Such Badge'/);
});

// engine capability.summons (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: summons"):
// the Staff of Summoning's Call the Wolf compiles to a power aimed at an empty hex that summons the pack's Wolf, and its
// Unbinding's Accuracy against anything summoned reaches the pack. Both were named gaps.
test('Call the Wolf summons the pack\'s Wolf on an empty hex beside the caster; Unbinding carries its Accuracy against a summon; the Wolf is a unit row',()=>{
 const call=live.pack.authoredAbilities['power.staff-of-summoning.call-the-wolf'];assert.ok(call,'the power is in the pack');
 assert.deepEqual([call.range,call.staminaCost,call.cooldown,call.target,call.effects,call.gaps??[]],[1,2,5,{select:'hex',side:'any'},[{kind:'summon',unit:'unit.wolf'}],[]]);
 assert.deepEqual(live.pack.authoredAttacks['attack.staff-of-summoning.unbinding'].accuracyVs,{summon:15});
 const staff=live.pack.items.find?.(i=>i.id==='item.staff-of-summoning')??live.pack.items['item.staff-of-summoning'];
 assert.deepEqual((staff.gaps??[]).filter(g=>/call-the-wolf|accuracyVs/.test(g)),[]);
 const wolf=live.pack.authoredEnemies.find(u=>u.typeId==='unit.wolf');assert.ok(wolf,'the Wolf is a unit row of the pack');
 assert.deepEqual([wolf.name,wolf.maxHp,wolf.strength,wolf.precision,wolf.accuracy,wolf.movement,wolf.attacks],['Wolf',5,3,2,67,6,['attack.wolf.pounce','attack.wolf.nip']]);
});
test('a summon names exactly one unit row of the pack, and Accuracy against a kind names a kind a unit is - or the build fails',()=>{
 const none=candidate(edit=>edit('gen/settled-items.json',data=>{const p=data.powers.find(p=>p.id==='power.staff-of-summoning.call-the-wolf');p.description=p.description.replace('one Wolf','one Griffin')}));
 assert.notEqual(none.status,0);assert.match(none.stdout+none.stderr,/call-the-wolf summons 'Griffin', which 0 unit rows/);
 const kind=candidate(edit=>edit('gen/settled-items.json',data=>{data.attacks.find(a=>a.id==='attack.staff-of-summoning.unbinding').accuracyVs={gryphon:15}}));
 assert.notEqual(kind.status,0);assert.match(kind.stdout+kind.stderr,/unbinding has Accuracy against 'gryphon'/);
 const undead=candidate(edit=>edit('gen/settled-items.json',data=>{data.attacks.find(a=>a.id==='attack.staff-of-summoning.unbinding').accuracyVs={Undead:10}}));
 assert.equal(undead.status,0,undead.stderr);assert.deepEqual(undead.pack.authoredAttacks['attack.staff-of-summoning.unbinding'].accuracyVs,{undead:10});
});

// engine capability.set-bonus (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … set
// bonus"; GEAR-DESIGN.md §5: a set is a tag and the bonus a block on the item that cares): the block and the set tags reach the
// engine's item rows as written; a row whose sentence and field disagree, or that pays a stat the engine has none for, fails.
test('a set block reaches the engine\'s item row with the set tags its members bear; "for every … you carry" counts the carrier',()=>{
 const I=live.pack.items;
 assert.deepEqual(I['item.chains-of-the-wrathful'].setBonus,{tag:'chain',each:{precision:1},withItself:true});
 assert.deepEqual(I['item.staff-of-the-magi'].setBonus,{tag:'ring',each:{magic:1},withItself:true});
 assert.deepEqual(I['item.staff-of-the-destroyer'].setBonus,{tag:'destroyer',each:{attackDamage:1},withItself:true});
 assert.deepEqual(I['item.book-of-karma'].setBonus,{tag:'book',each:{resist:1},withItself:true});
 assert.deepEqual(I['item.chains-of-the-wrathful'].setTags,['chain']);assert.equal(I['item.staff-of-the-magi'].setTags,undefined);
 for(const [id,tag] of [['item.blink-ring','ring'],['item.ring-of-divine-protection','ring'],['item.tome-of-forgotten-whispers','book'],['item.chains-of-the-damned','chain'],['item.chains-of-the-faithful','chain'],['item.ancient-tome','book']])assert.ok((I[id].setTags??[]).includes(tag),id+' bears '+tag);
 assert.equal(I['item.longsword'].setTags,undefined);assert.equal(I['item.longsword'].setBonus,undefined);
 // a tier-2 row the Forge makes of a member is a member too
 const made=Object.values(live.pack.derivedItems).find(r=>r.id.startsWith('item.ancient-tome.'));assert.ok(made);assert.deepEqual(made.setTags,['book']);
});
test('a set row that disagrees with its own sentence, pays no engine stat, or names no tag of the Codex fails the build',()=>{
 const row=data=>data.items.find(i=>i.id==='item.chains-of-the-wrathful');
 const other=candidate(edit=>edit('gen/settled-items.json',data=>{delete row(data).setBonus.withItself}));
 assert.notEqual(other.status,0);assert.match(other.stdout+other.stderr,/chains-of-the-wrathful setBonus says "\+1 Precision for every CHAIN item you carry\." and does not count the carrier/);
 const stat=candidate(edit=>edit('gen/settled-items.json',data=>{row(data).setBonus.each={nerve:1}}));
 assert.notEqual(stat.status,0);assert.match(stat.stdout+stat.stderr,/setBonus each pays 'nerve'/);
 const tag=candidate(edit=>edit('gen/settled-items.json',data=>{row(data).setBonus.tag='gryphon'}));
 assert.notEqual(tag.status,0);assert.match(tag.stdout+tag.stderr,/names the tag 'gryphon'/);
});

// engine capability.raise-lower-magic (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "we need to
// lower and raise magic"): the Staff of the Magi's Vortex is in the pack as the burst its sentence says — Magic counted three
// times, and what using it does to the party's Magic and the enemy side's Power — and a row whose burst and sentence disagree fails.
test('Vortex is a burst of Magic x 3 that lowers the party\'s Magic and the enemy side\'s Power by 1 for the rest of the Battle; the test row raises Magic for two Turns',()=>{
 const v=live.pack.authoredBursts?.['power.staff-of-the-magi.vortex']??live.pack.authoredAbilities['power.staff-of-the-magi.vortex'];assert.ok(v,'Vortex is in the pack');
 assert.deepEqual([v.range,v.staminaCost,v.cooldown],[5,3,0]);
 assert.deepEqual(v.burst,{shape:{kind:'radius',radius:1},side:'any',packets:[{id:'base',damageType:'magic',amount:0,stat:'magic',statMult:3}],sideStats:[{stat:'magic',side:'own',value:-1,until:'battle'},{stat:'power',value:-1,until:'battle'}]});
 const staff=live.pack.items['item.staff-of-the-magi'];assert.deepEqual((staff.gaps??[]).filter(g=>/vortex/.test(g)),[]);
 assert.deepEqual(live.pack.test.abilities['power.test-mage.swell'].effects,[{kind:'side.stat',stat:'magic',side:'own',value:2,until:'endOfNextTurn'}]);
});
test('a burst row whose sentence and fields disagree about its stat multiple or its side-stat changes fails the build',()=>{
 const row=data=>data.powers.find(p=>p.id==='power.staff-of-the-magi.vortex');
 const mult=candidate(edit=>edit('gen/settled-items.json',data=>{row(data).burst.packets[0].statMult=2}));
 assert.notEqual(mult.status,0);assert.match(mult.stdout+mult.stderr,/power\.staff-of-the-magi\.vortex' disagrees with its authored sentence/);
 const less=candidate(edit=>edit('gen/settled-items.json',data=>{row(data).burst.sideStats.pop()}));
 assert.notEqual(less.status,0);assert.match(less.stdout+less.stderr,/disagrees with its authored sentence/);
 const other=candidate(edit=>edit('gen/settled-items.json',data=>{data.powers.find(p=>p.id==='power.fire-staff.fireball').burst.sideStats=[{stat:'power',value:-1,until:'battle'}]}));
 assert.notEqual(other.status,0);assert.match(other.stdout+other.stderr,/carries a stat multiple or a side's stat change its sentence does not say/);
});
