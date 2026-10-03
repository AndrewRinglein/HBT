// viewer.size-and-shadows-default (engine backlog; engine DECISIONS.md 2026-10-03 'the characters stand out: the size change does
// it; shadows are kept; the other three do little' and 'size and shadows are the default'). Andrew, having looked at the five
// looks of viewer.characters-stand-out: "looks like the size change does it, and nothing else seems to help that much, but we
// should still have them have shadows." - asked whether those two become the default for every battle: "yes." The engine's
// side: nothing in a battle's log changes - the default is how the viewer draws the same events (the Orphanage's export is the
// engine's own, played as it stands). The viewer's half (../viewer/tools/characters-stand-out.test.mjs, its test of the
// default): a battle whose host names no looks shows size and shadows - the board at 0.9x with no white space, the bodies'
// numbers the size look's, the patch under the feet the darker one - and an empty list is still the board as it was before.
// The built battle page's half (no look parameter shows the default pair, in a real browser) is the kingdom check that
// test/viewer.characters-stand-out.test.ts runs. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

describe('size and shadows are the default for every battle', () => {
  it('the battle the default is shown on is an engine export, untouched: its events name no look', () => {
    const battle = JSON.parse(readFileSync('../viewer/battles/test.opening-orphanage.json', 'utf8'))
    expect(battle.events.length).toBeGreaterThan(100)
    expect(JSON.stringify(battle.events.slice(0, 50))).not.toMatch(/"look"/)
  })
  it('the viewer page: with no looks named a battle shows size and shadows, and nothing else; an empty list is the board as it was', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern=^the default:', 'tools/characters-stand-out.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 1/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
