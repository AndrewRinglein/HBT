// viewer.swap-button-rearranges (engine backlog; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a
// rearranging of the unit's gear'). Andrew: "The button for swapping should say 'Swap'. And when you press it, it should give
// you the option to rearrange your gear." · "Just the enhanced gear, not adding gear that you didn't already have. Just the
// ability to swap hands with inventory". The engine's side — the swap rule the panel stands on, unchanged
// (movement.swap-and-shields): the swap command names the instances to hold afterwards, of those the unit carries; the engine
// takes some hand lists and refuses the rest, each with its reason ("nothing changes" for what is already held, an instance
// it does not carry, the swap already spent this Activation); a taken swap costs swapCost in stamina and is logged
// (loadout.swapped). The viewer's half (../viewer/tools/swap-button-rearranges.test.mjs) asks the page for the one Swap
// button and the gear panel; the sandbox's half (../kingdom/tools/swap-button-rearranges.verify.mjs) presses Swap, rearranges
// and reads the unit's hands from the engine's state on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { validateBattleCommand, executeBattleCommand } from '../../engine/src/core/commands.js'
import { swapCostOf } from '../../engine/src/core/swap.js'
import { ITEMS } from '../../engine/src/content/index.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the swap button opens a rearranging of the unit\'s gear', () => {
  it('the engine: a swap names what to hold of what the unit carries; it takes some hand lists and refuses the rest with a reason; a taken one costs stamina, once an Activation', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), policy = { humanUnitUids: ctx.state.units.filter((u) => u.side === 'hero').map((u) => u.uid) }
    advanceBattle(ctx, policy)
    const u = ctx.state.units.find((x) => x.side === 'hero' && (x.loadout?.hands.length ?? 0) > 0)!
    expect(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: u.uid, expectedSeq: ctx.state.seq }).ok).toBe(true)
    advanceBattle(ctx, policy)
    const held = u.loadout!.hands.map((i) => i.instanceId), swap = (hands: string[]) => ({ kind: 'swap' as const, actor: u.id, hands, expectedSeq: ctx.state.seq })
    expect(validateBattleCommand(ctx, policy, swap(held))).toEqual({ ok: false, reason: 'illegal-swap: nothing changes' })
    expect(validateBattleCommand(ctx, policy, swap(['not/carried']))).toMatchObject({ ok: false })   // nothing it did not bring into the battle
    expect(validateBattleCommand(ctx, policy, swap([])).ok, 'putting everything away is a hand list the engine takes').toBe(true)
    const stamina = u.stamina, cost = swapCostOf(ctx, u), before = ctx.events.length
    expect(executeBattleCommand(ctx, policy, swap([])).ok).toBe(true)
    expect(u.loadout!.hands).toEqual([]); expect(u.loadout!.stowed.map((i) => i.instanceId)).toEqual(held)
    expect(u.stamina).toBe(stamina - cost)
    expect(ctx.events.slice(before).find((e) => e.type === 'loadout.swapped')).toMatchObject({ actor: u.id, stamina: cost, handsAfter: [] })
    expect(validateBattleCommand(ctx, policy, swap(held))).toEqual({ ok: false, reason: 'illegal-swap: the swap of this activation is spent' })
    for (const i of u.loadout!.stowed) expect(ITEMS[i.itemId]!.name, 'each carried item has its own name').toBeTruthy()
  })
  it('the viewer page: one button reading Swap; the gear panel rearranges what the unit carries, offers only what the host lists, and says why not', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/swap-button-rearranges.test.mjs', 'tools/swap-bar.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 10/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/swap-button-rearranges.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/swap-button-rearranges.verify.mjs', 'scratch/swap-button-rearranges.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/swap-button-rearranges: .*passed/)
  }, 170000)
})
