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

/**
 * COMBAT-SEQUENCE: `heroClear · objectiveMet · wipe · retreat · capped`
 * (fix.outcome-enum, 2026-09-03 — the type finally matches the document).
 * `objectiveFailed` is the sixth, added the same day for the authored loss
 * timers (`loseAfter`, encounters.json, ruled 2026-08-23) and objective
 * civilians: the heroes did not lose their bodies, they lost the battle.
 * `retreat` is UNREACHABLE today — retreat was skipped by ruling 2026-09-03
 * ("We can skip retreat") — and stays in the enum so the document and the
 * type agree; nothing sets it.
 */
export type Outcome = 'heroClear' | 'objectiveMet' | 'wipe' | 'retreat' | 'capped' | 'objectiveFailed'

/**
 * An ENCOUNTER as the engine consumes it — encounter.runner (2026-09-03),
 * P11 approved as written that day. Data, never code (Design Law 9). Phases
 * in the schedule are TURNS — COMBAT-SEQUENCE: "the wave schedule currently
 * calls a full round a 'phase'"; `phase: N` fires at Start of Turn N before
 * the hero phase (Angela 2026-09-03: "Enemies spawn first. Then heroes spawn
 * and heroes act"); `enemyPhase: N` fires as the enemy phase of Turn N
 * begins. Two units authored onto one hex: the later is SHUNTED to the
 * nearest free hex by the Law 6 tiebreaker and the log says so (default,
 * 2026-09-03). What the engine cannot honour — a map series, salvation,
 * retreat, standing rules — is refused or ignored LOUDLY as `gaps` on the row.
 */
export type EncounterPlacement = {
  readonly unit: string
  readonly count?: number
  readonly at?: { readonly col: number; readonly row: number }
    | { readonly near: { readonly col: number; readonly row: number }; readonly range: number }
    /** A scripted either/or — rolled on the `wave` cup, keyed by the schedule row and spawn index (Law 4). */
    | { readonly oneOf: readonly { readonly col: number; readonly row: number }[] }
  readonly hexes?: readonly { readonly col: number; readonly row: number }[]
  /** A civilian whose death loses the battle (objectiveFailed). */
  readonly objective?: boolean
  readonly civilian?: boolean
}
export type EncounterDef = {
  readonly id: string
  readonly name: string
  readonly mapId?: string
  readonly setup: readonly EncounterPlacement[]
  readonly schedule: readonly { readonly phase?: number; readonly enemyPhase?: number; readonly spawn: readonly EncounterPlacement[] }[]
  /** After this many Turns (heroPhase and phase both count Turns) the battle is lost. */
  readonly loseAfter?: { readonly phase?: number; readonly heroPhase?: number }
  /** Absent = board clear. */
  readonly win?: { readonly surviveTo: number }
  /**
   * capability.ground-layers: the BAND — one row of a layer painted per Turn,
   * from `startRow` in `direction` (+1 toward the player edge), starting at
   * Turn `fromPhase`, as the enemy phase ends (The Kiln: "at end of enemy
   * phase, row 0 lights at phase 2, row 1 at 3 …"). Painted cells are named
   * `layer`; `spare` hexes (the Kiln's water pockets) are never painted.
   */
  readonly band?: { readonly layer: string; readonly fromPhase: number; readonly startRow: number; readonly direction: 1 | -1; readonly spare?: readonly number[] }
  /** capability.ground-layers: cells painted at setup, before phase 1 (Rime's frost band rows 6–8). */
  readonly paint?: readonly { readonly layer: string; readonly hexes: readonly number[] }[]
  /**
   * capability.vision: the battlefield CONDITION — 'darkness' paints every hex
   * dark at phase 1 (Horrors of the Night); heroes light what is inside their
   * Vision on the hero phase; the night family repaints. Absent = daylight.
   */
  readonly condition?: 'darkness'
  /**
   * Ruled 2026-09-03 (Angela, Supper): "the civilians should have a flight
   * mindset for the first three turns." Every civilian fielded by this
   * encounter runs `mode` through Turn `untilTurn`, then its own row's AI.
   */
  readonly civilianAi?: { readonly mode: string; readonly untilTurn: number }
  /** capability.power-pool: the pool at battle start (kind 'external'). */
  readonly powerSources?: readonly { readonly kind: 'external'; readonly value: number }[]
  /** Where the heroes deploy (prologue-1's `heroes: 1, at: {near, range}`); absent = the player edge. */
  readonly heroZone?: { readonly count: number; readonly at: { readonly near: { readonly col: number; readonly row: number }; readonly range: number } }
  readonly gaps?: readonly string[]
}

/**
 * What a power DOES, one effect at a time — ability.effects (2026-09-03).
 * The trigger effect vocabulary (status.apply / status.remove / damage /
 * knockback) plus what class powers say and triggers never do: heal, a stat
 * modifier with a lifetime, and damage the caster takes. Each effect lands on
 * the power's resolved targets (`AbilityDef.target`), or on the caster when
 * `who: 'self'`. Plain data, compiled by the converter from the Codex's exact
 * sentences; a clause it cannot compile is a named gap on the row.
 */
export type AbilityEffect =
  | {
      readonly kind: 'damage'
      readonly stat: 'strength' | 'precision' | 'magic' | 'spirit'
      readonly bonus: number
      readonly damageType: DamageType
      /** 'always' strikes allies whatever the areaHitsAllies switch says (the row said "ally or enemy"). */
      readonly allies?: 'always' | 'never'
    }
  | { readonly kind: 'heal'; readonly amount: import('./trigger.js').ValueSpec }
  | { readonly kind: 'status.apply'; readonly statusId: string; readonly value: import('./trigger.js').ValueSpec }
  | { readonly kind: 'status.remove'; readonly statusId: string; readonly value?: number }
  | {
      readonly kind: 'statMod'
      readonly stat: import('./stats.js').StatName
      readonly value: number
      /** endOfTurn = this Turn; endOfNextTurn = "until the end of your next Turn"; battle = the rest of the Battle. */
      readonly until: 'endOfTurn' | 'endOfNextTurn' | 'battle'
      readonly who?: 'self' | 'target'
    }
  | { readonly kind: 'selfDamage'; readonly amount: number; readonly damageType: DamageType }
  /** capability.charges (2026-09-03): "regain N Stamina" — the Rations. */
  | { readonly kind: 'stamina.gain'; readonly value: number }
  | { readonly kind: 'knockback'; readonly value: import('./trigger.js').ValueSpec }
  /** capability.corpses: eat one corpse within `radius` — heal and battle-long stat gains to the eater. Refused (canUsePower) when none is in reach. */
  | { readonly kind: 'corpse.eat'; readonly radius: number; readonly heal: number; readonly mods: Readonly<Partial<Record<import('./stats.js').StatName, number>>>; readonly maxHp?: number }

export type AbilityDef = {
  readonly id: string
  readonly name: string
  /** Damage = this stat + bonus. Required on damage powers; absent on the rest. */
  readonly stat?: 'strength' | 'precision' | 'magic' | 'spirit'
  readonly bonus?: number
  readonly damageType?: DamageType
  readonly range: number
  readonly staminaCost: number
  /** Turns before it can be used again. 0 = every turn. */
  readonly cooldown: number
  /**
   * What the power DOES — capability.item-powers (2026-08-27). Absent =
   * 'damage', the original Arcane-Bolt shape, so every existing row is
   * unchanged. 'heal' restores HP (amount in `heal` — a trigger ValueSpec, so
   * Spirit scaling uses the party-wide sum per GAME-DESIGN §5's law).
   * 'selfGuard' is the Knight Shield's Block: protection now, a permanent
   * stat price each use (`guard`).
   */
  readonly effect?: 'damage' | 'heal' | 'selfGuard'
  /** damage only: strike EVERY standing unit in the blast (areaHexesOf 'blast1'). */
  readonly area?: 'blast1'
  /** heal only. */
  readonly heal?: import('./trigger.js').ValueSpec
  /** selfGuard only: protection = base + perArmor x effective Armor; dodgeLoss applies each use, rest of Battle. */
  readonly guard?: { readonly protectionBase: number; readonly protectionPerArmor: number; readonly dodgeLoss: number }
  /**
   * ability.effects (2026-09-03): the effect list and the ONE targeting
   * vocabulary (target.ts). When `effects` is present the three legacy shapes
   * above are not consulted. `range` still gates how far the aimed unit may
   * be; an area with origin 'self' ignores the aim.
   */
  readonly effects?: readonly AbilityEffect[]
  readonly target?: import('./target.js').Targeting
  /** "It does not use your primary action" — the power spends stamina and cooldown only. */
  readonly free?: boolean
  /** Turns before the first use: cooldowns[id] starts at warmup + 1 at fielding. */
  readonly warmup?: number
  /**
   * capability.charges (2026-09-03), GEAR-DESIGN §4: uses per Battle. A spent
   * use counts down; at 0 the power leaves the unit's list for the rest of the
   * Battle — "they should vanish from the list of things available to a hero"
   * (Andrew 2026-09-02). Absent = unlimited (cooldown governs).
   */
  readonly uses?: number
  /** What the Codex row says that the engine cannot do. Never silently half-real. */
  readonly gaps?: readonly string[]
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
  /**
   * Hero assembly (2026-09-03): what each hero carries and how far it has
   * come — a FIELDING, not an override (items and levels are content; a
   * scenario naming them is naming rows). Parallel to `heroes`; absent = the
   * Codex default kit and the bare row.
   */
  readonly heroItems?: readonly (readonly string[] | undefined)[]
  readonly heroProgress?: readonly (HeroProgress | undefined)[]
  /**
   * encounter.runner (2026-09-03): the encounter this scenario runs. Its
   * setup and schedule supply the enemy side, so `enemies` is empty and the
   * heroes deploy where the encounter says (or the player edge).
   */
  readonly encounterId?: string
}

export type AttackDef = {
  readonly id: string
  readonly name: string
  readonly kind: 'melee' | 'ranged'
  readonly damageType: DamageType
  /** Added to the governing stat. Zombie basic = 0, Axe = +1, Punch = -1. */
  readonly bonus: number
  /**
   * Which stat carries the damage. Spirit joined 2026-08-27: the Chaplain's
   * holy-texts Mercy is authored "stat": "spirit" — GAME-DESIGN §5 already
   * says Spirit is "identical to Magic" as a scaling stat, and the stat
   * pipeline resolves it like any other.
   */
  readonly stat: 'strength' | 'precision' | 'magic' | 'spirit'
  /** Weapon reach. Melee 1; the bow is 6. Hero Reach adds to ranged only. */
  readonly reach: number
  readonly staminaCost: number
  /** On hit, apply this status to the target. A rider, not a station. */
  readonly applies?: { readonly statusId: string; readonly value: number }
  /**
   * AREA attacks (capability.area-attack, 2026-08-27). Authored on
   * attack.halberd.cleave: "an adjacent hex and the two hexes adjacent to
   * both you and it" — that is 'arc'. 'blast1' is a hex plus its six
   * neighbours (the shape power.lightning-staff.storm rides). An area attack
   * DOES NOT ROLL TO HIT (authored: "It does not roll to hit, so it cannot
   * crit") — no accuracy station, no miss, no dodge, no crit; mitigation and
   * riders still run per struck unit through the one damage function.
   */
  readonly area?: 'arc' | 'blast1'
  /**
   * The weapon's flat addition to crit chance — station.crit (2026-08-27),
   * COMBAT-DESIGN "Crit from gear": the Dagger's +5, the Javelin's +3.
   */
  readonly crit?: number
  /**
   * attack.multihit (2026-09-03), Angela 2026-08-15: "An attack is a list of
   * hits, resolved one at a time. Each hit runs the full cycle — damage,
   * triggers, settle — before the next hit begins." No retargeting; the rest
   * are cancelled the moment the target stops standing; hit 2 is re-resolved
   * from scratch (a status hit 1 applied is read by hit 2). Absent = 1.
   * The Codex `hits` field; the bestiary's `attackCount`.
   */
  readonly hits?: number
  /**
   * capability.enemy-action-cooldown (2026-09-03), ENEMY-REVIEW P10: "probably
   * just permission to use the same fields" — the cooldown and warmup hero
   * powers carry, on an ATTACK. Turns until it can be used again after a use
   * (absent/0 = every turn); warmup = Turns before the first use. Tracked in
   * the unit's one `cooldowns` map, keyed by the attack id.
   */
  readonly cooldown?: number
  readonly warmup?: number
  /**
   * capability.power-pool (2026-09-03): the share of the enemy side's Power
   * this attack adds to its damage — 1 = +Power, 0.5 = +½ Power, 0.334 = +⅓
   * — resolved nearest, 0.5 up (Law 7) at the DMG.POWER station. Enemy rows
   * only; a hero attack carrying it adds nothing (the pool is the enemy's).
   */
  readonly powerScale?: number
  /**
   * The attack's own Accuracy modifier — station.accuracy-field (2026-09-03).
   * Applied at ACC.SITUATIONAL (700). Punch's −5 (ruled 2026-08-27); the
   * station every later per-attack modifier lands on — the attack of
   * opportunity's −20, flight's −30. Absent = 0.
   */
  readonly accuracy?: number
  /**
   * How many CRITICALS one critting hit resolves — station.crit-count
   * (2026-08-27): "there is also an ability to have more than one critical
   * happen at once ... 'Do two criticals' or 'Do three criticals'". Absent =
   * 1. Each critical flips its own branch: heads stack +50% each before
   * mitigation, each tails rolls its own chart row.
   */
  readonly critCount?: number
}

/**
 * One Critical Injury Chart row — station.crit (2026-08-27). RULED DATA, not
 * a content kind: rows arrive from the pack (settled.json critChart, compiled
 * by mkenginepack.mjs), keys are stable log keys for Law 12, never ids. Every
 * effect is battle-only; the chart never mints permanence (that is the
 * Deathbed pipeline's alone).
 */
export type CritEffect =
  | { readonly kind: 'statMod'; readonly stat: import('./stats.js').StatName; readonly value: number; readonly floor?: number }
  | { readonly kind: 'status'; readonly statusId: string; readonly value: number }
  | { readonly kind: 'push'; readonly hexes: number }
  | { readonly kind: 'loseStamina'; readonly value: number }
  | { readonly kind: 'loseMaxHp'; readonly value: number }

export type CritRow = {
  readonly key: string
  readonly name: string
  readonly effects: readonly CritEffect[]
}

/**
 * An item row — pack.items (2026-09-02, ITEMS-PLAN.md §3). Ruled 2026-09-02
 * (Andrew): "the items should go into battle … They define what attacks they
 * have. They modify stats." The engine reads the physical facts it checks
 * (hands, slots), the stat deltas in ITS stat names, the attacks and powers
 * the item grants, and the triggers the converter's grammar could read.
 * `gaps` lists, verbatim, every clause of the Codex row the engine cannot
 * express yet — an item is never silently half-real. Nothing fields an item
 * until seam.items-per-unit; this is the registry.
 */
export type ItemDef = {
  readonly id: string
  readonly name: string
  readonly itemClass: 'weapon' | 'armor' | 'trinket' | 'relic' | 'idol' | 'bloodrune' | 'consumable'
  readonly tier: number
  readonly hands: number
  readonly slots: number
  readonly classRestriction?: string
  readonly statModifiers: Readonly<Partial<Record<import('./stats.js').StatName | 'maxHp' | 'maxStamina' | 'staminaRegen' | 'movement' | 'reach', number>>>
  readonly grants: readonly string[]
  readonly abilities: readonly string[]
  readonly triggers: readonly import('./trigger.js').Trigger[]
  readonly gaps?: readonly string[]
}

/**
 * A hero's campaign state as the battle needs it — hero assembly (2026-09-03).
 * Level, the specialty chosen at the first level-up, the level-5 pick, and the
 * powers drafted. Folded onto the bare row by fieldedDef() before the items,
 * so the kingdom's Equip screen and the battle read one function.
 */
export type HeroProgress = {
  readonly level: number
  readonly specialtyId?: string
  /** One of the class's level-5 choice options, verbatim. */
  readonly levelFivePick?: Readonly<Record<string, number>>
  readonly powers?: readonly string[]
}

export type AuraDef = {
  readonly id: string
  readonly radius: number
  readonly side: 'ally' | 'enemy' | 'any'
  readonly requireTags?: readonly string[]
  readonly mods: Readonly<Partial<Record<import('./stats.js').StatName, number>>>
  /** What the row asked for that the engine could not fold (immunities, Max Health). */
  readonly gaps?: readonly string[]
}

export type UnitDef = {
  readonly typeId: string
  readonly side: Side
  readonly maxHp: number
  readonly armor: number
  readonly resist: number
  readonly accuracy: number
  readonly dodge: number
  /**
   * Crit and Luck — station.crit (2026-08-27), COMBAT-DESIGN's two stats:
   * crit adds to this unit's chance TO crit ("Base Crit varies by enemy");
   * luck subtracts from an attacker's chance to crit THIS unit. Absent = 0.
   */
  readonly crit?: number
  readonly luck?: number
  readonly triggers?: readonly import('./trigger.js').Trigger[]
  /**
   * What this unit IS, for targeting and for damage-vs-target modifiers:
   * ['undead'], ['demon'], ['hero','ranger']. A unit is often several things, so
   * a list rather than one `type` field.
   * The MECHANISM is here; which units carry which tags is content (session 6).
   * THE ONE FIELD (fix.unit-tags, 2026-09-03, Law 11): `attributes` carried
   * the same words under a second name and no reader ever looked at it, so
   * "target undead" found no zombies. Absent = [].
   */
  readonly tags?: readonly string[]
  /**
   * progression.level-table-by-type (2026-09-03): the level table this unit
   * levels on when it is NOT its class's — a civilian TYPE (`civilian.farmer`),
   * because "Maiden and farmer are different in how they should level up".
   * Absent = the `class.*` tag's table. Several heroes may share one.
   */
  readonly levelTable?: string
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
  /**
   * seam.items-per-unit (2026-09-02): `ai` is derived from the kit's attacks
   * unless the Codex row AUTHORED one — then it survives a re-kit at fielding.
   */
  readonly aiAuthored?: boolean
  /**
   * The Codex kit, verbatim (gen/kits.json heroKits / the row's `kit`), applied
   * at fielding when BattleOptions.heroItems names nothing for this unit —
   * seam.items-per-unit (2026-09-02, ITEMS-PLAN.md §4). Bare rows: the kit's
   * attacks, powers, riders and stat deltas are NOT on the row.
   */
  readonly defaultItems?: readonly string[]
  readonly attacks: readonly string[]
  readonly abilities: readonly string[]
  /** capability.power-pool: one-time +X to the side's pool when this unit enters; the X stays after it dies. */
  readonly powerOnArrival?: number
  /**
   * capability.deathbed (2026-09-03), COMBAT-DESIGN §13: Deathbed Fighting is
   * DERIVED, never stored — 20 + 5 × Toughness, plus badges, gear and
   * origins. Toughness is the base; it does not reduce damage. Absent = 0.
   */
  readonly toughness?: number
  /** How many times this unit may STAND at zero: civilians one, heroes two (COMBAT-DESIGN §13 "depth by type"). Absent = 2 for heroes, 0 for enemies. */
  readonly stands?: number
  /**
   * capability.surge (2026-09-03), COMBAT-SEQUENCE "Surge check": each
   * Activation `Surge Chance += Surge`, roll against it; a hit grants
   * 1 + Stamina Regen stamina, zeroes the chance, and loops back to
   * movement — inside the SAME Activation; the End of Activation ladder runs
   * once. Heroes only. "Surge always EQUALS the character level" (the Codex),
   * plus specialty and gear. Absent = 0.
   */
  readonly surge?: number
  /** capability.vision (2026-09-03): the unit's Vision stat. Ruled 2026-09-03: 0 by default — "nothing is stored on the unit"; the battlefield's 6 is the modifier. */
  readonly vision?: number
  /**
   * capability.auras (2026-09-03), COMBAT-DESIGN §5 / Design Law 27 "auras
   * lend, they never give": a radius around this unit granting stat modifiers
   * to units inside it WHILE they are inside — derived on read like terrain,
   * never stored, so leaving the radius is losing the bonus. Radii are fixed;
   * overlapping auras stack. Standing units only exert one. `side` is who it
   * reaches; `requireTags` narrows it ("allies tagged Undead").
   */
  readonly auras?: readonly AuraDef[]
  /**
   * Movement powers this unit grants, in preference order — REQUIRED, no core
   * default (content-driven, Angela 2026-08-21). Every hero row carries the
   * universal walk plus its class's half-step; an enemy row carries exactly
   * one (her 2026-08-21 ruling). Which ids those are is content's business —
   * content/moves.ts has the rows.
   */
  readonly moves: readonly string[]
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
  /** Crit and Luck — station.crit (2026-08-27). See UnitDef. */
  crit: number
  luck: number
  role: Role
  movement: number
  reach: number
  stamina: number
  maxStamina: number
  staminaRegen: number
  lifeState: LifeState
  bleedOut: number
  /** capability.deathbed: the wound ladder — 0 Fresh, 1 Wounded, 2 Badly Wounded. Each STAND climbs one. */
  woundLevel: number
  toughness: number
  /** capability.surge: the stat, and the accumulating chance (zeroed on a hit). */
  surge: number
  surgeChance: number
  /** capability.vision: the Vision STAT (0 by default — the battlefield's 6 is added at read). */
  vision: number
  /** capability.auras: this unit's auras, own frozen copies (plain data). */
  auras: AuraDef[]
  /** capability.corpses: a raised or summoned unit leaves no corpse. */
  summoned: boolean
  /** ai.mode.hunter (2026-09-03): the quarry, until it falls. */
  huntTarget?: number
  /** An AI mode standing in for the row's until a Turn ends (the civilians' flight, ruled 2026-09-03). */
  aiOverride?: { mode: string; untilTurn: number }
  /** capability.charges: uses left this Battle, by power id. Only powers with `uses` appear. */
  usesLeft: Record<string, number>
  /** capability.charges: what was spent, for the BattleResult. */
  usesSpentThisBattle?: Record<string, number>
  ai: string
  attacks: string[]
  abilities: string[]
  /** Granted movement powers, in preference order (see UnitDef.moves). */
  moves: string[]
  /** Ability id -> the turn on which it becomes usable again. Plain object, JSON-safe. */
  cooldowns: Record<string, number>
  /** Live statuses, kept sorted by id so iteration is never insertion order. */
  /** `by` = the unit that applied it (Taunt reads it; capability.taunt 2026-09-03). */
  statuses: { id: string; value: number; by?: number }[]
  /** Stored stat modifiers — gear, wounds, badges. Terrain is derived, not stored. */
  mods: import('./stats.js').StatMod[]
  tags: readonly string[]
  /** Assembled from the unit's sources at makeUnit — own frozen copies (GAME-DESIGN §5). */
  triggers: import('./trigger.js').Trigger[]
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
  /** encounter.runner: which schedule rows have fired (by index), plain data. */
  encounter?: { id: string; fired: number[]; objectives: number[] }
  /**
   * capability.corpses (2026-09-03), ENEMY-REVIEW P4 (ruled 2026-08-23): board
   * objects, created when any enemy dies and when a hero actually dies. A
   * SUMMON leaves none; Shadow's obliteration leaves none. Raised, eaten or
   * consumed, a corpse is removed. Plain data: id, hex, whose body it was.
   */
  corpses?: { id: number; hex: number; typeId: string; side: Side; uid: number }[]
  /**
   * THE POWER POOL — capability.power-pool (2026-09-03), ENEMY-REVIEW.md P1
   * (ruled 2026-08-23): "Power is the enemy side's Magic: one global integer
   * for the whole enemy side." Gained externally (the encounter's
   * powerSources), on arrival (a unit's row), or by a clock or condition (a
   * trigger effect). Consumers read it; it is never spent. Absent = 0.
   */
  power?: number
  /** One entry per HexId. Plain array so State stays JSON-round-trippable (Law 5b). */
  terrain: number[]
  /**
   * capability.ground-layers (2026-09-03): the painted layer per hex, parallel
   * to `terrain` — LAYER.NONE where nothing is painted. Absent = nothing painted
   * anywhere (every pre-layer battle is byte-identical).
   */
  layers?: number[]
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
    /** Do area attacks strike allies in the shape? SWITCHES.md, 2026-08-27. */
    areaHitsAllies: boolean
    /** May a heal power target its own caster? SWITCHES.md, 2026-08-27. */
    healIncludesSelf: boolean
    /** May the AI swing an area attack through its own allies? SWITCHES.md, 2026-08-27. */
    aiAreaThroughAllies: boolean
    /** Chart share of the crit branch flip, per victim side — critChartSplit, Angela 2026-08-22. */
    critChartShareVsHeroes: number
    critChartShareVsEnemies: number
    /** Does Nerve Struck's Max Health loss floor at 1? SWITCHES.md, 2026-08-27. */
    critMaxHealthFloorsAtOne: boolean
    /** Do multiple tails-criticals roll chart rows WITH replacement? SWITCHES.md, 2026-08-27. */
    multiCritWithReplacement: boolean
    /**
     * Healing sheds Bleed by half the healing — half of what LANDED on the
     * health bar (true), or half of what was asked after Burn's halving
     * (false)? They differ only at or near full health. SWITCHES.md, 2026-09-02.
     */
    bleedShedFromLanded: boolean
    /**
     * fix.downed-targetable (2026-09-03). GAME-DESIGN §9: "Enemies roll at +20
     * against downed heroes, but a hit only accelerates the bleed-out counter.
     * It never kills." How many counter steps one hit costs. SWITCHES.md.
     */
    downedHitBleedTicks: number
    /**
     * When does the AI swing at a downed hero: never, only when no standing
     * enemy is in reach, or whenever one is (the finisher). SWITCHES.md.
     */
    aiAttacksDowned: 'never' | 'whenNoStanding' | 'always'
    /** Does a kiter hold at a ready power's range when that is shorter than its weapon's? SWITCHES.md, 2026-09-03. */
    aiKiteHoldsAtPowerRange: boolean
    /** Is a cleared board a win while the encounter's schedule still owes arrivals? SWITCHES.md, 2026-09-03. */
    boardClearWaitsForSchedule: boolean
    /** Which attack the AI swings: the first affordable in declared order, or the best previewed damage. SWITCHES.md, 2026-09-03. */
    aiAttackChoice: 'declared' | 'bestDamage'
    /** Is Frost added before Protection absorbs (true) or after (false)? Before Armor either way, ruled. SWITCHES.md, 2026-09-03. */
    frostBeforeProtection: boolean
    /** Zones of control and attacks of opportunity live? SWITCHES.md, 2026-09-03 (movement.zone-of-control). */
    zoneOfControl: boolean
    /** Does a unit with a corpse-eating power eat before it swings? SWITCHES.md, 2026-09-03. */
    aiEatsBeforeBiting: boolean
    /** May a unit target something it cannot see? COMBAT-DESIGN §4 assumes no. SWITCHES.md, 2026-09-03. */
    targetUnseen: boolean
  }
}

export const DEFAULT_CONFIG: Config = {
  turnCap: 25,
  switches: {
    // ON since station.crit (2026-08-27): "We want to implement crits."
    critEnabled: true,
    rangerPunchesWhenAdjacent: false,
    moveCostPerHex: false,
    aiLeapToAdjacent: true,
    // "Deal magic damage ... to every unit in the blast" (power.lightning-
    // staff.storm) — EVERY unit, so the default is the authored reading.
    areaHitsAllies: true,
    // Conservative default: the AI never swings wide through a friend.
    aiAreaThroughAllies: false,
    // "one ally within 6 hexes" — whether the priest counts as his own ally
    // is unstated; the common reading says yes. SWITCHES.md, 2026-08-27.
    healIncludesSelf: true,
    // RULED 2026-08-27 (fix.crit-branch-even): "It should be a 50% chance of
    // just a damage boost and a 50% chance of one of the effects." The
    // 2026-08-22 per-side split (25/50) is HELD OFF — "that is a different
    // concept" — so both sides default 50 and both stay sweepable.
    critChartShareVsHeroes: 50,
    critChartShareVsEnemies: 50,
    // "Stat losses floor where the row says 'minimum 0'; nothing else floors"
    // read literally: Nerve Struck's −2 Max Health does NOT floor, and a unit
    // whose Max Health reaches 0 dies of it. The merciful reading (floor at 1)
    // keeps its code path here. SWITCHES.md, 2026-08-27.
    critMaxHealthFloorsAtOne: false,
    // "Do two criticals" can land the same injury twice (stacking add) — the
    // simplest reading, and item.bracer's open with/without-replacement
    // question shares this switch's answer. SWITCHES.md, 2026-08-27.
    multiCritWithReplacement: true,
    // S43 (content ea99a4d): "half the applied amount comes off Bleed" — the
    // amount applied to Health is what landed. SWITCHES.md, 2026-09-02.
    bleedShedFromLanded: true,
    // GAME-DESIGN §9 says "accelerates", not by how much; one step per hit is
    // the smallest reading. SWITCHES.md, 2026-09-03.
    downedHitBleedTicks: 1,
    // The downed are a finisher's target, not a preference: only when nothing
    // standing is in reach. SWITCHES.md, 2026-09-03.
    aiAttacksDowned: 'whenNoStanding',
    // A power that can never be in range is dead content; the kite closes to
    // it. SWITCHES.md, 2026-09-03 (ability.effects).
    aiKiteHoldsAtPowerRange: true,
    // RULED 2026-09-03 (Angela): "Battle ends when there are no enemies
    // remaining, so victory can be achieved early." Off. SWITCHES.md.
    boardClearWaitsForSchedule: false,
    // The rule it has always been; four authored attacks never fire under it
    // (integration.test names them). A sweep answers. SWITCHES.md, 2026-09-03.
    aiAttackChoice: 'declared',
    // "Strength + Frost − Armor": Frost is part of the hit; Protection then
    // absorbs the hit. SWITCHES.md, 2026-09-03.
    frostBeforeProtection: true,
    // Declared to change the control battles; on by ruling (GAME-DESIGN §4,
    // Angela 2026-08-13). Off keeps the pre-ZoC battle for paired sweeps.
    zoneOfControl: true,
    // "the things surrounding them get stronger with every villager they eat"
    // (Supper) — the feast is the design. SWITCHES.md, 2026-09-03.
    aiEatsBeforeBiting: true,
    // "Can you target what you cannot see (assumed: no)" — COMBAT-DESIGN §4.
    targetUnseen: false,
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
  /** The Critical Injury Chart — ruled data from the pack (station.crit 2026-08-27). */
  critChart: readonly CritRow[]
  moves: Readonly<Record<string, MoveDef>>
  /** The item registry — pack.items (2026-09-02). Read by nothing until seam.items-per-unit. */
  items: Readonly<Record<string, ItemDef>>
  /** The encounter being run, if any — plain data (encounter.runner, 2026-09-03). */
  encounter?: EncounterDef
  /** The unit registry, so the runner can field a spawn mid-battle. */
  units?: Readonly<Record<string, UnitDef>>
  /**
   * How a unit ARRIVES mid-battle (capability.corpses: a raise is a summon).
   * A function on Ctx — Ctx is the home of the unserializable — set by
   * createBattle, so the trigger layer can field a unit without importing the
   * runner (which imports setup, which imports content: the cycle).
   */
  arrive?: (ctx: Ctx, def: UnitDef, hex: number, causeId: string) => Unit
}
