/* ── THE PANEL — whoever is acting, or whoever was clicked ─────────────────
   PANEL ORDER (UI-BUILD-NOTES §9.1, rebuilt 2026-09-01): identity → vitals →
   STATS ABOVE THE CARD → card art with STATUSES TO ITS RIGHT → KEYWORDS BELOW
   THE PICTURE. The action bar owns actions (§9.7). Split out 2026-09-02. */
import { stStyle } from './theme.js'
import { sgn, STATSHORT } from './actions.js'

const HOOKLBL = { onHit: 'ON HIT', onAttack: 'ON ATTACK', onDamage: 'ON DAMAGE',
  onTakingDamage: 'WHEN HIT', onKill: 'ON KILL', onDeath: 'ON DEATH', onMiss: 'ON MISS',
  onCrit: 'ON CRIT', startOfBattle: 'BATTLE START', onActivationEnd: 'ACTIVATION END' }

export function subjectOf(V) {
  const { S, view } = V
  return view.inspectId != null ? view.inspectId : S.subjectId != null ? S.subjectId : Object.keys(S.U)[0]
}

export function drawPanel(V) {
  const P = V.dom.panel; if (!P) return
  const { S, view, data: { UD, SN, POS, F, ARTMAP, ASSETS } } = V
  const sid = subjectOf(V)
  const u = S.U[sid]; if (!u) { P.innerHTML = ''; return }
  const d = UD[u.typeId] || {}
  P.className = u.side === 'enemy' ? 'enemy' : ''
  const acc = u.side === 'hero' ? 'var(--gold)' : 'var(--violet)'
  const subj = view.inspectId != null ? 'inspect' : S.subjectMode
  const SUBJ = { acting: ['activating', 'whoever is acting is on the right'],
    target: ['target', 'being resolved right now'],
    inspect: ['inspecting', 'click — the acting unit takes this back'] }[subj]
  /* STAT BLOCK (layout B, ruled 2026-09-01): name left, figure hard right, two
     columns. GREEN when a live modifier raises the stat, RED when one lowers
     it — read off statmod.added, never guessed. Accuracy, Dodge, Crit carry %. */
  const modOf = k => (u.mods || []).reduce((n, m) => n + (m.stat === k ? (m.value || 0) : 0), 0)
  const PCT = new Set(['accuracy', 'dodge', 'crit'])
  const stat = (label, value, statKey) => {
    const dlt = statKey ? modOf(statKey) : 0
    const col = dlt > 0 ? '#7ec45f' : dlt < 0 ? '#d1665c' : '#e8e5dc'
    const shown = value == null ? '—' : (statKey && PCT.has(statKey) ? String(value) + '%' : String(value))
    const dl = dlt === 0 ? '' : `<em>${sgn(dlt)}</em>`
    return `<div class="stRow"><span class="stN">${label}</span><span class="stV" style="color:${col}">${dl}${shown}</span></div>`
  }
  const twoCols = rows => { const h = Math.ceil(rows.length / 2)
    return `<div class="stCols"><div>${rows.slice(0, h).join('')}</div><div>${rows.slice(h).join('')}</div></div>` }
  const card = ASSETS[(ARTMAP[u.typeId] || {}).card]
  const sts = Object.entries(u.st).filter(([, v]) => v > 0)
  const stCol = sts.length ? sts.map(([id, v]) => { const st = stStyle(id)
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:5px;
        background:${st.hue}12;border:1px solid ${st.hue}44;border-radius:3px">
        <i style="width:14px;height:14px;flex:0 0 14px;display:block;clip-path:${st.gl};background:${st.hue}"></i>
        <span style="flex:1;font-size:12.5px;color:${st.hue};font-weight:600">${SN[id] || id}</span>
        <span class="mono" style="font-size:14px;font-weight:700;color:${st.hue}">${v}</span></div>` }).join('')
    : '<div style="font-size:11.5px;color:#5f594c;padding:6px 2px">no status effects</div>'
  const now = V.now()
  /* triggers grouped BY HOOK per §4; a trigger's effect lives in t.effect */
  const trigByHook = {}
  for (const t of (d.triggers || [])) (trigByHook[t.hook] = trigByHook[t.hook] || []).push(t)
  const trigCol = Object.entries(trigByHook).map(([hook, list]) => {
    const rows = list.map(t => {
      const ef = t.effect || {}
      const st = ef.statusId ? stStyle(ef.statusId) : { hue: '#d6b25e' }
      const who = t.select === 'self' ? ' on self' : t.select === 'target' ? '' : ' → ' + t.select
      const eff = ef.kind === 'status.apply'
          ? `${SN[ef.statusId] || String(ef.statusId || '').replace(/^(test\.)?status\./, '')} +${ef.value ?? 1}${who}`
        : ef.kind === 'damage' ? `${ef.amount ?? ef.value ?? ''} ${ef.damageType || ''} damage${who}`
        : ef.kind === 'knockback' ? `knock back ${ef.hexes ?? 1}`
        : ef.kind === 'heal' ? `heal ${ef.value ?? ''}${who}` : (ef.kind || '—')
      const TF = S.TRIGFLASH
      const firing = TF && TF.unit === u.id && TF.id === t.id && TF.until > now
      return `<div style="display:flex;align-items:center;gap:7px;padding:5px 8px;margin-bottom:4px;
        background:${firing ? '#3a2c14' : st.hue + '0d'};border:1px solid ${firing ? '#ffd98a' : st.hue + '3a'};border-radius:3px;
        ${firing ? 'box-shadow:0 0 12px rgba(255,200,110,.55);' : ''}">
        <i style="width:9px;height:9px;flex:0 0 9px;display:block;clip-path:${st.gl || 'circle(50%)'};background:${st.hue}"></i>
        <span style="flex:1;font-size:11.5px;color:${st.hue};font-weight:600;line-height:1.25">${eff}</span>
        ${t.chance != null && t.chance < 100 ? `<span class="mono" style="font-size:10.5px;color:var(--dim)">${t.chance}%</span>` : ''}
      </div>` }).join('')
    return `<div style="margin-bottom:8px">
      <div style="font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#8b8778;margin-bottom:4px">
        ${HOOKLBL[hook] || hook}</div>${rows}</div>`
  }).join('')
  const tagChips = (d.tags || d.attributes || [])
  const KWNOTE = `<div style="font-size:10.5px;color:#5f594c;line-height:1.45;padding:2px 2px 8px">
    Named keywords (Berserker, Firebringer) live in the content layer's badges and
    specialties — the engine's unit defs carry only creature tags, so they cannot be
    shown until that export exists.</div>`
  const statsOpen = view.statsOpen
  const ev = V.EV, cursor = V.cursor
  P.innerHTML = `
  <div class="pTooth"></div>
  <div class="pSubject ${subj}"><b>${SUBJ[0]}</b><span>${SUBJ[1]}</span></div>
  <div class="pId"><div class="pName" style="color:${acc}">${u.name}</div>
    <div class="pRole">${u.typeId} · ${d.role || ''}</div>
    <div class="pHex">hex ${u.hex} (${POS[u.hex].c},${POS[u.hex].r}) · ${F.terrainIds[u.hex].replace('terrain.', '')}${u.life !== 'standing' ? ' · <b style="color:#ff8f8f">' + u.life.toUpperCase() + '</b>' : ''}</div></div>
  <div class="pBlock">
    <div class="vitRow"><span class="vitLab">HP</span>
      <span class="vitTrack"><span class="vitFill" style="width:${Math.max(0, 100 * u.hp / u.maxHp)}%;background:${u.hp / u.maxHp < .34 ? '#d1665c' : u.hp / u.maxHp < .67 ? '#d6b25e' : '#7ec45f'}"></span></span>
      <span class="vitNum mono">${u.hp} / ${u.maxHp}</span></div>
    ${(() => { const pr = u.st['status.protection'] || u.st['test.status.ward'] || 0
      return pr > 0 ? `<div class="vitRow"><span class="vitLab">Prot</span>
      <span class="vitTrack"><span class="vitFill" style="width:${Math.min(100, pr * 12)}%;background:#5aa8d8"></span></span>
      <span class="vitNum mono">${pr}</span></div>` : '' })()}
  </div>
  <div class="pBlock" style="padding:0;border:none;background:none">
    ${twoCols([
      stat('Move', d.movement, 'movement'), stat('Armor', d.armor, 'armor'),
      stat('Resist', d.resist, 'resist'), stat('Dodge', d.dodge, 'dodge'),
      stat('Max HP', d.maxHp, 'maxHp'),
      stat('Accuracy', d.accuracy, 'accuracy'), stat('Crit', d.crit ?? 0, 'crit'),
      stat('Strength', d.strength, 'strength'), stat('Precision', d.precision, 'precision'),
      stat('Stam Regen', d.staminaRegen, 'staminaRegen'),
    ])}
    <button class="statsToggle" style="width:100%;margin-top:6px;padding:5px 8px;cursor:pointer;
      background:#14120e;border:1px solid var(--border);border-radius:2px;color:var(--dim);
      font:600 10.5px 'Barlow Semi Condensed',sans-serif;letter-spacing:.11em;
      text-transform:uppercase;text-align:left">
      ${statsOpen ? '▾' : '▸'} ${statsOpen ? 'Hide' : 'All'} stats</button>
    ${statsOpen ? `<div style="margin-top:8px">${twoCols([
      stat('Magic', d.magic, 'magic'), stat('Spirit', d.spirit, 'spirit'),
      stat('Reach', d.reach, 'reach'), stat('Luck', d.luck ?? 0, 'luck'),
      stat('Max Stamina', d.maxStamina, 'maxStamina'),
      stat('Vision', null), stat('Deathbed', null), stat('Hex', u.hex),
    ])}</div>
    <div style="margin-top:6px;padding:6px 9px;background:#1a1410;border-left:2px solid #6b5a33;
      font-size:10.5px;line-height:1.5;color:#8b8778">
      <b style="color:#c8bfa4">Vision</b> and <b style="color:#c8bfa4">Deathbed Fighting</b> have
      no engine values yet — Vision is open gap L-3a (no vision model, which also blocks
      darkness and fog), and Deathbed Fighting is designed in content with no engine stat
      behind it. Shown here so their absence is visible rather than silent.
    </div>
    <div style="margin-top:7px;padding:7px 9px;background:#14120e;border:1px solid var(--border);
      border-radius:2px;font-size:11.5px;line-height:1.6;color:#a9a394">
      <b style="color:#cbc3ae">Role</b> ${d.role || '—'} &nbsp;·&nbsp;
      <b style="color:#cbc3ae">AI</b> ${d.ai || '—'}<br>
      <b style="color:#cbc3ae">Tags</b> ${(d.tags || []).join(', ') || '—'}<br>
      <b style="color:#cbc3ae">Attributes</b> ${(d.attributes || []).join(', ') || '—'}
      ${(u.mods || []).length ? `<br><b style="color:#cbc3ae">Live modifiers</b> ` +
        u.mods.map(m => `${STATSHORT[m.stat] || m.stat} ${sgn(m.value)} <span style="color:#6f6857">(${m.source})</span>`).join(' · ') : ''}
    </div>` : ''}
  </div>
  ${card ? `<div class="pArtWrap">
    <div class="pArt" style="width:216px;height:324px;flex:0 0 216px"><img src="${card}" alt=""></div>
    <div class="pSide" style="overflow-y:auto;max-height:324px">
      <div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Status effects</div>
      ${stCol}
    </div></div>`
  : `<div style="padding:0 18px 12px">
      <div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Status effects</div>${stCol}</div>`}
  <div class="pAb">
    <div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:2px 0 7px">Keywords</div>
    ${tagChips.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px">${
      tagChips.map(t => `<span style="font:600 11px 'Barlow Semi Condensed',sans-serif;letter-spacing:.05em;
        padding:2px 8px;border-radius:2px;background:#221c12;border:1px solid #3a3223;color:#cbb9a0">${t}</span>`).join('')}</div>` : ''}
    ${KWNOTE}
    ${trigCol ? `<div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:4px 0 6px">⚡ Triggers</div>${trigCol}` : ''}
    ${(u.injuries || []).length ? `<div class="pInjuries" style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#d1665c;margin:10px 0 6px">✶ Critical injuries</div>` +
      u.injuries.map(n => `<div style="font:600 12px 'Barlow Semi Condensed',sans-serif;color:#ffb0a4;padding:4px 8px;margin-bottom:4px;background:#1d100e;border:1px solid #4a2320;border-radius:3px">${n}</div>`).join('') : ''}
    ${(u.mods || []).length ? `<div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:10px 0 6px">Modifiers</div>` +
      u.mods.map(m => `<div style="font:600 11.5px 'Barlow Semi Condensed',sans-serif;color:#cbb9a0;padding:3px 8px;margin-bottom:4px;background:#16130e;border:1px solid #2b2418;border-radius:3px">${m.stat} ${sgn(m.value)} <span style="color:#6f6857">· ${m.source}</span></div>`).join('') : ''}
  </div>
  <div class="pFoot">event ${cursor} of ${ev.length} · seq ${ev[Math.min(cursor, ev.length - 1)]?.seq ?? '—'}</div>`
  /* reattached every rebuild — the panel replaces its own innerHTML */
  const tg = P.querySelector('.statsToggle')
  if (tg) tg.addEventListener('click', ev2 => { ev2.stopPropagation(); view.statsOpen = !view.statsOpen; drawPanel(V) })
}
