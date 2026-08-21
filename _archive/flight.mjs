import fs from 'fs';
const N=" | 2026-08-17 Angela: Flight is a granted MOVEMENT ACTION (1 Movement per hex, passes over units and obstructions, takes nothing from the ground on the way, one click). Airwalk is a standing property covering only the hex you END your Turn on. Neither existed in the content.";

// 1. Winged Assassin becomes the flight specialty
const rp='gen/ranger.json'; const rd=JSON.parse(fs.readFileSync(rp,'utf8'));
const w=rd.specialties.find(s=>s.id==='specialty.winged-assassin');
w.intent="You do not cross the ground, you cross the air above it. Whatever you touch bleeds, and anything that reaches you kills you.";
w.triggers=[{hook:'passive',effect:'You have FLIGHT: a movement action costing 1 stamina that moves your full Movement, 1 Movement per hex regardless of terrain, passing over units and obstructions, taking no trap or terrain status on the way. Only the hex you land on must be legal.'}];
w.grants=['flight'];
w.source=(w.source||'')+N;
// Leaping Shot becomes the flight-and-shoot
const ls=rd.powers.find(p=>p.id==='power.winged-assassin.leaping-shot');
ls.description="Fly up to 3 hexes — 1 Movement per hex, over units and obstructions, taking nothing from the ground — then make a ranged attack at -1 Precision.";
ls.source=(ls.source||'')+N;
fs.writeFileSync(rp,JSON.stringify(rd,null,1));
console.log('  specialty.winged-assassin -> the flight branch');

// 2. flight/airwalk items, rebuilt from existing sky-themed rows
const EDIT={
 "Featherstep Boots":{d:"You have AIRWALK: you take no trap and no terrain status from the hex you end your Turn on. You still pick things up crossing them.",prop:'airwalk'},
 "Wind Dancer's Cloak":{d:null,trig:"You have FLIGHT: a movement action costing 1 stamina that moves your full Movement, 1 Movement per hex, over units and obstructions, taking nothing from the ground.",prop:'flight'},
 "Cloudsteel Plate":{trig:"You have AIRWALK: no trap and no terrain status from the hex you end your Turn on.",prop:'airwalk'},
 "Gale Shroud":{trig:"You have FLIGHT, but a poor one: it moves your Movement -1 and costs 2 stamina.",prop:'flight'},
 "Skypriest's Vestments":{trig:"You have AIRWALK: no trap and no terrain status from the hex you end your Turn on.",prop:'airwalk'},
 "Aegis of the Fleet":{trig:"You have FLIGHT, and a good one: it costs no stamina.",prop:'flight'}
};
let n=0;
for(const f of fs.readdirSync('gen').filter(x=>x.endsWith('.json'))){
  const p='gen/'+f; const d=JSON.parse(fs.readFileSync(p,'utf8')); let t=false;
  for(const set of Object.values(d).filter(Array.isArray)) for(const e of set){
    const E=EDIT[e.name]; if(!E) continue;
    if(E.d) e.description=E.d;
    if(E.trig) e.triggers=[{hook:'passive',effect:E.trig}];
    e[E.prop]=true;
    e.source=(e.source||'')+N; t=true; n++; console.log('  '+e.name+'  ('+E.prop+')');
  }
  if(t) fs.writeFileSync(p,JSON.stringify(d,null,1));
}
console.log(n+' items given flight or airwalk');
