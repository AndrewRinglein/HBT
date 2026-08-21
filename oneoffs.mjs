import fs from 'fs';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const ALL=[...D.items,...D.attacks,...D.powers,...D.enchants,...D.specialties];
const T=e=>[e.description,...(Array.isArray(e.triggers)?e.triggers:[]).map(t=>t.effect||''),
            e.modifies?JSON.stringify(e.modifies):''].filter(Boolean).join(' | ');
// Every distinct capability a rule could ask the engine for. Counted, so a capability
// that exists for one entry is a subsystem built for one card.
const CAP=[
 ['read turn order',/has not yet acted|order of activation|before it acts|acts first/i],
 ['read a stance’s state',/while the stance|while this stance/i],
 ['designate/mark a target',/your mark|marked target|mark that enemy/i],
 ['auto-select by distance',/furthest|nearest enemy|closest enemy/i],
 ['auto-select by a stat',/lowest Health|highest Health|weakest|strongest/i],
 ['count units on the field',/for each enemy|for each ally|each enemy on the field|number of/i],
 ['read damage taken so far',/damage .* taken out of you|so far this Battle|damage you have taken/i],
 ['move another unit',/pull one|push|swap places|move that ally|moved 1 hex directly away|moved 2 hexes directly away/i],
 ['pass through occupied hexes',/passing (freely )?through occupied|over units and obstructions/i],
 ['place terrain',/becomes? burning|set .* alight|hexes burning|becomes? poisoned|wall of|difficult/i],
 ['place a trap',/\btrap\b|snare/i],
 ['stealth: enter',/enter stealth|you cannot be seen/i],
 ['stealth: break/reveal',/stealth breaks|reveal every|is revealed/i],
 ['grant an aura mid-battle',/^aura:|Aura: for the rest/i],
 ['grant a free activation',/free activation|extra Activation|does not consume the primary/i],
 ['grant a power/ability',/gains? the .* power|may immediately equip|grants? .* ability/i],
 ['grant a badge',/gain the .* badge/i],
 ['transfer an item',/give one carried item|hand .* item|take an adjacent ally.s burden/i],
 ['read the party-wide sum',/party.s (Magic|Spirit)|party-wide/i],
 ['revive / stabilise',/stabilis|bleed-out|downed/i],
 ['immunity to a status',/\bimmunity\b|immune to/i],
 ['consume a status on the target',/consumes? that|plus every stack|reads the/i],
 ['status on a HEX not a unit',/hexes? (become|burning|poisoned)|begins its Turn on/i],
 ['modify an attack you have not made',/your next attack|your next .* attack/i],
 ['cancel a crit',/is an ordinary hit instead|cannot crit you/i],
 ['prevent damage entirely',/take none of it|deals no damage/i],
 ['leave you at 1 Health',/left at 1 Health/i],
 ['charge a campaign resource',/1 Faith|Faith\b|Supply|mana crystal/i],
 ['scale off a stat with a multiplier',/twice your|three times your|half (the|your)/i],
 ['summon / companion unit',/companion|summon|it deploys|deploys on any hex/i],
 ['a follow / attachment relationship',/the hero you follow|your leader|attached to/i],
 ['damage floor (cannot go below N)',/cannot be dropped below|left at \\d+ Health|reduced to \\d+ instead/i],
 ['measure a stat from another unit',/measured from your companion|from another unit.s hex/i],
 ['modify the PARTY-WIDE total',/party.s (Magic|Spirit) total rises|party.s Magic total/i],
 ['did-not-move / did-not-attack',/while you did not move|if you did not|made no attack|you may not move/i],
 ['drop or pick up an item',/drop something onto|pick it back up|give one carried item/i],
 ['read another unit’s Vision',/your Vision is measured|it has your Vision/i],
 ['a unit that does not attack',/does not attack/i],
 ['halve or double a value',/halved|doubled|twice the|half the/i],
 ['act out of turn',/without spending your Turn|does not spend its own Turn|immediately move/i],
 ['change a cost mid-battle',/costs 0 Stamina instead|instead of its printed cost|reduce the cost/i],
 ['re-roll',/re-?roll/i],
 ['copy or steal an effect',/gain it yourself|copy|steal/i],
 ['see through darkness or fog',/darkness and fog|ignores darkness/i],
 ['limit on how many may be equipped',/only one .* may be|one per hero/i],
 ['a second resource bar',/Surge Chance|Stamina Regen/i],
 ['scale off number of items or slots',/for each item|per Item Slot/i],
 ['permanent between battles',/rest of the campaign|permanently/i],
 ['thorns',/Thorns \d/i],
 ['knockback',/Knockback \d/i],
];
const hits={};
for(const e of ALL){ const t=T(e); for(const [n,re] of CAP) if(re.test(t)) (hits[n]=hits[n]||[]).push(e.id); }
const rows=Object.entries(hits).sort((a,b)=>a[1].length-b[1].length);
console.log('# Engine capabilities each rule asks for, counted\n');
for(const [k,ids] of rows){
  console.log(String(ids.length).padStart(4)+'  '+k+(ids.length<=3?'  <-- ':''));
  if(ids.length<=3) console.log('        '+ids.join(', '));
}
