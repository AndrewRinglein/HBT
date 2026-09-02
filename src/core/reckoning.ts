// The Reckoning — what the Campaign decides from a battle's result. Two halves:
//
//   resolveReckoning(campaign, engagement, result) → Reckoning     PURE — a proposal
//   applyBattleResult(ctx, engagement, result, reckoning)          the one writer (M4)
//
// GLOSSARY.md: resolveX computes a value and its ledger; the panel may edit
// every proposed value before the writer runs ("Xp gain by unit. Wounded by
// hero unit. Just set everything that could happen in battle" — 2026-09-01),
// and the writer writes exactly what it is given (ISC-032). The engine path
// gets the same proposal from the same function; nothing here knows which
// hand made the result.
//
// Numbers are SOFT and every one has an owner or a switch:
//   XP    15 − enemy phases (speed bonus, SKELETON-NOTES.md B6) + 3 per kill
//         (3-UNITS-SETTLED.md "3 / 6 / 9 per kill by rank" — rank 1 until enemy
//         rows carry a rank) + 10 to the MVP, a weighted roll on a named cup
//         (B7). Never below 0.
//   Wound downed and alive → Wounded (1); dead → dead; untouched → 0. The
//         Deathbed is OUT of the slice (THIN-SLICE-IMPLEMENTATION.md §8), so
//         "down-and-out resolves to plain wounds" — SWITCHES.md, wound.fromDowned.
//   Renown +1 per Engagement won (KINGDOM-DESIGN.md §3A). Losses +1 per lost.
//   Claim a won Conquer claims the Territory (7-KINGDOM-SETTLED.md); Salvage
//         only then, and never twice (SKELETON-SETTLED.md:104,108) — the amount
//         is unruled: SWITCHES.md, salvage.perConquest.

import type { CampaignState, Engagement, HeroId, TerritoryId } from './campaign.js'
import type { EngagementResult } from './seam.js'
import { rollOf } from './rng.js'
import { engagementKindOf } from '../content/engagements.js'
import { SWITCHES } from '../content/switches.js'
import { CUP_IDS } from '../content/cups.js'

export type HeroReckoning = {
  heroId: HeroId
  xp: number
  /** 0 none · 1 Wounded · 2 Badly Wounded · 3 Severe. Ignored when dead. */
  wound: number
  dead: boolean
  mvp: boolean
}

export type Reckoning = {
  engagementId: string
  won: boolean
  heroes: HeroReckoning[]
  renown: number
  losses: number
  /** A Territory claimed by this battle, or null. */
  claim: TerritoryId | null
  /** A Territory lost by this battle, or null. */
  lose: TerritoryId | null
  salvage: number
}

export function resolveReckoning(campaign: CampaignState, engagement: Engagement, result: EngagementResult): Reckoning {
  const kind = engagementKindOf(engagement.kind)
  const won = result.outcome === 'heroClear'
  const speed = Math.max(0, 15 - result.enemyPhases)

  const heroes: HeroReckoning[] = result.units.filter((u) => u.side === 'hero').map((u) => {
    const heroId = engagement.deployed[u.index]
    if (!heroId) throw new Error(`${engagement.id}: result names hero row ${u.index} but only ${engagement.deployed.length} were deployed`)
    const dead = u.lifeState === 'dead'
    return {
      heroId,
      xp: dead ? 0 : speed + 3 * u.kills,
      wound: dead ? 0 : u.downed ? SWITCHES.woundFromDowned : 0,
      dead,
      mvp: false,
    }
  })

  // MVP — "chosen randomly among all of the heroes… the more experience points
  // a hero got, the higher their chance" (B7). A weighted roll, keyed by the
  // Engagement, on its own cup. Nobody alive → no MVP.
  const alive = heroes.filter((h) => !h.dead)
  const weight = alive.reduce((s, h) => s + h.xp + 1, 0)
  if (alive.length) {
    let at = rollOf(campaign, CUP_IDS.mvp, [engagement.id]) % weight
    for (const h of alive) { at -= h.xp + 1; if (at < 0) { h.mvp = true; h.xp += 10; break } }
  }

  const territory = campaign.territories[engagement.territoryId]
  if (!territory) throw new Error(`${engagement.id}: Territory '${engagement.territoryId}' is not on the map`)
  const claim = won && kind.onWin === 'claim-territory' ? territory.id : null
  const lose = !won && kind.onLose === 'lose-territory' && !territory.kingdom ? territory.id : null
  const salvage = claim && !territory.claimedOnce ? SWITCHES.salvagePerConquest : 0

  return { engagementId: engagement.id, won, heroes, renown: won ? 1 : 0, losses: won ? 0 : 1, claim, lose, salvage }
}
