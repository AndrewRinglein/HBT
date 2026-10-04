/* ── THE FIRST-AFFLICTION POP-UP (viewer.affliction-pop-up, 2026-10-03; engine DECISIONS.md 2026-10-01 'the afflictions at
   0 Health: ... the first-affliction pop-up'). Andrew: "The first time someone gets any one of the four main status
   afflictions, we need to pop up before and after art for that character with an explanation of both: They received a bunch
   of stat modifiers. There are many drawbacks. If they are taken to zero hit points, they will most likely transform into
   an enemy. That is true for three of them. If you're possessed, a ghost is going to rise from your body." / "There is a
   before/after pop-up mid-battle that will explain what just happened with the card art of both before and after."

   The fold raises the cue from the engine's ONE line — a hero's badge.gained that carries a 0-Health rule (`atZero`: the
   engine's mark of an affliction, never a list of names here) — and everything printed is that line's or the sheet's
   (Law 0): the stat changes are its `mods`, the drawbacks the terms the line MARKS as drawbacks (`drawbacks.mods`, the
   stats; `drawbacks.gaps`, the written terms), the 0-Health paragraph the line's own text (`atZero.text`), word for word.
   The art is the manifest's: the hero's own card, and its after card for that affliction — a hero with none is told so,
   never shown another's (Law 1). The pop-up is an element on the page; while it stands the pump is held (viewer.js
   holdPump), and Continue lets it go. No DOM is read back and nothing is decided.

   2026-10-04 (engine fix.affliction-pop-up-words; engine DECISIONS.md 2026-10-03 "the affliction pop-up's 0-Health words
   and its drawbacks come from the engine": "Okay, do it that way."): this file used to write the 0-Health paragraph in
   sentences of its own, read off the rule's shape, and to judge the drawbacks itself (every stat with a minus, every
   written term). Both are the engine's now, so nothing here is a rule's wording or a judgement of what counts against
   the hero; a log recorded before the engine said them is told so in the pop-up, never filled in from here. */
import { MOD_UP, MOD_DOWN } from './theme.js'
import { sgn } from './actions.js'

/* the stat names the panel prints (panel.js), and Bleed-out (engine DECISIONS.md 2026-10-01 'bleed-out is a stat on every
   player unit'); a stat with no name here is shown by the engine's own key — never dropped */
export const AFFL_STAT = { strength: 'Strength', precision: 'Precision', magic: 'Magic', spirit: 'Spirit', maxHp: 'Max HP', maxStamina: 'Max Stamina',
  armor: 'Armor', resist: 'Magic Resist', fireResist: 'Fire Resist', poisonResist: 'Poison Resist', shadowResist: 'Shadow Resist', coldResist: 'Cold Resist',
  movement: 'Move', reach: 'Reach', accuracy: 'Accuracy', dodge: 'Dodge', crit: 'Crit', block: 'Block', rangedBlock: 'Ranged Block',
  luck: 'Luck', toughness: 'Toughness', surge: 'Surge', vision: 'Vision', staminaRegen: 'Stam Regen', bleedOutTurns: 'Bleed-out' }
const PCT = new Set(['accuracy', 'dodge', 'crit', 'block', 'rangedBlock'])

const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const minus = s => String(s).replace('-', '−')
/** one modifier as it is written: "+8 Max HP", "−10% Accuracy" — the number is the event's */
const modText = (stat, n) => minus(sgn(n)) + (PCT.has(stat) ? '%' : '') + ' ' + (AFFL_STAT[stat] || stat)
const mods = m => Object.entries(m || {}).filter(([, n]) => n)
/** what the pop-up says where the log does not state a thing (a battle recorded before the engine said it) */
const UNSAID = '<span class="afflNone">Not stated in this battle&#39;s log.</span>'

/** close the pop-up if one stands; says whether it did */
export function closeAffliction(V) {
  const A = V.affliction; if (!A) return false
  V.affliction = null; A.node.remove(); V.fx.nodes.delete(A.node)
  return true
}

/** the fold's `affliction` cue, on the page: the pop-up stands and the pump is held until Continue */
export function afflictionPopup(V, c) {
  const u = V.S.U[c.id]; if (!u) return
  closeAffliction(V)
  const { ARTMAP, ASSETS } = V.data, art = ARTMAP[c.typeId] || {}
  const before = art.card ? ASSETS[art.card] : null
  const afterFile = art.after ? art.after[c.badgeId] : null, after = afterFile ? ASSETS[afterFile] : null
  const who = esc(u.name), what = esc(c.name || c.badgeId)
  const card = (id, cap, src, none) => `<div class="afflCard" id="${id}"><div class="afflArt">${src
    ? `<img alt="${who} — ${cap}" src="${src}">` : `<span class="afflNoArt">${none}</span>`}</div><div class="afflCap">${cap}</div></div>`
  const all = mods(c.mods), marked = c.drawbacks
  const stat = ([s, n]) => `<span class="afflStat" data-stat="${esc(s)}" data-n="${n}" style="color:${n > 0 ? MOD_UP : MOD_DOWN}">${esc(modText(s, n))}</span>`
  /* the drawbacks are the ones the line marks, in its order: a stat it names (its number the line's own modifier), a
     written term it names (the row's words) — nothing here decides which term counts against the hero */
  const lowered = ((marked && marked.mods) || []).map(s => `<li class="afflLow" data-stat="${esc(s)}">${esc((c.mods || {})[s] ? modText(s, c.mods[s]) : AFFL_STAT[s] || s)}</li>`).join('')
  const terms = ((marked && marked.gaps) || []).map(t => `<li class="afflTerm">${esc(String(t).replaceAll('`', ''))}</li>`).join('')
  const zeroText = c.atZero && typeof c.atZero.text === 'string' ? c.atZero.text : null
  const node = document.createElement('div')
  node.id = 'afflPop'; node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true'); node.setAttribute('aria-labelledby', 'afflTitle')
  node.setAttribute('data-unit', String(c.id)); node.setAttribute('data-badge', c.badgeId)
  node.innerHTML = `<div id="afflBox"><div id="afflHead">Afflicted</div><div id="afflTitle">${who} — ${what}</div>
    <div id="afflBody"><div id="afflCards">${card('afflBefore', 'Before', before, `No card art for ${who} yet.`)}<span class="afflArrow" aria-hidden="true">&rarr;</span>${
      card('afflAfter', 'After', after, `No after art for ${who} with ${what} yet.`)}</div>
    <div id="afflText">
      <div class="afflSec" id="afflStats"><div class="afflH">Stat changes</div><div class="afflRow">${all.length ? all.map(stat).join('') : '<span class="afflNone">None.</span>'}</div></div>
      <div class="afflSec" id="afflDraw"><div class="afflH">Drawbacks</div>${!marked ? UNSAID
        : lowered || terms ? `<ul>${lowered}${terms}</ul>` : '<span class="afflNone">None.</span>'}</div>
      <div class="afflSec" id="afflZero"><div class="afflH">At 0 Health</div>${zeroText === null ? UNSAID : `<p>${esc(zeroText)}</p>`}</div>
    </div></div>
    <div id="afflFoot"><button id="afflClose" type="button" class="pcBtn pcEnd">Continue</button></div></div>`
  /* a press on the pop-up is not the camera's drag, nor a click on the board under it */
  const stop = e => { e.stopPropagation() }
  for (const t of ['pointerdown', 'pointerup', 'click', 'dblclick', 'wheel', 'contextmenu']) node.addEventListener(t, stop)
  V.dom.root.appendChild(node); V.fx.nodes.add(node)
  V.affliction = { node, id: c.id, badgeId: c.badgeId }
  const close = node.querySelector('#afflClose')
  close.addEventListener('click', () => { if (closeAffliction(V)) V.releasePump() })
  V.holdPump()
  close.focus()
}
