/* ── AN ITEM'S CARD, BESIDE THE PANEL (viewer.item-card-in-battle, 2026-10-05) ────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-05 'playtest post: …' (Andrew: "When you're focusing on a character, you need to be able to
   look at their items when you're in battle." — after: "You need to be able to click on them, and then they pop up somewhere
   on the screen, to the right or somewhere, as a card with a description.").
   The card is the HOST'S, and there is one: the kingdom's (kingdom.equip-item-card — its content itemCardOf, its markup
   itemCardHtml, the card the Equip screen and the rewards stand). A host hands the component `itemCard(itemId)`, which
   answers that card's markup, or null for an item it has no card for. Nothing of a card is written here — no name, no line,
   no number: this module only stands the host's markup in a holder beside the panel and takes it down again.
     toggle(item, unit)   the name clicked: the card of that item stands (another's is replaced); the same name again closes it
     shown(unit, items)   the panel was drawn for this unit, carrying these items: a card of another unit's, or of an item
                          it no longer carries, is taken down
     a click anywhere but on the card or on an item's name closes it (the document's click, caught on the way down, so a
     row or a board that stops its own click still closes the card)
   With no host function the component mounts none of this and the panel is what it was. */
export function mountItemCard(V, cardOf, onFault) {
  const at = document.createElement('div'); at.id = 'itemCardAt'; at.style.display = 'none'
  V.dom.root.appendChild(at)
  let open = null   // { item, unit } while a card stands
  const mark = () => { for (const r of V.dom.panel ? V.dom.panel.querySelectorAll('.pItem') : []) { if (!r.classList.contains('look')) continue
    const on = !!open && r.dataset.item === open.item
    r.classList.toggle('looked', on); r.setAttribute('aria-expanded', String(on)) } }
  function close() { if (!open) return false; open = null; at.innerHTML = ''; at.style.display = 'none'; mark(); return true }
  function toggle(item, unit) {
    if (open && open.item === item && open.unit === unit) return close()
    let card = null
    try { card = cardOf(item) } catch (err) { if (onFault) onFault(err); card = null }
    if (typeof card !== 'string' || !card) { close(); return false }
    open = { item, unit }; at.innerHTML = card; at.style.display = ''; mark(); return true
  }
  const away = ev => { if (!open) return
    const t = ev && ev.target
    /* the card itself, and an item's name (its own click opens, replaces or closes): not "elsewhere" */
    const row = t && t.closest ? t.closest('.pItem') : null
    if ((t && t.closest && t.closest('#itemCardAt')) || (row && row.classList.contains('look'))) return
    close() }
  document.addEventListener('click', away, true)
  return {
    toggle, close,
    /** the item whose card stands for this unit, or null — the panel marks its row */
    openFor: unit => open && open.unit === unit ? open.item : null,
    shown(unit, items) { if (open && (open.unit !== unit || !items.includes(open.item))) close() },
    dispose() { document.removeEventListener('click', away, true); open = null; at.remove() },
  }
}
