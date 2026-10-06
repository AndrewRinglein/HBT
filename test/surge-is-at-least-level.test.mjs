// engine rule.surge-is-at-least-level (2026-10-06). Ruled 2026-10-06 (engine DECISIONS.md 'everyone gains Surge equal to its
// level at the least, and rolls the Surge check every Activation'): "Everyone gains surge equal to level, at the very least.
// Therefore, there is always at least a 1% chance of a surge." The number is made in content: each of the six hero classes
// grants 1 Surge at every level (gen/levels.json, the table's every-level grant), the pack writes the level-1 point on
// every hero-side row that levels on such a table, and each later level's row carries its own. Civilians and beasts say in
// their own rows exactly what they had (none at level 1, 2 at level 2, 1 a level after) until he rules on them; an enemy
// has none.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const L=JSON.parse(fs.readFileSync(path.join(source,'gen/levels.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
const HERO=['class.warrior','class.ranger','class.rogue','class.mage','class.priest','class.paladin'];
const tableOf=row=>row.levelTable??(row.tags||[]).find(t=>t.startsWith('class.'));

test('the six hero classes grant 1 Surge at every level - the table\'s every-level grant; the rule is written in the tables\' rules',()=>{
 for(const id of HERO){const c=L.classes.find(x=>x.id===id);assert.equal(c.freebie.surge,1,id);assert.ok(c.rows.every(r=>r.grants.surge===undefined),id+': no row repeats it');}
 assert.equal(L.classes.find(c=>c.id==='class.warrior').freebie.health,1);          // beside the Warrior's Health, which is as it was
 assert.match(L.rules.surge,/Everyone gains surge equal to level, at the very least/);
});

test('the pack: every level row of a hero class carries the 1, and every hero-side row that levels on one starts with it',()=>{
 for(const id of HERO)assert.deepEqual(PACK.levels[id].rows.map(r=>r.grants.surge),[1,1,1,1,1,1,1,1,1,1],id);
 const rows=[...PACK.heroes,...PACK.prologueParty,...PACK.alphaTeam,...Object.values(PACK.test.units)].filter(r=>r.side==='hero');
 const heroes=rows.filter(r=>HERO.includes(tableOf(r)));
 assert.ok(heroes.length>=60,'heroes '+heroes.length);
 for(const r of heroes)assert.ok(r.surge>=1,r.typeId+' '+r.surge);
 // a hero with nothing of its own has exactly 1; a test body that says its own Surge keeps it, with the level's point on top
 assert.equal(PACK.prologueParty.find(r=>r.typeId==='hero.base.warrior-iron').surge,1);
 const own=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(source,'test/units.json'),'utf8')).filter(u=>u.surge!==undefined||u.set?.surge!==undefined).map(u=>[u.id,u.surge??u.set.surge]));
 assert.ok(Object.keys(own).length>=2);
 for(const [id,n] of Object.entries(own))assert.equal(Object.values(PACK.test.units).find(u=>u.typeId===id).surge,n+1,id);
});

test('civilians, beasts and enemies are as they were: no Surge at level 1; a civilian\'s and a beast\'s table says its level from level 2; an enemy has none',()=>{
 const others=[...L.classes,...L.civilianTypes].filter(c=>!HERO.includes(c.id));
 assert.equal(others.length,15);
 for(const c of others){assert.equal(c.freebie?.surge,undefined,c.id);assert.deepEqual(c.rows.map(r=>r.grants.surge??0),[0,2,1,1,1,1,1,1,1,1],c.id);}
 for(const r of [...PACK.prologueParty,...PACK.alphaTeam,...PACK.heroes].filter(r=>!HERO.includes(tableOf(r))))assert.equal(r.surge,undefined,r.typeId);
 for(const r of [...PACK.enemies,...PACK.authoredEnemies,...Object.values(PACK.test.units).filter(u=>u.side!=='hero')])assert.equal(r.surge,undefined,r.typeId);
});
