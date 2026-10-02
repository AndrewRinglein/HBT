// viewer.shield-guard-motion (engine backlog; engine DECISIONS.md 2026-10-01 'a shield power plays a raise-the-shield motion', Andrew:
// "When they play shield power, they should raise the shield animation."). The engine's side: the six shield powers are what the
// engine's three shields grant, and each shield is of the engine's item class `shield` — the class the viewer reads (static.json
// itemClasses). The viewer's half (../viewer/tools/shield-guard.test.mjs) reads the pack and plays the library's shield powers on the
// page; the sandbox's half (../kingdom/tools/shield-guard.verify.mjs) clicks each of the six on the action bar of the built
// BATTLE-SANDBOX.html and records what the hero's body was told to play. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { ITEMS } from '../../engine/src/content/index.js'

const SHIELDS: Record<string, string[]> = {
  'item.kite-shield': ['power.kite-shield.shield-wall', 'power.kite-shield.raise-guard'],
  'item.round-shield': ['power.round-shield.turn-aside', 'power.round-shield.brace'],
  'item.tower-shield': ['power.tower-shield.cover', 'power.tower-shield.stand-tall'],
}
type Clip = { motion: string, path: string | null, clip?: string, borrowed?: boolean }
type Power = { hero: string, id: string, onBar: boolean, used: boolean, name: string | null, motions: string[], clips: Clip[], hit: { path: string, clip: string } | null }

describe('a shield power raises the shield', () => {
  it('the engine: the three shields are of the class shield, and grant the six shield powers; the viewer reads that class', () => {
    const classes = JSON.parse(readFileSync('generated/static.json', 'utf8')).itemClasses
    for (const [item, powers] of Object.entries(SHIELDS)) {
      expect(ITEMS[item]!.itemClass, item).toBe('shield')
      expect([...ITEMS[item]!.abilities], item).toEqual(powers)
      expect(classes[item], item).toBe('shield')
    }
    for (const [id, item] of Object.entries(ITEMS)) expect(classes[id], id).toBe(item.itemClass)
  })
  it('the viewer page: guard bound on every shield holder and played for a shield power; the hit unchanged; the lacking listed', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/shield-guard.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: each of the six used from the bar plays the raise-the-shield clip on the hero\'s body, not its hit reaction', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/shield-guard.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const r: { powers: Power[] } = JSON.parse(execFileSync(process.execPath, ['tools/shield-guard.verify.mjs', 'scratch/shield-guard.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 }))
    expect(r.powers.map((p) => p.id)).toEqual(Object.values(SHIELDS).flat())
    for (const p of r.powers) {
      expect(p.onBar, p.id).toBe(true)
      expect(p.used, p.id).toBe(true)
      /* the motion played per power, by the body's own word: guard, once — never the hit reaction */
      expect(p.motions, p.id).toEqual(['guard'])
      expect(p.clips[0]!.path, p.id).toMatch(/\/shield_blockleft\//)
      /* the hit reaction is still bound to the body's struck reaction, as before */
      expect(p.hit, p.id).not.toBeNull()
    }
  }, 170000)
})
