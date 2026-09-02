// ISC-034 — resolveReckoning proposes, from a result alone, XP per deployed
// hero, a wound per hero, Renown, losses, a claim and Salvage — the same
// proposal for a panel-built and a fold-built result of the same facts — and the
// proposal is plain data the panel can overwrite field by field.
// ruling 2026-09-01 · SKELETON-NOTES.md B6/B7 · KINGDOM-DESIGN.md §3A

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf, assertPlainData } from '../src/core/campaign.js'
import { makeCtx, setBattleOutcome } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, performDeploy, listDeployable } from '../src/core/prep.js'
import { makeBlankResult, withUnitFate, validateResult } from '../src/core/result.js'
import { resolveReckoning } from '../src/core/reckoning.js'
import { makeBattleState, resolveEngagement } from '../src/core/seam.js'
import { viewBattle } from '../src/view/battle.js'
import { SWITCHES } from '../src/content/switches.js'

function atBattle() {
  const ctx = makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))
  beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  for (const h of listDeployable(ctx.campaign).slice(0, 4)) performDeploy(ctx, h, 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  return ctx
}
const rows = (ctx: ReturnType<typeof atBattle>) => {
  const v = viewBattle(ctx.campaign)
  return {
    heroes: v.units.filter((u) => u.side === 'hero').map((u) => ({ typeId: u.typeId, name: u.name })),
    enemies: v.units.filter((u) => u.side === 'enemy').map((u) => ({ typeId: u.typeId, name: u.name })),
  }
}

describe('ISC-034 — the Reckoning is proposed and editable', () => {
  it('a won battle proposes XP per deployed hero, one MVP, +1 Renown, a claim and a Salvage grant', () => {
    const ctx = atBattle()
    const e = ctx.campaign.cursor.engagement!
    const { heroes, enemies } = rows(ctx)
    let r = makeBlankResult(e.id, 'heroClear', heroes, enemies)
    enemies.forEach((_, i) => { r = withUnitFate(r, 'enemy', i, { lifeState: 'dead' }) })
    r = withUnitFate(r, 'hero', 0, { kills: 2 })
    r = withUnitFate(r, 'hero', 1, { lifeState: 'downed', damageTaken: 9 })
    r = { ...r, enemyPhases: 4, heroPhases: 5, turns: 5 }
    validateResult(r, { heroes: heroes.length, enemies: enemies.length, id: e.id })
    const k = resolveReckoning(ctx.campaign, e, r)
    expect(k.won).toBe(true)
    expect(k.heroes.map((h) => h.heroId)).toEqual(e.deployed)
    const base = 15 - 4
    expect(k.heroes[0]!.xp - (k.heroes[0]!.mvp ? 10 : 0)).toBe(base + 3 * 2)
    expect(k.heroes[1]!.wound).toBe(SWITCHES.woundFromDowned)
    expect(k.heroes[2]!.wound).toBe(0)
    expect(k.heroes.filter((h) => h.mvp).length).toBe(1)
    expect(k.renown).toBe(1); expect(k.losses).toBe(0)
    expect(k.claim).toBe(e.territoryId)
    // Law 10, rewritten 2026-09-01 toward the rule: a won battle pays the three
    // shop currencies too (7-KINGDOM-SETTLED.md Payouts); Salvage is the one
    // that only a first Conquer pays. The old line asserted Salvage ALONE.
    expect(k.grants.filter((g) => g.currency === 'currency.salvage')).toEqual([{ currency: 'currency.salvage', amount: SWITCHES.salvagePerConquest }])
    expect(k.grants.map((g) => g.currency).sort()).toEqual(['currency.faith', 'currency.mana', 'currency.salvage', 'currency.supplies'])
    assertPlainData(k, 'reckoning')
  })

  it('a lost battle proposes no Renown, a loss, no claim, no Salvage, and a dead hero earns nothing', () => {
    const ctx = atBattle()
    const e = ctx.campaign.cursor.engagement!
    const { heroes, enemies } = rows(ctx)
    let r = makeBlankResult(e.id, 'wipe', heroes, enemies)
    heroes.forEach((_, i) => { r = withUnitFate(r, 'hero', i, { lifeState: i === 0 ? 'dead' : 'downed' }) })
    r = { ...r, enemyPhases: 20 }
    validateResult(r)
    const k = resolveReckoning(ctx.campaign, e, r)
    expect(k.won).toBe(false); expect(k.renown).toBe(0); expect(k.losses).toBe(1)
    expect(k.claim).toBeNull(); expect(k.grants).toEqual([])
    expect(k.lose).toBeNull()                       // a lost Conquer costs nothing (the stakes row)
    expect(k.heroes[0]).toMatchObject({ dead: true, xp: 0, mvp: false })
    for (const h of k.heroes.slice(1)) expect(h.wound).toBe(SWITCHES.woundFromDowned)
  })

  it('the same facts give the same proposal whether the panel or the engine\'s fold produced them', () => {
    const ctx = atBattle()
    const e = ctx.campaign.cursor.engagement!
    const spec = makeBattleState(ctx.campaign.roster, e)
    const folded = resolveEngagement(spec).result
    validateResult(folded, { heroes: e.deployed.length, enemies: e.enemies.length, id: e.id })
    // rebuild the fold's facts by hand through the panel's constructors
    const { heroes, enemies } = rows(ctx)
    let panel = makeBlankResult(e.id, folded.outcome, heroes, enemies)
    for (const u of folded.units) panel = withUnitFate(panel, u.side, u.index, { lifeState: u.lifeState, damageTaken: u.damageTaken, damageDealt: u.damageDealt, kills: u.kills })
    panel = { ...panel, turns: folded.turns, heroPhases: folded.heroPhases, enemyPhases: folded.enemyPhases, events: folded.events }
    expect(resolveReckoning(ctx.campaign, e, panel)).toEqual(resolveReckoning(ctx.campaign, e, folded))
  })

  it('the proposal is overwritten field by field and stored on the cursor as plain data', () => {
    const ctx = atBattle()
    const e = ctx.campaign.cursor.engagement!
    const { heroes, enemies } = rows(ctx)
    let r = makeBlankResult(e.id, 'heroClear', heroes, enemies)
    enemies.forEach((_, i) => { r = withUnitFate(r, 'enemy', i, { lifeState: 'dead' }) })
    const k = resolveReckoning(ctx.campaign, e, r)
    const edited = { ...k, heroes: k.heroes.map((h, i) => (i === 2 ? { ...h, xp: 42, wound: 3 } : h)), grants: [{ currency: 'currency.salvage', amount: 7 }] }
    setBattleOutcome(ctx, r, edited, 'test')
    expect(ctx.campaign.cursor.battle).toEqual({ resultSet: true, result: r, reckoning: edited })
    expect(ctx.campaign.cursor.battle!.reckoning!.heroes[2]).toMatchObject({ xp: 42, wound: 3 })
    expect(ctx.events.at(-1)?.type).toBe('battle.decided')
    assertPlainData(ctx.campaign)
  })
})
