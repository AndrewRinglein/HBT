import { validateBurst } from './burst-schema.mjs';
function optionalCombatStats(row){return Object.fromEntries(['fireResist','poisonResist','shadowResist','coldResist','block','rangedBlock'].filter(k=>row[k]!==undefined).map(k=>{if(!Number.isSafeInteger(row[k]))throw Error('Invalid optional combat stat '+k);return[k,row[k]]}))}
function damageType(value){if(!['physical','magic','fire','poison','shadow','true'].includes(value))throw Error('Invalid damage type: '+String(value));return value}
function packetFields(row){
  const out={};
  if(row.armorPenetration!==undefined){
    if(!Number.isSafeInteger(row.armorPenetration)||row.armorPenetration<0||row.armorPenetration>1000000)throw Error('Invalid integer armor penetration on '+row.id);
    out.armorPenetration=row.armorPenetration;
  }
  // v2.kdb (2026-09-23, COMBAT-V2-DESIGN section 8/9.1): Impact adds to the KDB
  // comparison only; it is not damage. Integer, 0 or more; absent = 0.
  if(row.impact!==undefined){
    if(!Number.isSafeInteger(row.impact)||row.impact<0||row.impact>1000)throw Error('Invalid integer Impact on '+row.id);
    if(row.impact>0)out.impact=row.impact;
  }
  // v2.prop-destroy (2026-09-24, COMBAT-V2-DESIGN section 12.2): Destroy N applies N
  // steps to whatever is in the hex the attack strikes. Integer, 0 or more; absent = 0.
  if(row.destroy!==undefined){
    if(!Number.isSafeInteger(row.destroy)||row.destroy<0||row.destroy>1000)throw Error('Invalid integer Destroy on '+row.id);
    if(row.destroy>0)out.destroy=row.destroy;
  }
  if(row.secondaryDamage!==undefined){
    const ids=new Set(['base']),rows=row.secondaryDamage;
    if(!Array.isArray(rows)||rows.length>32)throw Error('Invalid secondary packet list on '+row.id);
    out.secondaryDamage=rows.map(p=>{
      if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==4||Object.keys(p).some(k=>!['id','when','damageType','amount'].includes(k)))throw Error('Invalid secondary packet shape on '+row.id);
      if(typeof p.id!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(p.id)||ids.has(p.id))throw Error('Duplicate or reserved packet id on '+row.id);
      if(!['hit','crit'].includes(p.when)||!['physical','magic','fire','poison','shadow','true'].includes(p.damageType)||!Number.isSafeInteger(p.amount)||p.amount<0||p.amount>1000000)throw Error('Invalid secondary packet fields on '+row.id);
      ids.add(p.id);return {...p};
    });
  }
  return out;
}
// mkenginepack.mjs — export the TEST COHORT as the engine's generated unit pack.
// Run AFTER assemble.mjs. Writes ../engine/src/content/generated/pack.ts.
//
// Ruled 2026-08-20: "we're going to read from the data and it's clearly
// differentiated text. We're not hardcoding." The engine's standard battle
// party and enemies come from HERE — the Codex pipeline — not from hand-typed
// rows. Deterministic output: same inputs, byte-identical pack.
import fs from 'fs';
import { readGround, resolvePaint } from './mkpaintedmaps.mjs';
import { compileMaps, validateEncounterBoard } from './map-schema.mjs';
import { STAT_OF, statOf } from './stat-words.mjs';
const D = JSON.parse(fs.readFileSync('hbt-content.json', 'utf8'));
// ── THE ENGINE'S VOCABULARY (plumbing.vocabulary-export, engine 2026-09-28) ────
// Read, never copied: ../engine/generated/vocabulary.json is written by the engine
// (tools/vocabulary.mts) from its own lists. Review findings C11 and C16: this file kept
// two hook sets and eight stat-word maps that disagreed (statWord had no Vision, STAT_W no
// Health, the late hero map no toughness or surge) and derived the default AI three times.
const VOCAB = JSON.parse(fs.readFileSync('../engine/generated/vocabulary.json', 'utf8'));
const ENGINE_HOOKS = new Set(VOCAB.hooks);
const FOLDABLE_STATS = new Set(VOCAB.stats), RESOLVABLE_STATS = new Set(VOCAB.resolvable);
// Codex stat word (any case) -> engine stat: THE ONE MAP, ./stat-words.mjs (kingdom.reads-engine, 2026-10-02 — the
// kingdom's item rows read it too, review finding K11). Every value is checked against the engine's export here, so a
// stat the engine renames or drops fails the build, loudly.
for (const [w, st] of Object.entries(STAT_OF)) if (!FOLDABLE_STATS.has(st)) throw new Error(`mkenginepack: STAT_OF maps '${w}' to '${st}', which is not an engine stat (../engine/generated/vocabulary.json)`);
/** The same, only when the stat pipeline can modify it at runtime (a statMod) — surge and toughness cannot. */
const modStatOf = (w) => { const st = statOf(w); return st && RESOLVABLE_STATS.has(st) ? st : undefined; };
// ── THE RULE BASES (fix.codex-numbers, 2026-10-01; DECISIONS.md 2026-09-28 "the duplication review,
// ruled", findings C1 C2 C9) ─ the engine adds a unit's crit to 3, its vision to 6, its bleedOutTurns
// to 5. The Codex authors crit and bleed-out as TOTALS (a rogue's 5, every hero's 5 turns), so a total
// is published as total − the engine's base, read from the engine's export — "Crit base 3 should be
// counted once." Vision is authored as the delta itself (0 for every class).
const RULE = VOCAB.ruleBases;
if (!RULE || ['crit', 'vision', 'bleedOutTurns'].some((k) => !Number.isSafeInteger(RULE[k]))) throw new Error('mkenginepack: ../engine/generated/vocabulary.json has no ruleBases — regenerate it (engine tools/vocabulary.mts)');
/** A Codex total as the unit's own addition over the engine's base; an absent total is the base itself. */
const overRule = (stat, total) => (total === undefined || total === null ? 0 : total - RULE[stat]);
/** A hero row's crit, vision and bleed-out, from its Codex derived and ported blocks — one place for every hero lane. */
function heroRuleStats(d, p) {
  const crit = overRule('crit', d.crit ?? p.crit), bleed = overRule('bleedOutTurns', d.bleedOutTurns ?? p.bleedOutTurns), vision = d.vision ?? p.vision ?? 0;
  return { ...(crit ? { crit } : {}), ...(vision ? { vision } : {}), ...(bleed ? { bleedOutTurns: bleed } : {}) };
}
if (!D.testCohort) { console.error('mkenginepack: no testCohort in hbt-content.json — run assemble.mjs first.'); process.exit(1); }

// Slots are authored action restrictions, independent of their effect profile.
const ACTION_SLOTS = new Set(['movement', 'primary', 'either']);
function actionSlot(row) {
  if (row.slot !== undefined && !ACTION_SLOTS.has(row.slot)) throw new Error(`invalid action slot '${row.slot}' on '${row.id ?? row.name}'`);
  if (row.free !== undefined && typeof row.free !== 'boolean') throw new Error(`invalid free action flag on '${row.id ?? row.name}'`);
  return { ...(row.slot !== undefined ? { slot: row.slot } : {}), ...(row.free !== undefined ? { free: row.free } : {}) };
}
const ACTION = { applyPoison: 'status.poison', applyBleed: 'status.bleed', applyBurn: 'status.burn' };
const TARGET = { attacked: 'target', self: 'self' };
const dropped = [];

function mapCodexTriggers(h, typeId) {
  const out = [];
  for (const [hook, rows] of Object.entries(h.triggers || {})) {
    for (const r of rows || []) {
      const statusId = ACTION[r.action];
      const select = TARGET[r.target];
      if (!ENGINE_HOOKS.has(hook) || !statusId || !select) {
        dropped.push(`${typeId}: ${hook}/${r.action} -> no engine meaning yet`);
        continue;
      }
      const t = {
        id: 'test.' + typeId.replace(/^test-/, '') + '.' + r.action.replace(/([A-Z])/g, '-$1').toLowerCase(),
        hook, chance: 100, select,
        effect: { kind: 'status.apply', statusId, value: r.value ?? 1 },
        source: 'unit.' + typeId,
      };
      if (r.onlyWithAttack) t.onlyWithAttack = r.onlyWithAttack;
      out.push(t);
    }
  }
  return out;
}

const heroes = D.testCohort.heroes.map((h) => {
  const p = h.ported || {}, d = h.derivedBase || {}, e = h.engine || {};
  return {
    typeId: h.typeId, name: h.name, side: 'hero', copyOf: h.copyOf,
    maxHp: p.health, armor: p.armor ?? 0, resist: p.resist ?? 0, ...optionalCombatStats(p),
    accuracy: d.accuracy, dodge: p.dodge ?? 0, ...(p.toughness ? { toughness: p.toughness } : {}),
    ...heroRuleStats(d, p),   // fix.codex-numbers: the cohort clones carry their source's crit too
    strength: p.strength ?? 0, precision: p.precision ?? 0, magic: p.magic ?? 0, spirit: p.spirit ?? 0,
    role: e.role, movement: d.movement, reach: p.reach ?? 0,
    maxStamina: d.staminaMax, staminaRegen: d.staminaRegen ?? 1,
    ai: e.ai, attacks: e.attacks || [], abilities: e.abilities || [],
    // fix.unit-tags (2026-09-03): `tags` is the one field; a cohort hero is a hero.
    tags: ['hero', ...(h.class ? [h.class] : [])],
    // Movement is a granted CHOICE (ruled 2026-08-21) — no default here: a
    // cohort row without moves should fail the loader, loudly.
    moves: e.moves,
    triggers: distinctTriggerIds(h.typeId, [...mapCodexTriggers(h, h.typeId), ...(e.riders || [])]),
  };
});
const enemies = D.testCohort.enemies.map((z) => { const { copyOf, ...row } = z; return { ...row, side: 'enemy', copyOf }; });

// ── THE AUTHORED ENEMIES (content.enemy-pack, 2026-08-26) ────────────────────
// The units the five prologue battles field, converted from
// gen/enemies-authored.json. Bastion-style discipline: a clause whose
// capability the engine lacks is DROPPED WITH A NAMED GAP (gaps.json beside the
// pack + the note below), never guessed at. The archer's shoot has range:null —
// content left N unstated, and the 2026-08-14 terrain lesson says REPORT, never
// invent — so the whole attack is a gap, not a number I picked.
const AUTH = JSON.parse(fs.readFileSync('gen/enemies-authored.json', 'utf8'));
const ENC = JSON.parse(fs.readFileSync('gen/encounters.json', 'utf8'));
const GROUND = readGround();   // encounter.opening.cathedral (2026-10-01): the same, plus the opening maps' cursed hexes — what a paint or remains entry may name
const gaps = [];
const gap = (unit, what, needs) => gaps.push({ unit, what, needs });

// Which units the prologue actually fields (never the whole 28 — batches).
const fielded = new Set();
(function walk(o) {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') {
    if (typeof o.unit === 'string' && o.unit.startsWith('unit.')) fielded.add(o.unit);
    Object.values(o).forEach(walk);
  }
})(ENC.prologue);

// Every attack row by id, so sameAs resolves across the whole bestiary.
const ATTACK_BY_ID = new Map();
for (const u of AUTH.units) for (const a of u.attacks || []) if (a.id) ATTACK_BY_ID.set(a.id, a);
const resolveAttack = (a, unitId) => {
  if (!a.sameAs) return a;
  const src = ATTACK_BY_ID.get(a.sameAs);
  if (!src) { gap(unitId, `sameAs ${a.sameAs} resolves to nothing`, 'content'); return null; }
  // fix.enemy-accuracy-mod (2026-09-27): a sameAs reference ships its SOURCE row;
  // anything the reference itself carries beyond its id is not read — name it,
  // never drop it silently (Law 9). None today; the Burning Zombie's carries only its id.
  // content.imp-blast-tuned (engine, 2026-10-04; ruled 2026-10-03, engine DECISIONS.md 'the Imp: Precision down by 1; its
  // Blast burns half the time'): a rider is the UNIT's (the engine carries it on the unit, scoped to the attack), so a
  // reference may restate its own `triggers` on the shared row — the Powerful Imp fires the Imp's Blast and keeps its own
  // certain Burn 2 now that the Imp's is a 50% chance. The attack itself (shape, reach, damage) is still the source row's,
  // and anything else a reference carries is still named, never read.
  const extra = Object.keys(a).filter((k) => k !== 'sameAs' && k !== 'id' && k !== 'triggers');
  if (extra.length) gap(unitId, `sameAs ${a.sameAs} carries ${extra.join(', ')} of its own — the source row ships without them`, 'content: sameAs override');
  if (a.triggers !== undefined) {
    if (!Array.isArray(a.triggers)) throw new Error(`mkenginepack: ${unitId} sameAs ${a.sameAs}: triggers is not a list`);
    return { ...src, triggers: a.triggers };
  }
  return src;
};

// The statuses a trigger or a chart row may name: exactly the Codex status rows
// the engine can EXPRESS — filled by compileStatuses() below (pack.statuses,
// 2026-09-02). Was a hand list of eight; a row the engine cannot behave for is
// a named gap, and anything naming it is a gap too.
const STATUS_OK = new Set();

const SETTLED = JSON.parse(fs.readFileSync('settled.json', 'utf8'));

// ── STATUSES (pack.statuses, 2026-09-02) ────────────────────────────────────
// The Codex owns the status rows (Andrew 2026-09-02: "Yes — Codex owns the
// rows"); the engine owns the behaviour. Each row's ONE SENTENCE (S51b: "a
// status row teaches the STATUS") compiles here into the engine's behaviour
// flags by exact phrase — compile-or-name-the-gap, like every other row. The
// engine never parses prose at runtime. A row whose sentence the engine cannot
// yet behave for is NOT emitted (an applicable status that silently does
// nothing is a Law 9 swallow) — it is a named gap, and every trigger or chart
// clause naming it becomes a gap as well.
const STATUS_SENTENCES = [
  // [exact effect sentence, flags]
  ['Deals damage equal to its value each Turn.', { tick: 'damage' }],
  ['Deals damage equal to its value each Turn and halves all healing received.', { tick: 'damage', halvesHealing: true }],
  ['Deals TRUE damage equal to its value each Turn, and healing removes half the amount healed.', { tick: 'damage', tickDamageType: 'true', shedByHealing: 'half' }],
  ['Heals the unit an amount equal to its value each Turn.', { tick: 'heal' }],
  ['Stops the unit acting \u2014 its whole Activation is skipped.', { blocksAction: true }],
  ['Stops the unit acting and blocking \u2014 its whole Activation is skipped.', { blocksAction: true, blocksBlock: true }],
  ['Prevents damage from any source.', { reducesIncomingDamage: true }],
  ['Reduces the damage the unit deals by 1 per point.', { reducesOutgoingDamage: true }],
  ["Reduces the unit's Movement by its value.", { reducesMovement: true }],
  ['Loses access to class powers.', { locksPowers: true }],
  ["Takes the unit out of its owner's control and hands it to the AI.", { aiControlled: true }],
  // 2026-09-03 — the three that were gaps: Frost, Root, Taunt (capability.frost/root/taunt)
  ['Adds its value to every physical hit the unit receives, per hit.', { addsIncomingPhysical: true }],
  ['Stops the unit moving at all.', { blocksMovement: true }],
  ['Forces the taunted unit to target whoever taunted it.', { forcesTarget: true }],
  // 2026-09-03 — Karma, Shadow, Confusion (capability.karma/shadow/confusion)
  ['Increases every heal the unit receives by its value, and every point of damage it deals by half its value.', { boostsHealingReceived: true, boostsOutgoingHalf: true }],
  ['Obliterates the unit \u2014 killed, removed, no corpse \u2014 once it reaches the unit\'s Max Health.', { obliteratesAtMaxHp: true }],
  ["Swaps the affected unit's AI strategy for a different one.", { swapsAi: true }],
  // capability.stealth (engine, 2026-09-28; ruled 2026-09-27): the settled stealth
  // definition (CODEX.md 475, 1589), one flag per clause — "cannot be seen" is
  // ai.sight's hidesFromFoes; "cannot be targeted by an attack" is untargetable (by
  // the other side); "breaks the moment you use an attack or a power, and whenever a
  // reveal effect finds you" are the three breaksOn flags. "Area effects, terrain and
  // auras all still reach you" and "moving never breaks it" are what the engine does
  // anyway: nothing reads a flag for them. On/off, and a second application does not
  // add (engine SWITCHES.md stealthStacking).
  ['You cannot be seen and cannot be targeted by an attack. Area effects, terrain and auras all still reach you. It breaks the moment you use an attack or a power, and whenever a reveal effect finds you \u2014 moving never breaks it.',
    { shape: 'flag', stacking: 'highest', hidesFromFoes: true, untargetable: true, breaksOnAttack: true, breaksOnPower: true, breaksOnReveal: true }],
];
const STATUS_GAP_NEEDS = {
  'status.root': 'a blocksMovement flag (movement 0, still acts) — capability.root',
  'status.frost': 'a per-hit incoming damage station (+N on every physical hit received) — capability.frost',
  'status.karma': 'heal-received bonus and half-value outgoing damage bonus, decay on kill — capability.karma',
  'status.taunt': 'AI targeting override (must target the taunter) — capability.taunt',
  'status.confusion': 'AI mode swap — capability.confusion',
  'status.shadow': 'a status that GROWS in Settling and obliterates at Max Health, no corpse — capability.shadow',
};
// v2.prone (2026-09-23, COMBAT-V2-DESIGN section 10): the one status sentence
// that carries NUMBERS, so it is read by exact pattern rather than exact
// string. Every clause is fixed; only the five magnitudes vary. The stand
// action it grants is the row's own `standAction` field.
const PRONE_SENTENCE = /^Knocked down: attacks against the unit gain \+(\d+) Accuracy and \+(\d+) damage and its Dodge falls by (\d+), its own attacks take -(\d+) Accuracy and -(\d+) damage, it has no zone of control, keeps its Block, still fills its hex, loses Airwalk, and cannot move until it Stands Up\.$/;
function proneFlags(r) {
  const m = PRONE_SENTENCE.exec(r.effect || '');
  if (!m) return null;
  if (typeof r.standAction !== 'string' || !/^power\./.test(r.standAction)) { gap(r.id, 'a prone row with no standAction power', 'standAction on the row'); return false; }
  const n = (i) => parseInt(m[i], 10);
  return { shape: 'flag', stacking: 'highest', prone: { accuracyAgainst: n(1), dodge: -n(3), damageAgainst: n(2), accuracy: -n(4), damage: -n(5), standAction: r.standAction } };
}
function compileStatuses(rows) {
  const out = {};
  for (const r of rows) {
    const prone = proneFlags(r);
    if (prone === false) continue;
    const hit = prone ? [r.effect, prone] : STATUS_SENTENCES.find(([s]) => s === r.effect);
    if (!hit) { gap(r.id, `status sentence not compilable: '${r.effect}'`, STATUS_GAP_NEEDS[r.id] ?? 'unparsed status sentence'); continue; }
    const flags = { ...hit[1] };
    // v2.kdb (2026-09-23): the ONE prone status a KDB "down" applies — the row says so
    if (r.kdbDown !== undefined) { if (r.kdbDown !== true || !flags.prone) { gap(r.id, 'kdbDown on a row that is not a prone status', 'kdbDown: true on the prone row only'); continue; } flags.kdbDown = true; }
    // decay: the one clock the engine has is -1 per Phase (plus Protection's
    // spend-as-it-absorbs, which the absorb station does). Anything else is
    // a gap, whatever the sentence compiled to.
    let decayPerPhase;
    if (/^-1 per Turn/.test(r.decay)) decayPerPhase = 1;
    else if (r.decay === 'Spent by the damage it prevents, and decreases by an additional 1 per Turn.') decayPerPhase = 1;
    else if (r.decay === 'No clock: -1 on a kill, and nothing else.') { decayPerPhase = 0; flags.decayOnKill = true; }   // Karma, 2026-09-03
    else if (/^It GROWS: \+1 per Turn, first of everything in Settling\. It never decays\.$/.test(r.decay)) { decayPerPhase = 0; flags.grows = 1; }   // Shadow, 2026-09-03
    else if (r.decay === 'No clock: it lasts until the unit Stands Up.' && flags.prone) decayPerPhase = 0;   // Prone, v2.prone 2026-09-23
    else if (r.decay === 'No clock: it lasts until it breaks.' && (flags.breaksOnAttack || flags.breaksOnPower || flags.breaksOnReveal)) decayPerPhase = 0;   // Stealth, capability.stealth 2026-09-28 (engine SWITCHES.md stealthNoClock)
    else { gap(r.id, `status decay not compilable: '${r.decay}'`, STATUS_GAP_NEEDS[r.id] ?? 'unparsed decay clause'); continue; }
    // tick damage type: the row's own damageType wins; "Resist mitigates each
    // tick" in the decay clause is the ruled magic tick (2026-08-27).
    if (flags.tick === 'damage' && !flags.tickDamageType) {
      if (r.damageType) flags.tickDamageType = damageType(r.damageType);
      else { gap(r.id, 'a damage tick with no damage type', 'damageType on the row'); continue; }
    }
    // the engine's shape word is derived from the behaviour; the Codex family
    // rides along verbatim.
    if(flags.tickDamageType)damageType(flags.tickDamageType);
    const shape = flags.shape ?? (flags.reducesIncomingDamage ? 'pool' : flags.reducesOutgoingDamage ? 'modifier' : 'counter');
    // rule.burn-frost-cancel: the row's application clause, exact phrase, sets `cancels` on BOTH rows
    const cancels = /Burn and Frost annihilate one for one on application/.test(r.application || '') ? { cancels: 'status.burn' } : {};
    out[r.id] = { id: r.id, name: r.name, shape, family: r.family ?? r.shape, stacking: 'add', decayPerPhase, ...flags, ...cancels };
    STATUS_OK.add(r.id.replace(/^status\./, ''));
  }
  return out;
}
const statuses = compileStatuses(SETTLED.statuses || []);
if (statuses['status.frost']?.cancels === 'status.burn' && statuses['status.burn']) statuses['status.burn'].cancels = 'status.frost';   // one rule, both rows

// ── MOVEMENT POWERS (pack.moves, 2026-09-02) ────────────────────────────────
// The eleven `movementAction` power rows compile into the engine's MoveDef
// shape by exact phrase, the way attacks and item powers do: the structured
// fields (stamina, cooldown) are read as numbers, the description's fixed
// sentences give the shape, the range and the riders, and a description the
// table cannot read is a named gap — never a guessed row. The prose is also
// cross-checked against the numbers ("Costs no Stamina" must mean stamina 0):
// a disagreement is a content finding, reported as a gap.
const MOVE_SHAPES = [
  [/^Move up to your Movement, hex by hex/, { shape: 'path', budgetMod: 0 }],
  [/^Move exactly (\d) hex(?:es)? in any direction\./, (m) => ({ shape: 'sidestep', stepRange: parseInt(m[1], 10), budgetMod: 0 })],
  [/^Do not move at all\./, { shape: 'sidestep', stepRange: 0, budgetMod: 0 }],
  [/^A bonus move: zero movement/, { shape: 'sidestep', stepRange: 0, budgetMod: 0 }],
  [/^Movement action\. Move up to your Movement(?: ([+-]) (\d))?, 1 Movement per hex, passing over units and obstructions/, (m) => ({ shape: 'flight', budgetMod: m[1] ? (m[1] === '+' ? 1 : -1) * parseInt(m[2], 10) : 0 })],
  [/^A full movement action: move up to your Movement \+(\d)/, (m) => ({ shape: 'path', budgetMod: parseInt(m[1], 10) })],
];
const MOVE_RIDERS = [
  [/You gain \+(\d) Strength until the end of the Turn\./, (m) => ({ kind: 'statMod', stat: 'strength', value: parseInt(m[1], 10), until: 'endOfTurn' })],
  [/(?:^|\. )Gain (\d) Stamina\./, (m) => ({ kind: 'stamina.gain', value: parseInt(m[1], 10), who: 'self' })],
  // v2.prone (2026-09-23): "Stand up from Prone." — legal only while prone (the engine's rule for a stand effect)
  [/(?:^|\. )Stand up from Prone\./, () => ({ kind: 'stand' })],
  [/Lose (\d) Stamina Max for the rest of the Battle, and gain (\d) Stamina\./, (m) => [{ kind: 'loseMaxStamina', value: parseInt(m[1], 10) }, { kind: 'stamina.gain', value: parseInt(m[2], 10), who: 'self' }]],
  // C20 (engine fix.one-effect-vocabulary, 2026-10-01): the one duration set says end of Activation — this was a MOVE_GAP
  [/gain \+(\d) Strength until the end of your Activation/, (m) => ({ kind: 'statMod', stat: 'strength', value: parseInt(m[1], 10), until: 'endOfActivation' })],
  // movement.back-flip (engine, 2026-10-04): "You gain +20 Dodge until the end of your next Activation." — the
  // lifetime Raise Guard's sentence already compiles to (endOfNextActivation), on a move's rider; the mover's own.
  [/You gain \+(\d+) Dodge until the end of your next Activation\./, (m) => ({ kind: 'statMod', stat: 'dodge', value: parseInt(m[1], 10), until: 'endOfNextActivation' })],
];
const MOVE_GAPS = [
  [/gain (\d) Faith/, 'no Faith quantity in the engine'],
];
function compileMoves(powers) {
  const out = {};
  for (const p of powers.filter((x) => x.movementAction)) {
    const d = p.description || '';
    let base = null;
    for (const [re, mk] of MOVE_SHAPES) { const m = d.match(re); if (m) { base = typeof mk === 'function' ? mk(m) : { ...mk }; break; } }
    if (!base) { gap(p.id, `movement description not compilable: '${d.slice(0, 60)}…'`, 'unparsed movement sentence'); continue; }
    const needs = MOVE_GAPS.map(([re, why]) => (re.test(d) ? why : null)).filter(Boolean);
    if (needs.length) { gap(p.id, `${p.name}: ${d.slice(0, 70)}…`, needs.join('; ')); continue; }
    const effects = [];
    for (const [re, mk] of MOVE_RIDERS) { const m = d.match(re); if (m) { const e = mk(m); effects.push(...(Array.isArray(e) ? e : [e])); } }
    // capability.move-ignores-zoc (engine, 2026-09-28): "Ignores zones of control" is a
    // property of the WALK (ENEMY-REVIEW.md:276, "the move-WITHOUT-provoking machinery, as
    // a property of their movement") — MoveProfile.ignoresZoc. A walk only: a sidestep
    // already provokes nothing, and flight has its own rule. A row that also says it
    // provokes normally disagrees with itself.
    if (/Ignores zones of control/.test(d)) {
      if (base.shape !== 'path') { gap(p.id, `says 'Ignores zones of control' on a ${base.shape} move`, 'ignoresZoc is a walk\'s property (path-shaped only)'); continue; }
      if (/Provokes attacks of opportunity normally/.test(d)) { gap(p.id, `says 'Ignores zones of control' and 'Provokes attacks of opportunity normally'`, 'content disagrees with itself'); continue; }
      base.ignoresZoc = true;
    }
    // prose vs numbers — the row must agree with itself
    if (/Costs no Stamina|costs no Stamina/.test(d) && p.stamina !== 0) { gap(p.id, `says 'Costs no Stamina' but stamina is ${p.stamina}`, 'content disagrees with itself'); continue; }
    const costM = d.match(/[Cc]osts (\d) Stamina/); if (costM && parseInt(costM[1], 10) !== p.stamina) { gap(p.id, `says 'Costs ${costM[1]} Stamina' but stamina is ${p.stamina}`, 'content disagrees with itself'); continue; }
    if (/there is no cooldown/.test(d) && p.cooldown !== 0) { gap(p.id, `says 'no cooldown' but cooldown is ${p.cooldown}`, 'content disagrees with itself'); continue; }
    if (/usable every other Turn/.test(d) && p.cooldown !== 1) { gap(p.id, `says 'every other Turn' but cooldown is ${p.cooldown}`, 'content disagrees with itself'); continue; }
    const cdM = d.match(/a cooldown of (\d+)/); if (cdM && parseInt(cdM[1], 10) !== p.cooldown) { gap(p.id, `says 'a cooldown of ${cdM[1]}' but cooldown is ${p.cooldown}`, 'content disagrees with itself'); continue; }
    out[p.id] = { id: p.id, name: p.name, ...actionSlot(p), ...base, ...(effects.length ? { effects } : {}), staminaCost: p.stamina, cooldown: p.cooldown };
  }
  return out;
}
const moves = compileMoves(SETTLED.powers || []);
// THE GENERAL POOL (movement.back-flip, engine, 2026-10-04; levels.rules.draft: "Each power grant offers
// three: two from the specialty, one from the general pool"). A power row's `generalPoolOf` names the
// classes whose general pool it is in; the pack carries the pool by class — pack.generalPool — in the
// order the rows are authored. A general-pool power is never also that class's from the start, and a
// row the pack does not carry (a movement power that did not compile) is in no pool: it is a named gap.
function compileGeneralPool(powers, compiled) {
  const out = {};
  for (const p of powers) {
    if (p.generalPoolOf === undefined) continue;
    if (!Array.isArray(p.generalPoolOf) || !p.generalPoolOf.length || p.generalPoolOf.some((c) => typeof c !== 'string' || !/^class\.[a-z-]+$/.test(c)) || new Set(p.generalPoolOf).size !== p.generalPoolOf.length)
      throw new Error(`settled.json: ${p.id} generalPoolOf must list class.* ids, each once`);
    for (const c of p.generalPoolOf) {
      if (!(D.classes || []).some((k) => k.id === c)) throw new Error(`settled.json: ${p.id} is in the general pool of '${c}', which is not a class`);
      if ((p.grantedToClasses || []).includes(c)) throw new Error(`settled.json: ${p.id} is in ${c}'s general pool AND granted to it from the start — one or the other`);
    }
    if (!compiled[p.id]) { gap(p.id, `in the general pool of ${p.generalPoolOf.join(', ')} but the pack carries no row for it`, 'general pool: the power did not compile'); continue; }
    for (const c of p.generalPoolOf) (out[c] = out[c] || []).push(p.id);
  }
  return out;
}
const generalPool = compileGeneralPool(SETTLED.powers || [], moves);
// The hooks the engine fires are the engine's list (ENGINE_HOOKS, read from its vocabulary).
const TRIG_HOOKS = ENGINE_HOOKS;
// The hooks whose firing is the ATTACKER's own attack (engine COMBAT-SEQUENCE.md "Triggers": onAttack, onMiss, onHit,
// onCrit and onDamage belong to the attacker, onKill to the killer; the engine fires each with the attack as its cause).
// onBlock is the attacker's only in its 'attacker' role, read where it is asked.
const ATTACKER_HOOKS = new Set(['onAttack', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill']);

// ── BADGES (badge.mechanism, 2026-09-04) ───────────────────────────────────
// Ruled 2026-09-04: badges are an engine type — the Hero badge, Wounded, the
// afflictions (Lycanthropy, Vampirism, Possession) and whatever else a row
// grants. The Codex's badge rows are PROSE payloads ("+2 Str, +2 Move, −5
// Crit · `startOfBattle`: regeneration 5"); this compiles the clauses the
// engine can express — stat modifiers, granted powers, the deployment and
// deathbed flags — and names every other clause as a gap, compile-or-name-
// the-gap like every row. Nothing is invented: a clause that does not parse
// is a gap, never a guess.
// (the badge's stat words are STAT_OF, above — one map)   // DBF (Deathbed Fighting) is derived from Toughness today, not a stat the engine folds — a +N DBF clause stays a named gap until it is
// v2.kdb (2026-09-23, COMBAT-V2-DESIGN section 9.5): Stand Firm "cannot be knocked
// back or down", Agile "cannot be knocked down", Immovable "immune to knockback".
// Longest phrase first is not needed: the three prefixes are distinct.
const BADGE_FLAGS = { 'blocks deployment': 'blocksDeployment', 'cannot be knocked back or down': ['cannotBeKnockedBack', 'cannotBeKnockedDown'], 'cannot be knocked down': 'cannotBeKnockedDown', 'immune to knockback': 'cannotBeKnockedBack' };
// Flags a row may declare STRUCTURALLY. Prose cannot express these — "invisible; no stats;
// one flag" has no clause to parse — so the row carries `flags: { bleedsOut: true }` and the
// converter trusts it. Engine handoff 2026-09-04: "Flags other than blocksDeployment need a
// structured field on the row." A flag not on this list is a gap, never a guess.
// rule.immunity-is-resistance (2026-09-29, Andrew, engine DECISIONS.md 'the Ghost possesses on its Attack at 15%; every
// resistance works the one way, and it replaces immunity'): "Every type of resistance should work the same. Replaces previous
// immunity" — COMBAT-V2-DESIGN §8.2 (one resist, both forms) and the V2 migration's "elemental immunity becomes flat named
// resistance", one for one. "Immune [to] <element or its status> [N]" is +N of the element's resist, +1 with no number (the
// necklaces). A status names its element: Burn is Fire's, Frost is Cold's, Poison is Poison's. A status with no element
// (Karma, Weak) has no resist — a named gap. Replaces rule.badge-immunity's status-refusing immunity (removed).
const ELEMENT_RESIST = { fire: 'fireResist', burn: 'fireResist', cold: 'coldResist', frost: 'coldResist', poison: 'poisonResist' };
const BADGE_FLAGS_STRUCTURED = new Set(['bleedsOut', 'wounded', 'blocksDeployment', 'cannotBeKnockedBack', 'cannotBeKnockedDown']);
// rule.afflictions-at-zero (2026-10-02; engine DECISIONS.md 2026-10-01 'the afflictions at 0 Health'): what an affliction
// does at 0 Health (`atZero`) and a badge that stacks (`stacks`, Fragile) compile onto the badge as data the engine's settle
// reads — named gaps (content.afflictions-at-zero) until the engine built them. The compiled row carries the structured
// facts — whether the Deathbed roll is made, the unit the hero transforms into on a Luck roll, the unit raised and its
// side, the badge gained — and, since engine fix.affliction-pop-up-words (2026-10-04; engine DECISIONS.md 2026-10-03 'the
// affliction pop-up's 0-Health words and its drawbacks come from the engine'), the ruled `text` itself, word for word:
// the engine says it on badge.gained and the pop-up prints it. A field the engine does not read is refused, never passed.
const AT_ZERO_FIELDS = new Set(['deathbedFighting', 'transformsInto', 'luckRoll', 'raises', 'raisedSide', 'gains', 'text']);
function compileAtZero(row) {
  const out = {};
  if (row.stacks === true) out.stacks = true;
  const z = row.atZero;
  if (z === undefined) return out;
  for (const k of Object.keys(z)) if (!AT_ZERO_FIELDS.has(k)) throw new Error(`badge ${row.id}: atZero carries '${k}', which the engine does not read`);
  if (typeof z.deathbedFighting !== 'boolean') throw new Error(`badge ${row.id}: atZero.deathbedFighting must say whether the Deathbed roll is made`);
  if (z.transformsInto !== undefined && (typeof z.transformsInto !== 'string' || z.luckRoll !== true)) throw new Error(`badge ${row.id}: atZero.transformsInto names a unit and rolls Luck`);
  if (z.raises !== undefined && (typeof z.raises !== 'string' || !['hero', 'enemy'].includes(z.raisedSide))) throw new Error(`badge ${row.id}: atZero.raises names a unit and the side it stands on`);
  if (z.gains !== undefined && typeof z.gains !== 'string') throw new Error(`badge ${row.id}: atZero.gains names a badge`);
  out.atZero = { deathbedFighting: z.deathbedFighting,
    ...(z.transformsInto !== undefined ? { transformsInto: z.transformsInto, luckRoll: true } : {}),
    ...(z.raises !== undefined ? { raises: z.raises, raisedSide: z.raisedSide } : {}),
    ...(z.gains !== undefined ? { gains: z.gains } : {}),
    ...(z.text !== undefined ? { text: (() => { if (typeof z.text !== 'string' || !z.text.trim()) throw new Error(`badge ${row.id}: atZero.text is the ruled 0-Health wording, a sentence`); return z.text; })() } : {}) };
  return out;
}
// engine fix.affliction-pop-up-words (2026-10-04): which of a badge's written terms are DRAWBACKS — the Codex row's own marks
// (`drawbacks: { stats, terms }`), compiled beside the modifiers and the gaps they point into: `mods` names stats the
// compiled row lowers, `gaps` names terms the compiled row writes. A mark that points at nothing — a stat the row does not
// lower, a term it does not write — stops the build: the pop-up would show a drawback the unit does not have.
function compileDrawbacks(row, mods, gaps) {
  const d = row.drawbacks;
  if (d === undefined) return {};
  if (!row.atZero) throw new Error(`badge ${row.id}: drawbacks are an affliction's (a row with a 0-Health rule)`);
  for (const k of Object.keys(d)) if (!['stats', 'terms'].includes(k)) throw new Error(`badge ${row.id}: drawbacks carries '${k}'; it names stats and terms`);
  const stats = d.stats ?? [], terms = d.terms ?? [];
  for (const s of stats) if (!(typeof mods[s] === 'number' && mods[s] < 0)) throw new Error(`badge ${row.id}: drawbacks names the stat '${s}', which the row does not lower`);
  for (const t of terms) if (!gaps.includes(t)) throw new Error(`badge ${row.id}: drawbacks names the term '${t}', which the row does not write`);
  for (const [s, n] of Object.entries(mods)) if (n < 0 && !stats.includes(s)) throw new Error(`badge ${row.id}: lowers '${s}' and does not mark it a drawback`);
  return { drawbacks: { mods: [...stats], gaps: [...terms] } };
}
function compileBadge(row) {
  const mods = {}; const grants = []; const flags = {}; const gaps = [];
  const atZero = compileAtZero(row);
  // STRUCTURED FIELDS WIN, and they suppress the prose-only gap. A row that states its
  // numbers as data is finished; parsing its payload again could only disagree with itself.
  // Deathbed Fighting REVERSED, 2026-09-04: badge.hero and badge.wounded are the two rows
  // the engine waits on, and neither can be written as a "+N Stat" clause.
  // OPT-IN, not inferred. 148 existing rows already carry a statModifiers array ALONGSIDE a
  // prose payload that still has clauses to parse (badge.aura-of-courage: statModifiers [] plus
  // an aura clause that must stay a named gap). Treating any statModifiers array as "this row is
  // data" would silently re-compile all of them. The row says so, or it does not.
  if (row.payloadIsData === true) {
    for (const m of (row.statModifiers || [])) {
      const st = statOf(m.stat) ?? m.stat;
      if (!st || typeof m.value !== 'number') { gaps.push('statModifiers entry ' + JSON.stringify(m)); continue }
      if ((m.op ?? 'add') !== 'add') { gaps.push('statModifiers op ' + m.op + ' (only add is compiled)'); continue }
      mods[st] = (mods[st] ?? 0) + m.value;
    }
    for (const [k, v] of Object.entries(row.flags || {})) {
      if (!BADGE_FLAGS_STRUCTURED.has(k)) { gaps.push('unknown flag ' + k); continue }
      if (v) flags[k] = true;
    }
    for (const g of (row.grants || [])) grants.push(g);
    return { id: row.id, name: row.name, statModifiers: mods, grants, flags, ...atZero, ...(gaps.length ? { gaps } : {}), ...compileDrawbacks(row, mods, gaps) };
  }
  const payload = String(row.payload || '').replace(/\*\*/g, '');
  // rule.badge-deathbed-fighting (2026-09-29, Andrew, engine DECISIONS.md 'Possession's Surge loads at fielding;
  // ... Deathbed Fighting ... built'): "+N Deathbed Fighting" / "Deathbed Fighting +N" is the holder's own
  // points on the Deathbed chance. Not on an aura row — there the points are the allies' (a comma would split
  // "allies +2 health, +15 Deathbed Fighting" and hand the aura's number to its carrier): named, not guessed.
  let deathbed = 0;
  const auraRow = /\baura\b/i.test(payload);
  if (!payload || /prose only/i.test(payload)) gaps.push(payload ? 'payload is prose only — the numbers are owed' : 'no payload');
  // fix.codex-numbers (2026-10-01): a sentence is a clause too — "Turns to Bleed out -3.  Deathbed +40.   OTD: …" (Death Seeker)
  else for (const raw of payload.split(/\s*[·;]\s*|,\s*(?![^()]*\))|\.\s+/)) {
    const clause = raw.trim(); if (!clause) continue;
    let m;
    // fix.codex-numbers (C9): "Deathbed +40" (Death Seeker), "deathbed +20" (Survivor) are the same points, spelled short
    if (!auraRow && ((m = clause.match(/^([+−-]\s*\d+)\s+Deathbed(?: Fighting)?$/i)) || (m = clause.match(/^Deathbed(?: Fighting)?\s*([+−-]\s*\d+)$/i)))) {
      deathbed += parseInt(m[1].replace('−', '-').replace(/\s+/g, ''), 10); continue;
    }
    // fix.codex-numbers (C9): "Turns to Bleed out -3" (Death Seeker), "3 extra turns to bleed out" (Survivor, Thick Blooded)
    if (!auraRow && ((m = clause.match(/^Turns to Bleed out\s*([+−-]\s*\d+)$/i)) || (m = clause.match(/^(\d+) extra turns to bleed out$/i)))) {
      mods.bleedOutTurns = (mods.bleedOutTurns ?? 0) + parseInt(m[1].replace('−', '-').replace(/\s+/g, ''), 10); continue;
    }
    if ((m = clause.match(/^([+−-]\s*\d+)\s+(.+)$/))) {
      const v = parseInt(m[1].replace('−', '-').replace(/\s+/g, ''), 10);
      // "+1 S, P, reach, H" — one number, several stats
      const words = m[2].split(/\s*,\s*|\s+and\s+/).map((w) => w.trim().toLowerCase());
      let ok = true;
      // a badge's Deathbed points ride its own field, read at the roll (engine SWITCHES.md deathbedBadgePoints) — never a folded stat
      for (const w of words) { const st = statOf(w); if (!st || st === 'deathbedFighting') { ok = false; break } }
      if (ok) { for (const w of words) { const st = statOf(w); mods[st] = (mods[st] ?? 0) + v } continue }
    }
    if ((m = clause.match(/^grants\s+`?(power\.[a-z0-9.-]+)`?$/i))) { grants.push(m[1]); continue }
    // v2.thorns (COMBAT-V2 §9.4): "Thorns N" is the `thorns` stat, nothing conditional.
    if ((m = clause.match(/^Thorns (\d+)$/))) { mods.thorns = (mods.thorns ?? 0) + parseInt(m[1], 10); continue }
    const fl = Object.keys(BADGE_FLAGS).find((k) => clause.toLowerCase().startsWith(k));
    if (fl) { for (const f of [BADGE_FLAGS[fl]].flat()) flags[f] = true; if (clause.length > fl.length) gaps.push(clause); continue }
    if (!auraRow && (m = clause.match(/^immunen?\s+(?:to\s+)?([A-Za-z]+)(?:\s*\([^)]*\))?(?:\s+(\d+))?$/i)) && ELEMENT_RESIST[m[1].toLowerCase()]) {
      const st = ELEMENT_RESIST[m[1].toLowerCase()];
      mods[st] = (mods[st] ?? 0) + (m[2] ? parseInt(m[2], 10) : 1); continue;
    }
    gaps.push(clause);   // hooks (`startOfBattle`: …), class locks, "lifts on rescue" — named, not guessed
  }
  // the engine's deathbed stat rides the modifiers map under its own name
  const out = { id: row.id, name: row.name, statModifiers: mods, grants, flags, ...(deathbed ? { deathbedFighting: deathbed } : {}),
    ...atZero, ...(gaps.length ? { gaps } : {}), ...compileDrawbacks(row, mods, gaps) };
  return out;
}
const badges = {};
for (const row of (D.badges || []).filter((b) => b && b.id && b.id.startsWith('badge.'))) badges[row.id] = compileBadge(row);

// Capabilities the engine HAS now — a row naming one of these is not gapped for it.
// capability.power: capability.power-pool, 2026-09-03.
// capability.enemy-action-cooldown: 2026-09-03.
const HAVE = new Set(['capability.power', 'capability.enemy-action-cooldown', 'capability.corpses', 'capability.ground-layers', 'capability.target-stamina-loss', 'capability.inflict-affliction']);   // 2026-09-03; inflict-affliction 2026-09-04 (badge.afflictions)
// ── TRIGGER IDS ARE DISTINCT WITHIN A ROW (engine fix.trigger-ids-and-scopes, 2026-10-04) ───────────────────────────
// A trigger's id is trigger.<row>.<name> (the name the row gives it, else what it does). Two triggers of one row could
// share it: the Fire Imp's end-of-Activation burn and its Blast's on-hit burn were both trigger.fire-imp.burn, so the
// log, the kill switch and the viewer could not tell them apart (ten bestiary rows, one item). The rule, applied to
// every row's own list — where two or more of a row would share an id, they are told apart by, in this order:
//   1. the attack a trigger is scoped to (its id's last word), as a move's riders are already named for their move
//      (below: "a Close Bite's burn is never the same trigger id as the Bite's") — trigger.fire-imp.burn.blast;
//      a trigger with no attack scope keeps the plain id;
//   2. the hook it fires on — trigger.demon-hound.regeneration.on-taking-damage;
//   3. what it does — trigger.shadow-sorcerer.dragged-under.root.
// A part that does not tell a group apart is not added, so a row with nothing shared keeps every id it had. What the
// rule cannot tell apart FAILS THE BUILD (the same check runs over the whole pack before it is written).
// An id is still shared BETWEEN rows where one row is a copy of another (a derived or enchanted item and its base,
// a test unit and the unit it is a delta over): the engine's identity for a trigger is its id AND its source.
function triggerHookWord(t) { return String(t.hook).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + (t.role ? '-' + t.role : ''); }
function triggerEffectWord(t) {
  const e = t.effect || {};
  const word = e.kind === 'layer.paint' ? 'paint-' + String(e.layer).replace(/^layer\./, '')
    : e.statusId ?? e.badgeId ?? e.stat ?? e.unit ?? e.kind;
  return String(word).replace(/^(status|badge|unit)\./, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}
// (functions, not a const: the first rows are compiled above this line, and a declaration is hoisted)
function triggerAttackWord(t) { return t.onlyWithAttack ? String(t.onlyWithAttack).split('.').pop() : ''; }
function sharedTriggerIds(triggers) { const seen = new Set(), twice = new Set(); for (const t of triggers || []) (seen.has(t.id) ? twice : seen).add(t.id); return [...twice]; }
function refuseSharedTriggerIds(rowId, triggers) {
  const twice = sharedTriggerIds(triggers);
  if (twice.length) throw new Error(`mkenginepack: '${rowId}' holds two triggers under one id, '${twice[0]}' — the naming rule (the attack, the hook, the effect) cannot tell them apart; name one on its row`);
}
function distinctTriggerIds(rowId, triggers) {
  const out = triggers.map((t) => ({ ...t }));
  for (const part of [triggerAttackWord, triggerHookWord, triggerEffectWord]) {
    const groups = new Map();
    for (const t of out) { if (!groups.has(t.id)) groups.set(t.id, []); groups.get(t.id).push(t); }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const words = group.map(part);
      if (new Set(words).size < 2) continue;   // this part does not tell them apart
      group.forEach((t, i) => { if (words[i]) t.id = `${t.id}.${words[i]}`; });
    }
  }
  refuseSharedTriggerIds(rowId, out);
  return out;
}
// engine capability.unit-trigger-with-tag (2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: … a trigger on the
// hero with a tag requirement …': "That trigger could have a tag requirement like melee … and then it only triggers when you're
// using something that has the tag melee."): a trigger row may say `attackTag: '<tag>'` — it fires only for an attack that
// carries that tag (the engine's Trigger.onlyWithTag, read where onlyWithAttack is). One word, the same on a unit's row, an
// attack's rider, a hero's kit and an item's row; a tag the Codex's vocabulary does not hold FAILS THE BUILD (below, over the
// whole pack). Unstated: every attack, as before.
function tagScopeOf(t) { return t.attackTag !== undefined ? { onlyWithTag: t.attackTag } : {}; }
function compileTrigger(t, unitId, attackId) {
  return compileTriggerRows(t, unitId, attackId).map((x) => ({ ...x, ...tagScopeOf(t) }));
}
function compileTriggerRows(t, unitId, attackId) {
  const where = attackId ?? '(unit)';
  const needs = (t.needs || []).filter((n) => !HAVE.has(n));
  if (needs.length) { gap(unitId, `${where} ${t.hook}: ${t.effects?.map((e) => e.effect).join('; ')}`, needs.join(',')); return []; }
  if (!TRIG_HOOKS.has(t.hook)) { gap(unitId, `${where} hook '${t.hook}'`, t.hook === 'aura' ? 'hook: aura' : 'hook: ' + t.hook + ' (declared, engine never fires it)'); return []; }
  // capability.auras (2026-09-03): area targets compile to the ONE targeting
  // vocabulary — "allies within N hexes" → {area, ally, radius N, origin self};
  // the "tag Undead" condition → requireTags. A null range stays a gap.
  let areaSelect = null;
  if (t.targets && /within/.test(t.targets)) {
    if (t.range === null || t.range === undefined) { gap(unitId, `${where} ${t.hook} area '${t.targets}' — range null, N never stated`, 'content: range unstated'); return []; }
    // fix.fire-imp-burn-spares-self (engine, 2026-10-04; ruled 2026-10-03, engine DECISIONS.md 'the Fire Imp's burn does not
    // hit the imp itself': "It should not hit him."): "every OTHER unit within N hexes" is the excluding-self form of the one
    // area shape "every unit within N hexes" — the same area, any side, with the engine's `excludeSelf` on it (core/target.ts).
    // One phrase, read here and by audit.mjs R27; any row may author it.
    const others = /^every other unit within /.test(t.targets);
    const side = /^allies/.test(t.targets) ? 'ally' : /^enemies/.test(t.targets) ? 'enemy' : /^every unit/.test(t.targets) || others ? 'any' : null;
    if (!side) { gap(unitId, `${where} ${t.hook} area '${t.targets}'`, 'area trigger select'); return []; }
    const tagM = String(t.condition || '').match(/^the target has tag ([A-Za-z]+)$/);
    if (t.condition && !tagM) { gap(unitId, `${where} ${t.hook}: condition '${t.condition}'`, 'trigger condition'); return []; }
    areaSelect = { select: 'area', side, radius: t.range, origin: 'self', ...(others ? { excludeSelf: true } : {}), ...(tagM ? { requireTags: [tagM[1].toLowerCase()] } : {}) };
  }
  const out = [];
  for (const ef of t.effects || []) {
    const efNeeds = (ef.needs || []).filter((n) => !HAVE.has(n));
    if (efNeeds.length) { gap(unitId, `${where} ${t.hook}: ${ef.effect}`, efNeeds.join(',')); continue; }
    if (ef.condition || (t.condition && !areaSelect)) { gap(unitId, `${where} ${t.hook}: ${ef.effect} — condition '${ef.condition || t.condition}'`, 'trigger condition'); continue; }
    if (ef.effect === 'apply a status' && STATUS_OK.has(ef.status)) {
      // chance absent = certain. Splitting a multi-effect trigger is only safe
      // when nothing rolls; at chance<100 the halves would diverge on the die.
      if ((t.effects.length > 1) && (t.chance ?? 100) !== 100) { gap(unitId, `${where} ${t.hook}: multi-effect at chance ${t.chance}`, 'multi-effect rolled trigger'); return []; }
      // FINDING 39 (2026-09-04, the log-invariant audit): this line read the HOOK
      // before the row — every onTakingDamage status went to 'target', which on
      // that hook is the ATTACKER, so the Oathblade's Second Wind and Brace and
      // the Air Mage's Arcane Ward landed on the zombie that clawed them (644
      // times in 220 battles). The row's own `target` wins; the hook only
      // decides what an unstated target means.
      const select = areaSelect ?? (ef.target === 'self' ? 'self' : ef.target === 'the attacker' ? 'target' : 'target');
      // capability.power-pool (2026-09-03): a status whose value scales off Power — base + share
      const value = ef.powerScale ? { scale: 'power', base: ef.value ?? 0, mult: ef.powerScale } : (ef.value ?? 1);
      const trig = {
        id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || ef.status).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? 100, select,
        effect: { kind: 'status.apply', statusId: 'status.' + ef.status, value },
        source: unitId,
      };
      if (attackId) trig.onlyWithAttack = attackId;
      out.push(trig);
    } else if (ef.effect === 'inflict an affliction' && typeof ef.affliction === 'string') {
      // badge.afflictions (2026-09-04): "Vampires, werewolves, and undead sometimes
      // afflict their targets with a badge." The bestiary's `affliction` names
      // the badge row (badge.<affliction>); one that has no row is a gap, not a guess.
      const badgeId = 'badge.' + ef.affliction;
      if (!badges[badgeId]) { gap(unitId, `${where} ${t.hook}: inflict an affliction '${ef.affliction}' — no badge row ${badgeId}`, 'content: badge row unauthored'); continue; }
      if ((t.effects.length > 1) && (t.chance ?? 100) !== 100) { gap(unitId, `${where} ${t.hook}: multi-effect at chance ${t.chance}`, 'multi-effect rolled trigger'); return []; }
      // content.afflictions-revised (2026-09-29, Andrew, engine DECISIONS.md 'the four afflictions'):
      // "when the affliction of Vampirism happens, it grants both Cold Heart and Vampirism." The
      // affliction's own row names what comes with it (`inflictedWith`); one roll grants them all.
      const withBadgeIds = (D.badges.find((b) => b && b.id === badgeId)?.inflictedWith) || [];
      const missingWith = withBadgeIds.filter((w) => !badges[w]);
      if (missingWith.length) { gap(unitId, `${where} ${t.hook}: inflict '${ef.affliction}' with ${missingWith.join(', ')} — no badge row`, 'content: badge row unauthored'); continue; }
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'afflict-' + ef.affliction).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? ef.chance ?? 100, select: 'target', effect: { kind: 'badge.grant', badgeId, ...(withBadgeIds.length ? { withBadgeIds: [...withBadgeIds] } : {}) }, source: unitId, ...(attackId ? { onlyWithAttack: attackId } : {}) });
    } else if (ef.effect === 'heal' && typeof ef.value === 'number') {
      // capability.auras (2026-09-03): the Necromancer's EOA pulse — heal N to the area
      if ((t.effects.length > 1) && (t.chance ?? 100) !== 100) { gap(unitId, `${where} ${t.hook}: multi-effect at chance ${t.chance}`, 'multi-effect rolled trigger'); return []; }
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'heal').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? 100, select: areaSelect ?? (ef.target === 'self' ? 'self' : 'target'),
        effect: { kind: 'heal', amount: ef.value }, source: unitId, ...(attackId ? { onlyWithAttack: attackId } : {}) });
    } else if (ef.effect === 'raise a corpse as a Zombie') {
      // capability.corpses (2026-09-03): the Necromancer's Raise. fix.raise-range (2026-09-28;
      // ruled 2026-09-27, Andrew, engine DECISIONS.md 'the Necromancer's Raise reaches 10'):
      // the reach is the trigger's OWN range, read from the row — never a converter
      // constant (the retired corpseRaiseRadius compiled 2 here). A Raise row that states
      // no range is a named gap, never a default.
      const reach = ef.range ?? t.range;
      if (!Number.isSafeInteger(reach) || reach < 0) { gap(unitId, `${where} ${t.hook}: raise a corpse as a Zombie — range ${reach === undefined || reach === null ? 'unstated' : JSON.stringify(reach)}, the reach is never defaulted`, 'content: range unstated'); continue; }
      // fix.raise-two (engine, 2026-09-28): how many bodies a firing raises is the row's own `count`;
      // unstated is one ("raise a corpse"). A count that is not a whole number 1 or more is a named gap.
      if (ef.count !== undefined && (!Number.isSafeInteger(ef.count) || ef.count < 1)) { gap(unitId, `${where} ${t.hook}: raise a corpse as a Zombie — count ${JSON.stringify(ef.count)} is not a whole number 1 or more`, 'content: raise count'); continue; }
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'raise').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? 100, select: 'self', effect: { kind: 'corpse.raise', unit: 'unit.zombie', radius: reach, ...(ef.count !== undefined ? { count: ef.count } : {}) }, source: unitId });
    } else if (/^remove all corpses within range; heal (\d+) per corpse$/.test(ef.effect)) {
      const m = ef.effect.match(/heal (\d+) per corpse/);
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'consume').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? 100, select: 'self', effect: { kind: 'corpse.consume', radius: ef.range ?? t.range ?? 1, healPer: +m[1] }, source: unitId });
    } else if (ef.effect === 'paint a ground layer' && ef.layer && ef.radius !== undefined) {
      // capability.ground-layers / vision (2026-09-03): Nightfall, The Dark Rushes In, Thrown Down's shadow
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'paint-' + ef.layer).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? ef.chance ?? 100, select: ef.origin === 'self' || !ef.origin ? 'self' : 'target',
        effect: { kind: 'layer.paint', layer: 'layer.' + ef.layer, radius: ef.radius, origin: ef.origin === 'self' || !ef.origin ? 'self' : 'target' }, source: unitId, ...(attackId ? { onlyWithAttack: attackId } : {}) });
    } else if (/^grant a stat (for the Battle|until end of your Activation)$/.test(ef.effect) && modStatOf(ef.stat)) {
      // statMod trigger effects (2026-09-03): "grant a stat for the Battle" — Blight the Eye's −2 Vision, −10 Accuracy
      // C20 (engine fix.one-effect-vocabulary, 2026-10-01): "until end of your Activation" is end of Activation, never the Turn
      const until = /Battle/.test(ef.effect) ? 'battle' : 'endOfActivation';
      const select = ef.target === 'self' ? 'self' : areaSelect ?? 'target';
      // a stat grant BEFORE the damage is computed (onAttack, onCrit) would change the number the preview promised — Law 1: damage-changing effects are stations, not triggers
      if (t.hook === 'onAttack' || t.hook === 'onCrit') { gap(unitId, `${where} ${t.hook}: ${ef.effect} (${ef.stat}) — a pre-damage stat grant is a STATION question (Law 1)`, 'trigger-effect: statMod before damage'); continue; }
      if (t.hook === 'onActivationEnd' && select === 'target') { gap(unitId, `${where} ${t.hook}: ${ef.effect} (${ef.stat}) — no target on this hook`, 'trigger-effect: statMod'); continue; }
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || ef.stat).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ef.stat}`,
        hook: t.hook, chance: t.chance ?? ef.chance ?? 100, select,
        effect: { kind: 'statMod', stat: modStatOf(ef.stat), value: ef.value, until }, source: unitId, ...(attackId ? { onlyWithAttack: attackId } : {}) });
    } else if (ef.effect === 'target loses stamina') {
      // capability.target-stamina-loss (2026-09-03): the existing drain, aimed at the target
      out.push({ id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'drain').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-stamina`,
        hook: t.hook, chance: t.chance ?? ef.chance ?? 100, select: 'target', effect: { kind: 'stamina.drain', value: ef.value ?? 1 }, source: unitId, ...(attackId ? { onlyWithAttack: attackId } : {}) });
    } else if (ef.effect === 'add power' || ef.effect === 'gain Power') {
      // capability.power-pool (2026-09-03): the clock and the condition — side-wide
      if ((t.effects.length > 1) && (t.chance ?? 100) !== 100) { gap(unitId, `${where} ${t.hook}: multi-effect at chance ${t.chance}`, 'multi-effect rolled trigger'); return []; }
      const trig = {
        id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || 'power').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? 100, select: 'self',
        effect: { kind: 'power.gain', value: ef.value ?? 1 },
        source: unitId,
      };
      if (attackId) trig.onlyWithAttack = attackId;
      out.push(trig);
    } else {
      gap(unitId, `${where} ${t.hook}: ${ef.effect}${ef.stat ? ' (' + ef.stat + ')' : ''}`, ef.effect === 'grant a stat for the Battle' || /grant a stat/.test(ef.effect) ? 'trigger-effect: statMod' : ef.effect);
    }
  }
  return out;
}

// stat words an aura can lend (the engine's foldable stats that resolve on read; health is Max Health, not resolved — a gap)
// (the late hero stat map is STAT_OF — one map)
const authoredEnemies = [];
const authoredAttacks = {};
const authoredAbilities = {}; // capability.item-powers, 2026-08-27
// content.enemy-flip (2026-09-02): EVERY authored enemy packs, not only the
// ones the prologue fields — the registry is read whole, like items and
// statuses, and a row the engine cannot fully express carries named gaps. A
// prologue id with no authored row is still its own gap.
for (const id of [...fielded].filter((x) => !AUTH.units.some((u) => u.id === x))) gap(id, 'fielded by the prologue, absent from enemies-authored', 'content');
for (const u of [...AUTH.units].sort((a, b) => (a.id < b.id ? -1 : 1))) {
  const id = u.id;
  const st = u.stats || {};
  // crit and luck COMPILE since station.crit (2026-08-27): per-unit crit is
  // COMBAT-DESIGN's "Base Crit varies by enemy" axis, luck the resistance side.
  const abilityIdsLocal = [];
  const unitTriggers = (u.triggers || []).flatMap((t) => t.hook === 'aura' ? [] : compileTrigger(t, id, null));
  // capability.auras (2026-09-03): a `hook: aura` row is an AuraDef — a radius
  // lending stat modifiers while inside. Stats the engine folds compile; the
  // rest (immunities, Max Health) are named on the aura and in the census.
  const unitAuras = [];
  (u.triggers || []).filter((x) => x.hook === 'aura').forEach((t, ai) => {
    const nm = (t.name || `aura-${ai + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const aid = `${id.replace(/^unit\./, 'aura.')}.${nm}`;
    if (t.range === null || t.range === undefined) { gap(id, `aura '${t.targets}' — range null, N never stated`, 'content: range unstated'); return; }
    const side = /^allies/.test(t.targets || '') ? 'ally' : /^enemies/.test(t.targets || '') ? 'enemy' : 'any';
    const tagM = String(t.condition || '').match(/^the target has tag ([A-Za-z]+)$/);
    if (t.condition && !tagM) { gap(id, `aura condition '${t.condition}'`, 'aura condition'); return; }
    const mods = {}; const agaps = [];
    for (const ef of t.effects || []) {
      if (/^grant a stat/.test(ef.effect) && modStatOf(ef.stat)) mods[modStatOf(ef.stat)] = (mods[modStatOf(ef.stat)] ?? 0) + ef.value;
      else { agaps.push(`${ef.effect}${ef.stat ? ' ' + ef.stat : ''}${ef.status ? ' ' + ef.status : ''} ${ef.value ?? ''}`.trim()); gap(id, `aura ${nm}: ${ef.effect}${ef.stat ? ' (' + ef.stat + ')' : ''}${ef.status ? ' ' + ef.status : ''}`, ef.status ? 'aura: status immunity' : 'aura: ' + (ef.stat || ef.effect)); }
    }
    unitAuras.push({ id: aid, radius: t.range, side, ...(tagM ? { requireTags: [tagM[1].toLowerCase()] } : {}), mods, ...(agaps.length ? { gaps: agaps } : {}) });
  });
  const attackIds = [];
  let anyRanged = false;
  let rangedN = 0, meleeN = 0;
  // Enemy SPECIAL MOVES (move.*) — pack.enemy-actions (2026-09-26, AI-DESIGN.md
  // §7 step 2). Dropped silently until content.enemy-flip (2026-09-02), then
  // named as gaps while the kind was unapproved. The kind was approved
  // 2026-09-02 (engine DECISIONS.md "The enemy special moves": "Yes, I do want
  // to have these special moves: charge, close, bite, clobber"), and enemies use
  // the ONE action type (DECISIONS.md 2026-09-04, "enemies use the one action
  // type too"), so a move compiles to an action like any other. Every move
  // spends the Activation's MOVEMENT action (ENEMY-REVIEW.md:276 "their move
  // action can be a Close Bite"; :348 the Colossus "is entirely movement
  // powers"). Two shapes compile:
  //   - a move carrying an attack and no travel (Clobber, Close Bite) → a melee
  //     attack, slot movement, listed FIRST so a unit starting adjacent takes it
  //     before its primary. "When starting adjacent" is the movement slot
  //     itself: the move action comes before any walking, and a melee attack
  //     needs its target adjacent then (engine SWITCHES.md closeBiteStartingAdjacent).
  //   - a move carrying only self effects (Buff) → a self power, slot movement.
  //   - a move that travels AND attacks (Charge: `hexes` + an attack) → the same
  //     melee attack carrying `hexes`, which the engine lifts to a path-shaped
  //     move profile beside the attack: a CHARGE, aimed at a unit, walking at
  //     most `hexes` to it and striking as one action (capability.charge,
  //     2026-09-27; engine src/core/charge.ts). Was a named gap until then.
  // Numbers are the row's; nothing here is chosen.
  for (const mv of u.moves || []) {
    if (typeof mv === 'string') continue;   // a granted movement power (power.flight) — the unit's movement, below
    const mneed = (mv.needs || []).filter((n) => !HAVE.has(n));
    if (mneed.length) { gap(id, `special move ${mv.id}`, mneed.join(',')); continue; }
    if (mv.hexes !== undefined && !mv.attack) { gap(id, `special move ${mv.id}: moves ${mv.hexes} hexes with no attack`, 'enemy special move: shape'); continue; }
    if (mv.attack && !mv.effects) {
      const at = mv.attack;
      if (/within/.test(at.targets || '')) { gap(id, `special move ${mv.id}: a ranged move attack`, 'enemy special move: ranged'); continue; }
      if (!at.damage || at.damage.stat === 'none' || at.damage.stat === null) { gap(id, `special move ${mv.id}: damage reads no stat`, 'attack shape: stat-less (flat) damage'); continue; }
      authoredAttacks[mv.id] = {
        ...packetFields(at), slot: 'movement', id: mv.id, name: mv.name,
        kind: 'melee', damageType: damageType(at.damageType || 'physical'),
        bonus: at.damage.mod ?? 0, stat: at.damage.stat || 'strength',
        reach: 1, staminaCost: 0, // enemies do not run stamina
        ...(at.damage.powerScale ? { powerScale: at.damage.powerScale } : {}),
        ...(at.crit !== undefined ? { crit: at.crit } : {}),              // station.crit: the move's own crit modifier (Close Bite +10)
        ...(at.accuracyMod !== undefined ? { accuracy: at.accuracyMod } : {}),   // station.accuracy-field
        ...(mv.cooldown ? { cooldown: mv.cooldown } : {}), ...(mv.warmup ? { warmup: mv.warmup } : {}),
        ...(at.attackCount > 1 ? { hits: at.attackCount } : {}),
        ...(mv.hexes !== undefined ? { hexes: mv.hexes } : {}),   // capability.charge: walk at most this far, then strike
      };
      attackIds.push(mv.id);
      meleeN++;
      // the move's riders are scoped to it (onlyWithAttack) and named for it, so a
      // Close Bite's burn is never the same trigger id as the Bite's (Law 12)
      const moveSlug = mv.id.split('.').pop();
      unitTriggers.push(...(at.triggers || []).flatMap((t) => compileTrigger(t, id, mv.id)).map((t) => ({ ...t, id: `${t.id}.${moveSlug}` })));
      continue;
    }
    if (mv.effects && !mv.attack) {
      const effects = []; const bad = [];
      for (const e of mv.effects) {
        if (e.target !== 'self') bad.push(`${e.effect} on '${e.target}'`);
        else if (e.effect === 'grant a stat for the Battle' && modStatOf(e.stat) && typeof e.value === 'number') effects.push({ kind: 'statMod', stat: modStatOf(e.stat), value: e.value, until: 'battle' });
        else if (e.effect === 'heal' && typeof e.value === 'number') effects.push({ kind: 'heal', amount: e.powerScale ? { scale: 'power', base: e.value, mult: e.powerScale } : e.value });   // capability.power-pool: heal N + power
        else bad.push(`${e.effect}${e.stat ? ' ' + e.stat : ''}`);
      }
      // never half a move: a clause the engine cannot say gaps the whole row
      if (bad.length) { gap(id, `special move ${mv.id}: ${bad.join('; ')}`, 'enemy special move: effect'); continue; }
      authoredAbilities[mv.id] = { id: mv.id, name: mv.name, slot: 'movement', staminaCost: 0, cooldown: mv.cooldown ?? 0, ...(mv.warmup ? { warmup: mv.warmup } : {}),
        range: 0, target: { select: 'self', side: 'any' }, effects,
        ...(mv.ai ? { gaps: [`ai: '${mv.ai}' — an action hint on the row (AI-DESIGN.md §3D) waits on ai.scorer`] } : {}) };
      if (mv.ai) gap(id, `${mv.id}: ai '${mv.ai}'`, 'action hint on the row (AI-DESIGN.md §3D) — waits on ai.scorer');
      abilityIdsLocal.push(mv.id);
      continue;
    }
    gap(id, `special move ${mv.id}: neither an attack nor self effects`, 'enemy special move: shape');
  }
  // capability.move-ignores-zoc (engine, 2026-09-28; was a named gap since
  // pack.enemy-actions): the hounds' movement ignores zones of control
  // (ENEMY-REVIEW.md:276, "the move-WITHOUT-provoking machinery, as a property
  // of their movement"). A row marked moveIgnoresZOC walks with the Codex's walk
  // that says "Ignores zones of control" — found by what it IS (a plain walk
  // carrying ignoresZoc, no budget change, no riders), never by name. None, or
  // more than one, is a gap; so is a row that also names a movement power of its
  // own (a flier that ignores ZoC is a shape nobody has ruled).
  const ZOC_WALKS = Object.values(moves).filter((m) => m.shape === 'path' && m.ignoresZoc === true && m.budgetMod === 0 && !m.effects);
  if (u.moveIgnoresZOC && ZOC_WALKS.length !== 1) gap(id, `moveIgnoresZOC: ${ZOC_WALKS.length} Codex walks ignore zones of control — the row needs exactly one`, 'content: movement power row');
  if (u.moveIgnoresZOC && (u.movePower || (u.moves || []).some((m) => typeof m === 'string'))) gap(id, 'moveIgnoresZOC on a row that names its own movement power', 'content: an enemy carries one movement power');
  // "has no primary action at all" (ENEMY-REVIEW.md:348): carried as the row's own
  // field since capability.charge (2026-09-27) — the engine closes the unit's
  // primary slot (action.ts resolveActionSlot), so its walk spends the movement
  // slot or nothing. Was a named gap until then.
  for (const raw of u.attacks || []) {
    const a = resolveAttack(raw, id);
    if (!a) continue;
    // FOUND 2026-09-03 (running Supper): a `kind: self` row (Eat Corpse — heal
    // 5, +stats, needs corpses) compiled as an ATTACK and the Ghoul swung it at
    // heroes. A self-kind row is a power, and one that needs a capability is
    // a named gap, never an attack.
    if (a.kind === 'self' || a.targets === 'self') {
      const need = (a.needs || []).filter((n) => !HAVE.has(n));
      // capability.corpses (2026-09-03): Eat Corpse compiles to an enemy self-power — heal, battle-long stat gains, Max Health
      const isEat = /corpse/i.test(a.name || a.id) && (a.effects || []).some((e) => e.effect === 'heal');
      if (!need.length && isEat) {
        const mods = {}; let heal = 0, maxHp = 0; const egaps = [];
        for (const e of a.effects || []) {
          if (e.effect === 'heal') heal += e.value ?? 0;
          else if (/^grant a stat/.test(e.effect) && e.stat === 'health') maxHp += e.value ?? 0;
          else if (/^grant a stat/.test(e.effect) && modStatOf(e.stat)) mods[modStatOf(e.stat)] = (mods[modStatOf(e.stat)] ?? 0) + (e.value ?? 0);
          else egaps.push(`${e.effect} ${e.stat ?? ''}`.trim());
        }
        const pid = a.id.replace(/^attack\./, 'power.');
        authoredAbilities[pid] = { id: pid, name: a.name, ...actionSlot(a), staminaCost: 0, cooldown: a.cooldown ?? 0, range: 0, target: { select: 'self', side: 'any' },
          effects: [{ kind: 'corpse.eat', radius: 1, heal, mods, ...(maxHp ? { maxHp } : {}) }], ...(egaps.length ? { gaps: egaps } : {}) };
        abilityIdsLocal.push(pid);
        for (const g of egaps) gap(id, `${pid}: ${g}`, 'enemy self-power clause');
        continue;
      }
      gap(id, `${a.id} is a self-targeted action (${(a.effects || []).map((e) => e.effect).join('; ')})`, need.join(',') || 'enemy self-power (no AbilityDef lane for enemies)'); continue;
    }
    const ranged = /within/.test(a.targets || '');
    if (ranged && (a.range === null || a.range === undefined)) { gap(id, `${a.id} range is null — N never stated`, 'content: range unstated'); continue; }
    // capability.power-pool (2026-09-03): the share rides on the row (was a gap)
    // An attack whose damage reads NO stat (the Eyeblight's gaze: flat true
    // damage) is a shape AttackDef cannot say — every attack adds a stat. A
    // named gap; the unit fields without it (the weaponless-Lumberjack
    // precedent), never with a stat guessed for it.
    if (a.damage && (a.damage.stat === 'none' || a.damage.stat === null)) { gap(id, `${a.id} damage reads no stat (flat ${a.damage.mod ?? 0})`, 'attack shape: stat-less (flat) damage'); continue; }
    anyRanged = anyRanged || ranged;
    if (ranged) rangedN++; else meleeN++;
    authoredAttacks[a.id] = {
      ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name || a.id.split('.').pop(),
      kind: ranged ? 'ranged' : 'melee',
      damageType: damageType(a.damageType || 'physical'),
      bonus: a.damage?.mod ?? 0, stat: a.damage?.stat || 'strength',
      reach: ranged ? a.range : 1, staminaCost: 0, // enemies do not run stamina
      ...(a.damage?.powerScale ? { powerScale: a.damage.powerScale } : {}),   // capability.power-pool, 2026-09-03
      ...(a.cooldown ? { cooldown: a.cooldown } : {}), ...(a.warmup ? { warmup: a.warmup } : {}),   // capability.enemy-action-cooldown, 2026-09-03
      ...(a.attackCount > 1 ? { hits: a.attackCount } : {}),   // attack.multihit, 2026-09-03
      // fix.enemy-accuracy-mod (engine, 2026-09-27): the row's accuracyMod rides on
      // AttackDef.accuracy (station.accuracy-field) as the move lane above already
      // did. Dropped silently before — Bone Dragon Wings -20, Balrog Hurl -30 (Law 9).
      ...(a.accuracyMod !== undefined ? { accuracy: a.accuracyMod } : {}),
    };
    attackIds.push(a.id);
    unitTriggers.push(...(a.triggers || []).flatMap((t) => compileTrigger(t, id, a.id)));
  }
  // rule.enemy-attacks, 2026-08-30: "every enemy needs its attacks clearly defined. If it does
  // not have a melee attack, an enemy has a basic melee S+0 damage attack." Written since
  // August, ENFORCED here from 2026-09-05 — the rule had no code behind it, and unit.iron-
  // colossus reached the engine with attacks:[] because both its attacking moves are gaps.
  // A floor, not a design: Strength +0, no stamina, no accuracy modifier, one enemy in melee
  // reach. It is added ONLY when a unit would otherwise ship unable to attack at all.
  if (!attackIds.length) {
    // SATTACK_BY_ID is not built yet at this point in the file; the row is read straight
    // from the assembled codex, which is where settled.json's attacks land.
    const basic = (D.attacks || []).find((x) => x.id === 'attack.basic.melee');
    if (!basic) gap(id, 'no attacks, and attack.basic.melee has no settled row to fall back on', 'content');
    else {
      authoredAttacks[basic.id] = { ...packetFields(basic), id: basic.id, name: basic.name, kind: 'melee',
        damageType: damageType(basic.damageType || 'physical'), bonus: basic.damage ?? 0,
        stat: basic.stat || 'strength', reach: 1, staminaCost: basic.stamina ?? 0 };
      attackIds.push(basic.id);
      gap(id, 'had no attack of its own — given attack.basic.melee by rule.enemy-attacks', 'content: authored attacks are owed');
    }
  }
  const mostlyRanged = rangedN > 0 && rangedN >= meleeN;
  // pack.enemy-actions: the unit's ONE movement power (engine DECISIONS.md
  // 2026-08-21: "enemies now carry exactly ONE movement power in their data row,
  // which may or may not be Flight"; 2026-09-04: "The two common movement types
  // are flight and walking"). `movePower: flight` grants power.flight — the
  // Codex's standard flight, +0 (a unit with no stamina pays none); a power.*
  // named in the row's moves (the Shadow Sorcerer's spelling) is the same grant.
  // Walking otherwise, as before.
  const movePowers = [...(u.movePower ? ['power.' + u.movePower] : []), ...(u.moves || []).filter((m) => typeof m === 'string')];
  for (const mp of movePowers) if (!moves[mp]) gap(id, `movement power ${mp} has no compiled row`, 'content');
  if (movePowers.length > 1) gap(id, `${movePowers.length} movement powers (${movePowers.join(', ')}) — an enemy carries one`, 'content');
  const zocWalk = u.moveIgnoresZOC && !movePowers.length && ZOC_WALKS.length === 1 ? [ZOC_WALKS[0].id] : null;   // capability.move-ignores-zoc
  const unitMoves = zocWalk ?? (movePowers.length === 1 && moves[movePowers[0]] ? movePowers : ['power.move']);
  authoredEnemies.push({
    typeId: id, name: u.name, side: 'enemy',
    // fix.codex-numbers (finding K7): the Codex tier rides the row, so the kingdom can pay xpByTier (2 / 5 / 15)
    ...(u.tier !== undefined ? { tier: u.tier } : {}),
    maxHp: st.health, armor: st.armor ?? 0, resist: st.resist ?? 0, ...optionalCombatStats(st),
    accuracy: st.accuracy, dodge: st.dodge ?? 0,
    // station.crit 2026-08-27. An enemy's authored crit is its TOTAL (the Eyeblight's "Crit 0, so the surplus is its
    // only crit"; COMBAT-DESIGN "some enemies crit far above the base 3"): published over the engine's base like a
    // hero's (fix.codex-numbers; engine SWITCHES.md enemyCritIsTotal). No authored crit is the base itself.
    ...(overRule('crit', st.crit) ? { crit: overRule('crit', st.crit) } : {}), ...(st.luck ? { luck: st.luck } : {}),
    strength: st.strength ?? 0, precision: st.precision ?? 0, magic: st.magic ?? 0, spirit: st.spirit ?? 0,
    // Mechanical mapping, not design: a unit kites when its ranged attacks
    // are at least as many as its melee ones; the rest close. Was "any ranged
    // attack kites" until 2026-09-03 (fix.enemy-ai-role): the Ghoul — Rake,
    // Devour, Eat Corpse and one Shriek at range 4 — kited from the whole
    // Supper and never bit anyone; the Skeletal Archer (Gut + Shoot) kites.
    // The real enemy AI is future work (ai.mode.* backlog).
    role: u.role === 'support' ? 'support' : mostlyRanged ? 'ranged' : 'melee',
    movement: st.movement, reach: 0,
    maxStamina: 0, staminaRegen: 0,
    // 2026-09-03 (the six AI modes): a row that AUTHORS its ai keeps it (the
    // hounds' hunter); a support row runs support; the rest as before.
    ai: u.ai ?? (u.role === 'support' ? 'support' : mostlyRanged ? 'ranged-kite' : 'dumb-melee'),
    ...(u.ai || u.role === 'support' ? { aiAuthored: true } : {}),
    attacks: attackIds, abilities: abilityIdsLocal, moves: unitMoves,
    tags: (u.types || []).map((t) => t.toLowerCase()),
    triggers: distinctTriggerIds(id, unitTriggers),
    ...(unitAuras.length ? { auras: unitAuras } : {}),
    ...(u.noPrimaryAction ? { noPrimaryAction: true } : {}),   // capability.charge
  });
}
// ── THE PROLOGUE PARTY (content.hero-pack, 2026-08-26) ──────────────────────
// Ruled: "pick a ranger of the 24 Eve, then a warrior and a preist, all from
// 24 eve" — Hunter / Iron Dwarf / Battle Chaplain (picks delegated, taken
// first-of-class T0). Kit resolution follows gen/kits.json's own law: a
// hero override resolves; a class kit with explicit items resolves; a
// `random`/`oneOf` SPEC does not — "the roll belongs to the draft" — so a
// hero whose kit cannot resolve deterministically is a NAMED GAP, not a roll
// I make here. Heroes PAY attack stamina (the hero throttle).
const KITS = JSON.parse(fs.readFileSync('gen/kits.json', 'utf8'));
const SITEMS = JSON.parse(fs.readFileSync('gen/settled-items.json', 'utf8'));
// settled.json is the SECOND authored source of items and attacks (the Lumberjack's Axe
// and its Chop/Cleave rows live there, with the universal Punch). The converter read only
// settled-items.json and reported the axe as unauthored — a false gap, corrected 2026-08-27.
// settled-items rows win on an id collision (they are the older, engine-facing shapes).
// THREE authored item/attack sources, not two — gen/weapons.json holds the weapon shelf
// (Holy Texts, War Axe, the daggers…). Missing it made the Battle Chaplain field with a
// shield and no scripture — the S30 lumberjack lesson, relearned 2026-08-27. Later
// sources win on id collision (settled-items last, the engine-facing shapes).
const WEAPONS = JSON.parse(fs.readFileSync('gen/weapons.json', 'utf8'));
// The Codex's own item rows (hbt-content.json, 276 across seven classes) are
// the FIRST source since content.field-eve-24 (2026-09-02): the tier-0 armors
// the 24 Eve kits pin (Thick Hide, Pilgrim's Habit, Watchman's Coat…) live
// only there, and without them eight heroes fielded with their armor's whole
// payload silently missing. Later sources still win on id collision.
const CODEX_ITEMS = [];
(function wi(o) { if (Array.isArray(o)) o.forEach(wi); else if (o && typeof o === 'object') { if (o.id && String(o.id).startsWith('item.') && o.itemClass) CODEX_ITEMS.push(o); else Object.values(o).forEach(wi); } })(D);
const ITEM_BY_ID = new Map([...CODEX_ITEMS, ...(SETTLED.items || []), ...(WEAPONS.items || []), ...SITEMS.items].map((i) => [i.id, i]));
const SATTACK_BY_ID = new Map([...(SETTLED.attacks || []), ...(WEAPONS.attacks || []), ...SITEMS.attacks].map((a) => [a.id, a]));
const SPOWER_BY_ID = new Map(
  [...(Array.isArray(SETTLED.powers) ? SETTLED.powers : []), ...(SITEMS.powers || [])]
    .filter((p) => p && p.id).map((p) => [p.id, p]));
// content.field-eve-24 (2026-09-02): EVERY Eve hero with a dictated full kit
// fields — the 24 heroKits rows (2026-08-27b: "ALL 24 Eve heroes now carry
// FULL kits"), not the prologue three alone. Same lane, same kit law; the
// list is read off the kits registry, never typed here.
const PARTY = Object.keys(KITS.heroKits ?? KITS.heroOverrides ?? {}).filter((k) => k.startsWith('hero.'));

// The class half-step, read from the Codex movementAction rows — never hardcoded.
const movesForClass = (cls) => {
  const out = ['power.move'];
  const walkP = (o) => {
    if (Array.isArray(o)) { o.forEach(walkP); return; }
    if (o && typeof o === 'object') {
      if (o.movementAction && !o.universal && (o.grantedToClasses || []).includes(cls) && o.id !== 'power.move') out.push(o.id);
      else if (o.movementAction && o.universal && o.grantedToClasses?.includes?.(cls) && o.id !== 'power.move') out.push(o.id);
      Object.values(o).forEach(walkP);
    }
  };
  walkP(SETTLED.powers);
  return [...new Set(out)];
};

const allHeroes = [];
(function wh(o) { if (Array.isArray(o)) o.forEach(wh); else if (o && typeof o === 'object') { if (o.id && String(o.id).startsWith('hero.') && o.ported) allHeroes.push(o); else Object.values(o).forEach(wh); } })(D.heroes);


// Settled-item attack rows carry a THIRD trigger shape — a string effect like
// "apply 2 Bleed" (Chop, dictated 2026-08-25). Constrained parse, never loose:
// anything that is not exactly "apply <N> <KnownStatus>" is a named gap. Also
// names the drops a settled attack row can carry: a crit field (no AttackDef
// slot) and an area/arc targets clause (the engine attacks one target).
// engine capability.damage-from-two-stats (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': of
// damage from two stats added, "We do need that."; 'the Force Staff is Precision plus half Magic, as magic damage'): the four
// fields an attack row says a second term in reach the engine as its sum of terms — `addsStat` (that stat, once),
// `halfStatBonus` (half of it; the engine rounds nearest, 0.5 up), `doubleStatBonus` (twice it), `doubleStat` (the attack's
// own stat, twice). On a BURST they are still a named gap: a burst's damage is its packets', not an attack's.
const TWO_STAT_FIELDS = ['addsStat', 'halfStatBonus', 'doubleStatBonus', 'doubleStat'];
function twoStatTerms(a) {
  if (burstOf(a)) return {};
  const term = (word, mult, div) => { const stat = statOf(word); if (!stat || !RESOLVABLE_STATS.has(stat)) throw new Error(`mkenginepack: ${a.id} adds '${word}' to its damage, which is no stat the engine resolves`); return { stat, mult, ...(div ? { div } : {}) }; };
  const terms = [...(a.addsStat ? [term(a.addsStat, 1)] : []), ...(a.halfStatBonus ? [term(a.halfStatBonus, 1, 2)] : []), ...(a.doubleStatBonus ? [term(a.doubleStatBonus, 2)] : [])];
  if (a.doubleStat !== undefined && a.doubleStat !== true) throw new Error(`mkenginepack: ${a.id} doubleStat is true or absent`);
  return { ...(a.doubleStat ? { statMult: 2 } : {}), ...(terms.length ? { addsStats: terms } : {}) };
}
const DROPPED_ATTACK_FIELDS = [
  ['addsTargetStatus', "damage that adds the target's own status — engine capability.damage-adds-target-status"],
];
// engine capability.summons (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need:
// summons"): `accuracyVs` — an attack's extra Accuracy against a kind of target — reaches the engine as written: each key
// the flag `summon` (anything summoned) or a unit type the pack's units carry (as their tag, lower case), each number a
// whole one. A kind no unit of the pack is FAILS THE BUILD. On a BURST it stays a named gap (a burst rolls no Accuracy).
const UNIT_KINDS = new Set(AUTH.units.flatMap((u) => (u.types || []).map((t) => t.toLowerCase())));
function accuracyVsOf(a) {
  if (a.accuracyVs === undefined || burstOf(a)) return {};
  const out = {};
  for (const [kind, n] of Object.entries(a.accuracyVs)) {
    const k = kind.toLowerCase();
    if (k !== 'summon' && !UNIT_KINDS.has(k)) throw new Error(`mkenginepack: ${a.id} has Accuracy against '${kind}', which is neither 'summon' nor a type any unit of the pack is`);
    if (!Number.isSafeInteger(n) || n === 0) throw new Error(`mkenginepack: ${a.id} has Accuracy against '${kind}' of '${n}' — a whole number`);
    out[k] = n;
  }
  if (!Object.keys(out).length) throw new Error(`mkenginepack: ${a.id} has an empty accuracyVs`);
  return { accuracyVs: out };
}
function settledAttackExtras(a, unitId) {
  const out = [];
  for (const t of a.triggers || []) {
    // "apply N Status" targets the struck unit; "gain N Status" is the same
    // effect aimed at self (the Dagger's Protection, 2026-08-27). Both are the
    // one vocabulary effect "apply a status" — nothing looser parses.
    const m = typeof t.effect === 'string' && t.effect.match(/^(apply|gain) (\d+) ([A-Za-z]+)$/);
    const status = m && m[3].toLowerCase();
    // "push the target N hex(es) directly away from you" — the halberd's Hack,
    // compiled since capability.knockback (2026-08-27). EXACT phrase; any other
    // forced-movement wording stays a gap (CODEX §12 bans everything beyond
    // Knockback anyway).
    const push = typeof t.effect === 'string'
      && t.effect.match(/^push the target (\d+) hex(?:es)? directly away from you$/);
    // engine fix.kit-attack-clauses (2026-10-04): the two stat-moving phrases, read below
    const lose = typeof t.effect === 'string' && t.effect.match(/^(?:the )?target loses (\d+) ([A-Za-z]+(?: [A-Za-z]+)?)(?: for the rest of the Battle)?$/);
    const moved = lose ? { word: lose[2], stat: modStatOf(lose[2]), value: -parseInt(lose[1], 10), select: 'target' }
      : m && m[1] === 'gain' && !STATUS_OK.has(status) ? { word: m[3], stat: modStatOf(m[3]), value: parseInt(m[2], 10), select: 'self' } : null;
    // engine capability.effect-lasts-activations (2026-10-05): "apply <Status> equal to half your Magic, rounded nearest, 0.5
    // up" — the Fire Punch's own rider, the value Stoke lends: the engine's scaled value with the nearest rounding
    const half = typeof t.effect === 'string' && t.effect.match(/^apply ([A-Z][a-z]+) equal to half your (Magic|Spirit), rounded nearest, 0\.5 up$/);
    // engine capability.his-weapons-small-clauses (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …':
    // "Everything else in here seems like something we need."): "On kill: the corpse is destroyed" — the Staff of the
    // Destroyer's Ruin and Sundering. The engine's corpse.destroy on the attack's own onKill, aimed at the unit it killed:
    // the body is made where it fell and removed at once, so nothing can raise, eat or consume it. EXACT phrase, onKill only.
    if (t.effect === 'the corpse is destroyed' && t.hook === 'onKill') {
      out.push({
        id: `trigger.${a.id.replace(/^attack\./, '')}.corpse-destroyed`,
        hook: 'onKill', chance: t.chance ?? 100, select: 'target',
        effect: { kind: 'corpse.destroy' },
        source: unitId, onlyWithAttack: a.id,
      });
    } else if (half && STATUS_OK.has(half[1].toLowerCase()) && TRIG_HOOKS.has(t.hook)) {
      out.push({
        id: `trigger.${a.id.replace(/^attack\./, '')}.${half[1].toLowerCase()}`,
        hook: t.hook, chance: t.chance ?? 100, select: 'target',
        effect: { kind: 'status.apply', statusId: 'status.' + half[1].toLowerCase(), value: { scale: HALF_PARTY[half[2]], div: 2, round: 'nearest' } },
        source: unitId, onlyWithAttack: a.id,
      });
    } else if (push && TRIG_HOOKS.has(t.hook)) {
      out.push({
        id: `trigger.${a.id.replace(/^attack\./, '')}.knockback`,
        hook: t.hook, chance: t.chance ?? 100, select: 'target',
        effect: { kind: 'knockback', value: parseInt(push[1], 10) },
        source: unitId, onlyWithAttack: a.id,
      });
    } else if (m && STATUS_OK.has(status) && TRIG_HOOKS.has(t.hook)) {
      out.push({
        id: `trigger.${a.id.replace(/^attack\./, '')}.${status}`,
        hook: t.hook, chance: t.chance ?? 100, select: m[1] === 'gain' ? 'self' : 'target',
        effect: { kind: 'status.apply', statusId: 'status.' + status, value: parseInt(m[2], 10) },
        source: unitId, onlyWithAttack: a.id,
      });
    } else if (moved && moved.stat && TRIG_HOOKS.has(t.hook) && t.hook !== 'onAttack' && t.hook !== 'onCrit') {
      // engine fix.kit-attack-clauses (2026-10-04; engine DECISIONS.md 2026-10-04 'the weapon audit …': "the pack drops clauses
      // from weapons the 24 base heroes carry"): a rider that moves a stat — "the target loses N Stat [for the rest of the
      // Battle]" (the Iron Mace's Crush, the Obsidian Fang) on the struck unit, "gain N Stat" (the Elfbow's Elf Shot) on the
      // one attacking. The engine's battle-long stat modifier, the shape the War Axe's on-block already is; a second instance,
      // no engine code. A row that states no duration lasts the Battle (the Elf Shot's own note: "stacking, for the Battle";
      // engine SWITCHES.md kitClauseStatLastsTheBattle). Not on onAttack or onCrit: a stat moved before the damage is computed
      // would change the number the preview promised (Law 1), as the unit-row path above refuses it.
      out.push({
        id: `trigger.${a.id.replace(/^attack\./, '')}.${moved.stat.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase())}`,
        hook: t.hook, chance: t.chance ?? 100, select: moved.select,
        effect: { kind: 'statMod', stat: moved.stat, value: moved.value, until: 'battle' },
        source: unitId, onlyWithAttack: a.id,
      });
    } else if (moved && /^surge$/i.test(moved.word)) {
      // … and the one stat word no effect can move: a unit's Surge amount is the engine's own counter (the Surge check adds
      // to it and spends it), not a stat a modifier reaches. Named for what is missing, never guessed (the crit chart's
      // Knocked Sprawling, −50 Surge, waits on the same; filed as engine capability.trigger-moves-surge).
      gap(unitId, `${a.id} ${t.hook}: ${JSON.stringify(t.effect).slice(0, 60)}`, "no effect moves a unit's Surge amount — engine capability.trigger-moves-surge");
    } else {
      gap(unitId, `${a.id} ${t.hook}: ${JSON.stringify(t.effect).slice(0, 60)}`, 'trigger shape unparsed');
    }
  }
  // The crit field COMPILES since station.crit (2026-08-27): AttackDef.crit
  // is the weapon's flat addition to crit chance (COMBAT-DESIGN: "Crit from
  // gear"). The gap it used to raise is closed in takeAttack below.
  if (((a.tags || []).includes('area') || /adjacent to both/.test(a.targets || '')) && !burstOf(a)) {
    gap(unitId, `${a.id} targets '${String(a.targets).slice(0, 50)}' — lands SINGLE-TARGET`, 'area attack shape');
  } else if (!burstOf(a) && a.targets && !/^one enemy (in melee reach|within \d+ hex(es)?)$/.test(a.targets)) {
    // engine fix.kit-attack-clauses (2026-10-04): EVERY targets clause that is not one enemy, on a row that is not a burst,
    // is named — the engine attacks one unit. "up to N enemies" (the Throwing Knives' Fan) is its own missing mechanism:
    // one attack aimed at several chosen units (filed as engine capability.attack-several-targets).
    gap(unitId, `${a.id} targets '${String(a.targets).slice(0, 60)}' — lands SINGLE-TARGET`, /^up to \d+ enemies/.test(a.targets) ? 'an attack at several chosen targets — engine capability.attack-several-targets' : 'area attack shape');
  }
  // … an Accuracy on a burst has nothing to modify: a burst is not an attack and does not roll to hit (V2 bursts, 2026-09-16)
  if (burstOf(a) && a.accuracy) gap(unitId, `${a.id} accuracy ${a.accuracy} — a burst does not roll to hit`, 'accuracy on a burst — a burst is not an attack (V2 bursts)');
  // … and the damage terms the one damage function does not have: a second stat, the target's own status, Accuracy
  // against one kind of enemy. Each is a filed engine capability; until it lands the row deals its first stat alone.
  for (const [field, needs] of DROPPED_ATTACK_FIELDS) if (a[field] !== undefined) gap(unitId, `${a.id} ${field}: ${JSON.stringify(a[field])}`, needs);
  if (burstOf(a)) for (const field of TWO_STAT_FIELDS) if (a[field] !== undefined) gap(unitId, `${a.id} ${field}: ${JSON.stringify(a[field])}`, 'damage from two stats on a burst — a burst\'s damage is its packets\' (V2 bursts)');
  if (burstOf(a) && a.accuracyVs !== undefined) gap(unitId, `${a.id} accuracyVs: ${JSON.stringify(a.accuracyVs)}`, 'Accuracy against a kind of target on a burst — a burst rolls no Accuracy (V2 bursts)');
  return out;
}

// Item powers the engine speaks (capability.item-powers, 2026-08-27) — the
// three authored S31 shapes, parsed from their EXACT settled text and never
// invented. Anything else stays a named gap.
//   Heal:  "Heal the target for B + M x Spirit." / "one ally within R hexes"
//          -> a heal effect on one ally, ValueSpec partySpirit (GAME-DESIGN §5's
//          law: Spirit effects scale off the party-wide sum).
//   Block: "Gain Protection equal to B + your Armor, and lose D Dodge for the
//          rest of the Battle." / "self" -> status.apply Protection (B + the
//          caster's own Armor, ValueSpec 'stat') and a battle-long Dodge statMod.
// fix.one-effect-vocabulary (engine, 2026-10-01): every power is an effects list now —
// the legacy power fields (effect/stat/bonus/heal/guard) are retired, and core names
// no status id (Block's Protection is this row's, not the engine's).
//   Storm: "Deal magic damage equal to your Magic + B to every unit in the
//          blast." / "a hex within R hexes and every hex adjacent to it"
//          -> a damage power with area 'blast1'. The engine centres the blast
//          on a UNIT, not an arbitrary hex — that remainder is a named gap.
// fix.starting-kit-powers (engine, 2026-10-04; reported 2026-10-03, Andrew, engine DECISIONS.md "reported: the
// priest's Holy Texts has no heal in battle — three starting weapons lose their power on the way into the engine"):
// two more sentences of the same shapes, each a second instance, no engine code.
//   Mercy: "Heal the target for B + half your Spirit." -> the Heal shape, the ValueSpec's own `div: 2`;
//          a half rounds DOWN, as the Codex's other halves say in words (Benediction, Heaven's Edge: "half
//          your Spirit, rounded down" — engine SWITCHES.md mercyHalfRoundsDown).
//   Blast: "Deal magic damage equal to your Magic[ + B] to every unit in the blast[, and those seven hexes
//          become burning|frost]." on a row that authors a `burst` -> that burst (the Storm shape), checked
//          against the sentence (radius 1, every unit, one Magic packet of B); the ground clause is the
//          burst's own `paints` (the layer it leaves on its hexes — engine capability.burst-paints-ground,
//          2026-10-04), held to the sentence both ways. It was a named gap on the row until then.
// A compiled power may carry `gaps` ("<clause> — <what it needs>"); POWER_GAPS is the same list split, for the
// callers that report into gen/enemy-pack-gaps.json.
const POWER_GAPS = new Map();
function reportPowerGaps(row, report) { for (const x of POWER_GAPS.get(row.id) ?? []) report(x.clause, x.needs); }
// ── TIMED EFFECTS ARE STATUSES (engine capability.effect-lasts-activations, 2026-10-05) ──────────────────────────────────
// Engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … time / number of activations for a duration".
// A power's line that lasts "your next N Activations", "until the end of your third Activation from now" or "the rest of
// the Battle" compiles to (a) a STATUS row of the pack, named for the power and counted as the line says — the engine shows
// it on the unit with its count, as it shows every status — which LENDS its holder what the line gives (a trigger on its
// hits, a stat doubled), and (b) the engine's existing "apply a status" effect on the power. The status's id is the power's
// (or the item's) with the kind changed: power.fire-gauntlet.stoke -> status.fire-gauntlet.stoke. One row per power; a second
// power that would make the same id fails the build.
const HALF_PARTY = { Magic: 'partyMagic', Spirit: 'partySpirit' };
const COUNT_WORD = { second: 2, third: 3, fourth: 4, fifth: 5 };
function lentStatus(ownerId, name, { countsDown, countsAttackTag, lends }) {
  const id = 'status.' + ownerId.replace(/^(power|item)\./, '');
  if (statuses[id]) throw new Error(`mkenginepack: '${ownerId}' would make the status '${id}', which exists`);
  for (const t of lends.triggers || []) t.source = id;
  statuses[id] = { id, name, shape: 'counter', family: 'duration', stacking: 'highest', decayPerPhase: 0, ...(countsDown ? { countsDown } : {}), ...(countsAttackTag ? { countsAttackTag } : {}), lends };
  return id;
}
function compiledPowerOf(p, unitId) {
  const desc = String(p.description || '');
  const tgt = String(p.targets || '');
  const base = { id: p.id, name: p.name, ...actionSlot(p), staminaCost: p.stamina ?? 0, cooldown: p.cooldown ?? 0 };
  let m, r;
  if (p.burst) {
    const range = String(p.targets).match(/^a hex within (\d+) hexes/); if (!range) throw Error('Burst power needs authored placement range');
    const burst = validateBurst(p.burst);
    const found = [];
    if ((m = desc.match(/^Deal magic damage equal to your Magic(?: \+ (\d+))? to every unit in the blast(?:, and those seven hexes become (burning|frost))?\./))) {
      const pk = burst.packets;
      if (tgt !== `a hex within ${range[1]} hexes and every hex adjacent to it` || burst.shape.kind !== 'radius' || burst.shape.radius !== 1 || burst.side !== 'any' || burst.heal !== undefined
        || pk.length !== 1 || pk[0].stat !== 'magic' || pk[0].damageType !== 'magic' || pk[0].amount !== +(m[1] ?? 0) || pk[0].powerScale !== undefined)
        throw Error(`Item burst '${p.id}' disagrees with its authored sentence`);
      // engine capability.raise-lower-magic (2026-10-05): this sentence says no stat multiple and no change to a side's party stats
      if (pk[0].statMult !== undefined || burst.sideStats !== undefined) throw Error(`Item burst '${p.id}' carries a stat multiple or a side's stat change its sentence does not say`);
      // engine capability.burst-paints-ground (2026-10-04): the ground clause is the profile's `paints` — the layer the
      // burst leaves on its hexes. The sentence and the field must say the same thing, both ways; it was a named gap.
      if ((burst.paints ?? null) !== (m[2] ? `layer.${m[2]}` : null)) throw Error(`Item burst '${p.id}' disagrees with its authored sentence: the ground it leaves`);
    }
    // engine capability.raise-lower-magic (2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "we need
    // to lower and raise magic"): the Vortex's sentence — "Deal magic damage equal to Magic x N to every unit in the blast. It
    // does not roll to hit, so it cannot crit. Using it lowers the party's Magic by A AND the enemy side's Power by B for the
    // rest of the Battle." — on a row that authors the burst: one Magic packet counted N times (a burst rolls nothing, so it
    // cannot crit), and the two changes to the sides' party stats, for the rest of the Battle. Held to the sentence both ways.
    else if ((m = desc.match(/^Deal magic damage equal to Magic x (\d+) to every unit in the blast\. It does not roll to hit, so it cannot crit\. Using it lowers the party's Magic by (\d+) AND the enemy side's Power by (\d+) for the rest of the Battle\.$/))) {
      const pk = burst.packets, want = [{ stat: 'magic', side: 'own', value: -+m[2], until: 'battle' }, { stat: 'power', value: -+m[3], until: 'battle' }];
      if (tgt !== `a hex within ${range[1]} hexes and every hex adjacent to it` || burst.shape.kind !== 'radius' || burst.shape.radius !== 1 || burst.side !== 'any' || burst.heal !== undefined || burst.paints !== undefined
        || pk.length !== 1 || pk[0].stat !== 'magic' || pk[0].damageType !== 'magic' || pk[0].amount !== 0 || pk[0].statMult !== +m[1] || pk[0].powerScale !== undefined
        || JSON.stringify(burst.sideStats ?? null) !== JSON.stringify(want))
        throw Error(`Item burst '${p.id}' disagrees with its authored sentence`);
    }
    else if (burst.sideStats !== undefined || burst.packets.some((x) => x.statMult !== undefined)) throw Error(`Item burst '${p.id}' carries a stat multiple or a side's stat change its sentence does not say`);
    POWER_GAPS.set(p.id, found);
    return { ...base, range: +range[1], burst, ...(found.length ? { gaps: found.map((x) => `${x.clause} — ${x.needs}`) } : {}) };
  }
  // engine capability.summons (2026-10-05): "Summon one <Unit> on a hex adjacent to you. It is a summoned ally with its own
  // stat block and its own AI." on "an empty hex adjacent to you" -> a power aimed at an empty hex within 1 that places one
  // unit of the pack's row NAMED <Unit> there, on the caster's side (the engine's `summon`). The name must be exactly one
  // unit row of the pack — none, or two, FAILS THE BUILD: a summon of a unit the game cannot field is not a named gap.
  if ((m = desc.match(/^Summon one ([A-Z][A-Za-z' -]+) on a hex adjacent to you\. It is a summoned ally with its own stat block and its own AI\.$/)) && tgt === 'an empty hex adjacent to you') {
    const rows = AUTH.units.filter((u) => u.name === m[1]);
    if (rows.length !== 1) throw new Error(`mkenginepack: ${p.id} summons '${m[1]}', which ${rows.length} unit rows of the pack are named`);
    return { ...base, range: 1, target: { select: 'hex', side: 'any' }, effects: [{ kind: 'summon', unit: rows[0].id }] };
  }
  if ((m = desc.match(/^Heal the target for (\d+) \+ half your Spirit\./))
    && (r = tgt.match(/^one ally within (\d+) hexes$/))) {
    return { ...base, range: parseInt(r[1], 10), target: { select: 'unit', side: 'ally' },
      effects: [{ kind: 'heal', amount: { scale: 'partySpirit', base: parseInt(m[1], 10), mult: 1, div: 2, round: 'down' } }] };
  }
  if ((m = desc.match(/^Heal the target for (\d+) \+ (\d+) x Spirit\./))
    && (r = tgt.match(/^one ally within (\d+) hexes$/))) {
    return { ...base, range: parseInt(r[1], 10), target: { select: 'unit', side: 'ally' },
      effects: [{ kind: 'heal', amount: { scale: 'partySpirit', base: parseInt(m[1], 10), mult: parseInt(m[2], 10) } }] };
  }
  // engine capability.planted-banners (2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a feature that
  // is needed …': "All of those deadlines need to be added in as features that we need."): his Banners. "One use per Battle.
  // Plant the banner on your hex. For the rest of the Battle it projects an aura of radius N from that hex — you may walk away
  // and it stays." on "the hex you occupy" -> a power aimed at its user, one use a Battle, whose one effect is the engine's
  // 'plant': an object on that hex that gives the planter's side, within N of the HEX, what the sentences after it say —
  //   "+N Stat[ and +N Stat] to allies in the aura[, and Resistance to <Status> N while inside it]"  stats lent while inside; a
  //       ward: N points of each application of that status do not land while inside (engine SWITCHES.md immunityIsAWard,
  //       ruled 2026-10-05 — GLOSSARY.md 'Resistance to Weak'; the line read "Immunity to <Status> N" until 2026-10-06)
  //   "At the End of Activation of an|any ally inside[ the aura], that ally gains N Surge Chance — added to the pool once,
  //       never added to the Surge stat"                                                            a lent End-of-Activation trigger
  //   "… that ally heals N" / "… that ally heals an amount equal to the party's Spirit"             the same hook, a heal — the
  //       PARTY's Spirit, the ally's own or none (ruled 2026-10-05, "2 by the party spirit"; it read "its Spirit" and healed
  //       by the ally's own — engine SWITCHES.md vigilHealsItsOwnSpirit, overturned)
  //   "onCrit, for a unit in the aura: gain N Stamina"                                              a lent on-crit trigger
  // A sentence that is none of these is a named gap on the power (the Heroic Banner's "onMiss … EVERY ally in the aura"); a
  // banner none of whose sentences compile is not planted at all — it stays an unparsed power (the Mystic Banner), never an
  // object that does nothing.
  if ((m = desc.match(/^One use per Battle\. Plant the banner on your hex\. For the rest of the Battle it projects an aura of radius (\d+) from that hex — you may walk away and it stays\. (.+)$/)) && tgt === 'the hex you occupy') {
    const slug = p.id.replace(/^power\./, '');
    const mods = {}, wards = {}, lends = [], found = [];
    const lend = (key, hook, effect) => lends.push({ id: `trigger.${slug}.${key}`, hook, chance: 100, select: 'self', effect, source: p.id });
    for (const s0 of m[2].split(/(?<=\.)\s+/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean)) {
      let c;
      if ((c = s0.match(/^(\+\d+ [A-Z][a-z]+(?: and \+\d+ [A-Z][a-z]+)*) to allies in the aura(?:, and Resistance to ([A-Z][a-z]+) (\d+) while inside it)?$/))) {
        const parts = c[1].split(' and ').map((x) => x.match(/^\+(\d+) (.+)$/));
        if (parts.some((x) => !modStatOf(x[2])) || (c[2] && !STATUS_OK.has(c[2].toLowerCase()))) { found.push({ clause: s0, needs: 'a stat or a status the engine does not have' }); continue; }
        for (const x of parts) mods[modStatOf(x[2])] = (mods[modStatOf(x[2])] ?? 0) + +x[1];
        if (c[2]) wards['status.' + c[2].toLowerCase()] = +c[3];
        continue;
      }
      if ((c = s0.match(/^At the End of Activation of (?:an|any) ally inside(?: the aura)?, that ally gains (\d+) Surge Chance — added to the pool once, never added to the Surge stat$/))) { lend('surge', 'onActivationEnd', { kind: 'surge.gain', value: +c[1] }); continue; }
      if ((c = s0.match(/^At the End of Activation of (?:an|any) ally inside(?: the aura)?, that ally heals (\d+)$/))) { lend('heal', 'onActivationEnd', { kind: 'heal', amount: +c[1] }); continue; }
      if (/^At the End of Activation of (?:an|any) ally inside(?: the aura)?, that ally heals an amount equal to the party's Spirit$/.test(s0)) { lend('heal', 'onActivationEnd', { kind: 'heal', amount: { scale: 'partySpirit', base: 0, mult: 1 } }); continue; }
      if ((c = s0.match(/^onCrit, for a unit in the aura: gain (\d+) Stamina$/))) { lend('stamina', 'onCrit', { kind: 'stamina.gain', value: +c[1] }); continue; }
      found.push({ clause: s0, needs: 'planted object: clause unparsed' });
    }
    if (Object.keys(mods).length || Object.keys(wards).length || lends.length) {
      POWER_GAPS.set(p.id, found);
      return { ...base, uses: 1, range: 0, target: { select: 'self', side: 'any' },
        effects: [{ kind: 'plant', radius: +m[1], ...(Object.keys(mods).length ? { mods } : {}), ...(Object.keys(wards).length ? { wards } : {}), ...(lends.length ? { lends } : {}) }],
        ...(found.length ? { gaps: found.map((x) => `${x.clause} — ${x.needs}`) } : {}) };
    }
  }
  // engine capability.his-weapons-small-clauses (2026-10-05): the Benevolent Rod's Mending Light — "Heal the target for (Spirit x
  // M) + B, give it Protection equal to your Spirit, and remove <Status> equal to your Spirit." Three effects on the one ally:
  // the heal and the Protection are shapes the engine had; the third is status.remove by a stat's amount. "Your Spirit" is
  // the party's (GAME-DESIGN §5: Spirit is a party stat — as the Heal sentences above read it).
  if ((m = desc.match(/^Heal the target for \(Spirit x (\d+)\) \+ (\d+), give it Protection equal to your Spirit, and remove ([A-Z][a-z]+) equal to your Spirit\.$/))
    && (r = tgt.match(/^one ally within (\d+) hexes$/)) && STATUS_OK.has(m[3].toLowerCase())) {
    return { ...base, range: parseInt(r[1], 10), target: { select: 'unit', side: 'ally' }, effects: [
      { kind: 'heal', amount: { scale: 'partySpirit', base: parseInt(m[2], 10), mult: parseInt(m[1], 10) } },
      { kind: 'status.apply', statusId: 'status.protection', value: { scale: 'partySpirit', base: 0, mult: 1 } },
      { kind: 'status.remove', statusId: 'status.' + m[3].toLowerCase(), value: { scale: 'partySpirit', base: 0, mult: 1 } }] };
  }
  if ((m = desc.match(/^Gain Protection equal to (\d+) \+ your Armor, and lose (\d+) Dodge for the rest of the Battle\./))
    && tgt === 'self') {
    return { ...base, range: 0, target: { select: 'self', side: 'any' }, effects: [
      { kind: 'status.apply', statusId: 'status.protection', value: { scale: 'stat', stat: 'armor', base: parseInt(m[1], 10), mult: 1 } },
      { kind: 'statMod', stat: 'dodge', value: -parseInt(m[2], 10), until: 'battle', who: 'self' }] };
  }
  // V2 shields (2026-09-23): "Gain +10 Block, +10 Ranged Block and +1 Armor until the
  // end of your next Activation." — a self statMod list with the holder's-activation lifetime.
  if ((m = desc.match(/^Gain (\+\d+ [A-Z][A-Za-z]*(?: [A-Z][a-z]+)?(?:(?:, | and )\+\d+ [A-Z][A-Za-z]*(?: [A-Z][a-z]+)?)*) until the end of your next Activation\.$/)) && tgt === 'self') {
    const STAT = { Block: 'block', 'Ranged Block': 'rangedBlock', Armor: 'armor', Dodge: 'dodge', Resist: 'resist', Luck: 'luck' };
    const effects = [];
    for (const part of m[1].split(/, | and /)) {
      const pm = part.match(/^\+(\d+) (.+)$/);
      if (!pm || !STAT[pm[2]]) return null;
      effects.push({ kind: 'statMod', stat: STAT[pm[2]], value: +pm[1], until: 'endOfNextActivation', who: 'self' });
    }
    return { ...base, range: 0, target: { select: 'self', side: 'any' }, effects };
  }
  // engine content.shields-reauthored (2026-10-04; the Armory Ledger, approved for now 2026-09-28): two more sentences, each a
  // second instance of a shape the engine has, no engine code.
  //   Shield Wall: "You and every adjacent ally gain +N Stat[ and +N Stat] until the end of your next Activation." on the
  //     vocabulary's own shape "you and allies within 1 hex" -> the same stat modifiers as the sentence above, landing on every
  //     ally within 1 of the one acting, itself among them (the engine's area targeting: the actor is one of its own allies).
  //     The lifetime is each holder's own next Activation - the only Activation lifetime the engine has (engine SWITCHES.md
  //     shieldWallAllyLifetime names what waits).
  //   Cover Ally:  "An adjacent ally gains N Protection." on "one ally within 1 hex" -> the Protection status on that ally.
  if ((m = desc.match(/^You and every adjacent ally gain (\+\d+ [A-Z][A-Za-z]*(?: [A-Z][a-z]+)?(?:(?:, | and )\+\d+ [A-Z][A-Za-z]*(?: [A-Z][a-z]+)?)*) until the end of your next Activation\.$/)) && tgt === 'you and allies within 1 hex') {
    const STAT = { Block: 'block', 'Ranged Block': 'rangedBlock', Armor: 'armor', Dodge: 'dodge', Resist: 'resist', Luck: 'luck' };
    const effects = [];
    for (const part of m[1].split(/, | and /)) {
      const pm = part.match(/^\+(\d+) (.+)$/);
      if (!pm || !STAT[pm[2]]) return null;
      effects.push({ kind: 'statMod', stat: STAT[pm[2]], value: +pm[1], until: 'endOfNextActivation' });
    }
    return { ...base, range: 0, target: { select: 'area', side: 'ally', radius: 1, origin: 'self' }, effects };
  }
  if ((m = desc.match(/^An adjacent ally gains (\d+) Protection\.$/)) && tgt === 'one ally within 1 hex') {
    return { ...base, range: 1, target: { select: 'unit', side: 'ally' }, effects: [{ kind: 'status.apply', statusId: 'status.protection', value: +m[1] }] };
  }
  // engine capability.effect-lasts-activations (2026-10-05): the Fire Gauntlet's Stoke — "For your next N Activations, every
  // hit you land applies <Status> equal to half your Magic, rounded nearest, 0.5 up." "Your Magic" is the party's (a party
  // stat); the half is the engine's nearest rounding, 0.5 up, the line's own words.
  if ((m = desc.match(/^For your next (\d+) Activations, every hit you land applies ([A-Z][a-z]+) equal to half your (Magic|Spirit), rounded nearest, 0\.5 up\.$/)) && tgt === 'self' && STATUS_OK.has(m[2].toLowerCase())) {
    const slug = p.id.replace(/^power\./, '');
    const statusId = lentStatus(p.id, p.name, { countsDown: 'activation', lends: { triggers: [{ id: `trigger.${slug}.${m[2].toLowerCase()}`, hook: 'onHit', chance: 100, select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.' + m[2].toLowerCase(), value: { scale: HALF_PARTY[m[3]], div: 2, round: 'nearest' } } }] } });
    return { ...base, range: 0, target: { select: 'self', side: 'any' }, effects: [{ kind: 'status.apply', statusId, value: +m[1], who: 'self' }] };
  }
  // … and the Staff of the Ultimate Destroyer's Perfect Sight — "Until the end of your third Activation from now, your
  // <Stat> is doubled (<Stat> added to <Stat>)." The row says what "doubled" is: the stat added to itself, once.
  if ((m = desc.match(/^Until the end of your (second|third|fourth|fifth) Activation from now, your ([A-Z][a-z]+) is doubled \(\2 added to \2\)\.$/)) && tgt === 'self' && modStatOf(m[2])) {
    const statusId = lentStatus(p.id, p.name, { countsDown: 'activation', lends: { doubles: [modStatOf(m[2])] } });
    return { ...base, range: 0, target: { select: 'self', side: 'any' }, effects: [{ kind: 'status.apply', statusId, value: COUNT_WORD[m[1]], who: 'self' }] };
  }
  // engine capability.counterattack-and-fend (2026-10-04; engine DECISIONS.md 2026-09-28 'counterattack, special free
  // attacks …'): "Gain Counterattack[ with +N Accuracy] until the end of your next Turn." / "Gain Fend[ …]" — the stat
  // the engine reads as that special free attack being up, and its own Accuracy stat, as two self statMods with the
  // existing end-of-next-Turn lifetime. No new effect and no new duration.
  // engine content.greatsword-war-axe-reauthored (2026-10-04; the Armory Ledger's Great Sword: "Counterattack and +2 Strength
  // until the end of your next turn"): one more clause, " and +N <Stat>" — a stat gained for the same lifetime, as a third
  // self statMod. A stat word the engine cannot modify compiles nothing (the power stays a named gap), never a guess.
  if ((m = desc.match(/^Gain (Counterattack|Fend)(?: with \+(\d+) Accuracy)?(?: and \+(\d+) ([A-Z][A-Za-z]*(?: [A-Z][a-z]+)?))? until the end of your next Turn\.$/)) && tgt === 'self') {
    const stat = m[1] === 'Counterattack' ? 'counterattack' : 'fend';
    const effects = [{ kind: 'statMod', stat, value: 1, until: 'endOfNextTurn', who: 'self' }];
    if (m[2]) effects.push({ kind: 'statMod', stat: stat + 'Accuracy', value: +m[2], until: 'endOfNextTurn', who: 'self' });
    if (m[3]) {
      const also = modStatOf(m[4]);
      if (!also) return null;
      effects.push({ kind: 'statMod', stat: also, value: +m[3], until: 'endOfNextTurn', who: 'self' });
    }
    return { ...base, range: 0, target: { select: 'self', side: 'any' }, effects };
  }
  return null;
}

// The area shapes the engine speaks (capability.area-attack, 2026-08-27).
// EXACT authored phrases only — "the two hexes adjacent to both you and it"
// is the halberd's full arc and compiles to 'arc'. The Lumberjack's "one hex
// adjacent to both you and it" is a DIFFERENT shape (a chosen half-arc) the
// engine does not yet express, so it stays a named gap rather than being
// rounded up to the full arc. Compile-or-name-the-gap; never round.
function burstOf(a) { return a.burst ? validateBurst(a.burst) : null; }

const prologueParty = [];
for (const id of PARTY) {
  const h = allHeroes.find((x) => x.id === id);
  if (!h) { gap(id, 'named for the prologue party, absent from the Codex', 'content'); continue; }
  const kitTriggers = [];
  const kit = (KITS.heroKits ?? KITS.heroOverrides ?? {})[id] ?? null;
  const classKit = KITS.classKits[h.class] ?? null;
  // Kit grammar (ruled 2026-08-27): a plain ARRAY is the full kit; {pinned:[...]} guarantees
  // those items and the class draw completes the rest — the pinned items convert, the
  // remainder is still a SPEC and still a named gap until dictated.
  let items = null;
  if (Array.isArray(kit)) items = kit;
  else if (kit?.pinned) {
    items = kit.pinned;
    gap(id, 'kit is PINNED ' + kit.pinned.join('+') + ' — the class-draw remainder is a SPEC; the roll belongs to the draft', 'kit remainder unresolved');
  }
  else if (classKit?.items) items = classKit.items;
  else { gap(id, `kit is a ${classKit?.pick?.random || classKit?.draw ? 'random' : 'oneOf'} SPEC — the roll belongs to the draft; needs a dictated hero override`, 'kit unresolved'); continue; }

  const attackIds = [];
  const abilityIds = [];
  let anyRanged = false;
  // seam.items-per-unit (2026-09-02): what the KIT grants is tracked apart
  // from what the ROW owns (Punch and its riders). The row ships BARE with
  // `defaultItems`; the engine applies the items at fielding. What follows
  // still computes the kit's attacks/powers/riders — for role/ai, for the
  // ItemDef rows, and because the oracle test compares against exactly this.
  const ownAttackIds = [];
  const ownTriggers = [];
  for (const itemId of items) {
    const it = ITEM_BY_ID.get(itemId);
    if (!it) { gap(id, `kit item ${itemId} not in settled-items`, 'content'); continue; }
    for (const aid of it.grants || []) {
      if (aid.startsWith('power.')) {
        // Item POWERS compile exactly as the alpha lane does (capability.
        // item-powers, 2026-08-27): the three authored shapes, else a gap.
        // Extended to the party lane with content.field-eve-24 — the 24
        // carry knight shields, holy symbols and staffs.
        const pw = SPOWER_BY_ID.get(aid);
        const row = pw && compiledPowerOf(pw, id);
        if (row) { authoredAbilities[row.id] = row; abilityIds.push(row.id); reportPowerGaps(row, (clause, needs) => gap(id, `${itemId} grants ${aid}: ${clause}`, needs)); }
        else gap(id, `${itemId} grants ${aid}`, pw ? 'item power — shape unparsed' : 'item power — no authored row');
        continue;
      }
      const a = SATTACK_BY_ID.get(aid);
      if (!a) { gap(id, `${itemId} grants ${aid} which has no attack row`, 'content'); continue; }
      // gen/weapons.json (S37a's third source) writes range as the STRING
      // "melee" — passing it into reach shipped `reach: "melee"` and the
      // engine loader refused the whole pack, loudly and correctly (Law 9).
      // Ranged means a NUMBER above 1, same as the alpha lane; melee is 1.
      const ranged = typeof a.range === 'number' && a.range > 1;
      anyRanged = anyRanged || ranged;
      authoredAttacks[a.id] = {
        ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
        damageType: damageType(a.damageType || 'physical'),
        bonus: a.damage ?? 0, stat: a.stat || 'strength',
        reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0, // heroes pay
        ...(burstOf(a) ? { burst: burstOf(a) } : {}), // capability.area-attack
        ...(a.crit ? { crit: a.crit } : {}), // station.crit 2026-08-27
        ...(a.accuracy ? { accuracy: a.accuracy } : {}),   // station.accuracy-field, 2026-09-03
        ...(a.hits > 1 ? { hits: a.hits } : {}),   // attack.multihit, 2026-09-03
    ...(a.cooldown ? { cooldown: a.cooldown } : {}),   // engine content.shields-reauthored (2026-10-04): the row's own cooldown — it was dropped, silently, on every weapon attack
    ...twoStatTerms(a),   // engine capability.damage-from-two-stats (2026-10-05)
    ...accuracyVsOf(a),   // engine capability.summons (2026-10-05)
      };
      attackIds.push(a.id);
      kitTriggers.push(...settledAttackExtras(a, id));
    }
  }
  // Universal attacks (Punch, re-ruled 2026-08-27: every classed hero of the six classes;
  // S-1, 0 stamina, -5 accuracy, -5 crit, brawl+melee) — the flag on the row, honored here
  // as the alpha pass already does.
  for (const a of [...SATTACK_BY_ID.values()].filter((x) => x.universalToAllUnits)) {
    if (attackIds.includes(a.id)) continue;
    authoredAttacks[a.id] = {
      ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name, kind: 'melee', damageType: damageType(a.damageType || 'physical'),
      bonus: a.damage ?? 0, stat: a.stat || 'strength', reach: 1, staminaCost: a.stamina ?? 0,
      ...(a.accuracy ? { accuracy: a.accuracy } : {}),   // station.accuracy-field (2026-09-03): Punch's −5 has a slot
    };
    attackIds.push(a.id);
    ownAttackIds.push(a.id);
    ownTriggers.push(...settledAttackExtras(a, id));
  }

  // Fold kit-item stat modifiers into the row (the armor pins are the first kit items
  // whose whole payload IS the mods — without this the Destroyed Mail does nothing).
  // BARE since seam.items-per-unit: the fold below is applied to a COPY for
  // the gap census only; the row carries the Codex body and `defaultItems`,
  // and the engine folds the same numbers at fielding (applyItems).
  const p = { ...h.ported }, d = { ...h.derivedBase };
  const bareP = { ...h.ported }, bareD = { ...h.derivedBase };
  // Which Codex object a stat word folds into: the derived four live on derivedBase, the rest on
  // ported; whether it is a stat at all is STAT_OF's (one map). The key stays the Codex word.
  const DERIVED_WORDS = new Set(['accuracy', 'movement', 'staminaMax', 'staminaRegen']);
  const foldOf = (stat) => statOf(stat) ? [DERIVED_WORDS.has(stat) ? d : p, stat] : undefined;
  for (const itemId of items) {
    const it = ITEM_BY_ID.get(itemId);
    for (const [stat, v] of Object.entries(it?.statModifiers || {})) {
      const f = foldOf(stat);
      if (f) f[0][f[1]] = (f[0][f[1]] || 0) + v;
      else gap(id, `${itemId} statModifier '${stat}' ${v}`, 'stat: ' + stat + ' (no UnitDef field)');
    }
  }
  { const p = bareP, d = bareD;
  prologueParty.push({
    typeId: id, name: h.name, side: 'hero',
    maxHp: p.health, armor: p.armor ?? 0, resist: p.resist ?? 0, ...optionalCombatStats(p),
    accuracy: d.accuracy, dodge: p.dodge ?? 0, ...(p.toughness ? { toughness: p.toughness } : {}),
    ...heroRuleStats(d, p), ...((d.luck ?? p.luck) ? { luck: d.luck ?? p.luck } : {}), // station.crit; crit over the engine's base (fix.codex-numbers)
    strength: p.strength ?? 0, precision: p.precision ?? 0, magic: p.magic ?? 0, spirit: p.spirit ?? 0,
    // role and ai derived from the DEFAULT kit's attacks — the engine derives
    // them again from whatever kit it is handed (seam.items-per-unit)
    role: anyRanged ? 'ranged' : 'melee',
    movement: d.movement,
    // Reach as AUTHORED (Hunter 3). The Codex-wide reach sweep (ruled: 0 is
    // the default, higher unusual) is content work still owed; fielding what
    // the row says is the data leading, and the sweep will move it.
    reach: p.reach ?? 0,
    maxStamina: d.staminaMax, staminaRegen: d.staminaRegen ?? 1,
    // no ai: the engine derives a hero's default from its kit (core/items.ts defaultAiOf; C16)
    attacks: ownAttackIds, abilities: [],
    moves: movesForClass(h.class),
    // hero assembly (2026-09-03): the class rides on tags so fieldedDef can find the level table
    tags: ['hero', ...(h.class ? [h.class] : [])],
    triggers: distinctTriggerIds(id, ownTriggers),
    defaultItems: items.filter((i) => ITEM_BY_ID.has(i)),
  }); }
}

// ── THE ALPHA TEAM (dictated 2026-08-27) ────────────────────────────────────
// The test cohort rebuilt on the real scaffolding: settled.json alphaTeam rows,
// armed through kit -> authored items -> authored attack rows, one per class.
// Punch arrives via the universalToAllUnits flag on the attack row — honored
// here (the party and civilian passes above predate this and still do not;
// the engine session's call whether to extend them). Item-granted POWERS
// (Block, Storm, Heal…) are NAMED GAPS, not conversions — AbilityDef only
// speaks Arcane-Bolt-shaped blasts, and guessing at Block would invent rules.
const alphaTeam = [];
{
  const AT = SETTLED.alphaTeam?.heroes || [];
  const universals = [...SATTACK_BY_ID.values()].filter((a) => a.universalToAllUnits);
  for (const h of AT) {
    const id = h.typeId;
    const kitTriggers = (h.triggers || []).flatMap((t) => compileTrigger(t, id, null));
    // seam.items-per-unit (2026-09-02): the row's OWN triggers are the hero's
    // Codex riders; the kit's ride the items. The row ships bare.
    const ownTriggers = [...kitTriggers];
    const attackIds = [];
    const ownAttackIds = [];
    let anyRanged = false;
    const takeAttack = (a, own = false) => {
      const ranged = (a.range ?? 1) > 1 && typeof a.range === 'number';
      anyRanged = anyRanged || ranged;
      const burst = burstOf(a);
      authoredAttacks[a.id] = {
        ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
        damageType: damageType(a.damageType || 'physical'),
        bonus: a.damage ?? 0, stat: a.stat || 'strength',
        reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0, // heroes pay
        ...(burst ? { burst } : {}), // capability.area-attack, 2026-08-27
        ...(a.crit ? { crit: a.crit } : {}), // station.crit, 2026-08-27
        ...(a.accuracy ? { accuracy: a.accuracy } : {}),   // station.accuracy-field, 2026-09-03
        ...(a.hits > 1 ? { hits: a.hits } : {}),   // attack.multihit, 2026-09-03
    ...(a.cooldown ? { cooldown: a.cooldown } : {}),   // engine content.shields-reauthored (2026-10-04): the row's own cooldown — it was dropped, silently, on every weapon attack
    ...twoStatTerms(a),   // engine capability.damage-from-two-stats (2026-10-05)
    ...accuracyVsOf(a),   // engine capability.summons (2026-10-05)
      };
      attackIds.push(a.id);
      const extras = settledAttackExtras(a, id);
      kitTriggers.push(...extras);
      if (own) { ownAttackIds.push(a.id); ownTriggers.push(...extras); }
    };
    const abilityIds = [];
    for (const itemId of h.kit || []) {
      const it = ITEM_BY_ID.get(itemId);
      if (!it) { gap(id, `kit item ${itemId} has no authored row`, 'content'); continue; }
      for (const aid of it.grants || []) {
        if (aid.startsWith('power.')) {
          // capability.item-powers (2026-08-27): the three authored shapes
          // compile; anything else stays a named gap.
          const pw = SPOWER_BY_ID.get(aid);
          const row = pw && compiledPowerOf(pw, id);
          if (row) { authoredAbilities[row.id] = row; abilityIds.push(row.id); reportPowerGaps(row, (clause, needs) => gap(id, `${itemId} grants ${aid}: ${clause}`, needs)); }
          else gap(id, `${itemId} grants ${aid}`, pw ? 'item power — shape unparsed' : 'item power — no authored row');
          continue;
        }
        const a = SATTACK_BY_ID.get(aid);
        if (!a) { gap(id, `${itemId} grants ${aid} which has no attack row`, 'content'); continue; }
        takeAttack(a);
      }
    }
    for (const a of universals) if (!attackIds.includes(a.id)) takeAttack(a, true);
    // STAT BODIES VIA copyOf (fixed 2026-08-27). S31 wrote `ported: {}` and
    // `derivedBase: {}` on every alphaTeam row and put the real source in
    // `copyOf` — this block read the empty objects and emitted heroes with no
    // maxHp/accuracy/movement/maxStamina and strength 0. Resolving copyOf
    // through the Codex is compilation, not invention: the id names the
    // source. Settled's own fields still win wherever they actually speak.
    const base = allHeroes.find((x) => x.id === h.copyOf);
    if (!base && !(h.ported && h.ported.health)) {
      gap(id, `copyOf ${h.copyOf} not in the Codex and ported is empty — no stat body`, 'content');
      continue;
    }
    const p = { ...(base?.ported || {}), ...(h.ported || {}) };
    const d = { ...(base?.derivedBase || {}), ...(h.derivedBase || {}) };
    alphaTeam.push({
      typeId: id, name: h.name, side: 'hero',
      maxHp: p.health, armor: p.armor ?? 0, resist: p.resist ?? 0, ...optionalCombatStats(p),
      accuracy: d.accuracy, dodge: p.dodge ?? 0, ...(p.toughness ? { toughness: p.toughness } : {}),
      ...heroRuleStats(d, p), ...(d.luck ?? p.luck ? { luck: d.luck ?? p.luck } : {}), // station.crit 2026-08-27; crit over the engine's base (fix.codex-numbers)
      strength: p.strength ?? 0, precision: p.precision ?? 0, magic: p.magic ?? 0, spirit: p.spirit ?? 0,
      role: anyRanged ? 'ranged' : 'melee',
      movement: d.movement, reach: p.reach ?? 0,
      maxStamina: d.staminaMax, staminaRegen: d.staminaRegen ?? 1,
      // an authored ai rides; otherwise the engine derives it from the kit (defaultAiOf; C16)
      ...(h.ai ? { ai: h.ai } : {}),
      // an AUTHORED ai (settled.json says so) survives a re-kit at fielding;
      // a derived one is derived again (seam.items-per-unit)
      ...(h.ai ? { aiAuthored: true } : {}),
      attacks: ownAttackIds, abilities: [],
      moves: movesForClass(h.class),
      tags: ['hero', ...(h.class ? [h.class] : [])],
      triggers: distinctTriggerIds(id, ownTriggers),
      defaultItems: (h.kit || []).filter((i) => ITEM_BY_ID.has(i)),
    });
  }
}

// ── THE CIVILIANS (content.civilians, 2026-08-26) ───────────────────────────
// RULED (twice, 2026-08-26): "they do things. They're just like the other
// heroes" — and, correcting this converter's first reading, "civilians are
// EXACTLY like heroes." Stamina included: the rows' derived staminaMax 0 is
// stale derivation, overridden by the documented level-1 hero baseline
// (COMBAT-DESIGN.md:461, "Level-1 hero: Max 5, Regen 1" — copied, not
// invented), and attacks cost what their rows author. The Lumberjack's axe
// grants attacks that exist only as NAMES (no authored rows) — he fields
// weaponless with a named gap, the shadow-hound-puppy precedent.
// encounter.runner (2026-09-03): the School Teacher and School Children join —
// encounter.prologue-3 places them, and ruled 2026-08-25 confirms all three
// (encounters.json civilians.confirmed). Read the list from the data.
// (ENC is read above)
const namedByEncounters = [...(ENC.prologue || []), ...(ENC.scripted || []), ...(ENC.authored || [])]
  .flatMap((row) => [...(row.setup || []), ...(row.schedule || []).flatMap((r) => r.spawn || [])]).map((s) => s.unit).filter((u) => u && u.startsWith('hero.fixed.'));
const CIVILIANS = [...new Set(['hero.fixed.orphans', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer', ...(ENC.civilians?.confirmed || []), ...namedByEncounters])];
for (const id of CIVILIANS) {
  const h = allHeroes.find((x) => x.id === id);
  if (!h) { gap(id, 'named for the prologue, absent from the Codex', 'content'); continue; }
  const p2 = h.ported, d2 = h.derivedBase;
  // crit/luck compile since station.crit (2026-08-27) — see the enemy block.
  const attackIds = [];
  const civTriggers = [];
  let anyRanged = false;
  // seam.items-per-unit (2026-09-02): civilians ship bare too — their kit
  // (rocks, a pitchfork, the weaponless axe) applies at fielding.
  for (const itemId of h.kit || []) {
    const it = ITEM_BY_ID.get(itemId);
    if (!it) { gap(id, `kit item ${itemId} has no settled-items row`, 'content: item unauthored'); continue; }
    for (const aid of it.grants || []) {
      const a = SATTACK_BY_ID.get(aid);
      if (!a) { gap(id, `${itemId} grants ${aid} which has no attack row`, 'content: attack rows unauthored'); continue; }
      const ranged = typeof a.range === 'number' && a.range > 1;
      anyRanged = anyRanged || ranged;
      authoredAttacks[a.id] = {
        ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
        damageType: damageType(a.damageType || 'physical'),
        bonus: a.damage ?? 0, stat: a.stat || 'strength',
        // Civilians are EXACTLY like heroes (ruled 2026-08-26): they pay
        // what the attack row authors.
        reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0,
        ...(burstOf(a) ? { burst: burstOf(a) } : {}), // capability.area-attack
        ...(a.crit ? { crit: a.crit } : {}), // station.crit 2026-08-27
        ...(a.accuracy ? { accuracy: a.accuracy } : {}),   // station.accuracy-field, 2026-09-03
        ...(a.hits > 1 ? { hits: a.hits } : {}),   // attack.multihit, 2026-09-03
    ...(a.cooldown ? { cooldown: a.cooldown } : {}),   // engine content.shields-reauthored (2026-10-04): the row's own cooldown — it was dropped, silently, on every weapon attack
    ...twoStatTerms(a),   // engine capability.damage-from-two-stats (2026-10-05)
    ...accuracyVsOf(a),   // engine capability.summons (2026-10-05)
      };
      attackIds.push(a.id);
      civTriggers.push(...settledAttackExtras(a, id));
    }
  }
  // PUNCH. Ruled 2026-09-05: "every civilian should have punch like every other
  // player-controlled unit... nothing is supposed to be fielded without attacks."
  // The civilian lane was the one lane that never honoured universalToAllUnits — the alpha
  // and party lanes have since 2026-08-27 — and it also shipped `attacks: []` outright, so
  // all fourteen fielded civilians reached the engine unable to attack at all. The KIT's
  // attacks still arrive at fielding through defaultItems (seam.items-per-unit); Punch is the
  // unit's own and belongs on the row, exactly as it does for a hero.
  const civOwnAttackIds = [];
  for (const a of [...SATTACK_BY_ID.values()].filter((x) => x.universalToAllUnits)) {
    if (attackIds.includes(a.id)) continue;
    authoredAttacks[a.id] = {
      ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name, kind: 'melee', damageType: damageType(a.damageType || 'physical'),
      bonus: a.damage ?? 0, stat: a.stat || 'strength', reach: 1, staminaCost: a.stamina ?? 0,
      ...(a.crit ? { crit: a.crit } : {}),
      ...(a.accuracy ? { accuracy: a.accuracy } : {}),
    };
    attackIds.push(a.id);
    civOwnAttackIds.push(a.id);
    civTriggers.push(...settledAttackExtras(a, id));
  }
  prologueParty.push({
    typeId: id, name: h.name, side: 'hero',
    maxHp: p2.health, armor: p2.armor ?? 0, resist: p2.resist ?? 0, ...optionalCombatStats(p2),
    accuracy: d2.accuracy, dodge: p2.dodge ?? 0, ...(p2.toughness ? { toughness: p2.toughness } : {}),
    ...heroRuleStats(d2, p2), ...(d2.luck ?? p2.luck ? { luck: d2.luck ?? p2.luck } : {}), // station.crit 2026-08-27; crit over the engine's base (fix.codex-numbers)
    strength: p2.strength ?? 0, precision: p2.precision ?? 0, magic: p2.magic ?? 0, spirit: p2.spirit ?? 0,
    role: anyRanged ? 'ranged' : 'melee',
    movement: d2.movement, reach: p2.reach ?? 0,
    // The level-1 hero baseline (COMBAT-DESIGN.md:461) — the rows' derived 0
    // is stale and the ruling says exactly-like-heroes.
    maxStamina: 5, staminaRegen: 1,
    // no ai: the engine derives it from the kit (core/items.ts defaultAiOf; C16)
    attacks: civOwnAttackIds, abilities: [],
    // "Beasts and Civilians get neither" half-step (Codex 2026-08-21).
    moves: ['power.move'],
    tags: ['hero', 'civilian', ...(h.class ? [h.class] : [])],
    // progression.level-table-by-type (ruled 2026-09-03): a civilian levels on
    // its TYPE's table when the Codex points it at one (civilian.farmer);
    // no pointer = the class.civilian table, as before.
    ...(h.levelTable ? { levelTable: h.levelTable } : {}),
    triggers: [],
    defaultItems: (h.kit || []).filter((i) => ITEM_BY_ID.has(i)),
    // fix.civilians-field-kit (ruled 2026-10-03, engine DECISIONS.md 'every civilian fields its kit by default when
    // an encounter places it'): this kit is what an encounter-placed civilian fields — the engine's one rule for
    // every placed unit, read off defaultItems. The opt-in row flag of 2026-10-02 (placedWithKit) is retired.
  });
}


// The Critical Injury Chart rides along verbatim — ruled data, not a kind
// (2026-08-27). The engine folds it from here; COMBAT-DESIGN.md is the design
// authority and settled.json holds the one machine copy.
// ── THE CRITICAL INJURY CHART (station.crit, 2026-08-27) ────────────────────
// settled.json carries the DICTATED PROSE (one machine copy of the ruling);
// the engine never parses prose at runtime, so the ten fixed strings compile
// HERE into structured effects — compile-or-name-the-gap, like every row.
// The one clause the engine cannot express is dropped with a named gap:
// Knocked Sprawling's −50 Surge (no surge quantity a statMod can move). Blinded's
// −4 Vision compiles since the stat words are one map read against the engine's
// vocabulary (plumbing.vocabulary-export, 2026-09-28) — the vision model it waited
// on landed 2026-09-03 (capability.vision). The push LANDS — forced movement was built
// today (capability.knockback), overtaking the row's own `needs` note.
// The chart's "loses access to class powers" status. A placeholder id, see the
// settled.json row's source; the ONE other place it is named.
const POWERS_LOCKED = 'status.powers-locked';
function compileCritChart(chart) {
  const rows = [];
  for (const r of chart.rows || []) {
    const effects = [];
    const floored = /minimum of 0/.test(r.effect);
    for (const clause of r.effect.replace(/, (all )?to a minimum of 0/, '').split(/, | and /)) {
      let m;
      if ((m = clause.match(/^-(\d+) ([A-Za-z ]+)$/))) {
        const statName = m[2].trim();
        if (statName === 'Max Health') { effects.push({ kind: 'loseMaxHp', value: parseInt(m[1], 10) }); continue; }
        const stat = modStatOf(statName);
        if (!stat) { gap('critChart', `${r.key}: -${m[1]} ${statName}`, statName === 'Surge' ? 'no surge quantity in the engine' : 'stat: ' + statName); continue; }
        effects.push({ kind: 'statMod', stat, value: -parseInt(m[1], 10), until: 'battle', ...(floored ? { floor: 0 } : {}) });
      } else if ((m = clause.match(/^(\d+) turns?$/))) {
        const prev = effects[effects.length - 1];
        if (prev && prev.statusId === POWERS_LOCKED && prev.value === 0) prev.value = parseInt(m[1], 10);
        else gap('critChart', `${r.key}: dangling duration '${clause}'`, 'unparsed chart clause');
      } else if ((m = clause.match(/^gain (\d+) ([A-Za-z]+)$/)) || (m = clause.match(/^(\d+) ([A-Za-z]+)$/))) {
        const status = m[2].toLowerCase();
        if (!STATUS_OK.has(status) && status !== 'dazed') { gap('critChart', `${r.key}: ${clause}`, 'status: ' + status); continue; }
        effects.push({ kind: 'status.apply', statusId: 'status.' + status, value: parseInt(m[1], 10) });
      } else if ((m = clause.match(/^pushed (\d+) hex(?:es)?$/))) {
        effects.push({ kind: 'knockback', value: parseInt(m[1], 10) });
      } else if ((m = clause.match(/^lose (\d+) Stamina$/))) {
        effects.push({ kind: 'stamina.drain', value: parseInt(m[1], 10) });
      } else if ((m = clause.match(/^loses access to class powers$/))) {
        // "loses access to class powers, 3 turns" — the duration arrives as
        // the next clause; handled above. The chart's Dazed row and the Dazed
        // STATUS are two different things (Andrew 2026-09-02: "there is a
        // critical effect, and then there is a status effect"), so the row
        // applies status.powers-locked — the Codex row whose one sentence is
        // exactly this clause. Rename there and here, nowhere else.
        effects.push({ kind: 'status.apply', statusId: POWERS_LOCKED, value: 0 });
      } else {
        gap('critChart', `${r.key}: '${clause}'`, 'unparsed chart clause');
      }
    }
    if (effects.length === 0) { gap('critChart', `${r.key}: no clause compiled — row lands EMPTY`, 'unparsed chart row'); }
    rows.push({ key: r.key, name: r.name, effects });
  }
  return { note: chart.note, rows };
}

// ── ITEMS (pack.items, 2026-09-02 — ITEMS-PLAN.md §3) ────────────────────────
// Every Codex item row becomes an ItemDef: the physical facts the engine
// checks (hands, slots), the stat modifiers in ENGINE stat names, the attack
// ids it grants (every one compiled into authoredAttacks, so the attack id
// space widens to every grant of every item), the item powers that compile,
// and the item-level triggers the grammar reads. Compile or name the gap: a
// clause the engine cannot express is dropped AND recorded on the row itself
// (`gaps`), so a fielding that hands a hero an item the engine only half
// understands can say so — never a silent, inert item. Consumables and
// activated trinkets/relics are ABILITIES WITH CHARGES the engine lacks
// (ITEMS-PLAN §7); they emit with their stat payload and the active named.
// (item stat words are STAT_OF — one map)
function takeItemAttack(a) {
  if (authoredAttacks[a.id]) return;
  const ranged = typeof a.range === 'number' && a.range > 1;
  const burst = burstOf(a);
  authoredAttacks[a.id] = {
    ...packetFields(a), ...actionSlot(a), id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
    damageType: damageType(a.damageType || 'physical'),
    bonus: a.damage ?? 0, stat: a.stat || 'strength',
    reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0,
    ...(burst ? { burst } : {}),
    ...(a.crit ? { crit: a.crit } : {}),
    ...(a.accuracy ? { accuracy: a.accuracy } : {}),   // station.accuracy-field, 2026-09-03
    ...(a.hits > 1 ? { hits: a.hits } : {}),   // attack.multihit, 2026-09-03
    ...(a.cooldown ? { cooldown: a.cooldown } : {}),   // engine content.shields-reauthored (2026-10-04): the row's own cooldown — it was dropped, silently, on every weapon attack
    ...twoStatTerms(a),   // engine capability.damage-from-two-stats (2026-10-05)
    ...accuracyVsOf(a),   // engine capability.summons (2026-10-05)
  };
}
// ── ITEM ACTIVES (capability.charges, 2026-09-03) ───────────────────────────
// The targeting grammar is gen/functions.json's (review finding C17): every phrase the two
// compilers below accept must be one of its shapes, normalized exactly as functions.mjs counts
// them (digits -> N, 'N hex' -> 'N hexes'). A phrase outside the vocabulary fails the build.
const TARGET_SHAPES = new Set(JSON.parse(fs.readFileSync('gen/functions.json', 'utf8')).shapes.map((x) => x.name));
function inVocabulary(tgt, compiled) {
  // "every other unit within N hexes" is the excluding-self form of the shape "every unit within N hexes" (functions.mjs
  // counts it under that shape; engine SWITCHES everyOtherUnitPhrase) — legal exactly when that shape is
  if (compiled && tgt && !TARGET_SHAPES.has(String(tgt).replace(/^every other unit within /, 'every unit within ').replace(/\d+/g, 'N').replace(/\bN hex\b/g, 'N hexes')))
    throw new Error(`mkenginepack: targeting '${tgt}' compiles here but is not a shape in gen/functions.json — run functions.mjs, or the phrase is off-vocabulary`);
  return compiled;
}
const ITEM_TARGET = (tgt) => inVocabulary(tgt, ITEM_TARGET_RAW(tgt));
const ITEM_TARGET_RAW = (tgt) => {
  let r;
  if (!tgt || tgt === 'self') return { target: { select: 'self', side: 'any' }, range: 0 };
  // engine capability.placed-traps (2026-10-05): "one empty hex within N" / "two empty hexes within N" — a power aimed at an
  // empty hex (the engine's select 'hex'); two is ONE use aimed at two hexes, one after another (the engine's `hexes`)
  if ((r = tgt.match(/^(one|two) empty hex(?:es)? within (\d+)$/)) && (r[1] === 'two') === /hexes/.test(tgt)) return { target: { select: 'hex', side: 'any' }, range: +r[2], hexes: r[1] === 'two' ? 2 : 1 };
  if ((r = tgt.match(/^(?:yourself or )?one ally within (\d+) hex(?:es)?$/))) return { target: { select: 'unit', side: 'ally' }, range: +r[1] };
  // engine capability.stabilise-downed-ally (2026-10-05): "one downed ally within N hex" — aimed at a DOWNED unit of the user's
  // side and at nothing else (the engine's Targeting.life 'downed')
  if ((r = tgt.match(/^one downed ally within (\d+) hex(?:es)?$/))) return { target: { select: 'unit', side: 'ally', life: 'downed' }, range: +r[1] };
  if ((r = tgt.match(/^one enemy within (\d+) hex(?:es)?$/))) return { target: { select: 'unit', side: 'enemy' }, range: +r[1] };
  if ((r = tgt.match(/^allies within (\d+) hexes$/))) return { target: { select: 'area', side: 'ally', radius: +r[1], origin: 'self' }, range: 0 };
  return null;
};
// engine capability.placed-traps (2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a feature that is
// needed …': "All of those deadlines need to be added in as features that we need."): his four trap items. One sentence pair,
// read whole — "Once per Battle: place one|two trap[s] on [an] empty hex[es] within N. The first unit to enter one|it[, and
// every unit within R hex,] takes <damage>[ and|, gains <Status> V][, and the hex gains Burning]." — into the engine's
// trap.place on a hex-aimed power: the damage is a flat number of a type ("4 physical damage") or the PARTY's Magic scaled
// ("magic damage equal to [twice ]your Magic[ plus B]" — "your Magic" is the party's, read when the trap springs), the status
// lands on the unit that entered, the radius strikes every unit round the trap's hex, and the layer is the hex's. The count
// and the range must agree with the row's `targets`; a line that is not this sentence compiles nothing (a named gap, as before).
function compileTrap(it, row, tg) {
  const desc = String(row.description || '');
  const m = desc.match(/^Once per Battle: place (one|two) traps? on (?:an )?empty hex(?:es)? within (\d+)\. The first unit to enter (?:one|it)(?:, and every unit within (\d+) hex(?:es)?,)? takes (.+)\.$/);
  if (!m) return null;
  if ((m[1] === 'two' ? 2 : 1) !== tg.hexes || +m[2] !== tg.range) throw new Error(`mkenginepack: ${it.id} places ${m[1]} within ${m[2]} by its sentence and targets '${row.targets}'`);
  const trap = {};
  let rest = m[4], d, s;
  if ((d = rest.match(/^(\d+) (physical|magic|fire|poison|shadow|true) damage(.*)$/))) { trap.damage = { amount: +d[1], damageType: d[2] }; rest = d[3]; }
  else if ((d = rest.match(/^(physical|magic|fire|poison|shadow|true) damage equal to (twice )?your Magic(?: plus (\d+))?(.*)$/))) { trap.damage = { amount: { scale: 'partyMagic', base: +(d[3] ?? 0), mult: d[2] ? 2 : 1 }, damageType: d[1] }; rest = d[4]; }
  else return null;
  if ((s = rest.match(/^(?:,| and) gains ([A-Z][a-z]+) (\d+)(.*)$/))) { if (!STATUS_OK.has(s[1].toLowerCase())) return null; trap.statuses = [{ statusId: 'status.' + s[1].toLowerCase(), value: +s[2] }]; rest = s[3]; }
  if (m[3]) trap.radius = +m[3];
  if ((s = rest.match(/^, and the hex gains (Burning)$/))) { trap.paints = 'layer.' + s[1].toLowerCase(); rest = ''; }
  if (rest !== '') return null;
  return { id: it.id.replace(/^item\./, 'power.') + '.use', name: it.name, ...actionSlot(row), staminaCost: row.stamina ?? 0, cooldown: row.cooldown ?? 0,
    ...(row.uses !== undefined ? { uses: typeof row.uses === 'number' ? row.uses : (row.uses.perBattle ?? row.uses.count ?? 1) } : {}),
    range: tg.range, target: tg.target, ...(tg.hexes > 1 ? { hexes: tg.hexes } : {}), effects: [{ kind: 'trap.place', ...trap }] };
}
function compileItemActive(it, row) {
  const desc = String(row.description || '');
  const tg = ITEM_TARGET(row.targets);
  if (!tg) return null;
  if (tg.target.select === 'hex') return compileTrap(it, row, tg);
  const free = /^Free[,.: ]/.test(desc) || /^Once per Battle: /.test(desc) && row.stamina === 0 && !/costs your primary/.test(desc);
  const effects = []; const gaps = [];
  // the rule sentence: after "Free, 0 Stamina:" / "Once per Battle, 2 Stamina:" / "Costs your primary action, 0 Stamina:" / "Free."
  let rule = desc.replace(/^(Free|Once per Battle|Costs your primary action)(,? (?:costs your primary action and )?\d Stamina)?[:.]\s*/, '').trim();
  const parts = rule.split(/(?<=\.)\s+/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean);
  const SP = (base, mult = 1) => ({ scale: 'partySpirit', base, mult });
  for (const s0 of parts) {
    let m;
    // engine capability.stabilise-downed-ally (2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a
    // feature that is needed …'): the Bandages — "stabilize a downed ally — their bleed-out counter stops", on a row aimed at
    // one downed ally: the engine's bleedout.stop. On any other targeting the sentence is a named gap (it says a downed ally).
    if (/^stabilize a downed ally — their bleed-out counter stops$/.test(s0) && tg.target.life === 'downed') { effects.push({ kind: 'bleedout.stop' }); continue; }
    if ((m = s0.match(/^heal (\d+)$/i))) { effects.push({ kind: 'heal', amount: +m[1] }); continue; }
    if ((m = s0.match(/^Heal (\d+) and remove (\d+) ([A-Z][a-z]+)$/))) { effects.push({ kind: 'heal', amount: +m[1] }); effects.push({ kind: 'status.remove', statusId: 'status.' + m[3].toLowerCase(), value: +m[2] }); continue; }
    if ((m = s0.match(/^remove (\d+) ([A-Z][a-z]+)$/i))) { effects.push({ kind: 'status.remove', statusId: 'status.' + m[2].toLowerCase(), value: +m[1] }); continue; }
    if ((m = s0.match(/^remove (\d+) ([A-Z][a-z]+) and (\d+) ([A-Z][a-z]+) from yourself$/i))) { effects.push({ kind: 'status.remove', statusId: 'status.' + m[2].toLowerCase(), value: +m[1] }); effects.push({ kind: 'status.remove', statusId: 'status.' + m[4].toLowerCase(), value: +m[3] }); continue; }
    if ((m = s0.match(/^Remove (\d+) ([A-Z][a-z]+), (\d+) ([A-Z][a-z]+) and (\d+) ([A-Z][a-z]+) from the target$/))) { for (const [n, w] of [[m[1], m[2]], [m[3], m[4]], [m[5], m[6]]]) effects.push({ kind: 'status.remove', statusId: 'status.' + w.toLowerCase(), value: +n }); continue; }
    if ((m = s0.match(/^regain (\d+) Stamina$/))) { effects.push({ kind: 'stamina.gain', value: +m[1] }); continue; }
    // engine capability.effect-lasts-activations (2026-10-05): Poison Coating — "for the rest of the Battle, the target's hits
    // have a N% chance to apply K <Status>": a status with no clock on the target, lending the trigger at its chance
    if ((m = s0.match(/^for the rest of the Battle, the target's hits have a (\d+)% chance to apply (\d+) ([A-Z][a-z]+)$/)) && STATUS_OK.has(m[3].toLowerCase())) {
      const slug = it.id.replace(/^item\./, '');
      const statusId = lentStatus(it.id, it.name, { lends: { triggers: [{ id: `trigger.${slug}.${m[3].toLowerCase()}`, hook: 'onHit', chance: +m[1], select: 'target',
        effect: { kind: 'status.apply', statusId: 'status.' + m[3].toLowerCase(), value: +m[2] } }] } });
      effects.push({ kind: 'status.apply', statusId, value: 1 }); continue;
    }
    if ((m = s0.match(/^apply (\d+) ([A-Z][a-z]+) to a target within \d+$/))) { effects.push({ kind: 'status.apply', statusId: 'status.' + m[2].toLowerCase(), value: +m[1] }); continue; }
    if ((m = s0.match(/^apply (\d+) ([A-Z][a-z]+) to a target within \d+, and the hex it stands on gains Burning$/))) { effects.push({ kind: 'status.apply', statusId: 'status.' + m[2].toLowerCase(), value: +m[1] }); gaps.push('and the hex it stands on gains Burning — a painted layer from a power (not yet an ability effect)'); continue; }
    if ((m = s0.match(/^Gain (\d+) Protection$/))) { effects.push({ kind: 'status.apply', statusId: 'status.protection', value: +m[1] }); continue; }
    if ((m = s0.match(/^The target gains Protection equal to (\d+) \+ Spirit$/))) { effects.push({ kind: 'status.apply', statusId: 'status.protection', value: SP(+m[1]) }); continue; }
    if ((m = s0.match(/^Each ally within \d+ hexes, including you, heals (\d+) \+ Spirit$/))) { effects.push({ kind: 'heal', amount: SP(+m[1]) }); continue; }
    if ((m = s0.match(/^Each ally within \d+ hexes, including you, removes all Stun and all Weak and gains \+(\d+) Resist for the rest of the Battle$/))) { effects.push({ kind: 'status.remove', statusId: 'status.stun' }); effects.push({ kind: 'status.remove', statusId: 'status.weak' }); effects.push({ kind: 'statMod', stat: 'resist', value: +m[1], until: 'battle' }); continue; }
    if ((m = s0.match(/^gain \+(\d+) ([A-Z][a-z]+) and lose (\d+) ([A-Z][a-z]+) for the rest of the Battle$/))) { effects.push({ kind: 'statMod', stat: modStatOf(m[2]), value: +m[1], until: 'battle', who: 'self' }); effects.push({ kind: 'statMod', stat: modStatOf(m[4]), value: -m[3], until: 'battle', who: 'self' }); continue; }
    if ((m = s0.match(/^until the end of your Activation, gain \+(\d+) ([A-Z][a-z]+) and \+(\d+) ([A-Z][a-z]+), and lose (\d+) ([A-Z][a-z]+)$/))) { effects.push({ kind: 'statMod', stat: modStatOf(m[2]), value: +m[1], until: 'endOfActivation', who: 'self' }); effects.push({ kind: 'statMod', stat: modStatOf(m[4]), value: +m[3], until: 'endOfActivation', who: 'self' }); effects.push({ kind: 'statMod', stat: modStatOf(m[6]), value: -m[5], until: 'endOfActivation', who: 'self' }); continue; }   // C20 (engine fix.one-effect-vocabulary, 2026-10-01): was read as the end of the Turn, with a gap
    if ((m = s0.match(/^the target gains \+(\d+) Movement for the rest of the Battle and loses (\d+) Root and (\d+) Slow$/))) { effects.push({ kind: 'statMod', stat: 'movement', value: +m[1], until: 'battle' }); effects.push({ kind: 'status.remove', statusId: 'status.root', value: +m[2] }); effects.push({ kind: 'status.remove', statusId: 'status.slow', value: +m[3] }); continue; }
    if ((m = s0.match(/^Until the end of your next Turn, your attacks gain \+(\d+) Accuracy$/))) { effects.push({ kind: 'statMod', stat: 'accuracy', value: +m[1], until: 'endOfNextTurn', who: 'self' }); continue; }
    if ((m = s0.match(/^Until the end of your next Turn you gain \+(\d+) ([A-Z][a-z]+) and \+(\d+) ([A-Z][a-z]+)$/))) { effects.push({ kind: 'statMod', stat: modStatOf(m[2]), value: +m[1], until: 'endOfNextTurn', who: 'self' }); effects.push({ kind: 'statMod', stat: modStatOf(m[4]), value: +m[3], until: 'endOfNextTurn', who: 'self' }); continue; }
    if ((m = s0.match(/^Heal (\d+) and remove (\d+) ([A-Z][a-z]+)$/))) { effects.push({ kind: 'heal', amount: +m[1] }); effects.push({ kind: 'status.remove', statusId: 'status.' + m[3].toLowerCase(), value: +m[2] }); continue; }
    if ((m = s0.match(/^You take -(\d+) Accuracy until the end of your next Turn$/))) { effects.push({ kind: 'statMod', stat: 'accuracy', value: -m[1], until: 'endOfNextTurn', who: 'self' }); continue; }
    if (/^(Protection is spent|Spirit is the party-wide|Surplus over|Bleed is TRUE|You must be adjacent|The ferryman)/.test(s0)) continue;   // explanation, not rule
    gaps.push(`unparsed: ${s0.slice(0, 70)}`);
  }
  if (!effects.length) return null;
  for (const e of effects) if (e.kind === 'statMod' && !e.stat) return null;
  return { id: it.id.replace(/^item\./, 'power.') + '.use', name: it.name, ...actionSlot(row), staminaCost: row.stamina ?? 0, cooldown: row.cooldown ?? 0,
    ...(row.uses !== undefined ? { uses: typeof row.uses === 'number' ? row.uses : (row.uses.perBattle ?? row.uses.count ?? 1) } : {}),
    ...(free ? { free: true } : {}), range: tg.range, target: tg.target, effects, ...(gaps.length ? { gaps } : {}) };
}

// station.vs-target (engine, 2026-09-25): a slayer map {tag: N} is N flat damage
// against a target carrying that tag — one engine rule per tag, in the row's order.
// Anything but whole numbers is refused, never rounded (Law 7). Held or worn, every
// item's slayer compiles (fix.vs-target-worn-and-flat); the engine decides the reach.
function slayerRules(m, where) {
  if (m === null || m === undefined) return [];
  if (typeof m !== 'object' || Array.isArray(m)) throw new Error(`${where}: slayer is not a {tag: N} map`);
  return Object.entries(m).map(([tag, n]) => {
    if (!Number.isInteger(n)) throw new Error(`${where}: slayer ${tag} ${JSON.stringify(n)} is not a whole number`);
    return { tag, add: n };
  });
}
// ── A WEAPON ROW'S ATTACK NUMBERS RIDE ITS OWN ATTACKS (engine fix.enchant-stats-on-weapon, 2026-10-04) ──
// Ruled 2026-09-28 (engine DECISIONS.md 'counterattack, special free attacks, the opening six, shields, custom weapons'):
// "What a weapon's enchantment or custom tier may convey: Strength becomes the weapon's damage (its attacks go up); Crit and
// Accuracy apply to that weapon's attacks; Stamina, Luck, Block, Dodge and Armor may be conveyed to the wielder". The Forge's
// tier-2 rows did this (GEAR-DESIGN.md §3: the numbers ride COPIED attack rows); the tier-3 artifact attributes and the named
// weapons folded Strength, Precision, Crit and Accuracy onto the WIELDER, so the bonus also rode a Punch, the other hand's
// weapon and a cast. ONE RULE, here, for every weapon row of every tier:
//   Accuracy, Crit            -> that field of each attack the row grants
//   Strength, Precision       -> the damage (bonus) of each attack the row grants that USES that stat ("its attacks go up")
//   an attackModifier damage  -> the damage of each attack the row grants
//   everything else           -> not this rule's: the caller's (the wielder's stat, or a named gap)
// A row MADE FROM a weapon (a tier-3 row, a Forge row) grants its own COPY of each raised attack — '<attack id>.<slug>' — so the
// plain weapon is untouched; a NAMED weapon's attacks are its own rows and are raised where they are. A number that can ride
// nothing (a burst does not roll; no attack of the weapon uses the stat) is a named gap, never passed to the wielder.
const WEAPON_ATTACK_FIELD = { accuracy: 'accuracy', crit: 'crit' };
const WEAPON_DAMAGE_STATS = new Set(['strength', 'precision']);
const attackCopies = new Set();     // every copied attack row, whoever made it — one owner per id
const raisedInPlace = new Map();    // attack id -> the named weapon row that raised it
/** A weapon row's stat words, split: what its attacks carry (`adds` by attack field, `byStat` by damage stat) and the `rest`.
 *  `moreFields`: further stats the caller's own rule puts on the attack (the Forge's Reach). */
function weaponAttackNumbers(mods, attackModifiers, moreFields = {}) {
  const adds = {}, byStat = {}, rest = {}, otherAttackModifiers = {};
  for (const [k, v] of Object.entries(mods || {})) {
    const st = statOf(k);
    const field = st && (WEAPON_ATTACK_FIELD[st] ?? moreFields[st]);
    if (field) adds[field] = (adds[field] ?? 0) + v;
    else if (WEAPON_DAMAGE_STATS.has(st)) byStat[st] = (byStat[st] ?? 0) + v;
    else rest[k] = v;
  }
  for (const [k, v] of Object.entries(attackModifiers || {})) {
    if (k === 'damage') adds.bonus = (adds.bonus ?? 0) + v;
    else otherAttackModifiers[k] = v;
  }
  return { adds, byStat, rest, otherAttackModifiers };
}
/** Put the numbers on the attacks `grants` names. `slug`: each raised attack is copied as '<id>.<slug>' (a row made from a weapon);
 *  null: the rows are the weapon's own and are raised where they are. `always`: copy every attack row, raised or not (the Forge's
 *  rows — one id shape per enchantment). Returns the grants, and the triggers with each attack-scoped rider following its copy. */
function rideOwnAttacks({ rowId, grants, triggers, adds, byStat, slug, always = false, label, gaps }) {
  const copyOf = {}, rode = new Set();
  const flat = Object.entries(adds).filter(([, v]) => v !== 0);
  const stats = Object.entries(byStat).filter(([, v]) => v !== 0);
  const out = grants.map((aid) => {
    const a = authoredAttacks[aid];
    if (!a || a.burst) { if (always || flat.length || stats.length) gaps.push(`${label} on ${aid}: not an attack row — not ${slug === null ? 'raised' : 'copied'}`); return aid; }
    const own = byStat[a.stat] ?? 0;
    if (own) rode.add(a.stat);
    if (!always && !flat.length && !own) return aid;
    const raise = (row) => { for (const [field, v] of flat) row[field] = (row[field] ?? 0) + v; if (own) row.bonus = (row.bonus ?? 0) + own; return row; };
    if (slug === null) {
      if (raisedInPlace.has(aid)) throw new Error(`mkenginepack: attack '${aid}' is raised by ${raisedInPlace.get(aid)} and by ${rowId} — a named weapon's attacks are its own`);
      raisedInPlace.set(aid, rowId); authoredAttacks[aid] = raise({ ...a }); return aid;
    }
    const id = `${aid}.${slug}`;
    if (authoredAttacks[id] && !attackCopies.has(id)) throw new Error(`forge rows: copied attack '${id}' collides with an authored attack`);
    if (!attackCopies.has(id)) { authoredAttacks[id] = raise({ ...a, id }); attackCopies.add(id); }
    copyOf[aid] = id;
    return id;
  });
  for (const [st, v] of stats) if (!rode.has(st)) gaps.push(`${label} ${st} ${v}: the weapon grants no attack that uses ${st} — it rides nothing`);
  // an attack-scoped rider follows its attack onto the copy
  return { grants: out, triggers: triggers.map((t) => (t.onlyWithAttack && copyOf[t.onlyWithAttack] ? { ...t, onlyWithAttack: copyOf[t.onlyWithAttack] } : t)) };
}
/** How many Codex item rows grant each attack: a named weapon's attacks are raised where they are only when they are its own. */
const GRANTED_BY = new Map();
function compileItems() {
  const out = {};
  for (const it of CODEX_ITEMS) for (const aid of (ITEM_BY_ID.get(it.id) ?? it).grants || []) GRANTED_BY.set(aid, [...(GRANTED_BY.get(aid) || []), it.id]);
  for (const it of CODEX_ITEMS) {
    const row = ITEM_BY_ID.get(it.id) ?? it; // later sources win, as for kits
    const gapsHere = [];
    const g = (what, needs) => { gapsHere.push(`${what} — ${needs}`); gap(it.id, what, needs); };
    const statModifiers = {};
    for (const [k, v] of Object.entries(row.statModifiers || {})) {
      if (statOf(k)) statModifiers[statOf(k)] = (statModifiers[statOf(k)] || 0) + v;
      else g(`statModifier '${k}' ${v}`, `stat: ${k} (no UnitDef field)`);
    }
    const grants = [], abilities = [];
    for (const aid of row.grants || []) {
      if (aid.startsWith('power.')) {
        const pw = SPOWER_BY_ID.get(aid);
        const pr = pw && compiledPowerOf(pw, it.id);
        if (pr) { authoredAbilities[pr.id] = pr; abilities.push(pr.id); reportPowerGaps(pr, (clause, needs) => g(`${pr.id}: ${clause}`, needs)); }
        else g(`grants ${aid}`, pw ? 'item power — shape unparsed' : 'item power — no authored row');
        continue;
      }
      const a = SATTACK_BY_ID.get(aid);
      if (!a) { g(`grants ${aid}`, 'attack row unauthored'); continue; }
      takeItemAttack(a);
      grants.push(a.id);
      // attack-scoped riders ride the ATTACK (settledAttackExtras); an item
      // that grants the attack carries them under its own source
      for (const t of settledAttackExtras(a, it.id)) (row._attackTriggers ??= []).push(t);
    }
    const triggers = [...(row._attackTriggers || [])];
    delete row._attackTriggers;
    for (const t of row.triggers || []) {
      const eff = String(t.effect || '');
      let m;
      if (!TRIG_HOOKS.has(t.hook)) { g(`${t.hook}: ${eff.slice(0, 50)}`, `hook: ${t.hook} (declared, engine never fires it)`); continue; }
      // engine fix.trigger-ids-and-scopes (2026-10-04): a row's trigger may say `attack: 'own'` — it rides the attacks
      // THIS item grants and no other (the War Axe's on-block rode a Punch made by its holder). One compiled trigger
      // per granted attack, each onlyWithAttack (the dagger's Stab rider is the pattern), told apart by the attack's
      // name (distinctTriggerIds). Unstated: every attack the holder makes, as before. Any other word, or a row
      // that grants no attack, is a named gap — never a guessed scope.
      if (t.attack !== undefined && t.attack !== 'own') { g(`${t.hook}: ${eff.slice(0, 50)} — attack '${t.attack}'`, "trigger scope: only 'own' is read on an item row"); continue; }
      if (t.attack === 'own' && !grants.length) { g(`${t.hook}: ${eff.slice(0, 50)} — attack 'own'`, 'trigger scope: the row grants no attack of its own'); continue; }
      // engine capability.unit-trigger-with-tag (2026-10-04): … and may say `attackTag` — with or without 'own' (tagScopeOf, above)
      const scopes = (t.attack === 'own' ? grants.map((a) => ({ onlyWithAttack: a })) : [{}]).map((sc) => ({ ...sc, ...tagScopeOf(t) }));
      if ((m = eff.match(/^(apply|gain) (\d+) ([A-Za-z]+)$/)) && STATUS_OK.has(m[3].toLowerCase())) {
        for (const scope of scopes) triggers.push({ id: `trigger.${it.id.replace(/^item\./, '')}.${m[3].toLowerCase()}`, hook: t.hook, chance: t.chance ?? 100,
          select: m[1] === 'gain' ? 'self' : 'target', effect: { kind: 'status.apply', statusId: 'status.' + m[3].toLowerCase(), value: parseInt(m[2], 10) }, source: it.id, ...scope });
      } else if ((m = eff.match(/^the blocking target loses (\d+) Block and (\d+) Ranged Block for the rest of the Battle$/)) && t.hook === 'onBlock') {
        // V2 R1 (2026-09-23): the axe cuts through shields. `role` keeps it the ATTACKER's
        // block hook; Block and Ranged Block floor at 0 in resolveBlock.
        const role = t.role ? { role: t.role } : {};
        const base = it.id.replace(/^item\./, '');
        for (const scope of scopes) {
          triggers.push({ id: `trigger.${base}.on-block.block`, hook: 'onBlock', chance: t.chance ?? 100, select: 'target', ...role,
            effect: { kind: 'statMod', stat: 'block', value: -parseInt(m[1], 10), until: 'battle' }, source: it.id, ...scope });
          triggers.push({ id: `trigger.${base}.on-block.ranged-block`, hook: 'onBlock', chance: t.chance ?? 100, select: 'target', ...role,
            effect: { kind: 'statMod', stat: 'rangedBlock', value: -parseInt(m[2], 10), until: 'battle' }, source: it.id, ...scope });
        }
      } else if ((m = eff.match(/^Thorns (\d+)$/)) && t.hook === 'onTakingDamage') {
        // v2.thorns (COMBAT-V2 §9.4, 2026-09-24): "Thorns is a magnitude, not a tick" —
        // the engine's `thorns` stat, which reflects N true damage onto a melee attacker
        // that hits and adds N to the collision value. No trigger: the V1 onTakingDamage
        // retaliation (any range, only when damage got through) is retired.
        statModifiers.thorns = (statModifiers.thorns || 0) + parseInt(m[1], 10);
      } else {
        g(`${t.hook}: ${eff.slice(0, 50)}`, 'trigger shape unparsed');
      }
    }
    // capability.charges (2026-09-03): an ACTIVE item is a power the item grants —
    // `uses` per Battle where the row says so, cooldown where it says that,
    // `free` where the sentence opens "Free". Compiled by exact sentence through
    // the effect vocabulary; a sentence it cannot read is a gap ON THE ROW and
    // the item ships without the power, never with a guessed one.
    // kingdom.reads-engine (2026-10-02; review finding K8, engine SWITCHES.md netIsAPower): a one-use row that grants an
    // ATTACK and authors no active of its own (no stamina, no targets) — the Net: "Net is just a power, and it's a one-time
    // use" — pays its uses from that attack, so the attack carries them. The engine reads an item's uses off the powers it
    // grants (SWITCHES.md itemUsesSource), and the kingdom reads them back from there, never from a second copy.
    const usesOnAttack = row.uses !== undefined && row.stamina === undefined && !row.targets && grants.length > 0;
    if (usesOnAttack) {
      const n = typeof row.uses === 'number' ? row.uses : (row.uses.perBattle ?? row.uses.count ?? 1);
      for (const aid of grants) {
        const prior = authoredAttacks[aid].uses;
        if (prior !== undefined && prior !== n) throw new Error(`mkenginepack: ${it.id} pays ${n} uses from ${aid}, which already carries ${prior}`);
        authoredAttacks[aid] = { ...authoredAttacks[aid], uses: n };
      }
    } else if (row.stamina !== undefined || row.targets || row.uses !== undefined) {
      const pw = compileItemActive(it, row);
      if (pw) { authoredAbilities[pw.id] = pw; abilities.push(pw.id); for (const gg of pw.gaps || []) g(`${pw.id}: ${gg}`, 'item active clause'); }
      else g(`active: ${String(row.description || '').slice(0, 50)}`, 'an ability with charges/targets — capability.consumables');
    }
    // v2.thorns: the row's `thorns` field restates its Thorns trigger; a field the
    // trigger did not compile (or disagrees with) stays a gap, never a second grant.
    if (row.thorns !== undefined && row.thorns !== statModifiers.thorns) g(`thorns: ${JSON.stringify(row.thorns)}`, 'item field: thorns');
    for (const k of ['airwalk', 'immunity', 'natural']) if (row[k] !== undefined) g(`${k}: ${JSON.stringify(row[k]).slice(0, 40)}`, `item field: ${k}`);
    // engine capability.free-attack-accuracy (2026-10-04): the swords' "+10 counterattack" was a row FIELD and a named gap here
    // (content.greatsword-war-axe-reauthored); it is a stat modifier of the row now (statModifiers counterattackAccuracy, a word
    // of stat-words.mjs). A row that still says it in the old field is refused, so the clause cannot be left behind unread.
    if (row.counterattackAccuracy !== undefined) throw new Error(`mkenginepack: ${it.id} carries the field counterattackAccuracy — say it in statModifiers (stat-words.mjs: counterattackAccuracy)`);
    // station.vs-target: the slayer field is data — on a HELD item (weapon, shield) its rules
    // reach the attacks it grants; on a WORN item (the bloodrunes) every damage the hero deals.
    // fix.vs-target-worn-and-flat (engine, 2026-09-25): "Bloodrune Slayer bonus happens" (Andrew,
    // engine DECISIONS.md) — the engine reads loadout.worn, so the worn gap is gone.
    const vsTarget = slayerRules(row.slayer, it.id);
    // one-use rows (the Waystation, 2026-09-02): a charge is spent IN battle —
    // the same missing capability as an activated item.
    if (row.uses !== undefined && !abilities.some((a) => authoredAbilities[a]?.uses) && !grants.some((a) => authoredAttacks[a]?.uses)) g(`uses: ${JSON.stringify(row.uses)} — no active compiled to carry the charge`, 'charges spent in battle — capability.consumables');
    // engine fix.enchant-stats-on-weapon (2026-10-04; the rule above): a weapon row's own Strength, Precision, Crit and Accuracy
    // (the named weapons — the Death Blade's "+1 Strength") ride its own attacks, raised where they are; they are no stat of
    // the wielder. An attack another row also grants is not this row's alone to raise: named, and the number rides nothing.
    if (it.itemClass === 'weapon') {
      const { adds, byStat } = weaponAttackNumbers(statModifiers);
      if (Object.keys(adds).length || Object.keys(byStat).length) {
        const shared = grants.filter((aid) => (GRANTED_BY.get(aid) || []).some((other) => other !== it.id));
        const said = [];
        if (shared.length) said.push(`weapon stats ${JSON.stringify({ ...adds, ...byStat })}: ${shared.join(', ')} is granted by another row too — not raised`);
        else rideOwnAttacks({ rowId: it.id, grants, triggers: [], adds, byStat, slug: null, label: 'weapon stat', gaps: said });
        for (const k of [...Object.keys(WEAPON_ATTACK_FIELD), ...WEAPON_DAMAGE_STATS]) delete statModifiers[k];
        for (const line of said) g(line, 'a weapon row\'s attack numbers ride its own attacks — engine fix.enchant-stats-on-weapon');
      }
    }
    out[it.id] = {
      id: it.id, name: it.name, itemClass: it.itemClass, tier: it.tier ?? 0, hands: it.hands ?? 0, slots: it.slots ?? 0,
      ...(it.classRestriction ? { classRestriction: it.classRestriction } : {}),
      statModifiers, grants, abilities, triggers: distinctTriggerIds(it.id, triggers),
      ...(vsTarget.length ? { vsTarget } : {}),
      ...setFieldsOf(it, grants),   // engine capability.set-bonus (2026-10-05)
      ...(gapsHere.length ? { gaps: gapsHere } : {}),
    };
  }
  return out;
}
// ── SETS (engine capability.set-bonus, 2026-10-05) ───────────────────────────
// GEAR-DESIGN.md §5 (resolved 2026-09-03): a set is a TAG and the bonus a `setBonus` block on the item that cares. Engine
// DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … set bonus". The block reaches the engine's item
// row as written — its stat words as the engine's stats (STAT_OF), `attackDamage` as this weapon's own damage — with the
// set tags the row bears (`setTags`: its tags that some row's block names; the engine counts members by them). The row's own
// sentence and its field must say the same thing: "for every … you carry / are wearing" is `withItself` (every member
// carried, the carrier too when it bears the tag); "per other" is not. A row that disagrees with itself FAILS THE BUILD.
//
// content.sets-count-holy-texts-and-heavy-chain (2026-10-06; engine DECISIONS.md 2026-10-05 'a set counts everything carried
// …': Holy Texts counts as a book and Heavy Chain as a chain for set bonuses, "8, yes."): a row may say `setMember` — the
// sets it is counted in WITHOUT bearing the tag. A tag does a second thing: the Forge reads a tier-1 row's tags to say which
// enchantments it may take (and `book` makes a weapon ranged by its rule), so a membership that must leave the Forge alone
// is said here and nowhere the Forge looks. It reaches the engine as the same `setTags` every member bears. A setMember
// that names no tag of the Codex, or one the row's own tags already give, FAILS THE BUILD. Like a tag, a membership no row's
// set line counts is carried by nothing (a row whose set line is broken is the one that fails, by its own check below).
function setFieldsOf(it, grants) {
  if (it.setMember !== undefined) {
    const no = (why) => { throw new Error(`mkenginepack: ${it.id} setMember ${why}`); };
    if (!Array.isArray(it.setMember) || !it.setMember.length) no('is not a list of set tags');
    for (const t of it.setMember) {
      if (typeof t !== 'string' || !(D.tags || []).some((x) => x.id === 'tag.' + t)) no(`names '${t}', which is no tag of the Codex`);
      if ((it.tags || []).includes(t)) no(`names '${t}', which the row's own tags already say`);
    }
    if (new Set(it.setMember).size !== it.setMember.length) no('names a set twice');
  }
  const setTags = [...(it.tags || []), ...(it.setMember || [])].filter((t) => SET_TAGS.has(t));
  const sb = it.setBonus;
  if (!sb) return setTags.length ? { setTags } : {};
  const bad = (why) => { throw new Error(`mkenginepack: ${it.id} setBonus ${why}`); };
  if (typeof sb.tag !== 'string' || !(D.tags || []).some((t) => t.id === 'tag.' + sb.tag)) bad(`names the tag '${sb.tag}', which is no tag of the Codex`);
  for (const k of Object.keys(sb)) if (!['tag', 'each', 'withItself', 'at', 'once'].includes(k)) bad(`carries '${k}'`);
  const payload = (o, what) => {
    if (!o || typeof o !== 'object' || !Object.keys(o).length) bad(`${what} pays nothing`);
    const out = {};
    for (const [word, n] of Object.entries(o)) {
      if (!Number.isSafeInteger(n) || n === 0) bad(`${what} '${word}' is '${n}' — a whole number`);
      if (word === 'attackDamage') { if (!grants.length) bad('pays damage on its own attacks and grants none'); out.attackDamage = n; continue; }
      const stat = statOf(word);
      if (!stat) bad(`${what} pays '${word}', which is no stat the engine has`);
      out[stat] = n;
    }
    return out;
  };
  const every = / for every /i.test(it.setBonusText ?? ''), other = /\bper other\b|\beach other\b/i.test(it.setBonusText ?? '');
  let block;
  if (sb.each !== undefined) {
    if (sb.at !== undefined || sb.once !== undefined) bad('is both an each block and an at-count block');
    if (sb.withItself !== undefined && sb.withItself !== true) bad('withItself is true or absent');
    if (every && !sb.withItself) bad(`says "${it.setBonusText}" and does not count the carrier (withItself)`);
    if (other && sb.withItself) bad(`says "${it.setBonusText}" and counts the carrier (withItself)`);
    block = { tag: sb.tag, each: payload(sb.each, 'each'), ...(sb.withItself ? { withItself: true } : {}) };
  } else {
    if (!Number.isSafeInteger(sb.at) || sb.at < 1 || sb.withItself !== undefined) bad('an at-count block needs a whole at and once{}');
    block = { tag: sb.tag, at: sb.at, once: payload(sb.once, 'once') };
  }
  return { ...(setTags.length ? { setTags } : {}), setBonus: block };
}
const SET_TAGS = new Set((D.items || []).map((i) => i.setBonus?.tag).filter((t) => typeof t === 'string'));
const items = compileItems();

// ── CLASS POWERS, LEVELS, SPECIALTIES, ENCHANTED ROWS (2026-09-03) ───────────
// Hero assembly, ruled 2026-09-03 (Angela): "I would rather we are actually
// assembling the units so that we know that the way that we're getting things
// into the units is still correct ... it has to also have the abilities in it."
// Four registries the engine's fieldedDef() reads at fielding:
//   classPowers   every gen/<class>.json power, compiled by EXACT sentence
//                 (ability.effects) — or a row carrying named gaps, never rounded
//   levels        gen/levels.json per class: what each level grants, the L5 choice
//   specialties   id -> statModifiers (engine names)
//   enchanted     gen/tier3-combinations.json: base + enchant -> one ItemDef
//                 (ITEMS-PLAN.md §6: generated rows, never hand-edited)
// civilian and beast joined 2026-09-03 (progression.level-table-by-type): a
// civilian at level 2 needs a class.civilian specialty, and none compiled —
// the file sat here with nine specialties and 36 powers, never read.
const CLASS_FILES = ['warrior', 'ranger', 'rogue', 'mage', 'priest', 'paladin', 'civilian', 'beast'];
const CLASS_DEFS = Object.fromEntries(CLASS_FILES.map((c) => [`class.${c}`, JSON.parse(fs.readFileSync(`gen/${c}.json`, 'utf8'))]));
const LEVELS = JSON.parse(fs.readFileSync('gen/levels.json', 'utf8'));
const TIER3 = JSON.parse(fs.readFileSync('gen/tier3-combinations.json', 'utf8'));
const ARMORS = JSON.parse(fs.readFileSync('gen/armor-enchants.json', 'utf8'));

// Codex stat words -> engine stat: STAT_OF, above (one map). Anything not there is a named gap.

function targetingOf(tgt) { return inVocabulary(tgt, targetingOfRaw(tgt)); }
function targetingOfRaw(tgt) {
  let r;
  if (tgt === 'self') return { target: { select: 'self', side: 'any' }, range: 0 };
  if ((r = tgt.match(/^one ally within (\d+) hexes$/))) return { target: { select: 'unit', side: 'ally' }, range: +r[1] };
  if ((r = tgt.match(/^one enemy within (\d+) hexes$/))) return { target: { select: 'unit', side: 'enemy' }, range: +r[1] };
  if ((r = tgt.match(/^(?:you and )?allies within (\d+) hexes$/))) return { target: { select: 'area', side: 'ally', radius: +r[1], origin: 'self' }, range: 0 };
  if ((r = tgt.match(/^enemies within (\d+) hexes$/))) return { target: { select: 'area', side: 'enemy', radius: +r[1], origin: 'self' }, range: 0 };
  if ((r = tgt.match(/^a hex within (\d+) hexes and every hex adjacent to it$/))) return { target: { select: 'area', side: 'any', radius: 1, origin: 'target' }, range: +r[1], hexGap: r[1] };
  if (tgt === 'one enemy in melee reach') return { target: { select: 'unit', side: 'enemy' }, range: 1 };
  if ((r = tgt.match(/^every unit within (\d+) hexes$/))) return { target: { select: 'area', side: 'any', radius: +r[1], origin: 'self' }, range: 0 };
  // engine fix.own-area-skips-owner (2026-10-04; ruled 2026-10-04, engine DECISIONS.md 'the Poison Imp, the Balrog and the four
  // caster-centred class powers skip their owner too': "skip the caster"): a power aimed at "every other unit within N
  // hexes" is the same area with the engine's excludeSelf (core/target.ts) — as a trigger's is, above (fix.fire-imp-burn-spares-self)
  if ((r = tgt.match(/^every other unit within (\d+) hexes$/))) return { target: { select: 'area', side: 'any', radius: +r[1], origin: 'self', excludeSelf: true }, range: 0 };
  if (tgt === 'every enemy adjacent to you') return { target: { select: 'area', side: 'enemy', radius: 1, origin: 'self' }, range: 0 };
  if ((r = tgt.match(/^one ally within (\d+) hex$/))) return { target: { select: 'unit', side: 'ally' }, range: +r[1] };
  return null;
}
const SPIRIT = (base, mult = 1) => ({ scale: 'partySpirit', base, mult });
const untilOf = (scope) => scope === 'until-end-of-your-next-turn' ? 'endOfNextTurn' : scope === 'until-end-of-turn' ? 'endOfTurn' : scope === 'battle' || scope === 'rest-of-battle' ? 'battle' : null;

// One sentence, one shape. Returns { effects, gaps } or null when nothing matched.
// engine fix.burst-ground-class-powers (2026-10-04; engine SWITCHES.md burstGroundClassPowers): a blast sentence may
// end in the ground clause the item bursts' sentence has — "[, and | — and then] those seven hexes become
// burning|frost" — which is the burst profile's own `paints` (engine capability.burst-paints-ground), returned as
// `ground` and held to the row's field both ways by compileClassPower. Whatever else the rider says stays a named gap
// (Fireball: "plus every stack of Burn that unit is already carrying — the blast CONSUMES that Burn").
function compileSentences(desc) {
  const effects = [], gaps = [];
  let ground = null;
  // split on sentence ends, keep the semicolon halves too
  const parts = desc.split(/(?<=[.;])\s+|;\s+/).map((x) => x.trim()).filter(Boolean);
  for (const sRaw of parts) {
    const s0 = sRaw.replace(/\.$/, '');
    let m;
    // engine fix.one-effect-vocabulary (2026-10-01): "become poisoned ground" — the one ground shape (DECISIONS.md
    // 2026-09-03), painted by the one layer.paint effect around the aimed unit (compileClassPower aims it at one)
    if ((m = s0.match(/^Those seven hexes become (burning|poisoned) ground$/))) { effects.push({ kind: 'layer.paint', layer: 'layer.' + m[1], radius: 1, origin: 'target' }); continue; }
    if ((m = s0.match(/^Deal (\d+) \+ (Magic|Spirit|Strength|Precision) (magic|physical|fire|poison|shadow|true) damage to every unit in the blast(?:, (.*))?$/))) {
      effects.push({ kind: 'statDamage', stat: m[2].toLowerCase(), bonus: +m[1], damageType: m[3] });
      const g = m[4] && m[4].match(/^(?:(.+?) — )?and (?:then )?those seven hexes become (burning|frost)$/);
      if (g) { ground = `layer.${g[2]}`; if (g[1]) gaps.push(`rider: ${g[1]}`); }
      else if (m[4]) gaps.push(`rider: ${m[4]}`);
      continue;
    }
    if ((m = s0.match(/^Every unit in those hexes, ally or enemy, takes (Precision|Strength|Magic|Spirit) - (\d+) (physical|magic|fire|poison|shadow|true) damage(?:, .*)?$/))) {
      effects.push({ kind: 'statDamage', stat: m[1].toLowerCase(), bonus: -m[2], damageType: m[3], allies: 'always' }); continue;
    }
    if ((m = s0.match(/^Heal every ally within (\d+) hexes for (\d+) \+ Spirit(?: — .*)?$/))) { effects.push({ kind: 'heal', amount: SPIRIT(+m[2]) }); continue; }
    if ((m = s0.match(/^[Hh]eal (?:the target|it) (?:for )?(\d+) \+ Spirit$/))) { effects.push({ kind: 'heal', amount: SPIRIT(+m[1]) }); continue; }
    if ((m = s0.match(/^[Hh]eal (?:the target )?(\d+)$/))) { effects.push({ kind: 'heal', amount: +m[1] }); continue; }
    if ((m = s0.match(/^The target gains Protection equal to (\d+) \+ Spirit$/))) { effects.push({ kind: 'status.apply', statusId: 'status.protection', value: SPIRIT(+m[1]) }); continue; }
    if ((m = s0.match(/^Give one ally within \d+ hexes (\d+) Protection$/))) { effects.push({ kind: 'status.apply', statusId: 'status.protection', value: +m[1] }); continue; }
    if ((m = s0.match(/^remove (\d+) ([A-Z][a-z]+)(?: and (\d+) ([A-Z][a-z]+))? from (?:the target|yourself)(?:, then heal it for (\d+) \+ Spirit| and heal (\d+))?$/))) {
      const st = (w) => STATUS_OK.has(w.toLowerCase()) ? 'status.' + w.toLowerCase() : null;
      const a = st(m[2]); if (a) effects.push({ kind: 'status.remove', statusId: a, value: +m[1] }); else gaps.push(`status ${m[2]} unknown`);
      if (m[3]) { const b = st(m[4]); if (b) effects.push({ kind: 'status.remove', statusId: b, value: +m[3] }); else gaps.push(`status ${m[4]} unknown`); }
      if (m[5]) effects.push({ kind: 'heal', amount: SPIRIT(+m[5]) });
      if (m[6]) effects.push({ kind: 'heal', amount: +m[6] });
      continue;
    }
    if ((m = s0.match(/^Take (\d+) true damage and gain \+(\d+) (Strength|Magic|Spirit|Precision) for the rest of the Battle(?:; .*)?$/))) {
      effects.push({ kind: 'damage', amount: +m[1], damageType: 'true', who: 'self' });
      effects.push({ kind: 'statMod', stat: m[3].toLowerCase(), value: +m[2], until: 'battle', who: 'self' }); continue;
    }
    if ((m = s0.match(/^Every ally within \d+ hexes gains \+(\d+) (Armor|Resist|Strength|Dodge|Accuracy) for the rest of the Battle$/))) {
      effects.push({ kind: 'statMod', stat: m[2].toLowerCase(), value: +m[1], until: 'battle' }); continue;
    }
    if ((m = s0.match(/^you gain \+(\d+) (Health|Armor|Strength|Dodge)$/))) { effects.push({ kind: 'statMod', stat: modStatOf(m[2]), value: +m[1], until: 'battle', who: 'self' }); continue; }
    if ((m = s0.match(/^Stance: gain ([+-]\d+) ([A-Z][a-z]+)(?: and ([+-]\d+) ([A-Z][a-z]+))? for the rest of the Battle(?:, and (.*))?$/))) {
      effects.push({ kind: 'statMod', stat: modStatOf(m[2]), value: +m[1], until: 'battle', who: 'self' });
      if (m[3]) effects.push({ kind: 'statMod', stat: modStatOf(m[4]), value: +m[3], until: 'battle', who: 'self' });
      if (m[5]) gaps.push(`stance rider: ${m[5]}`);
      continue;
    }
    if ((m = s0.match(/^[Tt]ake (\d+) true damage$/))) { effects.push({ kind: 'damage', amount: +m[1], damageType: 'true', who: 'self' }); continue; }
    if (/^(Free|No roll, no crit)$/.test(s0)) continue;   // markers the row's fields already carry
    // flavour and explanation sentences — not rules
    if (/^(Read that|It makes no attack|It does not roll|It never rolls|It does not spend|It costs nothing|Cheap and|Put it on|Thrown into|Because Magic|Your cheap|Anyone carrying Burn|about \d|as an area effect)/.test(s0)) continue;
    if (/^Until the end of your next Turn, your attacks/.test(s0)) continue;   // the `modifies` field carries it
    gaps.push(`unparsed: ${s0.slice(0, 80)}`);
  }
  return { effects, gaps, ground };
}

function compileClassPower(p, cls) {
  const desc = String(p.description || '');
  const tg = targetingOf(String(p.targets || ''));
  const gaps = [];
  const base = { id: p.id, name: p.name, ...actionSlot(p), staminaCost: p.stamina ?? 0, cooldown: p.cooldown ?? 0,
    ...(p.warmup ? { warmup: p.warmup } : {}), ...(p.free ? { free: true } : {}) };
  if (!tg) return { ...base, range: 0, effects: [], target: { select: 'self', side: 'any' }, gaps: [`targets '${p.targets}' unparsed — the power is inert`] };
  if (tg.hexGap && !p.burst) gaps.push(`targets 'a hex within ${tg.hexGap}' — engine centres the blast on a UNIT`);
  const { effects, gaps: g2, ground } = compileSentences(desc);
  gaps.push(...g2);
  if (p.modifies) {
    const until = untilOf(p.modifies.scope);
    if (!until) gaps.push(`modifies scope '${p.modifies.scope}' unparsed`);
    else for (const [k, v] of Object.entries(p.modifies.statModifiers || {})) {
      const st = statOf(k); if (!st) { gaps.push(`modifies ${k}: no engine stat`); continue; }
      effects.push({ kind: 'statMod', stat: st, value: v, until, who: 'self' });
    }
    if (p.modifies.tags?.length) gaps.push(`modifies only ${p.modifies.tags.join('/')} attacks — engine applies it to the unit`);
  }
  if (p.needsCapability) gaps.push(`needs capability: ${p.needsCapability}`);
  if (p.burst) {
    const burst = validateBurst(p.burst);
    if (!tg.hexGap || p.modifies || effects.some(e => e.kind !== 'statDamage')) throw Error(`Class burst '${p.id}' has incompatible targeting/effects`);
    if (burst.shape.kind !== 'radius' || burst.shape.radius !== tg.target.radius || burst.side !== tg.target.side
      || burst.heal !== undefined || burst.requireTags !== undefined || burst.packets.length !== effects.length
      || burst.packets.some((packet, i) => packet.stat !== effects[i].stat || packet.amount !== effects[i].bonus || packet.damageType !== effects[i].damageType)) throw Error(`Class burst '${p.id}' disagrees with its authored base payload`);
    // the ground the blast leaves: the sentence's clause and the profile's `paints` must say the same thing, both ways
    if ((burst.paints ?? null) !== ground) throw Error(`Class burst '${p.id}' disagrees with its authored sentence: the ground it leaves`);
    return { ...base, range: tg.range, burst, source: 'class', ...(gaps.length ? { gaps } : {}) };
  }
  if (ground) gaps.push(`rider: and those seven hexes become ${ground.replace(/^layer./, '')} — a blast that is not a burst paints no ground`);
  if (tg.target.select === 'area' && tg.target.origin === 'target' && effects.some(e => e.kind === 'statDamage')) throw Error(`Travelling area damage '${p.id}' requires an explicit burst profile`);
  if (!effects.length) gaps.push('no effect compiled — the power is inert');
  // a power that only paints the hex area paints it ONCE, around the one unit it is aimed at — an area
  // target would paint once per unit standing in it (engine fix.one-effect-vocabulary, 2026-10-01)
  const target = tg.hexGap && effects.length && effects.every((e) => e.kind === 'layer.paint' && e.origin === 'target' && e.radius === tg.target.radius) ? { select: 'unit', side: 'any' } : tg.target;
  return { ...base, range: tg.range, target, effects, ...(gaps.length ? { gaps } : {}) };
}

const classPowers = {};
const classPowerGaps = [];
for (const [cls, def] of Object.entries(CLASS_DEFS)) {
  for (const p of def.powers || []) {
    const row = compileClassPower(p, cls);
    classPowers[row.id] = row;
    for (const g of row.gaps || []) classPowerGaps.push({ power: row.id, class: cls, what: g });
  }
}
const specialties = {};
for (const def of Object.values(CLASS_DEFS)) for (const sp of def.specialties || []) {
  const mods = {}; const gaps = [];
  for (const [k, v] of Object.entries(sp.statModifiers || {})) { const st = statOf(k); if (st) mods[st] = v; else gaps.push(`${k} ${v}: no engine stat`); }
  specialties[sp.id] = { id: sp.id, name: sp.name ?? sp.id, class: sp.class, statModifiers: mods, ...(gaps.length ? { gaps } : {}) };
}
const levels = {};
// the class tables, and the civilian TYPE tables (levels.civilianTypes, ruled
// 2026-09-03) — one loop, one shape; the engine tells them apart by prefix
for (const c of [...(LEVELS.classes || []), ...(LEVELS.civilianTypes || [])]) {
  const rows = [];
  for (const r of c.rows || []) {
    const grants = {}; const gaps = [];
    const put = (k, v) => { const st = statOf(k) ?? (k === 'itemSlots' ? 'itemSlots' : null); if (st) grants[st] = (grants[st] ?? 0) + v; else gaps.push(`${k} ${v}: no engine stat`); };
    for (const [k, v] of Object.entries(c.freebie || {})) put(k, v);
    for (const [k, v] of Object.entries(r.grants || {})) put(k, v);
    const choice = r.choice ? r.choice.options.map((o) => { const out = {}; for (const [k, v] of Object.entries(o)) { const st = statOf(k) ?? (k === 'itemSlots' ? 'itemSlots' : null); if (st) out[st] = v; else gaps.push(`choice ${k}: no engine stat`); } return out; }) : undefined;
    rows.push({ level: r.level, grants, ...(choice ? { choice } : {}), ...(r.power ? { power: true } : {}), ...(gaps.length ? { gaps } : {}) });
  }
  levels[c.id] = { id: c.id, rows };
}
// ── THE ATTACKS' TAGS (engine capability.unit-trigger-with-tag, 2026-10-04) ──
// What "has the tag" means, in one place (engine SWITCHES.md attackHasTag): an attack's tags are ITS OWN Codex row's tags
// (how it is made and with what: melee, ranged, brawl, dagger …) joined with the tags of the item that grants it — the weapon
// in use (blade, bow, 2-hander …) — except the item's MANNER words (melee, ranged, brawl, area …: the vocabulary's own group),
// which say how a thing is done and so belong to the attack alone: a weapon tagged melee that also grants a throw does not make
// the throw a melee attack. A row with no tags from either (the bestiary's attacks, the test lane's) carries none here, and the
// engine reads its kind — melee or ranged — instead. Written before any row copies an attack — the tier-3 rows and the Forge's (engine fix.enchant-stats-on-weapon moved it
// above both) — so a copy keeps its
// original's; a test attack that is a delta over a real one keeps the real one's.
const TAG_GROUP = new Map((D.tags || []).map((t) => [String(t.id).replace(/^tag\./, ''), t.group]));
{
  const tagsOfAttack = new Map();
  const add = (id, tags) => { if (!tagsOfAttack.has(id)) tagsOfAttack.set(id, new Set()); for (const t of tags) tagsOfAttack.get(id).add(t); };
  for (const a of D.attacks || []) add(a.id, a.tags || []);
  for (const i of D.items || []) for (const g of i.grants || []) if (tagsOfAttack.has(g) || authoredAttacks[g]) add(g, (i.tags || []).filter((t) => TAG_GROUP.get(t) !== 'manner'));
  for (const [id, tags] of tagsOfAttack) {
    if (!authoredAttacks[id] || tags.size === 0) continue;
    for (const t of tags) if (!TAG_GROUP.has(t)) throw new Error(`mkenginepack: attack '${id}' carries tag '${t}', which is not in the Codex's tag vocabulary`);
    authoredAttacks[id] = { ...authoredAttacks[id], tags: [...tags].sort() };
  }
}

// tier-3 rows: base + enchant, merged the way progression/build-schedule.mjs merges them
const ENCH_BY_ID = new Map([...(ARMORS.enchants || []), ...(SITEMS.enchants || [])].map((e) => [e.id, e]));
const enchanted = {};
for (const combo of TIER3) {
  const b = items[combo.base]; const e = ENCH_BY_ID.get(combo.enchant);
  const gaps = [];
  if (!b) { enchanted[combo.id] = { id: combo.id, name: combo.name, itemClass: combo.itemClass, tier: 3, hands: 0, slots: 0, statModifiers: {}, grants: [], abilities: [], triggers: [], gaps: [`base ${combo.base} is not an ItemDef`] }; continue; }
  if (!e) gaps.push(`enchant ${combo.enchant} unauthored`);
  const statModifiers = { ...b.statModifiers };
  // engine fix.enchant-stats-on-weapon (2026-10-04; the rule above compileItems): on a WEAPON the attribute's Strength,
  // Precision, Crit, Accuracy and "+N damage" ride the row's own copies of its attacks (below, where the row is put);
  // what is left — and everything, on armor — is the wielder's, as before.
  const onWeapon = b.itemClass === 'weapon';
  const numbers = onWeapon ? weaponAttackNumbers(e?.statModifiers, e?.attackModifiers) : { adds: {}, byStat: {}, rest: e?.statModifiers || {}, otherAttackModifiers: e?.attackModifiers || {} };
  for (const [k, v] of Object.entries(numbers.rest)) {
    const st = statOf(k);
    if (st) statModifiers[st] = (statModifiers[st] ?? 0) + v;
    else gaps.push(`enchant stat ${k} ${v}: no engine stat`);   // never passed, never rounded
  }
  for (const [k, v] of Object.entries(numbers.otherAttackModifiers)) gaps.push(onWeapon ? `enchant attackModifier ${k} ${v}: no attack field` : `enchant attackModifier ${k} ${v}: ${b.itemClass} grants no attack`);
  const triggers = [...b.triggers];
  for (const t of e?.triggers || []) {
    const eff = String(t.effect || ''); let m;
    // content.flaming-longsword (engine, 2026-09-28): an enchant trigger that names `attack: 'basic'`
    // fires only with the base's BASIC attack — its first attack (the Armory Ledger's rule, approved
    // 2026-09-28: "Almost every weapon has one: the first attack listed"). Anything else is a gap.
    // engine fix.enchant-triggers-own-weapon (2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: … an
    // enchant is its own weapon's …': "If you have a fiery longsword and a dagger with a stab ability on it that stab
    // ability does not use the fiery that's on the longsword."). These rows are ARTIFACT ATTRIBUTES — the tier-3 rows
    // that come already on a reward item (GLOSSARY.md 'Settled, 2026-10-04'; an enchantment is the Forge's tier-2
    // attribute only) — and the field that names one is still `enchant`. An attribute's trigger on an ATTACKER's hook
    // rides the attacks of the weapon it is on and no other — not a Punch, not the weapon in the other hand. The rule is
    // here, not on the attribute rows: unstated on such a hook is `attack: 'own'` (one compiled trigger per attack the
    // base grants, each onlyWithAttack, told apart by the attack's name — distinctTriggerIds — as a weapon row's own
    // `attack: 'own'` is); a row may still say 'own' or 'basic' itself. A hook that is not an attacker's (the victim's
    // onTakingDamage, the unit's onActivationEnd) is not an attack's and keeps no scope; neither does an attribute on a
    // base that grants no attack (worn armor: the wearer's).
    if (t.attack !== undefined && t.attack !== 'basic' && t.attack !== 'own') { gaps.push(`enchant ${t.hook}: attack '${t.attack}' — only 'basic' and 'own' are read`); continue; }
    const attackersHook = ATTACKER_HOOKS.has(t.hook) || (t.hook === 'onBlock' && t.role === 'attacker');
    const baseAttacks = b.grants || [];
    const scopes = t.attack === 'basic' ? (baseAttacks[0] ? [{ onlyWithAttack: baseAttacks[0] }] : null)
      : t.attack === 'own' ? (baseAttacks.length ? baseAttacks.map((a) => ({ onlyWithAttack: a })) : null)
      : attackersHook && baseAttacks.length ? baseAttacks.map((a) => ({ onlyWithAttack: a })) : [{}];
    if (scopes === null) { gaps.push(`enchant ${t.hook}: ${eff.slice(0, 50)} — the base has no ${t.attack === 'basic' ? 'basic attack' : 'attack of its own'}`); continue; }
    if (TRIG_HOOKS.has(t.hook) && (m = eff.match(/^deal (\d+) (physical|magic|fire|poison|shadow|true) damage$/))) {
      for (const scope of scopes) triggers.push({ id: `trigger.${combo.id.replace(/^item\./, '')}.${m[2]}-damage${t.hook === 'onCrit' ? '-crit' : ''}`, hook: t.hook, chance: t.chance ?? 100,
        select: 'target', effect: { kind: 'damage', amount: +m[1], damageType: m[2] }, source: combo.id, ...scope });
      continue;
    }
    // engine capability.his-weapons-small-clauses (2026-10-05): the artifact attribute Destroying — "On kill: the corpse is
    // destroyed" — the same corpse.destroy the Staff of the Destroyer's attacks carry, riding the attacks of the weapon it is on
    if (t.hook === 'onKill' && eff === 'the corpse is destroyed') {
      for (const scope of scopes) triggers.push({ id: `trigger.${combo.id.replace(/^item\./, '')}.corpse-destroyed`, hook: 'onKill', chance: t.chance ?? 100,
        select: 'target', effect: { kind: 'corpse.destroy' }, source: combo.id, ...scope });
      continue;
    }
    // v2.thorns: the enchant's "Thorns N" is the same magnitude its base items carry.
    if (t.hook === 'onTakingDamage' && (m = eff.match(/^Thorns (\d+)$/))) { statModifiers.thorns = (statModifiers.thorns ?? 0) + +m[1]; continue; }
    if (TRIG_HOOKS.has(t.hook) && (m = eff.match(/^(apply|gain) (\d+) (?:more )?([A-Za-z]+)$/)) && STATUS_OK.has(m[3].toLowerCase())) {
      for (const scope of scopes) triggers.push({ id: `trigger.${combo.id.replace(/^item\./, '')}.${m[3].toLowerCase()}${t.hook === 'onCrit' ? '-crit' : ''}`, hook: t.hook, chance: t.chance ?? 100,
        select: m[1] === 'gain' ? 'self' : 'target', effect: { kind: 'status.apply', statusId: 'status.' + m[3].toLowerCase(), value: +m[2] }, source: combo.id, ...scope });
    } else gaps.push(`enchant ${t.hook}: ${eff.slice(0, 50)} — trigger shape unparsed`);
  }
  // station.vs-target (engine, 2026-09-25): the enchant's slayer joins the base's — rules on the
  // enchanted item; held or worn, the engine decides the reach (fix.vs-target-worn-and-flat).
  const vsTarget = [...(b.vsTarget || []), ...slayerRules(e?.slayer, combo.enchant)];
  // the triggers are named by the BASE's attacks (their ids are what they were), then follow their attacks onto the copies
  const named = distinctTriggerIds(combo.id, triggers);
  const rode = onWeapon ? rideOwnAttacks({ rowId: combo.id, grants: b.grants || [], triggers: named, adds: numbers.adds, byStat: numbers.byStat, slug: String(combo.enchant).replace(/^enchant\./, ''), label: `enchant ${combo.enchant}`, gaps })
    : { grants: b.grants, triggers: named };
  enchanted[combo.id] = { ...b, id: combo.id, name: combo.name, tier: 3, statModifiers, grants: rode.grants, triggers: rode.triggers, ...(vsTarget.length ? { vsTarget } : {}), base: combo.base, enchant: combo.enchant,
    gaps: [...(b.gaps || []), ...gaps].length ? [...(b.gaps || []), ...gaps] : undefined };
  if (!enchanted[combo.id].gaps) delete enchanted[combo.id].gaps;
}

// ── THE FORGE'S TIER-2 ROWS (engine pack.derived-rows, 2026-09-25) ───────────
// GEAR-DESIGN.md §3: MASTERWORK — a tier-1 two-hander, one-hander, shield or armor,
// +1 Max Stamina, tier 2 (widened 2026-09-25, Andrew, engine DECISIONS.md "masterwork:
// one-handers and shields too"; engine fix.masterwork-scope); ENCHANTED — a tier-1
// base x every buyable enchant whose appliesToTags it meets, tier 2, never a shield. The Forge sells them; before
// this the engine's ITEMS lacked them and applyItems refused a hero wearing one.
// WHICH rows exist is the kingdom's rule (kingdom/tools/mk-items.mjs steps 2 and
// 3), copied below verbatim — the eligibility tests and `applies` — and read off
// the same codex rows (hbt-content.json items and enchants), so both packages
// hold the same ids by one rule. WHAT a row carries is the base's compiled
// ItemDef plus:
//   masterwork   maxStamina +1
//   armor        the enchant's statModifiers on the item, as the tier-3 rows do
//   weapon       GEAR-DESIGN.md §3, ruled 2026-09-05 (Angela): "All of the modifiers
//                from weapons and range weapons are only on the attack. They're not an
//                inherent stat modifier." The enchant's numbers ride COPIED attack rows
//                (ITEMS-PLAN.md §6 route (a)): `<attack id>.<enchant>` with Hit ->
//                accuracy, Crit -> crit, Reach -> reach, Damage -> bonus; the item grants
//                the copies and nothing on the item says "+6 Hit". (engine SWITCHES
//                forgeEnchantPayload: the codex rows still carry Keen/Cruel/Far/Long as
//                statModifiers — the turning §3 asks of settled-items.json is owed.)
// Anything else an enchant carries is a named gap on the row, never rounded.
const derivedItems = {};
{
  const tierOf = (t) => { const n = Number(t); if (!Number.isInteger(n)) throw new Error(`forge rows: tier '${t}' is not an integer`); return n; };
  // mk-items.mjs `applies`, verbatim over the codex row's itemClass and tags
  const applies = (base, e) => {
    const tags = new Set(base.tags);
    const ranged = ['bow', 'crossbow', 'sling', 'thrown', 'staff', 'wand', 'book'].some((t) => tags.has(t));
    for (const t of e.appliesToTags ?? []) {
      if (t === 'armor' && base.itemClass === 'armor') return true;
      if (t === 'shield' && tags.has('shield')) return true;
      if (t === 'weapons' && base.itemClass === 'weapon' && !tags.has('shield')) return true;
      if (t === 'ranged' && base.itemClass === 'weapon' && ranged) return true;
      if (t === 'melee' && base.itemClass === 'weapon' && !ranged && !tags.has('shield')) return true;
      if (tags.has(t)) return true;
    }
    return false;
  };
  // a weapon enchantment's numbers ride the attack rows by the one rule above compileItems (weaponAttackNumbers, rideOwnAttacks);
  // the Forge's own addition is Reach (GEAR-DESIGN.md §3: Long, Far)
  const put = (row) => {
    if (derivedItems[row.id] || items[row.id] || enchanted[row.id]) throw new Error(`forge rows: '${row.id}' already has an owner — one owner only`);
    derivedItems[row.id] = row;
  };
  for (const ci of D.items) {
    const tags = [...(ci.tags ?? [])];
    if (tierOf(ci.tier) !== 1) continue;
    const isShield = tags.includes('shield');
    const b = items[ci.id];
    if (!b) throw new Error(`forge rows: codex item '${ci.id}' has no compiled ItemDef`);
    const { vsTarget: baseVs, gaps: baseGaps, ...bare } = b;
    // 2. masterwork — tier-1 two-handers, one-handers, shields and armor, +1 Max Stamina,
    //    tier 2 (Andrew 2026-09-25: "It can also apply to a shield. It can also apply to
    //    a one-hander."). A beast's body part (class.beast — "beasts draw nothing — their
    //    weapons are their bodies", 2026-08-27) is none of these: it took hands 0 until
    //    2026-10-02, when every weapon took at least one hand (fix.one-hero-assembly; engine
    //    SWITCHES.md naturalWeaponMasterwork), and gains no Forge row by that change.
    const hands = ci.hands ?? 0;
    const natural = ci.classRestriction === 'class.beast';
    if (isShield || ci.itemClass === 'armor' || (ci.itemClass === 'weapon' && !natural && (hands === 1 || hands === 2))) {
      put({ ...bare, id: `${b.id}.masterwork`, name: `Masterwork ${b.name}`, tier: 2,
        statModifiers: { ...b.statModifiers, maxStamina: (b.statModifiers.maxStamina ?? 0) + 1 },
        ...(baseVs ? { vsTarget: baseVs } : {}), base: b.id, ...(baseGaps ? { gaps: baseGaps } : {}) });
    }
    // 3. enchanted — tier-1 base x buyable enchant. A shield is never enchanted (GEAR-DESIGN.md §3).
    if (isShield) continue;
    for (const e of D.enchants) {
      if (!e.buyable || !applies({ itemClass: ci.itemClass, tags }, e)) continue;
      const slug = e.id.replace(/^enchant\./, '');
      const gaps = [];
      const statModifiers = { ...b.statModifiers };
      let grants = [...b.grants], triggers = [...b.triggers];
      if (ci.itemClass === 'weapon') {
        const { adds, byStat, rest, otherAttackModifiers } = weaponAttackNumbers(e.statModifiers, e.attackModifiers, { reach: 'reach' });
        for (const [k, v] of Object.entries(rest)) gaps.push(`enchant stat ${k} ${v}: no attack field`);
        for (const [k, v] of Object.entries(otherAttackModifiers)) gaps.push(`enchant attackModifier ${k} ${v}: no attack field`);
        ({ grants, triggers } = rideOwnAttacks({ rowId: `${b.id}.${slug}`, grants: b.grants, triggers: b.triggers, adds, byStat, slug, always: true, label: `enchant ${e.id}`, gaps }));
      } else {
        for (const [k, v] of Object.entries(e.statModifiers || {})) {
          const st = statOf(k);
          if (st) statModifiers[st] = (statModifiers[st] ?? 0) + v;
          else gaps.push(`enchant stat ${k} ${v}: no engine stat`);
        }
        for (const [k, v] of Object.entries(e.attackModifiers || {})) gaps.push(`enchant attackModifier ${k} ${v}: ${ci.itemClass} grants no attack`);
      }
      for (const t of e.triggers || []) {
        const eff = String(t.effect || ''); let m;
        if (t.hook === 'onTakingDamage' && (m = eff.match(/^Thorns (\d+)$/))) { statModifiers.thorns = (statModifiers.thorns ?? 0) + +m[1]; continue; }
        gaps.push(`enchant ${t.hook}: ${eff.slice(0, 50)} — trigger shape unparsed`);
      }
      for (const g of e.grants || []) gaps.push(`enchant grants ${g}: not compiled`);
      const vsTarget = [...(baseVs || []), ...slayerRules(e.slayer, e.id)];
      const allGaps = [...(baseGaps || []), ...gaps];
      put({ ...bare, id: `${b.id}.${slug}`, name: `${e.name ?? slug} ${b.name}`, tier: 2, statModifiers, grants, triggers,
        ...(vsTarget.length ? { vsTarget } : {}), base: b.id, enchant: e.id, ...(allGaps.length ? { gaps: allGaps } : {}) });
    }
  }
}

// ── THE TEST RECEPTACLE (content/test/, 2026-09-02) ─────────────────────────
// Test bodies, attacks and statuses that prove a mechanism and never ship.
// Andrew: "We're not testing features if we're not pulling them from the
// right way." They enter through THIS converter and the same loader as real
// content — a row is a DELTA over a real row (`from` + `set`) or a complete
// body — and they are refused unless their ids are the test family. Wipe the
// folder and they are gone; nothing in the engine has to change.
const TEST_DIR = 'test';
const readTest = (f) => { try { return JSON.parse(fs.readFileSync(`${TEST_DIR}/${f}`, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } };
const isTestId = {
  unit: (id) => /^test-[a-z0-9-]+$/.test(id),
  ability: (id) => /^power\.test-[a-z0-9.-]+$/.test(id),
  attack: (id) => /^attack\.test-[a-z0-9.-]+$/.test(id),
  trigger: (id) => /^(test\.|trigger\.test-)[a-z0-9.-]+$/.test(id),
  status: (id) => /^test\.status\.[a-z0-9-]+$/.test(id),
};
// the limits and the effect list are ONE vocabulary on every action (ruled 2026-09-04) — test rows may carry any of them
const ABILITY_FIELDS = new Set(['id', 'name', 'slot', 'stat', 'bonus', 'damageType', 'range', 'staminaCost', 'cooldown', 'warmup', 'uses', 'free', 'effect', 'burst', 'heal', 'guard', 'effects', 'target']);
function testAbilities() {
  const out = {};
  for (const row of readTest('abilities.json')) {
    const { note, ...rest } = row;
    if (!isTestId.ability(row.id)) throw new Error(`content/test/abilities.json: '${row.id}' is not power.test-* — the test family or nothing`);
    for (const k of Object.keys(rest)) if (!ABILITY_FIELDS.has(k)) throw new Error(`content/test/abilities.json: '${row.id}' carries unknown field '${k}'`);
    out[row.id] = rest;
  }
  return out;
}
const UNIT_FIELDS = new Set(['typeId', 'name', 'side', 'levelTable', 'badges', 'maxHp', 'armor', 'resist', 'fireResist', 'poisonResist', 'shadowResist', 'coldResist', 'block', 'rangedBlock', 'accuracy', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'crit', 'luck', 'toughness', 'surge', 'vision', 'bleedOutTurns', 'deathbedFighting', 'tier', 'auras', 'role', 'movement', 'reach', 'maxStamina', 'staminaRegen', 'ai', 'aiChanges', 'attacks', 'abilities', 'moves', 'tags', 'triggers', 'badges']);   // aiChanges: ai.mode-change (engine, 2026-09-26)
const ATTACK_FIELDS = new Set(['accuracyVs', 'id', 'name', 'slot', 'kind', 'damageType', 'bonus', 'stat', 'reach', 'staminaCost', 'crit', 'critCount', 'burst', 'cooldown', 'warmup', 'uses', 'free', 'accuracy', 'hits', 'secondaryDamage', 'armorPenetration', 'impact', 'destroy', 'tags', 'statMult', 'addsStats']);   // tags: engine capability.unit-trigger-with-tag (2026-10-04) — a delta keeps its real attack's; a test row may state its own
// a delta may start from any packed row — the real families AND the test
// cohort (test-gash-zombie is the cohort's zombie plus one rider)
const realUnits = new Map([...alphaTeam, ...prologueParty, ...authoredEnemies, ...heroes, ...enemies].map((u) => [u.typeId, u]));
function testAttacks() {
  const out = {};
  for (const row of readTest('attacks.json')) {
    const { note, from, set, ...rest } = row;
    if (!isTestId.attack(row.id)) throw new Error(`content/test/attacks.json: '${row.id}' is not attack.test-* — the test family or nothing`);
    let base = {};
    if (from) { base = authoredAttacks[from]; if (!base) throw new Error(`content/test/attacks.json: '${row.id}' is a delta over '${from}', which is not a real attack in the pack`); }
    const a = { ...base, ...rest, ...(set || {}), id: row.id };
    for (const k of Object.keys(a)) if (!ATTACK_FIELDS.has(k)) throw new Error(`content/test/attacks.json: '${row.id}' carries unknown field '${k}'`);
    for (const t of a.tags || []) if (!TAG_GROUP.has(t)) throw new Error(`content/test/attacks.json: '${row.id}' carries tag '${t}', which is not in the Codex's tag vocabulary`);
    out[row.id] = {...a,...packetFields(a)};
  }
  return out;
}
function testUnits(testAttackRows, testAbilityRows) {
  const out = [];
  for (const row of readTest('units.json')) {
    const { note, from, set, ...rest } = row;
    if (!isTestId.unit(row.id)) throw new Error(`content/test/units.json: '${row.id}' is not test-* — the test family or nothing`);
    let base = {};
    if (from) { base = realUnits.get(from); if (!base) throw new Error(`content/test/units.json: '${row.id}' is a delta over '${from}', which is not a real unit in the pack`); }
    const { id, ...body } = rest;
    const u = { ...base, ...body, ...(set || {}), typeId: row.id, abilities: body.abilities ?? base.abilities ?? [], tags: body.tags ?? base.tags ?? [] };
    optionalCombatStats(u);
    delete u.copyOf;
    for (const k of Object.keys(u)) if (!UNIT_FIELDS.has(k)) throw new Error(`content/test/units.json: '${row.id}' carries unknown field '${k}'`);
    // engine fix.trigger-ids-and-scopes (2026-10-04): the row's OWN triggers only — `u` is the base spread under the
    // row, so a delta that authored none read the base's here and then added the base's again below: test-slot-striker,
    // test-packet-flame and test-packet-shadow held every trigger of test-oathblade twice. A row that is not a delta
    // has no base, and its own are all it has.
    u.triggers = (body.triggers || []).map((t) => {
      const { note: _n, ...trig } = t;
      if (!isTestId.trigger(trig.id)) throw new Error(`content/test/units.json: '${row.id}' trigger '${trig.id}' is not test.* / trigger.test-*`);
      return { ...trig, source: `unit.${row.id}` };
    });
    // ai.mode-change (engine, 2026-09-26): a test row's mode changes are the test family, like its triggers
    for (const c of u.aiChanges || []) if (!isTestId.trigger(c.id)) throw new Error(`content/test/units.json: '${row.id}' mode change '${c.id}' is not test.* / trigger.test-*`);
    for (const a of u.attacks) if (!testAttackRows[a] && !authoredAttacks[a]) throw new Error(`content/test/units.json: '${row.id}' wields '${a}', which is neither a test attack nor a real one`);
    for (const a of u.abilities) if (!testAbilityRows[a] && !authoredAbilities[a]) throw new Error(`content/test/units.json: '${row.id}' casts '${a}', which is neither a test power nor a real one`);
    // a delta's triggers ADD to the base's, under the test family
    if (from && base.triggers) u.triggers = [...base.triggers.map((t) => ({ ...t, source: `unit.${row.id}` })), ...u.triggers];
    out.push(u);
  }
  return out;
}
function testStatuses() {
  const out = {};
  const FLAGS = new Set(['id', 'name', 'shape', 'family', 'decayPerPhase', 'tick', 'tickDamageType', 'reducesIncomingDamage', 'reducesOutgoingDamage', 'blocksAction', 'blocksBlock', 'reducesMovement', 'halvesHealing', 'locksPowers', 'shedByHealing', 'aiControlled', 'prone', 'kdbDown', 'hidesFromFoes', 'untargetable', 'breaksOnAttack', 'breaksOnPower', 'breaksOnReveal', 'lends', 'countsDown', 'countsAttackTag']);   // the last three: engine capability.effect-lasts-activations, 2026-10-05   // hidesFromFoes: ai.sight (engine, 2026-09-27); untargetable and the breaksOn flags: capability.stealth (engine, 2026-09-28)
  for (const row of readTest('statuses.json')) {
    const { note, ...r } = row;
    if (r.blocksBlock !== undefined && typeof r.blocksBlock !== 'boolean') throw Error('Invalid blocksBlock flag');
    if (!isTestId.status(r.id)) throw new Error(`content/test/statuses.json: '${r.id}' is not test.status.*`);
    for (const k of Object.keys(r)) if (!FLAGS.has(k)) throw new Error(`content/test/statuses.json: '${r.id}' carries unknown field '${k}'`);
    // a counted status renews to its count rather than adding to it (engine capability.effect-lasts-activations)
    out[r.id] = { ...r, stacking: r.countsDown ? 'highest' : 'add' };
  }
  return out;
}
function testBadges() {
  const out = {};
  const FIELDS = new Set(['id', 'name', 'statModifiers', 'grants', 'flags', 'triggers', 'vsTarget']);   // vsTarget: station.vs-target (engine, 2026-09-25)
  for (const row of readTest('badges.json')) {
    const { note, ...r } = row;
    if (!/^test\.badge\.[a-z0-9-]+$/.test(r.id)) throw new Error(`content/test/badges.json: '${r.id}' is not test.badge.*`);
    for (const k of Object.keys(r)) if (!FIELDS.has(k)) throw new Error(`content/test/badges.json: '${r.id}' carries unknown field '${k}'`);
    for (const t of r.triggers || []) if (!isTestId.trigger(t.id)) throw new Error(`content/test/badges.json: '${r.id}' trigger '${t.id}' is not test.* / trigger.test-*`);
    out[r.id] = { statModifiers: {}, grants: [], flags: {}, ...r, triggers: (r.triggers || []).map((t) => ({ ...t, source: r.id })) };
  }
  return out;
}

const testAttackRows = testAttacks();
const testAbilityRows = testAbilities();
function testMoves() {
  const out = {};
  const fields = new Set(['id', 'name', 'slot', 'free', 'shape', 'stepRange', 'effects', 'staminaCost', 'budgetMod', 'cooldown', 'warmup', 'uses']);
  for (const row of readTest('moves.json')) {
    const { note, ...move } = row;
    if (!isTestId.ability(move.id) || out[move.id]) throw new Error(`content/test/moves.json: invalid or duplicate '${move.id}'`);
    for (const key of Object.keys(move)) if (!fields.has(key)) throw new Error(`content/test/moves.json: '${move.id}' carries unknown field '${key}'`);
    out[move.id] = move;
  }
  return out;
}
const test = { note: 'GENERATED from content/test/ — the test receptacle. Never ships. Wipe the folder to remove every row here.', units: testUnits(testAttackRows, testAbilityRows), attacks: testAttackRows, abilities: testAbilityRows, statuses: testStatuses(), badges: testBadges(), moves: testMoves(), maps: compileMaps(readTest('maps.json'), true) };

const maps = compileMaps(D.maps || []);
// ── ENCOUNTERS (encounter.runner, 2026-09-03; P11 approved as written) ─────────
// Every prologue and scripted row of gen/encounters.json becomes an
// EncounterDef. What the engine cannot honour is a named gap on the row —
// retreat (skipped by ruling), standing rules, schedule events, a map series,
// salvation — never silently dropped. Unit ids are checked against the pack.
// ── badge.hero, ruled 2026-09-04 ("Deathbed Fighting, REVERSED") ─────────────
// "There is a badge that all heroes start with. That is invisible on a hero called Hero.
// It is not on civilians unless expressly said so. Only those with the badge Hero bleed out.
// A civilian who goes down and doesn't have the hero badge is just dead and a corpse."
//
// Stamped HERE, in one post-pass, rather than in each of the four unit lanes — the lanes
// build rows four different ways and a rule spread across four sites is how they drift apart.
// A civilian opts IN through its own content row's `badges` array (gen/civilian-rulings.json
// heroBadge), never by default. Enemies never carry it: an enemy that falls is a corpse.
{
  const contentBadges = new Map((D.heroes?.heroes || []).map((h) => [h.id, h.badges || []]));
  let stamped = 0, optedIn = 0;
  for (const u of [...heroes, ...prologueParty, ...alphaTeam]) {
    if (u.side !== 'hero') continue;
    const isCivilian = (u.tags || []).includes('class.civilian');
    if (isCivilian) {
      if (!(contentBadges.get(u.typeId) || []).includes('badge.hero')) continue;
      optedIn++;
    }
    u.badges = ['badge.hero'];
    stamped++;
  }
  console.log(`badge.hero stamped on ${stamped} hero rows (${optedIn} civilians opted in)`);
  // ── ORIGIN BADGES, engine content.hero-origin-badges (2026-10-05) ────────────
  // Ruled 2026-10-05 (engine DECISIONS.md 'seven answers: the first hero's card shows only what is modified; origin badges
  // go on the heroes; …'): told that no base hero has a badge of its own in the game though the Codex names origin badges for
  // most of the 24, and asked whether those should be put on the heroes' rows — "3, yes."
  // Each of the 24 base heroes' rows carries, after the Hero badge, the badges its Codex row names (`originBadges`, badge
  // NAMES, in the Codex's order). A name with no one badge row FAILS THE BUILD — never dropped, never guessed. The badge is
  // the compiled badge row as it stands: what it can carry acts from the row, and each line of it the engine has no
  // mechanism for is that badge's own named gap. Only the 24 (`hero.base.*`): the ruling is theirs; a fixed hero's
  // origin badges stay in the Codex.
  const badgeIdOfName = (name, heroId) => {
    const rows = (D.badges || []).filter((b) => b && b.id && b.name === name);
    if (rows.length !== 1 || !badges[rows[0].id]) throw new Error(`mkenginepack: ${heroId} names the origin badge '${name}', which ${rows.length} badge rows carry — an origin badge is one Codex badge row`);
    return rows[0].id;
  };
  const originOf = new Map((D.heroes?.heroes || []).filter((h) => h.id.startsWith('hero.base.')).map((h) => [h.id, h.originBadges || []]));
  let withOrigin = 0, origins = 0, found = 0;
  for (const u of [...heroes, ...prologueParty, ...alphaTeam]) {
    const names = originOf.get(u.typeId);
    if (!names) continue;
    found++;
    if (!u.badges?.includes('badge.hero')) throw new Error(`mkenginepack: ${u.typeId} is a base hero without the Hero badge`);
    const ids = names.map((n) => badgeIdOfName(n, u.typeId));
    if (new Set(ids).size !== ids.length) throw new Error(`mkenginepack: ${u.typeId} names an origin badge twice`);
    u.badges = [...u.badges, ...ids];
    if (ids.length) withOrigin++;
    origins += ids.length;
  }
  if (originOf.size !== 24 || found !== 24) throw new Error(`mkenginepack: ${originOf.size} base heroes in the Codex and ${found} of their rows in the pack, not 24 and 24`);
  console.log(`origin badges: ${origins} on ${withOrigin} of the ${originOf.size} base heroes' rows`);
}
const packUnitIds = new Set([...heroes, ...enemies, ...authoredEnemies, ...prologueParty, ...alphaTeam].map((u) => u.typeId));
function compileEncounter(row) {
  const board = validateEncounterBoard(row, { ...maps, ...test.maps });
  const gaps = [];
  const setup = [], remains = [];
  let heroZone = null;
  if (row.heroZone) heroZone = row.heroZone;
  for (const s of row.setup || []) {
    if (s.heroes !== undefined) { heroZone = { count: s.heroes, at: s.at }; continue; }
    // capability.placed-remains (engine, 2026-09-28): a corpses entry that names its remains id and
    // whose body it is ships as the row's remains; one that does not stays a named gap.
    if (s.corpses !== undefined) {
      if (typeof s.id !== 'string' || typeof s.typeId !== 'string') { gaps.push(`setup: ${s.corpses} corpses — ${s.note || 'capability.corpses'} (placed remains need an id and the body's unit, typeId)`); continue; }
      if (!packUnitIds.has(s.typeId)) { gaps.push(`setup: remains '${s.id}' are '${s.typeId}' — no such row in the pack, NOT placed`); continue; }
      // encounter.opening.cathedral (2026-10-01): remains may name their map's ground (`ground`) instead of listing hexes
      if (s.ground !== undefined && s.hexes !== undefined) throw new Error(`encounter ${row.id}: remains '${s.id}' name their hexes or their map's ground, never both`);
      const ids = s.ground !== undefined ? GROUND.ground[row.map]?.[s.ground] : s.hexes?.map((h) => h.row * board.width + h.col);
      if (!Array.isArray(ids) || ids.length !== s.corpses || !board) throw new Error(`encounter ${row.id}: remains '${s.id}' name ${s.corpses} corpses and ${ids?.length ?? 0} hexes${s.ground !== undefined ? ` (map ${row.map}'s '${s.ground}' ground)` : ''} — one hex each`);
      remains.push({ id: s.id, typeId: s.typeId, hexes: [...ids] });
      continue;
    }
    if (!s.unit) { gaps.push(`setup entry without a unit: ${JSON.stringify(s).slice(0, 60)}`); continue; }
    if (!packUnitIds.has(s.unit)) { gaps.push(`setup: ${s.count ?? 1} × ${s.unit} — no such row in the pack, NOT fielded`); continue; }
    if (s.rescue) gaps.push(`${s.unit} is a RESCUE (2 resources alive at the end) — the reward is the kingdom's; fielded as a civilian`);
    const { was: _w, note: _n, rescue: _r, ...rest } = s;
    setup.push(rest);
  }
  const schedule = [];
  for (const r of row.schedule || []) {
    if (r.event) gaps.push(`schedule event '${r.event.name}': ${(r.event.effects || []).map((e) => e.needs ? e.needs.join(',') : e.effect).join('; ')}`);
    const spawn = [];
    for (const s of r.spawn || []) {
      if (!s.unit) { gaps.push(`spawn without a unit: ${JSON.stringify(s).slice(0, 60)}`); continue; }
      if (!packUnitIds.has(s.unit)) { gaps.push(`schedule ${r.phase ?? r.enemyPhase}: ${s.count ?? 1} × ${s.unit} — no such row in the pack, NOT fielded`); continue; }
      const { was: _w, note: _n, ...rest } = s;
      spawn.push(rest);
    }
    if (r.phase === undefined && r.enemyPhase === undefined) { gaps.push('schedule row with no phase'); continue; }
    schedule.push({ ...(r.phase !== undefined ? { phase: r.phase } : {}), ...(r.enemyPhase !== undefined ? { enemyPhase: r.enemyPhase } : {}), spawn });
  }
  if (row.retreat) gaps.push('retreat allowed — skipped by ruling 2026-09-03');
  if (row.salvation) gaps.push('salvation — skipped by ruling 2026-09-03');
  if (Array.isArray(row.map)) gaps.push('a map series (dungeon) — skipped by ruling 2026-09-03');
  for (const st of row.standing || []) { if (st.asData) continue; gaps.push(`standing rule: ${st.rule || st.name || String(st).slice(0, 60)}${st.needs ? ' — needs ' + st.needs.join(', ') : ''}`); }
  for (const n of row.needs || []) gaps.push(`needs: ${n}`);
  const win = row.win?.surviveTo !== undefined ? { surviveTo: row.win.surviveTo } : undefined;
  const loseAfter = row.loseAfter ? { ...(row.loseAfter.phase !== undefined ? { phase: row.loseAfter.phase } : {}), ...(row.loseAfter.heroPhase !== undefined ? { heroPhase: row.loseAfter.heroPhase } : {}) } : undefined;
  // capability.power-pool (2026-09-03): the external pool ships; arrival and clock live on unit rows
  const powerSources = (row.powerSources || []).filter((ps) => ps.kind === 'external' && typeof ps.value === 'number').map((ps) => ({ kind: 'external', value: ps.value }));
  for (const ps of row.powerSources || []) if (ps.kind !== 'external') gaps.push(`powerSource ${ps.kind}: ${JSON.stringify(ps).slice(0, 60)} — only external ships on the row`);
  // capability.ground-layers (2026-09-03): the band and the setup paint ship as data
  // The band walks an AXIS. Re-authored 2026-09-04 for heroes-west/enemies-east: the Kiln's
  // band lit row 0 and walked south; it now lights column 15 and walks west. `axis` and
  // `startCol` ship in place of `startRow`. A row that still carries startRow ships as it did.
  const band = row.band ? { layer: row.band.layer, fromPhase: row.band.fromPhase, direction: row.band.direction,
    ...(row.band.axis ? { axis: row.band.axis } : {}),
    ...(row.band.startCol !== undefined ? { startCol: row.band.startCol } : {}),
    ...(row.band.startRow !== undefined ? { startRow: row.band.startRow } : {}),
    ...(row.band.spare ? { spare: row.band.spare } : {}) } : undefined;
  if (row.band && row.band.axis === 'col') gaps.push('band walks the COLUMN axis (axis:col, startCol) — the engine must read it; a reader still expecting startRow gets undefined');
  // map.caravan-aftermath (2026-10-01): a paint may name its map's ground (gen/painted-maps.json; the opening maps' cursed, 2026-10-01) instead of listing hexes
  const paint = row.paint ? resolvePaint(row, GROUND).map((p) => ({ layer: p.layer, hexes: p.hexes })) : undefined;
  // The board ships (PROVING-PLAN Stage A3, 2026-09-04). Every row names it; a row that does
  // not is a hard gap, because a placement means nothing without the board it is placed on.
  return { id: row.id, name: row.name, ...(typeof row.map === 'string' && row.map !== 'none' ? { mapId: row.map } : {}),
    ...(board ? { board } : {}),
    setup, schedule, ...(loseAfter ? { loseAfter } : {}), ...(win ? { win } : {}), ...(heroZone ? { heroZone } : {}),
    ...(powerSources.length ? { powerSources } : {}), ...(band ? { band } : {}), ...(paint ? { paint } : {}),
    ...(row.condition ? { condition: row.condition } : {}),
    ...(row.civilianAi ? { civilianAi: { mode: row.civilianAi.mode, untilTurn: row.civilianAi.untilTurn } } : {}),   // ruled 2026-09-03
    // ai.encounter-rules (engine, 2026-09-26; AI-DESIGN.md §4): the row's overarching AI rules ship as data; the engine validates them at load
    ...(Array.isArray(row.aiRules) && row.aiRules.length ? { aiRules: row.aiRules.map(({ note: _n, ...r }) => r) } : {}),
    // encounter.area-fall (engine, 2026-09-28): the row's telegraphed area falls ship as data; the engine validates them at load
    ...(Array.isArray(row.falls) && row.falls.length ? { falls: row.falls.map(({ note: _n, ...f }) => f) } : {}),
    ...(remains.length ? { remains } : {}),   // capability.placed-remains (engine, 2026-09-28)
    ...(gaps.length ? { gaps } : {}) };
}
const encounters = {};
for (const row of [...(ENC.prologue || []), ...(ENC.scripted || []), ...(ENC.authored || [])]) encounters[row.id] = compileEncounter(row);
test.encounters = {};
for (const row of readTest('encounters.json')) {
  if (typeof row?.id !== 'string' || !/^test\.encounter\.[a-z0-9.-]+$/.test(row.id) || test.encounters[row.id]) throw new Error(`invalid or duplicate TEST encounter ${row?.id}`);
  if (!test.maps[row.map]) throw new Error(`TEST encounter ${row.id} must name a TEST map`);
  for (const r of row.aiRules || []) if (!isTestId.trigger(r?.id)) throw new Error(`TEST encounter ${row.id} AI rule '${r?.id}' is not test.* — the test family or nothing`);   // ai.encounter-rules
  for (const f of row.falls || []) if (!isTestId.trigger(f?.id)) throw new Error(`TEST encounter ${row.id} fall '${f?.id}' is not test.* — the test family or nothing`);   // encounter.area-fall
  for (const s of row.setup || []) if (s.corpses !== undefined && s.id !== undefined && !isTestId.trigger(s.id)) throw new Error(`TEST encounter ${row.id} remains '${s.id}' is not test.* — the test family or nothing`);   // capability.placed-remains
  test.encounters[row.id] = compileEncounter(row);
}

// ── THE MAPS (content.maps-as-rows, PROVING-PLAN Stage A2, 2026-09-04) ───────
// Authored in gen/maps.json, shipped here. The ROWS are the board — the engine
// reads width off a row's length and height off the count, exactly as
// engine/src/content/maps.ts did — so a map cannot declare a size it is not.
// `deploy` rides only when the map differs from the default (heroes WEST,
// enemies EAST); assemble.mjs refuses a map that restates the default, because
// a default everything declares is not a default.
// Both map lanes were validated before encounter compilation; neither drops a size.

// Classify profiles only after TEST deltas inherit their authored source.
const authoredBursts = {}, testBursts = {};
function moveBursts(rows, destination) {
  for (const [id, row] of Object.entries(rows)) {
    if (Object.hasOwn(row, 'area')) throw Error('Legacy area field is retired: ' + id);
    if (!row.burst) continue;
    for (const field of ['effects','target','effect','heal','guard','secondaryDamage','armorPenetration']) if (Object.hasOwn(row, field)) throw Error(`Burst '${id}' mixes '${field}' with its exclusive payload`);
    const {name, staminaCost, cooldown = 0, warmup, uses, free, slot} = row;
    const range = row.reach ?? row.range;
    if (!Number.isSafeInteger(range) || range < 0 || range > 100 || row.burst.shape.kind === 'arc' && range !== 1) throw Error('Invalid burst range: ' + id);
    destination[id] = {id, name, staminaCost, cooldown, range, burst: validateBurst(row.burst), source: row.source ?? (row.kind ? 'weapon' : 'item'), ...(row.gaps?.length ? {gaps: row.gaps} : {}),
      ...(warmup !== undefined ? {warmup} : {}), ...(uses !== undefined ? {uses} : {}), ...(free !== undefined ? {free} : {}), ...(slot !== undefined ? {slot} : {})};
    delete rows[id];
  }
}
// engine capability.burst-paints-ground (2026-10-04): the layer a burst paints is one of the engine's ground layers
// (../engine/generated/vocabulary.json `layers`, read, never copied).
const GROUND_LAYERS = new Set((VOCAB.layers || []).map((l) => l.id));
const checkBurstGround = (rows) => { for (const row of Object.values(rows)) if (row.burst?.paints !== undefined && !GROUND_LAYERS.has(row.burst.paints)) throw Error(`Burst '${row.id}' paints '${row.burst.paints}', which is not a ground layer of the engine`); };
const classPowerRows = Object.values(classPowers);
moveBursts(classPowers, authoredBursts);
moveBursts(authoredAttacks, authoredBursts); moveBursts(authoredAbilities, authoredBursts);
moveBursts(test.attacks, testBursts); moveBursts(test.abilities, testBursts);
test.bursts = testBursts;
checkBurstGround(authoredBursts); checkBurstGround(testBursts);

// fix.codex-numbers (finding K7; DECISIONS.md 2026-09-28: "XP per kill is 2 / 5 / 15 by tier"): the price list rides the pack beside the tiers
const xpByTier = AUTH.xpByTier;
if (!xpByTier || Object.keys(xpByTier).some((k) => !/^[1-9]$/.test(k)) || Object.values(xpByTier).some((v) => !Number.isSafeInteger(v) || v < 0)) throw new Error('gen/enemies-authored.json: xpByTier must map tiers to whole XP');
for (const u of authoredEnemies) if (u.tier !== undefined && xpByTier[u.tier] === undefined) throw new Error(`${u.typeId}: tier ${u.tier} has no price in xpByTier`);
const pack = { note: D.testCohort.note, xpByTier, heroes, enemies, authoredEnemies, authoredAttacks, authoredAbilities, authoredBursts, prologueParty, alphaTeam, critChart: compileCritChart(SETTLED.critChart), statuses, moves, items, test,
  classPowers, specialties, levels, generalPool, enchanted, derivedItems, encounters, badges, maps };

// engine capability.unit-trigger-with-tag (2026-10-04): a trigger's tag requirement names a tag of the Codex's vocabulary —
// every list named `triggers`, wherever it sits (units, test units, items, tier-3 and derived items, badges, test badges).
// An unknown tag fails the build, before a file is written: a mistyped requirement would otherwise never fire, silently.
(function everyTagRequirementIsATag(node, where) {
  if (Array.isArray(node)) { node.forEach((x, i) => everyTagRequirementIsATag(x, `${where}[${i}]`)); return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (k === 'triggers' && Array.isArray(v)) {
      for (const t of v) if (t && t.onlyWithTag !== undefined && !TAG_GROUP.has(t.onlyWithTag)) throw new Error(`mkenginepack: '${node.typeId ?? node.id ?? where}' trigger '${t.id}' requires tag '${t.onlyWithTag}', which is not in the Codex's tag vocabulary`);
    } else everyTagRequirementIsATag(v, `${where}.${k}`);
  }
})(pack, 'pack');

// engine fix.trigger-ids-and-scopes (2026-10-04): no row of the pack holds two triggers under one id — every list
// named `triggers`, wherever it sits (units, test units, items, enchanted and derived items, badges). Before a file is written.
(function everyRowsTriggerIdsAreDistinct(node, where) {
  if (Array.isArray(node)) { node.forEach((x, i) => everyRowsTriggerIdsAreDistinct(x, `${where}[${i}]`)); return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (k === 'triggers' && Array.isArray(v)) refuseSharedTriggerIds(node.typeId ?? node.id ?? where, v);
    else everyRowsTriggerIdsAreDistinct(v, `${where}.${k}`);
  }
})(pack, 'pack');

for (const rows of [authoredAttacks, authoredAbilities, classPowers, moves, test.attacks, test.abilities, test.moves]) {
  for (const row of Object.values(rows)) {
    actionSlot(row);
    if (row.damageType !== undefined) damageType(row.damageType);
    for (const effect of row.effects || []) {
      if (effect.kind === 'damage' || effect.kind === 'statDamage') damageType(effect.damageType);
    }
  }
}

// Gaps are written AFTER the pack is fully constructed (moved 2026-08-27):
// compileCritChart names gaps during pack construction, and writing the file
// earlier silently dropped them — a gap that never reaches the file is the
// exact failure the file exists to prevent.
fs.writeFileSync('gen/enemy-pack-gaps.json', JSON.stringify({
  _note: 'GENERATED by mkenginepack.mjs — clauses the engine cannot yet express, dropped with their reason. Regenerate, never hand-edit.',
  gaps,
}, null, 1) + '\n');
// The class-power census (2026-09-03): every clause of every class power the
// engine cannot express, by power. Regenerate, never hand-edit.
fs.writeFileSync('gen/class-power-gaps.json', JSON.stringify({
  _note: 'GENERATED by mkenginepack.mjs — class-power clauses the engine cannot express (ability.effects). A power with no compiled effect is INERT and says so. Regenerate, never hand-edit.',
  compiled: classPowerRows.filter((p) => p.burst || p.effects.length).length,
  inert: classPowerRows.filter((p) => !p.burst && !p.effects.length).length,
  total: classPowerRows.length,
  gaps: classPowerGaps,
}, null, 1) + '\n');

const body = '// GENERATED by content/mkenginepack.mjs — NEVER HAND-EDIT (see engine CLAUDE.md,\n'
  + '// "Never hand-edit anything under generated/"). Source of truth: the Codex\n'
  + '// pipeline (content/settled.json testCohort -> hbt-content.json).\n'
  + '// Regenerate:  cd content && node assemble.mjs && node mkenginepack.mjs\n'
  + (dropped.length ? '// Dropped (no engine meaning yet): ' + dropped.join(' | ') + '\n' : '')
  + 'export const UNIT_PACK = ' + JSON.stringify(pack, null, 2) + ' as const\n';
fs.writeFileSync('../engine/src/content/generated/pack.ts', body);
console.log(`pack.ts: ${Object.keys(items).length} items (${Object.values(items).filter((i) => !i.gaps).length} whole), test ${test.units.length}u/${Object.keys(test.attacks).length}a/${Object.keys(test.statuses).length}s, ${Object.keys(statuses).length} statuses, ${Object.keys(moves).length} moves, ${heroes.length} heroes, ${enemies.length} enemies, ${prologueParty.length} party, ${alphaTeam.length} alpha, ${authoredEnemies.length} authored enemies (${Object.keys(authoredAttacks).length} attacks)${dropped.length ? ', dropped: ' + dropped.length : ''}, gaps: ${gaps.length}`);
