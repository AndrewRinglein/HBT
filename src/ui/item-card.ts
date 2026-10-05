// An item's card as the screens draw it, and what a click looks at — kingdom.equip-item-card (2026-10-05; Andrew, engine/
// DECISIONS.md 'playtest post: notices, target lines, item cards, …': "You need to be able to click on them, and then they pop
// up somewhere on the screen, to the right or somewhere, as a card with a description.").
//
// The card's CONTENT is src/content/item-card.ts itemCardOf — plain data. Here: itemCardHtml, one pure function from that
// data (and the item's card art, when it has any) to the card's markup — an <aside class="itemcard"> that stands at the right
// of the screen (after.css) — used by Equip, by the reward screen, and usable by any screen handed the same data. And
// lookingAfter: the one rule both hosts follow for what a click looks at. Looking is a view's choice, never a Campaign fact:
// nothing here equips, moves or writes anything.

import type { ItemCard } from '../content/item-card.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/**
 * The card. `art`: the item's own card art (a data URI) or null — an item with none shows a plain face, never another's.
 * Its art; its name; its kind and tier and the short facts; one line of what it is; what it gives while equipped; its own
 * triggers; each attack and power it grants with what it does; the attribute a Forge row carries.
 */
export function itemCardHtml(card: ItemCard, art: string | null): string {
  const lines = (ls: readonly string[]) => ls.map((l) => `<p>${esc(l)}</p>`).join('')
  return `<aside class="itemcard" data-item-card="${esc(card.id)}" data-art="${art ? 1 : 0}" role="complementary" aria-label="${esc(card.name)}">
    <div class="ic-art">${art ? `<img src="${art}" alt="">` : '<span>no art yet</span>'}</div>
    <div class="ic-name">${esc(card.name)}</div>
    <div class="ic-kind">${esc([`${card.kind} · tier ${card.tier}`, ...card.facts].join(' · '))}</div>
    ${card.line ? `<p class="ic-line">${esc(card.line)}</p>` : ''}
    ${card.gives.length ? `<ul class="ic-gives">${card.gives.map((g) => `<li class="${g.amount > 0 ? 'pos' : 'neg'}" data-stat="${esc(g.stat)}">${esc(g.words)}</li>`).join('')}</ul>` : ''}
    ${card.lines.length ? `<div class="ic-own">${lines(card.lines)}</div>` : ''}
    ${card.attribute ? `<div class="ic-attribute" data-attribute="${esc(card.attribute.id)}"><b>${esc(card.attribute.name)}</b>${lines(card.attribute.lines)}</div>` : ''}
    ${card.grants.map((g) => `<div class="ic-grant" data-grant="${esc(g.id)}" data-kind="${g.kind}"><b>${esc(g.name)}</b>${lines(g.lines)}</div>`).join('')}
  </aside>`
}

/** What is being looked at: the stash item in hand (it is also the one looked at), or an item looked at where it lies. */
export type Looking = { readonly picked: string | null; readonly look: string | null }
export type LookEvent =
  /** a stash item clicked: taken in hand — its card opens; the same one again puts it down */
  | { readonly kind: 'pick'; readonly id: string }
  /** an item clicked where it is worn (nothing in hand): its card opens; the same one again closes it */
  | { readonly kind: 'look'; readonly id: string }
  /** a click on nothing: the card closes, and an item in hand is put down */
  | { readonly kind: 'away' }
  /** an item was put on, taken off, or the screen left: nothing in hand, no card */
  | { readonly kind: 'done' }

/** What is looked at after a click. Clicking another item replaces the card; clicking away closes it. Pure. */
export function lookingAfter(s: Looking, e: LookEvent): Looking {
  if (e.kind === 'pick') return s.picked === e.id ? { picked: null, look: null } : { picked: e.id, look: e.id }
  if (e.kind === 'look') return s.picked === null && s.look === e.id ? { picked: null, look: null } : { picked: null, look: e.id }
  return { picked: null, look: null }
}

/** Is this click a click AWAY — on no control, no item and not on the card itself? */
export function isClickAway(ev: Event | undefined): boolean {
  const t = ev?.target as HTMLElement | null | undefined
  if (!t?.closest) return true
  // one simple selector at a time: every DOM the pages run on (the page tests' included) answers these
  return !['[data-act]', '.itemcard', 'button', 'a', 'input', 'select', 'textarea'].some((sel) => t.closest(sel))
}
