// fix.affliction-pop-up-words (2026-10-04) — ruled 2026-10-03 (Andrew, DECISIONS.md "the affliction pop-up's 0-Health words and its
// drawbacks come from the engine"): asked whether to queue a small engine job so that the pop-up's 0-Health text and its
// drawbacks come from the engine — "Okay, do it that way."
//
// viewer.affliction-pop-up landed with the pop-up's "At 0 Health" paragraph written by the viewer from the SHAPE of
// badge.gained's atZero, and its Drawbacks read as "the stats the mods lower" plus every gaps line — a boon among them
// (Vampirism's "on a melee hit: heal 2"). Both against the Viewer Constitution's Law 0. Now:
//   (1) the affliction's Codex row carries its ruled 0-Health text (atZero.text — it always did) and says which of its
//       written terms are drawbacks (`drawbacks`); the content pack brings both;
//   (2) badge.gained emits them beside mods / gaps / atZero — the one event extended, no new event;
//   (3) the viewer prints the event's text and the marked drawbacks and writes no sentence of its own (viewer's tests).
// The core names no affliction: it copies the row's fields onto the line it already emits.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createCustomBattle } from '../src/core/setup.js'
import { grantBadge } from '../src/core/mutate.js'
import { BADGES } from '../src/content/index.js'
import { hexId } from './board16.js'

type Row = { id: string; atZero?: { text?: string }; drawbacks?: { stats?: string[]; terms?: string[] } }
const CODEX = (JSON.parse(readFileSync('../content/gen/badges.json', 'utf8')) as { badges: Row[] }).badges
const codex = (id: string) => CODEX.find((b) => b.id === id)!
type Marked = { atZero?: { text?: string }; drawbacks?: { mods: readonly string[]; gaps: readonly string[] }; statModifiers: Record<string, number>; gaps?: readonly string[] }
const row = (id: string) => BADGES[id] as unknown as Marked

/** The four afflictions, and what each row marks as a drawback: the stats it lowers, and the written terms that cost. */
const AFFLICTIONS = [
  { id: 'badge.rotting-flesh', mods: ['movement', 'accuracy'], gaps: ['start of battle take 5 true damage'] },
  { id: 'badge.vampirism', mods: ['spirit'], gaps: ['deploying the hero costs 3 Faith', 'the hero gains half experience'] },
  { id: 'badge.lycanthropy', mods: ['crit', 'spirit'], gaps: ['deploying the hero costs 2 Supplies'] },
  // Restated 2026-10-06 (content.card-draw-badge-rules-cut; ruled 2026-10-06, DECISIONS.md '… the card-draw badge rules are cut
  // for now': "We may add a card system at some point, but you can cut all those for now."). Possession's row no longer says
  // "`startOfBattle`: −2 card draw", so it is not among its written drawbacks. The line was:
  //   { id: 'badge.possession', mods: ['surge'], gaps: ['`startOfBattle`: −2 card draw', 'deploying the hero costs 3 Mana'] },
  { id: 'badge.possession', mods: ['surge'], gaps: ['deploying the hero costs 3 Mana'] },
] as const

describe('the pack: an affliction\'s row carries its ruled 0-Health text and marks its drawbacks', () => {
  for (const a of AFFLICTIONS) {
    it(`${a.id}: the Codex's own 0-Health wording, and the drawbacks among its terms`, () => {
      const b = row(a.id), c = codex(a.id)
      expect(typeof c.atZero?.text, 'the Codex row has the ruled text').toBe('string')
      expect(b.atZero?.text, 'the pack carries it word for word').toBe(c.atZero!.text)
      expect(b.atZero!.text!.length).toBeGreaterThan(40)
      expect(b.drawbacks, 'the pack carries the drawback marks').toEqual({ mods: a.mods, gaps: a.gaps })
      // every marked stat is one the badge LOWERS, and every marked term is one of the row's own written terms
      for (const s of b.drawbacks!.mods) expect(b.statModifiers[s], `${a.id}: ${s} is lowered`).toBeLessThan(0)
      for (const g of b.drawbacks!.gaps) expect(b.gaps, `${a.id}: '${g}' is written on the row`).toContain(g)
      // … and every stat the badge lowers is marked: a lowered stat is a drawback
      expect(Object.entries(b.statModifiers).filter(([, n]) => n < 0).map(([s]) => s).sort()).toEqual([...a.mods].sort())
    })
  }
  it('a boon written on the row is not a drawback: Vampirism\'s heal on a melee hit, Lycanthropy\'s regeneration and its Strength on attack', () => {
    expect(row('badge.vampirism').gaps).toContain('on a melee hit: heal 2')
    expect(row('badge.vampirism').drawbacks!.gaps).not.toContain('on a melee hit: heal 2')
    for (const boon of ['`startOfBattle`: regeneration 5', '`onAttack`: +1 Strength']) {
      expect(row('badge.lycanthropy').gaps).toContain(boon)
      expect(row('badge.lycanthropy').drawbacks!.gaps).not.toContain(boon)
    }
  })
  it('only an affliction is marked: a badge with no 0-Health rule carries neither the text nor drawbacks', () => {
    const marked = Object.values(BADGES).filter((b) => (b as unknown as Marked).drawbacks !== undefined).map((b) => b.id).sort()
    expect(marked).toEqual(AFFLICTIONS.map((a) => a.id).sort())
    for (const b of Object.values(BADGES)) if (!(b as unknown as Marked).atZero) expect((b as unknown as Marked).drawbacks, b.id).toBeUndefined()
  })
})

describe('badge.gained: the line says the 0-Health text and which terms are drawbacks, beside mods, gaps and atZero', () => {
  for (const a of AFFLICTIONS) {
    it(`a hero gaining ${a.id} mid-battle: the event carries the row's text and marks, unchanged`, () => {
      const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(12, 12) }])
      const hero = ctx.state.units.find((u) => u.side === 'hero')!
      expect(grantBadge(ctx, hero.id, a.id, 'test.affliction')).toBe(true)
      const e = ctx.events.find((x) => x.type === 'badge.gained' && x['badgeId'] === a.id)!
      const b = row(a.id)
      expect(e['atZero'], 'atZero whole, its text with it').toEqual(b.atZero)
      expect((e['atZero'] as { text: string }).text).toBe(codex(a.id).atZero!.text)
      expect(e['drawbacks']).toEqual({ mods: a.mods, gaps: a.gaps })
      // beside what the line already said
      expect(e['mods']).toEqual(b.statModifiers)
      expect(e['gaps']).toEqual(b.gaps)
      // the line is a copy: changing it does not change the registry's row (Law 5b: plain data, no shared reference)
      ;(e['drawbacks'] as { mods: string[] }).mods.push('x')
      expect(row(a.id).drawbacks!.mods).toEqual(a.mods)
    })
  }
  it('a badge that is no affliction gains with no text and no drawbacks on its line', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: hexId(5, 5) }], [{ type: 'unit.zombie', hex: hexId(12, 12) }])
    const hero = ctx.state.units.find((u) => u.side === 'hero')!
    grantBadge(ctx, hero.id, 'badge.fragile', 'test.affliction')
    const e = ctx.events.find((x) => x.type === 'badge.gained' && x['badgeId'] === 'badge.fragile')!
    expect('drawbacks' in e).toBe(false)
    expect(e['atZero']).toBeUndefined()
  })
  it('the core names no affliction: mutate.ts copies the row\'s fields and holds no badge id', () => {
    const core = readFileSync('src/core/mutate.ts', 'utf8')
    for (const a of AFFLICTIONS) expect(core.includes(a.id), `${a.id} named in core`).toBe(false)
    expect(core).toMatch(/b\.drawbacks/)
  })
})
