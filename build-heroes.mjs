import fs from 'fs';
// Where the Hell-TCG project lives. This script is the ONLY thing in the pipeline that
// needs it, and its output (gen/heroes.json) is checked in — so you never have to run this
// unless you are re-extracting heroes from Hell-TCG.
//
// Was hardcoded to a sandbox path that no longer exists. Override with:
//   HELL_TCG=/path/to/hell-tcg node build-heroes.mjs
const S = (process.env.HELL_TCG || '../../hell-tcg').replace(/\/?$/, '/');
if (!fs.existsSync(S)) {
  console.error(`\nbuild-heroes.mjs needs the Hell-TCG project, which is not at:\n  ${S}\n`);
  console.error('Set HELL_TCG=/path/to/hell-tcg, or skip this script entirely —');
  console.error('gen/heroes.json is checked in and nothing else in the build reads Hell-TCG.\n');
  process.exit(2);
}
const {HERO_DATA}=await import(S+'src/state/heroData.js');
const {AVTAIR_HERO_TYPES}=await import(S+'data/shadowsHeroTypes.js');
const {AERONISSA_HERO_TYPES}=await import(S+'data/skyshipHeroes.js');
const {TUTORIAL_HERO_VARIANTS}=await import(S+'src/eveOfRuin/tutorialHeroes.js');
const {SPECIAL_CLASSES}=await import(S+'data/specialClasses.js');

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
// The per-class level-1 baseline. NOT a constant here any more - it lives on the class row
// in gen/classes.json so audit.mjs R23 can enforce it. Ruled 2026-08-21 (S8): content/ owns
// the derived stats, and the Crucible values that disagreed are superseded, not reconciled.
const CLASSES_JSON=JSON.parse(fs.readFileSync("gen/classes.json","utf8"));
const DERIVED_BASE=Object.fromEntries(CLASSES_JSON.classes.filter(c=>c.derivedBase).map(c=>[c.id,c.derivedBase]));
DERIVED_BASE._unmapped={accuracy:75,crit:3,luck:0,vision:6,movement:5,staminaMax:5,staminaRegen:1};
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
    // damageType is NOT a hero field. Ruled 2026-08-21: damage type lives on the WEAPON
    // and the POWER - what a hero deals depends on what it is holding and what it uses.
    // Hell-TCG had it on the hero; that concept did not port.
    triggers:raw.triggers||null, levelBonuses:raw.levelBonuses?Object.keys(raw.levelBonuses):null,
    cost:raw.cost||null, quote:raw.quote||null, backstory:raw.backstory||null,
    passiveDescription:raw.passiveDescription||null,
    additionalClasses:raw.additionalClasses||null
  };
}

// 1 — 98 fixed hero cards
// A fixed hero has no template, so its SUBTYPE is its own name. They are all unique,
// so there is no collision - ruled 2026-08-21.
for(const h of HERO_DATA){ const row=convert(h,{path:'fixed',idBase:'fixed.'+slug(h.uuid.replace(/^hero-/,''))}); row.subtype=row.name; heroes.push(row); }
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
      hero.subtype=h.name;              // SUBTYPE: the roster identity. One per campaign.
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
// EVE BASE CLASSES. Ruled 2026-08-21: ONE PIECE OF BASE ART IS ONE HERO.
// This used to mint 96 heroes - it read the art census, saw four files for warrior-iron,
// and paired them with the four `variants` entries. But warrior-iron1..4 are the four
// LEVELS of one character, and the variants carry NO art at all: they are alternative
// stat/personality rolls of the same hero. The Hell-TCG header says so - "one random
// variant is picked per art type -> 24 heroes shown". 72 of those 96 were duplications
// of art, and they are cut.
//
// So: 24 heroes, one per art type, on its level-1 art. Six classes x four faces.
//   class    warrior          the mechanical class
//   subtype  Eve Warrior      the roster identity - one of each per campaign
//   type     Iron Dwarf       the specific art
//   name     rolled at campaign level from the art type's name pool
const EVE_TYPE={
 'warrior-barbarian':'Mountain Berserker','warrior-brawler':'Dwarven Brawler',
 'warrior-fearsome':'Skullplate Veteran','warrior-iron':'Iron Dwarf',
 'ranger-aggressive':'Hunter','ranger-nature':'Forest Fey',
 'ranger-ranger':'Ancient Elf','ranger-scantily':'Forest Elf',
 'rogue-raven':'The Raven','rogue-rose':'The Rose','rogue-skull':'The Skull','rogue-snake':'The Serpent',
 'paladin-dark':'Black Oath','paladin-hunk':'Lion of the Host','paladin-shiney':'Dawnblade','paladin-smug':'Court Champion',
 'priest-armored':'Battle Chaplain','priest-pauper':'Barefoot Mendicant','priest-robes':'Cathedral Bishop','priest-scantily':'Rune-Marked Ascetic',
 'mage-fire':'Emberwright','mage-fireaura':'Pyre Witch','mage-sexy':'Crimson Sorceress','mage-thinking':'Archive Scholar'};
for(const [k,t] of Object.entries(TUTORIAL_HERO_VARIANTS)){
  const files=VAR.tutorial[slug(k)]||[];
  const type=EVE_TYPE[slug(k)];
  if(!type){ problems.push('eve-base: no type name for art set '+k); continue; }
  if(!files.length){ problems.push('eve-base/'+k+' has no art'); continue; }
  const v=t.variants[0]||{};
  const bs={...TUT_BASE[t.class]}; for(const [s,n] of Object.entries(v.statMods||{})) bs[s]=(bs[s]||0)+n;
  const hero=convert({name:type,class:t.class,gender:t.gender,tier:0,level:1,baseStats:bs,
    originBadges:v.badges||[],quote:v.quote,backstory:v.description},
    {path:'base',idBase:'base.'+slug(k),campaign:'eve-of-ruin',artOverride:files[0]});
  hero.type=type;
  hero.subtype='Eve '+t.class;
  hero.templateId='template.base.'+slug(k); hero.templateName='Eve '+t.class;
  hero.namePool=t.namePool||[];
  hero.levelArt=files;
  hero.notes.push('EVE BASE CLASS. One piece of base art, one hero - ruled 2026-08-21. Its '+files.length+' art files are this hero at four LEVELS, not four heroes; they are on levelArt.');
  hero.notes.push('Hell-TCG shipped four alternative stat/personality rolls for this art set. Only the first is carried; the other three were cut as duplications of art.');
  heroes.push(hero);
}
// 5 — the aspiring generator. Eight art templates, one hero each. The folders are
//     1/2/3/4 + l/p/r/v, which is four LEVELS plus four statuses for a single hero,
//     not four designs — so these do not split.
// NOT GENERATED ANY MORE. generateAspiringHero() rolls a fresh stat block and badge set
// every call, so gen/heroes.json could never be reproduced and the badges it rolled were
// Hell-TCG names that do not exist here. The eight are DATA now: gen/aspiring.json.
// Ruled 2026-08-21 - they need a total redesign, so the frozen stats are a parked roll,
// not authored numbers, and every row carries needsRedesign.
const ASP=JSON.parse(fs.readFileSync('gen/aspiring.json','utf8'));
for(const [key,files] of Object.entries(VAR.aspiring)){
  const spec=ASP.heroes.find(x=>x.key===key);
  if(!spec){ problems.push('aspiring: no row in gen/aspiring.json for '+key); continue; }
  const frozen=(ASP.frozenStats[key]||{}).ported||{};
  const h=convert({baseStats:{},gender:spec.gender,class:'Aspiring Hero',tier:0,level:1},{path:'aspiring',idBase:'aspiring.'+key,artOverride:files[0]});
  h.ported={...frozen};
  h.name=spec.name; h.gender=spec.gender; h.campaign=spec.campaign||null;
  h.originBadges=[];
  h.needsRedesign=true;
  h.templateId='template.aspiring.'+key; h.templateName=spec.name; h.subtype=spec.name; h.sample=true;
  h.notes.unshift('One art template, one hero. Its folder holds 1/2/3/4 plus l/p/r/v \u2014 four levels and four statuses for THIS hero, not four designs, so it does not split the way Shadows and Skyship do.');
  h.notes.push('AWAITING REDESIGN. The stat block is a FROZEN random roll kept only so the build is reproducible - it is not authored and must not be balanced against. Badges are empty on purpose: the generator rolled Hell-TCG names that do not exist in this game.');
  h.notes.push('Depicts: '+spec.depicts);
  if(spec.artIncomplete) h.notes.push('ART INCOMPLETE - '+spec.artIncomplete);
  heroes.push(h);
}

// 6 — the ELEVEN SPECIAL CLASSES. Added 2026-08-21: content/ had none of them, and each
//     is a real character with a full 19-stat block in hell-tcg's data/specialClasses.js
//     and a complete eight-image set (4 levels + 4 afflictions) in New Art/<name>-variants/.
//
//     ONE PIECE OF BASE ART, ONE HERO. Their folders also hold rejected retries, so which
//     file is the adopted one comes from crucible/data/art-rulings.json - Knight and Templar
//     both use -v2, Knight because the base art is bugged and Templar because the base art
//     is landscape and cannot be a card.
//
//     GENDER is read off the art. specialClasses.js does not record it and neither does the
//     Crucible or its templates, so it was taken from the eleven pictures.
const SPECIAL_ART_DIR = {
  'Barbarian':'barbarian-variants','Demon Hunter':'demon-hunter-variants','Druid':'druid-variants',
  'Ebony Mask':'ebony-mask-variants','Inquisitor':'inquisitor-variants','Knight':'knight-variants',
  'Martyr':'martyr-variants','Prophet':'prophet-variants','Shaman':'shaman-variants',
  'Templar':'templar-variants','Warden':'warden-variants'};
const SPECIAL_GENDER = {
  'Barbarian':'male','Demon Hunter':'female','Druid':'female','Ebony Mask':'female',
  'Inquisitor':'male','Knight':'male','Martyr':'male','Prophet':'male','Shaman':'female',
  'Templar':'male','Warden':'female'};
const SPECIAL_DEPICTS = {
  'Barbarian':'bare-chested axeman mid-swing, knotwork tattoos, fur boots, embers and smoke',
  'Demon Hunter':'red leather armour, hand crossbow and shortsword, standing over dead imps in a lava field',
  'Druid':'leaves and flowers in her locks, living staff wreathed in green light, deep wood',
  'Ebony Mask':'filigree half-mask, black buckled leathers, dagger drawn in a wet moonlit alley',
  'Inquisitor':'grey-haired, chained tome under one arm, warhammer low, candlelit chapel',
  'Knight':'blond, blackened plate with gold trim, sword raised, dark red cloak',
  'Martyr':'haloed, bleeding, torn pale robes, light gathering in an outstretched hand',
  'Prophet':'blindfolded elder, ragged robes, blue lightning arcing from his hands into the dark',
  'Shaman':'feathers and bone in her locks, fox on her shoulder, spirit owls and bears around her',
  'Templar':'bearded crusader raising a burning sword, red cross on white, kite shield',
  'Warden':'twin blades drawn, bow and quiver on her back, misty forest'};
{
  const RUL = JSON.parse(fs.readFileSync('../crucible/data/art-rulings.json','utf8'));
  for(const sc of Object.values(SPECIAL_CLASSES)){
    const dir = SPECIAL_ART_DIR[sc.name];
    if(!dir){ problems.push('special class '+sc.name+' has no art folder mapping'); continue; }
    const stem = dir.replace(/-variants$/,'');
    const adopted = RUL.keep['variants/'+stem];
    if(!adopted){ problems.push('special class '+sc.name+' has no art ruling for variants/'+stem); continue; }
    const gender = SPECIAL_GENDER[sc.name] || null;
    if(!gender) problems.push('special class '+sc.name+' has no gender');

    const hero = convert({
      name: sc.name, class: sc.baseClass, gender, tier: 1, level: 1,
      baseStats: sc.baseStats||{},
      startingClassPowers: sc.startingClassPowers||[],
      triggers: sc.triggers||null,
      backstory: sc.description||null
    }, {path:'special', idBase:'special.'+slug(sc.name), campaign:'eve-of-ruin',
        artOverride:'New Art/'+dir+'/'+adopted});

    hero.subtype = sc.name;          // one of each per campaign; only one art, so no type layer
    hero.templateId = 'template.special.'+slug(sc.name);
    hero.templateName = sc.name;
    hero.levelArt = [1,2,3,4].map(n=>'New Art/'+dir+'/'+stem+'-level'+n+'.png');
    hero.specialClassId = sc.id || null;
    hero.unlockXp = sc.unlockXp ?? null;
    hero.notes.push('SPECIAL CLASS. Ported from hell-tcg data/specialClasses.js 2026-08-21 - content/ had no Druid, Knight, Templar or any of the other eight.');
    hero.notes.push('Depicts: '+(SPECIAL_DEPICTS[sc.name]||'(not described)'));
    hero.notes.push('Gender read off the art - specialClasses.js does not record it.');
    if(RUL.exceptions && RUL.exceptions['variants/'+stem])
      hero.notes.push('ART EXCEPTION - '+RUL.exceptions['variants/'+stem]);
    heroes.push(hero);
  }
}

// 7 — the two SKYSHIP subtypes Hell-TCG never defined. Added 2026-08-21.
//     Duelist and Ward of Aeronissa have four pieces of art each and appear in the
//     Crucible, but AERONISSA_HERO_TYPES has no entry for either, so content/ never saw
//     them. Their ported stats are PROVISIONAL - copied from a sibling template, not
//     authored - and are flagged needsPricing. Derived stats come from the per-class
//     table like every other hero; the Crucible's derived numbers are not carried.
{
  const SP = JSON.parse(fs.readFileSync('gen/skyship-provisional.json','utf8'));
  for(const s of SP.subtypes){
    for(const ty of s.types){
      const hero = convert({
        name: ty.type, class: s.class, gender: s.gender, tier: 1, level: 1,
        baseStats: {}
      }, {path:'skyship', idBase:'skyship.'+slug(s.subtype)+'.'+slug(ty.type),
          campaign:'skyship', artOverride: s.artDir+'/'+ty.file});
      hero.ported = {...s.ported};
      hero.subtype = s.subtype;
      hero.type = ty.type;
      hero.templateId = 'template.skyship.'+slug(s.subtype);
      hero.templateName = s.subtype;
      hero.needsPricing = true;
      hero.notes.push('PROVISIONAL STATS - shaped on '+s.shapedOn+', not authored for this character. A sweep owns the numbers.');
      hero.notes.push('Depicts: '+ty.depicts);
      hero.notes.push('Gender read off the art - nothing in the source records it for this subtype.');
      heroes.push(hero);
    }
  }
}

// ---------------------------------------------------------- TYPE, and the rulings
// Everything below is applied by the GENERATOR so that regenerating is safe. It was not,
// and regenerating on 2026-08-21 destroyed all 112 type names and brought back all 95
// roman-numeral placeholders, because those had been applied as a one-off patch. Anything
// hand-patched onto gen/heroes.json must live here or it dies at the next rebuild.

// TYPE = the specific piece of art. Named 2026-08-21 in crucible/data/types.json.
// The four arts of one subtype are four different people, so the type IS the hero name.
{
  const TP=JSON.parse(fs.readFileSync("../crucible/data/types.json","utf8"));
  const all={...TP.shadows,...TP.skyship};
  const base=p=>String(p).split("/").pop().toLowerCase();
  const byBase={}; for(const [k,v] of Object.entries(all)) byBase[base(k)]=v;
  let typed=0;
  for(const h of heroes){
    const rec=h.art?byBase[base(h.art)]:null;
    if(!rec||!rec.type) continue;
    h.type=rec.type; typed++;
    if(ROMAN.some(r=>h.name===h.subtype+" "+r)) h.name=rec.type;
  }
  if(typed<100) problems.push("type: only "+typed+" heroes matched crucible/data/types.json - expected 112");
}

// The class rulings of 2026-08-20, recorded on the heroes they were made about.
{
  // Derived from the data, not listed by hand - the fourth beast is young-sand-dragon and
  // a hardcoded guess got it wrong once already.
  const BEASTS=heroes.filter(h=>h.class==="class.beast").map(h=>h.id);
  const NOTE_BEAST="2026-08-20: class.beast created for these four. They were the only heroes in the game with no class.";
  const NOTE_SPIRIT="2026-08-20: \"change the Spirit to just be a Civilian so that there are no outliers on classes.\" One hero is not a class.";
  for(const h of heroes){
    if(BEASTS.includes(h.id) && !h.notes.includes(NOTE_BEAST)) h.notes.push(NOTE_BEAST);
    if(h.id==="hero.fixed.living-ghost" && !h.notes.includes(NOTE_SPIRIT)) h.notes.push(NOTE_SPIRIT);
  }
}

// ---- validation
const ID=/^[a-z]+\.[a-z0-9.-]+$/; const seen=new Set();
for(const h of heroes){
  if(!ID.test(h.id)) problems.push('bad id '+h.id);
  if(seen.has(h.id)) problems.push('DUPLICATE '+h.id); seen.add(h.id);
}
// ------------------------------------------------------------ Eve base differentiation
// The 24 Eve base heroes shared stat blocks, and the four priests and four mages shared a
// power, so several were mechanically the same character wearing different art. Ruled
// 2026-08-22: every one is separated by at least a stat point or a badge.
//
// This applies only what the closed vocabulary can express. The rest — terrain badges, the
// Brawler tag bonus, starting kits, and the priests' Benediction — is recorded in the same
// file under `blocked` and reported, never approximated. A badge that half works is worse
// than one that visibly does not.
{
  const DIFF = JSON.parse(fs.readFileSync('gen/eve-differentiation.json', 'utf8'));
  const blockedBadgeNames = new Set(DIFF.blocked.badges.map(b => b.name));
  let touched = 0, statPoints = 0, badgesAdded = 0, deferred = 0;

  for (const [id, spec] of Object.entries(DIFF.heroes)) {
    const h = heroes.find(x => x.id === id);
    if (!h) { problems.push('differentiation: no hero ' + id); continue; }
    if (h.name !== spec.name) problems.push('differentiation: ' + id + ' is "' + h.name + '", expected "' + spec.name + '"');

    // derivedBase and ported are SHARED OBJECT REFERENCES off the class baseline - mutating
    // one hero mutated every hero of that class. Court Champion zeroing his crit zeroed it
    // for Angel, Mr. Black and 26 others. Clone before touching. Found 2026-08-22 by R23,
    // which is exactly the aliasing bug that rule is shaped to catch.
    h.derivedBase = { ...(h.derivedBase || {}) };
    h.ported      = { ...(h.ported || {}) };
    for (const [stat, delta] of Object.entries(spec.stats || {})) {
      if (!(stat in h.derivedBase) && !(stat in (h.ported || {})))
        h.derivedBase[stat] = 0;
      const bag = (stat in (h.ported || {})) ? h.ported : h.derivedBase;
      bag[stat] = (bag[stat] || 0) + delta;
      statPoints++;
    }
    for (const stat of (spec.zeroStats || [])) {
      const bag = (stat in (h.ported || {})) ? h.ported : h.derivedBase;
      bag[stat] = 0;
    }
    for (const b of (spec.removeBadges || [])) {
      const i = h.originBadges.indexOf(b);
      if (i < 0) problems.push('differentiation: ' + id + ' has no badge "' + b + '" to remove');
      else h.originBadges.splice(i, 1);
    }
    for (const b of (spec.addBadges || [])) {
      if (blockedBadgeNames.has(b)) deferred++;   // attached, but its badge row carries needsCapability
      if (!h.originBadges.includes(b)) { h.originBadges.push(b); badgesAdded++; }
    }
    if (spec.thorns != null)
      (h.authoredTriggers = h.authoredTriggers || []).push({ name:'Thorns', hook:'passive', targets:'self',
        effects:[{ effect:'Thorns N', value:spec.thorns }], authored:true });
    if (spec.startOfBattleStatus)
      (h.authoredTriggers = h.authoredTriggers || []).push({ name:'Begins Owed', hook:'startOfBattle', targets:'self',
        effects:[{ effect:'apply a status', status:spec.startOfBattleStatus.status,
                   value:spec.startOfBattleStatus.value }], authored:true });
    // Only triggers that need NO condition outside the closed three can be built.
    for (const tr of (spec.triggers || [])) {
      if (tr.when) { deferred++; continue; }
      (h.authoredTriggers = h.authoredTriggers || []).push({ ...tr, authored:true });
    }
    // Record the deviation from the class baseline ON THE ROW. R23 says every hero must match
    // its class exactly, and it is right to - an undeclared drift is how the Crucible ended up
    // with its own numbers. A DELIBERATE difference is not drift, but it has to say so out loud.
    { const base = DERIVED_BASE[h.class] || {};
      const d = {};
      for (const k of Object.keys(base)) if ((h.derivedBase[k] ?? 0) !== base[k]) d[k] = h.derivedBase[k] - base[k];
      if (Object.keys(d).length) { h.derivedDeltas = d; h.derivedDeltaWhy = spec.why; } }
    if(spec.addPowers) h.classPowers=[...new Set([...(h.classPowers||[]), ...spec.addPowers])];
    h.notes.push('Differentiated 2026-08-22: ' + spec.why);
    touched++;
  }
  console.log('differentiation: ' + touched + ' heroes · ' + statPoints + ' stat points · ' +
              badgesAdded + ' badges attached · ' + deferred + ' deferred to CONTENT-GAPS');
}

// ------------------------------------------------------------ civilian rulings
// Renames and settled art for the prologue civilians. Ruled 2026-08-25 reviewing the
// hero-art pairs. A rename lives in gen/civilian-rulings.json and is applied HERE, in the
// generator, because a rename hand-patched onto gen/heroes.json dies at the next rebuild.
// Ids never change — encounters reference ids, so nothing dangles.
{
  const CR=JSON.parse(fs.readFileSync('gen/civilian-rulings.json','utf8'));

  for(const [id,name] of Object.entries(CR.renames||{})){
    const h=heroes.find(x=>x.id===id);
    if(!h){problems.push('civilian-rulings: no hero '+id);continue;}
    h.notes.push('Renamed '+JSON.stringify(h.name)+' -> '+JSON.stringify(name)+', ruled 2026-08-25.');
    h.name=name;
    h.subtype=name;   // a fixed hero's subtype IS its name (R19) — the rename carries it
  }
  // newUnits. A spec may now carry its OWN art (`artSlug`), which is what the twelve painted
  // civilians of 2026-09-03 need — the original loop hard-nulled every art field because the
  // only new unit at the time had none. A spec with an artSlug gets the local tree declared in
  // gen/art-conventions.json: art/heroes/<slug>/card/l1.png and hex/l1_{256,1024,full}.png.
  // levelArt stays UNSET until l2..l4 are painted; mkthumbs falls back to `art` for the level
  // strip, so an incomplete levelArt array would be worse than none.
  for(const [id,spec] of Object.entries(CR.newUnits||{})){
    if(id.startsWith('_'))continue;
    const src=heroes.find(x=>x.id===spec.cloneStatsOf);
    if(!src){problems.push('civilian-rulings newUnits: no clone source '+spec.cloneStatsOf);continue;}
    const slug=spec.artSlug;
    const art=slug?{
      art:'art/heroes/'+slug+'/card/l1.png', artSlug:slug, artMissing:undefined,
      levelArt:undefined, afflictionArt:undefined, anim:undefined,
      hexArt:['art/heroes/'+slug+'/hex/l1_1024.png','art/heroes/'+slug+'/hex/l1_256.png','art/heroes/'+slug+'/hex/l1_full.png'],
    }:{ art:null, artSlug:undefined, artMissing:true, levelArt:undefined, afflictionArt:undefined, anim:undefined, hexArt:undefined };
    heroes.push({...JSON.parse(JSON.stringify(src)), id, name:spec.name, subtype:spec.name, ...art,
      // A civilian's specialty is CHOSEN at L2 from the civilian list, never fixed on the row —
      // ruled 2026-09-03: "The specialties are the same for all of them. The specialty options
      // for civilians right now." Cloning a source would otherwise carry its specialty across.
      ...(spec.clearSpecialty?{specialty:undefined}:{}),
      notes:[spec.note||('NEW UNIT ruled 2026-08-25: the school-child-solo art is its own character, separate from School Children. Stats cloned from '+src.name+' as a SOFT baseline — a sweep or ruling prices her.')]});
  }
  // Full dictated stat blocks for civilians. Ported keys and derived keys go to their own
  // bags; every derived deviation from the class baseline lands in derivedDeltas with the
  // block's why, so R23 reads a declared decision rather than drift.
  // Civilian TYPE level tables, ruled 2026-09-03. RUNS AFTER newUnits: a cloned civilian such as
  // hero.fixed.school-child-female does not exist until that loop has made it, and pointing at a
  // hero that is not there yet is how this was caught the first time. A civilian levels by its type, not by the
  // class — "Maiden and farmer are different in how they should level up." The table lives in
  // gen/levels.json under civilianTypes; this only points a hero at one. Several heroes may
  // share a table, which is how a group of farmers stays one curve. No pointer = class.civilian.
  {
    const LV=JSON.parse(fs.readFileSync('gen/levels.json','utf8'));
    const known=new Set((LV.civilianTypes||[]).map(t=>t.id));
    for(const [id,table] of Object.entries(CR.levelTables||{})){
      if(id.startsWith('_')) continue;
      const h=heroes.find(x=>x.id===id);
      if(!h){problems.push('civilian-rulings levelTables: no hero '+id);continue;}
      if(!known.has(table)){problems.push('civilian-rulings levelTables: no civilianTypes table '+table);continue;}
      if(h.class!=='class.civilian'){problems.push('civilian-rulings levelTables: '+id+' is '+h.class+', not a civilian');continue;}
      h.levelTable=table;
      h.notes.push('Levels on '+table+' rather than the class.civilian table — ruled 2026-09-03.');
    }
  }

  // badge.hero on a CIVILIAN — ruled 2026-09-04: "It is not on civilians unless expressly
  // said so. A civilian who goes down and doesn't have the hero badge is just dead and a
  // corpse." This is where a civilian expressly says so. Empty is the correct state today:
  // no civilian has been named. mkenginepack reads hero.badges for the civilian lane and
  // stamps every non-civilian hero itself.
  for(const id of (CR.heroBadge||{}).ids||[]){
    const h=heroes.find(x=>x.id===id);
    if(!h){problems.push('civilian-rulings heroBadge: no hero '+id);continue;}
    if(h.class!=='class.civilian'){problems.push('civilian-rulings heroBadge: '+id+' is '+h.class+' — every non-civilian hero already carries badge.hero; listing one here is a no-op that will rot');continue;}
    h.badges=[...new Set([...(h.badges||[]),'badge.hero'])];
    h.notes.push('Carries badge.hero and therefore bleeds out rather than dying outright — expressly ruled, 2026-09-04.');
  }
  for(const [id,sb] of Object.entries(CR.statBlocks||{})){
    if(id.startsWith('_'))continue;
    const h=heroes.find(x=>x.id===id);
    if(!h){problems.push('civilian-rulings statBlocks: no hero '+id);continue;}
    h.ported={...(h.ported||{}), ...(sb.ported||{})};
    h.derivedBase={...(h.derivedBase||{})};
    for(const [k,v] of Object.entries(sb.derived||{})) h.derivedBase[k]=v;
    { const base=DERIVED_BASE[h.class]||{}; const d={};
      for(const k of Object.keys(base)) if((h.derivedBase[k]??0)!==base[k]) d[k]=h.derivedBase[k]-base[k];
      for(const k of Object.keys(sb.derived||{})) if(!(k in base)) d[k]=h.derivedBase[k];
      if(Object.keys(d).length){ h.derivedDeltas=d; h.derivedDeltaWhy=sb.why; } }
    if(sb.kit) h.kit=sb.kit;
    if(sb.authoredTriggers) h.authoredTriggers=[...(h.authoredTriggers||[]), ...sb.authoredTriggers.map(x=>({...x,authored:true}))];
    if(sb.survivalReward) h.survivalReward=sb.survivalReward;
    if(sb.grantsTactics){ h.grantsTactics=sb.grantsTactics; h.grantsTacticsNote=sb.grantsTacticsNote; }
    if(sb.startOfBattleDraw) h.startOfBattleDraw=sb.startOfBattleDraw;
    h.notes.push('Stat block dictated 2026-08-25: '+sb.why);
  }
  // EVERY CIVILIAN CARRIES A WEAPON.
  // RUNS AFTER statBlocks: that loop is where h.kit is set (`if(sb.kit) h.kit=sb.kit`), so a block
  // placed before it sees every civilian as unarmed and arms the five that already were. Ruled 2026-09-05: "every civilian should have a dagger or
  // a knife or a pitchfork or a pile of rocks if they're a child... really, every civilian
  // should have some kind of weapon." Applied to every class.civilian hero that does not
  // already carry one, so a new civilian is armed the day it is authored rather than the day
  // someone notices. An existing weapon is never replaced — the Lumberjack keeps his axe.
  {
    const W=CR.weapons||{};
    // Match assemble's weapon sources. A settled weapon is already a weapon;
    // overlooking it adds a second two-handed item to an authored kit.
    const rows=['gen/weapons.json','gen/settled-items.json','settled.json'].flatMap(file=>{
      const data=JSON.parse(fs.readFileSync(file,'utf8'));
      return (Array.isArray(data)?data:(data.items||[])).map(item=>
        file==='gen/weapons.json'?{...item,itemClass:item.itemClass||'weapon'}:item);
    });
    const isWeapon=new Set(rows.filter(x=>x&&x.itemClass==='weapon').map(x=>x.id));
    for(const w of [W.default,...Object.values(W.byType||{}),...Object.values(W.overrides||{})].filter(Boolean))
      if(!isWeapon.has(w)) problems.push('civilian-rulings weapons: '+w+' is not an authored weapon');
    let armed=0, already=0;
    for(const h of heroes){
      if(h.class!=='class.civilian') continue;
      if((h.kit||[]).some(i=>isWeapon.has(i))){ already++; continue; }
      const pick=(W.overrides||{})[h.id] || (W.byType||{})[h.levelTable] || W.default;
      if(!pick){ problems.push('civilian-rulings weapons: nothing to arm '+h.id+' with (no default)'); continue; }
      h.kit=[...(h.kit||[]), pick];
      h.notes.push('Armed with '+pick+' — ruled 2026-09-05, every civilian carries a weapon.');
      armed++;
    }
    console.log('civilian weapons: '+armed+' armed, '+already+' already carried one');
  }
  for(const [id,a] of Object.entries(CR.art||{})){
    if(id.startsWith('_'))continue;
    const h=heroes.find(x=>x.id===id);
    if(!h){problems.push('civilian-rulings: no hero '+id);continue;}
    const p='art/heroes/'+a.slug+'/card/l1.png';
    if(!fs.existsSync('../'+p)){problems.push('civilian-rulings: '+p+' not on disk');continue;}
    h.art=p; h.artSlug=a.slug; h.artMissing=undefined;
    // and everything else the slug folder holds — hex tokens and animations. Without this,
    // 21 hex cutouts sat on disk while the manifest showed one card variant per civilian.
    { const hx='../art/heroes/'+a.slug+'/hex';
      if(fs.existsSync(hx)){ const f=fs.readdirSync(hx).filter(x=>/\.(png|jpe?g)$/i.test(x));
        if(f.length) h.hexArt=f.map(x=>'art/heroes/'+a.slug+'/hex/'+x).sort(); }
      const an='../art/heroes/'+a.slug+'/anim';
      if(fs.existsSync(an)){ const f=fs.readdirSync(an).filter(x=>/\.mp4$/i.test(x));
        if(f.length) h.anim=f.map(x=>'art/heroes/'+a.slug+'/anim/'+x).sort(); } }
  }
}

// ---------------------------------------------------------------- local art resolution
// The art tree in this repo is art/heroes/<slug>/{card,hex,anim}/ with card/l1..l4 and
// card/<affliction>. The SOURCE names the same pictures <slug>1..4 and <slug>l|p|r|v in a flat
// folder inside hell-tcg. Content used to record the hell-tcg path, which resolves nowhere here.
//
// A path that does not resolve is worse than a missing one: it reads as present. Anything that
// has been brought across is now recorded where it actually is, and anything that has not is
// left pointing at the source AND counted, so the gap is a number rather than a surprise.
{
  const ART = '../art/heroes/';
  const AFF = ['lycanthropy','possession','rotting-flesh','vampirism'];
  const slugOf = p => {
    if (!p) return null;
    const dir = p.split('/').slice(0,-1).pop() || '';
    const base = p.split('/').pop().replace(/\.[^.]+$/, '');
    if (/-(variants|series)$/.test(dir)) return dir.replace(/-(variants|series)$/, '');
    return base.replace(/-level[1-4].*$/, '').replace(/[1-4]$/, '');
  };
  let localised = 0, stillRemote = 0;
  for (const h of heroes) {
    const slug = slugOf(h.art);
    const cardDir = slug && (ART + slug + '/card');
    if (!slug || !fs.existsSync(cardDir)) { if (h.art) stillRemote++; continue; }
    const files = fs.readdirSync(cardDir);
    const pick = stem => { const hit = files.find(x => x.replace(/\.[^.]+$/, '') === stem);
                           return hit ? 'art/heroes/' + slug + '/card/' + hit : null; };

    const levels = [1,2,3,4].map(n => pick('l' + n)).filter(Boolean);
    if (!levels.length) { stillRemote++; continue; }

    h.artSlug   = slug;
    h.art       = levels[0];
    h.levelArt  = levels;
    const affl = {};
    for (const a of AFF) { const p = pick(a); if (p) affl[a] = p; }
    if (Object.keys(affl).length) h.afflictionArt = affl;

    const animDir = ART + slug + '/anim';
    if (fs.existsSync(animDir)) {
      const anims = fs.readdirSync(animDir).filter(x => /\.mp4$/i.test(x));
      if (anims.length) h.anim = anims.map(x => 'art/heroes/' + slug + '/anim/' + x).sort();
    }
    const hexDir = ART + slug + '/hex';
    if (fs.existsSync(hexDir)) {
      const hex = fs.readdirSync(hexDir).filter(x => /\.(png|jpe?g)$/i.test(x));
      if (hex.length) h.hexArt = hex.map(x => 'art/heroes/' + slug + '/hex/' + x).sort();
    }
    localised++;
  }
  console.log('local art: ' + localised + ' heroes now point at art/heroes/, ' +
              stillRemote + ' still name a hell-tcg path that does not resolve here');
}


// ------------------------------------------------------- BADGE COMPENSATIONS, 2026-08-25
// gen/badges.json `compensations`: a badge whose penalties are added BACK to every wearer's
// base stats. Ruled for Child ("every character we add this to, let's buff the stats the
// same amount"): the badge carries the childhood; losing it later is the gain. Runs after
// every other stat applier and before THE CUT. Clone-before-mutate — the bags are shared
// object references off the class baseline (the 28-paladin lesson).
{
  const comps = JSON.parse(fs.readFileSync('gen/badges.json','utf8')).compensations || [];
  for (const c of comps) {
    let n = 0;
    for (const h of heroes) {
      if (!Array.isArray(h.originBadges) || !h.originBadges.includes(c.badgeName)) continue;
      h.ported = { ...(h.ported || {}) };
      for (const [stat, v] of Object.entries(c.buff)) h.ported[stat] = (h.ported[stat] || 0) + v;
      h.notes = [...(h.notes || []), `Base stats +${Object.entries(c.buff).map(([s,v])=>`${v} ${s}`).join(', +')} — ${c.badgeName} compensation (ruled 2026-08-25).`];
      n++;
    }
    console.log(`compensation: ${c.badgeName} offset applied to ${n} wearers`);
  }
}

// ------------------------------------------------------------------ THE CUT, 2026-08-22
// Four kinds of garbage came across with the port and never got cleaned up. Ruled: cut them.
// A broken reference is worse than an absence, because an absence is obviously missing and a
// broken reference reads as content — that is exactly how one session reported the Eve level
// art present while another could not find it.
//
// Everything removed here is recorded in gen/cut-2026-08-22.json. Nothing is destroyed; it is
// parked, with counts, so it can be added back as real rows later.
const CUT = { _note:'Removed from hero rows 2026-08-22. Cutting beats half-fitting. Add back as real definitions when there is something to add.',
              danglingArt:[], hellTcgTriggers:[], undefinedBadges:{}, personalityTags:{} };
{
  const knownBadge = new Set(JSON.parse(fs.readFileSync('gen/badges.json','utf8')).badges.map(b => String(b.name).toLowerCase()));
  let art = 0, trig = 0, badge = 0, pers = 0;

  for (const h of heroes) {
    // (a) an art path that does not resolve. Nulled, not repointed — there is nothing to point at.
    if (h.art && !fs.existsSync('../' + h.art)) {
      CUT.danglingArt.push({ hero:h.name, was:h.art });
      h.art = null; h.levelArt = undefined; h.artMissing = true; art++;
    }

    // (b) hell-tcg trigger objects, never ported. 30 foreign action names — gainFaith,
    //     grantDraws, increaseActionRate — none of which is a word this game has.
    if (h.triggers && !Array.isArray(h.triggers)) {
      const live = {};
      for (const [k, v] of Object.entries(h.triggers)) if (Array.isArray(v) && v.length) live[k] = v;
      if (Object.keys(live).length) { CUT.hellTcgTriggers.push({ hero:h.name, was:live }); trig++; }
      delete h.triggers;
    }

    // (c) badge NAMES with no badge row behind them, and (d) Personality_ tags, which are not
    //     badges at all — COMBAT-DESIGN calls them "invisible personality tags that story
    //     events read", so they belong on their own field rather than in the badge list.
    if (Array.isArray(h.originBadges)) {
      const keep = [], personality = [];
      for (const n of h.originBadges) {
        if (/^Personality_/.test(n)) { personality.push(n.replace(/^Personality_/, '').toLowerCase());
                                       CUT.personalityTags[n] = (CUT.personalityTags[n] || 0) + 1; pers++; continue; }
        if (!knownBadge.has(String(n).toLowerCase())) { CUT.undefinedBadges[n] = (CUT.undefinedBadges[n] || 0) + 1; badge++; continue; }
        keep.push(n);
      }
      h.originBadges = keep;
      if (personality.length) h.personality = personality;
    }
  }
  fs.writeFileSync('gen/cut-2026-08-22.json', JSON.stringify(CUT, null, 1) + '\n');
  console.log('cut: ' + art + ' dangling art paths · ' + trig + ' hell-tcg trigger blocks · ' +
              badge + ' undefined badge names · ' + pers + ' personality tags moved off originBadges');
  console.log('     all recorded in gen/cut-2026-08-22.json');
}

const out={derivation:DERIVATION, derivedBase:DERIVED_BASE, portMap:PORT, dodgeScale:DODGE_SCALE,
  rule:'ONE PIECE OF ART, ONE UNIQUE HERO. Ruled 2026-08-20. Every generative template owns four distinct designs and each is its own hero — so 12 Shadows subtypes are 48 heroes, not 12. What does NOT split is a hero\u2019s own level-and-status set: a folder of 1/2/3/4 plus l/p/r/v is one hero at four levels wearing four afflictions, which is why the 98 fixed cast stay 98.',
  paths:[
   {path:'fixed',   file:'src/state/heroData.js → HERO_DATA', note:'the named cast. One hero per entry; their 1/2/3/4 + l/p/r/v art is levels and statuses, so they do not split'},
   {path:'shadows', file:'data/shadowsHeroTypes.js → AVTAIR_HERO_TYPES', note:'12 subtypes x 4 designs (-v1..v4) = 48 heroes sharing 12 stat blocks'},
   {path:'skyship', file:'data/skyshipHeroes.js → AERONISSA_HERO_TYPES', note:'12 subtypes x 4 designs = 47 heroes — sky-captain has only 3, its fourth file duplicates another'},
   {path:'base',file:'src/eveOfRuin/tutorialHeroes.js → TUTORIAL_HERO_VARIANTS', note:'24 Eve base classes - one per piece of base art. Was 96: the four art files per set are four LEVELS, not four heroes'},
   {path:'aspiring',file:'src/generators/aspiringHeroGenerator.js → generateAspiringHero()', note:'8 art templates (2 genders x 4 styles). Procedural: the art is fixed, the stat block is one draw'}],
  heroes};
fs.mkdirSync('gen',{recursive:true});
fs.writeFileSync('gen/heroes.json',JSON.stringify(out,null,1));
const by={}; heroes.forEach(h=>by[h.path]=(by[h.path]||0)+1);
console.log('HEROES: '+heroes.length, JSON.stringify(by));
const cls={}; heroes.forEach(h=>cls[h.class||'UNMAPPED:'+h.sourceClass]=(cls[h.class||'UNMAPPED:'+h.sourceClass]||0)+1);
console.log('by class:', JSON.stringify(cls));
console.log('\nPROBLEMS: '+problems.length); [...new Set(problems)].slice(0,10).forEach(p=>console.log('  ! '+p));
