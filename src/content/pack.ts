// The generated unit pack's loader — the seam where Codex-tracked units enter
// the engine. Angela 2026-08-20: "we're going to read from the data and it's
// clearly differentiated text. We're not hardcoding." The pack file itself is
// GENERATED (content/mkenginepack.mjs) and never hand-edited; this loader
// validates it LOUDLY at import time (Law 9) and hands back plain UnitDefs.
import { UNIT_PACK } from './generated/pack.js'
import type { AbilityDef, AttackDef, BadgeDef, CritRow, EncounterDef, ItemDef, MoveDef, UnitDef } from '../core/types.js'
import { formatOf } from '../core/hex.js'
import { validateTrigger } from '../core/trigger.js'
import type { StatusDef } from '../core/status.js'
const EFFECT_KINDS = ['damage', 'heal', 'status.apply', 'status.remove', 'statMod', 'selfDamage', 'knockback', 'corpse.eat', 'stamina.gain']
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
  // capability.auras (2026-09-03): every aura well-formed, its stats the engine's
  for (const [k, u] of Object.entries(out)) {
    for (const a of u.auras ?? []) {
      if (!a.id.startsWith('aura.') || !Number.isInteger(a.radius) || a.radius < 0) throw new Error(`unit pack: '${k}' aura '${a.id}' is malformed`)
      for (const st of Object.keys(a.mods)) if (!['strength', 'precision', 'magic', 'spirit', 'accuracy', 'dodge', 'armor', 'resist', 'movement', 'reach', 'crit', 'luck', 'maxHp', 'maxStamina', 'staminaRegen', 'toughness', 'surge'].includes(st)) throw new Error(`unit pack: '${k}' aura '${a.id}' lends '${st}', not a stat`)
    }
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
    // an effect-list power (ability.effects) is validated by its list, not the three legacy shapes
    if (a.effects) { for (const e of a.effects) if (!EFFECT_KINDS.includes(e.kind)) throw new Error(`unit pack: power '${k}' has an effect of kind '${String((e as { kind: string }).kind)}'`); continue }
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
  'blocksAction', 'reducesMovement', 'halvesHealing', 'locksPowers', 'shedByHealing', 'aiControlled', 'tick', 'family',
  // capability.frost / root / taunt, 2026-09-03
  'addsIncomingPhysical', 'blocksMovement', 'forcesTarget', 'cancels',
  // capability.karma / shadow / confusion, 2026-09-03
  'boostsHealingReceived', 'boostsOutgoingHalf', 'decayOnKill', 'grows', 'obliteratesAtMaxHp', 'swapsAi'] as const
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

// ── THE LIFT — refactor.one-action-type (2026-09-04) ─────────────────────────
// The pack (content/mkenginepack.mjs) still writes attacks and movements as
// the flat rows it always did — that is content's shape and it did not change.
// The engine lifts each into the ONE action type at load: the fields the
// pipeline resolves go under `attack`, the movement fields under `move`, and
// the limits and reach sit on the action itself. Nothing is invented here;
// every field moves, none is renamed.

/** An attack row as the pack writes it. */
export type PackAttackRow = {
  readonly id: string; readonly name: string; readonly kind: 'melee' | 'ranged'; readonly damageType: import('../core/types.js').DamageType
  readonly bonus: number; readonly stat: 'strength' | 'precision' | 'magic' | 'spirit'; readonly reach: number; readonly staminaCost: number
  readonly applies?: { readonly statusId: string; readonly value: number }; readonly area?: 'arc' | 'blast1'
  readonly crit?: number; readonly hits?: number; readonly cooldown?: number; readonly warmup?: number
  readonly powerScale?: number; readonly accuracy?: number; readonly critCount?: number; readonly uses?: number; readonly free?: boolean
}
/** A movement row as the pack writes it. */
export type PackMoveRow = {
  readonly id: string; readonly name: string; readonly shape: 'path' | 'sidestep' | 'flight'; readonly stepRange?: number
  readonly effects?: readonly import('../core/types.js').MoveEffect[]; readonly staminaCost: number; readonly budgetMod: number
  readonly cooldown: number; readonly warmup?: number; readonly uses?: number
}

export function liftAttack(r: PackAttackRow): AttackDef {
  const { id, name, kind, damageType, bonus, stat, reach, staminaCost, applies, area, crit, hits, cooldown, warmup, powerScale, accuracy, critCount, uses, free } = r
  return {
    id, name, source: 'weapon', staminaCost, cooldown: cooldown ?? 0, range: reach,
    ...(warmup !== undefined ? { warmup } : {}), ...(uses !== undefined ? { uses } : {}), ...(free ? { free } : {}), ...(area ? { area } : {}),
    attack: {
      kind, damageType, bonus, stat,
      ...(applies ? { applies } : {}), ...(crit !== undefined ? { crit } : {}), ...(hits !== undefined ? { hits } : {}),
      ...(powerScale !== undefined ? { powerScale } : {}), ...(accuracy !== undefined ? { accuracy } : {}), ...(critCount !== undefined ? { critCount } : {}),
    },
  }
}
export function liftMove(r: PackMoveRow): MoveDef {
  const { id, name, shape, stepRange, effects, staminaCost, budgetMod, cooldown, warmup, uses } = r
  return {
    id, name, source: 'movement', slot: 'movement', staminaCost, cooldown, range: stepRange ?? 1,
    ...(warmup !== undefined ? { warmup } : {}), ...(uses !== undefined ? { uses } : {}), ...(effects ? { effects } : {}),
    move: { shape, budgetMod, ...(stepRange !== undefined ? { stepRange } : {}) },
  }
}
export function liftAttacks(raw: Readonly<Record<string, PackAttackRow>>): Readonly<Record<string, AttackDef>> {
  return Object.fromEntries(Object.entries(raw).map(([k, r]) => [k, liftAttack(r)]))
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
  const source = UNIT_PACK as { moves?: Readonly<Record<string, PackMoveRow>>; test?: { moves?: Readonly<Record<string, PackMoveRow>> } }
  const raw = { ...source.moves, ...source.test?.moves }
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
  return Object.fromEntries(Object.entries(raw).map(([k, r]) => [k, liftMove(r)]))
}

/**
 * The test receptacle's attacks and statuses — test.receptacle (2026-09-02).
 * content/test/attacks.json and statuses.json, converted beside the real rows.
 * The family is enforced twice: the converter refuses a non-test id, and so
 * does this loader — a test row can never shadow real content.
 */
export function packTestAttacks(): Readonly<Record<string, AttackDef>> {
  const raw = (UNIT_PACK as { test?: { attacks?: Readonly<Record<string, PackAttackRow>> } }).test?.attacks ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`test receptacle: attack key '${k}' names id '${a.id}'`)
    if (!k.startsWith('attack.test-')) throw new Error(`test receptacle: '${k}' is not attack.test-*`)
    for (const f of ['kind', 'damageType', 'bonus', 'stat', 'reach', 'staminaCost'] as const) {
      if (a[f] === undefined) throw new Error(`test receptacle: attack '${k}' is missing ${f}`)
    }
  }
  return liftAttacks(raw)
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
  const STATS = ['maxHp', 'armor', 'resist', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen', 'crit', 'luck', 'toughness', 'surge', 'vision']
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
  const raw = (UNIT_PACK as { authoredAttacks?: Readonly<Record<string, PackAttackRow>> }).authoredAttacks ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`unit pack: attack key '${k}' names id '${a.id}'`)
    if (!['melee', 'ranged'].includes(a.kind) || typeof a.reach !== 'number' || a.reach < 1) {
      throw new Error(`unit pack: attack '${k}' has no usable kind/reach — regenerate the pack`)
    }
  }
  return liftAttacks(raw)
}

// ── HERO ASSEMBLY (2026-09-03) ───────────────────────────────────────────────
// Ruled 2026-09-03 (Angela): "I would rather we are actually assembling the
// units so that we know that the way that we're getting things into the units
// is still correct ... it has to also have the abilities in it." Four generated
// registries: the class powers (ability.effects), the level tables, the
// specialties, and the enchanted tier-3 rows. Each validated loudly here.


/** Every class power as an ability — compiled effects, or a row that names its gaps and is inert. */
export function packClassPowers(): Readonly<Record<string, AbilityDef>> {
  const raw = (UNIT_PACK as unknown as { classPowers?: Readonly<Record<string, AbilityDef>> }).classPowers ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`class powers: key '${k}' names id '${a.id}'`)
    if (!k.startsWith('power.')) throw new Error(`class powers: '${k}' is not a power.* id`)
    if (!Array.isArray(a.effects)) throw new Error(`class powers: '${k}' carries no effects list — regenerate the pack`)
    for (const e of a.effects) if (!EFFECT_KINDS.includes(e.kind)) throw new Error(`class powers: '${k}' has an effect of kind '${String((e as { kind: string }).kind)}'`)
    if (!a.target) throw new Error(`class powers: '${k}' has no targeting`)
    if (a.effects.length === 0 && !(a.gaps && a.gaps.length)) throw new Error(`class powers: '${k}' compiled nothing and names no gap — the converter must say why`)
  }
  return raw
}

export type SpecialtyDef = { readonly id: string; readonly name: string; readonly class: string; readonly statModifiers: Readonly<Record<string, number>>; readonly gaps?: readonly string[] }
export function packSpecialties(): Readonly<Record<string, SpecialtyDef>> {
  const raw = (UNIT_PACK as unknown as { specialties?: Readonly<Record<string, SpecialtyDef>> }).specialties ?? {}
  for (const [k, sp] of Object.entries(raw)) {
    if (k !== sp.id || !k.startsWith('specialty.')) throw new Error(`specialties: bad key '${k}'`)
    for (const v of Object.values(sp.statModifiers)) if (typeof v !== 'number') throw new Error(`specialties: '${k}' has a non-numeric modifier`)
  }
  return raw
}

export type LevelRow = { readonly level: number; readonly grants: Readonly<Record<string, number>>; readonly choice?: readonly Readonly<Record<string, number>>[]; readonly power?: boolean; readonly gaps?: readonly string[] }
export type LevelTable = { readonly id: string; readonly rows: readonly LevelRow[] }
export function packLevels(): Readonly<Record<string, LevelTable>> {
  const raw = (UNIT_PACK as unknown as { levels?: Readonly<Record<string, LevelTable>> }).levels ?? {}
  for (const [k, t] of Object.entries(raw)) {
    // class.* tables, and since progression.level-table-by-type (2026-09-03)
    // the civilian TYPE tables (civilian.farmer) a hero names with levelTable
    if (k !== t.id || !(k.startsWith('class.') || k.startsWith('civilian.'))) throw new Error(`levels: bad key '${k}' — a level table is class.* or civilian.*`)
    let last = 0
    for (const r of t.rows) { if (r.level <= last) throw new Error(`levels: '${k}' rows are not ascending at ${r.level}`); last = r.level }
  }
  return raw
}

/**
 * The badge registry — badge.mechanism (2026-09-04). The Codex's badge rows,
 * compiled by content/mkenginepack.mjs from their prose payloads: stat
 * modifiers, granted actions, flags, and every clause the converter could not
 * express named in `gaps`. Validated loudly: every modifier a number on a stat
 * the engine folds, every flag a known one, every trigger well-formed with the
 * badge as its source.
 */
const BADGE_STATS = ['maxHp', 'armor', 'resist', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen', 'crit', 'luck', 'toughness', 'surge', 'vision']
const BADGE_FLAGS = ['bleedsOut', 'wounded', 'blocksDeployment']
function validateBadges(raw: Readonly<Record<string, BadgeDef>>, where: string, family: (k: string) => boolean): Readonly<Record<string, BadgeDef>> {
  for (const [k, b] of Object.entries(raw)) {
    if (k !== b.id) throw new Error(`${where}: badge key '${k}' names id '${b.id}'`)
    if (!family(k)) throw new Error(`${where}: '${k}' is not in this registry's id family`)
    for (const [st, v] of Object.entries(b.statModifiers ?? {})) if (!BADGE_STATS.includes(st) || typeof v !== 'number') throw new Error(`${where}: badge '${k}' modifies '${st}' — not an engine stat`)
    for (const f of Object.keys(b.flags ?? {})) if (!BADGE_FLAGS.includes(f)) throw new Error(`${where}: badge '${k}' carries unknown flag '${f}'`)
    if (!Array.isArray(b.grants)) throw new Error(`${where}: badge '${k}' has no grants list — regenerate the pack`)
    for (const t of b.triggers ?? []) { validateTrigger(t); if (t.source !== k) throw new Error(`${where}: badge '${k}' trigger '${t.id}' names source '${t.source}'`) }
  }
  return raw
}
export function packBadges(): Readonly<Record<string, BadgeDef>> {
  const raw = (UNIT_PACK as unknown as { badges?: Readonly<Record<string, BadgeDef>> }).badges ?? {}
  return validateBadges(raw, 'badge pack', (k) => k.startsWith('badge.'))
}
export function packTestBadges(): Readonly<Record<string, BadgeDef>> {
  const raw = (UNIT_PACK as unknown as { test?: { badges?: Readonly<Record<string, BadgeDef>> } }).test?.badges ?? {}
  return validateBadges(raw, 'test receptacle', (k) => k.startsWith('test.badge.'))
}

/** The enchanted tier-3 rows — ITEMS-PLAN.md §6: generated, base + enchant, never hand-edited. Validated like items. */
export function packEnchanted(attacks: Readonly<Record<string, AttackDef>>, abilities: Readonly<Record<string, AbilityDef>>): Readonly<Record<string, ItemDef>> {
  const raw = (UNIT_PACK as unknown as { enchanted?: Readonly<Record<string, ItemDef & { base: string; enchant: string }>> }).enchanted ?? {}
  const STATS = ['maxHp', 'armor', 'resist', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'reach', 'accuracy', 'movement', 'maxStamina', 'staminaRegen', 'crit', 'luck', 'toughness', 'surge', 'vision']
  for (const [k, it] of Object.entries(raw)) {
    if (k !== it.id || !k.startsWith('item.')) throw new Error(`enchanted: bad key '${k}'`)
    if (typeof it.base !== 'string' || typeof it.enchant !== 'string') throw new Error(`enchanted: '${k}' does not name its base and enchant`)
    for (const [s, v] of Object.entries(it.statModifiers)) {
      if (!STATS.includes(s) || typeof v !== 'number') throw new Error(`enchanted: '${k}' modifies '${s}' — not an engine stat`)
    }
    for (const a of it.grants) if (!attacks[a]) throw new Error(`enchanted: '${k}' grants '${a}', not a pack attack`)
    for (const a of it.abilities) if (!abilities[a]) throw new Error(`enchanted: '${k}' grants power '${a}', not a pack ability`)
    for (const t of it.triggers) { validateTrigger(t); if (t.source !== k && t.source !== it.base) throw new Error(`enchanted: '${k}' carries a trigger sourced '${t.source}'`) }
  }
  return raw
}

/** The encounters — encounter.runner (2026-09-03). Validated loudly: every unit named must be in the pack. */
export function packEncounters(units: Readonly<Record<string, UnitDef>>, rows?: Readonly<Record<string, EncounterDef>>): Readonly<Record<string, EncounterDef>> {
  const raw = rows ?? (UNIT_PACK as unknown as { encounters?: Readonly<Record<string, EncounterDef>> }).encounters ?? {}
  for (const [k, e] of Object.entries(raw)) {
    if (k !== e.id) throw new Error(`encounters: key '${k}' names id '${e.id}'`)
    const check = (p: { unit: string }, where: string) => { if (!units[p.unit]) throw new Error(`encounters: '${k}' ${where} names '${p.unit}', which is not a unit in the pack`) }
    for (const p of e.setup) check(p, 'setup')
    for (const r of e.schedule) { if (r.phase === undefined && r.enemyPhase === undefined) throw new Error(`encounters: '${k}' has a schedule row with no phase`); for (const p of r.spawn) check(p, 'schedule') }
    // encounter.band-axis (2026-09-04, FINDING 43): the band's start must match its axis — the engine used to read NaN in silence
    if (e.band) {
      const axis = e.band.axis ?? 'row'
      const start = axis === 'col' ? e.band.startCol : e.band.startRow
      if (typeof start !== 'number') throw new Error(`encounters: '${k}' band walks ${axis}s but has no numeric start${axis === 'col' ? 'Col' : 'Row'} — regenerate the pack`)
    }
  }
  return raw
}

/**
 * The maps — content.maps-as-rows, engine half (content.pack-maps, 2026-09-04;
 * PROVING-PLAN Stage A2; session 9's E1). Content owns every shipping map as a
 * row in `gen/maps.json`: `id`, `name`, `board`, `format`, `rows`, and an
 * optional `deploy`. Validated loudly here — key = id, rectangular, the board
 * the rows draw is the board the row claims, and that board is one of the four
 * ruled formats — so `boardOf` never meets a map that lies about its size.
 * Glyphs are checked where the legend lives (maps.ts terrainOf). Order is the
 * pack's, which is the generator's fixed order (Law 6).
 */
export type PackMapRow = {
  readonly id: string; readonly name: string; readonly rows: readonly string[]
  readonly board?: { readonly width: number; readonly height: number }; readonly format?: string
  readonly deploy?: { readonly hero: 'north' | 'south' | 'east' | 'west'; readonly enemy: 'north' | 'south' | 'east' | 'west' }
  readonly note?: string
}
export function packMaps(): readonly PackMapRow[] {
  const raw = (UNIT_PACK as unknown as { maps?: Readonly<Record<string, PackMapRow>> }).maps ?? {}
  const out: PackMapRow[] = []
  for (const [k, m] of Object.entries(raw)) {
    if (k !== m.id) throw new Error(`maps: key '${k}' names id '${m.id}'`)
    if (!Array.isArray(m.rows) || m.rows.length === 0) throw new Error(`maps: '${k}' has no rows`)
    const height = m.rows.length, width = m.rows[0]!.length
    for (const row of m.rows) if (row.length !== width) throw new Error(`maps: '${k}' has a row of ${row.length} in a board ${width} wide — not rectangular`)
    const fmt = formatOf({ width, height })
    if (!fmt) throw new Error(`maps: '${k}' draws ${width}×${height}, none of the four formats`)
    if (m.board && (m.board.width !== width || m.board.height !== height)) throw new Error(`maps: '${k}' claims ${m.board.width}×${m.board.height} but draws ${width}×${height}`)
    if (m.format && m.format !== fmt) throw new Error(`maps: '${k}' claims format '${m.format}' but draws '${fmt}'`)
    if (m.deploy && m.deploy.hero === m.deploy.enemy) throw new Error(`maps: '${k}' deploys both sides on its ${m.deploy.hero} edge`)
    out.push(m)
  }
  return out
}
