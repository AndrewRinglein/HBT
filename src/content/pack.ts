// The generated unit pack's loader — the seam where Codex-tracked units enter
// the engine. Angela 2026-08-20: "we're going to read from the data and it's
// clearly differentiated text. We're not hardcoding." The pack file itself is
// GENERATED (content/mkenginepack.mjs) and never hand-edited; this loader
// validates it LOUDLY at import time (Law 9) and hands back plain UnitDefs.
import { UNIT_PACK } from './generated/pack.js'
import type { AbilityDef, AttackDef, CritRow, ItemDef, MoveDef, UnitDef } from '../core/types.js'
import { validateTrigger } from '../core/trigger.js'
import type { StatusDef } from '../core/status.js'
import { statusDamage, statusHeal } from '../core/status.js'

const REQUIRED = ['typeId', 'name', 'side', 'maxHp', 'armor', 'resist', 'accuracy', 'dodge',
  'strength', 'precision', 'magic', 'spirit', 'role', 'movement', 'reach',
  'maxStamina', 'staminaRegen', 'ai', 'attacks',
  // moves joined 2026-08-21 — movement is a granted CHOICE, read from the
  // data like everything else; a pack row without one is a pipeline bug.
  'moves'] as const

export function packUnits(): Readonly<Record<string, UnitDef>> {
  const out: Record<string, UnitDef> = {}
  // authoredEnemies joined 2026-08-26 (content.enemy-pack): the prologue's
  // real enemies, keyed by their FULL Codex id (unit.zombie) so they can never
  // collide with the legacy bare-key fixtures ('zombie') awaiting migration.
  for (const row of [...UNIT_PACK.heroes, ...UNIT_PACK.enemies, ...(UNIT_PACK as { authoredEnemies?: readonly unknown[] }).authoredEnemies ?? [],
    ...(UNIT_PACK as { prologueParty?: readonly unknown[] }).prologueParty ?? [],
    // alphaTeam joined 2026-08-27 (content.alpha-team): the test cohort rebuilt
    // on real scaffolding — authored kits, authored attack rows, riders in the
    // real vocabulary. Delivered from the content session (S31): "The Alpha
    // Team is landed … I want to switch to using these heroes."
    ...(UNIT_PACK as { alphaTeam?: readonly unknown[] }).alphaTeam ?? [],
    // the TEST RECEPTACLE joined 2026-09-02 (test.receptacle): content/test/
    // bodies — deltas over real rows or complete test bodies — through the
    // same converter and the same checks. Wipe the folder, they are gone.
    ...(UNIT_PACK as { test?: { units?: readonly unknown[] } }).test?.units ?? []]) {
    const r = row as unknown as UnitDef & { typeId: string; copyOf?: string }
    for (const k of REQUIRED) {
      if ((r as Record<string, unknown>)[k] === undefined) {
        throw new Error(`unit pack: '${r.typeId ?? '?'}' is missing '${k}' — regenerate the pack (content/mkenginepack.mjs), never patch it by hand`)
      }
    }
    // Id families, all clearly differentiated (Angela 2026-08-20): the cohort
    // is test- prefixed; the authored bestiary carries its full Codex id under
    // the declared unit. kind; the party and civilians are hero.*; and the
    // alpha- family is the S31 Alpha Team (delivered 2026-08-27) — the cohort
    // rebuilt the way heroes actually are. Anything else is a pipeline bug.
    if (!r.typeId.startsWith('test-') && !r.typeId.startsWith('unit.') && !r.typeId.startsWith('hero.')
      && !r.typeId.startsWith('alpha-')) {
      throw new Error(`unit pack: '${r.typeId}' is not test- / unit.* / hero.* / alpha- — the pack must stay clearly differentiated (Angela 2026-08-20)`)
    }
    for (const t of r.triggers ?? []) validateTrigger(t)
    for (const m of r.moves) {
      if (!/^power\./.test(m)) {
        throw new Error(`unit pack: '${r.typeId}' grants movement '${m}' — movement powers live under power.* (Codex 2026-08-20: "Grants power.flight")`)
      }
    }
    if (out[r.typeId]) throw new Error(`unit pack: duplicate typeId '${r.typeId}'`)
    out[r.typeId] = r
  }
  return out
}

/** The pack's own note — surfaced so tooling can print WHY these units exist. */
export const UNIT_PACK_NOTE = UNIT_PACK.note

/**
 * The authored item powers — capability.item-powers (2026-08-27). Validated
 * loudly at import: each row must speak exactly one of the three shapes.
 */
export function packAbilities(): Readonly<Record<string, AbilityDef>> {
  const raw = (UNIT_PACK as { authoredAbilities?: Readonly<Record<string, AbilityDef>> }).authoredAbilities ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`unit pack: ability key '${k}' names id '${a.id}'`)
    const kind = a.effect ?? 'damage'
    if (kind === 'damage' && (a.stat === undefined || a.bonus === undefined || a.damageType === undefined)) {
      throw new Error(`unit pack: damage power '${k}' is missing stat/bonus/damageType — regenerate the pack`)
    }
    if (kind === 'heal' && a.heal === undefined) throw new Error(`unit pack: heal power '${k}' has no heal spec — regenerate the pack`)
    if (kind === 'selfGuard' && a.guard === undefined) throw new Error(`unit pack: selfGuard power '${k}' has no guard spec — regenerate the pack`)
  }
  return raw
}

/**
 * The Critical Injury Chart — station.crit (2026-08-27). Ruled data, not a
 * content kind: keys are stable log keys, never ids. Validated loudly.
 */
export function packCritChart(): readonly CritRow[] {
  const raw = (UNIT_PACK as { critChart?: { rows?: readonly CritRow[] } }).critChart?.rows ?? []
  const seen = new Set<string>()
  for (const r of raw) {
    if (!r.key || !/^[a-z][a-z-]*$/.test(r.key)) throw new Error(`crit chart: bad row key '${String(r.key)}' — keys are stable lowercase log keys`)
    if (seen.has(r.key)) throw new Error(`crit chart: duplicate key '${r.key}'`)
    seen.add(r.key)
    for (const e of r.effects) {
      if (!['statMod', 'status', 'push', 'loseStamina', 'loseMaxHp'].includes(e.kind)) {
        throw new Error(`crit chart: row '${r.key}' carries unknown effect kind '${(e as { kind: string }).kind}' — regenerate the pack`)
      }
    }
  }
  return raw
}

/**
 * The Codex status rows — pack.statuses (2026-09-02). Andrew: "Yes — Codex
 * owns the rows"; the engine owns the behaviour. A pack row is plain data:
 * the behaviour flags the converter compiled from the row's one sentence,
 * plus `tick` ('damage' | 'heal'), which becomes the End-of-Phase hook HERE —
 * the only place a status row turns into a function. Validated loudly.
 */
type PackStatusRow = Omit<StatusDef, 'onPhaseEnd'> & { readonly tick?: 'damage' | 'heal'; readonly family?: string }
const STATUS_FLAGS = ['tickDamageType', 'decayPerPhase', 'reducesIncomingDamage', 'reducesOutgoingDamage',
  'blocksAction', 'reducesMovement', 'halvesHealing', 'locksPowers', 'shedByHealing', 'aiControlled', 'tick', 'family'] as const
export function packStatuses(): Readonly<Record<string, StatusDef>> {
  const raw = (UNIT_PACK as { statuses?: Readonly<Record<string, PackStatusRow>> }).statuses ?? {}
  for (const k of Object.keys(raw)) if (!k.startsWith('status.')) throw new Error(`unit pack: status '${k}' is not a status.* id`)
  return statusRowsToDefs(raw, 'unit pack')
}
function statusRowsToDefs(raw: Readonly<Record<string, PackStatusRow>>, where: string): Readonly<Record<string, StatusDef>> {
  const out: Record<string, StatusDef> = {}
  for (const [k, r] of Object.entries(raw)) {
    if (k !== r.id) throw new Error(`${where}: status key '${k}' names id '${r.id}'`)
    if (!['counter', 'pool', 'modifier', 'flag'].includes(r.shape)) throw new Error(`${where}: status '${k}' has shape '${String(r.shape)}'`)
    if (typeof r.decayPerPhase !== 'number') throw new Error(`${where}: status '${k}' has no decayPerPhase — regenerate the pack`)
    for (const f of Object.keys(r)) {
      if (!['id', 'name', 'shape', 'stacking', ...STATUS_FLAGS].includes(f)) throw new Error(`${where}: status '${k}' carries unknown field '${f}' — the loader does not know it, so the engine would ignore it silently`)
    }
    if (r.tick === 'damage' && r.tickDamageType === undefined) throw new Error(`${where}: status '${k}' ticks damage with no type`)
    const { tick, ...def } = r
    const id = r.id
    const hook = tick === 'damage' ? (ctx: Parameters<typeof statusDamage>[0], unitId: number, value: number) => statusDamage(ctx, unitId, value, id)
      : tick === 'heal' ? (ctx: Parameters<typeof statusHeal>[0], unitId: number, value: number) => statusHeal(ctx, unitId, value, id)
      : undefined
    out[id] = { ...def, ...(hook ? { onPhaseEnd: hook } : {}) }
  }
  return out
}

/**
 * The movement powers — pack.moves (2026-09-02). The Codex's `movementAction`
 * power rows, compiled by exact phrase in content/mkenginepack.mjs into the
 * MoveDef shape (Angela 2026-08-21: "It shouldn't be hard-coded. It should be
 * content-driven."). Two rows the engine cannot express — Pray (Faith) and
 * Charging Run (a stat mod that ends with the Activation) — are named gaps.
 * Validated loudly; plain data in, plain data out.
 */
export function packMoves(): Readonly<Record<string, MoveDef>> {
  const raw = (UNIT_PACK as { moves?: Readonly<Record<string, MoveDef>> }).moves ?? {}
  for (const [k, m] of Object.entries(raw)) {
    if (k !== m.id) throw new Error(`unit pack: move key '${k}' names id '${m.id}'`)
    if (!['path', 'sidestep', 'flight'].includes(m.shape)) throw new Error(`unit pack: move '${k}' has shape '${String(m.shape)}'`)
    for (const f of ['staminaCost', 'budgetMod', 'cooldown'] as const) {
      if (typeof m[f] !== 'number') throw new Error(`unit pack: move '${k}' is missing ${f} — regenerate the pack`)
    }
    if (m.stepRange !== undefined && (m.shape !== 'sidestep' || typeof m.stepRange !== 'number')) throw new Error(`unit pack: move '${k}' carries a stepRange it cannot use`)
    for (const e of m.effects ?? []) {
      if (!['gainStamina', 'loseMaxStamina', 'statMod'].includes(e.kind)) throw new Error(`unit pack: move '${k}' carries unknown effect kind '${(e as { kind: string }).kind}'`)
    }
  }
  return raw
}

/**
 * The test receptacle's attacks and statuses — test.receptacle (2026-09-02).
 * content/test/attacks.json and statuses.json, converted beside the real rows.
 * The family is enforced twice: the converter refuses a non-test id, and so
 * does this loader — a test row can never shadow real content.
 */
export function packTestAttacks(): Readonly<Record<string, AttackDef>> {
  const raw = (UNIT_PACK as { test?: { attacks?: Readonly<Record<string, AttackDef>> } }).test?.attacks ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`test receptacle: attack key '${k}' names id '${a.id}'`)
    if (!k.startsWith('attack.test-')) throw new Error(`test receptacle: '${k}' is not attack.test-*`)
    for (const f of ['kind', 'damageType', 'bonus', 'stat', 'reach', 'staminaCost'] as const) {
      if (a[f] === undefined) throw new Error(`test receptacle: attack '${k}' is missing ${f}`)
    }
  }
  return raw
}
export function packTestAbilities(): Readonly<Record<string, AbilityDef>> {
  const raw = (UNIT_PACK as { test?: { abilities?: Readonly<Record<string, AbilityDef>> } }).test?.abilities ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`test receptacle: ability key '${k}' names id '${a.id}'`)
    if (!k.startsWith('power.test-')) throw new Error(`test receptacle: '${k}' is not power.test-*`)
  }
  return raw
}
export function packTestStatuses(): Readonly<Record<string, StatusDef>> {
  const raw = (UNIT_PACK as { test?: { statuses?: Readonly<Record<string, PackStatusRow>> } }).test?.statuses ?? {}
  for (const k of Object.keys(raw)) if (!k.startsWith('test.status.')) throw new Error(`test receptacle: '${k}' is not test.status.*`)
  return statusRowsToDefs(raw, 'test receptacle')
}

/**
 * The item registry — pack.items (2026-09-02, ITEMS-PLAN.md §3). Every Codex
 * item row, compiled by content/mkenginepack.mjs. Validated loudly: the
 * physical facts must be numbers, every granted attack must be a pack attack,
 * every granted power a pack ability, every trigger well-formed with the item
 * as its source, and every stat key one the engine has. `gaps` is carried as
 * the row's own list of what it cannot yet do.
 */
export function packItems(attacks: Readonly<Record<string, AttackDef>>, abilities: Readonly<Record<string, AbilityDef>>): Readonly<Record<string, ItemDef>> {
  const raw = (UNIT_PACK as { items?: Readonly<Record<string, ItemDef>> }).items ?? {}
  const CLASSES = ['weapon', 'armor', 'trinket', 'relic', 'idol', 'bloodrune', 'consumable']
  const STATS = ['maxHp', 'armor', 'resist', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen', 'crit', 'luck']
  for (const [k, it] of Object.entries(raw)) {
    if (k !== it.id) throw new Error(`item pack: key '${k}' names id '${it.id}'`)
    if (!k.startsWith('item.')) throw new Error(`item pack: '${k}' is not an item.* id`)
    if (!CLASSES.includes(it.itemClass)) throw new Error(`item pack: '${k}' has itemClass '${String(it.itemClass)}'`)
    for (const f of ['tier', 'hands', 'slots'] as const) if (typeof it[f] !== 'number') throw new Error(`item pack: '${k}' is missing ${f}`)
    for (const [s, v] of Object.entries(it.statModifiers)) {
      if (!STATS.includes(s)) throw new Error(`item pack: '${k}' modifies '${s}', which is not an engine stat — the converter must gap it, never pass it`)
      if (typeof v !== 'number') throw new Error(`item pack: '${k}' statModifier ${s} is not a number`)
    }
    for (const a of it.grants) if (!attacks[a]) throw new Error(`item pack: '${k}' grants '${a}', which is not in the pack's attacks`)
    for (const a of it.abilities) if (!abilities[a]) throw new Error(`item pack: '${k}' grants power '${a}', which is not in the pack's abilities`)
    for (const t of it.triggers) { validateTrigger(t); if (t.source !== k) throw new Error(`item pack: '${k}' carries a trigger sourced '${t.source}'`) }
  }
  return raw
}

/** The authored enemies' attacks — generated rows, validated like the units. */
export function packAttacks(): Readonly<Record<string, AttackDef>> {
  const raw = (UNIT_PACK as { authoredAttacks?: Readonly<Record<string, AttackDef>> }).authoredAttacks ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`unit pack: attack key '${k}' names id '${a.id}'`)
    if (!['melee', 'ranged'].includes(a.kind) || typeof a.reach !== 'number' || a.reach < 1) {
      throw new Error(`unit pack: attack '${k}' has no usable kind/reach — regenerate the pack`)
    }
  }
  return raw
}
