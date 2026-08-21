import fs from 'fs';
const G='gen/', RW=(p,f)=>{const o=JSON.parse(fs.readFileSync(G+p,'utf8'));f(o);fs.writeFileSync(G+p,JSON.stringify(o,null,1));};
const log=[];
const walk=(o,fn)=>{ if(Array.isArray(o)) o.forEach(x=>walk(x,fn)); else if(o&&typeof o==='object'){ fn(o); Object.values(o).forEach(v=>walk(v,fn)); } };
const files=fs.readdirSync(G).filter(f=>f.endsWith('.json'));
const STAMP=' | 2026-08-19: ';

for(const f of [...files,'../settled.json']){
  const path=f.startsWith('..')?'settled.json':G+f;
  const o=JSON.parse(fs.readFileSync(path,'utf8'));
  walk(o,e=>{
    if(!e.id) return;

    // 1. tag.monster does not exist. The blood rune already unfolded "Monster" into
    //    HoBaT's beast-shaped creature tags; Long Shot follows the same precedent.
    if(e.id==='power.bowmaster.long-shot'){
      if(e.modifies&&e.modifies.slayer&&e.modifies.slayer.monster!=null){
        delete e.modifies.slayer.monster;
        Object.assign(e.modifies.slayer,{beast:2,giant:2,dragon:2});
        e.description='For the rest of the Battle your ranged attacks gain +1 Reach and +1 Precision, and deal +2 damage against beast, giant and dragon.';
        e.source=(e.source||'')+STAMP+'"monster" is not a tag. Unfolded onto the creature tags that do exist, following item.rune-monster-slayer, which had already made that call.';
        log.push('long-shot: slayer monster -> beast/giant/dragon');
      }
    }

    // 2. Disengage is removed by ruling; Sidestep replaced it.
    for(const k of ['description','intent','effect','payload','note']){
      if(typeof e[k]==='string' && /disengage/i.test(e[k])){
        e[k]=e[k].replace(/cannot Disengage/gi,'cannot Sidestep').replace(/Disengage/g,'Sidestep');
        log.push(e.id+': Disengage -> Sidestep in '+k);
      }
    }

    // 3. Display names that collide across kinds. Ids are untouched — they are references.
    const RENAME={
      'power.exorcist.holy-shield':['Name the Enemy','item.holy-shield already owns "Holy Shield" and is the Paladin’s iconic shield. The power is renamed for the decision it actually asks you to make.'],
      'specialty.holy-avenger':['Avenger','item.holy-avenger is the named sword the class is measured against; the specialty is the archetype and takes the shorter name.'],
      'power.apothecary.healing-potion':['Poultice','item.healing-potion is a real consumable. A power must not share a name with an item you can pick up.'],
      'enchant.sacrifice':['Blood Price','power.beastward.sacrifice already owns "Sacrifice".'],
      'power.fire-staff.fireball':['Flame Burst','power.fire-master.fireball owns "Fireball" — two powers with one name is the worst of the collisions. The staff grants the smaller baseline version.']
    };
    if(RENAME[e.id]&&e.name!==RENAME[e.id][0]){
      log.push(e.id+': "'+e.name+'" -> "'+RENAME[e.id][0]+'"');
      e.name=RENAME[e.id][0];
      e.source=(e.source||'')+STAMP+RENAME[e.id][1];
    }

    // 4. The exorcist power carried a copy of the shield ITEM's aura from the quality pass.
    //    A self-targeted Protection power does not also project a permanent aura.
    if(e.id==='power.exorcist.holy-shield' && (e.triggers||[]).some(t=>t.hook==='aura')){
      e.triggers=e.triggers.filter(t=>t.hook!=='aura');
      e.source=(e.source||'')+STAMP+'Removed an aura trigger copy-pasted from item.holy-shield during the quality pass. The power grants Protection to itself; it does not project anything.';
      log.push('power.exorcist.holy-shield: removed duplicated aura trigger');
    }
  });
  fs.writeFileSync(path, JSON.stringify(o,null,1));
}
console.log(log.length+' fixes:'); log.forEach(l=>console.log('  '+l));
