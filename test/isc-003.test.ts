// ISC-003 — a battle runs from campaign facts to a result with no change to
// engine/src: the kingdom reaches the engine only through src/engine.ts, and the
// battle it gets back was run by the engine's own runBattle.
// THIN-SLICE-IMPLEMENTATION.md §4.1 · §4.5 · Constitution Law 5

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { resolveEngagement, battleOptionsOf, type EngagementSpec } from '../src/core/seam.js'

const SPEC: EngagementSpec = {
  id: 'test.seam.door',
  mapId: 'map.open',
  heroes: ['test-oathblade', 'test-osric'],
  enemies: ['test-zombie', 'test-zombie'],
  seed: 3,
}

function sources(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) sources(p, out); else if (/\.ts$/.test(f)) out.push(p)
  }
  return out
}

describe('ISC-003 — the engine is reached through one door and never changed', () => {
  it('src/engine.ts is the only kingdom file that imports an engine path', () => {
    const files = sources('src').map((p) => p.replace(/\\/g, '/'))
    expect(files).toContain('src/engine.ts')
    const importers = files.filter((f) => /from\s+['"][^'"]*\/engine\/[^'"]*['"]/.test(readFileSync(f, 'utf8')))
    expect(importers).toEqual(['src/engine.ts'])
    // and the door opens only onto the engine's public surface, not its mutators
    const door = readFileSync('src/engine.ts', 'utf8')
    expect(door).not.toMatch(/core\/mutate/)
    expect(door).not.toMatch(/core\/pipeline/)
  })

  it('the options are the engine\'s own BattleOptions, and the battle was run by its runBattle', () => {
    const opts = battleOptionsOf(SPEC)
    expect(opts.scenarioId).toBe(SPEC.id)
    expect(opts.replicate).toBe(SPEC.seed)
    expect(opts.heroes).toEqual(SPEC.heroes)
    expect(opts.enemies).toEqual(SPEC.enemies)
    expect(opts.enemyCount).toBe(SPEC.enemies.length)
    const { result, events } = resolveEngagement(SPEC)
    // The engine's own vocabulary brackets the log — one battle.begin, one
    // battle.end carrying the outcome — and the cause is the engine, not the
    // kingdom. (battle.end is not the LAST event: the phase-end ladder finishes
    // emitting after the victory check sets the outcome. Found 2026-09-01 by
    // this probe's first green run; the assertion was corrected, not weakened —
    // what it now asserts is that nothing is damaged after the battle has ended.)
    const begins = events.filter((e) => e.type === 'battle.begin')
    const ends = events.filter((e) => e.type === 'battle.end')
    expect(begins.length).toBe(1)
    expect(begins[0]?.causeId).toBe('engine')
    expect(ends.length).toBe(1)
    expect(ends[0]?.['outcome']).toBe(result.outcome)
    const endSeq = ends[0]!.seq
    expect(events.filter((e) => e.seq > endSeq && (e.type === 'damage.applied' || e.type.startsWith('life.')))).toEqual([])
    expect(events.find((e) => e.type === 'map.loaded')?.['scenarioId']).toBe(SPEC.id)
    // The same spec resolves to the same result — a named seed, never a clock (Law 4).
    expect(resolveEngagement(SPEC).result).toEqual(result)
  })
})
