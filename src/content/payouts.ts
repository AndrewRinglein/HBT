// Payouts — which kind of won Engagement grants which currency. DATA, so the
// rule "Salvage arrives only from Conquer" (SKELETON-SETTLED.md:104 — "you
// cannot build a kingdom by praying") is one row the writer reads, and
// deleting that row is exactly what turns ISC-022 red. Re-conquest never pays
// it twice (:108): `firstClaimOnly`.
//
// The other three currencies' battle payouts ("Quest, Defend and Conquer all
// pay Supplies · Faith · Mana" — 7-KINGDOM-SETTLED.md) have no ruled amounts
// yet and are not rows until they do; a payout with no number is not a payout.

import { SWITCHES } from './switches.js'

export type PayoutRow = {
  /** The engagement kind a WIN of pays this. */
  readonly engagementKind: string
  readonly currency: string
  readonly amount: number
  /** Paid on the Territory's first claim only. */
  readonly firstClaimOnly: boolean
  readonly source: string
}

export const PAYOUTS: readonly PayoutRow[] = [
  { engagementKind: 'engagement.conquer', currency: 'currency.salvage', amount: SWITCHES.salvagePerConquest, firstClaimOnly: true, source: 'SKELETON-SETTLED.md:104,108 · SWITCHES.md salvage.perConquest' },
]
