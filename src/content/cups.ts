// The Kingdom's named streams — Law 4. Every Campaign-tier roll draws from one
// of these, keyed by what the roll is. GLOSSARY.md's id block carries the kind
// (`cup.tohit` is the engine's example); these are the strategic instances,
// one per roll the design names:
//   threat — the weekly defend roll, 6% per owned Territory (THIN-SLICE-REVIEW.md §G2)
//   unavailability — who does not turn up (KINGDOM-DESIGN.md §3)
//   reveal — the battle condition, weighted by difficulty and corruption (GAME-ARCHITECTURE.md §4)
//   council — the War Council's draw (§4 step 2)
//   reward — the reward draft, 3 keep 1 (7-KINGDOM-SETTLED.md)
//   battle — the seed a Battle is fielded with

import { omitDisabled } from './disable.js'

export type CupRow = { readonly id: string; readonly rolls: string }

const RAW_CUPS: readonly CupRow[] = [
  { id: 'cup.threat', rolls: 'the weekly defend roll' },
  { id: 'cup.unavailability', rolls: 'who does not turn up this Week' },
  { id: 'cup.reveal', rolls: 'the battle condition' },
  { id: 'cup.council', rolls: "the War Council's draw" },
  { id: 'cup.reward', rolls: 'the reward draft' },
  { id: 'cup.battle', rolls: "a Battle's seed" },
  { id: 'cup.mvp', rolls: 'the MVP — weighted by XP earned (SKELETON-NOTES.md B7)' },
]

export const CUPS: readonly CupRow[] = omitDisabled(RAW_CUPS)

/**
 * Purpose → cup id, so core can say WHICH roll it is making without spelling a
 * content id: core knows the purpose, this file knows the name.
 */
export const CUP_IDS = {
  threat: 'cup.threat',
  unavailability: 'cup.unavailability',
  reveal: 'cup.reveal',
  council: 'cup.council',
  reward: 'cup.reward',
  battle: 'cup.battle',
  mvp: 'cup.mvp',
} as const
