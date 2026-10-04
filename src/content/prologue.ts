// The five prologue battles — ENEMY-REVIEW.md "The five preset battles (P11)",
// revised 2026-08-23, transcribed here as the opening's Engagement rows.
// Combat is not played in the slice, so each row is the fielding the panel
// shows: every enemy the battle would have put on the board, spawns included,
// and the civilians who stand with the hero. Schedules, timers and the Battle
// 4 curse are the P11 format's — engine-side, and its approval is the one
// structural blocker (STATE.md); nothing here pretends to run them.
//
// Kind: the prologue battles have no Engagement kind of their own (an open
// label question in STATE.md — "an Engagement-kind label for the two Prologue
// battles… whether those battles pay Renown"). They are fielded as
// engagement.conquer rows flagged `prologue`, on the ground the opening ends
// by taking: battles 1–3 on no Territory, battle 4 takes the Kingdom Territory,
// battle 5 the square outside it (GAME-ARCHITECTURE.md §2.5 — "Six is reached
// at the same beat the Kingdom centre and the square outside it are taken").
// Whether they pay Renown is SWITCHES.md prologue.paysRenown.
//
// Missing content, named: Battle 3's School Teacher and Schoolchildren have
// no unit rows in the engine pack — the Lumberjack and Wife stand in, and
// CONTENT-GAPS.md owes the rows. Battle 2's civilians are the Lumberjack + the
// Farmer, as dictated.

export type PrologueRow = {
  readonly n: number
  readonly name: string
  /** The Engagement kind row this battle is fielded as — content's call, never core's. */
  readonly kind: string
  readonly mapId: string
  /** The Territory this battle takes when won, or null. */
  readonly territoryId: string | null
  readonly enemies: readonly string[]
  /** Civilians placed with the hero — ordinary hero rows, joining the roster if they survive. */
  readonly civilians: readonly string[]
  readonly source: string
}

export const PROLOGUE: readonly PrologueRow[] = [
  { n: 1, kind: 'engagement.conquer', name: 'two zombies and a child', mapId: 'showcase.atlas-priory', territoryId: null,
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie'], civilians: ['hero.fixed.orphans'],
    source: 'ENEMY-REVIEW.md Battle 1 — 2 Zombies mid-board, phase 4: 1 Zombie' },
  { n: 2, kind: 'engagement.conquer', name: 'surrounded', mapId: 'showcase.atlas-angled-halls', territoryId: null,
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.skeletal-archer', 'unit.skeletal-archer', 'unit.skeletal-archer', 'unit.skeletal-archer', 'unit.fast-zombie', 'unit.fast-zombie', 'unit.fast-zombie', 'unit.fast-zombie', 'unit.necromancer'],
    civilians: ['hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer'],
    source: 'ENEMY-REVIEW.md Battle 2 — 4 Zombies, 4 Skeleton Archers, a Fast Zombie from every side, a Necromancer' },
  { n: 3, kind: 'engagement.conquer', name: 'imps', mapId: 'showcase.atlas-angled-halls', territoryId: null,
    enemies: ['unit.imp', 'unit.imp', 'unit.imp', 'unit.imp', 'unit.imp', 'unit.imp', 'unit.powerful-imp', 'unit.fire-imp', 'unit.fire-imp'],
    civilians: ['hero.fixed.lumberjack-and-wife'],
    source: 'ENEMY-REVIEW.md Battle 3 — 4 Imps, +2 Imps, +1 Powerful Imp, +2 Fire Imps; School Teacher + Schoolchildren have no rows (CONTENT-GAPS)' },
  { n: 4, kind: 'engagement.conquer', name: 'demons', mapId: 'showcase.atlas-priory', territoryId: 'territory.ruined-kingdom.sanctuary',
    enemies: ['unit.bruiser-demon', 'unit.bruiser-demon', 'unit.poison-imp', 'unit.poison-imp', 'unit.powerful-imp', 'unit.lieutenant-demon', 'unit.imp', 'unit.imp', 'unit.imp', 'unit.imp', 'unit.imp'],
    civilians: [],
    source: 'ENEMY-REVIEW.md Battle 4 — 2 Bruisers, 2 Poison Imps, 1 Powerful Imp, 1 Demon Lieutenant, imps by phase; the Curse is P7' },
  { n: 5, kind: 'engagement.conquer', name: 'hounds', mapId: 'showcase.atlas-buried-pilgrimage', territoryId: 'territory.ruined-kingdom.ridge',
    enemies: ['unit.bloodhound', 'unit.bloodhound', 'unit.bloodhound', 'unit.bloodhound', 'unit.hellhound', 'unit.hellhound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.zombie-hound', 'unit.werewolf'],
    civilians: [],
    source: 'ENEMY-REVIEW.md Battle 5 — 4 Bloodhounds, 2 Hellhounds, 8 Zombie Hounds, 1 Werewolf' },
]

/**
 * The opening draft cadence: one hero before battle 1, then one more after each battle, until six drafted heroes — a party
 * of 1, 2, 3, 4, 5, 6 at battles 1 to 6. Ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'one draft after every battle; …':
 * "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." · "One, yes."), replacing the
 * 2026-08-23 cadence of GAME-ARCHITECTURE.md §2.5 (two after battle 1: a party of 1, 3, 4, 5, 6, 6).
 * The row is the cadence; the mechanism (core/opening.ts draftsOwedOf) reads it. kingdom.opening-draft-cadence.
 */
export const DRAFT_CADENCE = { first: 1, afterEach: 1, until: 6 } as const
export const DRAFT_OFFER = 3

/**
 * The opening's battles a run enters STRAIGHT from the draft: no map before them, no Equip stop — the first one. Ruled
 * 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class line, no map before battle 1, …':
 * "We don't start by showing you going to the orphanage on the map. There's no reason to have that map step in the
 * beginning. We're just going straight into the battle after you get your hero."), amending 2026-10-01 'one continuous run
 * through the first six battles' for its first step only. The row is the count; the mechanism (core/opening.ts
 * isOpeningStraightIn, performOpeningStraightIn) reads it. That Equip is passed too is the read of "straight into the
 * battle" — one hero with its starting kit has nothing to equip (kingdom SWITCHES.md startsInBattleNoEquip).
 * kingdom.opening-starts-in-battle.
 */
export const OPENING_STRAIGHT_IN = { battles: 1 } as const

/**
 * What a draft of the opening SAYS above its offers — a row per draft that says something: which draft (its ordinal,
 * the first hero's is 1) and the words. Ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class line, no map before battle 1, …':
 * "The second time you are drafting a hero, there should be a message that says, "Until you get additional upgrades you
 * may only deploy one hero of each class."" — asked whether that is a rule to build or only the message: "I mean, it is
 * basically a rule, but right now we're just telling them about it."). His sentence, word for word. No rule is built:
 * Deploy checks who is free and the count only (core/prep.ts canDeploy), and in the opening the draft never offers a
 * class twice, so the sentence is true as shown. The mechanism (core/opening.ts draftMessageOf) reads the row; the page
 * (ui/draft.ts) prints it. kingdom.opening-draft-class-message.
 */
export const DRAFT_MESSAGES: readonly { readonly draft: number; readonly text: string }[] = [
  { draft: 2, text: 'Until you get additional upgrades you may only deploy one hero of each class.' },
]
