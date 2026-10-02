import fs from 'fs';
const L=JSON.parse(fs.readFileSync('gen/levels.json','utf8'));
// THE STAT VALUE LADDER is the Codex's stats table (gen/classes.json stats, re-ruled 2026-09-02) — one copy,
// read from hbt-content.json (fix.codex-numbers, 2026-10-01; duplication review finding C8). A stat with no
// value is not on the ladder.
const LADDER=Object.fromEntries(JSON.parse(fs.readFileSync('hbt-content.json','utf8')).stats.filter(s=>s.id&&typeof s.value==='number').map(s=>[s.id,s.value]));
const V=LADDER;
const OFF=new Set([]);
const nice=k=>({staminaMax:'Stamina Max',staminaRegen:'STAMINA REGEN',itemSlots:'Item Slots', deathbedFighting:'Deathbed Fighting'}[k]||k[0].toUpperCase()+k.slice(1));
const price=g=>Object.entries(g||{}).reduce((n,[k,v])=>n+(OFF.has(k)?0:(V[k]||0)*v),0);
const fmt=g=>Object.entries(g||{}).map(([k,v])=>'+'+v+' '+nice(k)).join(' · ');
let o=[];
o.push('# Level tables — eight classes, and the civilian types\n');
o.push('**Owner: session 3 (Units).** Written 2026-08-19 from the verbatim dictation in');
o.push('`2-ACTIONS-NOTES.md` (Warrior 1–10, Ranger 2–6) and the stat value ladder.');
o.push('Machine-readable source of truth: `content/gen/levels.json`. Rendered in the Codex');
o.push('under **Level Tables**. `content/audit.mjs` enforces every rule below.\n');
o.push('---\n\n## The rules\n');
for(const [k,v] of Object.entries(L.rules)){ if(k==='cap'){o.push('**Level cap** — '+v+'\n');continue} o.push('**'+nice(k).replace(/([A-Z])/g,' $1').trim()+'** — '+v+'\n');
  // fix.codex-numbers (C8): the ladder itself, rendered from the one copy rather than retyped in the rules prose
  if(k==='budget') o.push('**The ladder** — '+Object.entries(V).sort((a,b)=>b[1]-a[1]).map(([s,x])=>nice(s)+' '+(Math.abs(x-1/6)<1e-9?'1/6':String(+x.toFixed(2)))).join(' · ')+'\n');
}
o.push('---\n');
// Civilian TYPE tables render with the class tables — ruled 2026-09-03. A civilian levels by
// its type, so the table a reader needs is the type's, not the class's.
for(const c of [...L.classes, ...(L.civilianTypes||[])]){ let tot=0, cum={}; o.push('## '+c.name+'\n'); o.push('`'+c.id+'` · **'+c.source+'**\n'); o.push('> '+c.note+'\n'); if(c.freebie) o.push('**Per-level freebie: '+fmt(c.freebie)+' at every level**, in addition to what each row lists.\n'); o.push('| Lv | Grants | Ladder |'); o.push('|---|---|---|'); for(const r of c.rows){ const best=r.choice?Math.max(...r.choice.options.map(price)):0; tot+=price(r.grants)+best; for(const [k,v] of Object.entries(r.grants||{})) cum[k]=(cum[k]||0)+v; let cell = r.level===1 ? '*the starting line — no level-up happens here*'
      : (r.specialty?'**CHOOSE YOUR SPECIALTY**'+(Object.keys(r.grants).length?' · ':''):'')+fmt(r.grants); if(r.choice) cell += '<br>**CHOOSE ONE:** '+r.choice.options.map(x=>fmt(x)).join(' / '); if(r.authored) cell += '<br>*authored — not dictated*'; if(r.note && r.level>1) cell += '<br>*'+r.note+'*'; o.push('| **'+r.level+'** | '+cell+' | '+(r.level===1?'—':(price(r.grants)+best).toFixed(1))+' |');
  } const cl=Object.entries(cum).filter(([k])=>!OFF.has(k)).sort((a,b)=>(V[b[0]]||0)*b[1]-(V[a[0]]||0)*a[1]); o.push('\n**At level 10**, before the L5 pick and before any badge, origin, item or specialty:\n'); o.push('```'); o.push(cl.map(([k,v])=>'+'+v+' '+nice(k)).join(' · ')); o.push(Object.entries(cum).filter(([k])=>OFF.has(k)).map(([k,v])=>'+'+v+' '+nice(k)).join(' · ')||'no off-ladder grants'); o.push('```'); o.push('\nLadder total across the run: **'+tot.toFixed(1)+'**\n'); o.push('---\n');
}
o.push('## What is still owed\n');
o.push('1. **Ranger 7–10, Rogue, Mage, Priest, Paladin and Civilian are authored, not dictated.**');
o.push('   They are built to the ladder and to the shape of the two tables gave, but');
o.push(' nobody has said these numbers out loud. Every authored row is marked in the Codex.');
o.push('2. **The Warrior L5 choice list had no magnitudes** — it was dictated as five bare stat');
o.push(' names. The magnitudes here are copied from the Ranger L5 list, which is the only');
o.push(' place any were given.');
o.push('3. **Sprint.** ruled that a hero starts with two movement abilities, Move and');
o.push('   Sidestep. Sprint is still in `GAME-DESIGN.md` §4 with no source that grants it.');
o.push('   Either it needs a grantor or it needs cutting.');
o.push('4. **Specialty counts.** Every class has nine specialties, so the L2 pick is a nine-way');
o.push(' choice for everyone. Whether that is right per class is not settled.\n');
fs.writeFileSync('LEVEL-TABLES.md', o.join('\n'));
console.log('LEVEL-TABLES.md', fs.statSync('LEVEL-TABLES.md').size, 'bytes');
