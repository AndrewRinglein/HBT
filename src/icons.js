import { DMG_HUE } from './theme.js'
/* ── the icon pack (HANDOFF-ICONS-AND-SUMMON §1–2) ────────────────────────
   RPG Awesome glyph outlines (game-icons.net, CC BY 3.0) from the inline
   sprite the build emits. One helper, so a name the sprite lacks is a build
   assertion, not a silent 0px glyph. */
export const raIcon = (name, style = '') => `<svg class="ra" style="${style}"><use href="#ra-${name}"/></svg>`

/** The sprite markup, from generated/ra-glyphs.json. Font units 1024/em,
    ascent 960, y-up: flip and drop by the ascent. */
export function spriteHTML(RA) {
  return '<svg id="raSprite" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' +
    Object.entries(RA.glyphs).map(([name, g]) =>
      `<symbol id="ra-${name}" viewBox="0 0 ${g.adv} 1024"><path${g.raw ? '' : ` transform="translate(0,${RA.ascent}) scale(1,-1)"`} d="${g.d}"/></symbol>`).join('') +
    '</svg>'
}

/* the four ability classes, decided: melee · ranged · move · special.
   Move is a footfall, special is a flight — ground versus air. The special
   arrow stays STRICTLY vertical; an angled arrow reads as a heading. */
export const ACT_CLASS = {
  melee:   { glyph: 'crossed-swords',  col: '#d1665c', rot: '' },
  ranged:  { glyph: 'bow',             col: '#d1665c', rot: '' },   // ruled 2026-09-03: a bow, not a crossbow
  move:    { glyph: 'shoe-prints',     col: '#7f9ec0', rot: '' },
  special: { glyph: 'broadhead-arrow', col: '#d6b25e', rot: 'transform:rotate(-135deg)' },
}
/* damage type owns the icon colour AND the DMG figure (HANDOFF §2). Physical
   is reduced by armor, magic by resist, true by nothing — and that reads
   before the player reads a number. Non-damaging rows keep class colour. */
export const DHUE = {
  physical: { col: '#d1665c', bg: '#241715', bd: '#4a2a26' },
  magic:    { col: '#8b8ad9', bg: '#171a2a', bd: '#2e3355' },
  fire:     { col: DMG_HUE.fire, bg: '#241715', bd: '#4a2a26' },
  poison:   { col: DMG_HUE.poison, bg: '#172415', bd: '#294a26' },
  shadow:   { col: DMG_HUE.shadow, bg: '#20152a', bd: '#402655' },
  'true':   { col: '#d6b25e', bg: '#241c0e', bd: '#4a3a1c' },
}
export function actClass(a) {
  if (a.kind === 'move') return 'move'
  if (a.isPower) return 'special'
  return a.kind === 'ranged' ? 'ranged' : 'melee'
}
export function actHue(a) {
  /* the damage type lives under `attack` since 26fa562 (§11) */
  const dt = (a.attack || a).damageType
  const dh = dt && DHUE[dt]
  if (dh) return dh
  return { col: ACT_CLASS[actClass(a)].col, bg: '#1a1712', bd: '#2b2418' }
}
export function icoHTML(a) {
  const k = ACT_CLASS[actClass(a)], h = actHue(a)
  return `<div class="acIco" style="color:${h.col};background:${h.bg};border-color:${h.bd}">${raIcon(k.glyph, k.rot)}</div>`
}
/* the danger marker's icon: crossed swords for melee, the bow for ranged
   (ruled 2026-09-03 — RPG Awesome has no plain bow, so `bow` is the viewer's
   own glyph in the sprite). 22px is the badge tier. No plate. */
export const DGSZ = 22
export function dangerHTML(d, col) {
  const ico = raIcon(d.kind === 'ranged' ? 'bow' : 'crossed-swords',
    `font-size:${DGSZ}px;color:${col};flex:0 0 ${DGSZ}px`)
  return `<span style="font:700 18px/1 ui-monospace,monospace">${d.n}</span>${ico}`
}
