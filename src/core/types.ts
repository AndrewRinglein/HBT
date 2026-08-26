import type { HexId } from './hex.js'
import type { Rng } from './rng.js'

export type Side = 'hero' | 'enemy'
/** What kind of thing a unit is. Every AI can read this about every other unit. */
export type Role = 'melee' | 'ranged' | 'support'
/** Terrain layer 1. 0 = open ground. */
export const TERRAIN = {
  OPEN: 0, HILLS: 1, FOREST: 2, ROCKY: 3, ROCKY_HILLS: 4, WATER: 5, OBSTACLE: 6,
  BURNING: 7, POISONED: 8,
} as const
export type LifeState = 'standing' | 'downed' | 'dead'
export type DamageType = 'physical' | 'magic' | 'true'
export type Phase = 'hero' | 'enemy'

export type Outcome = 'heroClear' | 'wipe' | 'capped'

export type AbilityDef = {
  readonly id: string
  readonly name: string
  /** Damage = this stat + bonus. */
  readonly stat: 'strength' | 'precision' | 'magic'
  readonly bonus: number
  readonly damageType: DamageType
  readonly range: number
  readonly staminaCost: number
  /** Turns before it can be used again. 0 = every turn. */
  readonly cooldown: number
}

/**
 * A movement power — Angela 2026-08-21: "Movement is a choice, and that
 * movement choice can have a modifier. It can cost stamina. It shouldn't be
 * hard-coded. It should be content-driven." Rows live in content/moves.ts;
 * which unit grants which powers is unit data (UnitDef.moves).
 */
/**
 * What a movement power DOES beyond moving — the rider on a bonus move.
 * Added 2026-08-25 (movement.bonus-actions): the S17 half-step split gave the
 * cohort powers MoveDef could not say — Leap's "+2 Strength until the end of
 * the Turn", Focus's "gain 1 Stamina", Devotion's "lose 1 Stamina Max for the
 * rest of the Battle, and gain 2 Stamina". Plain data resolved through the
 * mutators; the engine knows the KINDS, content supplies the rows. (Bastion's
 * compiler failed on exactly these clauses — "no pattern" — which is what a
 * missing capability looks like from the other side.)
 */
export type MoveEffect =
  | { readonly kind: 'gainStamina'; readonly value: number }
  | { readonly kind: 'loseMaxStamina'; readonly value: number }
  | {
      readonly kind: 'statMod'
      readonly stat: import('./stats.js').StatName
      readonly value: number
      /** endOfTurn = expires when this Turn ends; battle = permanent this battle. */
      readonly until: 'endOfTurn' | 'battle'
    }

export type MoveDef = {
  readonly id: string
  readonly name: string
  /**
   * How the move resolves. `path` walks the step loop one hex at a time;
   * `sidestep` is exactly one hex, any direction, terrain cost ignored, still
   * a Step; `flight` is a targeted atomic jump with zero Steps (GAME-DESIGN
   * §Movement keywords, rewritten 2026-08-20).
   */
  readonly shape: 'path' | 'sidestep' | 'flight'
  /**
   * Sidestep-shaped only: EXACTLY how many hexes the step moves. Absent = 1
   * (the classic half-step). Leap is 2 ("move exactly 2 hexes"); Focus and
   * Devotion are 0 ("it moves you zero hexes on purpose"). A 0-range bonus
   * move still spends the move slot, still cooldowns, still fires its effects.
   */
  readonly stepRange?: number
  /** Riders applied after the step resolves. See MoveEffect. */
  readonly effects?: readonly MoveEffect[]
  readonly staminaCost: number
  /** Added to the unit's movement-point budget for this power. Move/Sidestep 0; flight-swift +1. */
  readonly budgetMod: number
  /**
   * Turns DOWN after use — Codex semantics (Angela 2026-08-21 on Sidestep:
   * "it's available every other turn" = cooldown 1). 0 = every turn.
   */
  readonly cooldown: number
}

/**
 * A named fielding — which units stand where, on which map.
 *
 * PLAYBACK-DESIGN §6.2: the standard battle cannot show the benched beasts or
 * the flight ladder, so nothing new can be shown until a fielding can be named
 * from outside. Measured 2026-08-21: across 640 battles on all 8 maps at two
 * army sizes, `power.flight`, `power.flight-swift`, `power.flight-labored` and
 * all four beast attacks fired ZERO times.
 *
 * **There is deliberately no `overrides` field, and there must never be one.**
 * A scenario names units and positions; statistics belong to sweeps. A showcase
 * that can change numbers is a showcase that can lie about the game — so the
 * constraint is enforced by the type, not by a convention someone can forget.
 */
export type ScenarioDef = {
  readonly id: string
  /** Why this fielding exists. Shown by the tool; never read by the engine. */
  readonly note: string
  readonly mapId: string
  /** Unit typeIds. Every one must carry `side: 'hero'` or setup throws. */
  readonly heroes: readonly string[]
  /** One hex per hero, same order. Validated passable, in range and unoccupied. */
  readonly heroHexes: readonly number[]
  /** Unit typeIds. Every one must carry `side: 'enemy'` or setup throws. */
  readonly enemies: readonly string[]
  readonly enemyHexes: readonly number[]
  /** The RNG replicate, so a scenario is still a seed rather than a recording. */
  readonly replicate: number
}

export type AttackDef = {
  readonly id: string
  readonly name: string
  readonly kind: 'melee' | 'ranged'
  readonly damageType: DamageType
  /** Added to the governing stat. Zombie basic = 0, Axe = +1, Punch = -1. */
  readonly bonus: number
  /** Which stat carries the damage. */
  readonly stat: 'strength' | 'precision' | 'magic'
  /** Weapon reach. Melee 1; the bow is 6. Hero Reach adds to ranged only. */
  readonly reach: number
  readonly staminaCost: number
  /** On hit, apply this status to the target. A rider, not a station. */
  readonly applies?: { readonly statusId: string; readonly value: number }
}

export type UnitDef = {
  readonly typeId: string
  readonly side: Side
  readonly maxHp: number
  readonly armor: number
  readonly resist: number
  readonly accuracy: number
  readonly dodge: number
  readonly triggers?: readonly import('./trigger.js').Trigger[]
  /**
   * What this unit IS, for targeting and for damage-vs-target modifiers:
   * ['undead'], ['demon'], ['hero','ranger']. A unit is often several things, so
   * a list rather than one `type` field.
   * The MECHANISM is here; which units carry which tags is content (session 6).
   */
  readonly tags?: readonly string[]
  readonly strength: number
  readonly precision: number
  readonly magic: number
  /** Angela 2026-08-15: identical to Magic, including the party-wide sum (§5). */
  readonly spirit: number
  readonly role: Role
  readonly movement: number
  /** Hero Reach stat. Adds to ranged weapon reach only. */
  readonly reach: number
  readonly maxStamina: number
  readonly staminaRegen: number
  readonly ai: string
  readonly attacks: readonly string[]
  readonly abilities: readonly string[]
  /**
   * Movement powers this unit grants, in preference order — REQUIRED, no core
   * default (content-driven, Angela 2026-08-21). Every hero row carries the
   * universal walk plus its class's half-step; an enemy row carries exactly
   * one (her 2026-08-21 ruling). Which ids those are is content's business —
   * content/moves.ts has the rows.
   */
  readonly moves: readonly string[]
  readonly attributes: readonly string[]
  /**
   * Display base name ("Oathblade (TEST)"). Setup derives battle names from it
   * — pack units carry theirs from the Codex; a def without one falls back to
   * a title-cased typeId. Added 2026-08-20 with the generated unit pack.
   */
  readonly name?: string
}

/**
 * A unit. Plain data only — numbers, strings, arrays (Law 5b).
 * `uid` is a persistent identity used in RNG keys; `id` is the array index.
 */
export type Unit = {
  id: number
  uid: number
  name: string
  typeId: string
  side: Side
  hex: HexId
  hp: number
  maxHp: number
  armor: number
  resist: number
  accuracy: number
  dodge: number
  strength: number
  precision: number
  magic: number
  spirit: number
  role: Role
  movement: number
  reach: number
  stamina: number
  maxStamina: number
  staminaRegen: number
  lifeState: LifeState
  bleedOut: number
  ai: string
  attacks: string[]
  abilities: string[]
  /** Granted movement powers, in preference order (see UnitDef.moves). */
  moves: string[]
  /** Ability id -> the turn on which it becomes usable again. Plain object, JSON-safe. */
  cooldowns: Record<string, number>
  /** Live statuses, kept sorted by id so iteration is never insertion order. */
  statuses: { id: string; value: number }[]
  /** Stored stat modifiers — gear, wounds, badges. Terrain is derived, not stored. */
  mods: import('./stats.js').StatMod[]
  tags: readonly string[]
  /** Assembled from the unit's sources at makeUnit — own frozen copies (GAME-DESIGN §5). */
  triggers: import('./trigger.js').Trigger[]
  attributes: string[]
  // Per-activation budget.
  moveUsed: boolean
  primaryUsed: boolean
  movePointsLeft: number
  // Per-unit ordinals. These are what keep RNG keys structural and unique.
  activationOrdinal: number
  attackOrdinal: number
  deathbedOrdinal: number
}

/** The whole battle state. Serializes to JSON and back with no loss. */
export type State = {
  turn: number
  phase: Phase
  mapId: string
  /** One entry per HexId. Plain array so State stays JSON-round-trippable (Law 5b). */
  terrain: number[]
  units: Unit[]
  outcome: Outcome | null
  seq: number
}

export type Event = {
  seq: number
  turn: number
  phase: Phase
  type: string
  /** Who or what caused this. Every line names its cause (Law 12). */
  causeId: string
  actor: number | null
  target: number | null
  [k: string]: unknown
}

export type Config = {
  turnCap: number
  /** Switches. Defaults chosen in FIRST-BATTLE.md; each is a sweep axis. */
  switches: {
    critEnabled: boolean
    rangerPunchesWhenAdjacent: boolean
    moveCostPerHex: boolean
    /** Does melee AI leap into adjacency for the rider? SWITCHES.md, 2026-08-25. */
    aiLeapToAdjacent: boolean
  }
}

export const DEFAULT_CONFIG: Config = {
  turnCap: 25,
  switches: {
    critEnabled: false,
    rangerPunchesWhenAdjacent: false,
    moveCostPerHex: false,
    aiLeapToAdjacent: true,
  },
}

/** Everything unserializable lives here, never in State. */
export type Ctx = {
  state: State
  events: Event[]
  rng: Rng
  cfg: Config
  attacks: Readonly<Record<string, AttackDef>>
  abilities: Readonly<Record<string, AbilityDef>>
  statuses: Readonly<Record<string, import('./status.js').StatusDef>>
  moves: Readonly<Record<string, MoveDef>>
}
