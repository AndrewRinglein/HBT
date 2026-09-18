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
import { subjectOf } from './subject.js'

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const TRG_SHOWN = 3                 // collapse past this many
const cell = (k, v, col) => `<div class="acCell"><span class="k">${k}</span><span class="v"${col ? ` style="color:${col}"` : ''}>${v}</span></div>`

/* stamina, directly above the action bar — one pip per point (ruled 2026-09-01) */
export function drawStam(V) {
  const el2 = V.dom.stambar; if (!el2) return
  const u = V.S.U[subjectOf(V)]
  if (!u || !u.maxStam) { el2.innerHTML = ''; return }
  const pips = Array.from({ length: u.maxStam }, (_, i) => `<i class="sPip${i < u.stam ? ' on' : ''}"></i>`).join('')
  el2.innerHTML = `<div class="cell1"><span class="lab">Stamina</span><span class="track">${pips}</span><span class="num">${u.stam} / ${u.maxStam}</span></div>`
}

export function drawBar(V) {
  const bar = V.dom.actionbar; if (!bar) return
  const { S, view, data: D } = V, { UD, SN } = D
  const u = S.U[subjectOf(V)]
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
    const trg = triggersFor(u, a, D, SN, stStyle)
    const tkey = u.id + '|' + a.id, topen = view.TRG_OPEN.has(tkey)
    const hidden = Math.max(0, trg.length - TRG_SHOWN)
    const vis = topen ? trg : trg.slice(0, TRG_SHOWN)
    const chip = t => `<span class="acTrg" style="color:${t.hue};border-color:${t.hue}55">${t.word}` +
      (t.val != null ? `<b>${t.val}</b>` : '') + (t.chance < 100 ? `<i>${t.chance}%</i>` : '') + `</span>`
    const more = hidden > 0 ? `<button class="acMore" data-trg="${tkey}">${topen ? '&#9652; less' : '&#9662; ' + hidden + ' more'}</button>` : ''
    const trgSide = trg.length ? vis.map(chip).join('') + more : ''
    const dupe = nameCount[a.name || a.id] > 1 ? weaponOf(a.id) : ''
    html += `<div class="acRow${firing ? ' firing' : ''}${cool ? ' cool' : ''}" data-act="${escape(a.id)}" style="border-left-color:${accent}">
      <div class="acMain">
        <div class="acL1">${icoHTML(a)}
          <span class="acName">${escape(a.name || a.id)}${dupe ? `<span class="acFrom">${dupe}</span>` : ''}</span>
          ${tag ? `<span class="acTag${a.burst ? ' burstTag' : ''}" title="${escape(tag)}">${escape(tag)}</span>` : ''}</div>
        <div class="acL2">
          ${a.burst ? cell('TYPE', 'BURST') : cell('ACC', acc)}${cell('RNG', rng)}
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
}
