import fs from 'fs';
const ALLY_HOOKS=new Set(['onAllyDamaged','onAllyDeath','onAllyDowned','onDowned','onEvade','onTurnStart','onUse','onAttach','onHeal']);
const N=" | 2026-08-17 Angela: CUT. ";
const log=[];
// generic replacements for a trigger that has to go
const AURA=(e)=>({hook:'aura',effect:e});
function rewriteTrigger(owner,t){
  const s=t.effect||'';
  // 1. ally-reactive hooks -> auras or flat effects
  if(ALLY_HOOKS.has(t.hook)){
    if(t.hook==='onAllyDamaged'||t.hook==='onAllyDowned'||t.hook==='onDowned'||t.hook==='onAllyDeath'){
      log.push([owner,t.hook,'ally-reactive hook cut']);
      return AURA('AURA radius 2 — allies inside gain +1 Resist');
    }
    if(t.hook==='onEvade'){ log.push([owner,t.hook,'onEvade cut']); return {hook:'passive',effect:'+5 Dodge'}; }
    if(t.hook==='onTurnStart'){ log.push([owner,t.hook,'onTurnStart -> onActivationEnd']); return {hook:'onActivationEnd',effect:s}; }
    if(t.hook==='onUse'){ log.push([owner,t.hook,'onUse -> plain consumable text']); return null; }
    if(t.hook==='onAttach'){ log.push([owner,t.hook,'onAttach -> passive']); return {hook:'passive',effect:s.replace(/^while attached,?\s*/i,'')}; }
    if(t.hook==='onHeal'){ log.push([owner,t.hook,'onHeal cut']); return {hook:'passive',effect:'your healing is increased by 1'}; }
  }
  // 2. guarding
  if(/reduce that damage by|take (\d+ of )?(that|the) damage (yourself|instead)/i.test(s)){
    log.push([owner,t.hook,'guarding cut -> Protection grant']);
    return {hook:'aura',effect:'AURA radius 2 — an ally who ends its Activation inside gains 1 Protection'};
  }
  // 3. consequence-stack interference
  if(/drop to 1 Health instead|auto(matically)?[ -]?pass|passes? (its|their|your) Deathbed|stabili[sz]e[^.]*(within|\d hexes)/i.test(s)){
    log.push([owner,t.hook,'Consequence Stack interference cut']); return null;
  }
  // 4. forced movement other than knockback
  if(/\b(teleport|blink)\b|swap (places|hexes|positions)|step 1 hex[^.]*does not cost|pull(s|ed)? (it|them|the target)|drag(s)? (it|them|the target)/i.test(s)){
    log.push([owner,t.hook,'non-knockback forced movement cut']); return null;
  }
  // 5. small new mechanics
  if(/it is not; treat it as an ordinary hit|prevent(s)? (the|that) crit/i.test(s)){ log.push([owner,t.hook,'crit denial cut']); return {hook:'passive',effect:'+5 Luck'}; }
  if(/cannot (gain|receive) (new )?(Poison|Burn|Bleed|Stun|Weak|Frost)/i.test(s)){ log.push([owner,t.hook,'status immunity cut']); return {hook:'passive',effect:s.replace(/ and cannot (gain|receive)[^.]*/i,'')}; }
  if(/(create|becomes?|turns? into)[^.]*(difficult terrain)/i.test(s)){ log.push([owner,t.hook,'terrain creation cut']); return {hook:t.hook,effect:s.replace(/[^.]*difficult terrain[^.]*\.?/i,'').trim()||'apply 2 Poison'}; }
  // 6. untargetable -> stealth
  if(/untargetabl|cannot be targeted/i.test(s) && !/stealth/i.test(s)){
    log.push([owner,t.hook,'untargetable -> stealth']);
    return {hook:t.hook,effect:s.replace(/becomes? untargetable|cannot be targeted[^.]*/ig,'enters stealth')};
  }
  return t;
}
function scrubText(owner,s){
  if(!s) return s; let o=s;
  o=o.replace(/[^.]*\b(teleport|blink|swap places)\b[^.]*\.?/ig,'');
  o=o.replace(/[^.]*(drop to 1 Health instead|auto(matically)?[ -]?pass)[^.]*\.?/ig,'');
  o=o.replace(/\buntargetable\b/ig,'in stealth');
  return o.trim();
}
for(const f of fs.readdirSync('gen').filter(x=>x.endsWith('.json'))){
  const p='gen/'+f; const d=JSON.parse(fs.readFileSync(p,'utf8'));
  const sets=[];
  for(const k of ['items','attacks','powers','enchants','specialties','trinkets','relics','bloodrunes','idols','consumables'])
    if(Array.isArray(d[k])) sets.push(d[k]);
  for(const set of sets) for(const e of set){
    let changed=false;
    if(e.triggers){ const out=[];
      for(const t of e.triggers){ const r=rewriteTrigger(e.name,t); if(r!==t) changed=true; if(r) out.push(r); }
      e.triggers=out; }
    const nd=scrubText(e.name,e.description);
    if(nd!==e.description){ e.description=nd||e.description; changed=true; log.push([e.name,'text','description scrubbed']); }
    if(changed) e.source=(e.source||'')+N+'ally-reactive hooks, guarding, Consequence-Stack interference and non-knockback forced movement all removed by ruling.';
  }
  fs.writeFileSync(p,JSON.stringify(d,null,1));
}
const by={}; log.forEach(([n,h,r])=>(by[r]=by[r]||[]).push(n));
for(const [r,ns] of Object.entries(by).sort((a,b)=>b[1].length-a[1].length))
  console.log(String(ns.length).padStart(3)+'  '+r+'\n      '+[...new Set(ns)].slice(0,8).join(' · '));
console.log('\ntotal edits: '+log.length);
