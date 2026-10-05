// The words a screen shows for a stat — kingdom.reads-engine (2026-10-02; engine DECISIONS.md "the duplication review,
// ruled", finding K11: "a ninth stat-name map, in the kingdom's UI"). ONE label table, keyed by the ENGINE's stat
// names: the level rows, the specialties, the item rows and the set payloads are all the engine's, in its names
// (itemSlots is the campaign's own quantity). Display words only — no rule reads this.
import { FOLD_BASE } from '../engine.js'

export const STAT_LABEL: Readonly<Record<string, string>> = { maxHp: 'Health', maxStamina: 'Max Stamina', staminaRegen: 'Stamina Regen', itemSlots: 'Item Slot', accuracy: 'Accuracy', crit: 'Crit', strength: 'Strength', precision: 'Precision', magic: 'Magic', spirit: 'Spirit', armor: 'Armor', resist: 'Resist', dodge: 'Dodge', reach: 'Reach', movement: 'Movement', luck: 'Luck', vision: 'Vision', toughness: 'Toughness', surge: 'Surge', thorns: 'Thorns',
  // capability.free-attack-accuracy (engine item, 2026-10-04): the special free attacks' four stats - the Longsword and the Great Sword carry the first
  counterattackAccuracy: 'Counterattack Accuracy', fendAccuracy: 'Fend Accuracy', freeAttackAccuracy: 'Special Free Attack Accuracy', freeAttackDodge: 'Dodge against Special Free Attacks',
  // kingdom.stat-labels-missing-words (2026-10-05): the stats rows carry that had no word here, so a screen showed the field
  // ("rangedblock" on a shield). Each word is one the documents and the battle screen ALREADY say — taken, never invented
  // (GLOSSARY.md names no stat's display word but Corruption; kingdom SWITCHES.md statLabelWords cites each):
  //   Block, Ranged Block   COMBAT-V2-DESIGN-2026-09-07.md §6 "**Block** and **Ranged Block** are two separate stats"; engine
  //                         DECISIONS.md 2026-09-28 "Kite is +20 Block / +5 Ranged Block"; the battle panel (viewer src/affliction.js AFFL_STAT)
  //   Fire / Poison / Shadow Resist   COMBAT-V2-DESIGN-2026-09-07.md's resistance table ("Fire | **Fire Resist**" …); the battle panel
  //   Cold Resist           engine DECISIONS.md 2026-09-29 "Cold is an element with its own resistance, Cold Resist, as Fire has Fire Resist"
  //   Deathbed Fighting     GEAR-DESIGN.md "Deathbed Fighting +10"; COMBAT-DESIGN.md "Deathbed Fighting is derived, never stored"
  //   Bleed-out             COMBAT-DESIGN.md "Bleed-out is a stat on every player unit" (engine DECISIONS.md 2026-10-01); the battle panel
  //   Corruption            GLOSSARY.md "The corruption pool … a hero's corruption"
  block: 'Block', rangedBlock: 'Ranged Block', fireResist: 'Fire Resist', poisonResist: 'Poison Resist', shadowResist: 'Shadow Resist', coldResist: 'Cold Resist',
  deathbedFighting: 'Deathbed Fighting', bleedOutTurns: 'Bleed-out', corruption: 'Corruption' }

/**
 * The stats rows carry that NOBODY has named: no document and no screen says a word for them, so they would show by the
 * engine's own name until Andrew names them (a new word is his — GLOSSARY.md "Naming something new"). test/stat-labels-missing-
 * words.test.ts holds every stat a row carries to the table above, to a sentence below (STAT_SENTENCE), or to this list, so a
 * new stat cannot show raw unseen. EMPTY since 2026-10-05: swapCost stood here until Andrew said how it reads ("4 cost 1 stam":
 * kingdom.swap-cost-reads-as-stamina, below).
 */
export const STATS_WITHOUT_A_WORD: readonly string[] = []

// kingdom.swap-cost-reads-as-stamina — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'seven answers: …': asked what the stat
// swapCost, on the Fast Hands and Slow Hands badges, should be called on screen — "4 cost 1 stam"; read, and said to him the
// same day: the line says what swapping costs, in Stamina, as a plain sentence, not a stat word with a signed number). A stat
// in this table is not said as "+1 <word>": a row's change to it is said as what the thing then costs — the engine's base for
// the stat (core/items.ts FOLD_BASE: a swap costs 1 Stamina; read, never a number kept here) and the row's change, never below
// 0, as the engine holds what a swap costs (core/swap.ts swapCostOf). Fast Hands (−1): "Swap costs 0 Stamina"; Slow Hands
// (+1): "Swap costs 2 Stamina".
const STAT_SENTENCE: Readonly<Record<string, (costs: number) => string>> = { swapCost: (costs) => `Swap costs ${costs} Stamina` }

/** Whether a screen has words for this stat: a label, or a sentence. */
export const statHasWords = (k: string): boolean => k in STAT_LABEL || k in STAT_SENTENCE
/** Whether a row's change of `n` to this stat is for the better: more of a stat, less of a cost. */
export const statChangeIsGain = (k: string, n: number): boolean => (k in STAT_SENTENCE ? n < 0 : n > 0)

/**
 * A row's change to a stat, as a screen says it: "+2 Health", "-1 Armor" — or, for a stat that is a cost, the sentence of
 * what the thing then costs ("Swap costs 0 Stamina"). `lower`: the stat's word in small letters, as Equip writes them
 * ("+5 ranged block"); a sentence is left as it is. EVERY screen that words a row's change goes through here (the badge's
 * line on a draft card and among a hero's gifts, the item card, Equip's tiles, gear line and set lines, the reward card, the
 * level-up's bonuses and picks) — test/swap-cost-reads-as-stamina.test.ts holds them to it.
 */
export function statWordsOf(k: string, n: number, o: { lower?: boolean } = {}): string {
  const sentence = STAT_SENTENCE[k]
  if (sentence) return sentence(Math.max(0, (FOLD_BASE[k] ?? 0) + n))
  const word = statLabelOf(k)
  return `${n > 0 ? '+' : ''}${n} ${o.lower ? word.toLowerCase() : word}`
}

/** The label for a stat — the engine's name itself when the table has none. */
export const statLabelOf = (k: string): string => STAT_LABEL[k] ?? k
