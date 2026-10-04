// viewer.panel-area-trigger-text (engine backlog; engine DECISIONS.md 2026-10-04 'the Poison Imp, the Balrog and the four
// caster-centred class powers skip their owner too', its last line: the unit panel prints an area trigger's target as
// "[object Object]"). The engine's side — what the panel is drawn from, and nothing new: a trigger's target is a word ('self',
// 'target') or the engine's Targeting row (core/target.ts), and an effect's amount is a number or the engine's scaling rule
// (core/trigger.ts ValueSpec). The Fire Imp's end-of-Activation Burn is aimed by a row: an area of 2 round itself, itself left
// out. The viewer's half (../viewer/tools/panel-area-trigger-text.test.mjs) asks the page for the words; the sandbox's half
// (../kingdom/tools/panel-area-trigger-text.verify.mjs) reads every unit's panel in the six opening battles on the built
// BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { UNITS } from '../../engine/src/content/index.js'
import { validateTargeting, type Targeting } from '../../engine/src/core/target.js'

describe('the unit panel says an area trigger\'s target in words', () => {
  it('the engine: the Fire Imp\'s end-of-Activation Burn is aimed by a Targeting row, and the dump carries every row unchanged', () => {
    const burn = UNITS['unit.fire-imp']!.triggers!.find((t) => t.hook === 'onActivationEnd')!
    expect(burn.select).toEqual({ select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true })
    const s = JSON.parse(readFileSync('generated/static.json', 'utf8')) as { units: Record<string, { triggers: { id: string; select: unknown }[] }> }
    let rows = 0
    for (const [id, u] of Object.entries(UNITS)) for (const [i, t] of (u.triggers ?? []).entries()) {
      expect(s.units[id]!.triggers[i]!.select, `${id} ${t.id}`).toEqual(t.select)
      if (typeof t.select === 'object') { validateTargeting(t.select as Targeting, t.id); rows++ }
    }
    expect(rows).toBeGreaterThan(4)
  })
  it('the viewer page: the Fire Imp\'s panel reads "every other unit within 2 hexes"; no opening unit\'s panel, bar or log line prints an object', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/panel-area-trigger-text.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html — every unit\'s panel in the six opening battles', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/panel-area-trigger-text.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/panel-area-trigger-text.verify.mjs', 'scratch/panel-area-trigger-text.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/panel-area-trigger-text: .*passed/)
  }, 170000)
})
