// viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the
// unit's gear'). Andrew: "The button for swapping should say 'Swap'. And when you press it, it should give you the option to
// rearrange your gear." · "Just the enhanced gear, not adding gear that you didn't already have. Just the ability to swap
// hands with inventory". The play input's swap fact (src/ui/play-input.ts) for the gear panel: everything the acting unit
// carries — its hands, then what is stowed on it, named from the engine's item rows — every hand list the engine would take
// (sandboxSwapChoices), and every other arrangement of what it carries with the engine's own reason (sandboxSwapRefusals).
// Between them they are all the arrangements there are; nothing the unit does not carry is ever offered; the swap itself is
// still the engine's command, by the index of the hand list chosen. Every legality is validateBattleCommand's.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxSwapChoices, sandboxSwapRefusals, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { validateBattleCommand } from '../src/engine.js'

function start(heroes: string[] = [...SANDBOX_DEFAULT.heroes]) {
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes, enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), { save: () => saveSandbox(box.s), restore: (saved) => { box.s = restoreSandbox(saved as string); return true } })
  P.next()
  return { box, P }
}
const key = (hands: readonly string[]) => hands.join('|')

describe('the swap button opens a rearranging of the unit\'s gear', () => {
  it('the fact names everything the unit carries — its hands, then what is stowed — and nothing else', () => {
    const { box, P } = start(), me = box.s.ctx.battleCursor!.actor!, L = box.s.ctx.state.units[me]!.loadout!
    const sw = P.facts().swap!
    expect(sw).toBeTruthy()
    expect(L.hands.length, 'this hero holds a weapon and a shield').toBe(2)
    expect(sw.carried).toEqual([...L.hands.map((i) => ({ instance: i.instanceId, item: i.itemId, name: box.s.ctx.items[i.itemId]!.name, held: true })),
      ...L.stowed.map((i) => ({ instance: i.instanceId, item: i.itemId, name: box.s.ctx.items[i.itemId]!.name, held: false }))])
    const carried = new Set(sw.carried.map((c) => c.instance))
    for (const a of [...sw.choices, ...sw.refused]) for (const id of a.hands) expect(carried.has(id), `${id} is carried by the unit`).toBe(true)
  })
  it('every arrangement of what it carries is either a hand list the engine takes, or refused with the engine\'s reason', () => {
    const { box, P } = start(), me = box.s.ctx.battleCursor!.actor!
    const sw = P.facts().swap!, n = sw.carried.length
    expect(sw.choices.length + sw.refused.length, 'all the arrangements there are').toBe(2 ** n)
    expect(new Set([...sw.choices, ...sw.refused].map((a) => key(a.hands))).size).toBe(2 ** n)
    expect(sw.choices.map((c) => [c.label, c.hands])).toEqual(sandboxSwapChoices(box.s).choices.map((c) => [c.label, c.hands]))
    expect(sw.refused).toEqual(sandboxSwapRefusals(box.s))
    for (const c of sw.choices) expect(validateBattleCommand(box.s.ctx, box.s.policy, { kind: 'swap', actor: me, hands: c.hands, expectedSeq: box.s.ctx.state.seq }).ok).toBe(true)
    for (const r of sw.refused) {
      const v = validateBattleCommand(box.s.ctx, box.s.policy, { kind: 'swap', actor: me, hands: r.hands, expectedSeq: box.s.ctx.state.seq })
      expect(v.ok).toBe(false); if (!v.ok) expect(v.reason).toBe('illegal-swap: ' + r.why)
    }
    const now = sw.carried.filter((c) => c.held).map((c) => c.instance)
    expect(sw.refused.find((r) => key(r.hands) === key(now))?.why, 'what it already holds').toBe('nothing changes')
    expect(sw.cost).toBe(sandboxSwapChoices(box.s).cost)
  })
  it('confirming an arrangement is the engine\'s swap, by the index of the hand list; the fact then shows the new hands, and why no more', () => {
    const { box, P } = start(), me = box.s.ctx.battleCursor!.actor!
    const sw = P.facts().swap!, keep = sw.carried[0]!, index = sw.choices.findIndex((c) => key(c.hands) === keep.instance)
    expect(index).toBeGreaterThanOrEqual(0)
    const before = box.s.ctx.events.length
    expect(P.input({ kind: 'swap', index, unit: me })).toBe(true)
    expect(box.s.ctx.events.slice(before).some((e) => e.type === 'loadout.swapped')).toBe(true)
    expect(box.s.ctx.state.units[me]!.loadout!.hands.map((i) => i.instanceId)).toEqual([keep.instance])
    const after = P.facts().swap!
    expect(after.carried.map((c) => [c.instance, c.held])).toEqual([[keep.instance, true], ...sw.carried.slice(1).map((c) => [c.instance, false])])
    expect(after.choices).toEqual([]); expect(after.why).toMatch(/swap of this activation is spent/)
    expect(after.refused.length).toBe(2 ** after.carried.length)
    for (const r of after.refused) expect(r.why).toMatch(/swap of this activation is spent/)
  })
  it('a unit that carries nothing to swap has no swap fact; nobody acting has none', () => {
    const { box, P } = start()
    P.input({ kind: 'end-turn' })
    if (box.s.ctx.battleCursor?.at !== 'acting') expect(P.facts().swap ?? null).toBeNull()
    expect(sandboxSwapRefusals({ ...box.s, ctx: { ...box.s.ctx, battleCursor: { at: 'selecting' } } } as unknown as Sandbox)).toEqual([])
  })
})
