/* ── THE UNIT-CARD BAR (viewer.unit-card-bar, 2026-10-01) ───────────────────────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-01 (Andrew): "We also need a character selector bar above the screen, the way it is in the
   visual playback. You have all the heroes and enemies as tiny little cards above the screen. That should still be there.
   And I can use that to target things as well as clicking on them." · 'the XCOM-style camera': "Double-click a character in
   the top bar or on the map to change it." The strip was the standalone page's own until now (ruled 2026-09-01 out of the
   game); it is the component's: every unit's card in the board's order (ascending unit id — the order the host's queue
   walks), the one acting, those who have acted and the fallen marked as the fold says. viewer.turn-taking (engine DECISIONS.md
   2026-10-03 'the battle screen's turn-taking, ruled': "let's create a separation between the heroes and the enemies so they
   don't get mixed up. There's just a divider in between that's clear."): the heroes' side (civilians with them) first, left
   to right in the board's order, then a divider, then everyone else (viewer SWITCHES turnRailDivider; was railOrder's one
   ascending run). A click on a card IS the click on
   that unit's body (board.js clickUnit — the panel, the targeting host, the play host, alike); a double-click offers it to
   the host to act next, as a double-click on its body does. It draws; it decides nothing.
   viewer.fallen-cards-and-first-aid (engine DECISIONS.md 2026-10-03 'the cards above the battle: the fallen leave, a downed
   hero's card wears a first-aid mark', Andrew: "When an enemy goes down, they should no longer have their card above the
   battle. When a hero is dead, it's the same. When a hero is downed, their card on the battlefield should have a little first
   aid symbol in the upper right-hand corner." and '… the bleeding-out card …': "The hero card above the battle should show a
   first aid icon in the upper right-hand corner and the number of turns they have left."): a unit of the heroes' side has its
   card until it is dead; anyone else only while standing (was: the card stayed, greyed, with a cross — the `gone` chip). A
   downed hero's card wears the first-aid mark in its upper right-hand corner and, while it bleeds out, the turns left: the
   fold's own bleed-out count (bleedout.set / tick / accelerated — the number board.js draws over the body), never counted
   here. The divider stays while both sides still have a card (viewer SWITCHES fallenCards*, firstAid*). */
import { clickUnit } from './board.js'

export function drawRail(V) {
  const rail = V.dom.rail; if (!rail) return
  const { S, view, data: { ARTMAP, ASSETS } } = V
  /* who still has a card: the heroes' side until dead, everyone else while standing */
  const units = Object.values(S.U).filter(u => u.side === 'hero' ? u.life !== 'dead' : u.life === 'standing')
  const key = units.map(u => `${u.id}:${u.side}:${u.life}:${u.bleed}:${S.acted[u.id] ? 1 : 0}`).join(',') + `|${S.activeId}|${view.inspectId}`
  if (rail.dataset.key === key) return
  rail.dataset.key = key
  const chip = u => {
    const a = ARTMAP[u.typeId] || ARTMAP._pending, acted = !!S.acted[u.id], down = u.life === 'downed'
    /* the first-aid mark: a red cross on white, and the bleed-out count beside it while there is one */
    const aid = down ? `<span class="railaid" title="${u.bleed > 0 ? 'Downed — bleeding out: ' + u.bleed : 'Downed'}">${u.bleed > 0 ? `<b class="railaidNo">${u.bleed}</b>` : ''}<svg class="railaidIcon" viewBox="0 0 12 12" aria-hidden="true"><rect x=".5" y=".5" width="11" height="11" rx="2" fill="#f4f1e8" stroke="#7a1d18"/><path d="M5 2.2h2V5h2.8v2H7v2.8H5V7H2.2V5H5z" fill="#d1332e"/></svg></span>` : ''
    return `<div class="railchip ${u.side}${u.id === S.activeId ? ' now' : ''}${acted ? ' done' : ''}${down ? ' down' : ''}${u.id === view.inspectId ? ' act' : ''}" data-i="${u.id}" title="${u.name}" role="button" tabindex="-1">
      <span class="railno">${acted ? '✓' : u.id === S.activeId ? '▸' : ''}</span>
      <img src="${ASSETS[a.token]}" alt="">${aid}</div>`
  }
  const heroes = units.filter(u => u.side === 'hero'), others = units.filter(u => u.side !== 'hero')
  rail.innerHTML = heroes.map(chip).join('') + (heroes.length && others.length ? '<div class="railsep" role="separator" aria-orientation="vertical" title="Heroes | enemies"></div>' : '') + others.map(chip).join('')
  for (const ch of rail.querySelectorAll('.railchip')) {
    const id = +ch.dataset.i
    ch.addEventListener('click', ev => { ev.stopPropagation(); if (V.S.U[id]) clickUnit(V, id) })
    ch.addEventListener('dblclick', ev => { ev.stopPropagation(); if (V.play && V.inputActive() && V.S.U[id]) V.offerPlay({ kind: 'choose', id }) })
  }
}
