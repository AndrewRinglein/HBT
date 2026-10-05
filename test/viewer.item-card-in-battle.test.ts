// viewer.item-card-in-battle (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: notices, target lines, item cards,
// arrows, move costs on hexes, knocked down, bodies, cursed ground, the first hero's positives' and 'the playtest post
// answered'). Andrew: "When you're selecting items in the equipment phase, you need to be able to look at your items somehow.
// You need to be able to click on them, and then they pop up somewhere on the screen, to the right or somewhere, as a card with
// a description.   We also need to be able to do something similar. When you're focusing on a character, you need to be able to
// look at their items when you're in battle."
//
// The engine's side — what the card and its rows stand on, and nothing new: the items a unit carries are the log's own
// (unit.equipped names the item), and every one of them is an item of the engine's table, so a host has a card for each. And
// what the item's expect says of an enemy: "clicking an enemy's weapon shows its card" — held here is that NO enemy carries an
// item in any battle the engine fields today (across every fielding it knows none is equipped),
// so an enemy's panel has no item to click; the card's path asks no side (the page test holds that).
// The viewer's half (../viewer/tools/item-card-in-battle.test.mjs) is the component: an item's name in the panel asks the host
// for its card and stands it beside the panel. The kingdom's halves (../kingdom/test/item-card-in-battle.test.ts, ../kingdom/
// tools/item-card-in-battle.verify.mjs) hold that the card handed over is the Equip screen's own, and the built
// BATTLE-SANDBOX.html to it. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { ITEMS } from '../../engine/src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../../engine/src/content/scenarios.js'

type E = { type: string; actor?: number; side?: string; itemId?: string; typeId?: string }
const OPENING = ['test.opening-orphanage', 'test.opening-lumberjack', 'test.opening-bridge', 'test.opening-cavern-trail', 'test.opening-gates', 'test.opening-cathedral']

describe('an item\'s card in battle: what the engine\'s lines give the panel to click', () => {
  it('the engine: in the six opening battles every item a unit carries is named by its own line and is an item of the engine\'s table; the heroes\' units carry items and no enemy does', () => {
    let carried = 0
    for (const id of OPENING) {
      const ctx = createBattle(scenarioOptions(SCENARIOS[id]!, 0)), EV = ctx.events as unknown as E[]
      const side: Record<number, string> = {}
      for (const e of EV) if (e.type === 'unit.enter') side[e.actor!] = e.side!
      const equipped = EV.filter((e) => e.type === 'unit.equipped')
      expect(equipped.length, id).toBeGreaterThan(0)
      for (const e of equipped) { carried++; expect((ITEMS as Record<string, unknown>)[e.itemId!], `${id}: ${e.itemId}`).toBeDefined(); expect(side[e.actor!], `${id}: ${e.itemId} is carried by a hero's unit`).toBe('hero') }
    }
    expect(carried).toBeGreaterThan(20)
  })
  it('the engine: across every fielding it knows, no unit of the enemy\'s is equipped with an item — so no enemy\'s panel lists an item today', () => {
    const equippedSides = (EV: readonly E[]) => { const side: Record<number, string> = {}; for (const e of EV) if (e.type === 'unit.enter') side[e.actor!] = e.side!; return EV.filter((e) => e.type === 'unit.equipped').map((e) => side[e.actor!]) }
    let fieldings = 0
    for (const id of Object.keys(SCENARIOS)) {
      let ctx; try { ctx = createBattle(scenarioOptions(SCENARIOS[id]!, 0)) } catch { continue }   // a fielding that needs more than its id is not this test's
      fieldings++
      expect(equippedSides(ctx.events as unknown as E[]).filter((x) => x !== 'hero'), id).toEqual([])
    }
    expect(fieldings).toBeGreaterThan(20)
  }, 120000)
  it('the viewer page: an item\'s name in the focused unit\'s panel asks the host for its card and stands it beside the panel; the same name, a click away or another unit closes it', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/item-card-in-battle.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 8/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: on the built BATTLE-SANDBOX.html, clicking \'Holy Symbol\' in the Priest\'s panel shows its card, Wrath and Heal with their lines — the sources\' own card', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/item-card-in-battle.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/item-card-in-battle.verify.mjs', 'scratch/item-card-in-battle.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/item-card-in-battle: .*passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})
