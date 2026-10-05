// viewer.friend-line-green-heal-glows (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post
// answered: ... green for a friend, a glow for a heal ...'). Andrew: "When you're doing a power that is a buff or a heal, it
// should not be a red arrow for your vine or target." - "They should be green." - "When you're healing someone, it shouldn't show
// a magic attack bolt flying at them." - "It should show a glow on the healed ally only, or on the area if an area is healed."
// The engine's side - what the screen reads, and nothing new: an action's row says whom it is aimed at (its Targeting: select
// and side) and whether it is an attack; a heal is an effect of kind 'heal' on a power's row, and the engine says each unit
// healed in its own line (heal.applied). The viewer's half (../viewer/tools/friend-line-green-heal-glows.test.mjs) reads the
// aim's colour and what flies on the page; the sandbox's half (../kingdom/tools/friend-line-green-heal-glows.verify.mjs) plays
// the Holy Symbol's Heal and Wrath on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { ACTIONS, ITEMS } from '../../engine/src/content/index.js'
import { isAttack, isBurst } from '../../engine/src/core/action.js'

const plain = <T>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)))

describe('green for a friend, a glow for a heal', () => {
  it('the engine: the Holy Symbol grants Heal (one ally, a heal) and Wrath (an attack); the dump carries every row\'s target unchanged', () => {
    const symbol = ITEMS['item.holy-symbol']!
    expect([...symbol.grants, ...symbol.abilities]).toEqual(expect.arrayContaining(['power.holy-symbol.heal', 'attack.holy-symbol.wrath']))
    const heal = ACTIONS['power.holy-symbol.heal']!, wrath = ACTIONS['attack.holy-symbol.wrath']!
    expect(heal.target).toEqual({ select: 'unit', side: 'ally' }); expect((heal as { effects?: { kind: string }[] }).effects!.some((e) => e.kind === 'heal')).toBe(true)
    expect(isAttack(heal)).toBe(false); expect(isAttack(wrath)).toBe(true)
    const s = JSON.parse(readFileSync('generated/static.json', 'utf8')) as { actions: Record<string, { target?: unknown; attack?: unknown; burst?: unknown; effects?: unknown }> }
    let areaHeals = 0
    for (const [id, a] of Object.entries(ACTIONS)) {
      expect(s.actions[id]!.target, id).toEqual(plain(a.target)); expect(!!s.actions[id]!.attack, id).toBe(isAttack(a)); expect(!!s.actions[id]!.burst, id).toBe(isBurst(a))
      const t = a.target as { select?: string; side?: string } | undefined
      if (!isAttack(a) && t?.select === 'area' && t.side === 'ally' && ((a as { effects?: { kind: string }[] }).effects ?? []).some((e) => e.kind === 'heal')) areaHeals++
    }
    expect(areaHeals, 'the engine has heals over an area (the Circle of Healing, the Holy Chalice)').toBeGreaterThan(1)
    // the Priest Chain's Benediction (the expect's area heal) is not a row of the engine's pack today (its shape is unparsed -
    // content's gap); the day it is, it is an area heal by its own row and takes the same glow with no viewer change
    const benediction = ACTIONS['power.priest-chain.benediction'] as { target?: { select?: string; side?: string } } | undefined
    if (benediction) expect(benediction.target).toMatchObject({ select: 'area', side: 'ally' })
    console.log(`the Priest Chain's Benediction is ${benediction ? 'a row of the engine\'s pack' : 'NOT a row of the engine\'s pack (content gap: its shape is unparsed)'}; ${areaHeals} area heals are`)
  })
  it('the viewer page: Heal aims green and Wrath red; when Heal resolves nothing flies and the ally glows; an area heal glows on its hexes', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/friend-line-green-heal-glows.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, played on the built BATTLE-SANDBOX.html (the Orphanage, the priest with the Holy Symbol)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/friend-line-green-heal-glows.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/friend-line-green-heal-glows.verify.mjs', 'scratch/friend-line-green-heal-glows.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/friend-line-green-heal-glows: .*passed/)
  }, 170000)
})
