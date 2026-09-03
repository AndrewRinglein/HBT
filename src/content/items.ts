// Items — the kingdom's registry over the codex's rows. GEAR-DESIGN.md §1–§4.
//
// The rows themselves are GENERATED (src/content/generated/items.ts, by
// tools/mk-items.mjs) from content/hbt-content.json and the hand-authored tier-3
// combinations; nothing here is typed by hand. This file gives them the shape,
// the kill switch and the lookups. What an item DOES in battle is the engine's
// business (engine/ITEMS-PLAN.md); the kingdom holds, buys, fits and counts.

import { ITEM_ROWS } from './generated/items.js'
import { omitDisabled } from './disable.js'

export type ItemClass = 'weapon' | 'armor' | 'trinket' | 'relic' | 'idol' | 'bloodrune' | 'consumable'

export type ItemRow = {
  readonly id: string
  readonly name: string
  readonly itemClass: ItemClass
  /** 0 junk · 1 starting and the Forge's shelf · 2 masterwork and buyable enchants · 3 rewards · 4–6 the trade-in. GEAR-DESIGN.md §2. */
  readonly tier: number
  /** Hands a weapon takes: 0 · 1 · 2. A two-hander fills both. */
  readonly hands: number
  /** Item slots it costs when carried in the general slots. Armor is 0: it has its own slot. */
  readonly slots: number
  readonly classRestriction: string | null
  readonly tags: readonly string[]
  /** `set.*` ids — an item may carry several (GEAR-DESIGN.md §5). Empty until the content session lands them. */
  readonly sets: readonly string[]
  /** Uses per battle for a one-use item, restocked after; null = permanent. */
  readonly uses: number | null
  /** The Waystation band that opens this row in its catalog, or null — it is not sold there. */
  readonly waystationBand: number | null
  /** What the Waystation charges, by currency id. Empty when it does not sell it. */
  readonly price: Readonly<Record<string, number>>
  /** What equipping costs, by currency id: idols Faith, Bloodrunes Mana, nothing else. */
  readonly equipCost: Readonly<Record<string, number>>
  readonly statModifiers: Readonly<Record<string, number>>
  /** Modifiers to THIS item's own attacks (an enchant's +1 Damage) — the engine's to apply; the kingdom only carries them. */
  readonly attackModifiers: Readonly<Record<string, number>>
  /** Attack ids the item grants — the engine reads these; the kingdom only carries them. */
  readonly grants: readonly string[]
  /** For a derived row: the tier-1 base and the enchant it carries. */
  readonly base: string | null
  readonly enchant: string | null
  readonly source: 'codex' | 'masterwork' | 'enchanted' | 'combination'
}

export const ITEMS: readonly ItemRow[] = omitDisabled(ITEM_ROWS)

const BY_ID: ReadonlyMap<string, ItemRow> = new Map(ITEMS.map((r) => [r.id, r]))

export function itemOf(id: string): ItemRow {
  const row = BY_ID.get(id)
  if (!row) throw new Error(`unknown item '${id}' — items are the codex's rows, generated into src/content/generated/items.ts (${ITEMS.length} of them)`)
  return row
}

export const isShield = (r: ItemRow): boolean => r.tags.includes('shield')
export const isWeapon = (r: ItemRow): boolean => r.itemClass === 'weapon' && !isShield(r)
