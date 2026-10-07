// engine content.card-draw-badge-rules-cut (2026-10-06). Ruled 2026-10-06 (Andrew, engine DECISIONS.md 'Knocked Sprawling
// knocks Prone and takes no Surge; the Bleeding crit is 4 Bleed; the card-draw badge rules are cut for now'), asked whether the
// badges that speak of drawing cards belong to a card system or are leftovers: "We may add a card system at some point, but
// you can cut all those for now." Five rows carried such a clause - Anguish, Possession, Quick Study, Wise, Old. The clause
// is gone from each; Possession and Old keep their other rules; Anguish and Wise, which had nothing else, stay as empty rows
// until there is a card system (engine SWITCHES.md cardBadgesEmptied: a viewer fixture names Wise).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
const badge=id=>D.badges.find(b=>b.id===id);
/** what a reader meets on a badge row: not its id, not its source note */
const said=b=>JSON.stringify(b,(k,v)=>k==='id'||k==='source'?undefined:v);
const CARD=/card draw|\bdraw\b|draws? a card/i;

test('no badge row speaks of drawing a card - in the Codex or in the pack',()=>{
 assert.deepEqual(D.badges.filter(b=>b&&b.id&&CARD.test(said(b))).map(b=>b.id),[]);
 assert.deepEqual(Object.values(PACK.badges).filter(b=>CARD.test(said(b))).map(b=>b.id),[]);
});

test('Possession keeps its other rules: its stats, its Deathbed line, its deploy cost and its 0-Health rule',()=>{
 const row=badge('badge.possession');
 assert.equal(row.payload,'+2 Magic, +1 Resist, +3 Vision, −10 Surge · −10 Deathbed Fighting · deploying the hero costs 3 Mana');
 assert.deepEqual(row.drawbacks,{stats:['surge'],terms:['deploying the hero costs 3 Mana']});
 assert.equal(row.atZero.raises,'unit.ghost');
 const p=PACK.badges['badge.possession'];
 assert.deepEqual(p.drawbacks,{mods:['surge'],gaps:['deploying the hero costs 3 Mana']});
 assert.ok(p.gaps.includes('deploying the hero costs 3 Mana'));
 assert.equal(p.statModifiers.magic,2);assert.equal(p.statModifiers.surge,-10);
});

test('Old keeps its Item Slots and its two losses; Quick Study keeps its Surge',()=>{
 assert.equal(badge('badge.old').payload,'−1 Health, −1 Movement; +2 Item slots');
 assert.deepEqual(badge('badge.old').statModifiers,[{stat:'health',op:'add',value:-1},{stat:'movement',op:'add',value:-1},{stat:'itemSlots',op:'add',value:2}]);
 assert.equal(badge('badge.quick-study').payload,'+1 Surge');
 assert.equal(PACK.badges['badge.quick-study'].gaps,undefined);
});

test('Anguish and Wise had no rule but the card draw: each stays, an empty row, until there is a card system',()=>{
 for(const id of ['badge.anguish','badge.wise']){
  assert.equal(badge(id).payload,'',id);
  assert.deepEqual([PACK.badges[id].statModifiers,PACK.badges[id].grants,PACK.badges[id].flags],[{},[],{}],id);
 }
});

test('the tactic slot was not asked about and is not touched',()=>{
 assert.match(badge('badge.name-in-the-hall').payload,/tactic slot/);
});
