// The mutator module — Law 3: every state change goes through a mutator, and
// every mutator emits an event. Nothing outside this file writes to a
// CampaignState. GLOSSARY.md: `applyX()` / `setX()` are the mutator facade,
// and nothing outside mutate.ts may define one.
//
// Mirrors the engine's shape: the plain-data Campaign is the save; everything
// unserializable — the event log — lives beside it in a Ctx.

import type { CampaignState, Cursor, Assignment, Hero, Absence, QuestInFlight, QuestOutcome } from './campaign.js'
import type { KingdomEventType } from './events.js'
import type { EngagementResult } from './seam.js'
import type { Reckoning } from './reckoning.js'

export type KingdomEvent = {
  seq: number
  week: number
  stage: string
  type: KingdomEventType
  /** Who or what caused this — every line names its cause (Law 12). */
  causeId: string
  [k: string]: unknown
}

export type Ctx = {
  campaign: CampaignState
  events: KingdomEvent[]
}

export function makeCtx(campaign: CampaignState): Ctx {
  return { campaign, events: [] }
}

export function emit(ctx: Ctx, type: KingdomEventType, causeId: string, fields: Record<string, unknown> = {}): KingdomEvent {
  const e: KingdomEvent = {
    seq: ctx.events.length,
    week: ctx.campaign.week,
    stage: ctx.campaign.cursor.stage,
    type, causeId,
    ...fields,
  }
  ctx.events.push(e)
  return e
}

/** The Engagement on the cursor, or a loud refusal (Law 9). */
export function engagementOf(campaign: CampaignState) {
  const e = campaign.cursor.engagement
  if (!e) throw new Error(`no Engagement on the cursor at week ${campaign.week}, step ${campaign.cursor.step}`)
  return e
}

/** The War Council's draw, written to the Engagement so a reload shows the same three. */
export function setCouncilOffer(ctx: Ctx, offer: readonly string[], causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.councilOffer = [...offer]
  emit(ctx, 'council.offered', causeId, { engagementId: e.id, offer: [...offer] })
}

/** The pick — one of the offer, or null for a skip. */
export function setTactic(ctx: Ctx, tacticId: string | null, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.tactic = tacticId
  emit(ctx, 'council.taken', causeId, { engagementId: e.id, tacticId })
}

/** The equip session — the one write of cursor.equipSession (G5). Opening and closing, paying and refunding, each its own word. */
export function setEquipSession(ctx: Ctx, session: Cursor['equipSession'], causeId: string, said: { type: 'equip.opened' | 'equip.closed' | 'equip.paid' | 'equip.refunded'; heroId?: string; itemId?: string }): void {
  ctx.campaign.cursor.equipSession = session ? { where: session.where, paid: session.paid.map((p) => ({ ...p, cost: { ...p.cost } })) } : null
  emit(ctx, said.type, causeId, { where: session?.where ?? null, heroId: said.heroId, itemId: said.itemId, paid: session?.paid.length ?? 0 })
}

/** The Week's absences — the one write of campaign.unavailable. An empty list clears it. */
export function setUnavailable(ctx: Ctx, absences: readonly Absence[], causeId: string): void {
  ctx.campaign.unavailable = absences.map((a) => ({ ...a }))
  if (absences.length) emit(ctx, 'absence.rolled', causeId, { week: ctx.campaign.week, absences: ctx.campaign.unavailable.map((a) => ({ ...a })) })
  else emit(ctx, 'absence.cleared', causeId, { week: ctx.campaign.week })
}

/** A quest into flight — the one write of campaign.quests. */
export function setQuestInFlight(ctx: Ctx, quest: QuestInFlight, causeId: string): void {
  ctx.campaign.quests[quest.id] = { ...quest, heroes: [...quest.heroes] }
  emit(ctx, 'quest.sent', causeId, { questId: quest.id, runId: quest.runId, leadHeroId: quest.leadHeroId, heroes: [...quest.heroes], weeks: quest.weeksLeft })
}

export function setQuestOutcome(ctx: Ctx, questId: string, outcome: QuestOutcome, causeId: string): void {
  const q = ctx.campaign.quests[questId]
  if (!q || q.outcome) throw new Error('quest outcome is missing its pending run or was already prepared')
  q.outcome = structuredClone(outcome)
  emit(ctx, 'quest.prepared', causeId, { questId, runId: q.runId, outcome: outcome.kind })
}

export function setQuestWeeksLeft(ctx: Ctx, questId: string, weeksLeft: number, causeId: string): void {
  const q = ctx.campaign.quests[questId]
  if (!q) throw new Error(`no quest '${questId}' in flight`)
  q.weeksLeft = weeksLeft
  emit(ctx, 'quest.ticked', causeId, { questId, weeksLeft })
}

/** A quest home, won or lost — what it paid is the caller's grants, before this. */
export function setQuestResolved(ctx: Ctx, questId: string, won: boolean, causeId: string): void {
  const q = ctx.campaign.quests[questId]
  if (!q) throw new Error(`no quest '${questId}' in flight`)
  delete ctx.campaign.quests[questId]
  emit(ctx, 'quest.resolved', causeId, { questId, runId: q.runId, heroes: [...q.heroes], won })
}

/** An Assignment into a slot — the one write of campaign.assignments. */
export function applyCommit(ctx: Ctx, heroId: string, slot: 'field' | 'city', assignment: Assignment, causeId: string): void {
  ctx.campaign.assignments[heroId] = { ...assignment }
  emit(ctx, 'hero.committed', causeId, { heroId, slot, kind: assignment.kind, target: assignment.target, weeks: assignment.weeks })
}

export function applyRelease(ctx: Ctx, heroId: string, slot: 'field' | 'city', causeId: string): void {
  const a = ctx.campaign.assignments[heroId]
  if (!a) return
  const was = a
  delete ctx.campaign.assignments[heroId]
  emit(ctx, 'hero.released', causeId, { heroId, slot, kind: was.kind, target: was.target })
}

/** A hero into the field for this Engagement — the field slot, for the Week. */
export function applyDeploy(ctx: Ctx, heroId: string, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.deployed.push(heroId)
  applyCommit(ctx, heroId, 'field', { kind: 'engagement', target: e.id, weeks: 1 }, causeId)
}

export function applyUndeploy(ctx: Ctx, heroId: string, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.deployed = e.deployed.filter((h) => h !== heroId)
  applyRelease(ctx, heroId, 'field', causeId)
}


/**
 * What the outcome panel SET — the result and the Reckoning proposed from it —
 * written to the cursor as plain data so a reload lands on the tally. The
 * writer (applyBattleResult) reads it from here and nowhere else.
 */
export function setBattleOutcome(ctx: Ctx, result: EngagementResult, reckoning: Reckoning, causeId: string): void {
  if (ctx.campaign.cursor.step !== 'battle') throw new Error(`setBattleOutcome refused: the cursor is at step '${ctx.campaign.cursor.step}', not the battle`)
  ctx.campaign.cursor.battle = { resultSet: true, result, reckoning }
  emit(ctx, 'battle.decided', causeId, { engagementId: result.id, outcome: result.outcome })
}

/** A recruit onto the roster — the one write of campaign.roster's keys. */
export function applyRecruit(ctx: Ctx, hero: Hero, causeId: string, cost: Record<string, number>): void {
  if (ctx.campaign.roster[hero.id]) throw new Error(`applyRecruit refused: '${hero.id}' is already on the roster`)
  ctx.campaign.roster[hero.id] = { ...hero, classes: [...hero.classes], badges: [...hero.badges], equipped: [...hero.equipped] }
  emit(ctx, 'hero.recruited', causeId, { heroId: hero.id, name: hero.name, cost })
  emitWorn(ctx, hero, 'beacon', causeId)
}

/** A hero enters WEARING its kit (G3, 2026-09-02): one item.equipped per item, naming where the hero came from. */
function emitWorn(ctx: Ctx, hero: Hero, from: 'draft' | 'beacon' | 'rescue', causeId: string): void {
  for (const itemId of hero.equipped) emit(ctx, 'item.equipped', causeId, { heroId: hero.id, itemId, from })
}

/** The reward draft: offered as three, then one taken into the stash and the rest burned. */
export function setRewardOffer(ctx: Ctx, offer: readonly string[] | null, causeId: string): void {
  ctx.campaign.cursor.rewardOffer = offer ? [...offer] : null
  if (offer) emit(ctx, 'reward.offered', causeId, { offer: [...offer] })
}

export function applyTakeReward(ctx: Ctx, itemId: string, causeId: string): void {
  const offer = ctx.campaign.cursor.rewardOffer ?? []
  ctx.campaign.stash.push(itemId)
  ctx.campaign.cursor.rewardOffer = null
  emit(ctx, 'reward.taken', causeId, { itemId, burned: offer.filter((i) => i !== itemId) })
}

/**
 * A level, with what the codex row grants (screens.after-battle, G12): the grants ride on the
 * event so the log says what the level did; itemSlots — the slot model's number, the one grant
 * the kingdom folds itself — moves on the hero; the rest is the engine's at fielding, from the
 * same rows, through heroProgress. A pick (level 5) is recorded as its option index.
 */
export function applyLevel(ctx: Ctx, heroId: string, causeId: string, grants: Readonly<Record<string, number>> = {}, pick: number | null = null, specialtyDeclined = false): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  h.level += 1
  if (grants['itemSlots']) h.itemSlots += grants['itemSlots']
  if (pick !== null) h.levelPick = pick
  emit(ctx, 'hero.leveled', causeId, { heroId, level: h.level, xp: h.xp, grants: { ...grants }, ...(pick !== null ? { pick } : {}), ...(specialtyDeclined ? { specialtyDeclined: true } : {}) })
}

export function applySpecialty(ctx: Ctx, heroId: string, specialtyId: string, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  h.specialty = specialtyId
  emit(ctx, 'hero.specialized', causeId, { heroId, specialtyId, level: h.level })
}

/** A node of a building's tree, bought — the one write of a Building's nodes. */
export function applyBuildNode(ctx: Ctx, territoryId: string, buildingId: string, nodeKey: string, causeId: string): void {
  const t = ctx.campaign.territories[territoryId]
  const b = t?.buildings.find((x) => x.id === buildingId)
  if (!b) throw new Error(`no building '${buildingId}' on '${territoryId}'`)
  b.nodes.push(nodeKey)
  b.level = b.nodes.length
  b.damaged = false
  emit(ctx, 'building.built', causeId, { territoryId, buildingId, node: nodeKey, level: b.level })
}

export function applyBuyItem(ctx: Ctx, itemId: string, cost: Record<string, number>, causeId: string): void {
  ctx.campaign.stash.push(itemId)
  ctx.campaign.cursor.sold.push(itemId)
  emit(ctx, 'item.bought', causeId, { itemId, cost })
}

/** A one-use item spent in the Battle being fought — the one write of cursor.spent. */
export function applySpendUse(ctx: Ctx, itemId: string, causeId: string): void {
  ctx.campaign.cursor.spent.push(itemId)
  emit(ctx, 'item.spent', causeId, { itemId })
}

/**
 * v2.item-uses (engine cdb2233, 2026-09-24): one hero's item instance — its equipped slot —
 * spent `n` uses in the Battle being fought. The one write of `hero.used`; each use also
 * goes on the Battle's record through applySpendUse, so ISC-061's restock reads one list.
 * `item.spent` names the hero and the slot (Law 12).
 */
export function applyInstanceUse(ctx: Ctx, heroId: string, slot: number, itemId: string, n: number, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  if (h.equipped[slot] !== itemId) throw new Error(`applyInstanceUse refused: ${heroId}'s slot ${slot} holds '${h.equipped[slot] ?? 'nothing'}', not '${itemId}'`)
  const used = h.used ? [...h.used] : h.equipped.map(() => 0)
  if (used.length !== h.equipped.length) throw new Error(`applyInstanceUse refused: ${heroId}'s item uses do not match its equipped items`)
  used[slot] = used[slot]! + n
  h.used = used
  for (let k = 0; k < n; k++) ctx.campaign.cursor.spent.push(itemId)
  emit(ctx, 'item.spent', causeId, { itemId, heroId, slot, used: used[slot] })
}

/** Everything spent, made whole again as the Battle is left. */
export function applyRestock(ctx: Ctx, causeId: string): void {
  const spent = [...new Set(ctx.campaign.cursor.spent)].sort()
  ctx.campaign.cursor.spent = []
  // v2.item-uses: every hero's instances are whole again too
  for (const id of Object.keys(ctx.campaign.roster).sort()) delete ctx.campaign.roster[id]!.used
  for (const itemId of spent) emit(ctx, 'item.restocked', causeId, { itemId })
}

/** The trade-in: three burned from the stash, one gained — one write, one word. */
export function applyTradeIn(ctx: Ctx, burned: readonly string[], itemId: string, causeId: string): void {
  for (const id of burned) {
    const at = ctx.campaign.stash.indexOf(id)
    if (at < 0) throw new Error(`applyTradeIn refused: '${id}' is not in the stash`)
    ctx.campaign.stash.splice(at, 1)
  }
  ctx.campaign.stash.push(itemId)
  emit(ctx, 'item.traded', causeId, { burned: [...burned], itemId })
}

/** Off the hero, into the shared stash — the one write that removes from `equipped`. */
export function applyUnequip(ctx: Ctx, heroId: string, itemId: string, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  const at = h.equipped.indexOf(itemId)
  if (at < 0) throw new Error(`applyUnequip refused: '${itemId}' is not worn by ${heroId}`)
  // v2.item-uses: a spent instance's count is its slot's; it cannot leave the hero before the restock
  if ((h.used?.[at] ?? 0) > 0) throw new Error(`applyUnequip refused: ${heroId}'s '${itemId}' has spent uses — it is restocked as the Battle is left`)
  h.equipped.splice(at, 1)
  if (h.used) h.used.splice(at, 1)
  ctx.campaign.stash.push(itemId)
  emit(ctx, 'item.unequipped', causeId, { heroId, itemId })
}

export function applyEquip(ctx: Ctx, heroId: string, itemId: string, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  const at = ctx.campaign.stash.indexOf(itemId)
  if (at < 0) throw new Error(`applyEquip refused: '${itemId}' is not in the stash`)
  ctx.campaign.stash.splice(at, 1)
  h.equipped.push(itemId)
  if (h.used) h.used.push(0)   // v2.item-uses: parallel to equipped
  emit(ctx, 'item.equipped', causeId, { heroId, itemId })
}

/** The opening's draft: offered as three, then one taken onto the roster. */
export function setDraftOffer(ctx: Ctx, offer: readonly string[] | null, causeId: string): void {
  ctx.campaign.cursor.draftOffer = offer ? [...offer] : null
  if (offer) emit(ctx, 'draft.offered', causeId, { offer: [...offer] })
}

export function applyDraft(ctx: Ctx, hero: Hero, causeId: string): void {
  if (ctx.campaign.roster[hero.id]) throw new Error(`applyDraft refused: '${hero.id}' is already on the roster`)
  // kingdom.opening-draft-modifiers: what the draft gave the hero is written with it — its own copy (Law 5b), never the caller's
  const drafted = hero.drafted ? { drafted: { badges: [...hero.drafted.badges], rolls: hero.drafted.rolls.map((r) => ({ ...r })), mods: hero.drafted.mods.map((m) => ({ ...m })), unfielded: hero.drafted.unfielded.map((r) => ({ ...r })) } } : {}
  ctx.campaign.roster[hero.id] = { ...hero, classes: [...hero.classes], badges: [...hero.badges], equipped: [...hero.equipped], ...drafted }
  ctx.campaign.cursor.draftOffer = null
  // …and said (Law 3): the line names the badges and the stat points the hero joined with, and its item slots when a point moved them
  emit(ctx, 'hero.drafted', causeId, { heroId: hero.id, name: hero.name, ...(hero.drafted ? { badges: [...hero.drafted.badges], rolls: hero.drafted.rolls.map((r) => ({ ...r })), mods: hero.drafted.mods.map((m) => ({ ...m })), itemSlots: hero.itemSlots } : {}) })
  emitWorn(ctx, hero, 'draft', causeId)
}

/** A civilian rescued into the roster — the same record as any hero (ruled 2026-08-23). */
export function applyRescue(ctx: Ctx, hero: Hero, causeId: string): void {
  if (ctx.campaign.roster[hero.id]) return
  ctx.campaign.roster[hero.id] = { ...hero, classes: [...hero.classes], badges: [...hero.badges], equipped: [...hero.equipped] }
  emit(ctx, 'hero.rescued', causeId, { heroId: hero.id, name: hero.name })
  emitWorn(ctx, hero, 'rescue', causeId)
}

/** Permanent death — the Campaign is over. §6: "there is no branch, no reload." */
export function setEnded(ctx: Ctx, reason: string, causeId: string): void {
  ctx.campaign.ended = { week: ctx.campaign.week, reason }
  emit(ctx, 'campaign.ended', causeId, { week: ctx.campaign.week, reason })
}

/** A Charter purchase — the one write of campaign.unlocks. */
export function applyUnlock(ctx: Ctx, id: string, tier: string, causeId: string): void {
  if (ctx.campaign.unlocks.includes(id)) throw new Error(`applyUnlock refused: '${id}' is already held`)
  ctx.campaign.unlocks.push(id)
  emit(ctx, 'unlock.purchased', causeId, { unlockId: id, tier, renown: ctx.campaign.renown, spent: ctx.campaign.unlocks.length })
}

// ── what the one writer says as it writes ───────────────────────────────────

function heroOrThrow(campaign: CampaignState, heroId: string) {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  return h
}

export function applyXp(ctx: Ctx, heroId: string, amount: number, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  h.xp += amount
  emit(ctx, 'xp.gained', causeId, { heroId, amount, xp: h.xp })
}

/** A wound is a LEVEL, replaced not accumulated (GAME-ARCHITECTURE.md §4.2). */
export function setWound(ctx: Ctx, heroId: string, level: number, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  const from = h.wound
  h.wound = level
  emit(ctx, 'hero.wounded', causeId, { heroId, from, to: level })
}

export function setHeroDead(ctx: Ctx, heroId: string, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  if (h.lifeState === 'dead') return
  h.lifeState = 'dead'
  emit(ctx, 'hero.died', causeId, { heroId })
}

export function applyGrant(ctx: Ctx, currencyId: string, amount: number, causeId: string): void {
  if (!(currencyId in ctx.campaign.purse)) throw new Error(`no currency '${currencyId}' in the purse — currencies are named at makeCampaign: ${Object.keys(ctx.campaign.purse).join(', ')}`)
  ctx.campaign.purse[currencyId]! += amount
  emit(ctx, 'resource.gained', causeId, { currencyId, amount, balance: ctx.campaign.purse[currencyId] })
}

export function applySpend(ctx: Ctx, currencyId: string, amount: number, causeId: string): void {
  if (!(currencyId in ctx.campaign.purse)) throw new Error(`no currency '${currencyId}' in the purse`)
  if (amount > ctx.campaign.purse[currencyId]!) throw new Error(`applySpend refused: ${amount} ${currencyId} from a purse holding ${ctx.campaign.purse[currencyId]}`)
  ctx.campaign.purse[currencyId]! -= amount
  emit(ctx, 'resource.spent', causeId, { currencyId, amount, balance: ctx.campaign.purse[currencyId] })
}

export function applyRenown(ctx: Ctx, amount: number, causeId: string): void {
  ctx.campaign.renown += amount
  emit(ctx, 'renown.gained', causeId, { amount, renown: ctx.campaign.renown })
}

/** The Engagement is over, won or lost; a loss counts (SKELETON-NOTES.md: −5 per loss). */
/** `voided` (kingdom.opening-hero-death-replays): the attempt is not kept — it is not won, and it is not counted a loss. */
export function setEngagementResolved(ctx: Ctx, engagementId: string, won: boolean, causeId: string, voided = false): void {
  if (!won && !voided) ctx.campaign.losses += 1
  const kind = ctx.campaign.cursor.engagement?.id === engagementId ? ctx.campaign.cursor.engagement.kind : null
  emit(ctx, 'engagement.resolved', causeId, { engagementId, kind, won, losses: ctx.campaign.losses, ...(voided ? { voided: true } : {}) })
}

export function applyClaim(ctx: Ctx, territoryId: string, causeId: string): void {
  const t = ctx.campaign.territories[territoryId]
  if (!t) throw new Error(`no Territory '${territoryId}' on the map`)
  t.owned = true
  const first = !t.claimedOnce
  t.claimedOnce = true
  emit(ctx, 'territory.claimed', causeId, { territoryId, first, buildings: t.buildings.map((b) => b.id) })
}

export function applyLose(ctx: Ctx, territoryId: string, causeId: string): void {
  const t = ctx.campaign.territories[territoryId]
  if (!t) throw new Error(`no Territory '${territoryId}' on the map`)
  if (t.kingdom) throw new Error(`the Kingdom Territory '${territoryId}' cannot be lost (SKELETON-SETTLED.md:81)`)
  t.owned = false
  emit(ctx, 'territory.lost', causeId, { territoryId })
}

/**
 * Move the cursor. One mutator for every cursor change, so a reload always
 * lands where an event says the save was (§2.2: the autosave writes on every
 * endStage — the emit is what a save can be keyed to).
 */
export function setCursor(ctx: Ctx, next: Partial<Cursor>, causeId: string): void {
  const before = { ...ctx.campaign.cursor }
  Object.assign(ctx.campaign.cursor, next)
  if (next.week !== undefined) ctx.campaign.week = next.week
  emit(ctx, 'cursor.moved', causeId, { from: before, to: { ...ctx.campaign.cursor } })
}

/** Weekly participation is separate from an in-progress battle reservation. */
export function setFoughtThisWeek(ctx: Ctx, heroIds: readonly string[], causeId: string): void {
  ctx.campaign.foughtThisWeek = [...new Set(heroIds)].sort()
  emit(ctx, 'heroes.fielded', causeId, { heroes: [...ctx.campaign.foughtThisWeek] })
}

export function setHeroBadges(ctx: Ctx, heroId: string, badges: readonly string[], causeId: string): void {
  ctx.campaign.roster[heroId]!.badges = [...badges]
  emit(ctx, 'hero.badges-changed', causeId, { heroId, badges: [...badges] })
}
