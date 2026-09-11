// Payouts — which kind of won Engagement grants which currency. DATA, so the
// rule "Salvage arrives only from Conquer" (SKELETON-SETTLED.md:104 — "you
// cannot build a kingdom by praying") is one row the writer reads, and
// deleting that row is exactly what turns ISC-022 red. Re-conquest never pays
// it twice (:108): `firstClaimOnly`.
//
// The other three currencies' battle payouts — "Quest, Defend and Conquer all
// pay Supplies · Faith · Mana" (7-KINGDOM-SETTLED.md) — are rows per kind, at
// the soft numbers THE-KINGDOM.html's worked Week models (SWITCHES.md).

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

const battle = (kind: string): PayoutRow[] => [
  { engagementKind: kind, currency: 'currency.supplies', amount: SWITCHES.battleSupplies, firstClaimOnly: false, source: '7-KINGDOM-SETTLED.md Payouts · SWITCHES.md battle.supplies' },
  { engagementKind: kind, currency: 'currency.faith', amount: SWITCHES.battleFaith, firstClaimOnly: false, source: '7-KINGDOM-SETTLED.md Payouts · SWITCHES.md battle.faith' },
  { engagementKind: kind, currency: 'currency.mana', amount: SWITCHES.battleMana, firstClaimOnly: false, source: '7-KINGDOM-SETTLED.md Payouts · SWITCHES.md battle.mana' },
]

export const PAYOUTS: readonly PayoutRow[] = [
  { engagementKind: 'engagement.conquer', currency: 'currency.salvage', amount: SWITCHES.salvagePerConquest, firstClaimOnly: true, source: 'SKELETON-SETTLED.md:104,108 · SWITCHES.md salvage.perConquest' },
  ...battle('engagement.conquer'),
  ...battle('engagement.defend'),
]
