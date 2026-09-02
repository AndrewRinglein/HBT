// ISC-028 — listCouncilOptions returns exactly three tactic rows; performing one
// records it on the Engagement and the other two are gone. Placeholders under
// the reserved test.* kind until tactic.* is declared.
// GAME-ARCHITECTURE.md §4 step 2 · KINGDOM-DESIGN.md §11 · ruling 2026-09-01

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, listCouncilOptions, performCouncil, viewCombatPrep } from '../src/core/prep.js'
import { TACTICS } from '../src/content/tactics.js'

const load = () => makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))
const toCouncil = (ctx: ReturnType<typeof load>) => { beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test') }

describe('ISC-028 — the War Council offers three and takes one', () => {
  it('offers exactly three distinct placeholder rows, drawn from a pool larger than three', () => {
    const ctx = load()
    toCouncil(ctx)
    const offer = listCouncilOptions(ctx.campaign)
    expect(offer.length).toBe(3)
    expect(new Set(offer.map((t) => t.id)).size).toBe(3)
    expect(TACTICS.length).toBeGreaterThan(3)
    for (const t of offer) { expect(t.id).toMatch(/^test\.tactic\./); expect(t.effect).toBeNull() }
    expect(ctx.events.filter((e) => e.type === 'council.offered').length).toBe(1)
  })

  it('taking one records it; the other two are gone; a row not offered is refused', () => {
    const ctx = load()
    toCouncil(ctx)
    const offer = listCouncilOptions(ctx.campaign)
    const notOffered = TACTICS.find((t) => !offer.some((o) => o.id === t.id))!
    expect(() => performCouncil(ctx, notOffered.id, 'test')).toThrow(/not offered/)
    performCouncil(ctx, offer[1]!.id, 'test')
    expect(viewCombatPrep(ctx.campaign).tactic).toBe(offer[1]!.id)
    expect(ctx.events.filter((e) => e.type === 'council.taken').map((e) => e['tacticId'])).toEqual([offer[1]!.id])
    performAdvancePrep(ctx, 'test')
    expect(ctx.campaign.cursor.prepStep).toBe('deploy')
    expect(() => performCouncil(ctx, offer[0]!.id, 'test')).toThrow(/refused/)
  })

  it('the same Engagement always draws the same three — a named cup, never a clock (Law 4) — and a reload keeps them', () => {
    const a = load(); toCouncil(a)
    const b = load(); toCouncil(b)
    expect(listCouncilOptions(a.campaign)).toEqual(listCouncilOptions(b.campaign))
    const reloaded = makeCtx(campaignOf(saveOf(a.campaign)))
    expect(listCouncilOptions(reloaded.campaign)).toEqual(listCouncilOptions(a.campaign))
    // a different Engagement draws differently somewhere in a handful of seeds
    const draws = new Set<string>()
    for (let seed = 1; seed <= 6; seed++) {
      const c = load()
      c.campaign.cursor.engagement!.id = `engagement.conquer.ridge.seed-${seed}`
      toCouncil(c)
      draws.add(listCouncilOptions(c.campaign).map((t) => t.id).join(','))
    }
    expect(draws.size).toBeGreaterThan(1)
  })
})
