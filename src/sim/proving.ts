// THE PROVING — proving.rig (2026-09-04). PROVING-PLAN.md §3.
//
// Ruled 2026-09-03 (Angela, DECISIONS.md "the Proving"): every unit and every
// item gets a raw power ranking by how often it MOVES THE NEEDLE — "It's not
// based on how much damage they do; it's based on how much they move the
// needle in a fight." Flip rate first. Five pairs — one seed, five maps — is a
// ranking. Baselines are plural and content-owned. Items only on classes that
// can wield them, hero-side only. Mirror matches in scope.
//
// The rig runs a PLAN: squads, fixtures (a squad against a squad), subjects
// (a row entering a fixture by a rotation), matchups (two squads, no rotation).
// For each subject and each map it fights the fixture twice on the same seed —
// WITH the subject in and WITHOUT — and records both outcomes. Law 4 keys
// every roll by what it is, so the two arms share every die until the subject
// itself diverges them; that is what makes "did it change the result" honest.
//
// Nothing here decides anything. It fields, runs, measures, writes. Balance is
// a content session's call with the numbers as evidence.

import { createBattle, type BattleOptions } from '../core/setup.js'
import { runBattle } from '../core/battle.js'
import type { Config, Ctx, HeroProgress, Outcome, Side } from '../core/types.js'
import { boardOf, deployOf } from '../content/maps.js'
import { ACTED } from './acted.js'

// ── the plan ─────────────────────────────────────────────────────────────────

/** One seat in a squad: the row, and what it carries — items ASSIGNED (ruled 2026-09-04: never a default kit), badges, progress. */
export type Seat = { readonly unit: string; readonly items?: readonly string[]; readonly badges?: readonly string[]; readonly progress?: HeroProgress }
export type Squad = readonly (string | Seat)[]

export type Fixture = {
  readonly id: string
  readonly hero: string          // squad id
  readonly enemy: string         // squad id
  /** proving.side-override: `byList` for a mirror match (a squad of enemy rows on the hero side). */
  readonly sides?: 'byRow' | 'byList'
}

export type Rotation = 'replace' | 'add' | 'equip' | 'grow'

export type Subject = {
  /** The id being ranked: a unit for replace/add, an item for equip, a label for grow. */
  readonly id: string
  readonly fixture: string
  readonly rotation: Rotation
  readonly side: Side
  /** The seat the subject takes / equips / grows — 0-based into the squad. Required for replace, equip, grow. */
  readonly slot?: number
  /**
   * proving.plan-shape (2026-09-04, session 9's E5): what a replace/add subject
   * CARRIES into its seat — its own kit, ASSIGNED (a subject with no `items`
   * fields bare; the seat's old kit never rides along — a warrior fought in the
   * mage's kit before this). Hero side only, like a seat's.
   */
  readonly items?: readonly string[]
  readonly badges?: readonly string[]
  /** grow: the state the seat is grown to. replace/add: the state the subject enters at. */
  readonly progress?: HeroProgress
  /** Override the plan's pair count for this subject. */
  readonly pairs?: number
}

/** `gap` — proving.plan-shape (session 9's E6): the two deployment lines this many hexes apart, symmetric about the middle (BattleOptions.deployGap). */
export type Matchup = { readonly id: string; readonly hero: string; readonly enemy: string; readonly sides?: 'byRow' | 'byList'; readonly gap?: number; readonly pairs?: number }

export type Plan = {
  readonly id: string
  /** The maps, in order. Five is the ruling; the plan may name any number ≥ 1. */
  readonly maps: readonly string[]
  /** The one seed (a replicate number). Pairs beyond the map count reuse the maps with seed+1, seed+2 … */
  readonly seed: number
  /**
   * proving.plan-shape: the SWITCHES this plan runs under (Config.switches) — the
   * plan says what it measures. `proving.initiative` names
   * `mirrorSideRules: 'row'` (ruled 2026-09-04: enemies against enemies, the
   * hero-side rules out of the number). Absent = the engine's defaults.
   */
  readonly switches?: Partial<Config['switches']>
  readonly squads: Readonly<Record<string, Squad>>
  readonly fixtures: readonly Fixture[]
  readonly subjects: readonly Subject[]
  readonly matchups?: readonly Matchup[]
}

// ── one battle, measured ─────────────────────────────────────────────────────

export type Arm = {
  readonly outcome: Outcome | 'invalid'
  readonly turns: number
  /** Σ hp / Σ maxHp of the side, in permille — integers only (Law 7). */
  readonly heroPermille: number
  readonly enemyPermille: number
  /** heroPermille − enemyPermille: positive favours the heroes. */
  readonly margin: number
  readonly error?: string
}

/** Surviving strength of a side, in permille of its max — downed units count their bar (they can be saved), the dead count nothing. */
export function permilleOf(ctx: Ctx, side: Side): number {
  let hp = 0, max = 0
  for (const u of ctx.state.units) {
    if (u.side !== side) continue
    max += u.maxHp
    if (u.lifeState !== 'dead') hp += u.hp
  }
  return max === 0 ? 0 : Math.floor((1000 * hp) / max)
}

export function measure(opts: BattleOptions): { arm: Arm; ctx: Ctx | null } {
  try {
    const ctx = createBattle(opts)
    const res = runBattle(ctx)
    const heroPermille = permilleOf(ctx, 'hero'), enemyPermille = permilleOf(ctx, 'enemy')
    return { arm: { outcome: res.outcome, turns: res.turns, heroPermille, enemyPermille, margin: heroPermille - enemyPermille }, ctx }
  } catch (e) {
    // Law 9: a fielding that cannot be made is recorded as invalid with its reason — never a zero, never skipped
    return { arm: { outcome: 'invalid', turns: 0, heroPermille: 0, enemyPermille: 0, margin: 0, error: e instanceof Error ? e.message : String(e) }, ctx: null }
  }
}

// ── the arms of a subject ────────────────────────────────────────────────────

const seatOf = (s: string | Seat): Seat => (typeof s === 'string' ? { unit: s } : s)

/** A seat carries something only a hero-side fielding can take (items, badges, progress). */
const carries = (s: Seat | Subject): boolean => Boolean(s.items?.length || s.badges?.length || s.progress)

/** The fielding of a squad pair with no rotation — the WITHOUT arm, and a matchup. */
export function fielding(plan: Plan, fx: { hero: string; enemy: string; sides?: 'byRow' | 'byList'; gap?: number }, mapId: string, replicate: number): BattleOptions {
  const heroes = (plan.squads[fx.hero] ?? []).map(seatOf)
  const enemies = (plan.squads[fx.enemy] ?? []).map(seatOf)
  if (!plan.squads[fx.hero]) throw new Error(`plan ${plan.id}: no squad '${fx.hero}'`)
  if (!plan.squads[fx.enemy]) throw new Error(`plan ${plan.id}: no squad '${fx.enemy}'`)
  // proving.plan-shape (session 9's E3): an enemy-side seat used to drop its kit in
  // silence — a kitted hero squad on the east side fought bare. Refused loudly for
  // pass one (the engine hands items to heroes only); validatePlan says the same.
  for (const s of enemies) if (carries(s)) throw new Error(`plan ${plan.id}: squad '${fx.enemy}' seat ${s.unit} carries items/badges/progress on the ENEMY side — the fielding hands those to the hero side only (pass one)`)
  return {
    replicate, mapId, strict: true,
    heroes: heroes.map((s) => s.unit), enemies: enemies.map((s) => s.unit), enemyCount: enemies.length,
    heroItems: heroes.map((s) => [...(s.items ?? [])]),
    heroBadges: heroes.map((s) => [...(s.badges ?? [])]),
    heroProgress: heroes.map((s) => s.progress),
    ...(fx.sides ? { sides: fx.sides } : {}),
    ...(fx.gap !== undefined ? { deployGap: fx.gap } : {}),
    ...(plan.switches ? { cfg: { switches: { ...plan.switches } as Config['switches'] } } : {}),
  }
}

/** The WITH arm: the subject enters the fixture by its rotation. */
export function withSubject(plan: Plan, sub: Subject, base: BattleOptions): BattleOptions {
  const listKey = sub.side === 'hero' ? 'heroes' : 'enemies'
  const list = [...(base[listKey] as readonly string[])]
  const k = sub.slot ?? -1
  const need = (what: string) => { if (k < 0 || k >= list.length) throw new Error(`plan ${plan.id}: subject ${sub.id} (${sub.rotation}) needs a slot 0..${list.length - 1}${what}`) }
  switch (sub.rotation) {
    case 'replace': {
      need('')
      list[k] = sub.id
      if (sub.side === 'enemy') {
        if (carries(sub)) throw new Error(`plan ${plan.id}: subject ${sub.id} carries items/badges/progress onto the ENEMY side — hero side only (pass one)`)
        return { ...base, [listKey]: list, enemyCount: list.length }
      }
      // E5: the subject's OWN kit rides into the seat; the seat's old kit does not
      const items = (base.heroItems ?? []).map((l) => [...(l ?? [])]); items[k] = [...(sub.items ?? [])]
      const badges = (base.heroBadges ?? []).map((l) => [...(l ?? [])]); badges[k] = [...(sub.badges ?? [])]
      const progress = [...(base.heroProgress ?? [])]; progress[k] = sub.progress
      return { ...base, [listKey]: list, heroItems: items, heroBadges: badges, heroProgress: progress }
    }
    case 'add': {
      list.push(sub.id)
      const out: BattleOptions = { ...base, [listKey]: list }
      if (sub.side === 'hero') {
        return { ...out, heroItems: [...(base.heroItems ?? []), [...(sub.items ?? [])]], heroBadges: [...(base.heroBadges ?? []), [...(sub.badges ?? [])]], heroProgress: [...(base.heroProgress ?? []), sub.progress] }
      }
      if (carries(sub)) throw new Error(`plan ${plan.id}: subject ${sub.id} carries items/badges/progress onto the ENEMY side — hero side only (pass one)`)
      return { ...out, enemyCount: list.length }
    }
    case 'equip': {
      need(' — the seat that wears the item')
      if (sub.side !== 'hero') throw new Error(`plan ${plan.id}: subject ${sub.id} equips an enemy — ruled 2026-09-04: enemies are not equippable`)
      const items = (base.heroItems ?? []).map((l) => [...(l ?? [])])
      items[k] = [...(items[k] ?? []), sub.id]
      return { ...base, heroItems: items }
    }
    case 'grow': {
      need(' — the seat that grows')
      if (!sub.progress) throw new Error(`plan ${plan.id}: subject ${sub.id} grows but names no progress`)
      const progress = [...(base.heroProgress ?? [])]
      progress[k] = sub.progress
      return { ...base, heroProgress: progress }
    }
  }
}

/** Which fielded unit IS the subject in the WITH arm — for presence. */
function subjectUnitId(sub: Subject, opts: BattleOptions): number | null {
  const heroes = opts.heroes ?? []
  if (sub.rotation === 'add') return sub.side === 'hero' ? heroes.length - 1 : heroes.length + (opts.enemies?.length ?? 0) - 1
  const k = sub.slot ?? 0
  return sub.side === 'hero' ? k : heroes.length + k
}

// ── a pair, and a subject's pairs ───────────────────────────────────────────

export type Pair = {
  readonly map: string
  readonly seed: number
  readonly with: Arm
  readonly without: Arm
  /** the outcome changed */
  readonly flipped: boolean
  readonly marginShift: number
  readonly tempoShift: number
  /** state-changing lines by the subject's unit in the WITH arm (ACTED) — the subject did something */
  readonly presence: number
}

export type SubjectResult = {
  readonly plan: string
  readonly subject: Subject
  readonly stamp: string
  readonly pairs: readonly Pair[]
  readonly summary: Summary
}

export type Summary = {
  readonly pairs: number
  readonly valid: number
  readonly invalid: number
  readonly flips: number
  /** flips / valid, in permille — the POWER SCORE (ruled: flip rate first) */
  readonly flipRatePermille: number
  /** mean margin shift, from the HEROES' side: positive = the heroes ended stronger */
  readonly marginShiftMean: number
  /** the same shift from the SUBJECT's side — an enemy subject that hurt the heroes swings positive. The tiebreaker after flip rate. */
  readonly swing: number
  readonly tempoShiftMean: number
  readonly presence: number
}

export function summarize(pairs: readonly Pair[], side: Side = 'hero'): Summary {
  const valid = pairs.filter((p) => p.with.outcome !== 'invalid' && p.without.outcome !== 'invalid')
  const flips = valid.filter((p) => p.flipped).length
  const mean = (f: (p: Pair) => number) => (valid.length ? Math.round(valid.reduce((s, p) => s + f(p), 0) / valid.length) : 0)
  return {
    pairs: pairs.length, valid: valid.length, invalid: pairs.length - valid.length, flips,
    flipRatePermille: valid.length ? Math.floor((1000 * flips) / valid.length) : 0,
    marginShiftMean: mean((p) => p.marginShift), swing: (side === 'hero' ? 1 : -1) * mean((p) => p.marginShift), tempoShiftMean: mean((p) => p.tempoShift),
    presence: valid.reduce((s, p) => s + p.presence, 0),
  }
}

/** The (map, seed) list a subject fights: the plan's maps at the plan's seed; more pairs cycle the maps at seed+1, seed+2 … */
export function pairsOf(plan: Plan, pairs: number): { map: string; seed: number }[] {
  const out: { map: string; seed: number }[] = []
  for (let i = 0; i < pairs; i++) out.push({ map: plan.maps[i % plan.maps.length]!, seed: plan.seed + Math.floor(i / plan.maps.length) })
  return out
}

export function runSubject(plan: Plan, sub: Subject, stamp: string): SubjectResult {
  const fx = plan.fixtures.find((f) => f.id === sub.fixture)
  if (!fx) throw new Error(`plan ${plan.id}: subject ${sub.id} names fixture '${sub.fixture}', which the plan does not have`)
  const pairs: Pair[] = []
  for (const { map, seed } of pairsOf(plan, sub.pairs ?? plan.maps.length)) {
    const base = fielding(plan, fx, map, seed)
    const without = measure(base)
    let withOpts: BattleOptions | null = null
    let withArm: Arm
    let presence = 0
    try {
      withOpts = withSubject(plan, sub, base)
      const w = measure(withOpts)
      withArm = w.arm
      // presence: the subject's own state-changing lines in the WITH arm (ACTED — Law 3's events)
      const uid = subjectUnitId(sub, withOpts)
      if (w.ctx && uid !== null) for (const e of w.ctx.events) if (e.actor === uid && ACTED.has(e.type)) presence++
    } catch (e) {
      withArm = { outcome: 'invalid', turns: 0, heroPermille: 0, enemyPermille: 0, margin: 0, error: e instanceof Error ? e.message : String(e) }
    }
    const valid = withArm.outcome !== 'invalid' && without.arm.outcome !== 'invalid'
    pairs.push({
      map, seed, with: withArm, without: without.arm,
      flipped: valid && withArm.outcome !== without.arm.outcome,
      marginShift: valid ? withArm.margin - without.arm.margin : 0,
      tempoShift: valid ? withArm.turns - without.arm.turns : 0,
      presence,
    })
  }
  return { plan: plan.id, subject: sub, stamp, pairs, summary: summarize(pairs, sub.side) }
}

// ── matchups: two squads, no rotation ───────────────────────────────────────

export type MatchupResult = { readonly plan: string; readonly matchup: Matchup; readonly stamp: string; readonly battles: readonly ({ map: string; seed: number } & Arm)[]; readonly heroWins: number; readonly enemyWins: number; readonly other: number; readonly invalid: number; readonly marginMean: number; readonly turnsMean: number }

export function runMatchup(plan: Plan, m: Matchup, stamp: string): MatchupResult {
  const battles: ({ map: string; seed: number } & Arm)[] = []
  for (const { map, seed } of pairsOf(plan, m.pairs ?? plan.maps.length)) {
    // proving.plan-shape (session 9's E2): a fielding the plan cannot make is INVALID with its reason on the battle — never a 0·0 draw
    let opts: BattleOptions
    try { opts = fielding(plan, m, map, seed) } catch (e) { battles.push({ map, seed, outcome: 'invalid', turns: 0, heroPermille: 0, enemyPermille: 0, margin: 0, error: e instanceof Error ? e.message : String(e) }); continue }
    battles.push({ map, seed, ...measure(opts).arm })
  }
  const valid = battles.filter((b) => b.outcome !== 'invalid')
  const heroWins = valid.filter((b) => b.outcome === 'heroClear' || b.outcome === 'objectiveMet').length
  const enemyWins = valid.filter((b) => b.outcome === 'wipe' || b.outcome === 'objectiveFailed').length
  const mean = (f: (b: Arm) => number) => (valid.length ? Math.round(valid.reduce((s, b) => s + f(b), 0) / valid.length) : 0)
  return { plan: plan.id, matchup: m, stamp, battles, heroWins, enemyWins, other: valid.length - heroWins - enemyWins, invalid: battles.length - valid.length, marginMean: mean((b) => b.margin), turnsMean: mean((b) => b.turns) }
}

// ── the plan, validated ──────────────────────────────────────────────────────

export function validatePlan(plan: Plan): void {
  const where = `plan '${plan.id}'`
  if (!plan.id || !/^proving\.[a-z0-9-]+$/.test(plan.id)) throw new Error(`${where}: id must be proving.<name>`)
  if (!plan.maps?.length) throw new Error(`${where}: names no maps (the ruling is five)`)
  if (!Number.isInteger(plan.seed)) throw new Error(`${where}: seed must be an integer`)
  const ids = new Set<string>()
  for (const f of plan.fixtures) {
    if (ids.has(f.id)) throw new Error(`${where}: fixture '${f.id}' twice`); ids.add(f.id)
    for (const sq of [f.hero, f.enemy]) if (!plan.squads[sq]) throw new Error(`${where}: fixture '${f.id}' names squad '${sq}', which the plan does not have`)
  }
  const subs = new Set<string>()
  for (const s of plan.subjects) {
    const key = `${s.id}@${s.fixture}/${s.rotation}/${s.side}/${s.slot ?? '-'}`
    if (subs.has(key)) throw new Error(`${where}: subject ${key} twice`); subs.add(key)
    if (!ids.has(s.fixture)) throw new Error(`${where}: subject '${s.id}' names fixture '${s.fixture}', which the plan does not have`)
    if (!['replace', 'add', 'equip', 'grow'].includes(s.rotation)) throw new Error(`${where}: subject '${s.id}' has rotation '${String(s.rotation)}'`)
    if (s.rotation !== 'add' && s.slot === undefined) throw new Error(`${where}: subject '${s.id}' (${s.rotation}) names no slot`)
    if (s.rotation === 'grow' && !s.progress) throw new Error(`${where}: subject '${s.id}' grows but names no progress`)
    if (s.rotation === 'equip' && s.side === 'enemy') throw new Error(`${where}: subject '${s.id}' equips an enemy — enemies are not equippable (ruled 2026-09-04)`)
    if (s.side === 'enemy' && (s.rotation === 'replace' || s.rotation === 'add') && carries(s)) throw new Error(`${where}: subject '${s.id}' carries items/badges/progress onto the ENEMY side — the fielding hands those to the hero side only (pass one)`)
  }
  // E3: a seat on the enemy side of any fixture or matchup may not carry a kit (pass one)
  const enemySquads = new Set([...plan.fixtures.map((f) => f.enemy), ...(plan.matchups ?? []).map((m) => m.enemy)])
  for (const sq of enemySquads) for (const s of (plan.squads[sq] ?? []).map(seatOf)) if (carries(s)) throw new Error(`${where}: squad '${sq}' is fielded on the ENEMY side and its seat ${s.unit} carries items/badges/progress — hero side only (pass one)`)
  for (const m of plan.matchups ?? []) {
    for (const sq of [m.hero, m.enemy]) if (!plan.squads[sq]) throw new Error(`${where}: matchup '${m.id}' names squad '${sq}', which the plan does not have`)
    // E6: a gap every plan map can hold
    if (m.gap !== undefined) {
      if (!Number.isInteger(m.gap) || m.gap < 1) throw new Error(`${where}: matchup '${m.id}' names gap ${m.gap} — an integer ≥ 1`)
      for (const map of plan.maps) {
        const b = boardOf(map), d = deployOf(map)
        const extent = d.hero === 'west' || d.hero === 'east' ? b.width : b.height
        if (m.gap > extent - 1) throw new Error(`${where}: matchup '${m.id}' names gap ${m.gap}, which map '${map}' (${b.width}×${b.height}) cannot hold — at most ${extent - 1}`)
      }
    }
  }
}

export function runPlan(plan: Plan, stamp: string): { subjects: SubjectResult[]; matchups: MatchupResult[] } {
  validatePlan(plan)
  const subjects = plan.subjects.map((s) => runSubject(plan, s, stamp))
  const matchups = (plan.matchups ?? []).map((m) => runMatchup(plan, m, stamp))
  return { subjects, matchups }
}
