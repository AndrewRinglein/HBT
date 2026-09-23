// The stat pipeline.
//
// A stat is never a raw value. It is a base plus an ordered list of modifiers,
// resolved on read, with a ledger that says where every point came from.
//
// This is the same shape as the damage pipeline — stations, ordering, provenance —
// applied to stats instead of hits. Before it existed, terrain accuracy was a
// hardcoded station, hero Reach was added ad hoc inside reachOf(), and gear and
// wound levels had nowhere to live. Each of those was a special case at the point
// of use, which is exactly the retrofit worth avoiding.
//
// Deliberately NOT copied from Unreal's GAS: its multiply bucket aggregates as
// 1 + Σ(mᵢ − 1), so two ×1.5 modifiers give ×2.0 rather than ×2.25. Constitution
// Law 7 bans multiplicative aggregation outright, which rules that class of bug
// out by construction. Additive and override only, integers only.

import type { Ctx, Unit } from './types.js'
import { accuracyBonusOf, reachBonusOf, dodgeBonusOf, armorBonusOf, resistBonusOf, terrainIdOf } from '../content/maps.js'

export type StatName =
  | 'strength' | 'precision' | 'magic' | 'spirit'
  | 'accuracy' | 'dodge' | 'block' | 'rangedBlock'
  | 'armor' | 'resist' | 'fireResist' | 'poisonResist' | 'shadowResist'
  | 'movement' | 'reach'
  | 'maxHp' | 'maxStamina' | 'staminaRegen'
  // station.crit (2026-08-27): the two crit-system stats, resolvable so
  // badges and wounds can modify them like anything else.
  | 'crit' | 'luck'
  /** capability.vision (2026-09-03): the unit's Vision STAT — 0 by default; the battlefield's 6 is added at read (visionOf), never stored. */
  | 'vision'

/**
 * `add` sums. `set` overrides and wins outright (disarm, petrify).
 * No multiply — see the note at the top of this file.
 */
export type StatOp = 'add' | 'set'

/**
 * `scope` is the PoE lesson: a weapon's own bonus should scale with that weapon's
 * own modifiers, and a ring's should not. Only 'unit' is used today; 'item' exists
 * so that adding gear later is a new value rather than a migration of every modifier.
 */
export type StatScope = 'unit' | 'item'

export type StatMod = {
  stat: StatName
  op: StatOp
  value: number
  /** Where it came from. Shows up in the ledger and in the log. */
  source: string
  scope: StatScope
  /** Turn on which it stops applying. Absent = permanent. */
  expiresAtTurn?: number
  /**
   * "until the end of your next Activation" (V2 shields, 2026-09-23): the holder's
   * activationOrdinal at whose END the mod is removed, by expireActivationMods.
   */
  expiresAfterActivation?: number
}

export type StatLedgerRow = { source: string; op: StatOp; delta: number; from: number; to: number }
export type StatResult = { value: number; base: number; ledger: StatLedgerRow[] }

const BASE: Record<StatName, (u: Unit) => number> = {
  strength: (u) => u.strength,
  precision: (u) => u.precision,
  magic: (u) => u.magic,
  spirit: (u) => u.spirit,
  accuracy: (u) => u.accuracy,
  dodge: (u) => u.dodge,
  block: (u) => u.block ?? 0,
  rangedBlock: (u) => u.rangedBlock ?? 0,
  armor: (u) => u.armor,
  resist: (u) => u.resist,
  fireResist: (u) => u.fireResist ?? 0,
  poisonResist: (u) => u.poisonResist ?? 0,
  shadowResist: (u) => u.shadowResist ?? 0,
  movement: (u) => u.movement,
  reach: (u) => u.reach,
  maxHp: (u) => u.maxHp,
  maxStamina: (u) => u.maxStamina,
  staminaRegen: (u) => u.staminaRegen,
  crit: (u) => u.crit,
  luck: (u) => u.luck,
  vision: (u) => u.vision,
}

/** The same stat vocabulary used by resolution, for external data validation. */
export function isStatName(name: string): name is StatName { return Object.hasOwn(BASE, name) }

/**
 * Modifiers granted by the hex a unit is standing on.
 * DERIVED, never stored — terrain follows the unit's position, so storing it would
 * mean remembering to remove it on every move. Recomputing is one array lookup.
 */
export function terrainMods(ctx: Ctx, u: Unit): StatMod[] {
  const t = ctx.state.terrain[u.hex] ?? 0
  const out: StatMod[] = []
  const push = (stat: StatName, value: number) => {
    if (value !== 0) out.push({ stat, op: 'add', value, source: terrainIdOf(t), scope: 'unit' })
  }
  push('accuracy', accuracyBonusOf(t))
  push('reach', reachBonusOf(t))
  push('dodge', dodgeBonusOf(t))
  push('armor', armorBonusOf(t))
  push('resist', resistBonusOf(t))
  return out
}

/** Every modifier currently applying to a unit, in a stated order (Law 6). */
/**
 * Modifiers LENT by the auras this unit stands inside — capability.auras
 * (2026-09-03). DERIVED, never stored, exactly as terrain: an aura follows its
 * holder and a unit that steps out loses it on the next read. Standing
 * holders only; the holder is inside its own aura (the actor is always one of
 * its own allies, target.ts). Sorted by holder id then aura id (Law 6).
 */
export function auraMods(ctx: Ctx, u: Unit): StatMod[] {
  const out: StatMod[] = []
  const holders = ctx.state.units.filter((h) => h.lifeState === 'standing' && h.auras.length).sort((a, b) => a.id - b.id)
  for (const h of holders) {
    for (const a of h.auras) {
      const isAlly = h.side === u.side
      if (a.side === 'ally' && !isAlly) continue
      if (a.side === 'enemy' && isAlly) continue
      if (a.requireTags && !a.requireTags.every((t) => u.tags.includes(t))) continue
      if (ctx.geo.distance(h.hex, u.hex) > a.radius) continue
      for (const [stat, value] of Object.entries(a.mods)) if (value) out.push({ stat: stat as StatName, op: 'add', value, source: a.id, scope: 'unit' })
    }
  }
  return out
}

export function modsFor(ctx: Ctx, u: Unit): StatMod[] {
  const stored = u.mods.filter((m) => m.expiresAtTurn === undefined || ctx.state.turn < m.expiresAtTurn)
  const all = [...stored, ...terrainMods(ctx, u), ...auraMods(ctx, u)]
  // Sorted so resolution never depends on the order things happened to be added.
  // `set` last, because an override is meaningless before the adds it replaces.
  return all.sort((a, b) =>
    (a.op === b.op ? 0 : a.op === 'add' ? -1 : 1) ||
    (a.source < b.source ? -1 : a.source > b.source ? 1 : 0) ||
    (a.value - b.value))
}

let resolving = false

/**
 * Resolve a stat. PURE — recompute on read, no cache.
 *
 * At our scale a cache would only buy invalidation bugs; Law 8 already says so.
 * The one hazard of a pull model is re-entrancy — a modifier whose value reads
 * another stat could loop forever — so cross-stat modifiers are forbidden and the
 * guard below makes the violation loud rather than silent.
 */
export function effective(ctx: Ctx, u: Unit, stat: StatName): StatResult {
  if (resolving) {
    throw new Error(
      `re-entrant stat resolution while reading '${stat}'. A modifier may not read another stat — ` +
      `cross-stat dependencies turn a pull model into an infinite loop.`)
  }
  resolving = true
  try {
    const base = BASE[stat](u)
    let v = base
    const ledger: StatLedgerRow[] = []
    for (const m of modsFor(ctx, u)) {
      if (m.stat !== stat) continue
      const from = v
      v = m.op === 'set' ? m.value : v + m.value
      if (v !== from) ledger.push({ source: m.source, op: m.op, delta: v - from, from, to: v })
    }
    return { value: v, base, ledger }
  } finally {
    resolving = false
  }
}

/** The common case: just the number. */
export function stat(ctx: Ctx, u: Unit, s: StatName): number {
  return effective(ctx, u, s).value
}
