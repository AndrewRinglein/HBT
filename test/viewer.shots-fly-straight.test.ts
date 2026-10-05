// viewer.shots-fly-straight (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post answered:
// ... everything flies straight ...'). Andrew: "Arrows fly in an overhead arc to hit an enemy. They should be a straight line
// from where the bow is pointed." - thrown weapons: "No, everything should go straight for 4."
// The engine's side - nothing of it is changed, and what the board reads of it: an attack's row says its kind (ranged) and its
// damage type, and that is what picks the projectile the board flies. The Longbow's Shot, the Javelin's Throw and the Pile of
// Rocks' Throw are ranged physical attacks. The viewer's half (../viewer/tools/shots-fly-straight.test.mjs) samples each
// projectile's path, holds the 2026-10-03 flight times, and asks a real approved body where what it holds is. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { ACTIONS, ITEMS } from '../../engine/src/content/index.js'

describe('everything that flies goes straight', () => {
  it('the engine: the Longbow\'s Shot, the Javelin\'s Throw and the Pile of Rocks\' Throw are ranged attacks, and the dump carries their rows unchanged', () => {
    const s = JSON.parse(readFileSync('generated/static.json', 'utf8')) as { actions: Record<string, unknown> }
    for (const [item, id] of [['item.longbow', 'attack.longbow.shot'], ['item.javelin', 'attack.javelin.throw'], ['item.pile-of-rocks', 'attack.pile-of-rocks.throw']] as const) {
      expect(ITEMS[item]!.grants, item).toContain(id)
      const a = ACTIONS[id]!; expect(a.attack?.kind, id).toBe('ranged'); expect(a.attack?.damageType, id).toBe('physical')
      expect(s.actions[id]).toEqual(JSON.parse(JSON.stringify(a)))
    }
  })
  it('the viewer: each of the three, and every other projectile, sampled on one straight line from the attacker to the target; the flight times as they were; the release from what the body holds', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/shots-fly-straight.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
