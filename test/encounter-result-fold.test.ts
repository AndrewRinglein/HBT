// kingdom.encounter-result-fold (kingdom.opening-loop-three part 2 of 4; V2-ROADMAP.md R8, the battle-to-Kingdom result
// seam, for encounters). makeBattleResult keys rows by the engine unit's uid (unit.enter uid), not by entry order: the
// deployed heroes by the uids the spec hands the engine (heroUids), the encounter's own units (its enemies, the hero-side
// civilians) and the arrivals (a schedule row, a raised corpse — unit.enter `arrived`) as their own rows, never keyed to
// the roster. A finished sandbox encounter folds to an EngagementResult that resolveReckoning and applyBattleResult take
// for an Engagement naming that encounter: each deployed hero written once, a second apply refused.
// Expect: "An Orphanage battle played in the sandbox folds without error (civilians, Turn 4/5 arrivals); reordered or
// noncontiguous hero uids key the right heroes; an arrival is never a roster hero; applying the result writes each
// deployed hero exactly once and a second apply throws."
import { describe, it, expect } from 'vitest'
import { loadFixture, toEquip, decide } from './walk.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { createSandbox, sandboxResult } from '../src/core/sandbox.js'
import { seesScheduleOut } from '../tools/sandbox-sees-schedule.mjs'
import { makeBattleState, battleOptionsOf, makeBattleResult, resolveEngagement, type EngagementResult } from '../src/core/seam.js'
import { validateResult } from '../src/core/result.js'
import { applyBattleResult } from '../src/core/reckoning.js'
import { saveOf } from '../src/core/campaign.js'
import { createBattle, runBattle, encounterDef } from '../src/engine.js'
import type { Ctx as Battle, Event } from '../src/engine.js'

const ENC = 'encounter.opening.orphanage'
/** Deployed out of roster order, on purpose: row i must be deployed[i], whatever the roster's order. */
const DEPLOY = ['hero.base.warrior-iron', 'hero.base.priest-armored', 'hero.base.ranger-aggressive']

/** The fixture's Engagement, re-pointed at the Orphanage: its id and map are the encounter's; the encounter owns the enemies. */
function atOrphanage() {
  const ctx = loadFixture((c) => {
    const e = c.cursor.engagement!
    c.cursor.engagement = { ...e, id: ENC, mapId: encounterDef(ENC).mapId!, enemies: [] }
  })
  toEquip(ctx, DEPLOY)
  performAdvancePrep(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('battle')
  expect(ctx.campaign.cursor.engagement!.deployed).toEqual(DEPLOY)
  return ctx
}

const enters = (events: readonly Event[]) => events.filter((e) => e.type === 'unit.enter')
/** The rows the fold names that are not the roster's. */
const extras = (r: EngagementResult) => r.units.filter((u) => (u as { role?: string }).role !== undefined)

/** Every roster hero row is the engine unit its uid names, and that unit is deployed[index]'s. */
function rosterKeyed(r: EngagementResult, battle: Battle, uids: readonly number[], deployed: readonly string[], unitTypeOf: (id: string) => string) {
  const roster = r.units.filter((u) => u.side === 'hero' && (u as { role?: string }).role === undefined)
  expect(roster.map((u) => u.index)).toEqual(deployed.map((_, i) => i))
  for (const row of roster) {
    const uid = (row as { uid?: number }).uid
    expect(uid).toBe(uids[row.index])
    const unit = battle.state.units.find((u) => u.uid === uid)!
    expect(row.typeId).toBe(unit.typeId)
    expect(row.typeId).toBe(unitTypeOf(deployed[row.index]!))
    expect(row.name).toBe(unit.name)
    expect(row.lifeState).toBe(unit.lifeState === 'dead' ? 'dead' : unit.lifeState === 'downed' ? 'downed' : 'standing')
  }
}

describe('kingdom.encounter-result-fold — an encounter battle folds by uid and settles once', () => {
  it('an Orphanage battle played in the sandbox folds: civilians and arrivals are their own rows, never the roster', () => {
    const ctx = atOrphanage()
    const e = ctx.campaign.cursor.engagement!
    // Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the
    // hero forward to the end of the bridge and bring the zombie left, maybe 3 squares. So that conflict is much faster."):
    // the sandbox was
    //   const s = createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: …, enemies: [], seed: e.seed, encounterId: ENC })
    // — the battle as fielded; on the old start it ran long enough for the schedule's arrivals to come. On the closer start
    // these three heroes clear the board before more than one arrives, and what this test holds — every arrival is a row
    // of its own — needs the arrivals: the same battle is fielded to see its schedule out (tools/sandbox-sees-schedule.mts,
    // the engine's own fielding switch). The assertions and their counts are unchanged.
    const s = seesScheduleOut(createSandbox({ mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((id) => structuredClone(ctx.campaign.roster[id]!)), enemies: [], seed: e.seed, encounterId: ENC }))
    expect(() => sandboxResult(s)).toThrow(/battle\.end|did not finish/)
    runBattle(s.ctx)
    const r = sandboxResult(s)
    expect(r.id).toBe(ENC)
    // the engine's own identities, handed over explicitly and read back by uid
    const uids = s.setup.heroUids as number[]
    expect(uids).toHaveLength(DEPLOY.length)
    rosterKeyed(r, s.ctx, uids, e.deployed, (id) => ctx.campaign.roster[id]!.unitType)
    // every unit the log entered is one row, keyed by its uid
    const entered = enters(s.ctx.events)
    expect(r.units.map((u) => (u as { uid?: number }).uid).sort((a, b) => a! - b!)).toEqual(entered.map((x) => x['uid'] as number).sort((a, b) => a - b))
    // the civilians: hero-side, the encounter's own, not the roster's
    const civilians = extras(r).filter((u) => u.side === 'hero')
    expect(civilians.map((u) => u.typeId).sort()).toEqual(['hero.fixed.orphans', 'hero.fixed.school-teacher'])
    for (const u of civilians) expect((u as { role?: string }).role).toBe('encounter')
    // the arrivals: every unit that entered after the battle began, each its own row with role 'arrival'
    const late = entered.filter((x) => x.turn > 0)
    expect(late.length).toBeGreaterThanOrEqual(2)
    for (const x of late) {
      const row = r.units.find((u) => (u as { uid?: number }).uid === x['uid'])!
      expect((row as { role?: string }).role).toBe('arrival')
    }
    // an arrival is never a roster hero: the Reckoning names exactly the deployed heroes
    const { reckoning } = decide(ctx, r)
    expect(reckoning.heroes.map((h) => h.heroId)).toEqual(DEPLOY)
  })

  it('reordered, noncontiguous hero uids key the right heroes', () => {
    const ctx = atOrphanage()
    const e = ctx.campaign.cursor.engagement!
    for (const heroUids of [[301, 7, 200], [102, 101, 100], [0, 4000000000, 55]]) {
      const spec = makeBattleState(ctx.campaign.roster, { ...e, heroUids })
      expect(spec.heroUids).toEqual(heroUids)
      // (Law 10, 2026-10-04, as above: was createBattle({ ...battleOptionsOf(spec), encounter: encounterDef(ENC) }) — fielded to see the schedule out)
      const battle = createBattle({ ...battleOptionsOf(spec), encounter: encounterDef(ENC), cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0])
      runBattle(battle)
      const r = makeBattleResult(spec, battle.events)
      rosterKeyed(r, battle, heroUids, e.deployed, (id) => ctx.campaign.roster[id]!.unitType)
      expect(extras(r).length).toBeGreaterThanOrEqual(4)
      for (const u of extras(r)) expect(heroUids).not.toContain((u as { uid?: number }).uid)
      const { reckoning } = decide(atOrphanage(), r)
      expect(reckoning.heroes.map((h) => h.heroId)).toEqual(DEPLOY)
    }
  })

  it('kills by and of the encounter\'s units are credited like any other opposing unit', () => {
    const ctx = atOrphanage()
    const e = ctx.campaign.cursor.engagement!
    const spec = makeBattleState(ctx.campaign.roster, e)
    const battle = createBattle({ ...battleOptionsOf(spec), encounter: encounterDef(ENC) })
    runBattle(battle)
    const r = makeBattleResult(spec, battle.events)
    // independently from the log: each opposing death to zero is credited to whoever last brought it to zero
    const sideOf = new Map(enters(battle.events).map((x) => [x.actor!, x['side'] as string]))
    const last = new Map<number, number | null>()
    const want = new Map<number, number>()
    for (const x of battle.events) {
      if (x.type === 'damage.applied' && (x['hpAfter'] as number) <= 0) last.set(x.target!, x.actor)
      if ((x.type === 'life.dead' || x.type === 'life.downed') && x['reason'] === 'hp0') {
        const by = last.get(x.target!)
        if (by !== null && by !== undefined && sideOf.get(by) !== undefined && sideOf.get(by) !== sideOf.get(x.target!)) want.set(by, (want.get(by) ?? 0) + 1)
      }
    }
    expect([...want.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    for (const u of r.units) expect(u.kills).toBe(want.get(u.unitId) ?? 0)
  })

  it('the Deathbed\'s two ways past "downed": a Wounded hero dies outright, a hero stands again Wounded — both reach the wound', () => {
    // fielded Wounded (badge.wounded, SWITCHES sandboxWoundFielded), zero is death with no bleed-out and no life.downed
    const { result: died, events } = resolveEngagement({ id: 'test.fold.wounded-dies', mapId: 'map.open', heroes: ['test-dusk-hawk'], enemies: Array.from({ length: 8 }, () => 'test-zombie'), seed: 0, heroBadges: [['badge.wounded']] })
    expect(events.some((x) => x.type === 'life.dead' && x['reason'] === 'wounded')).toBe(true)
    expect(events.some((x) => x.type === 'life.downed')).toBe(false)
    expect(died.units[0]).toMatchObject({ lifeState: 'dead', dead: true, downed: true })
    expect(() => validateResult(died)).not.toThrow()
    // stood again at the Deathbed: never downed, but Wounded in the battle — the Reckoning's plain wound, as for one who went down
    const { result: stood, events: ev2 } = resolveEngagement({ id: 'test.fold.stood', mapId: 'map.open', heroes: ['test-oathblade', 'test-sky-pirate', 'test-dusk-hawk', 'test-air-mage', 'test-lucius', 'test-osric'], enemies: ['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie-burning'], seed: 0 })
    const up = ev2.filter((x) => x.type === 'deathbed.stood').map((x) => x.target)
    expect(up.length).toBeGreaterThan(0)
    for (const u of stood.units) expect(u.stood === true).toBe(up.includes(u.unitId))
    const ctx = atOrphanage()
    const e = ctx.campaign.cursor.engagement!
    const battle = createBattle({ ...battleOptionsOf(makeBattleState(ctx.campaign.roster, e)), encounter: encounterDef(ENC) })
    runBattle(battle)
    const r = makeBattleResult(makeBattleState(ctx.campaign.roster, e), battle.events)
    const first = r.units.find((u) => u.side === 'hero' && u.index === 0)!
    const set = { ...r, units: r.units.map((u) => (u === first ? { ...u, lifeState: 'standing' as const, downed: false, dead: false, stood: true as const } : u)) }
    expect(validateResult(set)).toBe(set)
    const { reckoning } = decide(ctx, set)
    expect(reckoning.heroes[0]).toMatchObject({ heroId: DEPLOY[0], wound: 1, dead: false })
  })

  it('applying the result writes each deployed hero exactly once, and a second apply is refused', () => {
    const ctx = atOrphanage()
    const e = ctx.campaign.cursor.engagement!
    const before = structuredClone(ctx.campaign.roster)
    const spec = makeBattleState(ctx.campaign.roster, { ...e, heroUids: [301, 7, 200] })
    const battle = createBattle({ ...battleOptionsOf(spec), encounter: encounterDef(ENC) })
    runBattle(battle)
    const r = makeBattleResult(spec, battle.events)
    const { result, reckoning } = decide(ctx, r)
    const from = ctx.events.length
    applyBattleResult(ctx, e, result, reckoning)
    const wrote = ctx.events.slice(from)
    for (const h of reckoning.heroes) {
      const hero = ctx.campaign.roster[h.heroId]!
      for (const type of ['xp.gained', 'hero.wounded', 'hero.died']) expect(wrote.filter((x) => x.type === type && x['heroId'] === h.heroId).length).toBeLessThanOrEqual(1)
      if (h.dead) { expect(hero.lifeState).toBe('dead'); continue }
      expect(hero.xp).toBe(before[h.heroId]!.xp + h.xp)
      expect(hero.wound).toBe(h.wound)
    }
    // nobody but the deployed heroes was written: the civilians and arrivals never reach the roster
    for (const x of wrote.filter((x) => ['xp.gained', 'hero.wounded', 'hero.died'].includes(x.type))) expect(DEPLOY).toContain(x['heroId'])
    expect(Object.keys(ctx.campaign.roster).sort()).toEqual(Object.keys(before).sort())
    // a second apply is refused, and writes nothing
    const snapshot = saveOf(ctx.campaign)
    expect(() => applyBattleResult(ctx, e, result, reckoning)).toThrow(/refused/)
    expect(saveOf(ctx.campaign)).toBe(snapshot)
  })
})
