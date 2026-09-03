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

// ── HERO PROGRESS (hero assembly, 2026-09-03) ────────────────────────────────
// Level grants, the specialty's modifiers and the level-5 pick fold onto the
// bare row additively — the same arithmetic progression/build-schedule.mjs
// does, moved to fielding so the engine assembles the hero itself (Angela,
// 2026-09-03: "so we know that the way that we're getting things into the
// units is still correct"). Drafted powers join the row's abilities. Loud on
// anything unknown: a level past the table, a specialty of another class, a
// pick that is not one of the options, a power that is not in the registry.

export type LevelTableLike = { readonly id: string; readonly rows: readonly { readonly level: number; readonly grants: Readonly<Record<string, number>>; readonly choice?: readonly Readonly<Record<string, number>>[] }[] }
export type SpecialtyLike = { readonly id: string; readonly class: string; readonly statModifiers: Readonly<Record<string, number>> }

export function applyProgress(
  base: UnitDef,
  progress: import('./types.js').HeroProgress,
  classId: string,
  levels: Readonly<Record<string, LevelTableLike>>,
  specialties: Readonly<Record<string, SpecialtyLike>>,
  abilities: Readonly<Record<string, unknown>>,
  where: string,
): UnitDef {
  const table = levels[classId]
  if (!table) throw new Error(`${where}: ${base.typeId} is a ${classId}, which has no level table`)
  const stats: Record<string, number> = {}
  for (const k of FOLDABLE) stats[k] = (base as unknown as Record<string, number | undefined>)[k] ?? 0
  const add = (k: string, v: number, src: string) => {
    if (!(FOLDABLE as readonly string[]).includes(k)) {
      // itemSlots and surge are campaign quantities the engine does not fold; anything else is an error
      if (k === 'itemSlots' || k === 'surge') return
      throw new Error(`${where}: ${src} grants '${k}', which the engine cannot fold`)
    }
    stats[k] = (stats[k] ?? 0) + v
  }
  if (!Number.isInteger(progress.level) || progress.level < 1) throw new Error(`${where}: ${base.typeId} level ${progress.level} is not a level`)
  const maxLevel = table.rows.reduce((m, r) => Math.max(m, r.level), 1)
  if (progress.level > maxLevel) throw new Error(`${where}: ${base.typeId} level ${progress.level} is past ${classId}'s table (${maxLevel})`)
  let pickTaken = false
  for (const row of table.rows) {
    if (row.level < 2 || row.level > progress.level) continue
    for (const [k, v] of Object.entries(row.grants)) add(k, v, `${classId} level ${row.level}`)
    if (row.choice) {
      const pick = progress.levelFivePick
      if (!pick) throw new Error(`${where}: ${base.typeId} is level ${progress.level} but names no level-${row.level} pick`)
      const same = (a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) =>
        Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v)
      if (!row.choice.some((o) => same(o, pick))) throw new Error(`${where}: ${base.typeId}'s level-${row.level} pick ${JSON.stringify(pick)} is not one of ${classId}'s options`)
      for (const [k, v] of Object.entries(pick)) add(k, v, `level-${row.level} pick`)
      pickTaken = true
    }
  }
  if (progress.levelFivePick && !pickTaken) throw new Error(`${where}: ${base.typeId} names a level-5 pick at level ${progress.level}`)
  if (progress.level >= 2) {
    if (!progress.specialtyId) throw new Error(`${where}: ${base.typeId} is level ${progress.level} and has no specialty — it is chosen at the first level-up`)
    const sp = specialties[progress.specialtyId]
    if (!sp) throw new Error(`${where}: ${base.typeId} names specialty '${progress.specialtyId}', which is not in the registry`)
    if (sp.class !== classId) throw new Error(`${where}: ${base.typeId} (${classId}) cannot hold ${sp.id}, a ${sp.class} specialty`)
    for (const [k, v] of Object.entries(sp.statModifiers)) add(k, v, sp.id)
  } else if (progress.specialtyId) throw new Error(`${where}: ${base.typeId} is level 1 and names a specialty`)
  const powers = [...(progress.powers ?? [])]
  for (const p of powers) if (!abilities[p]) throw new Error(`${where}: ${base.typeId} drafted '${p}', which is not a power in the registry`)
  return {
    ...base,
    maxHp: stats['maxHp']!, armor: stats['armor']!, resist: stats['resist']!, dodge: stats['dodge']!,
    strength: stats['strength']!, precision: stats['precision']!, magic: stats['magic']!, spirit: stats['spirit']!,
    reach: stats['reach']!, accuracy: stats['accuracy']!, movement: stats['movement']!,
    maxStamina: stats['maxStamina']!, staminaRegen: stats['staminaRegen']!,
    ...(stats['crit'] ? { crit: stats['crit'] } : {}), ...(stats['luck'] ? { luck: stats['luck'] } : {}),
    abilities: [...base.abilities, ...powers.filter((p) => !base.abilities.includes(p))],
  }
}
