// test.receptacle (2026-09-02) — step three of the review plan: test content
// lives in content/test/ and reaches the engine through the same converter
// and the same loader as real content. Andrew: "We're not testing features if
// we're not pulling them from the right way. When you hardcode something, it
// sort of tests the features, but it doesn't really test it all the way."
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BURSTS, ATTACKS, UNITS } from '../src/content/index.js'
import { STATUSES } from '../src/content/statuses.js'
import { packTestAttacks, packTestStatuses, packUnits } from '../src/content/pack.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const TEST_DIR = join(__dirname, '..', '..', 'content', 'test')
const rows = (f: string): { id: string; from?: string; set?: Record<string, unknown>; note: string }[] =>
  JSON.parse(readFileSync(join(TEST_DIR, f), 'utf8'))

describe('the receptacle reaches the engine through the pack', () => {
  it('every row in content/test/ is in the pack, every pack test row is in content/test/, and every row says what it proves', () => {
    const units = rows('units.json'), attacks = rows('attacks.json'), statuses = rows('statuses.json')
    for (const r of [...units, ...attacks, ...statuses]) expect(r.note, `${r.id} carries a note naming its backlog item`).toBeTruthy()
    const test = (UNIT_PACK as unknown as { test: { units: readonly { typeId: string }[]; attacks: Record<string, unknown>; bursts: Record<string, unknown>; statuses: Record<string, unknown> } }).test
    expect(test.units.map((u) => u.typeId).sort()).toEqual(units.map((r) => r.id).sort())
    expect(Object.keys({...test.attacks, ...test.bursts}).filter(id => id.startsWith('attack.')).sort()).toEqual(attacks.map((r) => r.id).sort())
    expect(Object.keys(test.statuses).sort()).toEqual(statuses.map((r) => r.id).sort())
    // and they are LOADED, under the test family only
    for (const r of units) { expect(UNITS[r.id], r.id).toBeDefined(); expect(r.id.startsWith('test-')).toBe(true) }
    for (const r of attacks) { expect(ATTACKS[r.id] ?? BURSTS[r.id], r.id).toBeDefined(); expect(r.id.startsWith('attack.test-')).toBe(true) }
    for (const r of statuses) { expect(STATUSES[r.id], r.id).toBeDefined(); expect(r.id.startsWith('test.status.')).toBe(true) }
  })

  it('the engine hand-types no test status and no test attack any more', () => {
    for (const id of Object.keys(STATUSES)) if (id.startsWith('test.')) expect(packTestStatuses()[id], `${id} must come from content/test/`).toBeDefined()
    for (const id of Object.keys(ATTACKS)) if (id.startsWith('attack.test-')) expect(packTestAttacks()[id], `${id} must come from content/test/`).toBeDefined()
    for (const id of Object.keys(UNITS)) if (id.startsWith('test-') && !(UNITS[id] as { copyOf?: string }).copyOf) {
      expect(packUnits()[id], `${id} is a test body and must come from content/test/`).toBeDefined()
    }
  })

  it('a delta is the real row plus the declared change and nothing else — the Sweep IS the Halberd Cleave at cost 0', () => {
    const sweep = rows('attacks.json').find((r) => r.id === 'attack.test-arc.sweep')!
    expect(sweep.from).toBe('attack.halberd.cleave')
    const base = BURSTS[sweep.from!]!
    const got = BURSTS[sweep.id]!
    const changed = new Set(Object.keys(sweep.set ?? {}))
    for (const k of Object.keys(base) as (keyof typeof base)[]) {
      if (k === 'id' || k === 'name' || changed.has(k)) continue
      expect(got[k], `${sweep.id}.${k} follows the real row`).toEqual(base[k])
    }
    for (const [k, v] of Object.entries(sweep.set ?? {})) expect((got as Record<string, unknown>)[k], `${sweep.id}.${k} is the declared change`).toEqual(v)
    expect(got.burst.shape.kind, 'the shape the delta exists to prove').toBe('arc')
  })

  it('a test body carries its triggers under its own source, in the test family', () => {
    const golem = UNITS['test-arc-golem']!
    expect(golem.triggers!.length).toBeGreaterThan(0)
    for (const t of golem.triggers!) {
      expect(t.source).toBe('unit.test-arc-golem')
      expect(/^(test\.|trigger\.test-)/.test(t.id), t.id).toBe(true)
    }
  })
})

describe('in real battles — the receptacle fields, swings and is struck', () => {
  it('the golem sweeps its arc in showcase.arc-variant without firing its attack-only push', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.arc-variant'))); runBattle(ctx)
    const sweeps = ctx.events.filter((e) => e.type === 'burst.declared' && e.causeId === 'attack.test-arc.sweep')
    expect(sweeps.length).toBeGreaterThan(0)
    expect(sweeps[0]!['shape']).toEqual({kind: 'arc'})
    const first = sweeps[0]!.seq
    const next = ctx.events.findIndex(e => e.seq > first && ['activation.end', 'attack.declared', 'burst.declared'].includes(e.type))
    expect(ctx.events.slice(first, next).some(e => e.type === 'knocked' && e.causeId === 'trigger.test-ram.knockback')).toBe(false) // later ordinary Slam may still push
  })
})
