// Unit identity is independent of the unit's array index and roster position.
// RNG keys encode four bytes per integer; larger identities would alias.
import type { State } from './types.js'

export const MAX_UNIT_UID = 0xffffffff
export const isUnitUid = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_UNIT_UID

export type UnitIdentityOptions = {
  /** Aligned with the hero/enemy rosters. Undefined entries request automatic allocation. */
  heroUids?: readonly (number | undefined)[]
  enemyUids?: readonly (number | undefined)[]
}

function unusedUid(taken: ReadonlySet<number>, preferred: number): number {
  for (let uid = preferred; uid <= MAX_UNIT_UID; uid++) if (!taken.has(uid)) return uid
  throw new Error('unit identity space exhausted')
}

/** Reserve all explicit identities before filling either roster's automatic entries. */
export function rosterUids(heroCount: number, enemyCount: number, options: UnitIdentityOptions): { heroes: number[]; enemies: number[] } {
  const taken = new Set<number>()
  for (const [values, count, side] of [[options.heroUids, heroCount, 'hero'], [options.enemyUids, enemyCount, 'enemy']] as const) {
    if (values === undefined) continue
    if (!Array.isArray(values) || values.length !== count) throw new Error(`${side} identities must be an array aligned with all ${count} units`)
    for (const uid of values) {
      if (uid === undefined) continue
      if (!isUnitUid(uid)) throw new Error(`${side} unit identity must be an unsigned 32-bit integer`)
      if (taken.has(uid)) throw new Error(`duplicate unit identity ${uid}`)
      taken.add(uid)
    }
  }
  const allocate = (count: number, values: readonly (number | undefined)[] | undefined, first: number): number[] =>
    Array.from({ length: count }, (_, i) => {
      if (values?.[i] !== undefined) return values[i]!
      const uid = unusedUid(taken, first + i)
      taken.add(uid)
      return uid
    })
  return { heroes: allocate(heroCount, options.heroUids, 100), enemies: allocate(enemyCount, options.enemyUids, 200) }
}

/** Read the current state on every arrival, so forks and reloads share no counter. */
export function arrivalUid(state: Pick<State, 'units' | 'corpses'>): number {
  const taken = new Set(state.units.map(u => u.uid))
  for (const corpse of state.corpses ?? []) taken.add(corpse.uid)
  return unusedUid(taken, 300)
}
