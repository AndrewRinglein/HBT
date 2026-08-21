import fs from 'fs';
const S='/mnt/user-data/uploads/hell-tcg/';
const {HERO_DATA}=await import(S+'src/state/heroData.js');
const {AVTAIR_HERO_TYPES}=await import(S+'data/shadowsHeroTypes.js');
const {AERONISSA_HERO_TYPES}=await import(S+'data/skyshipHeroes.js');
const {TUTORIAL_HERO_VARIANTS}=await import(S+'src/eveOfRuin/tutorialHeroes.js');
const {generateAspiringHero}=await import(S+'src/generators/aspiringHeroGenerator.js');

// ---------------------------------------------------- ONE PIECE OF ART, ONE HERO
// Ruled 2026-08-20. Every generative template owns four distinct pieces of art and
// each one is a separate hero. art/variants.json is produced by art-tools/scan-variants.py
// on the machine that has the art; it lists the distinct files per template, byte-duplicates
// already collapsed. Without it we cannot know how many heroes a template is.
const VAR=JSON.parse(fs.readFileSync('art/variants.json','utf8'));
const ROMAN=['I','II','III','IV','V','VI'];

// ---------------------------------------------------------------- the port map
// eleven of hell-tcg's twelve baseStats fields land somewhere. resolute is deleted.
const PORT={melee:'strength',ranged:'precision',armor:'armor',health:'health',reach:'reach',
  magic:'magic',spirit:'spirit',resist:'resist',itemSlots:'itemSlots',maxAfflictions:'toughness'};
const DODGE_SCALE=5;   // hell-tcg dodge is 0-3; HoBaT Dodge is a flat to-hit penalty in points

const CLASSMAP={Warrior:'class.warrior',Ranger:'class.ranger',Rogue:'class.rogue',Mage:'class.mage',
  Priest:'class.priest',Paladin:'class.paladin',Civilian:'class.civilian','Aspiring Hero':'class.civilian',
  Beast:'class.beast',Spirit:'class.civilian'};
// 2026-08-20: Beast is now a real class and Spirit folds into Civilian, so nothing is unmapped.

// ------------------------------------------------- the six stats with no source
// A level-1 base per class. Documented constants first, then the per-class lean.
const DERIVED_BASE={
  'class.warrior' :{accuracy:75,crit:3,luck:0,vision:6,movement:5,staminaMax:5,staminaRegen:1},
  'class.ranger'  :{accuracy:80,crit:3,luck:0,vision:8,movement:5,staminaMax:5,staminaRegen:1},
  'class.rogue'   :{accuracy:78,crit:5,luck:0,vision:7,movement:5,staminaMax:5,staminaRegen:1},
  'class.mage'    :{accuracy:75,crit:3,luck:0,vision:7,movement:5,staminaMax:5,staminaRegen:1},
  'class.priest'  :{accuracy:80,crit:3,luck:0,vision:6,movement:5,staminaMax:5,staminaRegen:1},
  'class.paladin' :{accuracy:72,crit:3,luck:0,vision:6,movement:5,staminaMax:5,staminaRegen:1},
  'class.civilian':{accuracy:70,crit:3,luck:0,vision:6,movement:5,staminaMax:0,staminaRegen:0},
  'class.beast'   :{accuracy:72,crit:3,luck:0,vision:7,movement:6,staminaMax:5,staminaRegen:1},
  '_unmapped'     :{accuracy:75,crit:3,luck:0,vision:6,movement:5,staminaMax:5,staminaRegen:1}
};
const DERIVATION={
  accuracy:'No source. Level-1 baseline by class: Priest and Ranger 80 (both are built to hit reliably), Rogue 78, Warrior and Mage 75, Paladin 72 (heavy and slow), Civilian 70 (untrained). Level rows add roughly +5 a level, so a level-10 hero lands near the 100 mark where surplus starts converting to Crit at ÷4.',
  crit:'Base 3 — documented in the stat sheet. Rogue starts at 5, the only class whose identity is landing one.',
  luck:'No source, and a rare grant in the level tables. Everyone starts at 0.',
  vision:'Base radius 6 — documented. Ranger 8 and Rogue 7 and Mage 7, the three classes that trade on seeing first.',
  movement:'5 — documented. Heroes 5, enemies 4.',
  staminaMax:'5 at level 1 — documented. Civilian 0: a Civilian has no stamina bar.',
  staminaRegen:'1 at level 1 — documented, and it hard-caps at 3. Civilian 0.',
  surge:'Not a baseline at all — Surge always EQUALS the character level. Documented rule, computed, never stored.',
  toughness:'Ported, not derived: hell-tcg maxAfflictions IS injury capacity, which is what Toughness means here.',
  deathbedFighting:'Derived, never stored: 20 + 5 x Toughness.'
};

const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const heroes=[]; const problems=[];

function convert(raw,{path,idBase,campaign,artOverride}){
  const bs=raw.baseStats||{};
  const tclass=raw.class||'(none)';
  const hobatClass=CLASSMAP[tclass]||null;
  if(!hobatClass) problems.push(`${raw.name}: hell-tcg class "${tclass}" has no HoBaT class`);
  const ported={},notes=[];
  for(const [from,to] of Object.entries(PORT)) if(typeof bs[from]==='number') ported[to]=bs[from];
  if(typeof bs.dodge==='number'&&bs.dodge) { ported.dodge=bs.dodge*DODGE_SCALE;
    notes.push(`Dodge ${bs.dodge} scaled x${DODGE_SCALE} to ${bs.dodge*DODGE_SCALE} — hell-tcg Dodge was a 0-3 integer, HoBaT Dodge is a flat to-hit penalty in points.`); }
  else ported.dodge=0;
  const dropped={};
  if(bs.resolute) { dropped.resolute=bs.resolute; notes.push(`Resolute ${bs.resolute>0?'+':''}${bs.resolute} DROPPED — the stat was removed 2026-08-15 with no replacement.`); }
  if(typeof bs.maxAfflictions==='number') notes.push(`Toughness ${bs.maxAfflictions} is hell-tcg maxAfflictions, ported straight across — same meaning.`);
  if(bs.maxRuneSlots!=null) notes.push(`maxRuneSlots ${bs.maxRuneSlots} has no HoBaT stat; blood runes are items here.`);
  const level=raw.level||1;
  return {
    id:'hero.'+idBase, name:raw.name||raw.id||'(unnamed)', path,
    sourceClass:tclass, class:hobatClass, tier:raw.tier??null, level, gender:raw.gender||null,
    campaign:campaign||raw.campaign||null,
    art:artOverride||raw.art||raw.artSlug||null,
    ported, dropped, derivedBase:DERIVED_BASE[hobatClass||'_unmapped'], notes,
    specialty:raw.specialty&&raw.specialty.name!=='None'?raw.specialty:null,
    originBadges:raw.originBadges||raw.guaranteedBadges||[],
    classPowers:raw.classPowers||raw.startingClassPowers||[],
    namedSpecials:raw.namedSpecials||[],
    damageType:raw.damageType||raw.attackDamageType||null,
    triggers:raw.triggers||null, levelBonuses:raw.levelBonuses?Object.keys(raw.levelBonuses):null,
    cost:raw.cost||null, quote:raw.quote||null, backstory:raw.backstory||null,
    passiveDescription:raw.passiveDescription||null,
    additionalClasses:raw.additionalClasses||null
  };
}

// 1 — 98 fixed hero cards
for(const h of HERO_DATA) heroes.push(convert(h,{path:'fixed',idBase:'fixed.'+slug(h.uuid.replace(/^hero-/,''))}));
// 2 & 3 — the crucible templates, one hero per distinct piece of art
for(const [src,TABLE,camp] of [['shadows',AVTAIR_HERO_TYPES,'shadows'],['skyship',AERONISSA_HERO_TYPES,'skyship']])
  for(const [k,h] of Object.entries(TABLE)){
    const files=VAR[src][slug(k)]||[];
    if(!files.length){ problems.push(`${src}/${k}: no art, so no heroes`); continue; }
    files.forEach((f,i)=>{
      const hero=convert(h,{path:src,idBase:src+'.'+slug(k)+'.v'+(i+1),campaign:camp,artOverride:f});
      hero.name=h.name+' '+ROMAN[i];
      hero.templateId='template.'+src+'.'+slug(k);
      hero.templateName=h.name;
      hero.variant=i+1; hero.variantsOf=files.length;
      hero.notes.push('One of '+files.length+' heroes off the '+h.name+' template \u2014 one per piece of art. '+
        'All '+files.length+' share the template stat block, triggers and badges; they differ by art and name.');
      if(files.length<4) hero.notes.push('This template has '+files.length+' distinct pieces of art, not four \u2014 one of its files duplicates another.');
      hero.notes.push('NAME IS A PLACEHOLDER \u2014 the template ships one name for all four. Numbering is mine.');
      heroes.push(hero);
    });
  }
// 4 — Eve of Ruin tutorial: 24 art types x 4 named variants, each a class base plus statMods
const {default:_}={};
const TUT_BASE=JSON.parse(fs.readFileSync(S+'src/eveOfRuin/tutorialHeroes.js','utf8')
  .match(/const CLASS_BASE_STATS = (\{[\s\S]*?\n\});/)[1].replace(/(\w+):/g,'"$1":').replace(/,(\s*\})/g,'$1'));
for(const [k,t] of Object.entries(TUTORIAL_HERO_VARIANTS)){
  const files=VAR.tutorial[slug(k)]||[];
  t.variants.forEach((v,i)=>{
    const bs={...TUT_BASE[t.class]}; for(const [s,n] of Object.entries(v.statMods||{})) bs[s]=(bs[s]||0)+n;
    if(!files[i]) problems.push(`tutorial/${k} variant ${i+1} (${v.name}) has no art`);
    const hero=convert({name:v.name,class:t.class,gender:t.gender,tier:0,level:1,baseStats:bs,
      originBadges:v.badges||[],quote:v.quote,backstory:v.description},
      {path:'tutorial',idBase:'tutorial.'+slug(k)+'.'+slug(v.name),campaign:'eve-of-ruin',artOverride:files[i]||null});
    hero.templateId='template.tutorial.'+slug(k); hero.templateName=k;
    hero.variant=i+1; hero.variantsOf=files.length;
    hero.notes.push('One of '+files.length+' heroes off the '+k+' art set \u2014 one per piece of art, and this one ships its own name.');
    heroes.push(hero);
  });
}
// 5 — the aspiring generator. Eight art templates, one hero each. The folders are
//     1/2/3/4 + l/p/r/v, which is four LEVELS plus four statuses for a single hero,
//     not four designs — so these do not split.
for(const [key,files] of Object.entries(VAR.aspiring)){
  const [gender,,styleN]=key.split('-');
  let a=generateAspiringHero();
  for(let t=0;t<40&&(a.gender||'').toLowerCase()!==gender;t++) a=generateAspiringHero();
  const h=convert({...a,gender},{path:'aspiring',idBase:'aspiring.'+key,artOverride:files[0]});
  h.name='Aspiring Hero \u2014 '+gender+' style '+styleN;
  h.templateId='template.aspiring.'+key; h.templateName=key; h.sample=true;
  h.notes.unshift('One art template, one hero. Its folder holds 1/2/3/4 plus l/p/r/v \u2014 four levels and four statuses for THIS hero, not four designs, so it does not split the way Shadows and Skyship do.');
  h.notes.push('STATS ARE ONE DRAW \u2014 generateAspiringHero() is procedural and rolls a fresh block every time. The art template is fixed; the numbers are not.');
  heroes.push(h);
}

// ---- validation
const ID=/^[a-z]+\.[a-z0-9.-]+$/; const seen=new Set();
for(const h of heroes){
  if(!ID.test(h.id)) problems.push('bad id '+h.id);
  if(seen.has(h.id)) problems.push('DUPLICATE '+h.id); seen.add(h.id);
}
const out={derivation:DERIVATION, derivedBase:DERIVED_BASE, portMap:PORT, dodgeScale:DODGE_SCALE,
  rule:'ONE PIECE OF ART, ONE UNIQUE HERO. Ruled 2026-08-20. Every generative template owns four distinct designs and each is its own hero — so 12 Shadows subtypes are 48 heroes, not 12. What does NOT split is a hero\u2019s own level-and-status set: a folder of 1/2/3/4 plus l/p/r/v is one hero at four levels wearing four afflictions, which is why the 98 fixed cast stay 98.',
  paths:[
   {path:'fixed',   file:'src/state/heroData.js → HERO_DATA', note:'the named cast. One hero per entry; their 1/2/3/4 + l/p/r/v art is levels and statuses, so they do not split'},
   {path:'shadows', file:'data/shadowsHeroTypes.js → AVTAIR_HERO_TYPES', note:'12 subtypes x 4 designs (-v1..v4) = 48 heroes sharing 12 stat blocks'},
   {path:'skyship', file:'data/skyshipHeroes.js → AERONISSA_HERO_TYPES', note:'12 subtypes x 4 designs = 47 heroes — sky-captain has only 3, its fourth file duplicates another'},
   {path:'tutorial',file:'src/eveOfRuin/tutorialHeroes.js → TUTORIAL_HERO_VARIANTS', note:'24 art sets x 4 designs = 96 heroes, and these ship their own four names'},
   {path:'aspiring',file:'src/generators/aspiringHeroGenerator.js → generateAspiringHero()', note:'8 art templates (2 genders x 4 styles). Procedural: the art is fixed, the stat block is one draw'}],
  heroes};
fs.mkdirSync('gen',{recursive:true});
fs.writeFileSync('gen/heroes.json',JSON.stringify(out,null,1));
const by={}; heroes.forEach(h=>by[h.path]=(by[h.path]||0)+1);
console.log('HEROES: '+heroes.length, JSON.stringify(by));
const cls={}; heroes.forEach(h=>cls[h.class||'UNMAPPED:'+h.sourceClass]=(cls[h.class||'UNMAPPED:'+h.sourceClass]||0)+1);
console.log('by class:', JSON.stringify(cls));
console.log('\nPROBLEMS: '+problems.length); [...new Set(problems)].slice(0,10).forEach(p=>console.log('  ! '+p));
