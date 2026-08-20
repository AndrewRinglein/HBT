// RULED, Angela 2026-08-20: poison, burn and the ticking statuses are COUNTERS —
// "they are an accumulation of everything that's added into it, and then they
// tick down." Pool stays reserved for spent-when-consumed (protection).
import { describe, expect, it } from 'vitest'
import { STATUSES } from '../src/content/statuses.js'

describe('status shapes follow the ruled taxonomy', () => {
  it('every ticking status is a counter, never a pool', () => {
    for (const def of Object.values(STATUSES)) {
      if (def.onPhaseEnd) expect(def.shape, `${def.id} ticks, so it is a counter`).toBe('counter')
    }
  })
  it('poison and regeneration specifically', () => {
    expect(STATUSES['status.poison']!.shape).toBe('counter')
    expect(STATUSES['status.regeneration']!.shape).toBe('counter')
  })
  it('nothing declared as pool ticks — pool means spent-when-consumed', () => {
    for (const def of Object.values(STATUSES)) {
      if (def.shape === 'pool') expect(def.onPhaseEnd, `${def.id} is a pool and must not tick`).toBeUndefined()
    }
  })
})
