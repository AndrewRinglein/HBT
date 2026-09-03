// Items at fielding — seam.items-per-unit (2026-09-02, ITEMS-PLAN.md §5).
//
// Ruled 2026-09-02 (Andrew): "the items should go into battle … They define
// what attacks they have. They modify stats." A hero row is BARE — the Codex
// body, Punch and its own riders — and the items a fielding hands it (or its
// Codex default kit) are applied HERE, once, by one function, before the unit
// is made. The kingdom's Equip screen will read the same function so the
// preview and the battle cannot disagree.
//
// Order is explicit (Law 6): attacks are the items' grants in item order,
// then the row's own; powers the same; triggers the row's own, then the
// items'. Stats fold additively — the arithmetic the converter did at pack
// time, moved to fielding so the numbers follow what is actually worn.
// Refusals are loud (Law 9): an unknown item, more than two hands of weapons,
// more than one armor. Slot counts, class restrictions and per-class caps are
// the kingdom's legality, not the engine's (GAME-ARCHITECTURE §2.3).
import type { ItemDef, UnitDef } from './types.js'
import type { AttackDef } from './types.js'

export type Applied = {
  readonly def: UnitDef
  /** Per item, what it put on the unit — for the unit.equipped events. */
  readonly worn: readonly { readonly itemId: string; readonly grants: readonly string[]; readonly abilities: readonly string[]; readonly mods: Readonly<Record<string, number>>; readonly gaps?: readonly string[] }[]
}

const FOLDABLE = ['maxHp', 'armor', 'resist', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen', 'crit', 'luck'] as const

export function applyItems(
  base: UnitDef,
  itemIds: readonly string[],
  items: Readonly<Record<string, ItemDef>>,
  attacks: Readonly<Record<string, AttackDef>>,
  where: string,
): Applied {
  let hands = 0, armors = 0
  const grants: string[] = []
  const abilities: string[] = []
  const triggers = [...(base.triggers ?? [])]
  const stats: Record<string, number> = {}
  for (const k of FOLDABLE) stats[k] = (base as unknown as Record<string, number | undefined>)[k] ?? 0
  const worn: Applied['worn'][number][] = []
  const seen = new Set<string>()
  for (const id of itemIds) {
    const it = items[id]
    if (!it) throw new Error(`${where}: ${base.typeId} is handed '${id}', which is not an item in the registry`)
    if (seen.has(id)) throw new Error(`${where}: ${base.typeId} is handed '${id}' twice`)
    seen.add(id)
    if (it.itemClass === 'weapon') { hands += it.hands; if (hands > 2) throw new Error(`${where}: ${base.typeId} would wield more than two hands of weapons (${[...seen].join(', ')})`) }
    if (it.itemClass === 'armor') { armors += 1; if (armors > 1) throw new Error(`${where}: ${base.typeId} would wear two armors`) }
    const mods: Record<string, number> = {}
    for (const [k, v] of Object.entries(it.statModifiers)) {
      if (typeof v !== 'number' || !(FOLDABLE as readonly string[]).includes(k)) throw new Error(`${where}: item '${id}' modifies '${k}', which the engine cannot fold`)
      stats[k] = (stats[k] ?? 0) + v
      mods[k] = v
    }
    for (const a of it.grants) {
      if (!attacks[a]) throw new Error(`${where}: item '${id}' grants '${a}', which is not an attack`)
      if (!grants.includes(a)) grants.push(a)
    }
    for (const a of it.abilities) if (!abilities.includes(a)) abilities.push(a)
    triggers.push(...it.triggers)
    worn.push({ itemId: id, grants: [...it.grants], abilities: [...it.abilities], mods, ...(it.gaps ? { gaps: it.gaps } : {}) })
  }
  const attackIds = [...grants, ...base.attacks.filter((a) => !grants.includes(a))]
  const anyRanged = attackIds.some((a) => attacks[a]?.kind === 'ranged')
  const def: UnitDef = {
    ...base,
    maxHp: stats['maxHp']!, armor: stats['armor']!, resist: stats['resist']!, dodge: stats['dodge']!,
    strength: stats['strength']!, precision: stats['precision']!, magic: stats['magic']!, spirit: stats['spirit']!,
    reach: stats['reach']!, accuracy: stats['accuracy']!, movement: stats['movement']!,
    maxStamina: stats['maxStamina']!, staminaRegen: stats['staminaRegen']!,
    ...(stats['crit'] ? { crit: stats['crit'] } : {}), ...(stats['luck'] ? { luck: stats['luck'] } : {}),
    attacks: attackIds,
    abilities: [...abilities, ...base.abilities.filter((a) => !abilities.includes(a))],
    triggers,
    // role follows the kit; ai follows the kit unless the row authored one
    role: itemIds.length || base.defaultItems ? (anyRanged ? 'ranged' : 'melee') : base.role,
    ai: base.aiAuthored ? base.ai : (itemIds.length || base.defaultItems ? (anyRanged ? 'ranged-kite' : 'melee-aggressive') : base.ai),
  }
  return { def, worn }
}
