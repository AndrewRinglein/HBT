// ISC-022 — Salvage arrives only from Conquer — no other Stage, labour or
// reward grants it, across a whole simulated run.
// SKELETON-SETTLED.md:104
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { playWeeks } from '../src/sim/autoplay.js'
import { setCursor } from '../src/core/mutate.js'
import { beginWeek } from '../src/core/week.js'

describe('ISC-022 — Salvage only from Conquer', () => {
  it('over twelve autoplayed Weeks, every Salvage grant is caused by a won Conquer, and other currencies arrive from labours too', () => {
    const ctx = loadFixture()
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(ctx, 'test')
    playWeeks(ctx, 12)
    const gains = ctx.events.filter((e) => e.type === 'resource.gained')
    const kindOf = new Map(ctx.events.filter((e) => e.type === 'engagement.offered').map((e) => [e['engagementId'] as string, e['kind'] as string]))
    const salvage = gains.filter((e) => e['currencyId'] === 'currency.salvage')
    expect(salvage.length).toBeGreaterThan(0)
    for (const g of salvage) expect(kindOf.get(g.causeId), `Salvage from ${g.causeId}`).toBe('engagement.conquer')
    // the labours paid, and never in Salvage
    const fromLabours = gains.filter((e) => /:(farm|pray|delve|gather):/.test(e.causeId))
    expect(fromLabours.length).toBeGreaterThan(0)
    expect(fromLabours.some((e) => e['currencyId'] === 'currency.salvage')).toBe(false)
    // a defend fought and won pays the shop currencies, never Salvage
    const defends = [...kindOf.entries()].filter(([, k]) => k === 'engagement.defend').map(([id]) => id)
    for (const id of defends) expect(gains.filter((g) => g.causeId === id).some((g) => g['currencyId'] === 'currency.salvage')).toBe(false)
  })
})
