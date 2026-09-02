// Availability — GAME-ARCHITECTURE.md §2.3: "nothing else in the codebase is
// allowed to have an opinion about hero availability." One function answers.
//
//   commitmentOf(campaign, heroId, slot)
//     → 'free' | 'onQuest' | 'committed' | 'wounded' | 'unavailable' | 'captured' | 'dead'
//
// Today it answers the channels that exist: dead, wounded (KINGDOM-DESIGN.md
// §9 — "Severe wounds make a hero unavailable on the strategic map"; Wounded
// and Badly Wounded still deploy, with the penalty), committed to the field
// of the Engagement on the cursor, and free. Assignments proper — the two
// slots, quests, 'unavailable', 'captured' — widen this in M6 (ISC-008..010)
// without adding a second question anywhere else.

import type { CampaignState, HeroId } from './campaign.js'
import { WOUND_UNAVAILABLE } from '../content/wounds.js'

export type Slot = 'field' | 'city'
export type Commitment = 'free' | 'onQuest' | 'committed' | 'wounded' | 'unavailable' | 'captured' | 'dead'

export function commitmentOf(campaign: CampaignState, heroId: HeroId, slot: Slot): Commitment {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  if (h.lifeState === 'dead') return 'dead'
  if (campaign.captured.includes(heroId)) return 'captured'
  if (h.wound >= WOUND_UNAVAILABLE) return 'wounded'
  const a = campaign.assignments[heroId]
  if (a?.field?.kind === 'quest' || a?.city?.kind === 'quest') return 'onQuest'
  if (a?.[slot]) return 'committed'
  if (slot === 'field' && campaign.cursor.engagement?.deployed.includes(heroId)) return 'committed'
  return 'free'
}
