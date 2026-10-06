/* ── THE ACTION BAR (UI-BUILD-NOTES §9) and the STAMINA STRIP ─────────────
   12 slots, 3 columns × 4 rows, moves left, attacks middle, powers right,
   overflow filling free slots. Each row is three zones — identity and
   numbers, trigger chips, cooldown hard right. Populated from the subject's
   real static kit; the row for the action the log actually fires lights up.
   Nothing here is computed by the viewer except the two named exemptions
   (dmg-fallback, move-range) in actions.js. Split out 2026-09-02. */
import { icoHTML, actHue, ACT_CLASS } from './icons.js'
import { stStyle } from './theme.js'
import { actionsOf, moveHexes, dmgOf, effectTag, triggersFor, actionLines, totalsOf } from './actions.js'
import { barUnitOf } from './subject.js'

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
  /* viewer.swap-button-rearranges: the one Swap button opens the gear panel (chrome.js), where the arrangement is chosen and
     confirmed — was: one button per hand list, each offered to the host at once (movement.swap-and-shields) */
  el2.querySelectorAll('.swBtn').forEach(b => b.addEventListener('click', ev => { if (!V.play) return; ev.stopPropagation()
    if (V.openGear) V.openGear() }))
}
/* movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements'): the swap on the action bar — beside the stamina
   it is paid from, over the bar's attack and power columns. Only for the hero the host is planning with; a host that hands
   no swap fact (a hero with nothing to swap, or no host at all) gets none (viewer SWITCHES swapStrip).
   viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the
   unit's gear', Andrew: "The button for swapping should say 'Swap'. And when you press it, it should give you the option to
   rearrange your gear."): ONE button that reads Swap, with the engine's cost beside it — or, with no arrangement the engine
   would take, its own reason. Pressing it opens the gear panel (chrome.js). Was: a 'SWAP' heading over one button per hand
   list ('Nothing in hand', 'Longsword', …), each a fixed exchange. */
function swapHTML(V, id) {
  const P = V.play, sw = P && P.actor === id ? P.swap : null
  if (!sw) return ''
  const can = sw.choices.length > 0
  return `<div class="swapCell"><button type="button" class="swBtn${can ? '' : ' swNone'}" title="Rearrange what this unit holds and what it has stowed">Swap</button>${can ? `<span class="swCost">${sw.cost} stamina</span>` : `<span class="swWhy">${escape(sw.why || '')}</span>`}</div>`
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
  /* viewer.prone-turn-only-stand-up (engine DECISIONS.md 2026-10-05 'playtest post: …', Andrew: "if you are downed, when it's
     that character's next turn, everything needs to be grayed out except 'stand up'."): the rows that wait on the unit's
     stand are the HOST'S word (play facts' standFirst — the engine's limits check, asked by the host), for the unit acting
     only. The stand itself — the action a status the unit holds grants (the dump's statusRows; actions.js actionsOf put it on
     the bar) — is never greyed, whatever a host names: it is the way up. Nothing about being down is worked out here. */
  const stands = new Set(Object.keys((u && u.st) || {}).filter(sid => u.st[sid] > 0).map(sid => ((D.STATUS_ROWS || {})[sid] || {}).standAction).filter(Boolean))
  const waiting = !!V.play && !!u && V.play.actor === u.id ? V.play.standFirst.filter(id => !stands.has(id)) : []
  const standName = (all.find(a => stands.has(a.id)) || {}).name
  /* viewer.unaffordable-actions-greyed (engine DECISIONS.md 2026-10-05 'a prone unit only stands; …; what cannot be paid is greyed; …', Andrew: "If a tax can't be paid for or a power can't be paid for, it should be grayed out." ('tax' is 'attack' - dictation)): the rows the
     acting unit cannot pay for now are the HOST'S word too (play facts' cantPay — the engine's limits check, asked by the
     host, each with the line that says why). Nothing about Stamina, a cooldown or a use is worked out here for it: with no
     word from the host a row is as it was (a replay still shows the fold's cooldown count, below). */
  const unpaid = new Map(!!V.play && !!u && V.play.actor === u.id ? V.play.cantPay.map(c => [c.id, c.why]) : [])
  /* viewer.attack-row-shows-totals (engine DECISIONS.md 2026-10-06, Andrew: "the attack shows the total critical. The same thing
     is true of accuracy."): the row's Accuracy and then its Crit are TOTALS for this unit's attack — the engine's own figures
     where a host plays (V.attackTotals), else actions.js totalsOf. It printed the sheet's base Accuracy and no Crit. */
  const given = typeof V.attackTotals === 'function' && u ? V.attackTotals(u.id) : null
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
    const T = a.isAttack ? totalsOf(a, u, D, given) : null
    const acc = T ? T.accuracy : '—', crit = T && T.crit != null ? T.crit : '—'
    const tag = effectTag(a, u, D, SN)
    const trg = triggersFor(u, a, D, SN, id => stStyle(id, D))
    const tkey = u.id + '|' + a.id, topen = view.TRG_OPEN.has(tkey)
    const hidden = Math.max(0, trg.length - TRG_SHOWN)
    const vis = topen ? trg : trg.slice(0, TRG_SHOWN)
    /* viewer.bar-shows-every-effect: a chip says the whole of what it stands for on hover ("On attack: gain 1 Protection") */
    const chip = t => `<span class="acTrg"${t.title ? ` title="${escape(t.title)}"` : ''} style="color:${t.hue};border-color:${t.hue}55">${escape(t.word)}` +
      (t.val != null ? `<b>${escape(t.signed && typeof t.val === 'number' && t.val > 0 ? '+' + t.val : t.val)}</b>` : '') + (t.chance < 100 ? `<i>${t.chance}%</i>` : '') + `</span>`
    const more = hidden > 0 ? `<button class="acMore" data-trg="${tkey}">${topen ? '&#9652; less' : '&#9662; ' + hidden + ' more'}</button>` : ''
    const trgSide = trg.length ? vis.map(chip).join('') + more : ''
    const dupe = nameCount[a.name || a.id] > 1 ? weaponOf(a.id) : ''
    /* viewer.play-input: the action the host says is chosen for the planning hero is lit */
    const chosen = V.play && V.play.slot === a.id && V.play.actor === u.id
    /* viewer.bar-shows-every-effect (engine DECISIONS.md 2026-10-03 'every action shows all it does'): the row's tooltip is the
       whole of the action, a line per fact (actions.js actionLines); the button shows what fits */
    /* viewer.bar-moves-grey-when-done (engine DECISIONS.md 2026-10-03 'the moves grey slightly once the move is done, nothing
       else greys'): a MOVE row the host says is done for this Activation is slightly greyed — the host's word (play facts'
       moveDone, from the engine), for the unit acting only, and never an attack or a power. A row the engine refuses (on
       cooldown) keeps the disabled look instead: the two are told apart at a glance (styles.css .moveDone, .cool) */
    const standFirst = waiting.includes(a.id)
    /* one reason at a time: a row that waits on the stand says that; otherwise the host's line for what cannot be paid */
    const cantPay = !standFirst && unpaid.has(a.id)
    const moveDone = !cool && !standFirst && a.kind === 'move' && !!V.play && V.play.actor === u.id && V.play.moveDone.includes(a.id)
    const whole = actionLines(a, u, D, SN, given).join('\n') + (moveDone ? '\nThis move is done for this Activation.' : '')
      + (standFirst ? '\nKnocked down: ' + (standName || 'stand up') + ' first.' : '') + (cantPay ? '\n' + unpaid.get(a.id) : '')
    html += `<div class="acRow${firing ? ' firing' : ''}${cool ? ' cool' : ''}${moveDone ? ' moveDone' : ''}${standFirst ? ' standFirst' : ''}${cantPay ? ' cantPay' : ''}${chosen && !standFirst && !cantPay ? ' playChosen' : ''}" data-act="${escape(a.id)}"${standFirst || cantPay ? ' aria-disabled="true"' : ''} title="${escape(whole)}" style="border-left-color:${accent}">
      <div class="acMain">
        <div class="acL1">${icoHTML(a)}
          <span class="acName">${escape(a.name || a.id)}${dupe ? `<span class="acFrom">${dupe}</span>` : ''}</span>
          ${tag ? `<span class="acTag${a.kind === 'burst' ? ' burstTag' : ''}" title="${escape(tag)}">${escape(tag)}</span>` : ''}</div>
        <div class="acL2">
          ${a.kind === 'burst' ? cell('TYPE', 'BURST') : cell('ACC', acc) + (a.isAttack ? cell('CRIT', crit) : '')}${cell('RNG', rng)}
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
      /* viewer.ability-click-keeps-view (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … Clicking an ability
         no longer re-centres the view on the acting unit', Andrew: "3 yes" — overturning viewer.xcom-camera's 2026-10-01
         "Clicking an ability re-centers on the acting unit"): the click chooses the action and the view stays where the
         player has it — a player who scrolled to look at a target and then picks the attack still sees the target. The way
         back is the portrait's click (viewer.js) and a card's in the top bar (rail.js). */ })
    r.addEventListener('dblclick', ev => { ev.stopPropagation()
      const offer = { kind: 'slot', actionId: r.dataset.act, unit: barUnitOf(V) }
      if (V.play) V.offerPlay(offer); else if (V.inputActive()) V.heldPlay = offer }) })
}
