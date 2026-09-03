// mkenginepack.mjs — export the TEST COHORT as the engine's generated unit pack.
// Run AFTER assemble.mjs. Writes ../engine/src/content/generated/pack.ts.
//
// Ruled 2026-08-20: "we're going to read from the data and it's clearly
// differentiated text. We're not hardcoding." The engine's standard battle
// party and enemies come from HERE — the Codex pipeline — not from hand-typed
// rows. Deterministic output: same inputs, byte-identical pack.
import fs from 'fs';
const D = JSON.parse(fs.readFileSync('hbt-content.json', 'utf8'));
if (!D.testCohort) { console.error('mkenginepack: no testCohort in hbt-content.json — run assemble.mjs first.'); process.exit(1); }

const ACTION = { applyPoison: 'status.poison', applyBleed: 'status.bleed', applyBurn: 'status.burn' };
const TARGET = { attacked: 'target', self: 'self' };
const HOOKS = new Set(['onAttack', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill', 'onTakingDamage', 'onDeath', 'onActivationEnd']);
const dropped = [];

function mapCodexTriggers(h, typeId) {
  const out = [];
  for (const [hook, rows] of Object.entries(h.triggers || {})) {
    for (const r of rows || []) {
      const statusId = ACTION[r.action];
      const select = TARGET[r.target];
      if (!HOOKS.has(hook) || !statusId || !select) {
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
    maxHp: p.health, armor: p.armor ?? 0, resist: p.resist ?? 0,
    accuracy: d.accuracy, dodge: p.dodge ?? 0,
    strength: p.strength ?? 0, precision: p.precision ?? 0, magic: p.magic ?? 0, spirit: p.spirit ?? 0,
    role: e.role, movement: d.movement, reach: p.reach ?? 0,
    maxStamina: d.staminaMax, staminaRegen: d.staminaRegen ?? 1,
    ai: e.ai, attacks: e.attacks || [], abilities: e.abilities || [],
    // Movement is a granted CHOICE (ruled 2026-08-21) — no default here: a
    // cohort row without moves should fail the loader, loudly.
    moves: e.moves,
    attributes: ['hero-test'],
    triggers: [...mapCodexTriggers(h, h.typeId), ...(e.riders || [])],
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
  ['Prevents damage from any source.', { reducesIncomingDamage: true }],
  ['Reduces the damage the unit deals by 1 per point.', { reducesOutgoingDamage: true }],
  ["Reduces the unit's Movement by its value.", { reducesMovement: true }],
  ['Loses access to class powers.', { locksPowers: true }],
  ["Takes the unit out of its owner's control and hands it to the AI.", { aiControlled: true }],
];
const STATUS_GAP_NEEDS = {
  'status.root': 'a blocksMovement flag (movement 0, still acts) — capability.root',
  'status.frost': 'a per-hit incoming damage station (+N on every physical hit received) — capability.frost',
  'status.karma': 'heal-received bonus and half-value outgoing damage bonus, decay on kill — capability.karma',
  'status.taunt': 'AI targeting override (must target the taunter) — capability.taunt',
  'status.confusion': 'AI mode swap — capability.confusion',
  'status.shadow': 'a status that GROWS in Settling and obliterates at Max Health, no corpse — capability.shadow',
};
function compileStatuses(rows) {
  const out = {};
  for (const r of rows) {
    const hit = STATUS_SENTENCES.find(([s]) => s === r.effect);
    if (!hit) { gap(r.id, `status sentence not compilable: '${r.effect}'`, STATUS_GAP_NEEDS[r.id] ?? 'unparsed status sentence'); continue; }
    const flags = { ...hit[1] };
    // decay: the one clock the engine has is -1 per Phase (plus Protection's
    // spend-as-it-absorbs, which the absorb station does). Anything else is
    // a gap, whatever the sentence compiled to.
    let decayPerPhase;
    if (/^-1 per Turn/.test(r.decay)) decayPerPhase = 1;
    else if (r.decay === 'Spent by the damage it prevents, and decreases by an additional 1 per Turn.') decayPerPhase = 1;
    else { gap(r.id, `status decay not compilable: '${r.decay}'`, STATUS_GAP_NEEDS[r.id] ?? 'unparsed decay clause'); continue; }
    // tick damage type: the row's own damageType wins; "Resist mitigates each
    // tick" in the decay clause is the ruled magic tick (2026-08-27).
    if (flags.tick === 'damage' && !flags.tickDamageType) {
      if (r.damageType) flags.tickDamageType = r.damageType;
      else if (/Resist mitigates each tick/.test(r.decay)) flags.tickDamageType = 'magic';
      else { gap(r.id, 'a damage tick with no damage type', 'damageType on the row'); continue; }
    }
    // the engine's shape word is derived from the behaviour; the Codex family
    // rides along verbatim.
    const shape = flags.reducesIncomingDamage ? 'pool' : flags.reducesOutgoingDamage ? 'modifier' : 'counter';
    out[r.id] = { id: r.id, name: r.name, shape, family: r.family ?? r.shape, stacking: 'add', decayPerPhase, ...flags };
    STATUS_OK.add(r.id.replace(/^status\./, ''));
  }
  return out;
}
const statuses = compileStatuses(SETTLED.statuses || []);
const TRIG_HOOKS = new Set(['onAttack', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill', 'onTakingDamage', 'onDeath']);

function compileTrigger(t, unitId, attackId) {
  const where = attackId ?? '(unit)';
  if (t.needs?.length) { gap(unitId, `${where} ${t.hook}: ${t.effects?.map((e) => e.effect).join('; ')}`, t.needs.join(',')); return []; }
  if (!TRIG_HOOKS.has(t.hook)) { gap(unitId, `${where} hook '${t.hook}'`, t.hook === 'aura' ? 'hook: aura' : 'hook: ' + t.hook + ' (declared, engine never fires it)'); return []; }
  if (t.targets && /within/.test(t.targets)) { gap(unitId, `${where} ${t.hook} area '${t.targets}'`, 'area trigger select'); return []; }
  const out = [];
  for (const ef of t.effects || []) {
    if (ef.effect === 'apply a status' && STATUS_OK.has(ef.status)) {
      // chance absent = certain. Splitting a multi-effect trigger is only safe
      // when nothing rolls; at chance<100 the halves would diverge on the die.
      if ((t.effects.length > 1) && (t.chance ?? 100) !== 100) { gap(unitId, `${where} ${t.hook}: multi-effect at chance ${t.chance}`, 'multi-effect rolled trigger'); return []; }
      const select = ef.target === 'the attacker' || t.hook === 'onTakingDamage' ? 'target' : ef.target === 'self' ? 'self' : 'target';
      const trig = {
        id: `${unitId.replace(/^unit\./, 'trigger.')}.${(t.name || ef.status).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hook: t.hook, chance: t.chance ?? 100, select,
        effect: { kind: 'status.apply', statusId: 'status.' + ef.status, value: ef.value ?? 1 },
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

const authoredEnemies = [];
const authoredAttacks = {};
const authoredAbilities = {}; // capability.item-powers, 2026-08-27
for (const id of [...fielded].sort()) {
  const u = AUTH.units.find((x) => x.id === id);
  if (!u) { gap(id, 'fielded by the prologue, absent from enemies-authored', 'content'); continue; }
  const st = u.stats || {};
  // crit and luck COMPILE since station.crit (2026-08-27): per-unit crit is
  // COMBAT-DESIGN's "Base Crit varies by enemy" axis, luck the resistance side.
  const unitTriggers = (u.triggers || []).flatMap((t) => compileTrigger(t, id, null));
  const attackIds = [];
  let anyRanged = false;
  for (const raw of u.attacks || []) {
    const a = resolveAttack(raw, id);
    if (!a) continue;
    const ranged = /within/.test(a.targets || '');
    if (ranged && (a.range === null || a.range === undefined)) { gap(id, `${a.id} range is null — N never stated`, 'content: range unstated'); continue; }
    if (a.damage?.powerScale) gap(id, `${a.id} powerScale ${a.damage.powerScale} (base damage kept)`, 'capability.power');
    anyRanged = anyRanged || ranged;
    authoredAttacks[a.id] = {
      id: a.id, name: a.name || a.id.split('.').pop(),
      kind: ranged ? 'ranged' : 'melee',
      damageType: a.damageType || 'physical',
      bonus: a.damage?.mod ?? 0, stat: a.damage?.stat || 'strength',
      reach: ranged ? a.range : 1, staminaCost: 0, // enemies do not run stamina
    };
    attackIds.push(a.id);
    unitTriggers.push(...(a.triggers || []).flatMap((t) => compileTrigger(t, id, a.id)));
  }
  authoredEnemies.push({
    typeId: id, name: u.name, side: 'enemy',
    maxHp: st.health, armor: st.armor ?? 0, resist: st.resist ?? 0,
    accuracy: st.accuracy, dodge: st.dodge ?? 0,
    ...(st.crit ? { crit: st.crit } : {}), ...(st.luck ? { luck: st.luck } : {}), // station.crit 2026-08-27
    strength: st.strength ?? 0, precision: st.precision ?? 0, magic: st.magic ?? 0, spirit: st.spirit ?? 0,
    // Mechanical mapping, not design: a unit with any ranged attack kites,
    // the rest close. The real enemy AI is future work (ai.mode.* backlog).
    role: u.role === 'support' ? 'support' : anyRanged ? 'ranged' : 'melee',
    movement: st.movement, reach: 0,
    maxStamina: 0, staminaRegen: 0,
    ai: anyRanged ? 'ranged-kite' : 'dumb-melee',
    attacks: attackIds, abilities: [], moves: ['power.move'],
    attributes: (u.types || []).map((t) => t.toLowerCase()),
    tags: (u.types || []).map((t) => t.toLowerCase()),
    triggers: unitTriggers,
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
const ITEM_BY_ID = new Map([...(SETTLED.items || []), ...(WEAPONS.items || []), ...SITEMS.items].map((i) => [i.id, i]));
const SATTACK_BY_ID = new Map([...(SETTLED.attacks || []), ...(WEAPONS.attacks || []), ...SITEMS.attacks].map((a) => [a.id, a]));
const SPOWER_BY_ID = new Map(
  [...(Array.isArray(SETTLED.powers) ? SETTLED.powers : []), ...(SITEMS.powers || [])]
    .filter((p) => p && p.id).map((p) => [p.id, p]));
const PARTY = ['hero.base.ranger-aggressive', 'hero.base.warrior-iron', 'hero.base.priest-armored'];

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
    if (push && TRIG_HOOKS.has(t.hook)) {
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
    } else {
      gap(unitId, `${a.id} ${t.hook}: ${JSON.stringify(t.effect).slice(0, 60)}`, 'trigger shape unparsed');
    }
  }
  // The crit field COMPILES since station.crit (2026-08-27): AttackDef.crit
  // is the weapon's flat addition to crit chance (COMBAT-DESIGN: "Crit from
  // gear"). The gap it used to raise is closed in takeAttack below.
  if (((a.tags || []).includes('area') || /adjacent to both/.test(a.targets || '')) && !areaShapeOf(a)) {
    gap(unitId, `${a.id} targets '${String(a.targets).slice(0, 50)}' — lands SINGLE-TARGET`, 'area attack shape');
  }
  return out;
}

// Item powers the engine speaks (capability.item-powers, 2026-08-27) — the
// three authored S31 shapes, parsed from their EXACT settled text and never
// invented. Anything else stays a named gap.
//   Heal:  "Heal the target for B + M x Spirit." / "one ally within R hexes"
//          -> effect 'heal', ValueSpec partySpirit (GAME-DESIGN §5's law:
//          Spirit effects scale off the party-wide sum).
//   Block: "Gain Protection equal to B + your Armor, and lose D Dodge for the
//          rest of the Battle." / "self" -> effect 'selfGuard'.
//   Storm: "Deal magic damage equal to your Magic + B to every unit in the
//          blast." / "a hex within R hexes and every hex adjacent to it"
//          -> a damage power with area 'blast1'. The engine centres the blast
//          on a UNIT, not an arbitrary hex — that remainder is a named gap.
function compiledPowerOf(p, unitId) {
  const desc = String(p.description || '');
  const tgt = String(p.targets || '');
  const base = { id: p.id, name: p.name, staminaCost: p.stamina ?? 0, cooldown: p.cooldown ?? 0 };
  let m, r;
  if ((m = desc.match(/^Heal the target for (\d+) \+ (\d+) x Spirit\./))
    && (r = tgt.match(/^one ally within (\d+) hexes$/))) {
    return { ...base, range: parseInt(r[1], 10), effect: 'heal',
      heal: { scale: 'partySpirit', base: parseInt(m[1], 10), mult: parseInt(m[2], 10) } };
  }
  if ((m = desc.match(/^Gain Protection equal to (\d+) \+ your Armor, and lose (\d+) Dodge for the rest of the Battle\./))
    && tgt === 'self') {
    return { ...base, range: 0, effect: 'selfGuard',
      guard: { protectionBase: parseInt(m[1], 10), protectionPerArmor: 1, dodgeLoss: parseInt(m[2], 10) } };
  }
  if ((m = desc.match(/^Deal magic damage equal to your Magic \+ (\d+) to every unit in the blast\./))
    && (r = tgt.match(/^a hex within (\d+) hexes and every hex adjacent to it$/))) {
    gap(unitId, `${p.id} targets 'a hex within ${r[1]}' — engine centres the blast on a UNIT`, 'power targeting: arbitrary hex');
    return { ...base, range: parseInt(r[1], 10), effect: 'damage',
      stat: 'magic', bonus: parseInt(m[1], 10), damageType: 'magic', area: 'blast1' };
  }
  return null;
}

// The area shapes the engine speaks (capability.area-attack, 2026-08-27).
// EXACT authored phrases only — "the two hexes adjacent to both you and it"
// is the halberd's full arc and compiles to 'arc'. The Lumberjack's "one hex
// adjacent to both you and it" is a DIFFERENT shape (a chosen half-arc) the
// engine does not yet express, so it stays a named gap rather than being
// rounded up to the full arc. Compile-or-name-the-gap; never round.
function areaShapeOf(a) {
  if (/the two hexes adjacent to both you and it/.test(String(a.targets || ''))) return 'arc';
  return null;
}

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
  let anyRanged = false;
  for (const itemId of items) {
    const it = ITEM_BY_ID.get(itemId);
    if (!it) { gap(id, `kit item ${itemId} not in settled-items`, 'content'); continue; }
    for (const aid of it.grants || []) {
      const a = SATTACK_BY_ID.get(aid);
      if (!a) { gap(id, `${itemId} grants ${aid} which has no attack row`, 'content'); continue; }
      // gen/weapons.json (S37a's third source) writes range as the STRING
      // "melee" — passing it into reach shipped `reach: "melee"` and the
      // engine loader refused the whole pack, loudly and correctly (Law 9).
      // Ranged means a NUMBER above 1, same as the alpha lane; melee is 1.
      const ranged = typeof a.range === 'number' && a.range > 1;
      anyRanged = anyRanged || ranged;
      authoredAttacks[a.id] = {
        id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
        damageType: a.damageType || 'physical',
        bonus: a.damage ?? 0, stat: a.stat || 'strength',
        reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0, // heroes pay
        ...(areaShapeOf(a) ? { area: areaShapeOf(a) } : {}), // capability.area-attack
        ...(a.crit ? { crit: a.crit } : {}), // station.crit 2026-08-27
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
      id: a.id, name: a.name, kind: 'melee', damageType: a.damageType || 'physical',
      bonus: a.damage ?? 0, stat: a.stat || 'strength', reach: 1, staminaCost: a.stamina ?? 0,
      ...(a.crit ? { crit: a.crit } : {}),
    };
    attackIds.push(a.id);
    kitTriggers.push(...settledAttackExtras(a, id));
    if (a.accuracy) gap(id, `${a.id} accuracy ${a.accuracy}`, 'attack field: accuracy (no AttackDef slot)');
  }

  // Fold kit-item stat modifiers into the row (the armor pins are the first kit items
  // whose whole payload IS the mods — without this the Destroyed Mail does nothing).
  const p = { ...h.ported }, d = { ...h.derivedBase };
  const FOLD = { health: [p, 'health'], armor: [p, 'armor'], resist: [p, 'resist'], dodge: [p, 'dodge'],
    strength: [p, 'strength'], precision: [p, 'precision'], magic: [p, 'magic'], spirit: [p, 'spirit'],
    reach: [p, 'reach'], accuracy: [d, 'accuracy'], movement: [d, 'movement'],
    staminaMax: [d, 'staminaMax'], staminaRegen: [d, 'staminaRegen'] };
  for (const itemId of items) {
    const it = ITEM_BY_ID.get(itemId);
    for (const [stat, v] of Object.entries(it?.statModifiers || {})) {
      const f = FOLD[stat];
      if (f) f[0][f[1]] = (f[0][f[1]] || 0) + v;
      else gap(id, `${itemId} statModifier '${stat}' ${v}`, 'stat: ' + stat + ' (no UnitDef field)');
    }
  }
  prologueParty.push({
    typeId: id, name: h.name, side: 'hero',
    maxHp: p.health, armor: p.armor ?? 0, resist: p.resist ?? 0,
    accuracy: d.accuracy, dodge: p.dodge ?? 0,
    strength: p.strength ?? 0, precision: p.precision ?? 0, magic: p.magic ?? 0, spirit: p.spirit ?? 0,
    role: anyRanged ? 'ranged' : 'melee',
    movement: d.movement,
    // Reach as AUTHORED (Hunter 3). The Codex-wide reach sweep (ruled: 0 is
    // the default, higher unusual) is content work still owed; fielding what
    // the row says is the data leading, and the sweep will move it.
    reach: p.reach ?? 0,
    maxStamina: d.staminaMax, staminaRegen: d.staminaRegen ?? 1,
    ai: anyRanged ? 'ranged-kite' : 'melee-aggressive',
    attacks: attackIds, abilities: [],
    moves: movesForClass(h.class),
    attributes: ['hero-eve'],
    tags: ['hero'],
    triggers: kitTriggers,
  });
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
    const attackIds = [];
    let anyRanged = false;
    const takeAttack = (a) => {
      const ranged = (a.range ?? 1) > 1 && typeof a.range === 'number';
      anyRanged = anyRanged || ranged;
      const area = areaShapeOf(a);
      authoredAttacks[a.id] = {
        id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
        damageType: a.damageType || 'physical',
        bonus: a.damage ?? 0, stat: a.stat || 'strength',
        reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0, // heroes pay
        ...(area ? { area } : {}), // capability.area-attack, 2026-08-27
        ...(a.crit ? { crit: a.crit } : {}), // station.crit, 2026-08-27
      };
      attackIds.push(a.id);
      kitTriggers.push(...settledAttackExtras(a, id));
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
          if (row) { authoredAbilities[row.id] = row; abilityIds.push(row.id); }
          else gap(id, `${itemId} grants ${aid}`, pw ? 'item power — shape unparsed' : 'item power — no authored row');
          continue;
        }
        const a = SATTACK_BY_ID.get(aid);
        if (!a) { gap(id, `${itemId} grants ${aid} which has no attack row`, 'content'); continue; }
        takeAttack(a);
      }
    }
    for (const a of universals) if (!attackIds.includes(a.id)) takeAttack(a);
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
      maxHp: p.health, armor: p.armor ?? 0, resist: p.resist ?? 0,
      accuracy: d.accuracy, dodge: p.dodge ?? 0,
      ...(d.crit ?? p.crit ? { crit: d.crit ?? p.crit } : {}), ...(d.luck ?? p.luck ? { luck: d.luck ?? p.luck } : {}), // station.crit 2026-08-27
      strength: p.strength ?? 0, precision: p.precision ?? 0, magic: p.magic ?? 0, spirit: p.spirit ?? 0,
      role: anyRanged ? 'ranged' : 'melee',
      movement: d.movement, reach: p.reach ?? 0,
      maxStamina: d.staminaMax, staminaRegen: d.staminaRegen ?? 1,
      ai: h.ai || (anyRanged ? 'ranged-kite' : 'melee-aggressive'),
      attacks: attackIds, abilities: abilityIds,
      moves: movesForClass(h.class),
      attributes: ['hero-alpha'],
      tags: ['hero'],
      triggers: kitTriggers,
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
const CIVILIANS = ['hero.fixed.orphans', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer'];
for (const id of CIVILIANS) {
  const h = allHeroes.find((x) => x.id === id);
  if (!h) { gap(id, 'named for the prologue, absent from the Codex', 'content'); continue; }
  const p2 = h.ported, d2 = h.derivedBase;
  // crit/luck compile since station.crit (2026-08-27) — see the enemy block.
  const attackIds = [];
  const civTriggers = [];
  let anyRanged = false;
  for (const itemId of h.kit || []) {
    const it = ITEM_BY_ID.get(itemId);
    if (!it) { gap(id, `kit item ${itemId} has no settled-items row`, 'content: item unauthored'); continue; }
    for (const aid of it.grants || []) {
      const a = SATTACK_BY_ID.get(aid);
      if (!a) { gap(id, `${itemId} grants ${aid} which has no attack row`, 'content: attack rows unauthored'); continue; }
      const ranged = typeof a.range === 'number' && a.range > 1;
      anyRanged = anyRanged || ranged;
      authoredAttacks[a.id] = {
        id: a.id, name: a.name, kind: ranged ? 'ranged' : 'melee',
        damageType: a.damageType || 'physical',
        bonus: a.damage ?? 0, stat: a.stat || 'strength',
        // Civilians are EXACTLY like heroes (ruled 2026-08-26): they pay
        // what the attack row authors.
        reach: ranged ? a.range : 1, staminaCost: a.stamina ?? 0,
        ...(areaShapeOf(a) ? { area: areaShapeOf(a) } : {}), // capability.area-attack
        ...(a.crit ? { crit: a.crit } : {}), // station.crit 2026-08-27
      };
      attackIds.push(a.id);
      civTriggers.push(...settledAttackExtras(a, id));
    }
  }
  prologueParty.push({
    typeId: id, name: h.name, side: 'hero',
    maxHp: p2.health, armor: p2.armor ?? 0, resist: p2.resist ?? 0,
    accuracy: d2.accuracy, dodge: p2.dodge ?? 0,
    ...(d2.crit ?? p2.crit ? { crit: d2.crit ?? p2.crit } : {}), ...(d2.luck ?? p2.luck ? { luck: d2.luck ?? p2.luck } : {}), // station.crit 2026-08-27
    strength: p2.strength ?? 0, precision: p2.precision ?? 0, magic: p2.magic ?? 0, spirit: p2.spirit ?? 0,
    role: anyRanged ? 'ranged' : 'melee',
    movement: d2.movement, reach: p2.reach ?? 0,
    // The level-1 hero baseline (COMBAT-DESIGN.md:461) — the rows' derived 0
    // is stale and the ruling says exactly-like-heroes.
    maxStamina: 5, staminaRegen: 1,
    ai: anyRanged ? 'ranged-kite' : 'melee-aggressive',
    attacks: attackIds, abilities: [],
    // "Beasts and Civilians get neither" half-step (Codex 2026-08-21).
    moves: ['power.move'],
    attributes: ['civilian'],
    tags: ['hero', 'civilian'],
    triggers: civTriggers,
  });
}


// The Critical Injury Chart rides along verbatim — ruled data, not a kind
// (2026-08-27). The engine folds it from here; COMBAT-DESIGN.md is the design
// authority and settled.json holds the one machine copy.
// ── THE CRITICAL INJURY CHART (station.crit, 2026-08-27) ────────────────────
// settled.json carries the DICTATED PROSE (one machine copy of the ruling);
// the engine never parses prose at runtime, so the ten fixed strings compile
// HERE into structured effects — compile-or-name-the-gap, like every row.
// The two clauses the engine cannot express are dropped with named gaps:
// Blinded's −4 Vision (no vision model — gap L-3a) and Knocked Sprawling's
// −50 Surge (no surge quantity). The push LANDS — forced movement was built
// today (capability.knockback), overtaking the row's own `needs` note.
// The chart's "loses access to class powers" status. A placeholder id, see the
// settled.json row's source; the ONE other place it is named.
const POWERS_LOCKED = 'status.powers-locked';
const STAT_WORD = { Accuracy: 'accuracy', Movement: 'movement', Strength: 'strength', Precision: 'precision', Armor: 'armor', Resist: 'resist', Dodge: 'dodge' };
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
        const stat = STAT_WORD[statName];
        if (!stat) { gap('critChart', `${r.key}: -${m[1]} ${statName}`, statName === 'Vision' ? 'no vision model (gap L-3a)' : statName === 'Surge' ? 'no surge quantity in the engine' : 'stat: ' + statName); continue; }
        effects.push({ kind: 'statMod', stat, value: -parseInt(m[1], 10), ...(floored ? { floor: 0 } : {}) });
      } else if ((m = clause.match(/^(\d+) turns?$/))) {
        const prev = effects[effects.length - 1];
        if (prev && prev.statusId === POWERS_LOCKED && prev.value === 0) prev.value = parseInt(m[1], 10);
        else gap('critChart', `${r.key}: dangling duration '${clause}'`, 'unparsed chart clause');
      } else if ((m = clause.match(/^gain (\d+) ([A-Za-z]+)$/)) || (m = clause.match(/^(\d+) ([A-Za-z]+)$/))) {
        const status = m[2].toLowerCase();
        if (!STATUS_OK.has(status) && status !== 'dazed') { gap('critChart', `${r.key}: ${clause}`, 'status: ' + status); continue; }
        effects.push({ kind: 'status', statusId: 'status.' + status, value: parseInt(m[1], 10) });
      } else if ((m = clause.match(/^pushed (\d+) hex(?:es)?$/))) {
        effects.push({ kind: 'push', hexes: parseInt(m[1], 10) });
      } else if ((m = clause.match(/^lose (\d+) Stamina$/))) {
        effects.push({ kind: 'loseStamina', value: parseInt(m[1], 10) });
      } else if ((m = clause.match(/^loses access to class powers$/))) {
        // "loses access to class powers, 3 turns" — the duration arrives as
        // the next clause; handled above. The chart's Dazed row and the Dazed
        // STATUS are two different things (Andrew 2026-09-02: "there is a
        // critical effect, and then there is a status effect"), so the row
        // applies status.powers-locked — the Codex row whose one sentence is
        // exactly this clause. Rename there and here, nowhere else.
        effects.push({ kind: 'status', statusId: POWERS_LOCKED, value: 0 });
      } else {
        gap('critChart', `${r.key}: '${clause}'`, 'unparsed chart clause');
      }
    }
    if (effects.length === 0) { gap('critChart', `${r.key}: no clause compiled — row lands EMPTY`, 'unparsed chart row'); }
    rows.push({ key: r.key, name: r.name, effects });
  }
  return { note: chart.note, rows };
}

const pack = { note: D.testCohort.note, heroes, enemies, authoredEnemies, authoredAttacks, authoredAbilities, prologueParty, alphaTeam, critChart: compileCritChart(SETTLED.critChart), statuses };

// Gaps are written AFTER the pack is fully constructed (moved 2026-08-27):
// compileCritChart names gaps during pack construction, and writing the file
// earlier silently dropped them — a gap that never reaches the file is the
// exact failure the file exists to prevent.
fs.writeFileSync('gen/enemy-pack-gaps.json', JSON.stringify({
  _note: 'GENERATED by mkenginepack.mjs — clauses the engine cannot yet express, dropped with their reason. Regenerate, never hand-edit.',
  gaps,
}, null, 1) + '\n');

const body = '// GENERATED by content/mkenginepack.mjs — NEVER HAND-EDIT (see engine CLAUDE.md,\n'
  + '// "Never hand-edit anything under generated/"). Source of truth: the Codex\n'
  + '// pipeline (content/settled.json testCohort -> hbt-content.json).\n'
  + '// Regenerate:  cd content && node assemble.mjs && node mkenginepack.mjs\n'
  + (dropped.length ? '// Dropped (no engine meaning yet): ' + dropped.join(' | ') + '\n' : '')
  + 'export const UNIT_PACK = ' + JSON.stringify(pack, null, 2) + ' as const\n';
fs.writeFileSync('../engine/src/content/generated/pack.ts', body);
console.log(`pack.ts: ${Object.keys(statuses).length} statuses, ${heroes.length} heroes, ${enemies.length} enemies, ${prologueParty.length} party, ${alphaTeam.length} alpha, ${authoredEnemies.length} authored enemies (${Object.keys(authoredAttacks).length} attacks)${dropped.length ? ', dropped: ' + dropped.length : ''}, gaps: ${gaps.length}`);
