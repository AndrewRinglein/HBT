import fs from 'fs';
const REPLACE={
 "Blink":{description:"Move up to 4 hexes. This does not provoke attacks of opportunity.",note:"teleport cut; rebuilt as ordinary movement that does not provoke, which the design already has via Disengage"},
 "Astrolabe of the Threshold":{description:null,note:"swap-places cut"},
 "Sanctified Ward":{description:"The target gains Protection equal to 4 + Spirit.",note:"status immunity cut"},
 "Poison Trap":{description:"Place one unseen trap on a hex within 3 hexes. The first enemy to enter it gains 4 Poison.",note:"terrain creation cut; the trap now applies a status, which terrain already does"},
 "Entangle":{description:"The target loses 2 Movement for the rest of the Battle.",note:"terrain creation cut"},
 "Wall of Thorns":{description:"Every enemy within 2 hexes gains 3 Bleed. Area — it does not roll and cannot crit.",note:"terrain creation cut"}
};
const N=" | 2026-08-17 Angela: CUT. ";
for(const f of fs.readdirSync('gen').filter(x=>x.endsWith('.json'))){
  const p='gen/'+f; const d=JSON.parse(fs.readFileSync(p,'utf8')); let touched=false;
  const sets=[]; for(const k of ['items','attacks','powers','enchants','specialties','trinkets','relics','bloodrunes','idols','consumables']) if(Array.isArray(d[k])) sets.push(d[k]);
  for(const set of sets) for(const e of set){
    const R=REPLACE[e.name]; if(!R) continue;
    if(R.description) e.description=R.description;
    // scrub any residual trigger text carrying the cut mechanic
    e.triggers=(e.triggers||[]).filter(t=>!/teleport|blink|swap (places|hexes|positions)|difficult terrain|cannot (gain|receive) (new )?(Poison|Burn)/i.test(t.effect||''));
    if(!R.description && !e.description) e.description='';
    e.source=(e.source||'')+N+R.note+'.';
    touched=true; console.log('  '+e.name+' -> '+(R.description||'(trigger removed)'));
  }
  if(touched) fs.writeFileSync(p,JSON.stringify(d,null,1));
}
