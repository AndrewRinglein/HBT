// Sets — GEAR-DESIGN.md §5, resolved 2026-09-03: a set is a TAG in the closed tag
// list, and the bonus is a `setBonus` block on the item that cares. Two shapes:
// per-other pays `each` per OTHER worn member of the tag (three slaying weapons →
// +2 each); at-count pays `once` when `at` members are worn, the carrier included.
// An item belongs to every set its tags name, so one item may count for several.
//
// Resolved when the hero is built for battle — counted over what is EQUIPPED,
// never the stash — and handed on as numbers: a unit stat, or `attackDamage` on
// this weapon's own attacks. The engine receives numbers, never set logic. This
// file knows no tag and no item by name; it reads {tag, each, at, once} off rows.

import type { CampaignState, HeroId } from './campaign.js'
import { itemOf, type ItemRow } from '../content/items.js'
import type { UnitMods } from '../engine.js'

/** One triggered set on one hero: the item that pays, what it counted, and what it paid. */
export type SetLine = {
  readonly itemId: string
  readonly tag: string
  readonly shape: 'per-other' | 'at-count'
  /** Per-other: the other members worn. At-count: every member worn, the carrier included. */
  readonly count: number
  /** Unit-stat payload, already multiplied. */
  readonly stats: Readonly<Record<string, number>>
  /** This weapon's damage payload, already multiplied. 0 when the set pays a stat. */
  readonly attackDamage: number
}

const mul = (o: Readonly<Record<string, number>>, n: number): Record<string, number> =>
  Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]! * n]))
const split = (o: Record<string, number>): { stats: Record<string, number>; attackDamage: number } => {
  const stats: Record<string, number> = {}
  let attackDamage = 0
  for (const [k, v] of Object.entries(o)) { if (k === 'attackDamage') attackDamage += v; else stats[k] = v }
  return { stats, attackDamage }
}

/** Pure: the triggered sets over a list of worn rows, in worn order (Law 6: order is placement). */
export function resolveSetsOf(worn: readonly ItemRow[]): SetLine[] {
  const out: SetLine[] = []
  worn.forEach((r, i) => {
    const sb = r.setBonus
    if (!sb) return
    const members = worn.filter((w, j) => j !== i && w.tags.includes(sb.tag)).length
    if (sb.each) {
      if (members === 0) return
      const { stats, attackDamage } = split(mul(sb.each, members))
      out.push({ itemId: r.id, tag: sb.tag, shape: 'per-other', count: members, stats, attackDamage })
    } else if (sb.at !== undefined && sb.once) {
      const all = members + (r.tags.includes(sb.tag) ? 1 : 0)
      if (all < sb.at) return
      const { stats, attackDamage } = split(mul(sb.once, 1))
      out.push({ itemId: r.id, tag: sb.tag, shape: 'at-count', count: all, stats, attackDamage })
    }
  })
  return out
}

/** The triggered sets on one hero — over `equipped` and nothing else. */
export function resolveSets(campaign: CampaignState, heroId: HeroId): SetLine[] {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  return resolveSetsOf(h.equipped.map(itemOf))
}

/** What a hero's gear changes about it — the deltas the roster, the Equip screen and the fielding all show. */
export type HeroMods = {
  /** The items' own statModifiers, summed. */
  readonly items: Readonly<Record<string, number>>
  /** The sets' unit-stat payloads, summed. */
  readonly sets: Readonly<Record<string, number>>
  /** items + sets, by stat. */
  readonly total: Readonly<Record<string, number>>
  /** Per weapon id: this-weapon damage from sets. */
  readonly weapons: Readonly<Record<string, number>>
  readonly lines: readonly SetLine[]
}

const add = (into: Record<string, number>, o: Readonly<Record<string, number>>): void => { for (const [k, v] of Object.entries(o)) into[k] = (into[k] ?? 0) + v }
const tidy = (o: Record<string, number>): Record<string, number> => Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== 0).map((k) => [k, o[k]!]))

/** Pure: the deltas over a list of worn rows. */
export function heroModsOfRows(worn: readonly ItemRow[]): HeroMods {
  const items: Record<string, number> = {}
  for (const r of worn) add(items, r.statModifiers)
  const lines = resolveSetsOf(worn)
  const sets: Record<string, number> = {}
  const weapons: Record<string, number> = {}
  for (const l of lines) { add(sets, l.stats); if (l.attackDamage) weapons[l.itemId] = (weapons[l.itemId] ?? 0) + l.attackDamage }
  const total: Record<string, number> = {}
  add(total, items); add(total, sets)
  return { items: tidy(items), sets: tidy(sets), total: tidy(total), weapons: tidy(weapons), lines }
}

export function heroModsOf(campaign: CampaignState, heroId: HeroId): HeroMods {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  return heroModsOfRows(h.equipped.map(itemOf))
}

/**
 * The fielding's share: the set numbers alone, as the engine's unit mods (BattleOptions.heroMods, seam.unit-mods) —
 * each stat and each weapon bonus naming the item that pays it as its source. Items' own modifiers travel as the
 * items (seam.loadout). kingdom.reads-engine (review finding K3): resolved here and FOUGHT — the battle applies them,
 * and the Equip card reads the engine's preview of them (fieldedPreview), never a sum of its own.
 */
export type FieldedMods = UnitMods
type ModStat = NonNullable<UnitMods['stats']>[number]['stat']
export function fieldedModsOfRows(worn: readonly ItemRow[]): FieldedMods {
  const lines = resolveSetsOf(worn)
  const stats = lines.flatMap((l) => Object.keys(l.stats).sort().filter((k) => l.stats[k] !== 0).map((k) => ({ stat: k as ModStat, add: l.stats[k]!, source: l.itemId })))
  const attacks = lines.filter((l) => l.attackDamage !== 0).map((l) => ({ itemId: l.itemId, damage: l.attackDamage, source: l.itemId }))
  return { ...(stats.length ? { stats } : {}), ...(attacks.length ? { attacks } : {}) }
}
/** Does a fielding's share change anything? */
export const hasMods = (m: FieldedMods | undefined): boolean => !!m && !!((m.stats?.length ?? 0) + (m.attacks?.length ?? 0))
