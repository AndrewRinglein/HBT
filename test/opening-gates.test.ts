// encounter.opening.gates (2026-10-01): battle 5 of the opening, the Curse (DECISIONS.md 2026-09-28
// "Gates is the Curse" and "Gates' curse strikes fall like the meteors; no Gates turn limit"): two
// Bruiser Demons, two Poison Imps, a Powerful Imp and the Lieutenant Demon in position at the gate; the
// curse strike on Turn 4 (encounter.area-fall's shape: 7 areas marked at the end of Turn 4's Enemy
// Phase, landing after Turn 5's Player Phase — 3 Weak, cursed ground); an Imp from each end on Turn 7.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { setLifeState } from '../src/core/mutate.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { layerOfId } from '../src/content/maps.js'
import { arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-gates', ENC = 'encounter.opening.gates', FALL = 'trigger.gates.curse-strike'
// Replicate 3: the curse lands on a hero and the battle runs past Turn 7, so both Imps arrive.
// No replicate is won untouched on the party drafted by battle 5 (0 of 200, 2026-10-01 — the 2026-09-29
// count "Gates 0" before the upgrades, DECISIONS.md "the battles might be too hard").
// Law 10, fix.opening-levels (2026-10-02): the Flaming Longsword goes only to a Warrior or a Paladin (Andrew 2026-09-28: "it only
// is going to help the paladin or the warrior"), so replicate 7's sword moved from its Rogue to its Paladin and that battle's
// curse lands on nobody (0 hit; replicates 0-39 searched). Replicate 3 is the first whose curse lands on a hero and runs past Turn 7.
// was: const SEEN = 7
// Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "One, yes." — a party of 1, 2, 3, 4, 5, 6): the Gates fields five heroes, not six, so every replicate is another battle; replicate 3's curse now lands
// on nobody (0 hit). Replicate 6 is the first of replicates 0-11 whose curse lands on a unit and which runs past Turn 7
// (looked at, as in 2026-10-02's note above; no battle here is asked to be won). The claims below are unchanged.
// was: const SEEN = 3
// was: const SEEN = 6 (this copy, fix.opening-probe-cadence)
// … AND, on master the same day (the two notes kept side by side when the trees were combined, 2026-10-04):
// Law 10, 2026-10-04 — capability.counterattack-and-fend (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons'): a paladin's Longsword
// carries Counterattack and the computer uses it, so replicate 3's fight re-times and its curse lands on nobody (0 hit;
// replicates 0-39 read again, as on 2026-10-02). Replicate 1 is the first whose curse lands on a unit and runs past Turn 7.
// Nothing here asks who wins.
// was: const SEEN = 3
// was: const SEEN = 1 (master, capability.counterattack-and-fend)
// Law 10, combine 2026-10-04 (GBH SWITCHES combine.mergeMainFirst): with BOTH changes — five heroes at the Gates and the Longsword's
// Counterattack — every replicate is another battle again. Replicates read from 0 upward on the combined tree, as the notes above did:
// replicate 6 is the first whose curse lands on a unit and which runs past Turn 7. Nothing here asks who wins.
// was: const SEEN = 6
// Law 10, 2026-10-05 — content.hero-origin-badges (DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …':
// "3, yes."): each base hero is fielded with its origin badges (the Raven and the Pyre Witch 2 Health fewer and 20 Dodge more,
// the Iron Dwarf 2 Health more, …), so every replicate is another battle; replicate 6's curse now lands on nobody (0 hit).
// Replicates read from 0 upward, as the notes above did: none of 0 to 20 has a curse that lands on a unit; replicate 21 is the
// first whose curse lands on a unit and which runs past Turn 7 (both Imps arrive). Nothing here asks who wins.
const SEEN = 21
describe('encounter.opening.gates', () => {
  it('fields the six defenders at the Ground Check\'s markers and carries the curse strike with the ruled numbers', () => {
    const e = encounterDef(ENC)
    expect(e.setup.map((p) => [p.unit, p.count ?? 1])).toEqual([
      ['unit.bruiser-demon', 2], ['unit.poison-imp', 2], ['unit.powerful-imp', 1], ['unit.lieutenant-demon', 1]])
    expect(e.falls!.map((f) => [f.id, f.turn, f.areas, f.layer, f.damage ?? null, f.applies]))
      .toEqual([[FALL, 4, 7, 'layer.weak', null, [['status.weak', 3]]]])
  })
  it('has no turn limit', () => expect(encounterDef(ENC).loseAfter).toBeUndefined())
  it('runs deterministically on its map', () => deterministic(S))
  it('one Imp arrives on Turn 7 from the top (the abbey end) and one from the bottom (behind the heroes)', () => {
    const ctx = openingBattle(S, SEEN, true)
    arrivedAt(ctx, 7, 'unit.imp', 10, 0)
    arrivedAt(ctx, 7, 'unit.imp', 10, 49)
  })
  it('the curse areas mark on Turn 4 and land at the end of Turn 5\'s Player Phase, cursing every hex and giving 3 Weak to every unit in them', () => {
    const ctx = openingBattle(S, SEEN, true)
    const marked = ctx.events.find((e) => e.type === 'area.marked')!, landed = ctx.events.find((e) => e.type === 'area.landed')!
    expect([marked.causeId, marked['turn'], landed['turn']]).toEqual([FALL, 4, 5])
    const hexes = [...new Set((landed['areas'] as number[][]).flat())]
    for (const h of hexes) expect(ctx.events.some((e) => e.type === 'layer.painted' && e.causeId === FALL && e['hex'] === h && e['layer'] === layerOfId('layer.weak'))).toBe(true)
    const hit = landed['hit'] as number[]
    expect(hit.length).toBeGreaterThan(0)
    for (const id of hit) expect(ctx.events.some((e) => e.type === 'status.applied' && e.causeId === FALL && e['target'] === id && e['statusId'] === 'status.weak' && e['amount'] === 3)).toBe(true)
  })
  it('is won when the last enemy dies, Turn 7\'s Imps included', () => {
    // Five of the six defenders are struck down at setup so the drafted party can finish the fight;
    // what is under test is the encounter's victory (clear the map, no limit), not its difficulty.
    const ctx = createBattle({ ...scenarioOptions(scenarioDef(S), 1), replicate: 1, cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0])
    const enemies = ctx.state.units.filter((u) => u.side === 'enemy')
    for (const u of enemies.filter((u) => u !== enemies.find((x) => x.typeId === 'unit.poison-imp'))) { u.hp = 0; setLifeState(ctx, u.id, 'dead', 'test', { reason: 'hp0' }) }
    runBattle(ctx)
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.turn).toBeGreaterThanOrEqual(7)
    const all = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(all.filter((u) => u.typeId === 'unit.imp')).toHaveLength(2)
    expect(all.every((u) => u.lifeState !== 'standing')).toBe(true)
  })
})
