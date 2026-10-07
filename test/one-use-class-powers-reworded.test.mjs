// engine content.one-use-class-powers-reworded (2026-10-06). Ruled 2026-10-06 (Andrew, engine DECISIONS.md 'the one-use rules:
// most are cut or reworded onto rules the engine already has; a handful are built'): "A ton of these things can be done in
// other ways that fit within our mechanics." "We don't need every condition to have different ways to apply. We can reuse the
// things we already have." Each named class power keeps its id, its name and its place in its specialty and says only what
// other rows already say (engine SWITCHES.md 'content.one-use-*', one line a power). His own words where he gave them: Take
// Root - "we give -5 move and a bonus until the end of your next activation"; Bear the Flame - "remove 2 burn and poison from
// an ally and gain 2 bleed"; Succor of the Faithful - "take damage and cleanse. We don't have to have them be conditional on
// one another"; the Magical Friend - "just summoned an ally".
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));
const power=id=>D.powers.find(p=>p.id===id);
/** the named powers, each with the specialty it stays in */
const NAMED={
 'power.demonic-ward.soul-barrier':'specialty.demonic-ward','power.sentinel.take-root':'specialty.sentinel','power.sentinel.overwatch':'specialty.sentinel',
 'power.protector.take-the-blow':'specialty.protector','power.nightblade.long-knife':'specialty.nightblade','power.soul-stealer.life-drain':'specialty.soul-stealer',
 'power.mystic.guidance':'specialty.mystic','power.totem-master.ancestral-anchor':'specialty.totem-master','power.redeemer.bear-the-flame':'specialty.redeemer',
 'power.holy-avenger.succor-of-the-faithful':'specialty.holy-avenger','power.seer.foresee-the-blow':'specialty.seer','power.exorcist.sever-the-channel':'specialty.exorcist',
 'power.witch-hunter.iron-and-salt':'specialty.witch-hunter','power.witch-hunter.hunt':'specialty.witch-hunter','power.grand-master.close-ranks':'specialty.grand-master',
 'power.porter.drop-the-pack':'specialty.porter','power.militia.aim':'specialty.militia','power.trickster.escape':'specialty.trickster',
 'power.archivist.identify':'specialty.archivist','power.sage.enlighten':'specialty.sage','power.torchbearer.flare':'specialty.torchbearer',
 'power.nightblade.exsanguinate':'specialty.nightblade','power.magical-friend.share-senses':'specialty.magical-friend','power.magical-friend.succor':'specialty.magical-friend',
};

test('every named power is still a row, by its id, in the specialty it had; no specialty lost one',()=>{
 for(const [id,sp] of Object.entries(NAMED)){
  assert.equal(power(id)?.specialty,sp,id);
  assert.ok(D.specialties.find(s=>s.id===sp).powers.includes(id),`${sp} lists ${id}`);
  assert.ok(PACK.classPowers[id],`${id} is a pack row`);
 }
});

test('none of them carries a clause that only it uses',()=>{
 const ONE_USE=[
  /Decline the damage/i,                                  // a choice inside a power
  /until you next move/i,
  /an enemy that moves within/i,                          // a free shot on an enemy's movement
  /all damage dealt to that ally is reduced/i, /in (?:that ally's|its) place/i,
  /more than \d+ hexes away/i,                            // a bonus by distance
  /half of what it deals/i,                               // a heal by share of damage
  /that ally's SWORD attacks/i,                           // a bonus lent to an ally's attacks of one weapon
  /Move every stack/i,                                    // a status moved between units
  /for each (?:point|stack) (?:removed|cleansed)/i,       // damage per point removed
  /The next attack made against/i,                        // a penalty on the next attack against a target
  /cannot apply|cannot gain/i,
  /\bmark(?:ed)?\b/i,
  /also adjacent to another ally/i,                       // an aura that asks for a second ally
  /pick(?:s|ed)? (?:it )?up|pickup/i,
  /ignor(?:e|es|ing) (?:the )?Reach/i,
  /leave the Battle/i,
  /damage from every source/i,
  /costs 1 less Stamina/i,                                // a cheaper next power
  /lit zone|is lit\b/i,
  /your companion|from your companion/i,                  // the Magical Friend's companion is an ordinary summoned ally
 ];
 const bad=[];
 for(const id of Object.keys(NAMED)) for(const re of ONE_USE) if(re.test(power(id).description)) bad.push(`${id}: ${re}`);
 assert.deepEqual(bad,[]);
});

test('his own words, on the rows he spoke of',()=>{
 assert.equal(power('power.sentinel.take-root').description,'Plant yourself: lose 5 Movement, and your ranged attacks gain +20 Accuracy, both until the end of your next Activation.');
 assert.equal(power('power.redeemer.bear-the-flame').description,'Free. Remove 2 Burn and 2 Poison from that ally, and gain 2 Bleed yourself.');
 assert.equal(power('power.holy-avenger.succor-of-the-faithful').description,'Free. Take 2 true damage, remove 5 Burn and 5 Poison from yourself, and gain Protection equal to your Spirit.');
 assert.match(power('power.nightblade.exsanguinate').description,/adds every stack of Bleed on the target to its damage/);
 // Guidance is not a bonus lent to an ally's attacks: it is aimed at its caster
 assert.equal(power('power.mystic.guidance').targets,'self');
 // the Magical Friend's companion: a summoned ally and nothing more
 const friend=D.specialties.find(s=>s.id==='specialty.magical-friend');
 assert.deepEqual(friend.triggers,[{hook:'startOfBattle',effect:'summon your companion on any hex within 2 hexes of you. It is a summoned ally with its own stat block and its own AI'}]);
 assert.equal(power('power.magical-friend.succor').description,'Heal that ally for 2 + Spirit.');
});

test('Take Root compiles: 5 Movement lost and +20 Accuracy, both until the end of the next Activation of the one who plants',()=>{
 const p=PACK.classPowers['power.sentinel.take-root'];
 assert.deepEqual(p.effects,[
  {kind:'statMod',stat:'movement',value:-5,until:'endOfNextActivation',who:'self'},
  {kind:'statMod',stat:'accuracy',value:20,until:'endOfNextActivation',who:'self'}]);
 assert.deepEqual(p.target,{select:'self',side:'any'});
 // what is still not the engine's: the bonus is the unit's, not only its ranged attacks' - named, as on every such row
 assert.deepEqual(p.gaps,['modifies only ranged attacks — engine applies it to the unit']);
});

test('Overwatch is a bonus to its holder\'s own attacks for a window, the shape other powers share',()=>{
 const p=PACK.classPowers['power.sentinel.overwatch'];
 assert.deepEqual(p.effects,[
  {kind:'statMod',stat:'crit',value:10,until:'endOfNextTurn',who:'self'},
  {kind:'statMod',stat:'reach',value:1,until:'endOfNextTurn',who:'self'}]);
});

test('Hallowed Ground and Impersonation are not this item\'s: Hallowed Ground is as it was',()=>{
 assert.ok(D.powers.some(p=>p.name==='Hallowed Ground'));
});
