// engine content.banner-heroism-own-miss (2026-10-06). Ruled 2026-10-06 (Andrew, engine DECISIONS.md 'the one-use rules: most
// are cut or reworded onto rules the engine already has; a handful are built'), of the Banner of Heroism's last clause: "it
// could be done by everybody who's in range. Gains on miss. Gain surge, but not everyone gives everyone the modifier. That
// seems like a double stacked thing that we don't need." An ally standing in the banner's reach that misses gains 30 Surge
// Chance itself: a trigger the planted object lends to the unit it is lent to.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
const GAPS=JSON.parse(fs.readFileSync(path.join(source,'gen/enemy-pack-gaps.json'),'utf8')).gaps;

test('the row says it of the one that misses, and of nobody else',()=>{
 const row=D.powers.find(p=>p.id==='power.banner-heroism.plant');
 assert.match(row.description,/ onMiss, for a unit in the aura: gain 30 Surge Chance\.$/);
 assert.ok(!/EVERY ally|by any ally/.test(row.description));
});

test('it compiles to a trigger the planted object lends to the unit itself, on a miss: the engine\'s surge.gain, 30',()=>{
 const plant=PACK.authoredAbilities['power.banner-heroism.plant'].effects[0];
 assert.equal(plant.kind,'plant');assert.equal(plant.radius,3);assert.deepEqual(plant.mods,{strength:2,precision:2});
 assert.deepEqual(plant.lends,[
  {id:'trigger.banner-heroism.plant.heal',hook:'onActivationEnd',chance:100,select:'self',effect:{kind:'heal',amount:5},source:'power.banner-heroism.plant'},
  {id:'trigger.banner-heroism.plant.surge-on-miss',hook:'onMiss',chance:100,select:'self',effect:{kind:'surge.gain',value:30},source:'power.banner-heroism.plant'}]);
});

test('the power and its item carry no named gap',()=>{
 assert.equal(PACK.authoredAbilities['power.banner-heroism.plant'].gaps,undefined);
 assert.equal(PACK.items['item.banner-heroism'].gaps,undefined);
 assert.deepEqual(GAPS.filter(g=>g.unit==='item.banner-heroism'),[]);
});

test('the Banner of the Assassin\'s on-crit line, the shape this one copies, is as it was',()=>{
 assert.deepEqual(PACK.authoredAbilities['power.banner-assassin.plant'].effects[0].lends,
  [{id:'trigger.banner-assassin.plant.stamina',hook:'onCrit',chance:100,select:'self',effect:{kind:'stamina.gain',value:1},source:'power.banner-assassin.plant'}]);
});
