import fs from 'fs';
import { validateMap, validateEncounterBoard } from './map-schema.mjs';
const G='gen/', R=p=>JSON.parse(fs.readFileSync(G+p,'utf8'));
const STATS=new Set(['strength','precision','accuracy','crit','luck','reach','dodge','vision','armor','resist','fireResist','poisonResist','shadowResist','health','magic','spirit','toughness','movement','staminaMax','staminaRegen','surge','itemSlots','deathbedFighting','corruption','favor','bleedOutTurns']);
const ID=/^[a-z]+\.[a-z0-9.-]+$/;
const prob=[]; const ids=new Map();
const CLASSES=['warrior','ranger','rogue','mage','priest','paladin','civilian','beast'];

// ---- already-settled content from 2-ACTIONS-SETTLED.md, hand-entered so the viewer is complete
const settled = JSON.parse(fs.readFileSync('settled.json','utf8'));

const out={ meta:{generated:new Date().toISOString().slice(0,10), game:'Heroes of Blight and Tragic'}, tags:[],
  specialties:[], powers:[], items:[], attacks:[], enchants:[],
  badges:[], classes:[], stats:[], art:null, levels:null, heroes:null, functions:null, bestiaryTest:null };

for(const c of CLASSES){ const d=R(c+'.json');
  for(const s of d.specialties) out.specialties.push({...s, class:s.class||('class.'+c)});
  for(const p of d.powers) out.powers.push({...p, class:'class.'+c});
}
const w=R('weapons.json'); out.items.push(...w.items.map(i=>({...i,itemClass:i.itemClass||'weapon'}))); out.attacks.push(...w.attacks);
const a=R('armor-enchants.json'); out.items.push(...a.items.map(i=>({...i,itemClass:i.itemClass||'armor'}))); out.enchants.push(...a.enchants);
const si=R('settled-items.json');
out.items.push(...(si.items||[])); out.attacks.push(...(si.attacks||[]));
out.powers.push(...(si.powers||[])); out.enchants.push(...(si.enchants||[]));
const g=R('gear.json');
for(const [k,cls] of [['trinkets','trinket'],['relics','relic'],['bloodrunes','bloodrune'],['idols','idol'],['consumables','consumable']])
  out.items.push(...g[k].map(i=>({...i,itemClass:i.itemClass||cls})));
// merge settled
out.items.push(...(settled.items||[])); out.attacks.push(...(settled.attacks||[]));
out.powers.push(...(settled.powers||[])); out.enchants.push(...(settled.enchants||[]));
out.specialties.push(...(settled.specialties||[]));
out.tags.push(...(settled.tags||[]));

// ---- badges / origins / injuries, parsed from 4-BADGES-NOTES.md MANIFEST
out.badges.push(...R('badges.json').badges);
// ---- classes, the 19-stat ladder, and the hero art scheme, from 3-UNITS-SETTLED.md
const cl=R('classes.json'); out.classes=cl.classes; out.stats=cl.stats; out.art=cl.art;
// ---- per-class level tables. warrior 1-10 and ranger 2-6 dictated; the rest authored
out.levels=R('levels.json');
// ---- THE MAPS (content.maps-as-rows, PROVING-PLAN Stage A2, 2026-09-04). Moved out of
// engine/src/content/maps.ts. The ROWS are the board: width is a row's length, height is the
// number of rows. V2 accepts bounded authored sizes; TEST rows are separate.
out.maps=R('maps.json').maps;
// ---- heroes, extracted mechanically from hell-tcg's five creation paths
out.heroes=R('heroes.json');
// ---- the TEST COHORT (settled.json testCohort): the standard engine test party — six
// clones of live heroes plus test enemies, resolved so the Codex renders them and
// mkenginepack.mjs can export them. A clone copies its source hero at assemble time;
// tweaks land as overrides on the clone, never on the original.
//
// THIS BLOCK AND ITS DATA HAVE BEEN LOST THREE TIMES to stale-snapshot clobbers
// (git f4d7a0e, efb2d67, and again at 6b23dd7 — whose own commit message claims to have
// restored it). Restored 2026-08-21 from efb2d67. The guard below is why there will not
// be a fourth: losing it is now a LOUD failure at assemble time, not a silent absence
// that only shows up when mkenginepack refuses to run.
out.testCohort=null;
if(!settled.testCohort){
  prob.push('settled.json has NO testCohort — the engine test party is missing. '
          + 'This has been clobbered three times before; recover it from git rather than '
          + 'reauthoring it: git show efb2d67:settled.json');
} else {
  const tc={note:settled.testCohort.note, heroes:[], enemies:settled.testCohort.enemies||[]};
  for(const t of (settled.testCohort.heroes||[])){
    const src=out.heroes.heroes.find(x=>x.id===t.copyOf);
    if(!src){ prob.push('testCohort: unknown copyOf '+t.copyOf); continue; }
    // The clone takes the source hero, then EVERY field on the settled row overrides it.
    // This used to copy four fields by name (typeId, name, copyOf, engine), which silently
    // dropped the other 20 an override row may carry — `moves` among them, which is how the
    // engine pack lost its movement grants. The contract is "tweaks land as overrides on the
    // clone", so the override is a spread, not a list that has to be kept in sync.
    tc.heroes.push({ ...JSON.parse(JSON.stringify(src)),
      id:'hero.test.'+t.typeId, path:'test',
      ...t,
      notes:[...(src.notes||[]), 'TEST COHORT clone of '+t.copyOf+' — tweak here, never the original.'] });
  }
  if(tc.heroes.length!==(settled.testCohort.heroes||[]).length)
    prob.push('testCohort: resolved '+tc.heroes.length+' of '+(settled.testCohort.heroes||[]).length+' heroes');
  out.testCohort=tc;
}

// ---- what a filename suffix means, per art folder. R22 reads this.
if(fs.existsSync(G+'art-conventions.json')) out.artConventions=R('art-conventions.json');

// ---- the two REFERENTS. Not shapes: a shape says which hexes, a referent says "the one
// this event was already about". audit R27 accepts them alongside the 24 shapes.
if(fs.existsSync(G+'referents.json')) out.referents=R('referents.json').referents;

// ---- S12: starting loadouts. Per-hero with a class backup (ruled 2026-08-25). The kit is
// RESOLVED onto each hero row here — explicit ids, a random spec, or a one-of choice — so
// every consumer reads one field, and the roll itself stays with the draft.
if(fs.existsSync(G+'kits.json')){
  const K=R('kits.json'); out.kits=K;
  for(const h of out.heroes.heroes){
    if(h.kit && h.kit.length) { h.kitSource='dictated'; continue; }        // civilians etc.
    const override=K.heroKits[h.id];
    if(override){ h.kit=override; h.kitSource='hero'; continue; }
    const ck=K.classKits[h.class];
    if(!ck) continue;
    if(ck.items && ck.items.length){ h.kit=ck.items; h.kitSource='class'; h.kitProvisional=ck.provisional||undefined; }
    else if(ck.pick){ h.kitPick=ck.pick; h.kitSource='class'; }
  }
}

// ---- fields DELIBERATELY not carried across from hell-tcg. audit R29 reads this: a declined
// field is a decision with a date, a dropped one is a bug nobody has noticed yet.
if(fs.existsSync(G+'not-ported.json')) out.notPorted=R('not-ported.json').fields;

// ---- the function list: the complete vocabulary content is allowed to use
if(fs.existsSync(G+'functions.json')) out.functions=R('functions.json');
// Maps validate through the same schema used by the compiler. TEST rows remain
// outside shipping Codex content, but malformed test input still blocks assembly.
const validatedBoards = new Map();
for (const [rows, testing] of [[out.maps, false], [fs.existsSync('test/maps.json') ? JSON.parse(fs.readFileSync('test/maps.json', 'utf8')) : [], true]]) {
  if (!Array.isArray(rows)) { prob.push('maps: expected an array'); continue; }
  for (const m of rows) {
    try {
      const board = validateMap(m, testing);
      if (validatedBoards.has(m.id)) throw new Error(`maps: duplicate ${m.id}`);
      validatedBoards.set(m.id, board);
    } catch (error) { prob.push(error.message); }
  }
}
{ const known=new Set(out.classes.map(c=>c.id)); const hid=new Set();
  for(const h of out.heroes.heroes){
    if(!ID.test(h.id)) prob.push(`hero: bad id "${h.id}"`);
    if(hid.has(h.id)) prob.push(`DUPLICATE hero id ${h.id}`); hid.add(h.id);
    if(h.class && !known.has(h.class)) prob.push(`hero ${h.id}: unknown class ${h.class}`);
    for(const k of Object.keys(h.ported||{})) if(!STATS.has(k)) prob.push(`hero ${h.id}: unknown ported stat "${k}"`);
    for(const k of Object.keys(h.derivedBase||{})) if(!STATS.has(k)) prob.push(`hero ${h.id}: unknown derived stat "${k}"`);
  } }
{ const known=new Set(out.classes.map(c=>c.id));
  // Civilian TYPE tables (levels.civilianTypes) are validated with the class tables — ruled
  // 2026-09-03. A type table is checked against its parentClass, not its own id, because its id
  // is a civilian type and was never meant to be a class.
  for(const c of [...out.levels.classes, ...(out.levels.civilianTypes||[])]){
    const owner=c.parentClass||c.id;
    if(!known.has(owner)) prob.push(`levels: unknown class ${owner}`);
    if(c.parentClass && known.has(c.id)) prob.push(`levels ${c.id}: a civilian type may not reuse a class id`);
    if(c.rows.length!==10) prob.push(`levels ${c.id}: ${c.rows.length} rows, want 10`);
    const st=(k)=>c.rows.reduce((n,r)=>n+((r.grants||{})[k]||0),0);
    // Stamina, ruled 2026-09-03: EVERY table grants exactly +2 Stamina Regen, civilians included.
    // The old carve-out ("a civilian has no stamina bar") was wrong at the source — every civilian
    // hero row already carried staminaMax 5 / staminaRegen 1. Only the progression was missing.
    if(st('staminaRegen')!==2) prob.push(`levels ${c.id}: staminaRegen +${st('staminaRegen')}, want 2`);
    if(st('staminaMax')<2) prob.push(`levels ${c.id}: staminaMax +${st('staminaMax')}, want at least 2`);
    // A civilian type may name starting powers. They have to be real powers.
    for(const pid of (c.startingPowers||[])) if(!(out.powers||[]).some(p=>p.id===pid)) prob.push(`levels ${c.id}: startingPowers unknown power ${pid}`);
    const sp=c.rows.filter(r=>r.specialty), ch=c.rows.filter(r=>r.choice);
    if(sp.length!==1||sp[0].level!==2) prob.push(`levels ${c.id}: specialty pick not exactly once at L2`);
    if(ch.length!==1||ch[0].level!==5) prob.push(`levels ${c.id}: choice not exactly once at L5`);
    for(const r of c.rows) for(const k of Object.keys(r.grants||{})) if(!STATS.has(k)) prob.push(`levels ${c.id} L${r.level}: unknown stat "${k}"`);
    for(const r of c.rows) for(const o of (r.choice?r.choice.options:[])) for(const k of Object.keys(o)) if(!STATS.has(k)) prob.push(`levels ${c.id} L${r.level} choice: unknown stat "${k}"`);
  } }

// ---- validation
for(const t of out.tags) ids.set(t.id,'tag');
for(const b of out.badges){ if(!ID.test(b.id)) prob.push(`badge: bad id "${b.id}" (${b.name})`);
  if(ids.has(b.id)) prob.push(`DUPLICATE id ${b.id}`); else ids.set(b.id,'badge'); }
const check=(arr,kind)=>{ for(const e of arr){
  if(!e.id||!ID.test(e.id)) prob.push(`${kind}: bad id "${e.id}" (${e.name})`);
  if(ids.has(e.id)) prob.push(`DUPLICATE id ${e.id}`); else ids.set(e.id,kind);
  for(const k of Object.keys(e.statModifiers||{})) if(!STATS.has(k)) prob.push(`${kind} ${e.id}: unknown stat "${k}"`);
}};
check(out.items,'item'); check(out.attacks,'attack'); check(out.powers,'power');
check(out.enchants,'enchant'); check(out.specialties,'specialty');
// dangling grants
for(const i of out.items) for(const gid of (i.grants||[])) if(!ids.has(gid)) prob.push(`item ${i.id} grants missing ${gid}`);
for(const s of out.specialties) for(const pid of (s.powers||[])) if(!ids.has(pid)) prob.push(`specialty ${s.id} lists missing ${pid}`);

try{ out.bestiaryTest=R('bestiary-test.json'); }catch{ out.bestiaryTest=null; }
// ---- the REAL bestiary. 219 creatures ported from hell-tcg data/enemyCards.js, plus the
// 193 immediate-cast rows which are enemy SPELLS, not units (ruled 2026-08-21).
// ---- the bestiary: AUTHORED enemies first, placeholders behind them.
// gen/enemies-authored.json holds the first real enemies (landed 2026-08-25 from
// ENEMY-REVIEW.md). An authored row SUPERSEDES the same-id placeholder from the hell-tcg
// port, and regenerating the placeholder file cannot touch an authored row — the two live
// in different files and the merge always prefers authored. Every ported row that survives
// is marked placeholder:true so nothing downstream mistakes it for a real enemy.
try{
  const AUTH=JSON.parse(fs.readFileSync(G+'enemies-authored.json','utf8'));
  const authored=(AUTH.units||[]).map(u=>({...u, rank:u.tier, authored:true}));
  const authoredIds=new Set(authored.map(u=>u.id));
  let ported=[]; try{ ported=R('bestiary.json').units||[]; }catch{}
  const kept=ported.filter(u=>!authoredIds.has(u.id)).map(u=>({...u, placeholder:true}));
  out.bestiary=[...authored, ...kept];
  out.bestiaryCapabilities=AUTH.capabilities||null;
  out.xpByTier=AUTH.xpByTier||null;
  out.enemyFamilyRules=AUTH.familyRules||null;
  console.log('bestiary: '+authored.length+' authored + '+kept.length+' placeholders ('+(ported.length-kept.length)+' superseded)');
}catch(e){ prob.push('enemies-authored.json failed to load: '+e.message); out.bestiary=null; }
try{ out.encounters=R('encounters.json'); }catch{ out.encounters=null; }
// ---- encounters: the board, and every placement on it (PROVING-PLAN Stage A3, 2026-09-04).
// A placement means nothing without the board it is placed on, and an off-board placement is
// not a rounding error — it is a unit that never arrives. This is exactly what a re-authored
// axis gets wrong, so it is checked here rather than discovered in a sweep.
if(out.encounters){
  const byMap=validatedBoards;
  const testing=fs.existsSync('test/encounters.json') ? JSON.parse(fs.readFileSync('test/encounters.json','utf8')) : [];
  if (!Array.isArray(testing)) throw new Error('TEST encounters must be an array');
  for (const e of testing) if (typeof e?.id !== 'string' || !/^test\.encounter\.[a-z0-9.-]+$/.test(e.id)) prob.push(`invalid TEST encounter id ${e?.id}`);
  const rows=[...(out.encounters.prologue||[]),...(out.encounters.scripted||[]),...(out.encounters.authored||[]),...testing];
  for(const r of rows){
    try { validateEncounterBoard(r, byMap); } catch (error) { prob.push(error.message); continue; }
    if(r.band&&r.band.axis==='col'&&(r.band.startCol===undefined||r.band.startRow!==undefined))
      prob.push(`encounters ${r.id}: band axis is col — it must carry startCol and must NOT carry startRow`);
  }
}
// Enemy spells CUT 2026-08-22 - the new game does not want them. They were also hollow: all
// 193 had an empty abilities array because their effect lived in triggers.onEnter.
// Validation must preserve the last usable assembly on failure.
if (!prob.length) fs.writeFileSync('hbt-content.json', JSON.stringify(out));
else process.exitCode = 1;
console.log('TOTALS');
for(const k of ['specialties','powers','items','attacks','enchants','tags','badges','classes']) console.log('  '+String(out[k].length).padStart(4), k);
console.log('  '+String(out.heroes.heroes.length).padStart(4),'heroes');
console.log('  '+String(Object.values(out).flat().filter(x=>x&&x.id).length).padStart(4),'total rows with ids');
const byClass={}; for(const i of out.items) byClass[i.itemClass]=(byClass[i.itemClass]||0)+1;
console.log('items by class:', JSON.stringify(byClass));
console.log('\nPROBLEMS:', prob.length);
prob.slice(0,25).forEach(p=>console.log('  ! '+p));
if(prob.length>25) console.log('  ... and '+(prob.length-25)+' more');
