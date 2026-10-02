// viewer.reads-engine (engine backlog; Duplication review 2026-09-28, findings V1 V2 V4 V5 V6 V7 V8 V11 V12 V13 V14; ruled
// "fix as proposed", engine/DECISIONS.md '2026-09-28 — the duplication review, ruled'). The engine's side of what the viewer
// now reads instead of recomputing: the engine's own classification of a Charge and a prone unit's Stand; the test zombies'
// hit; the movement a Surge restores, named on surge.hit; Weak's behaviour; the CLI's bleed-out; the board-space layout.
// The viewer's half (../viewer/tools/reads-engine.test.mjs) asks the viewer for the same facts. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createCustomBattle } from '../../engine/src/core/setup.js'
import { attacksOf, movesOf, grantedActionIds, isCharge } from '../../engine/src/core/action.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { beginActivation, reopenSurgeCycle } from '../../engine/src/core/mutate.js'
import { ACTIONS, UNITS } from '../../engine/src/content/index.js'
import { STATUSES } from '../../engine/src/content/statuses.js'
import { renderLog } from '../../engine/src/view/text.js'
import { FIELD_GEOMETRY, presentationField } from '../../engine/src/view/field.js'
import type { Event } from '../../engine/src/core/types.js'

describe('the facts the viewer reads from the engine', () => {
  it('V1 — the fast zombie\'s Charge is one of its attacks and none of its movements', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'unit.fast-zombie', hex: 200 }])
    const z = ctx.state.units[1]!
    expect(isCharge(ACTIONS['move.fast-zombie.charge']!)).toBe(true)
    expect(attacksOf(ctx, z).map((a) => a.id)).toContain('move.fast-zombie.charge')
    expect(movesOf(ctx, z).map((a) => a.id)).not.toContain('move.fast-zombie.charge')
  })
  it('V1 — a prone unit is granted its Stand while it holds the status', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 200 }])
    const w = ctx.state.units[0]!
    const stand = (STATUSES['status.prone'] as { prone?: { standAction: string } }).prone!.standAction
    expect(grantedActionIds(ctx, w)).not.toContain(stand)
    applyStatus(ctx, w.id, 'status.prone', 1, 'test')
    expect(grantedActionIds(ctx, w)).toContain(stand)
  })
  it('V2 — the test zombie\'s bite is Strength 4 + bonus 0', () => {
    const z = UNITS['test-zombie']!, bite = ACTIONS['attack.test-zombie.bite']!
    expect(z.attacks).toContain(bite.id)
    expect((z as unknown as Record<string, number>)[bite.attack!.stat!]! + (bite.attack!.bonus ?? 0)).toBe(4)
  })
  it('V5 — Weak lowers outgoing damage, Protection absorbs incoming: two behaviours, two looks', () => {
    expect(STATUSES['status.weak']!.reducesOutgoingDamage).toBe(true)
    expect(STATUSES['status.protection']!.reducesIncomingDamage).toBe(true)
  })
  it('V7 — surge.hit names the movement the Surge restored', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 200 }])
    const w = ctx.state.units[0]!
    ctx.state.turn = 1
    beginActivation(ctx, w.id, 'test')
    w.movePointsLeft = 1
    reopenSurgeCycle(ctx, w.id, w.movement, 1, { before: 100, after: 20 })
    expect(ctx.events.at(-1)).toMatchObject({ type: 'surge.hit', actor: w.id, movePoints: w.movement, after: 20 })
  })
  it('V11 — the CLI\'s dump prints the engine\'s bleed-out counter, never a literal 3', () => {
    const names = new Map([[0, 'Osric']])
    const lines = renderLog([{ type: 'life.downed', target: 0 } as unknown as Event, { type: 'bleedout.set', target: 0, bleedOut: 5 } as unknown as Event], names)
    expect(lines.join('\n')).not.toMatch(/bleed-out 3/)
    expect(lines).toContain('    Osric bleed-out 5')
  })
  it('V14 — every field carries the exported board-space layout', () => {
    const f = presentationField({ width: 4, height: 3, terrain: Array(12).fill(0), props: [] })
    for (const [k, v] of Object.entries(FIELD_GEOMETRY)) expect((f as Record<string, unknown>)[k]).toBe(v)
  })
  it('the viewer: the Charge and Stand on the bar, danger 4, Weak\'s look, the Surge\'s movement', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/reads-engine.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# fail 0/)
    expect(out).toMatch(process.env.VIEWER_PAGE ? /# pass 10/ : /# pass 9/) // fix.danger-skips-charge added one
  }, 170000)
})
