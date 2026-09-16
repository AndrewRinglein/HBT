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
import {createBattleSurface} from './battle-surface.js'
import { viewBattle, type BattleView } from '../view/battle.js'
import { makeBlankResult, withUnitFate, validateResult } from '../core/result.js'
import { resolveReckoning, applyBattleResult, performExitBattle, resolveDifficulty, type Reckoning } from '../core/reckoning.js'
import { woundNameOf } from '../content/wounds.js'
import type { EngagementResult, UnitTally } from '../core/seam.js'
import { PREP_STEP_ROWS } from '../content/prep.js'
import { FIELD_STEPS, STAGES } from '../content/stages.js'
import { stageOf, canAdvance, performAdvance, listStageOffers, performChooseEngagement } from '../core/week.js'
import { commitmentOf, listAvailable } from '../core/assignments.js'
import { listRecruitOffers, canRecruit, performRecruit, costOfRecruit, canHeal, performHeal, costOfHeal } from '../core/market.js'
import { listLabours, yieldOf, canAssignLabour, performAssignLabour } from '../core/mend.js'
import { performRelease } from '../core/assignments.js'
import { listRewardOffers, performTakeReward, listLevelUps, performLevelUp, performLeaveLevelUp } from '../core/rewards.js'
import { xpForLevel } from '../content/levels.js'
import { listBuildings, whyNotBuild, performBuild } from '../core/build.js'
import { isShopOpen, listShopItems, canBuyItem, performBuyItem, costOfItem, canEquip, whyNotEquip, performEquip, canUnequip, performUnequip, loadoutOf, equipCostOf, isEquipOpen, equipWhere, performOpenEquip, performCloseEquip, forgeBandName, shelfSpecOf, whyNotTradeIn, performTradeIn, tradeCategoryOf } from '../core/shop.js'
import { itemOf } from '../content/items.js'
import { equipScreen, equipPage, displaceFor } from './equip.js'
import { rosterScreen as rosterCards } from './roster.js'
import { recapScreen, mountRecap, rewardsScreen, mountRewards, levelUpScreen, mountLevelUp, toggleMute, stopMusic, type LastBattle, type Cleanup } from './after.js'
import { canLevelUp } from '../core/rewards.js'
import { isMuted } from './sound.js'
import { listCatalog, waystationLevelOf, canBuyCatalog, whyNotBuyCatalog, performBuyCatalog, priceOf } from '../core/waystation.js'
import { makeNewCampaign, listDraftOffers, performDraft, performEndCampaign, draftsOwedOf, draftedCountOf } from '../core/opening.js'
import { PROLOGUE } from '../content/prologue.js'
import { purchasesFreeOf, articleSlotsOf, articlesHeldOf, whyNotPurchase, performPurchase, hasUnlock } from '../core/charter.js'
import { UNLOCKS, FIRST_ARTICLE_AT } from '../content/charter.js'
import { UNITS } from '../engine.js'
import { listQuestOffers, performSendQuest, performAcknowledgeQuest } from '../core/quests.js'
import { questRowOf } from '../content/quests.js'
import { questCards, questReportScreen } from './quests.js'
import { absenceOf } from '../core/absence.js'
import { ART, worldMapSvg, townSvg, interiorOf, cardOf, fontFaces } from './art.js'
import { loadGameScreen, readSlot, writeSlot, clearSlot, migrateLegacySave } from './loadgame.js'
import { REALMS } from '../content/realms.js'

declare const __FIXTURE_JSON__: string
declare const __BUILD_SHA__: string
declare const __BATTLE_VIEW_DATA__: Record<string, unknown>
const battleSurface=createBattleSurface(__BATTLE_VIEW_DATA__)
let shownBattle:BattleView|null=null


type App = {
  ctx: Ctx | null
  /** The outcome panel's working result, before it is set on the cursor. */
  draft: EngagementResult | null
  /** The tally's working Reckoning, editable. */
  draftReckoning: Reckoning | null
  status: string
  error: boolean
  /** The slot the loaded Campaign lives in — its autosave goes there. Null while nothing is loaded. */
  slot: { realm: string; n: number } | null
  /** The slot whose End Game awaits its second click. */
  confirmEnd: { realm: string; n: number } | null
  /** Over the Week: the roster screen (screen.roster). */
  roster: boolean
  /** The Quest Stage's party being assembled, before Send. */
  party: string[]
  questLead: string | null
  /** The picture over the Week: the world map, or the Sanctuary. */
  view: 'map' | 'town'
  /** The Equip screen's item in hand — a stash item clicked, waiting for a slot. A view choice, never saved. */
  picked: string | null
  /** The battle the writer just wrote, kept for the results screen (the cursor drops the result at apply). */
  lastBattle: LastBattle | null
  /** The level-up sheet is open for this hero — reached from the rewards or from the roster. */
  levelHero: { id: string; from: 'rewards' | 'roster' } | null
  /** The copied screens run a ceremony on the DOM once; a re-render mid-ceremony would restart it. The key names the instance mounted. */
  mounted: { key: string; cleanup: Cleanup } | null
}
const app: App = { ctx: null, draft: null, draftReckoning: null, status: '', error: false, slot: null, confirmEnd: null, roster: false, party: [], questLead: null, view: 'map', picked: null, lastBattle: null, levelHero: null, mounted: null }

// ── persistence ─────────────────────────────────────────────────────────────
function persist(): void {
  if (!app.ctx || !app.slot) return
  writeSlot(app.slot.realm, app.slot.n, saveOf(app.ctx.campaign))
}
/** Load a Campaign into a slot; the slot is where it autosaves from now on. */
function loadJson(json: string, from: string, slot: { realm: string; n: number }): void {
  try {
    app.ctx = makeCtx(campaignOf(json))
    app.slot = slot
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

/** Which ceremony screen the cursor is on, if any — the key a mount is remembered by. */
function ceremonyKey(c: CampaignState): string | null {
  if (app.roster && !app.levelHero) return null
  if (app.levelHero) return `levelup:${app.levelHero.id}:${c.roster[app.levelHero.id]?.level ?? 0}`
  if (c.cursor.step === 'reckoning') return `recap:${c.cursor.engagement?.id}`
  if (c.cursor.step === 'rewards' || c.cursor.step === 'levelUp') return `rewards:${c.cursor.engagement?.id}:${c.cursor.step}`
  return null
}

function render(): void {
  const root = document.getElementById('app')!
  const c = app.ctx?.campaign ?? null
  shownBattle=null
  if(!c || app.roster || app.levelHero || c.cursor.step!=='battle' || c.cursor.battle?.resultSet)battleSurface.dispose()
  root.className = c ? '' : 'front'
  const key = c ? ceremonyKey(c) : null
  if (app.mounted && app.mounted.key === key) { const st = root.querySelector?.('.status'); if (st) { st.textContent = app.status; st.className = 'status' + (app.error ? ' err' : '') } return }
  if (app.mounted) { app.mounted.cleanup(); app.mounted = null }
  if (!key) stopMusic()
  if (!c) { root.innerHTML = loadGameScreen(app.status, app.error, __BUILD_SHA__, app.confirmEnd); wire(root); return }
  if (key) {
    root.innerHTML = `<div class="status${app.error ? ' err' : ''}" style="position:fixed;top:8px;left:14px;z-index:601">${esc(app.status)}</div>` + ceremonyScreen(c)
    wire(root)
    const hx = typeof root.querySelector === 'function' ? root.querySelector<HTMLElement>('.hx') : null
    if (hx) app.mounted = { key, cleanup: mountCeremony(hx) }
    return
  }
  root.innerHTML = `
    <h1>Heroes of Blight and Tragic — the slice</h1>
    <p class="meta">load a save · Combat Prep · the battle, shown not fought · set what happened · the Reckoning. Built at kingdom ${esc(__BUILD_SHA__)}.</p>
    <div class="bar">
      <button class="quiet" data-act="title">Title</button>
      <button class="${app.roster ? 'primary' : ''}" data-act="roster">${app.roster ? 'Back' : 'Roster'}</button>
      ${c && c.cursor.step === 'open' && !isEquipOpen(c) ? '<button data-act="open-equip">Equip</button>' : ''}
      ${c && equipWhere(c) === 'roster' ? '<button class="primary" data-act="close-equip">Done equipping</button>' : ''}
      <button data-act="download">Download save</button>
      <span class="sp"></span>
      ${c ? `<span class="tag">${esc(REALMS.find((r) => r.id === app.slot?.realm)?.name ?? c.realm)} · slot ${app.slot?.n ?? '?'}</span> <span class="tag">week ${c.week}</span> <span class="tag">${esc(c.cursor.stage)}</span> <span class="tag">${esc(c.cursor.step)}${c.cursor.prepStep ? '/' + c.cursor.prepStep : ''}</span> <span class="tag">renown ${c.renown}</span> <span class="tag meta">seed ${c.seed}</span>` : ''}
    </div>
    <div class="status${app.error ? ' err' : ''}">${esc(app.status)}</div>
    ${app.roster ? rosterScreen(c) : screen(c)}
  `
  wire(root)
  if(shownBattle){const slot=root.querySelector<HTMLElement>('[data-battle-surface]');if(!slot)throw Error('Missing battle surface host');battleSurface.mount(slot,shownBattle)}
}

/** The copied Hell-TCG screens (src/ui/after.ts): the recap after the writer, the rewards (and the level-up step, which is the rewards page again with its LEVEL UP buttons), the level-up sheet. */
function ceremonyScreen(c: CampaignState): string {
  if (app.levelHero) return levelUpScreen(c, app.levelHero.id, app.levelHero.from)
  if (c.cursor.step === 'reckoning') return recapScreen(c, app.ctx!.events, app.lastBattle)
  return rewardsScreen(c, app.ctx!.events, app.lastBattle)
}
function mountCeremony(hx: HTMLElement): Cleanup {
  if (hx.classList.contains('recap')) return mountRecap(hx, () => act(() => performExitBattle(app.ctx!, 'slice')))
  if (hx.classList.contains('levelup')) {
    const who = app.levelHero!
    return mountLevelUp(hx,
      (choice) => { try { performLevelUp(app.ctx!, who.id, 'slice', choice); persist(); note('') } catch (e) { fail((e as Error).message) } },
      () => { app.levelHero = null; render() })
  }
  return mountRewards(hx, (itemId) => act(() => performTakeReward(app.ctx!, itemId, 'slice')))
}

function screen(c: CampaignState): string {
  if (c.ended) return endedScreen(c)
  switch (c.cursor.step) {
    case 'draft': return draftScreen(c)
    case 'questReport': return questReportScreen(c)
    case 'prep': return prepScreen(c)
    case 'battle': return c.cursor.battle?.resultSet ? tallyScreen(c) : battleScreen(c)
    case 'open': return worldScreen(c)
    default: return `<div class="card"><p>The cursor is at <code>${esc(c.cursor.step)}</code> — a step the slice has no screen for yet.</p></div>`
  }
}

// ── in front of the Campaign: src/ui/loadgame.ts ───────────────────────────

/** screen.roster — every hero, class, level, XP, wound, and what each slot holds this Week. */
function rosterScreen(c: CampaignState): string {
  const alive = Object.values(c.roster).filter((h) => h.lifeState === 'alive').map((h) => h.id).sort()
  if (equipWhere(c) === 'roster') return equipPage(c, alive, { where: 'roster', picked: app.picked })
  return rosterCards(c, '')
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

// ── the Week ────────────────────────────────────────────────────────────────
function worldScreen(c: CampaignState): string {
  if (c.cursor.prologue !== null) return openingBanner(c) + rosterPanel(c)
  const row = stageOf(c)
  const at = STAGES.findIndex((s) => s.id === row.id)
  const chips = STAGES.map((s, i) => `<span class="${i === at ? 'on' : i < at ? 'done' : ''}">${esc(s.title)}</span>`).join('')
  const offers = listStageOffers(c)
  const territories = Object.values(c.territories).sort((a, b) => a.id.localeCompare(b.id))
  const heroes = Object.values(c.roster).sort((a, b) => a.id.localeCompare(b.id))
  let body = ''
  if (row.offers === 'engagement' && offers.length) {
    const head = row.targets === 'rolled'
      ? `${esc(row.title)} — <span class="lost">attacked</span> at ${esc(c.territories[offers[0]!]!.name)}. ${c.territories[offers[0]!]!.kingdom ? 'The castle must be defended.' : 'Defend it, or pass and lose it.'}`
      : `${esc(row.title)} — choose a Territory, or pass`
    body += `<h3>${head}</h3><div class="pick">${offers.map((id) => { const t = c.territories[id]!; return `<div class="opt" data-act="choose" data-id="${esc(id)}"><b>${esc(t.name)}</b><small>${esc(t.mapId)} · held by ${t.enemies.length}: ${esc(t.enemies.map((e) => nameOf(e)).join(', '))}${t.buildings.length ? ' · ' + esc(t.buildings.map((b) => b.id).join(', ')) : ''}</small></div>` }).join('')}</div>`
  } else if (row.offers === 'engagement') {
    body += `<h3>${esc(row.title)}</h3><p class="meta">${c.cursor.fought ? 'Fought this Stage — nothing more is offered this Week.' : row.targets === 'rolled' ? 'No attack this Week.' : 'Nothing adjacent is unclaimed.'}</p>`
  }
  if (row.offers === 'city') {
    const rc = costOfRecruit(), hc = costOfHeal()
    const fmt = (cost: Record<string, number>) => Object.entries(cost).map(([k, v]) => `${v} ${k.replace('currency.', '')}`).join(' · ')
    const wounded = heroes.filter((h) => h.lifeState === 'alive' && h.wound > 0)
    body += `<h3>The Beacon — recruit, one a Week · ${esc(fmt(rc))}</h3>
      <div class="pick">${listRecruitOffers(c).map((r) => `<div class="opt${canRecruit(c, r.id) ? '' : ' off'}" data-act="recruit" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(r.classes.map((x) => x.replace('class.', '')).join(', '))} · ${esc(r.unitType)}</small></div>`).join('') || '<p class="meta">nobody answers the Beacon</p>'}</div>
      ${c.cursor.recruited ? '<p class="meta">recruited this Week — the Beacon is closed until next</p>' : ''}
      <h3>The Forge's shelf${isShopOpen(c) ? ` · ${esc(forgeBandName(c) ?? '')} · rerolled each Week` : ' — closed until the Forge is repaired'}</h3>
      <div class="pick">${listShopItems(c).map((r) => `<div class="opt${canBuyItem(c, r.id) ? '' : ' off'}" data-act="buy-item" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(r.slot)} · tier ${r.tier} · ${esc(fmt(costOfItem(c, r.id)))}</small></div>`).join('') || (isShopOpen(c) ? '<p class="meta">sold out for the Week</p>' : '')}</div>
      ${isShopOpen(c) && shelfSpecOf(c).enchanted > 0 && listShopItems(c).every((r) => itemOf(r.id).source !== 'enchanted') ? '<p class="meta">the Enchanted band would show enchanted items; the codex has no buyable enchants yet</p>' : ''}
      ${shelfSpecOf(c).tradeIn ? tradeInPanel(c) : ''}
      <h3>The Waystation${waystationLevelOf(c) ? ` · band ${waystationLevelOf(c)} · a fixed catalog, buy as many as you like` : ' — a ruin until it is repaired'}</h3>
      <div class="pick">${listCatalog(c).map((r) => `<div class="opt${canBuyCatalog(c, r.id) ? '' : ' off'}" data-act="buy-catalog" data-id="${esc(r.id)}" title="${esc(whyNotBuyCatalog(c, r.id) ?? '')}"><b>${esc(r.name)}</b><small>${esc(r.itemClass)}${r.uses ? ` · ${r.uses} use` : ''} · ${esc(fmt(priceOf(r.id)))}</small></div>`).join('') || ''}</div>
      <h3>The Chapel — Field Surgery · ${esc(fmt(hc))} a hero</h3>
      <div class="pick">${wounded.map((h) => `<div class="opt${canHeal(c, h.id) ? '' : ' off'}" data-act="heal" data-id="${esc(h.id)}"><b>${esc(h.name)}</b><small>${esc(woundNameOf(h.wound))} → ${esc(woundNameOf(h.wound - 1))}</small></div>`).join('') || '<p class="meta">nobody is wounded</p>'}</div>`
  }
  if (row.offers === 'city') {
    const free = heroes.map((h) => h.id)
    const working = heroes.filter((h) => c.assignments[h.id] && c.assignments[h.id]!.kind !== 'quest')
    body += `<h3>The Chapel — assign a hero for the Week. Rest clears fatigue and exhaustion when the City closes.</h3>
      <table><tr><th>labour</th><th>pays</th><th>send</th></tr>${listLabours().map((l) => { const y = yieldOf(c, l.key); return `<tr><td><b>${esc(l.name)}</b> <span class="meta">${esc(l.does)}</span></td><td>${y ? `${y.amount} ${esc(y.currency.replace('currency.', ''))}` : '—'}</td><td>${free.filter((h) => canAssignLabour(c, h, l.key)).map((h) => `<button class="quiet" data-act="labour" data-id="${esc(h)}" data-key="${esc(l.key)}">${esc(c.roster[h]!.name)}</button>`).join(' ') || '<span class="meta">nobody free</span>'}</td></tr>` }).join('')}</table>
      ${working.length ? `<h3>Working this Week</h3><p>${working.map((h) => `${esc(h.name)} — ${esc(c.assignments[h.id]!.target)} <button class="quiet" data-act="release" data-id="${esc(h.id)}">undo</button>`).join(' · ')}</p>` : ''}`
  }
  if (row.offers === 'city') {
    const held = listBuildings(c).filter((b) => b.held)
    body += `<h3>Build — Salvage, node by node</h3>` + (held.length ? held.map((b) => `<div class="hall" ${interiorOf(b.building.id) ? `style="background-image:url(${interiorOf(b.building.id)})"` : ''}>${cardOf(b.building.id) ? `<img class="bcard" src="${cardOf(b.building.id)}" alt="">` : ''}<h3>${esc(b.row.name)} <span class="meta">on ${esc(c.territories[b.territoryId]!.name)} · level ${b.building.level}${b.building.damaged ? ' · ruin' : ''}</span></h3>
      <div class="pick">${b.row.nodes.map((n) => { const why = whyNotBuild(c, b.territoryId, b.building.id, n.key); const built = b.building.nodes.includes(n.key); return `<div class="opt${built ? ' on' : why ? ' off' : ''}" ${why ? '' : `data-act="build" data-id="${esc(b.territoryId)}" data-building="${esc(b.building.id)}" data-key="${esc(n.key)}"`}><b>${esc(n.name)} ${built ? '✓' : ''}</b><small>${n.salvage} Salvage${n.parents.length ? ' · after ' + esc(n.parents.join(', ')) : ''}${n.gate ? ' · ' + esc(Object.entries(n.gate).map(([k, v]) => `${v} ${k}s`).join(', ')) + ' (waived)' : ''}${why && !built ? ' · ' + esc(why) : ''}</small></div>` }).join('')}</div></div>`).join('') : '<p class="meta">nothing you hold has a building on it — the Ridge carries the Forge</p>')
  }
  if (row.offers === 'city') {
    const free = listAvailable(c, row.id)
    const inFlight = Object.values(c.quests).sort((a, b) => a.id.localeCompare(b.id))
    const offers = listQuestOffers(c)
    app.party = app.party.filter((h) => free.includes(h))
    if (app.questLead && !app.party.includes(app.questLead)) app.questLead = null
    body += `<h3>Quests — return after the due Field battles</h3>
      ${questCards(c, offers, free, app.party, app.questLead)}
      ${inFlight.length ? `<h3>In flight</h3><table>${inFlight.map((q) => `<tr><td><b>${esc(questRowOf(q.id).name)}</b></td><td>${esc(q.heroes.map((h) => c.roster[h]?.name ?? h).join(', '))}</td><td class="n">${q.weeksLeft} Week${q.weeksLeft === 1 ? '' : 's'} left</td></tr>`).join('')}</table>` : ''}`
  }
  if (!body) {
    body += `<h3>${esc(row.title)}</h3><p>${esc(row.does)}</p><p class="meta">Continue to resolve remaining due quests or enter City.</p>`
  }
  const next = (c.cursor.fieldStep ? FIELD_STEPS[FIELD_STEPS.findIndex((s) => s.key === c.cursor.fieldStep) + 1] : undefined) ?? STAGES[at + 1]
  const attacked = row.targets === 'rolled' && offers.length ? offers[0]! : null
  const picture = ART
    ? `<div class="picture"><div class="steps"><span class="${app.view === 'map' ? 'on' : ''}" data-act="view" data-id="map">The realm</span><span class="${app.view === 'town' ? 'on' : ''}" data-act="view" data-id="town">The Sanctuary</span><span class="meta">${app.view === 'map' ? (row.offers === 'engagement' && offers.length ? 'click a Territory to ' + (row.targets === 'rolled' ? 'defend it' : 'attack it') : 'held in gold · unclaimed dimmed') : 'a building stands here once its Territory is yours; its band is its level'}</span></div>${app.view === 'map' ? worldMapSvg(c, row.offers === 'engagement' ? offers : [], attacked) : townSvg(c)}</div>`
    : ''
  return `<h2>Week ${c.week} — ${esc(row.title)}</h2>
    <div class="steps">${chips}</div>
    ${picture}
    <div class="cols">
      <div>
        <div class="card">${body}</div>
        <div class="bar"><span class="sp"></span><button class="primary" data-act="advance" ${canAdvance(c) ? '' : 'disabled'}>${next ? 'Next — ' + esc(next.title) : 'End the Week'}</button></div>
      </div>
      <div>
        <div class="card"><h3>The purse</h3><table>${Object.entries(c.purse).map(([k, v]) => `<tr><td>${esc(k.replace('currency.', ''))}</td><td class="n">${v}</td></tr>`).join('')}<tr><td>Renown</td><td class="n">${c.renown}</td></tr><tr><td>losses</td><td class="n">${c.losses}</td></tr><tr><td>difficulty</td><td class="n">${resolveDifficulty(c)}</td></tr></table></div>
        <div class="card" style="margin-top:12px"><h3>The map</h3><table>${territories.map((t) => `<tr><td>${esc(t.name)}${t.kingdom ? ' <span class="tag">kingdom</span>' : ''}</td><td>${t.owned ? '<span class="won">held</span>' : 'unclaimed'}</td><td class="meta">${esc(t.buildings.map((b) => b.id.replace('building.', '') + (b.damaged ? ' (ruin)' : '')).join(', '))}</td></tr>`).join('')}</table></div>
        ${c.unavailable.length ? `<div class="card" style="margin-top:12px"><h3>Did not turn up this Week</h3><table>${c.unavailable.map((a) => `<tr><td><b>${esc(c.roster[a.heroId]?.name ?? a.heroId)}</b></td><td class="meta">${esc(a.story)}</td></tr>`).join('')}</table></div>` : ''}
        ${c.stash.length ? `<div class="card" style="margin-top:12px"><h3>The stash</h3><p class="meta">${esc(c.stash.map((i) => i.replace('item.', '')).join(' · '))}</p></div>` : ''}
        ${rosterPanel(c)}
        ${charterPanel(c)}
      </div>
    </div>`
}


/** The trade-in: three of one category and tier in the stash → one a tier up. Groups the stash and offers each group of three. */
function tradeInPanel(c: CampaignState): string {
  const groups = new Map<string, string[]>()
  for (const id of c.stash) { const r = itemOf(id); const k = `${tradeCategoryOf(r)}·${r.tier}`; groups.set(k, [...(groups.get(k) ?? []), id]) }
  const offers = [...groups.entries()].filter(([, ids]) => ids.length >= 3).map(([k, ids]) => { const three = ids.slice(0, 3); const why = whyNotTradeIn(c, three); return `<div class="opt${why ? ' off' : ''}" ${why ? `title="${esc(why)}"` : `data-act="trade-in" data-id="${esc(three.join(','))}"`}><b>three ${esc(k.replace('·', ' tier '))} → one tier ${Number(k.split('·')[1]) + 1}</b><small>${esc(three.map((id) => itemOf(id).name).join(' · '))}${why ? ' · ' + esc(why) : ''}</small></div>` })
  return `<h3>The trade-in — three for one, a tier up</h3><div class="pick">${offers.join('') || '<p class="meta">nothing in the stash comes in threes of one category and tier</p>'}</div>`
}

// ── Combat Prep ─────────────────────────────────────────────────────────────
function prepScreen(c: CampaignState): string {
  const v = viewCombatPrep(c)
  // ruled 2026-09-04: Equip is its own screen, opened by prep once Deploy is done — not a step under the bar
  if (v.step === 'equip') return equipPage(c, v.deployed, { where: 'prep', picked: app.picked, engagementId: v.engagementId, canAdvance: v.canAdvance })
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
function battleScreen(c: CampaignState): string {
  const v = shownBattle = viewBattle(c)
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
  return `<h2>The battle — ${esc(v.mapName)}</h2>
    <p class="meta"><code>${esc(v.engagementId)}</code> · ${esc(v.kind)} · ${heroes.length} heroes, ${enemies.length} enemies, placed by the engine's own setup. Nothing moves: combat is not played in the slice.</p>
    <div data-battle-surface></div>
    <div class="card"><h3>Fielded as equipped</h3><table><tr><th>hero</th><th>carries</th><th>attacks</th></tr>${heroes.map((u) => `<tr><td><span class="tag hero">H${u.index + 1}</span> ${esc(u.name)}</td><td class="meta">${esc(u.equipped.map((i) => itemOf(i).name).join(', ') || '—')}</td><td class="meta">${esc(u.attacks.map((a) => a.replace('attack.', '')).join(', ') || '—')}${u.leftBehind.length ? ` <span class="lost">left behind: ${esc(u.leftBehind.map((i) => itemOf(i).name).join(', '))} — a spare weapon the engine cannot yet take (seam.spare-weapons)</span>` : ''}</td></tr>`).join('')}</table></div>
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

// ── wiring ──────────────────────────────────────────────────────────────────
function wire(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    const actName = el.dataset['act']!
    if (actName === 'slot-file') {
      el.addEventListener('change', () => {
        const f = (el as HTMLInputElement).files?.[0]
        if (!f) return
        f.text().then((t) => loadJson(t, f.name, { realm: el.dataset['realm']!, n: Number(el.dataset['n']) }))
      })
      return
    }
    el.addEventListener('click', (ev) => {
      // the innermost [data-act] under the pointer is the one that acts — a × inside a slot is the ×, not the slot
      if (ev && ev.target && (ev.target as HTMLElement).closest && (ev.target as HTMLElement).closest('[data-act]') !== el) return
      const id = el.dataset['id']
      const slotOf = () => ({ realm: el.dataset['realm']!, n: Number(el.dataset['n']) })
      switch (actName) {
        case 'slot-fixture': return loadJson(__FIXTURE_JSON__, 'the fixture', slotOf())
        // the one place chance enters from outside the rules: a new save's seed, chosen at the player's click
        // and written into the save, so every roll after it is keyed and reproducible (Law 4)
        case 'slot-new': return loadJson(saveOf(makeNewCampaign(Math.floor(Math.random() * 1e9))), 'a new Campaign', slotOf())
        case 'slot-continue': { const saved = readSlot(el.dataset['realm']!, Number(el.dataset['n'])); return saved ? loadJson(saved, `slot ${el.dataset['n']}`, slotOf()) : (fail('that slot is empty'), render()) }
        case 'slot-end': app.confirmEnd = slotOf(); return render()
        case 'slot-end-cancel': app.confirmEnd = null; return render()
        case 'slot-clear': clearSlot(slotOf().realm, slotOf().n); app.confirmEnd = null; note(`slot ${slotOf().n} cleared — that run is over`); return render()
        case 'title': persist(); app.ctx = null; app.slot = null; app.roster = false; note(''); return render()
        case 'roster': app.roster = !app.roster; return render()
        case 'view': app.view = id as 'map' | 'town'; return render()
        case 'party': app.party = app.party.includes(id!) ? app.party.filter((h) => h !== id) : [...app.party, id!]; return render()
        case 'quest-lead': app.questLead = id!; if (!app.party.includes(id!)) app.party.push(id!); return render()
        case 'quest-report': return act(() => performAcknowledgeQuest(app.ctx!, 'slice'))
        case 'send-quest': return act(() => { performSendQuest(app.ctx!, id!, app.party, 'slice', questRowOf(id!).staffing.kind === 'hero-led' ? app.questLead : null); app.party = []; app.questLead = null })
        case 'draft': return act(() => performDraft(app.ctx!, id!, 'slice'))
        case 'restart': return act(() => { app.ctx = makeCtx(performEndCampaign(app.ctx!, 'slice')) })   // a fresh Campaign in the same slot
        case 'purchase': return act(() => performPurchase(app.ctx!, id!, 'slice'))
        case 'download': return download()
        case 'advance': return act(() => (app.ctx!.campaign.cursor.step === 'prep' ? performAdvancePrep(app.ctx!, 'slice') : performAdvance(app.ctx!, 'slice')))
        case 'choose': return act(() => { performChooseEngagement(app.ctx!, id!, 'slice') })
        case 'recruit': return act(() => performRecruit(app.ctx!, id!, 'slice'))
        case 'heal': return act(() => performHeal(app.ctx!, id!, 'slice'))
        case 'labour': return act(() => performAssignLabour(app.ctx!, id!, el.dataset['key']!, 'slice'))
        case 'release': return act(() => performRelease(app.ctx!, id!, 'city', 'slice'))
        case 'build': return act(() => performBuild(app.ctx!, id!, el.dataset['building']!, el.dataset['key']!, 'slice'))
        case 'buy-item': return act(() => performBuyItem(app.ctx!, id!, 'slice'))
        case 'buy-catalog': return act(() => performBuyCatalog(app.ctx!, id!, 'slice'))
        case 'trade-in': return act(() => { const got = performTradeIn(app.ctx!, id!.split(','), 'slice'); note(`traded in — ${itemOf(got).name}`) })
        case 'equip': return act(() => performEquip(app.ctx!, id!, el.dataset['item']!, 'slice', el.dataset['displace']))
        case 'pick': app.picked = app.picked === id ? null : id!; return render()
        case 'drop': return act(() => { performEquip(app.ctx!, id!, el.dataset['item']!, 'slice', el.dataset['displace']); app.picked = null })
        case 'unequip': return act(() => performUnequip(app.ctx!, id!, el.dataset['item']!, 'slice'))
        case 'open-equip': return act(() => { performOpenEquip(app.ctx!, 'slice'); app.roster = true })
        case 'close-equip': return act(() => { performCloseEquip(app.ctx!, 'slice'); app.picked = null })
        case 'council': return act(() => performCouncil(app.ctx!, viewCombatPrep(app.ctx!.campaign).tactic === id ? null : id!, 'slice'))
        case 'deploy': return act(() => performDeploy(app.ctx!, id!, 'slice'))
        case 'undeploy': return act(() => performUndeploy(app.ctx!, id!, 'slice'))
        case 'decide': return act(() => {
          const e = app.ctx!.campaign.cursor.engagement!
          const r = validateResult(app.draft!, { heroes: e.deployed.length, enemies: e.enemies.length, id: e.id })
          const k = resolveReckoning(app.ctx!.campaign, e, r)
          setBattleOutcome(app.ctx!, r, k, 'slice')
        })
        case 'apply': return act(() => { const b = app.ctx!.campaign.cursor.battle!; const e = app.ctx!.campaign.cursor.engagement!; app.lastBattle = { engagementId: e.id, result: b.result!, reckoning: b.reckoning! }; applyBattleResult(app.ctx!, e, b.result!, b.reckoning!); app.draft = null })
        case 'exit': return act(() => (app.ctx!.campaign.cursor.step === 'levelUp' ? performLeaveLevelUp(app.ctx!, 'slice') : performExitBattle(app.ctx!, 'slice')))
        case 'level-hero': app.levelHero = { id: id!, from: app.ctx!.campaign.cursor.step === 'open' ? 'roster' : 'rewards' }; return render()
        case 'mute': { toggleMute(); el.textContent = isMuted() ? 'sound off' : 'sound on'; return }
        // the ceremony's own controls (confirm-reward, reveal-all, choose-*, lu-*) are wired by the mount, not here
        case 'back-to-panel': return act(() => { app.draft = app.ctx!.campaign.cursor.battle?.result ?? app.draft; setCursor(app.ctx!, { battle: { resultSet: false } }, 'slice') })
      }
    })
  })
  // the Equip screen: drag a stash item onto a slot (the click path is data-act pick → drop)
  root.querySelectorAll<HTMLElement>('.equip .item[draggable]').forEach((el) => {
    el.addEventListener('dragstart', (ev) => { ev.dataTransfer?.setData('text/plain', el.dataset['id']!); app.picked = el.dataset['id']!; render() })
  })
  root.querySelectorAll<HTMLElement>('.equip .slot[data-slot]').forEach((el) => {
    el.addEventListener('dragover', (ev) => { ev.preventDefault(); el.classList.add('over') })
    el.addEventListener('dragleave', () => el.classList.remove('over'))
    el.addEventListener('drop', (ev) => {
      ev.preventDefault()
      const item = ev.dataTransfer?.getData('text/plain') || app.picked
      const hero = el.dataset['hero']!
      if (!item) return
      act(() => { performEquip(app.ctx!, hero, item, 'slice', displaceFor(app.ctx!.campaign, hero, item, el.dataset['slot']!)); app.picked = null })
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

// the headless smoke (tools/smoke-slice.mjs) has no DOM for a ceremony to run on; it drives the same performX calls the mounts do
;(globalThis as { __sliceDrive?: unknown }).__sliceDrive = {
  battleViewer: () => battleSurface.viewer,
  takeReward: (id: string) => act(() => performTakeReward(app.ctx!, id, 'slice')),
  levelUp: (id: string, choice: { specialtyId?: string; pick?: number }) => act(() => performLevelUp(app.ctx!, id, 'slice', choice)),
  offers: () => listRewardOffers(app.ctx!.campaign).map((o) => o.id),
  leaveLevelUp: () => act(() => performLeaveLevelUp(app.ctx!, 'slice')),
  closeLevelSheet: () => { app.levelHero = null; render() },
}

// ── boot ────────────────────────────────────────────────────────────────────
// the Load Game screen stands in front of the Campaign: slots are offered, never auto-loaded
migrateLegacySave()
;(() => { const ff = fontFaces(); if (ff) { const st = document.createElement('style'); st.textContent = ff; document.head.appendChild(st) } })()
render()
