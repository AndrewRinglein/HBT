import fs from 'fs';
const L=JSON.parse(fs.readFileSync('gen/levels.json','utf8'));
const V={strength:1,precision:1,accuracy:.2,crit:.2,luck:.2,reach:.5,dodge:.3,vision:.2,
  armor:2,resist:2,health:.5,magic:1.5,spirit:1.5,itemSlots:.67,deathbedFighting:.1,
  movement:.7,staminaMax:.3,staminaRegen:2,surge:.15,toughness:.4};
const OFF=new Set([]);
const COUNT=['staminaMax','staminaRegen','toughness','movement'];
const price=g=>Object.entries(g||{}).reduce((n,[k,v])=>n+(OFF.has(k)?0:(V[k]??0)*v),0);
const bad=[];
for(const c of L.classes){
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
  if(c.id!=='class.civilian' && off.staminaRegen!==2) bad.push(c.name+' regen count '+off.staminaRegen+' (want 2)');
  if(c.id==='class.civilian' && (off.staminaRegen||off.staminaMax)) bad.push('Civilian was granted stamina');
  if(c.rows[0].level!==1||Object.keys(c.rows[0].grants).length) bad.push(c.name+' L1 is not empty');
  const sp=c.rows.filter(r=>r.specialty); if(sp.length!==1||sp[0].level!==2) bad.push(c.name+' specialty not exactly once at L2');
  const ch=c.rows.filter(r=>r.choice); if(ch.length!==1||ch[0].level!==5) bad.push(c.name+' choice not exactly once at L5');
  for(const r of c.rows) for(const k of Object.keys(r.grants||{})) if(!(k in V)&&!OFF.has(k)) bad.push(c.name+' L'+r.level+' unknown stat '+k);
}
console.log('\nPROBLEMS: '+bad.length); bad.forEach(b=>console.log('  ! '+b));
