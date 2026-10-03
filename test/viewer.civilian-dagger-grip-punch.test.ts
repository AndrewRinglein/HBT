// viewer.civilian-dagger-grip-punch (engine backlog; engine DECISIONS.md 2026-10-03 'a held weapon is gripped: the hand closes round
// it, for every body' and 'the civilians' dagger attack: the Hook punch for now; a hand-keyed standing stab is made for review').
// Andrew: "We need to close the hands over the plate for everything, don't we?" · "Sure, we can use that for now." The pack read
// through the tool; the viewer's half (../viewer/tools/civilian-dagger-grip-punch.test.mjs) reads the pack, stands the bodies up
// from the files, plays the Orphanage on the page and reads the stab candidate's record; the sandbox's half
// (../kingdom/tools/civilian-dagger-grip-punch.verify.mjs) plays the expect line on the built BATTLE-SANDBOX.html (the page
// PLAY.html's Orphanage card opens). Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

type Look = { id: string, props: { item: string, hand: string, fit: string, grasp?: { record: string, curl: Record<string, number[]> } }[], motions: Record<string, { path: string, clip: string, borrowed?: boolean }> }
const pack = (): Record<string, { typeId: string, looks: Look[] }> => JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }))

describe('the civilians grip their dagger and punch with it', () => {
  it('character-models.mjs --json: both civilian looks carry a grasp on the dagger and attack with the Hook punch; no walk-assassinate', () => {
    const models = pack(), hook = JSON.parse(readFileSync('../assets/characters/oathblade-armor/rebuild/free-motion-study/selections.json', 'utf8')).clips.hook
    for (const t of ['hero.fixed.orphans', 'hero.fixed.school-teacher']) {
      const look = models[t]!.looks[0]!
      expect(look.props.map((p) => [p.item, p.hand, p.fit]), t).toEqual([['item.dagger', 'R', 'body']])
      expect(Object.keys(look.props[0]!.grasp?.curl ?? {}).length, t).toBe(15)
      expect(look.motions.attack!.clip, t).toBe(hook.clip)
      expect(look.motions.attack!.borrowed, t).toBe(true)
    }
    expect(JSON.stringify(models)).not.toMatch(/walk-assassinate|knife-v1/)
  }, 60000)
  it('the viewer page: the pack, the bodies gripping through idle, walk and punch, the Orphanage on the page, the stab candidate', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/civilian-dagger-grip-punch.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/civilian-dagger-grip-punch.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/civilian-dagger-grip-punch.verify.mjs', 'scratch/civilian-dagger-grip-punch.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/civilian-dagger-grip-punch: .*passed/)
  }, 170000)
})
