// rule.surge-is-at-least-level (engine item, 2026-10-06). Ruled 2026-10-06 (engine/DECISIONS.md 'everyone gains Surge equal
// to its level at the least, and rolls the Surge check every Activation'): "Everyone gains surge equal to level, at the very
// least. Therefore, there is always at least a 1% chance of a surge." The item's words for the kingdom: "the hero sheet, the
// Codex and the level-up screen show the same Surge the engine fields" and "the level-up screen shows the Surge gained with
// the level like any other stat".
//
// The number is the engine's row (the pack: each hero class grants 1 Surge at every level; the hero's own row carries the
// level-1 point). Here: the hero sheet has a Surge row that reads the engine's fielded hero; the level-up screen lists the
// level's +1 Surge with the row's other grants; a hero fielded at a level through the seam has the Surge its sheet shows.
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { viewLevelUp } from '../src/core/rewards.js'
import { levelRowOf } from '../src/content/progress.js'
import { fieldedPreviewOf } from '../src/core/seam.js'
import { statBlock, STAT_ROWS } from '../src/ui/equip.js'
import { levelUpScreen } from '../src/ui/after.js'
import { statWordsOf } from '../src/content/stat-labels.js'

const DWARF = 'hero.base.warrior-iron'
const HERO_CLASSES = ['class.warrior', 'class.ranger', 'class.rogue', 'class.mage', 'class.priest', 'class.paladin']
const surgeRowOf = (html: string) => html.match(/<span class="stN">Surge<\/span><span class="stV[^"]*">(?:<em>[^<]*<\/em>)?(-?\d+)<\/span>/)?.[1]

describe('a hero\'s Surge is its level at the least, and every screen says the engine\'s number', () => {
  it('the level rows the kingdom reads grant 1 Surge at every level of each hero class', () => {
    for (const cls of HERO_CLASSES) for (let level = 2; level <= 10; level++) expect(levelRowOf(cls, level).grants['surge'], `${cls} level ${level}`).toBe(1)
    expect(statWordsOf('surge', 1)).toBe('+1 Surge')
  })
  it('the hero sheet has a Surge row: a level-1 hero reads 1, the number the engine fields', () => {
    expect(STAT_ROWS.map(([, key]) => key)).toContain('surge')
    const ctx = loadFixture()
    expect(ctx.campaign.roster[DWARF]!.level ?? 1).toBe(1)
    expect(fieldedPreviewOf(ctx.campaign.roster[DWARF]!).now.surge).toBe(1)
    expect(surgeRowOf(statBlock(ctx.campaign, DWARF))).toBe('1')
  })
  it('the level-up screen lists the Surge gained with the level beside the row\'s other grants', () => {
    const ctx = loadFixture((c) => { c.roster[DWARF]!.xp = 20 })
    const v = viewLevelUp(ctx.campaign, DWARF)
    expect(v.to).toBe(2)
    expect(v.row.grants['surge']).toBe(1)
    const html = levelUpScreen(ctx.campaign, DWARF, 'rewards')
    expect(html).toContain('+2 Health')
    expect(html).toMatch(/<span class="bonus-text">\+1 Surge<\/span>/)
  })
  it('at a level, the sheet reads at least the level: a level-3 hero shows 3 or more', () => {
    const ctx = loadFixture((c) => { const h = c.roster[DWARF]!; h.level = 3; h.specialty = 'specialty.berserker' })
    const fielded = fieldedPreviewOf(ctx.campaign.roster[DWARF]!).now.surge ?? 0
    expect(fielded).toBeGreaterThanOrEqual(3)
    expect(surgeRowOf(statBlock(ctx.campaign, DWARF))).toBe(String(fielded))
  })
})
