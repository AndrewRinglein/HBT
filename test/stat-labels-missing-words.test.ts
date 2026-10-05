// kingdom.stat-labels-missing-words — found 2026-10-05 by the engine worker landing content.shields-reauthored: the kingdom's
// stat-label table (src/content/stat-labels.ts) had no word for several stats that rows now carry, so a screen showed the raw
// field — a shield read "rangedblock".
//
// Expect: "The Equip screen and the item card for a Tower Shield read 'Ranged Block', not 'rangedblock'; every stat carried by
// an item row in the game has a label or is on the landing note's list of stats the GLOSSARY does not name; the new test fails
// if a row gains an unlabelled stat."
//
// The words are ones the game's documents and its battle screen ALREADY say — taken, not invented; each is cited in the table
// and in kingdom SWITCHES.md statLabelWords. A stat nobody has named stays raw and is listed (STATS_WITHOUT_A_WORD) for Andrew.
import { describe, it, expect } from 'vitest'
import { ITEMS, itemOf } from '../src/content/items.js'
import * as LABELS from '../src/content/stat-labels.js'
import { STAT_LABEL, statLabelOf } from '../src/content/stat-labels.js'
import { BADGES, LEVELS, SPECIALTIES } from '../src/engine.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { equipPage, deltasOf } from '../src/ui/equip.js'
import { rewardsScreen } from '../src/ui/after.js'

/** The stats nobody has named: shown by the engine's own name until Andrew names them. */
const NO_WORD: readonly string[] = (LABELS as unknown as { STATS_WITHOUT_A_WORD?: readonly string[] }).STATS_WITHOUT_A_WORD ?? []
/** A set's payload may name this weapon's own damage; Equip words it itself ("damage on this weapon"), not through the table. */
const SET_ONLY = ['attackDamage']
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

describe('kingdom.stat-labels-missing-words — the words', () => {
  it('each stat the rows carry that had no word has the word the documents and the battle screen already use', () => {
    expect(statLabelOf('rangedBlock')).toBe('Ranged Block')
    expect(statLabelOf('block')).toBe('Block')
    expect(statLabelOf('fireResist')).toBe('Fire Resist')
    expect(statLabelOf('poisonResist')).toBe('Poison Resist')
    expect(statLabelOf('coldResist')).toBe('Cold Resist')
    expect(statLabelOf('deathbedFighting')).toBe('Deathbed Fighting')
    expect(statLabelOf('bleedOutTurns')).toBe('Bleed-out')
    expect(statLabelOf('corruption')).toBe('Corruption')
  })

  it('a stat nobody has named stays raw and is on the list for Andrew — swapCost — and nothing on that list has a word', () => {
    expect(NO_WORD).toEqual(['swapCost'])
    for (const k of NO_WORD) { expect(k in STAT_LABEL, `${k} is on the no-word list and in the table`).toBe(false); expect(statLabelOf(k)).toBe(k) }
  })
})

describe('kingdom.stat-labels-missing-words — no row can show a raw stat again', () => {
  const unnamed = (keys: Iterable<string>) => [...new Set(keys)].filter((k) => !(k in STAT_LABEL) && !NO_WORD.includes(k)).sort()

  it('every stat an item row in the game carries — what it gives, and what its set pays — has a label or is on the no-word list', () => {
    const carried: Record<string, string[]> = {}
    for (const r of ITEMS) {
      for (const k of Object.keys(r.statModifiers)) (carried[k] ??= []).push(r.id)
      for (const k of [...Object.keys(r.setBonus?.each ?? {}), ...Object.keys(r.setBonus?.once ?? {})]) if (!SET_ONLY.includes(k)) (carried[k] ??= []).push(r.id)
    }
    expect(Object.keys(carried).length).toBeGreaterThan(10)
    const missing = unnamed(Object.keys(carried))
    expect(missing, `stats on item rows with no word in src/content/stat-labels.ts: ${missing.map((k) => `${k} (${carried[k]!.slice(0, 3).join(', ')}${carried[k]!.length > 3 ? ', …' : ''})`).join('; ')}`).toEqual([])
  })

  it('and so does every stat a badge, a level row or a specialty carries — the other rows the screens word through the table', () => {
    const rows = <T>(o: unknown) => Object.values(o as Record<string, T>)
    const badges = rows<{ statModifiers?: Record<string, number> }>(BADGES).flatMap((b) => Object.keys(b.statModifiers ?? {}))
    const levels = rows<{ rows: { grants?: Record<string, number>; choice?: Record<string, number>[] }[] }>(LEVELS).flatMap((t) => t.rows.flatMap((r) => [...Object.keys(r.grants ?? {}), ...(r.choice ?? []).flatMap((o) => Object.keys(o))]))
    const specialties = rows<{ statModifiers?: Record<string, number> }>(SPECIALTIES).flatMap((s) => Object.keys(s.statModifiers ?? {}))
    expect(badges.length).toBeGreaterThan(0); expect(levels.length).toBeGreaterThan(0)
    expect(unnamed(badges), 'badges').toEqual([])
    expect(unnamed(levels), 'level rows').toEqual([])
    expect(unnamed(specialties), 'specialties').toEqual([])
    // the no-word list holds nothing that no row carries: a stat leaves it the day it is named
    for (const k of NO_WORD) expect([...badges, ...levels, ...specialties, ...ITEMS.flatMap((r) => Object.keys(r.statModifiers))].includes(k), `${k} is carried by a row`).toBe(true)
  })

  it('a row that gains an unlabelled stat is caught: the check names it', () => {
    expect(unnamed(['rangedBlock', 'aStatNobodyNamed', 'swapCost'])).toEqual(['aStatNobodyNamed'])
  })
})

describe('kingdom.stat-labels-missing-words — the Tower Shield on the screens', () => {
  const SHIELD = 'item.tower-shield'
  /** A run with the Iron Dwarf (who carries a Tower Shield) at Equip, and one more Tower Shield in the stash. */
  function atEquip() {
    const ctx = makeCtx(makeNewCampaign(11)), c = ctx.campaign
    const row = HERO_POOL.find((h) => h.equipped.includes(SHIELD))!
    c.roster[row.id] = structuredClone(row); c.stash = [SHIELD]
    return { c, hero: row.id }
  }

  it('the row gives Ranged Block, and Equip reads it as words — on the item in the stash and in what the hero\'s gear gives — never as the field', () => {
    expect(Object.keys(itemOf(SHIELD).statModifiers)).toContain('rangedBlock')
    const { c, hero } = atEquip(), html = equipPage(c, [hero], { where: 'prep', picked: null })
    // the stash's tile for the shield
    const tile = html.slice(html.indexOf(`data-act="pick" data-id="${SHIELD}"`)); const small = text(tile.slice(0, tile.indexOf('</small>')))
    expect(small, 'the stash tile').toMatch(/\+\d+ ranged block/i)
    expect(small).toMatch(/\+\d+ block/i)
    expect(small, 'no raw field').not.toMatch(/rangedBlock|rangedblock|maxStamina/)
    // what the hero's gear gives, as Equip's own line of it words it (ui/equip.ts deltasOf — lower case, as Equip's stat words
    // always were; no screen prints that line today, the stat block does, so it is read from the function)
    const deltas = [...deltasOf(c, hero).matchAll(/<span class="delta (?:won|lost)">([^<]*)<\/span>/g)].map((m) => m[1]!)
    expect(deltas.some((d) => /^\+\d+ ranged block$/.test(d)), `the gear's lines: ${deltas.join(' · ')}`).toBe(true)
    expect(deltas.join(' ')).not.toMatch(/rangedblock|rangedBlock/)
    for (const d of deltas) expect(d, 'every line of what the gear gives is words').not.toMatch(/[a-z][A-Z]/)
  })

  it('a reward card for it reads "Ranged Block" and "Block"', () => {
    const { c } = atEquip()
    c.cursor.step = 'rewards'; c.cursor.rewardOffer = [SHIELD]
    const card = rewardsScreen(c, [], null), words = text(card.slice(card.indexOf('class="reward-description"')).split('</div>')[0]!)
    expect(words).toMatch(/\+\d+ Ranged Block/)
    expect(words).toMatch(/\+\d+ Block/)
    expect(words).not.toMatch(/rangedBlock|rangedblock/)
  })
})
