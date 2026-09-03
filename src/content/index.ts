// Content for the first battle. Data, not code (Design Law 9).
// Registries are explicit arrays — never decorators, never import side-effects,
// because load order would become a hidden global that shifts tie-breaks between runs.

import type { AbilityDef, AttackDef, UnitDef } from '../core/types.js'
import { omitDisabled, stripDisabledTriggers } from './disable.js'
import { packAbilities, packAttacks, packCritChart, packUnits } from './pack.js'

// ─────────────────────────────────────────────────────────────────────────────
// PROVISIONAL CONTENT — NOT PUBLISHED, NOT DESIGN
//
// Every attack and unit in this file was invented by an engine session to have
// something to run the harness against. NONE of it comes through the content
// structure: sessions 2 (Actions) and 3 (Units) have not published these ids in
// `2-ACTIONS-SETTLED.md` or `3-UNITS-SETTLED.md`, and until they do, these numbers
// are scaffolding.
//
// WHAT THIS MEANS IN PRACTICE:
//   · No balance conclusion drawn from these numbers is a finding about the game.
//     Several were reported as findings on 2026-08-14. They were not.
//   · Changing a number here is not a design change. It is moving scaffolding.
//   · When a session publishes the real rows, these are REPLACED, not reconciled.
//
// `node tools/content-check.mjs` lists exactly which ids are in this state.
// ─────────────────────────────────────────────────────────────────────────────


const RAW_ATTACKS: Readonly<Record<string, AttackDef>> = {
  'attack.zombie.basic': {
    // PROVISIONAL — no published source
    id: 'attack.zombie.basic', name: 'Rotting Bite', kind: 'melee',
    damageType: 'physical', bonus: 0, stat: 'strength', reach: 1, staminaCost: 0,
    // The poison rider moved to trigger.zombie.rot (2026-08-20) — it was a
    // hardcoded 100% on-hit with no chance and no hook, the exact shape the
    // trigger system exists to replace.
  },
  'attack.warrior.axe': {
    // PROVISIONAL — no published source
    id: 'attack.warrior.axe', name: 'Axe', kind: 'melee',
    damageType: 'physical', bonus: 1, stat: 'strength', reach: 1, staminaCost: 1,
  },
  'attack.warrior.massive': {
    // PROVISIONAL — no published source
    id: 'attack.warrior.massive', name: 'Massive Strike', kind: 'melee',
    damageType: 'physical', bonus: 3, stat: 'strength', reach: 1, staminaCost: 2,
  },
  'attack.ranger.bow': {
    // PROVISIONAL — no published source
    id: 'attack.ranger.bow', name: 'Bow', kind: 'ranged',
    damageType: 'physical', bonus: 1, stat: 'precision', reach: 6, staminaCost: 1,
  },
  'attack.mage.staff': {
    // PROVISIONAL — no published source
    id: 'attack.mage.staff', name: 'Staff (bolt)', kind: 'ranged',
    damageType: 'magic', bonus: 0, stat: 'precision', reach: 6, staminaCost: 1,
  },
  'attack.mage.strike': {
    // PROVISIONAL — no published source
    id: 'attack.mage.strike', name: 'Staff (strike)', kind: 'melee',
    damageType: 'physical', bonus: 0, stat: 'strength', reach: 1, staminaCost: 1,
  },
  // attack.punch left this file 2026-08-27 (content.alpha-team): it was
  // PROVISIONAL here since the first baseline; S31 authored the real row
  // (universalToAllUnits, staminaCost 1 vs the provisional 0) and the
  // generated pack now owns the id. One owner only — the collision guard
  // below is what caught the shadowing. Cost 0→1 is a declared baseline
  // change: cohort punchers now pay.
  'attack.breath.hiss': {
    // PUBLISHED: 6-BESTIARY-SETTLED § attack.* (2026-08-20); Codex §5 Breath:
    // "Hiss | range 3 | magic | +0 | magic | onHit apply 2 Poison". Acc +5
    // dropped (no per-attack accuracy field yet — backlog station.accuracy-field).
    // The poison rider lives on trigger.green-drake.venom-breath, not the
    // legacy `applies` field. With the drake's published magic 0 this is a
    // 0-damage attack — the whole threat is the poison clock, faithfully.
    id: 'attack.breath.hiss', name: 'Hiss', kind: 'ranged',
    damageType: 'magic', bonus: 0, stat: 'magic', reach: 3, staminaCost: 0,
  },
  'attack.fangs.bite': {
    // PUBLISHED: Codex §5 Fangs: "Bite | melee | strength | +2 | physical |
    // reach 1 | Crit +5 | Stam 1". Crit +5 dropped (no AttackDef field, crits
    // disabled). Stam 1 is REAL as of 2026-08-20 — the Spirit Snake is a hero
    // and pays it (SWITCHES.md brawlStaminaCost, answered).
    id: 'attack.fangs.bite', name: 'Bite', kind: 'melee',
    damageType: 'physical', bonus: 2, stat: 'strength', reach: 1, staminaCost: 1,
  },
  'attack.drake.poison-breath': {
    // PUBLISHED: Codex §5, Drake's Maw (Angela 2026-08-20, dictated): "Poison
    // Breath — precision magic damage, on hit applies 3 Poison, 2 Stamina."
    // Range 3 carried from the Breath family (not dictated). The 3-Poison
    // rider lives on trigger.green-drake.venom-breath, attack-scoped.
    id: 'attack.drake.poison-breath', name: 'Poison Breath', kind: 'ranged',
    damageType: 'magic', bonus: 0, stat: 'precision', reach: 3, staminaCost: 2,
  },
  'attack.drake.snap': {
    // PUBLISHED: Codex §5, Drake's Maw (Angela 2026-08-20, dictated): "a bite
    // or some other name — disambiguate it": Snap. Strength damage, on hit
    // applies 1 Poison (trigger.green-drake.venom-snap, attack-scoped), 1 Stamina.
    id: 'attack.drake.snap', name: 'Snap', kind: 'melee',
    damageType: 'physical', bonus: 0, stat: 'strength', reach: 1, staminaCost: 1,
  },
  'attack.test-ram.slam': {
    // TEST SCAFFOLDING — station.crit-count's first consumer (2026-08-27):
    // "Do two criticals." crit 47 puts the golem's chance at 50, so multi-
    // criticals actually resolve in the verify scenario instead of waiting on
    // a 3% fluke. Pure data; no control battle fields the golem.
    id: 'attack.test-ram.slam', name: 'Slam (TEST)', kind: 'melee',
    damageType: 'physical', bonus: 2, stat: 'strength', reach: 1, staminaCost: 0,
    crit: 47, critCount: 2,
  },
  'attack.test-ram.overhead': {
    // TEST SCAFFOLDING — station.crit-count's second variant: "Do three
    // criticals," pure data. Costs stamina so the golem alternates between
    // this and the slam as its pool cycles — both variants live in one battle.
    id: 'attack.test-ram.overhead', name: 'Overhead (TEST)', kind: 'melee',
    damageType: 'physical', bonus: 1, stat: 'strength', reach: 1, staminaCost: 4,
    crit: 47, critCount: 3,
  },
  'attack.test-arc.sweep': {
    // TEST SCAFFOLDING — capability.area-attack's second variant (2026-08-27):
    // the same 'arc' shape as attack.halberd.cleave, pure data on a test unit,
    // which is the generalization gate's whole question. Cost 0 so stamina can
    // never bench the proof. Lives only on the Arc Golem, only in
    // showcase.arc-variant — never in a control battle.
    id: 'attack.test-arc.sweep', name: 'Sweep (TEST)', kind: 'melee',
    damageType: 'physical', bonus: 1, stat: 'strength', reach: 1, staminaCost: 0,
    area: 'arc',
  },
}

const RAW_ABILITIES: Readonly<Record<string, AbilityDef>> = {
  'power.mage.bolt': {
    id: 'power.mage.bolt', name: 'Arcane Bolt',
    stat: 'magic', bonus: 6, damageType: 'magic',
    range: 10, staminaCost: 1, cooldown: 6,
  },
}

const RAW_UNITS: Readonly<Record<string, UnitDef>> = {
  zombie: {
    typeId: 'zombie', side: 'enemy',
    maxHp: 10, armor: 0, resist: 0,
    accuracy: 65, dodge: 0, strength: 4, precision: 0, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 0,
    maxStamina: 0, staminaRegen: 0,   // enemies do not run stamina
    // Backlog trigger.zombie.rot: 20% onDamage, poison 1 to the target —
    // replaces the hardcoded 100% rider that lived on attack.zombie.basic.
    triggers: [{
      id: 'trigger.zombie.rot', hook: 'onDamage', chance: 20,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 },
      source: 'unit.zombie',
      // Scoped to the bite (2026-08-20, the attack-scoped mechanism's first
      // variant). Vacuous while the bite is the zombie's only attack — which is
      // exactly what keeps this landing byte-identical — and correct the day a
      // second zombie attack exists: rot rides the BITE, not the zombie.
      onlyWithAttack: 'attack.zombie.basic',
    }, {
      // TESTING LANE — this is backlog trigger.zombie.sap, absorbed into the
      // status.weakness landing: a SECOND independent 20% onDamage, weak 1 to
      // the target. Rot and sap roll on their own named streams (~4% both).
      id: 'test.zombie.sap', hook: 'onDamage', chance: 20,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.weak', value: 1 },
      source: 'unit.zombie',
    }, {
      // TESTING LANE — status.slow's battle source (Codex Lash shape: "onHit
      // the target gains 1 Slow"): a grasping hand out of the horde.
      id: 'test.zombie.grasp', hook: 'onHit', chance: 20,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.slow', value: 1 },
      source: 'unit.zombie',
    }],
    ai: 'dumb-melee',
    attacks: ['attack.zombie.basic'],
    abilities: [],
    // ONE movement power per enemy row (Angela 2026-08-21); power.move is
    // universal to all units (Codex) and enemies pay no stamina for it —
    // stamina is the hero throttle.
    moves: ['power.move'],
    attributes: ['undead'],
  },
  'zombie-burning': {
    // Angela 2026-08-20: "You could create a burning zombie and mix them in with
    // the other zombies. On taking damage, the zombie deals 1 burn to its
    // attacker." Same stat line as the zombie — the identity is the sear, not
    // the numbers. Published: 6-BESTIARY-SETTLED.md.
    typeId: 'zombie-burning', side: 'enemy',
    maxHp: 10, armor: 0, resist: 0,
    accuracy: 65, dodge: 0, strength: 4, precision: 0, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 0,
    maxStamina: 0, staminaRegen: 0,
    triggers: [{
      // onTakingDamage is the VICTIM's hook, so from this zombie's side the
      // "target" is whoever hit it — exactly where the sear lands.
      id: 'trigger.zombie-burning.sear', hook: 'onTakingDamage', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 },
      source: 'unit.zombie-burning',
    }, {
      // TESTING LANE — test.status.daze's battle source (the blocksAction
      // generalization variant needs to run live). A concussive lurch: 15% of
      // this zombie's damaging hits daze the victim for one activation.
      id: 'test.zombie-burning.lurch', hook: 'onDamage', chance: 15,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'test.status.daze', value: 1 },
      source: 'unit.zombie-burning',
    }],
    ai: 'dumb-melee',
    attacks: ['attack.zombie.basic'],
    abilities: [],
    moves: ['power.move'],
    attributes: ['undead'],
  },
  'spirit-snake': {
    // A PLAYER BEAST — Angela 2026-08-20: "These beasts were meant to be
    // player beasts... Spirit Snake is supposed to be a hero unit." Her block,
    // dictated and recorded in the Codex SOURCE (settled.json hero ruling →
    // Codex §10 hero table): Health 4, Dodge 50, Move 8, Accuracy 110,
    // Armor 0, Resist 2, Strength 2, Precision 0, Magic 0, Spirit 0,
    // Stamina 8; venom is 3 Poison on hit; ZERO Item Slots and NO weapon
    // slots (slots live in the Codex — the engine has no loadout yet).
    // BENCHED by her fielding ruling: hero-side, not in the default party.
    typeId: 'spirit-snake', side: 'hero',
    maxHp: 4, armor: 0, resist: 2,
    accuracy: 110, dodge: 50, strength: 2, precision: 0, magic: 0, spirit: 0,
    role: 'melee',
    movement: 8, reach: 1,
    maxStamina: 8, staminaRegen: 1,
    triggers: [{
      // "make it apply 3 poison to the target on hit" — scoped to the fangs.
      id: 'trigger.spirit-snake.venom', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 3 },
      source: 'unit.spirit-snake',
      onlyWithAttack: 'attack.fangs.bite',
    }],
    ai: 'melee-aggressive',
    attacks: ['attack.fangs.bite'],
    abilities: [],
    // A hero, but a BEAST: "Beasts and Civilians get neither" Sidestep nor
    // Side Roll (Angela 2026-08-21, Codex sidestep ruling).
    moves: ['power.move'],
    attributes: ['beast'],
  },
  'shadow-hound-puppy': {
    // A PLAYER BEAST — ruled 2026-08-21: "Shadow Hound Puppy is supposed to be
    // a hero, not an enemy. All of those initial beasts, of which there were
    // only a couple, were meant to be heroes." The 2026-08-20 Beast-pen ruling
    // reached the snake and the drake (fix.beast-pen-hero-correction, a4822ab)
    // and missed this row, so the comment here said PLAYER beasts directly
    // above a field saying `enemy`. The field now agrees with the comment.
    //
    // STILL PENDING REDESIGN. The numbers below are the ported Codex §10 row,
    // never her design, kept so the id and its tests survive until she dictates
    // its real block (the snake and drake precedent). BENCHED.
    typeId: 'shadow-hound-puppy', side: 'hero',
    maxHp: 12, armor: 0, resist: 0,
    accuracy: 70, dodge: 0, strength: 6, precision: 2, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 1,
    // maxStamina 0 is an ENEMY property that came in with the ported block, and
    // it is now load-bearing in a way it was not: attack.fangs.bite costs 1
    // Stamina, so this hero CAN MOVE AND CAN NEVER ATTACK. Deliberately left
    // wrong rather than invented — Angela dictated Stamina 8 for the Spirit
    // Snake, and "copy, don't invent" forbids picking a number for this one.
    // Harmless while benched; it is the first thing her dictated block fixes.
    maxStamina: 0, staminaRegen: 0,
    triggers: [{
      // Codex §3 Hound: "onHit your fang attacks apply 1 Bleed." Named for the
      // Hound power "Worry the Wound". Unconditional onHit — the bite is its
      // only attack. Lands only after status.bleed (landed 849ead6).
      id: 'trigger.shadow-hound-puppy.worry', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.bleed', value: 1 },
      source: 'unit.shadow-hound-puppy',
      onlyWithAttack: 'attack.fangs.bite',
    }],
    ai: 'melee-aggressive',
    attacks: ['attack.fangs.bite'],
    abilities: [],
    moves: ['power.move'],
    attributes: ['beast'],
  },
  'arc-golem': {
    // TEST SCAFFOLDING — capability.area-attack's second consumer (2026-08-27),
    // the cohort precedent: an invented test body carrying a pure-data variant
    // of a real mechanism. Wields ONLY the test sweep, fields ONLY in
    // showcase.arc-variant. Accuracy is irrelevant on purpose: an area attack
    // never rolls, and a 5-accuracy unit landing every sweep is itself part of
    // the proof.
    typeId: 'arc-golem', side: 'hero',
    // Re-statted 2026-08-27 (station.crit-count): the original 14hp body died
    // to the zombie clump before the battle ever reached a single-target turn,
    // so the slam and overhead could not fire live. Scaffolding, not design.
    maxHp: 30, armor: 2, resist: 0,
    accuracy: 5, dodge: 0, strength: 5, precision: 0, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 1,
    maxStamina: 5, staminaRegen: 1,
    triggers: [{
      // capability.knockback's second variant (2026-08-27) — the same
      // mechanism as trigger.halberd.hack.knockback, pure data on the test
      // body: every unit the golem's sweep damages is rammed a hex away.
      id: 'trigger.test-ram.knockback', hook: 'onDamage', chance: 100,
      select: 'target',
      effect: { kind: 'knockback', value: 1 },
      source: 'unit.arc-golem',
      onlyWithAttack: 'attack.test-arc.sweep',
    }, {
      // THORNS, test lane (fix.status-damage-types 2026-08-27) — RULED:
      // "Thorns damage that is dealt is true damage." The golem's stone hide
      // deals 1 TRUE back to whoever hurts it; the typed retaliation, live.
      id: 'trigger.test-thorns', hook: 'onTakingDamage', chance: 100,
      select: 'target',
      effect: { kind: 'damage', amount: 1, damageType: 'true' },
      source: 'unit.arc-golem',
    }],
    ai: 'melee-aggressive',
    // Preference order: the overhead ("three criticals") when its stamina is
    // there, the slam ("two criticals") otherwise; areaSwing still overrides
    // with the sweep whenever two enemies stand in the arc. All three are
    // station scaffolding on one body (station.crit-count, 2026-08-27).
    attacks: ['attack.test-ram.overhead', 'attack.test-ram.slam', 'attack.test-arc.sweep'],
    abilities: [],
    moves: ['power.move'],
    attributes: ['test'],
  },
  'green-drake': {
    // A PLAYER BEAST — Angela 2026-08-20, dictated block, recorded in the
    // Codex source (settled.json hero ruling; §5 Drake's Maw; §10 hero table):
    // Health 12, Armor 2, Resist 1, Strength 4, Precision 3, Magic 0,
    // Spirit 0, Accuracy 65; reach 2. Two attacks with DIFFERENT riders —
    // the case that forced attack-scoped triggers. Her two movement powers
    // (Flight: +0 move for 1 Stamina, atomic; regular: movement 5 for 1
    // Stamina) wait on backlog movement.flight — movement modes don't exist
    // yet; movement 5 is the regular power's value. BENCHED like the snake.
    typeId: 'green-drake', side: 'hero',
    maxHp: 12, armor: 2, resist: 1,
    accuracy: 65, dodge: 0, strength: 4, precision: 3, magic: 0, spirit: 0,
    role: 'ranged',
    movement: 5, reach: 2,
    maxStamina: 5, staminaRegen: 1,
    triggers: [{
      // "poison breath... on hit, applies 3 poison" — the breath's rider only.
      id: 'trigger.green-drake.venom-breath', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 3 },
      source: 'unit.green-drake',
      onlyWithAttack: 'attack.drake.poison-breath',
    }, {
      // "That does strength damage and, on hit, applies one poison."
      id: 'trigger.green-drake.venom-snap', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 },
      source: 'unit.green-drake',
      onlyWithAttack: 'attack.drake.snap',
    }],
    ai: 'ranged-kite',
    attacks: ['attack.drake.poison-breath', 'attack.drake.snap'],
    abilities: [],
    // Angela dictated the drake exactly TWO movement powers (2026-08-20), in
    // this order: "a flight movement power that moves +0 and costs 1 stamina"
    // (= the ladder's standard rung) and a regular move. Beasts get neither
    // Sidestep nor Side Roll (Codex 2026-08-21). Declared order is AI
    // preference order — ties go to the wings.
    moves: ['power.flight', 'power.move'],
    attributes: ['beast', 'dragon'],
  },
  warrior: {
    typeId: 'warrior', side: 'hero',
    maxHp: 10, armor: 1, resist: 0,
    accuracy: 80, dodge: 0, strength: 5, precision: 3, magic: 0, spirit: 0,
    role: 'melee',
    movement: 5, reach: 0,
    maxStamina: 5, staminaRegen: 1,
    // TESTING LANE (ruled 2026-08-20): test.* content exists to exercise a
    // mechanic under test, lives beside real rows, and never ships. This one is
    // status.regeneration's battle source until a real regen source publishes.
    // Second Wind: taking damage grants Regeneration 1, self.
    triggers: [{
      id: 'test.warrior.second-wind', hook: 'onTakingDamage', chance: 100,
      select: 'self',
      effect: { kind: 'status.apply', statusId: 'status.regeneration', value: 1 },
      source: 'unit.warrior',
    }, {
      // TESTING LANE — status.stun's battle source until a published stunner
      // lands. Codex-shaped (Shield Slam: "onDamage apply 1 Stun"), diluted to
      // 20% because it rides every damaging hit.
      id: 'test.warrior.stagger', hook: 'onDamage', chance: 20,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.stun', value: 1 },
      source: 'unit.warrior',
    }, {
      // TESTING LANE — test.status.ward's battle source (the PROTECTION-station
      // generalization variant must run live): half of the blows the warrior
      // takes raise a brace worth 1.
      id: 'test.warrior.brace', hook: 'onTakingDamage', chance: 50,
      select: 'self',
      effect: { kind: 'status.apply', statusId: 'test.status.ward', value: 1 },
      source: 'unit.warrior',
    }],
    ai: 'melee-aggressive',
    // Ordered by preference. The AI takes the first it can afford.
    attacks: ['attack.warrior.massive', 'attack.warrior.axe', 'attack.punch'],
    abilities: [],
    // Warrior class: Move + Sidestep (Codex 2026-08-21 — Sidestep to
    // Warrior/Mage/Priest/Paladin; Rogues and Rangers take Side Roll).
    moves: ['power.move', 'power.sidestep'],
    attributes: [],
  },
  ranger: {
    typeId: 'ranger', side: 'hero',
    maxHp: 7, armor: 0, resist: 0,
    accuracy: 90, dodge: 0, strength: 3, precision: 4, magic: 0, spirit: 0,
    role: 'ranged',
    movement: 5, reach: 0,
    maxStamina: 5, staminaRegen: 1,
    // TESTING LANE — status.bleed's battle source, mirroring the published
    // Hunter's Mark shape (Codex: "onHit the target gains 2 Bleed").
    // test.ranger.serrated-arrows RETIRED 2026-08-20 — the first rider
    // retirement: the Sky Pirate's own published Cutlass bleed (in the cohort
    // pack) is status.bleed's battle source now. Pin moved to the cohort's
    // Dusk Hawk; this whole def is an unfielded custom-battle fixture awaiting
    // backlog test.fixture-migration.
    triggers: [],
    ai: 'ranged-kite',
    attacks: ['attack.ranger.bow', 'attack.punch'],
    abilities: [],
    // Ranger class takes Side Roll, not Sidestep (Codex 2026-08-21).
    moves: ['power.move', 'power.side-roll'],
    attributes: [],
  },
  mage: {
    typeId: 'mage', side: 'hero',
    maxHp: 6, armor: 0, resist: 1,
    accuracy: 80, dodge: 0, strength: 2, precision: 4, magic: 2, spirit: 0,
    role: 'ranged',
    movement: 4, reach: 0,
    maxStamina: 5, staminaRegen: 1,
    // TESTING LANE — test.status.enfeeble's battle source (the SOURCE_STATUS
    // generalization variant must run live): 20% of the mage's connected hits
    // sap the target's blows.
    triggers: [{
      id: 'test.mage.dampen', hook: 'onHit', chance: 20,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'test.status.enfeeble', value: 1 },
      source: 'unit.mage',
    }, {
      // TESTING LANE — status.protection's battle source (Codex Earth Shield /
      // Muster shape: a flat 3). onTakingDamage fires AFTER the blow that
      // triggered it, so the ward protects the NEXT hit.
      id: 'test.mage.arcane-ward', hook: 'onTakingDamage', chance: 100,
      select: 'self',
      effect: { kind: 'status.apply', statusId: 'status.protection', value: 3 },
      source: 'unit.mage',
    }],
    ai: 'ranged-kite',
    attacks: ['attack.mage.staff', 'attack.mage.strike'],
    abilities: ['power.mage.bolt'],
    moves: ['power.move', 'power.sidestep'],
    attributes: [],
  },
}

// The kill-switch seam (see disable.ts). With CF_DISABLE_IDS unset these are the
// raw objects, byte for byte — the control baselines cannot tell the difference.
// Generated attack rows (the authored enemies') join the hand-authored ones
// through the same seam. Collisions are loud, same rule as units below.
for (const k of Object.keys(packAttacks())) {
  if (k in RAW_ATTACKS) throw new Error(`attack '${k}' exists in BOTH content/index.ts and the generated pack — one owner only`)
}
export const ATTACKS = omitDisabled({ ...RAW_ATTACKS, ...packAttacks() })
// The authored item powers join the hand-authored abilities through the same
// seam — capability.item-powers (2026-08-27). One owner per id, loudly.
for (const k of Object.keys(packAbilities())) {
  if (k in RAW_ABILITIES) throw new Error(`ability '${k}' exists in BOTH content/index.ts and the generated pack — one owner only`)
}
export const ABILITIES = omitDisabled({ ...RAW_ABILITIES, ...packAbilities() })
// The Critical Injury Chart — ruled data (station.crit 2026-08-27). Not under
// omitDisabled: rows carry keys, not ids; the kill seam for crits is the
// critEnabled switch itself.
export const CRIT_CHART = packCritChart()
// The generated pack (Codex-tracked test cohort) joins the hand-authored rows.
// A collision is a LOUD failure: the pack owns test- ids, this file owns the
// rest, and neither may quietly shadow the other.
const PACK = packUnits()
for (const k of Object.keys(PACK)) {
  if (k in RAW_UNITS) throw new Error(`unit '${k}' exists in BOTH content/index.ts and the generated pack — one owner only`)
}
export const UNITS = stripDisabledTriggers(omitDisabled({ ...RAW_UNITS, ...PACK }, 'unit.'))

/** The standard battle: the Alpha Team on row 15, four zombies on row 0. */
export const FIRST_BATTLE = {
  id: 'baseline.6v4',
  scenarioId: 1,
  // THE STANDARD TEST SIX — Angela 2026-08-20: "Our standard test will run
  // against six heroes, one of each class." Since 2026-09-02 ("Yes, proceed
  // with step one" — DECISIONS.md) those six are the ALPHA TEAM, S31, read
  // from the pack's alphaTeam section with their authored kits: Oathblade
  // (warrior), Sky Pirate (rogue), Dusk Hawk (ranger), Air Mage (mage), Lucius
  // (priest), Osric (paladin). The test-* clones they replace stay in the pack
  // for fixtures and probes only; every control baseline and sweep now runs on
  // real content.
  heroes: ['alpha-oathblade', 'alpha-sky-pirate', 'alpha-dusk-hawk',
    'alpha-air-mage', 'alpha-lucius', 'alpha-osric'] as const,
  // The horde is the pack's test enemies now — the same rows, Codex-sourced,
  // one burning zombie per four as ever. The hand-typed zombie defs below
  // survive only as custom-battle fixtures until the test-file migration
  // chore retires them (backlog test.fixture-migration).
  enemies: ['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie-burning'] as const,
  defaultEnemyCount: 4,
  // Row 15 is the player edge, row 0 the enemy edge — ruled 2026-08-25 with the
  // 16x16 board, and stated the same way in content/gen/encounters.json's
  // format.placement. Was 11 when the board was 12 deep.
  heroRow: 15,
  enemyRow: 0,
}

/**
 * The TEST COHORT — the six Codex clones with test-lane weapons and riders
 * that were the standard party from 2026-08-20 until the Alpha Team took the
 * standard battle (content.alpha-flip, 2026-09-02). Still in the pack, still
 * probeable: a test that exercises a test-lane source (test.mage.dampen,
 * test.status.ward…) fields these explicitly through BattleOptions.heroes.
 * Nothing in the engine reads this list; it exists so no test types the six
 * ids by hand.
 */
export const TEST_COHORT = {
  heroes: ['test-oathblade', 'test-sky-pirate', 'test-dusk-hawk',
    'test-air-mage', 'test-lucius', 'test-osric'] as const,
}
