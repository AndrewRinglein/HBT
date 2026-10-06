// viewer.panel-lists-items (engine backlog; engine DECISIONS.md 2026-10-03 'the civilians show on the victory screen; the
// specialty three are random; the battle's unit panel lists what the unit is equipped with'). Andrew: "This priest only has a
// verse attack. It seems like he has nothing in his hands. I don't understand what he's equipped with. We need the items listed
// under the characters on the right in battle." The engine's side — what the panel is drawn from, and nothing new: a fielded
// unit's log says each item in its hands or worn (unit.equipped: the item, what it granted, what it changed) and what it
// carries stowed (unit.enter); each item's own row says its name, its class and the hands it takes (handsOf), and there are
// two hands (HANDS). The Holy Texts' row grants Verse. The viewer's half (../viewer/tools/panel-lists-items.test.mjs) asks the
// page for the items section; the sandbox's half (../kingdom/tools/panel-lists-items.verify.mjs) reads the panel against the
// engine's loadout for three different heroes on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { ITEMS, ACTIONS } from '../../engine/src/content/index.js'
import { HANDS, handsOf } from '../../engine/src/core/items.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

describe('the battle\'s unit panel lists what the unit is equipped with', () => {
  it('the engine: the log names each fielded item with what it gave; the item\'s row names it, and says its hands', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1))
    const equipped = ctx.events.filter((e) => e.type === 'unit.equipped') as unknown as { actor: number; itemId: string; instanceId: string; grants: string[]; abilities: string[] }[]
    expect(equipped.length).toBeGreaterThan(2)
    for (const e of equipped) {
      const row = ITEMS[e.itemId]!, u = ctx.state.units[e.actor]!
      expect(row.name, `${e.itemId} has a name`).toBeTruthy()
      expect([...e.grants].sort()).toEqual([...row.grants].sort())
      // in a hand when its row takes hands, worn otherwise — the same split the panel draws
      const where = handsOf(row) > 0 ? u.loadout!.hands : u.loadout!.worn ?? []
      expect(where.map((i) => i.instanceId), `${row.name} on ${u.name}`).toContain(e.instanceId)
    }
    expect(HANDS).toBe(2)
    const texts = ITEMS['item.holy-texts']!
    expect(texts.name).toBe('Holy Texts'); expect(texts.grants.map((g) => ACTIONS[g]!.name)).toContain('Verse'); expect(handsOf(texts)).toBe(1)
  })
  it('the dump carries the engine\'s rows unchanged: static.json items and hands', () => {
    const s = JSON.parse(readFileSync('generated/static.json', 'utf8')) as { items: Record<string, { name: string; itemClass: string; hands: number; grants: string[]; abilities: string[]; mods: Record<string, number> }>; hands: number }
    expect(s.hands).toBe(HANDS)
    expect(Object.keys(s.items).sort()).toEqual(Object.keys(ITEMS).sort())
    for (const [id, row] of Object.entries(ITEMS)) expect(s.items[id], id).toMatchObject({ name: row.name, itemClass: row.itemClass, hands: handsOf(row), grants: [...row.grants], abilities: [...row.abilities], mods: { ...row.statModifiers } })
  })
  it('the viewer page: the items section under the character — hands, armor, slots, stowed, by name, with what each gives', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/panel-lists-items.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    // 2026-10-05, content.dwarf-elf-fey-badges-act (engine item): a sixth test (the panel says what a badge does); this read /# pass 5/.
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, read against the engine\'s loadout on the built BATTLE-SANDBOX.html (the Orphanage)', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/panel-lists-items.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/panel-lists-items.verify.mjs', 'scratch/panel-lists-items.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/panel-lists-items: .*passed/)
  }, 170000)
})
