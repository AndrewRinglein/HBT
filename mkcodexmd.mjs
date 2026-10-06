// mkcodexmd.mjs — the whole Codex as one markdown file.
// Same data as hbt-codex.html, in a format you can grep, diff and paste into a chat.
// Run AFTER assemble.mjs.  ->  ../CODEX.md
import fs from 'fs';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
for(const k of ['functions','levels','heroes','art'])
  if(!D[k]){ console.error('mkcodexmd.mjs: hbt-content.json has no `'+k+'` block — the build ran out of order.\n'+
    '  Correct order from a clean checkout: assemble -> functions -> assemble -> build-viewer -> mkcodexmd.\n'+
    '  See README.md, "The pipeline".'); process.exit(1); }
const O=[];
const w=s=>O.push(s);
const esc=s=>String(s==null?'':s).replace(/\|/g,'\\|').replace(/\r?\n/g,' ').trim();
const num=n=>(n>0?'+':'')+n;
const mods=m=>{const e=Object.entries(m||{}).filter(([,v])=>v);return e.length?e.map(([k,v])=>num(v)+' '+k).join(' · '):'—'};
const trig=e=>(Array.isArray(e.triggers)?e.triggers:[]).map(g=>'**`'+g.hook+'`** '+esc(g.effect||g.description||'')+(g.attackTag?' — only with a '+esc(g.attackTag)+' attack':'')).join('<br>')||'';   // attackTag: engine capability.unit-trigger-with-tag (2026-10-04) — the Codex says a trigger's tag requirement
const packets=a=>[...(a.secondaryDamage||[]).map(p=>'**on '+p.when+'** '+p.amount+' '+p.damageType+' damage (separate packet)'),...(a.armorPenetration!=null?['Armor penetration '+a.armorPenetration]:[]),a.packetInterpretation||''].filter(Boolean).map(esc).join('<br>');
const src=e=>e.source?'\n  <sub>'+esc(e.source)+'</sub>':'';

w('# The HoBaT Codex');
w('');
w('*Heroes of Blight and Tragic — the complete authored content, generated '+D.meta.generated+'.*');
w('');
w('This is `hbt-codex.html` as text. Same data, same build. The HTML has hero art and');
w('sortable tables; this has everything else and can be searched, diffed and quoted.');
w('');
w('| | Count |');
w('|---|---:|');
for(const [k,v] of [['Specialties',D.specialties.length],['Powers',D.powers.length],['Weapons + gear',D.items.length],
  ['Attacks',D.attacks.length],['Enchantments',D.enchants.length],['Badges',D.badges.length],
  ['Classes',D.classes.length],['Heroes',D.heroes.heroes.length],['Tags',D.tags.length]]) w('| '+k+' | '+v+' |');
w('');
w('---');
w('');
w('## Contents');
w('');
['1 · Classes','2 · Level tables','3 · Specialties','4 · Powers','5 · Weapons and their attacks','6 · Armor',
 '7 · Enchantments','8 · Trinkets, relics, blood runes, idols, consumables','9 · Badges','10 · Heroes',
 '11 · The function list','12 · Tags','13 · The stat ladder'].forEach(s=>w('- ['+s+'](#'+s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/ +/g,'-')+')'));
w('');

// ---- 1 CLASSES ----
w('---\n\n## 1 · Classes\n');
for(const c of D.classes){
  w('### '+c.name);
  w('');
  w('*'+esc(c.intent)+'*');
  w('');
  w('**Primary stats:** '+[].concat(c.primary||[]).join(' · ')+'  ');
  w('**Level table:** '+esc(c.levelTable||'')+'  ');
  const own=D.specialties.filter(x=>x.class===c.id);
  w('**Specialties ('+own.length+'):** '+own.map(x=>x.name).join(' · '));
  w('');
}

// ---- 2 LEVELS ----
w('---\n\n## 2 · Level tables\n');
if(D.levels&&D.levels.rules){ for(const [k,v] of Object.entries(D.levels.rules)) w('> **'+k+'** — '+esc(v)+'  '); w(''); }
for(const c of D.levels.classes){
  w('### '+c.name);
  w('');
  w('| Level | Gains | Note |');
  w('|---:|---|---|');
  for(const r of c.rows){ const notes=[];
    if(r.specialty) notes.push('**choose your specialty**');
    if(r.choice){ const c=r.choice;
      notes.push(c&&c.options
        ? '**choose '+(c.pick||1)+':** '+c.options.map(o=>mods(o)).join('  ·  ')
        : '**choice:** '+esc(c===true?'yes':c)); }
    if(r.note) notes.push(esc(r.note));
    w('| '+r.level+' | '+mods(r.grants)+' | '+notes.join(' · ')+' |'); }
  w('');
}

// ---- 3 SPECIALTIES ----
w('---\n\n## 3 · Specialties\n');
for(const cl of D.classes){
  const list=D.specialties.filter(s=>s.class===cl.id);
  if(!list.length) continue;
  w('### '+cl.name+'\n');
  for(const s of list){
    w('#### '+s.name);
    w('');
    w('*'+esc(s.intent)+'*');
    w('');
    w('**Stats:** '+mods(s.statModifiers));
    const t=trig(s); if(t) w('  \n'+t);
    w('  \n**Powers:** '+(s.powers||[]).map(id=>{const p=D.powers.find(x=>x.id===id);return p?p.name:id}).join(' · '));
    w(src(s));
    w('');
  }
}

// ---- 4 POWERS ----
w('---\n\n## 4 · Powers\n');
const cost=p=>{const bits=[];
  if(p.free) bits.push('**Free**');
  bits.push((p.stamina||0)+' stam'); if(p.cooldown) bits.push('cd '+p.cooldown); if(p.warmup) bits.push('warmup '+p.warmup);
  if(p.grantedAtLevel) bits.push('from level '+p.grantedAtLevel);   // engine rule.special-moves-unlock-at-level-two (2026-10-06): a class's move is granted at this level
  return bits.join(', ')};
const bySpec={}; for(const p of D.powers) (bySpec[p.specialty||'—universal—']=bySpec[p.specialty||'—universal—']||[]).push(p);
for(const [sid,list] of Object.entries(bySpec).sort()){
  const sp=D.specialties.find(x=>x.id===sid);
  w('### '+(sp?sp.name:'Universal powers and rules')+'\n');
  w('| Power | Cost | Targets | Effect |');
  w('|---|---|---|---|');
  for(const p of list) w('| **'+esc(p.name)+'** | '+esc(cost(p))+' | '+esc(p.targets)+' | '+[esc(p.description),trig(p)].filter(Boolean).join('<br>')+' |');
  w('');
}

// ---- 5 WEAPONS + ATTACKS ----
w('---\n\n## 5 · Weapons and their attacks\n');
const weapons=D.items.filter(i=>i.itemClass==='weapon');
for(const it of weapons){
  const atks=D.attacks.filter(a=>String(a.id).startsWith('attack.'+String(it.id).replace(/^item\./,'')+'.'));
  w('#### '+it.name+'  <sub>tier '+it.tier+' · '+(it.hands||0)+'h · '+(it.tags||[]).join(' ')+(it.setMember?' · counted as '+it.setMember.join(' ')+' for sets':'')+'</sub>');
  w('');
  w('**Stats:** '+mods(it.statModifiers)+(it.slayer?'  ·  **slayer:** '+Object.entries(it.slayer).map(([k,v])=>k+' '+v).join(' '):''));
  const t=trig(it); if(t) w('  \n'+t);
  if(atks.length){
    w('');
    w('| Attack | Range | Stat | Dmg | Type | Hits | Acc | Crit | Stam | Targets | Effect |');
    w('|---|---|---|---:|---|---:|---:|---:|---:|---|---|');
    for(const a of atks) w('| **'+esc(a.name)+'** | '+esc(a.range)+' | '+esc(a.stat)+' | '+num(a.damage||0)+' | '+esc(a.damageType)+' | '+(a.hits||1)+' | '+num(a.accuracy||0)+' | '+num(a.crit||0)+' | '+(a.stamina||0)+' | '+esc(a.targets)+' | '+[esc(a.description||''),trig(a),packets(a)].filter(Boolean).join('<br>')+' |');
  }
  w('');
}

// ---- 6 ARMOR ----
w('---\n\n## 6 · Armor\n');
w('| Armor | Tier | Weight | Slots | Stats | Effect |');
w('|---|---:|---|---:|---|---|');
for(const it of D.items.filter(i=>i.itemClass==='armor'))
  w('| **'+esc(it.name)+'** | '+it.tier+' | '+esc(it.armorWeight||'')+' | '+(it.slots||0)+' | '+esc(mods(it.statModifiers))+' | '+[esc(it.description||''),trig(it)].filter(Boolean).join('<br>')+' |');
w('');

// ---- 7 ENCHANTS ----
w('---\n\n## 7 · Enchantments\n');
w('| Enchantment | Tier | Applies to | Stats | Effect |');
w('|---|---:|---|---|---|');
for(const e of D.enchants)
  w('| **'+esc(e.name)+'** | '+e.tier+' | '+(e.appliesToTags||[]).join(' ')+' | '+esc(mods(e.statModifiers))+(e.slayer?' · slayer '+Object.entries(e.slayer).map(([k,v])=>k+' '+v).join(' '):'')+' | '+[esc(e.description||''),trig(e)].filter(Boolean).join('<br>')+' |');
w('');

// ---- 8 GEAR ----
w('---\n\n## 8 · Trinkets, relics, blood runes, idols, consumables\n');
for(const kind of ['trinket','relic','bloodrune','idol','consumable']){
  const list=D.items.filter(i=>i.itemClass===kind);
  if(!list.length) continue;
  w('### '+kind[0].toUpperCase()+kind.slice(1)+'s  <sub>'+list.length+'</sub>\n');
  w('| Item | Tier | Slots | Stats | Effect |');
  w('|---|---:|---:|---|---|');
  for(const it of list)
    w('| **'+esc(it.name)+'** | '+it.tier+' | '+(it.slots||0)+' | '+esc(mods(it.statModifiers))+' | '+[esc(it.description||''),trig(it)].filter(Boolean).join('<br>')+' |');
  w('');
}

// ---- 9 BADGES ----
w('---\n\n## 9 · Badges\n');
const byCat={}; for(const b of D.badges) (byCat[b.category||'—']=byCat[b.category||'—']||[]).push(b);
for(const [cat,list] of Object.entries(byCat).sort()){
  w('### '+cat+'  <sub>'+list.length+'</sub>\n');
  w('| Badge | Rarity | Effect |');
  w('|---|---|---|');
  for(const b of list) w('| **'+esc(b.name)+'** | '+esc(b.rarity)+' | '+esc(typeof b.payload==='string'?b.payload:JSON.stringify(b.payload))+' |');
  w('');
}

// ---- 10 HEROES ----
w('---\n\n## 10 · Heroes\n');
if(D.heroes.rule) w('> '+esc(D.heroes.rule)+'\n');
if(D.heroes.derivation) w('> **Derivation:** '+esc(typeof D.heroes.derivation==='string'?D.heroes.derivation:JSON.stringify(D.heroes.derivation))+'\n');
const H=D.heroes.heroes;
const statKeys=[...new Set(H.flatMap(h=>Object.keys(h.ported||{})))];
const cname=id=>{const c=D.classes.find(x=>x.id===id);return c?c.name:esc(id||'')};
w('| Hero | Path | Class | Lvl | '+statKeys.join(' | ')+' |');
w('|---|---|---|--:|'+statKeys.map(()=>'--:').join('|')+'|');
for(const h of [...H].sort((a,b)=>String(a.path+a.name).localeCompare(String(b.path+b.name))))
  w('| '+esc(h.name)+' | '+esc(h.path||'')+' | '+cname(h.class)+' | '+(h.level??'')+' | '+statKeys.map(k=>(h.ported||{})[k]??'').join(' | ')+' |');
w('');

// ---- 11 FUNCTIONS ----
w('---\n\n## 11 · The function list\n');
w('*Everything content is allowed to say. Anything not on these lists does not exist.*\n');
const F=D.functions;
const fsect=(title,rows,note)=>{ w('### '+title+'\n'); if(note) w('> '+note+'\n');
  w('| Function | Uses |'); w('|---|---:|');
  for(const r of (rows||[])) w('| `'+esc(r.name)+'` | '+(r.uses??'')+' |'); w(''); };
fsect('Trigger hooks',F.hooks); fsect('Targeting shapes',F.shapes); fsect('Conditions',F.conditions);
fsect('Effects',F.effects); fsect('Statuses',F.statuses); fsect('Stats a modifier may name',F.stats);
fsect('Durations',F.durations);
if(F.notAvailable&&F.notAvailable.length){ w('### Not available — do not write these\n');
  for(const n of F.notAvailable) w('- '+esc(typeof n==='string'?n:JSON.stringify(n))); w(''); }

// ---- 12 TAGS ----
w('---\n\n## 12 · Tags\n');
const byGroup={}; for(const t of D.tags) (byGroup[t.group||'—']=byGroup[t.group||'—']||[]).push(t.id.replace(/^tag\./,''));
w('| Group | Tags |'); w('|---|---|');
for(const [g,list] of Object.entries(byGroup).sort()) w('| **'+g+'** | '+list.sort().join(' · ')+' |');
w('');

// ---- 13 STATS ----
w('---\n\n## 13 · The stat ladder\n');
w('*Strength and Precision are 1.0. Everything is priced against them.*\n');
w('| Stat | Worth | What it does |'); w('|---|---:|---|');
for(const s of [...D.stats].sort((a,b)=>(b.value||0)-(a.value||0))) w('| **'+esc(s.name)+'** | '+(s.value??'')+' | '+esc(s.does)+' |');
w('');
w('---\n');
w('<sub>Generated by `content/mkcodexmd.mjs` from `content/hbt-content.json`. Do not edit by hand — edit `content/gen/*.json` or `content/settled.json` and rebuild.</sub>');

const md=O.join('\n');
fs.writeFileSync('../CODEX.md',md);
// the browsable Codex lives beside it, at the top of the project, so neither is buried in content/
fs.copyFileSync('hbt-codex.html','../HBT-CODEX.html');
console.log('../CODEX.md       '+md.length.toLocaleString()+' chars, '+O.length.toLocaleString()+' lines');
console.log('../HBT-CODEX.html '+fs.statSync('../HBT-CODEX.html').size.toLocaleString()+' bytes');
