// sim.coverage (2026-09-25): a sweep reports WHAT IT NEVER TOUCHED.
//
// The report is a measurement read from the finished event log (src/sim/coverage.ts,
// beside score.ts). These scenarios run it over the STANDARD battle — the same
// createBattle the sweep and the control battles use — rather than a hand-built log,
// and check it against an independent oracle: an id granted to a fielded unit is
// "used" exactly when some non-setup line of the log names it.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { coverage, mergeCoverage, renderCoverage } from '../src/sim/coverage.js'
import { runSweep } from '../src/sim/sweep.js'
import type { Ctx, Event } from '../src/core/types.js'

const REPLICATES = 3
const SETUP = new Set(['unit.enter', 'unit.equipped', 'unit.badged', 'map.loaded'])

const standard = (replicate: number) => { const ctx = createBattle({ replicate, strict: true }); runBattle(ctx); return ctx }

/** Every string value anywhere in an event, nested included. */
const strings = (v: unknown, out: Set<string>) => {
  if (typeof v === 'string') out.add(v)
  else if (Array.isArray(v)) for (const x of v) strings(x, out)
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out)
}

/** The oracle: granted, registered action and trigger ids, split by whether the play (not the setup) names them. */
function oracle(ctx: Ctx): { reachable: Set<string>; unused: Set<string> } {
  const named = new Set<string>()
  for (const e of ctx.events) if (!SETUP.has(e.type)) strings(e, named)
  const reachable = new Set<string>()
  for (const u of ctx.state.units) {
    for (const id of u.actions) if (ctx.actions[id]) reachable.add(id)
    for (const t of u.triggers) reachable.add(t.id)
  }
  return { reachable, unused: new Set([...reachable].filter((id) => !named.has(id))) }
}

const actionAndTrigger = (ids: readonly string[], ctx: Ctx) => {
  const kinds = new Set<string>()
  for (const u of ctx.state.units) { for (const id of u.actions) kinds.add(id); for (const t of u.triggers) kinds.add(t.id) }
  return ids.filter((id) => kinds.has(id))
}

describe('sim.coverage over the standard battle', () => {
  it('names the reachable content the standard battle never used, matching the log exactly, with an integer percent', () => {
    let anyUnused = 0
    for (let r = 0; r < REPLICATES; r++) {
      const ctx = standard(r)
      const c = coverage(ctx)
      const o = oracle(ctx)
      const reach = c.slices.filter((s) => s.kind === 'action' || s.kind === 'trigger')
      expect(reach.flatMap((s) => s.reachable).sort()).toEqual([...o.reachable].sort())
      expect(reach.flatMap((s) => s.unused).sort()).toEqual([...o.unused].sort())
      expect(actionAndTrigger(c.blind, ctx).sort()).toEqual([...o.unused].sort())
      anyUnused += o.unused.size
      // The mage's staff content (the power.mage.bolt class, carried today by the
      // lightning staff) is reachable, so the report classifies it one way or the other.
      const mage = ctx.state.units.find((u) => u.actions.some((a) => a.startsWith('attack.lightning-staff.')))!
      expect(mage).toBeDefined()
      for (const id of mage.actions.filter((a) => ctx.actions[a])) expect(c.slices.find((s) => s.kind === 'action')!.reachable).toContain(id)
      expect(Number.isInteger(c.percent)).toBe(true)
      expect(c.percent).toBe(Math.round((c.exercised * 100) / c.reachable))
      expect(c.percent).toBeLessThan(100)
      expect(renderCoverage(c)).toContain('NEVER USED')
    }
    expect(anyUnused).toBeGreaterThan(0)
  })

  it('reports zero unused and 100% when every reachable id fired', () => {
    const ctx = standard(0)
    const blind = coverage(ctx)
    expect(blind.blind.length).toBeGreaterThan(0)
    const at = ctx.events.length
    const synth = (fields: Record<string, unknown>) => ({ seq: at, turn: 99, phase: 'hero', causeId: 'test', ...fields }) as Event
    const extra: Event[] = []
    for (const s of blind.slices) for (const id of s.unused) {
      if (s.kind === 'action') extra.push(synth({ type: 'action.spent', actionId: id }))
      else if (s.kind === 'trigger') extra.push(synth({ type: 'trigger.rolled', source: id }))
      else if (s.kind === 'terrain') extra.push(synth({ type: 'moved', terrain: id }))
      else throw new Error(`unexpected coverage kind ${s.kind}`)
    }
    const full = coverage(ctx, [...ctx.events, ...extra])
    expect(full.blind).toEqual([])
    expect(full.percent).toBe(100)
    expect(full.exercised).toBe(full.reachable)
    expect(renderCoverage(full)).toContain('everything the roster could reach was used')
    // Merged over a sweep, one battle that used everything clears the blind one.
    expect(mergeCoverage([blind, full]).blind).toEqual([])
  })

  it('a sweep carries the merged report when asked, and none when not', () => {
    const on = runSweep(REPLICATES, { coverage: true })
    const off = runSweep(REPLICATES)
    expect(off.coverage).toBeNull()
    expect(on.coverage).not.toBeNull()
    const merged = mergeCoverage(Array.from({ length: REPLICATES }, (_, r) => coverage(standard(r))))
    expect(on.coverage).toEqual(merged)
    expect(on.coverage!.blind.length).toBeGreaterThan(0)
  })

  it('the battle is byte-identical with the report on or off', () => {
    const on = runSweep(REPLICATES, { coverage: true, keepLogs: true })
    const off = runSweep(REPLICATES, { keepLogs: true })
    expect(on.logs.length).toBe(REPLICATES)
    expect(on.logs).toEqual(off.logs)
    expect(on.boards).toEqual(off.boards)
    for (let r = 0; r < REPLICATES; r++) expect(on.logs[r]).toBe(JSON.stringify(standard(r).events))
    // Asked for after EVERY activation, mid-battle, the report still changes nothing.
    const watched = createBattle({ replicate: 0, strict: true })
    let asked = 0
    while (true) {
      const next = advanceBattle(watched)
      if (next.kind === 'complete') break
      runActivation(watched, next.actor)
      coverage(watched); asked++
      completeActionCycle(watched)
    }
    expect(asked).toBeGreaterThan(0)
    expect(JSON.stringify(watched.events)).toBe(on.logs[0])
  })

  it('is never reachable from src/core (nor from content or the AI)', () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
      .flatMap((d) => d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : [])
    for (const root of ['src/core', 'src/content', 'src/ai']) {
      for (const f of walk(root)) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from\s+['"][^'"]*\/sim\//)
    }
  })
})
