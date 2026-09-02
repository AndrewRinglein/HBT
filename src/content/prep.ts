// Combat Prep — the four ordered steps, as rows. GAME-ARCHITECTURE.md §4
// "Inside Combat Prep": information arrives first, decisions are made against
// it, and "the order is the design." The machine (src/core/prep.ts) walks this
// list and knows no step by name.

import type { PrepStep } from '../core/campaign.js'

export type PrepStepRow = {
  readonly step: PrepStep
  readonly title: string
  /** What the player sees or does here — one line, from §4. */
  readonly does: string
  /** May the cursor leave this step with nothing chosen? */
  readonly skippable: boolean
  /** A step that draws an offer on entry names the cup it draws from (Law 4). */
  readonly drawsFrom?: string
}

export const PREP_STEP_ROWS: readonly PrepStepRow[] = [
  { step: 'reveal', title: 'Reveal', does: 'the enemy, and possibly an environmental condition', skippable: true },
  { step: 'council', title: 'War Council', does: 'draft your own modifiers — tactics; pick 1 of 3, or skip', skippable: true, drawsFrom: 'cup.council' },
  { step: 'deploy', title: 'Deploy', does: 'choose the units, knowing 1 and 2', skippable: false },
  { step: 'equip', title: 'Equip', does: 'fit and swap items, knowing 1 and 2', skippable: true },
]

/** "A base unit limit per Engagement — 4 at the start." GAME-ARCHITECTURE.md §2.3, axis 1. */
export const BASE_DEPLOY_LIMIT = 4

/** "Pick-1-of-3" — KINGDOM-DESIGN.md §11; GAME-ARCHITECTURE.md §4 step 2. */
export const COUNCIL_OFFER_SIZE = 3
