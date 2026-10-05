// The item's card as the BATTLE screen is handed it — viewer.item-card-in-battle (2026-10-05; Andrew, engine/DECISIONS.md
// 'playtest post: notices, target lines, item cards, …': "When you're focusing on a character, you need to be able to look at
// their items when you're in battle.").
//
// THE card, the one the Equip screen and the rewards show: its content content/item-card.ts itemCardOf, its markup
// ui/item-card.ts itemCardHtml, the item's own card art. The shared battle component is handed this one function (its
// `itemCard` option — ui/battle-surface.ts passes it for every battle the kingdom mounts) and stands the markup beside its
// panel when an item's name is clicked there; it writes no word of a card itself. An id that is no item of the campaign's has
// no card: null, and the component stands nothing. Looking equips, moves and writes nothing.
//
// Its own small module, apart from battle-surface.ts, so what the battle shows can be held to the Equip card by a test that
// never loads the battle component.

import { itemCardOf } from '../content/item-card.js'
import { itemCardHtml } from './item-card.js'
import { itemArtOf } from './art.js'

export function battleItemCard(itemId: string): string | null {
  try { return itemCardHtml(itemCardOf(itemId), itemArtOf(itemId)) } catch { return null }
}
