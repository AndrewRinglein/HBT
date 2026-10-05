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
 assert.deepEqual(live.pack.items['item.greatsword'].statModifiers,{block:5});
 // the Longsword's sentence is read as it was
 assert.deepEqual(live.pack.authoredAbilities['power.longsword.counterattack'].effects.map(e=>[e.stat,e.value]),[['counterattack',1],['counterattackAccuracy',10]]);
 const odd=candidate(edit=>edit('gen/settled-items.json',data=>{data.powers.find(p=>p.id==='power.greatsword.counterattack').description='Gain Counterattack and +2 Nerve until the end of your next Turn.'}));
 assert.equal(odd.status,0,odd.stderr);
 assert.equal(odd.pack.authoredAbilities['power.greatsword.counterattack'],undefined);
});
test('the War Axe\'s attacks at the Ledger\'s numbers: the basic attack −10 Accuracy, Heavy Chop Strength +3 at −15, and the on-block rider on each and on nothing else',()=>{
 const A=live.pack.authoredAttacks,of=id=>[A[id].name,A[id].staminaCost,A[id].attack.accuracy,A[id].attack.damage.bonus];
 assert.deepEqual(of('attack.war-axe.chop'),['Chop',1,-10,1]);assert.deepEqual(of('attack.war-axe.hack'),['Heavy Chop',2,-15,3]);
 assert.deepEqual(of('attack.greatsword.hew'),['Hew',1,0,2]);assert.equal(A['attack.greatsword.great-cleave'],undefined);
 const T=live.pack.items['item.war-axe'].triggers;
 assert.ok(T.length>0&&T.every(t=>t.hook==='onBlock'),'no rider but the on-block ones (the Hack\'s Bleed is gone)');
 assert.deepEqual([...new Set(T.map(t=>t.onlyWithAttack))].sort(),['attack.war-axe.chop','attack.war-axe.hack']);
});
