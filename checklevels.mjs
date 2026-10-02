import fs from 'fs';
const L=JSON.parse(fs.readFileSync('gen/levels.json','utf8'));
// THE STAT VALUE LADDER is the Codex's stats table (gen/classes.json stats, re-ruled 2026-09-02) — one copy,
// read from hbt-content.json (fix.codex-numbers, 2026-10-01; duplication review finding C8). A stat with no
// value is not on the ladder.
const LADDER=Object.fromEntries(JSON.parse(fs.readFileSync('hbt-content.json','utf8')).stats.filter(s=>s.id&&typeof s.value==='number').map(s=>[s.id,s.value]));
// (Its notes carry the re-rule: Armor/Resist 1.5, Dodge and Accuracy 1/6, Movement 1.0 — and Armor's value
// ESCALATES with each point, so its price is a FLOOR; read high-Armor rows with that in mind.)
const V=LADDER;
const OFF=new Set([]);
const COUNT=['staminaMax','staminaRegen','toughness','movement'];
const price=g=>Object.entries(g||{}).reduce((n,[k,v])=>n+(OFF.has(k)?0:(V[k]??0)*v),0);
const bad=[];
// Civilian TYPE tables are priced exactly like a class table — ruled 2026-09-03. They obey the
// same invariants, so they get the same ladder check; otherwise they would be the one part of
// the game with no lint.
for(const c of [...L.classes, ...(L.civilianTypes||[])]){
  let tot=0, cum={}, off={staminaMax:0,staminaRegen:0,toughness:0,movement:0};
  const lines=[];
  for(const r of c.rows){
    const base=price(r.grants);
    const best=r.choice?Math.max(...r.choice.options.map(price)):0;
    tot+=base+best;
    for(const [k,v] of Object.entries(r.grants||{})){ cum[k]=(cum[k]||0)+v; if(COUNT.includes(k))off[k]+=v; }
    lines.push(' L'+String(r.level).padStart(2)+'  '+(base+best).toFixed(2).padStart(5)+
      (r.choice?'  (incl. best pick '+best.toFixed(2)+' of '+r.choice.options.length+')':'')+
      (r.specialty?'  [specialty]':'')+(r.authored?'  [authored]':''));
    const dictated=/DICTATED/.test(c.source)&&!r.authored;
    if(base+best>6.6 && !dictated) bad.push(c.name+' L'+r.level+' rich: '+(base+best).toFixed(2)+' (Warrior L7, dictated, is 6.40)');
  }
  console.log('\n'+c.name.toUpperCase()+'  ('+c.source+')');
  lines.forEach(x=>console.log(x));
  console.log('  TOTAL '+tot.toFixed(2)+'   staminaMax +'+off.staminaMax+'  regen +'+off.staminaRegen+'  toughness +'+off.toughness);
  console.log('  cumulative: '+Object.entries(cum).sort((a,b)=>(V[b[0]]||0)*b[1]-(V[a[0]]||0)*a[1]).map(([k,v])=>'+'+v+' '+k+' ('+((V[k]||0)*v).toFixed(1)+')').join(' · '));
  // invariants
  // A civilian TYPE table inherits the civilian stamina rule from its parentClass — ruled
  // 2026-09-03. Keying off c.id alone made the Farmer table demand +2 regen, which a civilian
  // can never have.
  // 2026-09-03: civilians gain stamina like everyone else. The exemption is gone; what is left
  // is the placement difference — a civilian's second Regen is at L9, not L10, because the
  // civilian tables put their heaviest grant on the last row and Regen prices at 2.0.
  const isCivilian=(c.parentClass||c.id)==='class.civilian';
  if(off.staminaRegen!==2) bad.push(c.name+' regen count '+off.staminaRegen+' (want 2)');
  if(off.staminaMax<2) bad.push(c.name+' staminaMax +'+off.staminaMax+' (want at least 2)');
  if(c.rows[0].level!==1||Object.keys(c.rows[0].grants).length) bad.push(c.name+' L1 is not empty');
  const sp=c.rows.filter(r=>r.specialty); if(sp.length!==1||sp[0].level!==2) bad.push(c.name+' specialty not exactly once at L2');
  const ch=c.rows.filter(r=>r.choice); if(ch.length!==1||ch[0].level!==5) bad.push(c.name+' choice not exactly once at L5');
  for(const r of c.rows) for(const k of Object.keys(r.grants||{})) if(!(k in V)&&!OFF.has(k)) bad.push(c.name+' L'+r.level+' unknown stat '+k);
}
console.log('\nPROBLEMS: '+bad.length); bad.forEach(b=>console.log('  ! '+b));
