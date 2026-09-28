// fix.raise-range (2026-09-28) — ruled 2026-09-27 (Andrew, DECISIONS.md "the
// Necromancer's Raise reaches 10"): "Give the necromancer a raise of 10 range."
// The converter (content/mkenginepack.mjs) compiled corpse.raise with a constant
// radius 2 (SWITCHES.md corpseRaiseRadius, now retired); it reads the Raise
// trigger's own range from the Codex row instead.
//
// Rules, not frozen numbers: every reach below is read from the Codex's own
// bestiary row (content/hbt-content.json), never retyped.
//   (1) every bestiary Raise with a stated range compiles to corpse.raise with
//       exactly that radius; one without a range is a NAMED gap
//       (content/gen/enemy-pack-gaps.json, 'content: range unstated') and
//       compiles to nothing — never a default
//   (2) no compiled corpse.raise carries a radius its row does not state
//   (3) in a scripted battle the Necromancer raises a corpse at exactly its
//       row's reach — beyond the old 2 — and not one a hex further
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { UNITS } from '../src/content/index.js'
import { createCustomBattle } from '../src/core/setup.js'
import { settle } from '../src/core/settle.js'
import { fireTriggers } from '../src/core/trigger.js'
import { GEO16, HEX_COUNT, hexId } from './board16.js'

const RAISE = 'raise a corpse as a Zombie'
type RowEffect = { effect: string; range?: number | null }
type RowTrigger = { hook: string; name?: string; range?: number | null; effects?: RowEffect[] }
type Row = { id: string; triggers?: RowTrigger[] }
const CODEX = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { bestiary: Row[] }
const GAPS = (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')) as
  { gaps: { unit: string; what: string; needs: string }[] }).gaps

type Raiser = { unit: string; reach: unknown }
const RAISERS: Raiser[] = CODEX.bestiary.flatMap((u) => (u.triggers ?? []).flatMap((t) =>
  (t.effects ?? []).filter((e) => e.effect === RAISE).map((e) => ({ unit: u.id, reach: e.range ?? t.range }))))
const stated = (r: Raiser): r is { unit: string; reach: number } => Number.isSafeInteger(r.reach) && (r.reach as number) >= 0
const compiledRaises = (unit: string) => (UNITS[unit]?.triggers ?? []).filter((t) => t.effect.kind === 'corpse.raise')
const radiusOf = (t: { effect: unknown }) => (t.effect as { radius: number }).radius
// fix.raise-two (2026-09-28): the TEST receptacle's raisers (content/test/units.json, test-*) state
// their radius in their own rows, not in the Codex — read from there, trigger by trigger.
const TEST_RADIUS: Record<string, Record<string, number>> = Object.fromEntries(
  (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'test', 'units.json'), 'utf8')) as { id: string; triggers?: { id: string; effect?: { kind?: string; radius?: number } }[] }[])
    .map((u) => [u.id, Object.fromEntries((u.triggers ?? []).filter((t) => t.effect?.kind === 'corpse.raise').map((t) => [t.id, t.effect!.radius!]))]))

describe('fix.raise-range — the Raise reaches what its row states', () => {
  it('the Necromancer\'s row states its Raise range, beyond the old 2 (ruled 2026-09-27)', () => {
    const n = RAISERS.find((r) => r.unit === 'unit.necromancer')
    expect(n, 'unit.necromancer has a Raise trigger in the Codex').toBeDefined()
    expect(stated(n!), `unit.necromancer Raise range ${String(n!.reach)}`).toBe(true)
    expect(n!.reach as number).toBeGreaterThan(2)
  })

  it('the Necromancer\'s compiled corpse.raise has the radius its Codex row states', () => {
    const n = RAISERS.find((r) => r.unit === 'unit.necromancer')!
    const raises = compiledRaises('unit.necromancer')
    expect(raises.length).toBe(1)
    expect(radiusOf(raises[0]!)).toBe(n.reach)
  })

  it.each(RAISERS.map((r) => [r.unit, r] as const))('%s — its Raise compiles with the row\'s range, or is a named gap', (_, r) => {
    if (stated(r)) {
      const raises = compiledRaises(r.unit)
      expect(raises.length, `${r.unit} compiled corpse.raise`).toBeGreaterThan(0)
      for (const t of raises) expect(radiusOf(t), t.id).toBe(r.reach)
    } else {
      expect(GAPS.some((g) => g.unit === r.unit && g.what.includes(RAISE) && g.needs === 'content: range unstated'),
        `${r.unit} Raise with range ${String(r.reach)} is not a named gap`).toBe(true)
      expect(compiledRaises(r.unit).length, `${r.unit} compiled a Raise its row gives no range for`).toBe(0)
    }
  })

  it('no compiled corpse.raise carries a radius its row does not state', () => {
    const withRaise = Object.entries(UNITS).filter(([, u]) => (u.triggers ?? []).some((t) => t.effect.kind === 'corpse.raise'))
    expect(withRaise.length).toBeGreaterThan(0)
    for (const [key, u] of withRaise) {
      // fix.raise-two (2026-09-28), Law 10: a TEST raiser's row is its own (content/test/units.json),
      // so its radius is checked against that row instead of the Codex's — re-homed, not skipped.
      if (key.startsWith('test-')) { for (const t of (u.triggers ?? []).filter((t) => t.effect.kind === 'corpse.raise')) expect(TEST_RADIUS[key]?.[t.id], `${t.id} radius`).toBe(radiusOf(t)); continue }
      const unit = key.startsWith('unit.') ? key : 'unit.' + key
      const rows = RAISERS.filter((r) => r.unit === unit && stated(r)).map((r) => r.reach)
      for (const t of (u.triggers ?? []).filter((t) => t.effect.kind === 'corpse.raise')) {
        expect(rows, `${t.id} radius ${radiusOf(t)}`).toContain(radiusOf(t))
      }
    }
  })
})

describe('fix.raise-range — a scripted battle', () => {
  const HERO = hexId(0, 15), NECRO = hexId(3, 3)
  // a hex at exactly distance d from the Necromancer, never the hero's; lowest id wins (Law 6)
  const hexAt = (d: number) => {
    for (let h = 0; h < HEX_COUNT; h++) if (h !== HERO && GEO16.distance(NECRO, h) === d) return h
    throw new Error(`no hex at distance ${d} on the board`)
  }
  const fight = (d: number) => {
    const at = hexAt(d)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: HERO }], [{ type: 'unit.necromancer', hex: NECRO }, { type: 'unit.zombie', hex: at }])
    const n = ctx.state.units[1]!, z = ctx.state.units[2]!
    expect(ctx.geo.distance(n.hex, z.hex)).toBe(d)
    z.hp = 0; settle(ctx, 'test')
    expect(ctx.state.corpses?.length).toBe(1)
    const before = ctx.state.units.length
    fireTriggers(ctx, 'onActivationEnd', { ownerId: n.id, targetId: null, causeId: 'test', ordinal: 1 })
    return { ctx, at, before }
  }
  const reach = RAISERS.find((r) => r.unit === 'unit.necromancer')!.reach as number
  const raise = () => compiledRaises('unit.necromancer')[0]

  it('a corpse at exactly the row\'s reach — beyond the old 2 — is raised as a Zombie', () => {
    expect(raise(), 'the compiled Raise').toBeDefined()
    const { ctx, at, before } = fight(reach)
    expect(ctx.state.units.length).toBe(before + 1)
    const raised = ctx.state.units[before]!
    expect(raised.typeId).toBe('unit.zombie'); expect(raised.summoned).toBe(true); expect(raised.hex).toBe(at)
    expect(ctx.state.corpses?.length).toBe(0)
    expect(ctx.events.some((e) => e.type === 'unit.raised' && e.causeId === raise()!.id)).toBe(true)
  })

  it('a corpse one hex beyond the row\'s reach is not raised — the Raise fires and finds none', () => {
    expect(raise(), 'the compiled Raise').toBeDefined()
    const { ctx, before } = fight(reach + 1)
    expect(ctx.state.units.length).toBe(before)
    expect(ctx.state.corpses?.length).toBe(1)
    const fired = ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === raise()!.id)
    expect(fired.length).toBe(1)
    expect((fired[0] as unknown as { corpsesInReach: number }).corpsesInReach).toBe(0)
  })
})
