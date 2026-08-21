// novelty.mjs — "did I invent anything?"
//
//   node novelty.mjs class.beast
//   node novelty.mjs specialty.trapper
//   node novelty.mjs item.          (any id prefix works)
//
// Splits the content in two — entries matching the filter, and everything else — then
// compares the VOCABULARY each side uses: hooks, targeting shapes, ranges, damage types,
// source stats, stat keys, tags, item classes, statuses, durations and effect verbs.
// Anything that appears on the new side and NOWHERE else is a thing that was invented for
// this content, which is exactly what Angela keeps asking about. Exits 1 if it finds any.
//
// It caught three in the Beast class: range written as "ranged" when every other attack
// states a number of hexes; flight asserted in prose when every other source grants the
// power through the `grants` field; and three form tags no rule read and no enchant applied
// to. None of those would have failed assemble or audit — they parse fine, they are just
// second ways to say things the game already says.
import fs from 'fs';
const FILTER=process.argv[2]||'class.beast';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const all=[...D.items,...D.enchants,...D.specialties,...D.attacks,...D.powers];
const BEASTIDS=new Set();
for(const e of all){
  if(e.class===FILTER||e.classRestriction===FILTER||e.specialty===FILTER||String(e.id).startsWith(FILTER)) BEASTIDS.add(e.id);
}
// an item's attacks belong to the item — pull them in so a weapon and its swings are judged together
const owned=D.items.filter(i=>BEASTIDS.has(i.id)).map(i=>i.id.replace(/^item\./,''));
for(const a of D.attacks) if(owned.some(w=>String(a.id).startsWith('attack.'+w+'.'))) BEASTIDS.add(a.id);
const isBeast=e=>BEASTIDS.has(e.id);
const beast=all.filter(isBeast), rest=all.filter(e=>!isBeast(e));
console.log('NOVELTY CHECK  filter='+FILTER+'\n'+beast.length+' matching entries, judged against the other '+rest.length+'\n');
if(!beast.length){ console.error('nothing matched "'+FILTER+'"'); process.exit(1); }

const mech=e=>[e.description,...(e.triggers||[]).map(g=>g.effect||g.description||'')].filter(Boolean).join(' | ');
const tally=(list,fn)=>{const m=new Map();for(const e of list)for(const k of fn(e)){if(!m.has(k))m.set(k,[]);m.get(k).push(e.id)}return m};
const report=(label,fn)=>{
  const B=tally(beast,fn), R=tally(rest,fn);
  const novel=[...B.keys()].filter(k=>!R.has(k));
  console.log('## '+label);
  if(!novel.length){ console.log('   ok — every value already existed elsewhere ('+B.size+' distinct, all known)\n'); return 0; }
  for(const k of novel) console.log('   NEW: '+JSON.stringify(k)+'   used by '+B.get(k).length+': '+B.get(k).slice(0,4).join(' '));
  console.log('');
  return novel.length;
};
let n=0;
n+=report('Trigger hooks / stations', e=>(e.triggers||[]).map(g=>g.hook));
n+=report('Targeting shapes (N abstracted)', e=>e.targets?[String(e.targets).replace(/\b\d+\b/g,'N')]:[]);
n+=report('Attack range', e=>e.range?[e.range]:[]);
n+=report('Attack damage type', e=>e.damageType?[e.damageType]:[]);
n+=report('Attack source stat', e=>e.stat?[e.stat]:[]);
n+=report('Stat modifier keys', e=>Object.keys(e.statModifiers||{}));
n+=report('Tags', e=>e.tags||[]);
n+=report('Item class', e=>e.itemClass?[e.itemClass]:[]);
n+=report('Statuses named', e=>{const t=mech(e);return ['Burn','Poison','Bleed','Weak','Stun','Frost','Slow','Regeneration','Protection','Karma'].filter(s=>new RegExp('\\b'+s+'\\b').test(t))});
n+=report('Durations', e=>{const t=mech(e);const D2=['for the rest of the Battle','until the end of your next Turn','until the start of your next Turn','until the end of the Turn'];return D2.filter(d=>t.includes(d))});
// EFFECT VERBS — the sentence spine, normalised
const VERB=t=>{const out=[];
  const pats={
   'deal N + STAT TYPE damage':/deal \d+ \+ \w+ (physical|magic|true) damage/i,
   'deal N TYPE damage':/deal \d+ (physical|magic|true) damage/i,
   'take N true damage':/take \d+ true damage/i,
   'heal N':/\bheal \d+/i,
   'heal N + STAT':/heal .*\d+ \+ \w+/i,
   'apply N status on hit':/appl(y|ies) \d+ \w+ on hit/i,
   'gains N status':/gains? \d+ (Burn|Poison|Bleed|Weak|Stun|Frost|Slow|Karma|Protection)/i,
   'remove N status':/remove \d+ \w+/i,
   'gain Protection equal to':/gain Protection equal to/i,
   'gain N Protection':/gains? \d+ Protection/i,
   'stat modifier for a duration':/[+-]\d+ \w+ (for the rest of the Battle|until the end of your next Turn)/i,
   'move up to N hexes':/move up to (\d+|your Movement)/i,
   'provokes nothing':/provokes nothing/i,
   'knocked back N':/knocked back \d+/i,
   'make two attacks':/make two \w+ attacks/i,
   'summon':/summon/i,
   'enter stealth':/enter stealth/i,
   'stabilise':/stabilis/i,
   'ground layer':/becomes? (burning|frost|poisoned|darkness)/i,
   'Thorns N':/Thorns \d/i,
   'Immunity N':/Immunity to \w+ \d/i,
   'aura radius':/AURA radius \d|Aura \d/i,
   'cannot crit':/cannot crit/i,
   'grant flight':/power\.flight/i,
   'stance':/^Stance:/i,
   'free':/^Free[.,]/i,
  };
  for(const [k,re] of Object.entries(pats)) if(re.test(t)) out.push(k);
  return out};
n+=report('Effect verbs', e=>VERB(mech(e)));
console.log(n===0 ? '\n>>> NOTHING NEW — built entirely from vocabulary that already existed.'
                  : '\n>>> '+n+' NEW value(s). Each is something invented for this content. Justify it in the source note, or cut it.');
process.exit(n?1:0);
