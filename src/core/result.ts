// The result contract — one shape, two producers. THIN-SLICE-REVIEW.md §G,
// ruling 4 sharpened (2026-09-01): the slice's battle is not played; a panel
// SETS everything a battle could have decided. "It should be built in a way we
// can invoke the engine later" — and this is how: the panel and the engine's
// fold (seam.ts) both produce an EngagementResult, one validator polices both,
// and the Reckoning never learns which it was given.
//
// Rows are keyed to the roster by position: hero row i is deployed[i], exactly
// as the fold keys row i to spec.heroes[i]. That is the whole join. A row with a
// `role` (kingdom.encounter-result-fold: an encounter's own unit, an arrival) is
// not the roster's and joins nothing; the panel never makes one.

import { TALLY_ROLES, type EngagementResult, type UnitTally } from './seam.js'
import type { Outcome, Side } from '../engine.js'
// plumbing.vocabulary-export (engine, 2026-09-28; review finding K6): the outcomes and life states
// are the engine's lists, read through the door. The copy here had three of six outcomes, so an
// objectiveMet or objectiveFailed result was refused by the only validator.
import { OUTCOMES as ENGINE_OUTCOMES, LIFE_STATES } from '../engine.js'

const OUTCOMES: readonly Outcome[] = ENGINE_OUTCOMES
const LIFE: readonly UnitTally['lifeState'][] = LIFE_STATES

/**
 * A blank result for the panel to edit: everyone standing, nothing dealt, the
 * outcome as toggled. `heroes` and `enemies` are unit typeIds in deployment /
 * Engagement order, with a display name each.
 */
export function makeBlankResult(
  id: string,
  outcome: Outcome,
  heroes: readonly { typeId: string; name: string }[],
  enemies: readonly { typeId: string; name: string }[],
): EngagementResult {
  const row = (side: Side, index: number, unitId: number, u: { typeId: string; name: string }): UnitTally => ({
    side, index, unitId, typeId: u.typeId, name: u.name,
    downed: false, dead: false, lifeState: 'standing', damageTaken: 0, damageDealt: 0, kills: 0,
  })
  const units: UnitTally[] = [
    ...heroes.map((u, i) => row('hero', i, i, u)),
    ...enemies.map((u, i) => row('enemy', i, heroes.length + i, u)),
  ]
  return { id, outcome, turns: 0, heroPhases: 0, enemyPhases: 0, units, events: 0 }
}

/** A row with one unit's fate set, keeping the invariants the fold keeps. */
export function withUnitFate(r: EngagementResult, side: Side, index: number, fate: Partial<Pick<UnitTally, 'lifeState' | 'damageTaken' | 'damageDealt' | 'kills'>>): EngagementResult {
  const units = r.units.map((u) => {
    if (u.side !== side || u.index !== index) return u
    const lifeState = fate.lifeState ?? u.lifeState
    // kingdom.reads-engine (K7): a panel that sets a row's kills names no victims — the fold's list goes with the old count
    const { killed: _killed, ...rest } = u
    return {
      ...(fate.kills === undefined || fate.kills === u.kills ? u : rest), ...fate, lifeState,
      dead: lifeState === 'dead',
      // A hero who is dead went down first, and one who stands may still have
      // been down; an enemy has no consequence stack — zero is simply dead
      // (engine settle.ts) — so an enemy is never 'downed'.
      downed: u.side === 'hero' ? lifeState === 'downed' || lifeState === 'dead' || u.downed : false,
    }
  })
  return { ...r, units }
}

/** Every integer, non-negative, and named. Throws with the path (Law 9). */
function nonNegInt(v: unknown, path: string): void {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new Error(`${path}: ${String(v)} is not a non-negative integer`)
}

/**
 * The one validator. Both producers' results pass through it; anything else
 * is refused before it can reach the writer. `expected` says what the
 * Engagement fielded, so a result cannot name a roster the battle never had.
 */
export function validateResult(r: EngagementResult, expected?: { heroes: number; enemies: number; id: string }): EngagementResult {
  if (typeof r !== 'object' || r === null) throw new Error('result: not an object')
  if (typeof r.id !== 'string' || !r.id) throw new Error('result: id missing')
  if (!OUTCOMES.includes(r.outcome)) throw new Error(`result: outcome '${String(r.outcome)}' is not one of ${OUTCOMES.join(' | ')}`)
  nonNegInt(r.turns, 'result: turns'); nonNegInt(r.heroPhases, 'result: heroPhases'); nonNegInt(r.enemyPhases, 'result: enemyPhases'); nonNegInt(r.events, 'result: events')
  if (!Array.isArray(r.units)) throw new Error('result: units is not an array')
  const seen = new Set<string>()
  const ids = new Set<number>()
  const uids = new Set<number>()
  r.units.forEach((u, i) => {
    const p = `result: units[${i}]`
    if (u.side !== 'hero' && u.side !== 'enemy') throw new Error(`${p}.side: '${String(u.side)}'`)
    nonNegInt(u.index, `${p}.index`); nonNegInt(u.unitId, `${p}.unitId`)
    nonNegInt(u.damageTaken, `${p}.damageTaken`); nonNegInt(u.damageDealt, `${p}.damageDealt`); nonNegInt(u.kills, `${p}.kills`)
    if (typeof u.typeId !== 'string' || !u.typeId) throw new Error(`${p}.typeId: missing`)
    if (typeof u.name !== 'string') throw new Error(`${p}.name: missing`)
    if (!LIFE.includes(u.lifeState)) throw new Error(`${p}.lifeState: '${String(u.lifeState)}'`)
    if (u.dead !== (u.lifeState === 'dead')) throw new Error(`${p}: dead=${u.dead} disagrees with lifeState '${u.lifeState}'`)
    if (u.side === 'hero' && u.lifeState !== 'standing' && !u.downed) throw new Error(`${p}: lifeState '${u.lifeState}' but downed=false — no hero dies standing`)
    if (u.side === 'enemy' && (u.downed || u.lifeState === 'downed')) throw new Error(`${p}: an enemy is never downed — zero is dead (engine settle.ts)`)
    const key = `${u.side}:${u.index}`
    if (seen.has(key)) throw new Error(`${p}: ${key} appears twice`)
    seen.add(key)
    if (ids.has(u.unitId)) throw new Error(`${p}: unitId ${u.unitId} appears twice`)
    ids.add(u.unitId)
    // kingdom.encounter-result-fold: the engine uid the fold keyed the row by, and why a row is not the roster's
    if (u.uid !== undefined) {
      nonNegInt(u.uid, `${p}.uid`)
      if (uids.has(u.uid)) throw new Error(`${p}: uid ${u.uid} appears twice`)
      uids.add(u.uid)
    }
    // kingdom.reads-engine (K7): the victims a row names are its kills, one each
    if (u.killed !== undefined && (!Array.isArray(u.killed) || u.killed.length !== u.kills || u.killed.some((k: unknown) => typeof k !== 'string' || !k))) throw new Error(`${p}.killed: names ${Array.isArray(u.killed) ? u.killed.length : 'no list of'} victims for ${u.kills} kills`)
    if (u.stood !== undefined && (u.stood !== true || u.side !== 'hero')) throw new Error(`${p}.stood: only a hero-side row stands again at the Deathbed, and only true is written`)
    if (u.turned !== undefined && (u.turned !== true || u.side !== 'hero' || u.lifeState !== 'standing')) throw new Error(`${p}.turned: only a standing hero-side row ends a battle turned, and only true is written`)
    // engine rule.afflictions-at-zero-refiled-2: what an affliction's 0-Health rule gave a roster hero, carried after the battle
    if (u.carried !== undefined && (u.side !== 'hero' || u.role !== undefined || !Array.isArray(u.carried) || !u.carried.length || u.carried.some((b: unknown) => typeof b !== 'string' || !b))) throw new Error(`${p}.carried: only a roster hero row carries badges out of the battle, a non-empty list of badge ids`)
    if (u.role !== undefined) {
      if (!TALLY_ROLES.includes(u.role)) throw new Error(`${p}.role: '${String(u.role)}' is not one of ${TALLY_ROLES.join(' | ')}`)
      if (u.uid === undefined) throw new Error(`${p}: a row that is not the roster's ('${u.role}') carries no uid`)
    }
  })
  // Explicit order (Law 6): heroes first, then enemies, each by index.
  for (let i = 1; i < r.units.length; i++) {
    const a = r.units[i - 1]!, b = r.units[i]!
    const ok = a.side === b.side ? a.index < b.index : a.side === 'hero'
    if (!ok) throw new Error(`result: units out of order at [${i}] — heroes first, then enemies, each by index`)
  }
  // kingdom.encounter-result-fold: the roster rows — every row the panel sets; the fold's, less an encounter's own units and its arrivals
  const roster = r.units.filter((u) => u.role === undefined)
  if (expected) {
    // was: every hero and enemy row was counted against the Engagement. An encounter fields units no Engagement names
    // (its own enemies, the hero-side civilians, the arrivals), so only the roster rows are; a row that is not the
    // roster's still passes every check above, and the outcome checks below read all of them.
    const h = roster.filter((u) => u.side === 'hero').length
    const e = roster.filter((u) => u.side === 'enemy').length
    if (h !== expected.heroes || e !== expected.enemies) throw new Error(`result: ${h} hero and ${e} enemy rows; the Engagement fielded ${expected.heroes} and ${expected.enemies}`)
    if (r.id !== expected.id) throw new Error(`result.id '${r.id}' is not the Engagement '${expected.id}'`)
  }
  // v2.item-uses: what the item instances spent — hero rows only, each (index, instance) once
  if (r.itemUses !== undefined) {
    if (!Array.isArray(r.itemUses)) throw new Error('result: itemUses is not an array')
    const keys = new Set<string>()
    // was: every hero row. An item use is a roster hero's (the fold leaves out what an encounter's own unit spends).
    const heroRows = roster.filter((u) => u.side === 'hero').length
    r.itemUses.forEach((x, i) => {
      const p = `result: itemUses[${i}]`
      nonNegInt(x.index, `${p}.index`); nonNegInt(x.instance, `${p}.instance`); nonNegInt(x.used, `${p}.used`)
      if (x.used < 1) throw new Error(`${p}: an instance that spent nothing is not listed`)
      if (typeof x.itemId !== 'string' || !x.itemId) throw new Error(`${p}.itemId: missing`)
      if (x.index >= heroRows) throw new Error(`${p}: hero row ${x.index} is not in the result`)
      const key = `${x.index}/${x.instance}`
      if (keys.has(key)) throw new Error(`${p}: instance ${key} appears twice`)
      keys.add(key)
    })
  }
  // The outcome and the rows must agree, whichever hand wrote them.
  const heroes = r.units.filter((u) => u.side === 'hero')
  const enemies = r.units.filter((u) => u.side === 'enemy')
  // engine rule.afflictions-at-zero-refiled-2: a hero that ended the battle turned to the enemy side stands, but the battle
  // was lost without it (engine settle.ts counts the hero side's standing)
  if (r.outcome === 'wipe' && heroes.some((u) => u.lifeState === 'standing' && !u.turned)) throw new Error('result: a wipe with a hero still standing')
  if (r.outcome === 'heroClear' && enemies.some((u) => u.lifeState !== 'dead')) throw new Error('result: heroClear with an enemy still alive')
  return r
}
