import fs from 'fs';
const NEW={
 "Call Them Back":{d:"Stabilise a downed ally within 6 hexes: its bleed-out counter is removed. It is still down and still out of the fight — it is simply no longer on a clock.",n:"the only ranged stabilise in the game"},
 "Keep the Watch":{d:"Stabilise a downed ally within 4 hexes, removing its bleed-out counter. If it is not downed, grant it +20 Deathbed Fighting for the rest of the Battle instead.",n:"stabilise, or pre-empt the fall"},
 "Velan's Ferryman Coin":{d:"Free. Stabilise a downed ally within 2 hexes, removing its bleed-out counter. The ferryman has been paid; he is in no hurry.",n:"buys a body back from the clock"},
 "Stretcher Run":{d:"Stabilise an adjacent downed ally, removing its bleed-out counter, then move up to your Movement.",n:"the stretcher-bearer's whole job, and the reason to take one"}
};
const N=" | 2026-08-17 Angela: downed IS a state and stabilising IS a mechanic — I over-cut them. Stabilise removes the bleed-out counter and nothing else: no Health, no standing up.";
let n=0;
for(const f of fs.readdirSync('gen').filter(x=>x.endsWith('.json'))){
  const p='gen/'+f; const d=JSON.parse(fs.readFileSync(p,'utf8')); let t=false;
  for(const set of Object.values(d).filter(Array.isArray)) for(const e of set){
    const M=NEW[e.name]; if(!M) continue;
    e.description=M.d; e.intent=M.n;
    if(e.name.includes('Ferryman')){ e.free=true; e.stamina=0; e.cooldown=4; e.targets='one downed ally within 2 hexes'; }
    e.source=(e.source||'')+N; t=true; n++; console.log('  '+e.name);
  }
  if(t) fs.writeFileSync(p,JSON.stringify(d,null,1));
}
console.log(n+' rebuilt as real stabilise effects');
