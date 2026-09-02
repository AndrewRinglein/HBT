// SLICE.html — the slice's screens, one self-contained page (ruled 2026-09-01).
//
//   load a save → Combat Prep (Reveal → War Council → Deploy → Equip) → the
//   battle screen: the map and every unit, still → the outcome panel: set
//   everything a battle could have decided → the tally: the proposed Reckoning,
//   every value editable → (M4) the one writer applies it → back to the Week.
//
// Every screen renders from a viewX() read-model and acts through performX()
// — the page never reaches into CampaignState (GLOSSARY.md, Components). The
// save is the Campaign as JSON: the browser keeps the latest, and Download
// writes it to a file. Combat is not played here; the engine is invoked for
// setup only (viewBattle), and the result the panel builds is the same shape
// the engine's fold produces (src/core/result.ts).

import { campaignOf, saveOf, type CampaignState, type Hero } from '../core/campaign.js'
import { makeCtx, setBattleOutcome, setCursor, type Ctx } from '../core/mutate.js'
import {
  beginCombatPrep, viewCombatPrep, performAdvancePrep, performCouncil,
  canDeploy, canUndeploy, performDeploy, performUndeploy,
} from '../core/prep.js'
import { viewBattle, type BattleView } from '../view/battle.js'
import { makeBlankResult, withUnitFate, validateResult } from '../core/result.js'
import { resolveReckoning, applyBattleResult, performExitBattle, resolveDifficulty, type Reckoning } from '../core/reckoning.js'
import { woundNameOf } from '../content/wounds.js'
import type { EngagementResult, UnitTally } from '../core/seam.js'
import { PREP_STEP_ROWS } from '../content/prep.js'
import { UNITS } from '../engine.js'

declare const __FIXTURE_JSON__: string
declare const __BUILD_SHA__: string

const SAVE_KEY = 'hobat-kingdom-save'

type App = {
  ctx: Ctx | null
  /** The outcome panel's working result, before it is set on the cursor. */
  draft: EngagementResult | null
  /** The tally's working Reckoning, editable. */
  draftReckoning: Reckoning | null
  status: string
  error: boolean
}
const app: App = { ctx: null, draft: null, draftReckoning: null, status: '', error: false }

// ── persistence ─────────────────────────────────────────────────────────────
function persist(): void {
  if (!app.ctx) return
  try { localStorage.setItem(SAVE_KEY, saveOf(app.ctx.campaign)) } catch { /* a private window; the download still works */ }
}
function loadJson(json: string, from: string): void {
  try {
    app.ctx = makeCtx(campaignOf(json))
    app.draft = null; app.draftReckoning = null
    if (app.ctx.campaign.cursor.step === 'prep' && app.ctx.campaign.cursor.prepStep === null) beginCombatPrep(app.ctx, 'slice-load')
    note(`loaded ${from} — week ${app.ctx.campaign.week}, ${app.ctx.campaign.cursor.step}${app.ctx.campaign.cursor.prepStep ? '/' + app.ctx.campaign.cursor.prepStep : ''}`)
    persist()
  } catch (e) { fail(`could not load ${from}: ${(e as Error).message}`) }
  render()
}
function download(): void {
  if (!app.ctx) return
  const blob = new Blob([JSON.stringify(JSON.parse(saveOf(app.ctx.campaign)), null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `hobat-save-week-${app.ctx.campaign.week}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
const note = (s: string) => { app.status = s; app.error = false }
const fail = (s: string) => { app.status = s; app.error = true }
/** Run a mutation; a refusal (Law 9) becomes a visible status line, never a silent no-op. */
function act(f: () => void): void {
  try { f(); note(''); persist() } catch (e) { fail((e as Error).message) }
  render()
}

// ── rendering ───────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const nameOf = (typeId: string) => UNITS[typeId]?.name ?? typeId

function render(): void {
  const root = document.getElementById('app')!
  const c = app.ctx?.campaign ?? null
  root.innerHTML = `
    <h1>Heroes of Blight and Tragic — the slice</h1>
    <p class="meta">load a save · Combat Prep · the battle, shown not fought · set what happened · the Reckoning. Built at kingdom ${esc(__BUILD_SHA__)}.</p>
    <div class="bar">
      <button data-act="load-fixture">Load the fixture</button>
      <label class="file">Load a save <input type="file" accept=".json,application/json" data-act="load-file"></label>
      <button data-act="download" ${c ? '' : 'disabled'}>Download save</button>
      <button class="quiet" data-act="forget">Forget browser save</button>
      <span class="sp"></span>
      ${c ? `<span class="tag">week ${c.week}</span> <span class="tag">${esc(c.cursor.stage)}</span> <span class="tag">${esc(c.cursor.step)}${c.cursor.prepStep ? '/' + c.cursor.prepStep : ''}</span> <span class="tag">renown ${c.renown}</span>` : ''}
    </div>
    <div class="status${app.error ? ' err' : ''}">${esc(app.status)}</div>
    ${c ? screen(c) : `<div class="card"><p>No Campaign loaded. Load the fixture — a Campaign at Combat Prep, week 3, a Conquer on the Ridge — or a save you downloaded earlier.</p></div>`}
  `
  wire(root)
}

function screen(c: CampaignState): string {
  switch (c.cursor.step) {
    case 'prep': return prepScreen(c)
    case 'battle': return c.cursor.battle?.resultSet ? tallyScreen(c) : battleScreen(c)
    case 'reckoning': return appliedScreen(c)
    default: return `<div class="card"><p>The cursor is at <code>${esc(c.cursor.step)}</code>, week ${c.week}, ${esc(c.cursor.stage)}. The Engagement is done and written; the Week machine — the six Stages — lands next. Download the save to keep it.</p>
      <p class="meta">Renown ${c.renown} · losses ${c.losses} · difficulty ${resolveDifficulty(c)} · ${Object.values(c.roster).filter((h) => h.lifeState === 'alive').length} alive</p></div>`
  }
}

// ── Combat Prep ─────────────────────────────────────────────────────────────
function prepScreen(c: CampaignState): string {
  const v = viewCombatPrep(c)
  const at = PREP_STEP_ROWS.findIndex((r) => r.step === v.step)
  const steps = PREP_STEP_ROWS.map((r, i) => `<span class="${i === at ? 'on' : i < at ? 'done' : ''}">${i + 1} · ${esc(r.title)}</span>`).join('')
  let body = ''
  if (v.step === 'reveal') {
    body = `<h3>The enemy</h3><table><tr><th>#</th><th>unit</th><th>id</th></tr>${v.enemies.map((t, i) => `<tr><td class="n">${i + 1}</td><td>${esc(nameOf(t))}</td><td><code>${esc(t)}</code></td></tr>`).join('')}</table>
      <h3>Condition</h3><p>${v.condition ? `<code>${esc(v.condition)}</code>` : 'none this battle'}</p>`
  } else if (v.step === 'council') {
    body = `<h3>Pick one of three — or skip</h3><div class="pick">${v.councilOffer.map((t) => `<div class="opt${v.tactic === t.id ? ' on' : ''}" data-act="council" data-id="${esc(t.id)}"><b>${esc(t.name)}</b><small><code>${esc(t.id)}</code> · does nothing yet — a placeholder until tactic.* is declared</small></div>`).join('')}</div>
      <p class="meta">${v.tactic ? `taken: <code>${esc(v.tactic)}</code>` : 'nothing taken'}</p>`
  } else if (v.step === 'deploy') {
    const heroes = Object.values(c.roster).sort((a, b) => a.id.localeCompare(b.id))
    body = `<h3>Deploy — ${v.deployed.length} of ${v.deployLimit}</h3><div class="roster">${heroes.map((h) => heroCard(c, h, v.deployed.includes(h.id))).join('')}</div>`
  } else {
    body = `<h3>Equip</h3><p>Nothing is priced yet — the Forge's shelf arrives with the purse. The step exists so the order is the design; advance.</p>`
  }
  return `<h2>Combat Prep — ${esc(v.stepTitle)}</h2>
    <p class="meta"><code>${esc(v.engagementId)}</code> · ${esc(v.kind)} · ${esc(v.territoryId)} · ${esc(v.mapId)}</p>
    <div class="steps">${steps}</div>
    <div class="card">${body}</div>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="advance" ${v.canAdvance ? '' : 'disabled'}>${at + 1 < PREP_STEP_ROWS.length ? 'Next — ' + esc(PREP_STEP_ROWS[at + 1]!.title) : 'To the battle'}</button></div>`
}
function heroCard(c: CampaignState, h: Hero, on: boolean): string {
  const can = on ? canUndeploy(c, h.id) : canDeploy(c, h.id)
  return `<div class="h${on ? ' on' : ''}${can ? '' : ' off'}" data-act="${on ? 'undeploy' : 'deploy'}" data-id="${esc(h.id)}"><b>${esc(h.name)}</b><small>${esc(h.classes.join(', '))} · L${h.level} · ${h.wound ? 'wound ' + h.wound : 'whole'} · ${esc(h.unitType)}</small></div>`
}

// ── the battle screen ───────────────────────────────────────────────────────
const TERRAIN_FILL: [RegExp, string][] = [
  [/water|river|lake/, '#2b4a63'], [/forest|thicket|wood/, '#2f4a2c'], [/hill|high/, '#5a4a36'],
  [/rock|rubble|ruin/, '#4a4340'], [/wall|impass|cliff/, '#1a1614'], [/ember|fire|burn/, '#6a3018'],
  [/mud|swamp|bog/, '#3b3524'], [/road|path/, '#4e4636'], [/open|grass|field|plain|ground/, '#2b2f22'],
]
const fillOf = (id: string) => TERRAIN_FILL.find(([re]) => re.test(id))?.[1] ?? '#262220'

function boardSvg(v: BattleView): string {
  const S = 0.28, COL = 128 * S, ROW = 96 * S, ODD = 64 * S, W = 128 * S, H = 132 * S
  const width = v.width * COL + ODD + 8, height = (v.height - 1) * ROW + H + 8
  const hexPath = (cx: number, cy: number) => {
    const pts: string[] = []
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); pts.push(`${(cx + (W / 2) * Math.cos(a)).toFixed(1)},${(cy + (H / 2) * Math.sin(a)).toFixed(1)}`) }
    return pts.join(' ')
  }
  const centre = (col: number, row: number) => ({ cx: 4 + COL / 2 + col * COL + (row % 2) * ODD, cy: 4 + H / 2 + row * ROW })
  let hexes = ''
  for (let row = 0; row < v.height; row++) for (let col = 0; col < v.width; col++) {
    const id = row * v.width + col
    const { cx, cy } = centre(col, row)
    hexes += `<polygon points="${hexPath(cx, cy)}" fill="${fillOf(v.terrain[id] ?? '')}" stroke="#0c0a09" stroke-width="1"><title>${esc(v.terrain[id] ?? '')} · hex ${id} (${col},${row})</title></polygon>`
  }
  let units = ''
  for (const u of v.units) {
    const { cx, cy } = centre(u.col, u.row)
    const fill = u.side === 'hero' ? '#c9a227' : '#c05a4e'
    const label = u.side === 'hero' ? 'H' + (u.index + 1) : 'E' + (u.index + 1)
    units += `<g><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(W * 0.34).toFixed(1)}" fill="${fill}" stroke="#000" stroke-width="1.2"/><text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#14110f">${label}</text><title>${esc(u.name)} · ${esc(u.typeId)} · hp ${u.hp}/${u.maxHp} · hex ${u.hex}</title></g>`
  }
  const kinds = [...new Set(v.terrain)].sort()
  return `<div class="board"><svg viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" width="${width.toFixed(0)}" height="${height.toFixed(0)}">${hexes}${units}</svg></div>
    <div class="legend">${kinds.map((k) => `<span><i style="background:${fillOf(k)}"></i>${esc(k)}</span>`).join('')}<span><i style="background:#c9a227"></i>hero</span><span><i style="background:#c05a4e"></i>enemy</span></div>`
}

function battleScreen(c: CampaignState): string {
  const v = viewBattle(c)
  const heroes = v.units.filter((u) => u.side === 'hero'), enemies = v.units.filter((u) => u.side === 'enemy')
  if (!app.draft || app.draft.id !== v.engagementId) {
    app.draft = makeBlankResult(v.engagementId, 'heroClear', heroes.map((u) => ({ typeId: u.typeId, name: u.name })), enemies.map((u) => ({ typeId: u.typeId, name: u.name })))
    // the default toggle is a win: every enemy dead, every hero standing
    enemies.forEach((_, i) => { app.draft = withUnitFate(app.draft!, 'enemy', i, { lifeState: 'dead' }) })
  }
  const d = app.draft
  const unitRow = (u: UnitTally) => {
    const life = u.side === 'hero' ? ['standing', 'downed', 'dead'] : ['standing', 'dead']
    return `<tr>
      <td><span class="tag ${u.side}">${u.side === 'hero' ? 'H' : 'E'}${u.index + 1}</span> ${esc(u.name)}</td>
      <td><select data-fate="lifeState" data-side="${u.side}" data-index="${u.index}">${life.map((l) => `<option value="${l}"${u.lifeState === l ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><input type="number" min="0" step="1" value="${u.damageTaken}" data-fate="damageTaken" data-side="${u.side}" data-index="${u.index}"></td>
      <td><input type="number" min="0" step="1" value="${u.damageDealt}" data-fate="damageDealt" data-side="${u.side}" data-index="${u.index}"></td>
      <td><input type="number" min="0" step="1" value="${u.kills}" data-fate="kills" data-side="${u.side}" data-index="${u.index}"></td>
    </tr>`
  }
  return `<h2>The battle — ${esc(v.mapId)}</h2>
    <p class="meta"><code>${esc(v.engagementId)}</code> · ${esc(v.kind)} · ${heroes.length} heroes, ${enemies.length} enemies, placed by the engine's own setup. Nothing moves: combat is not played in the slice.</p>
    ${boardSvg(v)}
    <h2>Set what happened</h2>
    <div class="card">
      <div class="bar">
        <label>Outcome <select data-out="outcome"><option value="heroClear"${d.outcome === 'heroClear' ? ' selected' : ''}>won — the board cleared</option><option value="wipe"${d.outcome === 'wipe' ? ' selected' : ''}>lost — every hero down</option><option value="capped"${d.outcome === 'capped' ? ' selected' : ''}>turn cap — a loss</option></select></label>
        <label>Turns <input type="number" min="0" step="1" value="${d.turns}" data-out="turns"></label>
        <label>Hero phases <input type="number" min="0" step="1" value="${d.heroPhases}" data-out="heroPhases"></label>
        <label>Enemy phases <input type="number" min="0" step="1" value="${d.enemyPhases}" data-out="enemyPhases"></label>
      </div>
      <table><tr><th>unit</th><th>life</th><th>damage taken</th><th>damage dealt</th><th>kills</th></tr>
        ${d.units.map(unitRow).join('')}
      </table>
      <p class="meta">A kill is an opposing unit this one's damage reduced to zero. Enemy phases feed the XP speed bonus (15 − phases). A lost battle: set every hero down or dead.</p>
    </div>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="decide">Propose the Reckoning →</button></div>`
}

// ── the tally ───────────────────────────────────────────────────────────────
function tallyScreen(c: CampaignState): string {
  const b = c.cursor.battle!
  const r = b.result!, k = b.reckoning!
  const hero = (id: string) => c.roster[id]?.name ?? id
  return `<h2>The Reckoning — <span class="${k.won ? 'won' : 'lost'}">${k.won ? 'won' : 'lost'}</span></h2>
    <p class="meta"><code>${esc(r.id)}</code> · ${esc(r.outcome)} in ${r.turns} turns · ${r.enemyPhases} enemy phases. Proposed from the result; every value below may be changed before it is written.</p>
    <div class="cols">
      <div class="card"><h3>Heroes</h3><table><tr><th>hero</th><th>xp</th><th>wound</th><th>dead</th><th>mvp</th></tr>
        ${k.heroes.map((h, i) => `<tr><td>${esc(hero(h.heroId))}</td>
          <td><input type="number" min="0" step="1" value="${h.xp}" data-reck="xp" data-i="${i}"></td>
          <td><select data-reck="wound" data-i="${i}">${[0, 1, 2, 3].map((w) => `<option value="${w}"${h.wound === w ? ' selected' : ''}>${woundNameOf(w)}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-reck="dead" data-i="${i}"${h.dead ? ' checked' : ''}></td>
          <td>${h.mvp ? '★' : ''}</td></tr>`).join('')}
      </table></div>
      <div class="card"><h3>The Campaign</h3><table>
        <tr><td>Renown</td><td class="n"><input type="number" min="0" step="1" value="${k.renown}" data-reck="renown"></td></tr>
        <tr><td>Losses</td><td class="n"><input type="number" min="0" step="1" value="${k.losses}" data-reck="losses"></td></tr>
        <tr><td>Claim</td><td class="n">${k.claim ? `<code>${esc(k.claim)}</code>` : '—'}</td></tr>
        <tr><td>Lose</td><td class="n">${k.lose ? `<code>${esc(k.lose)}</code>` : '—'}</td></tr>
        ${k.grants.map((g, i) => `<tr><td>${esc(g.currency.replace('currency.', ''))}</td><td class="n"><input type="number" min="0" step="1" value="${g.amount}" data-reck="grant" data-i="${i}"></td></tr>`).join('')}
        ${k.grants.length ? '' : '<tr><td colspan="2" class="meta">no payout — only a first Conquer pays Salvage</td></tr>'}
      </table></div>
    </div>
    <div class="bar"><button class="quiet" data-act="back-to-panel">← Back to the panel</button><span class="sp"></span>${applyButton()}</div>`
}
/** The one writer, behind one button: applyBattleResult writes exactly the Reckoning shown. */
function applyButton(): string {
  return `<button class="primary" data-act="apply">Apply — write it to the Campaign</button>`
}

// ── after the writer: what changed, and the way out ─────────────────────────
function appliedScreen(c: CampaignState): string {
  const e = c.cursor.engagement
  const written = app.ctx!.events.filter((ev) => ev.causeId === e?.id && ev.type !== 'cursor.moved')
  const hero = (id: unknown) => (typeof id === 'string' ? c.roster[id]?.name ?? id : '')
  const line = (ev: (typeof written)[number]): string => {
    switch (ev.type) {
      case 'xp.gained': return `${hero(ev['heroId'])} +${ev['amount']} XP → ${ev['xp']}`
      case 'hero.wounded': return `${hero(ev['heroId'])} ${woundNameOf(ev['from'] as number)} → ${woundNameOf(ev['to'] as number)}`
      case 'hero.died': return `${hero(ev['heroId'])} died`
      case 'renown.gained': return `Renown +${ev['amount']} → ${ev['renown']}`
      case 'engagement.resolved': return `${ev['won'] ? 'won' : 'lost'} — losses ${ev['losses']}`
      case 'territory.claimed': return `claimed ${ev['territoryId']}${(ev['buildings'] as string[]).length ? ' with ' + (ev['buildings'] as string[]).join(', ') : ''}`
      case 'territory.lost': return `lost ${ev['territoryId']}`
      case 'resource.gained': return `+${ev['amount']} ${String(ev['currencyId']).replace('currency.', '')} → ${ev['balance']}`
      default: return ev.type
    }
  }
  return `<h2>Written</h2>
    <p class="meta"><code>${esc(e?.id ?? '')}</code> — every line below is an event the writer emitted; the save already holds it.</p>
    <div class="card"><table>${written.map((ev) => `<tr><td><code>${esc(ev.type)}</code></td><td>${esc(line(ev))}</td></tr>`).join('') || '<tr><td class="meta">nothing was written this session (loaded after the apply)</td></tr>'}</table>
      <p class="meta">difficulty now ${resolveDifficulty(c)} · Renown ${c.renown} · losses ${c.losses} · purse ${Object.entries(c.purse).map(([k, v]) => `${k.replace('currency.', '')} ${v}`).join(' · ')}</p></div>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="exit">Exit — back to the Week</button></div>`
}

// ── wiring ──────────────────────────────────────────────────────────────────
function wire(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    const actName = el.dataset['act']!
    if (actName === 'load-file') {
      el.addEventListener('change', () => {
        const f = (el as HTMLInputElement).files?.[0]
        if (!f) return
        f.text().then((t) => loadJson(t, f.name))
      })
      return
    }
    el.addEventListener('click', () => {
      const id = el.dataset['id']
      switch (actName) {
        case 'load-fixture': return loadJson(__FIXTURE_JSON__, 'the fixture')
        case 'download': return download()
        case 'forget': try { localStorage.removeItem(SAVE_KEY) } catch {} note('browser save forgotten'); return render()
        case 'advance': return act(() => performAdvancePrep(app.ctx!, 'slice'))
        case 'council': return act(() => performCouncil(app.ctx!, viewCombatPrep(app.ctx!.campaign).tactic === id ? null : id!, 'slice'))
        case 'deploy': return act(() => performDeploy(app.ctx!, id!, 'slice'))
        case 'undeploy': return act(() => performUndeploy(app.ctx!, id!, 'slice'))
        case 'decide': return act(() => {
          const e = app.ctx!.campaign.cursor.engagement!
          const r = validateResult(app.draft!, { heroes: e.deployed.length, enemies: e.enemies.length, id: e.id })
          const k = resolveReckoning(app.ctx!.campaign, e, r)
          setBattleOutcome(app.ctx!, r, k, 'slice')
        })
        case 'apply': return act(() => { const b = app.ctx!.campaign.cursor.battle!; applyBattleResult(app.ctx!, app.ctx!.campaign.cursor.engagement!, b.result!, b.reckoning!); app.draft = null })
        case 'exit': return act(() => performExitBattle(app.ctx!, 'slice'))
        case 'back-to-panel': return act(() => { app.draft = app.ctx!.campaign.cursor.battle?.result ?? app.draft; setCursor(app.ctx!, { battle: { resultSet: false } }, 'slice') })
      }
    })
  })
  // the outcome panel edits the draft result in place, then re-renders the numbers only on blur
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-fate]').forEach((el) => {
    el.addEventListener('change', () => {
      const side = el.dataset['side'] as 'hero' | 'enemy', index = Number(el.dataset['index']), field = el.dataset['fate']!
      const value = field === 'lifeState' ? el.value : Math.max(0, Math.floor(Number(el.value) || 0))
      app.draft = withUnitFate(app.draft!, side, index, { [field]: value } as never)
      render()
    })
  })
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-out]').forEach((el) => {
    el.addEventListener('change', () => {
      const field = el.dataset['out']!
      const value = field === 'outcome' ? el.value : Math.max(0, Math.floor(Number(el.value) || 0))
      app.draft = { ...app.draft!, [field]: value }
      render()
    })
  })
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-reck]').forEach((el) => {
    el.addEventListener('change', () => {
      const b = app.ctx!.campaign.cursor.battle!
      const k: Reckoning = JSON.parse(JSON.stringify(b.reckoning))
      const field = el.dataset['reck']!
      const i = el.dataset['i']
      const n = Math.max(0, Math.floor(Number(el.value) || 0))
      if (field === 'grant') k.grants[Number(i)]!.amount = n
      else if (i !== undefined) {
        const h = k.heroes[Number(i)]!
        if (field === 'dead') h.dead = (el as HTMLInputElement).checked
        else if (field === 'wound') h.wound = Number(el.value)
        else if (field === 'xp') h.xp = n
      } else if (field === 'renown' || field === 'losses') k[field] = n
      act(() => setBattleOutcome(app.ctx!, b.result!, k, 'slice-edit'))
    })
  })
}

// ── boot ────────────────────────────────────────────────────────────────────
;(() => {
  let saved: string | null = null
  try { saved = localStorage.getItem(SAVE_KEY) } catch {}
  if (saved) loadJson(saved, 'the browser save')
  else render()
})()
