// The words a screen shows for a stat — kingdom.reads-engine (2026-10-02; engine DECISIONS.md "the duplication review,
// ruled", finding K11: "a ninth stat-name map, in the kingdom's UI"). ONE label table, keyed by the ENGINE's stat
// names: the level rows, the specialties, the item rows and the set payloads are all the engine's, in its names
// (itemSlots is the campaign's own quantity). Display words only — no rule reads this.

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
 * The stats rows carry that NOBODY has named: no document and no screen says a word for them, so they show by the engine's
 * own name until Andrew names them (a new word is his — GLOSSARY.md "Naming something new"). test/stat-labels-missing-
 * words.test.ts holds every stat a row carries to the table above or to this list, so a new stat cannot show raw unseen.
 *   swapCost — COMBAT-V2-DESIGN-2026-09-07.md §11 names it only as the field ("`swapCost` is a stat, default 1"); the badges
 *              Fast Hands and Slow Hands carry it.
 */
export const STATS_WITHOUT_A_WORD: readonly string[] = ['swapCost']

/** The label for a stat — the engine's name itself when the table has none. */
export const statLabelOf = (k: string): string => STAT_LABEL[k] ?? k
