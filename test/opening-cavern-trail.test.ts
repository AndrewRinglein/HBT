// encounter.opening.cavern-trail (2026-09-28): battle 4 of the opening, the Hunt (DECISIONS.md
// 2026-09-28 "battle 4 (Cavern Trail) is the Hunt", "the meteor fall is the Hunt's"): three
// Bloodhounds and a Hellhound; four Zombie Hounds behind the heroes on Turn 4; a Werewolf out of the
// cave on Turn 7; the meteor fall on Turn 4 (encounter.area-fall's shape: 7 areas marked at the end of
// Turn 4's Enemy Phase, landing after Turn 5's Player Phase — 2 fire, 2 Burn, burning ground).
import { describe, expect, it } from 'vitest'
import { encounterDef } from '../src/content/scenarios.js'
import { layerOfId } from '../src/content/maps.js'
import { arrivedAt, deterministic, openingBattle } from './opening-helpers.js'

const S = 'test.opening-cavern-trail', FALL = 'trigger.cavern-trail.meteor-fall'
// Replicate 1 is a battle the heroes win (replicates 0-9: 4 heroClear, 6 wipe — a real fight).
// fix.opening-party (2026-09-29): on the party drafted by battle 4 (five heroes, not four Alpha heroes)
// replicate 1 is still a win; 7 of 50 are.
// Law 10, fix.starting-kit-powers (2026-10-04; DECISIONS.md 2026-10-03 "reported: the priest's Holy Texts has no heal in
// battle — three starting weapons lose their power on the way into the engine"): the drafted priests and mages field Mercy,
// Flame Burst and Frost Nova now and play them, so every battle that drafts one moves — replicate 1 is a wipe whose meteors
// land on nobody. Replicate 0 is a battle the heroes win with the meteors landing on four units; 19 of replicates 0-49 are
// wins now (7 before: the party is stronger with its whole weapons). The claims below are unchanged.
// was: const WIN = 1
const WIN = 0
describe('encounter.opening.cavern-trail', () => {
  it('carries the meteor fall with the ruled numbers', () => {
    expect(encounterDef('encounter.opening.cavern-trail').falls!.map((f) => [f.id, f.turn, f.areas, f.layer, f.damage, f.damageType, f.applies]))
      .toEqual([[FALL, 4, 7, 'layer.burning', 2, 'fire', [['status.burn', 2]]]])
  })
  it('runs deterministically on its map', () => deterministic(S))
  it('the hounds arrive on Turn 4 behind the heroes and the Werewolf on Turn 7 from the cave', () => {
    const ctx = openingBattle(S, WIN, true)
    for (const row of [4, 5, 6, 7]) arrivedAt(ctx, 4, 'unit.zombie-hound', 0, row)
    arrivedAt(ctx, 7, 'unit.werewolf', 19, 2)
  })
  it('the meteor areas mark on Turn 4 and land at the end of Turn 5\'s Player Phase, burning every hex and hitting the units in them', () => {
    const ctx = openingBattle(S, WIN, true)
    const marked = ctx.events.find((e) => e.type === 'area.marked')!, landed = ctx.events.find((e) => e.type === 'area.landed')!
    expect([marked.causeId, marked['turn'], landed['turn']]).toEqual([FALL, 4, 5])
    const hexes = [...new Set((landed['areas'] as number[][]).flat())]
    for (const h of hexes) expect(ctx.events.some((e) => e.type === 'layer.painted' && e.causeId === FALL && e['hex'] === h && e['layer'] === layerOfId('layer.burning'))).toBe(true)
    const hit = landed['hit'] as number[]
    expect(hit.length).toBeGreaterThan(0)
    for (const id of hit) {
      expect(ctx.events.some((e) => e.type === 'damage.applied' && e.causeId === FALL && e['target'] === id && e['damageType'] === 'fire')).toBe(true)
      expect(ctx.events.some((e) => e.type === 'status.applied' && e.causeId === FALL && e['statusId'] === 'status.burn')).toBe(true)
    }
  })
  // SKIPPED BY NAME, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "One, yes." — a party of 1, 2, 3, 4, 5, 6). Ruled 2026-10-04 (Andrew, DECISIONS.md 'no testing that the battles can be won until these items
  // are done; the page tests play an overpowered party; faster landing'): "A test that exists only to show a battle is
  // winnable by the computer's play is skipped until then, by name, with this entry cited." This one needs a replicate
  // the drafted party wins by the computer's play: replicate 0 was one, and with four heroes at the Cavern Trail (it was
  // five) replicate 0 is a wipe. No seed was searched for. The rule itself — a battle with no `win` of its own ends
  // heroClear when the last enemy is down — is the engine's victory check, tested on its own (test/encounter-runner.test.ts,
  // test/encounter-commands.test.ts). The other tests here keep replicate 0: its meteors still land on units.
  // … AND, on master the same day (kept beside the note above when the two were combined, 2026-10-04):
  // SKIPPED BY NAME 2026-10-04 — Andrew (engine DECISIONS.md 2026-10-04 'no testing that the battles can be won until these
  // items are done; the page tests play an overpowered party; faster landing'): "I'm okay forgoing all testing battle until
  // we're done with all these items." This test's only purpose is to show the computer can win the Cavern Trail with the
  // drafted party on one replicate (WIN). With capability.counterattack-and-fend (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons')
  // a paladin's Longsword carries Counterattack and the computer uses it; that replicate is a wipe now. No seed was searched
  // for. The rule itself — a battle with no `win` of its own ends heroClear when the last enemy is down — is the engine's
  // victory check, tested on its own (test/encounter-runner.test.ts, test/encounter-commands.test.ts).
  // Un-skip when the queued items are done and a winning replicate is recorded again.
  // was: it('is won when the last enemy dies', () => {
  it.skip('is won when the last enemy dies', () => {
    const ctx = openingBattle(S, WIN, true)
    expect(ctx.state.outcome).toBe('heroClear')
    expect(ctx.state.units.filter((u) => u.side === 'enemy').every((u) => u.lifeState !== 'standing')).toBe(true)
  })
})
