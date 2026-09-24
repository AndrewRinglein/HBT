import {isDamageType} from './types.js'
import { validateBurstAction } from './burst-profile.js'
import {attackPacketFields} from './attack-profile.js'
import { prepareCover } from './cover.js'
import { geometryOf, validBoard } from './hex.js'
import { isUnitUid } from './identity.js'
import { prepareAttackLines } from './los.js'
import { decodeProps, decodeFloor } from './props.js'
import { draw, makeRng, STREAMS, type Stream } from './rng.js'
import { isStatName } from './stats.js'
import { validateTrigger, type Trigger } from './trigger.js'
import { DEFAULT_CONFIG, MAX_SURGE_CYCLES, TERRAIN, type BattleCursor, type Ctx } from './types.js'

export type BattleRuntime = Pick<Ctx, 'actions' | 'statuses' | 'critChart' | 'items' | 'badges' | 'ruleBadges' | 'units' | 'arrive'>
// Bump when rules/control flow change incompatibly. Functions are supplied by
// this runtime, never revived from JSON. There is no V1 save migration.
const RULES_VERSION = 'v2-migration.21' // Independent incoming block cups and reciprocal hook roles.
const bindingKeys = ['actions', 'statuses', 'critChart', 'items', 'badges', 'ruleBadges', 'units'] as const
const phases = ['hero', 'enemy']
const steps: BattleCursor['at'][] = ['battle-start', 'turn-start', 'hero-start', 'enemy-arrivals', 'enemy-start', 'next-activation', 'selecting', 'activation-start', 'acting', 'surge-check', 'activation-end', 'phase-end', 'turn-end', 'complete']

function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`Invalid battle snapshot: ${message}`)
}
function record(value: unknown): asserts value is Record<string, any> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected an object')
}
const integer = (n: unknown, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): n is number => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
const validTerrain = (v: unknown, cells: number): boolean => Array.isArray(v) && v.length === cells && v.every(x => integer(x, 0) && x !== TERRAIN.OBSTACLE)

/** Sorted object keys; arrays retain their authored order. Hook presence is
 * data; implementation compatibility is covered by RULES_VERSION, not source
 * text (bundling/minification must not invalidate an otherwise identical save).
 * This checksum detects accidental content mismatch, not hostile tampering. */
function contentKey(runtime: BattleRuntime): string {
  for (const action of Object.values(runtime.actions)) { validateBurstAction(action); if (action.attack) attackPacketFields(action.attack) }
  let a = 0x811c9dc5, b = 0x9e3779b9, length = 0
  const add = (s: string) => {
    length += s.length
    for (let i = 0; i < s.length; i++) {
      a = Math.imul(a ^ s.charCodeAt(i), 0x01000193)
      b = Math.imul(b ^ s.charCodeAt(i), 0x85ebca6b)
    }
  }
  const visit = (v: unknown): void => {
    if (typeof v === 'function') { add('"<runtime hook>"'); return }
    if (Array.isArray(v)) { add('['); for (const x of v) { visit(x); add(',') }; add(']'); return }
    if (v !== null && typeof v === 'object') {
      add('{')
      for (const k of Object.keys(v).sort()) {
        const x = (v as Record<string, unknown>)[k]
        if (x === undefined) continue
        add(JSON.stringify(k)); add(':'); visit(x); add(',')
      }
      add('}'); return
    }
    add(JSON.stringify(v) ?? 'null')
  }
  for (const k of bindingKeys) { add(k); visit(runtime[k]) }
  return `${length}:${a >>> 0}:${b >>> 0}`
}

/** Captures an initial, suspended or completed battle without running setup. */
export function saveBattle(ctx: Ctx): string {
  return JSON.stringify({
    format: 'hobat.battle', version: 2, rulesVersion: RULES_VERSION,
    contentKey: contentKey(ctx), state: ctx.state, cursor: ctx.battleCursor,
    cfg: ctx.cfg, encounter: ctx.encounter, events: ctx.events,
    rng: { rootSeed: ctx.rng.rootSeed, strict: ctx.rng.seen !== null, log: ctx.rng.log },
  })
}

function validatePlain(v: unknown, path = 'snapshot'): void {
  // Authored ValueSpec multipliers may be fractional; live pools/ordinals are
  // checked as integers below. Serialization must preserve both exactly.
  if (typeof v === 'number') { requireThat(Number.isFinite(v), `non-finite number at ${path}`); return }
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return
  if (Array.isArray(v)) { v.forEach((x, i) => validatePlain(x, `${path}[${i}]`)); return }
  record(v)
  for (const [k, x] of Object.entries(v)) {
    requireThat(k !== '__proto__' && k !== 'constructor' && k !== 'prototype', 'unsafe object key')
    validatePlain(x, `${path}.${k}`)
  }
}

/** Validate at the persistence boundary; no caller-owned data is modified.
 * Geometry and strict RNG collision tracking are reconstructed, never loaded. */
export function restoreBattle(json: string, runtime: BattleRuntime): Ctx {
  const s: unknown = JSON.parse(json)
  record(s)
  requireThat(s.format === 'hobat.battle' && s.version === 2 && s.rulesVersion === RULES_VERSION, 'unsupported version')
  requireThat(s.contentKey === contentKey(runtime), 'content binding differs')
  validatePlain(s)
  const st = s.state; record(st); record(st.board)
  requireThat(validBoard(st.board), 'board dimensions')
  const cells = st.board.width * st.board.height
  requireThat(validTerrain(st.terrain, cells), 'terrain')
  st.props = decodeProps(st.props, cells)
  if(Object.hasOwn(st,'floor'))st.floor=decodeFloor(st.floor,cells)
  requireThat(st.layers === undefined || (Array.isArray(st.layers) && st.layers.length === cells && st.layers.every((x: unknown) => integer(x, 0))), 'layers')
  requireThat(integer(st.turn, 0) && phases.includes(st.phase) && typeof st.mapId === 'string', 'battle clock/map')
  requireThat(st.outcome === null || ['heroClear', 'objectiveMet', 'wipe', 'retreat', 'capped', 'objectiveFailed'].includes(st.outcome), 'outcome')
  requireThat(Array.isArray(st.units), 'units')
  const unitId = (id: unknown) => integer(id, 0, st.units.length - 1)
  const uids = new Set<number>()
  for (const [i, u] of st.units.entries()) {
    record(u)
    requireThat(u.id === i && isUnitUid(u.uid) && !uids.has(u.uid), 'unit identity'); uids.add(u.uid)
    requireThat(integer(u.hex, 0, cells - 1), 'unit hex')
    if (u.incomingAttackOrdinal !== undefined) requireThat(integer(u.incomingAttackOrdinal, 1, 0xffffffff), 'incoming attack ordinal')
    if (u.burstOrdinal !== undefined) requireThat(integer(u.burstOrdinal, 1), 'burst ordinal')
    for (const k of ['hp', 'maxHp', 'armor', 'resist', 'accuracy', 'dodge', 'strength', 'precision', 'magic', 'spirit', 'crit', 'luck', 'movement', 'reach', 'stamina', 'maxStamina', 'staminaRegen', 'bleedOut', 'toughness', 'surge', 'surgeChance', 'vision', 'movePointsLeft', 'activationOrdinal', 'attackOrdinal', 'deathbedOrdinal']) requireThat(integer(u[k]), `unit ${k}`)
    for (const key of ['fireResist', 'poisonResist', 'shadowResist', 'block', 'rangedBlock']) requireThat(u[key] === undefined || integer(u[key]), `unit ${key}`)
    requireThat(phases.includes(u.side) && phases.includes(u.rowSide) && ['standing', 'downed', 'dead'].includes(u.lifeState), 'unit side/life')
    requireThat(['melee', 'ranged', 'support'].includes(u.role), 'unit role')
    for (const k of ['name', 'typeId', 'ai']) requireThat(typeof u[k] === 'string', `unit ${k}`)
    for (const k of ['moveUsed', 'primaryUsed', 'summoned']) requireThat(typeof u[k] === 'boolean', `unit ${k}`)
    requireThat(strings(u.actions) && u.actions.every(id => Object.hasOwn(runtime.actions, id)), 'unit actions')
    requireThat(strings(u.badges) && u.badges.every(id => Object.hasOwn(runtime.badges, id)) && strings(u.tags), 'unit badges/tags')
    for (const k of ['usesLeft', 'cooldowns', 'usesSpentThisBattle']) {
      if (k === 'usesSpentThisBattle' && u[k] === undefined) continue
      record(u[k]); requireThat(Object.entries(u[k]).every(([id, n]) => Object.hasOwn(runtime.actions, id) && integer(n, 0)), `unit ${k}`)
    }
    for (const k of ['statuses', 'mods', 'triggers', 'auras']) requireThat(Array.isArray(u[k]), `unit ${k}`)
    for (const m of u.mods) {
      record(m)
      requireThat(typeof m.stat === 'string' && isStatName(m.stat) && ['add', 'set'].includes(m.op) && integer(m.value) && typeof m.source === 'string' && ['unit', 'item'].includes(m.scope) && (m.expiresAtTurn === undefined || integer(m.expiresAtTurn, 0)) && (m.expiresAfterActivation === undefined || integer(m.expiresAfterActivation, 0)), 'stat modifier')
    }
    for (const a of u.auras) {
      record(a); record(a.mods)
      requireThat(typeof a.id === 'string' && integer(a.radius, 0) && ['ally', 'enemy', 'any'].includes(a.side) && (a.requireTags === undefined || strings(a.requireTags)), 'aura')
      requireThat(Object.entries(a.mods).every(([k, n]) => isStatName(k) && integer(n)), 'aura modifiers')
    }
    for (const t of u.triggers) {
      record(t); record(t.effect)
      requireThat(typeof t.id === 'string' && typeof t.source === 'string', 'trigger identity')
      validateTrigger(t as Trigger)
      const e = t.effect
      requireThat(['burstScale', 'status.apply', 'status.remove', 'damage', 'knockback', 'badge.grant', 'power.gain', 'heal', 'corpse.raise', 'corpse.consume', 'statMod', 'stamina.drain', 'layer.paint'].includes(e.kind), 'trigger effect')
      if (['status.apply', 'status.remove'].includes(e.kind)) requireThat(typeof e.statusId === 'string' && Object.hasOwn(runtime.statuses, e.statusId), 'trigger status')
      if (e.kind === 'badge.grant') requireThat(typeof e.badgeId === 'string' && Object.hasOwn(runtime.badges, e.badgeId), 'trigger badge')
      if (e.kind === 'damage') requireThat(isDamageType(e.damageType), 'trigger damage type')
      if (e.kind === 'statMod') requireThat(typeof e.stat === 'string' && isStatName(e.stat) && integer(e.value) && ['battle', 'endOfTurn'].includes(e.until), 'trigger modifier')
      if (['status.apply', 'knockback', 'power.gain', 'stamina.drain', 'damage', 'heal'].includes(e.kind)) {
        const v = ['damage', 'heal'].includes(e.kind) ? e.amount : e.value
        if (typeof v === 'number') requireThat(integer(v), 'trigger amount')
        else {
          record(v)
          requireThat(['partyMagic', 'partySpirit', 'power'].includes(v.scale) && (v.div === undefined || integer(v.div, 1)) && (v.mult === undefined || typeof v.mult === 'number') && (v.base === undefined || integer(v.base)) && (v.round === undefined || ['up', 'down'].includes(v.round)), 'trigger scaling')
        }
      }
      if (['corpse.raise', 'corpse.consume', 'layer.paint'].includes(e.kind)) requireThat(integer(e.radius, 0), 'trigger radius')
      if (e.kind === 'corpse.raise') requireThat(typeof e.unit === 'string' && runtime.units && Object.hasOwn(runtime.units, e.unit) && runtime.arrive, 'trigger arrival')
      if (e.kind === 'corpse.consume') requireThat(integer(e.healPer, 0), 'corpse healing')
      if (e.kind === 'layer.paint') requireThat(typeof e.layer === 'string' && ['self', 'target'].includes(e.origin), 'layer trigger')
    }
    for (const status of u.statuses) {
      record(status)
      requireThat(typeof status.id === 'string' && Object.hasOwn(runtime.statuses, status.id) && integer(status.value, 0) && (status.by === undefined || unitId(status.by)), 'unit status')
    }
    requireThat(u.huntTarget === undefined || unitId(u.huntTarget), 'hunt target')
    requireThat(u.consumedBy === undefined || (typeof u.consumedBy === 'string' && /^prop\./.test(u.consumedBy)), 'consumed by')   // v2.knockback-collisions
  }
  requireThat(Array.isArray(s.events) && st.seq === s.events.length, 'event count')
  for (const [i, e] of s.events.entries()) {
    record(e)
    requireThat(e.seq === i && integer(e.turn, 0, st.turn) && phases.includes(e.phase) && typeof e.type === 'string' && typeof e.causeId === 'string', 'event prefix')
    requireThat((e.actor === null || unitId(e.actor)) && (e.target === null || unitId(e.target)), 'event unit reference')
    if (e.type === 'map.loaded' && 'terrain' in e) {
      requireThat(e.mapId === st.mapId && e.causeId === st.mapId, 'initial map identity differs')
      requireThat(e.width === st.board.width && e.height === st.board.height, 'initial map dimensions differ')
      requireThat(validTerrain(e.terrain, cells), 'initial map terrain')
      // This is initial terrain; current terrain can have changed since setup.
    }
    if (e.type === 'map.loaded') {
      requireThat(e.mapId === st.mapId && e.width === st.board.width && e.height === st.board.height, 'initial prop map identity/dimensions')
      e.props = decodeProps(e.props, cells)
      if(Object.hasOwn(e,'floor'))e.floor=decodeFloor(e.floor,cells)
    }
  }
  if (s.encounter !== undefined) {
    const enc = s.encounter; record(enc)
    if ('board' in enc) requireThat(validBoard(enc.board) && enc.board.width === st.board.width && enc.board.height === st.board.height, 'encounter board differs')
    requireThat(typeof enc.id === 'string' && typeof enc.name === 'string' && Array.isArray(enc.setup) && Array.isArray(enc.schedule), 'encounter definition')
    record(st.encounter)
    requireThat(st.encounter.id === enc.id && Array.isArray(st.encounter.fired) && st.encounter.fired.every((n: unknown) => integer(n, 0, enc.schedule.length - 1)) && new Set(st.encounter.fired).size === st.encounter.fired.length, 'encounter schedule cursor')
    requireThat(Array.isArray(st.encounter.objectives) && st.encounter.objectives.every(unitId), 'encounter objectives')
    requireThat(runtime.units && runtime.arrive, 'encounter runtime bindings')
    const coordinate = (p: unknown) => {
      record(p)
      requireThat(integer(p.col, 0, st.board.width - 1) && integer(p.row, 0, st.board.height - 1), 'encounter coordinate')
    }
    const placement = (p: unknown) => {
      record(p)
      requireThat(typeof p.unit === 'string' && Object.hasOwn(runtime.units!, p.unit) && (p.count === undefined || integer(p.count, 1)), 'encounter placement')
      requireThat((p.at === undefined) !== (p.hexes === undefined), 'one encounter placement shape required')
      if (p.hexes !== undefined) {
        requireThat(Array.isArray(p.hexes) && p.hexes.length === (p.count ?? 1), 'encounter hex count')
        p.hexes.forEach(coordinate)
      } else {
        record(p.at)
        if (p.at.near !== undefined) { coordinate(p.at.near); requireThat(integer(p.at.range, 0), 'encounter range') }
        else if (p.at.oneOf !== undefined) {
          requireThat(Array.isArray(p.at.oneOf) && p.at.oneOf.length > 0, 'encounter alternatives')
          p.at.oneOf.forEach(coordinate)
        } else coordinate(p.at)
      }
    }
    enc.setup.forEach(placement)
    for (const row of enc.schedule) {
      record(row)
      requireThat((integer(row.phase, 1) && row.enemyPhase === undefined) || (integer(row.enemyPhase, 1) && row.phase === undefined), 'encounter schedule timing')
      requireThat(Array.isArray(row.spawn), 'encounter spawn'); row.spawn.forEach(placement)
    }
  } else requireThat(st.encounter === undefined, 'missing encounter definition')
  if (st.corpses !== undefined) {
    requireThat(Array.isArray(st.corpses), 'corpses')
    for (const corpse of st.corpses) {
      record(corpse)
      requireThat(integer(corpse.id, 0) && isUnitUid(corpse.uid) && integer(corpse.hex, 0, cells - 1) && phases.includes(corpse.side) && typeof corpse.typeId === 'string', 'corpse')
    }
  }
  requireThat(st.power === undefined || integer(st.power, 0), 'power pool')
  if (s.cursor !== undefined) {
    const c = s.cursor; record(c)
    requireThat(steps.includes(c.at) && phases.includes(c.phase), 'cursor step/phase')
    requireThat(Array.isArray(c.order) && c.order.every(unitId) && new Set(c.order).size === c.order.length, 'cursor order')
    requireThat(integer(c.next, 0, c.order.length) && (c.actor === null || unitId(c.actor)), 'cursor position')
    requireThat(integer(c.surgeLink, 0, MAX_SURGE_CYCLES) && typeof c.surged === 'boolean' && integer(c.movementAllowance, 0), 'cursor Surge')
    const begun = s.events.filter((e: any) => e.type === 'battle.begin').length
    requireThat(c.phase === st.phase, 'cursor phase differs from state')
    if (c.at === 'battle-start') requireThat(begun === 0 && st.turn === 0 && c.actor === null && c.order.length === 0 && c.next === 0, 'battle already begun')
    else requireThat(begun === 1, 'battle must begin exactly once')
    requireThat(c.order.every((id: number) => st.units[id].side === c.phase), 'cursor order side')
    if (['acting', 'surge-check', 'activation-end'].includes(c.at)) requireThat(c.actor !== null && c.next > 0 && c.order[c.next - 1] === c.actor, 'cursor actor')
    if (['selecting','activation-start'].includes(c.at)) {
      requireThat(c.actor === null && c.next < c.order.length, 'pending activation selection')
      // A dead skip need not have begun, but a begun actor cannot re-enter the remaining queue.
      const spent = s.events.filter((e: any) => e.type === 'activation.begin' && e.turn === st.turn && e.phase === c.phase)
      requireThat(spent.every((e: any) => c.order.indexOf(e.actor) >= 0 && c.order.indexOf(e.actor) < c.next), 'pending activation spent order')
    }
    if (c.at === 'activation-start') {
      const selected=s.events.at(-1)
      requireThat(selected?.type==='activation.selected' && selected.actor===c.order[c.next] && selected.unitUid===st.units[selected.actor].uid, 'selected activation event')
    }
    if (c.at === 'complete') requireThat(st.outcome !== null, 'completed outcome')
  } else requireThat(!s.events.some((e: any) => e.type === 'battle.begin'), 'missing active cursor')
  for (const u of st.units) {
    const incoming = s.events.filter((e: any) => e.type === 'block.rolled' && e.defender === u.id)
    requireThat((u.incomingAttackOrdinal ?? 0) === incoming.length, 'incoming attack ordinal history')
    requireThat(incoming.every((e: any, i: number) => e.ordinal === i + 1), 'block event ordinal history')
    const declarations = s.events.filter((e: any) => e.type === 'burst.declared' && e.actor === u.id)
    requireThat((u.burstOrdinal ?? 0) === declarations.length, 'burst ordinal history')
    requireThat(declarations.every((e: any, i: number) => e.ordinal === i + 1), 'burst event ordinal history')
  }
  record(s.cfg); record(s.cfg.switches)
  requireThat(integer(s.cfg.turnCap, 1), 'turn cap')
  for (const [k, v] of Object.entries(DEFAULT_CONFIG.switches)) requireThat(typeof s.cfg.switches[k] === typeof v, `switch ${k}`)
  for (const [k, allowed] of Object.entries({ aiAttacksDowned: ['never', 'whenNoStanding', 'always'], aiAttackChoice: ['declared', 'bestDamage'], actionSlots: ['byProfile', 'any'], mirrorSideRules: ['fielded', 'row'] })) requireThat(allowed.includes(s.cfg.switches[k]), `switch ${k}`)
  const savedRng = s.rng; record(savedRng)
  requireThat(integer(savedRng.rootSeed, 0, 0xffffffff) && typeof savedRng.strict === 'boolean' && Array.isArray(savedRng.log), 'RNG header')
  const rng = makeRng(savedRng.rootSeed, { strict: savedRng.strict })
  for (const r of savedRng.log) {
    record(r)
    requireThat(STREAMS.includes(r.stream) && Array.isArray(r.keys) && r.keys.every((x: unknown) => integer(x)) && integer(r.value, 0, 0xffffffff), 'RNG record')
    requireThat(draw(rng, r.stream as Stream, ...r.keys) === r.value, 'RNG value differs')
  }
  const { actions, statuses, critChart, items, badges, ruleBadges, units, arrive } = runtime
  const ctx: Ctx = {
    actions, statuses, critChart, items, badges, ruleBadges,
    ...(units === undefined ? {} : { units }), ...(arrive === undefined ? {} : { arrive }),
    state: st as Ctx['state'], cfg: s.cfg as Ctx['cfg'], events: s.events as Ctx['events'], rng,
    geo: geometryOf(st.board as Ctx['state']['board']),
    ...(s.cursor === undefined ? {} : { battleCursor: s.cursor as BattleCursor }),
    ...(s.encounter === undefined ? {} : { encounter: s.encounter as NonNullable<Ctx['encounter']> }),
  }
  prepareAttackLines(ctx)
  prepareCover(ctx)
  return ctx
}
