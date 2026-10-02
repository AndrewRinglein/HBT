// KINGDOM-V2-2026-09-07, ruled 2026-09-10. Badges persist until recovery.
// kingdom.reads-engine (2026-10-02; engine DECISIONS.md "the duplication review, ruled", finding K10): both are Codex
// badges (content/gen/badges.json — badge.fatigued added then), so a hero carrying one fields with its penalties: the
// seam hands every combat badge a hero holds to the engine (heroBadges). Checked at load: a recovery badge the engine's
// registry does not hold would be dropped at the seam silently, so it is refused here instead.
import { BADGES } from '../engine.js'

export const RECOVERY_BADGES = ['badge.fatigued', 'badge.exhausted'] as const
export const EXHAUSTED_BADGE = 'badge.exhausted'
for (const id of RECOVERY_BADGES) if (!Object.hasOwn(BADGES, id)) throw new Error(`recovery badge '${id}' is not a Codex badge in the engine pack — it would never reach a battle`)
