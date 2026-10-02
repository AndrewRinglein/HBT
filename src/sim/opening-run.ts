// The opening carried — fix.opening-levels (engine, 2026-10-02). Ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'the
// opening's party levels up; the Flaming Longsword is a Warrior's or a Paladin's; the Bridge gives a reward', '... the
// first level-up comes after battle 2', 'levels by XP at 20, 50, 100, 170, 270, 400' and 'the Orphanage pays 20 XP no
// matter what'): "They need to be leveling up." · "it only is going to help the paladin or the warrior." · "On battle 3,
// which is the bridge, we should be giving another reward, which can help."
//
// One replicate of the ENGINE's opening party (engine/src/content/opening-party.ts: the draft by the cadence 1, 3, 4, 5,
// 6, 6 and the Crucible's rolls) taken through the six battles in order, each battle the engine's own opening scenario
// (test.opening-<key>) played by the engine's AI, and between them the KINGDOM's rules — never a second copy of either:
//   XP      battleXpOf + mvpOf (src/core/reckoning.ts, the formula resolveReckoning reads), the MVP's roll on cup.mvp
//   level   the ruled curve, src/content/levels.ts xpForLevel, every level owed taken (as autoplay takes them)
//   reward  each battle's row (src/content/encounter-rewards.ts): the Flaming Longsword to one of its takers, the standing
//           draw (src/core/rewards.ts resolveRewardDraw, on cup.reward) for the 'draw' rows
// The cups are a new Campaign's (makeNewCampaign), seeded by the replicate. What the battles gave is handed back to the
// engine as an OpeningCarry — each drafted hero's level and items — and the next battle fields it. Which of three cards a
// player keeps and who holds an item are the engine's (openingRewardPickOf, openingHolderOf: its rows, its legality, the
// draft's weighted score). Wounds, fatigue and deaths stay the Campaign's, not the carry's (engine SWITCHES.md
// openingCarryDeaths).
//
// A lost battle is fought again with the same party, as the kingdom replays it (encounter-rewards `replayed`), on the next
// battle seed (engine SWITCHES.md openingReplaySeed); only the won fight's XP is carried (openingCarryLostXp) — the kingdom
// pays a lost one too, but here the losses are the replays' sampling of the AI, not a player's battles.
import { createBattle, runBattle, SCENARIOS, scenarioOptions, OPENING_POSITIONS, openingHolderOf, openingRewardPickOf, type OpeningCarry, type BattleOptions } from '../engine.js'
import { makeBattleResult, type EngagementResult } from '../core/seam.js'
import { battleXpOf, mvpOf, MVP_XP } from '../core/reckoning.js'
import { resolveRewardDraw } from '../core/rewards.js'
import { makeNewCampaign } from '../core/opening.js'
import { rollOf } from '../core/rng.js'
import { xpForLevel } from '../content/levels.js'
import { encounterRewardOf } from '../content/encounter-rewards.js'
import { CUP_IDS } from '../content/cups.js'

/** A lost battle is fought again on battle seed replicate + attempt × this (engine SWITCHES.md openingReplaySeed). */
export const REPLAY_STRIDE = 1000
/** Attempts before a replicate's run stops at a battle it cannot win (engine SWITCHES.md openingReplaySeed). */
export const MAX_ATTEMPTS = 10

/** The level `xp` reaches on the ruled curve from `level`, every level owed taken. */
export function levelReached(xp: number, level = 1): number {
  for (let need = xpForLevel(level + 1); need !== null && xp >= need; need = xpForLevel(level + 1)) level++
  return level
}

/** One fight of a battle: its seed, the result the kingdom folded from its log, what it paid each hero (the MVP's +10 in) and who was MVP. */
export type OpeningAttempt = { readonly seed: number; readonly outcome: EngagementResult['outcome']; readonly turns: number; readonly enemyPhases: number; readonly xp: readonly number[]; readonly mvp: number | null; readonly result: EngagementResult }
export type OpeningBattle = {
  readonly position: number
  readonly encounterId: string
  /** The drafted heroes fielded, in draft order. */
  readonly heroes: readonly string[]
  /** What each was fielded with: its level and its XP coming in, and the items the carry gave it (undefined = its kit). */
  readonly levels: readonly number[]
  readonly xpIn: readonly number[]
  readonly items: readonly (readonly string[] | undefined)[]
  readonly attempts: readonly OpeningAttempt[]
  readonly won: boolean
  /** After the battle (the won fight's XP and MVP paid): each hero's XP. */
  readonly xpOut: readonly number[]
  /** The reward kept after the won battle, and who holds it — null when the row offers nothing or nobody may take it. */
  readonly reward: { readonly itemId: string; readonly holder: number; readonly offered: readonly string[] } | null
}
export type OpeningRun = { readonly replicate: number; readonly battles: readonly OpeningBattle[] }

const scenarioAt = (position: number) => {
  const s = Object.values(SCENARIOS).find((x) => x.openingPosition === position)
  if (!s) throw new Error(`opening position ${position}: the engine has no scenario fielding it`)
  return s
}

/**
 * One replicate through the opening, battle by battle until `upTo` (default all six) or a battle it loses MAX_ATTEMPTS
 * times — or, `pressOn`, past it with nothing paid for it (the report's count of every battle over every replicate).
 * Pure: the same replicate gives the same party, battles, XP, levels and rewards.
 */
export function runOpening(replicate: number, upTo: number = OPENING_POSITIONS.length, pressOn = false): OpeningRun {
  const campaign = makeNewCampaign(replicate)
  const xp: number[] = []
  const items: (string[] | undefined)[] = []
  const battles: OpeningBattle[] = []
  for (const at of OPENING_POSITIONS.filter((p) => p.position <= upTo)) {
    const s = scenarioAt(at.position)
    while (xp.length < at.drafted) { xp.push(0); items.push(undefined) }
    const levels = xp.map((x) => levelReached(x))
    const itemsIn = items.map((l) => (l ? [...l] : undefined))
    const carry: OpeningCarry = { levels, items }
    const opts = scenarioOptions(s, replicate, carry)
    const heroes = [...opts.heroes]
    const xpIn = [...xp]
    const attempts: OpeningAttempt[] = []
    let won = false
    for (let k = 0; k < MAX_ATTEMPTS && !won; k++) {
      const seed = replicate + k * REPLAY_STRIDE
      const ctx = createBattle({ ...opts, replicate: seed } as BattleOptions)
      runBattle(ctx)
      const result = makeBattleResult({ id: at.encounterId, mapId: opts.mapId, heroes, enemies: [], seed }, ctx.events)
      const paid = battleXpOf(at.encounterId, result)
      if (paid.length !== heroes.length || paid.some((p, i) => p.index !== i)) throw new Error(`${at.encounterId}: the result's hero rows [${paid.map((p) => p.index).join(', ')}] are not the ${heroes.length} drafted heroes`)
      const gained = paid.map((p) => p.xp)
      const mvp = mvpOf(at.encounterId, paid, () => rollOf(campaign, CUP_IDS.mvp, [at.encounterId]))
      if (mvp !== null) gained[mvp]! += MVP_XP
      won = result.outcome === 'heroClear'
      // only the won fight pays (engine SWITCHES.md openingCarryLostXp): the lost ones are the replay's sampling
      if (won) gained.forEach((g, i) => { xp[i]! += g })
      attempts.push({ seed, outcome: result.outcome, turns: result.turns, enemyPhases: result.enemyPhases, xp: gained, mvp, result })
    }
    let reward: OpeningBattle['reward'] = null
    const offer = won ? encounterRewardOf(at.encounterId)?.offer : undefined
    if (offer?.kind === 'item') {
      const got = openingHolderOf(offer.itemId, heroes, items, offer.takers)
      if (got) { items[got.holder] = got.items; reward = { itemId: offer.itemId, holder: got.holder, offered: [offer.itemId] } }
    } else if (offer?.kind === 'draw') {
      const offered = resolveRewardDraw(campaign, at.encounterId)
      const got = openingRewardPickOf(offered, heroes, items)
      if (got) { items[got.holder] = got.items; reward = { itemId: got.itemId, holder: got.holder, offered } }
    }
    battles.push({ position: at.position, encounterId: at.encounterId, heroes, levels, xpIn, items: itemsIn, attempts, won, xpOut: [...xp], reward })
    if (!won && !pressOn) break
  }
  return { replicate, battles }
}
