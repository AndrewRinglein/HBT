// viewer.civilian-held-dagger (engine backlog; engine DECISIONS.md 2026-10-03 'the civilians hold their dagger as a weapon, not baked
// into a body copy'). Andrew: "No, we don't want to create a version with the knife painted into the hand. We want to use a knife or
// a dagger the way they're supposed to be used." The engine's side: the Orphan Child and the School Teacher field item.dagger
// (fix.orphans-teacher-knife), a weapon by the engine's own item class - the kit the viewer reads (static.json). The viewer's half
// (../viewer/tools/civilian-held-dagger.test.mjs) reads the pack, stands the bodies up from the files and plays the Orphanage on the
// page; the sandbox's half (../kingdom/tools/civilian-held-dagger.verify.mjs) plays the expect line on the built BATTLE-SANDBOX.html
// (the page PLAY.html's Orphanage card opens). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { UNITS, ITEMS } from '../../engine/src/content/index.js'

type Look = { id: string, props: { item: string, hand: string, model: string, fit: string, path: string }[], unheld?: string[], motions: Record<string, { path: string, clip: string, borrowed?: boolean }> }
const pack = (): Record<string, { typeId: string, looks: Look[] }> => JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }))

describe('the civilians hold their dagger as a weapon', () => {
  it('the engine: the Orphan Child and the School Teacher field the dagger, a weapon; the viewer reads that kit and class', () => {
    const statics = JSON.parse(readFileSync('generated/static.json', 'utf8'))
    for (const t of ['hero.fixed.orphans', 'hero.fixed.school-teacher']) {
      expect([...((UNITS as Record<string, any>)[t].defaultItems ?? [])], t).toContain('item.dagger')
      expect(statics.units[t].defaultItems, t).toContain('item.dagger')
    }
    expect((ITEMS as Record<string, any>)['item.dagger'].itemClass).toBe('weapon')
    expect(statics.itemClasses['item.dagger']).toBe('weapon')
  })
  it('character-models.mjs --json: an item.dagger prop on both civilian looks, their attack the stab, no knife-v1 file', () => {
    const models = pack()
    for (const t of ['hero.fixed.orphans', 'hero.fixed.school-teacher']) {
      const look = models[t]!.looks[0]!
      expect(look.props.map((p) => [p.item, p.hand, p.model, p.fit]), t).toEqual([['item.dagger', 'R', 'dagger', 'body']])
      expect(look.motions.attack!.borrowed, t).toBe(true)
      expect(look.motions.attack!.clip, t).not.toBe('Knife attack')
    }
    expect(JSON.stringify(models)).not.toMatch(/knife-v1/)
  }, 60000)
  it('the viewer page: the pack, the bodies through idle, walk and stab, and the Orphanage on the page', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/civilian-held-dagger.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/civilian-held-dagger.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/civilian-held-dagger.verify.mjs', 'scratch/civilian-held-dagger.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/civilian-held-dagger: .*passed/)
  }, 170000)
})
