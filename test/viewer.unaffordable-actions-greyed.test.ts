// viewer.unaffordable-actions-greyed (engine backlog; engine DECISIONS.md 2026-10-05 'a prone unit only stands; Stand Up is its one
// move; …; what cannot be paid is greyed; …'). Andrew, asked what is chosen when attack one cannot be paid for: "If a tax can't be
// paid for or a power can't be paid for, it should be grayed out." ('tax' is 'attack' - dictation.)
//
// The item: "What can be paid is read from the engine (the legal actions and their reasons), never worked out in the viewer."
//
// The engine's side — what the bar is read from, and nothing new in the engine: its ONE limits check (actionReady) refuses an
// action its unit cannot pay for — not enough Stamina, not ready until a later Turn, no use left — and takes it again the
// moment it can. The engine answers yes or no and says no sentence, so the numbers the host's line is made of are read here
// from the same functions the host reads (staminaCostOf, readyOn) and held to the check's answer. An action whose last use
// is spent leaves the unit's list altogether (spendUse, ruled 2026-09-02) — that was so before this item, and is held by the
// engine's own tests.
// The viewer's half (../viewer/tools/unaffordable-actions-greyed.test.mjs) draws the host's fact on the page; the kingdom's
// halves (../kingdom/test/unaffordable-actions-greyed.test.ts, ../kingdom/tools/unaffordable-actions-greyed.verify.mjs) hold
// the host's fact to the engine and the built BATTLE-SANDBOX.html to the fact. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { actionReady, grantedActionIds, staminaCostOf, readyOn, spendAction, isAttack } from '../../engine/src/core/action.js'
import { beginActivation, drainStamina, gainStamina } from '../../engine/src/core/mutate.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('what a unit cannot pay for: the engine refuses it, and takes it again the moment it can', () => {
  it('the engine: at 1 Stamina the limits check refuses exactly the actions that cost more, and passes them again when the Stamina is back; an action on cooldown is refused until the Turn it is ready on', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-lumberjack'), 1))
    const heroes = ctx.state.units.filter((u) => u.side === 'hero' && u.lifeState === 'standing' && u.maxStamina > 1)
    expect(heroes.length).toBeGreaterThan(0)
    let dearSeen = 0, cooled = 0
    for (const u of heroes) {
      const act = (id: string) => ctx.actions[id]!
      beginActivation(ctx, u.id, 'viewer.unaffordable-actions-greyed')
      const full = u.stamina, granted = grantedActionIds(ctx, u)
      for (const id of granted) expect(actionReady(ctx, u, act(id)), `${u.name}: ${act(id).name} at full Stamina, Turn ${ctx.state.turn}`).toBe(ctx.state.turn >= readyOn(u, id))
      drainStamina(ctx, u.id, u.stamina - 1, 'viewer.unaffordable-actions-greyed'); expect(u.stamina).toBe(1)
      for (const id of granted) {
        const dear = staminaCostOf(u, act(id)) > 1
        if (ctx.state.turn >= readyOn(u, id)) expect(actionReady(ctx, u, act(id)), `${u.name} at 1 Stamina: ${act(id).name} costs ${staminaCostOf(u, act(id))}`).toBe(!dear)
        if (dear && isAttack(act(id))) dearSeen++
      }
      gainStamina(ctx, u.id, full - 1, 'viewer.unaffordable-actions-greyed'); expect(u.stamina).toBe(full)
      for (const id of granted) expect(actionReady(ctx, u, act(id)), `${u.name}: ${act(id).name} with its Stamina back`).toBe(ctx.state.turn >= readyOn(u, id))
      // a cooldown: THE ONE SPEND writes the Turn it is ready on, and the check refuses it until then
      const cd = granted.find((id) => !!act(id).cooldown && actionReady(ctx, u, act(id)))
      if (cd) {
        spendAction(ctx, u.id, act(cd), 'primary'); cooled++
        expect(readyOn(u, cd) - ctx.state.turn, `${act(cd).name}: ready in its cooldown + 1 Turns`).toBe(act(cd).cooldown! + 1)
        gainStamina(ctx, u.id, full - u.stamina, 'viewer.unaffordable-actions-greyed')
        expect(actionReady(ctx, u, act(cd)), `${act(cd).name} is refused while it cools, whatever its Stamina`).toBe(false)
      }
    }
    expect(dearSeen, 'a hero fielded here has an attack that costs more than 1 Stamina').toBeGreaterThan(0)
    console.log(`  the engine, battle 2: ${heroes.length} hero(es) asked; ${dearSeen} attack(s) refused at 1 Stamina and passed again with it back; ${cooled} action(s) refused on cooldown`)
  })
  it('the viewer page: the rows the host says cannot be paid for are greyed, marked disabled and say the host\'s line; every other row is lit; with no word the bar is the bar it was', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/unaffordable-actions-greyed.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: in battle 1 on the built BATTLE-SANDBOX.html the Iron Dwarf at 1 Stamina shows every action the engine refuses greyed with "Not enough Stamina: needs N, has 1.", the rest lit; with its Stamina back the bar is the bar it showed before', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/unaffordable-actions-greyed.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/unaffordable-actions-greyed.verify.mjs', 'scratch/unaffordable-actions-greyed.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/unaffordable-actions-greyed: .*passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
