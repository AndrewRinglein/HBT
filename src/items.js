/* ── WHAT A UNIT CARRIES (viewer.panel-lists-items, 2026-10-04) — pure, log and content only ──────────────────────────────
   Engine DECISIONS.md 2026-10-03 'the battle's unit panel lists what the unit is equipped with' (Andrew: "This priest only has
   a verse attack. It seems like he has nothing in his hands. I don't understand what he's equipped with. We need the items
   listed under the characters on the right in battle."). The rows the panel draws under the character: each hand, the armor,
   the item slots, and what is stowed for the swap — each item by its own name, with what it gives.
   Nothing here is a hand table and nothing is worked out:
     which items, and what each put on THIS unit — the log: unit.equipped (itemId, instance, grants, abilities, mods — the
       fold keeps them as kit.held and the fielded modifiers), unit.enter's stowed, loadout.swapped;
     what an item IS — its own row through the door (D.ITEMS, static.json items: name, itemClass, the hands it takes —
       the engine's handsOf — grants, abilities, statModifiers), read for the name, where it sits, and for a stowed item
       what it would give in hand;
     how many hands there are — the engine's (D.HANDS, static.json hands), so a hand nothing fills is drawn as empty.
   A unit that carries nothing and is not on the player's side has no rows. No DOM, no clock. */
import { sgn, STATSHORT } from './actions.js'

const statWord = k => (STATSHORT[k] || String(k).replace(/([A-Z])/g, ' $1')).toUpperCase()
/** the words for what an item gives: its attacks and powers by name, then its stat changes */
function givesOf(D, grants, abilities, mods) {
  const ACT = D.ACT || {}, name = id => (ACT[id] && ACT[id].name) || String(id).split('.').pop()
  return [...(grants || []).map(name), ...(abilities || []).map(name), ...Object.entries(mods || {}).map(([k, v]) => statWord(k) + ' ' + sgn(v))]
}
/** [{slot, item, instance, name, gives, title}] — slot: 'hand' · 'both-hands' · 'armor' · 'slot' · 'stowed' · 'carried';
    item null and name 'empty' / 'none' / 'nothing' for a place nothing fills */
export function itemsOf(u, D) {
  const kit = (u && u.kit) || {}, held = kit.held || [], stowed = (u && u.stowed) || []
  if (!u || (!held.length && !stowed.length && u.side !== 'hero')) return []
  const ITEMS = D.ITEMS || {}, HANDS = D.HANDS
  const nameOf = id => (ITEMS[id] && ITEMS[id].name) || String(id).replace(/^item\./, '')
  const none = (slot, word) => ({ slot, item: null, instance: null, name: word, gives: '', title: '' })
  /* what a held item put on this unit is the log's: its grants and powers (kit.held), its modifiers (the fielded ones it sourced) */
  const modsOf = h => Object.fromEntries((u.mods || []).filter(m => m.fielded && (h.instanceId != null ? m.instance === h.instanceId : m.source === h.itemId && m.instance == null)).map(m => [m.stat, m.value]))
  const worn = (slot, h) => { const gives = givesOf(D, h.grants, h.abilities, modsOf(h)).join(' · '), name = nameOf(h.itemId)
    return { slot, item: h.itemId, instance: h.instanceId ?? null, name, gives, title: name + (gives ? ' — ' + gives : '') } }
  const rows = []
  /* the hands: each held item whose row takes hands, in the order the log put them there; one that takes every hand is in
     both; a hand nothing fills is empty. The count walks the engine's own hands — places on the screen, not a figure shown. */
  const inHand = held.filter(h => ITEMS[h.itemId] && ITEMS[h.itemId].hands > 0)
  let filled = 0
  for (const h of inHand) { const n = ITEMS[h.itemId].hands; rows.push(worn(HANDS != null && n >= HANDS ? 'both-hands' : 'hand', h)); filled += n }
  if (HANDS != null) for (let k = filled; k < HANDS; k++) rows.push(none('hand', 'empty'))
  const armor = held.filter(h => ITEMS[h.itemId] && ITEMS[h.itemId].itemClass === 'armor')
  rows.push(...(armor.length ? armor.map(h => worn('armor', h)) : [none('armor', 'none')]))
  const slots = held.filter(h => ITEMS[h.itemId] && !(ITEMS[h.itemId].hands > 0) && ITEMS[h.itemId].itemClass !== 'armor')
  rows.push(...(slots.length ? slots.map(h => worn('slot', h)) : [none('slot', 'empty')]))
  /* an item the host handed no row for is still said, plainly */
  for (const h of held) if (!ITEMS[h.itemId]) rows.push(worn('carried', h))
  /* stowed: carried, granting nothing until swapped into a hand — what it WOULD give there is its own row's */
  rows.push(...(stowed.length ? stowed.map(i => { const r = ITEMS[i.itemId] || {}, name = nameOf(i.itemId)
    const gives = givesOf(D, r.grants, r.abilities, r.mods).join(' · ')
    return { slot: 'stowed', item: i.itemId, instance: i.instanceId ?? null, name, gives, title: name + ' — stowed' + (gives ? '; in hand: ' + gives : '') } }) : [none('stowed', 'nothing')]))
  return rows
}
export const SLOT_LABEL = { hand: 'Hand', 'both-hands': 'Both hands', armor: 'Armor', slot: 'Item slot', stowed: 'Stowed', carried: 'Carried' }
