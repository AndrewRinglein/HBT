import fs from 'fs';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const ALL=[...D.items,...D.attacks,...D.powers,...D.enchants,...D.specialties];
const T=e=>[e.description,...(Array.isArray(e.triggers)?e.triggers:[]).map(t=>t.effect||'')].filter(Boolean).join(' | ');
// Split into clauses and keep the ones that BRANCH, MEASURE or REMEMBER — the three ways
// a rule asks the engine for something it may not have.
const rows=[];
for(const e of ALL){
  for(const c of T(e).split(/[.;|]/)){
    const s=c.trim(); if(s.length<12) continue;
    let kind=null;
    if(/\b(if|unless|while|when|whenever|as long as|so long as|provided)\b/i.test(s)) kind='BRANCH';
    else if(/\bfor (each|every)\b|\bequal to the (target|enemy)|\bper \d|\bcount|\btotal\b|\bhow many\b/i.test(s)) kind='MEASURE';
    else if(/\b(so far|already|has (been|not)|since|remembers?|previously|earlier)\b/i.test(s)) kind='REMEMBER';
    else if(/\b(instead|rather than|or else|otherwise)\b/i.test(s)) kind='BRANCH';
    if(kind) rows.push({kind,id:e.id,s:s.replace(/\s+/g,' ')});
  }
}
// normalise each clause into a pattern so identical shapes collapse
const pat=s=>s.toLowerCase()
  .replace(/\d+/g,'N').replace(/\b(undead|demon|horror|beast|giant|dragon|construct|elemental|plant|nightmare|vampire|werewolf)\b/g,'<tag>')
  .replace(/\b(burn|poison|bleed|weak|stun|frost|regeneration|protection)\b/g,'<status>')
  .replace(/\b(strength|precision|accuracy|crit|luck|reach|dodge|vision|armor|resist|health|magic|spirit|toughness|movement|stamina|surge)\b/g,'<stat>')
  .replace(/[^a-z<>N ]/g,'').replace(/\s+/g,' ').trim();
const groups={};
for(const r of rows){ const k=r.kind+' :: '+pat(r.s); (groups[k]=groups[k]||[]).push(r); }
const single=Object.entries(groups).filter(([,v])=>v.length===1);
console.log('# Clauses that branch, measure or remember — '+rows.length+' clauses, '+Object.keys(groups).length+' distinct patterns');
console.log('# Showing only patterns that appear ONCE. A one-off branch is a rule for one card.\n');
const byKind={};
single.forEach(([k,v])=>{ const kind=k.split(' :: ')[0]; (byKind[kind]=byKind[kind]||[]).push(v[0]); });
for(const [kind,list] of Object.entries(byKind)){
  console.log('\n## '+kind+'  ('+list.length+' one-off patterns)');
  list.sort((a,b)=>a.id.localeCompare(b.id)).forEach(r=>console.log('  '+r.id.padEnd(36)+r.s.slice(0,105)));
}
