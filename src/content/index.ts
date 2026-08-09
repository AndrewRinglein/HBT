// Content for the first battle. Data, not code (Design Law 9).
// Registries are explicit arrays — never decorators, never import side-effects,
// because load order would become a hidden global that shifts tie-breaks between runs.

import type { AbilityDef, AttackDef, UnitDef } from '../core/types.js'

export const ATTACKS: Readonly<Record<string, AttackDef>> = {
  'attack.zombie.basic': {
    id: 'attack.zombie.basic', name: 'Rotting Bite', kind: 'melee',
    damageType: 'physical', bonus: 0, stat: 'strength', reach: 1, staminaCost: 0,
    // Poison needed a source. Declared as a baseline change in the backlog.
    applies: { statusId: 'status.poison', value: 2 },
  },
  'attack.warrior.axe': {
    id: 'attack.warrior.axe', name: 'Axe', kind: 'melee',
    damageType: 'physical', bonus: 1, stat: 'strength', reach: 1, staminaCost: 1,
  },
  'attack.warrior.massive': {
    id: 'attack.warrior.massive', name: 'Massive Strike', kind: 'melee',
    damageType: 'physical', bonus: 3, stat: 'strength', reach: 1, staminaCost: 2,
  },
  'attack.ranger.bow': {
    id: 'attack.ranger.bow', name: 'Bow', kind: 'ranged',
    damageType: 'physical', bonus: 1, stat: 'precision', reach: 6, staminaCost: 1,
  },
  'attack.mage.staff': {
    id: 'attack.mage.staff', name: 'Staff (bolt)', kind: 'ranged',
    damageType: 'magic', bonus: 0, stat: 'precision', reach: 6, staminaCost: 1,
    applies: { statusId: 'status.burn', value: 2 },
  },
  'attack.mage.strike': {
    id: 'attack.mage.strike', name: 'Staff (strike)', kind: 'melee',
    damageType: 'physical', bonus: 0, stat: 'strength', reach: 1, staminaCost: 1,
  },
  'attack.punch': {
    id: 'attack.punch', name: 'Punch', kind: 'melee',
    damageType: 'physical', bonus: -1, stat: 'strength', reach: 1, staminaCost: 0,
  },
}

export const ABILITIES: Readonly<Record<string, AbilityDef>> = {
  'power.mage.bolt': {
    id: 'power.mage.bolt', name: 'Arcane Bolt',
    stat: 'magic', bonus: 6, damageType: 'magic',
    range: 10, staminaCost: 1, cooldown: 6,
  },
}

export const UNITS: Readonly<Record<string, UnitDef>> = {
  zombie: {
    typeId: 'zombie', side: 'enemy',
    maxHp: 10, armor: 0, resist: 0,
    accuracy: 65, strength: 4, precision: 0, magic: 0,
    role: 'melee',
    movement: 4, reach: 0,
    maxStamina: 0, staminaRegen: 0,   // enemies do not run stamina
    ai: 'dumb-melee',
    attacks: ['attack.zombie.basic'],
    abilities: [],
    attributes: ['undead'],
  },
  warrior: {
    typeId: 'warrior', side: 'hero',
    maxHp: 10, armor: 1, resist: 0,
    accuracy: 80, strength: 5, precision: 3, magic: 0,
    role: 'melee',
    movement: 5, reach: 0,
    maxStamina: 5, staminaRegen: 1,
    ai: 'melee-aggressive',
    // Ordered by preference. The AI takes the first it can afford.
    attacks: ['attack.warrior.massive', 'attack.warrior.axe', 'attack.punch'],
    abilities: [],
    attributes: [],
  },
  ranger: {
    typeId: 'ranger', side: 'hero',
    maxHp: 7, armor: 0, resist: 0,
    accuracy: 90, strength: 3, precision: 4, magic: 0,
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
    accuracy: 80, strength: 2, precision: 4, magic: 2,
    role: 'ranged',
    movement: 4, reach: 0,
    maxStamina: 5, staminaRegen: 1,
    ai: 'ranged-kite',
    attacks: ['attack.mage.staff', 'attack.mage.strike'],
    abilities: ['power.mage.bolt'],
    attributes: [],
  },
}

/** The first battle: 4 zombies on row 0, 2 warriors + 2 rangers on row 11. */
export const FIRST_BATTLE = {
  id: 'baseline.4v4',
  scenarioId: 1,
  heroes: ['warrior', 'warrior', 'ranger', 'mage'] as const,
  enemies: ['zombie', 'zombie', 'zombie', 'zombie'] as const,
  heroRow: 11,
  enemyRow: 0,
}
