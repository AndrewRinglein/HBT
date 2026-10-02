/* ── THE UNIT-CARD BAR (viewer.unit-card-bar, 2026-10-01) ───────────────────────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-01 (Andrew): "We also need a character selector bar above the screen, the way it is in the
   visual playback. You have all the heroes and enemies as tiny little cards above the screen. That should still be there.
   And I can use that to target things as well as clicking on them." · 'the XCOM-style camera': "Double-click a character in
   the top bar or on the map to change it." The strip was the standalone page's own until now (ruled 2026-09-01 out of the
   game); it is the component's: every unit's card in the board's order (ascending unit id — the order the host's queue
   walks), the one acting, those who have acted and the fallen marked as the fold says. A click on a card IS the click on
   that unit's body (board.js clickUnit — the panel, the targeting host, the play host, alike); a double-click offers it to
   the host to act next, as a double-click on its body does. It draws; it decides nothing. */
import { clickUnit } from './board.js'

export function drawRail(V) {
  const rail = V.dom.rail; if (!rail) return
  const { S, view, data: { ARTMAP, ASSETS } } = V
  const units = Object.values(S.U)
  const key = units.map(u => `${u.id}:${u.side}:${u.life}:${S.acted[u.id] ? 1 : 0}`).join(',') + `|${S.activeId}|${view.inspectId}`
  if (rail.dataset.key === key) return
  rail.dataset.key = key
  rail.innerHTML = units.map(u => {
    const a = ARTMAP[u.typeId] || ARTMAP._pending, acted = !!S.acted[u.id]
    return `<div class="railchip ${u.side}${u.id === S.activeId ? ' now' : ''}${acted ? ' done' : ''}${u.life === 'dead' ? ' gone' : ''}${u.id === view.inspectId ? ' act' : ''}" data-i="${u.id}" title="${u.name}" role="button" tabindex="-1">
      <span class="railno">${u.life === 'dead' ? '✝' : acted ? '✓' : u.id === S.activeId ? '▸' : ''}</span>
      <img src="${ASSETS[a.token]}" alt=""></div>`
  }).join('')
  for (const ch of rail.querySelectorAll('.railchip')) {
    const id = +ch.dataset.i
    ch.addEventListener('click', ev => { ev.stopPropagation(); if (V.S.U[id]) clickUnit(V, id) })
    ch.addEventListener('dblclick', ev => { ev.stopPropagation(); if (V.play && V.inputActive() && V.S.U[id]) V.offerPlay({ kind: 'choose', id }) })
  }
}
