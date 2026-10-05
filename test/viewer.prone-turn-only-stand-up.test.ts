// viewer.prone-turn-only-stand-up (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: notices, target lines, item
// cards, arrows, move costs on hexes, knocked down, bodies, cursed ground, the first hero's positives' and 'the playtest post
// answered'). Andrew: "Then, if you are downed, when it's that character's next turn, everything needs to be grayed out except
// 'stand up'." / "Stand-up is a special move that is only available if you were prone, and yes, it takes your move."
//
// The item: "What the engine allows is read from the engine (legal actions), never worked out in the viewer: if the engine
// today lets a prone unit do something other than stand, or does not charge the move for standing, that is the engine's to
// change — name it in the report and re-file it as an engine item rather than hide it in the bar."
//
// The engine's side — what the bar is read from, and nothing new. Held here is what is true of the engine whichever way its
// prone rule stands, so this file does not break the day the rule moves: while a unit is down the engine grants it a stand, its
// limits check passes the stand and refuses every other movement; a standing unit is granted no stand; standing spends the
// unit's move and leaves its primary action. What the engine answers TODAY beyond that is printed, not asserted (viewer
// SWITCHES.md proneBarReadsTheEngine): it still passes a downed unit's attacks and powers (engine SWITCHES.md proneNoCrawl,
// ruled 2026-09-24), so those stay lit on the bar until the engine's rule is changed.
// The viewer's half (../viewer/tools/prone-turn-only-stand-up.test.mjs) draws the host's fact on the page; the kingdom's halves
// (../kingdom/test/prone-turn-only-stand-up.test.ts, ../kingdom/tools/prone-turn-only-stand-up.verify.mjs) hold the host's fact
// to the engine and the built BATTLE-SANDBOX.html to the fact. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { actionReady, grantedActionIds, standsUp, isMove, isAttack } from '../../engine/src/core/action.js'
import { beginActivation } from '../../engine/src/core/mutate.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { kdbDownStatus } from '../../engine/src/core/kdb.js'
import { executeSidestep } from '../../engine/src/core/movement.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('a unit that is down: Stand Up, and what the engine refuses until it has stood', () => {
  it('the engine: down, a unit is granted a stand that passes the limits check, and no other movement passes; standing, it is granted none; standing up spends its move and leaves its primary action', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-lumberjack'), 1))
    const heroes = ctx.state.units.filter((u) => u.side === 'hero' && u.lifeState === 'standing'), prone = kdbDownStatus(ctx)!
    expect(heroes.length).toBeGreaterThan(1); expect(prone).toBeTruthy()
    const enemy = ctx.state.units.find((u) => u.side === 'enemy')!
    let stillPassed = 0
    for (const u of heroes) {
      const act = (id: string) => ctx.actions[id]!
      expect(grantedActionIds(ctx, u).some((id) => standsUp(act(id))), `${u.name}: standing, no stand is granted`).toBe(false)
      applyStatus(ctx, u.id, prone, 1, 'viewer.prone-turn-only-stand-up', enemy.id)
      beginActivation(ctx, u.id, 'viewer.prone-turn-only-stand-up')
      const granted = grantedActionIds(ctx, u), stand = granted.filter((id) => standsUp(act(id)))
      expect(stand, `${u.name}: down, one stand is granted`).toHaveLength(1)
      expect(actionReady(ctx, u, act(stand[0]!)), 'the stand passes the limits check').toBe(true)
      for (const id of granted) if (isMove(act(id)) && !isAttack(act(id)) && !standsUp(act(id))) expect(actionReady(ctx, u, act(id)), `${u.name}: ${act(id).name} is refused while down`).toBe(false)
      const others = granted.filter((id) => !standsUp(act(id)) && actionReady(ctx, u, act(id)))
      stillPassed += others.length
      console.log(`  ${u.name}, down: the engine refuses ${granted.filter((id) => !standsUp(act(id)) && !actionReady(ctx, u, act(id))).map((id) => act(id).name).join(', ') || 'nothing'}; it still passes ${others.map((id) => act(id).name).join(', ') || 'nothing'}`)
      expect(executeSidestep(ctx, u.id, u.hex, act(stand[0]!) as never, 'movement'), `${u.name}: the engine takes the stand`).toBe(true)
      expect(u.statuses.some((s) => s.id === prone && s.value > 0), `${u.name} has stood`).toBe(false)
      expect(u.moveUsed, 'standing spent its move').toBe(true); expect(u.primaryUsed, 'and not its primary action').toBe(false)
      expect(grantedActionIds(ctx, u).some((id) => standsUp(act(id))), 'stood, no stand is granted').toBe(false)
      const attacks = grantedActionIds(ctx, u).filter((id) => isAttack(act(id)))
      expect(attacks.length).toBeGreaterThan(0); for (const id of attacks) expect(actionReady(ctx, u, act(id)), `${u.name}: ${act(id).name} passes after the stand`).toBe(true)
    }
    console.log(`  FOUND for the engine's queue: across ${heroes.length} downed units the limits check still passes ${stillPassed} action(s) other than the stand (attacks, powers) — "everything … grayed out except 'stand up'" needs the engine to refuse them`)
  })
  it('the viewer page: Stand Up is on the bar only of a unit that is down; the actions the host says wait on the stand are greyed, marked disabled and say why; once stood, what greys is what the host says is done', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/prone-turn-only-stand-up.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 7/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: in battle 2 on the built BATTLE-SANDBOX.html a knocked-down hero and the knocked-down Lumberjack\'s Wife each show Stand Up lit and every action the engine refuses greyed and unpressable; a standing unit\'s bar has no Stand Up', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/prone-turn-only-stand-up.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/prone-turn-only-stand-up.verify.mjs', 'scratch/prone-turn-only-stand-up.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/prone-turn-only-stand-up: .*passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
