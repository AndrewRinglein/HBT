// The loadout — what a hero wears, read from `equipped` in order. GEAR-DESIGN.md §1
// (ruled 2026-09-02): two hands that are item slots for weapons only, a two-hander
// filling both; one armor in its own slot; N item slots from the hero row, widened
// by what is worn (the Backpack); a weapon past the hands spills into an item slot
// and still grants its attacks; one idol, one Bloodrune, one relic. Every hero row
// carries the numbers; this file only counts.
//
// `equipped` stays the one field (Law 11). ORDER IS PLACEMENT: the first weapon is
// the right hand — "whatever you put first in your right hand shows at the top of
// your attack option" — and the rest follow. This file never writes.

import type { CampaignState, HeroId } from './campaign.js'
import { itemOf, isShield, type ItemRow } from '../content/items.js'
import { SWITCHES } from '../content/switches.js'

export const HANDS = 2

/**
 * What the two hands hold, counted exactly as the engine's applyItems counts them
 * (V2 R1, 2026-09-23): weapon class and shield class. A shield past the hands is
 * carried, never fielded — no backpack shield grants its Block or powers.
 */
export const isHandItemClass = (row: ItemRow): boolean => row.itemClass === 'weapon' || row.itemClass === 'shield'

export type Loadout = {
  /** Weapons and shields in the hands, in order — the first is the right hand. */
  hands: string[]
  handsUsed: number
  armor: string | null
  /** Everything in the general item slots, in order — spare weapons included. */
  items: string[]
  itemSlots: { used: number; max: number }
  counts: Record<string, number>
}

/** Item slots an item costs in the general slots: a weapon its hands; armor none (its own slot); everything else one. The codex's `slots` on a Bloodrune (0) is outdated — ruled 2026-09-02, "everything here takes a slot". */
export function slotCostOf(row: ItemRow): number {
  if (row.itemClass === 'armor') return 0
  if (isHandItemClass(row)) return Math.max(1, row.hands)
  return 1
}

/** The hero's item-slot ceiling: the row's, plus what worn items add (the Backpack's +2). */
export function itemSlotsOf(campaign: CampaignState, heroId: HeroId): number {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  return h.itemSlots + h.equipped.reduce((s, id) => s + (itemOf(id).statModifiers['itemSlots'] ?? 0), 0)
}

/** Place a list of item ids as the rules do, in order. Pure; used for the real loadout and for "would it fit". */
export function placeOf(campaign: CampaignState, heroId: HeroId, equipped: readonly string[]): Loadout {
  const out: Loadout = { hands: [], handsUsed: 0, armor: null, items: [], itemSlots: { used: 0, max: 0 }, counts: {} }
  for (const id of equipped) {
    const row = itemOf(id)
    out.counts[row.itemClass] = (out.counts[row.itemClass] ?? 0) + 1
    if (row.itemClass === 'armor') { if (out.armor === null) { out.armor = id; continue } out.items.push(id); continue }
    const isHandItem = isHandItemClass(row) || isShield(row)
    if (isHandItem && out.handsUsed + Math.max(1, row.hands) <= HANDS) { out.hands.push(id); out.handsUsed += Math.max(1, row.hands); continue }
    out.items.push(id)
    out.itemSlots.used += slotCostOf(row)
  }
  out.itemSlots.max = (campaign.roster[heroId]?.itemSlots ?? 0) + equipped.reduce((s, id) => s + (itemOf(id).statModifiers['itemSlots'] ?? 0), 0)
  return out
}

export function loadoutOf(campaign: CampaignState, heroId: HeroId): Loadout {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  return placeOf(campaign, heroId, h.equipped)
}

/** One idol, one Bloodrune, one relic per hero (GEAR-DESIGN.md §1). Trinkets are uncapped. */
export const CAPPED: Readonly<Record<string, number>> = { idol: 1, bloodrune: 1, relic: 1 }

/**
 * Why a list of items does not fit a hero, or null when it does. The rules, in the
 * order a player would hear them: class, then a second armor, then the caps, then
 * the slots. `equipped` is the list AFTER the change, so a swap is judged whole.
 */
export function whyNotFit(campaign: CampaignState, heroId: HeroId, equipped: readonly string[]): string | null {
  const h = campaign.roster[heroId]
  if (!h) return `no hero '${heroId}'`
  for (const id of equipped) {
    const row = itemOf(id)
    if (row.classRestriction && !h.classes.includes(row.classRestriction)) return `'${id}' is for ${row.classRestriction}; ${h.name} is ${h.classes.join(', ')}`
  }
  const l = placeOf(campaign, heroId, equipped)
  if ((l.counts['armor'] ?? 0) > 1) return `${h.name} already wears armor — one armor per hero, in its own slot`
  for (const [cls, cap] of Object.entries(CAPPED)) if ((l.counts[cls] ?? 0) > cap) return `${h.name} already carries a ${cls} — one ${cls} per hero`
  if (l.itemSlots.used > l.itemSlots.max) return `${h.name} has ${l.itemSlots.max} item slot${l.itemSlots.max === 1 ? '' : 's'} and this would take ${l.itemSlots.used}`
  return null
}

/**
 * What of `equipped` is in the hands at fielding, and what is stowed (seam.loadout,
 * G9; v2.loadout, engine 2026-09-24). COMBAT-V2 §11.1 (ruled 2026-09-07): only what is
 * in the hands grants; a weapon or shield past the hands rides in an item slot as swap
 * fodder and grants nothing. `fielded` goes to the engine as heroItems, `stowed` as
 * heroStowed. Pure over rows; hands are counted as the engine counts them. (The old
 * SWITCHES.spareWeapons is retired, COMBAT-V2 §18.)
 */
export function fieldedItemsOf(equipped: readonly string[]): { fielded: string[]; stowed: string[] } {
  const fielded: string[] = [], stowed: string[] = []
  let hands = 0
  for (const id of equipped) {
    const row = itemOf(id)
    if (isHandItemClass(row)) {
      const h = Math.max(1, row.hands)
      if (hands + h > HANDS) { stowed.push(id); continue }
      hands += h
    }
    fielded.push(id)
  }
  return { fielded, stowed }
}

/**
 * v2.item-uses (engine cdb2233, 2026-09-24): the `equipped` slot of each engine item
 * instance — instance n is the n-th of fieldedItemsOf's fielded, then stowed (the order
 * that numbers the engine's `<uid>/<n>`, engine SWITCHES loadoutInstanceId). An
 * instance, in the kingdom, is a hero's equipped slot.
 */
export function instanceSlotsOf(equipped: readonly string[]): number[] {
  const fielded: number[] = [], stowed: number[] = []
  let hands = 0
  equipped.forEach((id, k) => {
    const row = itemOf(id)
    if (isHandItemClass(row)) {
      const h = Math.max(1, row.hands)
      if (hands + h > HANDS) { stowed.push(k); return }
      hands += h
    }
    fielded.push(k)
  })
  return [...fielded, ...stowed]
}
