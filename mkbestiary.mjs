// mkbestiary.mjs — extract all 412 enemies from Hell-TCG into gen/bestiary.json.
//
// Ruled 2026-08-21: ALL 412 come across, not just the curated 144. The stat blocks and
// abilities already existed in hell-tcg/data/enemyCards.js — nothing here is authored from
// nothing, and nothing should be, because authoring a second copy of 412 enemies is exactly
// the duplication this whole pass has been undoing.
//
//   node mkbestiary.mjs            rebuild gen/bestiary.json
//   HELL_TCG=/path node mkbestiary.mjs
//
// The curated 144 (campaign, art, encounter list) is preserved as `curated` on the rows that
// have it — that curation is real work and is not in enemyCards.js.

import fs from 'fs';

const S = (process.env.HELL_TCG || '../../hell-tcg').replace(/\/?$/, '/');
if (!fs.existsSync(S)) {
  console.error(`\nmkbestiary needs the Hell-TCG project, not found at:\n  ${S}\n`);
  console.error('Set HELL_TCG=/path/to/hell-tcg. gen/bestiary.json is checked in, so this\n'
              + 'only needs running when re-extracting.\n');
  process.exit(2);
}
const { ENEMY_CARDS } = await import(S + 'data/enemyCards.js');

// ---------------------------------------------------------------- the port map
// Enemies use the same eleven-field Hell-TCG block heroes did, minus itemSlots and
// maxAfflictions. melee -> strength and ranged -> precision, as for heroes.
// The 21 stat names HoBaT actually has. Anything else in an effect payload is a leak from
// the source and gets reported rather than silently written into the bestiary.
const VOCAB_STATS = new Set(['health','resist','strength','dodge','movement','armor','accuracy',
  'precision','crit','magic','staminaMax','reach','luck','spirit','itemSlots','toughness',
  'vision','corruption','surge','staminaRegen','deathbedFighting']);
// The rest of the closed vocabulary, read from the generated list rather than restated here —
// if functions.json loses a word, the riders that use it stop building instead of drifting.
// Its rows are {name, uses, ids}, because functions.json is a CENSUS OF USE, not a declaration.
// That makes this check deliberately strict: a rider may only use a word something else already
// uses. Inventing a word for one creature is the exact failure CONTENT-GAPS.md exists to catch.
const VOCAB = JSON.parse(fs.readFileSync('gen/functions.json', 'utf8'));
const names = k => new Set((VOCAB[k] || []).map(x => typeof x === 'string' ? x : x.name));
const VOCAB_EFFECTS = names('effects');
const VOCAB_STATUSES = names('statuses');
const VOCAB_HOOKS = names('hooks');
const VOCAB_SHAPES = names('shapes');
const PORT = { melee:'strength', ranged:'precision', armor:'armor', health:'health',
               reach:'reach', resist:'resist', magic:'magic', spirit:'spirit' };
const DODGE_SCALE = 5;   // same rescale heroes got: hell-tcg 0-3 -> flat to-hit points

// ------------------------------------------------- the stats enemies have no source for
// SOFT — a sweep owns every number. But the shape is the point, and the FIRST attempt got it
// wrong: accuracy rose with rank and nothing else, so every boss was precise and every boss
// played the same way. That is a formula, not a bestiary.
//
// ACCURACY IS NOT A FUNCTION OF RANK. A thing can be rank 3 and terrifying precisely because
// it swings at 60 and removes you when it connects. What decides accuracy is what KIND of
// creature it is, and rank only sharpens whatever that archetype already does.
//
// Each creature is matched to an archetype from what it already is — its stat shape first,
// its creature types and name second. Every number here is soft; the archetypes are not.
const ARCHETYPES = [
  // ORDER MATTERS, and the order is a ruling: IDENTITY BEATS STAT SHAPE. The first pass matched
  // on stats first, so a Lich with 30 health became a "juggernaut", and Fire Witch — strength 2 —
  // became one as well. A lich is a lich at any health total. Name and creature type are read
  // before bulk; bulk only names the things that have no other identity.

  // The ONLY archetype above 115, and it has to EARN it with reach. This is the entire answer to
  // "why would this thing rarely miss": because it is not standing next to you. It is shelling
  // you from nine hexes away and you cannot reach back. Corrupted Dragon (reach 9, rank 3) lands
  // near 150 — that is the boss at 150, and its reach is the reason it is allowed to be.
  { id:'siege', acc:[122,142], mov:[2,3],
    why:'it hits from outside your reach. The range IS the justification for the accuracy',
    when:(b,e,n)=> (b.reach||0)>=4 },

  // Rank-3 menace expressed as damage, health and effects — NOT as a hit chance.
  { id:'terror', acc:[74,88], mov:[4,5],
    why:'dangerous for what it does to you, not for how often it connects',
    when:(b,e,n)=> has(e,'Horror') || has(e,'Nightmare') || has(e,'Dragon') ||
                   /demon lord|overlord|emperor|\bking\b|\bqueen\b|herald|avatar/i.test(n) },

  { id:'bulwark', acc:[45,58], mov:[1,2],
    why:'it is there to be hit, not to hit',
    when:(b,e,n)=> has(e,'Wall') || has(e,'Construct') ||
                   /barricade|golem|statue|sentinel|bulwark|totem|gate/i.test(n) ||
                   // armor alone only names a bulwark when nothing else has named it
                   ((b.armor||0)>=5 && !/lord|king|queen|emperor|master/i.test(n)) },

  // A lich is not frightening because it never misses. It is frightening because of the drain,
  // the curse and what it raises. Casters sit mid-range on purpose.
  { id:'caster', acc:[70,84], mov:[3,4],
    why:'the spell is the threat, not the swing. Deliberately unremarkable accuracy',
    when:(b,e,n)=> /lich|witch|warlock|mage|sorcer|necroman|priest|shaman|summoner|cultist|ritual|seer|oracle/i.test(n) },

  { id:'assassin', acc:[98,112], mov:[5,6],
    why:'fast, fragile, and it picks its moment',
    when:(b,e,n)=> /assassin|stalker|striker|reaper|slayer|duelist|blademaster/i.test(n) ||
                   // a Zombie is not an assassin for being small and strong
                   ((b.health||0)<=6 && (b.melee||0)>=5 && !has(e,'Undead')) },

  { id:'artillery', acc:[86,100], mov:[3,4],
    why:'it shoots from the back and does not want to be reached',
    when:(b,e,n)=> ((b.ranged||0)>(b.melee||0) && (b.reach||0)>=3) ||
                   /archer|slinger|gunner|bombard|marksman|sniper/i.test(n) },

  // Now, and only now, bulk. It has to be genuinely enormous AND committed to melee: 35+ health,
  // real strength, short reach. This is the "kills you on hit at 60%" case, and rank does not
  // rescue it — a rank-3 juggernaut is still swinging in the sixties.
  { id:'juggernaut', acc:[52,64], mov:[2,3],
    why:'enormous, slow and lethal. Misses often; ends you when it does not',
    when:(b,e,n)=> ((b.health||0)>=35 && (b.melee||0)>=6 && (b.reach||0)<=2) ||
                   /hulk|colossus|titan|behemoth|brute|ogre|troll|giant|abomination/i.test(n) },

  { id:'swarm', acc:[62,74], mov:[5,6],
    why:'individually negligible, and there are always more',
    when:(b,e,n)=> ((b.health||0)<=5 && (b.melee||0)<=3) ||
                   /swarm|rat|bat|spawn|lesser|imp|grub|hatchling/i.test(n) },

  { id:'skirmisher', acc:[78,92], mov:[5,6],
    why:'quick, awkward to pin down',
    when:(b,e,n)=> has(e,'Ghost') || has(e,'Shadow') || has(e,'Beast') || has(e,'Flying') ||
                   /hound|wolf|raider|scout|dancer|harpy|wisp|prowler/i.test(n) },

  { id:'shambler', acc:[58,68], mov:[3,4],
    why:'the baseline walking corpse',
    when:(b,e,n)=> has(e,'Undead') },

  { id:'soldier', acc:[70,82], mov:[4,5],
    why:'a trained person doing a job',
    when:()=> true },
];

// Rank sharpens the archetype rather than replacing it: a rank-3 juggernaut is still
// inaccurate, just more so at everything else. +0/+4/+8/+12 across the band.
const RANK_SHARPEN = { 0:-4, 1:0, 2:6, 3:12 };

// Spread WITHIN an archetype's band, so two shamblers are not identical. Deterministic from
// the name — the same creature always lands on the same number, and a rebuild is reproducible.
function seed(s){ let h=0; for(let k=0;k<s.length;k++) h=(h*31+s.charCodeAt(k))>>>0; return h; }
function inBand(band, s, extra){
  const [lo,hi]=band, span=hi-lo;
  return lo + (seed(s)%(span+1)) + (extra||0);
}
function archetypeOf(e){
  const b=e.baseStats||{}, n=e.name||'';
  for(const a of ARCHETYPES) if(a.when(b,e,n)) return a;
  return ARCHETYPES[ARCHETYPES.length-1];
}
function deriveAccuracy(e){
  const a=archetypeOf(e);
  const acc=Math.max(40, inBand(a.acc, e.name, RANK_SHARPEN[e.tier] ?? 0));
  return { accuracy:acc, why:[a.id+' — '+a.why] };
}
function deriveMovement(e){
  const a=archetypeOf(e);
  return { movement: inBand(a.mov, e.name+'m', 0), why:a.id+' — '+a.why };
}
const has = (e,t) => (e.types||[]).includes(t);
const ENEMY_DERIVED = { maxStamina: 0, staminaRegen: 0 };

// --------------------------------------------------------- targeting, from the ACTOR's side
// Hell-TCG wrote enemy abilities from the PLAYER's point of view: "allHeroes" meant the
// player's heroes. content/ writes every targeting shape from the ACTING unit's point of
// view, so an enemy hitting heroes targets ENEMIES. Getting this backwards would invert
// every area effect in the bestiary.
const TARGET = {
  reach:            'one enemy in melee reach',
  self:             'self',
  allHeroes:        'enemies within N hexes',
  allEnemies:       'allies within N hexes',
  randomHero:       'one enemy within N hexes',
  randomEnemy:      'one ally within N hexes',
  lowestHealthEnemy:'one ally within N hexes',
  sameRowEnemies:   'allies within N hexes',
  row:              'enemies within N hexes',
};

// The target named INSIDE an effect payload has to be ported through the same inversion, and
// was not: 207 effects kept raw hell-tcg strings, which read backwards — from an enemy's point
// of view "allEnemies" means its own allies. Found 2026-08-21 reviewing what would force a new
// mechanic. Two of those strings are not shapes at all but REFERENTS to the ability's own
// target, so they resolve to null and inherit the ability's targeting.
// `attacked` and `attacker` are REFERENTS, not shapes — gen/referents.json says why. The
// source's `attacked` is the thing this attack hit; `attacker` is whoever hit us, and
// striking back at them is the entire purpose of onTakingDamage.
const REFERENTS = JSON.parse(fs.readFileSync('gen/referents.json','utf8')).referents;
const VOCAB_REFERENTS = new Set(REFERENTS.map(r => r.name));
const EFFECT_TARGET = { ...TARGET, attacked:'the unit this hit', target:null,
                        attacker:'the attacker', lowestHealthHero:'one enemy within N hexes' };
const portTarget = v => (v == null ? null : (v in EFFECT_TARGET ? EFFECT_TARGET[v] : v));

// --------------------------------------------------------------- effect action -> vocabulary
// The 17 actions enemyCards uses, against the closed list in FUNCTIONS.md. Anything not
// here is reported, never guessed — an unmapped action is a CONTENT GAP, not a licence to
// invent a mechanic.
const STATUS = { applyBurn:'burn', applyPoison:'poison', applyWeak:'weak', applyBleed:'bleed',
                 applyProtection:'protection', applyRegen:'regeneration' };
const ACTION = {
  ...Object.fromEntries(Object.keys(STATUS).map(k => [k, 'apply a status'])),
  heal:'heal', damage:'deal damage (type from the weapon)', attackMultiple:'deal damage (type from the weapon)',
  createAura:'grant an aura', applyDodge:'grant a stat for the Battle',
  modifyStatPermanent:'grant a stat for the Battle', modifyStatTemporary:'grant a stat until end of next Turn',
  modifyMaxHealth:'grant a stat for the Battle',
};
const UNMAPPED = { applyBadge:'badges on enemies — content/ has no enemy badge model',
                   modifyPower:'power scaling — no equivalent in the closed effect list',
                   grantTrigger:'granting a trigger at runtime — not an effect content/ can express' };

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const gaps = [], rows = [];

// The curation - campaign, art, encounter list for the 144 someone picked - is AUTHORED
// and is NOT in enemyCards.js. It lives in its own file because a rebuild overwrote it once:
// the extractor used to read it back out of its own output, so one bad run erased it.
const curated = JSON.parse(fs.readFileSync('gen/bestiary-curation.json', 'utf8')).curation;

// 193 of the 412 are placement:'immediate-cast' with an all-zero stat block — they are
// SPELLS, not creatures (ruled 2026-08-21), and none is in the curated 144. They get their
// own file: giving a spell a movement speed is nonsense.
const spells = [];
for (const e of Object.values(ENEMY_CARDS)) {
  if (e.placement === 'immediate-cast') {
    spells.push({ id:`enemyspell.${slug(e.name)}`, uuid:e.uuid, name:e.name, rank:e.tier ?? null,
      types:e.types||[], abilities:e.abilities||[], backstory:e.backstory||null, quote:e.quote||null,
      source:'hell-tcg data/enemyCards.js — placement immediate-cast, so a spell rather than a unit.' });
    continue;
  }
  const bs = e.baseStats || {}, ported = {};
  for (const [from, to] of Object.entries(PORT)) if (typeof bs[from] === 'number') ported[to] = bs[from];
  ported.dodge = (bs.dodge || 0) * DODGE_SCALE;

  const acc = deriveAccuracy(e), mov = deriveMovement(e);
  const attacks = [], triggers = [], notes = [];
  for (const a of (e.abilities || [])) {
    const shape = TARGET[a.targeting];
    if (a.targeting && !shape) { gaps.push(`${e.name}/${a.name}: targeting "${a.targeting}" has no shape`); }
    const row = { id:`attack.${slug(e.name)}.${slug(a.name)}`, name:a.name,
                  kind:a.type||'attack', targets:shape||null,
                  damageType:a.damageType||null, damage:a.damage===('auto')?null:a.damage,
                  effects:[] };
    for (const x of (a.effects || [])) {
      if (UNMAPPED[x.action]) { gaps.push(`${e.name}/${a.name}: ${x.action} — ${UNMAPPED[x.action]}`); continue; }
      const verb = ACTION[x.action];
      if (!verb) { gaps.push(`${e.name}/${a.name}: unknown action "${x.action}"`); continue; }
      // The stat INSIDE an effect payload has to be ported too. It was not, so 50 units
      // carried "melee" and "ranged" — hell-tcg's names, which are not words HoBaT has —
      // buried in their riders while their stat blocks read correctly. Found 2026-08-21.
      const st = x.stat ? (PORT[x.stat] || x.stat) : null;
      if (st && !VOCAB_STATS.has(st)) gaps.push(`${e.name}/${a.name}: stat "${st}" is not in the vocabulary`);

      // MULTIPLE ATTACKS. hell-tcg's attackMultiple is "swing N times at random targets, each
      // at reduced damage". HoBaT already has this and does not need a repeat-attack effect:
      // it is one attack against `up to N enemies`, a shape that already exists. Ruled
      // 2026-08-21. The count and the per-hit modifier were being DROPPED on the floor — the
      // ability became a single ordinary swing and Nightmare Barrage stopped being a barrage.
      if (x.action === 'attackMultiple') {
        // Shapes keep their literal N placeholders — that is how the vocabulary stores them.
        // The actual count lives on the row, not baked into the shape string.
        const n = x.count || 2;
        row.targets = (ported.reach || 1) > 1 ? 'up to N enemies within N hexes'
                                              : 'up to N enemies within Reach';
        row.multiple = { count:n, damageModifier:x.damageModifier ?? 0 };
        row.effects.push({ effect:verb, status:null, stat:null,
                           value:x.damageModifier ?? null, target:null, multiple:n });
        continue;
      }

      row.effects.push({ effect:verb, status:STATUS[x.action]||null,
                         stat:st, value:x.value ?? x.amount ?? null, target:portTarget(x.target) });
    }
    attacks.push(row);
  }
  if (!(e.abilities || []).length) notes.push('NO ABILITIES in the source — needs one assigning from its name.');
  if ((e.abilities||[]).length && !attacks.some(a=>a.effects.length))
    notes.push('Every ability is a bare attack with no rider — a candidate for one.');

  // ------------------------------------------------------- card.triggers and specialMechanics
  // NEVER READ until 2026-08-22. The extractor opened `abilities` and nothing else, so 96 of
  // the 219 creatures looked emptier than they are and 25 of them were called "bare" and given
  // authored riders over the top of content that already existed. That is the duplication this
  // whole pass exists to undo, committed by the tool doing the undoing.
  //
  // The hook names are translated, not invented. COMBAT-DESIGN ruled turnEnd -> onActivationEnd
  // on 2026-08-15 and removed onEnter in the same edit, so onEnter content is DROPPED and
  // reported rather than quietly rehomed onto a hook that means something else.
  const HOOK_MAP = { onDeath:'onDeath', onAttack:'onAttack', onDamage:'onDamage',
                     onTakingDamage:'onTakingDamage', onKill:'onKill',
                     turnEnd:'onActivationEnd',   // sanctioned rename, 2026-08-15
                     onEnter:null };              // removed from the hook list, 2026-08-15
  let portedTriggerCount = 0;
  for (const [rawHook, list] of Object.entries(e.triggers || {})) {
    if (!Array.isArray(list) || !list.length) continue;
    if (!(rawHook in HOOK_MAP)) { gaps.push(`${e.name}: trigger hook "${rawHook}" has no equivalent`); continue; }
    const hook = HOOK_MAP[rawHook];
    if (hook === null) {
      gaps.push(`${e.name}: ${list.length} onEnter effect(s) dropped — onEnter was removed from the hook list 2026-08-15`);
      continue;
    }
    const effects = [];
    for (const x of list) {
      if (x.action === 'transformEnemy') {
        gaps.push(`${e.name}: transformEnemy — transformation CUT 2026-08-22, second forms may return as their own creatures`);
        continue;
      }
      if (UNMAPPED[x.action]) { gaps.push(`${e.name}/${rawHook}: ${x.action} — ${UNMAPPED[x.action]}`); continue; }
      const verb = ACTION[x.action];
      if (!verb) { gaps.push(`${e.name}/${rawHook}: unknown action "${x.action}"`); continue; }
      if (x.action === 'createAura') {
        gaps.push(`${e.name}/${rawHook}: createAura inside a trigger — onEnter timing, cut with the other 14`);
        continue;
      }
      const st = x.stat ? (PORT[x.stat] || x.stat) : null;
      if (st && !VOCAB_STATS.has(st)) gaps.push(`${e.name}/${rawHook}: stat "${st}" is not in the vocabulary`);
      effects.push({ effect:verb, status:STATUS[x.action] || null, stat:st,
                     value:x.value ?? x.amount ?? null, target:portTarget(x.target), ported:true });
    }
    if (effects.length) { triggers.push({ name:rawHook, hook, targets:null, effects, ported:true }); portedTriggerCount += effects.length; }
  }

  // specialMechanics. Thorns is already in the vocabulary and 7 creatures carry it; the rest
  // are hell-tcg board concepts and are reported rather than translated.
  const SM = e.specialMechanics || {};
  if (typeof SM.thorns === 'number') {
    triggers.push({ name:'Thorns', hook:'passive', targets:'self',
                    effects:[{ effect:'Thorns N', status:null, stat:null, value:SM.thorns, target:null, ported:true }],
                    ported:true });
    portedTriggerCount++;
  }
  if (SM.doubleAttackIfMelee) gaps.push(`${e.name}: doubleAttackIfMelee — re-author as an attack against "up to N enemies"`);
  if (SM.fastAttack)          gaps.push(`${e.name}: fastAttack acts on arrival — onEnter, removed 2026-08-15`);
  if (SM.attacksAllInRow)     gaps.push(`${e.name}: attacksAllInRow — ROWS do not exist on a hex board, needs re-authoring`);
  if (e.transformedName)      gaps.push(`${e.name}: transforms into "${e.transformedName}" — transformation CUT 2026-08-22`);
  if (e.attackOnEnter)        gaps.push(`${e.name}: attackOnEnter — onEnter, removed 2026-08-15`);

  const c = curated[e.uuid];
  rows.push({
    id:`unit.${slug(e.name)}`, uuid:e.uuid, name:e.name, rank:e.tier ?? null,
    types:e.types || [], placement:e.placement || null,
    ported, derivedBase:{ accuracy:acc.accuracy, movement:mov.movement, ...ENEMY_DERIVED },
    archetype:archetypeOf(e).id,
    derivedWhy:{ accuracy:acc.why, movement:mov.why },
    attacks, triggers,
    art:(c && (c.arts||[])[0]) || e.art || null,
    campaign:c ? c.campaign : null,
    encounters:c ? (c.uses||[]) : [],
    curated:!!c,
    sourceGaveTriggers: portedTriggerCount > 0,
    backstory:e.backstory || null, quote:e.quote || null,
    notes,
    source:'hell-tcg data/enemyCards.js, extracted 2026-08-21. Stats and abilities are ported, not authored.',
  });
}

// ---- RIDERS. 38 creatures came out of hell-tcg with nothing but a bare attack. gen/bestiary-
// riders.json assigns each one an effect read off its own name — Explosive Mite explodes, Soul
// Siphon drains — plus five deliberately left plain. This is the ONE authored layer over the
// port, so it is data, it is applied here, and it fails loudly rather than rotting: a rider
// naming a unit or an attack that no longer exists is a hard error, not a shrug.
{
  const R = JSON.parse(fs.readFileSync('gen/bestiary-riders.json', 'utf8'));
  const byId = new Map(rows.map(r => [r.id, r]));
  const problems = [];
  for (const [uid, spec] of Object.entries(R.units)) {
    const u = byId.get(uid);
    if (!u) { problems.push(`riders: no such unit ${uid}`); continue; }
    // A ruling can SUPERSEDE a ported trigger rather than stack on it: when the ruled
    // behaviour occupies the same hook, keeping both would double the creature up.
    for (const h of (spec.dropPortedHooks || [])) {
      const before = u.triggers.length;
      u.triggers = u.triggers.filter(x => !(x.ported && x.hook === h));
      if (u.triggers.length === before) problems.push(`riders: ${uid} has no ported "${h}" to supersede`);
    }
    for (const [atkName, effects] of Object.entries(spec.attacks || {})) {
      const a = u.attacks.find(x => x.name === atkName);
      if (!a) { problems.push(`riders: ${uid} has no attack named "${atkName}"`); continue; }
      for (const e of effects) {
        if (!VOCAB_EFFECTS.has(e.effect)) problems.push(`riders: ${uid}/${atkName} — effect "${e.effect}" is not in the vocabulary`);
        if (e.status && !VOCAB_STATUSES.has(e.status)) problems.push(`riders: ${uid}/${atkName} — status "${e.status}" is not in the vocabulary`);
        if (e.stat && !VOCAB_STATS.has(e.stat)) problems.push(`riders: ${uid}/${atkName} — stat "${e.stat}" is not in the vocabulary`);
      }
      a.effects.push(...effects.map(e => ({ effect:e.effect, status:e.status||null,
        stat:e.stat||null, value:e.value ?? null, target:e.target||null, authored:true })));
    }
    for (const t of (spec.triggers || [])) {
      for (const e of (t.effects || [])) {
        if (!VOCAB_EFFECTS.has(e.effect)) problems.push(`riders: ${uid} trigger — effect "${e.effect}" is not in the vocabulary`);
        if (e.status && !VOCAB_STATUSES.has(e.status)) problems.push(`riders: ${uid} trigger — status "${e.status}" is not in the vocabulary`);
        if (e.stat && !VOCAB_STATS.has(e.stat)) problems.push(`riders: ${uid} trigger — stat "${e.stat}" is not in the vocabulary`);
        if (e.target && !VOCAB_SHAPES.has(e.target) && !VOCAB_REFERENTS.has(e.target))
          problems.push(`riders: ${uid} trigger — target "${e.target}" is neither a shape nor a declared referent`);
      }
      if (!VOCAB_HOOKS.has(t.hook)) problems.push(`riders: ${uid} trigger — hook "${t.hook}" is not in the vocabulary`);
      u.triggers.push({ ...t, authored:true });
    }
    u.notes = (u.notes || []).filter(n => !/bare attack|NO ABILITIES/.test(n));
    u.notes.push('Rider authored 2026-08-21 from its own name: ' + spec.why);
  }
  // Corrections to what the SOURCE gave a creature: the content is right, its shape or its
  // radius was not. Applied before riders so a rider can still stack on a corrected trigger.
  for (const [uid, list] of Object.entries(R.overrides?.units || {})) {
    const u = byId.get(uid);
    if (!u) { problems.push(`overrides: no such unit ${uid}`); continue; }
    for (const o of list) {
      const tr = (u.triggers || []).filter(x => x.hook === o.hook && x.ported);
      if (!tr.length) { problems.push(`overrides: ${uid} has no ported "${o.hook}" trigger to correct`); continue; }
      for (const x of tr) {
        Object.assign(x, o.set || {});
        x.corrected = true;
        x.why = o.why;
        for (const e of (x.effects || [])) if (o.set && o.set.targets) e.target = null;  // the trigger owns the shape now
      }
      if (o.set && o.set.targets && !VOCAB_SHAPES.has(o.set.targets))
        problems.push(`overrides: ${uid} — shape "${o.set.targets}" is not in the vocabulary`);
    }
  }

  // Abilities whose SOURCE MECHANIC does not exist in HoBaT, re-authored as something that
  // does. Distinct from a rider: a rider adds to what the port produced, this replaces it,
  // and the attack row it came from is dropped.
  for (const [uid, spec] of Object.entries(R.reauthored?.units || {})) {
    const u = byId.get(uid);
    if (!u) { problems.push(`reauthored: no such unit ${uid}`); continue; }
    for (const name of (spec.drop || [])) {
      const i = u.attacks.findIndex(x => x.name === name);
      if (i < 0) { problems.push(`reauthored: ${uid} has no attack named "${name}" to drop`); continue; }
      u.attacks.splice(i, 1);
    }
    for (const t of (spec.triggers || [])) {
      if (!VOCAB_HOOKS.has(t.hook)) problems.push(`reauthored: ${uid} — hook "${t.hook}" is not in the vocabulary`);
      if (t.targets && !VOCAB_SHAPES.has(t.targets)) problems.push(`reauthored: ${uid} — shape "${t.targets}" is not in the vocabulary`);
      for (const e of (t.effects || [])) {
        if (!VOCAB_EFFECTS.has(e.effect)) problems.push(`reauthored: ${uid} — effect "${e.effect}" is not in the vocabulary`);
        if (e.status && !VOCAB_STATUSES.has(e.status)) problems.push(`reauthored: ${uid} — status "${e.status}" is not in the vocabulary`);
        if (e.stat && !VOCAB_STATS.has(e.stat)) problems.push(`reauthored: ${uid} — stat "${e.stat}" is not in the vocabulary`);
      }
      u.triggers.push({ ...t, authored:true, reauthored:true });
    }
    u.notes = (u.notes || []).filter(n => !/bare attack|NO ABILITIES/.test(n));
    u.notes.push('Re-authored 2026-08-21: its source ability used onEnter timing, which HoBaT does not have. '+ ' Now a spatial aura.');
  }

  for (const uid of (R.baselines?.units || [])) {
    const u = byId.get(uid);
    if (!u) { problems.push(`riders: no such baseline unit ${uid}`); continue; }
    u.notes = (u.notes || []).filter(n => !/bare attack|NO ABILITIES/.test(n));
    u.notes.push('BARE ON PURPOSE — one of the five plain enemies. ' + R.baselines.note);
    u.baseline = true;
  }
  if (problems.length) {
    console.error('\nRIDERS FAILED — nothing written:');
    problems.forEach(p => console.error('  ! ' + p));
    process.exit(1);
  }
}

const out = { _note:'All 412 enemies from hell-tcg data/enemyCards.js. Ruled 2026-08-21: all of them, not just the curated 144. `curated:true` marks the 144 that already had a campaign, art and an encounter list — that curation is real work and does not exist in enemyCards.js.',
  _derived:'Enemies carry accuracy, movement and zero stamina. NO crit, luck or vision — enemies do not have Vision at all. Accuracy by rank is SOFT; a sweep owns it.',
  _gaps:`${gaps.length} translation gaps — see CONTENT-GAPS.md`,
  units: rows };
fs.writeFileSync('gen/bestiary.json', JSON.stringify(out, null, 1) + '\n');
fs.writeFileSync('gen/bestiary-gaps.txt', gaps.join('\n') + '\n');
fs.writeFileSync('gen/enemy-spells.json', JSON.stringify({
  _note:'The 193 enemyCards rows with placement immediate-cast and an all-zero stat block. They are SPELLS the enemy side casts, not units placed on the board — ruled 2026-08-21. None is in the curated 144.',
  spells }, null, 1) + '\n');

// A rider can live on a trigger as easily as on an attack — Explosive Mite's whole point is an
// onDeath, and an aura hangs off nothing at all. Counting only attacks called those three bare.
const hasRider = r => r.attacks.some(a => a.effects.length) || (r.triggers || []).length > 0;
const withEff = rows.filter(hasRider).length;
console.log(`gen/bestiary.json    — ${rows.length} creatures`);
console.log(`gen/enemy-spells.json — ${spells.length} enemy spells`);
console.log(`  curated (art + encounters): ${rows.filter(r=>r.curated).length}`);
console.log(`  with at least one rider   : ${withEff}`);
console.log(`  no abilities at all       : ${rows.filter(r=>!r.attacks.length&&!(r.triggers||[]).length).length}`);
console.log(`  bare, and NOT a declared baseline: ${rows.filter(r=>!hasRider(r)&&!r.baseline).length}`);
console.log(`  bare ON PURPOSE (baselines)      : ${rows.filter(r=>r.baseline).length}`);
console.log(`  translation gaps          : ${gaps.length}  -> gen/bestiary-gaps.txt`);
