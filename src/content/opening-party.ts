// fix.opening-party (2026-09-29): the party the player has at each of the opening's six battles.
//
// Ruled 2026-09-28 (Andrew, DECISIONS.md 'the opening is tested with the player's party, not the
// Alpha Team'): "Opening battles should be tested with a party the player should have at that
// point. We need to move away from these alpha heroes."
//
// The rules and the pool are progression/OPENING-PARTY.json's, built by progression/build-schedule.mjs
// from GAME-ARCHITECTURE.md §2.5 (1 drafted before battle 1, +2 after it, +1 after each until six;
// one of three offered, stat-less) and the 2026-09-28 rulings (the six in order; the Flaming Longsword
// after battle 2). Nothing here types a count, a hero or an item — this file only DRAWS the drafts.
//
// Prior art, extended not duplicated: the kingdom's draft (kingdom/src/core/opening.ts offerDraft —
// three not-yet-drafted pool rows drawn keyed by the draft's ordinal, one taken) is the same shape;
// the engine imports nothing from the kingdom, so the draw runs on the engine's named streams
// (core/rng.ts 'draft'). The fielding is the 2026-09-03 hero-assembly path — `heroes` + `heroItems`
// folded by fieldedDef() in createBattle — not a second one. Each hero enters wearing its row's own
// kit (`defaultItems`, GEAR-IMPLEMENTATION.md G3).
import OPENING from '../../../progression/OPENING-PARTY.json' with { type: 'json' }
import { makeRng, rollBelow, rootSeedOf, sample } from '../core/rng.js'
import { ITEMS, UNITS } from './index.js'

export type OpeningPosition = {
  readonly position: number
  readonly encounterId: string
  readonly name: string
  /** How many drafted heroes the player has at this battle. */
  readonly drafted: number
  readonly level: number
  /** Items won earlier in the opening and carried into this battle. */
  readonly carried: readonly string[]
}
export const OPENING_POSITIONS: readonly OpeningPosition[] = OPENING.positions

/** The seed the draft draws under — the replicate alone, so battle n's party extends battle n-1's. */
const draftRng = (replicate: number) => makeRng(rootSeedOf(0, 0, replicate))

/**
 * The first `count` drafts of a replicate, in draft order: each one of `offer` pool rows not yet
 * drafted (SWITCHES.md openingDraftPick — the offer and the take are both seeded draws, so replicates
 * sample the parties a player could have). A pool row the content does not have is not offered.
 */
export function openingDraftOf(replicate: number, count: number): string[] {
  const rng = draftRng(replicate)
  const pool = OPENING.pool.filter((id) => UNITS[id])
  const drafted: string[] = []
  for (let ordinal = 0; ordinal < count; ordinal++) {
    const offer = sample(rng, pool.filter((id) => !drafted.includes(id)), OPENING.offer, 'draft', ordinal, 0)
    if (offer.length === 0) throw new Error(`opening draft ${ordinal + 1}: the pool is empty — nobody left to draft`)
    drafted.push(offer[rollBelow(rng, offer.length, 'draft', ordinal, 1)]!)
  }
  return drafted
}

/**
 * The party at `position` for `replicate`, as createBattle options: the drafted heroes, each on its
 * own kit, and each carried item on the first drafted hero who can wield it (SWITCHES.md
 * openingCarriedHolder), taking the place of that hero's kit weapons — its shield and armour stay;
 * a result the hands cannot hold is refused by applyItems, the one legality.
 */
export function openingPartyOf(position: number, replicate: number): { heroes: string[]; heroItems: (string[] | undefined)[] } {
  const at = OPENING_POSITIONS.find((p) => p.position === position)
  if (!at) throw new Error(`opening: no position ${position} — progression/OPENING-PARTY.json has ${OPENING_POSITIONS.map((p) => p.position).join(', ')}`)
  // SWITCHES.md openingPartyLevel: level 1 until the opening's XP has an owner — a level above it
  // would need drafted powers, which nothing rules, so it is refused rather than guessed
  if (at.level !== 1) throw new Error(`opening position ${position}: level ${at.level} — the opening's levels have no owner yet (SWITCHES.md openingPartyLevel)`)
  const heroes = openingDraftOf(replicate, at.drafted)
  const heroItems: (string[] | undefined)[] = heroes.map(() => undefined)
  for (const itemId of at.carried) {
    const item = ITEMS[itemId]
    if (!item) throw new Error(`opening position ${position}: carried item '${itemId}' is not in the content`)
    const i = heroes.findIndex((id, n) => heroItems[n] === undefined && (!item.classRestriction || (UNITS[id]!.tags ?? []).includes(item.classRestriction)))
    if (i < 0) throw new Error(`opening position ${position}: no drafted hero can wield '${itemId}'`)
    const kit = UNITS[heroes[i]!]!.defaultItems ?? []
    heroItems[i] = [itemId, ...kit.filter((k) => ITEMS[k]?.itemClass !== 'weapon')]
  }
  return { heroes, heroItems }
}
