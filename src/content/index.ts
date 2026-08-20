// Content for the first battle. Data, not code (Design Law 9).
// Registries are explicit arrays — never decorators, never import side-effects,
// because load order would become a hidden global that shifts tie-breaks between runs.

import type { AbilityDef, AttackDef, UnitDef } from '../core/types.js'
import { omitDisabled, stripDisabledTriggers } from './disable.js'

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
  'attack.punch': {
    // PROVISIONAL — no published source
    id: 'attack.punch', name: 'Punch', kind: 'melee',
    damageType: 'physical', bonus: -1, stat: 'strength', reach: 1, staminaCost: 0,
  },
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
    // PUBLISHED: 6-BESTIARY-SETTLED § attack.* (2026-08-20); Codex §5 Fangs:
    // "Bite | melee | strength | +2 | physical | reach 1 | Crit +5 | Stam 1".
    // Crit +5 dropped (no AttackDef field, crits disabled). Stam 1 is the
    // HERO-side cost; enemies do not run stamina — SWITCHES.md brawlStaminaCost.
    id: 'attack.fangs.bite', name: 'Bite', kind: 'melee',
    damageType: 'physical', bonus: 2, stat: 'strength', reach: 1, staminaCost: 0,
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
    attributes: ['undead'],
  },
  'spirit-snake': {
    // PUBLISHED: 6-BESTIARY-SETTLED § unit.* (2026-08-20); Codex §10:
    // "Spirit Snake | Beast | str 1 | prec 1 | armor 1 | health 2 | reach 1".
    // Accuracy has no Beast baseline in the Codex derivation — SWITCHES.md
    // beastAccuracy, default 70. Movement: "enemies 4" (Codex §13).
    typeId: 'spirit-snake', side: 'enemy',
    maxHp: 2, armor: 1, resist: 0,
    accuracy: 70, dodge: 0, strength: 1, precision: 1, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 1,
    maxStamina: 0, staminaRegen: 0,   // enemies do not run stamina
    triggers: [{
      // Codex §3 Serpent: "onHit your fang attacks apply 2 Poison." The snake's
      // only attack IS a fang attack, so unconditional onHit is behaviourally
      // identical — the engine has no attack-form trigger condition yet.
      id: 'trigger.spirit-snake.venom', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 2 },
      source: 'unit.spirit-snake',
    }],
    ai: 'dumb-melee',
    attacks: ['attack.fangs.bite'],
    abilities: [],
    attributes: ['beast'],
  },
  'shadow-hound-puppy': {
    // PUBLISHED: 6-BESTIARY-SETTLED § unit.* (2026-08-20); Codex §10:
    // "Shadow Hound Puppy | Beast | str 6 | prec 2 | armor 0 | health 12 |
    // reach 1". Toughness 1 dropped — no field. Accuracy: SWITCHES.md
    // beastAccuracy. The hound that is still coming: melee-aggressive hunts
    // the weakest reachable target, and its worrying fangs bleed.
    typeId: 'shadow-hound-puppy', side: 'enemy',
    maxHp: 12, armor: 0, resist: 0,
    accuracy: 70, dodge: 0, strength: 6, precision: 2, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 1,
    maxStamina: 0, staminaRegen: 0,   // enemies do not run stamina
    triggers: [{
      // Codex §3 Hound: "onHit your fang attacks apply 1 Bleed." Named for the
      // Hound power "Worry the Wound". Unconditional onHit — the bite is its
      // only attack. Lands only after status.bleed (landed 849ead6).
      id: 'trigger.shadow-hound-puppy.worry', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.bleed', value: 1 },
      source: 'unit.shadow-hound-puppy',
    }],
    ai: 'melee-aggressive',
    attacks: ['attack.fangs.bite'],
    abilities: [],
    attributes: ['beast'],
  },
  'green-drake': {
    // PUBLISHED: 6-BESTIARY-SETTLED § unit.* (2026-08-20); Codex §10:
    // "Green Drake | Beast | str 5 | prec 4 | armor 1 | health 12 | reach 2 |
    // resist 1". Toughness 1 dropped — no field; enemies take no injuries.
    // Accuracy: SWITCHES.md beastAccuracy. Role melee + ai dumb-melee is
    // load-bearing: ranged-kite gates repositioning on stamina, and a
    // 0-stamina enemy would idle at spawn forever — the drake plays as a
    // closer that hisses point-blank (adjacent-ranged landed 2026-08-15).
    typeId: 'green-drake', side: 'enemy',
    maxHp: 12, armor: 1, resist: 1,
    accuracy: 70, dodge: 0, strength: 5, precision: 4, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 2,
    maxStamina: 0, staminaRegen: 0,   // enemies do not run stamina
    triggers: [{
      // Codex §5 Breath/Hiss rider: "onHit apply 2 Poison." Attack-scoped in
      // the Codex; unit-scoped here — identical while Hiss is its only attack.
      id: 'trigger.green-drake.venom-breath', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 2 },
      source: 'unit.green-drake',
    }],
    ai: 'dumb-melee',
    attacks: ['attack.breath.hiss'],
    abilities: [],
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
    triggers: [{
      id: 'test.ranger.serrated-arrows', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.bleed', value: 2 },
      source: 'unit.ranger',
    }, {
      // TESTING LANE — test.status.hobble's battle source (the reducesMovement
      // generalization variant must run live).
      id: 'test.ranger.pin', hook: 'onHit', chance: 20,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'test.status.hobble', value: 1 },
      source: 'unit.ranger',
    }],
    ai: 'ranged-kite',
    attacks: ['attack.ranger.bow', 'attack.punch'],
    abilities: [],
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
    attributes: [],
  },
}

// The kill-switch seam (see disable.ts). With CF_DISABLE_IDS unset these are the
// raw objects, byte for byte — the control baselines cannot tell the difference.
export const ATTACKS = omitDisabled(RAW_ATTACKS)
export const ABILITIES = omitDisabled(RAW_ABILITIES)
export const UNITS = stripDisabledTriggers(omitDisabled(RAW_UNITS, 'unit.'))

/** The first battle: 4 zombies on row 0, 2 warriors + 2 rangers on row 11. */
export const FIRST_BATTLE = {
  id: 'baseline.4v4',
  scenarioId: 1,
  heroes: ['warrior', 'warrior', 'ranger', 'mage'] as const,
  // One burning zombie per four — the horde's texture, cycled by setup when
  // enemyCount exceeds the roster length. The Beast pen (2026-08-20) extends
  // the CYCLE, not the default battle: defaultEnemyCount pins the canonical
  // battle at 4 (the original composition, byte-for-byte), the one-per-four
  // burning cadence holds (slots 4 and 8), and the beasts appear from the
  // sixth enemy on.
  enemies: ['zombie', 'zombie', 'zombie', 'zombie-burning',
    'zombie', 'spirit-snake', 'zombie', 'zombie-burning',
    'zombie', 'green-drake', 'shadow-hound-puppy', 'zombie-burning'] as const,
  defaultEnemyCount: 4,
  heroRow: 11,
  enemyRow: 0,
}
