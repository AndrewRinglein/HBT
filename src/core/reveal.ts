// The Campaign's reveals — GAME-ARCHITECTURE.md §2.5: "campaign.revealed: RevealId[]", what the opening has shown the player,
// granted once each. viewer.new-enemy-notice (2026-10-04; engine DECISIONS.md 2026-10-04 'the opening's tutorial: … new
// enemies are named …', Andrew: "If a new enemy is introduced there is going to be a notification: \"New enemy\" and their
// name." — the first time a kind is met) is the first to grant one: the run remembers each enemy kind it has shown, so a
// later battle, or the same battle replayed after a loss, does not announce it again.
//
// A mechanism: it names no reveal. Which reveals exist is content's (src/content/reveals.ts).
import type { CampaignState } from './campaign.js'
import { applyReveal, type Ctx } from './mutate.js'

/** May this reveal still be granted? Not once it has been. */
export function canReveal(campaign: CampaignState, revealId: string): boolean {
  return revealId.length > 0 && !campaign.revealed.includes(revealId)
}

/** Grant a reveal — once; a second grant is refused loudly (ask canReveal first). */
export function performReveal(ctx: Ctx, revealId: string, causeId: string): void {
  if (!canReveal(ctx.campaign, revealId)) throw new Error(`performReveal refused: '${revealId}' is already granted`)
  applyReveal(ctx, revealId, causeId)
}
