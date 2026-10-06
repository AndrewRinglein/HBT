// rule.special-moves-unlock-at-level-two (engine item, 2026-10-06). Ruled 2026-10-06 (engine/DECISIONS.md 'a hero's special
// moves unlock at level 2, ruled: all of them, every hero, enemies and civilians unchanged, named on the level-up screen'):
// "the special moves that the starting heroes get should be unlocked instead at level 2, so they don't clutter up level 1
// tutorial. That way, you get something extra when you level up." … "Yeah, the level-up screen should name the moves
// unlocked, and it should go above their head as a thing they gained".
//
// The engine holds the rule (a hero's row says the level each movement is granted at). Here: the level-up screen for the
// level that grants a move names it with the Codex's one line for it, and lists it among the gains that rise above the
// hero's head after the level is taken; a level that grants none names none; a hero fielded at level 1 through the seam has
// no special move and the same hero at level 2 has it; no lesson names a move a level-1 hero does not have.
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { viewLevelUp } from '../src/core/rewards.js'
import { movesUnlockedAt } from '../src/content/progress.js'
import { fieldedPreviewOf } from '../src/core/seam.js'
import { levelUpScreen } from '../src/ui/after.js'
import { LESSONS } from '../src/content/lessons.js'
import { ACTIONS, UNITS } from '../src/engine.js'

const DWARF = 'hero.base.warrior-iron'
const LINES: Record<string, [id: string, name: string, line: string]> = {
  'class.warrior': ['power.leap', 'Leap', '2 stamina, 2 hexes, +2 Strength until end of Turn.'],
  'class.ranger': ['power.side-roll', 'Side Roll', '1 stamina, 1 hex.'],
  'class.rogue': ['power.side-roll', 'Side Roll', '1 stamina, 1 hex.'],
  'class.mage': ['power.focus', 'Focus', '0 stamina, moves you ZERO hexes, gain 1 Stamina. A caught caster stays caught.'],
  'class.priest': ['power.devotion', 'Devotion', '0 stamina, moves you ZERO hexes, -1 Stamina Max for the Battle, gain 2 Stamina.'],
  'class.paladin': ['power.sidestep', 'Sidestep', '0 stamina, cooldown 1, 1 hex.'],
}
const BASE = Object.keys(UNITS).filter((id) => id.startsWith('hero.base.')).sort()
const classOf = (id: string) => (UNITS[id]!.tags ?? []).find((t) => t.startsWith('class.'))!

describe('a hero\'s special moves come at level 2, and the level-up screen says so', () => {
  it('every base hero unlocks its class\'s move at level 2 - its name the engine\'s, its line the Codex\'s - and nothing at any other level', () => {
    expect(BASE.length).toBe(24)
    for (const id of BASE) {
      const [moveId, name, line] = LINES[classOf(id)]!
      expect(movesUnlockedAt(id, 2), id).toEqual([{ id: moveId, name, line }])
      expect(ACTIONS[moveId]!.name).toBe(name)
      for (const level of [1, 3, 4, 5, 10]) expect(movesUnlockedAt(id, level), `${id} level ${level}`).toEqual([])
    }
    // a civilian unlocks none: its row names no level
    expect(movesUnlockedAt('hero.fixed.orphans', 2)).toEqual([])
  })
  it('the level-up screen to level 2 names the move unlocked with its line, among the things the hero will gain', () => {
    const ctx = loadFixture((c) => { c.roster[DWARF]!.xp = 20 })
    const v = viewLevelUp(ctx.campaign, DWARF)
    expect(v.to).toBe(2)
    expect(v.movesUnlocked).toEqual([{ id: 'power.leap', name: 'Leap', line: '2 stamina, 2 hexes, +2 Strength until end of Turn.' }])
    const html = levelUpScreen(ctx.campaign, DWARF, 'rewards')
    const item = html.match(/<div class="bonus-item move" data-move="power\.leap" data-gain="([^"]*)">(.*?)<\/div>/)
    expect(item, 'a move among the bonuses').not.toBeNull()
    expect(item![1]).toBe('New move: Leap')                                        // what rises above the hero's head
    expect(item![2]).toContain('<span class="bonus-text">New move: Leap</span>')
    expect(item![2]).toContain('<span class="bonus-line">2 stamina, 2 hexes, +2 Strength until end of Turn.</span>')
    // beside what the level gave before: the row's stats are still listed
    expect(html).toContain('+2 Health')
  })
  it('a level that unlocks no move names none', () => {
    const ctx = loadFixture((c) => { const h = c.roster[DWARF]!; h.level = 2; h.specialty = 'specialty.berserker'; h.xp = 1000 })
    const v = viewLevelUp(ctx.campaign, DWARF)
    expect(v.to).toBe(3)
    expect(v.movesUnlocked).toEqual([])
    expect(levelUpScreen(ctx.campaign, DWARF, 'roster')).not.toContain('bonus-item move')
  })
  it('through the seam: at level 1 the hero is fielded with the basic Move alone; at level 2 with its special move too - a run saved at level 2 keeps it', () => {
    const one = loadFixture()
    expect(fieldedPreviewOf(one.campaign.roster[DWARF]!).now.moves).toEqual(['power.move'])
    const two = loadFixture((c) => { const h = c.roster[DWARF]!; h.level = 2; h.specialty = 'specialty.berserker' })
    expect(fieldedPreviewOf(two.campaign.roster[DWARF]!).now.moves).toEqual(['power.move', 'power.leap'])
  })
  it('no lesson names a special move: a level-1 hero is never pointed at one it does not have', () => {
    const names = [...new Set(Object.values(LINES).map(([, name]) => name)), 'Back Flip']
    for (const l of LESSONS) for (const w of l.words ?? []) for (const n of names) expect(w.includes(n), `${l.id}: "${w}"`).toBe(false)
    for (const l of LESSONS) expect(JSON.stringify(l.point ?? null), l.id).not.toMatch(/power\.(leap|side-roll|sidestep|focus|devotion|back-flip)/)
  })
})
