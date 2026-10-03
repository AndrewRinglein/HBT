/* ── THE ACTION BAR (UI-BUILD-NOTES §9) and the STAMINA STRIP ─────────────
   12 slots, 3 columns × 4 rows, moves left, attacks middle, powers right,
   overflow filling free slots. Each row is three zones — identity and
   numbers, trigger chips, cooldown hard right. Populated from the subject's
   real static kit; the row for the action the log actually fires lights up.
   Nothing here is computed by the viewer except the two named exemptions
   (dmg-fallback, move-range) in actions.js. Split out 2026-09-02. */
import { icoHTML, actHue, ACT_CLASS } from './icons.js'
import { stStyle } from './theme.js'
import { actionsOf, moveHexes, dmgOf, effectTag, triggersFor } from './actions.js'
import { barUnitOf } from './subject.js'
import { centreOn } from './board.js'

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const TRG_SHOWN = 3                 // collapse past this many
const cell = (k, v, col) => `<div class="acCell"><span class="k">${k}</span><span class="v"${col ? ` style="color:${col}"` : ''}>${v}</span></div>`

/* stamina, directly above the action bar — one pip per point (ruled 2026-09-01) */
export function drawStam(V) {
  const el2 = V.dom.stambar; if (!el2) return
  const id = barUnitOf(V), u = V.S.U[id]   /* viewer.turn-taking: the activated unit's, whoever is in the panel */
  if (!u || !u.maxStam) { el2.innerHTML = ''; return }
  const pips = Array.from({ length: u.maxStam }, (_, i) => `<i class="sPip${i < u.stam ? ' on' : ''}"></i>`).join('')
  el2.innerHTML = `<div class="cell1"><span class="lab">Stamina</span><span class="track">${pips}</span><span class="num">${u.stam} / ${u.maxStam}</span></div>` + swapHTML(V, id)
  /* movement.swap-and-shields: a hand list clicked is offered to the host, which gives the engine its swap command */
  el2.querySelectorAll('.swBtn').forEach(b => b.addEventListener('click', ev => { if (!V.play) return; ev.stopPropagation()
    V.offerPlay({ kind: 'swap', index: Number(b.dataset.swap), unit: id }) }))
}
/* movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements'): the swap on the action bar — beside the stamina
   it is paid from, over the bar's attack and power columns: one button per hand list the host says the engine would take,
   the engine's cost, or with none to make the engine's own reason. Only for the hero the host is planning with; a host
   that hands no swap fact (a hero with nothing to swap, or no host at all) gets none (viewer SWITCHES swapStrip). */
function swapHTML(V, id) {
  const P = V.play, sw = P && P.actor === id ? P.swap : null
  if (!sw) return ''
  const btns = sw.choices.map((c, i) => `<button type="button" class="swBtn" data-swap="${i}" title="Swap: hold ${escape(c.label)} afterwards">${escape(c.label)}</button>`).join('')
  return `<div class="swapCell"><span class="lab">Swap</span>${btns}${sw.choices.length ? `<span class="swCost">${sw.cost} stamina</span>` : `<span class="swWhy">${escape(sw.why || '')}</span>`}</div>`
}

export function drawBar(V) {
  const bar = V.dom.actionbar; if (!bar) return
  const { S, view, data: D } = V, { UD, SN } = D
  const u = S.U[barUnitOf(V)]              /* viewer.turn-taking: the activated unit's bar for its whole Activation */
  /* COLUMNS BY KIND (ruled 2026-09-01); a group longer than 4 overflows */
  const all = actionsOf(u, D)      // the sheet's rows plus the kit the log fielded (unit.equipped)
  const cols = [all.filter(a => a.kind === 'move'), all.filter(a => a.isAttack), all.filter(a => a.isPower)]
  const grid = [[], [], []], spill = []
  cols.forEach((list, c) => { list.forEach((a, i) => i < 4 ? grid[c].push(a) : spill.push(a)) })
  for (const a of spill) { const c = grid.findIndex(g => g.length < 4); if (c < 0) break; grid[c].push(a) }
  const rows = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rows.push(grid[c][r] || null)
  /* two attacks with the SAME display name get their weapon appended */
  const nameCount = {}
  for (const a of all) if (a) nameCount[a.name || a.id] = (nameCount[a.name || a.id] || 0) + 1
  const weaponOf = id => { const p = String(id).split('.'); return p.length > 2 ? p[1] : '' }
  const base = (UD[u?.typeId] || {}).accuracy      // EXEMPTION base-accuracy: the sheet's base, not the live total
  const now = V.clock()
  let html = ''
  for (let i = 0; i < 12; i++) {
    const a = rows[i]
    if (!a) { html += '<div class="acRow empty"></div>'; continue }
    const F = S.FIRING
    const firing = F && F.unit === u.id && F.ability === a.id && (F.until == null || F.until > now)
    /* EXEMPTION cooldown-left: readyOnTurn − the folded turn; the engine
       emits the ready turn, not the count */
    const ready = u.cds ? (u.cds[a.id] || 0) : 0
    const left = Math.max(0, ready - S.turnNo)
    const cool = left > 0
    /* the row accent is the CLASS colour (HANDOFF §1.2) — Law 6 caught the old
       move accent borrowing Slow's hue */
    const accent = ACT_CLASS[a.kind === 'move' ? 'move' : a.isPower ? 'special' : 'melee'].col
    /* DMG is a NUMBER, never a formula (ruled 2026-09-01) */
    const dm = dmgOf(a, u, D)
    const dmg = dm ? String(dm.n) : '—'
    /* reach is `range` on every action since 26fa562 (§11) */
    const rng = a.kind === 'move' ? (() => { const n = moveHexes(a, u, D); return n == null ? '—' : String(n) })()
      : a.range != null ? String(a.range) : '—'
    const stam = a.staminaCost
    /* capability.charges: what the log says is left, else the row's own count */
    const usesLeft = u.charges && u.charges[a.id] != null ? u.charges[a.id] : a.uses
    const acc = a.isAttack ? (base != null ? base : '—') : '—'
    const tag = effectTag(a, u, D, SN)
    const trg = triggersFor(u, a, D, SN, id => stStyle(id, D))
    const tkey = u.id + '|' + a.id, topen = view.TRG_OPEN.has(tkey)
    const hidden = Math.max(0, trg.length - TRG_SHOWN)
    const vis = topen ? trg : trg.slice(0, TRG_SHOWN)
    const chip = t => `<span class="acTrg" style="color:${t.hue};border-color:${t.hue}55">${t.word}` +
      (t.val != null ? `<b>${t.val}</b>` : '') + (t.chance < 100 ? `<i>${t.chance}%</i>` : '') + `</span>`
    const more = hidden > 0 ? `<button class="acMore" data-trg="${tkey}">${topen ? '&#9652; less' : '&#9662; ' + hidden + ' more'}</button>` : ''
    const trgSide = trg.length ? vis.map(chip).join('') + more : ''
    const dupe = nameCount[a.name || a.id] > 1 ? weaponOf(a.id) : ''
    /* viewer.play-input: the action the host says is chosen for the planning hero is lit */
    const chosen = V.play && V.play.slot === a.id && V.play.actor === u.id
    html += `<div class="acRow${firing ? ' firing' : ''}${cool ? ' cool' : ''}${chosen ? ' playChosen' : ''}" data-act="${escape(a.id)}" style="border-left-color:${accent}">
      <div class="acMain">
        <div class="acL1">${icoHTML(a)}
          <span class="acName">${escape(a.name || a.id)}${dupe ? `<span class="acFrom">${dupe}</span>` : ''}</span>
          ${tag ? `<span class="acTag${a.kind === 'burst' ? ' burstTag' : ''}" title="${escape(tag)}">${escape(tag)}</span>` : ''}</div>
        <div class="acL2">
          ${a.kind === 'burst' ? cell('TYPE', 'BURST') : cell('ACC', acc)}${cell('RNG', rng)}
          ${cell('DMG', dmg, (a.attack || a).damageType && dmg !== '—' ? actHue(a).col : null)}${cell('STA', stam != null ? stam : '—')}
        </div>
      </div>
      <div class="acTrgs${topen ? ' open' : ''}">${trgSide}</div>
      <span class="acCd" title="${usesLeft != null ? 'uses left this battle' : 'turns until usable'}">${
        cool ? left : usesLeft != null ? usesLeft + '&times;' : (a.cooldown ? 'cd ' + a.cooldown : '—')}</span>
      </div>`
  }
  bar.innerHTML = html
  bar.querySelectorAll('.acMore').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation()
    const k = b.dataset.trg
    if (view.TRG_OPEN.has(k)) view.TRG_OPEN.delete(k); else view.TRG_OPEN.add(k)
    drawBar(V)
  }))
  /* viewer.play-input: clicking a row offers that action to the host — it chooses it for the acting hero or ignores it */
  /* fix.shield-power-double-click (engine DECISIONS.md 2026-10-01 'a self power fires on a double-click on its bar button'):
     a double-click is the row offered a second time, by its dblclick — the second click of the pair (detail 2) is not offered
     on its own, so a row is never offered three times. When the first click set the host resolving (it began the hero's
     activation, so there are no plan facts and the bar is still), the double-click is held and offered once the host hands
     its facts back (viewer SWITCHES barDoubleClick) */
  bar.querySelectorAll('.acRow').forEach(r => { if (!r.dataset.act) return
    r.addEventListener('click', ev => { if (!V.play) return; ev.stopPropagation(); if (ev.detail > 1) return
      V.heldPlay = null
      const unit = barUnitOf(V); V.offerPlay({ kind: 'slot', actionId: r.dataset.act, unit })
      /* viewer.xcom-camera: "Clicking an ability re-centers on the acting unit" — the one whose bar it is, the one the host acts with */
      centreOn(V, unit) })
    r.addEventListener('dblclick', ev => { ev.stopPropagation()
      const offer = { kind: 'slot', actionId: r.dataset.act, unit: barUnitOf(V) }
      if (V.play) V.offerPlay(offer); else if (V.inputActive()) V.heldPlay = offer }) })
}
