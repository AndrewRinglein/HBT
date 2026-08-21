import fs from 'fs';
// 1. Sidestep is universal to ALL units, not just heroes
const s=JSON.parse(fs.readFileSync('settled.json','utf8'));
const ss=s.powers.find(p=>p.id==='power.sidestep');
ss.description="Move exactly 1 hex in any direction. It does NOT provoke an attack of opportunity, and the destination's terrain cost is irrelevant — step into a hex costing 1, 2 or 3 alike. Costs no Stamina. EVERY UNIT HAS THIS, enemies included.";
ss.intent="The free half-step. An enemy standing next to your Warrior can sidestep to your Priest and pay nothing for it. Nobody is ever pinned.";
ss.universalToAllUnits=true;
ss.source=(ss.source||'')+" | 2026-08-17 Angela: enemies have it too. This is the rule that makes zones of control soft.";
const mv=s.powers.find(p=>p.id==='power.move'); mv.universalToAllUnits=true;
fs.writeFileSync('settled.json',JSON.stringify(s));
console.log('Sidestep is universal to all units');

// 2. the zone-of-control content has to acknowledge it
const NOTE=" | 2026-08-17 Angela: every unit has Sidestep, so a zone of control cannot pin anything — it taxes the SECOND hex of a withdrawal, not the first. Reworded to say what it actually does.";
const REW={
 "Hold the Line":"Aura, radius 2, for the rest of the Battle: you exert a zone of control over every hex inside it. An enemy leaving one provokes an attack of opportunity — but a Sidestep never provokes, so this taxes anyone trying to cross you, not anyone trying to slip past.",
 "Warded Ground":"Aura, radius 2, for the rest of the Battle: you and every ally inside have +2 Resist, and an enemy that Moves out of a hex inside it provokes an attack of opportunity. A Sidestep is still free.",
 "Take the Wall":"For the rest of the Battle, you and every ally adjacent to you exert a zone of control: an enemy that Moves out of one of those hexes provokes an attack of opportunity from the nearest of you. It cannot stop a Sidestep — it makes the step after it expensive.",
 "Vigil":"AURA radius 1 — you hold the ground: an enemy that Moves out of a hex inside spends 1 extra Movement and provokes an attack of opportunity from you. A Sidestep pays neither.",
 "Chains of the Damned":"AURA radius 1 — the chains drag: an enemy that Moves out of a hex inside provokes an attack of opportunity, and pays 1 extra Movement to leave."
};
let n=0;
for(const f of fs.readdirSync('gen').filter(x=>x.endsWith('.json'))){
  const p='gen/'+f; const d=JSON.parse(fs.readFileSync(p,'utf8')); let t=false;
  for(const set of Object.values(d).filter(Array.isArray)) for(const e of set){
    const R=REW[e.name]; if(!R) continue;
    if(e.triggers && e.triggers.length && /opportunit|zone of control|chains drag/i.test(e.triggers.map(x=>x.effect||'').join(' ')))
      e.triggers=[{hook:e.triggers[0].hook||'aura',effect:R}];
    else e.description=R;
    e.source=(e.source||'')+NOTE; t=true; n++; console.log('  '+e.name);
  }
  if(t) fs.writeFileSync(p,JSON.stringify(d,null,1));
}
console.log(n+' zone-of-control entries reworded');

// 3. Disengage is removed from the game
for(const f of fs.readdirSync('gen').filter(x=>x.endsWith('.json'))){
  const p='gen/'+f; const d=JSON.parse(fs.readFileSync(p,'utf8')); let t=false;
  for(const set of Object.values(d).filter(Array.isArray)) for(const e of set){
    const blob=[e.description,e.intent,...(e.triggers||[]).map(x=>x.effect||'')].join(' ');
    if(/disengage/i.test(blob)){
      e.description=(e.description||'').replace(/disengage/ig,'Sidestep');
      e.triggers=(e.triggers||[]).map(x=>({...x,effect:(x.effect||'').replace(/disengage/ig,'Sidestep')}));
      e.source=(e.source||'')+' | 2026-08-17 Angela: Disengage is REMOVED from the game — Sidestep supersedes it.';
      t=true; console.log('  de-Disengaged: '+e.name);
    }
  }
  if(t) fs.writeFileSync(p,JSON.stringify(d,null,1));
}
