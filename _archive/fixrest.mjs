import fs from 'fs';
const NOTE=" | 2026-08-17: carried a condition the engine has no way to check (did-not-move / made-no-attack / moved-N-hexes). Condition removed and the effect reduced to match.";
const REW={
 "Wind-Blessed Leather":"heal 1",
 "Stoneskin Hauberk":"gain +1 Armor until the end of your next Turn",
 "Wind Dancer's Cloak":"gain +5 Dodge until the end of your next Turn",
 "Blessing of the Hearthmother":"heal 2 and remove 1 Weak",
 "Grave Warden":"your attacks gain +5 Accuracy"
};
const COND=/\b(if you (did not|do not|made no|have not|ended|moved)|if no enem|took no damage)/i;
for(const file of ["armor-enchants","gear","weapons"]){
  const p="gen/"+file+".json"; const d=JSON.parse(fs.readFileSync(p,'utf8'));
  const sets = file==="gear" ? Object.values(d) : [d.items,d.enchants].filter(Boolean);
  for(const set of sets) for(const i of (set||[])) for(const t of (i.triggers||[])){
    const s=t.effect||'';
    if(REW[i.name] && COND.test(s)){ t.effect=REW[i.name]; i.source=(i.source||'')+NOTE; console.log('  '+i.name+' -> '+t.effect); }
    else if(COND.test(s)){
      t.effect=s.replace(/,?\s*(if|and if) you (did not|do not|made no|have not|ended|moved)[^,;.]*/ig,'').replace(/^\s*,\s*/,'').trim();
      i.source=(i.source||'')+NOTE; console.log('  '+i.name+' -> '+t.effect.slice(0,70));
    }
  }
  fs.writeFileSync(p, JSON.stringify(d,null,1));
}
const SP={"specialty.bowmaster":"your bow attacks gain +5 Accuracy","specialty.totem-master":"gain +1 Magic for the rest of the Battle, once"};
for(const f of ["ranger","mage"]){
  const p="gen/"+f+".json"; const d=JSON.parse(fs.readFileSync(p,'utf8'));
  for(const s of d.specialties) if(SP[s.id]) for(const t of (s.triggers||[]))
    if(COND.test(t.effect||'')){ t.hook='passive'; t.effect=SP[s.id]; s.source=(s.source||'')+NOTE; console.log('  '+s.name+' -> '+t.effect); }
  fs.writeFileSync(p, JSON.stringify(d,null,1));
}
const ACC={"Pot Lid":-15,"Sturdy Runed Leather":-20,"Runed":-20};
for(const file of ["weapons","armor-enchants"]){
  const p="gen/"+file+".json"; const d=JSON.parse(fs.readFileSync(p,'utf8'));
  for(const set of [d.items,d.enchants].filter(Boolean)) for(const i of set)
    if(ACC[i.name] && (i.statModifiers||{}).accuracy!=null){
      console.log('  '+i.name+' accuracy '+i.statModifiers.accuracy+' -> '+ACC[i.name]);
      i.statModifiers.accuracy=ACC[i.name];
      i.source=(i.source||'')+" | 2026-08-17: Accuracy is worth about a quarter as a cost, so -5 was not paying for Armor and Resist.";
    }
  fs.writeFileSync(p, JSON.stringify(d,null,1));
}
