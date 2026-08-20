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
    }],
    ai: 'dumb-melee',
    attacks: ['attack.zombie.basic'],
    abilities: [],
    attributes: ['undead'],
  },
  warrior: {
    typeId: 'warrior', side: 'hero',
    maxHp: 10, armor: 1, resist: 0,
    accuracy: 80, dodge: 0, strength: 5, precision: 3, magic: 0, spirit: 0,
    role: 'melee',
    movement: 5, reach: 0,
    maxStamina: 5, staminaRegen: 1,
    // PROVISIONAL scaffolding source for status.regeneration (the status is
    // published; this trigger id is not — it exists so the status appears in a
    // real battle, and is REPLACED when a content session publishes a real
    // regen source). Second Wind: taking damage grants Regeneration 1, self.
    triggers: [{
      id: 'trigger.warrior.second-wind', hook: 'onTakingDamage', chance: 100,
      select: 'self',
      effect: { kind: 'status.apply', statusId: 'status.regeneration', value: 1 },
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
  enemies: ['zombie', 'zombie', 'zombie', 'zombie'] as const,
  heroRow: 11,
  enemyRow: 0,
}
