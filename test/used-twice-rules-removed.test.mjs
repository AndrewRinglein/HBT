// engine content.used-twice-rules-removed (2026-10-06). Ruled 2026-10-06 (Andrew, engine DECISIONS.md 'the one-use rules: most
// are cut or reworded onto rules the engine already has; a handful are built'), of the rules two rows shared and the engine
// had nothing for: "accuracy against anyone but you. Yeah, we can cut that ... we can just turn it into a -accuracy."; "We can
// remove the status that ticks twice."; "We can remove damage to enemies you run past."; "We can remove "cannot be healed"."; "We
// can remove "an item slot gained during battle"."; "We don't need to remember what killed someone, so we can get rid of that."
// And of the Eyeblight's Gaze: "It should not have flat damage. It should be based on its stat."; of the Werewolf's Claw
// Frenzy: "the ordering, I don't really care about".
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
const GAPS=JSON.parse(fs.readFileSync(path.join(source,'gen/enemy-pack-gaps.json'),'utf8')).gaps;
/** every sentence a reader meets: names, descriptions, payloads, rules, effects, intents — not ids, not source notes */
function read(node,key,out=[]){
 if(typeof node==='string'){if(!['id','source','note','owner','base','enchant'].includes(key))out.push(node)}
 else if(Array.isArray(node))for(const x of node)read(x,key,out);
 else if(node&&typeof node==='object')for(const [k,v] of Object.entries(node))read(v,k,out);
 return out;
}
const power=id=>D.powers.find(p=>p.id===id),item=id=>D.items.find(i=>i.id===id),badge=id=>D.badges.find(b=>b.id===id);
const enemy=id=>PACK.authoredEnemies.find(u=>u.typeId===id);

test('no sentence a reader meets says any of the cut rules',()=>{
 const CUT=/except you|ticks twice|passed through or beside|whose hex you passed|cannot be healed|no ally may heal/i;
 const all=read(D.items).concat(read(D.powers),read(D.badges),read(D.enchants),read(D.attacks),read(D.specialties));
 assert.deepEqual(all.filter(s=>CUT.test(s)),[]);
 // an Item Slot is never gained during a Battle: no power, and no trigger of a specialty or an item, grants one
 // (a row's own itemSlots stat is the kingdom's and stays)
 const acting=read(D.powers).concat(D.specialties.flatMap(s=>read(s.triggers)),D.items.flatMap(i=>read(i.triggers)));
 assert.deepEqual(acting.filter(s=>/(?:gains?|has|have|grants?) \+\d+ Item Slots?/i.test(s)),[]);
});

test('each of the ten rows reads as the ruling left it',()=>{
 assert.equal(power('power.guardian.no-way-past').description,'Every enemy adjacent to you takes -15 Accuracy for the rest of the Battle.');
 assert.deepEqual(item('item.holy-shield').triggers,[{hook:'aura',effect:'AURA radius 1 — an enemy adjacent to you takes -10 Accuracy.'}]);
 assert.equal(power('power.poison-master.creeping-dose').description,'The target gains 5 Poison and loses 1 Resist for the rest of the Battle. Resist floors at zero.');
 assert.deepEqual(D.enchants.find(e=>e.id==='enchant.tainted-blood').triggers,[{hook:'onTakingDamage',effect:'gain 1 Bleed'}]);
 assert.match(power('power.havoc.fel-rush').description,/then every enemy within 3 hexes of where you stop takes 4 magic damage/);
 assert.match(power('power.direbeast.trample').description,/^Move up to your Movement, then every enemy adjacent to you takes 3 \+ Strength physical damage\./);
 assert.match(power('power.soul-stealer.soul-thief').description,/and you lose 2 Health\.$/);
 assert.deepEqual(item('item.death-bow').triggers,[{hook:'onKill',effect:'regain 1 Stamina'}]);
 assert.equal(power('power.contractbound.paid-in-full').description,'Heal 6 and remove 5 Bleed and Poison from yourself.');
 const porter=D.specialties.find(s=>s.id==='specialty.porter');
 assert.deepEqual(porter.triggers,[]);assert.equal(porter.statModifiers.itemSlots,2);   // its own Item Slots stay
});

test('Giant-Killer and Grudge-Bearer read no history: a fixed slayer, a flat bonus',()=>{
 assert.equal(badge('badge.giant-killer').payload,'Damage +2 vs Giants');assert.deepEqual(badge('badge.giant-killer').slayer,{giant:2});
 assert.equal(badge('badge.grudge-bearer').payload,'+1 Strength');
 assert.deepEqual(PACK.badges['badge.grudge-bearer'].statModifiers,{strength:1});assert.equal(PACK.badges['badge.grudge-bearer'].gaps,undefined);
});

test('the Tainted Blood enchantment acts on each of its four items: on taking damage, gain 1 Bleed - and carries no gap',()=>{
 const rows=Object.values(PACK.enchanted).filter(i=>i.enchant==='enchant.tainted-blood');
 assert.equal(rows.length,4);
 for(const r of rows){
  assert.deepEqual(r.triggers.map(t=>[t.hook,t.select,t.effect]),[['onTakingDamage','self',{kind:'status.apply',statusId:'status.bleed',value:1}]],r.id);
  assert.equal(r.gaps,undefined,r.id);
 }
});

test('the Eyeblight\'s Gaze deals damage from a stat, and is an attack of the pack',()=>{
 const gaze=D.bestiary.find(u=>u.id==='unit.eyeblight').attacks.find(a=>a.id==='attack.eyeblight.gaze');
 assert.equal(typeof gaze.damage.stat,'string');
 assert.equal(PACK.authoredAttacks['attack.eyeblight.gaze'].stat,gaze.damage.stat);
 assert.ok(enemy('unit.eyeblight').attacks.includes('attack.eyeblight.gaze'));
 assert.deepEqual(GAPS.filter(g=>g.unit==='unit.eyeblight'&&/gaze/.test(g.what)),[]);
});

test('the Werewolf\'s Claw Frenzy: its Strength is lent when the swing is over, hit or miss, and its row carries no gap line',()=>{
 const row=D.bestiary.find(u=>u.id==='unit.werewolf').attacks.find(a=>a.id==='attack.werewolf.claw-frenzy');
 assert.equal(row.triggers[0].hook,'onAttack');                                        // the row is as it was written
 assert.deepEqual(row.triggers[0].effects,[{effect:'grant a stat for the Battle',stat:'strength',value:1,target:'self'}]);
 const lent=enemy('unit.werewolf').triggers.filter(t=>t.effect.kind==='statMod');
 assert.deepEqual(lent.map(t=>[t.id,t.hook,t.select,t.onlyWithAttack,t.effect]),[
  ['trigger.werewolf.strength-strength.on-hit','onHit','self','attack.werewolf.claw-frenzy',{kind:'statMod',stat:'strength',value:1,until:'battle'}],
  ['trigger.werewolf.strength-strength.on-miss','onMiss','self','attack.werewolf.claw-frenzy',{kind:'statMod',stat:'strength',value:1,until:'battle'}]]);
 assert.deepEqual(GAPS.filter(g=>/claw-frenzy onAttack/.test(g.what)),[]);
 // a stat granted before the damage is computed is still the station question it was: no enemy of the pack does it
 assert.deepEqual(PACK.authoredEnemies.flatMap(u=>u.triggers||[]).filter(t=>(t.hook==='onAttack'||t.hook==='onCrit')&&t.effect.kind==='statMod'),[]);
});
