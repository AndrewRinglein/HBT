import fs from 'fs';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const ALL=[...D.items,...D.attacks,...D.powers,...D.enchants,...D.specialties];
const kindOf=e=>e.itemClass||String(e.id).split('.')[0];
const bump=(m,k,e)=>{ if(!k) return; (m[k]=m[k]||[]).push(e.id); };

// ---------- 1 trigger hooks
const hooks={}; for(const e of ALL) for(const t of (e.triggers||[])) bump(hooks,t.hook,e);
// powers/items that carry modifies{} blocks
const modShapes={};
for(const e of ALL) if(e.modifies) bump(modShapes, 'modifies.scope='+(e.modifies.scope||'?'), e);

// ---------- 2 targeting shapes, normalised
const RAWSHAPE={};
const shape=s=>{ if(!s) return null; const t=s.toLowerCase().trim();
  const R=k=>{ (RAWSHAPE[k]=RAWSHAPE[k]||new Set()).add(s); return k; };
  if(/^self$/.test(t)) return R('self');
  // hex-shaped
  if(/three connected hexes|three hexes within/.test(t)) return R('three hexes');
  if(/the hexes you leave|every unit in a straight line|every enemy you pass/.test(t)) return R('a path you walk');
  if(/adjacent to both you and it/.test(t)) return R(/two hexes adjacent/.test(t)?'arc of 3':'arc of 2');
  if(/and the hex directly behind/.test(t)) return R('line of 2');
  if(/and every (enemy|hex) adjacent to it|every hex adjacent to it|on or adjacent to|everything adjacent to it/.test(t)) return R('blast: a hex and its neighbours');
  if(/^(your hex|the hex you occupy)$/.test(t)) return R('your own hex');
  if(/one hex within|a hex within/.test(t)) return R('one hex at range');
  // units, by side
  if(/all units within|every unit within/.test(t)) return R('EVERY unit in a radius (friend and foe)');
  if(/downed all/.test(t)) return R('one downed ally');
  if(/all heroes within|every ally within|allies within|the party|radius-\d|self and allies adjacent/.test(t)) return R('allies in a radius');
  if(/one willing ally|one hero within|one ally|adjacent-ally|ally-within-\d/.test(t)) return R('one ally');
  if(/adjacent to you/.test(t) && /enem/.test(t)) return R('every enemy adjacent to you');
  if(/enemies within|every enemy within/.test(t)) return R('enemies in a radius');
  if(/up to (one or two|two|three|\d+) |one or two enemies/.test(t)) return R('up to N different enemies');
  if(/one of your own traps/.test(t)) return R('one of your own traps');
  if(/your mark/.test(t)) return R('your mark');
  if(/everything within your vision/.test(t)) return R('everything you can see');
  if(/furthest enemy/.test(t)) return R('the furthest enemy you can see');
  if(/melee reach|one adjacent enemy|within your reach/.test(t)) return R('one enemy, melee');
  if(/within your vision|enemy-within-\d|one enemy within \d+ hex|^one enemy$|single-enemy/.test(t)) return R('one enemy, ranged');
  return R('UNCLASSIFIED: '+s); };
const shapes={}; for(const e of ALL) bump(shapes, shape(e.targets), e);

// ---------- 3 mechanics named inside effect text
const TXT=e=>[e.description,...(e.triggers||[]).map(t=>t.effect||''),
              e.modifies?JSON.stringify(e.modifies):''].filter(Boolean).join(' | ');
const MECH=[
 ['knockback',/knockback/i],['protection',/\bprotection\b/i],['stealth: enter',/enter stealth|immediately enter stealth/i],
 ['stealth: reveal',/reveal|stealth breaks/i],['immunity',/\bimmunity\b/i],['surge chance',/surge chance/i],
 ['true damage',/true damage/i],['thorns',/thorns/i],['burning terrain',/burning|set .* alight|hexes burning/i],
 ['traps',/\btrap\b|\btraps\b|snare/i],['stabilise',/stabilis|bleed-out/i],['stance',/\bstance:/i],
 ['aura granted mid-battle',/aura:/i],['free activation',/free activation|does not consume|extra activation/i],
 ['heal',/\bheal\b|heals /i],['regeneration',/regeneration/i],['status: burn',/\bburn\b/i],
 ['status: poison',/\bpoison\b/i],['status: bleed',/\bbleed\b/i],['status: weak',/\bweak\b/i],
 ['status: stun',/\bstun\b/i],['status: frost',/\bfrost\b/i],['status: blight',/\bblight\b/i],
 ['status: karma',/\bkarma\b/i],['corruption',/corruption/i],['faith',/\bfaith\b/i],['supply',/\bsupply\b/i],
 ['forced move (not knockback)',/pull one ally|moved? \d+ hexes? (directly )?(away|toward)/i],
 ['move without spending turn',/without spending your Turn|not your move action|immediately move/i],
 ['ignore armor',/ignore \d+ of the target|ignores? .*armor/i],['armor shred',/loses \d+ Armor/i],
 ['resist shred',/loses \d+ Resist/i],['consume status',/consumes? that|plus every stack|reads the/i],
 ['damage type override',/deals magic damage instead|damage instead of physical/i],
 ['crit rider',/deal \d+ crits?/i],['zone of control',/zone of control|extra Movement to leave/i],
 ['deathbed',/deathbed/i],['badge granted',/gain the .* badge/i],
];
const mech={}; for(const e of ALL){ const t=TXT(e); for(const [n,re] of MECH) if(re.test(t)) bump(mech,n,e); }

// ---------- 4 durations
const DUR=[['rest of the Battle',/rest of the Battle/i],['until the end of your next Turn',/end of your next Turn/i],
 ['this Turn',/\bthis Turn\b/i],['for 1 Turn',/for \d+ Turns?\b/i],['until the end of the Turn',/end of the Turn\b/i],
 ['rest of the campaign',/rest of the campaign/i],['until you hit it',/until you /i],
 ['start of your next Turn',/start of your next Turn/i],['each Turn',/each Turn\b/i],
 ['each Activation',/each of your Activations|each Activation/i],['once each Battle',/first time each Battle|first .* each Battle/i]];
const dur={}; for(const e of ALL){ const t=TXT(e); for(const [n,re] of DUR) if(re.test(t)) bump(dur,n,e); }

// ---------- 5 conditions
const COND=[['if the target is <tag>',/if the target (is|was) (a|an) [a-z]/i],['against <tag>',/against (a|an|the) [a-z]+\b/i],
 ['if in stealth',/if you were in stealth/i],['if target below half health',/half Health/i],
 ['if target has not acted',/has not yet acted/i],['adjacent to self',/adjacent to you|any enemy is adjacent to you|allies adjacent/i],
 ['while the stance holds',/while the stance/i],['if it kills',/if it kills|if the kill/i],
 ['if the attacker is <x>',/if the attacker/i],['if you did/did not X',/if you (did|do) not/i]];
const cond={}; for(const e of ALL){ const t=TXT(e); for(const [n,re] of COND) if(re.test(t)) bump(cond,n,e); }

// ---------- 6 structural fields
const fields={};
for(const e of ALL) for(const k of ['slayer','immunity','addsStat','addsTargetStatus','modifies','damageTypeOverride',
  'flight','airwalk','movementAction','universal','free','warmup','hits','equipCost','persists','granted'])
  if(e[k]!=null && e[k]!==false && !(typeof e[k]==='object'&&!Array.isArray(e[k])&&!Object.keys(e[k]).length)
     && !(Array.isArray(e[k])&&!e[k].length)) bump(fields,k,e);

// ---------- 7 stats actually granted
const stats={}; for(const e of ALL) for(const k of Object.keys(e.statModifiers||{})) bump(stats,k,e);

const report=[];
const section=(title,map,note)=>{
  report.push('\n## '+title+(note?'  — '+note:''));
  const rows=Object.entries(map).sort((a,b)=>a[1].length-b[1].length);
  for(const [k,ids] of rows){
    const flag=ids.length===1?'  <-- ONCE':ids.length===2?'  <-- twice':'';
    report.push(String(ids.length).padStart(4)+'  '+k+flag);
    if(ids.length<=2) report.push('        '+ids.join(', '));
  }
};
// phrasing drift — one shape written many ways
const drift={};
for(const [k,set] of Object.entries(RAWSHAPE)) if(set.size>1) drift[k+'  ('+set.size+' different wordings)']=[...set];
report.push('\n## Phrasing drift — the same shape written more than one way');
report.push('The `targets` field is free prose and has never been normalised. These are the same');
report.push('shape under different words, which is why the engine cannot switch on it.');
for(const [k,v] of Object.entries(drift).sort((a,b)=>b[1].length-a[1].length)){
  report.push('\n  '+k); v.forEach(x=>report.push('      "'+x+'"')); }
section('Trigger hooks',hooks);
section('Targeting shapes',shapes);
section('Mechanics named in effect text',mech);
section('Durations and timings',dur);
section('Conditions',cond);
section('Structural fields',fields);
section('Stats granted by a modifier',stats);
// ---------- the verdict table
const NEW_BY_RULING=new Set(['arc of 2','crit rider','badge granted','damageTypeOverride','onDodge','line of 2','arc of 3']);
const verdict=[];
const scan=(cat,map)=>{ for(const [k,ids] of Object.entries(map)) if(ids.length<=2)
  verdict.push({cat,k,n:ids.length,ids}); };
scan('hook',hooks); scan('shape',shapes); scan('mechanic',mech);
scan('timing',dur); scan('condition',cond); scan('field',fields); scan('stat',stats);
report.unshift([
'## The shortlist — everything used once or twice','',
'`ONCE` is the strong signal: a rule the player learns for exactly one card. `twice` is worth',
'a look. Marked **new** are things ruled in on 2026-08-20 and expected to be thin — they are',
'not evidence of drift, they are evidence of recency.','',
'| Count | Kind | Thing | Where |','|---|---|---|---|',
...verdict.sort((a,b)=>a.n-b.n||a.cat.localeCompare(b.cat)).map(v=>
  '| '+(v.n===1?'**ONCE**':'twice')+' | '+v.cat+' | '+(NEW_BY_RULING.has(v.k)?'**new** — ':'')+v.k.replace(/\|/g,'/')+' | `'+v.ids.join('` `')+'` |'),
''].join('\n'));
const out=report.join('\n');
fs.writeFileSync('MECHANIC-CENSUS.md','# Mechanic census — every trigger, shape, timing and condition, counted\n\nGenerated by `census.mjs` from `hbt-content.json`. Anything used **once** is a candidate for cutting: a mechanic that exists for a single entry is a rule the player has to learn for one card.\n'+out+'\n');
console.log(out);
