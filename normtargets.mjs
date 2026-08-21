import fs from 'fs';
const G='gen/', files=[...fs.readdirSync(G).filter(f=>f.endsWith('.json')&&f!=='heroes.json').map(f=>G+f),'settled.json'];
const APPLY=process.argv.includes('--apply');

// ============================ THE LOCKED TARGET VOCABULARY ============================
// Nothing outside this list is legal. "ally" always INCLUDES YOURSELF unless the shape
// says "you and", which means you are hit in addition to the ones in the radius.
const HEX=n=>n==1?'1 hex':n+' hexes';
// a value already in canonical form is returned untouched. This is what makes the pass
// idempotent, and running it twice was how the first attempt corrupted a dozen entries.
const CANON=/^(self|your own hex|one enemy in melee reach|one of your own traps within your Vision|one enemy within your Vision|every unit within your Vision|every enemy adjacent to you|an adjacent hex and (the two|one) hexe?s? adjacent to both you and it|one enemy in melee reach and the hex directly behind it|(one enemy|a hex|three hexes|one ally|one downed ally|allies|you and allies|enemies|every unit) within \d+ hexe?s?( and (every hex|every enemy) adjacent to it| and the hex directly behind it)?|up to \d+ (enemies|allies) within \d+ hexe?s?|the hexes you leave this Turn|every enemy you pass)$/;
function norm(raw){
  if(typeof raw!=='string') return raw;
  if(CANON.test(raw)) return raw;
  const t=raw.toLowerCase().trim();
  // pull the RADIUS, not just the first digit — "up to two enemies within 4" is radius 4
  const rad=(t.match(/within (?:your [a-z]+ )?(\d+)/)||t.match(/(\d+) hex/)||[])[1];
  const cnt=/three|\b3\b/.test(t.split('within')[0])?3:2;

  if(/two hexes adjacent to both/.test(t)) return 'an adjacent hex and the two hexes adjacent to both you and it';
  if(/one hex adjacent to both/.test(t))   return 'an adjacent hex and one hex adjacent to both you and it';
  if(/hex directly behind/.test(t))
    return /melee reach/.test(t) ? 'one enemy in melee reach and the hex directly behind it'
                                 : `one enemy within ${HEX(rad||2)} and the hex directly behind it`;
  if(/^(your hex|the hex you occupy|your own hex)$/.test(t)) return 'your own hex';
  if(/three connected hexes|three hexes within|and two hexes adjacent to it|any two adjacent to it/.test(t))
    return `three hexes within ${HEX(rad||3)}`;
  if(/hex.*(every|everything|and two).*adjacent to it|on or adjacent to (the )?target/.test(t))
    return `a hex within ${HEX(rad||4)} and every hex adjacent to it`;
  if(/^(one|a) hex within/.test(t)) return `a hex within ${HEX(rad)}`;
  if(/and every enemy adjacent to it/.test(t)) return `one enemy within ${HEX(rad)} and every enemy adjacent to it`;

  if(/^self$/.test(t)) return 'self';
  if(/within your vision/.test(t)&&/one enemy/.test(t)) return 'one enemy within your Vision';
  if(/all units|every unit/.test(t)) return /vision/.test(t)?'every unit within your Vision':`every unit within ${HEX(rad||3)}`;
  if(/downed all/.test(t)) return `one downed ally within ${HEX(rad||1)}`;
  if(/all(y|ies)/.test(t)&&/up to|two all|2 all/.test(t)) return `up to 2 allies within ${HEX(rad||4)}`;
  if(/up to/.test(t)&&/enem/.test(t)) return `up to ${cnt} enemies within ${HEX(rad||3)}`;
  if(/^(self,? (and|then) )?(all |every )?allies adjacent to you$|^self and allies adjacent to you$/.test(t))
    return 'you and allies within 1 hex';
  if(/^self or one ally/.test(t)) return `one ally within ${HEX(rad||1)}`;
  if(/^self[ ,]/.test(t)&&/all(y|ies)/.test(t)) return `you and allies within ${HEX(rad||3)}`;
  if(/^the party$/.test(t)) return 'allies within 6 hexes';
  if(/^radius-(\d)$/.test(t)) return `allies within ${HEX(t.match(/radius-(\d)/)[1])}`;
  if(/(all |every )?(allies|heroes) within|^allies within/.test(t)) return `allies within ${HEX(rad||3)}`;
  if(/^(all|every) all(y|ies) within/.test(t)) return `allies within ${HEX(rad||3)}`;
  if(/^(one|a) (willing )?ally adjacent|^adjacent-ally$/.test(t)) return 'one ally within 1 hex';
  if(/^ally-within-(\d)$/.test(t)) return `one ally within ${HEX(t.match(/ally-within-(\d)/)[1])}`;
  if(/one (willing )?ally|one hero within/.test(t)) return `one ally within ${HEX(rad||4)}`;
  if(/adjacent to you/.test(t)&&/enem/.test(t)) return 'every enemy adjacent to you';
  if(/(all |every )?enemies within|every enemy within/.test(t)) return `enemies within ${HEX(rad||3)}`;
  if(/one of your own traps/.test(t)) return 'one of your own traps within your Vision';
  if(/the hexes you leave|every enemy you pass|straight line/.test(t)) return raw;
  if(/melee reach|one adjacent enemy|within your reach/.test(t)) return 'one enemy in melee reach';
  if(/^enemy-within-(\d)$/.test(t)) return `one enemy within ${HEX(t.match(/enemy-within-(\d)/)[1])}`;
  if(/^one enemy$|^single-enemy$/.test(t)) return 'one enemy in melee reach';
  if(/one enemy within/.test(t)) return `one enemy within ${HEX(rad)}`;
  if(/within your vision/.test(t)) return 'one enemy within your Vision';
  return null;
}
const rows=[], unmapped=[];
for(const f of files){
  const o=JSON.parse(fs.readFileSync(f,'utf8')); let t=false;
  const w=x=>{ if(Array.isArray(x)) x.forEach(w);
    else if(x&&typeof x==='object'){
      if(typeof x.targets==='string'){ const nv=norm(x.targets);
        if(nv==null) unmapped.push(x.id+' :: '+x.targets);
        else { rows.push([x.id,x.targets,nv]); if(APPLY&&nv!==x.targets){ x.targets=nv; t=true; } } }
      Object.values(x).forEach(w); } };
  w(o); if(t) fs.writeFileSync(f, JSON.stringify(o,null,1));
}
const diff=rows.filter(r=>r[1]!==r[2]);
console.log((APPLY?'APPLIED ':'DRY RUN — ')+diff.length+' of '+rows.length+' would change; '+unmapped.length+' unmapped');
// idempotence check: normalising the OUTPUT must be a fixed point
const bad=rows.filter(r=>norm(r[2])!==r[2]);
console.log('NOT IDEMPOTENT: '+bad.length); bad.slice(0,10).forEach(b=>console.log('  ! '+b[0]+' "'+b[2]+'" -> "'+norm(b[2])+'"'));
console.log('\n--- resulting vocabulary ---');
const vocab={}; rows.forEach(r=>vocab[r[2]]=(vocab[r[2]]||0)+1);
Object.entries(vocab).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(String(v).padStart(4)+'  '+k));
unmapped.forEach(u=>console.log('  ! UNMAPPED '+u));
if(!APPLY){ console.log('\n--- sample of the changes ---');
  diff.slice(0,20).forEach(d=>console.log('  '+d[0].padEnd(36)+'"'+d[1]+'"  ->  "'+d[2]+'"')); }
