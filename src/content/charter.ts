// The Charter — KINGDOM-DESIGN.md §3A as settled 2026-08-22/23 (7-KINGDOM-
// SETTLED.md "The Charter"; THE-KINGDOM.html §II is the working page):
// "Renown +1 per Engagement won. One Renown, one purchase. An Article slot
// opens at Renown 10, then every 5; every other purchase is a Provision. The
// rhythm is four Provisions, then an Article. Everything permanent, bought
// once." Renown 1–9 is the free spine and buys nothing.
//
// Both tiers are `unlock.*` ids separated by a `tier` field — "not a new kind"
// (§3A). Ids follow GLOSSARY.md's example shape (`unlock.field-size.5`). Each
// track is a chain: rung N needs rung N−1. `effect` is what the slice can make
// true today; the rest is recorded and does nothing yet — the Hand is out, the
// Crucible is unbuilt, combat is not played — and the row says so.

import { omitDisabled } from './disable.js'

export type UnlockRow = {
  readonly id: string
  readonly tier: 'article' | 'provision'
  readonly track: string
  readonly rung: number
  readonly name: string
  readonly does: string
  /** What the slice enacts: a field slot, roster room, a wider reward draw — or nothing yet. */
  readonly effect: { kind: 'field-size' | 'roster' | 'reward-draw'; amount: number } | null
  readonly needsHand?: boolean
}

const article = (track: string, rung: number, id: string, name: string, does: string, effect: UnlockRow['effect']): UnlockRow => ({ id, tier: 'article', track, rung, name, does, effect })
const provision = (track: string, rung: number, id: string, name: string, does: string, effect: UnlockRow['effect'] = null, needsHand = false): UnlockRow => ({ id, tier: 'provision', track, rung, name, does, effect, needsHand })

const RAW_UNLOCKS: readonly UnlockRow[] = [
  // Articles — the nine majors
  article('roster', 1, 'unlock.roster.10', 'Roster 10', 'Hold two more heroes. Recruitment runs at 1/Week and nothing else caps it.', { kind: 'roster', amount: 2 }),
  article('roster', 2, 'unlock.roster.12', 'Roster 12', 'The bench reaches ~1.5× deployment.', { kind: 'roster', amount: 2 }),
  article('roster', 3, 'unlock.roster.14', 'Roster 14', 'The ceiling.', { kind: 'roster', amount: 2 }),
  article('field', 1, 'unlock.field-size.5', 'Field 5', 'Deploy a fifth hero — and raise the rent on the Assignment pool.', { kind: 'field-size', amount: 1 }),
  article('field', 2, 'unlock.field-size.6', 'Field 6', 'Deploy a sixth.', { kind: 'field-size', amount: 1 }),
  article('field', 3, 'unlock.field-size.7', 'Field 7', 'Deploy a seventh. Probably the last.', { kind: 'field-size', amount: 1 }),
  article('hand', 1, 'unlock.hand.1', 'Hand scaling I', 'More cards. The Hand itself is granted free on the spine. OUT of the slice.', null),
  article('hand', 2, 'unlock.hand.2', 'Wider Hand', 'More cards. Quantity unset. OUT of the slice.', null),
  // Provisions — capped by Renown
  provision('civilians', 1, 'unlock.civilians.1', 'Civilians I', '+2 Health to all civilians at battle start — combat is not played in the slice.'),
  provision('civilians', 2, 'unlock.civilians.2', 'Civilians II', '+5 Luck / +5 Accuracy — combat is not played in the slice.'),
  provision('civilians', 3, 'unlock.civilians.3', 'Civilians III', '+10 Surge Chance per Turn — combat is not played in the slice.'),
  provision('pact', 1, 'unlock.pact.1', 'Pact I', '15% · 2 rolls — the Crucible is unbuilt.'),
  provision('pact', 2, 'unlock.pact.2', 'Pact II', '25% · 3 rolls — the Crucible is unbuilt.'),
  provision('pact', 3, 'unlock.pact.3', 'Pact III', '35% — the Crucible is unbuilt.'),
  provision('pact', 4, 'unlock.pact.4', 'Pact IV', 'unstated.'),
  provision('origins', 1, 'unlock.origins.1', 'Special Origins I', '25% — the Crucible is unbuilt.'),
  provision('origins', 2, 'unlock.origins.2', 'Special Origins II', '+1 roll → 35% — the Crucible is unbuilt.'),
  provision('origins', 3, 'unlock.origins.3', 'Special Origins III', 'unstated.'),
  provision('origins', 4, 'unlock.origins.4', 'Special Origins IV', 'unstated.'),
  provision('draw', 1, 'unlock.draw.1', 'Draw I', 'Extra draw, Turn 1 — needs the Hand, which is OUT.', null, true),
  provision('draw', 2, 'unlock.draw.2', 'Draw II', 'Extra draw, Turn 5 — needs the Hand.', null, true),
  provision('draw', 3, 'unlock.draw.3', 'Draw III', 'Extra draw, Turn 3 — needs the Hand.', null, true),
  provision('draw', 4, 'unlock.draw.4', 'Draw IV', 'Extra draw, Turn 9 — needs the Hand.', null, true),
  provision('energy', 1, 'unlock.energy.1', 'Energy I', 'Extra Energy, Turn 1 — needs the Hand.', null, true),
  provision('energy', 2, 'unlock.energy.2', 'Energy II', 'Extra Energy, Turn 3 — needs the Hand.', null, true),
  provision('energy', 3, 'unlock.energy.3', 'Energy III', 'Extra Energy, Turn 5 — needs the Hand.', null, true),
  provision('energy', 4, 'unlock.energy.4', 'Energy IV', 'Extra Energy, Turn 9 — needs the Hand.', null, true),
  provision('energy', 5, 'unlock.energy.5', 'Energy V', 'Extra Energy, Turn 10 — needs the Hand.', null, true),
  provision('muster', 1, 'unlock.muster.1', 'Muster I', 'Deploy a row further forward — combat is not played in the slice.'),
  provision('muster', 2, 'unlock.muster.2', 'Muster II', 'See enemy composition before muster — the Reveal already shows it in the slice.'),
  provision('muster', 3, 'unlock.muster.3', 'Muster III', 'One free Reveal — combat is not played in the slice.'),
  provision('spoils', 1, 'unlock.spoils.1', 'The Spoils I', '4 rewards drawn, keep 1.', { kind: 'reward-draw', amount: 1 }),
  provision('spoils', 2, 'unlock.spoils.2', 'The Spoils II', '5 drawn, keep 1.', { kind: 'reward-draw', amount: 1 }),
]

export const UNLOCKS: readonly UnlockRow[] = omitDisabled(RAW_UNLOCKS)

export function unlockRowOf(id: string): UnlockRow {
  const row = UNLOCKS.find((u) => u.id === id)
  if (!row) throw new Error(`unknown unlock '${id}' — the Charter is an explicit registry`)
  return row
}

/** "The first Article at Renown 10, then one every 5." */
export const FIRST_ARTICLE_AT = 10
export const ARTICLE_EVERY = 5
/** "Renown 1–9 is the free spine" — the first Renown that buys anything is the tenth. */
export const FREE_SPINE = 9
/** "Roster 10 — hold two more heroes": the roster's base room is eight. */
export const BASE_ROSTER_CAP = 8
