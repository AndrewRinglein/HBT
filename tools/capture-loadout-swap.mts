// Write tools/fixtures/loadout-swap.json — the engine's own log of one human swap.
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/capture-loadout-swap.mts        (from viewer/)
// content.shields-reauthored (engine item, 2026-10-04): the fixture was "captured from the engine by a one-off script outside
// the tree" at engine af5241d, and held the Kite Shield's powers as they were then; the shields are the Armory Ledger's now
// (engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons'), so the
// log is taken again — by this tool, in the tree, the same battle and the same two commands the one-off script's note
// names. Never hand-edit the output.
import { writeFileSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { advanceBattle } from '../../engine/src/core/battle.js'
import { executeBattleCommand, type ControlPolicy } from '../../engine/src/core/commands.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'
import { codeStamp } from '../../engine/tools/code-stamp.mjs'

const HERO_UID = 501
const policy: ControlPolicy = { humanUnitUids: [HERO_UID] }
const base = scenarioOptions(scenarioDef('showcase.prologue-party'))
const ctx = createBattle({ ...base, heroes: ['hero.base.warrior-iron'], heroHexes: [247], heroItems: [['item.longsword']], heroStowed: [['item.kite-shield']], heroBadges: [[]], heroUids: [HERO_UID], strict: true })
const h = ctx.state.units.findIndex((u) => u.uid === HERO_UID)
let next = advanceBattle(ctx, policy)
while (next.kind === 'acting') next = advanceBattle(ctx, policy)
if (next.kind !== 'selecting') throw new Error('capture-loadout-swap: the battle did not stop for the player to choose who acts: ' + next.kind)
const ok = (r: { ok: boolean }, what: string): void => { if (!r.ok) throw new Error('capture-loadout-swap: ' + what + ' refused: ' + JSON.stringify(r)) }
ok(executeBattleCommand(ctx, policy, { kind: 'select-activation', unitUid: HERO_UID, expectedSeq: ctx.state.seq }), 'select-activation')
advanceBattle(ctx, policy)
const stowed = ctx.state.units[h]!.loadout!.stowed.map((i) => i.instanceId)
ok(executeBattleCommand(ctx, policy, { kind: 'swap', actor: h, hands: stowed, expectedSeq: ctx.state.seq }), 'swap')
const out = {
  note: 'Captured from the engine by tools/capture-loadout-swap.mts: showcase.prologue-party options, one Iron Dwarf (uid 501) holding item.longsword with item.kite-shield stowed, human-controlled; select-activation, then the engine swap command { hands: ["501/1"] }. Every event the engine emitted, in order.',
  engineCommit: codeStamp().stamp,
  events: ctx.events,
}
writeFileSync(new URL('./fixtures/loadout-swap.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(`loadout-swap.json: ${ctx.events.length} events at engine ${out.engineCommit}`)
