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

const STATUS_OK = new Set(['poison', 'burn', 'bleed', 'weak', 'stun', 'slow', 'protection', 'regeneration']);
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
for (const id of [...fielded].sort()) {
  const u = AUTH.units.find((x) => x.id === id);
  if (!u) { gap(id, 'fielded by the prologue, absent from enemies-authored', 'content'); continue; }
  const st = u.stats || {};
  for (const k of ['crit', 'luck']) if (st[k]) gap(id, `stat '${k}' ${st[k]}`, 'stat: ' + k + ' (no UnitDef field)');
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
fs.writeFileSync('gen/enemy-pack-gaps.json', JSON.stringify({
  _note: 'GENERATED by mkenginepack.mjs — clauses the engine cannot yet express, dropped with their reason. Regenerate, never hand-edit.',
  gaps,
}, null, 1) + '\n');

const pack = { note: D.testCohort.note, heroes, enemies, authoredEnemies, authoredAttacks };
const body = '// GENERATED by content/mkenginepack.mjs — NEVER HAND-EDIT (see engine CLAUDE.md,\n'
  + '// "Never hand-edit anything under generated/"). Source of truth: the Codex\n'
  + '// pipeline (content/settled.json testCohort -> hbt-content.json).\n'
  + '// Regenerate:  cd content && node assemble.mjs && node mkenginepack.mjs\n'
  + (dropped.length ? '// Dropped (no engine meaning yet): ' + dropped.join(' | ') + '\n' : '')
  + 'export const UNIT_PACK = ' + JSON.stringify(pack, null, 2) + ' as const\n';
fs.writeFileSync('../engine/src/content/generated/pack.ts', body);
console.log(`pack.ts: ${heroes.length} heroes, ${enemies.length} enemies, ${authoredEnemies.length} authored enemies (${Object.keys(authoredAttacks).length} attacks)${dropped.length ? ', dropped: ' + dropped.length : ''}, gaps: ${gaps.length}`);
