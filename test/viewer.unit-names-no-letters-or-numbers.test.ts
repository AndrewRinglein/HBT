// viewer.unit-names-no-letters-or-numbers (engine backlog; engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
// letter'). Andrew: "None of the player units or enemy units should have numbers or letters. It's super dumb. It's okay to track
// them that way, but it shouldn't be Soldier A or Lumberjack 1 or Pyrowitch A." The engine's side - nothing of it is changed:
// it names each unit it fields as its kind's name and one mark (a hero a letter, an enemy or a placed civilian a number), and
// that name is on its unit.enter line. This file holds that the engine still does so and that the six opening recordings still
// carry those names (no recording moved); the viewer's half (../viewer/tools/unit-names-no-letters-or-numbers.test.mjs) walks
// every unit they field on the page; the sandbox's half (../kingdom/tools/unit-names-no-letters-or-numbers.verify.mjs) reads
// the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { UNITS } from '../../engine/src/content/index.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']
const MARKED = /^(.*\S) (?:[A-Z]|\d+)$/

describe('no unit is shown with a number or a letter', () => {
  it('the engine: every unit it fields is named its kind\'s name and one mark - heroes a letter, enemies and placed civilians a number', () => {
    let seen = 0
    for (const s of OPENING) {
      const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-' + s), 1))
      for (const u of ctx.state.units) {
        const m = MARKED.exec(u.name); expect(m, `${s}: ${u.name}`).not.toBeNull()
        const sheet = UNITS[u.typeId]!.name; if (sheet !== undefined) expect(m![1], `${s}: ${u.name} is a ${sheet}`).toBe(sheet)
        seen++
      }
    }
    expect(seen).toBeGreaterThan(30)
    // no kind's own name ends in a lone letter or number: the mark is the only one a shown name could carry
    expect(Object.values(UNITS).filter((u) => u.name !== undefined && MARKED.test(u.name)).map((u) => u.name)).toEqual([])
  })
  it('the six opening recordings carry the engine\'s names as they did: every unit.enter line is marked', () => {
    for (const s of OPENING) {
      const ev = (JSON.parse(readFileSync(`battles/test.opening-${s}.json`, 'utf8')) as { events: { type: string; name?: string }[] }).events
      const entered = ev.filter((e) => e.type === 'unit.enter')
      expect(entered.length, s).toBeGreaterThan(3)
      for (const e of entered) expect(e.name, s).toMatch(MARKED)
    }
  })
  it('the viewer page: every unit of the six opening battles is walked - under it, on its top card, in its panel, in every log line', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/unit-names-no-letters-or-numbers.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the built BATTLE-SANDBOX.html (the Orphanage) names no unit with its mark - the board, the cards, the panel, the play notes', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/unit-names-no-letters-or-numbers.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/unit-names-no-letters-or-numbers.verify.mjs', 'scratch/unit-names-no-letters-or-numbers.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/unit-names-no-letters-or-numbers: .*passed/)
  }, 170000)
})
