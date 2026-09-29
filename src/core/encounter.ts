// The encounter runner — encounter.runner (2026-09-03), P11 approved as written.
//
// An encounter is DATA (Design Law 9): who is on the board at phase 1, what
// arrives when, and how the battle is won or lost beyond a cleared board.
// This module does three things and nothing else:
//
//   placeSetup      fields the encounter's own units at battle creation
//                   (enemies, and civilians as hero-side rows)
//   fireSchedule    at Start of Turn N (`phase: N`) and as the enemy phase of
//                   Turn N begins (`enemyPhase: N`), the row's spawns ARRIVE:
//                   a fresh unit, unit.enter, its startOfBattle, settle
//   startOfTurn     the schedule, then the objective check — survive-to wins
//                   (objectiveMet), the loss timer and a dead objective
//                   civilian lose (objectiveFailed)
//
// Phases are TURNS: COMBAT-SEQUENCE, "the wave schedule currently calls a
// full round a 'phase'". Angela, 2026-09-03: "Enemies spawn first. Then
// heroes spawn and heroes act." Two units authored onto one hex: the later is
// shunted to the nearest free passable hex, ties by lower hex id (Law 6), and
// `unit.shunted` names the cause. A spawn with nowhere to stand within the
// board is a loud error, never a dropped wave.

import type { Ctx, EncounterDef, EncounterPlacement, Unit, UnitDef } from './types.js'
import type { HexId } from './hex.js'
import { arrivalUid } from './identity.js'
import { applyBadges } from './items.js'
import { applyDamage, bindAiRule, emit, gainPower, paintLayer, placeCorpse, setOutcome } from './mutate.js'
import { applyStatus, incomingAbsorb, spendAbsorb } from './status.js'
import { flatDamage } from './mitigation.js'
import { fallNight } from './vision.js'
import { draw, rollBelow } from './rng.js'
import { settle } from './settle.js'
import { HOOKS, fireTriggers } from './trigger.js'
import { makeUnit } from './setup.js'
import { IMPASSABLE, layerOfId, moveCostOf, takesEntry } from '../content/maps.js'
import { paintGround } from './ground.js'
import { rulesSideOf } from './side.js'
import { passableHexes } from './props.js'

function free(ctx: Ctx, hex: HexId, passable: (hex: number) => boolean): boolean {
  if (!passable(hex)) return false
  return !ctx.state.units.some((u) => u.lifeState !== 'dead' && u.hex === hex)
}

/** The nearest free passable hex to `want`, by distance then hex id (Law 6). */
function nearestFree(ctx: Ctx, want: HexId): HexId | null {
  const passable = passableHexes(ctx)
  if (free(ctx, want, passable)) return want
  let best: HexId | null = null, bestD = Infinity
  for (let h = 0; h < ctx.geo.hexCount; h++) {
    if (!free(ctx, h, passable)) continue
    const d = ctx.geo.distance(want, h)
    if (d < bestD || (d === bestD && best !== null && h < best)) { bestD = d; best = h }
  }
  return best
}

/** Every hex a placement asks for, one per unit, in authored order. `key` = [row, spawn] for a rolled either/or. */
export function hexesOf(ctx: Ctx, p: EncounterPlacement, where: string, key: readonly [number, number] = [0, 0]): HexId[] {
  const n = p.count ?? 1
  const check = (c: number, r: number) => {
    if (!ctx.geo.inBounds(c, r)) throw new Error(`${where}: ${p.unit} placed off the board at (${c},${r})`)
    return ctx.geo.hexId(c, r)
  }
  if (p.hexes) {
    if (p.hexes.length !== n) throw new Error(`${where}: ${p.unit} count ${n} but ${p.hexes.length} hexes`)
    return p.hexes.map((h) => check(h.col, h.row))
  }
  if (p.at && 'near' in p.at) {
    // deploy within N of a hex: the ring, nearest first, lowest id first —
    // deterministic, no cup (Law 4 has nothing to key a deployment roll on yet)
    const c = check(p.at.near.col, p.at.near.row)
    const ring: HexId[] = []
    for (let h = 0; h < ctx.geo.hexCount; h++) if (ctx.geo.distance(c, h) <= p.at.range) ring.push(h)
    ring.sort((a, b) => ctx.geo.distance(c, a) - ctx.geo.distance(c, b) || a - b)
    return ring.slice(0, n)
  }
  if (p.at && 'oneOf' in p.at) {
    const opts = p.at.oneOf.map((h) => check(h.col, h.row))
    // the scripted either/or: one draw per placement, keyed by what it is
    const pick = opts[rollBelow(ctx.rng, opts.length, 'wave', key[0], key[1])]!
    emit(ctx, 'encounter.roll', where, { oneOf: opts, chose: pick, unit: p.unit })
    return Array.from({ length: n }, () => pick)
  }
  if (p.at) return Array.from({ length: n }, () => check((p.at as { col: number; row: number }).col, (p.at as { col: number; row: number }).row))
  throw new Error(`${where}: ${p.unit} has no placement (at / hexes)`)
}

/** Field one unit at (or shunted from) a hex. Returns the unit. */
export function arrive(ctx: Ctx, def: UnitDef, want: HexId, causeId: string, names: Record<string, number>): Unit {
  const hex = nearestFree(ctx, want)
  if (hex === null) throw new Error(`${causeId}: no free hex anywhere for ${def.typeId} — the board is full`)
  const id = ctx.state.units.length
  names[def.typeId] = (names[def.typeId] ?? 0) + 1
  const label = def.typeId.split('.').pop()!.split('-').map((w) => (w[0] ?? '').toUpperCase() + w.slice(1)).join(' ')
  // Sparse caller identities and dead units remain reserved. Read state, not
  // a process counter, so restoring a battle cannot reuse an identity.
  const uid = arrivalUid(ctx.state)
  // badge.mechanism: a row's own badges fold on arrival as at fielding
  const folded = def.badges?.length ? applyBadges(def, def.badges, ctx.badges, causeId).def : def
  const u = makeUnit(id, uid, `${def.name ?? label} ${names[def.typeId]}`, folded, hex)
  ctx.state.units.push(u)
  emit(ctx, 'unit.enter', def.typeId.includes('.') ? def.typeId : `unit.${def.typeId}`, {
    actor: u.id, uid: u.uid, name: u.name, side: u.side, typeId: u.typeId,
    role: u.role, hex: u.hex, hp: u.hp, maxHp: u.maxHp,
    stamina: u.stamina, maxStamina: u.maxStamina, terrain: ctx.state.terrain[u.hex], arrived: causeId,
  })
  if (hex !== want) emit(ctx, 'unit.shunted', causeId, { actor: u.id, wanted: want, hex, wantedCol: ctx.geo.colOf(want), wantedRow: ctx.geo.rowOf(want) })
  // one-time on arrival — capability.power-pool: "a unit adds X when it enters, and the X stays after it dies"
  if (def.powerOnArrival && rulesSideOf(ctx, u) === 'enemy') gainPower(ctx, def.powerOnArrival, def.typeId, { kind: 'arrival', actor: u.id })
  return u
}

function defOf(ctx: Ctx, typeId: string, where: string): UnitDef {
  const d = ctx.units?.[typeId]
  if (!d) throw new Error(`${where}: '${typeId}' is not a unit in the registry`)
  return d
}

/**
 * ai.encounter-rules (AI-DESIGN.md §4): the encounter's AI rules bind the units
 * it fields as they arrive — a rule naming `units` binds those types; a rule
 * naming none binds every enemy-side unit the encounter fields. In the row's
 * order (Law 6). An encounter with no rules binds nothing and logs nothing.
 */
function bindAiRules(ctx: Ctx, enc: EncounterDef, u: Unit): void {
  for (const rule of enc.aiRules ?? []) {
    if (rule.units ? rule.units.includes(u.typeId) : u.side === 'enemy') bindAiRule(ctx, u.id, rule)
  }
}

/** Setup: the encounter's own units at phase 1. Called by createBattle after the heroes are placed. */
export function placeSetup(ctx: Ctx, enc: EncounterDef, names: Record<string, number>): void {
  const st = ctx.state.encounter ?? (ctx.state.encounter = { id: enc.id, fired: [], objectives: [] })
  // the external pool — capability.power-pool: "the battle starts with N"
  for (const ps of enc.powerSources ?? []) gainPower(ctx, ps.value, enc.id, { kind: 'external' })
  paintSetup(ctx, enc)
  if (enc.condition === 'darkness') fallNight(ctx, enc.id)   // capability.vision: the board starts dark
  for (const p of enc.setup) {
    const def = defOf(ctx, p.unit, `encounter '${enc.id}' setup`)
    for (const hex of hexesOf(ctx, p, `encounter '${enc.id}' setup`, [-1, enc.setup.indexOf(p)])) {
      const u = arrive(ctx, def, hex, enc.id, names)
      if (p.objective) { st.objectives.push(u.id); emit(ctx, 'encounter.objective', enc.id, { actor: u.id, typeId: u.typeId, kind: 'protect' }) }
      if (p.civilian && enc.civilianAi) { u.aiOverride = { ...enc.civilianAi }; emit(ctx, 'ai.override', enc.id, { actor: u.id, mode: enc.civilianAi.mode, untilTurn: enc.civilianAi.untilTurn }) }
      bindAiRules(ctx, enc, u)
    }
  }
  placeRemains(ctx, enc)
}

/**
 * capability.placed-remains (2026-09-28): the encounter's bodies, laid down after its units (so
 * no unit's identity moves), row by row, hex by hex in authored order. Each takes the next unused
 * uid, as an arrival does. A body on a hex no unit could stand on is a content error (Law 9).
 */
function placeRemains(ctx: Ctx, enc: EncounterDef): void {
  if (!enc.remains?.length) return
  const passable = passableHexes(ctx)
  for (const r of enc.remains) {
    const def = defOf(ctx, r.typeId, `encounter '${enc.id}' remains '${r.id}'`)
    for (const hex of r.hexes) {
      if (!passable(hex) || moveCostOf(ctx.state.terrain[hex] ?? 0) >= IMPASSABLE) throw new Error(`encounter '${enc.id}' remains '${r.id}': hex ${hex} is impassable — a body lies where a unit could stand`)
      placeCorpse(ctx, hex, def.typeId, def.side, arrivalUid(ctx.state), enc.id, r.id)
    }
  }
}

/** The schedule rows due now. `when` = 'phase' at Start of Turn, 'enemyPhase' as the enemy phase begins. */
export function fireSchedule(ctx: Ctx, when: 'phase' | 'enemyPhase'): void {
  const enc = ctx.encounter
  if (!enc) return
  const st = ctx.state.encounter ?? (ctx.state.encounter = { id: enc.id, fired: [], objectives: [] })
  const names: Record<string, number> = {}
  for (const u of ctx.state.units) names[u.typeId] = (names[u.typeId] ?? 0) + 1
  enc.schedule.forEach((row, i) => {
    const due = when === 'phase' ? row.phase : row.enemyPhase
    if (due === undefined || due !== ctx.state.turn || st.fired.includes(i)) return
    st.fired.push(i)
    emit(ctx, 'encounter.wave', enc.id, { row: i, turn: ctx.state.turn, when, units: row.spawn.map((p) => `${p.unit}×${p.count ?? 1}`) })
    const arrived: number[] = []
    row.spawn.forEach((p, j) => {
      const def = defOf(ctx, p.unit, `encounter '${enc.id}' schedule row ${i}`)
      for (const hex of hexesOf(ctx, p, `encounter '${enc.id}' schedule row ${i}`, [i, j])) {
        const u = arrive(ctx, def, hex, enc.id, names)
        bindAiRules(ctx, enc, u)
        arrived.push(u.id)
      }
    })
    // a spawn's battle starts when it arrives (COMBAT-SEQUENCE Start of Turn rung 1)
    for (const id of arrived) fireTriggers(ctx, 'startOfBattle', { ownerId: id, targetId: null, causeId: enc.id, ordinal: 0, keyTag: HOOKS.indexOf('startOfBattle') })
    settle(ctx, enc.id)
  })
}

/** The objective check — the encounter's own win and loss, beyond the cleared board. */
export function checkObjectives(ctx: Ctx, causeId: string): boolean {
  const enc = ctx.encounter
  if (!enc || ctx.state.outcome) return !!ctx.state.outcome
  // an objective civilian is dead: the battle is lost (also checked inside
  // every settle, so a bleed-out death ends the battle where it happens)
  if (objectiveDead(ctx, causeId)) return true
  // the loss timer: after N Turns the battle is lost (heroPhase and phase both count Turns)
  const limit = enc.loseAfter?.phase ?? enc.loseAfter?.heroPhase
  if (limit !== undefined && ctx.state.turn > limit) { emit(ctx, 'encounter.lost', enc.id, { reason: 'time', limit }); setOutcome(ctx, 'objectiveFailed', causeId); return true }
  // survive-to: reaching Turn N alive is the win
  if (enc.win?.surviveTo !== undefined && ctx.state.turn >= enc.win.surviveTo) { emit(ctx, 'encounter.won', enc.id, { reason: 'survived', to: enc.win.surviveTo }); setOutcome(ctx, 'objectiveMet', causeId); return true }
  return false
}

/** Start of Turn: rung 1 the wave schedule, rung 2 the victory check. */
export function startOfTurn(ctx: Ctx): void {
  fireSchedule(ctx, 'phase')
  if (ctx.state.outcome) return
  checkObjectives(ctx, 'turn.begin')
  if (ctx.state.outcome) return
  // fix.start-of-turn-victory: a board decided between phases ends here
  settle(ctx, 'turn.begin')
}

/** The hero deployment hexes an encounter asks for: nearest free to the zone's centre, lowest id first. */
export function heroDeployHexes(ctx: Ctx, enc: EncounterDef, n: number, reserved: ReadonlySet<number> = new Set()): HexId[] | null {
  const passable = passableHexes(ctx)
  if (!enc.heroZone) return null
  const c = ctx.geo.hexId(enc.heroZone.at.near.col, enc.heroZone.at.near.row)
  const ring: HexId[] = []
  for (let h = 0; h < ctx.geo.hexCount; h++) if (ctx.geo.distance(c, h) <= enc.heroZone.at.range && passable(h) && !reserved.has(h)) ring.push(h)
  ring.sort((a, b) => ctx.geo.distance(c, a) - ctx.geo.distance(c, b) || a - b)
  if (ring.length < n) throw new Error(`encounter '${enc.id}': the hero zone holds ${ring.length} hexes, ${n} heroes asked`)
  return ring.slice(0, n)
}

/** A dead objective loses the battle. Called from settle's victory check too — no import cycle, it reads state only. */
export function objectiveDead(ctx: Ctx, causeId: string): boolean {
  const st = ctx.state.encounter
  if (!st || ctx.state.outcome) return false
  for (const id of st.objectives) {
    if (ctx.state.units[id]!.lifeState === 'dead') {
      emit(ctx, 'encounter.lost', st.id, { reason: 'objective dead', actor: id })
      setOutcome(ctx, 'objectiveFailed', causeId)
      return true
    }
  }
  return false
}

/** Setup paint (Rime's frost band) — capability.ground-layers. */
export function paintSetup(ctx: Ctx, enc: EncounterDef): void {
  // through the one paint-with-occupants function (fix.ground-one-funnel, review E3): a hero already
  // standing on a painted hex takes that ground's entry beat, as the band's units do
  for (const p of enc.paint ?? []) paintGround(ctx, p.hexes, layerOfId(p.layer), enc.id)
}
/**
 * The band: as the enemy phase of Turn N ends (N ≥ fromPhase), one LINE —
 * start + (N − fromPhase) × direction along the band's axis — is painted,
 * spare hexes excepted. encounter.band-axis (2026-09-04, FINDING 43): a band
 * walks rows (`startRow`) or columns (`startCol`); the Kiln's fire comes from
 * the east now that the heroes deploy west. A band whose start is not a number
 * is a content error and throws (Law 9) — it used to paint NaN in silence.
 */
export function advanceBand(ctx: Ctx): void {
  const enc = ctx.encounter
  if (!enc?.band || ctx.state.outcome) return
  const b = enc.band
  const n = ctx.state.turn
  if (n < b.fromPhase) return
  const axis = b.axis ?? 'row'
  const start = axis === 'col' ? b.startCol : b.startRow
  if (typeof start !== 'number') throw new Error(`${enc.id}: band walks ${axis}s but names no start${axis === 'col' ? 'Col' : 'Row'}`)
  const line = start + (n - b.fromPhase) * b.direction
  const extent = axis === 'col' ? ctx.geo.board.width : ctx.geo.board.height
  if (line < 0 || line >= extent) return
  const layer = layerOfId(b.layer)
  emit(ctx, 'band.advanced', enc.id, { turn: n, axis, line, ...(axis === 'row' ? { row: line } : { col: line }), layer: b.layer })
  const hexes = axis === 'col' ? ctx.geo.edgeLine('west', line) : ctx.geo.edgeLine('north', line)
  // a unit standing on a freshly painted hex takes the entry beat now — it did not step, the ground
  // came to it: the band's rule, now the one rule every painter shares (core/ground.ts paintGround)
  paintGround(ctx, hexes.filter((hex) => !b.spare?.includes(hex)), layer, enc.id)
  settle(ctx, enc.id)
}

// ── encounter.area-fall (2026-09-28) ─────────────────────────────────────────
// A telegraphed area fall: a terrain event (COMBAT-SEQUENCE.md "Terrain events" — Scatter of
// Disk/Ring radius 1). One mechanism, two rulings (DECISIONS.md 2026-09-28: the Hunt's meteor fall
// and the Gates' curse strikes, "falling like the meteors"). The fall's numbers are its row's.

/**
 * The shape (a pure function of the board, the candidates and the cup): `count` distinct centres,
 * each drawn from what is left with weight maxD + 1 − distance to the middle hex (SWITCHES.md
 * areaFallWeight — linear, integers, Law 7), walked in ascending hex order (Law 6). Returns each
 * area as its centre then its six neighbours in the geometry's order.
 */
export function scatterAreas(ctx: Ctx, candidates: readonly HexId[], count: number, roll: (area: number) => number): HexId[][] {
  const g = ctx.geo
  const middle = g.hexId(Math.floor((g.board.width - 1) / 2), Math.floor((g.board.height - 1) / 2))
  const pool = [...candidates].sort((a, b) => a - b)
  const maxD = pool.reduce((m, h) => Math.max(m, g.distance(h, middle)), 0)
  const weight = (h: HexId) => maxD + 1 - g.distance(h, middle)
  const out: HexId[][] = []
  for (let area = 0; area < count && pool.length; area++) {
    const total = pool.reduce((t, h) => t + weight(h), 0)
    let r = roll(area) % total, i = 0
    while (r >= weight(pool[i]!)) { r -= weight(pool[i]!); i++ }
    const centre = pool.splice(i, 1)[0]!
    out.push([centre, ...g.neighboursOf(centre)])
  }
  return out
}

/** Where a fall's centre may be: a hex a unit can move to, with all six neighbours on the board (SWITCHES.md areaFallCentre). */
export function fallCentres(ctx: Ctx): HexId[] {
  const passable = passableHexes(ctx), out: HexId[] = []
  for (let h = 0; h < ctx.geo.hexCount; h++) {
    const t = ctx.state.terrain[h] ?? 0
    if (!passable(h) || moveCostOf(t) >= IMPASSABLE || takesEntry(t)) continue
    if (ctx.geo.neighboursOf(h).length !== 6) continue
    out.push(h)
  }
  return out
}

/** At the end of Turn N's Enemy Phase (the turn-end step, beside the band): mark every fall whose turn is N. */
export function markFalls(ctx: Ctx): void {
  const enc = ctx.encounter
  if (!enc?.falls?.length || ctx.state.outcome) return
  const n = ctx.state.turn
  enc.falls.forEach((f, index) => {
    if (f.turn !== n) return
    const centres = fallCentres(ctx)
    if (centres.length < f.areas) throw new Error(`${enc.id}: fall '${f.id}' needs ${f.areas} centres and the board has ${centres.length}`)
    // the terrain-event cup, keyed by WHAT is rolled — the fall's place on the row and the area (Law 4)
    const areas = scatterAreas(ctx, centres, f.areas, (area) => draw(ctx.rng, 'terrain-event', index, area))
    const st = ctx.state.encounter ?? (ctx.state.encounter = { id: enc.id, fired: [], objectives: [] })
    ;(st.marked ??= []).push({ fall: f.id, lands: n + 1, areas })
    emit(ctx, 'area.marked', f.id, { fall: f.id, turn: n, lands: n + 1, areas: areas.map((a) => [...a]), layer: f.layer })
  })
}

/** After Turn N's Player Phase ends: every fall marked to land on N lands, in the order it was marked. */
export function landFalls(ctx: Ctx): void {
  const enc = ctx.encounter, st = ctx.state.encounter
  if (!enc || !st?.marked?.length || ctx.state.outcome) return
  const n = ctx.state.turn
  for (const m of st.marked.filter((x) => x.lands === n)) {
    const f = enc.falls?.find((x) => x.id === m.fall)
    if (!f) throw new Error(`${enc.id}: a marked fall '${m.fall}' is not on the encounter row`)
    const hexes = [...new Set(m.areas.flat())].sort((a, b) => a - b)
    const inside = new Set(hexes)
    // a unit inside two overlapping areas is struck once (SWITCHES.md areaFallOncePerUnit); standing units only
    const hit = ctx.state.units.filter((u) => u.lifeState === 'standing' && inside.has(u.hex)).map((u) => u.id)
    emit(ctx, 'area.landed', f.id, { fall: f.id, turn: n, areas: m.areas.map((a) => [...a]), hit, layer: f.layer })
    const layer = layerOfId(f.layer)
    for (const hex of hexes) paintLayer(ctx, hex, layer, f.id)
    for (const id of hit) {
      const u = ctx.state.units[id]!
      if (u.lifeState !== 'standing' || ctx.state.outcome) continue
      if ((f.damage ?? 0) > 0) {
        // Law 1: the one damage function for damage no attack carries — as the ground's hazard is dealt
        const r = flatDamage(ctx, u, f.damage!, f.damageType ?? 'physical', incomingAbsorb(ctx, u))
        if (r.absorbed > 0) spendAbsorb(ctx, id, r.absorbed, f.id)
        applyDamage(ctx, id, r.value, f.id, { actor: null, damageType: f.damageType ?? 'physical', hex: u.hex,
          ...(r.resisted ? { resisted: r.resisted } : {}), ...(r.absorbed ? { absorbed: r.absorbed } : {}) })
      }
      for (const [sid, k] of f.applies ?? []) applyStatus(ctx, id, sid, k, f.id)
    }
    settle(ctx, f.id)
  }
  st.marked = st.marked.filter((x) => x.lands !== n)
  if (!st.marked.length) delete st.marked
}
