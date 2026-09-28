import type { Board, Edge, Geometry, HexId } from './hex.js'
import type { Rng } from './rng.js'

export type Side = 'hero' | 'enemy'
export type PolygonFootprint = { kind: 'polygon'; vertices: [number, number][]; movementPadding: number }
/**
 * v2.knockback-collisions (COMBAT-V2 §9.3, ruled 2026-09-07): `collisionValue`
 * is what a push stopped by this prop costs the mover per remaining point
 * (absent = a basic obstruction's 2); `consumes` (the well, the pit) takes a
 * unit the collision kills — no corpse, no Deathbed.
 *
 * v2.prop-destroy (COMBAT-V2 §12, ruled 2026-09-07): `steps` is the destroy steps
 * the prop has taken (absent = intact); the material tier is how many it takes.
 * Reaching the tier destroys it — a high prop leaves low cover under the same id,
 * a low prop leaves nothing (SWITCHES.md 'V2 prop destruction').
 */
/** v2.thin-obstruction (Andrew 2026-09-24, DECISIONS.md): `thin` is the "high thin prop" — walkable, a unit may stand in it; −5 to shots entering its hex, −1 Vision through it. */
export type Prop = { id: string; height: 'high' | 'low' | 'thin'; material: 1 | 2 | 3; footprint: { kind: 'hex'; hexes: number[] } | PolygonFootprint; crossingCost?: 1; collisionValue?: number; consumes?: true; steps?: number }
export type HighProp = Prop & { height: 'high'; crossingCost?: never }
export type AuthoredProp = { readonly id: string; readonly height: 'high' | 'low' | 'thin'; readonly material: 1 | 2 | 3; readonly footprint: { readonly kind: 'hex'; readonly hexes: readonly number[] } | { readonly kind: 'polygon'; readonly vertices: readonly (readonly [number, number])[]; readonly movementPadding: number }; readonly crossingCost?: 1; readonly collisionValue?: number; readonly consumes?: true; readonly steps?: number }
export type AuthoredHighProp = AuthoredProp & { readonly height: 'high'; readonly crossingCost?: never }
/** Plain authored map transport, decoded by the same boundary for registry and direct input. */
export type AuthoredMap = {
  readonly id: string; readonly name: string; readonly rows: readonly string[]
  readonly board?: Board; readonly format?: string; readonly note?: string
  readonly deploy?: { readonly hero: Edge; readonly enemy: Edge }
  readonly props?: readonly AuthoredProp[]
  /** True exactly where a unit may stand; absent means all cells have floor. */
  readonly floor?: readonly boolean[]
  /**
   * v2.structures: the ONE side a wall's stairs (or ladder) or a house's door is on, as
   * [structure hex, the adjacent hex it is entered from]. Absent = no structure has one.
   */
  readonly entries?: readonly (readonly [number, number])[]
}
/** What kind of thing a unit is. Every AI can read this about every other unit. */
export type Role = 'melee' | 'ranged' | 'support'
/** Terrain layer 1. 0 = open ground. */
export const TERRAIN = {
  // WOODLAND took forest's number 2 (v2.retire-forest-hills, Andrew 2026-09-24: "There's
  // no more forest"; "trees are supposed to be woodland"), so every saved or authored
  // forest hex reads as woodland.
  OPEN: 0, HILLS: 1, WOODLAND: 2, ROCKY: 3, ROCKY_HILLS: 4, WATER: 5, IMPASSABLE: 6,
  BURNING: 7, POISONED: 8,
  // v2.ground-table / v2.ground-retable (Andrew, 2026-09-24, DECISIONS.md "the ground
  // table, re-ruled"). 10, 11 (wheat, bush) and 12 (woodland's first number) are retired —
  // never reuse them.
  UNDERGROWTH: 9, LAVA: 13, MARSH: 14, DESERT: 15, RUINS: 16,
  // v2.structures (Andrew, 2026-09-24, DECISIONS.md — walls, towers and houses): a structure
  // is a ground kind (SWITCHES.md structureAsGround); what each does is content/terrain.ts STRUCTURE.
  WALL: 17, TOWER: 18, HOUSE: 19,
} as const
export type LifeState = 'standing' | 'downed' | 'dead'
export type DamageType = 'physical' | 'magic' | 'fire' | 'poison' | 'shadow' | 'true'
export function isDamageType(value: unknown): value is DamageType {
  return typeof value === 'string' && ['physical', 'magic', 'fire', 'poison', 'shadow', 'true'].includes(value)
}
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
  /** Optional for programmatic encounters; compiled encounters declare their map's board. */
  readonly board?: Board
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
  /**
   * The band: one LINE painted per Turn from `fromPhase`, walking `direction`.
   * encounter.band-axis (2026-09-04, FINDING 43): heroes deploy west, so a band
   * that advances toward them walks COLUMNS — `axis: 'col'` with `startCol`.
   * `axis: 'row'` (the default when absent) with `startRow` is the old shape.
   * Exactly one of startRow / startCol matches the axis; the pack refuses a row
   * that says otherwise, so the engine never reads NaN.
   */
  readonly band?: { readonly layer: string; readonly fromPhase: number; readonly axis?: 'row' | 'col'; readonly startRow?: number; readonly startCol?: number; readonly direction: 1 | -1; readonly spare?: readonly number[] }
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
  /**
   * ai.encounter-rules (AI-DESIGN.md §4; DECISIONS.md 2026-09-26): "an encounter
   * may impose overarching rules — group coordination, anchoring units to a
   * location, or goals not inherent to the unit", authored on the encounter row,
   * not the unit. Absent = the units play their modes alone (the default).
   */
  readonly aiRules?: readonly EncounterAiRule[]
  readonly gaps?: readonly string[]
}

/**
 * ai.encounter-rules — one overarching AI rule on an encounter row. It binds, as
 * they arrive, the units the encounter fields whose type is in `units` (absent =
 * every enemy-side unit it fields). SWITCHES.md "Encounter AI rules".
 *   anchor      the unit's movement may not end farther than `radius` from `at`
 *               (a unit already outside may only come back toward it)
 *   coordinate  once per Phase, before any Activation, the side picks a focus
 *               target by the `focus` tiers; bound units' scoring reads it
 */
export type EncounterAiRule =
  | { readonly id: string; readonly rule: 'anchor'; readonly units?: readonly string[]; readonly at: { readonly col: number; readonly row: number }; readonly radius: number }
  | { readonly id: string; readonly rule: 'coordinate'; readonly units?: readonly string[]; readonly focus: readonly AiTier[] }

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
      /** endOfTurn = this Turn; endOfNextTurn = "until the end of your next Turn"; endOfNextActivation = "until the end of your next Activation" (the holder's); battle = the rest of the Battle. */
      readonly until: 'endOfTurn' | 'endOfNextTurn' | 'endOfNextActivation' | 'battle'
      readonly who?: 'self' | 'target'
    }
  | { readonly kind: 'selfDamage'; readonly amount: number; readonly damageType: DamageType }
  /** capability.charges (2026-09-03): "regain N Stamina" — the Rations. */
  | { readonly kind: 'stamina.gain'; readonly value: number }
  | { readonly kind: 'knockback'; readonly value: import('./trigger.js').ValueSpec }
  /** capability.corpses: eat one corpse within `radius` — heal and battle-long stat gains to the eater. Refused (canUsePower) when none is in reach. */
  | { readonly kind: 'corpse.eat'; readonly radius: number; readonly heal: number; readonly mods: Readonly<Partial<Record<import('./stats.js').StatName, number>>>; readonly maxHp?: number }
  /**
   * capability.stealth (2026-09-28): "whenever a reveal effect finds you" — on each
   * resolved target of the OTHER side, every status that breaks on a reveal is
   * broken. The radius is the power's own area targeting; a reveal is not an
   * attack, so it breaks nothing else (SWITCHES.md stealthRevealShape).
   */
  | { readonly kind: 'reveal' }

/**
 * THE ONE ACTION TYPE — refactor.one-action-type (2026-09-04). Ruled three
 * times on 2026-09-04 (DECISIONS.md: "ONE ACTION TYPE"): "Whether they're an
 * item granted power, a class power, an attack, an innate ability someone has,
 * or a movement ability, all of them can have any of those shapes. All of them
 * should be capable of doing all of the same things. Move 3, do damage, give a
 * [status — her word was buff], have a cooldown, like any of these things. Or one use."
 *
 * So: where an action came from is a PROPERTY (`source`); which slot spends it
 * is a PROPERTY (`slot`); what limits it — stamina, cooldown, warmup, uses,
 * free — is one set of fields on every action; and what it DOES is any
 * combination of an attack profile (rolls to hit and runs the one damage
 * function), a move profile (walks, sidesteps or flies), and an effect list.
 * `AttackDef`, `AbilityDef` and `MoveDef` below are VIEWS over this one type —
 * narrowings by which profile is present — kept so the pipeline, the powers
 * path and the movement path each read the fields they resolve. "An item power
 * can't do that because it's an item power" is no longer a valid answer.
 */
export type ActionSlot = 'movement' | 'primary'
export type ActionDef = {
  readonly id: string
  readonly name: string
  /** Where it came from. A property, never a kind. */
  readonly source?: 'weapon' | 'item' | 'class' | 'innate' | 'movement'
  /**
   * Which of the Activation's two actions may spend it. Ruled 2026-09-04:
   * "structurally, movement and primary are identical. They can both do any
   * of the same things." Absent = `either`. SWITCHES.md `actionSlots` says how
   * default selection differs by policy; explicit restrictions always apply.
   */
  readonly slot?: 'movement' | 'primary' | 'either'
  // ── the limits — one set, on every action (ruled 2026-09-04) ──
  readonly staminaCost: number
  /** Turns before it can be used again after a use. 0 = every turn. Codex semantics (Sidestep "every other turn" = 1). */
  readonly cooldown: number
  /** Turns before the first use: cooldowns[id] starts at warmup + 1 at fielding. */
  readonly warmup?: number
  /**
   * capability.charges (2026-09-03), GEAR-DESIGN §4: uses per Battle. A spent
   * use counts down; at 0 the action leaves the unit's list for the rest of
   * the Battle — "they should vanish from the list of things available to a
   * hero" (Andrew 2026-09-02). Absent = unlimited (cooldown governs).
   */
  readonly uses?: number
  /** "It does not use your primary action" — spends stamina and cooldown only. */
  readonly free?: boolean
  // ── reach and targeting — one vocabulary ──
  /** How far the aimed unit may be. An attack's weapon reach (melee 1, the bow 6; hero Reach adds to ranged); a power's range; a move's step range. */
  readonly range: number
  readonly target?: import('./target.js').Targeting
  /** Hex-targeted travel/spread. Exclusive with attack and movement profiles. */
  readonly burst?: BurstProfile
  // ── what it does — any combination ──
  /** Rolls to hit and runs the one damage function. Present = this action is an attack. */
  readonly attack?: AttackProfile
  /** Walks, sidesteps or flies. Present = this action is a movement. */
  readonly move?: MoveProfile
  /**
   * ability.effects (2026-09-03): the effect list and the ONE targeting
   * vocabulary (target.ts). When `effects` is present the three legacy power
   * shapes below are not consulted. Movement riders (MoveEffect) live here too.
   */
  readonly effects?: readonly ActionEffect[]
  // ── the legacy power shapes (capability.item-powers, 2026-08-27) — read only when `effects` is absent ──
  /** Damage = this stat + bonus. Required on damage powers; absent on the rest. */
  readonly stat?: 'strength' | 'precision' | 'magic' | 'spirit'
  readonly bonus?: number
  readonly damageType?: DamageType
  /** Absent = 'damage' on a power without `effects`. 'heal' restores HP (`heal`); 'selfGuard' is the Knight Shield's Block (`guard`). */
  readonly effect?: 'damage' | 'heal' | 'selfGuard'
  readonly heal?: import('./trigger.js').ValueSpec
  readonly guard?: { readonly protectionBase: number; readonly protectionPerArmor: number; readonly dodgeLoss: number }
  /** What the Codex row says that the engine cannot do. Never silently half-real. */
  readonly gaps?: readonly string[]
  /**
   * ai.scorer (AI-DESIGN.md §3D, ruled 2026-09-26): the designer's hint for this
   * one action — "ability use is both the row's guidance and the engine's
   * valuation". Absent = the mode's own rules and scoring decide alone.
   */
  readonly aiHint?: AiHint
}

/**
 * ai.scorer — an action row's AI hint (AI-DESIGN.md §3D). Each field narrows or
 * forces the choice; none adds a number of its own. SWITCHES.md `aiHintShape`.
 *   use: 'whenever'   take it at the primary whenever it is legal ("use whenever available")
 *   belowHalfHp       only while the user is under half its Max Health
 *   minEnemiesStruck  only when the aim catches at least this many enemies
 */
export type AiHint = {
  readonly use?: 'whenever'
  readonly belowHalfHp?: boolean
  readonly minEnemiesStruck?: number
}

/**
 * ai.scorer (AI-DESIGN.md §3C, ruled 2026-09-26): one TIER of a mode's scoring —
 * consideration → integer weight (Law 7). A plan's score in the tier is the
 * weighted sum of its considerations; tiers compare in order (the first that
 * differs decides), and a full tie falls to the order the plans were listed in
 * (Law 6). One tier is a plain weighted sum; several are a priority ladder.
 */
export type AiTier = Readonly<Record<string, number>>

/**
 * ai.scorer — a MODE, as data (AI-DESIGN.md §3C): the unit type's
 * characteristics as fixed rules (`rules` names the procedure the engine runs —
 * dumb, never attacks, defends others) plus the scoring it chooses with.
 * A new mode is a new row; a row that reuses a procedure with other weights is
 * no code at all.
 */
export type AiModeRow = {
  readonly id: string
  /** The characteristic rules — which fixed procedure plays the unit. */
  readonly rules: 'flee' | 'dumb-melee' | 'melee-aggressive' | 'ranged-kite' | 'defender' | 'support' | 'focused-fire' | 'value-hunter' | 'follow' | 'hunter'
  /** Whom to attack: tiers over target considerations. */
  readonly target: readonly AiTier[]
  /** What the unit's movement is measured against. */
  readonly anchor: 'nearest-enemy' | 'target' | 'quarry' | 'ward' | 'lead' | 'away' | 'range-band'
  /** Tiers for the mode's other choices, by choice name (move, position, value, burst, heal). */
  readonly weights: Readonly<Record<string, readonly AiTier[]>>
}

/**
 * ai.mode-change (AI-DESIGN.md §3E; DECISIONS.md 2026-09-26 "the AI: a framework
 * now; modes can change"): "a unit's mode can change mid-battle — a brute that
 * runs when badly hurt, a boss that fights differently below half health. The
 * condition and the new mode are data on the unit's row." Read at the start of
 * the unit's own Activation; each change happens once, and emits `ai.mode`
 * naming it as the cause (SWITCHES.md, "AI mode changes").
 */
export type AiModeChange = {
  readonly id: string
  /** Every condition named must hold. Absent conditions do not narrow. */
  readonly when: AiModeCondition
  /** The mode the unit changes to — a key of ctx.aiModes (bare, as a unit's `ai`). */
  readonly mode: string
}
export type AiModeCondition = {
  /** Health below this integer percent of max Health: hp × 100 < maxHp × hpBelow (Law 7). */
  readonly hpBelow?: number
  /** The Turn is this one or later. */
  readonly fromTurn?: number
}

/** ai.scorer — one line of the decision log: a plan and the numbers behind it (Law 12). */
export type AiPlanLine = {
  readonly actionId: string
  readonly target?: number
  readonly destination?: number
  readonly centre?: number
  /** One number per tier, in tier order. */
  readonly score: readonly number[]
  /** Each consideration the tiers read, measured for this plan. */
  readonly terms: Readonly<Record<string, number>>
}
/**
 * ai.scorer — one AI decision: the top three plans, the taken one first. Kept
 * on Ctx.aiLog, never in Ctx.events — SWITCHES.md `aiDecisionLogHome`.
 */
export type AiDecision = {
  /** Index into Ctx.events where the taken plan's own events begin. */
  readonly at: number
  readonly turn: number
  readonly actor: number
  /** The mode row that chose — the cause (Law 12). */
  readonly mode: string
  /** Which choice this was: the rule or scoring step that made it. */
  readonly choice: string
  readonly plans: readonly AiPlanLine[]
}

/** Bursts freeze these authored source packets at declaration. */
export type BurstProfile = {
  readonly shape: { readonly kind: 'arc' } | { readonly kind: 'radius'; readonly radius: number }
  readonly side: import('./target.js').TargetSide
  readonly requireTags?: readonly string[]
  readonly packets: readonly {
    readonly id: string
    readonly damageType: DamageType
    readonly amount: number
    readonly stat?: 'strength' | 'precision' | 'magic' | 'spirit'
    readonly powerScale?: number
  }[]
  readonly heal?: number
  /** v2.kdb: the burst's Impact for each recipient's KDB check (SWITCHES.md kdbBursts). Absent = 0. */
  readonly impact?: number
  /**
   * v2.prop-destroy (COMBAT-V2 §12.2): "An area/burst applies destroy to every hex
   * and every edge touching the shape." Steps per prop, once per burst. Absent = 0.
   */
  readonly destroy?: number
}
export type BurstDef = ActionDef & { readonly burst: BurstProfile }

/** The attack half of an action — the fields the accuracy and damage pipelines resolve. */
export type SecondaryDamage = {
  readonly id: string
  readonly when: 'hit' | 'crit'
  readonly damageType: DamageType
  readonly amount: number
}

export type AttackProfile = {
  /** Ordered flat packets after the base; crit means confirmed, including chart-only crits. */
  readonly secondaryDamage?: readonly SecondaryDamage[]
  /** Reduces positive Armor for physical packets, never elemental defenses. */
  readonly armorPenetration?: number
  readonly kind: 'melee' | 'ranged'
  readonly damageType: DamageType
  /** Added to the governing stat. Zombie basic = 0, Axe = +1, Punch = -1. */
  readonly bonus: number
  /** Which stat carries the damage. Spirit is "identical to Magic" as a scaling stat (GAME-DESIGN §5). */
  readonly stat: 'strength' | 'precision' | 'magic' | 'spirit'
  /** On hit, apply this status to the target. A rider, not a station. */
  readonly applies?: { readonly statusId: string; readonly value: number }
  /** The weapon's flat addition to crit chance — station.crit (2026-08-27): the Dagger's +5. Plus OR minus (ruled 2026-09-04). */
  readonly crit?: number
  /**
   * attack.multihit (2026-09-03): "An attack is a list of hits, resolved one at
   * a time. Each hit runs the full cycle — damage, triggers, settle — before
   * the next hit begins." Absent = 1.
   */
  readonly hits?: number
  /** capability.power-pool: the share of the enemy side's Power this attack adds — 1, 0.5, 0.334 — at DMG.POWER. */
  readonly powerScale?: number
  /** The attack's own Accuracy modifier at ACC.SITUATIONAL (700). Punch's −5. Absent = 0. */
  readonly accuracy?: number
  /** How many CRITICALS one critting hit resolves — station.crit-count. Absent = 1. */
  readonly critCount?: number
  /**
   * v2.kdb (COMBAT-V2 §8, §9.1): "Impact adds to the KDB comparison only. It
   * is not damage." Counts even when the hit deals 0. Absent = 0.
   */
  readonly impact?: number
  /**
   * v2.prop-destroy (COMBAT-V2 §12.2): Destroy N applies N steps to whatever is in
   * the hex the attack strikes, once per connecting attack, at the end of its
   * resolution (§12.4). "Misses do not destroy." Absent = 0.
   */
  readonly destroy?: number
}

/**
 * The movement half of an action — Angela 2026-08-21: "Movement is a choice,
 * and that movement choice can have a modifier. It can cost stamina. It
 * shouldn't be hard-coded. It should be content-driven."
 */
export type MoveProfile = {
  /**
   * How the move resolves. `path` walks the step loop one hex at a time;
   * `sidestep` is exactly one hex, any direction, terrain cost ignored, still
   * a Step; `flight` is a targeted atomic jump with zero Steps (GAME-DESIGN
   * §Movement keywords, rewritten 2026-08-20).
   */
  readonly shape: 'path' | 'sidestep' | 'flight'
  /**
   * Sidestep-shaped only: EXACTLY how many hexes the step moves. Absent = 1.
   * Leap is 2; Focus and Devotion are 0 ("it moves you zero hexes on
   * purpose"). A 0-range bonus move still spends the slot, still cooldowns,
   * still fires its effects.
   */
  readonly stepRange?: number
  /** Added to the unit's movement-point budget for this action. Move/Sidestep 0; flight-swift +1. */
  readonly budgetMod: number
  /**
   * capability.charge (2026-09-27): path-shaped only — this action walks AT MOST
   * this many movement points, whatever the unit has left beyond it (a Slowed
   * unit with fewer walks fewer). The Codex row's own field, `hexes` ("move 3
   * hexes and attack"); terrain costs apply as for any walk (SWITCHES.md
   * chargeHexesArePoints). Not `stepRange`: that is a sidestep's EXACT distance.
   * Absent = the unit's own budget (movePointsLeft + budgetMod).
   */
  readonly hexes?: number
  /**
   * capability.move-ignores-zoc (2026-09-28): path-shaped only — this walk
   * ignores zones of control: leaving a hex inside an enemy's zone provokes no
   * attack of opportunity (the step loop logs `zoc.ignored` instead, once per
   * holder). "The move-WITHOUT-provoking machinery, as a property of their
   * movement" (ENEMY-REVIEW.md:276-278, the hounds); DECISIONS.md 2026-08-20:
   * "There are movement types that can happen without provoking." The Codex row's
   * own sentence, "Ignores zones of control". Absent = the walk provokes.
   */
  readonly ignoresZoc?: true
}

/** An action seen as an attack: the pipeline's view. */
export type AttackDef = ActionDef & { readonly attack: AttackProfile }
/** An action seen as a movement: the movement path's view. */
export type MoveDef = ActionDef & { readonly move: MoveProfile }
/** An action seen as a power: the effects path's view. Every action is one. */
export type AbilityDef = ActionDef

/** Every effect kind an action may carry — the power effects and the movement riders, one list. */
export type ActionEffect = AbilityEffect | MoveEffect

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
  /**
   * v2.prone (COMBAT-V2-DESIGN §10): stand up — removes every prone status the
   * unit holds. A move carrying it is legal only while prone (action.ts).
   */
  | { readonly kind: 'stand' }
  | {
      readonly kind: 'statMod'
      readonly stat: import('./stats.js').StatName
      readonly value: number
      /** endOfTurn = expires when this Turn ends; battle = permanent this battle. */
      readonly until: 'endOfTurn' | 'battle'
    }


/**
 * A named fielding — which units stand where, on which map.
 *
 * PLAYBACK-DESIGN §6.2: the standard battle cannot show the benched beasts or
 * the flight ladder, so nothing new can be shown until a fielding can be named
 * from outside. Measured 2026-08-21: across 640 battles on all 8 maps at two
 * army sizes, all three flight variants and all four beast attacks fired ZERO times.
 *
 * **There is deliberately no `overrides` field, and there must never be one.**
 * A scenario names units and positions; statistics belong to sweeps. A showcase
 * that can change numbers is a showcase that can lie about the game — so the
 * constraint is enforced by the type, not by a convention someone can forget.
 */
export type ScenarioDef = {
  /** A detached map row passed through production setup, without registry insertion. */
  readonly map?: AuthoredMap
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
  /** v2.loadout (V2 §11.1): weapons and shields stowed in item slots, parallel to heroes — swap fodder, granting nothing. */
  readonly heroStowed?: readonly (readonly string[] | undefined)[]
  /** v2.item-uses: uses each carried instance spent before this battle, parallel to heroes (BattleOptions.heroItemsUsed). */
  readonly heroItemsUsed?: readonly (readonly number[] | undefined)[]
  readonly heroProgress?: readonly (HeroProgress | undefined)[]
  /** badge.mechanism (2026-09-04): the badges each hero carries into this battle, parallel to heroes — the kingdom's list (a Wounded hero enters Wounded). Added to the row's own. */
  readonly heroBadges?: readonly (readonly string[] | undefined)[]
  /**
   * encounter.runner (2026-09-03): the encounter this scenario runs. Its
   * setup and schedule supply the enemy side, so `enemies` is empty and the
   * heroes deploy where the encounter says (or the player edge).
   */
  readonly encounterId?: string
  /** proving.side-override (2026-09-04): `byList` fields every unit on the side of the list it is in, whatever its row says — mirror matches. Absent = byRow. */
  readonly sides?: 'byRow' | 'byList'
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
/**
 * station.vs-target (2026-09-25): a damage modifier that reads the TARGET — what it
 * IS (a tag on its row) or what it CARRIES (a status at value > 0). Read at
 * DMG.VS_TARGET in the one damage function (Law 1); a rule changes a number, so it
 * is a station row, never a trigger. Exactly one of `tag` / `status`, and a flat `add`.
 * A Codex slayer map `{<tag>: N}` compiles to `{ tag, add: N }`. No percent: "There had
 * been no percentage modifiers to damage" (Andrew 2026-09-25, DECISIONS.md) — the
 * critical hit is the only multiplier (fix.vs-target-worn-and-flat).
 * Where it is carried and what it reaches: SWITCHES.md 'station.vs-target'.
 */
export type VsTargetRule = {
  readonly tag?: string
  readonly status?: string
  /** Flat damage added. */
  readonly add: number
}

/**
 * A BADGE — badge.mechanism (2026-09-04). Ruled 2026-09-04: badges are an
 * engine type. "There is a badge that all heroes start with, that is invisible
 * on a hero, called Hero ... Only those with the badge Hero bleed out" ·
 * "When a player succeeds at deathbed fighting ... they immediately gain
 * Wounded" · "We also need to be able to add the badges of the afflictions."
 * The same shape an item has minus the physical facts: stat modifiers folded
 * onto the unit, granted actions, riders, and FLAGS the rules read. On a unit
 * from fielding (the row's own, or the list the kingdom hands over) or granted
 * mid-battle (Wounded, an affliction). Content owns every row; the converter
 * compiles the Codex's prose payloads and names what it cannot express.
 */
export type BadgeDef = {
  readonly id: string
  readonly name: string
  readonly statModifiers: Readonly<Partial<Record<import('./stats.js').StatName | 'maxHp' | 'maxStamina' | 'staminaRegen' | 'movement' | 'reach', number>>>
  /** Actions the badge grants — a power, an attack. */
  readonly grants: readonly string[]
  readonly triggers?: readonly import('./trigger.js').Trigger[]
  /** station.vs-target: damage against a target by its tags or statuses — every damage this unit deals through the one function. */
  readonly vsTarget?: readonly VsTargetRule[]
  /**
   * What the rules read off the badge. `bleedsOut` — the Hero badge: a failed
   * deathbed roll downs and bleeds out instead of killing. `wounded` — the
   * Wounded badge: at 0 HP the unit dies, no roll. `blocksDeployment` — the
   * kingdom's: the hero cannot be fielded (the engine only reports it).
   */
  readonly flags: Readonly<Partial<{ bleedsOut: boolean; wounded: boolean; blocksDeployment: boolean
    /** v2.kdb (COMBAT-V2 §9.5): Stand Firm, Giant, Immovable — no push from any source moves the unit. */
    cannotBeKnockedBack: boolean
    /** v2.kdb (COMBAT-V2 §9.5): Stand Firm, Giant, Agile — KDB never knocks the unit down. */
    cannotBeKnockedDown: boolean }>>
  readonly gaps?: readonly string[]
}

export type ItemDef = {
  readonly id: string
  readonly name: string
  readonly itemClass: 'weapon' | 'shield' | 'armor' | 'trinket' | 'relic' | 'idol' | 'bloodrune' | 'consumable'
  readonly tier: number
  readonly hands: number
  readonly slots: number
  readonly classRestriction?: string
  readonly statModifiers: Readonly<Partial<Record<import('./stats.js').StatName | 'maxHp' | 'maxStamina' | 'staminaRegen' | 'movement' | 'reach', number>>>
  readonly grants: readonly string[]
  readonly abilities: readonly string[]
  readonly triggers: readonly import('./trigger.js').Trigger[]
  /** station.vs-target: slayer and its kin — a HELD item's reach only the attacks it grants, while in hand; a WORN item's (a bloodrune) reach every damage the unit deals, like a badge's. */
  readonly vsTarget?: readonly VsTargetRule[]
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
  /** Set only on the def COPY a `sides: 'byList'` fielding makes — the row's own side, when `side` is the fielded one. Rows never carry it. */
  readonly rowSide?: Side
  readonly maxHp: number
  readonly armor: number
  readonly resist: number
  readonly block?: number
  readonly rangedBlock?: number
  readonly fireResist?: number
  readonly poisonResist?: number
  readonly shadowResist?: number
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
  /** ai.mode-change: the changes this unit's mode makes mid-battle, in listed order. Absent = none. */
  readonly aiChanges?: readonly AiModeChange[]
  /**
   * capability.charge (2026-09-27): the Iron Colossus "has no primary action at
   * all; it is entirely movement powers" (ENEMY-REVIEW.md:348). The Codex row's
   * own field. True = the Activation's primary slot is closed to every action
   * (resolveActionSlot) — its walk, an either-slot action, spends the movement
   * slot or nothing. Absent = false.
   */
  readonly noPrimaryAction?: boolean
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
  /** badge.mechanism (2026-09-04): the badges the ROW carries — a civilian that says badge.hero, an enemy with an innate one. The kingdom's per-hero list arrives through BattleOptions.heroBadges. */
  readonly badges?: readonly string[]
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
  /** v2.thorns (COMBAT-V2 §9.4, 2026-09-24): the Thorns magnitude, folded from items, badges and specialties. Absent = 0. */
  readonly thorns?: number
  /** v2.swap (COMBAT-V2 §11.2, 2026-09-24): the loadout swap's stamina cost. Absent = 1 (the rule's default). */
  readonly swapCost?: number
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
  /**
   * The side the unit's ROW belongs to — equal to `side` unless the fielding
   * overrode it (proving.side-override, `sides: 'byList'`). Which of the two
   * the side-keyed RULES read is SWITCHES.md `mirrorSideRules`; allegiance
   * (allies, enemies, phases, victory) is always `side`. proving.mirror-row-rules (2026-09-04).
   */
  rowSide: Side
  hex: HexId
  hp: number
  maxHp: number
  armor: number
  resist: number
  block?: number
  rangedBlock?: number
  fireResist?: number
  poisonResist?: number
  shadowResist?: number
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
  toughness: number
  /** capability.surge: the stat, and the accumulating chance (zeroed on a hit). */
  surge: number
  surgeChance: number
  /** capability.vision: the Vision STAT (0 by default — the battlefield's 6 is added at read). */
  vision: number
  /** v2.thorns: the folded Thorns magnitude; absent on a bare body (read through the `thorns` stat). */
  thorns?: number
  /** v2.swap: the folded swap cost; absent = 1 (read through the `swapCost` stat). */
  swapCost?: number
  /** v2.swap (COMBAT-V2 §11.2): the one swap of this activation is spent. Absent = not spent; cleared at activation start and by a Surge. */
  swapUsed?: boolean
  /** capability.auras: this unit's auras, own frozen copies (plain data). */
  auras: AuraDef[]
  /** capability.corpses: a raised or summoned unit leaves no corpse. */
  summoned: boolean
  /** ai.mode.hunter (2026-09-03): the quarry, until it falls. */
  huntTarget?: number
  /** An AI mode standing in for the row's until a Turn ends (the civilians' flight, ruled 2026-09-03). */
  aiOverride?: { mode: string; untilTurn: number }
  /** ai.mode-change: the changes still to come, own copies; one leaves the list when it happens. Absent = none (snapshots unchanged). */
  aiChanges?: AiModeChange[]
  /** capability.charge: the row's noPrimaryAction — the primary slot is closed. Absent = open (snapshots unchanged). */
  noPrimaryAction?: true
  /** ai.encounter-rules: the encounter's AI rules bound to this unit as it arrived, by id, in the row's order. Absent = none (snapshots unchanged). */
  aiRules?: string[]
  /** capability.charges: uses left this Battle, by power id. Only powers with `uses` appear. */
  usesLeft: Record<string, number>
  /** capability.charges: what was spent, for the BattleResult. */
  usesSpentThisBattle?: Record<string, number>
  ai: string
  /**
   * THE ONE LIST — refactor.one-action-type (2026-09-04): every action this
   * unit may spend, attacks then powers then movements, in the row's order.
   * `attacksOf`, `powersOf` and `movesOf` (action.ts) are views by profile.
   */
  actions: string[]
  /** Action id -> the turn on which it becomes usable again. One map for every action kind. Plain object, JSON-safe. */
  cooldowns: Record<string, number>
  /** Live statuses, kept sorted by id so iteration is never insertion order. */
  /** `by` = the unit that applied it (Taunt reads it; capability.taunt 2026-09-03). */
  statuses: { id: string; value: number; by?: number }[]
  /** Stored stat modifiers — gear, wounds, badges. Terrain is derived, not stored. */
  mods: import('./stats.js').StatMod[]
  tags: readonly string[]
  /** badge.mechanism (2026-09-04): every badge on this unit, fielded or granted, by id. Flags are read off the registry rows. */
  badges: string[]
  /** Assembled from the unit's sources at makeUnit — own frozen copies (GAME-DESIGN §5). */
  triggers: import('./trigger.js').Trigger[]
  // Per-activation budget.
  moveUsed: boolean
  primaryUsed: boolean
  movePointsLeft: number
  // Per-unit ordinals. These are what keep RNG keys structural and unique.
  activationOrdinal: number
  incomingAttackOrdinal?: number
  burstOrdinal?: number
  attackOrdinal: number
  deathbedOrdinal: number
  /**
   * v2.knockback-collisions (COMBAT-V2 §9.3): the id of the `consumes` prop a
   * collision drove this unit to 0 Health against. Written only by
   * applyCollisionDamage (its damage.applied event carries it — Law 3); read
   * where death is decided (settle): dead, no corpse, no Deathbed.
   */
  consumedBy?: string
  /**
   * v2.loadout (COMBAT-V2 §11.1, ruled 2026-09-07): the weapons and shields in
   * this hero's hands and those stowed in its item slots. Only the hands grant;
   * the stowed are swap fodder. Absent on a unit fielded with no items (enemies).
   */
  loadout?: Loadout
  /**
   * v2.item-uses (V2 R6): the uses of each carried item instance whose powers have
   * `uses`, one entry per (instance, power), in instance order. `left` is what the
   * instance can still pay; `used` what it paid this Battle. The unit's usesLeft is
   * the sum over the entries it can reach now (a held item only while in hand), plus
   * the row's own. Absent on a unit carrying no such item (snapshots unchanged).
   */
  itemUses?: ItemUse[]
  /**
   * seam.unit-mods (2026-09-25, GEAR-IMPLEMENTATION.md §1): +damage on one carried
   * weapon's attacks, handed in per fielded hero (BattleOptions.heroMods — the kingdom's
   * resolved set bonuses). Read at DMG.DECLARE for an attack the item grants while it is
   * in hand. Written only by applyUnitMods; absent when none (snapshots unchanged).
   */
  weaponBonuses?: WeaponBonus[]
}

/** seam.unit-mods: one weapon's +damage from one source (a set), as the kingdom resolved it. */
export type WeaponBonus = { itemId: string; damage: number; source: string }

/**
 * seam.unit-mods (2026-09-25): the per-unit numbers the caller resolved for one fielded
 * hero — set bonuses (GEAR-DESIGN.md §5). `stats`: unit stat mods, each naming its
 * source; `attacks`: +damage on one carried weapon's attacks. Plain numbers — the engine
 * receives numbers, never set logic. Applied at fielding, after the items.
 */
export type UnitMods = {
  readonly stats?: readonly { readonly stat: import('./stats.js').StatName; readonly add: number; readonly source: string }[]
  readonly attacks?: readonly { readonly itemId: string; readonly damage: number; readonly source: string }[]
}

/** v2.item-uses: one carried instance's uses of one power. `left` 0 = spent. */
export type ItemUse = { instanceId: string; itemId: string; actionId: string; left: number; used: number }

/** v2.loadout: one carried item — which row it is, and which one it is (Law 12). */
export type ItemInstance = { instanceId: string; itemId: string }
/**
 * `worn` (fix.vs-target-worn-and-flat, 2026-09-25): the non-held instances the hero carries
 * in (bloodrunes, armor, trinkets …), in handed order, spent ones left out — what
 * DMG.VS_TARGET reads a worn slayer from. Absent when there are none (snapshots of heroes
 * carrying only weapons and shields unchanged). Never swapped.
 */
export type Loadout = { hands: ItemInstance[]; stowed: ItemInstance[]; worn?: ItemInstance[] }

/** The whole battle state. Serializes to JSON and back with no loss. */
export type State = {
  turn: number
  phase: Phase
  mapId: string
  /** board.variable-size (2026-09-04): the map's dimensions — plain data; hex ids are row × width + col on THIS board. */
  board: Board
  /** encounter.runner: which schedule rows have fired (by index), plain data. */
  encounter?: {
    id: string; fired: number[]; objectives: number[]
    /** ai.encounter-rules: this Phase's focus target, by coordinate rule id (the side step). Absent = none chosen. */
    focus?: Record<string, number>
  }
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
  /** Canonical obstruction state; authored x is normalized at map decode. */
  props: Prop[]
  floor?: boolean[]
  /** v2.structures: [structure hex, the hex it is entered from] — a wall's stairs, a house's door. Absent = none. */
  entries?: [number, number][]
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
    /** May a heal power target its own caster? SWITCHES.md, 2026-08-27. */
    healIncludesSelf: boolean
    /** May the AI swing an area attack through its own allies? SWITCHES.md, 2026-08-27. */
    aiBurstThroughAllies: boolean
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
    /** Default slot preference only; both policies honor authored restrictions. SWITCHES.md actionSlots. */
    actionSlots: 'byProfile' | 'any'
    /** SWITCHES.md mirrorSideRules (2026-09-04): an overridden unit follows the FIELDED side's rules, or (`row`, built 2026-09-04 — proving.mirror-row-rules) its own ROW's: `rulesSideOf()` in side.ts is the one reader. */
    mirrorSideRules: 'fielded' | 'row'
    /** Does a unit with a corpse-eating power eat before it swings? SWITCHES.md, 2026-09-03. */
    aiEatsBeforeBiting: boolean
    /** May a unit target something it cannot see? COMBAT-DESIGN §4 assumes no. SWITCHES.md, 2026-09-03. */
    targetUnseen: boolean
    /**
     * The End of Phase ladder, in order — fix.phase-ladder-config (2026-09-25).
     * COMBAT-SEQUENCE: "an ordered list of named rungs supplied by config ... so
     * reordering it is a sweep axis rather than a diff." Every built rung exactly
     * once (END_OF_PHASE_RUNGS); anything else is refused. SWITCHES.md endOfPhaseLadder.
     */
    endOfPhaseLadder: EndOfPhaseRung[]
    /** Does each End of Phase rung log a `phase.rung` line naming itself? SWITCHES.md phaseRungLog. */
    phaseRungLog: boolean
  }
}

/**
 * The BUILT End of Phase rungs, in the document's order (COMBAT-SEQUENCE §End of
 * Hero Phase: 4b bleed-out — hero ladder only, 5 stamina regen, 6 victory check).
 * Rungs 1–2 (auras, corpses) are not yet rungs; 3 moved to End of Activation.
 */
export const END_OF_PHASE_RUNGS = ['bleedOut', 'staminaRegen', 'victoryCheck'] as const
export type EndOfPhaseRung = typeof END_OF_PHASE_RUNGS[number]
/** Every built rung exactly once, nothing else — the one test the runner and the snapshot share. */
export function isEndOfPhaseLadder(v: unknown): v is EndOfPhaseRung[] {
  return Array.isArray(v) && v.length === END_OF_PHASE_RUNGS.length
    && END_OF_PHASE_RUNGS.every((r) => v.filter((x) => x === r).length === 1)
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
    // Conservative default: the AI never swings wide through a friend.
    aiBurstThroughAllies: false,
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
    actionSlots: 'byProfile',
    mirrorSideRules: 'fielded',
    // "the things surrounding them get stronger with every villager they eat"
    // (Supper) — the feast is the design. SWITCHES.md, 2026-09-03.
    aiEatsBeforeBiting: true,
    // "Can you target what you cannot see (assumed: no)" — COMBAT-DESIGN §4.
    targetUnseen: false,
    // The order COMBAT-SEQUENCE gives and battle.ts always ran. SWITCHES.md.
    endOfPhaseLadder: [...END_OF_PHASE_RUNGS],
    // Off: the control battles and every frozen cursor fixture stay byte-identical;
    // on, the log names each rung as it runs. SWITCHES.md, 2026-09-25.
    phaseRungLog: false,
  },
}

/**
 * Resumable control flow, separate from historical battle State. An action cycle
 * is the initial move/primary opportunity or another granted by Surge.
 * No closures or iterators: phase order and the next Surge key survive a yield.
 */
/** Technical guard: overflow is an invalid run, never a gameplay outcome. */
export const MAX_SURGE_CYCLES = 256
export type BattleCursor = {
  at: 'battle-start' | 'turn-start' | 'hero-start' | 'enemy-arrivals' | 'enemy-start'
    | 'next-activation' | 'selecting' | 'activation-start' | 'acting' | 'surge-check' | 'activation-end'
    | 'phase-end' | 'turn-end' | 'complete'
  phase: Phase
  order: number[]
  next: number
  actor: number | null
  surgeLink: number
  surged: boolean
  /** Sampled at activation start; mid-activation Slow waits for the next activation. */
  movementAllowance: number
}

/** Everything unserializable lives here, never in State. */
export type Ctx = {
  state: State
  /** Lazily initialized by advanceBattle; not part of the legacy State schema. */
  battleCursor?: BattleCursor
  events: Event[]
  rng: Rng
  cfg: Config
  /** board.variable-size: the board's geometry, bound to state.board. Pure functions of the board; the rules never see a WIDTH constant. */
  geo: Geometry
  /** THE ONE REGISTRY — refactor.one-action-type (2026-09-04): every attack, power and movement, by id. */
  actions: Readonly<Record<string, ActionDef>>
  statuses: Readonly<Record<string, import('./status.js').StatusDef>>
  /** The Critical Injury Chart — ruled data from the pack (station.crit 2026-08-27). */
  critChart: readonly CritRow[]
  /** The item registry — pack.items (2026-09-02). Read by nothing until seam.items-per-unit. */
  items: Readonly<Record<string, ItemDef>>
  /** The badge registry — badge.mechanism (2026-09-04). On Ctx so the kill-switch seam reaches a badge id like any other. */
  badges: Readonly<Record<string, BadgeDef>>
  /**
   * The badges the RULES read by role — fix.deathbed-no-stands (2026-09-04).
   * `hero`: the invisible Hero badge (bleeds out on a failed roll); `wounded`:
   * the badge a stood roll grants. Content names the ids (content/index.ts
   * RULE_BADGES); core reads them here and never a content id (Law 13's
   * hardcode scan). A role whose row the pack lacks is a NAMED gap on the log
   * line, never a silent skip.
   */
  ruleBadges: Readonly<{ hero: string; wounded: string }>
  /** The AI mode rows — ai.scorer (2026-09-26). On Ctx so the kill-switch seam reaches a mode like any other row. */
  aiModes: Readonly<Record<string, AiModeRow>>
  /** The AI decision log — ai.scorer: every decision, its top three plans and their numbers. Not battle state, not the event log. */
  aiLog: AiDecision[]
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
