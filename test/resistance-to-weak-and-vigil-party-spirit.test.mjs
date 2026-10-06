// engine content.resistance-to-weak-and-vigil-party-spirit (2026-10-06). Ruled 2026-10-05 (engine DECISIONS.md 'a prone unit
// only stands; … Resistance to Weak; the Vigil heals by the party's Spirit'; GLOSSARY.md 'Settled, 2026-10-05'): "Immunity to
// week 2 should now be resistance to week 2. And yes, when we get to that part, it should remove two points of weak", and the
// Banner of the Vigil heals "2 by the party spirit". The Codex's own rows: no sentence a reader meets says Immunity to Weak N;
// the two banner rows compile from their new sentences to what the engine fights.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
/** every sentence a reader meets: names, descriptions, payloads, rules, effects, intents — not ids, not source notes */
function read(node,key,out=[]){
 if(typeof node==='string'){if(!['id','source','note','owner','base','enchant'].includes(key))out.push(node)}
 else if(Array.isArray(node))for(const x of node)read(x,key,out);
 else if(node&&typeof node==='object')for(const [k,v] of Object.entries(node))read(v,k,out);
 return out;
}
const OLD=/immunity to weak|immune (to )?weak \d|immunity \(?\d\)? ?\(weak\)|immunity \(weak\)|weakness immunity/i;

test('no sentence of the Codex a reader meets says "Immunity to Weak N" in any of its spellings',()=>{
 assert.deepEqual(read(D.items).concat(read(D.powers),read(D.badges),read(D.enchants),read(D.enemyFamilyRules),read(D.attacks)).filter(s=>OLD.test(s)),[]);
});

test('the rows that carried the clause say Resistance to Weak N',()=>{
 const power=id=>D.powers.find(p=>p.id===id),item=id=>D.items.find(i=>i.id===id),badge=id=>D.badges.find(b=>b.id===id);
 assert.match(power('power.banner-courage.plant').description,/\+1 Resist to allies in the aura, and Resistance to Weak 2 while inside it\./);
 const n=item('item.necklace-of-weakness-immunity');
 assert.equal(n.name,'Necklace of Weakness Resistance');assert.equal(n.description,'Resistance to Weak 1. One point comes off each Weak you would gain.');
 assert.deepEqual(n.immunity,{weak:1});                                     // the field keeps its name and its number
 assert.equal(badge('badge.curse-resistant').payload,'Resistance to Weak 1');
 assert.equal(D.enemyFamilyRules.find(r=>r.family==='imps').rule,'every Demon in the imp family has Resistance to Weak 1');
 // "immune" stays the word for a unit that can gain none of it: these rows carry no number and are not changed
 assert.equal(badge('badge.brave').payload,'+1 Resist; immune to Weak');
 assert.match(badge('badge.unwavering').payload,/^Immune to Weak;/);
});

test('the Banner of Courage still wards 2 Weak; the Banner of the Vigil heals by the party\'s Spirit, and its sentence says so',()=>{
 const courage=PACK.authoredAbilities['power.banner-courage.plant'],vigil=PACK.authoredAbilities['power.banner-vigil.plant'];
 assert.deepEqual(courage.effects[0].wards,{'status.weak':2});assert.equal(courage.gaps,undefined);
 assert.match(D.powers.find(p=>p.id==='power.banner-vigil.plant').description,/that ally heals an amount equal to the party's Spirit\.$/);
 assert.deepEqual(vigil.effects[0].lends.map(t=>[t.hook,t.effect]),[['onActivationEnd',{kind:'heal',amount:{scale:'partySpirit',base:0,mult:1}}]]);
 assert.equal(vigil.gaps,undefined);
 // what is not built stays named: the Necklace's field and the badge's line
 assert.deepEqual(PACK.items['item.necklace-of-weakness-immunity'].gaps,['immunity: {"weak":1} — item field: immunity']);
 assert.deepEqual(PACK.badges['badge.curse-resistant'].gaps,['Resistance to Weak 1']);
});
