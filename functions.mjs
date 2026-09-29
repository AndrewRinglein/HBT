import fs from 'fs';
import {execFileSync} from 'child_process';
// CHICKEN AND EGG: this script reads hbt-content.json and writes gen/functions.json, which
// assemble.mjs then folds BACK INTO hbt-content.json. So the steady-state order is
// functions -> assemble -> build-viewer, but from a clean checkout hbt-content.json does
// not exist yet. Bootstrap it rather than dying, so a fresh clone builds in one pass.
if(!fs.existsSync('hbt-content.json')){
  console.error('functions.mjs: no hbt-content.json yet — running assemble.mjs first to bootstrap');
  execFileSync(process.execPath, ['assemble.mjs'], {stdio:'ignore'});
}
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const ALL=[...D.items,...D.attacks,...D.powers,...D.enchants,...D.specialties];
const TR=e=>Array.isArray(e.triggers)?e.triggers:[];
const T=e=>[e.description,...TR(e).map(t=>t.effect||'')].filter(Boolean).join(' | ');
const bump=(m,k,id)=>{ if(k) (m[k]=m[k]||new Set()).add(id); };
const out=[];
const sect=(title,blurb,map,extra)=>{
  const rows=Object.entries(map).sort((a,b)=>b[1].size-a[1].size);
  out.push('\n## '+title+'\n');
  if(blurb) out.push(blurb+'\n');
  out.push('| Function | Uses |'+(extra?' Notes |':''));
  out.push('|---|---:|'+(extra?'---|':''));
  rows.forEach(([k,v])=>out.push('| `'+k+'` | '+v.size+' |'+(extra?' '+(extra[k]||'')+' |':'')));
  return rows.length;
};

// 1 HOOKS
const hooks={}; for(const e of ALL) for(const t of TR(e)) bump(hooks,t.hook,e.id);
// 2 TARGETS — the locked vocabulary, taken from the data itself
const shapes={}; for(const e of ALL) if(typeof e.targets==='string')
  bump(shapes,e.targets.replace(/\d+/g,'N').replace(/\bN hex\b/g,'N hexes'),e.id);
// 3 CONDITIONS
// A CONDITION gates an effect. A targeting shape is not a condition, even when it names
// adjacency — that distinction was inflating three of these rows before 2026-08-20.
const conds={
 'the target has tag X':/\bif the (target|kill) (is|was|had|has)\b|\bor \d+ [A-Za-z]+ (against|if it is) (undead|demon|beast|construct|giant|dragon|horror|plant)/i,
 // NOTE: there is no "the attack killed" condition. That is the onKill HOOK. Anything that
 // read as one was prose spelling out a trigger, and it was moved onto the hook 2026-08-20.
 'the target carries a status':/plus every stack|plus the (Bleed|Burn|Poison|Frost|Weak) (already )?on|CONSUMES/i,
 'you are in stealth':/if you were in stealth/i,
};
const cond={}; for(const e of ALL){ const t=T(e); for(const [k,re] of Object.entries(conds)) if(re.test(t)) bump(cond,k,e.id); }
// 4 EFFECTS — the verbs a rule may use
const effects={
 'deal PHYSICAL damage':/physical damage/i,
 'deal MAGIC damage':/magic damage/i,
 'deal TRUE damage':/true damage/i,
 'deal damage (type from the weapon)':/deal(s)? \d|takes? \d+ damage/i,
 'heal':/\bheal(s|ed)?\b/i,
 'apply a status':/(apply|applies|gains?) \d+ (Burn|Poison|Bleed|Weak|Stun|Frost|regeneration)/i,
 'remove N of a status':/remove \d+ (Burn|Poison|Bleed|Weak|Stun|Frost|of every status|stacks)/i,
 'grant a stat for the Battle':/for the rest of the Battle/i,
 'grant a stat until end of next Turn':/until the end of your next Turn|until the start of your next Turn/i,
 'Thorns N':/Thorns \d/i,
 'Immunity N':/Immunity to/i,
 'Knockback N':/Knockback \d/i,
 'slayer bonus':/slayer/i,
 'move yourself':/move up to|immediately move|Sidestep/i,
 'move WITHOUT provoking':/provokes nothing|provoking nothing/i,
 'grant Flight':/power\.flight|as FLIGHT|FLIGHT:/i,
 'enter stealth':/enter stealth/i,
 'reveal / break stealth':/reveal|stealth breaks/i,
 'place a trap':/\btrap|snare|caltrops|briar/i,
 'set a ground layer':/becomes? (burning|frost|poisoned|darkness)|hexe?s? become/i,
 'stabilise a downed ally':/stabilis/i,
 'grant an aura':/AURA|Aura \d|aura,/i,
 'grant Surge Chance':/Surge Chance/i,
 'regain stamina':/regain \d+ [Ss]tamina|gain \d+ Stamina/i,
 'grant a badge':/gain the .* badge/i,
 'grant a power':/grants? power\.|grant .*power\./i,
 'change damage type':/deals? (true|magic) damage instead|damage instead of physical/i,
 'consume the target’s status':/CONSUMES?|consumes? (it|that|them)/i,
 'read the party-wide sum':/party.s (Magic|Spirit)|party.s (Magic|Spirit) (sum|total)/i,
 'raise the party-wide sum':/party.s (Magic|Spirit) (sum|total) (rises|count)/i,
 'take damage yourself (a cost)':/you (take|gain) \d+ (true damage|Burn)/i,
 'lose a stat (a cost)':/you lose \d+ /i,
};
const eff={}; for(const e of ALL){ const t=T(e); for(const [k,re] of Object.entries(effects)) if(re.test(t)) bump(eff,k,e.id); }
// 5 STATUSES, 6 STATS, 7 DURATIONS
const statuses={}; for(const e of ALL){ const t=T(e);
  for(const s of ['Burn','Poison','Bleed','Weak','Stun','Frost','Slow','regeneration','Protection','Karma'])
    if(new RegExp('\\b'+s+'\\b','i').test(t)) bump(statuses,s.toLowerCase(),e.id); }
const stats={}; for(const e of ALL) for(const k of Object.keys(e.statModifiers||{})) bump(stats,k,e.id);
const durs={'rest of the Battle':/rest of the Battle/i,'until the end of your next Turn':/until the end of your next Turn/i,
 'until the start of your next Turn':/until the start of your next Turn/i,'until the end of the Turn':/end of the Turn\b/i,
 'on its next Turn':/on its next Turn/i,'for N Turns':/for \d+ Turns/i,'rest of the campaign':/rest of the campaign/i};
const dur={}; for(const e of ALL){ const t=T(e); for(const [k,re] of Object.entries(durs)) if(re.test(t)) bump(dur,k,e.id); }

out.push('# The function list — everything content is allowed to say');
out.push('');
out.push('Generated by `functions.mjs` from `hbt-content.json`. This is the **complete** vocabulary:');
out.push('if a rule needs something that is not on one of these lists, it is a new mechanic and needs');
out.push('building before it is authored against. Counts are how many entries use it — a **1** is a');
out.push('candidate for cutting.');
sect('1 · Trigger hooks','When a rule fires. Twelve, plus `aura` and `passive` which are standing properties rather than events.',hooks,{
 onHit:'after a hit lands, even if armour ate all of it',onCrit:'after its own onHit, only if it crit',
 onDodge:'on the DEFENDER, when its Dodge is why the attack missed',onMiss:'on the ATTACKER',
 onDamage:'only if damage actually landed',onActivationEnd:'a unit\'s go, not a Turn',
 aura:'checked continuously',passive:'always true'});
sect('2 · Targeting shapes','`N` stands in for the radius. Nothing outside this list is legal; the wording is locked.',shapes);
sect('3 · Conditions','**Three.** A condition GATES an effect. There is deliberately no *the attack killed* condition — that is the `onKill` **hook**. A targeting shape that names adjacency is not a condition — *every enemy adjacent to you* is shape 12, not a question. What a rule may ask: what the thing you hit IS, what it is CARRYING, and whether you are in stealth.',cond);
sect('4 · Effects','What a rule may DO.',eff);
// the layer list is the ENGINE's (fix.ground-one-funnel, engine 2026-09-28; review C3): read from its
// exported vocabulary, never typed here — the hand copy said four and left cursed ground (weak) out.
const LAYER_LIST=(()=>{const L=JSON.parse(fs.readFileSync(new URL('../engine/generated/vocabulary.json',import.meta.url),'utf8')).layers.map(l=>'`'+l.id.replace(/^layer\./,'')+'`');
  return (['zero','one','two','three','four','five','six','seven','eight','nine','ten'][L.length]??L.length)+' ground layers — '+L.join(' · ');})();
sect('5 · Statuses','**Protection and Karma are statuses like the rest** — there is no separate "grant Protection" function, it is `apply a status`. Karma is the only one that decays on an EVENT rather than on the clock: every unit in the game loses 1 Karma on kill. **Slow** is the one-Turn Movement loss, written as a status so nothing has to remember whose next Turn it is.\n\n**A status is not a ground layer.** The '+LAYER_LIST+' — carry no number and no duration, a hex holds exactly one, and a new one replaces the old. See `rule.ground-layers`. A unit gains **Frost**; a hex becomes **frost**.',statuses);
sect('6 · Stats a modifier may name',null,stats);
sect('7 · Durations','A stat modifier lasts the rest of the Battle unless the row says otherwise.',dur);
out.push('\n## What is explicitly NOT available\n');
out.push('Each of these was cut, and `audit.mjs` fails on it:\n');
[['occurrence counting','no "first time", no Nth hit, no per-Turn or per-Battle tally'],
 ['stacking limits','no "stacking up to +3" — a repeating gain either stacks forever or does not repeat'],
 ['naming functions','you do not use a power and then choose again inside it'],
 ['in-power choices','activating it IS the choice'],
 ['"your next <form> attack"','nothing tracks which attack is next or what form it is — use a duration'],
 ['state gates','no "usable only at or below half Health", no "after an ally has died this Battle"'],
 ['turn order','nothing reads whether a unit has acted yet'],
 ['event history','nothing remembers what has happened earlier in the Battle'],
 ['did-not-move / did-not-attack','nothing reads what you chose not to do'],
 ['zone of control','no taxing movement out of a hex'],
 ['stat overrides and floors','modify a stat; never replace or clamp it'],
 ['ignoring a status','Immunity N is the mechanic'],
 ['cooldown manipulation','no resetting or extending a cooldown'],
 ['per-target memory','no marks, no designations, no "+10 against that one until you hit it"'],
 ['adjacency to the TARGET','you may read your own neighbours, not somebody else\'s'],
 ['forced movement other than Knockback','no pulls, pushes or swaps'],
 ['Vision on a weapon, or Vision taken off an enemy','enemies do not have Vision at all'],
 ['crit damage multipliers','a crit is not a x2. Write onCrit: deal N crits'],
].forEach(([k,v])=>out.push('- **'+k+'** — '+v));
const J=(m)=>Object.entries(m).sort((a,b)=>b[1].size-a[1].size).map(([k,v])=>({name:k,uses:v.size,ids:[...v].slice(0,40)}));
fs.writeFileSync('gen/functions.json',JSON.stringify({
  hooks:J(hooks),shapes:J(shapes),conditions:J(cond),effects:J(eff),
  statuses:J(statuses),stats:J(stats),durations:J(dur),
  hookNotes:{onHit:'after a hit lands, even if armour ate all of it',onCrit:'after its own onHit, only if it crit',
    onDodge:'on the DEFENDER, when its Dodge is why the attack missed',onMiss:'on the ATTACKER',
    onDamage:'only if damage actually landed',onActivationEnd:'a unit\u2019s go, not a Turn',
    aura:'a standing property WITH a radius, checked continuously',
    passive:'a standing property with NO radius — always true, about you alone',
    startOfBattle:'once, as the battle loads',onEquip:'when the item goes on',onDeath:'when you die',
    onAttack:'always fires, so it may carry an EFFECT but never a modifier to its own attack',
    onKill:'the attack killed something'},
  notAvailable:[['occurrence counting','no "first time", no Nth hit, no per-Turn or per-Battle tally'],
   ['stacking limits','a repeating gain either stacks forever or does not repeat'],
   ['naming functions','you do not use a power and then choose again inside it'],
   ['in-power choices','activating it IS the choice'],
   ['"your next <form> attack"','nothing tracks which attack is next or what form it is'],
   ['state gates','no "usable only at or below half Health", no "after an ally has died"'],
   ['turn order','nothing reads whether a unit has acted yet'],
   ['event history','nothing remembers what happened earlier in the Battle'],
   ['did-not-move / did-not-attack','nothing reads what you chose not to do'],
   ['zone of control','no taxing movement out of a hex'],
   ['stat overrides and floors','modify a stat; never replace or clamp it'],
   ['ignoring a status','Immunity N is the mechanic'],
   ['cooldown manipulation','no resetting or extending a cooldown'],
   ['per-target memory','no marks, no designations'],
   ['adjacency to the TARGET','you may read your own neighbours, not somebody else\u2019s'],
   ['forced movement other than Knockback','no pulls, pushes or swaps'],
   ['Vision on a weapon, or Vision taken off an enemy','enemies do not have Vision at all'],
   ['crit damage multipliers','a crit is not a x2. Write onCrit: deal N crits'],
   ['the attacker\u2019s tags or position','the game reads the TARGET, never the attacker'],
   ['restating a rule that already fires','Burn already halves healing; do not write it again']]
},null,1));
fs.writeFileSync('FUNCTIONS.md',out.join('\n')+'\n');
console.log(out.join('\n'));
