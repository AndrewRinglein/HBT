// V2 R6 swap UI (COMBAT-V2-DESIGN-2026-09-07 §11.2; engine v2.loadout-swap dd78ff1). The
// sandbox offers a human-controlled hero the engine's `swap` command: the instances to hold
// afterwards (engine SWITCHES swapShape), each option one the engine validates, its cost the
// engine's swapCostOf. Nothing here re-derives legality (Law 2): when there is no legal swap
// the reason shown is the engine's own. Enemies and the AI never swap (engine swapAi, ruled).
import { describe, expect, it } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, sandboxSwapChoices, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { validateBattleCommand } from '../src/engine.js'

const PALADIN = 'hero.base.paladin-hunk'   // standard kit: longsword + kite shield in hand
function acting(): { s: Sandbox; actor: number } {
  const s = createSandbox({ ...SANDBOX_DEFAULT, heroes: [PALADIN], enemies: ['unit.zombie'], seed: 1 })
  let next = advanceSandbox(s)
  expect(next.kind).toBe('selecting')
  expect(commandSandbox(s, { kind: 'select-activation', unitUid: s.policy.humanUnitUids[0], expectedSeq: s.ctx.state.seq })).toEqual({ ok: true })
  const actor = s.ctx.battleCursor!.actor!
  expect(s.ctx.battleCursor?.at).toBe('acting')
  return { s, actor }
}
const handsOf = (s: Sandbox, a: number) => s.ctx.state.units[a]!.loadout!.hands.map((i) => i.instanceId)

describe('sandbox swap — the engine swap command, offered to a human-controlled hero', () => {
  it('offers only engine-valid hand lists, never the current one, each at the engine cost', () => {
    const { s, actor } = acting()
    const offer = sandboxSwapChoices(s)
    expect(offer.why).toBeNull()
    expect(offer.cost).toBe(1)   // swapCost default 1 (§11.2)
    expect(offer.choices.length).toBeGreaterThan(0)
    const now = handsOf(s, actor)
    for (const c of offer.choices) {
      expect(c.command).toEqual({ kind: 'swap', actor, hands: c.hands, expectedSeq: s.ctx.state.seq })
      expect(validateBattleCommand(s.ctx, s.policy, c.command)).toEqual({ ok: true })
      expect(c.hands).not.toEqual(now)
      expect(typeof c.label).toBe('string')
    }
    // stow the shield; drop to Punch — both offered
    expect(offer.choices.some((c) => c.hands.length === 1 && c.hands[0] === now[0])).toBe(true)
    expect(offer.choices.some((c) => c.hands.length === 0)).toBe(true)
  })

  it('issuing a choice swaps through the engine: loadout.swapped, stamina spent, the hands moved; then no second swap', () => {
    const { s, actor } = acting()
    const before = s.ctx.state.units[actor]!.stamina, keep = handsOf(s, actor)[0]!
    const pick = sandboxSwapChoices(s).choices.find((c) => c.hands.length === 1 && c.hands[0] === keep)!
    const n = s.ctx.events.length
    expect(commandSandbox(s, pick.command)).toEqual({ ok: true })
    const swapped = s.ctx.events.slice(n).find((e) => e.type === 'loadout.swapped')
    expect(swapped?.['handsAfter']).toEqual(s.ctx.state.units[actor]!.loadout!.hands)
    expect(s.ctx.state.units[actor]!.stamina).toBe(before - 1)
    expect(handsOf(s, actor)).toEqual([keep])
    expect(s.ctx.battleCursor).toMatchObject({ at: 'acting', actor })   // the activation goes on: the swap is not the primary
    const again = sandboxSwapChoices(s)
    expect(again.choices).toEqual([])
    expect(again.why).toMatch(/swap of this activation is spent/)
    // the hero may still act: the primary action is still offered
    expect(sandboxChoices(s).some((c) => c.command.slot === 'primary')).toBe(true)
  })

  it('no swap after the primary action, and none without the stamina — the engine says why', () => {
    const { s, actor } = acting()
    s.ctx.state.units[actor]!.stamina = 0
    const poor = sandboxSwapChoices(s)
    expect(poor.choices).toEqual([])
    expect(poor.why).toMatch(/not enough stamina/)
    s.ctx.state.units[actor]!.stamina = 5
    s.ctx.state.units[actor]!.primaryUsed = true
    const late = sandboxSwapChoices(s)
    expect(late.choices).toEqual([])
    expect(late.why).toMatch(/primary action is spent/)
  })

  it('nothing is offered while choosing a hero, to an enemy, or once the battle is over', () => {
    const s = createSandbox({ ...SANDBOX_DEFAULT, heroes: [PALADIN], enemies: ['unit.zombie'], seed: 1 })
    advanceSandbox(s)
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    expect(sandboxSwapChoices(s)).toEqual({ choices: [], cost: null, why: null })
  })

  it('what was stowed comes back as an option at the next activation, and a save keeps the loadout', () => {
    const { s, actor } = acting()
    const [sword, shield] = handsOf(s, actor)
    commandSandbox(s, sandboxSwapChoices(s).choices.find((c) => c.hands.length === 1 && c.hands[0] === sword)!.command)
    expect(commandSandbox(s, { kind: 'end-cycle', actor, expectedSeq: s.ctx.state.seq })).toEqual({ ok: true })
    for (let i = 0; i < 20 && s.ctx.battleCursor?.at !== 'selecting' && !s.ctx.state.outcome; i++) advanceSandbox(s)
    expect(s.ctx.state.outcome).toBeFalsy()
    expect(s.ctx.battleCursor?.at).toBe('selecting')
    const back = restoreSandbox(saveSandbox(s))
    expect(back.ctx.state.units[actor]!.loadout).toEqual(s.ctx.state.units[actor]!.loadout)
    expect(commandSandbox(s, { kind: 'select-activation', unitUid: s.policy.humanUnitUids[0], expectedSeq: s.ctx.state.seq })).toEqual({ ok: true })
    const both = sandboxSwapChoices(s).choices.find((c) => c.hands.length === 2 && c.hands.includes(shield!) && c.hands.includes(sword!))
    expect(both).toBeDefined()
    expect(commandSandbox(s, both!.command)).toEqual({ ok: true })
    expect(new Set(handsOf(s, actor))).toEqual(new Set([sword, shield]))
  })
})
