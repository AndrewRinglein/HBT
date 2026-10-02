import { previewBurst } from '../src/core/burst.js'
// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// The Critical Injury Chart — station.crit (2026-08-27).
//
// Dictated in full (DECISIONS.md 2026-08-27): two rolls from named streams
// (cup.crit-branch, cup.crit-effect); normal damage always lands first; the
// damage arm is +50% before Armor/Resist/Protection (the DMG.CRIT station);
// the chart arm rolls evenly among ten battle-only injuries. The branch split
// carries critChartSplit's answer (Angela 2026-08-22): chart share 25 against
// heroes, 50 against enemies. Chance = 3 + unit Crit + weapon crit + surplus
// accuracy − target Luck.
import { describe, expect, it } from 'vitest'
import { preview, CRIT_BASE } from '../src/core/pipeline.js'
import { rollCritEffect } from '../src/core/crit.js'
import { rollBelow } from '../src/core/rng.js'
import { effective } from '../src/core/stats.js'
import { ATTACKS, CRIT_CHART, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { canUsePower } from '../src/core/ability.js'

const KEYS = ['blinded', 'leg-crippled', 'arm-crippled', 'bleeding', 'dazed',
  'stunned', 'knocked-sprawling', 'winded', 'guard-broken', 'nerve-struck']

const rig = (heroes: string[], heroHexes: number[], enemies: string[], enemyHexes: number[]) =>
  createBattle({ ...scenarioOptions(scenarioDef('showcase.alpha-team')), heroes, heroHexes, enemies, enemyHexes, enemyCount: enemies.length })

const rowOf = (key: string) => CRIT_CHART.find((r) => r.key === key)!

describe('the chart arrives as ruled data', () => {
  it('all ten dictated rows, by stable key, in the pack', () => {
    expect(CRIT_CHART.map((r) => r.key)).toEqual(KEYS)
    // spot checks straight off the dictation
    // Law 10 rewrite 2026-09-02: the dictation said "gain 5 Bleed" while Bleed
    // was a duration; content S41 (adb627b, ruled verbatim "Bleed is being
    // converted to magnitude damage") re-mapped every Bleed magnitude, and the
    // chart row became "gain 4 Bleed" in settled.json. The Codex owns that
    // number, so the test asserts the SHAPE (a Bleed status with a positive
    // magnitude) and lets the pack carry whatever the Codex says.
    // Law 10, fix.one-effect-vocabulary (2026-10-01): the one effect union renames the kind (status -> status.apply); the assertion is unchanged.
    expect(rowOf('bleeding').effects).toEqual([{ kind: 'status.apply', statusId: 'status.bleed', value: expect.any(Number) }])
    expect((rowOf('bleeding').effects[0] as { value: number }).value).toBeGreaterThan(0)
    // fix.dazed-split (2026-09-02): the chart's Dazed ROW applies
    // status.powers-locked — the Dazed STATUS is a different thing (Andrew:
    // "there is a critical effect, and then there is a status effect").
    // Law 10, fix.one-effect-vocabulary (2026-10-01): the one effect union renames the kind (status, loseStamina, push -> status.apply, stamina.drain, knockback); the assertion is unchanged.
    expect(rowOf('dazed').effects).toEqual([{ kind: 'status.apply', statusId: 'status.powers-locked', value: 3 }])
    expect(rowOf('nerve-struck').effects).toEqual([{ kind: 'loseMaxHp', value: 2 }])
    expect(rowOf('winded').effects).toEqual([{ kind: 'stamina.drain', value: 4 }])
    // floors only where dictated
    for (const e of rowOf('guard-broken').effects) expect((e as { floor?: number }).floor).toBe(0)
    expect(rowOf('knocked-sprawling').effects.some((e) => e.kind === 'knockback')).toBe(true)
  })

  it('the crit fields and unit crit/luck came through the pipeline', () => {
    expect(ATTACKS['attack.dagger.stab']!.attack.crit).toBe(5)
    // Law 10 rewrite 2026-10-01 (fix.codex-numbers; DECISIONS.md 2026-09-28 "the duplication review,
    // ruled", finding C1, Andrew: "Crit base 3 should be counted once."): the Codex authors crit as a
    // TOTAL (the Bloodhound 10, the Orphan Child 20) and the engine adds its own base 3, so this file
    // locked in a double count — a total of 13 and 23. The pack now carries total − CRIT_BASE, and the
    // row is asserted as that difference, read off the engine's base rather than retyped.
    expect(UNITS['unit.bloodhound']!.crit).toBe(10 - CRIT_BASE)
    expect(UNITS['unit.bruiser-demon']!.luck).toBe(5)
    expect(UNITS['hero.fixed.orphans']!.crit).toBe(20 - CRIT_BASE)
  })
})

describe('the chance — 3 + crit stat + gear + surplus − luck', () => {
  it('preview shows the formula, floor 0', () => {
    const ctx = rig(['alpha-sky-pirate'], [135], ['unit.zombie', 'unit.bruiser-demon'], [118, 120])
    const pirate = ctx.state.units.find((u) => u.typeId === 'alpha-sky-pirate')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    const bruiser = ctx.state.units.find((u) => u.typeId === 'unit.bruiser-demon')!
    // 3 base + the pirate's own Crit stat (his copyOf source authors one) +
    // the dagger's 5, no surplus (acc 78 < 100), zombie luck 0
    expect(preview(ctx, pirate.id, z.id, 'attack.dagger.stab').critChance).toBe(3 + pirate.crit + 5)
    // the bruiser's Luck 5 eats the same chance down by exactly 5
    expect(preview(ctx, pirate.id, bruiser.id, 'attack.dagger.stab').critChance).toBe(3 + pirate.crit + 5 - 5)
  })

  it('an area attack still cannot crit at all', () => {
    const ctx = rig(['alpha-oathblade'], [135], ['unit.zombie', 'unit.zombie'], [118, 119])
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.hex === 118)!
    expect(previewBurst(ctx, oath.id, z.hex, 'attack.halberd.cleave')).not.toHaveProperty('critChance')
  })
})

describe('rollCritEffect — each row does exactly what it says', () => {
  const scripted = () => {
    const ctx = rig(['alpha-oathblade'], [135], ['unit.zombie'], [118])
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    return { ctx, oath, z }
  }

  it('rolls a key from the chart and every emitted line names it', () => {
    const { ctx, oath, z } = scripted()
    const key = rollCritEffect(ctx, oath.id, z.id, 1, 'attack.halberd.hack')
    expect(KEYS).toContain(key)
    const ev = ctx.events.find((e) => e.type === 'crit.effect')!
    expect(ev['key']).toBe(key)
    expect(ev.causeId).toBe('attack.halberd.hack')
  })

  it('guard-broken floors at 0 — the zombie has no armor to lose, dodge stays 0', () => {
    // Apply the ROW deterministically by seeking the seed-independent path:
    // the row application is pure given the row, so test the effects directly
    // via a chart of one. Chart rows are ctx data, so a scripted ctx may
    // narrow it — that is a TEST fielding, not a content change.
    const { ctx, oath, z } = scripted()
    ;(ctx as { critChart: typeof CRIT_CHART }).critChart = [rowOf('guard-broken')]
    rollCritEffect(ctx, oath.id, z.id, 1, 'attack.halberd.hack')
    // zombie armor 0, resist 0, dodge 0 — "all to a minimum of 0": no mod
    // may push any of them negative.
    expect(effective(ctx, z, 'armor').value).toBe(0)
    expect(effective(ctx, z, 'resist').value).toBe(0)
    expect(effective(ctx, z, 'dodge').value).toBe(0)
  })

  it('winded drains to the floor and nerve-struck cuts the ceiling', () => {
    const ctx = rig(['alpha-oathblade', 'alpha-osric'], [135, 134], ['unit.zombie'], [118])
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const osric = ctx.state.units.find((u) => u.typeId === 'alpha-osric')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    ;(ctx as { critChart: typeof CRIT_CHART }).critChart = [rowOf('winded')]
    osric.stamina = 2
    rollCritEffect(ctx, z.id, osric.id, 1, 'attack.zombie.bite')
    expect(osric.stamina, '"lose 4 Stamina, to a minimum of 0"').toBe(0)
    ;(ctx as { critChart: typeof CRIT_CHART }).critChart = [rowOf('nerve-struck')]
    const maxBefore = oath.maxHp
    rollCritEffect(ctx, z.id, oath.id, 2, 'attack.zombie.bite')
    expect(oath.maxHp, '"−2 Max Health" — and nothing else floors').toBe(maxBefore - 2)
    expect(oath.hp).toBeLessThanOrEqual(oath.maxHp)
  })

  it('dazed locks the powers and only the powers', () => {
    const ctx = rig(['alpha-lucius', 'alpha-oathblade'], [135, 134], ['unit.zombie'], [118])
    const lucius = ctx.state.units.find((u) => u.typeId === 'alpha-lucius')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    ;(ctx as { critChart: typeof CRIT_CHART }).critChart = [rowOf('dazed')]
    oath.hp = 1 // someone to heal
    expect(canUsePower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal')).toBe(true)
    rollCritEffect(ctx, z.id, lucius.id, 1, 'attack.zombie.bite')
    expect(lucius.statuses.find((s) => s.id === 'status.powers-locked')?.value).toBe(3)   // fix.dazed-split 2026-09-02
    expect(canUsePower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal'),
      '"loses access to class powers"').toBe(false)
    beginActivation(ctx, lucius.id, 'test')
    // attacks are NOT locked — only the powers are gone
    expect(ctx.actions['attack.punch']).toBeDefined()
  })

  it('knocked-sprawling pushes directly away and slows', () => {
    const { ctx, oath, z } = scripted()
    ;(ctx as { critChart: typeof CRIT_CHART }).critChart = [rowOf('knocked-sprawling')]
    rollCritEffect(ctx, oath.id, z.id, 1, 'attack.halberd.hack')
    expect(z.hex, '135 -> 118 continues to 102').toBe(102)
    expect(z.statuses.find((s) => s.id === 'status.slow')?.value).toBe(2)
    const knocked = ctx.events.find((e) => e.type === 'knocked')!
    expect(knocked.causeId, 'the chart push names the critting attack').toBe('attack.halberd.hack')
  })
})

describe('the branch flip in real battles — Law 4 streams, weighted coin', () => {
  it('every crit flips exactly one branch; chart arms roll an effect; damage arms carry the CRIT station', () => {
    let crits = 0, chartArms = 0, damageArms = 0
    for (const r of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.alpha-team')), replicate: r })
      runBattle(ctx)
      const branches = ctx.events.filter((e) => e.type === 'crit.branch')
      crits += branches.length
      for (const b of branches) {
        // RE-RULED 2026-08-27 (fix.crit-branch-even, Law 10 — the previous
        // assertion carried the per-side 25/50, now HELD OFF): "a 50% chance
        // of just a damage boost and a 50% chance of one of the effects."
        expect(b['chartShare'], 'the flip is even for everyone').toBe(50)
        if (b['arm'] === 'chart') chartArms++
        else damageArms++
      }
      const effects = ctx.events.filter((e) => e.type === 'crit.effect')
      for (const ef of effects) expect(KEYS).toContain(ef['key'])
      // a chart arm produces an effect unless the strike itself killed
      const deadTargets = new Set(ctx.events.filter((e) => e.type === 'life.dead').map((e) => e.target))
      const chartCount = branches.filter((b) => b['arm'] === 'chart'
        && !deadTargets.has(b.target)).length
      expect(effects.length).toBeGreaterThanOrEqual(Math.min(1, chartCount) === 1 ? 1 : 0)
      // V2 packets: crit records confirmation, including chart-only crits.
      // Keep the damage-arm station assertion; additionally prove each hit's
      // explicit head count matches its actual preceding branch event.
      for (const h of ctx.events.filter((e) => e.type === 'attack.hit' && e['crit'] === true)) {
        const branch=[...branches].reverse().find(b=>b.seq<h.seq&&b.actor===h.actor&&b.target===h.target)!
        expect(branch).toBeDefined()
        expect(h['critHeads']).toBe(branch['arm']==='damage'?1:0)
        expect((h['ledger'] as { station: string }[]).some((l) => l.station === 'CRIT'),
          'only a damage-arm hit shows the CRIT station in its ledger').toBe(branch['arm']==='damage')
      }
    }
    expect(crits, 'crits happen in real battles now — critEnabled is ON').toBeGreaterThan(0)
    expect(chartArms + damageArms).toBe(crits)
    expect(chartArms, 'the chart arm fires across eight seeds').toBeGreaterThan(0)
  })

  it('every chart row is genuinely reachable — the widened key covers the whole chart', () => {
    // RULED 2026-08-27: "we want all of the things that are there, wounded and
    // bleeding, to be capable of being rolled ... all of the effects to have
    // an even chance." Under the old (attacker uid, ordinal) key the
    // 25-replicate panel excluded Winded and Bleeding entirely. The draw now
    // carries the target's uid too; over a modest synthetic universe of
    // (attacker, target, ordinal) triples EVERY row index must appear —
    // 10 x 0.9^400 leaves no room for luck.
    const ctx = rig(['alpha-oathblade'], [135], ['unit.zombie'], [118])
    const seen = new Set<number>()
    for (let atUid = 100; atUid < 110; atUid++) {
      for (let tgUid = 0; tgUid < 8; tgUid++) {
        for (let ord = 1; ord <= 5; ord++) {
          seen.add(rollBelow(ctx.rng, CRIT_CHART.length, 'crit-effect', atUid, tgUid, ord))
        }
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('is a seed — crits and all, the same battle twice is byte-identical', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef('showcase.alpha-team')))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })
})
