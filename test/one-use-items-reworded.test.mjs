// engine content.one-use-items-reworded (2026-10-06). Ruled 2026-10-06 (Andrew, engine DECISIONS.md 'the one-use rules: most
// are cut or reworded onto rules the engine already has; a handful are built'), item by item: the Divine Bulwark - "Just add
// one stun. At combat start"; the Drakescale Coat - "Give it 2 fire resistance."; the Wayfinder's Compass - "just give a bonus
// to vision."; the Rune of the Perfect Hunter - "Just get rid of that."; The Last Arrow - "on kill gain 70 surge and take -3
// precision. Means you need to change out to melee after you kill with this."; Storm Bastion - "we don't need that."; the
// Blink Ring - "I don't think we need teleportation"; the Brass Spyglass - "we don't need that."
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
const GAPS=JSON.parse(fs.readFileSync(path.join(source,'gen/enemy-pack-gaps.json'),'utf8')).gaps;
const item=id=>D.items.find(i=>i.id===id);

test('the Divine Bulwark gives 1 Stun at the start of the Battle, and its Armor from the start',()=>{
 const row=item('item.divine-bulwark');
 assert.deepEqual(row.triggers,[{hook:'startOfBattle',effect:'gain 1 Stun'}]);assert.equal(row.statModifiers.armor,2);
 const p=PACK.items['item.divine-bulwark'];
 assert.deepEqual(p.triggers.map(t=>[t.hook,t.select,t.effect]),[['startOfBattle','self',{kind:'status.apply',statusId:'status.stun',value:1}]]);
 assert.equal(p.statModifiers.armor,2);assert.equal(p.gaps,undefined);
});

test('the Drakescale Coat gives 2 Fire Resist and says nothing of halved Burn',()=>{
 const row=item('item.drakescale-coat');
 assert.equal(row.statModifiers.fireResist,2);
 assert.deepEqual(row.triggers.map(t=>t.effect).filter(e=>/halved|Burn/.test(e)),[]);
 assert.equal(PACK.items['item.drakescale-coat'].statModifiers.fireResist,2);
});

test('the Wayfinder\'s Compass gives Vision and nothing about a floor',()=>{
 assert.deepEqual(item('item.wayfinders-compass').triggers,[{hook:'startOfBattle',effect:'gain +2 Vision for the rest of the Battle'}]);
});

test('the Rune of the Perfect Hunter is in neither the Codex nor the pack, and nothing names it',()=>{
 assert.equal(item('item.rune-perfect-hunter'),undefined);
 assert.equal(PACK.items['item.rune-perfect-hunter'],undefined);
 const strip=o=>JSON.stringify(o,(k,v)=>k==='source'?undefined:v);
 for(const key of Object.keys(D)) assert.ok(!/rune-perfect-hunter|Perfect Hunter/.test(strip(D[key])),`hbt-content.json ${key} names it`);
 assert.ok(!/rune-perfect-hunter/.test(JSON.stringify(PACK)));
});

test('The Last Arrow: on a kill, 70 Surge and -3 Precision, and no free shot; the line waits, named, on the engine\'s Surge effect',()=>{
 const arrow=D.attacks.find(a=>a.id==='attack.death-bow.the-last-arrow');
 assert.deepEqual(arrow.triggers,[{hook:'onKill',effect:'gain 70 Surge, and take -3 Precision for the rest of the Battle'}]);
 assert.deepEqual(D.attacks.filter(a=>/free Death Shot|different enemy/.test(JSON.stringify(a.triggers||[]))),[]);
 const gap=GAPS.filter(g=>g.unit==='item.death-bow'&&/the-last-arrow/.test(g.what));
 assert.deepEqual(gap.map(g=>g.needs),["no effect moves a unit's Surge amount — engine capability.trigger-moves-surge"]);
 assert.match(gap[0].what,/^attack\.death-bow\.the-last-arrow onKill: "gain 70 Surge, and take -3 Precision/);
 // neither half acts until both can: the loss without its gain would be another weapon
 assert.deepEqual((PACK.items['item.death-bow'].triggers||[]).filter(t=>t.onlyWithAttack==='attack.death-bow.the-last-arrow'),[]);
});

test('Storm Bastion has no aura; the Blink Ring does not teleport; the Brass Spyglass makes no zone - each keeps what is left',()=>{
 const bastion=item('item.storm-bastion');
 assert.deepEqual(bastion.triggers,[]);assert.equal(bastion.statModifiers.armor,3);assert.equal(PACK.items['item.storm-bastion'].gaps,undefined);
 const ring=item('item.blink-ring');
 assert.equal(ring.description,'Free. Move up to 4 hexes. It provokes nothing.');assert.ok(!/teleport|not movement|interrupt/i.test(JSON.stringify({...ring,source:undefined})));
 const glass=item('item.brass-spyglass-of-thessan');
 assert.equal(glass.description,'Free. Every ally within 3 hexes gains +10 Accuracy until the end of the Turn.');assert.equal(glass.targets,'allies within 3 hexes');
});
