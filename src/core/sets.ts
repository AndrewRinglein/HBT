// Sets — GEAR-DESIGN.md §5, resolved 2026-09-03: a set is a TAG in the closed tag
// list, and the bonus is a `setBonus` block on the item that cares. Three wordings:
// for-every pays `each` per member carried, the carrier among them when it bears the
// tag ("+1 Precision for every CHAIN item you carry"); per-other pays `each` per OTHER
// member (three slaying weapons → +2 each); at-count pays `once` when `at` members
// are carried, the carrier included. An item belongs to every set its tags name.
//
// capability.set-bonus (engine item, 2026-10-05; engine/DECISIONS.md 2026-10-04 'his 28
// reward weapons read back …': "We need: … set bonus"): THE COUNT IS THE ENGINE'S
// (engine core/items.ts setLinesOf), taken over what the hero carries when it is
// fielded and FOUGHT there — every fielding, not only this package's. This file no
// longer counts and no longer hands the battle set numbers ("the engine receives
// numbers, never set logic" is replaced: two counts were one rule in two homes). It
// reads the engine's lines for the roster, the Equip screen and the leaving summary,
// over what is EQUIPPED, never the stash. It knows no tag and no item by name.

import type { CampaignState, HeroId } from './campaign.js'
import { itemOf, type ItemRow } from '../content/items.js'
import { setLinesOf } from '../engine.js'

/** One triggered set on one hero: the item that pays, what it counted, and what it paid. */
export type SetLine = {
  readonly itemId: string
  readonly tag: string
  readonly shape: 'for-every' | 'per-other' | 'at-count'
  /** For-every: every member carried, the carrier too when it bears the tag. Per-other: the other members. At-count: every member, the carrier included. */
  readonly count: number
  /** Unit-stat payload, already multiplied. */
  readonly stats: Readonly<Record<string, number>>
  /** This weapon's damage payload, already multiplied. 0 when the set pays a stat. */
  readonly attackDamage: number
}

/** Pure: the sets that pay over a list of carried rows, in carried order (Law 6: order is placement) — the engine's count. */
export function resolveSetsOf(worn: readonly ItemRow[]): SetLine[] {
  return setLinesOf(worn.map((r) => ({ id: r.id, setTags: r.tags, ...(r.setBonus ? { setBonus: r.setBonus } : {}) })))
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

/** The unit mods a fielding hands the engine: the points a hero was drafted with (the sets are the engine's own count now). */
export type FieldedMods = import('../engine.js').UnitMods
/** Does a fielding's share change anything? */
export const hasMods = (m: FieldedMods | undefined): boolean => !!m && !!((m.stats?.length ?? 0) + (m.attacks?.length ?? 0))
