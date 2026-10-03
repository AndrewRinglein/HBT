// viewer.walk-in-step (DECISIONS.md 2026-10-01 'the camera redesigned on the caravan preview; the caravan's fight; what is
// queued after it' and 'the links and the icon; ... walk timed to the hexes'). Andrew: "when the characters are moving on the
// map, they're not actually walking or moving. They just slide across." · "The walking isn't very well timed or spaced based
// on the number of tiles that are being moved." Expect: "In the Orphanage and the Bridge a hero walking N hexes plays its walk
// clip throughout, and its feet advance one stride per stride length (no slide); the traversal's duration grows with N; a
// flier flies." The engine's side: the Orphanage's and the Bridge's heroes walk paths of several lengths and the Bridge's
// Imps fly. The viewer's half (../viewer/tools/walk-in-step.test.mjs) runs against the committed viewer page and the
// approved model files. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const battle = (f: string) => JSON.parse(readFileSync(`../viewer/battles/test.opening-${f}.json`, 'utf8')) as { events: any[] }

describe('the walk, in step with the hexes', () => {
  it('the exported Orphanage and Bridge walk heroes several distances, and the Bridge\'s Imps fly', () => {
    for (const f of ['orphanage', 'bridge']) {
      const b = battle(f), type: Record<number, string> = {}
      for (const e of b.events) if (e.type === 'unit.enter') type[e.actor] = e.typeId
      const lengths = new Set<number>()
      b.events.forEach((e, i) => {
        if (e.type !== 'move.begin' || !type[e.actor]?.startsWith('hero.')) return
        let n = 0
        for (let j = i + 1; j < b.events.length; j++) { const x = b.events[j]; if (x.type === 'moved' && x.actor === e.actor) n++; else if (x.type === 'moved' || x.type === 'move.begin' || x.type === 'activation.begin') break }
        if (n) lengths.add(n)
      })
      expect(lengths.size, f).toBeGreaterThanOrEqual(3)
    }
    expect(battle('bridge').events.some((e) => e.type === 'move.begin' && e.causeId === 'power.flight' && e.hexes > 1)).toBe(true)
  })
  it('the viewer page: the walk clip throughout, one stride per stride length, a duration that grows with N, a flier flying', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/walk-in-step.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 150000)
})
