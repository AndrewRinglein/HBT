// V2 R7 (COMBAT-V2-DESIGN-2026-09-07 §12.2 "Props can be targeted directly"; engine
// v2.prop-attack e049b15). The sandbox offers a human-controlled hero whose attack carries
// Destroy the engine's { hex } action: every hex the engine's propAttackHexes lists, each
// command one validateBattleCommand accepts — the host re-derives nothing (Law 2). No campaign
// hero carries Destroy yet, so the probe fields the engine's TEST Chopper (Destroy 1) on a
// direct board with barrels, through the same sandbox functions the page uses.
import { describe, expect, it } from 'vitest'
import { advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { createBattle, validateBattleCommand } from '../src/engine.js'

const CHOP = 'attack.test-destroy.chop'
function acting(props: unknown[]): { s: Sandbox; actor: number } {
  const ctx = createBattle({ replicate: 0, map: { id: 'test.map.sandbox-props', name: 'Sandbox props TEST', rows: Array(5).fill('.......'), props } as never,
    heroes: ['test-destroy-chopper'], heroHexes: [9], enemies: ['test-zombie'], enemyHexes: [34] })
  const s = { config: null, setup: null, ctx, policy: { humanUnitUids: [ctx.state.units[0]!.uid] }, atlasScene: null } as unknown as Sandbox
  const next = advanceSandbox(s)
  if (next.kind === 'selecting') expect(commandSandbox(s, { kind: 'select-activation', unitUid: s.policy.humanUnitUids[0]!, expectedSeq: s.ctx.state.seq })).toEqual({ ok: true })
  expect(s.ctx.battleCursor).toMatchObject({ at: 'acting' })
  return { s, actor: s.ctx.battleCursor!.actor! }
}
const hexAims = (s: Sandbox) => sandboxChoices(s).filter((c) => 'hex' in c.command)

describe('sandbox — an attack with Destroy aimed at a prop', () => {
  it('offers the engine-valid prop hexes, each a { hex } action with no forecast', () => {
    const { s, actor } = acting([{ id: 'prop.test.barrels', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [10] } }])
    const aims = hexAims(s)
    // an attack is authored 'either' by default, so both open slots are offered, as for a unit target
    expect(aims.map((c) => [c.command.actionId, (c.command as { hex: number }).hex, c.command.slot])).toEqual([[CHOP, 10, 'movement'], [CHOP, 10, 'primary']])
    for (const c of aims) {
      expect(c.command).toEqual({ kind: 'action', actor, actionId: CHOP, slot: c.command.slot, expectedSeq: s.ctx.state.seq, hex: 10 })
      expect(validateBattleCommand(s.ctx, s.policy, c.command)).toEqual({ ok: true })
      expect(c.preview).toBeNull()
    }
  })
  it('issuing it strikes through the engine: prop.struck, the barrels gone, the slot spent', () => {
    const { s } = acting([{ id: 'prop.test.barrels', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [10] } }])
    const n = s.ctx.events.length
    expect(commandSandbox(s, hexAims(s)[0]!.command)).toEqual({ ok: true })
    const after = s.ctx.events.slice(n).map((e) => e.type)
    expect(after).toContain('prop.struck')
    expect(after).toContain('prop.destroyed')
    expect(s.ctx.state.props).toEqual([])
    expect(s.ctx.events.slice(n).find((e) => e.type === 'action.spent')).toMatchObject({ actionId: CHOP, slot: 'movement' })
    expect(hexAims(s)).toEqual([])
  })
  it('no prop in reach, no hex aim; an attack without Destroy never offers one', () => {
    const { s } = acting([{ id: 'prop.test.far', height: 'low', material: 1, footprint: { kind: 'hex', hexes: [13] } }])
    expect(hexAims(s)).toEqual([])
  })
})
