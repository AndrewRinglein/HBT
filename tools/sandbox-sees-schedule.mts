// A sandbox battle fielded to SEE ITS SCHEDULE OUT — for a probe or a test whose subject needs the encounter's later
// arrivals or more than a Turn of play, on a battle its heroes would otherwise clear at once.
//
// fix.opening-orphanage-closer-start (engine, 2026-10-04; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the hero
// forward to the end of the bridge and bring the zombie left, maybe 3 squares. So that conflict is much faster."): on the
// closer start three heroes kill the Orphanage's one starting Zombie in the first Turn or two, and the battle ends there,
// won ("Battle ends when there are no enemies remaining", 2026-09-03) — before any scheduled arrival and before there is a
// second Player Phase to look at. The engine has a fielding switch for exactly this, which its own opening probes use
// (engine test/opening-helpers.ts openingBattle): boardClearWaitsForSchedule — a cleared board waits for the schedule.
// This returns the same sandbox — the same config, the same setup — with that switch on its battle: a fielding choice for
// the probe, never the rule and never the page's (the page fields the battle as the player plays it).
import { createBattle, type BattleOptions } from '../src/engine.js'
import { playerPolicy, type Sandbox } from '../src/core/sandbox.js'

export function seesScheduleOut<T extends Sandbox>(s: T): T {
  const cfg = { ...(s.setup.cfg ?? {}), switches: { ...((s.setup.cfg as { switches?: object } | undefined)?.switches ?? {}), boardClearWaitsForSchedule: true } }
  const setup = { ...s.setup, cfg } as BattleOptions, ctx = createBattle(setup)
  return { ...s, setup, ctx, policy: playerPolicy(ctx) }
}
