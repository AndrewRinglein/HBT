// encounter.opening.* (2026-09-28): what every opening battle's probe needs — field the kingdom's
// fielding (the scenario `test.opening-<key>`), run it, read the arrivals back out of the log.
import { expect } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'

/**
 * Ruled 2026-09-03 (DECISIONS.md, "the retroactive questions"): "Battle ends when there are no
 * enemies remaining, so victory can be achieved early." A probe that must SEE a late arrival turns
 * on `boardClearWaitsForSchedule` for that run — a fielding choice, not the rule.
 */
export function openingBattle(scenario: string, replicate = 0, waitForSchedule = false): Ctx {
  const opts = scenarioOptions(scenarioDef(scenario))
  const ctx = createBattle({ ...opts, replicate, ...(waitForSchedule ? { cfg: { switches: { boardClearWaitsForSchedule: true } } } : {}) } as Parameters<typeof createBattle>[0])
  runBattle(ctx)
  return ctx
}
/** Every mid-battle arrival: [Turn, typeId, hex], in log order. */
export const arrivals = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'unit.enter' && e.turn > 0).map((e) => [e.turn, e['typeId'], e['hex']] as const)
/** The hex a placement asked for, or where the log says it was shunted to. */
export function arrivedAt(ctx: Ctx, turn: number, typeId: string, col: number, row: number): void {
  const want = row * ctx.geo.board.width + col
  const got = arrivals(ctx).filter(([t, u]) => t === turn && u === typeId).map(([, , h]) => h)
  const shunted = ctx.events.filter((e) => e.type === 'unit.shunted' && e.turn === turn).map((e) => e['to'] ?? e['hex'])
  expect(got.includes(want) || got.some((h) => shunted.includes(h)), `${typeId} on Turn ${turn} at (${col},${row}) — got ${JSON.stringify(got)}`).toBe(true)
}
export const deterministic = (scenario: string) => {
  const a = openingBattle(scenario), b = openingBattle(scenario)
  expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events))
}
