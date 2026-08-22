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
      row.effects.push({ effect:verb, status:STATUS[x.action]||null,
                         stat:x.stat||null, value:x.value ?? x.amount ?? null, target:x.target||null });
    }
    attacks.push(row);
  }
  if (!(e.abilities || []).length) notes.push('NO ABILITIES in the source — needs one assigning from its name.');
  if ((e.abilities||[]).length && !attacks.some(a=>a.effects.length))
    notes.push('Every ability is a bare attack with no rider — a candidate for one.');

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
    backstory:e.backstory || null, quote:e.quote || null,
    notes,
    source:'hell-tcg data/enemyCards.js, extracted 2026-08-21. Stats and abilities are ported, not authored.',
  });
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

const withEff = rows.filter(r => r.attacks.some(a => a.effects.length)).length;
console.log(`gen/bestiary.json    — ${rows.length} creatures`);
console.log(`gen/enemy-spells.json — ${spells.length} enemy spells`);
console.log(`  curated (art + encounters): ${rows.filter(r=>r.curated).length}`);
console.log(`  with at least one rider   : ${withEff}`);
console.log(`  no abilities at all       : ${rows.filter(r=>!r.attacks.length).length}`);
console.log(`  bare attacks, no rider    : ${rows.filter(r=>r.attacks.length&&!r.attacks.some(a=>a.effects.length)).length}`);
console.log(`  translation gaps          : ${gaps.length}  -> gen/bestiary-gaps.txt`);
