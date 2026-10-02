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
// Refusals are loud (Law 9): an unknown item, more than two hands of weapons and shields,
// more than one armor. The same row twice is two instances (v2.loadout, 2026-09-24). Slot counts, class restrictions and per-class caps are
// the kingdom's legality, not the engine's (GAME-ARCHITECTURE §2.3).
import type { BadgeDef, ItemDef, UnitDef } from './types.js'
import type { ActionDef } from './types.js'

export type Applied = {
  readonly def: UnitDef
  /** Per item, what it put on the unit — for the unit.equipped events. */
  readonly worn: readonly { readonly itemId: string; readonly grants: readonly string[]; readonly abilities: readonly string[]; readonly mods: Readonly<Record<string, number>>; readonly gaps?: readonly string[] }[]
}

/** v2.swap: a foldable stat whose absent value is not 0. */
export const FOLD_BASE: Readonly<Record<string, number>> = { swapCost: 1 }

export const FOLDABLE = ['maxHp', 'armor', 'resist', 'fireResist', 'poisonResist', 'shadowResist', 'coldResist', 'block', 'rangedBlock', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen', 'crit', 'luck', 'toughness', 'surge', 'vision', 'thorns', 'swapCost', 'bleedOutTurns', 'deathbedFighting'] as const   // swapCost: v2.swap, 2026-09-24 — its unfolded value is 1, not 0 (FOLD_BASE)   // toughness: capability.deathbed; surge: capability.surge — 2026-09-03   // bleedOutTurns, deathbedFighting: fix.codex-numbers, 2026-10-01 (review finding C9)

/** The value a foldable stat holds when nothing has folded onto it — 0, or FOLD_BASE's (swapCost 1). */
export function unfoldedOf(k: string): number {
  return FOLD_BASE[k] ?? 0
}

/** The stats every fold writes and every unit carries — never absent on a def. */
const ALWAYS: readonly string[] = ['maxHp', 'armor', 'resist', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen']

/**
 * fix.one-hero-assembly (review E12): THE fold — items, progress and badges each add their
 * modifiers here, never by a copy of their own. `delta` is per FOLDABLE stat; anything else
 * is refused (Law 9). An optional stat the row did not author stays absent while it holds its
 * unfolded value (a bare body's snapshot is unchanged); one the row did author is always written.
 */
export function foldStats(base: UnitDef, delta: Readonly<Record<string, number>>, where: string): UnitDef {
  const rec = base as unknown as Record<string, number | undefined>
  const out: Record<string, number> = {}
  for (const k of Object.keys(delta)) if (!(FOLDABLE as readonly string[]).includes(k)) throw new Error(`${where}: '${k}' is not a stat the engine can fold`)
  for (const k of FOLDABLE) {
    const v = (rec[k] ?? unfoldedOf(k)) + (delta[k] ?? 0)
    if (ALWAYS.includes(k) || rec[k] !== undefined || v !== unfoldedOf(k)) out[k] = v
  }
  return { ...base, ...out } as UnitDef
}

/** v2.loadout: the item classes held in hands (V2 §11.1). Everything else works from its own slot. */
export const HELD_CLASSES: readonly string[] = ['weapon', 'shield']

/** The hands a weapon or shield takes; a worn item takes none (fix.one-hero-assembly, review E13). */
export function handsOf(item: ItemDef): number {
  return HELD_CLASSES.includes(item.itemClass) ? item.hands : 0
}

/** Two hands — the most weapons and shields a unit holds (COMBAT-V2 §11.1). */
export const HANDS = 2

/**
 * What of a carried list goes into the hands and what is stowed — kingdom.reads-engine (review finding K4: the
 * kingdom counted hands its own way). In list order a weapon or shield takes its hands (handsOf) while they last;
 * one past the hands is stowed, granting nothing until swapped in (COMBAT-V2 §11.1); every other item works from
 * its own slot and is handed. `order` numbers the instances as a fielding does — the handed, then the stowed
 * (loadoutOf's `<uid>/<n>`) — each as its index in `ids`. Pure; loud on an unknown id (Law 9).
 */
export function splitHandsOf(ids: readonly string[], items: Readonly<Record<string, ItemDef>>): { handed: string[]; stowed: string[]; order: number[] } {
  const handed: number[] = [], stowed: number[] = []
  let hands = 0
  ids.forEach((id, k) => {
    const it = items[id]
    if (!it) throw new Error(`splitHandsOf: '${id}' is not an item in the registry`)
    const h = handsOf(it)
    if (HELD_CLASSES.includes(it.itemClass)) {
      if (hands + h > HANDS) { stowed.push(k); return }
      hands += h
    }
    handed.push(k)
  })
  return { handed: handed.map((k) => ids[k]!), stowed: stowed.map((k) => ids[k]!), order: [...handed, ...stowed] }
}


/**
 * The default AI of a kit — the ONE place it is derived (plumbing.vocabulary-export, review
 * finding C16: the converter derived it three more times). A kit with any ranged attack kites;
 * the rest close. A row that authors its ai keeps it (aiAuthored); the pack loader fills a hero
 * row that names none from this (content/index.ts).
 */
export function defaultAiOf(attackIds: readonly string[], attacks: Readonly<Record<string, ActionDef>>): string {
  return attackIds.some((a) => attacks[a]?.attack?.kind === 'ranged') ? 'ranged-kite' : 'melee-aggressive'
}

export function applyItems(
  base: UnitDef,
  itemIds: readonly string[],
  items: Readonly<Record<string, ItemDef>>,
  attacks: Readonly<Record<string, ActionDef>>,
  where: string,
): Applied {
  let hands = 0, armors = 0
  const grants: string[] = []
  const abilities: string[] = []
  const triggers = [...(base.triggers ?? [])]
  const delta: Record<string, number> = {}
  const worn: Applied['worn'][number][] = []
  const seen = new Set<string>()
  for (const id of itemIds) {
    const it = items[id]
    if (!it) throw new Error(`${where}: ${base.typeId} is handed '${id}', which is not an item in the registry`)
    // v2.loadout (V2 §6.1 "Two longswords is 10"): the same row handed twice is two
    // instances, not an error; the hand and armor limits below still refuse too many.
    seen.add(id)
    // fix.class-restriction (2026-09-04, session 9's E5b): the row's restriction
    // is read by the fielding — ruled 2026-09-03 (the Proving): "Items only on
    // classes that can wield them." A class is a `class.*` tag on the unit row.
    // Nothing in src/core read `classRestriction` before this; a warrior fielded
    // with a fire staff and nothing refused.
    if (it.classRestriction && !(base.tags ?? []).includes(it.classRestriction)) {
      const has = (base.tags ?? []).filter((t) => t.startsWith('class.'))
      throw new Error(`${where}: ${base.typeId} (${has.join(', ') || 'no class'}) cannot wield '${id}', a ${it.classRestriction} item`)
    }
    // plumbing.shield-class (V2 R1, 2026-09-23): a shield is held, and shares the
    // two hands with weapons. Folding its Block and granting its powers only here,
    // for what is handed to the unit, is what keeps a stowed shield inert.
    hands += handsOf(it)
    if (hands > HANDS) throw new Error(`${where}: ${base.typeId} would hold more than two hands of weapons and shields (${itemIds.join(', ')})`)
    if (it.itemClass === 'armor') { armors += 1; if (armors > 1) throw new Error(`${where}: ${base.typeId} would wear two armors`) }
    const mods: Record<string, number> = {}
    for (const [k, v] of Object.entries(it.statModifiers)) {
      if (typeof v !== 'number' || !(FOLDABLE as readonly string[]).includes(k)) throw new Error(`${where}: item '${id}' modifies '${k}', which the engine cannot fold`)
      if ((k === 'block' || k === 'rangedBlock') && !Number.isSafeInteger(v)) throw Error(`${where}: item '${id}' has invalid ${k}`)
      delta[k] = (delta[k] ?? 0) + v
      mods[k] = v
    }
    for (const a of it.grants) {
      if (!attacks[a]) throw new Error(`${where}: item '${id}' grants '${a}', which is not a weapon action`)
      if (!grants.includes(a)) grants.push(a)
    }
    for (const a of it.abilities) if (!abilities.includes(a)) abilities.push(a)
    triggers.push(...it.triggers)
    worn.push({ itemId: id, grants: [...it.grants], abilities: [...it.abilities], mods, ...(it.gaps ? { gaps: it.gaps } : {}) })
  }
  const attackIds = [...grants, ...base.attacks.filter((a) => !grants.includes(a))]
  const anyRanged = attackIds.some((a) => attacks[a]?.attack?.kind === 'ranged')
  const def: UnitDef = {
    ...foldStats(base, delta, `${where}: ${base.typeId}'s items`),
    attacks: attackIds,
    abilities: [...abilities, ...base.abilities.filter((a) => !abilities.includes(a))],
    triggers,
    // role follows the kit; ai follows the kit unless the row authored one
    role: itemIds.length || base.defaultItems ? (anyRanged ? 'ranged' : 'melee') : base.role,
    ai: base.aiAuthored ? base.ai : (itemIds.length || base.defaultItems ? defaultAiOf(attackIds, attacks) : base.ai),
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

/**
 * The level a specialty is chosen at — the first level-up, 1 → 2, on every table (Codex levels.rules.specialty:
 * "The specialty is chosen at the FIRST level-up — reaching level 2 — for every class"). A hero at or past it holds
 * one. One number, read by applyProgress and by the kingdom's level-up screen (kingdom.reads-engine, review K15).
 */
export const SPECIALTY_LEVEL = 2

export type LevelTableLike = { readonly id: string; readonly rows: readonly { readonly level: number; readonly grants: Readonly<Record<string, number>>; readonly choice?: readonly Readonly<Record<string, number>>[] }[] }
export type SpecialtyLike = { readonly id: string; readonly class: string; readonly statModifiers: Readonly<Record<string, number>> }

export function applyProgress(
  base: UnitDef,
  progress: import('./types.js').HeroProgress,
  classId: string,
  levels: Readonly<Record<string, LevelTableLike>>,
  specialties: Readonly<Record<string, SpecialtyLike>>,
  abilities: Readonly<Record<string, ActionDef>>,
  where: string,
  /** progression.level-table-by-type: the table to level on when it is not the class's (civilian.farmer). */
  tableId: string = classId,
): UnitDef {
  const table = levels[tableId]
  if (!table) throw new Error(`${where}: ${base.typeId} levels on '${tableId}', and the pack has no such level table`)
  const delta: Record<string, number> = {}
  const add = (k: string, v: number, src: string) => {
    if (!(FOLDABLE as readonly string[]).includes(k)) {
      // itemSlots and surge are campaign quantities the engine does not fold; anything else is an error
      if (k === 'itemSlots') return
      throw new Error(`${where}: ${src} grants '${k}', which the engine cannot fold`)
    }
    delta[k] = (delta[k] ?? 0) + v
  }
  if (!Number.isInteger(progress.level) || progress.level < 1) throw new Error(`${where}: ${base.typeId} level ${progress.level} is not a level`)
  const maxLevel = table.rows.reduce((m, r) => Math.max(m, r.level), 1)
  if (progress.level > maxLevel) throw new Error(`${where}: ${base.typeId} level ${progress.level} is past ${tableId}'s table (${maxLevel})`)
  let pickTaken = false
  for (const row of table.rows) {
    if (row.level < 2 || row.level > progress.level) continue
    for (const [k, v] of Object.entries(row.grants)) add(k, v, `${tableId} level ${row.level}`)
    if (row.choice) {
      const pick = progress.levelFivePick
      if (!pick) throw new Error(`${where}: ${base.typeId} is level ${progress.level} but names no level-${row.level} pick`)
      const same = (a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) =>
        Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v)
      if (!row.choice.some((o) => same(o, pick))) throw new Error(`${where}: ${base.typeId}'s level-${row.level} pick ${JSON.stringify(pick)} is not one of ${tableId}'s options`)
      for (const [k, v] of Object.entries(pick)) add(k, v, `level-${row.level} pick`)
      pickTaken = true
    }
  }
  if (progress.levelFivePick && !pickTaken) throw new Error(`${where}: ${base.typeId} names a level-5 pick at level ${progress.level}`)
  if (progress.level >= SPECIALTY_LEVEL) {
    if (!progress.specialtyId) throw new Error(`${where}: ${base.typeId} is level ${progress.level} and has no specialty — it is chosen at the first level-up`)
    const sp = specialties[progress.specialtyId]
    if (!sp) throw new Error(`${where}: ${base.typeId} names specialty '${progress.specialtyId}', which is not in the registry`)
    if (sp.class !== classId) throw new Error(`${where}: ${base.typeId} (${classId}) cannot hold ${sp.id}, a ${sp.class} specialty`)
    for (const [k, v] of Object.entries(sp.statModifiers)) add(k, v, sp.id)
  } else if (progress.specialtyId) throw new Error(`${where}: ${base.typeId} is level 1 and names a specialty`)
  // capability.surge: "Surge always EQUALS the character level" (heroes.json rules) — added to whatever the row and the specialty grant
  delta['surge'] = (delta['surge'] ?? 0) + progress.level
  const powers = [...(progress.powers ?? [])]
  for (const p of powers) if (!abilities[p] || abilities[p].attack || abilities[p].move) throw new Error(`${where}: ${base.typeId} drafted '${p}', which is not a power in the registry`)
  return {
    ...foldStats(base, delta, `${where}: ${base.typeId}'s progress`),
    abilities: [...base.abilities, ...powers.filter((p) => !base.abilities.includes(p))],
  }
}

// ── BADGES AT FIELDING (badge.mechanism, 2026-09-04) ─────────────────────────
// A badge folds onto the row the way an item does — stat modifiers added,
// granted actions joined, riders attached — with no hands, slots or armour to
// count. Applied AFTER items, so a badge sees the kitted hero. Loud on an
// unknown id (Law 9): a badge the registry lacks is indistinguishable from
// one never authored, and the kill-switch seam relies on exactly that.

export type Badged = {
  readonly def: UnitDef
  /** Per badge, what it put on the unit — for the unit.badged events. */
  readonly worn: readonly { readonly badgeId: string; readonly grants: readonly string[]; readonly mods: Readonly<Record<string, number>>; readonly gaps?: readonly string[] }[]
}

export function applyBadges(
  base: UnitDef,
  badgeIds: readonly string[],
  badges: Readonly<Record<string, BadgeDef>>,
  where: string,
): Badged {
  const delta: Record<string, number> = {}
  const attacks = [...base.attacks]
  const abilities = [...base.abilities]
  const triggers = [...(base.triggers ?? [])]
  const worn: Badged['worn'][number][] = []
  const seen = new Set<string>()
  for (const id of badgeIds) {
    const b = badges[id]
    if (!b) throw new Error(`${where}: ${base.typeId} carries '${id}', which is not a badge in the registry`)
    if (seen.has(id)) continue   // a badge is a fact about the unit; twice is once
    seen.add(id)
    const mods: Record<string, number> = {}
    for (const [k, v] of Object.entries(b.statModifiers)) {
      if (typeof v !== 'number' || !(FOLDABLE as readonly string[]).includes(k)) throw new Error(`${where}: badge '${id}' modifies '${k}', which the engine cannot fold`)
      delta[k] = (delta[k] ?? 0) + v
      mods[k] = v
    }
    // a granted id is an attack or a power; the registry it lives in decides which list it joins at makeUnit — both lists feed the one action list
    for (const g of b.grants) if (!attacks.includes(g) && !abilities.includes(g)) abilities.push(g)
    triggers.push(...(b.triggers ?? []))
    worn.push({ badgeId: id, grants: [...b.grants], mods, ...(b.gaps ? { gaps: b.gaps } : {}) })
  }
  const def: UnitDef = {
    ...foldStats(base, delta, `${where}: ${base.typeId}'s badges`),
    attacks, abilities, triggers,
    badges: [...seen],
  }
  return { def, worn }
}

/**
 * v2.loadout (COMBAT-V2 §11.1): what a hero carries in its hands and stows in its
 * item slots, as item instances. `handed` is the list applyItems folded (only its
 * weapons and shields are hands); `stowed` grants nothing and must be held-class.
 * instanceIds are `<uid>/<n>`, n counting every item handed then stowed — unique in
 * the battle because uid is (SWITCHES.md 'V2 loadout').
 */
export function loadoutOf(
  base: UnitDef, uid: number, handed: readonly string[], stowed: readonly string[],
  items: Readonly<Record<string, ItemDef>>, where: string,
  /** v2.item-uses: instance ordinals carried spent — neither in hand nor stowed; they wait in itemUses. */
  spent: ReadonlySet<number> = new Set(),
): { loadout: import('./types.js').Loadout; instanceIds: string[] } {
  const instanceIds = handed.map((_, n) => `${uid}/${n}`)
  const hands = handed.flatMap((id, n) => (HELD_CLASSES.includes(items[id]!.itemClass) && !spent.has(n) ? [{ instanceId: instanceIds[n]!, itemId: id }] : []))
  const out = stowed.flatMap((id, k) => {
    const it = items[id]
    if (!it) throw new Error(`${where}: ${base.typeId} stows '${id}', which is not an item in the registry`)
    if (!HELD_CLASSES.includes(it.itemClass)) throw new Error(`${where}: ${base.typeId} stows '${id}', a ${it.itemClass} — only a weapon or shield is stowed; everything else works from its own slot`)
    return spent.has(handed.length + k) ? [] : [{ instanceId: `${uid}/${handed.length + k}`, itemId: id }]
  })
  // fix.vs-target-worn-and-flat: the non-held instances, so a worn slayer can be read (Law 11:
  // the loadout already names what is carried; worn is its third list, absent when empty)
  const worn = handed.flatMap((id, n) => (!HELD_CLASSES.includes(items[id]!.itemClass) && !spent.has(n) ? [{ instanceId: instanceIds[n]!, itemId: id }] : []))
  return { loadout: { hands, stowed: out, ...(worn.length ? { worn } : {}) }, instanceIds }
}

// ── ITEM-INSTANCE USES (v2.item-uses, V2 R6, 2026-09-24) ─────────────────────
// A use belongs to the instance that granted the power (V2-ROADMAP R6: "Duplicate
// item instances remain distinct"). The count itself is the power row's `uses` — the
// Codex's field (GEAR-DESIGN.md §4 table, "uses 1") — never a second copy on the item
// (Law 11; SWITCHES.md itemUsesSource). The fielding may hand in uses already spent
// (DUNGEON-MODE-2026-09-07.md §4: "The layer marks each one-time-use (or limited-use)
// item as spent; the re-field skips it").

/**
 * The uses of every carried instance whose powers have `uses`, and which instances
 * arrive spent. `carried` is handed then stowed — the order that numbers instanceIds;
 * `used[n]` is what instance n spent before this battle. Loud on every malformed count.
 */
export function itemUsesOf(
  base: UnitDef, uid: number, carried: readonly string[], used: readonly number[] | undefined,
  items: Readonly<Record<string, ItemDef>>, actions: Readonly<Record<string, ActionDef>>, where: string,
): { entries: import('./types.js').ItemUse[]; spent: Set<number> } {
  if (used !== undefined && (!Array.isArray(used) || used.length !== carried.length)) throw new Error(`${where}: ${base.typeId} carries ${carried.length} item instances but is handed ${Array.isArray(used) ? used.length : 'no list of'} uses counts — one per instance, handed then stowed`)
  const entries: import('./types.js').ItemUse[] = []
  const spent = new Set<number>()
  carried.forEach((id, n) => {
    const row = items[id]
    if (!row) throw new Error(`${where}: ${base.typeId} carries '${id}', which is not an item in the registry`)
    const k = used?.[n] ?? 0
    if (!Number.isSafeInteger(k) || k < 0) throw new Error(`${where}: ${base.typeId}'s '${id}' is handed ${String(k)} uses spent — a count is a whole number`)
    const powers = usedPowersOf(row, actions)
    if (!powers.length) { if (k > 0) throw new Error(`${where}: ${base.typeId}'s '${id}' is handed ${k} uses spent, but it has no uses — a permanent item is never spent`); return }
    for (const { actionId: a, uses: total } of powers) {
      if (k > total) throw new Error(`${where}: ${base.typeId}'s '${id}' is handed ${k} uses spent of '${a}', which had only ${total}`)
      entries.push({ instanceId: `${uid}/${n}`, itemId: id, actionId: a, left: total - k, used: 0 })
    }
    if (entries.filter((e) => e.instanceId === `${uid}/${n}`).every((e) => e.left === 0)) spent.add(n)
  })
  return { entries, spent }
}

/**
 * The powers a carried row pays uses of — its granted actions and abilities that carry `uses`, each with
 * its count per battle, in grant order. The one reading: itemUsesOf above, and the kingdom's shop, restock
 * and Reckoning through usesPerBattleOf (kingdom.reads-engine, review finding K8 — "an item's number of
 * uses is kept twice"). An item whose powers carry no uses is permanent.
 */
export function usedPowersOf(row: ItemDef, actions: Readonly<Record<string, ActionDef>>): readonly { readonly actionId: string; readonly uses: number }[] {
  return [...row.grants, ...row.abilities].filter((a, j, all) => all.indexOf(a) === j && (actions[a]?.uses ?? 0) > 0).map((a) => ({ actionId: a, uses: actions[a]!.uses! }))
}

/** The uses a carried instance of `row` has per battle — the most any of its powers has (an instance is spent when every power is) — or null, a permanent item. */
export function usesPerBattleOf(row: ItemDef, actions: Readonly<Record<string, ActionDef>>): number | null {
  const powers = usedPowersOf(row, actions)
  return powers.length ? Math.max(...powers.map((p) => p.uses)) : null
}

/** Can this instance pay now? An item worked from its own slot always; a weapon or shield only while in hand. */
export function canPayFrom(items: Readonly<Record<string, ItemDef>>, u: { loadout?: import('./types.js').Loadout }, e: import('./types.js').ItemUse): boolean {
  const row = items[e.itemId]
  if (!row) throw new Error(`item use '${e.instanceId}' names '${e.itemId}', which is not an item in the registry`)
  if (!HELD_CLASSES.includes(row.itemClass)) return true
  return !!u.loadout?.hands.some((i) => i.instanceId === e.instanceId)
}

/** The uses of one power this unit's instances can pay now. */
export function instanceUsesLeft(items: Readonly<Record<string, ItemDef>>, u: { loadout?: import('./types.js').Loadout; itemUses?: readonly import('./types.js').ItemUse[] }, actionId: string): number {
  let n = 0
  for (const e of u.itemUses ?? []) if (e.actionId === actionId && canPayFrom(items, u, e)) n += e.left
  return n
}
