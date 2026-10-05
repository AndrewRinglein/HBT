// viewer.bodies-life-size (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post answered:
// ... a body on the ground is the size of a living unit lying down'). Andrew: "The bodies on the terrain are smaller than they
// should be. They should be larger." - "The body should be the size of living units lying down, yes."
// Nothing of the engine is in this item: the bodies are models of a map's painted scene, and how large a unit's body is drawn
// is the screen's look. What this file holds of the facts the page stands on: the scenes' own records of their bodies exist
// where the pack reads them, and the look's number is one. The viewer's half (../viewer/tools/bodies-life-size.test.mjs) holds
// the pack to those records and the scene files, the page's scaling, the driver's hand-over, the measure against a lying
// unit, and one real scene file through the real loader. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SCENES = ['orphanage-riverside', 'lumberjack-forest', 'abbotown-encounters/bridge', 'abbotown-encounters/cave', 'abbotown-encounters/cathedral', 'caravan-aftermath']

describe('a body lying on a map is the size of a living unit lying down', () => {
  it('each painted scene records its bodies - a place for each - and two of the six record none', () => {
    const counts: Record<string, number> = {}
    for (const scene of SCENES) {
      const a = JSON.parse(readFileSync(`../assets/terrain-3d/${scene}/assembly.json`, 'utf8')) as { bodies: { position: number[]; source: string }[] }
      expect(Array.isArray(a.bodies), scene).toBe(true)
      for (const b of a.bodies) { expect(b.position.length, scene).toBe(3); expect(typeof b.source).toBe('string') }
      counts[scene] = a.bodies.length
    }
    expect(counts['orphanage-riverside'], 'the Orphanage\'s scene records no body').toBe(0); expect(counts['abbotown-encounters/bridge']).toBe(0)
    expect(counts['lumberjack-forest']).toBe(1); expect(counts['abbotown-encounters/cave']).toBe(2); expect(counts['abbotown-encounters/cathedral']).toBeGreaterThan(40); expect(counts['caravan-aftermath']).toBeGreaterThan(30)
    console.log('bodies recorded: ' + Object.entries(counts).map(([s, n]) => `${s} ${n}`).join(', '))
  })
  it('the viewer: the pack, the page\'s scaling, the driver\'s hand-over, the measure within 10% of a lying unit, a real scene file through the real loader', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/bodies-life-size.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
    console.log(out.split('\n').filter((l) => /^# (bodies left|scenes with no body|lumberjack|abbotown|caravan)/.test(l)).join('\n'))
  }, 170000)
})
