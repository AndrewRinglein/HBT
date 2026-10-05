// viewer.prone-lies-down (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ... knocked down ...' and 'the playtest
// post answered: ... knockdown is prone ...'). Andrew: "When you are knocked down, we need to use the downed image, which is the
// same as the dead, like you're lying on the ground ... Because it's not dead." / "knockdown is prone ... She failed a knockdown
// roll, and it didn't change the way she looked." The engine's side - what the board is drawn from, and nothing new: knockdown
// and prone are one state (the one status content marks kdbDown is the prone status: engine SWITCHES kdbDownStatusFlag), the
// engine says the going-down and the getting-up as lines (unit.proned, unit.stood), and Stand Up is the action the prone status
// grants. The viewer's half (../viewer/tools/prone-lies-down.test.mjs) watches the bodies on the page. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { STATUSES } from '../../engine/src/content/statuses.js'
import { ACTIONS } from '../../engine/src/content/index.js'

describe('a knocked-down unit lies on the ground', () => {
  it('the engine: the status a failed knockdown roll applies is the prone status, and Stand Up is what it grants', () => {
    const down = Object.entries(STATUSES).filter(([, s]) => (s as { kdbDown?: boolean }).kdbDown === true).map(([id]) => id)
    expect(down).toEqual(['status.prone'])
    const prone = STATUSES['status.prone'] as { prone?: { standAction?: string } }
    expect(prone.prone?.standAction).toBe('power.stand-up'); expect(ACTIONS['power.stand-up']).toBeDefined()
    // the dump the page reads says the same of it
    const s = JSON.parse(readFileSync('generated/static.json', 'utf8')) as { statusRows: Record<string, { flags: string[]; standAction?: string }> }
    expect(s.statusRows['status.prone']).toEqual({ flags: ['kdbDown', 'prone'], standAction: 'power.stand-up' })
  })
  it('the Orphanage\'s recording holds the engine\'s own knockdown and Stand Up of a civilian, a turn apart', () => {
    const ev = (JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8')) as { events: Record<string, unknown>[] }).events
    const down = ev.findIndex((e) => e.type === 'unit.proned'), up = ev.findIndex((e) => e.type === 'unit.stood')
    expect(down).toBeGreaterThan(0); expect(up).toBeGreaterThan(down)
    expect(ev[down - 2]).toMatchObject({ type: 'kdb.rolled', fired: true, applied: 'down', target: ev[down]!.target })
    expect(ev[down - 1]).toMatchObject({ type: 'status.applied', statusId: 'status.prone', target: ev[down]!.target })
    expect(ev[up]).toMatchObject({ type: 'unit.stood', causeId: 'power.stand-up', actor: ev[down]!.target, statusIds: ['status.prone'] })
    expect(ev[up]!.turn).toBe((ev[down]!.turn as number) + 1)
  })
  it('the viewer page: the body falls as the knockdown lands, lies with its bar shown, rises at Stand Up; a dead unit still looks dead', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/prone-lies-down.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
    console.log(out.split('\n').filter((l) => l.startsWith('# bodies with no death pose') || l.startsWith('# units of the six opening battles with no body')).join('\n'))
  }, 170000)
})
