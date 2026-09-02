// ISC-004 — a CampaignState survives JSON.stringify and back, unchanged and
// comparing equal, at every position of a Week.
// GAME-ARCHITECTURE.md §1 rule 3 · Constitution Law 5b

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeCampaign, saveOf, campaignOf, assertPlainData, type Hero, type Territory } from '../src/core/campaign.js'
import { makeCtx, setCursor } from '../src/core/mutate.js'
import { CURRENCIES } from '../src/content/currencies.js'

const hero = (id: string, cls: string): Hero => ({
  id, name: id, classes: [cls], level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType: 'alpha-osric', corruption: 0,
})
const territory = (id: string, kingdom = false): Territory => ({
  id, name: id, mapId: 'map.open', owned: kingdom, kingdom, claimedOnce: kingdom, buildings: [], adjacent: [], enemies: ['unit.zombie'], node: null,
})

function fresh() {
  return makeCampaign(7, {
    realm: 'realm.ruined-kingdom',
    stage: 'stage.buy',
    currencies: CURRENCIES.map((c) => c.id),
    cups: ['cup.threat', 'cup.battle'],
    territories: [territory('territory.ruined-kingdom.sanctuary', true), territory('territory.ruined-kingdom.ridge')],
    roster: [hero('hero.base.paladin-shiney', 'class.paladin'), hero('hero.fixed.orphans', 'class.civilian')],
  })
}

const roundTrip = (c: ReturnType<typeof fresh>) => campaignOf(saveOf(c))

describe('ISC-004 — the Campaign is plain data and survives the save', () => {
  it('a fresh Campaign round-trips to a deep-equal value', () => {
    const c = fresh()
    expect(roundTrip(c)).toEqual(c)
    expect(Object.keys(c.purse)).toEqual([...CURRENCIES.map((x) => x.id)].sort())
    expect(c.cups['cup.threat']).not.toBe(c.cups['cup.battle'])
  })

  it('round-trips at every cursor position of a Week — open, prep (all four steps), battle, reckoning, rewards, levelUp', () => {
    const c = fresh()
    const ctx = makeCtx(c)
    const engagement = {
      id: 'engagement.conquer.ridge.week-1', kind: 'engagement.conquer', territoryId: 'territory.ruined-kingdom.ridge',
      mapId: 'map.open', enemies: ['unit.zombie'], condition: null, councilOffer: [], tactic: null, deployed: [], seed: 4,
    }
    const positions: Parameters<typeof setCursor>[1][] = [
      { step: 'open' },
      { step: 'prep', prepStep: 'reveal', engagement },
      { prepStep: 'council', engagement: { ...engagement, councilOffer: ['test.tactic.a', 'test.tactic.b', 'test.tactic.c'] } },
      { prepStep: 'deploy', engagement: { ...engagement, tactic: 'test.tactic.a' } },
      { prepStep: 'equip', engagement: { ...engagement, tactic: 'test.tactic.a', deployed: ['hero.base.paladin-shiney'] } },
      { step: 'battle', prepStep: null, battle: { resultSet: false } },
      { step: 'reckoning', battle: { resultSet: true } },
      { step: 'rewards', battle: null },
      { step: 'levelUp' },
      { step: 'open', engagement: null, week: 2 },
    ]
    for (const p of positions) {
      setCursor(ctx, p, 'test')
      const back = roundTrip(ctx.campaign)
      expect(back, `at ${ctx.campaign.cursor.step}/${ctx.campaign.cursor.prepStep}`).toEqual(ctx.campaign)
      expect(back.cursor).toEqual(ctx.campaign.cursor)
    }
    expect(ctx.events.filter((e) => e.type === 'cursor.moved').length).toBe(positions.length)
    expect(ctx.campaign.week).toBe(2)
  })

  it('the shipped fixture loads as a Campaign positioned at Combat Prep', () => {
    const c = campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8'))
    expect(c.cursor.step).toBe('prep')
    expect(c.cursor.prepStep).toBe('reveal')
    expect(c.cursor.engagement?.kind).toBe('engagement.conquer')
    expect(Object.keys(c.roster).length).toBeGreaterThan(0)
    expect(Object.values(c.territories).filter((t) => t.kingdom).length).toBe(1)
    expect(roundTrip(c)).toEqual(c)
  })

  it('refuses what JSON would silently lose — a Map, a Set, a function, a class instance, a NaN', () => {
    class Thing { x = 1 }
    for (const bad of [new Map(), new Set(), () => 1, new Thing(), Number.NaN, Number.POSITIVE_INFINITY]) {
      const c = fresh() as unknown as Record<string, unknown>
      c['threat'] = bad
      expect(() => assertPlainData(c), String(bad)).toThrow(/not (plain data|a finite number)/)
    }
    expect(() => campaignOf('{"realm":"realm.x"}')).toThrow(/not a Campaign/)
  })
})
