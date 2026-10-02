// THE ENGINE'S VOCABULARY — plumbing.vocabulary-export (2026-09-28; DECISIONS.md "the
// duplication review, ruled"; review findings C10 C11 C16 C17 K6 K13 V12).
//
// One list per word family, each owned where the thing it names is built, gathered here so
// the other packages read ONE export instead of keeping copies: the kingdom and the viewer
// import `engineVocabulary()` through their doors, and the content tools (plain node, no
// TypeScript) read the same object as generated/vocabulary.json, written by
// tools/vocabulary.mts. test/vocabulary.test.ts refuses a stale JSON, an event nothing emits
// and a union a list forgets. Nothing here is a rule; it is the names the rules use — and,
// since fix.codex-numbers (2026-10-01, review findings C1 C2 C9), the bases those rules add a
// unit's stat to (ruleBases), so the converter subtracts the engine's own base from a Codex
// total instead of typing it, and the Codex browser shows the engine's derived values.
//
// Prior art: every list below already existed (FOLDABLE, HOOKS, the effect unions, Outcome,
// LifeState, LAYER_IDS, GLYPH). This module adds no concept; it removes the copies.
import { FOLDABLE, FOLD_BASE } from './items.js'
import { STAT_NAMES } from './stats.js'
import { ATTACKER_HOOKS, HOOKS } from './trigger.js'
import { DAMAGE_TYPES, EFFECT_KINDS, LIFE_STATES, OUTCOMES, STAT_MOD_UNTIL } from './types.js'
import { EVENT_TYPES } from './mutate.js'
import { CRIT_BASE } from './pipeline.js'
import { BATTLEFIELD_VISION } from './vision.js'
import { BLEED_OUT_COUNTER, DEATHBED_BASE, DEATHBED_PER_TOUGHNESS } from './settle.js'
import { GLYPH, GLYPH_LAYER, LAYER_IDS, appliesOnActivationEndOf, appliesOnEnterOf, layerAppliesOnActivationEnd, layerAppliesOnEnter, terrainIdOf } from '../content/terrain.js'

export type EngineVocabulary = {
  /** Every stat an item, a badge, a level or an aura may fold onto a unit (FOLDABLE). */
  readonly stats: readonly string[]
  /** A foldable stat whose absent value is not 0. */
  readonly statBase: Readonly<Record<string, number>>
  /**
   * The rule's own base under a stat (fix.codex-numbers): crit chance is crit + 3, the vision
   * radius vision + 6, the bleed-out counter bleedOutTurns + 5, Deathbed Fighting
   * deathbedFighting + 20 + 5 × Toughness. Owned where each rule is (pipeline, vision, settle).
   */
  readonly ruleBases: { readonly crit: number; readonly vision: number; readonly bleedOutTurns: number; readonly deathbedFighting: number; readonly deathbedPerToughness: number }
  /** The stats the stat pipeline resolves (StatName) — what a statMod may name. */
  readonly resolvable: readonly string[]
  readonly hooks: readonly string[]
  /** The hooks that fire on the attacker's own triggers inside its attack. */
  readonly attackerHooks: readonly string[]
  /** fix.one-effect-vocabulary (2026-10-01): THE effect kinds — a trigger's, a power's, a move's and a chart row's are one list. */
  readonly effectKinds: readonly string[]
  /** How long a stat modifier may last — one set for every effect. */
  readonly statModUntil: readonly string[]
  readonly outcomes: readonly string[]
  readonly lifeStates: readonly string[]
  /** Every event type the engine emits; `life.<state>` is spelled out. */
  readonly events: readonly string[]
  /** rule.cold-resist (2026-09-29): the damage types (DAMAGE_TYPES), exported so content reads the list rather than copying it. */
  readonly damageTypes: readonly string[]
  /** The ground layers, in the engine's order, and the statuses each applies. */
  readonly layers: readonly { readonly id: string; readonly onEnter: readonly (readonly [string, number])[]; readonly onActivationEnd: readonly (readonly [string, number])[] }[]
  /** Each authored glyph, the terrain it decodes to, the layer it paints (if any) and the statuses that ground applies. */
  readonly terrain: readonly { readonly glyph: string; readonly id: string; readonly layer?: string; readonly onEnter: readonly (readonly [string, number])[]; readonly onActivationEnd: readonly (readonly [string, number])[] }[]
}

export function engineVocabulary(): EngineVocabulary {
  return {
    stats: [...FOLDABLE],
    statBase: { ...FOLD_BASE },
    ruleBases: { crit: CRIT_BASE, vision: BATTLEFIELD_VISION, bleedOutTurns: BLEED_OUT_COUNTER, deathbedFighting: DEATHBED_BASE, deathbedPerToughness: DEATHBED_PER_TOUGHNESS },
    resolvable: [...STAT_NAMES],
    hooks: [...HOOKS],
    attackerHooks: [...ATTACKER_HOOKS],
    effectKinds: [...EFFECT_KINDS],
    statModUntil: [...STAT_MOD_UNTIL],
    outcomes: [...OUTCOMES],
    lifeStates: [...LIFE_STATES],
    events: [...EVENT_TYPES, ...LIFE_STATES.map((s) => `life.${s}`)],
    damageTypes: [...DAMAGE_TYPES],
    layers: Object.keys(LAYER_IDS).map(Number).sort((a, b) => a - b).map((n) => ({
      id: LAYER_IDS[n]!, onEnter: layerAppliesOnEnter(n), onActivationEnd: layerAppliesOnActivationEnd(n),
    })),
    terrain: Object.entries(GLYPH).map(([glyph, t]) => ({
      glyph, id: terrainIdOf(t), ...(GLYPH_LAYER[glyph] !== undefined ? { layer: LAYER_IDS[GLYPH_LAYER[glyph]!]! } : {}),
      onEnter: appliesOnEnterOf(t), onActivationEnd: appliesOnActivationEndOf(t),
    })),
  }
}

/** The generated file's exact text — tools/vocabulary.mts writes it, test/vocabulary.test.ts compares it. */
export function vocabularyJson(): string {
  return JSON.stringify({ _: 'GENERATED by engine/tools/vocabulary.mts from engine/src/core/vocabulary.ts — never hand-edit', ...engineVocabulary() }, null, 1) + '\n'
}
