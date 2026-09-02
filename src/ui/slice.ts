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
import { STAGES } from '../content/stages.js'
import { stageOf, canAdvance, performAdvance, listStageOffers, performChooseEngagement } from '../core/week.js'
import { commitmentOf, listAvailable } from '../core/assignments.js'
import { listRecruitOffers, canRecruit, performRecruit, costOfRecruit, canHeal, performHeal, costOfHeal } from '../core/market.js'
import { listLabours, yieldOf, canAssignLabour, performAssignLabour } from '../core/mend.js'
import { performRelease } from '../core/assignments.js'
import { listRewardOffers, performTakeReward, listLevelUps, performLevelUp, performLeaveLevelUp } from '../core/rewards.js'
import { xpForLevel } from '../content/levels.js'
import { listBuildings, whyNotBuild, performBuild } from '../core/build.js'
import { isShopOpen, listShopItems, canBuyItem, performBuyItem, costOfItem, canEquip, performEquip } from '../core/shop.js'
import { makeNewCampaign, listDraftOffers, performDraft, performEndCampaign, draftsOwedOf, draftedCountOf } from '../core/opening.js'
import { PROLOGUE } from '../content/prologue.js'
import { purchasesFreeOf, articleSlotsOf, articlesHeldOf, whyNotPurchase, performPurchase, hasUnlock } from '../core/charter.js'
import { UNLOCKS, FIRST_ARTICLE_AT } from '../content/charter.js'
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
      <button class="primary" data-act="new-campaign">New Campaign</button>
      <button data-act="load-fixture">Load the fixture</button>
      <label class="file">Load a save <input type="file" accept=".json,application/json" data-act="load-file"></label>
      <button data-act="download" ${c ? '' : 'disabled'}>Download save</button>
      <button class="quiet" data-act="forget">Forget browser save</button>
      <span class="sp"></span>
      ${c ? `<span class="tag">week ${c.week}</span> <span class="tag">${esc(c.cursor.stage)}</span> <span class="tag">${esc(c.cursor.step)}${c.cursor.prepStep ? '/' + c.cursor.prepStep : ''}</span> <span class="tag">renown ${c.renown}</span> <span class="tag meta">seed ${c.seed}</span>` : ''}
    </div>
    <div class="status${app.error ? ' err' : ''}">${esc(app.status)}</div>
    ${c ? screen(c) : `<div class="card"><p>No Campaign loaded. Load the fixture — a Campaign at Combat Prep, week 3, a Conquer on the Ridge — or a save you downloaded earlier.</p></div>`}
  `
  wire(root)
}

function screen(c: CampaignState): string {
  if (c.ended) return endedScreen(c)
  switch (c.cursor.step) {
    case 'draft': return draftScreen(c)
    case 'prep': return prepScreen(c)
    case 'battle': return c.cursor.battle?.resultSet ? tallyScreen(c) : battleScreen(c)
    case 'reckoning': return appliedScreen(c)
    case 'rewards': return rewardsScreen(c)
    case 'levelUp': return levelUpScreen(c)
    case 'open': return worldScreen(c)
    default: return `<div class="card"><p>The cursor is at <code>${esc(c.cursor.step)}</code> — a step the slice has no screen for yet.</p></div>`
  }
}

// ── the opening ─────────────────────────────────────────────────────────────
function draftScreen(c: CampaignState): string {
  const offers = listDraftOffers(c)
  const kit = (unitType: string) => (UNITS[unitType]?.attacks ?? []).map((a) => a.replace(/^attack\./, '').replace(/\./g, ' ')).join(', ')
  return `<h2>The draft — ${draftedCountOf(c) === 0 ? 'your first hero' : `hero ${draftedCountOf(c) + 1} of six`}</h2>
    <p class="meta">Three come to the fire. You see who they are — never their numbers. ${draftsOwedOf(c) > 1 ? `${draftsOwedOf(c)} to draft before the next battle.` : ''}</p>
    <div class="card"><div class="pick">${offers.map((h) => `<div class="opt" data-act="draft" data-id="${esc(h.id)}"><b>${esc(h.name)}</b><small>${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · carries ${esc(kit(h.unitType) || 'nothing yet')}</small></div>`).join('')}</div></div>`
}
function endedScreen(c: CampaignState): string {
  return `<h2 class="lost">The run is over</h2>
    <p class="meta">Week ${c.ended!.week} — ${esc(c.ended!.reason)}. "Losses before you've conquered the Kingdom tile are what will reset the game." There is no reload.</p>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="restart">Begin again</button></div>`
}
function openingBanner(c: CampaignState): string {
  if (c.cursor.prologue === null) return ''
  const n = c.cursor.prologue
  const row = PROLOGUE.find((r) => r.n === n)
  return `<div class="card" style="margin-bottom:12px"><p><b>The opening — Week 0.</b> ${row ? `Next: battle ${n}, <i>${esc(row.name)}</i>${row.territoryId ? ' — for ' + esc(c.territories[row.territoryId]!.name) : ''}.` : 'Every battle fought.'} Drafted ${draftedCountOf(c)} of six.${draftsOwedOf(c) ? ` ${draftsOwedOf(c)} draft(s) owed first.` : ''}</p>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="advance">${draftsOwedOf(c) ? 'Draft' : row ? 'To battle ' + n : 'Begin Week 1'}</button></div></div>`
}

function charterPanel(c: CampaignState): string {
  const free = purchasesFreeOf(c)
  const tracks = [...new Set(UNLOCKS.map((u) => u.track))]
  return `<div class="card" style="margin-top:12px"><h3>The Charter · Renown ${c.renown}</h3>
    <p class="meta">${c.renown < FIRST_ARTICLE_AT ? `The free spine — the first purchase comes at Renown ${FIRST_ARTICLE_AT}.` : `${free} to spend · Article slots ${articlesHeldOf(c)} of ${articleSlotsOf(c)} used`}</p>
    ${c.renown >= FIRST_ARTICLE_AT || c.unlocks.length ? `<table>${tracks.map((t) => { const rows = UNLOCKS.filter((u) => u.track === t); return `<tr><td><b>${esc(t)}</b> <span class="tag">${rows[0]!.tier}</span></td><td>${rows.map((u) => { const held = hasUnlock(c, u.id); const why = whyNotPurchase(c, u.id); return `<button class="${held ? 'primary' : 'quiet'}" ${held || why ? 'disabled' : ''} data-act="purchase" data-id="${esc(u.id)}" title="${esc(u.does + (why && !held ? ' — ' + why : ''))}">${esc(u.name)}${held ? ' ✓' : ''}</button>` }).join(' ')}</td></tr>` }).join('')}</table>` : ''}</div>`
}

function rosterPanel(c: CampaignState): string {
  const heroes = Object.values(c.roster).sort((a, b) => a.id.localeCompare(b.id))
  return `<div class="card" style="margin-top:12px"><h3>The roster</h3><table>${heroes.map((h) => `<tr><td>${esc(h.name)}</td><td class="meta">${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · L${h.level} · ${h.xp} xp</td><td>${h.lifeState === 'dead' ? '<span class="lost">dead</span>' : h.wound ? woundNameOf(h.wound) : ''} <span class="meta">${esc(commitmentOf(c, h.id, 'field'))}</span></td></tr>`).join('') || '<tr><td class="meta">nobody yet</td></tr>'}</table></div>`
}

// ── rewards and level-up ────────────────────────────────────────────────────
function rewardsScreen(c: CampaignState): string {
  const offers = listRewardOffers(c)
  return `<h2>The spoils — three drawn, keep one</h2>
    <p class="meta"><code>${esc(c.cursor.engagement?.id ?? '')}</code> · the two you leave are burned.</p>
    <div class="card"><div class="pick">${offers.map((r) => `<div class="opt" data-act="take-reward" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(r.slot)} · tier ${r.tier} · <code>${esc(r.id)}</code></small></div>`).join('')}</div></div>`
}
function levelUpScreen(c: CampaignState): string {
  const ready = listLevelUps(c)
  return `<h2>Level up</h2>
    <p class="meta">A level is +1 and nothing else until specialties arrive. XP is never lost — a level not taken waits.</p>
    <div class="card"><div class="pick">${ready.map((id) => { const h = c.roster[id]!; return `<div class="opt" data-act="level-up" data-id="${esc(id)}"><b>${esc(h.name)}</b><small>L${h.level} → L${h.level + 1} · ${h.xp} xp (needs ${xpForLevel(h.level + 1)})</small></div>` }).join('') || '<p class="meta">nobody is ready</p>'}</div></div>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="leave-level-up">${ready.length ? 'Leave the rest for later' : 'Back to the Week'}</button></div>`
}

// ── the Week ────────────────────────────────────────────────────────────────
function worldScreen(c: CampaignState): string {
  if (c.cursor.prologue !== null) return openingBanner(c) + rosterPanel(c)
  const row = stageOf(c)
  const at = STAGES.findIndex((s) => s.id === row.id)
  const chips = STAGES.map((s, i) => `<span class="${i === at ? 'on' : i < at ? 'done' : ''}">${esc(s.title)}</span>`).join('')
  const offers = listStageOffers(c)
  const territories = Object.values(c.territories).sort((a, b) => a.id.localeCompare(b.id))
  const heroes = Object.values(c.roster).sort((a, b) => a.id.localeCompare(b.id))
  let body: string
  if (row.offers === 'engagement' && offers.length) {
    const head = row.targets === 'rolled'
      ? `${esc(row.title)} — <span class="lost">attacked</span> at ${esc(c.territories[offers[0]!]!.name)}. Defend it, or pass and ${c.territories[offers[0]!]!.kingdom ? 'pay the cost' : 'lose it'}`
      : `${esc(row.title)} — choose a Territory, or pass`
    body = `<h3>${head}</h3><div class="pick">${offers.map((id) => { const t = c.territories[id]!; return `<div class="opt" data-act="choose" data-id="${esc(id)}"><b>${esc(t.name)}</b><small>${esc(t.mapId)} · held by ${t.enemies.length}: ${esc(t.enemies.map((e) => nameOf(e)).join(', '))}${t.buildings.length ? ' · ' + esc(t.buildings.map((b) => b.id).join(', ')) : ''}</small></div>` }).join('')}</div>`
  } else if (row.offers === 'engagement') {
    body = `<h3>${esc(row.title)}</h3><p class="meta">${c.cursor.fought ? 'Fought this Stage — nothing more is offered this Week.' : row.targets === 'rolled' ? 'No attack this Week.' : 'Nothing adjacent is unclaimed.'}</p>`
  } else if (row.offers === 'market') {
    const rc = costOfRecruit(), hc = costOfHeal()
    const fmt = (cost: Record<string, number>) => Object.entries(cost).map(([k, v]) => `${v} ${k.replace('currency.', '')}`).join(' · ')
    const wounded = heroes.filter((h) => h.lifeState === 'alive' && h.wound > 0)
    body = `<h3>The Beacon — recruit, one a Week · ${esc(fmt(rc))}</h3>
      <div class="pick">${listRecruitOffers(c).map((r) => `<div class="opt${canRecruit(c, r.id) ? '' : ' off'}" data-act="recruit" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(r.classes.map((x) => x.replace('class.', '')).join(', '))} · ${esc(r.unitType)}</small></div>`).join('') || '<p class="meta">nobody answers the Beacon</p>'}</div>
      ${c.cursor.recruited ? '<p class="meta">recruited this Week — the Beacon is closed until next</p>' : ''}
      <h3>The Forge's shelf${isShopOpen(c) ? ` · ${esc(fmt(costOfItem('')))} an item` : ' — closed until the Forge is repaired'}</h3>
      <div class="pick">${listShopItems(c).map((r) => `<div class="opt${canBuyItem(c, r.id) ? '' : ' off'}" data-act="buy-item" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(r.slot)} · tier ${r.tier}</small></div>`).join('')}</div>
      <h3>The Chapel — Field Surgery · ${esc(fmt(hc))} a hero</h3>
      <div class="pick">${wounded.map((h) => `<div class="opt${canHeal(c, h.id) ? '' : ' off'}" data-act="heal" data-id="${esc(h.id)}"><b>${esc(h.name)}</b><small>${esc(woundNameOf(h.wound))} → ${esc(woundNameOf(h.wound - 1))}</small></div>`).join('') || '<p class="meta">nobody is wounded</p>'}</div>`
  } else if (row.offers === 'labours') {
    const free = listAvailable(c, row.id)
    const working = heroes.filter((h) => c.assignments[h.id]?.city)
    body = `<h3>Mend — the city Stage. Each labour takes a hero's city slot; it pays as the Stage closes.</h3>
      <table><tr><th>labour</th><th>pays</th><th>send</th></tr>${listLabours().map((l) => { const y = yieldOf(c, l.key); return `<tr><td><b>${esc(l.name)}</b> <span class="meta">${esc(l.does)}</span></td><td>${y ? `${y.amount} ${esc(y.currency.replace('currency.', ''))}` : '—'}</td><td>${free.filter((h) => canAssignLabour(c, h, l.key)).map((h) => `<button class="quiet" data-act="labour" data-id="${esc(h)}" data-key="${esc(l.key)}">${esc(c.roster[h]!.name)}</button>`).join(' ') || '<span class="meta">nobody free</span>'}</td></tr>` }).join('')}</table>
      ${working.length ? `<h3>Working this Week</h3><p>${working.map((h) => `${esc(h.name)} — ${esc(c.assignments[h.id]!.city!.target)} <button class="quiet" data-act="release" data-id="${esc(h.id)}">undo</button>`).join(' · ')}</p>` : ''}`
  } else if (row.offers === 'build') {
    const held = listBuildings(c).filter((b) => b.held)
    body = `<h3>Build — Salvage, node by node</h3>` + (held.length ? held.map((b) => `<h3>${esc(b.row.name)} <span class="meta">on ${esc(c.territories[b.territoryId]!.name)} · level ${b.building.level}${b.building.damaged ? ' · ruin' : ''}</span></h3>
      <div class="pick">${b.row.nodes.map((n) => { const why = whyNotBuild(c, b.territoryId, b.building.id, n.key); const built = b.building.nodes.includes(n.key); return `<div class="opt${built ? ' on' : why ? ' off' : ''}" ${why ? '' : `data-act="build" data-id="${esc(b.territoryId)}" data-building="${esc(b.building.id)}" data-key="${esc(n.key)}"`}><b>${esc(n.name)} ${built ? '✓' : ''}</b><small>${n.salvage} Salvage${n.parents.length ? ' · after ' + esc(n.parents.join(', ')) : ''}${n.gate ? ' · ' + esc(Object.entries(n.gate).map(([k, v]) => `${v} ${k}s`).join(', ')) + ' (waived)' : ''}${why && !built ? ' · ' + esc(why) : ''}</small></div>` }).join('')}</div>`).join('') : '<p class="meta">nothing you hold has a building on it — the Ridge carries the Forge</p>')
  } else {
    body = `<h3>${esc(row.title)}</h3><p>${esc(row.does)}</p><p class="meta">Nothing to do here yet — this Stage's machinery lands in a later milestone. Pass through.</p>`
  }
  const next = STAGES[at + 1]
  return `<h2>Week ${c.week} — ${esc(row.title)}</h2>
    <div class="steps">${chips}</div>
    <div class="cols">
      <div>
        <div class="card">${body}</div>
        <div class="bar"><span class="sp"></span><button class="primary" data-act="advance" ${canAdvance(c) ? '' : 'disabled'}>${next ? 'Next — ' + esc(next.title) : 'End the Week'}</button></div>
      </div>
      <div>
        <div class="card"><h3>The purse</h3><table>${Object.entries(c.purse).map(([k, v]) => `<tr><td>${esc(k.replace('currency.', ''))}</td><td class="n">${v}</td></tr>`).join('')}<tr><td>Renown</td><td class="n">${c.renown}</td></tr><tr><td>losses</td><td class="n">${c.losses}</td></tr><tr><td>difficulty</td><td class="n">${resolveDifficulty(c)}</td></tr></table></div>
        <div class="card" style="margin-top:12px"><h3>The map</h3><table>${territories.map((t) => `<tr><td>${esc(t.name)}${t.kingdom ? ' <span class="tag">kingdom</span>' : ''}</td><td>${t.owned ? '<span class="won">held</span>' : 'unclaimed'}</td><td class="meta">${esc(t.buildings.map((b) => b.id.replace('building.', '') + (b.damaged ? ' (ruin)' : '')).join(', '))}</td></tr>`).join('')}</table></div>
        ${c.stash.length ? `<div class="card" style="margin-top:12px"><h3>The stash</h3><p class="meta">${esc(c.stash.map((i) => i.replace('item.', '')).join(' · '))}</p></div>` : ''}
        ${rosterPanel(c)}
        ${charterPanel(c)}
      </div>
    </div>`
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
    const stash = c.stash
    body = `<h3>Equip — fit the stash onto the deployed</h3>
      ${stash.length ? `<table><tr><th>item</th><th>onto</th></tr>${stash.map((item, i) => `<tr><td><code>${esc(item)}</code></td><td>${v.deployed.filter((h) => canEquip(c, h, item)).map((h) => `<button class="quiet" data-act="equip" data-id="${esc(h)}" data-item="${esc(item)}">${esc(c.roster[h]!.name)}</button>`).join(' ')}</td></tr>`).join('')}</table>` : '<p class="meta">the stash is empty — the Forge\'s shelf and the spoils fill it</p>'}
      <p class="meta">${v.deployed.map((h) => `${esc(c.roster[h]!.name)}: ${esc(c.roster[h]!.equipped.map((x) => x.replace('item.', '')).join(', ') || 'nothing')}`).join(' · ')}</p>
      <p class="meta">What is equipped is recorded on the hero; the engine still fields the unit row's own kit until content lands the item's effect.</p>`
  }
  return `<h2>Combat Prep — ${esc(v.stepTitle)}</h2>
    <p class="meta"><code>${esc(v.engagementId)}</code> · ${esc(v.kind)} · ${esc(v.territoryId ?? 'no ground at stake')} · ${esc(v.mapId)}</p>
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
    <div class="bar"><span class="sp"></span><button class="primary" data-act="exit">${c.cursor.rewardOffer ? 'On to the spoils →' : 'Exit — back to the Week'}</button></div>`
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
        // the one place chance enters from outside the rules: a new save's seed, chosen at the player's click
        // and written into the save, so every roll after it is keyed and reproducible (Law 4)
        case 'new-campaign': return loadJson(saveOf(makeNewCampaign(Math.floor(Math.random() * 1e9))), 'a new Campaign')
        case 'draft': return act(() => performDraft(app.ctx!, id!, 'slice'))
        case 'restart': return act(() => { app.ctx = makeCtx(performEndCampaign(app.ctx!, 'slice')) })
        case 'purchase': return act(() => performPurchase(app.ctx!, id!, 'slice'))
        case 'download': return download()
        case 'forget': try { localStorage.removeItem(SAVE_KEY) } catch {} note('browser save forgotten'); return render()
        case 'advance': return act(() => (app.ctx!.campaign.cursor.step === 'prep' ? performAdvancePrep(app.ctx!, 'slice') : performAdvance(app.ctx!, 'slice')))
        case 'choose': return act(() => { performChooseEngagement(app.ctx!, id!, 'slice') })
        case 'recruit': return act(() => performRecruit(app.ctx!, id!, 'slice'))
        case 'heal': return act(() => performHeal(app.ctx!, id!, 'slice'))
        case 'labour': return act(() => performAssignLabour(app.ctx!, id!, el.dataset['key']!, 'slice'))
        case 'release': return act(() => performRelease(app.ctx!, id!, 'city', 'slice'))
        case 'build': return act(() => performBuild(app.ctx!, id!, el.dataset['building']!, el.dataset['key']!, 'slice'))
        case 'buy-item': return act(() => performBuyItem(app.ctx!, id!, 'slice'))
        case 'equip': return act(() => performEquip(app.ctx!, id!, el.dataset['item']!, 'slice'))
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
        case 'take-reward': return act(() => performTakeReward(app.ctx!, id!, 'slice'))
        case 'level-up': return act(() => performLevelUp(app.ctx!, id!, 'slice'))
        case 'leave-level-up': return act(() => performLeaveLevelUp(app.ctx!, 'slice'))
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
