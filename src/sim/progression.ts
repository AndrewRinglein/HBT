// The progression roster as battle options — hero assembly (2026-09-03).
//
// `progression/PROGRESSION-SCHEDULE.json` (the kingdom's 20-battle run) names,
// per battle, who is fielded, at what level, with which specialty, pick,
// powers and items. This turns one battle's roster into the three parallel
// lists createBattle reads — `heroes`, `heroItems`, `heroProgress` — and
// keeps the schedule's own resolved stat block beside each hero as the
// ORACLE: ruled 2026-09-03 (Angela, "Derive, compare, report"), the engine
// assembles the hero through fieldedDef() and a disagreement with the
// schedule is a finding, never a patch. Pure: the caller reads the file.

import type { HeroProgress, UnitDef } from '../core/types.js'

export type ScheduleHero = {
  readonly id: string
  readonly name: string
  readonly class: string
  readonly level: number
  readonly specialty: { readonly id: string; readonly mods: Readonly<Record<string, number>> } | null
  readonly levelFivePick: Readonly<Record<string, number>> | null
  readonly powers: readonly { readonly id: string; readonly level: number }[]
  readonly equipment: {
    readonly hands: readonly { readonly id: string }[]
    readonly armor: { readonly id: string } | null
    readonly slots: readonly { readonly id: string }[]
  }
  readonly stats: Readonly<Record<string, number>>
}
export type ScheduleBattle = { readonly battle: number; readonly fieldedCount: number; readonly roster: readonly ScheduleHero[] }
export type Schedule = { readonly battles: readonly ScheduleBattle[] }

/** The schedule's stat words -> the engine's. Words with no engine stat are not compared. */
export const SCHEDULE_STAT: Readonly<Record<string, keyof UnitDef>> = {
  strength: 'strength', precision: 'precision', magic: 'magic', spirit: 'spirit', armor: 'armor', resist: 'resist',
  health: 'maxHp', reach: 'reach', dodge: 'dodge', accuracy: 'accuracy', crit: 'crit', luck: 'luck',
  movement: 'movement', staminaMax: 'maxStamina', staminaRegen: 'staminaRegen', toughness: 'toughness',
  // NOT surge — FINDING 2026-09-03 (capability.surge): the schedule's builder
  // starts every hero at surge 0 and adds only specialty mods, while the
  // Codex rule (heroes.json rules.surge) is "Surge always EQUALS the character
  // level". The engine follows the Codex; the disagreement is the builder's
  // to settle, reported here rather than compared.
}

/** The schedule's stat words in a pick -> engine names (the level table's choice options are in engine names). */
export function pickOf(pick: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(pick)) out[(SCHEDULE_STAT[k] as string | undefined) ?? k] = v
  return out
}

/**
 * What the hero WIELDS and WEARS: hands + armor + the slot items. FINDING
 * (2026-09-03, the first run): the schedule's assigner stows spare WEAPONS in
 * item slots for their stat modifiers (the Lion's third one-hander from
 * battle 7). The engine has no "carried, not wielded" — a weapon is in a hand
 * or it is not on the unit — so slot-weapons are left off and reported by
 * `stowedWeapons`, and the stats the schedule counted from them surface as
 * stat disagreements. Not patched: it is the schedule's rule to settle.
 */
/** Item classes that are held in hands, never worn from an item slot. */
const HELD: readonly string[] = ['weapon', 'shield']
export function itemsOf(h: ScheduleHero, items?: Readonly<Record<string, { itemClass: string }>>): string[] {
  // A shield in an item slot is stowed like a slot weapon (plumbing.shield-class, V2 R1).
  const slots = items ? h.equipment.slots.filter((i) => !HELD.includes(items[i.id]?.itemClass ?? '')) : h.equipment.slots
  return [...h.equipment.hands.map((i) => i.id), ...(h.equipment.armor ? [h.equipment.armor.id] : []), ...slots.map((i) => i.id)]
}
export function stowedWeapons(h: ScheduleHero, items: Readonly<Record<string, { itemClass: string }>>): string[] {
  return h.equipment.slots.filter((i) => HELD.includes(items[i.id]?.itemClass ?? '')).map((i) => i.id)
}

export function progressOf(h: ScheduleHero): HeroProgress {
  return {
    level: h.level,
    ...(h.specialty ? { specialtyId: h.specialty.id } : {}),
    ...(h.levelFivePick ? { levelFivePick: pickOf(h.levelFivePick) } : {}),
    powers: h.powers.map((p) => p.id),
  }
}

/** The battle's fielded roster (the first `fieldedCount` in entry order), as createBattle options. */
export function rosterOptionsOf(schedule: Schedule, battle: number, items?: Readonly<Record<string, { itemClass: string }>>) {
  const b = schedule.battles.find((x) => x.battle === battle)
  if (!b) throw new Error(`progression: no battle ${battle} in the schedule`)
  const fielded = b.roster.slice(0, b.fieldedCount)
  return {
    heroes: fielded.map((h) => h.id),
    heroItems: fielded.map((h) => itemsOf(h, items)),
    heroProgress: fielded.map(progressOf),
    oracle: fielded.map((h) => h.stats),
    stowed: fielded.map((h) => (items ? stowedWeapons(h, items) : [])),
  }
}

/** Where a fielded def and the schedule's block disagree, stat by stat. Empty = agreement. */
export function disagreements(def: UnitDef, stats: Readonly<Record<string, number>>): { stat: string; engine: number; schedule: number }[] {
  const out: { stat: string; engine: number; schedule: number }[] = []
  for (const [word, key] of Object.entries(SCHEDULE_STAT)) {
    if (!(word in stats)) continue
    const engine = (def[key] as number | undefined) ?? 0
    if (engine !== stats[word]) out.push({ stat: word, engine, schedule: stats[word]! })
  }
  return out
}
